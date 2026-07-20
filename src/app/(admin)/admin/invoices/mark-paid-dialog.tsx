"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initialActionState } from "@/lib/form";
import { toDateInput } from "@/lib/format";
import { markPaidAction } from "./actions";

export function MarkPaidDialog({
  invoiceId,
  invoiceNumber,
  open,
  onOpenChange,
}: {
  invoiceId: string;
  invoiceNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const action = markPaidAction.bind(null, invoiceId);
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      onOpenChange(false);
      router.refresh();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, router, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark invoice paid</DialogTitle>
          <DialogDescription>
            Record payment details for invoice {invoiceNumber}.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paidDate">Payment date</Label>
            <Input
              id="paidDate"
              name="paidDate"
              type="date"
              defaultValue={toDateInput(new Date())}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select name="paymentMethod" defaultValue="CASH" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK">Bank transfer</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              name="reference"
              placeholder="Transaction / receipt no."
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Mark paid"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
