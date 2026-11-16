"""
The structural layer of the Adaptive Roadmap: a prerequisite DAG and relative
difficulty weights over canonical DSA topics (`retrieval/topic_map.py`)
— no fine-to-coarse topic mapping needed here, unlike a from-scratch design,
since `topic_map.py` already resolves every raw alias to one of these
canonical topics everywhere else in the system.

Topic list is aligned with real-world DSA interview preparation:
NeetCode 150, LeetCode Top Interview 150, Striver's A2Z DSA Sheet,
and standard FAANG interview curricula.

This module is purely structural — graph traversal only. It never calls an
LLM or decides study order; that's topic_ordering.py's job, constrained by
what this module says is even eligible.
"""

import os
import sys
from typing import Dict, List, Set

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "retrieval"))
from topic_map import TOPIC_ALIASES  # noqa: E402

# topic -> prerequisite canonical topics. Every topic has an entry (roots map to []).
# Curated against standard DSA interview prep progression:
# Foundations → Core Data Structures → Patterns → Advanced Topics → Algorithms
PREREQUISITES: Dict[str, List[str]] = {
    # --- Foundations ---
    "algorithm_foundations": [],
    "complexity_analysis": ["algorithm_foundations"],

    # --- Core Data Structures ---
    "arrays": ["algorithm_foundations"],
    "linked_lists": ["arrays"],
    "strings": ["arrays"],
    "stacks": ["arrays"],
    "queues": ["arrays"],
    "hashing": ["arrays"],

    # --- Trees ---
    "binary_search_trees": ["linked_lists", "recursion_backtracking"],
    "avl_trees": ["binary_search_trees"],
    "red_black_trees": ["binary_search_trees"],
    "tries": ["strings", "hashing"],

    # --- Heap ---
    "heap": ["arrays", "binary_search_trees"],

    # --- Fundamental Patterns (bread-and-butter interview topics) ---
    "two_pointers": ["arrays", "linked_lists"],
    "sliding_window": ["arrays", "hashing"],
    "binary_search": ["arrays", "complexity_analysis"],

    # --- Sorting & Searching ---
    "sorting": ["arrays", "complexity_analysis"],
    "searching": ["arrays", "complexity_analysis"],

    # --- Recursion & Backtracking ---
    "recursion_backtracking": ["complexity_analysis"],
    "divide_and_conquer": ["recursion_backtracking", "sorting"],

    # --- Intermediate Patterns ---
    "monotonic_stack": ["stacks", "arrays"],
    "bit_manipulation": ["arrays"],

    # --- Graph Algorithms ---
    "disjoint_sets": ["arrays"],
    "graph_algorithms": ["queues", "stacks", "recursion_backtracking", "hashing"],
    "shortest_paths": ["graph_algorithms", "heap"],
    "minimum_spanning_trees": ["graph_algorithms", "disjoint_sets", "heap"],
    "maximum_flow": ["graph_algorithms"],

    # --- Advanced Algorithmic Paradigms ---
    "greedy_algorithms": ["sorting", "graph_algorithms"],
    "dynamic_programming": ["recursion_backtracking", "divide_and_conquer"],

    # --- String Algorithms ---
    "string_matching": ["strings", "hashing"],
}

# Relative study-effort weight per topic (hours-per-unit-weight is derived at
# allocation time from the student's time budget) — calibrated for interview prep.
# Higher = more time-consuming / cognitively demanding to master.
TOPIC_WEIGHTS: Dict[str, float] = {
    # Foundations
    "algorithm_foundations": 0.5,
    "complexity_analysis": 1.0,

    # Core Data Structures
    "arrays": 1.0,
    "linked_lists": 1.2,
    "strings": 1.0,
    "stacks": 0.8,
    "queues": 0.8,
    "hashing": 1.2,

    # Trees
    "binary_search_trees": 1.8,
    "avl_trees": 1.6,
    "red_black_trees": 1.8,
    "tries": 1.6,

    # Heap
    "heap": 1.5,

    # Fundamental Patterns — high interview ROI
    "two_pointers": 1.2,
    "sliding_window": 1.2,
    "binary_search": 1.4,

    # Sorting & Searching
    "sorting": 1.5,
    "searching": 1.0,

    # Recursion
    "recursion_backtracking": 2.5,
    "divide_and_conquer": 1.8,

    # Intermediate Patterns
    "monotonic_stack": 1.4,
    "bit_manipulation": 1.3,

    # Graph Algorithms
    "disjoint_sets": 1.3,
    "graph_algorithms": 2.8,
    "shortest_paths": 2.2,
    "minimum_spanning_trees": 2.0,
    "maximum_flow": 2.5,

    # Advanced Paradigms
    "greedy_algorithms": 1.8,
    "dynamic_programming": 3.5,

    # String Algorithms
    "string_matching": 1.6,
}

CANONICAL_TOPICS = sorted(TOPIC_ALIASES.keys())

# Fail fast if PREREQUISITES/TOPIC_WEIGHTS ever drift from topic_map.py's
# canonical set (e.g. a new topic added there without updating this graph)
# instead of silently operating on two different topic universes.
_missing_prereqs = set(CANONICAL_TOPICS) - set(PREREQUISITES)
_missing_weights = set(CANONICAL_TOPICS) - set(TOPIC_WEIGHTS)
if _missing_prereqs or _missing_weights:
    raise RuntimeError(
        f"roadmap/concept_graph.py is out of sync with topic_map.py's canonical topics. "
        f"Missing from PREREQUISITES: {_missing_prereqs or 'none'}; "
        f"missing from TOPIC_WEIGHTS: {_missing_weights or 'none'}."
    )


def get_prerequisites_closure(topic: str) -> Set[str]:
    """Full transitive prerequisite closure for a topic (iterative BFS)."""
    visited: Set[str] = set()
    queue = list(PREREQUISITES.get(topic, []))
    while queue:
        current = queue.pop(0)
        if current in visited:
            continue
        visited.add(current)
        queue.extend(PREREQUISITES.get(current, []))
    return visited


def expand_weak_topics(weak_topics: List[str], mastered_topics: List[str]) -> List[str]:
    """Weak topics + their full prerequisite closure, minus anything already mastered."""
    mastered_set = set(mastered_topics)
    candidates: Set[str] = set()
    for topic in weak_topics:
        candidates.add(topic)
        candidates.update(get_prerequisites_closure(topic))
    candidates -= mastered_set
    return list(candidates)


def get_eligible_topics(candidates: List[str], completed: List[str], mastered: List[str]) -> List[str]:
    """A topic is eligible once every prerequisite is completed-in-roadmap or already mastered."""
    satisfied = set(completed) | set(mastered)
    return [t for t in candidates if set(PREREQUISITES.get(t, [])).issubset(satisfied)]


def get_unlock_map(eligible: List[str], remaining: List[str], completed: List[str],
                    mastered: List[str]) -> Dict[str, List[str]]:
    """For each eligible topic, which currently-blocked remaining topics would it unlock next."""
    satisfied = set(completed) | set(mastered)
    not_yet_eligible = set(remaining) - set(eligible)
    unlock_map: Dict[str, List[str]] = {}
    for candidate in eligible:
        new_satisfied = satisfied | {candidate}
        unlock_map[candidate] = [
            t for t in not_yet_eligible if set(PREREQUISITES.get(t, [])).issubset(new_satisfied)
        ]
    return unlock_map
