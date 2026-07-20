import { TRPCError } from "@trpc/server";
import { ArrowLeft, Paperclip } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireStudent } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/server";
import { ReplyForm } from "../reply-form";

export const metadata: Metadata = { title: "Ticket" };

function categoryLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

export default async function StudentTicketThreadPage({
  params,
}: PageProps<"/student/support/[id]">) {
  await requireStudent();
  const { id } = await params;

  const ticket = await api.support.studentGet({ id }).catch((err) => {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") return null;
    throw err;
  });
  if (!ticket) notFound();

  return (
    <>
      <PageHeader
        title={ticket.subject}
        description={`Ticket ${ticket.ticketId}`}
      >
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/student/support" />}
        >
          <ArrowLeft className="mr-2 size-4" /> Back
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Category</dt>
            <dd className="font-medium">{categoryLabel(ticket.category)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="mt-0.5">
              <StatusBadge status={ticket.status} />
            </dd>
          </div>
        </dl>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          {ticket.messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages yet.
            </p>
          ) : (
            ticket.messages.map((m) => {
              const isStudent = m.authorRole === "STUDENT";
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    isStudent ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-3 text-sm",
                      isStudent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1 flex items-center gap-2 text-xs",
                        isStudent
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground",
                      )}
                    >
                      <span className="font-medium">
                        {isStudent ? "You" : (m.authorName ?? "Support")}
                      </span>
                      <span>·</span>
                      <span>{formatDateTime(m.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    {m.attachmentUrl ? (
                      <a
                        href={m.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "mt-2 inline-flex items-center gap-1 text-xs underline",
                          isStudent
                            ? "text-primary-foreground"
                            : "text-primary",
                        )}
                      >
                        <Paperclip className="size-3" /> Attachment
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 border-t pt-6">
          <ReplyForm ticketId={ticket.id} />
        </div>
      </Card>
    </>
  );
}
