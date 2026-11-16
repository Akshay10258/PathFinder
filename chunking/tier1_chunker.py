import re
import uuid
from typing import List, Dict

# -----------------------------
# CONFIG
# -----------------------------
CHUNK_SIZE = 400        # target tokens (~approx via words)
OVERLAP = 80
MIN_CHUNK_SIZE = 120

# -----------------------------
# UTILS
# -----------------------------

def generate_id():
    return str(uuid.uuid4())

def estimate_tokens(text: str) -> int:
    # rough token estimate (1 token ≈ 0.75 words)
    return int(len(text.split()) / 0.75)

# -----------------------------
# STEP 1 — PARSE YAML FRONTMATTER
# -----------------------------

def parse_frontmatter(md_text: str):
    frontmatter_pattern = r"^---\n(.*?)\n---\n"
    match = re.match(frontmatter_pattern, md_text, re.DOTALL)
    
    metadata = {}
    content = md_text
    
    if match:
        frontmatter = match.group(1)
        content = md_text[match.end():]
        
        for line in frontmatter.split("\n"):
            if ":" in line:
                key, value = line.split(":", 1)
                metadata[key.strip()] = value.strip()
    
    return metadata, content

# -----------------------------
# STEP 2 — SPLIT BY HEADINGS
# -----------------------------

def split_by_headings(content: str):
    sections = []
    
    pattern = r"(##+ .*?)\n"
    matches = list(re.finditer(pattern, content))
    
    if not matches:
        return [{"title": "full_content", "text": content}]
    
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i+1].start() if i+1 < len(matches) else len(content)
        
        section_text = content[start:end].strip()
        title = match.group(1).strip()
        
        sections.append({
            "title": title,
            "text": section_text
        })
    
    return sections

# -----------------------------
# STEP 3 — PROTECT FORMULAS
# -----------------------------

def split_preserving_formulas(text: str):
    """
    Split text into blocks but preserve $$...$$ as atomic units
    """
    blocks = []
    
    parts = re.split(r"(\$\$.*?\$\$)", text, flags=re.DOTALL)
    
    for part in parts:
        if part.strip():
            blocks.append(part.strip())
    
    return blocks

# -----------------------------
# STEP 4 — RECURSIVE CHUNKING
# -----------------------------

def chunk_text_blocks(blocks: List[str], depth=0):
    MAX_DEPTH = 3   # prevent infinite recursion
    
    chunks = []
    current_chunk = []
    current_size = 0

    for block in blocks:
        block_size = estimate_tokens(block)

        # 🚨 SAFETY: stop deep recursion
        if depth > MAX_DEPTH:
            words = block.split()
            for i in range(0, len(words), 200):
                chunks.append(" ".join(words[i:i+200]))
            continue

        # 🚨 If block too large → try splitting
        if block_size > CHUNK_SIZE:
            if current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
                current_size = 0

            paragraphs = block.split("\n\n")

            # ❗ If paragraph split fails → fallback
            if len(paragraphs) == 1:
                words = block.split()
                for i in range(0, len(words), 200):
                    chunks.append(" ".join(words[i:i+200]))
            else:
                chunks.extend(chunk_text_blocks(paragraphs, depth + 1))

            continue

        # ✅ Normal accumulation
        if current_size + block_size <= CHUNK_SIZE:
            current_chunk.append(block)
            current_size += block_size
        else:
            chunks.append(" ".join(current_chunk))

            # overlap handling
            overlap_text = " ".join(current_chunk)[-OVERLAP:]
            current_chunk = [overlap_text, block]
            current_size = estimate_tokens(overlap_text) + block_size

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks

# -----------------------------
# STEP 5 — BUILD FINAL CHUNKS
# -----------------------------

def build_chunks(sections, metadata):
    all_chunks = []
    
    for section in sections:
        # -----------------------------
        # CLEAN SECTION TITLE
        # -----------------------------
        raw_title = section["title"]
        
        title = re.sub(r"[#*`]", "", raw_title)
        title = re.sub(r"\s+", " ", title).strip()
        
        # -----------------------------
        # CLEAN PARENT SECTION
        # -----------------------------
        clean_section = re.sub(r"[#*`]", "", raw_title)
        clean_section = re.sub(r"\s+", "_", clean_section.strip().lower())
        
        parent_section = f"{metadata.get('topic', '')}_{clean_section}"
        
        text = section["text"]
        
        # -----------------------------
        # SPLIT INTO BLOCKS
        # -----------------------------
        blocks = split_preserving_formulas(text)
        raw_chunks = chunk_text_blocks(blocks)
        
        total_chunks = len(raw_chunks)
        
        for idx, chunk in enumerate(raw_chunks):
            if estimate_tokens(chunk) < MIN_CHUNK_SIZE:
                continue
            
            # -----------------------------
            # DETECT FEATURES
            # -----------------------------
            has_formula = any(sym in chunk for sym in ["Θ", "O(", "$$", "="])
            has_code = "```" in chunk
            
            # -----------------------------
            # CONTENT TYPE HEURISTIC
            # -----------------------------
            section_lower = title.lower()
            
            if "example" in section_lower:
                content_type = "example"
            elif "algorithm" in section_lower or "procedure" in section_lower:
                content_type = "algorithm"
            elif "proof" in section_lower or "analysis" in section_lower:
                content_type = "proof"
            else:
                content_type = "concept"
            
            # -----------------------------
            # FINAL TEXT (FOR EMBEDDING)
            # -----------------------------
            final_text = f"""
Topic: {metadata.get('topic', '')}
Subtopic: {metadata.get('subtopic', '')}
Tier: {metadata.get('tier', 'T1')}
Source: {metadata.get('source', 'CLRS')}
Section: {title}

{chunk}
""".strip()
            
            # -----------------------------
            # CHUNK OBJECT
            # -----------------------------
            chunk_obj = {
                "id": generate_id(),
                "content": final_text,
                "clean_content": chunk,
                "metadata": {
                    "topic": metadata.get("topic"),
                    "subtopic": metadata.get("subtopic"),
                    
                    "tier": metadata.get("tier", "T1"),
                    "source": metadata.get("source", "CLRS"),
                    
                    "section": title,
                    "parent_section": parent_section,
                    
                    "content_type": content_type,
                    
                    "chunk_index": idx,
                    "total_chunks_in_section": total_chunks,
                    
                    "has_formula": has_formula,
                    "has_code": has_code
                }
            }
            
            all_chunks.append(chunk_obj)
    
    return all_chunks

# -----------------------------
# MAIN PIPELINE
# -----------------------------

def chunk_clrs_markdown(md_text: str):
    metadata, content = parse_frontmatter(md_text)
    sections = split_by_headings(content)
    chunks = build_chunks(sections, metadata)
    return chunks