"""
Exports knowledge_tracing/test_calibration.py's checks as a machine-readable
JSON artifact (calibration_summary.json) — nothing in the project persists
pytest results anywhere; they only ever print to a console and disappear.
backend/main.py's /api/evidence endpoint reads this file so the calibration
findings (including the two honest, documented `xfail` limitations from
TESTING.md) are visible in the product, not just in a terminal.

This deliberately does NOT run pytest and parse its output — it reimplements
the same checks as plain assertions-that-record-instead-of-raise, using the
exact same isolation pattern (fresh model copy, scratch student store) so a
run of this script can never touch the real checkpoints/sakt_dsa.pt or
student_history.json.

Run: cd knowledge_tracing && python export_calibration_summary.py
"""

import os
import sys
import copy
import json

os.environ.setdefault("HF_HUB_OFFLINE", "1")

import tempfile
import numpy as np
from scipy.stats import spearmanr

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import predict as kt_predict  # noqa: E402
import student_store  # noqa: E402
from sakt_model import SAKT  # noqa: E402
from concept_bridge import build_production_model, NUM_DSA_CONCEPTS  # noqa: E402
from personas import PERSONAS, COLD_START_PRIOR  # noqa: E402

WEAK_THRESHOLD = 0.4
OUTPUT_PATH = os.path.join(HERE, "calibration_summary.json")


def _json_default(o):
    """predict_mastery's blend involves numpy/torch scalar types (np.bool_,
    np.floating) that json can't serialize natively despite behaving like
    plain Python bool/float everywhere else."""
    if isinstance(o, np.bool_):
        return bool(o)
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.floating):
        return float(o)
    raise TypeError(f"Object of type {type(o)} is not JSON serializable")


def _setup_isolated_state(base_state_dict, tmp_dir):
    student_store.force_local_backend(True)
    student_store.STORE_PATH = os.path.join(tmp_dir, "test_student_history.json")

    fresh = SAKT(num_concepts=NUM_DSA_CONCEPTS, seq_len=100, embed_dim=64, num_heads=4, dropout=0.2)
    fresh.load_state_dict(copy.deepcopy(base_state_dict))
    fresh.eval()
    kt_predict.reset_model_state(fresh)
    kt_predict.save_production_model = lambda model: None


def _teardown_isolated_state():
    student_store.force_local_backend(False)
    kt_predict.reset_model_state(None)


def _run_persona(persona, student_id):
    for concept, correct in persona["interactions"]:
        kt_predict.update_history(student_id, concept, correct)


def main():
    print("Building base model (content-grounded concept init)...")
    base_state = build_production_model().state_dict()

    summary = {"personas": [], "known_limitations": [], "regression_tests": [],
               "trend_test": {}, "rank_correlation": {}}

    with tempfile.TemporaryDirectory() as tmp_dir:
        _setup_isolated_state(base_state, tmp_dir)

        # --- cold start ---
        cold_mastery = kt_predict.predict_mastery("never_seen_student", "dynamic_programming")
        summary["cold_start"] = {
            "predicted_mastery": cold_mastery, "expected": COLD_START_PRIOR,
            "pass": cold_mastery == COLD_START_PRIOR,
        }

        # --- per-persona weak-topic classification ---
        for persona in PERSONAS:
            if not persona["interactions"]:
                continue
            student_id = f"weak_{persona['name']}"
            _run_persona(persona, student_id)

            checks = []
            for topic in persona["expected_weak"]:
                mastery = kt_predict.predict_mastery(student_id, topic)
                passed = mastery < WEAK_THRESHOLD
                checks.append({"topic": topic, "predicted_mastery": mastery,
                                "threshold": WEAK_THRESHOLD, "expected": "weak", "pass": passed})

            is_known_limitation = persona["name"] == "regressing_recursion"
            summary["personas"].append({
                "name": persona["name"], "description": persona["description"],
                "checks": checks, "known_limitation": is_known_limitation,
            })
            if is_known_limitation and checks and not checks[0]["pass"]:
                summary["known_limitations"].append({
                    "id": "recency_weighting", "persona": persona["name"],
                    "predicted_mastery": checks[0]["predicted_mastery"],
                    "expected": f"< {WEAK_THRESHOLD} (weak)",
                    "status": "xfail",
                    "explanation": (
                        "The per-concept evidence term is a flat correct/total average with no "
                        "recency weighting. This persona is 3 correct then 4 incorrect (43% overall) "
                        "-- a clear recent decline the flat average doesn't reflect. See "
                        "TESTING.md and RESEARCH_ADVANCEMENTS.md Sec 4.1 (Core Contribution 1)."
                    ),
                })

        # --- regression tests (the cross-topic-accuracy-leak bug fix) ---
        sid = "regression_dp_masking"
        for _ in range(3):
            kt_predict.update_history(sid, "arrays", True)
        for _ in range(2):
            kt_predict.update_history(sid, "sorting", True)
        kt_predict.update_history(sid, "dynamic_programming", False)
        kt_predict.update_history(sid, "dynamic_programming", False)
        dp_mastery = kt_predict.predict_mastery(sid, "dynamic_programming")
        summary["regression_tests"].append({
            "name": "wrong_answers_not_masked_by_unrelated_strong_history",
            "value": dp_mastery, "threshold": WEAK_THRESHOLD, "pass": dp_mastery < WEAK_THRESHOLD,
        })

        sid2 = "regression_untouched_inflation"
        for _ in range(5):
            kt_predict.update_history(sid2, "arrays", True)
        for _ in range(5):
            kt_predict.update_history(sid2, "sorting", True)
        untouched = kt_predict.predict_mastery(sid2, "computational_geometry")
        summary["regression_tests"].append({
            "name": "untouched_topic_stays_near_neutral_after_unrelated_strong_history",
            "value": untouched, "threshold": 0.55, "pass": untouched < 0.55,
        })

        # --- trend test ---
        improving = next(p for p in PERSONAS if p["name"] == "improving_dp")
        regressing = next(p for p in PERSONAS if p["name"] == "regressing_recursion")
        _run_persona(improving, "trend_improving")
        _run_persona(regressing, "trend_regressing")
        improving_mastery = kt_predict.predict_mastery("trend_improving", improving["trend_topic"])
        regressing_mastery = kt_predict.predict_mastery("trend_regressing", regressing["trend_topic"])
        summary["trend_test"] = {
            "improving_mastery": improving_mastery, "regressing_mastery": regressing_mastery,
            "pass": improving_mastery > regressing_mastery,
        }

        # --- cross-concept transfer (known limitation) ---
        advanced = next(p for p in PERSONAS if p["name"] == "advanced_uniform")
        beginner = next(p for p in PERSONAS if p["name"] == "beginner_uniform")
        _run_persona(advanced, "transfer_advanced")
        _run_persona(beginner, "transfer_beginner")
        advanced_transfer = kt_predict.predict_mastery("transfer_advanced", "b_trees")
        beginner_transfer = kt_predict.predict_mastery("transfer_beginner", "b_trees")
        transfer_passes = advanced_transfer > beginner_transfer
        summary["cross_concept_transfer"] = {
            "advanced_mastery": advanced_transfer, "beginner_mastery": beginner_transfer,
            "pass": transfer_passes,
        }
        if not transfer_passes:
            summary["known_limitations"].append({
                "id": "cross_concept_transfer", "status": "xfail",
                "advanced_mastery": advanced_transfer, "beginner_mastery": beginner_transfer,
                "explanation": (
                    "With only ~10-12 online gradient steps taken, the model hasn't moved far enough "
                    "from its shared content-grounded initialization to differentiate an advanced-history "
                    "student from a beginner-history student on a topic NEITHER has touched. Expected to "
                    "improve as real usage accumulates more online-adaptation steps. See TESTING.md."
                ),
            })

        # --- rank correlation ---
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
        summary["rank_correlation"] = {"spearman_rho": round(float(rho), 3), "threshold": 0.5, "pass": rho > 0.5}

        _teardown_isolated_state()

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, default=_json_default)
    print(f"Calibration summary saved to: {OUTPUT_PATH}")
    print(json.dumps(summary, indent=2, default=_json_default))


if __name__ == "__main__":
    main()
