import type { Language, TierName } from '@fvos/core';

// ==============================================================================
// Worker — Job data type definitions
// (Must match the shapes queued by the API)
// ==============================================================================

export interface ScriptGenerationJobData {
  scriptId: string;
  channelId: string;
  userId: string;
  ideaId?: string;
  language: Language;
  format: 'listicle' | 'story' | 'tutorial' | 'debate' | 'review';
  tone: 'informative' | 'entertaining' | 'inspirational' | 'serious' | 'humorous';
  targetDurationSeconds: number;
  topic: string;
  tier: TierName;
  temperature?: number;
  correlationId: string;
  brandContext: {
    name: string;
    niche?: string;
    toneDescription: string;
    primaryLanguage: string;
  };
}

export interface ScriptGenerationResult {
  scriptId: string;
  channelId: string;
  wordCount: number;
  actualCostUsd: number;
  modelUsed: string;
  providerId: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  correlationId: string;
}
