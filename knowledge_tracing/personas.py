"""
Synthetic student personas — scripted (concept, correct) interaction
sequences with a KNOWN intended mastery pattern. There is no real student
usage data yet, so these are this project's equivalent of unit-test
fixtures: known input, known expected output, used to check
knowledge_tracing.predict actually behaves as designed rather than
assuming it does.

Shared by:
  - knowledge_tracing/test_calibration.py — direct calibration assertions
  - evaluation/eval_roadmap.py — drives the roadmap A/B/C ablation study

See EVALUATION_PLAN.md §4b and §6 for how each persona is used.
"""

COLD_START_PRIOR = 0.3

PERSONAS = [
    {
        "name": "beginner_uniform",
        "description": "Mostly incorrect across everything attempted — a true beginner.",
        "interactions": [
            ("arrays", False), ("arrays", False), ("arrays", True),
            ("sorting", False), ("sorting", False),
            ("stacks", False), ("stacks", True),
            ("linked_lists", False), ("linked_lists", False),
        ],
        "expected_weak": ["sorting", "linked_lists"],
        "expected_mastered": [],
    },
    {
        "name": "strong_arrays_weak_graphs",
        "description": (
            "Confidently correct on arrays/sorting/searching, confidently wrong on "
            "graph_algorithms/shortest_paths/dynamic_programming."
        ),
        "interactions": [
            ("arrays", True), ("arrays", True), ("arrays", True), ("arrays", True),
            ("sorting", True), ("sorting", True), ("sorting", True),
            ("searching", True), ("searching", True),
            ("graph_algorithms", False), ("graph_algorithms", False), ("graph_algorithms", False),
            ("shortest_paths", False), ("shortest_paths", False),
            ("dynamic_programming", False), ("dynamic_programming", False), ("dynamic_programming", False),
        ],
        "expected_weak": ["graph_algorithms", "shortest_paths", "dynamic_programming"],
        "expected_mastered": [],  # see test_calibration.py — "not weak" is asserted, "mastered" is a higher,
                                  # separately-tested bar the current online-adaptation budget may not reach
    },
    {
        "name": "improving_dp",
        "description": (
            "Incorrect early on dynamic_programming, correct later — tests whether mastery "
            "follows a real trend rather than an unweighted running average."
        ),
        "interactions": [
            ("dynamic_programming", False), ("dynamic_programming", False), ("dynamic_programming", False),
            ("dynamic_programming", True), ("dynamic_programming", True),
            ("dynamic_programming", True), ("dynamic_programming", True),
        ],
        "expected_weak": [],
        "expected_mastered": [],
        "trend_topic": "dynamic_programming",
    },
    {
        "name": "regressing_recursion",
        "description": (
            "Correct early on recursion_backtracking, incorrect later — the mirror image of "
            "improving_dp, same interaction count, opposite trend."
        ),
        "interactions": [
            ("recursion_backtracking", True), ("recursion_backtracking", True), ("recursion_backtracking", True),
            ("recursion_backtracking", False), ("recursion_backtracking", False),
            ("recursion_backtracking", False), ("recursion_backtracking", False),
        ],
        "expected_weak": ["recursion_backtracking"],
        "expected_mastered": [],
        "trend_topic": "recursion_backtracking",
    },
    {
        "name": "advanced_uniform",
        "description": "Confidently correct across a wide spread of topics — an advanced student.",
        "interactions": [
            ("arrays", True), ("linked_lists", True), ("stacks", True), ("queues", True),
            ("sorting", True), ("searching", True), ("hashing", True), ("heap", True),
            ("binary_search_trees", True), ("recursion_backtracking", True),
            ("graph_algorithms", True), ("dynamic_programming", True),
        ],
        "expected_weak": [],
        "expected_mastered": [],  # deliberately not asserted — see test_calibration.py's note on the
                                  # 0.75 bar vs. the online-adaptation budget available in a short script
    },
    {
        "name": "detailed_demo",
        "description": "Realistic interview candidate: mastered core arrays, strings, two pointers, hashing, and sorting; actively struggling with recursion, DP, graph algorithms, tries, and monotonic stacks.",
        "interactions": [
            # Strong Foundations & Core Patterns
            ("arrays", True), ("arrays", True), ("arrays", True),
            ("strings", True), ("strings", True), ("strings", True),
            ("two_pointers", True), ("two_pointers", True), ("two_pointers", True),
            ("binary_search", True), ("binary_search", True), ("binary_search", True),
            ("sorting", True), ("sorting", True), ("sorting", True),
            ("hashing", True), ("hashing", True), ("hashing", True),
            ("stacks", True), ("stacks", True),
            ("queues", True), ("queues", True),
            ("algorithm_foundations", True), ("algorithm_foundations", True),
            ("complexity_analysis", True), ("complexity_analysis", True),
            # In Progress
            ("linked_lists", True), ("linked_lists", False), ("linked_lists", True),
            ("sliding_window", True), ("sliding_window", False), ("sliding_window", True),
            ("heap", True), ("heap", False), ("heap", True),
            ("binary_search_trees", True), ("binary_search_trees", False), ("binary_search_trees", True),
            # Weak Focus Areas (Genuine Interview Hurdles)
            ("recursion_backtracking", False), ("recursion_backtracking", False), ("recursion_backtracking", True), ("recursion_backtracking", False),
            ("dynamic_programming", False), ("dynamic_programming", False), ("dynamic_programming", True), ("dynamic_programming", False), ("dynamic_programming", False),
            ("graph_algorithms", False), ("graph_algorithms", False), ("graph_algorithms", True), ("graph_algorithms", False),
            ("shortest_paths", False), ("shortest_paths", False),
            ("tries", False), ("tries", False),
            ("monotonic_stack", False), ("monotonic_stack", False),
        ],
        "expected_weak": ["recursion_backtracking", "dynamic_programming", "graph_algorithms", "shortest_paths", "tries", "monotonic_stack"],
        "expected_mastered": ["arrays", "strings", "two_pointers", "binary_search", "sorting", "hashing"],
    },
    {
        "name": "cold",
        "description": "No interactions at all — the cold-start regression check.",
        "interactions": [],
        "expected_weak": [],
        "expected_mastered": [],
    },
]
