"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/trpc/client";

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
  const setStatus = trpc.support.setStatus.useMutation();

  return (
    <Select
      value={status}
      onValueChange={async (next) => {
        try {
          await setStatus.mutateAsync({ ticketId, status: next as Status });
          toast.success("Status updated.");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        }
      }}
    >
      <SelectTrigger size="sm" className="w-40" disabled={setStatus.isPending}>
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
