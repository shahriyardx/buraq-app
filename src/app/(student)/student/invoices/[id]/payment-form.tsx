"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy } from "lucide-react";
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
  payerNumber: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export type PayAccount = {
  id: string;
  provider: string;
  accountType: string | null;
  accountName: string | null;
  number: string;
  qrUrl: string | null;
  instructions: string | null;
};

function copy(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("Number copied."),
    () => toast.error("Could not copy."),
  );
}

/** The chosen account: QR, number to send money to, and instructions. */
function AccountDetails({
  account,
  amount,
  invoiceNumber,
}: {
  account: PayAccount;
  amount: string;
  invoiceNumber: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row">
      {account.qrUrl && (
        <img
          src={account.qrUrl}
          alt={`${account.provider} QR code`}
          className="size-40 shrink-0 self-center rounded-md border bg-white object-contain p-1"
        />
      )}
      <dl className="min-w-0 flex-1 space-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">
            {account.provider}
            {account.accountType ? ` ${account.accountType}` : ""} number
          </dt>
          <dd className="flex items-center gap-2 font-mono text-lg font-semibold">
            {account.number}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => copy(account.number)}
            >
              <Copy className="size-3.5" />
            </Button>
          </dd>
        </div>
        {account.accountName && (
          <div>
            <dt className="text-xs text-muted-foreground">Account name</dt>
            <dd>{account.accountName}</dd>
          </div>
        )}
        <div className="flex gap-6">
          <div>
            <dt className="text-xs text-muted-foreground">Amount</dt>
            <dd className="font-semibold">{amount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Reference</dt>
            <dd className="font-mono">{invoiceNumber}</dd>
          </div>
        </div>
        {account.instructions && (
          <p className="whitespace-pre-line text-muted-foreground">
            {account.instructions}
          </p>
        )}
      </dl>
    </div>
  );
}

export function PaymentForm({
  invoiceId,
  invoiceNumber,
  amount,
  accounts,
}: {
  invoiceId: string;
  invoiceNumber: string;
  amount: string; // formatted
  accounts: PayAccount[];
}) {
  const router = useRouter();
  const [method, setMethod] = useState("online");
  const [accountId, setAccountId] = useState(accounts[0]?.id);
  const account = accounts.find((a) => a.id === accountId);
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { transactionId: "", payerNumber: "" },
  });
  const submit = trpc.invoices.submitPayment.useMutation();

  async function onOnline(values: FormValues) {
    try {
      await submit.mutateAsync({
        id: invoiceId,
        method: "ONLINE",
        transactionId: values.transactionId,
        accountId: account?.id,
        payerNumber: values.payerNumber,
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

      <TabsContent value="online" className="space-y-4">
        {accounts.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <Button
                key={a.id}
                type="button"
                size="sm"
                variant={a.id === accountId ? "default" : "outline"}
                onClick={() => setAccountId(a.id)}
              >
                {a.provider}
                {a.accountType ? ` · ${a.accountType}` : ""}
              </Button>
            ))}
          </div>
        )}
        {account && (
          <AccountDetails
            account={account}
            amount={amount}
            invoiceNumber={invoiceNumber}
          />
        )}
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
          {account && (
            <Controller
              control={control}
              name="payerNumber"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="payerNumber">
                    Your {account.provider} number (sent from)
                  </FieldLabel>
                  <Input
                    id="payerNumber"
                    placeholder="01XXXXXXXXX"
                    {...field}
                  />
                </Field>
              )}
            />
          )}
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
