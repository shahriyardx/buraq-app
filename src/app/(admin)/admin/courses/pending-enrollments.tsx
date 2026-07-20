"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { approveEnrollmentAction, rejectEnrollmentAction } from "./actions";

export type PendingEnrollment = {
  id: string;
  studentName: string;
  courseName: string;
  requestedAt: string;
};

export function PendingEnrollments({ items }: { items: PendingEnrollment[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (items.length === 0) return null;

  return (
    <Card className="mb-6 border-amber-300/60 bg-amber-50/50 p-5 dark:bg-amber-500/5">
      <p className="mb-3 text-sm font-semibold">
        Pending enrollment requests ({items.length})
      </p>
      <ul className="divide-y divide-border">
        {items.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between gap-4 py-2.5"
          >
            <div className="min-w-0 text-sm">
              <span className="font-medium">{e.studentName}</span>
              <span className="text-muted-foreground"> → {e.courseName}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {formatDate(e.requestedAt)}
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await approveEnrollmentAction(e.id);
                    toast.success("Enrollment approved.");
                    router.refresh();
                  })
                }
              >
                <Check className="mr-1 size-4" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await rejectEnrollmentAction(e.id);
                    toast.success("Enrollment rejected.");
                    router.refresh();
                  })
                }
              >
                <X className="mr-1 size-4" /> Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
