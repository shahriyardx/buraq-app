import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireStudent } from "@/lib/dal";
import { isR2Configured } from "@/lib/r2";
import { api } from "@/trpc/server";
import { ChangePasswordForm } from "./change-password-form";
import { NotificationsForm } from "./notifications-form";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Account Settings" };

export default async function StudentSettingsPage() {
  await requireStudent();
  const account = await api.account.me();

  const profile = {
    name: account.name,
    email: account.email,
    studentId: account.studentId,
    phone: account.phone,
    address: account.address,
    photoUrl: account.photoUrl,
  };

  return (
    <>
      <PageHeader
        title="Account Settings"
        description="Manage your profile, password, and notifications."
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="p-6">
            <CardHeader className="p-0">
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <ProfileForm profile={profile} r2Configured={isR2Configured()} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card className="p-6">
            <CardHeader className="p-0">
              <CardTitle>Change password</CardTitle>
            </CardHeader>
            <CardContent className="max-w-md p-0 pt-4">
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="p-6">
            <CardHeader className="p-0">
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <NotificationsForm
                emailNotifications={account.emailNotifications}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
