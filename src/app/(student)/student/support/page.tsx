import { Clock, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireStudent } from "@/lib/dal";
import { api } from "@/trpc/server";
import { SubmitTicketDialog } from "./submit-ticket-dialog";

export const metadata: Metadata = { title: "Contact Support" };

function categoryLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

export default async function StudentSupportPage() {
  await requireStudent();

  const [tickets, school] = await Promise.all([
    api.support.myList(),
    api.support.schoolInfo(),
  ]);

  const info = [
    { icon: Phone, label: "Phone", value: school.phone },
    { icon: Mail, label: "Email", value: school.email },
    { icon: MapPin, label: "Address", value: school.address },
    { icon: Clock, label: "Office hours", value: school.officeHours },
  ].filter((i) => i.value);

  return (
    <>
      <PageHeader
        title="Contact Support"
        description="Raise a ticket and track our replies."
      >
        <SubmitTicketDialog />
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* My tickets */}
        <Card className="p-5 lg:col-span-2">
          <CardHeader className="p-0">
            <CardTitle>My tickets</CardTitle>
            <CardDescription>
              Your support requests, newest first.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            {tickets.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                You have no tickets yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {tickets.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {t.ticketId}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="truncate font-medium">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(t.category)} · {t.messagesCount}{" "}
                        {t.messagesCount === 1 ? "message" : "messages"}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/student/support/${t.id}`}>
                        <MessageSquare className="mr-2 size-4" /> View
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* School info */}
        <Card className="p-5">
          <CardHeader className="p-0">
            <CardTitle>School info</CardTitle>
            <CardDescription>Reach us directly.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            {info.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Contact details are not available yet.
              </p>
            ) : (
              <ul className="space-y-4">
                {info.map((i) => (
                  <li key={i.label} className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <i.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{i.label}</p>
                      <p className="text-sm font-medium break-words">
                        {i.value}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
