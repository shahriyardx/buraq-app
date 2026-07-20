"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  color: "var(--popover-foreground)",
  fontSize: "0.8rem",
} as const;

export function EnrollmentsChart({
  data,
}: {
  data: { month: string; count: number }[];
}) {
  return (
    <Card className="p-5">
      <CardHeader className="p-0">
        <CardTitle>Enrollments</CardTitle>
        <CardDescription>
          New enrollments over the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            />
            <Bar
              dataKey="count"
              name="Enrollments"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function AttendanceChart({
  data,
}: {
  data: { day: string; rate: number }[];
}) {
  return (
    <Card className="p-5">
      <CardHeader className="p-0">
        <CardTitle>Attendance rate</CardTitle>
        <CardDescription>Percent present over the last 7 days</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis dataKey="day" {...axisProps} />
            <YAxis domain={[0, 100]} unit="%" {...axisProps} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ stroke: "var(--border)" }}
              formatter={(value) => [`${value}%`, "Present"]}
            />
            <Line
              type="monotone"
              dataKey="rate"
              name="Present"
              stroke="var(--chart-4)"
              strokeWidth={2}
              dot={{ fill: "var(--chart-4)", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
