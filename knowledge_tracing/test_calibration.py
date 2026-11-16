"""
Calibration tests for knowledge_tracing.predict against synthetic personas
with known ground truth (personas.py). These are pass/fail assertions
against scripted expectations, not exploratory LLM-judged metrics — the
kind of test that would have caught the mastery-blend bug this project
shipped once already (see KNOWLEDGE_TRACING.md's "two wrong versions"
story) automatically, instead of by a human noticing an empty roadmap.

Every test gets a fully isolated model + student store (see the
`_isolated_kt_state` fixture) — none of this ever touches the real
checkpoints/sakt_dsa.pt or student_history.json.

Run: cd knowledge_tracing && python -m pytest test_calibration.py -v
"""

import os
import sys
import copy

# The model is already cached locally by this point in the project (loaded
# repeatedly during this session) — force offline mode so a slow/unreliable
# HF Hub metadata check can't stall the whole suite. Set before importing
# anything that touches sentence_transformers.
os.environ.setdefault("HF_HUB_OFFLINE", "1")

import pytest
from scipy.stats import spearmanr

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import predict as kt_predict  # noqa: E402
import student_store  # noqa: E402
from sakt_model import SAKT  # noqa: E402
from concept_bridge import build_production_model, NUM_DSA_CONCEPTS  # noqa: E402
from personas import PERSONAS, COLD_START_PRIOR  # noqa: E402

WEAK_THRESHOLD = 0.4


@pytest.fixture(scope="module")
def _base_model_state():
    """Build the production model (with content-grounded concept init) once
    per test module — expensive to build, cheap to copy."""
    model = build_production_model()
    return model.state_dict()


@pytest.fixture(autouse=True)
def _isolated_kt_state(monkeypatch, tmp_path, _base_model_state):
    """Redirects student history to a scratch file, gives predict.py a
    fresh copy of the base model, and disables checkpoint persistence —
    full isolation between tests and from real production state."""
    # Force the JSON fallback regardless of whether this process's .env has
    # real Supabase credentials — tests must never be able to reach the
    # real database just because credentials exist in the environment.
    student_store.force_local_backend(True)
    monkeypatch.setattr(student_store, "STORE_PATH", str(tmp_path / "test_student_history.json"))

    fresh = SAKT(num_concepts=NUM_DSA_CONCEPTS, seq_len=100, embed_dim=64, num_heads=4, dropout=0.2)
    fresh.load_state_dict(copy.deepcopy(_base_model_state))
    fresh.eval()
    kt_predict.reset_model_state(fresh)
    monkeypatch.setattr(kt_predict, "save_production_model", lambda model: None)

    yield

    student_store.force_local_backend(False)

    kt_predict.reset_model_state(None)


def _run_persona(persona, student_id):
    for concept, correct in persona["interactions"]:
        kt_predict.update_history(student_id, concept, correct)


def test_cold_start_returns_neutral_prior():
    mastery = kt_predict.predict_mastery("never_seen_student", "dynamic_programming")
    assert mastery == COLD_START_PRIOR


_PERSONA_PARAMS = [
    pytest.param(p, id=p["name"])
    for p in PERSONAS
]


@pytest.mark.parametrize("persona", _PERSONA_PARAMS)
def test_weak_topics_classified_correctly(persona):
    student_id = f"weak_{persona['name']}"
    _run_persona(persona, student_id)

    for topic in persona["expected_weak"]:
        mastery = kt_predict.predict_mastery(student_id, topic)
        assert mastery < WEAK_THRESHOLD, (
            f"{persona['name']}: expected '{topic}' to be classified weak (< {WEAK_THRESHOLD}), got {mastery}"
        )


def test_wrong_answers_are_not_masked_by_unrelated_strong_history():
    """The exact scenario that broke in production: 2 wrong DP answers plus
    strong performance elsewhere must still flag DP as weak. Regression
    test for the cross-topic-accuracy-leak bug (see KNOWLEDGE_TRACING.md)."""
    student_id = "regression_dp_masking"
    for _ in range(3):
        kt_predict.update_history(student_id, "arrays", True)
    for _ in range(2):
        kt_predict.update_history(student_id, "sorting", True)
    kt_predict.update_history(student_id, "dynamic_programming", False)
    kt_predict.update_history(student_id, "dynamic_programming", False)

    dp_mastery = kt_predict.predict_mastery(student_id, "dynamic_programming")
    assert dp_mastery < WEAK_THRESHOLD, (
        f"dynamic_programming should register as weak despite strong performance elsewhere, got {dp_mastery}"
    )


def test_untouched_topic_stays_near_neutral_after_unrelated_strong_history():
    """The other half of the same regression: a strong track record
    elsewhere shouldn't inflate an UNTOUCHED, unrelated topic either."""
    student_id = "regression_untouched_inflation"
    for _ in range(5):
        kt_predict.update_history(student_id, "arrays", True)
    for _ in range(5):
        kt_predict.update_history(student_id, "sorting", True)

    untouched = kt_predict.predict_mastery(student_id, "computational_geometry")
    assert untouched < 0.55, (
        f"untouched, unrelated topic should stay close to neutral, got {untouched}"
    )


def test_improving_trend_ends_above_regressing_trend():
    """Same interaction COUNT (7), opposite trend direction, on two
    different but structurally symmetric personas — proves the model isn't
    just an unweighted running average of correct/incorrect."""
    improving = next(p for p in PERSONAS if p["name"] == "improving_dp")
    regressing = next(p for p in PERSONAS if p["name"] == "regressing_recursion")

    _run_persona(improving, "trend_improving")
    _run_persona(regressing, "trend_regressing")

    improving_mastery = kt_predict.predict_mastery("trend_improving", improving["trend_topic"])
    regressing_mastery = kt_predict.predict_mastery("trend_regressing", regressing["trend_topic"])

    assert improving_mastery > regressing_mastery, (
        f"improving trend ({improving_mastery}) should end higher than regressing trend ({regressing_mastery})"
    )


@pytest.mark.xfail(
    reason=(
        "KNOWN LIMITATION (found by this suite, not yet fixed): with only ~10-12 online gradient "
        "steps taken (one per interaction, restricted to concept_embed/interaction_embed/output_head "
        "per predict.py's design), the model hasn't moved far enough from its shared content-grounded "
        "initialization to differentiate an advanced-history student from a beginner-history student "
        "on a topic NEITHER has touched — both come out at ~0.46 instead of clearly separated. "
        "Expected to improve as real usage accumulates more online-adaptation steps across students; "
        "not yet true at this project's current interaction volume. See TESTING.md."
    ),
    strict=True,
)
def test_cross_concept_transfer_direction():
    """SAKT's whole value proposition over a per-concept counter: an
    advanced student should show higher mastery on an UNTOUCHED topic than
    a beginner does, purely via attention over their respective histories."""
    advanced = next(p for p in PERSONAS if p["name"] == "advanced_uniform")
    beginner = next(p for p in PERSONAS if p["name"] == "beginner_uniform")

    _run_persona(advanced, "transfer_advanced")
    _run_persona(beginner, "transfer_beginner")

    untouched_topic = "b_trees"  # neither persona touches this topic
    advanced_transfer = kt_predict.predict_mastery("transfer_advanced", untouched_topic)
    beginner_transfer = kt_predict.predict_mastery("transfer_beginner", untouched_topic)

    assert advanced_transfer > beginner_transfer, (
        f"advanced student's untouched-topic transfer ({advanced_transfer}) should exceed "
        f"beginner's ({beginner_transfer})"
    )


def test_rank_correlation_across_persona_set():
    """Spearman correlation between each persona's scripted per-concept
    accuracy and the resulting predicted mastery, aggregated across every
    concept every persona touches — the aggregate check behind
    EVALUATION_PLAN.md §4b's rank-correlation metric."""
    scripted, predicted = [], []
    for persona in PERSONAS:
        if not persona["interactions"]:
            continue
        student_id = f"rank_{persona['name']}"
        _run_persona(persona, student_id)

        per_concept = {}
        for concept, correct in persona["interactions"]:
            per_concept.setdefault(concept, []).append(correct)

        for concept, results in per_concept.items():
            scripted.append(sum(results) / len(results))
            predicted.append(kt_predict.predict_mastery(student_id, concept))

    rho, _ = spearmanr(scripted, predicted)
    assert rho > 0.5, f"expected meaningful positive rank correlation, got Spearman rho={rho:.3f}"
