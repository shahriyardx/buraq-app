"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Megaphone, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { trpc } from "@/trpc/client";

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  authorName: string | null;
  publishedAt: Date;
};

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  body: z.string().min(2, "Message is required"),
});

type FormValues = z.infer<typeof schema>;

function CreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const create = trpc.announcements.create.useMutation();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", body: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await create.mutateAsync(values);
      toast.success("Announcement published.");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

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
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              control={control}
              name="title"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="title">Title</FieldLabel>
                  <Input
                    id="title"
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
              name="body"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="body">Message</FieldLabel>
                  <Textarea
                    id="body"
                    rows={4}
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
              {create.isPending ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const remove = trpc.announcements.delete.useMutation();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={remove.isPending}
      onClick={async () => {
        try {
          await remove.mutateAsync({ id });
          toast.success("Announcement deleted.");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        }
      }}
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
