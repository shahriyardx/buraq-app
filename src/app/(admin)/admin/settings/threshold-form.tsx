"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/form";
import { updateThresholdAction } from "./actions";

export function ThresholdForm({
  attendanceThreshold,
}: {
  attendanceThreshold: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateThresholdAction,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      router.refresh();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <Card className="p-6">
      <form action={formAction} className="space-y-4">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="attendanceThreshold">Attendance threshold (%)</Label>
          <Input
            id="attendanceThreshold"
            name="attendanceThreshold"
            type="number"
            min={0}
            max={100}
            defaultValue={attendanceThreshold}
            required
          />
          <p className="text-xs text-muted-foreground">
            Minimum attendance rate students must maintain to remain in good
            standing.
          </p>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save threshold"}
        </Button>
      </form>
    </Card>
  );
}
