"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import { trpc } from "@/trpc/client";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  "h-11 border-[#20302a]/15 bg-white/70 focus-visible:border-[#a5772f] focus-visible:ring-[#a5772f]/25";

export function SetupForm() {
  const router = useRouter();
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const create = trpc.bootstrap.createFirstAdmin.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      await create.mutateAsync(values);
      const { error } = await signIn.email({
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast.success("Admin created. Please sign in.");
        router.push("/login");
        return;
      }
      toast.success("Welcome to the stable office.");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FieldGroup>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="name" className="text-[#20302a]/80">
                Full name
              </FieldLabel>
              <Input
                id="name"
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
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email" className="text-[#20302a]/80">
                Email
              </FieldLabel>
              <Input
                id="email"
                type="email"
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
              <FieldLabel htmlFor="password" className="text-[#20302a]/80">
                Password
              </FieldLabel>
              <Input
                id="password"
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
      </FieldGroup>
      <Button
        type="submit"
        disabled={create.isPending}
        className="h-11 w-full bg-[#7a5a2c] text-[#f4ece0] shadow-sm transition-colors hover:bg-[#6a4d25]"
      >
        {create.isPending ? "Creating…" : "Create super-admin"}
      </Button>
    </form>
  );
}
