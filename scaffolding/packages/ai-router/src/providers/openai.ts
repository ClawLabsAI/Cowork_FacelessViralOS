import type { ProviderHealth, TaskType } from '@fvos/core';
import OpenAI from 'openai';

import type {
  GenerationRequest,
  GenerationResult,
  ProviderModel,
  TokenEstimate,
} from '../types.js';
import { BaseProvider, ProviderError } from './base.js';

// ==============================================================================
// OpenAI Provider Adapter
// ==============================================================================

interface OpenAIProviderConfig {
  apiKey: string;
  organization?: string;
  timeoutMs?: number;
}

/** Cost per 1k tokens in USD, as of 2024-Q4 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'o3-mini': { input: 0.0011, output: 0.0044 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
};

const MODEL_METADATA: ProviderModel[] = [
  {
    modelId: 'gpt-4o',
    taskTypes: ['SCRIPT_GENERATION', 'SCENE_GENERATION', 'IDEA_GENERATION', 'RECOMMENDATION'] as TaskType[],
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    qualityScore: 92,
    latencyMs: 3500,
    maxTokens: 128000,
  },
  {
    modelId: 'gpt-4o-mini',
    taskTypes: ['SCRIPT_GENERATION', 'TRANSLATION', 'ANALYTICS_SUMMARY', 'IDEA_GENERATION'] as TaskType[],
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    qualityScore: 78,
    latencyMs: 1500,
    maxTokens: 128000,
  },
  {
    modelId: 'o3-mini',
    taskTypes: ['NICHE_RESEARCH', 'TREND_ANALYSIS', 'COMPETITOR_ANALYSIS'] as TaskType[],
    costPer1kInput: 0.0011,
    costPer1kOutput: 0.0044,
    qualityScore: 88,
    latencyMs: 5000,
    maxTokens: 200000,
  },
];

export class OpenAIProvider extends BaseProvider {
  readonly providerId = 'openai';
  readonly providerName = 'OpenAI';

  private readonly client: OpenAI;
  private readonly timeoutMs: number;

  constructor(config: OpenAIProviderConfig) {
    super();
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      timeout: config.timeoutMs ?? 60_000,
      maxRetries: 0, // We handle retries at the router level
    });
    this.timeoutMs = config.timeoutMs ?? 60_000;
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const startMs = Date.now();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.userPrompt });

    try {
      const response = await this.client.chat.completions.create({
        model: request.modelId,
        messages,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      });

      const latencyMs = Date.now() - startMs;
      const choice = response.choices[0];

      if (!choice) {
        throw new Error('No choices returned from OpenAI');
      }

      const content = choice.message.content ?? '';
      const tokensIn = response.usage?.prompt_tokens ?? 0;
      const tokensOut = response.usage?.completion_tokens ?? 0;

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
        finishReason: choice.finish_reason ?? 'unknown',
      };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  estimateCost(tokens: TokenEstimate, modelId: string): number {
    const pricing = MODEL_PRICING[modelId] ?? MODEL_PRICING['gpt-4o-mini'];
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
      await this.client.models.list();
      const latency = Date.now() - start;

      if (latency > 10_000) return 'DEGRADED';
      return 'HEALTHY';
    } catch (err) {
      const mapped = this.mapError(err);
      if (mapped.code === 'AUTH_ERROR') return 'DOWN';
      return 'DEGRADED';
    }
  }

  getAvailableModels(): ProviderModel[] {
    return MODEL_METADATA;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private mapError(err: unknown): ProviderError {
    if (err instanceof OpenAI.APIError) {
      if (err.status === 401 || err.status === 403) {
        return ProviderError.authError(this.providerId);
      }
      if (err.status === 429) {
        const retryAfter = this.parseRetryAfter(err);
        return ProviderError.rateLimit(this.providerId, retryAfter);
      }
      if (err.status === 503 || err.status === 529) {
        return ProviderError.overloaded(this.providerId);
      }
      if (err.status === 400 && err.message.includes('context')) {
        return ProviderError.contextLength(this.providerId, 'unknown');
      }
      if (err instanceof OpenAI.APIConnectionTimeoutError) {
        return ProviderError.timeout(this.providerId, this.timeoutMs);
      }
    }
    return ProviderError.unknown(this.providerId, err);
  }

  private parseRetryAfter(err: OpenAI.APIError): number | undefined {
    const header = (err as { headers?: Record<string, string> }).headers?.['retry-after'];
    if (header) {
      const seconds = parseInt(header, 10);
      if (!isNaN(seconds)) return seconds * 1000;
    }
    return undefined;
  }
}
