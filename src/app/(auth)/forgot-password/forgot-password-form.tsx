"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormValues = z.infer<typeof schema>;

const inputClass =
  "h-11 border-[#20302a]/15 bg-white/70 focus-visible:border-[#a5772f] focus-visible:ring-[#a5772f]/25";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormValues) {
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/reset-password",
    });
    if (error) {
      toast.error(error.message ?? "Something went wrong");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-md border border-emerald-600/30 bg-emerald-600/10 p-4 text-sm text-emerald-800">
        If an account exists for that email, a reset link is on its way. Check
        your inbox.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="email" className="text-[#20302a]/80">
              Email
            </FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="rider@buraq.school"
              aria-invalid={fieldState.invalid}
              className={inputClass}
              {...field}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full bg-[#7a5a2c] text-[#f4ece0] shadow-sm transition-colors hover:bg-[#6a4d25]"
      >
        {isSubmitting ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
