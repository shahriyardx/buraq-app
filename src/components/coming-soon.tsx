import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ComingSoon({ feature }: { feature: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
        <Construction className="size-6" />
      </div>
      <p className="text-lg font-semibold">{feature} is coming soon</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        The student panel is being built out. This section will be available
        shortly.
      </p>
    </Card>
  );
}
