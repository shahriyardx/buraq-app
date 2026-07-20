import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AnnouncementsClient } from "./announcements-client";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  await requireAdmin();
  const rows = await prisma.announcement.findMany({
    orderBy: { publishedAt: "desc" },
  });

  // Resolve author names in one query.
  const authorIds = [...new Set(rows.map((r) => r.authorId))];
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(authors.map((a) => [a.id, a.name]));

  const items = rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    authorName: nameById.get(r.authorId) ?? null,
    publishedAt: r.publishedAt.toISOString(),
  }));

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
