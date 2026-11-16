export type TierDistribution = { T1: number; T2: number; T3: number };

export type AskMetadata = {
  mastery_label: string;
  complexity: string;
  sources: { tier: string; tier_label: string; topic: string; section: string }[];
  verification: { faithfulness: number; completeness: number; issues: string[] } | null;
  tier_distribution: TierDistribution;
  model: string | null;
};

export type AskResponse = {
  answer: string;
  metadata: AskMetadata;
  retrieval_stats: {
    chunks_found: number;
    complexity: string;
    mastery_used: number;
    pathfinder: { escalated: boolean; confidence: number; below_threshold?: boolean };
  };
};

export type ComparisonResponse = {
  query: string;
  metrics: {
    condition_a: ComparisonMetrics;
    condition_d: ComparisonMetrics;
    quality: ComparisonQuality;
  };
  condition_a: AskResponse;
  condition_d: { answer: string; metadata: Partial<AskMetadata> };
};
export type ComparisonJob = { job_id: string; status: string };

export type ComparisonQualityScore = {
  relevance: number;
  factual_accuracy: number;
  completeness: number;
  clarity: number;
  groundedness: number | null;
  overall: number;
  reason: string;
};

export type ComparisonQuality = {
  pathfinder: ComparisonQualityScore;
  baseline: ComparisonQualityScore;
  error?: string;
};

export type ComparisonMetrics = {
  mastery_used: number | null;
  chunks_found: number;
  source_count: number;
  complexity: string;
  retrieval_confidence: number | null;
  pathfinder: { escalated: boolean; confidence: number; below_threshold?: boolean } | null;
  tier_distribution: Partial<TierDistribution>;
  faithfulness: number | null;
  completeness: number | null;
  answer_characters: number;
};

export type MasteryResponse = {
  concept_scores: Record<string, number>;
  concept_details?: Record<string, { mastery: number; raw_mastery: number; effective_mastery: number; days_since_last_practice: number; half_life_days: number; observations: number }>;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  metadata: AskMetadata | null;
  created_at: string;
};

export type ChatHistoryResponse = {
  messages: ChatMessage[];
};

export type ProfileResponse = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  is_demo: boolean;
};

export type GenerateQuestionsResponse = {
  questions: string[];
  reference_answers: string[];
  expected_concepts: string[][];
  grounded: boolean[];
  difficulty: string;
  source_tier: string;
  canonical_topic: string;
  error?: string;
};

export type SubmitAnswerResponse = {
  score: number;
  correct: boolean;
  feedback: string;
  semantic_similarity: number;
  concept_coverage: number;
  matched_concepts: string[];
  missed_concepts: string[];
  llm_grade: number;
  incorrect_claims: number;
  new_mastery: number;
  misconception: string | null;
};

export type RoadmapStep = {
  step: number;
  topic: string;
  time_estimate_hours: number;
  reason: string;
  reference: string;
};

export type RoadmapResponse = {
  summary: string;
  weak_topics: string[];
  mastered_topics: string[];
  difficulty_tolerance: string;
  avg_mastery: number;
  time_budget_hours: number;
  roadmap: RoadmapStep[];
  total_time: number;
  topics_skipped: string[];
  validation_attempts: number;
  validation_errors: string[];
};

export type RoadmapCacheResponse =
  | { cached: true; payload: RoadmapResponse; time_budget_hours: number; generated_at: string }
  | { cached: false; status: "idle" | "generating" | "done" | "error" };

export type RoadmapGenerateResponse = {
  status: "generating" | "already_generating";
};

export type EvidenceSection<T> = { available: boolean; data: T | null; error?: string };

export type CalibrationCheck = { topic: string; predicted_mastery: number; threshold: number; expected: string; pass: boolean };
export type CalibrationPersona = { name: string; description: string; checks: CalibrationCheck[]; known_limitation: boolean };
export type KnownLimitation = { id: string; status: string; explanation: string; [key: string]: unknown };
export type CalibrationSummary = {
  personas: CalibrationPersona[];
  known_limitations: KnownLimitation[];
  regression_tests: { name: string; value: number; threshold: number; pass: boolean }[];
  trend_test: { improving_mastery: number; regressing_mastery: number; pass: boolean };
  rank_correlation: { spearman_rho: number; threshold: number; pass: boolean };
  cold_start: { predicted_mastery: number; expected: number; pass: boolean };
  cross_concept_transfer: { advanced_mastery: number; beginner_mastery: number; pass: boolean };
};

export type MetricStats = { mean: number; std: number; min: number; max: number; n: number };
export type WinTieLoss = { wins: number; ties: number; losses: number };
export type ComparisonEntry = { cohens_d: number; effect_size: string; win_tie_loss: WinTieLoss };
export type BaselineComparisonEntry = ComparisonEntry | { A_mean: number; D_mean: number };

export type AblationAnalysis = {
  summary: Record<string, Record<string, MetricStats>>;
  mastery_compliance: Record<string, Record<string, MetricStats>>;
  mastery_adaptation: Record<string, MetricStats>;
  statistical_comparisons: Record<string, ComparisonEntry>;
  baseline_comparisons: Record<string, BaselineComparisonEntry>;
};

export type AblationFile = { analysis: AblationAnalysis; timestamp: string; n_queries: number; masteries: number[] };

export type EvidenceResponse = {
  ablation: EvidenceSection<AblationFile>;
  calibration: EvidenceSection<CalibrationSummary>;
  pathfinder: EvidenceSection<unknown>;
  roadmap_ablation: EvidenceSection<unknown>;
  answer_evaluator: EvidenceSection<unknown>;
  end_to_end: EvidenceSection<unknown>;
};

export type StatsTrendPoint = { date: string; attempts: number; accuracy: number };

export type TopicBreakdownEntry = { topic: string; attempts: number; accuracy: number; mastery: number };

export type StatsResponse = {
  total_attempts: number;
  overall_accuracy: number;
  topics_practiced: number;
  topics_mastered: number;
  total_topics: number;
  avg_mastery: number;
  current_streak: number;
  trend: StatsTrendPoint[];
  recent_trend: StatsTrendPoint[];
  topic_breakdown: TopicBreakdownEntry[];
  misconception_frequency: { id: string; count: number }[];
};

export type RecommendationResponse = {
  next_action: string;
  next_action_reason: string;
  suggested_topics: Array<{ topic: string; reason: string; priority: string }>;
};
