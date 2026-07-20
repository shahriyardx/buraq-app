"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { trpc } from "@/trpc/client";

const schema = z.object({
  emailNotifications: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function NotificationsForm({
  emailNotifications,
}: {
  emailNotifications: boolean;
}) {
  const router = useRouter();

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { emailNotifications },
  });

  const update = trpc.account.updateNotifications.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync({
        emailNotifications: values.emailNotifications,
      });
      toast.success(
        values.emailNotifications
          ? "Email alerts enabled."
          : "Email alerts disabled.",
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
              id="emailNotifications"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <div className="space-y-1">
              <FieldLabel htmlFor="emailNotifications">Email alerts</FieldLabel>
              <p className="text-sm text-muted-foreground">
                Receive email updates about classes, invoices, and
                announcements.
              </p>
            </div>
          </Field>
        )}
      />

      <Button type="submit" disabled={update.isPending}>
        {update.isPending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}
