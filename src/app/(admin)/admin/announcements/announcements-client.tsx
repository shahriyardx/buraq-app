"use client";

import { Megaphone, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/lib/form";
import { formatDateTime } from "@/lib/format";
import { createAnnouncementAction, deleteAnnouncementAction } from "./actions";

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  authorName: string | null;
  publishedAt: string;
};

function CreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    createAnnouncementAction,
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
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="mr-2 size-4" />
            New announcement
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
          <DialogDescription>
            Published announcements are visible to all students.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" name="body" rows={4} required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteAnnouncementAction(id);
          toast.success("Announcement deleted.");
          router.refresh();
        })
      }
    >
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}

export function AnnouncementsClient({ items }: { items: AnnouncementItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateDialog />
      </div>
      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
          <Megaphone className="size-6" />
          No announcements yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card
              key={a.id}
              className="flex flex-row items-start justify-between gap-4 p-5"
            >
              <div className="space-y-1">
                <p className="font-semibold">{a.title}</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {a.body}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.authorName ?? "Admin"} · {formatDateTime(a.publishedAt)}
                </p>
              </div>
              <DeleteButton id={a.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
