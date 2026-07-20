"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { formatDate } from "@/lib/format";
import { trpc } from "@/trpc/client";

export type SessionRow = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  instructor: string | null;
};

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  instructor: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function AddSessionDialog({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: "", startTime: "", endTime: "", instructor: "" },
  });
  const add = trpc.courses.addClassSession.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      await add.mutateAsync({ courseId, ...values });
      toast.success("Class session added.");
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
        <Button size="sm" variant="outline">
          <CalendarPlus className="mr-2 size-4" />
          Add session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add class session</DialogTitle>
          <DialogDescription>
            Schedule a session for this course. It appears in Upcoming Classes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              control={control}
              name="date"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="cs-date">Date</FieldLabel>
                  <Input
                    id="cs-date"
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
            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={control}
                name="startTime"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="cs-start">Start</FieldLabel>
                    <Input id="cs-start" type="time" {...field} />
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="endTime"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="cs-end">End</FieldLabel>
                    <Input id="cs-end" type="time" {...field} />
                  </Field>
                )}
              />
            </div>
            <Controller
              control={control}
              name="instructor"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="cs-instr">Instructor</FieldLabel>
                  <Input id="cs-instr" {...field} />
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? "Adding…" : "Add session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSession({ id }: { id: string }) {
  const router = useRouter();
  const del = trpc.courses.deleteClassSession.useMutation();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={del.isPending}
      onClick={async () => {
        await del.mutateAsync({ id });
        toast.success("Session removed.");
        router.refresh();
      }}
    >
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}

export function ClassSchedule({
  courseId,
  sessions,
}: {
  courseId: string;
  sessions: SessionRow[];
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-semibold">Class schedule</p>
          <p className="text-sm text-muted-foreground">
            Sessions feed the Upcoming Classes overview.
          </p>
        </div>
        <AddSessionDialog courseId={courseId} />
      </div>
      {sessions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No sessions scheduled.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <div className="text-sm">
                <span className="font-medium">{formatDate(s.date)}</span>
                {s.startTime && (
                  <span className="text-muted-foreground">
                    {" · "}
                    {s.startTime}
                    {s.endTime && `–${s.endTime}`}
                  </span>
                )}
                {s.instructor && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {s.instructor}
                  </span>
                )}
              </div>
              <DeleteSession id={s.id} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
