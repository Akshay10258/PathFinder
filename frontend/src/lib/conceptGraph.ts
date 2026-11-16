// Mirrors roadmap/concept_graph.py's PREREQUISITES dict — the manually
// curated prerequisite DAG over the 34 canonical DSA topics. Duplicated here
// (rather than fetched) because it's static structural data the roadmap
// graph visualization needs purely client-side for layout; the backend
// already enforces it when ordering a roadmap, so this is presentation only,
// never used to decide what's "correct". Keep in sync if concept_graph.py's
// PREREQUISITES table changes.
export const PREREQUISITES: Record<string, string[]> = {
  algorithm_foundations: [],
  complexity_analysis: ["algorithm_foundations"],
  basic_data_structures: ["algorithm_foundations"],
  arrays: ["basic_data_structures"],
  linked_lists: ["arrays"],
  strings: ["arrays"],
  stacks: ["arrays", "linked_lists"],
  queues: ["arrays", "linked_lists"],
  recursion_backtracking: ["complexity_analysis"],
  peak_finding: ["arrays"],
  searching: ["arrays", "complexity_analysis"],
  sorting: ["arrays", "complexity_analysis"],
  divide_and_conquer: ["recursion_backtracking", "complexity_analysis"],
  hashing: ["arrays", "linked_lists"],
  heap: ["arrays", "sorting"],
  binary_search_trees: ["linked_lists", "recursion_backtracking"],
  avl_trees: ["binary_search_trees"],
  red_black_trees: ["binary_search_trees"],
  b_trees: ["binary_search_trees"],
  augmenting_data_structures: ["binary_search_trees"],
  disjoint_sets: ["arrays", "linked_lists"],
  graph_algorithms: ["queues", "stacks", "recursion_backtracking"],
  shortest_paths: ["graph_algorithms", "heap"],
  minimum_spanning_trees: ["graph_algorithms", "disjoint_sets", "heap"],
  maximum_flow: ["graph_algorithms"],
  greedy_algorithms: ["sorting", "graph_algorithms"],
  dynamic_programming: ["recursion_backtracking", "divide_and_conquer"],
  amortized_analysis: ["complexity_analysis", "arrays"],
  string_matching: ["strings", "hashing"],
  document_distance: ["hashing", "strings"],
  computational_geometry: ["sorting", "divide_and_conquer"],
  numerics: ["complexity_analysis"],
  complexity_theory: ["complexity_analysis", "dynamic_programming"],
  parallel_architecture: ["complexity_analysis"],
};

/** Longest-path topological level per node, restricted to `nodeIds` and the
 * subset of `edges` between them — shared layout primitive for both the
 * Roadmap DAG view and the full 34-topic Mastery Constellation. Kahn's
 * algorithm with level = max(level[current]+1, level[target]) on relax,
 * instead of plain BFS depth, so a node with multiple prerequisite paths
 * lands after the longest one, not the shortest. */
export function computeLevels(nodeIds: string[], edges: { source: string; target: string }[]): Record<string, number> {
  const bySource: Record<string, string[]> = {};
  const indegree: Record<string, number> = {};
  nodeIds.forEach((id) => (indegree[id] = 0));
  for (const e of edges) {
    (bySource[e.source] ??= []).push(e.target);
    indegree[e.target] = (indegree[e.target] || 0) + 1;
  }

  const level: Record<string, number> = {};
  const queue: string[] = [];
  nodeIds.forEach((id) => {
    if (indegree[id] === 0) {
      level[id] = 0;
      queue.push(id);
    }
  });

  const remaining = { ...indegree };
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of bySource[cur] || []) {
      level[next] = Math.max(level[next] ?? 0, level[cur] + 1);
      remaining[next] -= 1;
      if (remaining[next] === 0) queue.push(next);
    }
  }
  // Any node untouched by the BFS (shouldn't happen for an acyclic graph, but
  // stay robust rather than crash the whole page if concept_graph.py's data
  // ever changes shape) falls back to level 0.
  nodeIds.forEach((id) => {
    if (!(id in level)) level[id] = 0;
  });
  return level;
}
