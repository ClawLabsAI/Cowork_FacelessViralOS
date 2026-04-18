import type { Language, Platform, TierName } from '../types/index.js';

// ------------------------------------------------------------------------------
// Tier constants
// ------------------------------------------------------------------------------
export const TIER_NAMES: TierName[] = [
  'FREE',
  'ECONOMICAL',
  'OPTIMIZED',
  'PREMIUM',
  'ULTRA',
];

export const DEFAULT_TIER: TierName = 'ECONOMICAL';

// Approximate monthly budget ceiling (USD) for each tier
export const TIER_MONTHLY_BUDGET_USD: Record<TierName, number> = {
  FREE: 5,
  ECONOMICAL: 25,
  OPTIMIZED: 75,
  PREMIUM: 200,
  ULTRA: 1000,
};

// Maximum cost per single task allowed by tier
export const TIER_MAX_TASK_COST_USD: Record<TierName, number> = {
  FREE: 0.05,
  ECONOMICAL: 0.15,
  OPTIMIZED: 0.50,
  PREMIUM: 2.00,
  ULTRA: 10.00,
};

// Quality target (0-100) per tier — used for model scoring
export const TIER_QUALITY_TARGET: Record<TierName, number> = {
  FREE: 40,
  ECONOMICAL: 55,
  OPTIMIZED: 70,
  PREMIUM: 85,
  ULTRA: 95,
};

// ------------------------------------------------------------------------------
// Platform constants
// ------------------------------------------------------------------------------
export const PLATFORMS: Platform[] = ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'];

export const PLATFORM_MAX_DURATION_SECONDS: Record<Platform, number> = {
  YOUTUBE: 3600, // 60 min
  TIKTOK: 600,   // 10 min
  INSTAGRAM: 900, // 15 min reels
};

// ------------------------------------------------------------------------------
// Language constants
// ------------------------------------------------------------------------------
export const LANGUAGES: Language[] = ['EN', 'ES'];

// ------------------------------------------------------------------------------
// Retry / resilience
// ------------------------------------------------------------------------------
export const MAX_RETRY_ATTEMPTS = 3;
export const BASE_RETRY_DELAY_MS = 1000;
export const MAX_RETRY_DELAY_MS = 30_000;

// ------------------------------------------------------------------------------
// Content generation
// ------------------------------------------------------------------------------
export const DEFAULT_SCRIPT_MAX_WORDS = 1500;
export const DEFAULT_SCRIPT_MIN_WORDS = 100;
export const WORDS_PER_MINUTE_SPEECH = 150;

// Approximate tokens per word (for cost estimation)
export const AVG_TOKENS_PER_WORD = 1.4;

// Buffer applied on top of cost estimates
export const COST_ESTIMATE_BUFFER_FACTOR = 1.2;

// Minimum recorded cost (avoid zero-cost records)
export const MINIMUM_COST_USD = 0.0001;

// ------------------------------------------------------------------------------
// Queue names
// ------------------------------------------------------------------------------
export const QUEUE_NAMES = {
  CONTENT: 'content',
  MEDIA: 'media',
  PUBLISH: 'publish',
  ANALYTICS: 'analytics',
  RESEARCH: 'research',
  GOVERNANCE: 'governance',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ------------------------------------------------------------------------------
// Job types
// ------------------------------------------------------------------------------
export const JOB_TYPES = {
  SCRIPT_GENERATION: 'script-generation',
  SCENE_GENERATION: 'scene-generation',
  TTS_GENERATION: 'tts-generation',
  VIDEO_RENDER: 'video-render',
  PUBLISH_VIDEO: 'publish-video',
  SYNC_ANALYTICS: 'sync-analytics',
  NICHE_RESEARCH: 'niche-research',
  TREND_ANALYSIS: 'trend-analysis',
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];
