"""
Misconception Catalog for Data Structures & Algorithms.

Maps canonical topics to specific, documented errors commonly made by students.
Used by the AnswerEvaluator to diagnose the exact reason a student's answer
is incorrect — turning a binary "wrong" into a named, actionable diagnosis.

Coverage: ~65 entries across 18 canonical topics, focusing on the highest-
traffic DSA topics from CS-education literature.
"""

from typing import Dict, List, TypedDict


class Misconception(TypedDict):
    id: str
    name: str
    description: str


# ---------------------------------------------------------------------------
# Catalog — each entry is a real, commonly documented CS-education error.
# IDs are snake_case, unique across the entire catalog.
# ---------------------------------------------------------------------------

MISCONCEPTIONS: Dict[str, List[Misconception]] = {

    # --- Graph Algorithms ---
    "graph_algorithms": [
        {
            "id": "bfs_dfs_queue_stack_confusion",
            "name": "BFS/DFS Data Structure Confusion",
            "description": "Confuses BFS's queue with DFS's stack — believes BFS uses a stack or vice versa."
        },
        {
            "id": "shortest_path_negative_weights",
            "name": "Dijkstra Negative Weight Fallacy",
            "description": "Believes Dijkstra's algorithm works correctly on graphs with negative weight edges (ignoring Bellman-Ford)."
        },
        {
            "id": "graph_cycle_detection_wrong_approach",
            "name": "Cycle Detection Method Confusion",
            "description": "Applies undirected-graph cycle detection logic (visited set alone) to directed graphs, missing back-edge tracking."
        },
    ],

    # --- Hashing ---
    "hashing": [
        {
            "id": "hash_worst_case_o1",
            "name": "O(1) Hash Table Fallacy",
            "description": "Treats hash table lookup as unconditional worst-case O(1), ignoring collision behavior under adversarial or poorly-distributed input."
        },
        {
            "id": "hash_function_confusion",
            "name": "Cryptographic Hash Confusion",
            "description": "Confuses hash map hashing (speed, uniform distribution) with cryptographic hashing (security, irreversibility)."
        },
        {
            "id": "hash_resize_misunderstanding",
            "name": "Resize Amortization Ignorance",
            "description": "Believes hash table resizing makes individual insertions O(n), not understanding amortized O(1) analysis."
        },
    ],

    # --- Sorting ---
    "sorting": [
        {
            "id": "quicksort_worst_case",
            "name": "Quicksort O(n log n) Worst Case",
            "description": "Believes quicksort's worst case is always O(n log n) rather than O(n²)."
        },
        {
            "id": "stable_sort_confusion",
            "name": "Stability Ignorance",
            "description": "Fails to understand what makes a sorting algorithm stable, or wrongly identifies unstable sorts (like basic Quicksort) as stable."
        },
        {
            "id": "comparison_sort_lower_bound",
            "name": "Comparison Sort Lower Bound Ignorance",
            "description": "Believes a comparison-based sort can beat Ω(n log n) in the worst case, or doesn't understand why radix sort circumvents this bound."
        },
    ],

    # --- Recursion & Backtracking ---
    "recursion_backtracking": [
        {
            "id": "recursion_always_worse",
            "name": "Recursion Efficiency Fallacy",
            "description": "Believes recursion is always asymptotically worse (time complexity) than an equivalent iterative solution."
        },
        {
            "id": "missing_base_case",
            "name": "Base Case Neglect",
            "description": "Fails to identify or include a terminating base case, leading to infinite recursion."
        },
        {
            "id": "backtracking_brute_force_confusion",
            "name": "Backtracking vs Brute Force",
            "description": "Treats backtracking as identical to brute-force enumeration, missing that backtracking prunes the search space by abandoning invalid partial solutions early."
        },
    ],

    # --- Dynamic Programming ---
    "dynamic_programming": [
        {
            "id": "memoization_tabulation_confusion",
            "name": "Memoization vs. Tabulation Confusion",
            "description": "Confuses memoization (top-down caching) with tabulation (bottom-up building) as if they were exactly the same technique."
        },
        {
            "id": "greedy_dp_confusion",
            "name": "Greedy vs DP Overlap",
            "description": "Assumes a greedy choice is sufficient for problems that require evaluating all overlapping subproblems (DP)."
        },
        {
            "id": "dp_without_optimal_substructure",
            "name": "Missing Optimal Substructure Check",
            "description": "Applies DP to problems without verifying that optimal substructure holds — the optimal solution must be composable from optimal sub-solutions."
        },
    ],

    # --- Binary Search Trees ---
    "binary_search_trees": [
        {
            "id": "bst_always_log_n",
            "name": "Unconditional O(log n) BST",
            "description": "Assumes O(log n) lookup unconditionally, ignoring the degenerate/unbalanced (effectively linked-list) O(n) case."
        },
        {
            "id": "bst_heap_confusion",
            "name": "BST vs Heap Confusion",
            "description": "Confuses the ordering properties of a BST (left < root < right) with a Heap (parent > children)."
        },
        {
            "id": "bst_deletion_complexity",
            "name": "BST Deletion Oversimplification",
            "description": "Ignores the two-child deletion case requiring in-order successor/predecessor replacement, treating all deletions as simple pointer removal."
        },
    ],

    # --- Stacks ---
    "stacks": [
        {
            "id": "stack_fifo_confusion",
            "name": "Stack FIFO Confusion",
            "description": "Describes a stack as FIFO (First-In-First-Out) instead of LIFO (Last-In-First-Out), confusing it with a queue."
        },
        {
            "id": "stack_recursion_independence",
            "name": "Stack-Recursion Independence Fallacy",
            "description": "Fails to recognize that every recursive call implicitly uses the call stack, and that stack overflow is a real recursion limitation."
        },
        {
            "id": "stack_peek_vs_pop",
            "name": "Peek vs Pop Confusion",
            "description": "Confuses peek (view top without removing) with pop (remove and return top), leading to unintended element consumption."
        },
    ],

    # --- Queues ---
    "queues": [
        {
            "id": "queue_lifo_confusion",
            "name": "Queue LIFO Confusion",
            "description": "Describes a queue as LIFO instead of FIFO, confusing it with a stack."
        },
        {
            "id": "circular_queue_full_empty",
            "name": "Circular Queue Full/Empty Ambiguity",
            "description": "Cannot distinguish between a full and empty circular queue when front == rear, missing the need for a count or sentinel slot."
        },
        {
            "id": "priority_queue_sorted_array",
            "name": "Priority Queue = Sorted Array Fallacy",
            "description": "Assumes a priority queue must be a sorted array, not understanding it is an abstract data type typically backed by a heap."
        },
    ],

    # --- Linked Lists ---
    "linked_lists": [
        {
            "id": "linked_list_o1_access",
            "name": "O(1) Random Access Fallacy",
            "description": "Assumes linked lists support O(1) indexed access like arrays, when traversal from the head is required (O(n))."
        },
        {
            "id": "linked_list_memory_advantage",
            "name": "Always Less Memory Fallacy",
            "description": "Believes linked lists always use less memory than arrays, ignoring the per-node pointer overhead that often makes them larger."
        },
        {
            "id": "linked_list_reverse_complexity",
            "name": "Reversal Requires Extra Space",
            "description": "Believes reversing a singly linked list requires O(n) extra space, not recognizing the in-place three-pointer technique."
        },
    ],

    # --- Heaps ---
    "heap": [
        {
            "id": "heap_is_bst",
            "name": "Heap = BST Confusion",
            "description": "Confuses the heap property (parent ≥ children for max-heap) with the BST property (left < root < right), treating them as the same structure."
        },
        {
            "id": "heap_sorted_output",
            "name": "Heap Is Fully Sorted Fallacy",
            "description": "Believes a heap stores elements in fully sorted order, when only the root is guaranteed to be the min/max."
        },
        {
            "id": "heapify_nlogn_fallacy",
            "name": "Build-Heap O(n log n) Fallacy",
            "description": "Believes building a heap from an array is O(n log n), not understanding the O(n) bottom-up heapify proof."
        },
    ],

    # --- Arrays ---
    "arrays": [
        {
            "id": "array_insert_o1",
            "name": "O(1) Insertion Anywhere Fallacy",
            "description": "Assumes inserting at any position in a contiguous array is O(1), ignoring the O(n) shift cost for non-tail insertions."
        },
        {
            "id": "array_vs_list_python",
            "name": "Python List = Linked List Confusion",
            "description": "Confuses Python's list (a dynamic array with O(1) amortized append) with a linked list, leading to wrong complexity assumptions."
        },
        {
            "id": "dynamic_array_exact_doubling",
            "name": "Dynamic Array Amortization Ignorance",
            "description": "Fails to understand amortized O(1) append for dynamic arrays, believing every append triggers an O(n) resize."
        },
    ],

    # --- Complexity Analysis ---
    "complexity_analysis": [
        {
            "id": "big_o_exact_time",
            "name": "Big-O = Exact Runtime Fallacy",
            "description": "Treats Big-O as an exact runtime measurement rather than an asymptotic upper bound that ignores constants and lower-order terms."
        },
        {
            "id": "best_vs_worst_confusion",
            "name": "Best/Average/Worst Conflation",
            "description": "Conflates best-case, average-case, and worst-case complexities, quoting best-case as if it applies universally."
        },
        {
            "id": "space_complexity_ignored",
            "name": "Space Complexity Neglect",
            "description": "Evaluates algorithms solely on time complexity, ignoring space complexity entirely — misses that O(1) space solutions are often preferred."
        },
        {
            "id": "log_base_matters",
            "name": "Logarithm Base Matters Fallacy",
            "description": "Believes log base matters in Big-O notation (e.g., O(log₂ n) ≠ O(log₁₀ n)), when all log bases differ only by a constant factor."
        },
    ],

    # --- Shortest Paths ---
    "shortest_paths": [
        {
            "id": "dijkstra_unweighted_overkill",
            "name": "Dijkstra for Unweighted Graphs",
            "description": "Uses Dijkstra's algorithm on unweighted graphs when simple BFS suffices and is more efficient."
        },
        {
            "id": "bellman_ford_no_negative_cycles",
            "name": "Bellman-Ford Negative Cycle Blindness",
            "description": "Applies Bellman-Ford without checking for negative-weight cycles, which make shortest paths undefined."
        },
        {
            "id": "shortest_path_greedy_always_works",
            "name": "Greedy Always Finds Shortest Path",
            "description": "Believes any greedy traversal finds the shortest path, when only specific algorithms (Dijkstra with non-negative weights) guarantee this."
        },
    ],

    # --- Minimum Spanning Trees ---
    "minimum_spanning_trees": [
        {
            "id": "mst_shortest_path_confusion",
            "name": "MST = Shortest Path Tree Confusion",
            "description": "Confuses a Minimum Spanning Tree with a Shortest Path Tree — the MST minimizes total edge weight, not individual path lengths."
        },
        {
            "id": "mst_unique_assumption",
            "name": "MST Uniqueness Assumption",
            "description": "Assumes every graph has exactly one MST, when multiple MSTs exist if edge weights are not all distinct."
        },
        {
            "id": "kruskal_prim_equivalence",
            "name": "Kruskal Always Beats Prim",
            "description": "Believes Kruskal's algorithm is universally faster than Prim's, ignoring that Prim's is better for dense graphs with adjacency matrices."
        },
    ],

    # --- Divide and Conquer ---
    "divide_and_conquer": [
        {
            "id": "dc_always_log_n",
            "name": "Divide and Conquer = O(log n) Fallacy",
            "description": "Assumes dividing a problem in half always yields O(log n) time, ignoring the combine step's cost (e.g., merge sort is O(n log n), not O(log n))."
        },
        {
            "id": "master_theorem_misapplication",
            "name": "Master Theorem Overreach",
            "description": "Applies the Master Theorem to recurrences that don't fit its standard form (e.g., non-equal subproblem sizes, non-polynomial work functions)."
        },
        {
            "id": "dc_dp_confusion",
            "name": "Divide-and-Conquer vs DP Confusion",
            "description": "Fails to distinguish between D&C (independent subproblems) and DP (overlapping subproblems with shared solutions)."
        },
    ],

    # --- Searching ---
    "searching": [
        {
            "id": "binary_search_unsorted",
            "name": "Binary Search on Unsorted Data",
            "description": "Applies binary search to unsorted arrays, not understanding the sorted-input precondition."
        },
        {
            "id": "linear_search_always_bad",
            "name": "Linear Search Always Inferior",
            "description": "Dismisses linear search entirely, not recognizing it's optimal for unsorted data and outperforms binary search on very small arrays due to cache locality."
        },
        {
            "id": "binary_search_off_by_one",
            "name": "Binary Search Off-by-One Error",
            "description": "Consistently gets binary search boundary conditions wrong (inclusive vs exclusive bounds, mid calculation overflow), a notoriously common implementation bug."
        },
    ],

    # --- AVL Trees ---
    "avl_trees": [
        {
            "id": "avl_single_rotation_always",
            "name": "Single Rotation Always Suffices",
            "description": "Believes a single rotation always restores AVL balance, missing double-rotation cases (left-right, right-left imbalances)."
        },
        {
            "id": "avl_balance_factor_miscount",
            "name": "Balance Factor Miscalculation",
            "description": "Computes balance factor incorrectly (e.g., using node count instead of height difference, or getting the subtraction order wrong)."
        },
        {
            "id": "avl_vs_rbt_performance",
            "name": "AVL Always Better Than Red-Black",
            "description": "Assumes AVL trees are universally better, ignoring that red-black trees have faster insertions/deletions due to fewer rotations."
        },
    ],

    # --- Red-Black Trees ---
    "red_black_trees": [
        {
            "id": "rbt_strict_balance",
            "name": "Red-Black = Perfectly Balanced",
            "description": "Believes red-black trees are perfectly balanced like AVL trees, when they only guarantee that the longest path is at most 2× the shortest."
        },
        {
            "id": "rbt_color_arbitrary",
            "name": "Node Colors Are Arbitrary",
            "description": "Treats red/black coloring as decorative rather than a structural invariant that enforces approximate balance through specific rules."
        },
        {
            "id": "rbt_insertion_always_recolor",
            "name": "Insertion Always Requires Recoloring Only",
            "description": "Believes red-black tree insertions only ever need recoloring, missing the rotation cases required when uncle is black."
        },
    ],
}


def get_misconceptions_for_topic(topic: str) -> List[Misconception]:
    """Returns the list of cataloged misconceptions for a canonical topic,
    or an empty list if the topic has no catalog entries."""
    return MISCONCEPTIONS.get(topic, [])


def get_all_misconception_ids() -> Dict[str, str]:
    """Returns a flat {id: name} map of every misconception in the catalog,
    useful for the profile page's frequency chart labels."""
    result = {}
    for entries in MISCONCEPTIONS.values():
        for m in entries:
            result[m["id"]] = m["name"]
    return result
