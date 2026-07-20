"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";

const schema = z.object({
  attendanceThreshold: z
    .number()
    .int("Threshold must be a whole number")
    .min(0, "Threshold must be at least 0")
    .max(100, "Threshold must be at most 100"),
});

type FormValues = z.infer<typeof schema>;

export function ThresholdForm({
  attendanceThreshold,
}: {
  attendanceThreshold: number;
}) {
  const router = useRouter();
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { attendanceThreshold },
  });

  const update = trpc.settings.updateThreshold.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync({
        attendanceThreshold: values.attendanceThreshold,
      });
      toast.success("Attendance threshold saved.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FieldGroup className="max-w-xs">
          <Controller
            control={control}
            name="attendanceThreshold"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="attendanceThreshold">
                  Attendance threshold (%)
                </FieldLabel>
                <Input
                  id="attendanceThreshold"
                  type="number"
                  min={0}
                  max={100}
                  aria-invalid={fieldState.invalid}
                  name={field.name}
                  ref={field.ref}
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
                <p className="text-xs text-muted-foreground">
                  Minimum attendance rate students must maintain to remain in
                  good standing.
                </p>
              </Field>
            )}
          />
        </FieldGroup>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save threshold"}
        </Button>
      </form>
    </Card>
  );
}
