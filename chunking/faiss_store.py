"""
FAISS Index Builder — Cosine Similarity with Clean Content Embeddings

Changes from original:
1. Uses IndexFlatIP (Inner Product) after L2-normalizing → cosine similarity
2. Embeds only clean_content (no metadata prefix pollution)
3. Backs up old index before overwriting
"""

import json
import os
import shutil
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


# -----------------------------
# CONFIG
# -----------------------------
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
CHUNK_FILE = "all_chunks.json"

FAISS_INDEX_FILE = "faiss_index.bin"
METADATA_FILE = "metadata_store.json"


# -----------------------------
# LOAD DATA
# -----------------------------

def load_chunks(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


# -----------------------------
# BUILD EMBEDDINGS (CLEAN CONTENT)
# -----------------------------

def generate_embeddings(chunks, model):
    """Embed only clean_content to avoid metadata pollution"""
    texts = []
    for chunk in chunks:
        # Use clean_content for embedding, fallback to content
        text = chunk.get("clean_content", chunk["content"])
        texts.append(text)
    
    print(f"  Embedding {len(texts)} chunks...")
    embeddings = model.encode(
        texts,
        show_progress_bar=True,
        convert_to_numpy=True,
        batch_size=64
    )
    
    return embeddings


# -----------------------------
# BUILD FAISS INDEX (COSINE)
# -----------------------------

def build_faiss_index(embeddings):
    """
    Build cosine similarity index:
    1. L2-normalize all vectors
    2. Use IndexFlatIP (inner product on normalized vectors = cosine similarity)
    """
    dim = embeddings.shape[1]
    
    # Normalize for cosine similarity
    faiss.normalize_L2(embeddings)
    
    # Inner product on normalized vectors = cosine similarity
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    
    print(f"  Index built: {index.ntotal} vectors, dim={dim}, metric=cosine(IP)")
    
    return index


# -----------------------------
# SAVE WITH BACKUP
# -----------------------------

def backup_old_files():
    """Backup existing index and metadata before overwriting"""
    for f in [FAISS_INDEX_FILE, METADATA_FILE]:
        if os.path.exists(f):
            backup = f + ".bak"
            shutil.copy2(f, backup)
            print(f"  [BACKUP] {f} -> {backup}")


def save_faiss(index, file_path):
    faiss.write_index(index, file_path)
    print(f"[OK] FAISS index saved: {file_path}")


def save_metadata(chunks, file_path):
    metadata_store = []
    
    for idx, chunk in enumerate(chunks):
        entry = {
            "id": chunk["id"],
            "content": chunk["content"],
            "clean_content": chunk.get("clean_content", ""),
            "metadata": chunk["metadata"]
        }
        metadata_store.append(entry)
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(metadata_store, f, indent=2)
    
    print(f"[OK] Metadata saved: {file_path} ({len(metadata_store)} entries)")


# -----------------------------
# MAIN PIPELINE
# -----------------------------

def main():
    print("=" * 50)
    print("FAISS INDEX BUILDER (Cosine Similarity)")
    print("=" * 50)
    
    print("\n1. Loading chunks...")
    chunks = load_chunks(CHUNK_FILE)
    print(f"   Loaded {len(chunks)} chunks")
    
    # Verify clean_content
    has_clean = sum(1 for c in chunks if c.get("clean_content"))
    print(f"   Chunks with clean_content: {has_clean}/{len(chunks)}")
    
    print("\n2. Backing up old index...")
    backup_old_files()
    
    print("\n3. Loading embedding model...")
    model = SentenceTransformer(EMBEDDING_MODEL)
    
    print("\n4. Generating embeddings (clean content only)...")
    embeddings = generate_embeddings(chunks, model)
    
    print("\n5. Building FAISS index...")
    index = build_faiss_index(embeddings)
    
    print("\n6. Saving...")
    save_faiss(index, FAISS_INDEX_FILE)
    save_metadata(chunks, METADATA_FILE)
    
    # Verification
    print("\n" + "=" * 50)
    print("VERIFICATION")
    print("=" * 50)
    print(f"Index vectors: {index.ntotal}")
    print(f"Metadata entries: {len(chunks)}")
    print(f"Match: {'YES' if index.ntotal == len(chunks) else 'NO'}")
    
    # Quick sanity check: search for "Dijkstra"
    test_query = "Dijkstra's algorithm greedy shortest path"
    q_embed = model.encode([test_query], convert_to_numpy=True)
    faiss.normalize_L2(q_embed)
    D, I = index.search(q_embed, 5)
    
    print(f"\nSanity check query: '{test_query}'")
    for rank, (dist, idx) in enumerate(zip(D[0], I[0])):
        if idx >= 0:
            c = chunks[idx]
            print(f"  #{rank+1} score={dist:.4f} | {c['metadata']['tier']} | topic={c['metadata'].get('topic')} | section={c['metadata'].get('section','')[:50]}")
    
    print("\n[DONE] FAISS indexing complete!")


if __name__ == "__main__":
    main()