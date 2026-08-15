"use client";

import { CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";

export function GrantWeekButton({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const grant = trpc.courses.grantExtraWeek.useMutation();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={grant.isPending}
      onClick={async () => {
        try {
          await grant.mutateAsync({ enrollmentId, weeks: 1 });
          toast.success("Extra week granted.");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        }
      }}
    >
      <CalendarPlus className="mr-1 size-3.5" /> +1 week
    </Button>
  );
}
