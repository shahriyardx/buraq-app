"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/trpc/client";

const schema = z.object({
  body: z.string().min(1, "Message cannot be empty"),
});

type FormValues = z.infer<typeof schema>;

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { body: "" },
  });

  const reply = trpc.support.studentReply.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      await reply.mutateAsync({ ticketId, body: values.body });
      toast.success("Reply sent.");
      reset();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Controller
        control={control}
        name="body"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <Textarea
              rows={3}
              placeholder="Write a reply…"
              aria-label="Reply message"
              aria-invalid={fieldState.invalid}
              {...field}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={reply.isPending}>
          {reply.isPending ? "Sending…" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}
