"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/form";
import { updateCertificateTemplateAction } from "./actions";

export type CertificateTemplateValues = {
  signatureName: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  designUrl: string | null;
};

function AssetPreview({ url, alt }: { url: string | null; alt: string }) {
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="h-12 w-auto rounded border" />
  );
}

export function CertificateTemplateForm({
  template,
  r2Configured,
}: {
  template: CertificateTemplateValues;
  r2Configured: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateCertificateTemplateAction,
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
        <div className="space-y-2">
          <Label htmlFor="signatureName">Signatory name</Label>
          <Input
            id="signatureName"
            name="signatureName"
            defaultValue={template.signatureName ?? ""}
            placeholder="Head of School"
          />
        </div>

        {!r2Configured && (
          <p className="text-xs text-muted-foreground">
            File storage (R2) is not configured; image uploads are disabled.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="logo">Logo</Label>
            <AssetPreview url={template.logoUrl} alt="Certificate logo" />
            <Input
              id="logo"
              name="logo"
              type="file"
              accept="image/*"
              disabled={!r2Configured}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signature">Signature</Label>
            <AssetPreview url={template.signatureUrl} alt="Signature" />
            <Input
              id="signature"
              name="signature"
              type="file"
              accept="image/*"
              disabled={!r2Configured}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="design">Background design</Label>
            <AssetPreview url={template.designUrl} alt="Design" />
            <Input
              id="design"
              name="design"
              type="file"
              accept="image/*"
              disabled={!r2Configured}
            />
          </div>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save template"}
        </Button>
      </form>
    </Card>
  );
}
