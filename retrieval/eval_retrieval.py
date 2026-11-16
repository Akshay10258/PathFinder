import json
import time
from retriever import Retriever

# Initialize the robust retriever
print("Initializing the Complete Retrieval System...")
retriever = Retriever()

TEST_QUERIES = [
    {
        "query": "Why is Dijkstra greedy and how is it optimal?",
        "mastery": 0.3, # Beginner
        "desc": "Tests multi-tier matching (T3 intuition -> T2/T1 formal) and keyword 'greedy' handling."
    },
    {
        "query": "What is the amortized complexity of table doubling?",
        "mastery": 0.8, # Advanced
        "desc": "Tests advanced concept matching (favoring T1 heavily)."
    },
    {
        "query": "How do hash table collisions occur and how to fix them?",
        "mastery": 0.5, # Intermediate
        "desc": "Tests T2 structure (GFG style) mixed with T3 intuition."
    }
]

print("\n" + "="*60)
print("RETRIEVAL EVALUATION")
print("="*60)

for test in TEST_QUERIES:
    print(f"\n\n[TEST] {test['query']}")
    print(f"Mastery: {test['mastery']} | Intent: {test['desc']}")
    
    start_time = time.time()
    
    result = retriever.retrieve(
        query=test["query"],
        mastery=test["mastery"],
        debug=True 
    )
    
    elapsed = time.time() - start_time
    
    # Assess Tier distribution
    tiers_retrieved = {"T1": 0, "T2": 0, "T3": 0}
    for r in result["results"]:
        tiers_retrieved[r["metadata"]["tier"]] += 1
        
    print(f"\n--- Results Summary ({elapsed:.2f} seconds) ---")
    print(f"Complexity: {result['complexity']}")
    print(f"Total Chunks: {len(result['results'])}")
    print(f"Tier Dist: T1: {tiers_retrieved['T1']}, T2: {tiers_retrieved['T2']}, T3: {tiers_retrieved['T3']}")
    
    print("\nTop 5 Chunks Retrieved:")
    for idx, c in enumerate(result["results"][:5]):
        md = c["metadata"]
        print(f"  {idx+1}. [{md['tier']}] {md.get('topic')} > {md.get('section','')[:50]}")
    
    print("-" * 60)
