"""
Persists each student's (concept, correct, timestamp) interaction history.

Uses Supabase Postgres (supabase/schema.sql's `interactions` table) when
SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are configured in .env — this is what
makes a real user's progress survive across sessions and devices. Falls back
to a local JSON file otherwise, so the system keeps working with zero
external dependencies before Supabase is configured, in local dev, and in
test suites. See DATABASE.md.

Test isolation: call force_local_backend(True) before a test/eval run to
guarantee the JSON fallback is used even if the process's .env happens to
have real Supabase credentials — tests must never be able to touch the real
database just because credentials exist in the environment. See
knowledge_tracing/test_calibration.py, evaluation/eval_roadmap.py, and
evaluation/eval_end_to_end.py for the three call sites that rely on this.
"""

import os
import sys
import json
import time
from threading import Lock

HERE = os.path.dirname(os.path.abspath(__file__))
STORE_PATH = os.path.join(HERE, "student_history.json")
_lock = Lock()

_force_local = False


def force_local_backend(force: bool = True) -> None:
    """Test-only override — see module docstring."""
    global _force_local
    _force_local = force


def _using_supabase(student_id: str) -> bool:
    if _force_local:
        return False
    sys.path.insert(0, os.path.join(HERE, ".."))
    from db.client import is_local_dev_identity, supabase_configured
    return supabase_configured() and not is_local_dev_identity(student_id)


# ---------------------------------------------------------------
# JSON fallback (local dev / testing / Supabase not yet configured)
# ---------------------------------------------------------------

def _load_json() -> dict:
    if not os.path.exists(STORE_PATH):
        return {}
    with open(STORE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_json(data: dict) -> None:
    tmp_path = STORE_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp_path, STORE_PATH)


def _append_json(student_id: str, canonical_concept: str, correct: bool, ts: float = None, misconception: str = None) -> None:
    with _lock:
        data = _load_json()
        data.setdefault(student_id, []).append({
            "concept": canonical_concept, "correct": bool(correct), "ts": ts if ts is not None else time.time(),
            "misconception": misconception
        })
        _save_json(data)


def _get_json(student_id: str) -> list:
    with _lock:
        return _load_json().get(student_id, [])


# ---------------------------------------------------------------
# Supabase Postgres (production, real accounts)
# ---------------------------------------------------------------

def _append_supabase(student_id: str, canonical_concept: str, correct: bool, ts: float = None, misconception: str = None) -> None:
    sys.path.insert(0, os.path.join(HERE, ".."))
    from db.client import get_client
    payload = {
        "user_id": student_id, "concept": canonical_concept, "correct": bool(correct), "misconception": misconception
    }
    if ts is not None:
        from datetime import datetime, timezone
        payload["created_at"] = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
    get_client().table("interactions").insert(payload).execute()


def _get_supabase(student_id: str) -> list:
    sys.path.insert(0, os.path.join(HERE, ".."))
    from db.client import get_client
    response = (
        get_client().table("interactions")
        .select("concept, correct, created_at, misconception")
        .eq("user_id", student_id)
        .order("created_at")
        .execute()
    )
    return [{"concept": r["concept"], "correct": r["correct"], "ts": r["created_at"], "misconception": r.get("misconception")} for r in response.data]


# ---------------------------------------------------------------
# Public interface (unchanged signatures — callers never branch on backend)
# ---------------------------------------------------------------

def append_interaction(student_id: str, canonical_concept: str, correct: bool, ts: float = None, misconception: str = None) -> None:
    if _using_supabase(student_id):
        _append_supabase(student_id, canonical_concept, correct, ts=ts, misconception=misconception)
    else:
        _append_json(student_id, canonical_concept, correct, ts=ts, misconception=misconception)


def get_history(student_id: str) -> list:
    """Full chronological interaction list: [{concept, correct, ts}, ...]."""
    if _using_supabase(student_id):
        return _get_supabase(student_id)
    return _get_json(student_id)
