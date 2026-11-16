"use client";

import {
  CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { formatTopic } from "@/lib/format";
import { useMemo } from "react";

type DecayPoint = {
  topic: string;
  days: number;
  raw: number;
  effective: number;
  halfLife: number;
};

export default function DecayChart({ data }: { data: DecayPoint[] }) {
  const curve = useMemo(() => {
    const maxDays = Math.max(30, ...data.map((item) => item.halfLife * 2));
    const step = Math.max(1, Math.ceil(maxDays / 30));
    const points = [];
    for (let days = 0; days <= maxDays; days += step) {
      const raw = data.reduce((sum, item) => sum + item.raw, 0) / data.length;
      const effective = data.reduce((sum, item) => {
        const halfLife = Math.max(item.halfLife, 1);
        return sum + item.raw * Math.pow(0.5, days / halfLife);
      }, 0) / data.length;
      points.push({ days, raw, effective });
    }
    return points;
  }, [data]);

  if (!data.length) return <div className="h-64 grid place-items-center text-sm text-slate-500">Practice a topic to model its forgetting curve.</div>;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={curve} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
          <CartesianGrid stroke="#ffffff" strokeOpacity={0.07} vertical={false} />
          <XAxis dataKey="days" type="number" domain={[0, "dataMax"]} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} unit="d" />
          <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "#17171f", border: "1px solid #ffffff18", borderRadius: 10, color: "#e2e8f0" }}
            formatter={(value, name) => [`${Math.round(Number(value) * 100)}%`, name === "raw" ? "Retained mastery" : "Effective mastery"]}
            labelFormatter={(value) => `${value} days since practice`}
          />
          <Line type="monotone" dataKey="raw" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="effective" stroke="#fbbf24" dot={{ r: 3, fill: "#17171f", stroke: "#fbbf24", strokeWidth: 2 }} strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DecayBars({ data }: { data: DecayPoint[] }) {
  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((item) => (
        <div key={item.topic}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-slate-300">{formatTopic(item.topic)}</span>
            <span className="shrink-0 font-mono text-amber-400">-{Math.round((item.raw - item.effective) * 100)} pts</span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="absolute inset-y-0 left-0 rounded-full bg-slate-500/50" style={{ width: `${item.raw * 100}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-amber-400" style={{ width: `${item.effective * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}