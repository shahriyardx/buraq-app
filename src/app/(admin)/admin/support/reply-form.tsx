"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type ActionState, initialActionState } from "@/lib/form";
import { replyTicketAction } from "./actions";

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const action = replyTicketAction.bind(null, ticketId) as (
    prev: ActionState,
    fd: FormData,
  ) => Promise<ActionState>;
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      formRef.current?.reset();
      router.refresh();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <Textarea
        name="body"
        rows={3}
        placeholder="Write a reply…"
        required
        aria-label="Reply message"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}
