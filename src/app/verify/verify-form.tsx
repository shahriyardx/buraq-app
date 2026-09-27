"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const schema = z.object({
  certificateId: z
    .string()
    .trim()
    .min(4, "Enter the certificate ID")
    .max(64, "That ID is too long"),
});
type FormValues = z.infer<typeof schema>;

const inputClass =
  "h-11 border-[#20302a]/15 bg-white/70 font-mono uppercase tracking-wider focus-visible:border-[#a5772f] focus-visible:ring-[#a5772f]/25";

export function VerifyForm() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { certificateId: "" },
  });

  function onSubmit(values: FormValues) {
    const id = values.certificateId.replace(/\s+/g, "").toUpperCase();
    router.push(`/verify/${encodeURIComponent(id)}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Controller
        control={control}
        name="certificateId"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="certificateId" className="text-[#20302a]/80">
              Certificate ID
            </FieldLabel>
            <Input
              id="certificateId"
              placeholder="BURAQ-2026-XXXXXX"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={fieldState.invalid}
              className={inputClass}
              {...field}
            />
            {fieldState.invalid ? (
              <FieldError errors={[fieldState.error]} />
            ) : (
              <FieldDescription>
                You can also scan the QR code on the certificate.
              </FieldDescription>
            )}
          </Field>
        )}
      />
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full bg-[#7a5a2c] text-[#f4ece0] shadow-sm transition-colors hover:bg-[#6a4d25]"
      >
        Verify certificate
      </Button>
    </form>
  );
}
