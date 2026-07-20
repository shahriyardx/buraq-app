"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { initialActionState } from "@/lib/form";
import { requestEnrollmentAction } from "./actions";

export function EnrollButton({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    requestEnrollmentAction,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="w-full" />}>
        Request enrollment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request enrollment</DialogTitle>
          <DialogDescription>
            Request to enroll in <strong>{courseName}</strong>. An administrator
            must approve your request before you are added to the course.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="courseId" value={courseId} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Requesting…" : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
