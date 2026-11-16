"""
DSA TUTOR — Full Interactive RAG Pipeline
Retrieval (v3) -> Generation (mastery-adaptive, grounded)
"""

import os
import sys
import time

# Ensure both retrieval and generation modules are on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "generation"))

from retriever import Retriever
from generator import AnswerGenerator


def print_header():
    print("\n" + "=" * 62)
    print("     DSA TUTOR -- Adaptive RAG Learning System")
    print("     Retrieval v3 + Mastery-Adaptive Generation")
    print("=" * 62)


def print_sources(sources, max_show=5):
    """Print source attribution in a readable format."""
    print("\n  Sources used:")
    for s in sources[:max_show]:
        sec = s["section"][:45] if s["section"] else "general"
        line = f"    [{s['tier']}] {s['topic']} > {sec}"
        # Safe ASCII fallback for Windows terminals
        print(line.encode("ascii", "replace").decode("ascii"))


def main():
    print_header()
    print("\nLoading AI models (this takes 15-30 seconds on first run)...\n")

    try:
        retriever = Retriever()
        generator = AnswerGenerator()
    except Exception as e:
        print(f"\n[ERROR] Failed to initialize: {e}")
        print("Make sure you have an active internet connection and valid API key.")
        return

    print("\nSystem ready! Type 'exit' to quit, 'help' for commands.\n")
    print("-" * 62)

    while True:
        try:
            query = input("\n> Ask a DSA question: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not query:
            continue
        if query.lower() in ["exit", "quit", "q"]:
            print("Goodbye!")
            break
        if query.lower() == "help":
            print("""
  Commands:
    exit / quit   - Close the tutor
    help          - Show this message
  
  Mastery Levels:
    0.0 - 0.3  = Beginner   (analogies, simple steps, diagrams)
    0.4 - 0.6  = Intermediate (Big-O, trade-offs, code patterns)
    0.7 - 1.0  = Advanced   (proofs, amortized analysis, optimizations)
  
  Example queries:
    "What is a stack?"                           (mastery 0.2)
    "Explain Dijkstra's algorithm"               (mastery 0.5)
    "Why does Dijkstra fail on negative weights?" (mastery 0.8)
    "Compare BFS and DFS"                        (mastery 0.5)
""")
            continue

        # Get mastery level
        mastery_input = input("  Mastery level (0.0 to 1.0) [default 0.5]: ").strip()
        try:
            mastery = float(mastery_input) if mastery_input else 0.5
            mastery = max(0.0, min(1.0, mastery))  # clamp
        except ValueError:
            mastery = 0.5
            print("  Invalid input, using 0.5")

        print(f"\n  Searching knowledge base...\n")
        start_time = time.time()

        # ---- RETRIEVAL ----
        retrieval_result = retriever.retrieve(query=query, mastery=mastery, debug=False)
        retrieval_time = time.time() - start_time

        n_results = len(retrieval_result.get("results", []))
        complexity = retrieval_result.get("complexity", "SIMPLE")

        tier_dist = {"T1": 0, "T2": 0, "T3": 0}
        for r in retrieval_result.get("results", []):
            tier_dist[r["metadata"]["tier"]] += 1

        print(f"  Retrieved {n_results} chunks in {retrieval_time:.1f}s")
        print(f"  Complexity: {complexity} | Tiers: T1={tier_dist['T1']} T2={tier_dist['T2']} T3={tier_dist['T3']}")
        print(f"\n  Generating answer...\n")

        # ---- GENERATION ----
        gen_start = time.time()
        gen_result = generator.generate(
            query=query,
            mastery=mastery,
            retrieval_result=retrieval_result,
            verify=True,
            debug=False,
        )
        gen_time = time.time() - gen_start
        total_time = time.time() - start_time

        # ---- DISPLAY ANSWER ----
        print("=" * 62)
        meta = gen_result["metadata"]
        print(f"  Level: {meta['mastery_label']} | Complexity: {meta['complexity']}")
        print("=" * 62)

        # Print answer (safe for Windows terminals)
        answer = gen_result["answer"]
        try:
            print(f"\n{answer}\n")
        except UnicodeEncodeError:
            print(f"\n{answer.encode('ascii', 'replace').decode('ascii')}\n")

        # ---- METADATA FOOTER ----
        print("-" * 62)
        print(f"  Retrieval: {retrieval_time:.1f}s | Generation: {gen_time:.1f}s | Total: {total_time:.1f}s")

        # Verification badge
        v = meta.get("verification")
        if v:
            faith = v.get("faithfulness", "?")
            comp = v.get("completeness", "?")
            issues = v.get("issues", [])
            badge = "GROUNDED" if faith >= 4 else ("PARTIAL" if faith >= 3 else "LOW CONFIDENCE")
            print(f"  Grounding: {badge} (faithfulness={faith}/5, completeness={comp}/5)")
            if issues and issues != ["verification parse failed"]:
                for iss in issues[:2]:
                    safe_iss = str(iss).encode("ascii", "replace").decode("ascii")
                    print(f"    ! {safe_iss}")

        # Sources
        print_sources(meta.get("sources", []))
        print("-" * 62)


if __name__ == "__main__":
    main()
