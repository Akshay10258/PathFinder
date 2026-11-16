# Adaptive Roadmap — Topic Recommendation & Prerequisite Sequencing

The one piece of the system's abstract-level claim ("constructs a
personalized learning roadmap that sequences topics, practice, and
reinforcement activities according to the learner's current state") that had
no implementation at all until now. Knowledge Tracing
(`knowledge_tracing/`) answers "how well does this student know topic X";
this module answers "which topic should they study next, in what order, for
how long, and why."

## Provenance

This isn't built from scratch — it's a port of a more mature, independently-built
reference implementation (`Roadmap_Gen_Module`, a separate project: 9-step
agentic pipeline with skill analysis, graph-constrained iterative LLM
ordering, RAG grounding, and a self-correcting validation loop). That
reference used a hardcoded 5-level student skill snapshot, a coarser
15-concept taxonomy, its own ChromaDB + separate CLRS/GFG corpus, and Groq.
Integrating it into this project meant replacing every one of those with
this project's real, already-built infrastructure — not just copying files:

| Reference module | This project |
|---|---|
| Hardcoded `StudentSnapshot` (5-level Likert: "very weak"..."very strong") | Real, continuous mastery in [0,1] per topic from `knowledge_tracing.predict.predict_mastery` (SAKT) |
| 15-concept taxonomy, hand-mapped from finer topics | This project's 34 canonical topics (`retrieval/topic_map.py`) directly — more granular, and topic_map.py already resolves aliases everywhere else in the system, so no separate mapping layer is needed |
| Own ChromaDB + a separate, smaller CLRS/GFG corpus | This project's own `Retriever` — the same 3-tier, 1746-chunk FAISS+BM25 pipeline the tutor itself uses, retrieved once per roadmap step at that step's own mastery level |
| Groq (`llama-3.3-70b-versatile`) via its own `llm/client.py` | This project's provider-agnostic `llm/client.py` (Azure/Gemini/Claude, see `llm/LLM_CLIENT.md`) |

The graph-constrained iterative ordering loop and the generate → validate →
retry self-correction loop are the reference's genuinely good ideas, carried
over largely as designed.

## Pipeline

```
skill_analyzer.py    -> real per-topic mastery (SAKT) -> weak / mastered / priority-ordered topics
        |
concept_graph.py     -> prerequisite DAG expansion: weak topics + their full transitive prerequisite closure
        |
topic_ordering.py    -> iterative LLM+graph loop: at each step, compute what's eligible (prereqs
        |                satisfied) and what each eligible topic would unlock, let the LLM pick the
        |                highest-leverage next topic within the remaining time budget
        |
planning_agent.py    -> retrieve_curriculum_context(): ground each ordered step in real retrieved
        |                content + a citation (via THIS project's Retriever, not a second store)
        |              -> generate_roadmap(): LLM writes the final per-step reasoning, grounded in
        |                that context
        |              -> validate_roadmap(): deterministic check — prerequisite ordering, time
        |                budget, duplicates — feeds violations back into a retry (up to 3 attempts)
        v
roadmap_engine.get_roadmap(student_id, retriever, time_budget_hours) -> final roadmap dict
```

### 1. Skill Analysis (`skill_analyzer.py`)

Pulls `predict_mastery(student_id, topic)` for all 34 canonical topics.
Classifies `weak` (mastery < 0.4 — the same beginner/intermediate boundary
used elsewhere in the project), `mastered` (mastery >= 0.75 — deliberately a
higher bar than the general "advanced" cutoff of 0.7, since "don't need to
restudy this" should require more confidence than "advanced persona"), and
orders weak topics by ascending mastery (weakest first = highest priority).
`skill_multiplier(mastery)` continuously scales estimated study time
(1.4x at mastery=0 down to 0.1x at mastery=1) — a deliberate upgrade over
the reference's discrete 5-bucket multiplier table, since real mastery is
continuous and shouldn't snap between five hardcoded values.

### 2. Prerequisite Graph (`concept_graph.py`)

`PREREQUISITES`: a manually curated DAG over all 34 canonical topics,
following standard DSA course / CLRS-chapter progression (e.g.
`dynamic_programming` requires `recursion_backtracking` and
`divide_and_conquer`; `shortest_paths` requires `graph_algorithms` and
`heap`). `TOPIC_WEIGHTS`: manually calibrated relative study-effort per
topic, used to split the time budget proportionally.

**This is a documented judgment call, not learned from data** — no dataset
of real DSA learners' topic-mastery sequences exists to learn an ordering
from. The graph is checked for consistency against `topic_map.py`'s
canonical topic set at import time (raises immediately if the two ever
drift apart, e.g. a new canonical topic added without updating this graph).

### 3. Iterative Ordering (`topic_ordering.py`)

At each step: compute `eligible` topics (all prerequisites satisfied),
compute `unlock_map` (what each eligible topic would newly unlock if
completed), then ask the LLM to pick the single best next topic given
mastery, target-vs-prerequisite role, and downstream leverage — not a
static topological sort, an LLM reasoning within a graph-constrained search
space. Stops when the time budget runs out or all candidates are covered.
A hard `max_iterations=20` cap bounds worst-case LLM call count regardless
of how large a time budget is passed in. Falls back to a deterministic pick
(highest-weighted eligible topic) if the LLM is unavailable or returns
unusable output — the roadmap always completes, degraded rather than failing.

### 4. Grounding, Planning & Validation (`planning_agent.py`)

Each ordered step gets a real retrieval pass through this project's own
`Retriever` at that topic's own mastery (so a weak topic's grounding context
skews toward intuitive T3 material, same as `/api/ask` would show that
student). The planning LLM call writes final per-step reasoning grounded in
that retrieved context and citing it — it's explicitly instructed not to
change the sequencing, hours, or reference it was given, only to explain
them. `validate_roadmap()` then deterministically checks the result
(prerequisite ordering, time budget, duplicate topics); any violation is
fed back into the prompt for a bounded retry (`MAX_VALIDATION_ATTEMPTS=3`).

## API

```
GET /api/roadmap/{student_id}?hours=10.0
```
Returns: `summary` (short LLM-written learning-situation summary), ordered
`roadmap` (each step: topic, hours, reason, reference, mastery), `weak_topics`,
`mastered_topics`, `topics_skipped` (candidates that didn't fit the time
budget), and `validation_attempts`/`validation_errors` for transparency into
whether the self-correction loop had to run.

## Known limitations (stated, not hidden)

- The prerequisite graph and topic weights are hand-curated pedagogical
  judgment calls, as noted above — a natural target for the eval framework
  (once it's revisited) to validate empirically against real usage.
- Every roadmap request can trigger a meaningful number of LLM calls (one
  per ordering iteration, plus up to 3 planning attempts) — bounded by
  `max_iterations` and `MAX_VALIDATION_ATTEMPTS`, but still worth being
  aware of under tight rate limits (see `llm/LLM_CLIENT.md`'s failover
  design for what happens if a provider gets rate-limited mid-request).
