"""
Retriever v3 — Structure-Aware, Tier-Aware, Mastery-Aware
Fixes all audit flaws + improved LLM resilience + expansion cap + graceful tier fallback.
"""

import os
import re
import sys
import json
import math
import time
import faiss
import numpy as np
import pickle
import string
from collections import defaultdict
from typing import List, Dict, Tuple, Set
from sentence_transformers import SentenceTransformer, CrossEncoder
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import Topic Map
from topic_map import normalize_topic, get_related_topics, get_related_canonicals, TOPIC_ALIASES

# -----------------------------
# CONFIG
# -----------------------------
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
CROSS_ENCODER_MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"

_HERE = os.path.dirname(os.path.abspath(__file__))  # .../retrieval/

sys.path.insert(0, os.path.join(_HERE, ".."))  # so `from llm.client import LLMClient` resolves standalone too
from llm.client import LLMClient  # noqa: E402 — see llm/LLM_CLIENT.md (GitHub Models retired 2026-07-30)

FAISS_INDEX_PATH = os.path.join(_HERE, "..", "chunking", "faiss_index.bin")
METADATA_STORE_PATH = os.path.join(_HERE, "..", "chunking", "metadata_store.json")
BM25_INDEX_PATH = os.path.join(_HERE, "bm25_index.pkl")
TOKENIZED_CORPUS_PATH = os.path.join(_HERE, "tokenized_corpus.pkl")

TOP_K_DENSE = 50
TOP_K_BM25 = 50
RRF_K = 60
FINAL_K = 8
MAX_EXPANSION_FACTOR = 1.5  # Cap hierarchical expansion at 1.5x FINAL_K

# -----------------------------
# DSA SYNONYM TABLE (for rule-based fallback)
# -----------------------------
DSA_SYNONYMS = {
    "dijkstra": ["shortest path", "greedy shortest path", "single source shortest path", "SSSP"],
    "bfs": ["breadth first search", "level order traversal", "BFS graph traversal"],
    "dfs": ["depth first search", "DFS backtracking", "DFS graph traversal"],
    "array": ["contiguous memory", "indexed collection", "linear data structure"],
    "linked list": ["node pointer chain", "dynamic data structure", "singly linked doubly linked"],
    "hash table": ["hash map", "dictionary", "key value store", "hashing collision"],
    "binary search tree": ["BST", "ordered binary tree", "search tree"],
    "heap": ["priority queue", "min heap max heap", "binary heap"],
    "dynamic programming": ["DP", "optimal substructure", "overlapping subproblems", "memoization"],
    "greedy": ["greedy algorithm", "greedy choice property", "locally optimal"],
    "sorting": ["sort algorithm", "comparison sort", "merge sort quicksort"],
    "graph": ["vertices edges", "adjacency list", "adjacency matrix", "directed undirected"],
    "tree": ["rooted tree", "binary tree", "tree traversal", "parent child nodes"],
    "stack": ["LIFO", "last in first out", "push pop"],
    "queue": ["FIFO", "first in first out", "enqueue dequeue"],
    "red black tree": ["balanced BST", "self-balancing tree", "RBT"],
    "avl tree": ["balanced BST", "height-balanced tree", "AVL rotation"],
    "bellman ford": ["negative weight edges", "shortest path negative", "relaxation"],
    "floyd warshall": ["all pairs shortest path", "APSP", "transitive closure"],
    "kruskal": ["minimum spanning tree", "MST", "union find"],
    "prim": ["minimum spanning tree", "MST", "greedy MST"],
    "amortized": ["amortized analysis", "aggregate method", "accounting method", "potential method"],
}


class Retriever:
    def __init__(self):
        print("[System] Loading models and indices...")
        # 1. Load Embedder and Cross-Encoder
        self.embedder = SentenceTransformer(EMBEDDING_MODEL_NAME)
        self.cross_encoder = CrossEncoder(CROSS_ENCODER_MODEL_NAME)

        # 2. Load FAISS & Metadata
        self.faiss_index = faiss.read_index(FAISS_INDEX_PATH)
        with open(METADATA_STORE_PATH, "r", encoding="utf-8") as f:
            self.metadata_store = json.load(f)

        # 3. Load BM25
        with open(BM25_INDEX_PATH, "rb") as f:
            self.bm25 = pickle.load(f)

        # 4. Setup LLM client (provider-agnostic — see llm/LLM_CLIENT.md)
        self.llm_client = LLMClient()
        self.llm_available = self.llm_client.available

        # [FLAW B FIX] Build adjacency lookup index at init
        self._adjacency_index = defaultdict(list)
        # Also build topic -> chunk indices map for cross-tier expansion
        self._topic_index = defaultdict(lambda: {"T1": [], "T2": [], "T3": []})

        for idx, chunk in enumerate(self.metadata_store):
            md = chunk["metadata"]
            key = (md.get("file_name", ""), md.get("parent_section", ""))
            self._adjacency_index[key].append(idx)

            # Topic index for cross-tier expansion
            c_topic = md.get("canonical_topic") or normalize_topic(md.get("topic", ""))
            tier = md.get("tier", "T1")
            if c_topic and c_topic != "unknown":
                self._topic_index[c_topic][tier].append(idx)

        # Sort adjacency lists by chunk_index for efficient neighbor lookup
        for key in self._adjacency_index:
            self._adjacency_index[key].sort(
                key=lambda i: self.metadata_store[i]["metadata"].get("chunk_index", 0)
            )

        print(f"[System] Ready. {len(self.metadata_store)} chunks indexed.")

    def _llm_call(self, prompt: str) -> str:
        """Delegates to the provider-agnostic LLMClient (handles its own
        per-provider retry and cross-provider failover — see llm/LLM_CLIENT.md)."""
        if not self.llm_available:
            return ""
        return self.llm_client.call(prompt, temperature=0.3)

    # ==========================================================
    # STEP 1: QUERY EXPANSION (LLM + Rule-based fallback)
    # ==========================================================
    def _rule_based_expansion(self, query: str) -> List[str]:
        """
        [FLAW F FIX] Deterministic fallback that always runs.
        Extracts DSA terms from the query and generates synonym-based expansions.
        """
        query_lower = query.lower()
        expansions = []

        for term, synonyms in DSA_SYNONYMS.items():
            if term in query_lower:
                for syn in synonyms[:2]:  # Take top 2 synonyms per matched term
                    expansions.append(syn)

        # Also extract noun-phrase style sub-queries
        # Remove stop words and create a keyword query
        stop_words = {"what", "is", "a", "an", "the", "how", "why", "does", "do", "are",
                      "can", "could", "should", "would", "in", "on", "of", "for", "to",
                      "and", "or", "it", "its", "this", "that", "with", "from", "by", "at"}
        keywords = [w for w in query_lower.split() if w not in stop_words and len(w) > 2]
        if keywords:
            expansions.append(" ".join(keywords))

        return expansions[:4]  # Cap at 4 rule-based expansions

    def expand_query(self, query: str) -> List[str]:
        """Generate diverse sub-queries: original + rule-based + LLM"""
        # Always start with rule-based (deterministic, no API dependency)
        rule_expansions = self._rule_based_expansion(query)

        # Try LLM expansion
        llm_expansions = []
        if self.llm_available:
            prompt = f"""You are a retrieval assistant for a DSA tutor.
Expand the query into 4 concise search queries that would help find relevant textbook content.

Rules:
- Include the specific algorithm or data structure name
- Include conceptual terms (e.g., "greedy property", "optimal substructure")
- Include possible synonyms or related algorithms
- Keep each query short (3-8 words)
- Output ONLY the 4 queries, one per line. No numbering, no bullets, no extra text.

Query:
"{query}"
"""
            result = self._llm_call(prompt)
            if result:
                raw = [q.strip() for q in result.split("\n") if q.strip()]
                for q in raw:
                    cleaned = q.lstrip("-*123456789. ")
                    if cleaned:
                        llm_expansions.append(cleaned)

        # Merge: original + rule-based + LLM, deduplicated
        all_queries = [query]
        seen = {query.lower()}
        for q in rule_expansions + llm_expansions:
            if q.lower() not in seen:
                seen.add(q.lower())
                all_queries.append(q)

        return all_queries[:8]  # Cap total at 8

    # ==========================================================
    # STEP 2: HYBRID RETRIEVAL (BM25 + FAISS via RRF)
    # ==========================================================
    def _tokenize(self, text: str) -> List[str]:
        text = text.lower()
        text = text.translate(str.maketrans("", "", string.punctuation))
        return text.split()

    def hybrid_search(self, queries: List[str]) -> List[Tuple[int, float]]:
        """Returns list of (chunk_idx, rrf_score)"""
        dense_results = {}
        bm25_results = {}

        for q in queries:
            # -- Dense Search --
            q_embed = self.embedder.encode([q], convert_to_numpy=True)
            faiss.normalize_L2(q_embed)
            D, I = self.faiss_index.search(q_embed, TOP_K_DENSE)

            for rank, chunk_idx in enumerate(I[0]):
                if chunk_idx < 0:
                    continue
                dense_results[chunk_idx] = min(dense_results.get(chunk_idx, float('inf')), rank)

            # -- BM25 Search --
            tokenized_q = self._tokenize(q)
            bm25_scores = self.bm25.get_scores(tokenized_q)
            top_bm25_indices = sorted(
                range(len(bm25_scores)),
                key=lambda i: bm25_scores[i],
                reverse=True
            )[:TOP_K_BM25]

            for rank, chunk_idx in enumerate(top_bm25_indices):
                if bm25_scores[chunk_idx] <= 0:
                    continue
                bm25_results[chunk_idx] = min(bm25_results.get(chunk_idx, float('inf')), rank)

        # Reciprocal Rank Fusion (RRF)
        rrf_scores = {}
        all_indices = set(dense_results.keys()) | set(bm25_results.keys())

        for idx in all_indices:
            dense_rank = dense_results.get(idx, float('inf'))
            bm25_rank = bm25_results.get(idx, float('inf'))

            rrf_score = 0.0
            if dense_rank != float('inf'):
                rrf_score += 1.0 / (RRF_K + dense_rank + 1)
            if bm25_rank != float('inf'):
                rrf_score += 1.0 / (RRF_K + bm25_rank + 1)

            rrf_scores[idx] = rrf_score

        ranked_results = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
        return ranked_results[:60]

    # ==========================================================
    # STEP 3: TIER WEIGHTING
    # ==========================================================
    def compute_tier_weights(self, mastery: float) -> Dict[str, float]:
        """
        Continuous mathematical tier allocation.
        T3 (Intuition) peaks at m=0.0
        T2 (Concept) peaks at m=0.5
        T1 (Formal) peaks at m=1.0
        """
        m = max(0.0, min(1.0, float(mastery)))
        
        w_intuition = 1.0 - m
        w_formal = m
        w_concept = 1.0 - abs(2.0 * m - 1.0)
        
        total = w_intuition + w_formal + w_concept
        
        return {
            "T1": w_formal / total,
            "T2": w_concept / total,
            "T3": w_intuition / total
        }

    def allocate_k(self, K: int, weights: Dict[str, float]) -> Dict[str, int]:
        k3 = round(weights["T3"] * K)
        k2 = round(weights["T2"] * K)
        k1 = round(weights["T1"] * K)

        diff = K - (k1 + k2 + k3)
        k2 += diff

        return {"T1": k1, "T2": k2, "T3": k3}

    # ==========================================================
    # STEP 4: CROSS-ENCODER RE-RANKING
    # ==========================================================
    def rerank_cross_encoder(self, query: str, search_results: List[Tuple[int, float]]) -> List[Tuple[int, float]]:
        if not search_results:
            return []

        pairs = []
        for idx, _ in search_results:
            chunk_content = self.metadata_store[idx].get("clean_content", self.metadata_store[idx]["content"])
            pairs.append([query, chunk_content])

        cross_scores = self.cross_encoder.predict(pairs)

        reranked = []
        for (idx, _), cross_score in zip(search_results, cross_scores):
            if float(cross_score) > -4.0:
                reranked.append((idx, float(cross_score)))

        reranked.sort(key=lambda x: x[1], reverse=True)
        return reranked

    # ==========================================================
    # STEP 5: TOPIC COHERENCE GATE + TIER SELECTION
    # [FLAW C FIX] Only accept chunks whose topic is coherent
    # ==========================================================
    def _get_dominant_topics(self, reranked: List[Tuple[int, float]],
                              query: str = "", top_n=3) -> Set[str]:
        """
        Determine what topics this query is about, using two signals:
        1. The query text itself (matched against DSA_SYNONYMS and TOPIC_ALIASES)
        2. The top-N cross-encoder results
        """
        topics = set()

        # --- Signal 1: Query text analysis ---
        query_lower = query.lower()
        # Check DSA synonyms table
        for term in DSA_SYNONYMS:
            if term in query_lower:
                # Map DSA term to canonical topics
                for canonical, aliases in TOPIC_ALIASES.items():
                    for alias in aliases:
                        if term in alias.lower() or alias.lower() in term:
                            topics.add(canonical)
        # Check topic aliases directly
        for canonical, aliases in TOPIC_ALIASES.items():
            for alias in aliases:
                if alias.lower() in query_lower or query_lower in alias.lower():
                    topics.add(canonical)

        # --- Signal 2: Top-N cross-encoder results (only if query analysis found nothing) ---
        if not topics:
            for idx, score in reranked[:top_n]:
                md = self.metadata_store[idx]["metadata"]
                c_topic = md.get("canonical_topic") or normalize_topic(md.get("topic", ""))
                if c_topic and c_topic != "unknown":
                    topics.add(c_topic)

        return topics

    def select_top_k_per_tier(self, reranked_results: List[Tuple[int, float]],
                               k_alloc: Dict[str, int], query: str = "",
                               mastery: float = 0.5) -> List[int]:
        """Select top-K chunks per tier, enforcing topic coherence.
        
        Hard constraint: the dominant tier for the current mastery level
        MUST be filled to its allocation. If the hybrid search didn't
        return enough on-topic chunks for that tier, we proactively pull
        from the topic index. This ensures mastery-adaptive behavior
        is preserved as a research invariant.
        """
        if not reranked_results:
            return []

        dominant_topics = self._get_dominant_topics(reranked_results, query=query)

        # Also include related canonical topics for broader matching
        expanded_topics = set(dominant_topics)
        for dt in dominant_topics:
            for related in get_related_canonicals(dt):
                expanded_topics.add(related)

        buckets = {"T1": [], "T2": [], "T3": []}

        for idx, score in reranked_results:
            md = self.metadata_store[idx]["metadata"]
            tier = md.get("tier", "T1")
            c_topic = md.get("canonical_topic") or normalize_topic(md.get("topic", ""))

            # Accept if topic is coherent with dominant/related topics
            # OR if the cross-encoder score is very high (> 5.0)
            if c_topic in expanded_topics or score > 5.0:
                buckets[tier].append((idx, score))

        # --- TIER RESCUE: Fill underfilled dominant tier from topic index ---
        # Determine dominant tier (highest allocation = most important for this mastery)
        dominant_tier = max(k_alloc, key=k_alloc.get)
        dominant_needed = k_alloc[dominant_tier]

        if len(buckets[dominant_tier]) < dominant_needed:
            # Not enough chunks for the dominant tier — pull from topic index
            shortfall = dominant_needed - len(buckets[dominant_tier])
            already_in = {idx for idx, _ in buckets[dominant_tier]}
            # Also exclude indices already selected in other tiers
            for t in buckets:
                for idx, _ in buckets[t]:
                    already_in.add(idx)

            rescue_candidates = []
            for topic in expanded_topics:
                if topic in self._topic_index:
                    tier_chunks = self._topic_index[topic][dominant_tier]
                    for cidx in tier_chunks:
                        if cidx not in already_in:
                            rescue_candidates.append(cidx)
                            already_in.add(cidx)

            # Add rescued chunks with a neutral score (they bypass cross-encoder
            # but are topically guaranteed by the topic index)
            for cidx in rescue_candidates[:shortfall]:
                buckets[dominant_tier].append((cidx, 0.0))

        # --- Proportional redistribution for STILL empty tiers ---
        actual_alloc = dict(k_alloc)
        empty_tiers = [t for t in ["T1", "T2", "T3"] if not buckets[t]]
        filled_tiers = [t for t in ["T1", "T2", "T3"] if buckets[t]]

        if empty_tiers and filled_tiers:
            surplus = sum(actual_alloc[t] for t in empty_tiers)
            for t in empty_tiers:
                actual_alloc[t] = 0
            # Distribute surplus proportionally to filled tiers
            filled_total = sum(actual_alloc[t] for t in filled_tiers)
            if filled_total > 0:
                for t in filled_tiers:
                    extra = round(surplus * actual_alloc[t] / filled_total)
                    actual_alloc[t] += extra
            # Fix rounding to match FINAL_K
            diff = FINAL_K - sum(actual_alloc.values())
            if diff != 0 and filled_tiers:
                actual_alloc[filled_tiers[0]] += diff

        final_indices = []
        for tier in ["T3", "T2", "T1"]:
            selected = [idx for idx, _ in buckets[tier][:actual_alloc[tier]]]
            final_indices.extend(selected)

        # Backfill ONLY with topically coherent chunks (cross-encoder > 3.0)
        if len(final_indices) < FINAL_K:
            needed = FINAL_K - len(final_indices)
            final_set = set(final_indices)
            remaining = []
            for idx, score in reranked_results:
                if idx in final_set:
                    continue
                md = self.metadata_store[idx]["metadata"]
                c_topic = md.get("canonical_topic") or normalize_topic(md.get("topic", ""))
                if c_topic in expanded_topics and score > 3.0:
                    remaining.append(idx)

            final_indices.extend(remaining[:needed])

        return final_indices

    # ==========================================================
    # STEP 6: HIERARCHICAL EXPANSION
    # [FLAW A FIX] Actually does cross-tier expansion now
    # [FLAW B FIX] Uses pre-built adjacency index
    # ==========================================================
    def expand_hierarchically(self, indices: List[int]) -> List[int]:
        """Add adjacent chunks + cross-tier chunks for the same canonical topic.
        
        Capped at MAX_EXPANSION_FACTOR * FINAL_K to prevent dilution.
        Preserves order (original indices first).
        """
        max_total = int(FINAL_K * MAX_EXPANSION_FACTOR)
        expanded = []
        seen = set()

        # Add original indices first to preserve their high cross-encoder rank
        for idx in indices:
            if idx not in seen:
                expanded.append(idx)
                seen.add(idx)

        canonical_topics_found = set()
        tiers_present = set()

        for idx in indices:
            if len(expanded) >= max_total:
                break
            md = self.metadata_store[idx]["metadata"]
            tier = md.get("tier", "T1")
            tiers_present.add(tier)

            # --- Adjacent chunks using pre-built index ---
            file_name = md.get("file_name", "")
            parent_sec = md.get("parent_section", "")
            chunk_idx = md.get("chunk_index", -1)

            key = (file_name, parent_sec)
            if key in self._adjacency_index and chunk_idx >= 0:
                siblings = self._adjacency_index[key]
                for sib_idx in siblings:
                    if len(expanded) >= max_total:
                        break
                    sib_ci = self.metadata_store[sib_idx]["metadata"].get("chunk_index", -1)
                    if abs(sib_ci - chunk_idx) == 1:
                        if sib_idx not in seen:
                            expanded.append(sib_idx)
                            seen.add(sib_idx)

            # Collect canonical topics
            c_topic = md.get("canonical_topic") or normalize_topic(md.get("topic", ""))
            if c_topic and c_topic != "unknown":
                canonical_topics_found.add(c_topic)

        # --- Cross-tier expansion (only if under cap) ---
        all_tiers = {"T1", "T2", "T3"}
        missing_tiers = all_tiers - tiers_present

        for topic in canonical_topics_found:
            if len(expanded) >= max_total:
                break
            if topic not in self._topic_index:
                continue
            for missing_tier in missing_tiers:
                if len(expanded) >= max_total:
                    break
                tier_chunks = self._topic_index[topic][missing_tier]
                if tier_chunks:
                    best_candidate = tier_chunks[0]
                    if best_candidate not in seen:
                        expanded.append(best_candidate)
                        seen.add(best_candidate)
                        break

        return expanded

    # ==========================================================
    # STEP 7: COMPLEXITY DETECTION
    # ==========================================================
    def detect_complexity(self, query: str) -> str:
        # Quick heuristic check first — simple definitional queries
        simple_patterns = [
            r"^what is (a |an )?",
            r"^define ",
            r"^list ",
            r"^name ",
            r"^types of ",
        ]
        for pat in simple_patterns:
            if re.match(pat, query.lower()):
                return "SIMPLE"

        if not self.llm_available:
            # Fallback heuristic: complex if contains "why", "how does", "compare", "prove"
            q_lower = query.lower()
            if any(w in q_lower for w in ["why", "how does", "compare", "prove", "difference between"]):
                return "COMPLEX"
            return "SIMPLE"

        prompt = f"""Classify this DSA query as SIMPLE or COMPLEX.

SIMPLE: asks for a definition, a list, basic properties, or a single concept.
Examples of SIMPLE:
- "What is an array?"
- "Define binary search tree"
- "List applications of stack"
- "Time complexity of merge sort"

COMPLEX: requires multi-step reasoning, comparing algorithms, proving correctness, or explaining WHY something works/fails.
Examples of COMPLEX:
- "Why does Dijkstra fail on negative weights?"
- "Compare BFS and DFS for shortest path"
- "How does dynamic programming relate to DAG shortest paths?"
- "Prove that quicksort average case is O(n log n)"

Output ONLY the word SIMPLE or COMPLEX.

Query: "{query}"
"""
        resp = self._llm_call(prompt).upper()
        if resp and "COMPLEX" in resp:
            return "COMPLEX"
        return "SIMPLE"

    # ==========================================================
    # STEP 8: MULTI-HOP RETRIEVAL (for COMPLEX queries only)
    # ==========================================================
    def multi_hop_retrieve(self, original_query: str, current_chunks: List[int]) -> List[int]:
        if not self.llm_available:
            return []

        context_preview = ""
        for idx in current_chunks[:3]:
            clean = self.metadata_store[idx].get("clean_content", self.metadata_store[idx]["content"])
            context_preview += clean[:300] + "\n...\n"

        prompt = f"""Given query: "{original_query}"
And some partially retrieved content:
{context_preview}

What important DSA concepts are missing from these results? Return 2 concise follow-up search queries to find the missing reasoning or fundamentals.
Output ONLY the 2 queries, one per line. No numbering or bullets.
"""
        new_indices = []
        try:
            resp = self._llm_call(prompt)

            follow_up_queries = [q.strip().lstrip("-*123456789. ") for q in resp.split("\n") if q.strip()][:2]
            print(f"    [Multi-hop] Following up with: {follow_up_queries}")

            hybrid_res = self.hybrid_search(follow_up_queries)
            reranked = self.rerank_cross_encoder(original_query, hybrid_res)

            for idx, _ in reranked[:3]:
                if idx not in current_chunks:
                    new_indices.append(idx)
        except Exception as e:
            print(f"[Warning] Multi-hop failed: {e}")

        return new_indices

    # ==========================================================
    # STEP 9: DEDUPLICATION + CONTEXT ASSEMBLY
    # [FLAW E FIX] Deduplicate by (file_name, section)
    # [FLAW G FIX] Better token estimation
    # ==========================================================
    def _estimate_tokens(self, text: str) -> int:
        """[FLAW G FIX] Hybrid token estimate: max of word-based and char-based"""
        word_based = int(len(text.split()) / 0.75)
        char_based = len(text) // 4
        return max(word_based, char_based)

    def _deduplicate_by_section(self, indices: List[int]) -> List[int]:
        """[FLAW E FIX] Keep only the first (highest-priority) chunk per unique section."""
        seen_sections = set()
        deduped = []

        for idx in indices:
            md = self.metadata_store[idx]["metadata"]
            section_key = (md.get("file_name", ""), md.get("section", ""))

            if section_key not in seen_sections:
                seen_sections.add(section_key)
                deduped.append(idx)

        return deduped

    def assemble_context(self, final_indices: List[int], max_tokens=3000) -> str:
        # Order by tier: T3 -> T2 -> T1 (intuitive to formal)
        tier_order = {"T3": 1, "T2": 2, "T1": 3}

        sorted_indices = sorted(
            final_indices,
            key=lambda idx: tier_order.get(self.metadata_store[idx]["metadata"]["tier"], 2)
        )

        context_blocks = []
        total_tokens = 0

        for idx in sorted_indices:
            content = self.metadata_store[idx]["content"]
            toks = self._estimate_tokens(content)
            if total_tokens + toks > max_tokens:
                break
            context_blocks.append(content)
            total_tokens += toks

        return "\n\n" + ("=" * 50 + "\n\n").join(context_blocks)

    # ==========================================================
    # FINAL PIPELINE
    # ==========================================================
    def retrieve(self, query: str, mastery: float, debug=False, on_stage=None, fast=False) -> dict:
        """on_stage(message: str), if given, is called at each of the numbered
        steps below with a short human-readable description of what's
        actually happening — the same real steps `debug` prints, just also
        exposed as a callback so a caller (backend/main.py's SSE endpoint)
        can stream real pipeline progress to a client instead of a generic
        spinner. Never required, never changes retrieval behavior."""
        stage = on_stage if on_stage else (lambda _msg: None)

        if debug:
            print(f"\n[Retrieval] Query: '{query}' | Mastery: {mastery}")

        # 1. Expand Query (rule-based always runs, LLM when available)
        stage("Expanding your query into related search terms...")
        queries = [query] if fast else self.expand_query(query)
        if debug:
            print(f"  [1] Expanded queries ({len(queries)}): {queries}")

        # 2. Hybrid Retrieval
        stage(f"Searching CLRS, GeeksForGeeks, and MIT OCW ({len(queries)} query variants, dense + keyword search)...")
        search_results = self.hybrid_search(queries)
        if debug:
            print(f"  [2] Hybrid search returned {len(search_results)} candidates.")

        # 3. Cross-encoder Rerank
        stage(f"Reranking {len(search_results)} candidate passages by relevance...")
        reranked = self.rerank_cross_encoder(query, search_results)
        if debug and reranked:
            print(f"  [3] Re-ranked with cross-encoder. Top score: {reranked[0][1]:.4f}")

        # 4. Tier allocation + topic coherence gate
        weights = self.compute_tier_weights(mastery)
        k_alloc = self.allocate_k(FINAL_K, weights)
        stage(f"Allocating sources by your mastery level (T1:{k_alloc.get('T1',0)} T2:{k_alloc.get('T2',0)} T3:{k_alloc.get('T3',0)})...")
        final_indices = self.select_top_k_per_tier(reranked, k_alloc, query=query, mastery=mastery)
        if debug:
            print(f"  [4] Selected {len(final_indices)} chunks per tier config {k_alloc}")

        # 5. Hierarchical expansion (adjacent + cross-tier)
        expanded_indices = self.expand_hierarchically(final_indices)
        if debug:
            print(f"  [5] After hierarchical expansion: {len(expanded_indices)} chunks.")

        # 6. Complexity detection
        complexity = "SIMPLE" if fast else self.detect_complexity(query)
        if debug:
            print(f"  [6] Complexity detected: {complexity}")

        # 7. Multi-hop (only for COMPLEX)
        if complexity == "COMPLEX" and not fast:
            stage("Question looks multi-part — following up on missing reasoning steps...")
            hop_indices = self.multi_hop_retrieve(query, list(expanded_indices))
            expanded_indices = list(expanded_indices) + hop_indices

        # 8. Deduplicate + assemble
        unique_final = list(dict.fromkeys(expanded_indices))
        unique_final = self._deduplicate_by_section(unique_final)

        context_str = self.assemble_context(unique_final)

        results = [self.metadata_store[idx] for idx in unique_final]

        if debug:
            print(f"  [8] Final output: {len(results)} unique chunks after dedup.")

        # Confidence signal for the Pathfinder validation layer (backend/pathfinder.py):
        # mean cross-encoder score of the chunks actually selected pre-expansion,
        # squashed through a sigmoid since raw ms-marco cross-encoder logits aren't
        # on a [0, 1] scale. Chunks added later by hierarchical/multi-hop expansion
        # were never cross-encoder-scored, so they're intentionally excluded here.
        score_by_idx = dict(reranked)
        selected_scores = [score_by_idx[idx] for idx in final_indices if idx in score_by_idx]
        retrieval_confidence = (
            1 / (1 + math.exp(-(sum(selected_scores) / len(selected_scores))))
            if selected_scores else 0.0
        )

        return {
            "query": query,
            "mastery": mastery,
            "complexity": complexity,
            "context": context_str,
            "results": results,
            "retrieval_confidence": round(retrieval_confidence, 4),
        }


if __name__ == "__main__":
    retriever = Retriever()

    q = "Why is Dijkstra greedy and how is it optimal?"
    m = 0.3
    out = retriever.retrieve(q, m, debug=True)

    print("\n" + "=" * 50)
    print("FINAL RETRIEVED BLOCKS (Summary)")
    print("=" * 50)
    for c in out["results"][:10]:
        t = c["metadata"]["tier"]
        top = c["metadata"].get("topic")
        c_top = c["metadata"].get("canonical_topic")
        sec = c["metadata"].get("section", "")[:40]
        print(f"[{t}] {top} ({c_top}) > {sec}")