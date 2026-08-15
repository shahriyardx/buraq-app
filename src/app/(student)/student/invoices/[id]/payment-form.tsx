"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";

const schema = z.object({
  transactionId: z.string().min(3, "Enter a valid transaction id"),
});
type FormValues = z.infer<typeof schema>;

export function PaymentForm({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { transactionId: "" },
  });
  const submit = trpc.invoices.submitPayment.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      await submit.mutateAsync({ id: invoiceId, ...values });
      toast.success("Payment submitted for review.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        control={control}
        name="transactionId"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="transactionId">Transaction ID</FieldLabel>
            <Input
              id="transactionId"
              placeholder="e.g. TXN-9F3K21"
              aria-invalid={fieldState.invalid}
              {...field}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending ? "Submitting…" : "Submit payment"}
      </Button>
    </form>
  );
}
