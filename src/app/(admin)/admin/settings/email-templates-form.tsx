"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EMAIL_TEMPLATES, type EmailTemplateKey } from "@/lib/mail/templates";
import { trpc } from "@/trpc/client";

export type EmailTemplateValues = {
  key: EmailTemplateKey;
  subject: string;
  body: string;
  customized: boolean;
};

const schema = z.object({
  subject: z.string().trim().min(1, "Subject is required"),
  body: z.string().trim().min(1, "Body is required"),
});

type FormValues = z.infer<typeof schema>;

function TemplateCard({ template }: { template: EmailTemplateValues }) {
  const router = useRouter();
  const def = EMAIL_TEMPLATES[template.key];
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: template.subject, body: template.body },
  });

  const update = trpc.settings.updateEmailTemplate.useMutation();
  const restore = trpc.settings.resetEmailTemplate.useMutation();
  const test = trpc.settings.sendTestEmail.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync({ key: template.key, ...values });
      toast.success(`“${def.label}” saved.`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function onReset() {
    try {
      await restore.mutateAsync({ key: template.key });
      reset({ subject: def.subject, body: def.body });
      toast.success(`“${def.label}” reset to the default text.`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function onTest() {
    try {
      const res = await test.mutateAsync({ key: template.key });
      toast.success(`Test email sent to ${res.to}.`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const busy = update.isPending || restore.isPending;

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-medium">{def.label}</h3>
            <p className="text-sm text-muted-foreground">{def.description}</p>
          </div>
          <div className="flex gap-2">
            {def.alwaysSend ? (
              <Badge variant="secondary">Always sent</Badge>
            ) : (
              <Badge variant="outline">Can be turned off</Badge>
            )}
            {template.customized && <Badge>Customized</Badge>}
          </div>
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
                <FieldLabel htmlFor={`body-${template.key}`}>
                  Message
                </FieldLabel>
                <Textarea
                  id={`body-${template.key}`}
                  rows={7}
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  <FieldDescription>
                    Leave a blank line between paragraphs. The logo, heading,
                    {def.details ? " summary table," : ""}
                    {def.cta ? ` “${def.cta.label}” button,` : ""} sign-off and
                    footer are added for you.
                  </FieldDescription>
                )}
              </Field>
            )}
          />
        </FieldGroup>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground">Variables:</span>
          {def.vars.map((v) => (
            <code
              key={v}
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
            >{`{{${v}}}`}</code>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {update.isPending ? "Saving…" : "Save template"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onTest}
            disabled={test.isPending}
          >
            {test.isPending ? "Sending…" : "Send test to me"}
          </Button>
          {template.customized && (
            <Button
              type="button"
              variant="ghost"
              onClick={onReset}
              disabled={busy}
            >
              Reset to default
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

export function EmailTemplatesForm({
  templates,
}: {
  templates: EmailTemplateValues[];
}) {
  const groups = [
    {
      title: "Emails to students and staff",
      items: templates.filter(
        (t) => EMAIL_TEMPLATES[t.key].audience === "member",
      ),
    },
    {
      title: "Alerts to administrators",
      items: templates.filter(
        (t) => EMAIL_TEMPLATES[t.key].audience === "admin",
      ),
    },
  ];
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        After you save a template, use “Send test to me” to see the final email
        in your inbox, filled in with example values.
      </p>
      {groups.map((g) => (
        <section key={g.title} className="space-y-4">
          <h2 className="font-heading text-lg font-semibold">{g.title}</h2>
          {g.items.map((t) => (
            <TemplateCard key={t.key} template={t} />
          ))}
        </section>
      ))}
    </div>
  );
}
