import type { PrismaClient } from '@fvos/db';
import type { TaskType, TierName } from '@fvos/core';

import type {
  GenerationResult,
  ModelMetadata,
  ProviderModelPair,
  ProviderSelection,
  RoutingRequest,
} from './types.js';
import { ProviderRegistry } from './registry.js';
import { scoreProvider } from './scoring.js';
import { ProviderError } from './providers/base.js';

// ==============================================================================
// ModelRouter — Core routing engine for AI generation requests
// ==============================================================================

export class ModelRouter {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly db: PrismaClient,
  ) {}

  /**
   * Select the best provider+model for a given routing request.
   * Respects per-channel overrides, then falls back to tier-level policies,
   * then scores all available models.
   */
  async route(request: RoutingRequest): Promise<ProviderSelection> {
    // 1. Check for override
    if (request.overrideProviderId) {
      const provider = this.registry.get(request.overrideProviderId);
      if (!provider) {
        throw new Error(`Override provider '${request.overrideProviderId}' not registered`);
      }
      const models = provider.getAvailableModels();
      const model = models.find((m) => m.taskTypes.includes(request.taskType)) ?? models[0];
      if (!model) {
        throw new Error(
          `Provider '${request.overrideProviderId}' has no models for task ${request.taskType}`,
        );
      }
      const metadata = this.toModelMetadata(model, request.overrideProviderId);
      const estimatedCostUsd = provider.estimateCost(
        {
          inputTokens: this.estimateInputTokens(request),
          outputTokens: request.maxTokens ?? 2000,
        },
        model.modelId,
      );
      return {
        providerId: provider.providerId,
        providerName: provider.providerName,
        modelId: model.modelId,
        estimatedCostUsd,
        estimatedLatencyMs: model.latencyMs,
        fallbackChain: [],
        selectionReason: `Manual override to ${provider.providerName}`,
      };
    }

    // 2. Load routing policy from DB (channel-specific, then tier-level)
    const policy = await this.loadRoutingPolicy(request);

    if (policy) {
      // Use the policy's preferred provider if it's registered and healthy
      const preferredProvider = this.registry.get(policy.preferredProviderId);
      if (preferredProvider) {
        const models = preferredProvider.getAvailableModels();
        const model =
          models.find((m) => m.taskTypes.includes(request.taskType)) ?? models[0];

        if (model) {
          const fallbackChain = this.buildFallbackChain(request, policy);
          const estimatedCostUsd = preferredProvider.estimateCost(
            {
              inputTokens: this.estimateInputTokens(request),
              outputTokens: request.maxTokens ?? 2000,
            },
            model.modelId,
          );
          return {
            providerId: preferredProvider.providerId,
            providerName: preferredProvider.providerName,
            modelId: model.modelId,
            estimatedCostUsd,
            estimatedLatencyMs: model.latencyMs,
            fallbackChain,
            selectionReason: `Policy: tier=${request.tier} task=${request.taskType}`,
          };
        }
      }
    }

    // 3. Load all model metadata from DB for scoring
    const dbModels = await this.loadModelsFromDb(request.taskType);

    // 4. Score all available provider+model pairs
    type ScoredPair = {
      providerId: string;
      providerName: string;
      modelId: string;
      score: number;
      metadata: ModelMetadata;
    };

    const scored: ScoredPair[] = [];

    for (const dbModel of dbModels) {
      const provider = this.registry.get(dbModel.providerId);
      if (!provider) continue;

      const score = scoreProvider(provider, dbModel.modelId, request, dbModel);
      scored.push({
        providerId: dbModel.providerId,
        providerName: provider.providerName,
        modelId: dbModel.modelId,
        score,
        metadata: dbModel,
      });
    }

    if (scored.length === 0) {
      throw new Error(
        `No available providers for task=${request.taskType} tier=${request.tier}`,
      );
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0]!;
    const provider = this.registry.get(best.providerId)!;

    const estimatedCostUsd = provider.estimateCost(
      {
        inputTokens: this.estimateInputTokens(request),
        outputTokens: request.maxTokens ?? 2000,
      },
      best.modelId,
    );

    // Build fallback chain from the next best options
    const fallbackChain: ProviderModelPair[] = scored
      .slice(1, 4) // Up to 3 fallbacks
      .map((s) => ({ providerId: s.providerId, modelId: s.modelId }));

    return {
      providerId: best.providerId,
      providerName: best.providerName,
      modelId: best.modelId,
      estimatedCostUsd,
      estimatedLatencyMs: best.metadata.latencyMs,
      fallbackChain,
      selectionReason: `Scored selection: score=${best.score.toFixed(1)} tier=${request.tier}`,
    };
  }

  /**
   * Route to the best provider, generate, and return the result.
   * Tries the primary provider first, then falls back through the chain.
   */
  async generate(request: RoutingRequest): Promise<GenerationResult> {
    const selection = await this.route(request);

    // Try primary
    try {
      return await this.tryProvider(
        { providerId: selection.providerId, modelId: selection.modelId },
        request,
      );
    } catch (err) {
      if (!isRetryableError(err)) throw err;

      console.warn(
        `Primary provider ${selection.providerId}/${selection.modelId} failed: ${String(err)}. Trying fallbacks.`,
      );
    }

    // Try fallback chain
    for (const fallback of selection.fallbackChain) {
      try {
        return await this.tryProvider(fallback, request);
      } catch (err) {
        if (!isRetryableError(err)) throw err;
        console.warn(
          `Fallback ${fallback.providerId}/${fallback.modelId} failed: ${String(err)}`,
        );
      }
    }

    throw new Error(
      `All providers exhausted for task=${request.taskType} tier=${request.tier}. ` +
        `Tried: ${selection.providerId}, ${selection.fallbackChain.map((f) => f.providerId).join(', ')}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async loadRoutingPolicy(
    request: RoutingRequest,
  ): Promise<{ preferredProviderId: string; fallbackChain: ProviderModelPair[] } | null> {
    try {
      // First look for channel-specific policy
      if (request.channelId) {
        const channelPolicy = await this.db.routingPolicy.findFirst({
          where: {
            channelId: request.channelId,
            tier: request.tier as TierName,
            taskType: request.taskType as TaskType,
            overrideEnabled: true,
          },
        });

        if (channelPolicy) {
          return {
            preferredProviderId: channelPolicy.preferredProviderId,
            fallbackChain: channelPolicy.fallbackChain as ProviderModelPair[],
          };
        }
      }

      // Fall back to tier-level policy
      const tierPolicy = await this.db.routingPolicy.findFirst({
        where: {
          channelId: null,
          tier: request.tier as TierName,
          taskType: request.taskType as TaskType,
        },
      });

      if (tierPolicy) {
        return {
          preferredProviderId: tierPolicy.preferredProviderId,
          fallbackChain: tierPolicy.fallbackChain as ProviderModelPair[],
        };
      }

      return null;
    } catch {
      // DB unavailable — proceed with scoring
      return null;
    }
  }

  private buildFallbackChain(
    request: RoutingRequest,
    policy: { fallbackChain: ProviderModelPair[] },
  ): ProviderModelPair[] {
    if (policy.fallbackChain.length > 0) {
      return policy.fallbackChain;
    }

    // Auto-generate fallback: all registered providers except the primary
    return this.registry
      .getAll()
      .filter((_p) => true) // All providers as potential fallbacks
      .flatMap((p) => {
        const model = p
          .getAvailableModels()
          .find((m) => m.taskTypes.includes(request.taskType));
        if (!model) return [];
        return [{ providerId: p.providerId, modelId: model.modelId }];
      })
      .slice(0, 3);
  }

  private async tryProvider(
    pair: ProviderModelPair,
    request: RoutingRequest,
  ): Promise<GenerationResult> {
    const provider = this.registry.get(pair.providerId);
    if (!provider) {
      throw new Error(`Provider '${pair.providerId}' not registered`);
    }

    return provider.generate({
      systemPrompt: request.systemPrompt,
      userPrompt: request.userPrompt,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      modelId: pair.modelId,
    });
  }

  private async loadModelsFromDb(taskType: TaskType): Promise<ModelMetadata[]> {
    try {
      const models = await this.db.aIModel.findMany({
        where: { taskTypes: { has: taskType } },
        include: { provider: true },
      });

      return models.map((m) => ({
        modelId: m.modelId,
        providerId: m.provider.name, // use provider name as id for registry lookup
        taskTypes: m.taskTypes as TaskType[],
        costPer1kInput: Number(m.costPer1kInput),
        costPer1kOutput: Number(m.costPer1kOutput),
        qualityScore: Number(m.qualityScore),
        latencyMs: m.latencyMs,
        maxTokens: m.maxTokens,
      }));
    } catch {
      // DB unavailable — use models from registered providers
      return this.registry.getAll().flatMap((p) =>
        p
          .getAvailableModels()
          .filter((m) => m.taskTypes.includes(taskType))
          .map((m) => this.toModelMetadata(m, p.providerId)),
      );
    }
  }

  private toModelMetadata(
    model: { modelId: string; taskTypes: TaskType[]; costPer1kInput: number; costPer1kOutput: number; qualityScore: number; latencyMs: number; maxTokens: number },
    providerId: string,
  ): ModelMetadata {
    return {
      modelId: model.modelId,
      providerId,
      taskTypes: model.taskTypes,
      costPer1kInput: model.costPer1kInput,
      costPer1kOutput: model.costPer1kOutput,
      qualityScore: model.qualityScore,
      latencyMs: model.latencyMs,
      maxTokens: model.maxTokens,
    };
  }

  private estimateInputTokens(request: RoutingRequest): number {
    const len = (request.systemPrompt?.length ?? 0) + request.userPrompt.length;
    return Math.ceil(len / 4) + 200;
  }
}

// ==============================================================================
// Helpers
// ==============================================================================

function isRetryableError(err: unknown): boolean {
  if (err instanceof ProviderError) {
    return err.retryable;
  }
  return true; // Unknown errors: retry
}
