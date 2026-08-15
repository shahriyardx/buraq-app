"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { trpc } from "@/trpc/client";

export function EnrollButton({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const request = trpc.courses.requestEnrollment.useMutation();

  async function onRequest() {
    try {
      const res = await request.mutateAsync({ courseId });
      toast.success(res.message);
      setOpen(false);
      if (res.invoiceId) {
        router.push(`/student/invoices/${res.invoiceId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full">
          Request enrollment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request enrollment</DialogTitle>
          <DialogDescription>
            Request to enroll in <strong>{courseName}</strong>. An invoice is
            generated — submit your payment to start, then an administrator
            confirms it before you can book slots.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            disabled={request.isPending}
            onClick={onRequest}
          >
            {request.isPending ? "Requesting…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
