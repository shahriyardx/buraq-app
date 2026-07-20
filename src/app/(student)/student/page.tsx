import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default function StudentDashboardPage() {
  return (
    <>
      <PageHeader title="Welcome" description="Your student dashboard." />
      <Card className="p-6 text-sm text-muted-foreground">
        The student panel is coming soon.
      </Card>
    </>
  );
}
