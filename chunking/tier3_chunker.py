import re
import uuid
from typing import List, Dict

# -----------------------------
# CONFIG
# -----------------------------
WINDOW_SIZE = 3        # number of paragraphs per chunk
OVERLAP = 1            # paragraph overlap
MIN_CHUNK_TOKENS = 120

# -----------------------------
# UTILS
# -----------------------------

def generate_id():
    return str(uuid.uuid4())

def estimate_tokens(text: str) -> int:
    return int(len(text.split()) / 0.75)

# -----------------------------
# STEP 1 — PARSE FRONTMATTER
# -----------------------------

def parse_frontmatter(md_text: str):
    pattern = r"^---\n(.*?)\n---\n"
    match = re.match(pattern, md_text, re.DOTALL)
    
    metadata = {}
    content = md_text
    
    if match:
        frontmatter = match.group(1)
        content = md_text[match.end():]
        
        for line in frontmatter.split("\n"):
            if ":" in line and not line.strip().startswith("-"):
                k, v = line.split(":", 1)
                metadata[k.strip()] = v.strip()
    
    return metadata, content

# -----------------------------
# STEP 2 — SPLIT BY SECTIONS
# -----------------------------

def split_into_sections(content: str):
    """
    Split T3 content by ## headings to get real section names.
    Falls back to single section if no headings found.
    """
    sections = []
    
    # Match ## and ### headings
    pattern = r"^(#{1,3})\s+(.+)$"
    lines = content.split("\n")
    
    current_section = None
    current_lines = []
    
    for line in lines:
        heading_match = re.match(pattern, line.strip())
        if heading_match:
            # Save previous section
            if current_lines:
                text = "\n".join(current_lines).strip()
                if text:
                    sections.append({
                        "title": current_section or "introduction",
                        "text": text
                    })
            
            # Start new section
            current_section = heading_match.group(2).strip()
            current_section = re.sub(r"[*`]", "", current_section).strip()
            current_lines = []
        else:
            current_lines.append(line)
    
    # Save last section
    if current_lines:
        text = "\n".join(current_lines).strip()
        if text:
            sections.append({
                "title": current_section or "introduction",
                "text": text
            })
    
    # If no sections found, treat entire content as one section
    if not sections:
        sections.append({
            "title": "concept",
            "text": content.strip()
        })
    
    return sections

# -----------------------------
# STEP 3 — EXTRACT PARAGRAPHS
# -----------------------------

def extract_paragraphs(content: str):
    """
    Split into meaningful paragraphs while preserving lists/code
    """
    raw_paragraphs = content.split("\n\n")
    
    paragraphs = []
    buffer = []
    
    for para in raw_paragraphs:
        para = para.strip()
        if not para:
            continue
        
        # Skip horizontal rules
        if para.strip() == "---":
            continue
        
        # Keep code blocks intact
        if "```" in para:
            paragraphs.append(para)
            continue
        
        # Merge very small fragments
        if len(para.split()) < 20:
            buffer.append(para)
        else:
            if buffer:
                paragraphs.append(" ".join(buffer))
                buffer = []
            paragraphs.append(para)
    
    if buffer:
        paragraphs.append(" ".join(buffer))
    
    return paragraphs

# -----------------------------
# STEP 4 — WINDOW CHUNKING
# -----------------------------

def create_windows(paragraphs: List[str]):
    chunks = []
    i = 0
    
    while i < len(paragraphs):
        window = paragraphs[i:i + WINDOW_SIZE]
        chunk_text = "\n\n".join(window)
        
        if estimate_tokens(chunk_text) >= MIN_CHUNK_TOKENS:
            chunks.append({
                "text": chunk_text,
                "start": i,
                "end": i + WINDOW_SIZE
            })
        
        i += (WINDOW_SIZE - OVERLAP)
    
    return chunks

# -----------------------------
# STEP 5 — DETECT FEATURES
# -----------------------------

def detect_features(text: str):
    has_code = "```" in text
    has_formula = any(sym in text for sym in ["Θ", "O(", "$$", "\\(", "\\["])
    return has_code, has_formula

# -----------------------------
# STEP 6 — BUILD FINAL CHUNKS
# -----------------------------

def build_chunks(sections: List[Dict], metadata: Dict):
    chunks = []
    global_idx = 0

    for section in sections:
        section_title = section["title"]
        section_text = section["text"]
        
        # Extract paragraphs from this section
        paragraphs = extract_paragraphs(section_text)
        
        if not paragraphs:
            continue
        
        # Create windows within this section
        windows = create_windows(paragraphs)
        
        # If no windows (section too small), treat entire section as one chunk
        if not windows and estimate_tokens(section_text) >= MIN_CHUNK_TOKENS:
            windows = [{"text": section_text, "start": 0, "end": 1}]
        
        for win in windows:
            text = win["text"]
            has_code, has_formula = detect_features(text)
            
            parent_section = metadata.get("concept_id") or metadata.get("topic") or "general"
            
            # Clean content for embedding (no metadata prefix)
            clean_content = text
            
            # Display content with metadata context
            display_content = f"""Topic: {metadata.get('topic')}
Subtopic: {metadata.get('subtopic')}
Tier: {metadata.get('tier')}
Source: {metadata.get('source')}
Concept: {metadata.get('concept_id')}
Section: {section_title}
Style: narrative

{text}""".strip()
            
            chunk = {
                "id": generate_id(),
                "content": display_content,
                "clean_content": clean_content,
                "metadata": {
                    "topic": metadata.get("topic"),
                    "subtopic": metadata.get("subtopic"),
                    "concept_id": metadata.get("concept_id"),
                    
                    "tier": "T3",
                    "source": "MIT_OCW",
                    
                    "section": section_title,
                    "parent_section": parent_section,
                    
                    "content_type": metadata.get("content_type", "concept"),
                    "difficulty": metadata.get("difficulty", "medium"),
                    
                    "chunk_index": global_idx,
                    "total_chunks_in_section": 0,  # will be updated
                    "window_start": win["start"],
                    "window_end": win["end"],
                    
                    "chunk_type": "narrative",
                    "has_code": has_code,
                    "has_formula": has_formula
                }
            }
            
            chunks.append(chunk)
            global_idx += 1
    
    # Update total_chunks count
    for c in chunks:
        c["metadata"]["total_chunks_in_section"] = len(chunks)
    
    return chunks

# -----------------------------
# MAIN PIPELINE
# -----------------------------

def chunk_tier3_markdown(md_text: str):
    metadata, content = parse_frontmatter(md_text)
    sections = split_into_sections(content)
    chunks = build_chunks(sections, metadata)
    return chunks