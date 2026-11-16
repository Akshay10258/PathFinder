"use client";

import type { StatsTrendPoint } from "@/lib/types";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function TrendChart({ data }: { data: StatsTrendPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-sm text-slate-600">
        No practice attempts yet — trend appears once you answer a few questions.
      </div>
    );
  }

  return <div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
    <defs><linearGradient id="accuracyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} /></linearGradient></defs>
    <CartesianGrid stroke="#ffffff" strokeOpacity={0.07} vertical={false} />
    <XAxis dataKey="date" tickFormatter={(value) => String(value).slice(5)} tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
    <YAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
    <Tooltip contentStyle={{ background: "#17171f", border: "1px solid #ffffff18", borderRadius: 10 }} formatter={(value, name, item) => [`${Math.round(Number(value) * 100)}% (${item.payload.attempts} attempts)`, name === "accuracy" ? "Accuracy" : name]} />
    <Area type="monotone" dataKey="accuracy" stroke="#22d3ee" strokeWidth={3} fill="url(#accuracyFill)" activeDot={{ r: 5, fill: "#22d3ee" }} />
  </AreaChart></ResponsiveContainer></div>;
}
