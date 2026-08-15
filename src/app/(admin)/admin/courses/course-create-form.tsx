"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
});

type FormValues = z.infer<typeof schema>;

type Range = { start: string; end: string; min: string };
type DayGroup = { weekday: string; ranges: Range[] };

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
    },
  });
  const [days, setDays] = useState<DayGroup[]>([]);
  const instructors = trpc.instructors.options.useQuery();
  const create = trpc.courses.create.useMutation();

  const usedWeekdays = new Set(days.map((d) => d.weekday));
  function addDay() {
    const next = WEEKDAYS.find((w) => !usedWeekdays.has(w.value));
    setDays((ds) => [
      ...ds,
      {
        weekday: next?.value ?? "1",
        ranges: [{ start: "16:00", end: "19:00", min: "30" }],
      },
    ]);
  }
  function updateDay(i: number, patch: Partial<DayGroup>) {
    setDays((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }
  function addRange(i: number) {
    updateDay(i, {
      ranges: [...days[i].ranges, { start: "09:00", end: "10:00", min: "30" }],
    });
  }
  function updateRange(i: number, r: number, patch: Partial<Range>) {
    updateDay(i, {
      ranges: days[i].ranges.map((rg, idx) =>
        idx === r ? { ...rg, ...patch } : rg,
      ),
    });
  }
  function removeRange(i: number, r: number) {
    updateDay(i, { ranges: days[i].ranges.filter((_, idx) => idx !== r) });
  }
  function removeDay(i: number) {
    setDays((ds) => ds.filter((_, idx) => idx !== i));
  }

  async function onSubmit(values: FormValues) {
    const slotsPayload = days.flatMap((d) =>
      d.ranges
        .filter((r) => r.start && r.end)
        .map((r) => ({
          weekday: Number(d.weekday),
          startTime: r.start,
          endTime: r.end,
          sessionMinutes: Math.max(5, toInt(r.min) ?? 30),
          capacity: 1,
        })),
    );
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
              Training days & slots
            </h2>
            <p className="text-sm text-muted-foreground">
              Add a day, then the time ranges on that day. Each range splits
              into single-rider sessions. Students book one session per day.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDay}
            disabled={days.length >= WEEKDAYS.length}
          >
            Add day
          </Button>
        </div>

        {days.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No days yet. Add them here, or later on the course page.
          </p>
        ) : (
          <div className="space-y-4">
            {days.map((day, i) => (
              <div key={day.weekday} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Select
                    value={day.weekday}
                    onValueChange={(v) => updateDay(i, { weekday: v })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((d) => (
                        <SelectItem
                          key={d.value}
                          value={d.value}
                          disabled={
                            d.value !== day.weekday && usedWeekdays.has(d.value)
                          }
                        >
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addRange(i)}
                    >
                      Add time range
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDay(i)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {day.ranges.map((r, ri) => (
                    <div
                      key={`${day.weekday}-${ri}`}
                      className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[auto_auto_auto_auto]"
                    >
                      <Field>
                        <FieldLabel>Start</FieldLabel>
                        <Input
                          type="time"
                          value={r.start}
                          onChange={(e) =>
                            updateRange(i, ri, { start: e.target.value })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>End</FieldLabel>
                        <Input
                          type="time"
                          value={r.end}
                          onChange={(e) =>
                            updateRange(i, ri, { end: e.target.value })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Min/session</FieldLabel>
                        <Input
                          type="number"
                          min={5}
                          className="w-24"
                          value={r.min}
                          onChange={(e) =>
                            updateRange(i, ri, { min: e.target.value })
                          }
                        />
                      </Field>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={day.ranges.length <= 1}
                        onClick={() => removeRange(i, ri)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
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
