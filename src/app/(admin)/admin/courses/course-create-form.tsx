"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
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

const WEEKDAYS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
];

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
  slots: z
    .array(
      z.object({
        weekday: z.string(),
        startTime: z.string().min(1, "Required"),
        endTime: z.string().min(1, "Required"),
        capacity: z.string().min(1, "Required"),
      }),
    )
    .optional(),
});

type FormValues = z.infer<typeof schema>;

function toInt(v?: string) {
  const t = v?.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

export function CourseCreateForm() {
  const router = useRouter();
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      level: undefined,
      instructorUserId: undefined,
      durationWeeks: "8",
      price: "0",
      maxBookingsPerWeek: "1",
      enrollmentPaused: false,
      schedule: "",
      slots: [],
    },
  });
  const slots = useFieldArray({ control, name: "slots" });
  const instructors = trpc.instructors.options.useQuery();
  const create = trpc.courses.create.useMutation();

  async function onSubmit(values: FormValues) {
    const slotsPayload = (values.slots ?? [])
      .filter((s) => s.startTime && s.endTime)
      .map((s) => ({
        weekday: Number(s.weekday),
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: Math.max(1, toInt(s.capacity) ?? 1),
      }));
    try {
      const res = await create.mutateAsync({
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
        slots: slotsPayload.length ? slotsPayload : undefined,
      });
      toast.success(`Course ${values.name} created.`);
      router.push(`/admin/courses/${res.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold">Details</h2>
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
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Training slots
            </h2>
            <p className="text-sm text-muted-foreground">
              Weekly time windows students can book. Seats = capacity per week.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              slots.append({
                weekday: "1",
                startTime: "16:00",
                endTime: "17:00",
                capacity: "6",
              })
            }
          >
            Add slot
          </Button>
        </div>

        {slots.fields.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No slots yet. You can also add them later on the course page.
          </p>
        ) : (
          <div className="space-y-3">
            {slots.fields.map((f, idx) => (
              <div
                key={f.id}
                className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]"
              >
                <Controller
                  control={control}
                  name={`slots.${idx}.weekday`}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Day</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name={`slots.${idx}.startTime`}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Start</FieldLabel>
                      <Input type="time" {...field} />
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name={`slots.${idx}.endTime`}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>End</FieldLabel>
                      <Input type="time" {...field} />
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name={`slots.${idx}.capacity`}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Seats</FieldLabel>
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        {...field}
                      />
                    </Field>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => slots.remove(idx)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/courses")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create course"}
        </Button>
      </div>
    </form>
  );
}
