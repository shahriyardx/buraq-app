"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const CURRENCIES = [
  { code: "BDT", label: "BDT — Bangladeshi Taka (৳)" },
  { code: "USD", label: "USD — US Dollar ($)" },
  { code: "EUR", label: "EUR — Euro (€)" },
  { code: "GBP", label: "GBP — British Pound (£)" },
  { code: "INR", label: "INR — Indian Rupee (₹)" },
  { code: "PKR", label: "PKR — Pakistani Rupee (₨)" },
  { code: "AED", label: "AED — UAE Dirham (د.إ)" },
  { code: "SAR", label: "SAR — Saudi Riyal (﷼)" },
];

const schema = z.object({
  name: z.string().min(2, "School name is required"),
  email: z.string().email("Valid email required").or(z.literal("")).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  officeHours: z.string().optional(),
  currency: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export type SchoolProfileValues = {
  name: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  officeHours: string | null;
  currency: string;
};

export function SchoolProfileForm({
  settings,
  r2Configured,
}: {
  settings: SchoolProfileValues;
  r2Configured: boolean;
}) {
  const router = useRouter();
  const [logo, setLogo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: settings.name,
      email: settings.email ?? "",
      phone: settings.phone ?? "",
      address: settings.address ?? "",
      officeHours: settings.officeHours ?? "",
      currency: settings.currency ?? "BDT",
    },
  });

  const update = trpc.settings.updateProfile.useMutation();
  const pending = update.isPending || uploading;

  async function onSubmit(values: FormValues) {
    try {
      let logoUrl: string | undefined;
      if (logo && r2Configured) {
        setUploading(true);
        logoUrl = await uploadFile(logo, "school");
        setUploading(false);
      }

      await update.mutateAsync({
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
        officeHours: values.officeHours || null,
        currency: values.currency || "BDT",
        logoUrl,
      });
      toast.success("School profile saved.");
      setLogo(null);
      router.refresh();
    } catch (err) {
      setUploading(false);
      toast.error((err as Error).message);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                className="sm:col-span-2"
              >
                <FieldLabel htmlFor="name">School name</FieldLabel>
                <Input id="name" aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="email">Contact email</FieldLabel>
                <Input
                  id="email"
                  type="email"
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
            name="phone"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input id="phone" {...field} />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Field>
                <FieldLabel>Currency</FieldLabel>
                <Select
                  value={field.value || "BDT"}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Textarea id="address" rows={2} {...field} />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="officeHours"
            render={({ field }) => (
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="officeHours">Office hours</FieldLabel>
                <Input
                  id="officeHours"
                  placeholder="Mon–Fri, 9am–5pm"
                  {...field}
                />
              </Field>
            )}
          />

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="logo">Logo</FieldLabel>
            {settings.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoUrl}
                alt="Current logo"
                className="h-12 w-auto rounded border"
              />
            )}
            <Input
              id="logo"
              type="file"
              accept="image/jpeg,image/png"
              disabled={!r2Configured}
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
            />
            {!r2Configured && (
              <p className="text-xs text-muted-foreground">
                File storage (R2) is not configured; logo uploads are disabled.
              </p>
            )}
          </Field>
        </FieldGroup>

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Card>
  );
}
