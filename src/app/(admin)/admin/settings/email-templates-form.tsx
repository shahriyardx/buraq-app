"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/lib/form";
import { updateEmailTemplateAction } from "./actions";

export type EmailTemplateValues = {
  key: string;
  subject: string;
  body: string;
};

const LABELS: Record<string, string> = {
  ENROLLMENT: "Enrollment confirmation",
  INVOICE: "Invoice notification",
  CERTIFICATE: "Certificate issued",
  SUPPORT: "Support reply",
};

function TemplateCard({ template }: { template: EmailTemplateValues }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateEmailTemplateAction,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      router.refresh();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <Card className="p-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="key" value={template.key} />
        <div>
          <h3 className="font-medium">
            {LABELS[template.key] ?? template.key}
          </h3>
          <p className="text-xs text-muted-foreground">{template.key}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`subject-${template.key}`}>Subject</Label>
          <Input
            id={`subject-${template.key}`}
            name="subject"
            defaultValue={template.subject}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`body-${template.key}`}>Body</Label>
          <Textarea
            id={`body-${template.key}`}
            name="body"
            defaultValue={template.body}
            rows={6}
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save template"}
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
