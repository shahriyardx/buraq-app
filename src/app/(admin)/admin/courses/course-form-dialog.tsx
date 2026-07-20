"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  level: z.string().optional(),
  instructor: z.string().optional(),
  durationWeeks: z.string().optional(),
  price: z
    .string()
    .refine((v) => v.trim() !== "" && Number(v) >= 0, "Price must be positive"),
  maxStudents: z.string().optional(),
  schedule: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export type CourseFormValues = {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  durationWeeks: number | null;
  price: string;
  maxStudents: number | null;
  instructor: string | null;
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
      instructor: course?.instructor ?? "",
      durationWeeks:
        course?.durationWeeks != null ? String(course.durationWeeks) : "",
      price: course?.price ?? "0",
      maxStudents:
        course?.maxStudents != null ? String(course.maxStudents) : "",
      schedule: course?.schedule ?? "",
    },
  });

  const create = trpc.courses.create.useMutation();
  const update = trpc.courses.update.useMutation();
  const pending = create.isPending || update.isPending;

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      description: values.description || null,
      level: values.level || null,
      instructor: values.instructor || null,
      durationWeeks: toInt(values.durationWeeks),
      price: Number(values.price),
      maxStudents: toInt(values.maxStudents),
      schedule: values.schedule || null,
    };

    try {
      if (mode === "create") {
        await create.mutateAsync(payload);
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
              name="instructor"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="instructor">Instructor</FieldLabel>
                  <Input id="instructor" {...field} />
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
              name="maxStudents"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="maxStudents">Max students</FieldLabel>
                  <Input id="maxStudents" type="number" min={0} {...field} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="schedule"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="schedule">Schedule</FieldLabel>
                  <Input
                    id="schedule"
                    placeholder="e.g. Mon & Wed 4pm"
                    {...field}
                  />
                </Field>
              )}
            />
          </FieldGroup>

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
