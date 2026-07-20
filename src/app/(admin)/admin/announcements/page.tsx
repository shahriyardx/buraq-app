import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { api } from "@/trpc/server";
import { AnnouncementsClient } from "./announcements-client";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  await requireAdmin();
  const items = await api.announcements.list();

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Publish notices to all students."
      />
      <AnnouncementsClient items={items} />
    </>
  );
}
