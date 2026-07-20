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
import { toDateInput } from "@/lib/format";

export type StudentFormValues = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  address: string | null;
  dob: string | null;
};

export function StudentFormDialog({
  mode,
  action,
  student,
  courses,
  trigger,
}: {
  mode: "create" | "edit";
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  student?: StudentFormValues;
  courses?: { id: string; name: string }[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add student" : "Edit student"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a student account and optionally assign a course."
              : "Update this student's details."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={student?.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={student?.email}
                required
              />
            </div>
            {mode === "create" && (
              <div className="space-y-2">
                <Label htmlFor="password">Temp password</Label>
                <Input
                  id="password"
                  name="password"
                  type="text"
                  defaultValue="Student@123"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={student?.phone ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                name="dob"
                type="date"
                defaultValue={toDateInput(student?.dob)}
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select name="gender" defaultValue={student?.gender ?? undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "create" && courses && courses.length > 0 && (
              <div className="space-y-2">
                <Label>Assign course</Label>
                <Select name="courseId">
                  <SelectTrigger>
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
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                defaultValue={student?.address ?? ""}
                rows={2}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="photo">Photo</Label>
              <Input id="photo" name="photo" type="file" accept="image/*" />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : mode === "create" ? "Add student" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
