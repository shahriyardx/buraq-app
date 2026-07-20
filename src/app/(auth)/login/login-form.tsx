"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  "h-11 border-[#20302a]/15 bg-white/70 focus-visible:border-[#a5772f] focus-visible:ring-[#a5772f]/25";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
    });
    if (error) {
      toast.error(error.message ?? "Invalid email or password");
      return;
    }
    router.push(redirectTo);
    router.refresh();
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

      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password" className="text-[#20302a]/80">
                Password
              </FieldLabel>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[#a5772f] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
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
        {isSubmitting ? "Saddling up…" : "Sign in"}
      </Button>
    </form>
  );
}
