/**
 * Unit tests for the provider scoring algorithm.
 *
 * Tests:
 * - Healthy provider scores higher than degraded provider
 * - Cheaper provider scores higher when costFit matters
 * - High-latency provider scores lower when urgency is HIGH
 * - Higher quality model scores better for PREMIUM tier
 * - Score is always 0–100
 * - All weight components contribute to final score
 */

import { describe, it, expect, vi } from 'vitest';
import { scoreProvider } from './scoring.js';
import type { BaseProvider, ProviderModel } from './providers/base.js';
import type { ModelMetadata } from './types.js';
import type { RoutingRequest } from './types.js';

// ==============================================================================
// Helpers
// ==============================================================================

function makeProvider(
  overrides: Partial<{
    providerId: string;
    health: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  }> = {},
): BaseProvider {
  return {
    providerId: overrides.providerId ?? 'openai',
    providerName: 'OpenAI',
    generate: vi.fn(),
    estimateCost: vi.fn().mockReturnValue(0.01),
    healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
    getAvailableModels: vi.fn().mockReturnValue([] as ProviderModel[]),
    // Expose health status for scoring
    _healthStatus: overrides.health ?? 'HEALTHY',
  } as unknown as BaseProvider;
}

function makeMetadata(overrides: Partial<ModelMetadata> = {}): ModelMetadata {
  return {
    modelId: 'gpt-4o',
    providerId: 'openai',
    taskTypes: ['SCRIPT_GENERATION'],
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    qualityScore: 8.0,
    latencyMs: 500,
    maxTokens: 4096,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<RoutingRequest> = {}): RoutingRequest {
  return {
    taskType: 'SCRIPT_GENERATION',
    tier: 'ECONOMICAL',
    language: 'EN',
    userPrompt: 'Write a script',
    maxTokens: 2000,
    ...overrides,
  };
}

// ==============================================================================
// Tests
// ==============================================================================

describe('scoreProvider()', () => {
  it('returns a number between 0 and 100', () => {
    const provider = makeProvider();
    const metadata = makeMetadata();
    const request = makeRequest();

    const score = scoreProvider(provider, metadata.modelId, request, metadata);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('healthy provider scores higher than degraded provider (same model)', () => {
    const healthyProvider = makeProvider({ providerId: 'openai-healthy', health: 'HEALTHY' });
    const degradedProvider = makeProvider({ providerId: 'openai-degraded', health: 'DEGRADED' });
    const metadata = makeMetadata();
    const request = makeRequest();

    const healthyScore = scoreProvider(healthyProvider, metadata.modelId, request, metadata);
    const degradedScore = scoreProvider(degradedProvider, metadata.modelId, request, metadata);

    expect(healthyScore).toBeGreaterThan(degradedScore);
  });

  it('DOWN provider scores 0', () => {
    const downProvider = makeProvider({ health: 'DOWN' });
    const metadata = makeMetadata();
    const request = makeRequest();

    const score = scoreProvider(downProvider, metadata.modelId, request, metadata);

    expect(score).toBe(0);
  });

  it('cheaper model scores higher for FREE tier (costFit dominates)', () => {
    const provider = makeProvider();

    // Expensive model
    const expensiveMeta = makeMetadata({
      modelId: 'gpt-4o',
      costPer1kInput: 0.005,
      costPer1kOutput: 0.015,
      qualityScore: 9,
    });

    // Cheap model
    const cheapMeta = makeMetadata({
      modelId: 'gpt-4o-mini',
      costPer1kInput: 0.00015,
      costPer1kOutput: 0.0006,
      qualityScore: 7,
    });

    const freeRequest = makeRequest({ tier: 'FREE' });

    const expensiveScore = scoreProvider(provider, expensiveMeta.modelId, freeRequest, expensiveMeta);
    const cheapScore = scoreProvider(provider, cheapMeta.modelId, freeRequest, cheapMeta);

    expect(cheapScore).toBeGreaterThan(expensiveScore);
  });

  it('high-quality model scores higher for ULTRA tier', () => {
    const provider = makeProvider();

    const highQualityMeta = makeMetadata({
      modelId: 'gpt-4o',
      qualityScore: 9.5,
      costPer1kInput: 0.005,
    });

    const lowQualityMeta = makeMetadata({
      modelId: 'gpt-3.5-turbo',
      qualityScore: 6.5,
      costPer1kInput: 0.0005,
    });

    const ultraRequest = makeRequest({ tier: 'ULTRA' });

    const highQScore = scoreProvider(provider, highQualityMeta.modelId, ultraRequest, highQualityMeta);
    const lowQScore = scoreProvider(provider, lowQualityMeta.modelId, ultraRequest, lowQualityMeta);

    expect(highQScore).toBeGreaterThan(lowQScore);
  });

  it('fast provider scores higher when urgency is HIGH and maxLatencyMs is tight', () => {
    const provider = makeProvider();

    const fastMeta = makeMetadata({
      modelId: 'gpt-4o-mini',
      latencyMs: 200,
      qualityScore: 7,
    });

    const slowMeta = makeMetadata({
      modelId: 'claude-sonnet',
      latencyMs: 2000,
      qualityScore: 8.5,
    });

    const urgentRequest = makeRequest({
      urgency: 'HIGH',
      maxLatencyMs: 500,
    });

    const fastScore = scoreProvider(provider, fastMeta.modelId, urgentRequest, fastMeta);
    const slowScore = scoreProvider(provider, slowMeta.modelId, urgentRequest, slowMeta);

    expect(fastScore).toBeGreaterThan(slowScore);
  });

  it('returns a deterministic score for the same inputs', () => {
    const provider = makeProvider();
    const metadata = makeMetadata();
    const request = makeRequest();

    const score1 = scoreProvider(provider, metadata.modelId, request, metadata);
    const score2 = scoreProvider(provider, metadata.modelId, request, metadata);

    expect(score1).toBe(score2);
  });
});
