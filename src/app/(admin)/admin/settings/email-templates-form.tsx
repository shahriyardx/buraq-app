"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/trpc/client";

const TEMPLATE_KEYS = [
  "ENROLLMENT",
  "INVOICE",
  "CERTIFICATE",
  "SUPPORT",
] as const;

type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type EmailTemplateValues = {
  key: TemplateKey;
  subject: string;
  body: string;
};

const schema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

type FormValues = z.infer<typeof schema>;

const LABELS: Record<string, string> = {
  ENROLLMENT: "Enrollment confirmation",
  INVOICE: "Invoice notification",
  CERTIFICATE: "Certificate issued",
  SUPPORT: "Support reply",
};

function TemplateCard({ template }: { template: EmailTemplateValues }) {
  const router = useRouter();
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: template.subject, body: template.body },
  });

  const update = trpc.settings.updateEmailTemplate.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync({
        key: template.key,
        subject: values.subject,
        body: values.body,
      });
      toast.success(`${template.key} template saved.`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <h3 className="font-medium">
            {LABELS[template.key] ?? template.key}
          </h3>
          <p className="text-xs text-muted-foreground">{template.key}</p>
        </div>
        <FieldGroup>
          <Controller
            control={control}
            name="subject"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`subject-${template.key}`}>
                  Subject
                </FieldLabel>
                <Input
                  id={`subject-${template.key}`}
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
                <FieldLabel htmlFor={`body-${template.key}`}>Body</FieldLabel>
                <Textarea
                  id={`body-${template.key}`}
                  rows={6}
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
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save template"}
        </Button>
      </form>
    </Card>
  );
}

export function EmailTemplatesForm({
  templates,
}: {
  templates: EmailTemplateValues[];
}) {
  return (
    <div className="space-y-4">
      {templates.map((t) => (
        <TemplateCard key={t.key} template={t} />
      ))}
    </div>
  );
}
