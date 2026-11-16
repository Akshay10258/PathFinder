"""
Bridges the SAKT backbone pretrained on XES3G5M (1175 Chinese elementary-math
knowledge components) to our 34 canonical DSA topics (`retrieval/topic_map.py`).

XES3G5M's concepts have nothing to do with DSA, so its concept-indexed tables
(concept_embed, interaction_embed) are NOT reusable. What transfers is the
architecture's *sequential-attention backbone* — position embeddings,
attention weights, the feed-forward block, and the output head — none of
which are concept-vocabulary-sized, all of which encode general
"how does a sequence of past interactions predict the next one" dynamics
learned from 5.5M real interactions. See KNOWLEDGE_TRACING.md for the full
rationale and validation numbers.

The freshly-sized DSA concept embeddings are not left randomly initialized
either: they're seeded from the mean sentence-embedding of each topic's own
retrieval corpus (`chunking/all_chunks.json`), projected down to the model's
embed_dim with a fixed random projection. This gives every DSA topic a
semantically grounded starting point instead of noise, before any student
interactions exist to train on.
"""

import os
import sys
import json
from collections import defaultdict

import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)  # so bare `import sakt_model` resolves when loaded as knowledge_tracing.concept_bridge
sys.path.insert(0, os.path.join(HERE, "..", "retrieval"))
from topic_map import TOPIC_ALIASES  # noqa: E402
from sakt_model import SAKT  # noqa: E402

CANONICAL_TOPICS = sorted(TOPIC_ALIASES.keys())
TOPIC_TO_ID = {t: i for i, t in enumerate(CANONICAL_TOPICS)}
ID_TO_TOPIC = {i: t for t, i in TOPIC_TO_ID.items()}
NUM_DSA_CONCEPTS = len(CANONICAL_TOPICS)

CHECKPOINT_DIR = os.path.join(HERE, "checkpoints")
PRETRAINED_PATH = os.path.join(CHECKPOINT_DIR, "sakt_xes3g5m.pt")
PRODUCTION_PATH = os.path.join(CHECKPOINT_DIR, "sakt_dsa.pt")
ALL_CHUNKS_PATH = os.path.join(HERE, "..", "chunking", "all_chunks.json")

# Params that are shared, concept-vocabulary-independent, and safe to transfer
# verbatim from the XES3G5M checkpoint into the DSA-sized model.
TRANSFERABLE_PREFIXES = (
    "position_embed", "attention", "attn_norm", "ffn", "ffn_norm", "output_head",
)
# Params that get per-interaction online updates once real practice data arrives,
# while the transferred backbone stays frozen (see predict.py:update_history).
ADAPTIVE_PARAMS = ("concept_embed", "interaction_embed", "output_head")


def _content_grounded_concept_init(embed_dim: int, seed: int = 7):
    """Mean sentence-embedding per canonical topic, projected to embed_dim."""
    if not os.path.exists(ALL_CHUNKS_PATH):
        return None
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        return None

    with open(ALL_CHUNKS_PATH, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    by_topic = defaultdict(list)
    for c in chunks:
        topic = c["metadata"].get("canonical_topic")
        if topic in TOPIC_TO_ID:
            text = c.get("clean_content", "")[:500]
            if text:
                by_topic[topic].append(text)

    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    raw_dim = (embedder.get_embedding_dimension() if hasattr(embedder, "get_embedding_dimension")
               else embedder.get_sentence_embedding_dimension())
    table = torch.zeros(NUM_DSA_CONCEPTS + 1, raw_dim)  # row 0 = padding, stays zero
    for topic, texts in by_topic.items():
        vecs = embedder.encode(texts[:30], show_progress_bar=False, convert_to_numpy=True)
        table[TOPIC_TO_ID[topic] + 1] = torch.tensor(vecs.mean(axis=0))

    generator = torch.Generator().manual_seed(seed)
    projection = torch.randn(raw_dim, embed_dim, generator=generator) / (raw_dim ** 0.5)
    return table @ projection


def build_production_model(seed: int = 42) -> SAKT:
    torch.manual_seed(seed)

    if os.path.exists(PRETRAINED_PATH):
        ckpt = torch.load(PRETRAINED_PATH, map_location="cpu", weights_only=False)
        cfg = ckpt["config"]
        pretrained = SAKT(**cfg)
        pretrained.load_state_dict(ckpt["model_state_dict"])

        model = SAKT(num_concepts=NUM_DSA_CONCEPTS, seq_len=cfg["seq_len"],
                     embed_dim=cfg["embed_dim"], num_heads=cfg["num_heads"], dropout=cfg["dropout"])

        pretrained_state = pretrained.state_dict()
        model_state = model.state_dict()
        transferred = []
        for name, param in pretrained_state.items():
            if name.startswith(TRANSFERABLE_PREFIXES) and model_state[name].shape == param.shape:
                model_state[name] = param
                transferred.append(name)
        model.load_state_dict(model_state)
        print(f"[concept_bridge] transferred {len(transferred)} backbone tensors from XES3G5M checkpoint "
              f"(val AUC {ckpt.get('best_val_auc', '?')})")
    else:
        print("[concept_bridge] no XES3G5M checkpoint found — using an untrained backbone. "
              "Run train_sakt.py first for a research-grade result.")
        model = SAKT(num_concepts=NUM_DSA_CONCEPTS, seq_len=100, embed_dim=64, num_heads=4, dropout=0.2)

    concept_init = _content_grounded_concept_init(model.embed_dim)
    if concept_init is not None:
        model.concept_embed.weight.data.copy_(concept_init)
        # interaction embedding = concept shown alongside a response; seed both the
        # "answered correctly" and "answered incorrectly" halves from the same
        # concept-content signal — correctness-specific structure is then learned
        # online from real interactions (see ADAPTIVE_PARAMS).
        n = NUM_DSA_CONCEPTS + 1
        model.interaction_embed.weight.data[:n].copy_(concept_init)
        model.interaction_embed.weight.data[n:2 * n].copy_(concept_init)
        print("[concept_bridge] seeded concept embeddings from retrieval-corpus sentence embeddings")

    return model


def save_production_model(model: SAKT):
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    torch.save({
        "model_state_dict": model.state_dict(),
        "config": {
            "num_concepts": model.num_concepts,
            "seq_len": model.seq_len,
            "embed_dim": model.embed_dim,
            "num_heads": model.attention.num_heads,
            "dropout": model.dropout.p,
        },
    }, PRODUCTION_PATH)


def load_or_build_production_model() -> SAKT:
    if os.path.exists(PRODUCTION_PATH):
        ckpt = torch.load(PRODUCTION_PATH, map_location="cpu", weights_only=False)
        model = SAKT(**ckpt["config"])
        model.load_state_dict(ckpt["model_state_dict"])
        return model

    model = build_production_model()
    save_production_model(model)
    return model


def adaptive_parameters(model: SAKT):
    """Parameters eligible for online fine-tuning (see predict.py)."""
    for name, param in model.named_parameters():
        if name.startswith(ADAPTIVE_PARAMS):
            yield param
