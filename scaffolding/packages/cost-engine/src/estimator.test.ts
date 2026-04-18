/**
 * Unit tests for CostEstimator
 *
 * Tests:
 * - Text generation cost estimation per known models
 * - TTS cost estimation per provider
 * - Image generation cost estimation per provider + resolution
 * - Video rendering estimation per resolution
 * - Batch estimation aggregates correctly
 * - Buffer factor is applied
 * - Unknown models/providers fall back to defaults
 * - Minimum cost floor is enforced
 */

import { describe, it, expect } from 'vitest';
import { CostEstimator } from './estimator.js';

// ==============================================================================
// Tests
// ==============================================================================

describe('CostEstimator', () => {
  const estimator = new CostEstimator();

  // --------------------------------------------------------------------------
  // estimateTextGeneration
  // --------------------------------------------------------------------------

  describe('estimateTextGeneration()', () => {
    it('returns a valid CostEstimate for a known model (gpt-4o-mini)', () => {
      const prompt = 'Write a 500-word script about productivity';
      const estimate = estimator.estimateTextGeneration(prompt, 1000, 'gpt-4o-mini');

      expect(estimate).toMatchObject({
        estimatedCostUsd: expect.any(Number),
        estimatedCostWithBufferUsd: expect.any(Number),
        currency: 'USD',
        confidence: 'HIGH',
      });

      // gpt-4o-mini costs: input $0.00015/1k, output $0.0006/1k
      // With ~200-char prompt → ~50 input tokens + 200 overhead = ~250 input tokens
      // 1000 output tokens
      // Input cost: (250/1000) * 0.00015 = $0.0000375
      // Output cost: (1000/1000) * 0.0006 = $0.0006
      // Total ≈ $0.000638 (well below $0.01)
      expect(estimate.estimatedCostUsd).toBeGreaterThan(0);
      expect(estimate.estimatedCostUsd).toBeLessThan(0.1); // Sanity check
    });

    it('buffer cost is always greater than base cost', () => {
      const estimate = estimator.estimateTextGeneration('test prompt', 500, 'gpt-4o');

      expect(estimate.estimatedCostWithBufferUsd).toBeGreaterThan(estimate.estimatedCostUsd);
    });

    it('GPT-4o is more expensive than GPT-4o-mini for same inputs', () => {
      const prompt = 'Write a script about AI trends';
      const maxTokens = 2000;

      const gpt4oEstimate = estimator.estimateTextGeneration(prompt, maxTokens, 'gpt-4o');
      const miniEstimate = estimator.estimateTextGeneration(prompt, maxTokens, 'gpt-4o-mini');

      expect(gpt4oEstimate.estimatedCostUsd).toBeGreaterThan(miniEstimate.estimatedCostUsd);
    });

    it('Claude Sonnet is more expensive than Claude Haiku', () => {
      const prompt = 'Write a listicle script';
      const maxTokens = 1500;

      const sonnetEstimate = estimator.estimateTextGeneration(prompt, maxTokens, 'claude-sonnet-4-5');
      const haikuEstimate = estimator.estimateTextGeneration(prompt, maxTokens, 'claude-haiku-4-5');

      expect(sonnetEstimate.estimatedCostUsd).toBeGreaterThan(haikuEstimate.estimatedCostUsd);
    });

    it('falls back to defaults for unknown model with MEDIUM confidence', () => {
      const estimate = estimator.estimateTextGeneration(
        'test prompt',
        1000,
        'some-unknown-model-v99',
      );

      expect(estimate.confidence).toBe('MEDIUM');
      expect(estimate.estimatedCostUsd).toBeGreaterThan(0);
    });

    it('includes token breakdown in estimate', () => {
      const estimate = estimator.estimateTextGeneration('Hello world', 100, 'gpt-4o-mini');

      expect(estimate.breakdown).toMatchObject({
        inputTokens: expect.any(Number),
        outputTokens: 100,
        inputCostUsd: expect.any(Number),
        outputCostUsd: expect.any(Number),
      });
    });

    it('longer prompts cost more than shorter prompts', () => {
      const shortPrompt = 'Write a script';
      const longPrompt = 'A'.repeat(2000);

      const shortEstimate = estimator.estimateTextGeneration(shortPrompt, 1000, 'gpt-4o');
      const longEstimate = estimator.estimateTextGeneration(longPrompt, 1000, 'gpt-4o');

      expect(longEstimate.estimatedCostUsd).toBeGreaterThan(shortEstimate.estimatedCostUsd);
    });
  });

  // --------------------------------------------------------------------------
  // estimateTTS
  // --------------------------------------------------------------------------

  describe('estimateTTS()', () => {
    it('estimates TTS cost for ElevenLabs', () => {
      // 1000 words × 5.5 chars = 5500 chars → 5.5k chars × $0.30/1k = $1.65
      const estimate = estimator.estimateTTS(1000, 'elevenlabs');

      expect(estimate.estimatedCostUsd).toBeCloseTo(1.65, 1);
      expect(estimate.confidence).toBe('HIGH');
    });

    it('estimates TTS cost for AWS Polly (cheaper)', () => {
      // 1000 words × 5.5 chars = 5500 chars → 5.5k chars × $0.004/1k = $0.022
      const estimate = estimator.estimateTTS(1000, 'aws-polly');

      expect(estimate.estimatedCostUsd).toBeCloseTo(0.022, 3);
    });

    it('ElevenLabs is significantly more expensive than AWS Polly', () => {
      const elevenLabsEstimate = estimator.estimateTTS(500, 'elevenlabs');
      const pollyEstimate = estimator.estimateTTS(500, 'aws-polly');

      expect(elevenLabsEstimate.estimatedCostUsd).toBeGreaterThan(pollyEstimate.estimatedCostUsd * 10);
    });

    it('more words cost more', () => {
      const short = estimator.estimateTTS(100, 'elevenlabs');
      const long = estimator.estimateTTS(1000, 'elevenlabs');

      expect(long.estimatedCostUsd).toBeGreaterThan(short.estimatedCostUsd);
    });

    it('unknown provider returns LOW confidence with default pricing', () => {
      const estimate = estimator.estimateTTS(500, 'unknown-tts-provider');

      expect(estimate.confidence).toBe('LOW');
      expect(estimate.estimatedCostUsd).toBeGreaterThan(0);
    });

    it('applies buffer factor', () => {
      const estimate = estimator.estimateTTS(500, 'elevenlabs');

      expect(estimate.estimatedCostWithBufferUsd).toBeGreaterThan(estimate.estimatedCostUsd);
    });
  });

  // --------------------------------------------------------------------------
  // estimateImageGeneration
  // --------------------------------------------------------------------------

  describe('estimateImageGeneration()', () => {
    it('estimates cost for OpenAI DALL-E 1024x1024', () => {
      // 3 images × $0.02 = $0.06
      const estimate = estimator.estimateImageGeneration(3, '1024x1024', 'openai');

      expect(estimate.estimatedCostUsd).toBeCloseTo(0.06, 2);
      expect(estimate.confidence).toBe('HIGH');
    });

    it('more images cost more', () => {
      const few = estimator.estimateImageGeneration(1, '1024x1024', 'openai');
      const many = estimator.estimateImageGeneration(10, '1024x1024', 'openai');

      expect(many.estimatedCostUsd).toBeCloseTo(few.estimatedCostUsd * 10, 1);
    });

    it('higher resolution costs more', () => {
      const small = estimator.estimateImageGeneration(1, '256x256', 'openai');
      const large = estimator.estimateImageGeneration(1, '1792x1024', 'openai');

      expect(large.estimatedCostUsd).toBeGreaterThan(small.estimatedCostUsd);
    });

    it('Stability AI is cheaper than OpenAI for same resolution', () => {
      const openAI = estimator.estimateImageGeneration(5, '1024x1024', 'openai');
      const stability = estimator.estimateImageGeneration(5, '1024x1024', 'stability-ai');

      expect(stability.estimatedCostUsd).toBeLessThan(openAI.estimatedCostUsd);
    });
  });

  // --------------------------------------------------------------------------
  // estimateVideoRendering
  // --------------------------------------------------------------------------

  describe('estimateVideoRendering()', () => {
    it('estimates rendering cost for 1080p 60-second video', () => {
      // 60 seconds × $0.004 = $0.24
      const estimate = estimator.estimateVideoRendering(60, '1080p');

      expect(estimate.estimatedCostUsd).toBeCloseTo(0.24, 2);
      expect(estimate.confidence).toBe('HIGH');
    });

    it('4K costs more than 1080p for same duration', () => {
      const hd = estimator.estimateVideoRendering(30, '1080p');
      const uhd = estimator.estimateVideoRendering(30, '4K');

      expect(uhd.estimatedCostUsd).toBeGreaterThan(hd.estimatedCostUsd);
    });

    it('longer videos cost more', () => {
      const short = estimator.estimateVideoRendering(30, '1080p');
      const long = estimator.estimateVideoRendering(600, '1080p');

      expect(long.estimatedCostUsd).toBeGreaterThan(short.estimatedCostUsd);
    });
  });

  // --------------------------------------------------------------------------
  // estimateBatch
  // --------------------------------------------------------------------------

  describe('estimateBatch()', () => {
    it('sums costs across mixed task types', () => {
      const batch = estimator.estimateBatch([
        {
          type: 'text',
          params: {
            type: 'text',
            prompt: 'Write a script',
            maxOutputTokens: 1000,
            modelId: 'gpt-4o-mini',
          },
        },
        {
          type: 'tts',
          params: {
            type: 'tts',
            wordCount: 300,
            provider: 'aws-polly',
          },
        },
        {
          type: 'image',
          params: {
            type: 'image',
            count: 5,
            resolution: '1024x1024',
            provider: 'openai',
          },
        },
        {
          type: 'video',
          params: {
            type: 'video',
            durationSeconds: 60,
            resolution: '1080p',
          },
        },
      ]);

      expect(batch.items).toHaveLength(4);
      expect(batch.totalEstimatedCostUsd).toBeGreaterThan(0);
      expect(batch.totalWithBufferUsd).toBeGreaterThan(batch.totalEstimatedCostUsd);

      // Total should equal sum of items
      const itemSum = batch.items.reduce((sum, item) => sum + item.estimatedCostUsd, 0);
      expect(batch.totalEstimatedCostUsd).toBeCloseTo(itemSum, 6);
    });

    it('handles empty batch', () => {
      const batch = estimator.estimateBatch([]);

      expect(batch.items).toHaveLength(0);
      expect(batch.totalEstimatedCostUsd).toBe(0);
      expect(batch.totalWithBufferUsd).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Static helpers
  // --------------------------------------------------------------------------

  describe('CostEstimator.countTokens()', () => {
    it('approximates token count as chars/4', () => {
      const text = 'a'.repeat(400); // 400 chars
      expect(CostEstimator.countTokens(text)).toBe(100);
    });

    it('rounds up for non-divisible lengths', () => {
      const text = 'a'.repeat(401); // 401 chars → ceil(401/4) = 101
      expect(CostEstimator.countTokens(text)).toBe(101);
    });
  });
});
