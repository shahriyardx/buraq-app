"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toDateInput } from "@/lib/format";
import { trpc } from "@/trpc/client";

const schema = z.object({
  paidDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["CASH", "BANK", "ONLINE"]),
  reference: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

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

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      paidDate: toDateInput(new Date()),
      paymentMethod: "CASH",
      reference: "",
    },
  });

  const markPaid = trpc.invoices.markPaid.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      const res = await markPaid.mutateAsync({
        id: invoiceId,
        paidDate: values.paidDate,
        paymentMethod: values.paymentMethod,
        reference: values.reference || null,
      });
      toast.success(`Invoice ${res.invoiceNumber} marked paid.`);
      onOpenChange(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark invoice paid</DialogTitle>
          <DialogDescription>
            Record payment details for invoice {invoiceNumber}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              control={control}
              name="paidDate"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="paidDate">Payment date</FieldLabel>
                  <Input
                    id="paidDate"
                    type="date"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={control}
              name="paymentMethod"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Payment method</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK">Bank transfer</SelectItem>
                      <SelectItem value="ONLINE">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Controller
              control={control}
              name="reference"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="reference">Reference</FieldLabel>
                  <Input
                    id="reference"
                    placeholder="Transaction / receipt no."
                    {...field}
                  />
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={markPaid.isPending}>
              {markPaid.isPending ? "Saving…" : "Mark paid"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
