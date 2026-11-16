"""
Pathfinder Validation Layer — a post-retrieval safety wrapper around
Retriever.retrieve(). Catches low-confidence retrievals (query poorly covered
by the knowledge base, cross-tier mismatch, etc.) before they reach the LLM,
instead of silently generating an answer from weak context.

Confidence signal: `retrieval_confidence` (see retriever.py:retrieve) is the
sigmoid of the mean cross-encoder score across the chunks the tier-allocation
step actually selected. It is a heuristic relevance proxy, not a calibrated
probability — see PATHFINDER.md for why 0.55 was chosen as the threshold.

Escalation: a low-confidence retrieval is retried once at mastery=0.5, which
the tier-allocation table spreads most evenly across T1/T2/T3 (30/50/20)
rather than concentrating on one tier — broadening the retrieval's chances of
finding on-topic content, without mutating any retriever state. Whichever of
the two attempts scored higher confidence is returned; if the retry still
misses the bar, the query is logged and served anyway with a metadata flag so
the frontend/generator can surface the uncertainty rather than fail closed.
"""

import time


class PathfinderValidator:
    CONFIDENCE_THRESHOLD = 0.55
    ESCALATION_MASTERY = 0.5

    def __init__(self, retriever):
        self.retriever = retriever
        self.failure_log = []

    def validated_retrieve(self, query: str, mastery: float, debug: bool = False, on_stage=None, fast: bool = False) -> dict:
        stage = on_stage if on_stage else (lambda _msg: None)

        result = self.retriever.retrieve(query, mastery, debug=debug, on_stage=on_stage, fast=fast)
        confidence = result.get("retrieval_confidence", 0.0)
        stage(f"Checking retrieval confidence ({confidence * 100:.0f}%)...")

        if fast or confidence >= self.CONFIDENCE_THRESHOLD:
            result["pathfinder"] = {"escalated": False, "confidence": confidence}
            return result

        stage("Confidence below threshold — broadening the search and retrying...")
        escalated = self.retriever.retrieve(query, self.ESCALATION_MASTERY, debug=debug, on_stage=on_stage, fast=fast)
        escalated_confidence = escalated.get("retrieval_confidence", 0.0)

        best = escalated if escalated_confidence > confidence else result
        best_confidence = max(confidence, escalated_confidence)

        if best_confidence < self.CONFIDENCE_THRESHOLD:
            self._log_failure(query, mastery, best_confidence)

        best["pathfinder"] = {
            "escalated": True,
            "confidence": best_confidence,
            "pre_escalation_confidence": confidence,
            "below_threshold": best_confidence < self.CONFIDENCE_THRESHOLD,
        }
        return best

    def _log_failure(self, query: str, mastery: float, confidence: float) -> None:
        self.failure_log.append({
            "query": query, "mastery": mastery, "confidence": confidence, "ts": time.time(),
        })
