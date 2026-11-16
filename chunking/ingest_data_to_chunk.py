import os
import sys
import json
from typing import List, Dict

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "retrieval"))

from tier1_chunker import chunk_clrs_markdown
from tier2_chunker import chunk_tier2_markdown
from tier3_chunker import chunk_tier3_markdown

# Import topic normalization
try:
    from topic_map import normalize_topic
except ImportError:
    def normalize_topic(t):
        return t

# -----------------------------
# STEP 1 — DETECT TIER
# -----------------------------

def detect_tier_from_metadata(md_text: str):
    """
    Detect tier from frontmatter
    """
    if "tier: 1" in md_text or "tier: 1" in md_text.lower():
        return "T1"
    elif "tier: 2" in md_text:
        return "T2"
    elif "tier: 3" in md_text:
        return "T3"
    
    return None


# -----------------------------
# STEP 2 — APPLY CHUNKING
# -----------------------------

def process_file(file_path: str):
    with open(file_path, "r", encoding="utf-8") as f:
        md_text = f.read()
    
    tier = detect_tier_from_metadata(md_text)
    
    if not tier:
        print(f"[WARN] Skipping (no tier): {file_path}")
        return []
    
    if tier == "T1":
        chunks = chunk_clrs_markdown(md_text)
    elif tier == "T2":
        chunks = chunk_tier2_markdown(md_text)
    elif tier == "T3":
        chunks = chunk_tier3_markdown(md_text)
    
    # Add global file reference + normalize
    for chunk in chunks:
        chunk["metadata"]["file_name"] = os.path.basename(file_path)
        chunk["metadata"]["tier"] = tier
        
        # Add normalized canonical topic
        raw_topic = chunk["metadata"].get("topic", "")
        chunk["metadata"]["canonical_topic"] = normalize_topic(raw_topic)
        
        # Ensure clean_content exists (fallback)
        if "clean_content" not in chunk:
            # Strip metadata prefix lines from content
            lines = chunk["content"].split("\n")
            content_start = 0
            for i, line in enumerate(lines):
                if line.strip() == "" and i > 0:
                    content_start = i + 1
                    break
            chunk["clean_content"] = "\n".join(lines[content_start:]).strip()
    
    return chunks


# -----------------------------
# STEP 3 — PROCESS DIRECTORY
# -----------------------------

def ingest_directory(data_dir: str):
    all_chunks = []
    
    for root, _, files in os.walk(data_dir):
        for file in files:
            if file.endswith(".md"):
                file_path = os.path.join(root, file)
                print(f"Processing: {file_path}")
                
                chunks = process_file(file_path)
                all_chunks.extend(chunks)
    
    return all_chunks


# -----------------------------
# STEP 4 — SAVE OUTPUT
# -----------------------------

def save_chunks(chunks: List[Dict], output_file="all_chunks.json"):
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2)
    
    print(f"[OK] Saved {len(chunks)} chunks to {output_file}")

def save_chunks_by_tier(chunks):
    t1, t2, t3 = [], [], []
    
    for c in chunks:
        tier = c["metadata"].get("tier")
        
        if tier == "T1":
            t1.append(c)
        elif tier == "T2":
            t2.append(c)
        elif tier == "T3":
            t3.append(c)
    
    with open("t1_chunks.json", "w", encoding="utf-8") as f:
        json.dump(t1, f, indent=2)
    
    with open("t2_chunks.json", "w", encoding="utf-8") as f:
        json.dump(t2, f, indent=2)
    
    with open("t3_chunks.json", "w", encoding="utf-8") as f:
        json.dump(t3, f, indent=2)
    
    print(f"[OK] Saved tier-wise: T1={len(t1)}, T2={len(t2)}, T3={len(t3)}")


# -----------------------------
# MAIN
# -----------------------------

if __name__ == "__main__":
    DATA_DIR = os.path.join("..", "data")  
    
    all_chunks = ingest_directory(DATA_DIR)
    
    print(f"\nTotal chunks created: {len(all_chunks)}")
    
    # Verify clean_content exists
    has_clean = sum(1 for c in all_chunks if "clean_content" in c)
    print(f"Chunks with clean_content: {has_clean}")
    
    # Verify canonical_topic
    has_canonical = sum(1 for c in all_chunks if c["metadata"].get("canonical_topic"))
    print(f"Chunks with canonical_topic: {has_canonical}")
    
    # Show sample
    if all_chunks:
        sample = all_chunks[0]
        print(f"\nSample chunk:")
        print(f"  content (first 100): {sample['content'][:100]}")
        print(f"  clean_content (first 100): {sample.get('clean_content', 'MISSING')[:100]}")
        print(f"  canonical_topic: {sample['metadata'].get('canonical_topic')}")
    
    save_chunks(all_chunks)
    save_chunks_by_tier(all_chunks)