import type { Language, Platform, ProviderHealth, TaskType, TierName } from '@fvos/core';

// ==============================================================================
// AI Router — Type Definitions
// ==============================================================================

export interface RoutingRequest {
  taskType: TaskType;
  tier: TierName;
  language: Language;
  platform?: Platform;
  channelId?: string;
  budgetRemainingUsd?: number;
  urgency?: 'LOW' | 'NORMAL' | 'HIGH';
  maxLatencyMs?: number;
  overrideProviderId?: string;
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ProviderModelPair {
  providerId: string;
  modelId: string;
}

export interface ProviderSelection {
  providerId: string;
  providerName: string;
  modelId: string;
  estimatedCostUsd: number;
  estimatedLatencyMs: number;
  fallbackChain: ProviderModelPair[];
  selectionReason: string;
}

export interface GenerationResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
  actualCostUsd: number;
  actualLatencyMs: number;
  providerId: string;
  modelId: string;
  finishReason: string;
}

export interface TokenEstimate {
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderModel {
  modelId: string;
  taskTypes: TaskType[];
  costPer1kInput: number;
  costPer1kOutput: number;
  qualityScore: number;
  latencyMs: number;
  maxTokens: number;
}

export interface HealthReport {
  timestamp: Date;
  providers: Record<
    string,
    {
      status: ProviderHealth;
      latencyMs?: number;
      error?: string;
    }
  >;
}

export interface ModelMetadata {
  modelId: string;
  providerId: string;
  taskTypes: TaskType[];
  costPer1kInput: number;
  costPer1kOutput: number;
  qualityScore: number;
  latencyMs: number;
  maxTokens: number;
}

export interface GenerationRequest {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  modelId: string;
}
