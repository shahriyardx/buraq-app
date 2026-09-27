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
import { MyProfileForm } from "./my-profile-form";
import { SchoolProfileForm } from "./school-profile-form";
import { ThresholdForm } from "./threshold-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireAdmin();
  const [data, me] = await Promise.all([
    api.settings.get(),
    api.settings.myProfile(),
  ]);
  const r2Configured = isR2Configured();

  const adminRows = data.admins.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    status: a.status,
    isSuperAdmin: a.isSuperAdmin,
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
        description="Your account, school profile, admins, templates, and audit trail."
      />

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">My Account</TabsTrigger>
          <TabsTrigger value="profile">School</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="email">Email Templates</TabsTrigger>
          <TabsTrigger value="certificate">Certificate</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <MyProfileForm profile={me} r2Configured={r2Configured} />
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <SchoolProfileForm
            settings={data.profile}
            r2Configured={r2Configured}
          />
          <ThresholdForm attendanceThreshold={data.attendanceThreshold} />
        </TabsContent>

        <TabsContent value="admins">
          <AdminsPanel
            admins={adminRows}
            currentUserId={session.user.id}
            canManage={data.isSuperAdmin}
          />
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
