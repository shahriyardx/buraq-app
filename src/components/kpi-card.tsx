import {
  Award,
  BookOpen,
  CalendarCheck,
  LifeBuoy,
  type LucideIcon,
  Receipt,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  users: Users,
  "calendar-check": CalendarCheck,
  award: Award,
  receipt: Receipt,
  "life-buoy": LifeBuoy,
  "book-open": BookOpen,
};

export function KpiCard({
  label,
  value,
  icon,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  icon: string;
  href?: string;
  accent?: boolean;
}) {
  const Icon = ICONS[icon] ?? Users;
  const inner = (
    <Card className="flex flex-row items-center justify-between gap-4 p-5 transition-shadow hover:shadow-md">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-lg",
          accent
            ? "bg-accent text-accent-foreground"
            : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-5" />
      </div>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
