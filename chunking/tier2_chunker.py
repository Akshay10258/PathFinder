import re
import uuid
from typing import List, Dict

# -----------------------------
# CONFIG
# -----------------------------
CHUNK_SIZE = 500
MIN_CHUNK_SIZE = 120

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
            if ":" in line:
                k, v = line.split(":", 1)
                metadata[k.strip()] = v.strip()
    
    return metadata, content

# -----------------------------
# STEP 2 — EXTRACT SECTIONS
# -----------------------------

def extract_sections(content: str):
    """
    Extracts hierarchy:
    ## Section
        ### Subsection
    """
    sections = []
    
    # Split by ## first
    top_sections = re.split(r"\n## ", content)
    
    for sec in top_sections:
        if not sec.strip():
            continue
        
        lines = sec.strip().split("\n", 1)
        title = lines[0].strip()
        body = lines[1] if len(lines) > 1 else ""
        
        # Split subsections
        sub_sections = re.split(r"\n### ", body)
        
        if len(sub_sections) == 1:
            sections.append({
                "section": title,
                "subsection": None,
                "text": body.strip()
            })
        else:
            for sub in sub_sections:
                if not sub.strip():
                    continue
                
                sub_lines = sub.split("\n", 1)
                sub_title = sub_lines[0].strip()
                sub_body = sub_lines[1] if len(sub_lines) > 1 else ""
                
                sections.append({
                    "section": title,
                    "subsection": sub_title,
                    "text": sub_body.strip()
                })
    
    return sections

# -----------------------------
# STEP 3 — DETECT CODE / FORMULA
# -----------------------------

def detect_features(text: str):
    has_code = "```" in text
    has_formula = any(sym in text for sym in ["Θ", "O(", "$$", "="])
    return has_code, has_formula

# -----------------------------
# STEP 4 — CONTENT TYPE INFERENCE
# -----------------------------

def infer_content_type(section: str):
    section = section.lower()
    
    if "operation" in section:
        return "algorithm"
    elif "problem" in section:
        return "example"
    elif "application" in section:
        return "concept"
    elif "advantage" in section or "disadvantage" in section:
        return "concept"
    else:
        return "concept"

# -----------------------------
# STEP 5 — CHUNK BUILDER
# -----------------------------

def build_chunks(sections: List[Dict], metadata: Dict):
    chunks = []
    total_chunks = len(sections)
    for idx, sec in enumerate(sections):
        text = sec["text"]
        
        if estimate_tokens(text) < MIN_CHUNK_SIZE:
            continue
        
        # ✅ CLEAN SECTION
        section = re.sub(r"[#*`]", "", sec["section"]).strip()
        
        subsection = sec["subsection"]
        if subsection:
            subsection = re.sub(r"[#*`]", "", subsection).strip()
        
        has_code, has_formula = detect_features(text)
        
        content_type = infer_content_type(section)
        
        # ✅ FIX parent_section
        clean_section = re.sub(r"[#*`]", "", section)
        clean_section = re.sub(r"\s+", "_", clean_section.strip().lower())
        
        parent_section = f"{metadata.get('topic')}_{clean_section}"
        
        # Build context-rich chunk
        final_text = f"""
Topic: {metadata.get('topic')}
Subtopic: {metadata.get('subtopic')}
Tier: {metadata.get('tier')}
Source: {metadata.get('source')}
Section: {section}
Subsection: {subsection if subsection else ""}

{text}
""".strip()
        
        chunk = {
            "id": generate_id(),
            "content": final_text,
            "clean_content": text,
            "metadata": {
                "topic": metadata.get("topic"),
                "subtopic": metadata.get("subtopic"),
                "tier": "T2",
                "source": "GFG",
                
                "section": section,
                "subsection": subsection,
                "parent_section": parent_section,
                
                "content_type": content_type,
                "difficulty": metadata.get("difficulty", "medium"),
                
                "chunk_index": idx,
                "total_chunks_in_section": total_chunks,
                "has_code": has_code,
                "has_formula": has_formula
            }
        }
        
        chunks.append(chunk)
    
    return chunks

# -----------------------------
# MAIN PIPELINE
# -----------------------------

def chunk_tier2_markdown(md_text: str):
    metadata, content = parse_frontmatter(md_text)
    sections = extract_sections(content)
    chunks = build_chunks(sections, metadata)
    return chunks