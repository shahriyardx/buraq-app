"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

const inputClass =
  "h-11 border-[#20302a]/15 bg-white/70 focus-visible:border-[#a5772f] focus-visible:ring-[#a5772f]/25";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirm: "" },
  });

  async function onSubmit(values: FormValues) {
    const { error } = await authClient.resetPassword({
      newPassword: values.newPassword,
      token,
    });
    if (error) {
      toast.error(error.message ?? "Reset failed");
      return;
    }
    toast.success("Password updated. Please sign in.");
    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Controller
        control={control}
        name="newPassword"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="newPassword" className="text-[#20302a]/80">
              New password
            </FieldLabel>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={fieldState.invalid}
              className={inputClass}
              {...field}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={control}
        name="confirm"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="confirm" className="text-[#20302a]/80">
              Confirm password
            </FieldLabel>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
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
        {isSubmitting ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
