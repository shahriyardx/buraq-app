"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setTicketStatusAction } from "./actions";

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED";

const OPTIONS: { value: Status; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
];

export function StatusControl({
  ticketId,
  status,
}: {
  ticketId: string;
  status: Status;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      onValueChange={(next) =>
        startTransition(async () => {
          await setTicketStatusAction(ticketId, next as Status);
          toast.success("Status updated.");
          router.refresh();
        })
      }
    >
      <SelectTrigger size="sm" className="w-40" disabled={pending}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
