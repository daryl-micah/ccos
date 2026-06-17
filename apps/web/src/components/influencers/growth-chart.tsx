"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import type { Trends } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

function label(name: string): string {
  return name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function GrowthChart({ influencerId }: { influencerId: string }) {
  const [trends, setTrends] = React.useState<Trends>({});
  const [metric, setMetric] = React.useState<string>("");
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const t = await api.influencers.trends(influencerId);
        setTrends(t);
        const withHistory = Object.keys(t).filter((k) => t[k].length >= 2);
        setMetric(
          withHistory.includes("followers") ? "followers" : withHistory[0] ?? "",
        );
      } catch {
        setTrends({});
      } finally {
        setLoaded(true);
      }
    })();
  }, [influencerId]);

  // Metrics that have at least two snapshots are worth charting.
  const options = Object.keys(trends).filter((k) => trends[k].length >= 2);

  if (!loaded || options.length === 0) {
    return null; // nothing to chart until history accumulates
  }

  const data = (trends[metric] ?? []).map((p) => {
    const d = new Date(p.captured_at);
    return {
      // Month label on the axis; full date kept for the tooltip.
      month: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      full: d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      value: p.value,
    };
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Growth over time</CardTitle>
        <Select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className="h-8 w-44"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {label(o)}
            </option>
          ))}
        </Select>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6d6ca" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "#6b5d54" }}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6b5d54" }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v) => formatNumber(v as number)}
            />
            <Tooltip
              formatter={(v) => formatNumber(v as number)}
              labelFormatter={(_label, payload) =>
                payload && payload.length
                  ? (payload[0].payload as { full: string }).full
                  : ""
              }
              cursor={{ stroke: "#d0b8ac" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              name={label(metric)}
              stroke="#b89a8a"
              strokeWidth={2}
              dot={{ r: 3, fill: "#b89a8a" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
