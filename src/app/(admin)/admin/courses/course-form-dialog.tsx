"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type ActionState, initialActionState } from "@/lib/form";

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

export function CourseFormDialog({
  mode,
  action,
  course,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  mode: "create" | "edit";
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  course?: CourseFormValues;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, router, setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
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

        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Course name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={course?.name}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={course?.description ?? ""}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select name="level" defaultValue={course?.level ?? undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor</Label>
              <Input
                id="instructor"
                name="instructor"
                defaultValue={course?.instructor ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationWeeks">Duration (weeks)</Label>
              <Input
                id="durationWeeks"
                name="durationWeeks"
                type="number"
                min={0}
                defaultValue={course?.durationWeeks ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={course?.price ?? "0"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxStudents">Max students</Label>
              <Input
                id="maxStudents"
                name="maxStudents"
                type="number"
                min={0}
                defaultValue={course?.maxStudents ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule</Label>
              <Input
                id="schedule"
                name="schedule"
                defaultValue={course?.schedule ?? ""}
                placeholder="e.g. Mon & Wed 4pm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : mode === "create" ? "Add course" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
