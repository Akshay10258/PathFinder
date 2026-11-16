"use client";

export type EvidenceBar = { key: string; value: number; color: string; label?: string };
export type EvidenceBarGroup = { label: string; bars: EvidenceBar[] };

/** Dependency-free grouped bar chart for the /evidence page's A/B/C/D
 * comparisons — deliberately plain divs with width percentages (same
 * pattern as the mastery bars already used across the Dashboard/Profile
 * pages) rather than a charting library, since these are simple magnitude
 * comparisons, not continuous curves. */
export default function EvidenceBarChart({
  groups, maxValue, valueFormat,
}: { groups: EvidenceBarGroup[]; maxValue: number; valueFormat?: (v: number) => string }) {
  const fmt = valueFormat || ((v: number) => v.toFixed(2));
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="text-xs font-medium text-slate-300 mb-2">{g.label}</div>
          <div className="space-y-1.5">
            {g.bars.map((b) => (
              <div key={b.key} className="flex items-center gap-2.5">
                <span className="w-8 shrink-0 text-[10px] font-bold text-slate-500">{b.label || b.key}</span>
                <div className="flex-1 h-3 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, (b.value / maxValue) * 100))}%`, background: b.color }}
                  />
                </div>
                <span className="w-14 shrink-0 text-[10px] font-mono text-slate-400 text-right">{fmt(b.value)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
