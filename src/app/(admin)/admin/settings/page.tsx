import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isR2Configured } from "@/lib/r2";
import { AdminsPanel } from "./admins-panel";
import { AuditLog } from "./audit-log";
import { CertificateTemplateForm } from "./certificate-template-form";
import { EmailTemplatesForm } from "./email-templates-form";
import { SchoolProfileForm } from "./school-profile-form";
import { ThresholdForm } from "./threshold-form";

export const metadata: Metadata = { title: "Settings" };

const TEMPLATE_ORDER = [
  "ENROLLMENT",
  "INVOICE",
  "CERTIFICATE",
  "SUPPORT",
] as const;

export default async function SettingsPage() {
  const session = await requireAdmin();

  const [settings, certTemplate, emailTemplates, admins, auditLogs] =
    await Promise.all([
      prisma.schoolSettings.findUnique({ where: { id: "singleton" } }),
      prisma.certificateTemplate.findUnique({ where: { id: "singleton" } }),
      prisma.emailTemplate.findMany(),
      prisma.user.findMany({
        where: { role: "ADMIN" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

  const profile = {
    name: settings?.name ?? "Buraq Horse Riding School",
    logoUrl: settings?.logoUrl ?? null,
    address: settings?.address ?? null,
    phone: settings?.phone ?? null,
    email: settings?.email ?? null,
    officeHours: settings?.officeHours ?? null,
  };

  const byKey = new Map(emailTemplates.map((t) => [t.key, t]));
  const templates = TEMPLATE_ORDER.map((key) => {
    const t = byKey.get(key);
    return {
      key,
      subject: t?.subject ?? "",
      body: t?.body ?? "",
    };
  });

  const certificate = {
    signatureName: certTemplate?.signatureName ?? null,
    logoUrl: certTemplate?.logoUrl ?? null,
    signatureUrl: certTemplate?.signatureUrl ?? null,
    designUrl: certTemplate?.designUrl ?? null,
  };

  const adminRows = admins.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  }));

  const auditRows = auditLogs.map((l) => ({
    id: l.id,
    actorName: l.actorName,
    action: l.action,
    entity: l.entity,
    detail: l.detail,
    ip: l.ip,
    createdAt: l.createdAt.toISOString(),
  }));

  const r2Configured = isR2Configured();

  return (
    <>
      <PageHeader
        title="Settings"
        description="School profile, admins, templates, and audit trail."
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="email">Email Templates</TabsTrigger>
          <TabsTrigger value="certificate">Certificate</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <SchoolProfileForm settings={profile} r2Configured={r2Configured} />
          <ThresholdForm
            attendanceThreshold={settings?.attendanceThreshold ?? 75}
          />
        </TabsContent>

        <TabsContent value="admins">
          <AdminsPanel admins={adminRows} currentUserId={session.user.id} />
        </TabsContent>

        <TabsContent value="email">
          <EmailTemplatesForm templates={templates} />
        </TabsContent>

        <TabsContent value="certificate">
          <CertificateTemplateForm
            template={certificate}
            r2Configured={r2Configured}
          />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLog rows={auditRows} />
        </TabsContent>
      </Tabs>
    </>
  );
}
