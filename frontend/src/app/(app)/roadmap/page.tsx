"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, Loader2, Clock, Sparkles, CheckCircle2, AlertTriangle,
  BookOpen, Target, Quote, ExternalLink, PlayCircle,
  Flag, Trophy, ChevronRight, ChevronLeft, Zap, RefreshCw, Award, Code2, Compass,
  Calendar, Flame, Sparkle, Layers, Sliders, Check,
  LayoutGrid, Columns3, List, Search, Filter, ArrowUpRight, ChevronDown, ChevronUp, GraduationCap
} from "lucide-react";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import type { RoadmapResponse, RoadmapStep } from "@/lib/types";
import { formatTopic, masteryLabel } from "@/lib/format";
import { getProblems, getBestProblem } from "@/lib/problems";
import { ProblemChip } from "@/components/ProblemCard";

const POLL_INTERVAL_MS = 2000;

const MOTIVATIONAL_QUOTES = [
  "Mastery is a journey, not a destination. One concept at a time.",
  "You don't have to be perfect, you just have to be persistent.",
  "Algorithms are just logic puzzles waiting for you to solve them.",
  "Every expert was once a beginner. Keep climbing.",
  "Trust the process. Your future self will thank you for today's effort.",
  "Code is poetry written in logic. Build your masterpiece."
];

// Curated high-yield external learning references for DSA canonical topics
const TOPIC_RESOURCES: Record<string, { yt: string; ytTitle: string; practice: string; practiceTitle: string }> = {
  algorithm_foundations: {
    yt: "https://www.youtube.com/results?search_query=algorithms+foundations+mit+ocw",
    ytTitle: "MIT 6.006: Algorithmic Thinking",
    practice: "https://leetcode.com/explore/featured/card/the-leetcode-beginners-guide/",
    practiceTitle: "LeetCode Beginners Guide"
  },
  complexity_analysis: {
    yt: "https://www.youtube.com/results?search_query=big+o+notation+abdul+bari",
    ytTitle: "Abdul Bari: Asymptotic Notations & Big O",
    practice: "https://www.geeksforgeeks.org/analysis-of-algorithms-set-1-asymptotic-analysis/",
    practiceTitle: "GFG Asymptotic Analysis"
  },
  arrays: {
    yt: "https://www.youtube.com/results?search_query=arrays+data+structure+neetcode",
    ytTitle: "NeetCode: Arrays & Two Pointers",
    practice: "https://leetcode.com/tag/array/",
    practiceTitle: "LeetCode: 50 Top Array Problems"
  },
  linked_lists: {
    yt: "https://www.youtube.com/results?search_query=linked+list+abdul+bari",
    ytTitle: "Abdul Bari: Singly & Doubly Linked Lists",
    practice: "https://leetcode.com/tag/linked-list/",
    practiceTitle: "LeetCode: Fast & Slow Pointers"
  },
  strings: {
    yt: "https://www.youtube.com/results?search_query=string+manipulation+algorithms+neetcode",
    ytTitle: "NeetCode: String Patterns & Sliding Window",
    practice: "https://leetcode.com/tag/string/",
    practiceTitle: "LeetCode: String Interview Challenges"
  },
  stacks: {
    yt: "https://www.youtube.com/results?search_query=stack+data+structure+striver",
    ytTitle: "Striver: Monotonic Stack & Queue Masterclass",
    practice: "https://leetcode.com/tag/stack/",
    practiceTitle: "LeetCode: Monotonic Stack Problems"
  },
  queues: {
    yt: "https://www.youtube.com/results?search_query=queue+data+structure+gate+smashers",
    ytTitle: "Gate Smashers: Queue & Circular Queue Design",
    practice: "https://leetcode.com/tag/queue/",
    practiceTitle: "LeetCode: Queue Implementation"
  },
  recursion_backtracking: {
    yt: "https://www.youtube.com/results?search_query=recursion+and+backtracking+striver",
    ytTitle: "Striver: Recursion Tree & State-Space Search",
    practice: "https://leetcode.com/tag/backtracking/",
    practiceTitle: "LeetCode: Backtracking Patterns (N-Queens, Subsets)"
  },
  sorting: {
    yt: "https://www.youtube.com/results?search_query=sorting+algorithms+visualized+mit",
    ytTitle: "MIT 6.006: Comparison & Linear Time Sorting",
    practice: "https://leetcode.com/tag/sorting/",
    practiceTitle: "LeetCode: Quicksort & MergeSort Problems"
  },
  searching: {
    yt: "https://www.youtube.com/results?search_query=binary+search+neetcode+guide",
    ytTitle: "NeetCode: Binary Search on Answer Space",
    practice: "https://leetcode.com/tag/binary-search/",
    practiceTitle: "LeetCode: Top Binary Search Problems"
  },
  divide_and_conquer: {
    yt: "https://www.youtube.com/results?search_query=divide+and+conquer+master+theorem+abdul+bari",
    ytTitle: "Abdul Bari: Master Theorem & Recurrences",
    practice: "https://leetcode.com/tag/divide-and-conquer/",
    practiceTitle: "LeetCode: Divide & Conquer Subproblems"
  },
  hashing: {
    yt: "https://www.youtube.com/results?search_query=hash+tables+collision+resolution+mit",
    ytTitle: "MIT 6.006: Hashing & Open Addressing",
    practice: "https://leetcode.com/tag/hash-table/",
    practiceTitle: "LeetCode: Two Sum & Hash Map Mastery"
  },
  heap: {
    yt: "https://www.youtube.com/results?search_query=heap+data+structure+neetcode",
    ytTitle: "NeetCode: Min/Max Heaps & Top-K Elements",
    practice: "https://leetcode.com/tag/heap-priority-queue/",
    practiceTitle: "LeetCode: Priority Queue / K-way Merge"
  },
  binary_search_trees: {
    yt: "https://www.youtube.com/results?search_query=binary+search+tree+algorithms+abdul+bari",
    ytTitle: "Abdul Bari: BST Insert, Delete & Inorder Traversal",
    practice: "https://leetcode.com/tag/binary-search-tree/",
    practiceTitle: "LeetCode: Validate & Search BSTs"
  },
  avl_trees: {
    yt: "https://www.youtube.com/results?search_query=avl+trees+rotations+abdul+bari",
    ytTitle: "Abdul Bari: Balanced Trees & LL/RR/LR/RL Rotations",
    practice: "https://www.geeksforgeeks.org/insertion-in-an-avl-tree/",
    practiceTitle: "GFG: Self-Balancing Tree Implementation"
  },
  red_black_trees: {
    yt: "https://www.youtube.com/results?search_query=red+black+trees+clrs+explained",
    ytTitle: "CLRS Breakdown: Red-Black Tree Invariants",
    practice: "https://www.geeksforgeeks.org/red-black-tree-set-1-introduction-2/",
    practiceTitle: "GFG: Color Flips & Tree Rebalancing"
  },
  graph_algorithms: {
    yt: "https://www.youtube.com/results?search_query=graph+algorithms+bfs+dfs+william+fiset",
    ytTitle: "William Fiset: Comprehensive Graph Theory (BFS/DFS/TopSort)",
    practice: "https://leetcode.com/tag/graph/",
    practiceTitle: "LeetCode: Island Counter & Cycle Detection"
  },
  shortest_paths: {
    yt: "https://www.youtube.com/results?search_query=dijkstra+bellman+ford+abdul+bari",
    ytTitle: "Abdul Bari: Dijkstra & Bellman-Ford Shortest Paths",
    practice: "https://leetcode.com/tag/shortest-path/",
    practiceTitle: "LeetCode: Network Delay Time & Weighted Graphs"
  },
  minimum_spanning_trees: {
    yt: "https://www.youtube.com/results?search_query=kruskal+prim+mst+abdul+bari",
    ytTitle: "Abdul Bari: Kruskal's & Prim's Greedy MST",
    practice: "https://leetcode.com/tag/minimum-spanning-tree/",
    practiceTitle: "LeetCode: Min Cost to Connect Points"
  },
  dynamic_programming: {
    yt: "https://www.youtube.com/results?search_query=dynamic+programming+neetcode+patterns",
    ytTitle: "NeetCode: 1D & 2D Dynamic Programming Patterns",
    practice: "https://leetcode.com/tag/dynamic-programming/",
    practiceTitle: "LeetCode: Knapsack, LCS & Coin Change"
  },
  greedy_algorithms: {
    yt: "https://www.youtube.com/results?search_query=greedy+algorithms+huffman+interval+scheduling",
    ytTitle: "Striver: Greedy Choice Property & Interval Scheduling",
    practice: "https://leetcode.com/tag/greedy/",
    practiceTitle: "LeetCode: Activity Selection & Jump Game"
  },
  disjoint_sets: {
    yt: "https://www.youtube.com/results?search_query=union+find+disjoint+set+william+fiset",
    ytTitle: "William Fiset: Union Find with Path Compression",
    practice: "https://leetcode.com/tag/union-find/",
    practiceTitle: "LeetCode: Connected Components in Graph"
  },
  string_matching: {
    yt: "https://www.youtube.com/results?search_query=kmp+algorithm+abdul+bari",
    ytTitle: "Abdul Bari: KMP & Rabin-Karp Substring Search",
    practice: "https://leetcode.com/tag/string-matching/",
    practiceTitle: "LeetCode: Find Index of First Match"
  },
  binary_search: {
    yt: "https://www.youtube.com/results?search_query=binary+search+template+neetcode",
    ytTitle: "NeetCode: Binary Search Template & Answer Space",
    practice: "https://leetcode.com/tag/binary-search/",
    practiceTitle: "LeetCode: Top Binary Search Problems"
  },
  two_pointers: {
    yt: "https://www.youtube.com/results?search_query=two+pointers+technique+neetcode",
    ytTitle: "NeetCode: Two Pointers — Left-Right & Fast/Slow",
    practice: "https://leetcode.com/tag/two-pointers/",
    practiceTitle: "LeetCode: Container With Most Water & 3Sum"
  },
  sliding_window: {
    yt: "https://www.youtube.com/results?search_query=sliding+window+technique+neetcode",
    ytTitle: "NeetCode: Fixed & Variable Sliding Window",
    practice: "https://leetcode.com/tag/sliding-window/",
    practiceTitle: "LeetCode: Longest Substring Without Repeating"
  },
  bit_manipulation: {
    yt: "https://www.youtube.com/results?search_query=bit+manipulation+tricks+striver",
    ytTitle: "Striver: Bitwise Tricks — XOR, AND, OR, Bitmask",
    practice: "https://leetcode.com/tag/bit-manipulation/",
    practiceTitle: "LeetCode: Single Number & Power of Two"
  },
  tries: {
    yt: "https://www.youtube.com/results?search_query=trie+data+structure+neetcode",
    ytTitle: "NeetCode: Trie — Design & Autocomplete",
    practice: "https://leetcode.com/tag/trie/",
    practiceTitle: "LeetCode: Implement Trie & Word Search II"
  },
  monotonic_stack: {
    yt: "https://www.youtube.com/results?search_query=monotonic+stack+next+greater+element+neetcode",
    ytTitle: "NeetCode: Monotonic Stack — Next Greater Element",
    practice: "https://leetcode.com/tag/monotonic-stack/",
    practiceTitle: "LeetCode: Daily Temperatures & Largest Rectangle"
  },
  maximum_flow: {
    yt: "https://www.youtube.com/results?search_query=max+flow+ford+fulkerson+william+fiset",
    ytTitle: "William Fiset: Ford-Fulkerson & Max Flow",
    practice: "https://leetcode.com/tag/graph/",
    practiceTitle: "LeetCode: Network Flow Problems"
  }
};

// Curriculum stages for non-linear multi-view organization
const TOPIC_PHASE_MAP: Record<string, 1 | 2 | 3> = {
  algorithm_foundations: 1,
  complexity_analysis: 1,
  arrays: 1,
  linked_lists: 1,
  stacks: 1,
  queues: 1,
  stacks_queues: 1,
  recursion: 1,
  hashing: 1,

  binary_search: 2,
  sorting_algorithms: 2,
  trees: 2,
  binary_trees: 2,
  binary_search_trees: 2,
  graphs: 2,
  bfs_dfs: 2,
  dynamic_programming: 2,
  backtracking: 2,

  greedy_algorithms: 3,
  heaps: 3,
  tries: 3,
  bit_manipulation: 3,
  segment_trees: 3,
  disjoint_set_union: 3,
  shortest_paths: 3,
  network_flow: 3,
  string_matching: 3,
};

const PHASE_METADATA = {
  1: {
    title: "Phase 1: Foundations & Prerequisites",
    subtitle: "Core structures & asymptotic complexity",
    badge: "Foundations",
    gradient: "from-indigo-600 to-blue-600",
    border: "border-indigo-500/30",
    text: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  2: {
    title: "Phase 2: Algorithmic Deficits",
    subtitle: "High-yield remediation for diagnostic weak spots",
    badge: "Core Deficits",
    gradient: "from-violet-600 to-purple-600",
    border: "border-violet-500/30",
    text: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  3: {
    title: "Phase 3: Advanced Optimization & Polish",
    subtitle: "Niche structures, greedy heuristics & FAANG interview readiness",
    badge: "Advanced",
    gradient: "from-emerald-600 to-teal-600",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
};

function formatReason(reason: string) {
  return reason.replace(/mastery\s+(0\.\d+)/gi, (_match, p1) => {
    return `mastery ${Math.round(parseFloat(p1) * 100)}%`;
  });
}

export default function RoadmapPage() {
  const api = useApi();
  const [hours, setHours] = useState(20);
  const [dailyPace, setDailyPace] = useState(1.5); // Hours per day
  const [planMode, setPlanMode] = useState<"calendar" | "budget">("calendar");
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [masteryScores, setMasteryScores] = useState<Record<string, number>>({});
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "generating" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Cycle inspirational quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveMastery = async () => {
    try {
      const res = await api.getMastery();
      if (res && res.concept_scores) {
        setMasteryScores(res.concept_scores);
      }
    } catch {
      // Non-blocking
    }
  };

  const checkCache = async () => {
    try {
      const [cacheRes] = await Promise.all([
        api.getCachedRoadmap(),
        fetchLiveMastery()
      ]);

      if (cacheRes.cached) {
        setRoadmap(cacheRes.payload);
        setGeneratedAt(cacheRes.generated_at);
        setStatus("ready");
        if (pollRef.current) clearInterval(pollRef.current);
      } else if (cacheRes.status === "generating") {
        setStatus("generating");
      } else if (cacheRes.status === "error") {
        setStatus("error");
        if (pollRef.current) clearInterval(pollRef.current);
      } else {
        setStatus("idle");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check roadmap status.");
      setStatus("error");
    }
  };

  useEffect(() => {
    checkCache();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    setError("");
    setStatus("generating");
    try {
      await api.generateRoadmap(hours);
      // Fast check with quick poll
      pollRef.current = setInterval(checkCache, POLL_INTERVAL_MS);
      // Instant first check after 1.5s
      setTimeout(checkCache, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start roadmap generation.");
      setStatus("error");
    }
  };

  const reanalyzeAndRegenerate = async () => {
    setError("");
    setStatus("generating");
    try {
      await api.clearRoadmap();
      await api.generateRoadmap(hours);
      pollRef.current = setInterval(checkCache, POLL_INTERVAL_MS);
      setTimeout(checkCache, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to re-analyze profile.");
      setStatus("error");
    }
  };

  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<{
    date: Date;
    dayDiff: number;
    milestoneIndex: number;
    topic: string;
    hours: number;
  } | null>(null);

  const steps = roadmap?.roadmap || [];
  const completedCount = steps.filter((s) => {
    const score = masteryScores[s.topic] ?? 0;
    return score >= 0.7;
  }).length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  // Calendar & Target Date Calculations
  const calendarMetrics = useMemo(() => {
    const totalHours = roadmap ? roadmap.total_time : hours;
    const studyDays = Math.max(1, Math.ceil(totalHours / dailyPace));
    const weeks = (studyDays / 7).toFixed(1);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + studyDays);
    const formattedDate = targetDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    // Compute cumulative windows for each milestone
    let runningHour = 0;
    const milestoneWindows: Array<{ stepIndex: number; topic: string; week: number; startDay: number; endDay: number; hours: number }> = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const startH = runningHour;
      const endH = runningHour + step.time_estimate_hours;
      runningHour = endH;

      const startDay = Math.floor(startH / dailyPace) + 1;
      const endDay = Math.max(startDay, Math.ceil(endH / dailyPace));
      const week = Math.floor((startDay - 1) / 7) + 1;
      milestoneWindows.push({ stepIndex: i, topic: step.topic, week, startDay, endDay, hours: step.time_estimate_hours });
    }

    return {
      today,
      studyDays,
      weeks,
      targetDate,
      formattedDate,
      milestoneWindows,
      weeklyHours: (dailyPace * 7).toFixed(1)
    };
  }, [roadmap, hours, dailyPace, steps]);

  // Calendar monthly matrix
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const numDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{
      dayNumber: number;
      isCurrentMonth: boolean;
      date: Date;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }

    // Current month days
    for (let d = 1; d <= numDays; d++) {
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        date: new Date(year, month, d),
      });
    }

    // Next month padding to complete row
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({
          dayNumber: i,
          isCurrentMonth: false,
          date: new Date(year, month + 1, i),
        });
      }
    }

    return days;
  }, [calendarMonth]);

  const prevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"phases" | "journey" | "table">("phases");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "in_progress" | "mastered">("all");
  const [expandedMilestones, setExpandedMilestones] = useState<Record<number, boolean>>({});

  const toggleMilestoneExpand = (stepIndex: number) => {
    setExpandedMilestones((prev) => ({
      ...prev,
      [stepIndex]: !prev[stepIndex],
    }));
  };

  // Immediate Next Action Hero: find first unmastered milestone
  const activeNextIndex = useMemo(() => {
    if (steps.length === 0) return -1;
    const foundIdx = steps.findIndex((s) => (masteryScores[s.topic] ?? 0) < 0.7);
    return foundIdx !== -1 ? foundIdx : 0;
  }, [steps, masteryScores]);

  const activeNextStep = activeNextIndex !== -1 ? steps[activeNextIndex] : null;
  const activeNextWindow = activeNextIndex !== -1 ? calendarMetrics.milestoneWindows[activeNextIndex] : null;

  // Group steps into 3 curriculum phases
  const phasesData = useMemo(() => {
    const p1: Array<{ step: RoadmapStep; originalIndex: number; window: { week: number; startDay: number; endDay: number }; mastery: number; isMastered: boolean }> = [];
    const p2: Array<{ step: RoadmapStep; originalIndex: number; window: { week: number; startDay: number; endDay: number }; mastery: number; isMastered: boolean }> = [];
    const p3: Array<{ step: RoadmapStep; originalIndex: number; window: { week: number; startDay: number; endDay: number }; mastery: number; isMastered: boolean }> = [];

    steps.forEach((step, idx) => {
      let phaseNum = TOPIC_PHASE_MAP[step.topic];
      if (!phaseNum) {
        if (idx < Math.ceil(steps.length / 3)) phaseNum = 1;
        else if (idx < Math.ceil((steps.length * 2) / 3)) phaseNum = 2;
        else phaseNum = 3;
      }
      const score = masteryScores[step.topic] ?? 0;
      const item = {
        step,
        originalIndex: idx,
        window: calendarMetrics.milestoneWindows[idx] || { week: 1, startDay: 1, endDay: 1 },
        mastery: score,
        isMastered: score >= 0.7,
      };
      if (phaseNum === 1) p1.push(item);
      else if (phaseNum === 2) p2.push(item);
      else p3.push(item);
    });

    const computePhaseStats = (items: typeof p1) => {
      const totalH = items.reduce((acc, curr) => acc + curr.step.time_estimate_hours, 0);
      const masteredCount = items.filter((i) => i.isMastered).length;
      const pct = items.length > 0 ? Math.round((masteredCount / items.length) * 100) : 0;
      return { totalH, masteredCount, pct };
    };

    return [
      { phaseId: 1 as const, meta: PHASE_METADATA[1], items: p1, stats: computePhaseStats(p1) },
      { phaseId: 2 as const, meta: PHASE_METADATA[2], items: p2, stats: computePhaseStats(p2) },
      { phaseId: 3 as const, meta: PHASE_METADATA[3], items: p3, stats: computePhaseStats(p3) },
    ];
  }, [steps, calendarMetrics, masteryScores]);

  // Filtered steps for search and status filters
  const filteredSteps = useMemo(() => {
    return steps
      .map((step, idx) => {
        const score = masteryScores[step.topic] ?? 0;
        return {
          step,
          originalIndex: idx,
          window: calendarMetrics.milestoneWindows[idx] || { week: 1, startDay: 1, endDay: 1 },
          mastery: score,
          isMastered: score >= 0.7,
          phaseNum: (TOPIC_PHASE_MAP[step.topic] || (idx < Math.ceil(steps.length / 3) ? 1 : idx < Math.ceil((steps.length * 2) / 3) ? 2 : 3)) as 1 | 2 | 3,
        };
      })
      .filter((item) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const topicMatch = item.step.topic.toLowerCase().includes(q) || formatTopic(item.step.topic).toLowerCase().includes(q);
          const reasonMatch = item.step.reason.toLowerCase().includes(q);
          if (!topicMatch && !reasonMatch) return false;
        }
        if (filterStatus === "in_progress" && item.isMastered) return false;
        if (filterStatus === "mastered" && !item.isMastered) return false;
        return true;
      });
  }, [steps, calendarMetrics, masteryScores, searchQuery, filterStatus]);

  return (
    <>
      {/* ── TOP HEADER BAR (slim) ─────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-3 sm:px-6 border-b border-white/[0.06] shrink-0 bg-[#0c0c12]/95 backdrop-blur-sm z-10">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="lg:hidden p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 border border-white/[0.06] transition-colors"
          title="Toggle Planning Panel"
        >
          <Sliders className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Compass className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
          <h2 className="text-sm font-semibold text-slate-100 truncate">Adaptive Learning Path</h2>
          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            Live SAKT
          </span>
        </div>

        {/* Header right: quick stats + actions */}
        <div className="flex items-center gap-2 shrink-0">
          {roadmap && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-mono text-indigo-300">{progressPercent}%</span>
              <span className="text-slate-600">·</span>
              <span>{completedCount}/{steps.length} done</span>
            </div>
          )}
          <button
            onClick={reanalyzeAndRegenerate}
            disabled={status === "generating" || status === "loading"}
            title="Purge stale cache and re-analyze profile"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 border border-white/[0.06] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${status === "generating" ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={generate}
            disabled={status === "generating" || status === "loading"}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            {status === "generating" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{roadmap ? "Rebalance" : "Generate"}</span>
          </button>
        </div>
      </header>

      {/* ── SPLIT-PANEL BODY ──────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR: Planning Panel ──────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {(sidebarOpen) && (
            <motion.aside
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="shrink-0 h-full border-r border-white/[0.06] bg-[#0e0e16] overflow-hidden"
            >
              <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-4 w-[340px]">

                {/* Mode Switcher */}
                <div className="flex items-center bg-[#13131e] rounded-xl border border-white/[0.08] p-1 gap-1">
                  <button
                    onClick={() => setPlanMode("calendar")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      planMode === "calendar"
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Calendar
                  </button>
                  <button
                    onClick={() => setPlanMode("budget")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      planMode === "budget"
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Hours Budget
                  </button>
                </div>

                {/* ── CALENDAR MODE ── */}
                {planMode === "calendar" && (
                  <div className="space-y-3">
                    {/* Pacing selector */}
                    <div className="bg-[#111119] border border-white/[0.06] rounded-xl p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-bold text-slate-200">Daily Pace</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[
                          { pace: 1.0, label: "1h", desc: "Steady" },
                          { pace: 1.5, label: "1.5h", desc: "✓ Rec." },
                          { pace: 2.5, label: "2.5h", desc: "Sprint" }
                        ].map((item) => (
                          <button
                            key={item.pace}
                            onClick={() => setDailyPace(item.pace)}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all text-center ${
                              dailyPace === item.pace
                                ? "bg-indigo-600 text-white"
                                : "bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-white/[0.06]"
                            }`}
                          >
                            <div>{item.label}</div>
                            <div className="text-[9px] opacity-70 mt-0.5">{item.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Planning Metrics */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#111119] border border-white/[0.06] rounded-xl p-3">
                        <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 mb-1">
                          <Target className="w-3 h-3 text-indigo-400" /> Target Date
                        </div>
                        <div className="text-sm font-bold text-slate-100">{calendarMetrics.formattedDate}</div>
                        <div className="text-[10px] text-indigo-400 mt-0.5">{calendarMetrics.studyDays} days</div>
                      </div>
                      <div className="bg-[#111119] border border-white/[0.06] rounded-xl p-3">
                        <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 mb-1">
                          <Calendar className="w-3 h-3 text-violet-400" /> Duration
                        </div>
                        <div className="text-sm font-bold text-slate-100">{calendarMetrics.weeks} Weeks</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{calendarMetrics.weeklyHours}h/week</div>
                      </div>
                      <div className="bg-[#111119] border border-white/[0.06] rounded-xl p-3">
                        <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 mb-1">
                          <Flame className="w-3 h-3 text-amber-400" /> Daily Goal
                        </div>
                        <div className="text-sm font-bold text-slate-100">2 Problems</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">+ 1 Concept review</div>
                      </div>
                      <div className="bg-[#111119] border border-white/[0.06] rounded-xl p-3">
                        <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 mb-1">
                          <Clock className="w-3 h-3 text-emerald-400" /> Total Load
                        </div>
                        <div className="text-sm font-bold text-slate-100">
                          {roadmap ? `${roadmap.total_time.toFixed(1)}h` : `${hours}h`}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{steps.length} Milestones</div>
                      </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="bg-[#111119] border border-white/[0.06] rounded-xl p-3 space-y-3">
                      {/* Month nav */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          {calendarMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={prevMonth} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 transition-colors border border-white/[0.06]">
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={nextMonth} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 transition-colors border border-white/[0.06]">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Day headers */}
                      <div className="grid grid-cols-7 text-center text-[9px] font-semibold text-slate-600">
                        {["S","M","T","W","T","F","S"].map((d, i) => (
                          <div key={i} className="py-0.5">{d}</div>
                        ))}
                      </div>

                      {/* Day cells */}
                      <div className="grid grid-cols-7 gap-0.5">
                        {calendarDays.map((cell, idx) => {
                          const cellDate = new Date(cell.date);
                          cellDate.setHours(0, 0, 0, 0);
                          const todayDate = new Date(calendarMetrics.today);
                          todayDate.setHours(0, 0, 0, 0);
                          const targetDate = new Date(calendarMetrics.targetDate);
                          targetDate.setHours(0, 0, 0, 0);

                          const isToday = cellDate.getTime() === todayDate.getTime();
                          const isTargetDate = cellDate.getTime() === targetDate.getTime();
                          const isStudyDay = cell.isCurrentMonth && cellDate >= todayDate && cellDate <= targetDate;

                          let activeMilestone = null;
                          let dayDiff = 0;
                          if (isStudyDay) {
                            dayDiff = Math.round((cellDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                            const match = calendarMetrics.milestoneWindows.find(w => w.startDay <= dayDiff && dayDiff <= w.endDay);
                            if (match && steps[match.stepIndex]) {
                              activeMilestone = { ...match, step: steps[match.stepIndex] };
                            }
                          }

                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                if (activeMilestone) {
                                  setSelectedCalendarDay({ date: cell.date, dayDiff, milestoneIndex: activeMilestone.stepIndex, topic: activeMilestone.topic, hours: activeMilestone.hours });
                                }
                              }}
                              title={activeMilestone ? `M${activeMilestone.stepIndex + 1}: ${formatTopic(activeMilestone.topic)}` : undefined}
                              className={`aspect-square rounded-md flex flex-col items-center justify-center text-[10px] font-semibold relative transition-all ${
                                !cell.isCurrentMonth
                                  ? "opacity-0 pointer-events-none"
                                  : isToday
                                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/40"
                                  : isTargetDate
                                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/40"
                                  : activeMilestone
                                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 cursor-pointer hover:bg-indigo-500/30"
                                  : isStudyDay
                                  ? "bg-white/[0.03] text-slate-400 border border-white/[0.04]"
                                  : "text-slate-700"
                              }`}
                            >
                              {cell.dayNumber}
                              {activeMilestone && (
                                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                              )}
                              {isTargetDate && <Flag className="w-2 h-2 mt-0.5" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center gap-3 pt-1 border-t border-white/[0.04] text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-600 inline-block" />Today</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-500/25 border border-indigo-500/30 inline-block" />Milestone</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" />Goal</span>
                      </div>
                    </div>

                    {/* Selected Day Drawer */}
                    {selectedCalendarDay && (
                      <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-xs">
                            M{selectedCalendarDay.milestoneIndex + 1}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-200">{formatTopic(selectedCalendarDay.topic)}</div>
                            <div className="text-[10px] text-slate-400">Day {selectedCalendarDay.dayDiff} · {selectedCalendarDay.hours}h</div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const el = document.getElementById(`milestone-${selectedCalendarDay.milestoneIndex}`);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                        >
                          Jump to Milestone {selectedCalendarDay.milestoneIndex + 1} <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── HOURS BUDGET MODE ── */}
                {planMode === "budget" && (
                  <div className="space-y-3">
                    <div className="bg-[#111119] border border-white/[0.06] rounded-xl p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-xs font-bold text-slate-200">Time Budget</span>
                        <span className="ml-auto text-sm font-mono font-bold text-violet-300">{hours}h</span>
                      </div>

                      <input
                        type="range"
                        min={5}
                        max={60}
                        step={5}
                        value={hours}
                        onChange={(e) => setHours(parseInt(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer h-2 bg-[#1a1a24] rounded-lg"
                      />

                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { val: 10, label: "10h", desc: "Sprint" },
                          { val: 20, label: "20h", desc: "Core ✓" },
                          { val: 35, label: "35h", desc: "Comprehensive" },
                          { val: 50, label: "50h", desc: "Deep Mastery" }
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            onClick={() => setHours(preset.val)}
                            className={`py-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                              hours === preset.val
                                ? "bg-violet-600/30 text-violet-300 border-violet-500/50"
                                : "bg-white/[0.02] text-slate-400 border-white/[0.05] hover:text-slate-200"
                            }`}
                          >
                            <div className="font-bold">{preset.label}</div>
                            <div className="text-[10px] opacity-70">{preset.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed px-1">
                      Set your total budget. The prerequisite DAG will automatically prune or expand topics to maximize your score within this constraint.
                    </p>

                    {/* Budget Breakdown */}
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 px-1">Budget Breakdown</div>
                      {[
                        { label: "Prerequisite Review", pct: 0.15, color: "bg-slate-400", desc: "Foundations" },
                        { label: "Target Deficits", pct: 0.65, color: "bg-indigo-500", desc: "DP, Graphs, Tries" },
                        { label: "Advanced Topics", pct: 0.20, color: "bg-emerald-500", desc: "Shortest paths, Flow" }
                      ].map((item) => (
                        <div key={item.label} className="bg-[#111119] border border-white/[0.06] rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[11px] font-semibold text-slate-300">{item.label}</span>
                            <span className="text-xs font-mono font-bold text-slate-200">~{(hours * item.pct).toFixed(1)}h</span>
                          </div>
                          <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct * 100}%` }} />
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">{item.desc}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 bg-[#111119] border border-white/[0.06] rounded-xl p-3">
                      <span className="text-xs text-slate-400">Custom hours:</span>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        value={hours}
                        onChange={(e) => setHours(Math.max(5, parseInt(e.target.value) || 5))}
                        className="flex-1 rounded-lg bg-[#1a1a24] border border-white/[0.1] px-2.5 py-1 text-center font-mono text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                      <span className="text-xs text-slate-400">hrs</span>
                    </div>
                  </div>
                )}

                {/* Sidebar collapse button */}
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="hidden lg:flex w-full items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] text-slate-500 hover:text-slate-300 text-xs border border-white/[0.04] transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Collapse Panel
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Sidebar expand tab (when collapsed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="hidden lg:flex items-center gap-1.5 px-2 py-4 bg-[#111118] hover:bg-[#16161f] border-r border-white/[0.06] text-slate-500 hover:text-indigo-400 transition-colors shrink-0"
            title="Expand Planning Panel"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* ── RIGHT: Roadmap Journey Content ────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

            {/* Motivational Quote Banner (compact) */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/30 via-slate-900/60 to-purple-950/20 border border-white/[0.06] px-5 py-3 flex items-center gap-3">
              <Quote className="w-4 h-4 text-indigo-400/50 shrink-0" />
              <div className="min-h-[18px] flex-1">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={quoteIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.4 }}
                    className="text-xs font-medium text-slate-300 italic"
                  >
                    &ldquo;{MOTIVATIONAL_QUOTES[quoteIndex]}&rdquo;
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

        {/* Loading Spinner */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-28 text-slate-500 gap-3">
            <Loader2 className="w-9 h-9 animate-spin text-indigo-400" />
            <p className="text-sm">Fetching personalized curriculum state...</p>
          </div>
        )}

        {/* Empty State */}
        {status === "idle" && !roadmap && (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-20 px-4">
            <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-2xl border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
              <Map className="w-12 h-12 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200">No Custom Roadmap Active</h3>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              PathFinder builds a prerequisite-ordered DAG trajectory specifically optimized for your weak concepts and time constraint.
            </p>
            <button
              onClick={generate}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Generate Adaptive Roadmap
            </button>
          </div>
        )}

        {/* Generating Animation */}
        {status === "generating" && (
          <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <Sparkles className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-slate-200">Synthesizing Prerequisite Closure & DAG Sequence...</p>
              <p className="text-xs text-slate-500">Checking transitive unlock leverage and curriculum grounding</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* All Mastered High-Scorer Empty State Handling */}
        {roadmap && status === "ready" && steps.length === 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-slate-900/40 border border-emerald-500/20 p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">All Core Milestones Mastered!</h3>
            <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Your Knowledge Tracing mastery is above 75% across all foundational and intermediate DSA topics.
              You have completed the core curriculum loop!
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link
                href="/practice"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all"
              >
                Hard Problem Practice
              </Link>
              <Link
                href="/tutor"
                className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium rounded-lg border border-white/[0.08] transition-all"
              >
                Ask Advanced Theory
              </Link>
            </div>
          </div>
        )}

        {/* ROADMAP RESULTS: High-Productivity Multi-View Workspace */}
        {roadmap && status === "ready" && steps.length > 0 && (
          <div className="space-y-6">

            {/* 1. IMMEDIATE NEXT ACTION HERO BANNER */}
            {activeNextStep && activeNextWindow && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/70 via-[#131322] to-violet-950/40 border border-indigo-500/30 p-5 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" /> Immediate Focus
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        Milestone {activeNextStep.step} of {steps.length}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-slate-400">
                        Week {activeNextWindow.week} · Days {activeNextWindow.startDay}–{activeNextWindow.endDay}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {activeNextStep.time_estimate_hours}h target
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-400 shrink-0" />
                      {formatTopic(activeNextStep.topic)}
                    </h3>

                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      {formatReason(activeNextStep.reason)}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Live SAKT Score:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {Math.round((masteryScores[activeNextStep.topic] ?? 0) * 100)}% ({masteryLabel(masteryScores[activeNextStep.topic] ?? 0)})
                        </span>
                      </div>
                      <div className="h-1.5 w-32 bg-black/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${Math.max(8, Math.round((masteryScores[activeNextStep.topic] ?? 0) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Curated LeetCode Challenges for Immediate Focus */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" /> Direct coding:
                      </span>
                      {getProblems(activeNextStep.topic, masteryScores[activeNextStep.topic] ?? 0.3, 3).map((prob) => (
                        <ProblemChip key={prob.id} problem={prob} />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <Link
                      href={`/practice?topic=${activeNextStep.topic}`}
                      className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <span>Launch Practice Session</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/tutor`}
                      className="px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold rounded-xl border border-white/[0.08] transition-all"
                    >
                      Ask AI Tutor
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* 2. VIEW SWITCHER & FILTER TOOLBAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111118] border border-white/[0.06] p-2.5 rounded-2xl">
              {/* Left: View Tabs */}
              <div className="flex items-center gap-1 bg-[#0a0a0f] p-1 rounded-xl border border-white/[0.04]">
                <button
                  onClick={() => setViewMode("phases")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "phases"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  <span>Phase Stages</span>
                  <span className="text-[10px] opacity-75 ml-0.5">({steps.length})</span>
                </button>

                <button
                  onClick={() => setViewMode("journey")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "journey"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Journey Map</span>
                </button>

                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "table"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Sprint Table</span>
                </button>
              </div>

              {/* Right: Search & Filters */}
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0d0d14] border border-white/[0.06] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-[#0a0a0f] p-1 rounded-xl border border-white/[0.04]">
                  {(["all", "in_progress", "mastered"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setFilterStatus(filter)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-all ${
                        filterStatus === filter
                          ? "bg-white/[0.08] text-slate-100 font-semibold"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {filter === "all" ? "All" : filter === "in_progress" ? "In Progress" : "Mastered"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. VIEW 1: PHASE STAGES (BOARD VIEW) */}
            {viewMode === "phases" && (
              <div className="space-y-6">
                {phasesData.map((phase) => {
                  const filteredItems = phase.items.filter((item) => {
                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase();
                      const topicMatch = item.step.topic.toLowerCase().includes(q) || formatTopic(item.step.topic).toLowerCase().includes(q);
                      const reasonMatch = item.step.reason.toLowerCase().includes(q);
                      if (!topicMatch && !reasonMatch) return false;
                    }
                    if (filterStatus === "in_progress" && item.isMastered) return false;
                    if (filterStatus === "mastered" && !item.isMastered) return false;
                    return true;
                  });

                  return (
                    <div
                      key={phase.phaseId}
                      className="bg-[#101017] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl"
                    >
                      {/* Phase Header */}
                      <div className="p-4 sm:p-5 border-b border-white/[0.05] bg-gradient-to-r from-white/[0.02] to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${phase.meta.bg} ${phase.meta.text} border ${phase.meta.border}`}>
                              {phase.meta.badge}
                            </span>
                            <h4 className="text-sm font-bold text-slate-100">
                              {phase.meta.title}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-400">
                            {phase.meta.subtitle}
                          </p>
                        </div>

                        {/* Phase Progress Badge */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-200">
                              {phase.stats.masteredCount}/{phase.items.length} Mastered ({phase.stats.pct}%)
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {phase.stats.totalH.toFixed(1)}h total workload
                            </div>
                          </div>
                          <div className="w-16 h-2 bg-black/40 rounded-full overflow-hidden border border-white/[0.04]">
                            <div
                              className={`h-full bg-gradient-to-r ${phase.meta.gradient} rounded-full`}
                              style={{ width: `${phase.stats.pct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Phase Milestone Cards Grid */}
                      <div className="p-4 sm:p-5">
                        {filteredItems.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-500">
                            {searchQuery || filterStatus !== "all"
                              ? "No milestones match your current filters in this phase."
                              : "All milestones in this phase are bypassed via verified diagnostic mastery."}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {filteredItems.map(({ step, originalIndex, window, mastery, isMastered }) => {
                              const resources = TOPIC_RESOURCES[step.topic];
                              const isExpanded = !!expandedMilestones[originalIndex];

                              return (
                                <div
                                  key={`${step.topic}-${originalIndex}`}
                                  id={`milestone-${originalIndex}`}
                                  className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                                    isMastered
                                      ? "bg-[#111618] border-emerald-500/20 shadow-emerald-500/5"
                                      : "bg-[#13131c] border-white/[0.06] hover:border-indigo-500/30 shadow-lg"
                                  }`}
                                >
                                  <div className="space-y-3">
                                    {/* Top badges */}
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs font-bold font-mono">
                                          {step.step}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-400 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.04]">
                                          W{window.week} · D{window.startDay}–{window.endDay}
                                        </span>
                                      </div>
                                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-500" /> {step.time_estimate_hours}h
                                      </span>
                                    </div>

                                    {/* Title */}
                                    <h5 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                                      <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                                      <span className="truncate">{formatTopic(step.topic)}</span>
                                    </h5>

                                    {/* Mastery Bar */}
                                    <div className="space-y-1 bg-black/20 p-2 rounded-lg border border-white/[0.03]">
                                      <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-slate-400">SAKT Mastery</span>
                                        <span
                                          className={`font-mono font-bold ${
                                            isMastered
                                              ? "text-emerald-400"
                                              : mastery >= 0.4
                                              ? "text-amber-400"
                                              : "text-rose-400"
                                          }`}
                                        >
                                          {Math.round(mastery * 100)}% ({masteryLabel(mastery)})
                                        </span>
                                      </div>
                                      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ${
                                            isMastered
                                              ? "bg-emerald-400"
                                              : mastery >= 0.4
                                              ? "bg-amber-400"
                                              : "bg-rose-500"
                                          }`}
                                          style={{ width: `${Math.max(8, Math.round(mastery * 100))}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Expandable Pedagogical Rationale & Resources */}
                                    <div>
                                      <button
                                        onClick={() => toggleMilestoneExpand(originalIndex)}
                                        className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 py-1 transition-colors"
                                      >
                                        <span>Why this milestone?</span>
                                        {isExpanded ? (
                                          <ChevronUp className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        )}
                                      </button>

                                      <AnimatePresence>
                                        {isExpanded && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-2.5 pt-2 border-t border-white/[0.04]"
                                          >
                                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                              {formatReason(step.reason)}
                                            </p>

                                            {/* Direct Problem Recommendations for this Milestone */}
                                            {(() => {
                                              const probs = getProblems(step.topic, mastery, 3);
                                              if (probs.length === 0) return null;
                                              return (
                                                <div className="space-y-1.5 pt-1">
                                                  <div className="text-[9px] uppercase font-semibold text-slate-500 flex items-center justify-between">
                                                    <span>Practice Problems</span>
                                                    <span className="text-slate-600 font-mono">Calibrated</span>
                                                  </div>
                                                  <div className="flex flex-wrap gap-1">
                                                    {probs.map((p) => (
                                                      <ProblemChip key={p.id} problem={p} />
                                                    ))}
                                                  </div>
                                                </div>
                                              );
                                            })()}

                                            {resources && (
                                              <div className="space-y-1.5 pt-1">
                                                <div className="text-[9px] uppercase font-semibold text-slate-500">Curated Guides</div>
                                                <div className="flex flex-col gap-1 text-[11px]">
                                                  <a
                                                    href={resources.yt}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center justify-between text-slate-300 hover:text-indigo-400 bg-white/[0.02] hover:bg-white/[0.05] px-2 py-1 rounded border border-white/[0.04] transition-colors"
                                                  >
                                                    <span className="flex items-center gap-1.5 truncate">
                                                      <PlayCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                                      <span className="truncate">{resources.ytTitle}</span>
                                                    </span>
                                                    <ExternalLink className="w-2.5 h-2.5 shrink-0 ml-1 opacity-60" />
                                                  </a>
                                                  <a
                                                    href={resources.practice}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center justify-between text-slate-300 hover:text-indigo-400 bg-white/[0.02] hover:bg-white/[0.05] px-2 py-1 rounded border border-white/[0.04] transition-colors"
                                                  >
                                                    <span className="flex items-center gap-1.5 truncate">
                                                      <Code2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                                      <span className="truncate">{resources.practiceTitle}</span>
                                                    </span>
                                                    <ExternalLink className="w-2.5 h-2.5 shrink-0 ml-1 opacity-60" />
                                                  </a>
                                                </div>
                                              </div>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </div>

                                  {/* Bottom Actions */}
                                  <div className="pt-3 mt-3 border-t border-white/[0.04] flex items-center justify-between">
                                    <Link
                                      href={`/practice?topic=${step.topic}`}
                                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 transition-all text-center"
                                    >
                                      <span>Practice Topic</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. VIEW 2: VISUAL JOURNEY SNAKE MAP */}
            {viewMode === "journey" && (
              <div className="space-y-6">
                {/* Desktop Snake View */}
                <div className="relative py-6 hidden md:block">
                  <div className="absolute left-1/2 top-4 bottom-12 w-1.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-500/40 via-violet-500/30 to-emerald-500/40 shadow-[0_0_12px_rgba(99,102,241,0.25)]" />

                  {filteredSteps.map(({ step, originalIndex, window, mastery, isMastered }) => {
                    const isLeft = originalIndex % 2 === 0;
                    const resources = TOPIC_RESOURCES[step.topic];

                    return (
                      <motion.div
                        key={`${step.topic}-${originalIndex}`}
                        id={`milestone-${originalIndex}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: originalIndex * 0.04 }}
                        className={`relative flex items-center justify-between w-full mb-10 ${
                          isLeft ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <div className="w-[45%]" />

                        {/* Central Checkpoint Badge */}
                        <div className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold border-2 shadow-xl transition-all ${
                              isMastered
                                ? "bg-emerald-500 border-white text-white shadow-emerald-500/30"
                                : "bg-[#101018] border-indigo-500/60 text-indigo-300 shadow-indigo-500/20"
                            }`}
                          >
                            {step.step}
                          </div>
                        </div>

                        {/* Milestone Card */}
                        <div className="w-[45%]">
                          <div
                            className={`bg-[#111118] border rounded-2xl p-5 transition-all shadow-lg ${
                              isMastered
                                ? "border-emerald-500/20 bg-emerald-950/[0.04]"
                                : "border-white/[0.08] hover:border-indigo-500/30"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                                    Milestone {step.step}
                                  </span>
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                                    Week {window.week} · Days {window.startDay}–{window.endDay}
                                  </span>
                                </div>
                                <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                                  {formatTopic(step.topic)}
                                </h4>
                              </div>

                              <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shrink-0">
                                <Clock className="w-3.5 h-3.5" /> {step.time_estimate_hours}h
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                              {formatReason(step.reason)}
                            </p>

                            <div className="bg-[#181822] rounded-xl p-3 border border-white/[0.04] mb-3.5 space-y-1.5">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-400 font-medium">Your Live SAKT Mastery</span>
                                <span
                                  className={`font-mono font-bold ${
                                    isMastered
                                      ? "text-emerald-400"
                                      : mastery >= 0.4
                                      ? "text-amber-400"
                                      : "text-rose-400"
                                  }`}
                                >
                                  {Math.round(mastery * 100)}% ({masteryLabel(mastery)})
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isMastered
                                      ? "bg-emerald-400"
                                      : mastery >= 0.4
                                      ? "bg-amber-400"
                                      : "bg-rose-500"
                                  }`}
                                  style={{ width: `${Math.max(8, Math.round(mastery * 100))}%` }}
                                />
                              </div>
                            </div>

                            {resources && (
                              <div className="pt-2 border-t border-white/[0.05] space-y-1.5">
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                  Recommended Guides
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <a
                                    href={resources.yt}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between text-xs text-slate-300 hover:text-indigo-400 transition-colors bg-white/[0.02] hover:bg-white/[0.05] px-2.5 py-1.5 rounded-lg border border-white/[0.04]"
                                  >
                                    <span className="flex items-center gap-1.5 truncate">
                                      <PlayCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                      <span className="truncate">{resources.ytTitle}</span>
                                    </span>
                                    <ExternalLink className="w-3 h-3 shrink-0 ml-1 opacity-60" />
                                  </a>
                                  <a
                                    href={resources.practice}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between text-xs text-slate-300 hover:text-indigo-400 transition-colors bg-white/[0.02] hover:bg-white/[0.05] px-2.5 py-1.5 rounded-lg border border-white/[0.04]"
                                  >
                                    <span className="flex items-center gap-1.5 truncate">
                                      <Code2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      <span className="truncate">{resources.practiceTitle}</span>
                                    </span>
                                    <ExternalLink className="w-3 h-3 shrink-0 ml-1 opacity-60" />
                                  </a>
                                </div>
                              </div>
                            )}

                            <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/[0.05]">
                              <span className="text-[10px] text-slate-600 font-mono truncate max-w-[140px]" title={step.reference}>
                                {step.reference}
                              </span>
                              <Link
                                href={`/practice?topic=${step.topic}`}
                                className="text-[11px] font-semibold px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-md transition-colors flex items-center gap-1"
                              >
                                Practice <ChevronRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  <div className="relative flex flex-col items-center justify-center pt-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 p-0.5 shadow-2xl shadow-amber-500/30">
                      <div className="w-full h-full bg-[#0c0c12] rounded-[14px] flex items-center justify-center text-amber-400">
                        <Flag className="w-8 h-8 animate-bounce" />
                      </div>
                    </div>
                    <div className="text-center mt-3">
                      <div className="text-sm font-bold text-slate-100">Mastery Finish Line</div>
                      <p className="text-xs text-slate-500 max-w-xs mt-0.5">
                        Completing these milestones prepares you for FAANG-grade technical DSA interviews.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mobile Responsive Timeline Track */}
                <div className="relative pl-8 space-y-6 block md:hidden">
                  <div className="absolute left-[15px] top-6 bottom-10 w-1 bg-gradient-to-b from-indigo-500 via-violet-500 to-emerald-400 rounded-full" />
                  
                  {filteredSteps.map(({ step, originalIndex, window, mastery, isMastered }) => (
                    <div key={`mobile-${step.topic}-${originalIndex}`} className="relative pb-2">
                      <div
                        className={`absolute -left-8 top-3 w-8 h-8 rounded-xl border-2 border-[#0a0a0a] flex items-center justify-center text-xs font-bold text-white shadow-lg ${
                          isMastered ? "bg-emerald-500" : "bg-indigo-600"
                        }`}
                      >
                        {step.step}
                      </div>

                      <div className="bg-[#111116] border border-white/[0.06] rounded-xl p-4 ml-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[9px] font-mono uppercase text-indigo-400">
                              Week {window.week} · Days {window.startDay}–{window.endDay}
                            </div>
                            <span className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                              <BookOpen className="w-4 h-4 text-indigo-400" />
                              {formatTopic(step.topic)}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">
                            {step.time_estimate_hours}h
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                          {formatReason(step.reason)}
                        </p>

                        <div className="flex justify-between items-center text-[10px] pt-2 border-t border-white/[0.04]">
                          <span className="text-slate-400">Mastery: {Math.round(mastery * 100)}%</span>
                          <Link
                            href={`/practice?topic=${step.topic}`}
                            className="text-indigo-400 font-semibold flex items-center gap-1"
                          >
                            Practice <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. VIEW 3: SPRINT TABLE (AGENDA VIEW) */}
            {viewMode === "table" && (
              <div className="bg-[#111118] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0e0e16] border-b border-white/[0.06] text-slate-400 uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Topic & Concept</th>
                        <th className="py-3 px-4">Phase</th>
                        <th className="py-3 px-4">Schedule</th>
                        <th className="py-3 px-4">SAKT Mastery</th>
                        <th className="py-3 px-4">Est. Time</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredSteps.map(({ step, originalIndex, window, mastery, isMastered, phaseNum }) => (
                        <tr
                          key={`row-${step.topic}-${originalIndex}`}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">
                            M{step.step}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-100 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span>{formatTopic(step.topic)}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5">
                              {formatReason(step.reason)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                              Phase {phaseNum}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                            Week {window.week} · D{window.startDay}–{window.endDay}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isMastered ? "bg-emerald-400" : mastery >= 0.4 ? "bg-amber-400" : "bg-rose-500"
                                  }`}
                                  style={{ width: `${Math.max(8, Math.round(mastery * 100))}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] text-slate-300">
                                {Math.round(mastery * 100)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {step.time_estimate_hours}h
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/practice?topic=${step.topic}`}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold border border-indigo-500/30 transition-all"
                            >
                              Practice <ChevronRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. BOTTOM ALERT PANELS */}
            {roadmap.topics_skipped.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-amber-500/[0.05] border border-amber-500/20 rounded-xl text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold block mb-0.5">Budget Compression:</span>
                  <span>
                    Topics deferred to fit the {roadmap.time_budget_hours}h limit: {roadmap.topics_skipped.map(formatTopic).join(", ")}. Increase the budget to include them.
                  </span>
                </div>
              </div>
            )}

            {roadmap.mastered_topics.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-emerald-500/[0.05] border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold block mb-0.5">Already Mastered (Prerequisites Bypassed):</span>
                  <span>
                    {roadmap.mastered_topics.map(formatTopic).join(", ")}. Your SAKT knowledge tracing verified these are already strong.
                  </span>
                </div>
              </div>
            )}

          </div>
        )}

          </div>
        </div>
      </div>
    </>
  );
}
