"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/lib/form";
import { updateSchoolProfileAction } from "./actions";

export type SchoolProfileValues = {
  name: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  officeHours: string | null;
};

export function SchoolProfileForm({
  settings,
  r2Configured,
}: {
  settings: SchoolProfileValues;
  r2Configured: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateSchoolProfileAction,
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
    <Card className="p-6">
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">School name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={settings.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Contact email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={settings.email ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={settings.phone ?? ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              defaultValue={settings.address ?? ""}
              rows={2}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="officeHours">Office hours</Label>
            <Input
              id="officeHours"
              name="officeHours"
              placeholder="Mon–Fri, 9am–5pm"
              defaultValue={settings.officeHours ?? ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="logo">Logo</Label>
            {settings.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoUrl}
                alt="Current logo"
                className="h-12 w-auto rounded border"
              />
            )}
            <Input
              id="logo"
              name="logo"
              type="file"
              accept="image/*"
              disabled={!r2Configured}
            />
            {!r2Configured && (
              <p className="text-xs text-muted-foreground">
                File storage (R2) is not configured; logo uploads are disabled.
              </p>
            )}
          </div>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Card>
  );
}
