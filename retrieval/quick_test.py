"""Quick automated test of the full Retrieval -> Generation pipeline."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "generation"))

from retriever import Retriever
from generator import AnswerGenerator

def run_test(retriever, generator, query, mastery):
    print(f"\nQuery: '{query}' | Mastery: {mastery}")
    print("=" * 60)

    result = retriever.retrieve(query, mastery, debug=True)

    gen_result = generator.generate(
        query=query,
        mastery=mastery,
        retrieval_result=result,
        verify=True,
        debug=True,
    )

    print("\n" + "=" * 60)
    print("GENERATED ANSWER")
    print("=" * 60)
    try:
        print(gen_result["answer"])
    except UnicodeEncodeError:
        print(gen_result["answer"].encode("ascii", "replace").decode("ascii"))

    meta = gen_result["metadata"]
    print("\n" + "-" * 60)
    print(f"  Level: {meta['mastery_label']}")
    print(f"  Complexity: {meta['complexity']}")
    print(f"  Tiers: {meta['tier_distribution']}")
    v = meta.get("verification")
    if v:
        print(f"  Verification: faithfulness={v.get('faithfulness')}/5, completeness={v.get('completeness')}/5")
        if v.get("issues"):
            for iss in v["issues"]:
                print(f"    ! {iss}")
    print(f"  Sources: {len(meta['sources'])}")
    for s in meta["sources"][:3]:
        sec = s["section"][:40] if s["section"] else ""
        print(f"    [{s['tier']}] {s['topic']} > {sec}")
    print()


if __name__ == "__main__":
    print("Loading models...")
    retriever = Retriever()
    generator = AnswerGenerator()

    # Test 1: Beginner asking about stacks
    run_test(retriever, generator, "What is a stack and how does it work?", 0.2)
