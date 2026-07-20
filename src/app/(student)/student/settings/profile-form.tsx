"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/lib/form";
import { initials } from "@/lib/format";
import { updateProfileAction } from "./actions";

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
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      router.refresh();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" defaultValue={profile.name} readOnly disabled />
          <p className="text-xs text-muted-foreground">
            Managed by the school administration.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentId">Student ID</Label>
          <Input
            id="studentId"
            defaultValue={profile.studentId ?? "—"}
            readOnly
            disabled
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" defaultValue={profile.email} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            name="address"
            defaultValue={profile.address ?? ""}
            rows={2}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="photo">Photo</Label>
          <Input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            disabled={!r2Configured}
          />
          {!r2Configured && (
            <p className="text-xs text-muted-foreground">
              File storage (R2) is not configured; photo uploads are disabled.
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
