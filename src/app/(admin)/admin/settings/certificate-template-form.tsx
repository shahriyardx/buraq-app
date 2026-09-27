"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { uploadFile } from "@/lib/upload-client";
import { trpc } from "@/trpc/client";

export type CertificateTemplateValues = {
  signatureName: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  designUrl: string | null;
};

const schema = z.object({
  signatureName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

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
  const [logo, setLogo] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [design, setDesign] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { signatureName: template.signatureName ?? "" },
  });

  const update = trpc.settings.updateCertificateTemplate.useMutation();
  const pending = update.isPending || uploading;

  async function onSubmit(values: FormValues) {
    try {
      let logoUrl: string | undefined;
      let signatureUrl: string | undefined;
      let designUrl: string | undefined;
      if (r2Configured && (logo || signature || design)) {
        setUploading(true);
        if (logo) logoUrl = await uploadFile(logo, "certificates");
        if (signature)
          signatureUrl = await uploadFile(signature, "certificates");
        if (design) designUrl = await uploadFile(design, "certificates");
        setUploading(false);
      }

      await update.mutateAsync({
        signatureName: values.signatureName || null,
        logoUrl,
        signatureUrl,
        designUrl,
      });
      toast.success("Certificate template saved.");
      setLogo(null);
      setSignature(null);
      setDesign(null);
      router.refresh();
    } catch (err) {
      setUploading(false);
      toast.error((err as Error).message);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FieldGroup>
          <Controller
            control={control}
            name="signatureName"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="signatureName">Signatory name</FieldLabel>
                <Input
                  id="signatureName"
                  placeholder="Head of School"
                  {...field}
                />
              </Field>
            )}
          />
        </FieldGroup>

        {!r2Configured && (
          <p className="text-xs text-muted-foreground">
            File storage (R2) is not configured; image uploads are disabled.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="logo">Logo</FieldLabel>
            <AssetPreview url={template.logoUrl} alt="Certificate logo" />
            <Input
              id="logo"
              type="file"
              accept="image/jpeg,image/png"
              disabled={!r2Configured}
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="signature">Signature</FieldLabel>
            <AssetPreview url={template.signatureUrl} alt="Signature" />
            <Input
              id="signature"
              type="file"
              accept="image/jpeg,image/png"
              disabled={!r2Configured}
              onChange={(e) => setSignature(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="design">Background design</FieldLabel>
            <AssetPreview url={template.designUrl} alt="Design" />
            <Input
              id="design"
              type="file"
              accept="image/jpeg,image/png"
              disabled={!r2Configured}
              onChange={(e) => setDesign(e.target.files?.[0] ?? null)}
            />
          </Field>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save template"}
        </Button>
      </form>
    </Card>
  );
}
