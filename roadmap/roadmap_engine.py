"""
Adaptive Roadmap — end-to-end orchestration.

get_roadmap(student_id, retriever, time_budget_hours) runs the full pipeline:
  1. skill_analyzer  — real per-topic mastery from Knowledge Tracing (SAKT)
                        -> weak / mastered / priority-ordered topics
  2. topic_ordering  — LLM+graph iterative ordering, time-budget aware,
                        constrained by the prerequisite DAG (concept_graph.py)
  3. planning_agent  — grounds each step in OUR retriever's content, then
                        generates the final reasoning+reference per step,
                        validated and self-corrected up to 3 attempts

See ROADMAP.md for the full design, and what changed versus the standalone
Roadmap_Gen_Module reference implementation this was ported from.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "knowledge_tracing"))
sys.path.insert(0, os.path.join(HERE, ".."))

from skill_analyzer import analyze_skills, get_llm_summary  # noqa: E402
from topic_ordering import run_ordering_loop  # noqa: E402
from planning_agent import retrieve_curriculum_context, plan_with_validation  # noqa: E402
from llm.client import LLMClient  # noqa: E402

DEFAULT_TIME_BUDGET_HOURS = 10.0

_llm_client = None


def _get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client


def get_roadmap(student_id: str, retriever, time_budget_hours: float = DEFAULT_TIME_BUDGET_HOURS) -> dict:
    llm_client = _get_llm_client()

    analysis = analyze_skills(student_id)
    summary = get_llm_summary(analysis, llm_client)

    ordering = run_ordering_loop(analysis, time_budget_hours, llm_client)
    entries = retrieve_curriculum_context(ordering["ordered_topics"], retriever)
    plan = plan_with_validation(entries, analysis, time_budget_hours, llm_client)

    return {
        "student_id": student_id,
        "summary": summary,
        "weak_topics": analysis["priority_topics"],
        "mastered_topics": analysis["mastered_topics"],
        "difficulty_tolerance": analysis["difficulty_tolerance"],
        "avg_mastery": analysis["avg_mastery"],
        "time_budget_hours": time_budget_hours,
        "roadmap": plan["roadmap"],
        "total_time": plan["total_time"],
        "topics_skipped": ordering["topics_skipped"],
        "validation_attempts": plan.get("validation_attempts", 1),
        "validation_errors": plan.get("validation_errors", []),
    }
