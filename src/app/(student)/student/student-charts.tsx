"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const COLORS: Record<string, string> = {
  Present: "var(--chart-4)",
  Late: "var(--chart-2)",
  Absent: "var(--destructive)",
  Excused: "var(--chart-3)",
};

export function AttendanceDonut({
  data,
  rate,
}: {
  data: { name: string; value: number }[];
  rate: number;
}) {
  const hasData = data.some((d) => d.value > 0);
  return (
    <div className="relative h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={hasData ? data : [{ name: "None", value: 1 }]}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={75}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {(hasData ? data : [{ name: "None", value: 1 }]).map((d) => (
              <Cell
                key={d.name}
                fill={
                  hasData ? (COLORS[d.name] ?? "var(--muted)") : "var(--muted)"
                }
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{rate}%</span>
        <span className="text-xs text-muted-foreground">present</span>
      </div>
    </div>
  );
}
