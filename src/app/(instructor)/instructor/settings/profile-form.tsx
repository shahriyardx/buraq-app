"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { uploadFile } from "@/lib/upload-client";
import { trpc } from "@/trpc/client";

const schema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProfileForm({
  profile,
  r2Configured,
}: {
  profile: {
    name: string;
    email: string;
    instructorId: string | null;
    phone: string | null;
    address: string | null;
    bio: string | null;
    specialties: string | null;
  };
  r2Configured: boolean;
}) {
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: profile.phone ?? "",
      address: profile.address ?? "",
      bio: profile.bio ?? "",
      specialties: profile.specialties ?? "",
    },
  });

  const update = trpc.instructor.updateProfile.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      let photoUrl: string | undefined;
      if (photo) {
        setUploading(true);
        photoUrl = await uploadFile(photo, "profile");
        setUploading(false);
      }
      await update.mutateAsync({
        phone: values.phone || null,
        address: values.address || null,
        bio: values.bio || null,
        specialties: values.specialties || null,
        photoUrl,
      });
      toast.success("Profile updated.");
      setPhoto(null);
      router.refresh();
    } catch (err) {
      setUploading(false);
      toast.error((err as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup className="sm:grid sm:grid-cols-2 sm:gap-4">
        <Field className="sm:col-span-2">
          <FieldLabel>Name</FieldLabel>
          <Input value={profile.name} disabled readOnly />
        </Field>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input value={profile.email} disabled readOnly />
        </Field>
        <Field>
          <FieldLabel>Instructor ID</FieldLabel>
          <Input value={profile.instructorId ?? "—"} disabled readOnly />
        </Field>

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
          name="specialties"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="specialties">Specialties</FieldLabel>
              <Input id="specialties" {...field} />
            </Field>
          )}
        />

        <Controller
          control={control}
          name="bio"
          render={({ field, fieldState }) => (
            <Field className="sm:col-span-2" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="bio">Bio</FieldLabel>
              <Textarea id="bio" rows={3} {...field} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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

        {r2Configured && (
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="photo">Photo</FieldLabel>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </Field>
        )}
      </FieldGroup>

      <Button type="submit" disabled={update.isPending || uploading}>
        {update.isPending || uploading ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
