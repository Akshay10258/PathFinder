export function formatTopic(topic: string): string {
  return topic
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function masteryLabel(mastery: number): string {
  if (mastery < 0.4) return "Beginner";
  if (mastery < 0.7) return "Intermediate";
  return "Advanced";
}

export function masteryColor(mastery: number): { text: string; bg: string; border: string; bar: string } {
  if (mastery < 0.4) return { text: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20", bar: "bg-rose-500" };
  if (mastery < 0.7) return { text: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", bar: "bg-amber-500" };
  return { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", bar: "bg-emerald-500" };
}
