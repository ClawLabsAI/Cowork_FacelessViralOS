import type { ProviderHealth } from '@fvos/core';

import type {
  GenerationRequest,
  GenerationResult,
  ProviderModel,
  TokenEstimate,
} from '../types.js';

// ==============================================================================
// BaseProvider — Abstract base class for all AI provider adapters
// ==============================================================================

export abstract class BaseProvider {
  /** Stable identifier matching the DB provider.name field */
  abstract readonly providerId: string;

  /** Human-readable display name */
  abstract readonly providerName: string;

  /**
   * Send a generation request and return the result.
   * Must throw a typed ProviderError on failure.
   */
  abstract generate(request: GenerationRequest): Promise<GenerationResult>;

  /**
   * Estimate the cost of a generation given token counts and a model ID.
   * Returns cost in USD.
   */
  abstract estimateCost(tokens: TokenEstimate, modelId: string): number;

  /**
   * Perform a health check against the provider API.
   * Should resolve quickly (< 5s timeout).
   */
  abstract healthCheck(): Promise<ProviderHealth>;

  /**
   * Return metadata for all models this provider supports.
   */
  abstract getAvailableModels(): ProviderModel[];
}

// ==============================================================================
// ProviderError — Typed error class for provider failures
// ==============================================================================

export type ProviderErrorCode =
  | 'RATE_LIMIT'
  | 'AUTH_ERROR'
  | 'TIMEOUT'
  | 'CONTEXT_LENGTH'
  | 'CONTENT_FILTER'
  | 'OVERLOADED'
  | 'UNKNOWN';

export class ProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message: string,
    public readonly providerId: string,
    public readonly retryable: boolean,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProviderError';
  }

  static rateLimit(providerId: string, retryAfterMs?: number): ProviderError {
    return new ProviderError(
      'RATE_LIMIT',
      `Provider ${providerId} rate limit exceeded${retryAfterMs ? ` — retry after ${retryAfterMs}ms` : ''}`,
      providerId,
      true,
    );
  }

  static authError(providerId: string): ProviderError {
    return new ProviderError(
      'AUTH_ERROR',
      `Provider ${providerId} authentication failed — check API key`,
      providerId,
      false,
    );
  }

  static timeout(providerId: string, timeoutMs: number): ProviderError {
    return new ProviderError(
      'TIMEOUT',
      `Provider ${providerId} timed out after ${timeoutMs}ms`,
      providerId,
      true,
    );
  }

  static overloaded(providerId: string): ProviderError {
    return new ProviderError(
      'OVERLOADED',
      `Provider ${providerId} is overloaded`,
      providerId,
      true,
    );
  }

  static contextLength(providerId: string, modelId: string): ProviderError {
    return new ProviderError(
      'CONTEXT_LENGTH',
      `Input exceeds context length for ${providerId}/${modelId}`,
      providerId,
      false,
    );
  }

  static unknown(providerId: string, cause: unknown): ProviderError {
    return new ProviderError(
      'UNKNOWN',
      `Unknown error from provider ${providerId}: ${String(cause)}`,
      providerId,
      false,
      cause,
    );
  }
}
