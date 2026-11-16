# Knowledge Tracing — SAKT, Transfer Learning, and Online Adaptation

Replaces the system's previous static `mastery = 0.3` input with a per-topic
mastery score predicted from each student's actual interaction history,
using Self-Attentive Knowledge Tracing (SAKT — Pandey & Karypis, 2019). This
is the module `implementation_plan.md` calls "the most critical remaining
module... what transforms the system from a static demo into a true
adaptive intelligent tutor."

```
student's (concept, correct/incorrect) history -> SAKT self-attention -> P(correct on next concept) = mastery
```

## The core problem: no DSA-specific interaction dataset exists

SAKT needs real interaction sequences to learn from. The only large-scale,
publicly available knowledge-tracing benchmark this project has access to is
**XES3G5M** (`D:\Capstone Data\KT`, pykt-toolkit format) — 5.5M interactions
from 18,066 students, 1175 knowledge concepts, 7652 questions. It's a
Chinese elementary/middle-school **math** dataset. Its concepts
("加乘原理" — the multiplication principle, etc.) have nothing to do with
DSA, so its concept-indexed tables cannot be reused directly for a "hash
tables" or "dynamic programming" mastery score.

This splits Knowledge Tracing into two deliberately separate stages:

## Stage 1 — Pretrain & validate the architecture on XES3G5M

`train_sakt.py` trains a standard single-block SAKT (`sakt_model.py`:
embedding dim 64, 4 attention heads, sequence length 100, causal masking) on
`kc_level/train_valid_sequences.csv`, using the pykt 5-fold split (4 folds
train, 1 held out for validation) and each student's raw interaction stream
windowed into fixed-length blocks of 101 interactions (100 usable
next-step predictions per block, respecting the dataset's own `selectmasks`
and `is_repeat` columns so padded and overlap-duplicated positions aren't
scored or trained on).

**Result:** 50 epochs, Adam (lr=1e-3), CPU-only (~75s/epoch on a 12-core
laptop, no GPU needed — the windowed dataset is ~45k training sequences,
not 5.5M rows), no early stopping needed (validation AUC still climbing
slowly through epoch 50):

| Epoch | Val AUC |
|---|---|
| 1 | 0.7122 |
| 10 | 0.7524 |
| 25 | 0.7620 |
| 49 (best) | **0.7673** |
| 50 | 0.7673 |

Full per-epoch history in `checkpoints/train_log.json`. An AUC of ~0.77 on a
held-out fold is a solid, literature-consistent result for single-block SAKT
(the original paper and follow-on KT benchmarks typically report SAKT in the
0.72–0.80 AUC range depending on dataset) — this validates that the
*architecture choice itself* (attention over interaction history, per the
literature survey in `Capstone_Report_Phase_2.md` §2.1) learns real
sequential mastery dynamics, before it ever sees a single DSA concept.

This checkpoint (`checkpoints/sakt_xes3g5m.pt`) is a one-time (or
occasional) artifact — nothing in the live system re-trains it. Re-run
`train_sakt.py` only if you want to retrain from scratch (e.g. after
changing the architecture or getting more/different pretraining data).

## Stage 2 — Transfer to the 34 DSA canonical topics (`concept_bridge.py`)

What actually transfers from the XES3G5M checkpoint to the production DSA
model, and why:

| Transfers as-is | Why |
|---|---|
| Position embeddings | Encodes "how far back in the sequence" — meaning is concept-independent |
| Attention weights (in/out projection) | The actual sequential-dependency logic — this is the whole point of pretraining |
| Feed-forward block, both LayerNorms | Concept-independent transformation of the attended representation |
| Output head (hidden state → P(correct)) | Maps a representation to a probability; doesn't reference concept identity |
| **Reinitialized instead** | **Why** |
| `concept_embed`, `interaction_embed` | Vocabulary-sized (1175 XES3G5M concepts vs. 34 DSA topics) — literally cannot transfer |

The reinitialized concept embeddings are **not** left as random noise
either: `_content_grounded_concept_init()` computes the mean
`all-MiniLM-L6-v2` sentence embedding of each canonical topic's own content
(sampled from `chunking/all_chunks.json`, the same embedding model
`retriever.py` already uses for dense search), then projects it down to the
model's 64-dim space with a fixed random projection. Every DSA topic starts
from a semantically grounded point derived from the project's own retrieval
corpus, rather than from nothing.

This produces `checkpoints/sakt_dsa.pt` — the checkpoint the live system
actually uses, auto-created by `predict.py` on first use if it doesn't
already exist.

## Serving predictions (`predict.py`)

```python
predict_mastery(student_id: str, concept: str) -> float   # in [0, 1]
update_history(student_id: str, concept: str, correct: bool) -> None
```

**Cold start.** No history for a student → `0.3` (the system's previous
static default), not a meaningless forward pass through an
un-conditioned model.

**Three-way confidence blend — not a simple two-way blend.** predict_mastery
combines three terms, each with its own weight:

```
model_weight    = 0.3                                                     (fixed)
evidence_weight = 0.7 * min(1, observations_of_this_concept / 5)          (grows with direct evidence)
prior_weight    = 1 - model_weight - evidence_weight                      (shrinks as evidence accumulates)

mastery = model_weight * raw_model_output
        + evidence_weight * concept_specific_accuracy
        + prior_weight * COLD_START_PRIOR
```

- **`raw_model_output`** — SAKT's own estimate. Trusted for whatever
  cross-concept transfer it's learned via attention (strong performance on
  `recursion` should inform a first-ever `dynamic_programming` prediction),
  present even at zero direct observations, but *capped* at 30% — see the
  bug story below for why it can't be trusted more than that early on.
- **`concept_specific_accuracy`** — the student's own correct/total ratio
  **on this concept only**. Grows in weight as direct observations
  accumulate (full weight at 5 observations).
- **`COLD_START_PRIOR`** (0.3) — fills whatever share the other two haven't
  earned yet.

**This went through two wrong versions before landing here, both caught by
the Adaptive Roadmap module (`roadmap/`) returning an empty roadmap in
testing:**

1. *First version* blended `raw_model_output` against the student's
   **overall cross-topic accuracy** as the fallback prior. Wrong: a student
   who'd done well on `arrays` and `sorting` got inflated mastery on
   `dynamic_programming` they'd actively gotten wrong, because their high
   *unrelated* accuracy dominated the blend once direct observations were
   scarce. Whatever legitimate cross-topic transfer exists is already the
   model's job via attention over the full sequence — it shouldn't also be
   hand-coded into the prior.
2. *Second version* fixed that by blending toward the fixed
   `COLD_START_PRIOR` instead — but then **everything** landed in the same
   "medium" mastery band regardless of history (3/3 correct on one topic
   and 0/2 correct on another produced nearly identical scores). Cause: a
   freshly online-adapted model (a handful of tiny gradient steps in) just
   doesn't have a strong enough raw signal yet to differentiate concepts,
   so with only `raw_model_output` and a neutral prior in the blend,
   direct evidence had no way to actually move the needle.
3. **Current version** adds the third term: `concept_specific_accuracy`,
   distinct from both the model's (still-maturing) estimate and the neutral
   prior. It's per-concept, so it can't leak across topics the way version 1
   did, and it's real observed evidence, so it can move mastery the way
   version 2 couldn't.

This is standard shrinkage/Bayesian smoothing toward a neutral prior with an
added evidence term, not a novel mechanism — it exists because a single
lucky or unlucky answer on a topic the student has seen once shouldn't swing
their mastery score from 0.3 to 0.9, while five wrong answers in a row
absolutely should move it.

**Online adaptation.** The DSA concept embeddings start from a
content-grounded but otherwise *untrained* initialization — there's no
DSA interaction data to supervise them with ahead of time. Every
`update_history()` call therefore takes one small gradient step (SGD,
lr=1e-2, gradient-clipped) restricted to `concept_embed`, `interaction_embed`,
and `output_head` — the transferred attention/FFN backbone stays frozen so
a single new interaction can't undo dynamics learned from 5.5M XES3G5M
examples. The updated production model is persisted after every call.

This is deliberately *not* a full fine-tune of the whole network per
interaction: with real DSA usage producing far fewer interactions than
XES3G5M's 5.5M, an unrestricted per-example gradient step risks
catastrophically forgetting the pretrained sequential dynamics for the sake
of fitting one new data point.

## Storage (`student_store.py`)

A single JSON file (`student_history.json`), keyed by student ID, holding
the full chronological interaction list. Adequate for this project's scale;
swap for a real database before running concurrent uvicorn workers (see
`backend/BACKEND.md`'s known gaps).

## Where this plugs in

`knowledge_tracing.predict` is called from `backend/main.py` (`/api/mastery`,
`/api/generate-questions`, `/api/submit-answer`) and has no dependency on any
LLM provider — SAKT inference and the online gradient step are pure PyTorch.
The *interactions* it learns from come entirely from the Practice Loop
(`PRACTICE_LOOP.md`); see `backend/BACKEND.md`'s "Closed Loop" section for
how a `/api/submit-answer` call's grading result flows into
`update_history()` and then changes what the very next `/api/ask` retrieves.
