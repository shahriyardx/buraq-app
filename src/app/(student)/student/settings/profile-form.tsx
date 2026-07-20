"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initials } from "@/lib/format";
import { uploadFile } from "@/lib/upload-client";
import { trpc } from "@/trpc/client";

const schema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export type ProfileValues = {
  name: string;
  email: string;
  studentId: string | null;
  phone: string | null;
  address: string | null;
  photoUrl: string | null;
};

export function ProfileForm({
  profile,
  r2Configured,
}: {
  profile: ProfileValues;
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
    },
  });

  const update = trpc.account.updateProfile.useMutation();
  const pending = update.isPending || uploading;

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
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {profile.photoUrl && (
            <AvatarImage src={profile.photoUrl} alt={profile.name} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary">
            {initials(profile.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{profile.name}</p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <Input id="name" defaultValue={profile.name} readOnly disabled />
          <FieldDescription>
            Managed by the school administration.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="studentId">Student ID</FieldLabel>
          <Input
            id="studentId"
            defaultValue={profile.studentId ?? "—"}
            readOnly
            disabled
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" defaultValue={profile.email} readOnly disabled />
        </Field>

        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <Input id="phone" aria-invalid={fieldState.invalid} {...field} />
            </Field>
          )}
        />

        <Controller
          control={control}
          name="address"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
              <FieldLabel htmlFor="address">Address</FieldLabel>
              <Textarea
                id="address"
                rows={2}
                aria-invalid={fieldState.invalid}
                {...field}
              />
            </Field>
          )}
        />

        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="photo">Photo</FieldLabel>
          <Input
            id="photo"
            type="file"
            accept="image/*"
            disabled={!r2Configured}
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
          {!r2Configured && (
            <FieldDescription>
              File storage (R2) is not configured; photo uploads are disabled.
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
