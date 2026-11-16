"""
Step 1: Skill Analyzer — replaces a hardcoded student skill snapshot with
real, continuous mastery scores from Knowledge Tracing
(knowledge_tracing.predict.predict_mastery), for every one of the 34
canonical DSA topics.

This is a deliberate upgrade over discrete 5-level Likert skill inputs
("very weak"..."very strong"): continuous mastery in [0, 1] means the
weak/mastered classification, the priority ordering, and the per-topic time
multiplier below all scale smoothly with how well the student actually knows
a topic, instead of snapping between five buckets.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "knowledge_tracing"))

from concept_graph import CANONICAL_TOPICS  # noqa: E402
import predict as kt_predict  # noqa: E402

WEAK_THRESHOLD = 0.4       # matches the beginner/intermediate band elsewhere in the project
MASTERED_THRESHOLD = 0.75  # deliberately above the general "advanced" cutoff (0.7) —
                           # "don't need to restudy this" is a higher bar than "advanced"


def skill_multiplier(mastery: float) -> float:
    """Continuous replacement for a discrete skill->time-multiplier lookup table:
    weaker students need more hours per topic, stronger students need fewer.
    mastery=0 -> 1.4x, mastery=1 -> 0.1x, linear in between."""
    return max(0.1, 1.4 - 1.3 * mastery)


def difficulty_tolerance(avg_mastery: float) -> str:
    if avg_mastery < WEAK_THRESHOLD:
        return "easy"
    elif avg_mastery < 0.7:
        return "medium"
    return "hard"


def analyze_skills(student_id: str) -> dict:
    mastery_map = {topic: kt_predict.predict_mastery(student_id, topic) for topic in CANONICAL_TOPICS}

    weak_topics = [t for t, m in mastery_map.items() if m < WEAK_THRESHOLD]
    mastered_topics = [t for t, m in mastery_map.items() if m >= MASTERED_THRESHOLD]
    priority_topics = sorted(weak_topics, key=lambda t: mastery_map[t])  # weakest first

    avg_mastery = sum(mastery_map.values()) / len(mastery_map)

    return {
        "student_id": student_id,
        "mastery_map": mastery_map,
        "weak_topics": weak_topics,
        "mastered_topics": mastered_topics,
        "priority_topics": priority_topics,
        "difficulty_tolerance": difficulty_tolerance(avg_mastery),
        "avg_mastery": round(avg_mastery, 4),
    }


def get_llm_summary(analysis: dict, llm_client) -> str:
    if not llm_client.available:
        return ""
    prompt = f"""You are an expert DSA (Data Structures & Algorithms) learning coach.
Analyze this student's skill profile and give a clear, honest, actionable summary.

Guidelines:
- Be direct and specific — name the actual topics
- Prioritize the weakest areas without overwhelming the student
- Acknowledge strengths briefly, focus on gaps
- Write in plain prose, no bullet points or headers
- Respond in 2-3 sentences only

Weak topics (need focus): {analysis['priority_topics'][:6]}
Mastered topics (can skip): {analysis['mastered_topics']}
Difficulty tolerance: {analysis['difficulty_tolerance']}
Average mastery across all topics: {analysis['avg_mastery']:.2f}

Summarize their learning situation and what they should focus on."""
    return llm_client.call(prompt, temperature=0.4, max_tokens=300)
