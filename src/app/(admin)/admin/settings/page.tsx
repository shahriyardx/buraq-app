import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/dal";
import { isR2Configured } from "@/lib/r2";
import { api } from "@/trpc/server";
import { AdminsPanel } from "./admins-panel";
import { AuditLog } from "./audit-log";
import { CertificateTemplateForm } from "./certificate-template-form";
import { EmailTemplatesForm } from "./email-templates-form";
import { SchoolProfileForm } from "./school-profile-form";
import { ThresholdForm } from "./threshold-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireAdmin();
  const data = await api.settings.get();
  const r2Configured = isR2Configured();

  const adminRows = data.admins.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  }));

  const auditRows = data.auditLogs.map((l) => ({
    id: l.id,
    actorName: l.actorName,
    action: l.action,
    entity: l.entity,
    detail: l.detail,
    ip: l.ip,
    createdAt: l.createdAt.toISOString(),
  }));

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
          <SchoolProfileForm
            settings={data.profile}
            r2Configured={r2Configured}
          />
          <ThresholdForm attendanceThreshold={data.attendanceThreshold} />
        </TabsContent>

        <TabsContent value="admins">
          <AdminsPanel admins={adminRows} currentUserId={session.user.id} />
        </TabsContent>

        <TabsContent value="email">
          <EmailTemplatesForm templates={data.templates} />
        </TabsContent>

        <TabsContent value="certificate">
          <CertificateTemplateForm
            template={data.certificate}
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
