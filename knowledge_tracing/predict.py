"""
Inference API consumed by the backend (see IMPLEMENTATION_PLAN's Member 1
contract):

    predict_mastery(student_id, concept) -> float in [0, 1]
    update_history(student_id, concept, correct) -> None

Cold start: a student/concept pair with no history gets a neutral prior
(0.3 — the system's previous static default) rather than a meaningless
prediction from an untrained sequence.

Three-way blend: raw SAKT output, per-concept observed accuracy, and a
neutral prior — NOT just model output vs. a prior, and NOT the student's
overall cross-topic accuracy (an earlier version blended toward that and it
leaked signal the wrong way: a student who breezed through arrays and
sorting would show inflated mastery on dynamic_programming they'd never
attempted, or had actively gotten wrong, because their unrelated "global"
accuracy was high). The three terms:

  - model_weight (fixed, BASE_MODEL_CONFIDENCE): the raw SAKT output,
    trusted for whatever cross-concept transfer it's learned via attention
    (performance on "recursion" should inform a first-ever
    "dynamic_programming" question) — present even at zero direct
    observations, but capped, because early in a deployment the online-
    adapted model hasn't taken enough gradient steps to differentiate
    concepts well and its raw output alone is too weak/noisy a signal.
  - evidence_weight (grows with concept_observations): the student's own
    PER-CONCEPT observed accuracy (correct/total on THIS concept only —
    the fix above is exactly that this must never be cross-topic).
  - prior_weight (shrinks as evidence accumulates): COLD_START_PRIOR,
    filling whatever share the first two don't yet claim.

This is standard shrinkage / Bayesian smoothing toward a neutral prior with
an evidence term, not a novel mechanism — see KNOWLEDGE_TRACING.md.

Online adaptation: the DSA concept embeddings start from a content-grounded
but otherwise untrained initialization (concept_bridge.py has no DSA
interaction data to supervise them with ahead of time). Every update_history()
call takes one small gradient step restricted to the concept-vocabulary
parameters (concept_embed, interaction_embed, output_head); the
attention/FFN backbone transferred from the XES3G5M pretraining run stays
frozen so that a single new interaction can't undo dynamics learned from
5.5M examples.
"""

import os
import sys

import torch
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)  # so bare `import student_store` resolves when loaded as knowledge_tracing.predict
sys.path.insert(0, os.path.join(HERE, "..", "retrieval"))

from concept_bridge import (  # noqa: E402
    TOPIC_TO_ID, load_or_build_production_model, save_production_model, adaptive_parameters,
)
from topic_map import normalize_topic  # noqa: E402
import student_store  # noqa: E402

COLD_START_PRIOR = 0.3
BASE_MODEL_CONFIDENCE = 0.3       # weight given to the model even at 0 direct observations
FULL_CONFIDENCE_AT_N = 5          # observations of THIS concept needed for full model weight
ONLINE_LR = 1e-2
GRAD_CLIP_NORM = 1.0

_model = None
_optimizer = None


def _get_model():
    global _model, _optimizer
    if _model is None:
        _model = load_or_build_production_model()
        _model.eval()
        _optimizer = torch.optim.SGD(adaptive_parameters(_model), lr=ONLINE_LR)
    return _model


def reset_model_state(model=None):
    """Test-only hook: replaces the shared model/optimizer singleton so
    tests can inject an isolated model (see
    knowledge_tracing/test_calibration.py) instead of mutating whatever
    production state happens to be loaded, or persisting to the real
    checkpoint via update_history's normal save-on-every-call behavior."""
    global _model, _optimizer
    _model = model
    _optimizer = torch.optim.SGD(adaptive_parameters(_model), lr=ONLINE_LR) if model is not None else None


def _canonical(concept: str) -> str:
    if concept in TOPIC_TO_ID:
        return concept
    return normalize_topic(concept)


def _concept_id(concept: str) -> int:
    canonical = _canonical(concept)
    if canonical not in TOPIC_TO_ID:
        raise ValueError(f"Unknown DSA concept: '{concept}' (canonical: '{canonical}')")
    return TOPIC_TO_ID[canonical]


def _history_sequence(history: list):
    """Filters a raw history list down to (concept_id, response) pairs, skipping
    any interactions whose concept isn't one of our 34 canonical topics."""
    concept_ids, responses = [], []
    for h in history:
        try:
            concept_ids.append(_concept_id(h["concept"]))
        except ValueError:
            continue
        responses.append(int(h["correct"]))
    return concept_ids, responses


def predict_mastery_detail(student_id: str, concept: str) -> dict:
    """Returns detailed mastery stats including forgetting curve decay."""
    concept_id = _concept_id(concept)
    canonical = _canonical(concept)

    history = student_store.get_history(student_id)
    if not history:
        return {
            "raw_mastery": COLD_START_PRIOR,
            "effective_mastery": COLD_START_PRIOR,
            "days_since_last_practice": 0.0,
            "half_life_days": 0.0,
            "observations": 0
        }

    hist_concept_ids, hist_responses = _history_sequence(history)
    if not hist_concept_ids:
        return {
            "raw_mastery": COLD_START_PRIOR,
            "effective_mastery": COLD_START_PRIOR,
            "days_since_last_practice": 0.0,
            "half_life_days": 0.0,
            "observations": 0
        }

    model = _get_model()
    raw_prob = model.predict_next(hist_concept_ids, hist_responses, concept_id)

    concept_history = [h for h in history if h["concept"] == canonical]
    concept_observations = len(concept_history)

    # Phase 2a Fix 1: Geometrically-weighted accuracy (most recent matters more)
    if not concept_history:
        concept_accuracy = 0.0
    else:
        ORDER_DECAY = 0.75
        weighted_sum = 0.0
        weight_total = 0.0
        current_weight = 1.0
        for h in reversed(concept_history):
            weighted_sum += (1.0 if h["correct"] else 0.0) * current_weight
            weight_total += current_weight
            current_weight *= ORDER_DECAY
        concept_accuracy = weighted_sum / weight_total

    model_weight = BASE_MODEL_CONFIDENCE
    evidence_weight = (1 - BASE_MODEL_CONFIDENCE) * min(1.0, concept_observations / FULL_CONFIDENCE_AT_N)
    prior_weight = 1.0 - model_weight - evidence_weight

    raw_mastery = model_weight * raw_prob + evidence_weight * concept_accuracy + prior_weight * COLD_START_PRIOR
    raw_mastery = float(raw_mastery)

    if concept_observations == 0:
        return {
            "raw_mastery": raw_mastery,
            "effective_mastery": raw_mastery,
            "days_since_last_practice": 0.0,
            "half_life_days": 0.0,
            "observations": 0
        }

    # Phase 2a Fix 2: Calendar-time retention decay (forgetting curve)
    import time
    from datetime import datetime, timezone
    
    last_ts = concept_history[-1]["ts"]
    if isinstance(last_ts, str):
        last_dt = datetime.fromisoformat(last_ts.replace("Z", "+00:00"))
        days_since = (datetime.now(timezone.utc) - last_dt).total_seconds() / 86400.0
    else:
        days_since = (time.time() - last_ts) / 86400.0
        
    days_since = max(0.0, days_since)

    BASE_HALF_LIFE = 7.0
    ALPHA = 0.5
    half_life_days = BASE_HALF_LIFE * (1 + ALPHA * concept_observations) * (0.5 + raw_mastery)
    
    effective_mastery = COLD_START_PRIOR + (raw_mastery - COLD_START_PRIOR) * (2.0 ** (-days_since / half_life_days))
    
    return {
        "raw_mastery": round(raw_mastery, 4),
        "effective_mastery": round(effective_mastery, 4),
        "days_since_last_practice": round(days_since, 2),
        "half_life_days": round(half_life_days, 2),
        "observations": concept_observations
    }

def predict_mastery(student_id: str, concept: str) -> float:
    """Returns mastery score m in [0, 1] for a specific concept."""
    detail = predict_mastery_detail(student_id, concept)
    return detail["effective_mastery"]


def update_history(student_id: str, concept: str, correct: bool, misconception: str = None) -> None:
    """Appends a new interaction, then takes one online adaptation step."""
    concept_id = _concept_id(concept)
    canonical = _canonical(concept)

    history = student_store.get_history(student_id)
    hist_concept_ids, hist_responses = _history_sequence(history)

    student_store.append_interaction(student_id, canonical, correct, misconception=misconception)

    if hist_concept_ids:
        model = _get_model()
        _online_update(model, hist_concept_ids, hist_responses, concept_id, int(correct))


def _online_update(model, hist_concept_ids, hist_responses, target_concept, target_response):
    global _optimizer
    seq_len = model.seq_len
    hist = list(zip(hist_concept_ids, hist_responses))[-seq_len:]
    pad = seq_len - len(hist)

    past_c = [0] * pad + [c + 1 for c, _ in hist]
    past_r = [0] * pad + [r for _, r in hist]
    query_c = [0] * pad + [c + 1 for c, _ in hist[1:]] + [target_concept + 1]

    past_c_t = torch.tensor([past_c], dtype=torch.long)
    past_r_t = torch.tensor([past_r], dtype=torch.long)
    query_c_t = torch.tensor([query_c], dtype=torch.long)
    target = torch.tensor([float(target_response)])

    model.train()
    logits = model(past_c_t, past_r_t, query_c_t)[:, -1]
    loss = F.binary_cross_entropy_with_logits(logits, target)

    _optimizer.zero_grad()
    loss.backward()
    torch.nn.utils.clip_grad_norm_(list(adaptive_parameters(model)), max_norm=GRAD_CLIP_NORM)
    _optimizer.step()
    model.eval()

    save_production_model(model)
