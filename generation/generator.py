"""
DSA RAG Answer Generator — Mastery-Adaptive, Grounded, Structured

Generation Enhancement Techniques:
1. Mastery-Adaptive Personas — teaching style shifts with student level
2. Tier-Labeled Context — LLM sees which source (textbook/tutorial/lecture) each chunk is from
3. Grounded Generation — strict instruction to ONLY use retrieved context
4. Chain-of-Thought — for COMPLEX queries, explicit reasoning chain
5. Structured Output — explanation, key concepts, code (if relevant), follow-ups
6. Source Attribution — cites which tier(s) informed each part of the answer
7. Self-Verification — final pass checks answer against context for hallucination
8. Adaptive Depth — vocabulary and abstraction level match mastery
"""

import os
import re
import sys
import json
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from llm.client import LLMClient  # noqa: E402 — see llm/LLM_CLIENT.md (GitHub Models retired 2026-07-30)

# ---------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------

# Tier display labels
TIER_LABELS = {
    "T1": "Formal Textbook (CLRS)",
    "T2": "Practical Tutorial (GeeksForGeeks)",
    "T3": "Intuitive Lecture (MIT OCW)",
}

# ---------------------------------------------------------------
# MASTERY-ADAPTIVE TEACHING PERSONAS (Continuous Blending)
# ---------------------------------------------------------------

def get_persona(mastery: float) -> str:
    """
    Select teaching persona using a continuous mathematical probability function.
    This exactly mirrors the tier allocation logic in the retrieval engine.
    """
    # Calculate continuous weights based on mastery
    p_T1 = max(0.0, 1.0 - 2.5 * (1.0 - mastery))  # Expert (T1)
    p_T3 = max(0.0, 1.0 - 2.5 * mastery)          # Beginner (T3)
    p_T2 = max(0.0, 1.0 - (p_T1 + p_T3))          # Intermediate (T2)
    
    # Normalize weights just in case
    total = p_T1 + p_T2 + p_T3
    if total > 0:
        p_T1, p_T2, p_T3 = p_T1/total, p_T2/total, p_T3/total
    else:
        p_T1, p_T2, p_T3 = 0.0, 1.0, 0.0

    persona = f"""You are an AI teaching assistant dynamically adopting a pedagogical persona based on these exact calculated weights:
- Patient Tutor (Beginner) Weight: {p_T3:.2f}
- Knowledgeable Mentor (Intermediate) Weight: {p_T2:.2f}
- Expert Peer (Advanced) Weight: {p_T1:.2f}

Based on these weights, you MUST strictly blend your teaching style:
- If Patient Tutor weight is high (>0.5): Use simple, everyday analogies, avoid jargon (or immediately define it), take small numbered steps, and encourage the student.
- If Knowledgeable Mentor weight is high (>0.5): Focus on the "why" behind algorithms, discuss trade-offs, time/space complexity with Big-O, and practical edge cases.
- If Expert Peer weight is high (>0.5): Use precise mathematical notation (recurrences, asymptotic bounds) when the context provides them, formal correctness proofs, and discuss algorithmic paradigms (greedy choice, optimal substructure).

Synthesize your tone, vocabulary, and depth to perfectly match this continuous probabilistic blend."""
    return persona


def get_mastery_label(mastery: float) -> str:
    if mastery < 0.4:
        return "Beginner"
    elif mastery < 0.7:
        return "Intermediate"
    else:
        return "Advanced"


# ---------------------------------------------------------------
# SHARED LLM-JSON PARSER (reused by question_generator, answer_evaluator)
# ---------------------------------------------------------------

def parse_llm_json(text: str) -> Dict:
    """Robustly parse a JSON object out of an LLM response, tolerating markdown
    code fences and trailing prose around the actual JSON."""
    if not text:
        return {}
    clean = text.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
        clean = clean.rsplit("```", 1)[0]
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", clean, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {}


# ---------------------------------------------------------------
# CONTEXT FORMATTER — Tier-Labeled, Structured
# ---------------------------------------------------------------

def format_context_for_llm(results: List[Dict]) -> str:
    """
    Format retrieved chunks into a structured context block with tier labels.
    Groups by tier so the LLM can synthesize across pedagogical levels.
    """
    # Group chunks by tier
    tier_groups = {"T3": [], "T2": [], "T1": []}
    for chunk in results:
        tier = chunk["metadata"]["tier"]
        tier_groups[tier].append(chunk)

    context_parts = []

    # Order: T3 (intuitive) -> T2 (practical) -> T1 (formal)
    for tier in ["T3", "T2", "T1"]:
        chunks = tier_groups[tier]
        if not chunks:
            continue

        tier_label = TIER_LABELS.get(tier, tier)
        context_parts.append(f"\n{'='*60}")
        context_parts.append(f"SOURCE: {tier_label} [{tier}]")
        context_parts.append(f"{'='*60}")

        for i, chunk in enumerate(chunks, 1):
            md = chunk["metadata"]
            topic = md.get("canonical_topic", md.get("topic", "unknown"))
            section = md.get("section", "")

            content = chunk.get("clean_content", chunk.get("content", ""))

            context_parts.append(f"\n--- [{tier}] Chunk {i}: {topic} > {section} ---")
            context_parts.append(content)

    return "\n".join(context_parts)


# ---------------------------------------------------------------
# PROMPT BUILDER
# ---------------------------------------------------------------

def build_generation_prompt(
    query: str,
    mastery: float,
    complexity: str,
    formatted_context: str,
) -> str:
    """
    Build the full generation prompt with all enhancement techniques.
    """
    persona = get_persona(mastery)
    mastery_label = get_mastery_label(mastery)

    # Base system instruction
    system_block = f"""{persona}

CRITICAL GROUNDING RULES (MUST FOLLOW):
1. You may ONLY use information from the RETRIEVED CONTEXT below. Do NOT add facts, definitions, or terminology that are not explicitly present in the provided context chunks.
2. If the context doesn't contain enough information to fully answer the question, explicitly say "Based on the available material, I can explain..." and note what's missing. Do NOT fill gaps with your own knowledge.
3. Synthesize across sources — combine the intuitive explanation (MIT OCW), practical details (GFG), and formal treatment (CLRS) into one coherent answer.
4. Seamlessly integrate the retrieved knowledge. Do NOT use awkward academic citations like "[T1]" or "According to the CLRS textbook." Write naturally and confidently as an expert tutor.
5. Use markdown formatting: **bold** for key terms, `code` for code/variables, and proper headers.
6. Do NOT introduce new technical terms, operations, or concepts that do not appear in the context. If the context calls an operation "PUSH", use "PUSH" — do not invent or rename operations.

Student Level: {mastery_label} (mastery score: {mastery:.1f})
Query Complexity: {complexity}"""

    # Chain-of-thought instruction for complex queries
    cot_instruction = ""
    if complexity == "COMPLEX":
        cot_instruction = """

REASONING APPROACH: This is a complex query requiring multi-step reasoning.
Before writing your answer:
1. First identify the core concepts involved
2. Trace the logical chain: what depends on what?
3. Address the "why" or "how" at the heart of the question
4. Connect concepts from different sources to build a complete picture"""

    # Output structure instruction
    structure_instruction = """

RESPONSE FORMAT:
Structure your response naturally and engagingly to feel like a high-quality, premium tutoring session. Do NOT use a generic "## Answer" heading. Instead, use a descriptive main heading based on the topic.
Follow this pedagogical flow:

1. **Direct Explanation**: Start with a clear, direct answer to the question adapted to the student's level.
2. **Step-by-Step Breakdown / How it Works**: Explain the core mechanism logically. Use bullet points or numbered steps for readability.
3. **Code or Pseudocode (If Applicable)**: Provide a clean, well-commented snippet in Python. Briefly explain what the code does. Skip if the query is purely conceptual.
4. **Complexity Analysis (If Applicable)**: Clearly state the Time & Space Complexity (Big-O) and briefly explain why.
5. **Common Pitfalls & Pro-Tips**: Highlight 1-2 common mistakes or expert insights.
6. **Think Deeper**: End with 1-2 thought-provoking questions that encourage the student to consider edge cases or next steps.

Use standard markdown, bold text for emphasis, and ensure the tone is supportive, expert, and highly readable."""

    # Assemble full prompt
    full_prompt = f"""{system_block}
{cot_instruction}
{structure_instruction}

{'='*60}
RETRIEVED CONTEXT
{'='*60}
{formatted_context}

{'='*60}
STUDENT QUESTION
{'='*60}
{query}

Now provide your response following the format above:"""

    return full_prompt


# ---------------------------------------------------------------
# ANSWER GENERATOR CLASS
# ---------------------------------------------------------------

class AnswerGenerator:
    """
    Generates mastery-adaptive, grounded answers using the Gemini LLM.
    
    Pipeline:
    1. Format retrieved context with tier labels
    2. Build mastery-adaptive prompt with structured output instructions
    3. Generate initial answer with grounding constraints
    4. (Optional) Self-verify for hallucination
    5. Return structured response
    """

    def __init__(self, api_key: str = None):
        # `api_key` kept for backward-compatible call sites; the provider-agnostic
        # LLMClient reads credentials from env for whichever provider(s) are
        # configured (see llm/LLM_CLIENT.md) rather than taking one directly.
        self.client = LLMClient()
        self.available = self.client.available

    def _llm_call(self, prompt: str, temperature: float = 0.3) -> str:
        """Delegates to the provider-agnostic LLMClient (handles its own
        per-provider retry and cross-provider failover — see llm/LLM_CLIENT.md)."""
        if not self.available:
            return ""
        return self.client.call(prompt, temperature=temperature, max_tokens=4096)

    def _verify_grounding(self, answer: str, context: str, query: str) -> Dict:
        """
        Self-verification pass: ask the LLM to check if the answer
        is faithfully grounded in the retrieved context.
        Returns a confidence score and any flagged issues.
        """
        verify_prompt = f"""You are a FACT-CHECKING assistant. Given the original context and a generated answer, evaluate:

1. FAITHFULNESS: Is every claim in the answer supported by the context? (1-5 scale)
2. COMPLETENESS: Does the answer address all aspects of the question using available context? (1-5 scale)
3. ISSUES: List any specific claims that appear to be hallucinated (not in context).

Context (abbreviated):
{context[:2000]}

Answer:
{answer[:1500]}

Question: {query}

Respond in this exact JSON format (no markdown, no code fences):
{{"faithfulness": <1-5>, "completeness": <1-5>, "issues": ["issue1", "issue2"]}}"""

        result = self._llm_call(verify_prompt, temperature=0.1)
        if not result:
            return {"faithfulness": 3, "completeness": 3, "issues": []}

        # Parse JSON response
        try:
            # Strip any markdown code fences if present
            clean = result.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[1]
                clean = clean.rsplit("```", 1)[0]
            return json.loads(clean)
        except (json.JSONDecodeError, IndexError):
            return {"faithfulness": 3, "completeness": 3, "issues": ["verification parse failed"]}

    def generate(
        self,
        query: str,
        mastery: float,
        retrieval_result: Dict,
        verify: bool = True,
        debug: bool = False,
        on_stage=None,
    ) -> Dict:
        """
        Full generation pipeline.

        Args:
            query: The student's question
            mastery: Student mastery level (0.0 to 1.0)
            retrieval_result: Output from Retriever.retrieve()
            verify: Whether to run self-verification pass
            debug: Print debug information
            on_stage: optional callback(str) — see retriever.py's on_stage
                for the pattern this follows; never required, never changes behavior.

        Returns:
            Dict with: answer, metadata (mastery_label, complexity, sources,
            verification, tier_distribution)
        """
        stage = on_stage if on_stage else (lambda _msg: None)
        results = retrieval_result.get("results", [])
        complexity = retrieval_result.get("complexity", "SIMPLE")

        if not results:
            return {
                "answer": "I couldn't find relevant information in the knowledge base to answer this question. Could you rephrase or ask about a specific DSA topic?",
                "metadata": {
                    "mastery_label": get_mastery_label(mastery),
                    "complexity": complexity,
                    "sources": [],
                    "verification": None,
                    "tier_distribution": {"T1": 0, "T2": 0, "T3": 0},
                }
            }

        # Step 1: Format context with tier labels
        formatted_context = format_context_for_llm(results)

        if debug:
            print(f"\n[Generator] Context length: {len(formatted_context)} chars")
            print(f"[Generator] Mastery: {mastery} ({get_mastery_label(mastery)})")
            print(f"[Generator] Complexity: {complexity}")

        # Step 2: Build mastery-adaptive prompt
        prompt = build_generation_prompt(
            query=query,
            mastery=mastery,
            complexity=complexity,
            formatted_context=formatted_context,
        )

        if debug:
            print(f"[Generator] Prompt length: {len(prompt)} chars")

        # Step 3: Generate answer
        # Use slightly higher temperature for beginners (more conversational)
        # Lower for advanced (more precise)
        temp = 0.4 if mastery < 0.4 else (0.3 if mastery < 0.7 else 0.2)

        persona_label = get_mastery_label(mastery)
        stage(f"Writing a {persona_label.lower()}-level explanation, grounded only in the retrieved sources...")
        answer = self._llm_call(prompt, temperature=temp)

        if not answer:
            return {
                "answer": "I'm having trouble generating an answer right now. Here are the relevant knowledge chunks that were retrieved — you can read them directly:\n\n" + formatted_context[:2000],
                "metadata": {
                    "mastery_label": get_mastery_label(mastery),
                    "complexity": complexity,
                    "sources": self._extract_sources(results),
                    "verification": None,
                    "tier_distribution": self._tier_dist(results),
                }
            }

        if debug:
            print(f"[Generator] Answer length: {len(answer)} chars")

        # Step 4: Self-verification (optional)
        verification = None
        if verify and self.available:
            stage("Double-checking the answer against the retrieved sources for hallucinations...")
            if debug:
                print("[Generator] Running self-verification...")
            verification = self._verify_grounding(answer, formatted_context, query)
            if debug:
                print(f"[Generator] Verification: {verification}")

            # If faithfulness is very low, add a disclaimer
            if verification.get("faithfulness", 5) <= 2:
                answer += "\n\n> **Note:** Some parts of this answer may extend beyond the retrieved sources. Please cross-reference with your textbook."

        # Step 5: Build response
        return {
            "answer": answer,
            "metadata": {
                "mastery_label": get_mastery_label(mastery),
                "complexity": complexity,
                "sources": self._extract_sources(results),
                "verification": verification,
                "tier_distribution": self._tier_dist(results),
                "model": self.client.last_provider_used if self.client else None,
            }
        }

    def _extract_sources(self, results: List[Dict]) -> List[Dict]:
        """Extract source attribution info from results."""
        sources = []
        seen = set()
        for chunk in results:
            md = chunk["metadata"]
            key = (md["tier"], md.get("canonical_topic", ""), md.get("section", ""))
            if key not in seen:
                seen.add(key)
                sources.append({
                    "tier": md["tier"],
                    "tier_label": TIER_LABELS.get(md["tier"], md["tier"]),
                    "topic": md.get("canonical_topic", md.get("topic", "unknown")),
                    "section": md.get("section", ""),
                })
        return sources

    def _tier_dist(self, results: List[Dict]) -> Dict[str, int]:
        """Count chunks per tier."""
        dist = {"T1": 0, "T2": 0, "T3": 0}
        for chunk in results:
            tier = chunk["metadata"]["tier"]
            dist[tier] = dist.get(tier, 0) + 1
        return dist


# ---------------------------------------------------------------
# STANDALONE TEST
# ---------------------------------------------------------------

if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "retrieval"))
    from retriever import Retriever

    print("Loading retriever...")
    retriever = Retriever()

    print("Loading generator...")
    generator = AnswerGenerator()

    # Test query
    query = "What is a stack and how does it work?"
    mastery = 0.3

    print(f"\nQuery: '{query}' | Mastery: {mastery}")
    print("-" * 60)

    # Retrieve
    retrieval_result = retriever.retrieve(query, mastery, debug=True)

    # Generate
    gen_result = generator.generate(
        query=query,
        mastery=mastery,
        retrieval_result=retrieval_result,
        verify=True,
        debug=True,
    )

    print("\n" + "=" * 60)
    print("GENERATED ANSWER")
    print("=" * 60)
    print(gen_result["answer"])

    print("\n" + "=" * 60)
    print("METADATA")
    print("=" * 60)
    meta = gen_result["metadata"]
    print(f"  Mastery Level: {meta['mastery_label']}")
    print(f"  Complexity: {meta['complexity']}")
    print(f"  Tier Distribution: {meta['tier_distribution']}")
    print(f"  Verification: {meta.get('verification')}")
    print(f"  Sources ({len(meta['sources'])}):")
    for s in meta["sources"][:5]:
        print(f"    [{s['tier']}] {s['topic']} > {s['section'][:50]}")
