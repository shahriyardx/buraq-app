"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookPlus } from "lucide-react";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/trpc/client";

const schema = z.object({
  courseId: z.string().min(1, "Please select a course."),
  mode: z.enum(["paid", "pay"]),
});

type FormValues = z.infer<typeof schema>;

export function EnrollCourseDialog({
  studentId,
  courses,
}: {
  studentId: string;
  courses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { courseId: "", mode: "paid" },
  });
  const enroll = trpc.courses.enroll.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      await enroll.mutateAsync({
        studentId,
        courseId: values.courseId,
        mode: values.mode,
      });
      toast.success("Student enrolled.");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={courses.length === 0}>
          <BookPlus className="mr-2 size-4" />
          Enroll in course
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll in course</DialogTitle>
          <DialogDescription>
            Enrolling generates an invoice for the course price and emails the
            student.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Controller
            control={control}
            name="courseId"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Course</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
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
            name="mode"
            render={({ field }) => (
              <Field className="mt-3">
                <FieldLabel>Payment</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">
                      Mark as paid (no charge to student)
                    </SelectItem>
                    <SelectItem value="pay">
                      Student must pay the invoice
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={enroll.isPending}>
              {enroll.isPending ? "Enrolling…" : "Enroll"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
