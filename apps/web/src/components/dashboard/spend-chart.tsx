"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SpendDatum {
  name: string;
  spend: number;
}

export function SpendChart({ data }: { data: SpendDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No spend recorded yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e6d6ca" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: "#6b5d54" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6b5d54" }}
          tickLine={false}
          axisLine={false}
          width={70}
          tickFormatter={(v) =>
            new Intl.NumberFormat("en-IN", {
              notation: "compact",
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 1,
            }).format(v as number)
          }
        />
        <Tooltip
          formatter={(v) =>
            new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(v as number)
          }
          cursor={{ fill: "#f7e7da" }}
        />
        <Bar dataKey="spend" fill="#b89a8a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
