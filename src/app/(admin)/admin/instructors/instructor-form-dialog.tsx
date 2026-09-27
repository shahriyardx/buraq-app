"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toDateInput } from "@/lib/format";
import { uploadFile } from "@/lib/upload-client";
import { trpc } from "@/trpc/client";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().optional(),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().optional(),
  dob: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export type InstructorDefaults = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  address: string | null;
  dob: string | null;
  bio: string | null;
  specialties: string | null;
};

export function InstructorFormDialog({
  mode,
  instructor,
  trigger,
}: {
  mode: "create" | "edit";
  instructor?: InstructorDefaults;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(
      mode === "create"
        ? schema.refine((v) => (v.password?.length ?? 0) >= 8, {
            message: "Password must be at least 8 characters",
            path: ["password"],
          })
        : schema,
    ),
    defaultValues: {
      name: instructor?.name ?? "",
      email: instructor?.email ?? "",
      password: mode === "create" ? "Instructor@123" : undefined,
      phone: instructor?.phone ?? "",
      gender: (instructor?.gender as FormValues["gender"]) ?? undefined,
      address: instructor?.address ?? "",
      dob: toDateInput(instructor?.dob) || "",
      bio: instructor?.bio ?? "",
      specialties: instructor?.specialties ?? "",
    },
  });

  const create = trpc.instructors.create.useMutation();
  const update = trpc.instructors.update.useMutation();
  const pending = create.isPending || update.isPending || uploading;

  async function onSubmit(values: FormValues) {
    try {
      let photoUrl: string | undefined;
      if (photo) {
        setUploading(true);
        photoUrl = await uploadFile(photo, "instructors");
        setUploading(false);
      }

      if (mode === "create") {
        await create.mutateAsync({
          name: values.name,
          email: values.email,
          password: values.password ?? "Instructor@123",
          phone: values.phone || null,
          gender: values.gender ?? null,
          address: values.address || null,
          dob: values.dob || null,
          bio: values.bio || null,
          specialties: values.specialties || null,
          photoUrl,
        });
        toast.success(`Instructor ${values.name} added.`);
      } else if (instructor) {
        await update.mutateAsync({
          id: instructor.id,
          name: values.name,
          email: values.email,
          phone: values.phone || null,
          gender: values.gender ?? null,
          address: values.address || null,
          dob: values.dob || null,
          bio: values.bio || null,
          specialties: values.specialties || null,
          photoUrl,
        });
        toast.success("Instructor updated.");
      }

      setOpen(false);
      setPhoto(null);
      reset();
      router.refresh();
    } catch (err) {
      setUploading(false);
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add instructor" : "Edit instructor"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create an instructor account with dashboard access."
              : "Update this instructor's profile."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup className="sm:grid sm:grid-cols-2 sm:gap-4">
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className="sm:col-span-2"
                >
                  <FieldLabel htmlFor="name">Full name</FieldLabel>
                  <Input
                    id="name"
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
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
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

            {mode === "create" && (
              <Controller
                control={control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Temp password</FieldLabel>
                    <Input
                      id="password"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            )}

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
              name="dob"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="dob">Date of birth</FieldLabel>
                  <Input id="dob" type="date" {...field} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Gender</FieldLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || undefined)}
                  >
                    <SelectTrigger>
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
              name="specialties"
              render={({ field }) => (
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="specialties">Specialties</FieldLabel>
                  <Input
                    id="specialties"
                    placeholder="e.g. Dressage, Show Jumping"
                    {...field}
                  />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="bio"
              render={({ field }) => (
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="bio">Bio</FieldLabel>
                  <Textarea id="bio" rows={2} {...field} />
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

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="photo">Photo</FieldLabel>
              <Input
                id="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving…"
                : mode === "create"
                  ? "Add instructor"
                  : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
