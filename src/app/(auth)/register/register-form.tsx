"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { signIn } from "@/lib/auth-client";
import { uploadFile } from "@/lib/upload-client";
import { trpc } from "@/trpc/client";

const schema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  phone: z.string().optional(),
  dob: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const inputClass =
  "h-11 border-[#20302a]/15 bg-white/70 focus-visible:border-[#a5772f] focus-visible:ring-[#a5772f]/25";

export function RegisterForm({ r2Configured }: { r2Configured: boolean }) {
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      dob: "",
      gender: undefined,
      address: "",
    },
  });
  const register = trpc.students.register.useMutation();
  const updateProfile = trpc.account.updateProfile.useMutation();
  const pending = isSubmitting || working;

  async function onSubmit(values: FormValues) {
    setWorking(true);
    try {
      await register.mutateAsync({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || null,
        gender: values.gender ?? null,
        address: values.address || null,
        dob: values.dob || null,
      });

      const { error } = await signIn.email({
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast.success("Account created. Please sign in.");
        router.push("/login");
        return;
      }

      // Photo upload needs an authenticated session — do it after sign-in.
      if (photo && r2Configured) {
        try {
          const url = await uploadFile(photo, "profile");
          await updateProfile.mutateAsync({ photoUrl: url });
        } catch {
          toast.error("Account created, but the photo failed to upload.");
        }
      }

      toast.success("Welcome to Buraq!");
      router.push("/student");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setWorking(false);
    }
  }

  const selectClass = `${inputClass} !h-11`;
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
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
              autoComplete="email"
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

      <Controller
        control={control}
        name="dob"
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="dob" className="text-[#20302a]/80">
              Date of birth
            </FieldLabel>
            <Input id="dob" type="date" className={inputClass} {...field} />
          </Field>
        )}
      />
      <Controller
        control={control}
        name="gender"
        render={({ field }) => (
          <Field>
            <FieldLabel className="text-[#20302a]/80">Gender</FieldLabel>
            <Select
              value={field.value ?? ""}
              onValueChange={(v) => field.onChange(v || undefined)}
            >
              <SelectTrigger className={selectClass}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="phone" className="text-[#20302a]/80">
              Phone
            </FieldLabel>
            <Input id="phone" className={inputClass} {...field} />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="address"
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="address" className="text-[#20302a]/80">
              Address
            </FieldLabel>
            <Input id="address" className={inputClass} {...field} />
          </Field>
        )}
      />

      {r2Configured && (
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="photo" className="text-[#20302a]/80">
            Photo
          </FieldLabel>
          <Input
            id="photo"
            type="file"
            accept="image/*"
            className={inputClass}
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </Field>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="mt-1 h-11 w-full bg-[#7a5a2c] text-[#f4ece0] shadow-sm transition-colors hover:bg-[#6a4d25] sm:col-span-2"
      >
        {pending ? "Creating…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-[#20302a]/70 sm:col-span-2">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[#a5772f] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
