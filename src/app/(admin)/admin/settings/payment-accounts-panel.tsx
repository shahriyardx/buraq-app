"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { uploadFile } from "@/lib/upload-client";
import { trpc } from "@/trpc/client";

const PROVIDERS = ["bKash", "Nagad", "Rocket", "Upay", "Bank"];
const TYPES = ["Merchant", "Personal", "Agent"];
const NONE = "__none__";

export type PaymentAccountRow = {
  id: string;
  provider: string;
  accountType: string | null;
  accountName: string | null;
  number: string;
  qrUrl: string | null;
  instructions: string | null;
  enabled: boolean;
};

const schema = z.object({
  provider: z.string().trim().min(1, "Provider is required"),
  accountType: z.string(),
  accountName: z.string().optional(),
  number: z.string().trim().min(3, "Number is required"),
  instructions: z.string().optional(),
  enabled: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

function AccountDialog({
  account,
  open,
  onOpenChange,
  r2Configured,
}: {
  account: PaymentAccountRow | null; // null = new
  open: boolean;
  onOpenChange: (o: boolean) => void;
  r2Configured: boolean;
}) {
  const router = useRouter();
  const [qr, setQr] = useState<File | null>(null);
  const [removeQr, setRemoveQr] = useState(false);
  const [uploading, setUploading] = useState(false);
  const save = trpc.settings.savePaymentAccount.useMutation();
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      provider: account?.provider ?? "bKash",
      accountType: account?.accountType ?? "Merchant",
      accountName: account?.accountName ?? "",
      number: account?.number ?? "",
      instructions: account?.instructions ?? "",
      enabled: account?.enabled ?? true,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      let qrUrl: string | undefined;
      if (qr) {
        setUploading(true);
        qrUrl = await uploadFile(qr, "payments");
        setUploading(false);
      }
      await save.mutateAsync({
        id: account?.id,
        ...values,
        accountType: values.accountType === NONE ? null : values.accountType,
        qrUrl,
        removeQr,
      });
      toast.success("Payment account saved.");
      setQr(null);
      setRemoveQr(false);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setUploading(false);
      toast.error((err as Error).message);
    }
  }

  const pending = uploading || save.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {account ? "Edit payment account" : "Add payment account"}
          </DialogTitle>
          <DialogDescription>
            Students see this on their invoice page when they pay online.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="provider"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="provider">Provider</FieldLabel>
                  <Input
                    id="provider"
                    list="payment-providers"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  <datalist id="payment-providers">
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={control}
              name="accountType"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Account type</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                      <SelectItem value={NONE}>Not shown</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              control={control}
              name="number"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="number">Number / account no.</FieldLabel>
                  <Input
                    id="number"
                    placeholder="01XXXXXXXXX"
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
              name="accountName"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="accountName">Account name</FieldLabel>
                  <Input
                    id="accountName"
                    placeholder="Buraq Riding School"
                    {...field}
                  />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="instructions"
              render={({ field }) => (
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="instructions">Instructions</FieldLabel>
                  <Textarea
                    id="instructions"
                    rows={3}
                    placeholder={
                      "1. Open bKash, tap Payment.\n2. Enter the merchant number.\n3. Use your invoice number as reference."
                    }
                    {...field}
                  />
                </Field>
              )}
            />
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="qr">QR code</FieldLabel>
              {account?.qrUrl && !removeQr && !qr && (
                <div className="flex items-center gap-3">
                  <img
                    src={account.qrUrl}
                    alt="Current QR"
                    className="size-20 rounded border bg-white object-contain"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveQr(true)}
                  >
                    Remove
                  </Button>
                </div>
              )}
              <Input
                id="qr"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={!r2Configured}
                onChange={(e) => setQr(e.target.files?.[0] ?? null)}
              />
              {!r2Configured && (
                <p className="text-xs text-muted-foreground">
                  File storage (R2) is not configured; QR upload is disabled.
                </p>
              )}
            </Field>
            <Controller
              control={control}
              name="enabled"
              render={({ field }) => (
                <Field
                  orientation="horizontal"
                  className="items-center gap-3 sm:col-span-2"
                >
                  <Checkbox
                    id="enabled"
                    checked={field.value}
                    onCheckedChange={(c) => field.onChange(c === true)}
                  />
                  <FieldLabel htmlFor="enabled">Show to students</FieldLabel>
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentAccountsPanel({
  accounts,
  r2Configured,
}: {
  accounts: PaymentAccountRow[];
  r2Configured: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PaymentAccountRow | null>(null);
  const [open, setOpen] = useState(false);
  const del = trpc.settings.deletePaymentAccount.useMutation();

  function openDialog(a: PaymentAccountRow | null) {
    setEditing(a);
    setOpen(true);
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">Payment accounts</p>
          <p className="text-sm text-muted-foreground">
            bKash, Nagad, bank and other accounts students pay into. Shown on
            every unpaid invoice.
          </p>
        </div>
        <Button size="sm" onClick={() => openDialog(null)}>
          <Plus className="mr-1 size-4" /> Add account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No payment accounts yet. Students only see the office contact.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center gap-4 py-3">
              {a.qrUrl ? (
                <img
                  src={a.qrUrl}
                  alt={`${a.provider} QR`}
                  className="size-12 shrink-0 rounded border bg-white object-contain"
                />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded border text-muted-foreground">
                  <QrCode className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {a.provider}
                  {a.accountType && (
                    <Badge variant="secondary">{a.accountType}</Badge>
                  )}
                  {!a.enabled && <Badge variant="outline">Hidden</Badge>}
                </p>
                <p className="truncate font-mono text-sm text-muted-foreground">
                  {a.number}
                  {a.accountName ? ` · ${a.accountName}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => openDialog(a)}>
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={del.isPending}
                onClick={async () => {
                  if (!window.confirm(`Delete ${a.provider} ${a.number}?`))
                    return;
                  await del.mutateAsync({ id: a.id });
                  toast.success("Payment account deleted.");
                  router.refresh();
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AccountDialog
        account={editing}
        open={open}
        onOpenChange={setOpen}
        r2Configured={r2Configured}
      />
    </Card>
  );
}
