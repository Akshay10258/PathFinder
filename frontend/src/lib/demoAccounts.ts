/**
 * Demo accounts for one-click login on the /login page. These correspond
 * exactly to the personas seeded by scripts/seed_demo_data.py (which in turn
 * reuses knowledge_tracing/personas.py — one persona set, three uses now:
 * calibration tests, the roadmap ablation study, and demoability). The
 * shared password is intentionally not a secret — these are seeded demo
 * accounts meant to be logged into by anyone viewing the demo.
 */
export const DEMO_PASSWORD = "PathfinderDemo2026!";

export const DEMO_ACCOUNTS = [
  {
    email: "detailed@pathfinder.dev",
    password: DEMO_PASSWORD,
    label: "Pro Demo — Full Analytics",
    emoji: "🚀",
    persona: "detailed_demo",
  },
  {
    email: "demo.beginner@pathfinder.dev",
    password: DEMO_PASSWORD,
    label: "Alex — Just Starting Out",
    emoji: "🌱",
    persona: "beginner_uniform",
  },
  {
    email: "demo.mixed@pathfinder.dev",
    password: DEMO_PASSWORD,
    label: "Priya — Strong Arrays, Weak Graphs",
    emoji: "⚡",
    persona: "strong_arrays_weak_graphs",
  },
  {
    email: "demo.advanced@pathfinder.dev",
    password: DEMO_PASSWORD,
    label: "Sam — Advanced",
    emoji: "🏆",
    persona: "advanced_uniform",
  },
];
