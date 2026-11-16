/** Curated LeetCode & GFG problem database.
 *  Single source of truth for Practice, Tutor, and Roadmap pages.
 *  Mastery brackets: easy <= 0.4 | medium 0.4-0.7 | hard > 0.7
 */

export type Platform = "leetcode" | "gfg";
export type Difficulty = "easy" | "medium" | "hard";

export interface Problem {
  id: string;
  title: string;
  platform: Platform;
  url: string;
  difficulty: Difficulty;
  topic: string;
  tags: string[];
  why: string;
  lcNumber?: number;
}

const PROBLEMS: Problem[] = [
  // ARRAYS
  { id:"lc-1", title:"Two Sum", platform:"leetcode", url:"https://leetcode.com/problems/two-sum/", difficulty:"easy", topic:"arrays", tags:["hash-map"], why:"Foundation of hash-map lookup; almost every interview starts here.", lcNumber:1 },
  { id:"lc-121", title:"Best Time to Buy and Sell Stock", platform:"leetcode", url:"https://leetcode.com/problems/best-time-to-buy-and-sell-stock/", difficulty:"easy", topic:"arrays", tags:["greedy","single-pass"], why:"Classic single-pass minimum-tracking; teaches O(n) over brute-force.", lcNumber:121 },
  { id:"lc-238", title:"Product of Array Except Self", platform:"leetcode", url:"https://leetcode.com/problems/product-of-array-except-self/", difficulty:"medium", topic:"arrays", tags:["prefix-product"], why:"No division allowed forces prefix/suffix pattern — high-frequency FAANG problem.", lcNumber:238 },
  { id:"lc-53", title:"Maximum Subarray (Kadane)", platform:"leetcode", url:"https://leetcode.com/problems/maximum-subarray/", difficulty:"medium", topic:"arrays", tags:["kadane","dp"], why:"Kadane algorithm is the archetypal running-state DP pattern.", lcNumber:53 },
  { id:"lc-11", title:"Container With Most Water", platform:"leetcode", url:"https://leetcode.com/problems/container-with-most-water/", difficulty:"medium", topic:"arrays", tags:["two-pointer"], why:"Two-pointer shrink reasoning is a key interview technique.", lcNumber:11 },
  { id:"lc-42", title:"Trapping Rain Water", platform:"leetcode", url:"https://leetcode.com/problems/trapping-rain-water/", difficulty:"hard", topic:"arrays", tags:["two-pointer","stack"], why:"Tests left/right precomputation and two-pointer simultaneously; top 10 FAANG asks.", lcNumber:42 },
  { id:"lc-4", title:"Median of Two Sorted Arrays", platform:"leetcode", url:"https://leetcode.com/problems/median-of-two-sorted-arrays/", difficulty:"hard", topic:"arrays", tags:["binary-search"], why:"O(log(m+n)) requirement forces binary search on sorted arrays.", lcNumber:4 },

  // HASHING
  { id:"lc-49", title:"Group Anagrams", platform:"leetcode", url:"https://leetcode.com/problems/group-anagrams/", difficulty:"medium", topic:"hashing", tags:["hash-map","sorting"], why:"Canonical hash-map grouping by sorted key or character frequency.", lcNumber:49 },
  { id:"lc-128", title:"Longest Consecutive Sequence", platform:"leetcode", url:"https://leetcode.com/problems/longest-consecutive-sequence/", difficulty:"medium", topic:"hashing", tags:["hash-set"], why:"Hash-set enables O(n) streak detection otherwise requiring O(n log n) sort.", lcNumber:128 },
  { id:"lc-347", title:"Top K Frequent Elements", platform:"leetcode", url:"https://leetcode.com/problems/top-k-frequent-elements/", difficulty:"medium", topic:"hashing", tags:["bucket-sort","frequency"], why:"Bucket sort via frequency map is a core hash+sort optimization.", lcNumber:347 },
  { id:"lc-560", title:"Subarray Sum Equals K", platform:"leetcode", url:"https://leetcode.com/problems/subarray-sum-equals-k/", difficulty:"medium", topic:"hashing", tags:["prefix-sum","hash-map"], why:"Prefix-sum + hash-map for O(n) subarray sum — ubiquitous pattern.", lcNumber:560 },
  { id:"lc-146", title:"LRU Cache", platform:"leetcode", url:"https://leetcode.com/problems/lru-cache/", difficulty:"medium", topic:"hashing", tags:["doubly-linked-list","hash-map","design"], why:"Hash-map + doubly-linked-list design — appears verbatim in System Design rounds.", lcNumber:146 },
  { id:"lc-380", title:"Insert Delete GetRandom O(1)", platform:"leetcode", url:"https://leetcode.com/problems/insert-delete-getrandom-o1/", difficulty:"medium", topic:"hashing", tags:["design","random"], why:"Array + hash-map combo for O(1) random access by index swap.", lcNumber:380 },

  // STACKS
  { id:"lc-20", title:"Valid Parentheses", platform:"leetcode", url:"https://leetcode.com/problems/valid-parentheses/", difficulty:"easy", topic:"stacks", tags:["matching"], why:"The definitive stack problem — taught in every intro CS course.", lcNumber:20 },
  { id:"lc-155", title:"Min Stack", platform:"leetcode", url:"https://leetcode.com/problems/min-stack/", difficulty:"medium", topic:"stacks", tags:["design","auxiliary-stack"], why:"Auxiliary-stack pattern for O(1) min query.", lcNumber:155 },
  { id:"lc-739", title:"Daily Temperatures", platform:"leetcode", url:"https://leetcode.com/problems/daily-temperatures/", difficulty:"medium", topic:"stacks", tags:["monotonic-stack"], why:"Monotonic decreasing stack — gateway problem to this high-frequency pattern.", lcNumber:739 },
  { id:"lc-84", title:"Largest Rectangle in Histogram", platform:"leetcode", url:"https://leetcode.com/problems/largest-rectangle-in-histogram/", difficulty:"hard", topic:"stacks", tags:["monotonic-stack","area"], why:"Monotonic stack at expert level; frequently used as a subproblem.", lcNumber:84 },
  { id:"lc-150", title:"Evaluate Reverse Polish Notation", platform:"leetcode", url:"https://leetcode.com/problems/evaluate-reverse-polish-notation/", difficulty:"medium", topic:"stacks", tags:["expression-evaluation"], why:"Stack-based expression evaluation is core CS knowledge.", lcNumber:150 },

  // QUEUES
  { id:"lc-225", title:"Implement Stack using Queues", platform:"leetcode", url:"https://leetcode.com/problems/implement-stack-using-queues/", difficulty:"easy", topic:"queues", tags:["design","amortized"], why:"Tests queue semantics and amortized analysis.", lcNumber:225 },
  { id:"lc-239", title:"Sliding Window Maximum", platform:"leetcode", url:"https://leetcode.com/problems/sliding-window-maximum/", difficulty:"hard", topic:"queues", tags:["deque","monotonic-queue"], why:"Monotonic deque for O(n) sliding max — extremely high frequency.", lcNumber:239 },
  { id:"lc-933", title:"Number of Recent Calls", platform:"leetcode", url:"https://leetcode.com/problems/number-of-recent-calls/", difficulty:"easy", topic:"queues", tags:["sliding-window","deque"], why:"Simple queue-based sliding window — intro to time-window problems.", lcNumber:933 },
  { id:"lc-232", title:"Implement Queue using Stacks", platform:"leetcode", url:"https://leetcode.com/problems/implement-queue-using-stacks/", difficulty:"easy", topic:"queues", tags:["amortized-O(1)","two-stacks"], why:"Two-stack queue has O(1) amortized — perfect amortized analysis exercise.", lcNumber:232 },

  // LINKED LISTS
  { id:"lc-206", title:"Reverse Linked List", platform:"leetcode", url:"https://leetcode.com/problems/reverse-linked-list/", difficulty:"easy", topic:"linked_lists", tags:["in-place","pointer"], why:"Canonical pointer manipulation — basis for all list reversal variants.", lcNumber:206 },
  { id:"lc-21", title:"Merge Two Sorted Lists", platform:"leetcode", url:"https://leetcode.com/problems/merge-two-sorted-lists/", difficulty:"easy", topic:"linked_lists", tags:["merge","two-pointer"], why:"Core merge pattern used in merge sort and k-way merge.", lcNumber:21 },
  { id:"lc-141", title:"Linked List Cycle", platform:"leetcode", url:"https://leetcode.com/problems/linked-list-cycle/", difficulty:"easy", topic:"linked_lists", tags:["floyd","slow-fast"], why:"Floyd cycle detection — the most important O(1) space algorithm for lists.", lcNumber:141 },
  { id:"lc-19", title:"Remove Nth Node From End", platform:"leetcode", url:"https://leetcode.com/problems/remove-nth-node-from-end-of-list/", difficulty:"medium", topic:"linked_lists", tags:["two-pointer","gap"], why:"Two-pointer with fixed gap — elegant single-pass approach.", lcNumber:19 },
  { id:"lc-143", title:"Reorder List", platform:"leetcode", url:"https://leetcode.com/problems/reorder-list/", difficulty:"medium", topic:"linked_lists", tags:["find-middle","reverse","merge"], why:"Combines three sub-skills: mid detection, reversal, and merge.", lcNumber:143 },
  { id:"lc-23", title:"Merge K Sorted Lists", platform:"leetcode", url:"https://leetcode.com/problems/merge-k-sorted-lists/", difficulty:"hard", topic:"linked_lists", tags:["heap","divide-and-conquer"], why:"K-way merge with min-heap is a core distributed systems pattern.", lcNumber:23 },
  { id:"lc-25", title:"Reverse Nodes in K-Group", platform:"leetcode", url:"https://leetcode.com/problems/reverse-nodes-in-k-group/", difficulty:"hard", topic:"linked_lists", tags:["in-place","group-reversal"], why:"Most advanced linked list pointer manipulation — Google favourite.", lcNumber:25 },

  // SEARCHING / BINARY SEARCH
  { id:"lc-704", title:"Binary Search", platform:"leetcode", url:"https://leetcode.com/problems/binary-search/", difficulty:"easy", topic:"searching", tags:["classic"], why:"Pure binary search template — boundary conditions lo/mid/hi.", lcNumber:704 },
  { id:"lc-33", title:"Search in Rotated Sorted Array", platform:"leetcode", url:"https://leetcode.com/problems/search-in-rotated-sorted-array/", difficulty:"medium", topic:"searching", tags:["rotation","binary-search"], why:"Modified binary search on disrupted monotonicity — extremely high frequency.", lcNumber:33 },
  { id:"lc-153", title:"Find Minimum in Rotated Sorted Array", platform:"leetcode", url:"https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/", difficulty:"medium", topic:"searching", tags:["rotation","pivot"], why:"Pivot-finding variant of binary search — prerequisite to LC 33.", lcNumber:153 },
  { id:"lc-74", title:"Search a 2D Matrix", platform:"leetcode", url:"https://leetcode.com/problems/search-a-2d-matrix/", difficulty:"medium", topic:"searching", tags:["2d-binary-search"], why:"Flattened index mapping for binary search in 2D matrix.", lcNumber:74 },
  { id:"lc-875", title:"Koko Eating Bananas", platform:"leetcode", url:"https://leetcode.com/problems/koko-eating-bananas/", difficulty:"medium", topic:"searching", tags:["binary-search-on-answer"], why:"Binary search on the answer — powerful generalised technique.", lcNumber:875 },
  { id:"lc-981", title:"Time Based Key-Value Store", platform:"leetcode", url:"https://leetcode.com/problems/time-based-key-value-store/", difficulty:"medium", topic:"searching", tags:["bisect","design"], why:"Binary search on timestamps — System Design x Algorithms crossover.", lcNumber:981 },

  // SORTING
  { id:"lc-912", title:"Sort an Array (Merge/Quick Sort)", platform:"leetcode", url:"https://leetcode.com/problems/sort-an-array/", difficulty:"medium", topic:"sorting", tags:["merge-sort","quick-sort"], why:"Implement merge sort or quicksort from scratch — tests O(n log n) understanding.", lcNumber:912 },
  { id:"lc-75", title:"Sort Colors (Dutch National Flag)", platform:"leetcode", url:"https://leetcode.com/problems/sort-colors/", difficulty:"medium", topic:"sorting", tags:["3-way-partition","in-place"], why:"Dijkstra 3-way partition — elegant in-place O(n) single pass.", lcNumber:75 },
  { id:"lc-215", title:"Kth Largest Element", platform:"leetcode", url:"https://leetcode.com/problems/kth-largest-element-in-an-array/", difficulty:"medium", topic:"sorting", tags:["quickselect","heap"], why:"Quickselect for O(n) average Kth-order statistic.", lcNumber:215 },
  { id:"lc-56", title:"Merge Intervals", platform:"leetcode", url:"https://leetcode.com/problems/merge-intervals/", difficulty:"medium", topic:"sorting", tags:["sort-by-start","sweep"], why:"Sort-then-sweep is the archetype for interval scheduling problems.", lcNumber:56 },
  { id:"lc-179", title:"Largest Number (Custom Sort)", platform:"leetcode", url:"https://leetcode.com/problems/largest-number/", difficulty:"medium", topic:"sorting", tags:["custom-comparator"], why:"Custom comparator sort — requires reasoning about transitive ordering.", lcNumber:179 },

  // DYNAMIC PROGRAMMING
  { id:"lc-70", title:"Climbing Stairs", platform:"leetcode", url:"https://leetcode.com/problems/climbing-stairs/", difficulty:"easy", topic:"dynamic_programming", tags:["fibonacci","memoization"], why:"The hello-world of DP — establishes recurrence to tabulation pipeline.", lcNumber:70 },
  { id:"lc-322", title:"Coin Change", platform:"leetcode", url:"https://leetcode.com/problems/coin-change/", difficulty:"medium", topic:"dynamic_programming", tags:["unbounded-knapsack"], why:"Unbounded knapsack template — the canonical DP optimization problem.", lcNumber:322 },
  { id:"lc-300", title:"Longest Increasing Subsequence", platform:"leetcode", url:"https://leetcode.com/problems/longest-increasing-subsequence/", difficulty:"medium", topic:"dynamic_programming", tags:["LIS","patience-sort"], why:"LIS appears in alignment, scheduling, and competitive programming.", lcNumber:300 },
  { id:"lc-1143", title:"Longest Common Subsequence", platform:"leetcode", url:"https://leetcode.com/problems/longest-common-subsequence/", difficulty:"medium", topic:"dynamic_programming", tags:["LCS","2D-dp"], why:"LCS is the foundation of diff tools, bioinformatics alignment, and edit distance.", lcNumber:1143 },
  { id:"lc-416", title:"Partition Equal Subset Sum", platform:"leetcode", url:"https://leetcode.com/problems/partition-equal-subset-sum/", difficulty:"medium", topic:"dynamic_programming", tags:["0-1-knapsack","subset-sum"], why:"0/1 knapsack reduced to subset-sum — the gateway to DP on subsets.", lcNumber:416 },
  { id:"lc-72", title:"Edit Distance", platform:"leetcode", url:"https://leetcode.com/problems/edit-distance/", difficulty:"hard", topic:"dynamic_programming", tags:["Levenshtein","2D-dp"], why:"Edit distance is fundamental to NLP, spell-checking and DNA sequencing.", lcNumber:72 },
  { id:"lc-312", title:"Burst Balloons", platform:"leetcode", url:"https://leetcode.com/problems/burst-balloons/", difficulty:"hard", topic:"dynamic_programming", tags:["interval-dp"], why:"Interval DP on ranges — same thinking as matrix chain multiplication.", lcNumber:312 },
  { id:"lc-10", title:"Regular Expression Matching", platform:"leetcode", url:"https://leetcode.com/problems/regular-expression-matching/", difficulty:"hard", topic:"dynamic_programming", tags:["regex","2D-dp"], why:"State machine DP for regex — classic at top tech companies.", lcNumber:10 },

  // GRAPH ALGORITHMS
  { id:"lc-200", title:"Number of Islands", platform:"leetcode", url:"https://leetcode.com/problems/number-of-islands/", difficulty:"medium", topic:"graph_algorithms", tags:["BFS","DFS","grid"], why:"Grid BFS/DFS — the entry point for all 2D graph traversal problems.", lcNumber:200 },
  { id:"lc-133", title:"Clone Graph", platform:"leetcode", url:"https://leetcode.com/problems/clone-graph/", difficulty:"medium", topic:"graph_algorithms", tags:["BFS","hash-map"], why:"Deep-copy with cycle detection — tests understanding of visited sets.", lcNumber:133 },
  { id:"lc-207", title:"Course Schedule (Topological Sort)", platform:"leetcode", url:"https://leetcode.com/problems/course-schedule/", difficulty:"medium", topic:"graph_algorithms", tags:["topological-sort","cycle-detection"], why:"Kahn algorithm / DFS cycle detection on DAGs — core for dependency management.", lcNumber:207 },
  { id:"lc-417", title:"Pacific Atlantic Water Flow", platform:"leetcode", url:"https://leetcode.com/problems/pacific-atlantic-water-flow/", difficulty:"medium", topic:"graph_algorithms", tags:["multi-source-BFS"], why:"Multi-source BFS thinking — a key BFS generalisation.", lcNumber:417 },
  { id:"lc-684", title:"Redundant Connection", platform:"leetcode", url:"https://leetcode.com/problems/redundant-connection/", difficulty:"medium", topic:"graph_algorithms", tags:["union-find","cycle"], why:"Union-Find for cycle detection in undirected graphs.", lcNumber:684 },
  { id:"lc-127", title:"Word Ladder", platform:"leetcode", url:"https://leetcode.com/problems/word-ladder/", difficulty:"hard", topic:"graph_algorithms", tags:["BFS","shortest-path"], why:"BFS on implicit graphs — bidirectional BFS optimisation.", lcNumber:127 },
  { id:"lc-994", title:"Rotting Oranges", platform:"leetcode", url:"https://leetcode.com/problems/rotting-oranges/", difficulty:"medium", topic:"graph_algorithms", tags:["multi-source-BFS","grid"], why:"Multi-source BFS from multiple starting points simultaneously.", lcNumber:994 },

  // RECURSION & BACKTRACKING
  { id:"lc-78", title:"Subsets", platform:"leetcode", url:"https://leetcode.com/problems/subsets/", difficulty:"medium", topic:"recursion_backtracking", tags:["power-set","backtracking"], why:"Power set generation via backtracking — foundation of all subset problems.", lcNumber:78 },
  { id:"lc-46", title:"Permutations", platform:"leetcode", url:"https://leetcode.com/problems/permutations/", difficulty:"medium", topic:"recursion_backtracking", tags:["permutation","swap"], why:"Full permutation — canonical backtracking with used[] array.", lcNumber:46 },
  { id:"lc-39", title:"Combination Sum", platform:"leetcode", url:"https://leetcode.com/problems/combination-sum/", difficulty:"medium", topic:"recursion_backtracking", tags:["backtracking","pruning"], why:"Unbounded selection with pruning — teaches include/exclude decisions.", lcNumber:39 },
  { id:"lc-79", title:"Word Search", platform:"leetcode", url:"https://leetcode.com/problems/word-search/", difficulty:"medium", topic:"recursion_backtracking", tags:["DFS","visited-grid"], why:"2D DFS with backtracking on a visited grid — extremely common.", lcNumber:79 },
  { id:"lc-51", title:"N-Queens", platform:"leetcode", url:"https://leetcode.com/problems/n-queens/", difficulty:"hard", topic:"recursion_backtracking", tags:["constraint-satisfaction"], why:"Constraint satisfaction with diagonal pruning — the definitive hard backtracking problem.", lcNumber:51 },

  // TREES / BINARY TREES
  { id:"lc-104", title:"Maximum Depth of Binary Tree", platform:"leetcode", url:"https://leetcode.com/problems/maximum-depth-of-binary-tree/", difficulty:"easy", topic:"trees", tags:["DFS","recursion"], why:"Foundational tree DFS recursion — establishes the base+recurse pattern.", lcNumber:104 },
  { id:"lc-226", title:"Invert Binary Tree", platform:"leetcode", url:"https://leetcode.com/problems/invert-binary-tree/", difficulty:"easy", topic:"trees", tags:["BFS","DFS"], why:"Classic tree mirror problem — recursive and iterative BFS forms.", lcNumber:226 },
  { id:"lc-102", title:"Binary Tree Level Order Traversal", platform:"leetcode", url:"https://leetcode.com/problems/binary-tree-level-order-traversal/", difficulty:"medium", topic:"trees", tags:["BFS","level-by-level"], why:"BFS queue processing by level — template for all level-order problems.", lcNumber:102 },
  { id:"lc-124", title:"Binary Tree Maximum Path Sum", platform:"leetcode", url:"https://leetcode.com/problems/binary-tree-maximum-path-sum/", difficulty:"hard", topic:"trees", tags:["post-order","global-max"], why:"Post-order accumulation with global running max — archetypical hard tree problem.", lcNumber:124 },
  { id:"lc-105", title:"Construct Tree from Preorder and Inorder", platform:"leetcode", url:"https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/", difficulty:"medium", topic:"trees", tags:["divide-and-conquer","construction"], why:"Tree construction from traversal orders — tests deep traversal understanding.", lcNumber:105 },
  { id:"lc-543", title:"Diameter of Binary Tree", platform:"leetcode", url:"https://leetcode.com/problems/diameter-of-binary-tree/", difficulty:"easy", topic:"trees", tags:["DFS","path"], why:"Diameter = max path through root — elegant post-order DP on trees.", lcNumber:543 },

  // BST
  { id:"lc-700", title:"Search in BST", platform:"leetcode", url:"https://leetcode.com/problems/search-in-a-binary-search-tree/", difficulty:"easy", topic:"binary_search_trees", tags:["BST"], why:"Pure BST search — the O(log n) vs O(n) comparison baseline.", lcNumber:700 },
  { id:"lc-230", title:"Kth Smallest in BST", platform:"leetcode", url:"https://leetcode.com/problems/kth-smallest-element-in-a-bst/", difficulty:"medium", topic:"binary_search_trees", tags:["inorder"], why:"In-order traversal produces sorted BST output — a core BST property.", lcNumber:230 },
  { id:"lc-98", title:"Validate Binary Search Tree", platform:"leetcode", url:"https://leetcode.com/problems/validate-binary-search-tree/", difficulty:"medium", topic:"binary_search_trees", tags:["BST-invariant","bounds"], why:"BST invariant with min/max bounds — subtle and frequently tested.", lcNumber:98 },
  { id:"lc-235", title:"Lowest Common Ancestor of BST", platform:"leetcode", url:"https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/", difficulty:"medium", topic:"binary_search_trees", tags:["LCA","BST"], why:"LCA using BST ordering — simpler than general tree LCA.", lcNumber:235 },

  // HEAP
  { id:"lc-295", title:"Find Median from Data Stream", platform:"leetcode", url:"https://leetcode.com/problems/find-median-from-data-stream/", difficulty:"hard", topic:"heap", tags:["two-heaps","running-median"], why:"Dual-heap (max + min) for running median — elegant design problem.", lcNumber:295 },
  { id:"lc-373", title:"Find K Pairs with Smallest Sums", platform:"leetcode", url:"https://leetcode.com/problems/find-k-pairs-with-smallest-sums/", difficulty:"medium", topic:"heap", tags:["k-way-merge"], why:"K-way merge from multiple sorted streams using a min-heap.", lcNumber:373 },
  { id:"lc-621", title:"Task Scheduler", platform:"leetcode", url:"https://leetcode.com/problems/task-scheduler/", difficulty:"medium", topic:"heap", tags:["greedy","frequency"], why:"Frequency-based greedy scheduling — max-heap for always picking most frequent.", lcNumber:621 },
  { id:"lc-703", title:"Kth Largest Element in Stream", platform:"leetcode", url:"https://leetcode.com/problems/kth-largest-element-in-a-stream/", difficulty:"easy", topic:"heap", tags:["min-heap","streaming"], why:"Online Kth-largest using a size-K min-heap.", lcNumber:703 },
  { id:"lc-215h", title:"Kth Largest Element (Heap)", platform:"leetcode", url:"https://leetcode.com/problems/kth-largest-element-in-an-array/", difficulty:"medium", topic:"heap", tags:["min-heap","quickselect"], why:"Fixed-size min-heap of K elements is the canonical heap-based selection.", lcNumber:215 },

  // SHORTEST PATHS
  { id:"lc-743", title:"Network Delay Time (Dijkstra)", platform:"leetcode", url:"https://leetcode.com/problems/network-delay-time/", difficulty:"medium", topic:"shortest_paths", tags:["dijkstra","SSSP"], why:"Textbook Dijkstra on a weighted directed graph — implement from scratch.", lcNumber:743 },
  { id:"lc-787", title:"Cheapest Flights Within K Stops", platform:"leetcode", url:"https://leetcode.com/problems/cheapest-flights-within-k-stops/", difficulty:"medium", topic:"shortest_paths", tags:["bellman-ford","DP"], why:"Bellman-Ford with constraint on edges — DP interpretation of SSSP.", lcNumber:787 },
  { id:"lc-1631", title:"Path With Minimum Effort", platform:"leetcode", url:"https://leetcode.com/problems/path-with-minimum-effort/", difficulty:"medium", topic:"shortest_paths", tags:["dijkstra","modified-weight"], why:"Dijkstra with custom edge weight — teaches generalisation.", lcNumber:1631 },
  { id:"lc-1334", title:"City With Smallest Neighbors (Floyd-Warshall)", platform:"leetcode", url:"https://leetcode.com/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/", difficulty:"medium", topic:"shortest_paths", tags:["floyd-warshall","all-pairs"], why:"Floyd-Warshall all-pairs shortest path — classic O(V^3) algorithm.", lcNumber:1334 },

  // GREEDY
  { id:"lc-55", title:"Jump Game", platform:"leetcode", url:"https://leetcode.com/problems/jump-game/", difficulty:"medium", topic:"greedy_algorithms", tags:["greedy","reach"], why:"Running max-reach greedy — elegant O(n) vs backtracking O(2^n).", lcNumber:55 },
  { id:"lc-45", title:"Jump Game II (Min Jumps)", platform:"leetcode", url:"https://leetcode.com/problems/jump-game-ii/", difficulty:"medium", topic:"greedy_algorithms", tags:["BFS-levels","greedy"], why:"BFS-level greedy for minimum steps — contrasts with DP approach.", lcNumber:45 },
  { id:"lc-435", title:"Non-overlapping Intervals", platform:"leetcode", url:"https://leetcode.com/problems/non-overlapping-intervals/", difficulty:"medium", topic:"greedy_algorithms", tags:["interval-scheduling","sort-by-end"], why:"Interval scheduling maximization — sort by end time greedy is provably optimal.", lcNumber:435 },
  { id:"lc-134", title:"Gas Station", platform:"leetcode", url:"https://leetcode.com/problems/gas-station/", difficulty:"medium", topic:"greedy_algorithms", tags:["circular-greedy"], why:"Circular greedy with running surplus — tests greedy feasibility proof.", lcNumber:134 },
  { id:"lc-135", title:"Candy Distribution", platform:"leetcode", url:"https://leetcode.com/problems/candy/", difficulty:"hard", topic:"greedy_algorithms", tags:["two-pass-greedy"], why:"Two-pass left-right greedy — each constraint satisfied independently.", lcNumber:135 },

  // DISJOINT SETS
  { id:"lc-547", title:"Number of Provinces", platform:"leetcode", url:"https://leetcode.com/problems/number-of-provinces/", difficulty:"medium", topic:"disjoint_sets", tags:["union-find","components"], why:"Basic Union-Find component counting — the hello-world of DSU.", lcNumber:547 },
  { id:"lc-990", title:"Satisfiability of Equality Equations", platform:"leetcode", url:"https://leetcode.com/problems/satisfiability-of-equality-equations/", difficulty:"medium", topic:"disjoint_sets", tags:["union-find","constraints"], why:"Constraint propagation with Union-Find.", lcNumber:990 },
  { id:"lc-399", title:"Evaluate Division", platform:"leetcode", url:"https://leetcode.com/problems/evaluate-division/", difficulty:"medium", topic:"disjoint_sets", tags:["weighted-union-find","BFS"], why:"Weighted Union-Find with ratio propagation — advanced DSU.", lcNumber:399 },

  // STRING MATCHING
  { id:"lc-28", title:"Find First Occurrence (KMP)", platform:"leetcode", url:"https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/", difficulty:"easy", topic:"string_matching", tags:["KMP","failure-function"], why:"KMP prefix function — the gold standard O(n+m) substring search.", lcNumber:28 },
  { id:"lc-459", title:"Repeated Substring Pattern", platform:"leetcode", url:"https://leetcode.com/problems/repeated-substring-pattern/", difficulty:"easy", topic:"string_matching", tags:["KMP","period"], why:"KMP failure function applied to determine string period.", lcNumber:459 },
  { id:"gfg-rabin-karp", title:"Rabin-Karp Rolling Hash", platform:"gfg", url:"https://www.geeksforgeeks.org/rabin-karp-algorithm-for-pattern-searching/", difficulty:"medium", topic:"string_matching", tags:["rolling-hash"], why:"Rolling hash for O(n+m) average pattern search." },

  // STRINGS
  { id:"lc-3", title:"Longest Substring Without Repeating Chars", platform:"leetcode", url:"https://leetcode.com/problems/longest-substring-without-repeating-characters/", difficulty:"medium", topic:"strings", tags:["sliding-window","set"], why:"Sliding window with shrink condition — quintessential string window problem.", lcNumber:3 },
  { id:"lc-76", title:"Minimum Window Substring", platform:"leetcode", url:"https://leetcode.com/problems/minimum-window-substring/", difficulty:"hard", topic:"strings", tags:["sliding-window","frequency-map"], why:"Variable sliding window with frequency matching — one of the hardest window problems.", lcNumber:76 },
  { id:"lc-5", title:"Longest Palindromic Substring", platform:"leetcode", url:"https://leetcode.com/problems/longest-palindromic-substring/", difficulty:"medium", topic:"strings", tags:["expand-around-center"], why:"Expand-around-center — two fundamentally different paradigms (centre expansion + Manacher).", lcNumber:5 },
  { id:"lc-647", title:"Palindromic Substrings Count", platform:"leetcode", url:"https://leetcode.com/problems/palindromic-substrings/", difficulty:"medium", topic:"strings", tags:["expand-center","count"], why:"Count palindromes by expansion — same template as LC-5.", lcNumber:647 },
  { id:"lc-271", title:"Encode and Decode Strings", platform:"leetcode", url:"https://leetcode.com/problems/encode-and-decode-strings/", difficulty:"medium", topic:"strings", tags:["serialization"], why:"Length-prefix encoding — real-world serialization interview question.", lcNumber:271 },

  // DIVIDE AND CONQUER
  { id:"lc-148", title:"Sort List (Merge Sort on Linked List)", platform:"leetcode", url:"https://leetcode.com/problems/sort-list/", difficulty:"medium", topic:"divide_and_conquer", tags:["merge-sort","linked-list"], why:"Merge sort on a linked list in O(n log n) time O(1) space.", lcNumber:148 },
  { id:"lc-169", title:"Majority Element (Boyer-Moore)", platform:"leetcode", url:"https://leetcode.com/problems/majority-element/", difficulty:"easy", topic:"divide_and_conquer", tags:["divide","majority-vote"], why:"Boyer-Moore majority vote — two fundamentally different O(n) approaches.", lcNumber:169 },
  { id:"lc-315", title:"Count of Smaller Numbers After Self", platform:"leetcode", url:"https://leetcode.com/problems/count-of-smaller-numbers-after-self/", difficulty:"hard", topic:"divide_and_conquer", tags:["merge-sort","inversion-count"], why:"Counting during merge phase for inversion count — advanced D&C.", lcNumber:315 },

  // MST
  { id:"lc-1584", title:"Min Cost to Connect All Points", platform:"leetcode", url:"https://leetcode.com/problems/min-cost-to-connect-all-points/", difficulty:"medium", topic:"minimum_spanning_trees", tags:["prim","kruskal","MST"], why:"MST on dense graph — tests both Prim (heap) and Kruskal (DSU) approaches.", lcNumber:1584 },
  { id:"gfg-mst-prim", title:"Prim MST Algorithm (GFG)", platform:"gfg", url:"https://www.geeksforgeeks.org/prims-minimum-spanning-tree-mst-greedy-algo-5/", difficulty:"medium", topic:"minimum_spanning_trees", tags:["prim","greedy"], why:"Prim algorithm from adjacency matrix — implementation-focused walkthrough." },

  // COMPLEXITY ANALYSIS
  { id:"gfg-asymptotic", title:"Big-O, Theta, Omega Analysis", platform:"gfg", url:"https://www.geeksforgeeks.org/analysis-algorithms-set-3asymptotic-notations/", difficulty:"easy", topic:"complexity_analysis", tags:["big-o","notation"], why:"Formal definitions of asymptotic notation — essential for correct complexity claims." },
  { id:"gfg-master-theorem", title:"Master Theorem for Recurrences", platform:"gfg", url:"https://www.geeksforgeeks.org/analysis-algorithm-set-4-master-method-solving-recurrences/", difficulty:"medium", topic:"complexity_analysis", tags:["master-theorem","recurrence"], why:"Master theorem for divide-and-conquer recurrences — must-know for interview analysis." },

  // ALGORITHM FOUNDATIONS
  { id:"lc-191", title:"Number of 1 Bits", platform:"leetcode", url:"https://leetcode.com/problems/number-of-1-bits/", difficulty:"easy", topic:"algorithm_foundations", tags:["bit-manipulation"], why:"Brian Kernighan algorithm for counting set bits.", lcNumber:191 },
  { id:"lc-136", title:"Single Number (XOR)", platform:"leetcode", url:"https://leetcode.com/problems/single-number/", difficulty:"easy", topic:"algorithm_foundations", tags:["XOR","bit-trick"], why:"XOR self-cancellation — beautiful one-liner demonstrating bit property intuition.", lcNumber:136 },
  { id:"lc-338", title:"Counting Bits", platform:"leetcode", url:"https://leetcode.com/problems/counting-bits/", difficulty:"easy", topic:"algorithm_foundations", tags:["bit-manipulation","dp"], why:"DP on bits — computes popcount for 0..n in O(n) total.", lcNumber:338 },

  // PEAK FINDING
  { id:"lc-162", title:"Find Peak Element", platform:"leetcode", url:"https://leetcode.com/problems/find-peak-element/", difficulty:"medium", topic:"peak_finding", tags:["binary-search","peak"], why:"Binary search applied to non-monotone array via local gradient reasoning.", lcNumber:162 },
  { id:"gfg-peak", title:"Peak Element in Array (GFG)", platform:"gfg", url:"https://www.geeksforgeeks.org/find-a-peak-in-a-given-array/", difficulty:"easy", topic:"peak_finding", tags:["binary-search","unimodal"], why:"Peak finding in O(log n) via binary search on the gradient." },

  // MAX FLOW
  { id:"gfg-ford-fulkerson", title:"Ford-Fulkerson Max Flow", platform:"gfg", url:"https://www.geeksforgeeks.org/ford-fulkerson-algorithm-for-maximum-flow-problem/", difficulty:"hard", topic:"maximum_flow", tags:["augmenting-path","residual-graph"], why:"Ford-Fulkerson with DFS augmentation — foundational max-flow algorithm." },
  { id:"gfg-edmonds-karp", title:"Edmonds-Karp (BFS Max Flow)", platform:"gfg", url:"https://www.geeksforgeeks.org/edmonds-karp-algorithm-for-maximum-flow/", difficulty:"hard", topic:"maximum_flow", tags:["BFS-augmentation"], why:"Edmonds-Karp uses BFS — guarantees polynomial time O(VE^2)." },

  // AVL TREES
  { id:"gfg-avl-insert", title:"AVL Tree Insertion & Rotations", platform:"gfg", url:"https://www.geeksforgeeks.org/insertion-in-an-avl-tree/", difficulty:"medium", topic:"avl_trees", tags:["rotation","height-balance"], why:"LL/LR/RL/RR rotation cases — must understand for balanced BST interviews." },
  { id:"gfg-avl-delete", title:"AVL Tree Deletion", platform:"gfg", url:"https://www.geeksforgeeks.org/deletion-in-an-avl-tree/", difficulty:"hard", topic:"avl_trees", tags:["deletion","rebalance"], why:"Deletion in AVL trees triggers rebalancing — the hardest BST operation." },

  // RED-BLACK TREES
  { id:"gfg-rbt-intro", title:"Red-Black Tree Properties & Rotations", platform:"gfg", url:"https://www.geeksforgeeks.org/red-black-tree-set-1-introduction-2/", difficulty:"hard", topic:"red_black_trees", tags:["color-flip","rotation","invariant"], why:"RBT color invariants and fixup cases — used in Java TreeMap and C++ std::map." },

  // AMORTIZED ANALYSIS
  { id:"gfg-amortized", title:"Amortized Analysis Techniques", platform:"gfg", url:"https://www.geeksforgeeks.org/amortized-analysis/", difficulty:"medium", topic:"amortized_analysis", tags:["aggregate","accounting","potential"], why:"Aggregate, accounting, and potential methods for amortized cost analysis." },
  { id:"lc-232", title:"Implement Queue using Stacks (amortized)", platform:"leetcode", url:"https://leetcode.com/problems/implement-queue-using-stacks/", difficulty:"easy", topic:"amortized_analysis", tags:["amortized-O(1)","two-stacks"], why:"Two-stack queue has O(1) amortized per operation — perfect amortized analysis exercise.", lcNumber:232 },

  // AUGMENTING DATA STRUCTURES
  { id:"lc-307", title:"Range Sum Query - Mutable (BIT)", platform:"leetcode", url:"https://leetcode.com/problems/range-sum-query-mutable/", difficulty:"medium", topic:"augmenting_data_structures", tags:["fenwick-tree","BIT"], why:"Fenwick (Binary Indexed) Tree for O(log n) range sum with updates.", lcNumber:307 },
  { id:"gfg-seg-tree", title:"Segment Tree Build, Query, Update", platform:"gfg", url:"https://www.geeksforgeeks.org/segment-tree-set-1-sum-of-given-range/", difficulty:"hard", topic:"augmenting_data_structures", tags:["range-query","segment-tree"], why:"O(log n) range sum with point updates — cornerstone of competitive range-query solutions." },

  // NUMERICS
  { id:"lc-29", title:"Divide Two Integers (Bit Math)", platform:"leetcode", url:"https://leetcode.com/problems/divide-two-integers/", difficulty:"medium", topic:"numerics", tags:["bit-shift","arithmetic"], why:"Integer division without / operator — tests arithmetic via bit-shifting.", lcNumber:29 },
  { id:"gfg-gcd", title:"GCD and Extended Euclidean", platform:"gfg", url:"https://www.geeksforgeeks.org/euclidean-algorithms-basic-and-extended/", difficulty:"easy", topic:"numerics", tags:["gcd","euclidean"], why:"Euclidean algorithm for GCD — basis of modular inverse and RSA cryptography." },

  // DOCUMENT DISTANCE
  { id:"gfg-edit-dist", title:"Edit Distance (Levenshtein)", platform:"gfg", url:"https://www.geeksforgeeks.org/edit-distance-dp-5/", difficulty:"medium", topic:"document_distance", tags:["Levenshtein","2D-dp"], why:"Edit distance is the foundation of spell-checking and document similarity." },
  { id:"lc-72dd", title:"Edit Distance", platform:"leetcode", url:"https://leetcode.com/problems/edit-distance/", difficulty:"hard", topic:"document_distance", tags:["Levenshtein","DP"], why:"Word-level edit distance for document comparison.", lcNumber:72 },
];

// ---------------------------------------------------------------------------
// Topic alias resolution — maps variant names to canonical keys
// ---------------------------------------------------------------------------
const TOPIC_ALIASES: Record<string, string[]> = {
  arrays: ["arrays","array"],
  hashing: ["hashing","hash_table"],
  stacks: ["stacks","stack"],
  queues: ["queues","queue"],
  linked_lists: ["linked_lists","linked_list"],
  searching: ["searching","binary_search","search"],
  sorting: ["sorting","sorting_algorithms","sort"],
  dynamic_programming: ["dynamic_programming","dp"],
  graph_algorithms: ["graph_algorithms","graphs","graph"],
  recursion_backtracking: ["recursion_backtracking","backtracking","recursion"],
  trees: ["trees","binary_trees","tree","basic_data_structures"],
  binary_search_trees: ["binary_search_trees","bst"],
  heap: ["heap","heaps","priority_queue"],
  shortest_paths: ["shortest_paths","shortest_path"],
  greedy_algorithms: ["greedy_algorithms","greedy"],
  disjoint_sets: ["disjoint_sets","disjoint_set_union","union_find"],
  string_matching: ["string_matching"],
  strings: ["strings","string"],
  divide_and_conquer: ["divide_and_conquer"],
  minimum_spanning_trees: ["minimum_spanning_trees","mst"],
  complexity_analysis: ["complexity_analysis","complexity_theory"],
  algorithm_foundations: ["algorithm_foundations","algorithms"],
  maximum_flow: ["maximum_flow","network_flow"],
  peak_finding: ["peak_finding"],
  avl_trees: ["avl_trees","avl"],
  red_black_trees: ["red_black_trees","rbt"],
  amortized_analysis: ["amortized_analysis","amortized"],
  augmenting_data_structures: ["augmenting_data_structures"],
  document_distance: ["document_distance"],
  numerics: ["numerics","math"],
};

function resolveTopicKey(rawTopic: string): string {
  const lower = rawTopic.toLowerCase();
  for (const [canonical, aliases] of Object.entries(TOPIC_ALIASES)) {
    if (aliases.includes(lower)) return canonical;
  }
  return lower;
}

function difficultyForMastery(mastery: number): Difficulty[] {
  if (mastery < 0.35) return ["easy"];
  if (mastery < 0.55) return ["easy","medium"];
  if (mastery < 0.72) return ["medium"];
  return ["medium","hard"];
}

/** Returns up to `limit` curated problems for a topic, filtered by mastery-appropriate difficulty. */
export function getProblems(topic: string, mastery = 0.5, limit = 5): Problem[] {
  const canonical = resolveTopicKey(topic);
  const topicProblems = PROBLEMS.filter((p) => resolveTopicKey(p.topic) === canonical);
  if (topicProblems.length === 0) return [];

  const allowed = difficultyForMastery(mastery);
  const filtered = topicProblems.filter((p) => allowed.includes(p.difficulty));
  const pool = filtered.length >= 2 ? filtered : topicProblems;

  const order: Difficulty[] = mastery < 0.5 ? ["easy","medium","hard"] : ["medium","hard","easy"];
  const sorted = [...pool].sort((a, b) => {
    const ai = order.indexOf(a.difficulty);
    const bi = order.indexOf(b.difficulty);
    if (ai !== bi) return ai - bi;
    return a.platform === "leetcode" ? -1 : 1;
  });

  return sorted.slice(0, limit);
}

/** Get a single best problem for a topic and mastery level. */
export function getBestProblem(topic: string, mastery = 0.5): Problem | null {
  return getProblems(topic, mastery, 1)[0] ?? null;
}

/** Get all problems for a topic grouped by difficulty. */
export function getProblemsByDifficulty(topic: string): { easy: Problem[]; medium: Problem[]; hard: Problem[] } {
  const canonical = resolveTopicKey(topic);
  const all = PROBLEMS.filter((p) => resolveTopicKey(p.topic) === canonical);
  return {
    easy: all.filter((p) => p.difficulty === "easy"),
    medium: all.filter((p) => p.difficulty === "medium"),
    hard: all.filter((p) => p.difficulty === "hard"),
  };
}

export default PROBLEMS;
