"""
FastAPI auth dependency — verifies a Supabase session JWT and returns the
authenticated user id, replacing the old design where any endpoint would
trust whatever `student_id` string the client sent (a real gap noted in
BACKEND.md's "known gaps" before this existed).

Verification calls Supabase's own auth endpoint (`auth.get_user(jwt)`)
rather than decoding the JWT locally. That costs one extra network
round-trip per request, but it's correct regardless of whether a Supabase
project uses the legacy shared-secret (HS256) signing or newer per-project
asymmetric keys — the alternative (decoding locally) would need to know
which scheme a given project uses and keep that in sync if it changes.

Demo accounts (scripts/seed_demo_data.py) are ordinary Supabase Auth users
with `is_demo = true` in `profiles` — they authenticate exactly like any
other account, no special-cased bypass here.

Dev escape hatch: set ALLOW_ANONYMOUS_DEV_MODE=true in .env to accept an
`X-Dev-Student-Id` header instead of a real session — lets local
development/testing continue without a Supabase project. OFF by default;
never set this in a real deployment. See DATABASE.md.
"""

import os
import sys
from fastapi import Header, HTTPException

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
from db.client import get_client, supabase_configured  # noqa: E402


def _dev_mode_enabled() -> bool:
    return os.environ.get("ALLOW_ANONYMOUS_DEV_MODE", "").strip().lower() == "true"


async def get_current_user_id(
    authorization: str = Header(None),
    x_dev_student_id: str = Header(None),
) -> str:
    """FastAPI dependency: `user_id: str = Depends(get_current_user_id)`.
    Raises 401/503 on any failure to authenticate."""
    if _dev_mode_enabled() and x_dev_student_id:
        return x_dev_student_id

    if not supabase_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                "Supabase is not configured on this backend — see DATABASE.md. "
                "For local development without a Supabase project, set "
                "ALLOW_ANONYMOUS_DEV_MODE=true and pass an X-Dev-Student-Id header instead."
            ),
        )
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        response = get_client().auth.get_user(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid or expired session: {e}")

    if not response or not response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return response.user.id
