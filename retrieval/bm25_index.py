"""
BM25 Index Builder — For keyword-exact lexical retrieval

Uses rank_bm25 to build an index on the tokenized chunks.
We save the pre-tokenized corpus and the BM25 object using pickle.
"""

import json
import os
import pickle
import string
from rank_bm25 import BM25Okapi

# -----------------------------
# CONFIG
# -----------------------------
CHUNK_FILE = "../chunking/all_chunks.json"
BM25_INDEX_FILE = "bm25_index.pkl"
TOKENIZED_CORPUS_FILE = "tokenized_corpus.pkl"


# -----------------------------
# SIMPLE TOKENIZER
# -----------------------------
def tokenize(text: str) -> list:
    """
    Lowercase, remove punctuation, and split by whitespace.
    """
    text = text.lower()
    text = text.translate(str.maketrans("", "", string.punctuation))
    return text.split()


# -----------------------------
# BUILD INDEX
# -----------------------------
def build_bm25():
    print("=" * 50)
    print("BM25 INDEX BUILDER")
    print("=" * 50)
    
    print("\n1. Loading chunks...")
    with open(CHUNK_FILE, "r", encoding="utf-8") as f:
        chunks = json.load(f)
    print(f"   Loaded {len(chunks)} chunks")
    
    print("\n2. Tokenizing corpus...")
    tokenized_corpus = []
    for c in chunks:
        # Use clean content if available, fallback to content
        text = c.get("clean_content", c["content"])
        tokenized_corpus.append(tokenize(text))
        
    print(f"   Tokenized {len(tokenized_corpus)} documents")
    
    print("\n3. Building BM25 index...")
    bm25 = BM25Okapi(tokenized_corpus)
    
    print("\n4. Saving index to disk...")
    with open(BM25_INDEX_FILE, "wb") as f:
        pickle.dump(bm25, f)
    with open(TOKENIZED_CORPUS_FILE, "wb") as f:
        pickle.dump(tokenized_corpus, f)
        
    print(f"[OK] Saved to {BM25_INDEX_FILE}")
    
    # Sanity check
    query = "Dijkstra greedy shortest path"
    tokenized_query = tokenize(query)
    scores = bm25.get_scores(tokenized_query)
    top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:3]
    
    print("\nSanity Check Query:", query)
    for rank, idx in enumerate(top_indices):
        c = chunks[idx]
        print(f"  #{rank+1} score={scores[idx]:.4f} | {c['metadata']['tier']} | topic={c['metadata'].get('topic')} | section={c['metadata'].get('section', '')[:50]}")
        
    print("\n[DONE] BM25 indexing complete!")

if __name__ == "__main__":
    build_bm25()
