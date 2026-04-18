import Anthropic from '@anthropic-ai/sdk';
import type { ProviderHealth, TaskType } from '@fvos/core';

import type {
  GenerationRequest,
  GenerationResult,
  ProviderModel,
  TokenEstimate,
} from '../types.js';
import { BaseProvider, ProviderError } from './base.js';

// ==============================================================================
// Anthropic Provider Adapter
// ==============================================================================

interface AnthropicProviderConfig {
  apiKey: string;
  timeoutMs?: number;
}

/** Cost per 1k tokens in USD, as of 2024-Q4 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-5': { input: 0.015, output: 0.075 },
  'claude-sonnet-4-5': { input: 0.003, output: 0.015 },
  'claude-haiku-4-5': { input: 0.00025, output: 0.00125 },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
};

const MODEL_METADATA: ProviderModel[] = [
  {
    modelId: 'claude-sonnet-4-5',
    taskTypes: [
      'SCRIPT_GENERATION',
      'SCENE_GENERATION',
      'TRANSLATION',
      'RECOMMENDATION',
      'IDEA_GENERATION',
    ] as TaskType[],
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    qualityScore: 90,
    latencyMs: 3000,
    maxTokens: 200000,
  },
  {
    modelId: 'claude-haiku-4-5',
    taskTypes: ['SCRIPT_GENERATION', 'TRANSLATION', 'ANALYTICS_SUMMARY'] as TaskType[],
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.00125,
    qualityScore: 75,
    latencyMs: 1000,
    maxTokens: 200000,
  },
];

export class AnthropicProvider extends BaseProvider {
  readonly providerId = 'anthropic';
  readonly providerName = 'Anthropic';

  private readonly client: Anthropic;
  private readonly timeoutMs: number;

  constructor(config: AnthropicProviderConfig) {
    super();
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeoutMs ?? 60_000,
      maxRetries: 0, // Router handles retries
    });
    this.timeoutMs = config.timeoutMs ?? 60_000;
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const startMs = Date.now();

    try {
      const response = await this.client.messages.create({
        model: request.modelId,
        max_tokens: request.maxTokens ?? 4096,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
        temperature: request.temperature ?? 0.7,
      });

      const latencyMs = Date.now() - startMs;

      // Collect all text blocks
      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      const tokensIn = response.usage.input_tokens;
      const tokensOut = response.usage.output_tokens;

      const actualCostUsd = this.estimateCost(
        { inputTokens: tokensIn, outputTokens: tokensOut },
        request.modelId,
      );

      return {
        content,
        tokensIn,
        tokensOut,
        actualCostUsd,
        actualLatencyMs: latencyMs,
        providerId: this.providerId,
        modelId: request.modelId,
        finishReason: response.stop_reason ?? 'end_turn',
      };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  estimateCost(tokens: TokenEstimate, modelId: string): number {
    const pricing = MODEL_PRICING[modelId] ?? MODEL_PRICING['claude-haiku-4-5'];
    if (!pricing) {
      return 0;
    }
    const inputCost = (tokens.inputTokens / 1000) * pricing.input;
    const outputCost = (tokens.outputTokens / 1000) * pricing.output;
    return inputCost + outputCost;
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const start = Date.now();
      // Minimal ping: count 1 token on the cheapest model
      await this.client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      const latency = Date.now() - start;

      if (latency > 15_000) return 'DEGRADED';
      return 'HEALTHY';
    } catch (err) {
      const mapped = this.mapError(err);
      if (mapped.code === 'AUTH_ERROR') return 'DOWN';
      if (mapped.code === 'OVERLOADED') return 'DEGRADED';
      return 'DOWN';
    }
  }

  getAvailableModels(): ProviderModel[] {
    return MODEL_METADATA;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private mapError(err: unknown): ProviderError {
    if (err instanceof Anthropic.APIError) {
      if (err.status === 401 || err.status === 403) {
        return ProviderError.authError(this.providerId);
      }
      if (err.status === 429) {
        return ProviderError.rateLimit(this.providerId);
      }
      if (err.status === 529 || err.status === 503) {
        return ProviderError.overloaded(this.providerId);
      }
      if (err instanceof Anthropic.APIConnectionTimeoutError) {
        return ProviderError.timeout(this.providerId, this.timeoutMs);
      }
      if (err.status === 400 && err.message.toLowerCase().includes('max_tokens')) {
        return ProviderError.contextLength(this.providerId, 'unknown');
      }
    }
    return ProviderError.unknown(this.providerId, err);
  }
}
