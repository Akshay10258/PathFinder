"""
Topic Normalization Map — Canonical topic IDs for DSA interview prep.

Maps every raw topic name (from T1, T2, T3 metadata) to a canonical ID.
This enables cross-tier retrieval: when a T3 chunk about "Heap Data Structure"
is retrieved, we can find related T1 chunks under "heapsort" and T2 chunks
about heap/priority queue.

Design Principles:
  1. Topics are curated for REAL DSA interview preparation (FAANG-level and below).
     Niche academic topics not tested in practice interviews are excluded.
  2. Each canonical topic should have cross-tier coverage where possible
     (T1 + T2 + T3 chunks for the same concept).
  3. One raw topic maps to exactly ONE canonical (no ambiguity).

Topic list is aligned with NeetCode 150, LeetCode Top Interview 150, Striver's
A2Z Sheet, and standard FAANG interview preparation curricula.
"""

# ---------------------------------------------------------------
# CANONICAL TOPIC → ALL ALIASES (from T1, T2, T3 metadata)
# ---------------------------------------------------------------

TOPIC_ALIASES = {

    # ===================== FOUNDATIONS =====================

    "algorithm_foundations": [
        "algorithm_foundations",              # T1
        "Foundations of Algorithms",          # T3
        "Algorithmic Thinking",              # T3
        "Algorithm Analysis",                # T3
        "Models of Computation",             # T3
    ],

    "complexity_analysis": [
        "complexity-analysis",               # T2 (Time_and_Space_Complexity.md)
        "Recurrence Relations",              # T3
        "Big O Notation",                    # T3
        "Time Complexity",
        "Space Complexity",
    ],

    # ===================== CORE DATA STRUCTURES =====================

    "arrays": [
        "array",                             # T2 (Arrays.md)
        "Arrays",
    ],

    "linked_lists": [
        "linked list",                       # T2 (Linked_list.md)
        "Linked List",                       # T3
        "linked_lists",
    ],

    "stacks": [
        "stack",                             # T2 (Stacks.md)
        "Stacks",
    ],

    "queues": [
        "queue",                             # T2 (Queue.md)
        "Queues",
        "Deque",
        "deque",
    ],

    "strings": [
        "string",                            # T2 (Strings.md)
        "Strings",
    ],

    # ===================== TREES =====================

    "binary_search_trees": [
        "binary_search_trees",               # T1
        "Binary Search Trees",               # T3
        "tree",                              # T2 (Trees.md — covers general trees + BST)
        "BST",
        "Binary Tree",
    ],

    "avl_trees": [
        "AVL Trees",                         # T3
        "avl_trees",
        "Balanced BST",
    ],

    "red_black_trees": [
        "red_black_trees",                   # T1
        "Red Black Trees",                   # T3
    ],

    "tries": [
        "Trie",
        "tries",
        "Prefix Tree",
        "trie",
    ],

    # ===================== HEAP & PRIORITY QUEUE =====================

    "heap": [
        "heapsort",                          # T1 (CLRS Ch.6 — heap + heapsort)
        "Heap Data Structure",               # T3
        "Heap Operations",                   # T3
        "Priority Queue",                    # T3
        "heap",
    ],

    # ===================== HASHING =====================

    "hashing": [
        "hash_tables",                       # T1
        "hashing",                           # T2 (Hashing_in_Data_Structure.md)
        "Hashing",                           # T3
        "Hash Map",
        "Hash Set",
    ],

    # ===================== SORTING =====================

    "sorting": [
        "sorting",                           # T1 (CLRS Ch.2, Ch.8)
        "quicksort",                         # T1 (CLRS Ch.7)
        "sorting-algorithms",                # T2 (Sorting_Algorithms-part1/2.md)
        "Sorting",                           # T3
        "Sorting Algorithms",                # T3
        "Sorting Lower Bounds",              # T3
        "Integer Sorting",                   # T3
        "Quicksort",                         # T3
        "Merge Sort",
        "Heap Sort",
    ],

    # ===================== SEARCHING & BINARY SEARCH =====================

    "binary_search": [
        "Binary Search",
        "binary_search",
        "Binary Search on Answer",
        "Binary Search Applications",
    ],

    "searching": [
        "searching-algorithms",              # T2 (Searching_Algorithms.md)
        "selection",                         # T1 (CLRS Ch.9 — order statistics, median)
        "randomized_algorithms",             # T1
        "Searching",
        "Order Statistics",
    ],

    # ===================== INTERVIEW PATTERNS =====================

    "two_pointers": [
        "Two Pointers",
        "two_pointers",
        "Two Pointer Technique",
        "Fast and Slow Pointers",
        "Floyd's Cycle Detection",
    ],

    "sliding_window": [
        "Sliding Window",
        "sliding_window",
        "Fixed Window",
        "Variable Window",
        "Sliding Window Technique",
    ],

    "monotonic_stack": [
        "Monotonic Stack",
        "monotonic_stack",
        "Monotonic Queue",
        "Next Greater Element",
        "Stock Span Problem",
    ],

    "bit_manipulation": [
        "Bit Manipulation",
        "bit_manipulation",
        "Bitwise Operations",
        "Bitmask",
        "Bitmasking",
        "XOR Tricks",
    ],

    # ===================== GRAPH ALGORITHMS =====================

    "graph_algorithms": [
        "graph_algorithms",                  # T1 (CLRS Ch.22 — BFS, DFS, topo sort)
        "graph",                             # T2 (Graphs.md — basic representation)
        "graph algorithms",                  # T2 (Graph_Algorithms.md — broad coverage)
        "Graph Algorithms",                  # T3 (BFS, DFS, graph properties)
        "BFS",
        "DFS",
        "Topological Sort",
        "Cycle Detection",
    ],

    "shortest_paths": [
        "shortest_paths",                    # T1 (CLRS Ch.24 — Dijkstra, Bellman-Ford)
        "all_pairs_shortest_paths",          # T1 (CLRS Ch.25 — Floyd-Warshall, Johnson)
        "Shortest Paths",
        "Dijkstra",
        "Bellman-Ford",
        "Floyd Warshall",
    ],

    "minimum_spanning_trees": [
        "minimum_spanning_trees",            # T1 (CLRS Ch.23 — Kruskal, Prim)
        "Minimum Spanning Tree",
        "Kruskal",
        "Prim",
        "MST",
    ],

    "maximum_flow": [
        "maximum_flow",                      # T1 (CLRS Ch.26 — Ford-Fulkerson)
        "Maximum Flow",
        "Network Flow",
        "Ford-Fulkerson",
    ],

    "disjoint_sets": [
        "disjoint_sets",                     # T1
        "Union Find",
        "Disjoint Set Union",
        "DSU",
        "Union-Find",
    ],

    # ===================== ALGORITHM PARADIGMS =====================

    "dynamic_programming": [
        "dynamic_programming",               # T1
        "Dynamic Programming",               # T3
        "DP",
        "Memoization",
        "Tabulation",
    ],

    "greedy_algorithms": [
        "greedy_algorithms",                 # T1 & T2
        "Greedy_Algorithms",                 # T3
        "Greedy Algorithms",
        "Greedy",
    ],

    "divide_and_conquer": [
        "Divide and Conquer",                # T3
        "divide_and_conquer",
        "Merge Sort",
    ],

    "recursion_backtracking": [
        "recursion",                         # T2 (Introduction_to_Recursion.md)
        "Backtracking",                      # T3
        "Recursion",
        "N-Queens",
        "Subset Sum",
        "Permutations",
    ],

    # ===================== STRING ALGORITHMS =====================

    "string_matching": [
        "String Matching",                   # T3
        "string_matching",
        "KMP",
        "Rabin-Karp",
        "Z Algorithm",
        "Pattern Matching",
    ],
}


# ---------------------------------------------------------------
# BUILD REVERSE MAP: raw_topic_name → canonical_id
# ---------------------------------------------------------------

_REVERSE_MAP = {}
for canonical, aliases in TOPIC_ALIASES.items():
    for alias in aliases:
        _lower = alias.lower().strip()
        if _lower not in _REVERSE_MAP:
            _REVERSE_MAP[_lower] = canonical
        # If already mapped, keep the FIRST (most specific) canonical
        # This avoids ambiguity — each raw topic maps to exactly one canonical


def normalize_topic(raw_topic: str) -> str:
    """
    Given a raw topic name from chunk metadata, return the canonical topic ID.
    Uses case-insensitive lookup. Returns raw topic as-is if no match.
    """
    if not raw_topic:
        return "unknown"

    # Direct case-insensitive lookup
    result = _REVERSE_MAP.get(raw_topic.lower().strip())
    if result:
        return result

    # Fuzzy fallback: try underscore/hyphen normalization
    normalized = raw_topic.lower().strip().replace("-", "_").replace(" ", "_")
    for canonical, aliases in TOPIC_ALIASES.items():
        for alias in aliases:
            alias_norm = alias.lower().strip().replace("-", "_").replace(" ", "_")
            if alias_norm == normalized:
                return canonical

    # Last resort: check if the canonical ID itself matches
    if normalized in TOPIC_ALIASES:
        return normalized

    return raw_topic  # return as-is if no match


def get_related_topics(raw_topic: str) -> list:
    """
    Given a raw topic, return ALL raw topic aliases that belong
    to the same canonical group. Used for cross-tier expansion.
    """
    canonical = normalize_topic(raw_topic)
    return TOPIC_ALIASES.get(canonical, [raw_topic])


def get_canonical(raw_topic: str) -> str:
    """
    Alias for normalize_topic. Returns the single canonical topic ID.
    """
    return normalize_topic(raw_topic)


# ---------------------------------------------------------------
# RELATED CANONICAL TOPICS — for cross-topic expansion
# ---------------------------------------------------------------

# Topics that are closely related and should be candidates for
# cross-topic expansion (e.g., heap is related to sorting)
RELATED_CANONICALS = {
    "arrays": ["two_pointers", "sliding_window", "binary_search", "sorting"],
    "two_pointers": ["arrays", "sliding_window", "linked_lists"],
    "sliding_window": ["arrays", "two_pointers", "hashing"],
    "binary_search": ["arrays", "searching", "divide_and_conquer"],
    "heap": ["sorting", "priority_queue", "greedy_algorithms"],
    "sorting": ["heap", "searching", "divide_and_conquer", "binary_search"],
    "binary_search_trees": ["avl_trees", "red_black_trees", "binary_search"],
    "avl_trees": ["binary_search_trees", "red_black_trees"],
    "red_black_trees": ["binary_search_trees", "avl_trees"],
    "tries": ["strings", "hashing", "binary_search_trees"],
    "graph_algorithms": ["shortest_paths", "minimum_spanning_trees", "disjoint_sets"],
    "shortest_paths": ["graph_algorithms", "greedy_algorithms", "heap"],
    "minimum_spanning_trees": ["graph_algorithms", "disjoint_sets", "greedy_algorithms"],
    "disjoint_sets": ["graph_algorithms", "arrays"],
    "stacks": ["monotonic_stack", "arrays", "queues", "recursion_backtracking"],
    "queues": ["stacks", "arrays", "graph_algorithms"],
    "linked_lists": ["two_pointers", "stacks"],
    "strings": ["string_matching", "hashing", "tries", "sliding_window"],
    "string_matching": ["strings", "hashing", "tries"],
    "divide_and_conquer": ["sorting", "recursion_backtracking", "binary_search"],
    "recursion_backtracking": ["divide_and_conquer", "dynamic_programming"],
    "dynamic_programming": ["greedy_algorithms", "recursion_backtracking"],
    "greedy_algorithms": ["dynamic_programming", "minimum_spanning_trees"],
    "bit_manipulation": ["arrays", "hashing"],
    "monotonic_stack": ["stacks", "arrays"],
    "hashing": ["arrays", "strings", "searching"],
    "searching": ["sorting", "binary_search_trees", "binary_search"],
}


def get_related_canonicals(canonical_topic: str) -> list:
    """
    Given a canonical topic, return related canonical topics
    that could be useful for cross-topic expansion.
    """
    return RELATED_CANONICALS.get(canonical_topic, [])


# ---------------------------------------------------------------
# DIAGNOSTICS
# ---------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("TOPIC MAP DIAGNOSTICS")
    print("=" * 60)

    print(f"\nCanonical topics: {len(TOPIC_ALIASES)}")
    print(f"Total aliases mapped: {len(_REVERSE_MAP)}")

    # Show all canonicals
    print("\n--- Canonical Topics ---")
    for i, t in enumerate(sorted(TOPIC_ALIASES.keys()), 1):
        print(f"  {i:2d}. {t}")

    # Test mappings
    test_cases = [
        ("sorting", "sorting"),
        ("quicksort", "sorting"),
        ("heapsort", "heap"),
        ("shortest_paths", "shortest_paths"),
        ("graph_algorithms", "graph_algorithms"),
        ("hash_tables", "hashing"),
        ("binary_search_trees", "binary_search_trees"),
        ("red_black_trees", "red_black_trees"),
        ("array", "arrays"),
        ("stack", "stacks"),
        ("queue", "queues"),
        ("linked list", "linked_lists"),
        ("string", "strings"),
        ("sorting-algorithms", "sorting"),
        ("searching-algorithms", "searching"),
        ("graph algorithms", "graph_algorithms"),
        ("graph", "graph_algorithms"),
        ("hashing", "hashing"),
        ("greedy_algorithms", "greedy_algorithms"),
        ("recursion", "recursion_backtracking"),
        ("complexity-analysis", "complexity_analysis"),
        ("tree", "binary_search_trees"),
        ("Heap Data Structure", "heap"),
        ("Priority Queue", "heap"),
        ("AVL Trees", "avl_trees"),
        ("Red Black Trees", "red_black_trees"),
        ("Linked List", "linked_lists"),
        ("Graph Algorithms", "graph_algorithms"),
        ("Sorting", "sorting"),
        ("Quicksort", "sorting"),
        ("Dynamic Programming", "dynamic_programming"),
        ("Greedy_Algorithms", "greedy_algorithms"),
        ("Backtracking", "recursion_backtracking"),
        ("Divide and Conquer", "divide_and_conquer"),
        ("Recurrence Relations", "complexity_analysis"),
        ("String Matching", "string_matching"),
        ("Two Pointers", "two_pointers"),
        ("Sliding Window", "sliding_window"),
        ("Trie", "tries"),
        ("Bit Manipulation", "bit_manipulation"),
        ("Binary Search", "binary_search"),
        ("Union Find", "disjoint_sets"),
        ("Monotonic Stack", "monotonic_stack"),
    ]

    print("\n--- Mapping Tests ---")
    passed = 0
    failed = 0
    for raw, expected in test_cases:
        result = normalize_topic(raw)
        status = "[OK]" if result == expected else "[FAIL]"
        if result != expected:
            print(f"  {status} '{raw}' → '{result}' (expected '{expected}')")
            failed += 1
        else:
            passed += 1

    print(f"\n  Passed: {passed}/{len(test_cases)}")
    if failed:
        print(f"  FAILED: {failed}/{len(test_cases)}")
    else:
        print("  All tests passed!")
