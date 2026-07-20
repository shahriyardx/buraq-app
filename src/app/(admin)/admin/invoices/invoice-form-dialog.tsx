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
import { trpc } from "@/trpc/client";

export type StudentOption = { id: string; name: string };
export type CourseOption = { id: string; name: string; price: string };

const schema = z
  .object({
    studentId: z.string().min(1, "Student is required"),
    courseId: z.string().optional(),
    amount: z
      .string()
      .refine((v) => Number(v) > 0, "Amount must be greater than 0"),
    discount: z
      .string()
      .refine((v) => Number(v) >= 0, "Discount cannot be negative"),
    dueDate: z.string().min(1, "Due date is required"),
  })
  .refine((v) => Number(v.discount) <= Number(v.amount), {
    message: "Discount cannot exceed the amount.",
    path: ["discount"],
  });

type FormValues = z.infer<typeof schema>;

export function InvoiceFormDialog({
  students,
  courses,
  trigger,
}: {
  students: StudentOption[];
  courses: CourseOption[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { control, handleSubmit, reset, setValue, getValues } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        studentId: "",
        courseId: undefined,
        amount: "",
        discount: "0",
        dueDate: "",
      },
    });

  const create = trpc.invoices.create.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      const res = await create.mutateAsync({
        studentId: values.studentId,
        courseId: values.courseId || null,
        amount: values.amount,
        discount: values.discount,
        dueDate: values.dueDate,
      });
      toast.success(`Invoice ${res.invoiceNumber} created.`);
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate invoice</DialogTitle>
          <DialogDescription>
            Create an invoice for a student, optionally tied to a course.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup className="sm:grid sm:grid-cols-2 sm:gap-4">
            <Controller
              control={control}
              name="studentId"
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className="sm:col-span-2"
                >
                  <FieldLabel>Student</FieldLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={control}
              name="courseId"
              render={({ field }) => (
                <Field className="sm:col-span-2">
                  <FieldLabel>Course (optional)</FieldLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => {
                      field.onChange(v || undefined);
                      const course = courses.find((c) => c.id === v);
                      if (course && !getValues("amount")) {
                        setValue("amount", course.price);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Controller
              control={control}
              name="amount"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="amount">Amount</FieldLabel>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
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
              name="discount"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="discount">Discount</FieldLabel>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
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
              name="dueDate"
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className="sm:col-span-2"
                >
                  <FieldLabel htmlFor="dueDate">Due date</FieldLabel>
                  <Input
                    id="dueDate"
                    type="date"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Generate invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
