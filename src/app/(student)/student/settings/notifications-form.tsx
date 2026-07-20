"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/form";
import { updateNotificationsAction } from "./actions";

export function NotificationsForm({
  emailNotifications,
}: {
  emailNotifications: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateNotificationsAction,
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
    <form action={formAction} className="space-y-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id="emailNotifications"
          name="emailNotifications"
          defaultChecked={emailNotifications}
        />
        <div className="space-y-1">
          <Label htmlFor="emailNotifications">Email alerts</Label>
          <p className="text-sm text-muted-foreground">
            Receive email updates about classes, invoices, and announcements.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}
