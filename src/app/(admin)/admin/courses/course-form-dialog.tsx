"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const WEEKDAYS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
];

export type CourseFormValues = {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  durationWeeks: number | null;
  price: string;
  maxBookingsPerWeek: number;
  instructor: string | null;
  instructorUserId: string | null;
  schedule: string | null;
};

function toInt(v?: string) {
  const t = v?.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

export function CourseFormDialog({
  mode,
  course,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  mode: "create" | "edit";
  course?: CourseFormValues;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: course?.name ?? "",
      description: course?.description ?? "",
      level: course?.level ?? undefined,
      instructorUserId: course?.instructorUserId ?? undefined,
      durationWeeks:
        course?.durationWeeks != null ? String(course.durationWeeks) : "",
      price: course?.price ?? "0",
      maxBookingsPerWeek:
        course?.maxBookingsPerWeek != null
          ? String(course.maxBookingsPerWeek)
          : "1",
      schedule: course?.schedule ?? "",
      slots: [],
    },
  });

  const slots = useFieldArray({ control, name: "slots" });

  const create = trpc.courses.create.useMutation();
  const update = trpc.courses.update.useMutation();
  const instructors = trpc.instructors.options.useQuery();
  const pending = create.isPending || update.isPending;

  async function onSubmit(values: FormValues) {
    const payload = {
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
      schedule: values.schedule || null,
    };

    try {
      if (mode === "create") {
        const slotsPayload = (values.slots ?? [])
          .filter((s) => s.startTime && s.endTime)
          .map((s) => ({
            weekday: Number(s.weekday),
            startTime: s.startTime,
            endTime: s.endTime,
            capacity: Math.max(1, toInt(s.capacity) ?? 1),
          }));
        await create.mutateAsync({
          ...payload,
          slots: slotsPayload.length ? slotsPayload : undefined,
        });
        toast.success(`Course ${values.name} created.`);
      } else if (course) {
        await update.mutateAsync({ id: course.id, ...payload });
        toast.success("Course updated.");
      }
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add course" : "Edit course"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new course offering."
              : "Update this course's details."}
          </DialogDescription>
        </DialogHeader>

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
                  <Input
                    id="name"
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
          </FieldGroup>

          {mode === "create" && (
            <div className="mt-5 space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Training slots</p>
                  <p className="text-xs text-muted-foreground">
                    Weekly time windows students can book. Add more later on the
                    course page.
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
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No slots yet.
                </p>
              ) : (
                slots.fields.map((f, idx) => (
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
                      size="sm"
                      onClick={() => slots.remove(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : mode === "create" ? "Add course" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
