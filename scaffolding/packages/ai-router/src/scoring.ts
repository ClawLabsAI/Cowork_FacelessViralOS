import { clamp, TIER_MAX_TASK_COST_USD, TIER_QUALITY_TARGET } from '@fvos/core';

import type { ModelMetadata, RoutingRequest } from './types.js';
import type { BaseProvider } from './providers/base.js';

// ==============================================================================
// Provider Scoring Algorithm
// Produces a 0–100 score based on 5 weighted criteria.
// ==============================================================================

// Weight constants (must sum to 1.0)
const WEIGHT_COST_FIT = 0.30;
const WEIGHT_QUALITY_FIT = 0.25;
const WEIGHT_LATENCY_FIT = 0.20;
const WEIGHT_HEALTH_SCORE = 0.15;
const WEIGHT_HISTORICAL = 0.10;

// Latency baseline when no maxLatencyMs is specified (ms)
const DEFAULT_MAX_LATENCY_MS = 15_000;

// Health status → score mapping
const HEALTH_SCORES: Record<string, number> = {
  HEALTHY: 100,
  DEGRADED: 40,
  DOWN: 0,
  UNKNOWN: 60, // Benefit of the doubt
};

/**
 * Score a provider+model pair for a given routing request.
 * Returns a value between 0 and 100 (higher is better).
 *
 * @param provider  The provider adapter
 * @param modelId   The model to evaluate
 * @param request   The routing request with tier/task context
 * @param metadata  DB-loaded model metadata (costs, quality, latency)
 */
export function scoreProvider(
  provider: BaseProvider,
  modelId: string,
  request: RoutingRequest,
  metadata: ModelMetadata,
): number {
  // 1. Cost fit (30%) ─────────────────────────────────────────────────────────
  //    How well does the model cost fit within the tier's per-task budget?
  //    Score 100 if cost is << budget, 0 if cost >> budget.
  const costScore = computeCostScore(metadata, request);

  // 2. Quality fit (25%) ──────────────────────────────────────────────────────
  //    How close is the model's quality score to the tier's quality target?
  const qualityScore = computeQualityScore(metadata, request);

  // 3. Latency fit (20%) ──────────────────────────────────────────────────────
  //    How fast is the model relative to the request's latency budget?
  const latencyScore = computeLatencyScore(metadata, request);

  // 4. Health score (15%) ─────────────────────────────────────────────────────
  //    Current health status of the provider.
  const healthScore = computeHealthScore(provider);

  // 5. Historical quality (10%) ───────────────────────────────────────────────
  //    Past task-type success rate (placeholder: use quality score as proxy
  //    until we have real telemetry in the DB).
  const historicalScore = computeHistoricalScore(metadata, request);

  const total =
    costScore * WEIGHT_COST_FIT +
    qualityScore * WEIGHT_QUALITY_FIT +
    latencyScore * WEIGHT_LATENCY_FIT +
    healthScore * WEIGHT_HEALTH_SCORE +
    historicalScore * WEIGHT_HISTORICAL;

  return clamp(total, 0, 100);
}

// ==============================================================================
// Component scoring functions
// ==============================================================================

function computeCostScore(metadata: ModelMetadata, request: RoutingRequest): number {
  // Estimate cost for a typical generation in this tier
  const maxCost = TIER_MAX_TASK_COST_USD[request.tier] ?? 0.15;

  // Estimate tokens for a typical output given the tier
  const avgInputTokens = estimateInputTokens(request);
  const avgOutputTokens = estimateOutputTokens(request);

  const estimatedCost =
    (avgInputTokens / 1000) * metadata.costPer1kInput +
    (avgOutputTokens / 1000) * metadata.costPer1kOutput;

  if (estimatedCost <= 0) return 100;

  // Perfect score if cost is ≤ 50% of budget, zero score if cost ≥ 200% of budget
  const ratio = estimatedCost / maxCost;

  if (ratio <= 0.5) return 100;
  if (ratio >= 2.0) return 0;

  // Linear interpolation between 0.5→100 and 2.0→0
  return clamp(100 - ((ratio - 0.5) / 1.5) * 100, 0, 100);
}

function computeQualityScore(metadata: ModelMetadata, request: RoutingRequest): number {
  const targetQuality = TIER_QUALITY_TARGET[request.tier] ?? 70;
  const modelQuality = metadata.qualityScore; // 0–100

  // Penalty for being significantly below target
  if (modelQuality < targetQuality - 20) {
    // Too low quality for this tier
    return clamp(((modelQuality / targetQuality) * 100) - 20, 0, 60);
  }

  // Bonus for being near or above target (but no need to be ultra-premium for cheap tiers)
  const diff = modelQuality - targetQuality;

  if (diff >= 0) {
    // At or above target — slight diminishing returns above target
    return clamp(90 + Math.min(diff / 2, 10), 0, 100);
  }

  // Below target but within 20 points
  return clamp(90 + diff * 3, 0, 100);
}

function computeLatencyScore(metadata: ModelMetadata, request: RoutingRequest): number {
  const maxLatency = request.maxLatencyMs ?? DEFAULT_MAX_LATENCY_MS;
  const modelLatency = metadata.latencyMs;

  if (modelLatency <= 0) return 50;

  const ratio = modelLatency / maxLatency;

  if (ratio <= 0.3) return 100; // Very fast
  if (ratio <= 0.6) return 85;
  if (ratio <= 1.0) return 70; // Within budget
  if (ratio <= 1.5) return 40; // Slightly over
  return 0; // Way over budget
}

function computeHealthScore(provider: BaseProvider): number {
  // We call provider.healthCheck() externally and store results.
  // For scoring, we use a placeholder score from the registry's last known status.
  // The actual status is injected from the ProviderRegistry health cache.
  // Here we default to UNKNOWN which gives 60/100.
  const models = provider.getAvailableModels();
  if (models.length === 0) return 0;

  // Use the UNKNOWN default (60) — real status is checked separately
  return HEALTH_SCORES['UNKNOWN'] ?? 60;
}

function computeHistoricalScore(metadata: ModelMetadata, request: RoutingRequest): number {
  // Without live telemetry, we use the model's quality score adjusted by task-type fit.
  const taskFit = metadata.taskTypes.includes(request.taskType) ? 1.0 : 0.5;
  return clamp(metadata.qualityScore * taskFit, 0, 100);
}

// ==============================================================================
// Token estimation helpers
// ==============================================================================

function estimateInputTokens(request: RoutingRequest): number {
  const promptLength = (request.systemPrompt?.length ?? 0) + request.userPrompt.length;
  // Rough approximation: 4 chars per token
  return Math.ceil(promptLength / 4) + 200; // +200 for overhead
}

function estimateOutputTokens(request: RoutingRequest): number {
  if (request.maxTokens) return request.maxTokens;

  // Task-type-based defaults
  const defaults: Record<string, number> = {
    SCRIPT_GENERATION: 2000,
    SCENE_GENERATION: 1000,
    TRANSLATION: 1500,
    ANALYTICS_SUMMARY: 500,
    IDEA_GENERATION: 800,
    NICHE_RESEARCH: 1000,
    TREND_ANALYSIS: 800,
    COMPETITOR_ANALYSIS: 1000,
    RECOMMENDATION: 600,
    TTS_GENERATION: 200,
    VIDEO_RENDER: 200,
  };

  return defaults[request.taskType] ?? 1000;
}

// ==============================================================================
// Export scoring weight constants for transparency / testing
// ==============================================================================
export const SCORING_WEIGHTS = {
  COST_FIT: WEIGHT_COST_FIT,
  QUALITY_FIT: WEIGHT_QUALITY_FIT,
  LATENCY_FIT: WEIGHT_LATENCY_FIT,
  HEALTH_SCORE: WEIGHT_HEALTH_SCORE,
  HISTORICAL: WEIGHT_HISTORICAL,
} as const;
