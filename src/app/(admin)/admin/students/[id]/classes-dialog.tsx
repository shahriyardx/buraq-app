"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";

/** Edit how many classes one enrollment needs (compensation / migration). */
export function ClassesDialog({
  enrollmentId,
  courseName,
  completed,
  total,
  courseClasses,
}: {
  enrollmentId: string;
  courseName: string;
  completed: number;
  total: number;
  courseClasses: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(total));
  const save = trpc.courses.setTotalClasses.useMutation();

  async function submit() {
    const n = Number.parseInt(value, 10);
    if (!n || n < 1) {
      toast.error("Enter at least 1 class.");
      return;
    }
    try {
      await save.mutateAsync({ enrollmentId, total: n });
      toast.success("Classes updated.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setValue(String(total));
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Classes · {courseName}</DialogTitle>
          <DialogDescription>
            Course default is {courseClasses}. Add 1 for a compensation class.
            Lower it for a rider who already did classes before.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="total-classes">Total classes</FieldLabel>
          <Input
            id="total-classes"
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Done so far: {completed}. Left after saving:{" "}
            {Math.max(0, (Number.parseInt(value, 10) || 0) - completed)}.
          </p>
        </Field>
        <DialogFooter>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
