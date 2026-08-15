"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/trpc/client";

const schema = z.object({
  transactionId: z.string().min(3, "Enter a valid transaction id"),
});
type FormValues = z.infer<typeof schema>;

export function PaymentForm({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [method, setMethod] = useState("online");
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { transactionId: "" },
  });
  const submit = trpc.invoices.submitPayment.useMutation();

  async function onOnline(values: FormValues) {
    try {
      await submit.mutateAsync({
        id: invoiceId,
        method: "ONLINE",
        transactionId: values.transactionId,
      });
      toast.success("Payment submitted for review.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function onCash() {
    try {
      await submit.mutateAsync({ id: invoiceId, method: "CASH" });
      toast.success("Cash payment noted. The office will call to verify.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Tabs value={method} onValueChange={setMethod}>
      <TabsList>
        <TabsTrigger value="online">Online</TabsTrigger>
        <TabsTrigger value="cash">Cash</TabsTrigger>
      </TabsList>

      <TabsContent value="online">
        <form onSubmit={handleSubmit(onOnline)} className="space-y-4">
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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? "Submitting…" : "Submit payment"}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="cash">
        <p className="mb-4 text-sm text-muted-foreground">
          Choose cash to pay at the office. No transaction id needed — the
          office will call you to verify, then confirm your enrollment.
        </p>
        <Button onClick={onCash} disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : "Pay with cash"}
        </Button>
      </TabsContent>
    </Tabs>
  );
}
