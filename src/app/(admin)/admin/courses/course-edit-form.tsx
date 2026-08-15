"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { trpc } from "@/trpc/client";

const UNASSIGNED = "__unassigned__";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  level: z.string().optional(),
  instructorUserId: z.string().optional(),
  durationWeeks: z.string().optional(),
  price: z
    .string()
    .refine((v) => v.trim() !== "" && Number(v) >= 0, "Price must be positive"),
  maxBookingsPerWeek: z.string().optional(),
  enrollmentPaused: z.boolean().optional(),
  schedule: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export type CourseEditValues = {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  durationWeeks: number | null;
  price: string;
  maxBookingsPerWeek: number;
  enrollmentPaused: boolean;
  instructorUserId: string | null;
  schedule: string | null;
};

function toInt(v?: string) {
  const t = v?.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

export function CourseEditForm({ course }: { course: CourseEditValues }) {
  const router = useRouter();
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: course.name,
      description: course.description ?? "",
      level: course.level ?? undefined,
      instructorUserId: course.instructorUserId ?? undefined,
      durationWeeks:
        course.durationWeeks != null ? String(course.durationWeeks) : "",
      price: course.price,
      maxBookingsPerWeek: String(course.maxBookingsPerWeek),
      enrollmentPaused: course.enrollmentPaused,
      schedule: course.schedule ?? "",
    },
  });
  const instructors = trpc.instructors.options.useQuery();
  const update = trpc.courses.update.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync({
        id: course.id,
        name: values.name,
        description: values.description || null,
        level: values.level || null,
        instructorUserId:
          values.instructorUserId && values.instructorUserId !== UNASSIGNED
            ? values.instructorUserId
            : null,
        durationWeeks: toInt(values.durationWeeks),
        price: Number(values.price),
        maxBookingsPerWeek: toInt(values.maxBookingsPerWeek) ?? 1,
        enrollmentPaused: values.enrollmentPaused ?? false,
        schedule: values.schedule || null,
      });
      toast.success("Course updated.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-heading text-lg font-semibold">Details</h2>
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
                <FieldLabel htmlFor="name">Course name</FieldLabel>
                <Input id="name" aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea id="description" rows={2} {...field} />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="level"
            render={({ field }) => (
              <Field>
                <FieldLabel>Level</FieldLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            control={control}
            name="instructorUserId"
            render={({ field }) => (
              <Field>
                <FieldLabel>Instructor</FieldLabel>
                <Select
                  value={field.value ?? UNASSIGNED}
                  onValueChange={(v) =>
                    field.onChange(v === UNASSIGNED ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {instructors.data?.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            control={control}
            name="durationWeeks"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="durationWeeks">
                  Duration (weeks)
                </FieldLabel>
                <Input id="durationWeeks" type="number" min={0} {...field} />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="price"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="price">Price</FieldLabel>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step="0.01"
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
            name="maxBookingsPerWeek"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="maxBookingsPerWeek">
                  Bookings / week
                </FieldLabel>
                <Input
                  id="maxBookingsPerWeek"
                  type="number"
                  min={1}
                  {...field}
                />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="schedule"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="schedule">Schedule (label)</FieldLabel>
                <Input
                  id="schedule"
                  placeholder="e.g. Mon & Wed 4pm"
                  {...field}
                />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="enrollmentPaused"
            render={({ field }) => (
              <Field
                orientation="horizontal"
                className="items-start gap-3 sm:col-span-2"
              >
                <Checkbox
                  id="enrollmentPaused"
                  checked={field.value ?? false}
                  onCheckedChange={(c) => field.onChange(c === true)}
                />
                <div className="space-y-0.5">
                  <FieldLabel htmlFor="enrollmentPaused">
                    Pause new enrollment
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Students can't self-enroll; admins still can.
                  </p>
                </div>
              </Field>
            )}
          />
        </FieldGroup>

        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save details"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
