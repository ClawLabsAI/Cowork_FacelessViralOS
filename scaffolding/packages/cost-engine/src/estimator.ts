import { COST_ESTIMATE_BUFFER_FACTOR, MINIMUM_COST_USD } from '@fvos/core';

// ==============================================================================
// CostEstimator — Pre-generation cost estimation for all media types
// ==============================================================================

export interface CostEstimate {
  estimatedCostUsd: number;
  /** Includes the COST_ESTIMATE_BUFFER_FACTOR overhead */
  estimatedCostWithBufferUsd: number;
  breakdown: Record<string, unknown>;
  currency: 'USD';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface EstimateRequest {
  type: 'text' | 'tts' | 'image' | 'video';
  params: TextEstimateParams | TTSEstimateParams | ImageEstimateParams | VideoEstimateParams;
}

export interface TextEstimateParams {
  type: 'text';
  prompt: string;
  maxOutputTokens: number;
  modelId: string;
}

export interface TTSEstimateParams {
  type: 'tts';
  wordCount: number;
  provider: string;
}

export interface ImageEstimateParams {
  type: 'image';
  count: number;
  resolution: string;
  provider: string;
}

export interface VideoEstimateParams {
  type: 'video';
  durationSeconds: number;
  resolution: string;
}

export interface BatchCostEstimate {
  items: CostEstimate[];
  totalEstimatedCostUsd: number;
  totalWithBufferUsd: number;
}

// ==============================================================================
// Pricing Tables
// ==============================================================================

/** LLM pricing per 1k tokens (USD) */
const LLM_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'o3-mini': { input: 0.0011, output: 0.0044 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  // Anthropic
  'claude-sonnet-4-5': { input: 0.003, output: 0.015 },
  'claude-haiku-4-5': { input: 0.00025, output: 0.00125 },
  'claude-opus-4-5': { input: 0.015, output: 0.075 },
  // Groq (very cheap, fast)
  'llama-3.1-70b-versatile': { input: 0.00059, output: 0.00079 },
  'mixtral-8x7b-32768': { input: 0.00027, output: 0.00027 },
  // Default fallback
  default: { input: 0.001, output: 0.002 },
};

/** TTS pricing per 1k characters (USD) */
const TTS_PRICING: Record<string, number> = {
  elevenlabs: 0.3, // $0.30 per 1k chars
  'aws-polly': 0.004, // $0.004 per 1k chars (standard)
  'aws-polly-neural': 0.016, // $0.016 per 1k chars (neural)
  'google-tts': 0.004,
  'azure-tts': 0.016,
  default: 0.02,
};

/** Image generation pricing per image (USD) */
const IMAGE_PRICING: Record<string, Record<string, number>> = {
  openai: {
    '256x256': 0.016,
    '512x512': 0.018,
    '1024x1024': 0.02,
    '1792x1024': 0.04,
    '1024x1792': 0.04,
    default: 0.02,
  },
  'stability-ai': {
    '512x512': 0.005,
    '1024x1024': 0.01,
    default: 0.008,
  },
  midjourney: {
    default: 0.04,
  },
  default: { default: 0.02 },
};

/** Video rendering cost per second (USD) — compute-based estimate */
const VIDEO_RENDER_COST_PER_SECOND: Record<string, number> = {
  '720p': 0.002,
  '1080p': 0.004,
  '4K': 0.012,
  default: 0.005,
};

// Average characters per word for TTS estimation
const AVG_CHARS_PER_WORD = 5.5;

// ==============================================================================
// CostEstimator class
// ==============================================================================

export class CostEstimator {
  /**
   * Estimate cost for a text generation task.
   * Uses chars/4 approximation for token counting.
   */
  estimateTextGeneration(
    prompt: string,
    maxOutputTokens: number,
    modelId: string,
  ): CostEstimate {
    // Approximate input tokens from prompt length
    const inputTokens = Math.ceil(prompt.length / 4) + 200; // +200 system overhead
    const outputTokens = maxOutputTokens;

    const pricing = LLM_PRICING[modelId] ?? LLM_PRICING['default']!;

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    const totalCost = Math.max(inputCost + outputCost, MINIMUM_COST_USD);

    return {
      estimatedCostUsd: totalCost,
      estimatedCostWithBufferUsd: totalCost * COST_ESTIMATE_BUFFER_FACTOR,
      breakdown: {
        inputTokens,
        outputTokens,
        inputCostUsd: inputCost,
        outputCostUsd: outputCost,
      },
      currency: 'USD',
      confidence: LLM_PRICING[modelId] ? 'HIGH' : 'MEDIUM',
    };
  }

  /**
   * Estimate cost for Text-to-Speech generation.
   */
  estimateTTS(wordCount: number, provider: string): CostEstimate {
    const charCount = wordCount * AVG_CHARS_PER_WORD;
    const pricePerThousandChars = TTS_PRICING[provider.toLowerCase()] ?? TTS_PRICING['default']!;
    const totalCost = Math.max((charCount / 1000) * pricePerThousandChars, MINIMUM_COST_USD);

    return {
      estimatedCostUsd: totalCost,
      estimatedCostWithBufferUsd: totalCost * COST_ESTIMATE_BUFFER_FACTOR,
      breakdown: {
        wordCount,
        charCount,
        pricePerThousandChars,
      },
      currency: 'USD',
      confidence: TTS_PRICING[provider.toLowerCase()] ? 'HIGH' : 'LOW',
    };
  }

  /**
   * Estimate cost for image generation.
   */
  estimateImageGeneration(count: number, resolution: string, provider: string): CostEstimate {
    const providerPricing = IMAGE_PRICING[provider.toLowerCase()] ?? IMAGE_PRICING['default']!;
    const pricePerImage = providerPricing[resolution] ?? providerPricing['default'] ?? 0.02;
    const totalCost = Math.max(count * pricePerImage, MINIMUM_COST_USD);

    return {
      estimatedCostUsd: totalCost,
      estimatedCostWithBufferUsd: totalCost * COST_ESTIMATE_BUFFER_FACTOR,
      breakdown: {
        count,
        resolution,
        pricePerImage,
      },
      currency: 'USD',
      confidence:
        IMAGE_PRICING[provider.toLowerCase()]?.[resolution] !== undefined ? 'HIGH' : 'MEDIUM',
    };
  }

  /**
   * Estimate cost for video rendering (CPU/GPU compute).
   */
  estimateVideoRendering(durationSeconds: number, resolution: string): CostEstimate {
    const costPerSecond =
      VIDEO_RENDER_COST_PER_SECOND[resolution] ?? VIDEO_RENDER_COST_PER_SECOND['default']!;
    const totalCost = Math.max(durationSeconds * costPerSecond, MINIMUM_COST_USD);

    return {
      estimatedCostUsd: totalCost,
      estimatedCostWithBufferUsd: totalCost * COST_ESTIMATE_BUFFER_FACTOR,
      breakdown: {
        durationSeconds,
        resolution,
        costPerSecond,
      },
      currency: 'USD',
      confidence: VIDEO_RENDER_COST_PER_SECOND[resolution] ? 'HIGH' : 'MEDIUM',
    };
  }

  /**
   * Estimate total cost for a batch of different tasks.
   */
  estimateBatch(items: EstimateRequest[]): BatchCostEstimate {
    const estimates = items.map((item) => {
      switch (item.params.type) {
        case 'text': {
          const p = item.params as TextEstimateParams;
          return this.estimateTextGeneration(p.prompt, p.maxOutputTokens, p.modelId);
        }
        case 'tts': {
          const p = item.params as TTSEstimateParams;
          return this.estimateTTS(p.wordCount, p.provider);
        }
        case 'image': {
          const p = item.params as ImageEstimateParams;
          return this.estimateImageGeneration(p.count, p.resolution, p.provider);
        }
        case 'video': {
          const p = item.params as VideoEstimateParams;
          return this.estimateVideoRendering(p.durationSeconds, p.resolution);
        }
        default: {
          const _exhaustive: never = item.params;
          return _exhaustive;
        }
      }
    });

    const totalEstimatedCostUsd = estimates.reduce((sum, e) => sum + e.estimatedCostUsd, 0);
    const totalWithBufferUsd = estimates.reduce(
      (sum, e) => sum + e.estimatedCostWithBufferUsd,
      0,
    );

    return {
      items: estimates,
      totalEstimatedCostUsd,
      totalWithBufferUsd,
    };
  }

  /**
   * Quick estimate: approximate tokens in a prompt string.
   */
  static countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
