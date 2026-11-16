# Backend — API Layer, Pathfinder Validation, and the Closed Loop

`backend/main.py` is the FastAPI process that wires every subsystem in this
repo into one API: retrieval (`retrieval/`), generation (`generation/`),
knowledge tracing (`knowledge_tracing/`), and the practice loop
(`generation/question_generator.py`, `evaluation/answer_evaluator.py`).
Nothing here has its own logic beyond orchestration and input validation —
each endpoint is a thin composition of calls into those modules. See
`PRACTICE_LOOP.md` and `knowledge_tracing/KNOWLEDGE_TRACING.md` for how the
pieces it calls actually work.

## Endpoints

Every endpoint below except `/api/health` requires authentication —
`user_id: str = Depends(get_current_user_id)` (`backend/auth.py`), which
verifies a Supabase session JWT and returns the real, server-verified user
id. There is no more client-supplied `student_id` field anywhere — see
`DATABASE.md` for why (`/api/mastery/{student_id}` used to let anyone read
anyone's mastery by guessing an id; that's gone now, not just moved).

| Endpoint | Method | Body/Query | Calls |
|---|---|---|---|
| `/api/ask` | POST | `{query, mastery?, topic?}` | Pathfinder → Retriever → AnswerGenerator, persists both turns to `chat_messages` |
| `/api/chat/history` | GET | — | Returns this user's persisted conversation |
| `/api/mastery` | GET | — | `predict_mastery` for all 34 canonical topics, for the caller only |
| `/api/generate-questions` | POST | `{topic, mastery?, n_questions?}` | `predict_mastery` (if needed) → QuestionGenerator |
| `/api/submit-answer` | POST | `{concept, student_answer, reference_answer, expected_concepts, mastery?}` | AnswerEvaluator → `update_history` → `predict_mastery` |
| `/api/roadmap` | GET | — | Cache-first read (`backend/persistence.py`) — returns `{cached: true, payload, ...}` or `{cached: false, status}` |
| `/api/roadmap/generate` | POST | `?hours=` | Kicks off `get_roadmap()` in a background thread, returns immediately (generation takes 10-15 min — see `roadmap/ROADMAP.md`) |
| `/api/profile` | GET | — | Display info (`profiles` table) for the authenticated user |
| `/api/health` | GET | — | liveness check, no auth |

`mastery` is explicit-first everywhere: if the caller sends it directly,
it's used as-is. It's only derived from SAKT (`predict_mastery(user_id,
topic)`) when `mastery` is omitted *and* a `topic` is supplied. A free-text
`/api/ask` query with no `topic` and no explicit `mastery` falls back to a
neutral 0.5 — SAKT needs a specific canonical concept to condition on, and
classifying an arbitrary chat query into one of the 34 canonical topics
automatically was never any team member's assigned scope (see
`implementation_plan.md`); it's listed as a real gap below, not silently
papered over.

## The Closed Loop

This is what actually makes the system "adaptive" end to end, as opposed to
individually-adaptive pieces:

```
1. POST /api/generate-questions {topic}
      -> predict_mastery(user_id, topic) picks the difficulty band
      -> QuestionGenerator returns questions + reference_answers + expected_concepts

2. POST /api/submit-answer {concept, student_answer, reference_answer, expected_concepts}
      -> AnswerEvaluator.evaluate(...) fuses BERT similarity + concept coverage + LLM grade
      -> update_history(user_id, concept, result["correct"])
           -> appends to Postgres `interactions` (or the local JSON fallback — see DATABASE.md)
           -> takes one online gradient step on the DSA concept embeddings
      -> predict_mastery(user_id, concept) returns the POST-update mastery

3. Next POST /api/ask {query, topic}
      -> mastery is now whatever SAKT just updated it to
      -> retrieval tier allocation and the generation persona both shift accordingly
```

Steps 1–2 are the practice loop; step 3 is where the updated mastery score
actually changes what the student sees next, closing the loop described in
`Capstone_Report_Phase_2.md`'s "Learning Feedback Pipeline". `user_id` in
every step is the real, JWT-verified identity from `get_current_user_id` —
the loop closes around one real account now, not an arbitrary string a
client could send as anything.

## Pathfinder Validation Layer (`backend/pathfinder.py`)

A retrieval confidence check inserted between `Retriever.retrieve()` and
`AnswerGenerator.generate()` in `/api/ask`, so a query the knowledge base
covers poorly doesn't silently reach the LLM as if it were well-grounded.

**Confidence signal.** `Retriever.retrieve()` now also returns
`retrieval_confidence`: the mean cross-encoder score of the chunks the
tier-allocation step actually selected (*before* hierarchical/multi-hop
expansion, which adds chunks the cross-encoder never scored), squashed
through a sigmoid. Raw `ms-marco-MiniLM` cross-encoder scores are logits, not
a `[0, 1]` similarity — the existing pipeline already filters anything below
`-4.0` (see `retriever.py: rerank_cross_encoder`) — so averaging them directly
against a plan-style "0.60 similarity threshold" would have compared two
different scales. The sigmoid turns the average logit into an interpretable
0–1 relevance proxy first.

**Threshold.** `CONFIDENCE_THRESHOLD = 0.55`. This is a heuristic starting
point (a mean cross-encoder logit right around 0, where the model is roughly
as likely to call the average selected chunk relevant as not), not a value
tuned against labeled data — there is no labeled "was this retrieval actually
good" dataset for this project to calibrate against. Treat it as the
system's stated confidence bar, revisit it once `evaluation/` produces
`retrieval_confidence` distributions to calibrate from.

**Escalation.** Below the threshold, the query is retried once at
`mastery=0.5` — per the tier-allocation table this is the *most evenly
spread* setting across T1/T2/T3 (30/50/20, versus the more concentrated
allocations at the mastery extremes), broadening the pool of candidate chunks
without mutating any state on the shared `Retriever` instance (no monkey-
patching, unlike the ablation harness in `evaluation/eval_comprehensive.py`,
which does monkey-patch `compute_tier_weights` for its "no tier weighting"
condition — that's fine for a one-off offline ablation run, but not for a
live singleton shared across concurrent requests). Whichever attempt scored
higher confidence is returned. If the retry still misses the bar, the query
is appended to `pathfinder.failure_log` (in-memory; add persistence before
relying on this past a single process's lifetime) and served anyway, tagged
with `pathfinder.below_threshold: true` in the response — failing loud in the
metadata rather than failing closed and refusing to answer at all.

## Known gaps (explicitly out of scope here, not overlooked)

- **Topic classification for `/api/ask`.** Free-text queries don't get an
  automatic SAKT-driven mastery; a `topic` (or explicit `mastery`) must be
  supplied. A real fix would reuse the retriever's own topic-detection
  (`Retriever._get_dominant_topics`) to infer a canonical topic from the
  query text before calling `predict_mastery` — deliberately left out here
  because `_get_dominant_topics` also inspects rerank results the confidence
  gate and generation prompt haven't run yet at that point in the request.
- **`PathfinderValidator.CONFIDENCE_THRESHOLD` is a heuristic**, not
  calibrated against ground truth — see above.
- **In-memory `_roadmap_jobs` status dict** (main.py) is single-process,
  same scale-honesty as the old `student_history.json` era — wouldn't
  survive multiple uvicorn workers. `/api/roadmap`'s cache table itself
  (Postgres, `DATABASE.md`) doesn't have this problem; only the transient
  "is a generation currently running" status does.
- **Authentication and real per-user persistence are now real** — see
  `DATABASE.md` for the design (Supabase Auth + Postgres, service-role-key
  backend, graceful degradation to the old JSON-file/anonymous behavior when
  Supabase isn't configured). This used to be listed here as a gap; it
  isn't anymore, but note the `ALLOW_ANONYMOUS_DEV_MODE` escape hatch that
  makes local development without a Supabase project still possible —
  never enable it in a real deployment.
