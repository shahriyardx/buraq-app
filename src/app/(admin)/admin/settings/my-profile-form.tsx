"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/format";
import { uploadFile } from "@/lib/upload-client";
import { trpc } from "@/trpc/client";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function MyProfileForm({
  profile,
  r2Configured,
}: {
  profile: {
    name: string;
    email: string;
    phone: string | null;
    photoUrl: string | null;
  };
  r2Configured: boolean;
}) {
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: profile.name, phone: profile.phone ?? "" },
  });

  const update = trpc.settings.updateMyProfile.useMutation();
  const pending = update.isPending || uploading;

  // Show the picked photo before it is saved.
  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function onSubmit(values: FormValues) {
    try {
      let photoUrl: string | undefined;
      if (photo) {
        setUploading(true);
        photoUrl = await uploadFile(photo, "profile");
        setUploading(false);
      }

      await update.mutateAsync({
        name: values.name,
        phone: values.phone || null,
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

  const avatarSrc = preview ?? profile.photoUrl;

  return (
    <Card className="p-6">
      <CardHeader className="p-0">
        <CardTitle>My profile</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {avatarSrc && <AvatarImage src={avatarSrc} alt={profile.name} />}
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
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="my-name">Full name</FieldLabel>
                  <Input
                    id="my-name"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Field>
              <FieldLabel htmlFor="my-email">Email</FieldLabel>
              <Input
                id="my-email"
                defaultValue={profile.email}
                readOnly
                disabled
              />
            </Field>

            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="my-phone">Phone</FieldLabel>
                  <Input id="my-phone" {...field} />
                </Field>
              )}
            />

            <Field>
              <FieldLabel htmlFor="my-photo">Photo</FieldLabel>
              <Input
                id="my-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={!r2Configured}
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
              <FieldDescription>
                {r2Configured
                  ? "JPG, PNG or WebP, up to 5 MB."
                  : "File storage (R2) is not configured; photo uploads are disabled."}
              </FieldDescription>
            </Field>
          </FieldGroup>

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
