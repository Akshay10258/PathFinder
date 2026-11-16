"""
Step 2: Iterative Ordering Loop (LLM + Graph).

Replaces static topological sort with an adaptive, LLM-driven loop:

  while time remains and candidates left:
      1. compute eligible topics (graph constraint — concept_graph.py)
      2. compute what each eligible topic would unlock (downstream leverage)
      3. LLM picks the best next topic + estimates hours, given both
      4. if time budget allows -> append to roadmap, update state
      5. if time budget exceeded -> compress or stop

The graph constrains the search space; the LLM reasons within it. A hard
`max_iterations` cap bounds worst-case LLM call count regardless of how large
a time budget is passed in.
"""

import os
import sys
from typing import Dict, List

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "generation"))

from concept_graph import expand_weak_topics, get_eligible_topics, get_unlock_map, TOPIC_WEIGHTS  # noqa: E402
from skill_analyzer import skill_multiplier  # noqa: E402
from generator import parse_llm_json  # noqa: E402 — shared LLM-JSON parser

PREREQ_DISCOUNT = 0.5  # prerequisite topics only need a brush-up, not full mastery

PICKER_SYSTEM_PROMPT = """You are an expert DSA learning coach deciding the optimal next topic for a student.

You will be given:
- The student's mastery on each eligible topic (0 = none, 1 = expert)
- A list of eligible topics they can study next (all valid — prerequisites satisfied)
- For each eligible topic: whether it is a TARGET (weak area they need) or a PREREQUISITE (filler to unlock targets)
- For each eligible topic: what other topics it would UNLOCK if completed
- What they have already completed in this roadmap
- Remaining time budget in hours

Your job: Pick the ONE topic that maximizes learning impact AND estimate study hours.

Reasoning guidelines:
- TARGET topics matter more than PREREQUISITE topics — they are the student's real weak areas
- But if a PREREQUISITE unlocks multiple targets, it may be worth doing first
- Prefer topics that unlock the most downstream topics (high leverage)
- Prefer topics the student is weakest at (highest need)
- Consider building momentum — easier foundational topics before harder ones
- Weaker students (lower mastery) need more time per topic; stronger students need less

Rules:
- You MUST pick from the eligible list only. No other topics.
- estimated_hours must be a positive number (0.5 minimum).
- Return JSON only. No explanation outside the JSON.

Output format:
{"selected": "<topic_from_eligible_list>", "estimated_hours": <number>, "reason": "<one sentence>"}"""


def _estimate_hours(topic: str, remaining_topics: List[str], time_remaining: float,
                     mastery_map: Dict[str, float], weak_set: set) -> float:
    weights = {}
    for t in remaining_topics:
        w = TOPIC_WEIGHTS.get(t, 1.5) * skill_multiplier(mastery_map.get(t, 0.5))
        if t not in weak_set:
            w *= PREREQ_DISCOUNT
        weights[t] = w
    total_weight = sum(weights.values())
    if total_weight == 0:
        return max(0.5, time_remaining / max(len(remaining_topics), 1))
    share = (weights.get(topic, 1.5) / total_weight) * time_remaining
    return round(max(0.5, share), 1)


def _build_topic_context(eligible: List[str], weak_set: set, unlock_map: Dict[str, List[str]],
                          mastery_map: Dict[str, float]) -> str:
    lines = []
    for topic in eligible:
        role = "TARGET (weak area)" if topic in weak_set else "PREREQUISITE (filler)"
        unlocks = unlock_map.get(topic, [])
        unlock_str = ", ".join(unlocks) if unlocks else "nothing new"
        lines.append(f"  - {topic} (mastery={mastery_map.get(topic, 0.0):.2f}): {role} | unlocks -> [{unlock_str}]")
    return "\n".join(lines)


def _fallback_pick(eligible, time_remaining, mastery_map, weak_set):
    fallback = eligible[0]
    return {
        "selected": fallback,
        "estimated_hours": _estimate_hours(fallback, eligible, time_remaining, mastery_map, weak_set),
        "reason": "LLM unavailable or failed to return a valid pick — selected first eligible topic",
    }


def _heuristic_pick_next(eligible: List[str], remaining: List[str], completed: List[str],
                         weak_topics: List[str], mastery_map: Dict[str, float],
                         unlock_map: Dict[str, List[str]], time_remaining: float,
                         weak_set: set) -> dict:
    best_topic = eligible[0]
    best_score = -float('inf')

    for topic in eligible:
        # 1. Target vs Prerequisite: targets have high priority
        target_score = 4.0 if topic in weak_set else 1.0
        # 2. Downstream leverage: unlocking blocked targets gives massive leverage
        unlocks = unlock_map.get(topic, [])
        unlock_score = sum(2.5 if u in weak_set else 1.0 for u in unlocks)
        # 3. Urgency: lower mastery = higher urgency to review
        mastery = mastery_map.get(topic, 0.5)
        need_score = (1.0 - mastery) * 2.0
        # 4. Foundations before heavy advanced topics to build momentum
        weight = TOPIC_WEIGHTS.get(topic, 1.5)
        momentum_score = 0.4 * (3.5 - weight)

        score = target_score + unlock_score + need_score + momentum_score
        if score > best_score:
            best_score = score
            best_topic = topic

    estimated = _estimate_hours(best_topic, remaining, time_remaining, mastery_map, weak_set)
    unlocks = unlock_map.get(best_topic, [])
    if best_topic in weak_set:
        reason = f"Primary target focus: current diagnostic mastery is {round(mastery_map.get(best_topic, 0.0) * 100)}%."
    else:
        unlock_str = ", ".join(unlocks[:2]) if unlocks else "subsequent stages"
        reason = f"Core foundational prerequisite unlocking {unlock_str}."

    return {"selected": best_topic, "estimated_hours": estimated, "reason": reason}



def run_ordering_loop(analysis: dict, time_budget: float, llm_client, max_iterations: int = 20) -> dict:
    weak_topics = analysis["priority_topics"]
    mastered_topics = analysis["mastered_topics"]
    mastery_map = analysis["mastery_map"]

    candidates = expand_weak_topics(weak_topics, mastered_topics)
    remaining = list(candidates)
    completed: List[str] = []
    ordered = []
    weak_set = set(weak_topics)

    time_remaining = time_budget
    time_allocated = 0.0
    iterations = 0

    while remaining and time_remaining > 0 and iterations < max_iterations:
        iterations += 1
        eligible = get_eligible_topics(remaining, completed, mastered_topics)
        if not eligible:
            break
        unlock_map = get_unlock_map(eligible, remaining, completed, mastered_topics)

        if len(eligible) == 1:
            topic = eligible[0]
            pick = {
                "selected": topic,
                "estimated_hours": _estimate_hours(topic, remaining, time_remaining, mastery_map, weak_set),
                "reason": "Only eligible topic",
            }
        else:
            pick = _heuristic_pick_next(eligible, remaining, completed, weak_topics, mastery_map,
                                        unlock_map, time_remaining, weak_set)

        selected = pick["selected"]
        estimated_hours = pick["estimated_hours"]

        if estimated_hours > time_remaining:
            if selected in weak_set and time_remaining >= 0.5:
                estimated_hours = round(time_remaining, 1)
                pick["reason"] += " (compressed to fit remaining time)"
            else:
                break

        ordered.append({
            "topic": selected,
            "is_target": selected in weak_set,
            "estimated_hours": estimated_hours,
            "reason": pick["reason"],
            "mastery": round(mastery_map.get(selected, 0.0), 3),
        })
        completed.append(selected)
        remaining.remove(selected)
        time_allocated += estimated_hours
        time_remaining -= estimated_hours

    return {
        "ordered_topics": ordered,
        "mastered_topics": mastered_topics,
        "candidate_topics": candidates,
        "time_budget": time_budget,
        "time_allocated": round(time_allocated, 1),
        "topics_skipped": remaining,
    }
