import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireStudent } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isR2Configured } from "@/lib/r2";
import { ChangePasswordForm } from "./change-password-form";
import { NotificationsForm } from "./notifications-form";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Account Settings" };

export default async function StudentSettingsPage() {
  const session = await requireStudent();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      studentId: true,
      phone: true,
      address: true,
      photoUrl: true,
      emailNotifications: true,
    },
  });

  const profile = {
    name: user?.name ?? "",
    email: user?.email ?? "",
    studentId: user?.studentId ?? null,
    phone: user?.phone ?? null,
    address: user?.address ?? null,
    photoUrl: user?.photoUrl ?? null,
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
                emailNotifications={user?.emailNotifications ?? true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
