"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { trpc } from "@/trpc/client";

const schema = z.object({ emailNotifications: z.boolean() });
type FormValues = z.infer<typeof schema>;

export function AdminAlertsForm({
  emailNotifications,
}: {
  emailNotifications: boolean;
}) {
  const router = useRouter();
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { emailNotifications },
  });
  const update = trpc.settings.updateMyNotifications.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync(values);
      toast.success(
        values.emailNotifications
          ? "Email alerts turned on."
          : "Email alerts turned off.",
      );
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        control={control}
        name="emailNotifications"
        render={({ field }) => (
          <Field orientation="horizontal" className="items-start gap-3">
            <Checkbox
              id="adminEmailAlerts"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <div className="space-y-1">
              <FieldLabel htmlFor="adminEmailAlerts">Email alerts</FieldLabel>
              <FieldDescription>
                Email me when a student registers, submits a payment, or opens a
                support request.
              </FieldDescription>
            </div>
          </Field>
        )}
      />
      <Button type="submit" disabled={update.isPending}>
        {update.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
