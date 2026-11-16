"""
Practice Loop — Adaptive Question Generation.

Pipeline:
  1. Retrieve context at the student's mastery tier (existing Retriever — same
     tier allocation the tutor itself uses, so practice questions are drawn
     from the same pedagogical band as the explanations the student just saw)
  2. Ask gpt-4o-mini for N mastery-calibrated questions, each with a concise
     reference answer and its tested key concepts, grounded in that context
  3. Batch-verify every question is actually answerable from the context;
     if any aren't, regenerate the whole set once (bounded — a sanity check,
     not a correctness proof)

Output feeds answer_evaluator.AnswerEvaluator, whose correct/incorrect signal
in turn feeds knowledge_tracing.predict.update_history(). See PRACTICE_LOOP.md.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "retrieval"))
from topic_map import normalize_topic  # noqa: E402
from generator import parse_llm_json  # noqa: E402

# (mastery upper bound, label, calibration guidance) — mirrors the tier bands
# used for retrieval allocation and the persona blend in generator.py.
DIFFICULTY_BANDS = [
    (0.4, "beginner",
     'Definitional / Recall — ask "what is", "name the", "list the" questions '
     "directly answerable from intuitive (T3) material."),
    (0.7, "intermediate",
     'Conceptual / Application — ask "why", "how", or "compare" questions '
     "requiring reasoning across practical (T2) material."),
    (1.01, "advanced",
     "Edge Cases / Proofs / Analysis — ask for formal proofs, amortized "
     "analysis, or subtle edge cases from formal (T1) material."),
]


def _difficulty_band(mastery: float):
    for threshold, label, guidance in DIFFICULTY_BANDS:
        if mastery < threshold:
            return label, guidance
    return DIFFICULTY_BANDS[-1][1], DIFFICULTY_BANDS[-1][2]


class QuestionGenerator:
    MAX_REGENERATION_ATTEMPTS = 1

    def __init__(self, retriever, generator):
        """
        retriever: an existing Retriever instance (its tier allocation IS the
                   mastery-adaptive behavior; this module doesn't reimplement it).
        generator: an existing AnswerGenerator instance, reused only for its
                   LLM client/retry logic (`_llm_call`) — no answer generation.
        """
        self.retriever = retriever
        self.generator = generator

    def generate(self, topic: str, mastery: float, n_questions: int = 3) -> dict:
        canonical_topic = normalize_topic(topic)
        retrieval_result = self.retriever.retrieve(query=topic, mastery=mastery)
        results = retrieval_result.get("results", [])
        context = retrieval_result.get("context", "")

        if not context:
            return {
                "questions": [], "reference_answers": [], "expected_concepts": [],
                "grounded": [], "difficulty": _difficulty_band(mastery)[0],
                "source_tier": self._dominant_tier(results), "canonical_topic": canonical_topic,
                "error": "no context retrieved for this topic",
            }

        payload = self._generate_questions(topic, canonical_topic, mastery, context, n_questions)
        grounded = self._batch_verify_grounded(payload["questions"], context)

        attempts = 0
        while grounded and not all(grounded) and attempts < self.MAX_REGENERATION_ATTEMPTS:
            payload = self._generate_questions(topic, canonical_topic, mastery, context, n_questions)
            grounded = self._batch_verify_grounded(payload["questions"], context)
            attempts += 1

        return {
            **payload,
            "grounded": grounded,
            "difficulty": _difficulty_band(mastery)[0],
            "source_tier": self._dominant_tier(results),
            "canonical_topic": canonical_topic,
        }

    def _generate_questions(self, topic, canonical_topic, mastery, context, n_questions) -> dict:
        label, guidance = _difficulty_band(mastery)
        prompt = f"""You are a DSA question generator for a mastery-adaptive intelligent tutoring system.

RULES:
1. Generate exactly {n_questions} practice questions strictly at the '{label}' difficulty level.
2. Every question MUST be directly answerable from the CONTEXT below. Do NOT require knowledge beyond it.
3. For each question, also write a concise reference answer (2-4 sentences) using ONLY the context.
4. Extract the key concepts each question tests (used for automated grading).
5. CRITICAL: Do NOT generate definitional ("What does X stand for") or trivial questions for advanced students. If the label is 'advanced', the question MUST require synthesis, edge-case analysis, or deeper technical reasoning.

DIFFICULTY CALIBRATION ({label}): {guidance}

CONTEXT FROM KNOWLEDGE BASE:
{context[:6000]}

TOPIC: {topic} (canonical: {canonical_topic})
STUDENT MASTERY: {mastery:.2f} ({label})

OUTPUT FORMAT (strict JSON, no markdown fences):
{{"questions": ["q1", "q2", "q3"], "reference_answers": ["ref1", "ref2", "ref3"], "expected_concepts": [["c1","c2"], ["c3"], ["c4","c5"]]}}"""

        raw = self.generator._llm_call(prompt, temperature=0.4)
        parsed = parse_llm_json(raw)
        questions = parsed.get("questions", [])
        n = len(questions)
        refs = (parsed.get("reference_answers", []) + [""] * n)[:n]
        concepts = (parsed.get("expected_concepts", []) + [[]] * n)[:n]
        return {"questions": questions, "reference_answers": refs, "expected_concepts": concepts}

    def _batch_verify_grounded(self, questions: list, context: str) -> list:
        """One LLM call judging all questions at once, instead of one call per
        question — keeps this within the project's existing rate-limit budget."""
        if not questions:
            return []
        numbered = "\n".join(f"{i + 1}. {q}" for i, q in enumerate(questions))
        prompt = (
            "For each numbered question below, judge whether it can be FULLY answered "
            'using only the given context. Respond ONLY as JSON: {"verdicts": [1, 0, ...]} '
            "(1 = answerable from context, 0 = not).\n\n"
            f"CONTEXT:\n{context[:2500]}\n\nQUESTIONS:\n{numbered}"
        )
        raw = self.generator._llm_call(prompt, temperature=0.0)
        parsed = parse_llm_json(raw)
        verdicts = parsed.get("verdicts", [])
        if len(verdicts) != len(questions):
            return [True] * len(questions)  # fail open: don't block practice on a parse miss
        return [v == 1 for v in verdicts]

    @staticmethod
    def _dominant_tier(results: list) -> str:
        if not results:
            return "none"
        counts = {"T1": 0, "T2": 0, "T3": 0}
        for chunk in results:
            counts[chunk["metadata"]["tier"]] = counts.get(chunk["metadata"]["tier"], 0) + 1
        return max(counts, key=counts.get)
