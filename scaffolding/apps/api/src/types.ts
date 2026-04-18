import type { Language, TierName } from '@fvos/core';

// ==============================================================================
// API — Shared TypeScript interfaces for job data
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
