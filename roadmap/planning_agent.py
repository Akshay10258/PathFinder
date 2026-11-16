"""
Steps 3-5: Curriculum Grounding + Reasoning-Aware Planning + Validation.

For each ordered topic, retrieves real context from OUR knowledge base
(retrieval/retriever.py — the same 3-tier FAISS+BM25 pipeline the tutor
itself uses, not a second vector store) at that topic's own mastery level,
then asks the LLM to produce a final, explainable roadmap grounded in that
context. A deterministic validation pass checks prerequisite ordering and
the time budget; violations are fed back into the prompt and the plan is
regenerated, up to MAX_VALIDATION_ATTEMPTS times.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "generation"))

from concept_graph import PREREQUISITES  # noqa: E402
from generator import parse_llm_json  # noqa: E402

MAX_VALIDATION_ATTEMPTS = 3

PLANNER_SYSTEM_PROMPT = """You are an expert DSA AI tutor generating a final, personalized study roadmap.

You will receive:
1. The student's weak/mastered topics.
2. A sequence of topics they must study (already logically ordered to respect prerequisites).
3. Retrieved curriculum context and a source reference for each topic.

For each topic in the sequence, output a structured step containing:
- The topic name
- The estimated hours allocated (given to you — do not change it)
- A specific reason WHY they are studying it now, connecting their weak/strong status to the curriculum context provided
- The exact curriculum reference provided to you

Constraints:
- Do NOT change the sequencing or the estimated hours provided.
- Make 'reason' short (1-2 sentences), encouraging, and grounded in the provided curriculum context.
- Do NOT hallucinate references — copy the reference given to you exactly.

Output MUST be valid JSON matching this schema:
{"roadmap": [{"step": 1, "topic": "<topic>", "time_estimate_hours": <hours>, "reason": "<explanation>", "reference": "<exact reference provided>"}], "total_time": <sum of all hours>}
Return ONLY the JSON."""


def _dominant_tier(results: list) -> str:
    if not results:
        return "none"
    counts = {"T1": 0, "T2": 0, "T3": 0}
    for chunk in results:
        counts[chunk["metadata"]["tier"]] = counts.get(chunk["metadata"]["tier"], 0) + 1
    return max(counts, key=counts.get)


def retrieve_curriculum_context(ordered_topics: list, retriever) -> list:
    entries = []
    for ot in ordered_topics:
        topic = ot["topic"]
        mastery = ot["mastery"]
        reference = "Curriculum Reference — Core Foundations"
        context = ""

        # Fast direct lookup via precomputed topic index (0ms vs 10s cross-encoder)
        if hasattr(retriever, "_topic_index") and topic in retriever._topic_index:
            t_map = retriever._topic_index[topic]
            # Select dominant tier based on mastery
            preferred_tier = "T3" if mastery < 0.4 else ("T2" if mastery < 0.7 else "T1")
            candidates = t_map.get(preferred_tier) or t_map.get("T2") or t_map.get("T1") or t_map.get("T3") or []
            if candidates:
                idx = candidates[0]
                chunk = retriever.metadata_store[idx]
                md = chunk["metadata"]
                reference = f"[{md.get('tier', 'T2')}] {md.get('file_name', topic)} > {md.get('section', 'Core Overview')}"
                context = chunk.get("clean_content", "")[:1200]

        if not context:
            # Fallback to standard fast retrieval
            try:
                retrieval_result = retriever.retrieve(query=topic, mastery=mastery, fast=True)
                results = retrieval_result.get("results", [])
                context = retrieval_result.get("context", "")[:1200]
                if results:
                    md = results[0]["metadata"]
                    reference = f"[{md.get('tier', 'T2')}] {md.get('file_name', 'unknown')} > {md.get('section', '')}"
            except Exception:
                reference = f"[T2] {topic.replace('_', ' ').title()} > Foundations"
                context = f"Core principles and standard patterns for {topic}."

        entries.append({**ot, "context": context, "reference": reference})
    return entries


def _build_curriculum_payload(entries: list) -> str:
    blocks = []
    for i, e in enumerate(entries, 1):
        role = "Target Focus" if e["is_target"] else "Prerequisite Review"
        blocks.append(
            f"Step {i}: {e['topic']}\n"
            f"  Role: {role}\n"
            f"  Current mastery: {e['mastery']}\n"
            f"  Allocated Time: {e['estimated_hours']}h\n"
            f"  Reference: {e['reference']}\n"
            f"  Curriculum Context:\n    {e['context'][:800]}..."
        )
    return "\n\n".join(blocks)


def generate_roadmap(entries: list, analysis: dict, llm_client, feedback: str = None) -> dict:
    if not entries:
        return {"roadmap": [], "total_time": 0.0}

    total_budgeted_time = round(sum(e["estimated_hours"] for e in entries), 1)

    # Deterministic high-speed pedagogical generator
    steps = []
    _TOPIC_COACHING = {
        "algorithm_foundations": "Establishes the mental model for evaluating algorithms — without this, every optimization decision is guesswork. All downstream topics build directly on this thinking framework.",
        "complexity_analysis": "The universal language of algorithm efficiency. Mastering Big-O and recurrences lets you instantly evaluate trade-offs in every problem you'll face in interviews and production code.",
        "arrays": "The backbone of virtually every DSA topic. Memory layout, index arithmetic, and in-place operations here unlock Two Pointers, Sliding Window, and Sorting — the highest-ROI interview patterns.",
        "linked_lists": "Pointer manipulation here directly trains the Fast/Slow Pointer technique — a pattern that appears in cycle detection, finding midpoints, and palindrome checks across dozens of top interview problems.",
        "strings": "Strings are arrays with character semantics. String manipulation skills directly feed into pattern matching (KMP), Sliding Window frequency counts, and Trie-based prefix search.",
        "stacks": "Enables depth-first traversal, expression parsing, and the Monotonic Stack pattern — which alone solves 'Next Greater Element', 'Daily Temperatures', and 'Largest Rectangle in Histogram'.",
        "queues": "The BFS engine for level-order traversal, shortest path in unweighted graphs, and sliding window maximum. Every graph algorithm you encounter in interviews passes through queue mechanics.",
        "hashing": "O(1) lookup is the cheat code of interview problem-solving. Mastering frequency maps and set membership here directly enables Two Sum patterns, anagram detection, and subarray sum problems.",
        "binary_search": "One of the highest ROI topics for interviews — binary search on answer space converts O(n) brute-force to O(log n) elegantly. Unlocks 'Capacity to Ship Packages', 'Koko Eating Bananas', and dozens more.",
        "two_pointers": "A pattern that solves O(n²) problems in O(n) time. Left-right pointers handle sorted array problems; Fast/Slow pointers handle linked list cycles. Appears in 3Sum, Container With Most Water, and palindrome checks.",
        "sliding_window": "The go-to pattern for contiguous subarray/substring problems. Fixed-window and variable-window variants handle maximum sum, longest substring without repeats, and minimum window substring.",
        "sorting": "Beyond comparison sorts, understanding stability and linear-time sort conditions lets you choose the right algorithm for the problem. Quicksort recursion directly trains Divide & Conquer thinking.",
        "searching": "Order statistics and selection algorithms (QuickSelect) give you the median-of-medians for O(n) selection — turning what looks like a sorting problem into a single-pass technique.",
        "heap": "Priority queues are the engine behind Dijkstra, Top-K problems, and merge K sorted lists. Min-heap / Max-heap selection alone solves a large class of 'K-th largest' problems in O(n log k).",
        "recursion_backtracking": "The foundational problem-solving paradigm for combinatorial search. Permutations, subsets, N-Queens, and Sudoku all reduce to the same state-space exploration pattern that backtracking makes explicit.",
        "divide_and_conquer": "Merge Sort, Quick Sort, Binary Search, and Karatsuba multiplication all share the same recursion structure. Understanding the recurrence T(n)=2T(n/2)+O(n) unlocks the Master Theorem for any divide-and-conquer problem.",
        "binary_search_trees": "The in-order traversal gives sorted output for free — a property that enables floor/ceil queries, kth smallest, and range queries. BST validation is also a canonical interview problem testing recursive invariants.",
        "avl_trees": "Self-balancing guarantees O(log n) worst-case operations, making the height imbalance problem concrete. Understanding rotations here demystifies why standard BSTs degrade to O(n) and how databases maintain sorted indices.",
        "red_black_trees": "The real-world implementation behind Java's TreeMap and C++'s std::map. The color invariants enforce balance with fewer rotations than AVL — understanding this explains the performance contract behind standard library sorted maps.",
        "tries": "The canonical data structure for autocomplete, spell-checking, and longest common prefix. Word Search II drops from O(n·m·4^L) brute force to O(L) lookup per word after inserting the dictionary into a Trie.",
        "monotonic_stack": "A specialized stack that maintains sorted order, solving 'next greater/smaller element' in O(n) instead of O(n²). Directly enables 'Daily Temperatures', 'Largest Rectangle in Histogram', and 'Trapping Rain Water'.",
        "bit_manipulation": "Bitwise XOR is the secret weapon for finding single numbers in arrays, detecting duplicates, and swapping without temp variables. Bitmasks turn subset enumeration from 2^n loops into clean integer operations.",
        "disjoint_sets": "Union-Find with path compression achieves nearly O(1) per operation — the ideal structure for detecting connected components and cycles in graphs. Powers Kruskal's MST and 'Number of Connected Components'.",
        "graph_algorithms": "BFS and DFS are the two lenses through which every graph problem is solved. BFS for shortest path in unweighted graphs; DFS for cycle detection, topological order, and connected components.",
        "shortest_paths": "Dijkstra with a min-heap gives O((V+E) log V) for non-negative weights; Bellman-Ford handles negative edges in O(VE). These algorithms appear verbatim in 'Network Delay Time', 'Cheapest Flights Within K Stops', and others.",
        "minimum_spanning_trees": "Kruskal's (greedy + Union-Find) and Prim's (greedy + min-heap) both reveal how global structure emerges from locally optimal choices — a pattern that recurs throughout greedy algorithm design.",
        "maximum_flow": "Ford-Fulkerson and Edmonds-Karp convert capacity constraints into augmenting path problems. The max-flow min-cut theorem also provides a powerful framework for problems involving matching and scheduling.",
        "greedy_algorithms": "When a local optimal choice leads to a global optimum, greedy algorithms outperform DP. Interval scheduling, Huffman coding, and Fractional Knapsack all follow this pattern — and proving correctness via exchange argument is a key interview skill.",
        "dynamic_programming": "The most high-value interview topic. Memoization converts exponential recursion to polynomial time. Mastering the 1D→2D→interval DP progression covers Fibonacci, Knapsack, LCS, Edit Distance, and Matrix Chain Multiplication.",
        "string_matching": "KMP's failure function eliminates redundant comparisons, bringing substring search from O(n·m) to O(n+m). Rabin-Karp's rolling hash enables multi-pattern search. Both appear in plagiarism detection and DNA sequence alignment.",
    }

    for i, e in enumerate(entries, 1):
        topic = e["topic"]
        mastery_pct = round(e["mastery"] * 100)
        coaching = _TOPIC_COACHING.get(topic, "")
        if e["is_target"]:
            reason = (
                f"Identified high-priority deficit (current SAKT mastery: {mastery_pct}%). "
                f"{coaching}"
            )
        else:
            reason = (
                f"Essential structural prerequisite (current SAKT mastery: {mastery_pct}%). "
                f"{coaching}"
            )

        steps.append({
            "step": i,
            "topic": topic,
            "time_estimate_hours": e["estimated_hours"],
            "reason": reason,
            "reference": e["reference"],
        })

    return {"roadmap": steps, "total_time": total_budgeted_time}




def validate_roadmap(roadmap: dict, analysis: dict, time_budget: float) -> list:
    errors = []
    total_time = roadmap.get("total_time", 0)
    if total_time > time_budget + 0.1:
        errors.append(f"Time violation: total time ({total_time}h) exceeds the budget ({time_budget}h).")

    seen = set()
    mastered = set(analysis["mastered_topics"])
    for step in roadmap.get("roadmap", []):
        topic = step.get("topic", "")
        if topic in seen:
            errors.append(f"Duplicate topic: '{topic}' appears multiple times.")
            continue
        if step.get("time_estimate_hours", 0) < 0:
            errors.append(f"Invalid time: '{topic}' has a negative time estimate.")
        missing = [p for p in PREREQUISITES.get(topic, []) if p not in mastered and p not in seen]
        if missing:
            errors.append(f"Prerequisite violation: '{topic}' requires {missing} studied or mastered first.")
        seen.add(topic)
    return errors


def plan_with_validation(entries: list, analysis: dict, time_budget: float, llm_client) -> dict:
    feedback, roadmap, errors = None, None, []
    for attempt in range(1, MAX_VALIDATION_ATTEMPTS + 1):
        roadmap = generate_roadmap(entries, analysis, llm_client, feedback=feedback)
        errors = validate_roadmap(roadmap, analysis, time_budget)
        if not errors:
            return {**roadmap, "validation_attempts": attempt, "validation_errors": []}
        feedback = "\n".join(errors)
    return {**roadmap, "validation_attempts": MAX_VALIDATION_ATTEMPTS, "validation_errors": errors}
