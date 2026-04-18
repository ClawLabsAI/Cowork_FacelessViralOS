// ==============================================================================
// Core Domain Types — Faceless Viral OS
// ==============================================================================

// ------------------------------------------------------------------------------
// Tier
// ------------------------------------------------------------------------------
export type TierName = 'FREE' | 'ECONOMICAL' | 'OPTIMIZED' | 'PREMIUM' | 'ULTRA';

// ------------------------------------------------------------------------------
// Task Types (matches Prisma enum)
// ------------------------------------------------------------------------------
export type TaskType =
  | 'SCRIPT_GENERATION'
  | 'SCENE_GENERATION'
  | 'TTS_GENERATION'
  | 'VIDEO_RENDER'
  | 'TRANSLATION'
  | 'NICHE_RESEARCH'
  | 'TREND_ANALYSIS'
  | 'COMPETITOR_ANALYSIS'
  | 'ANALYTICS_SUMMARY'
  | 'IDEA_GENERATION'
  | 'RECOMMENDATION';

// ------------------------------------------------------------------------------
// Platform
// ------------------------------------------------------------------------------
export type Platform = 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM';

// ------------------------------------------------------------------------------
// Language
// ------------------------------------------------------------------------------
export type Language = 'EN' | 'ES';

// ------------------------------------------------------------------------------
// Job Status
// ------------------------------------------------------------------------------
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'RETRYING';

// ------------------------------------------------------------------------------
// Provider Health
// ------------------------------------------------------------------------------
export type ProviderHealth = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';

// ------------------------------------------------------------------------------
// User Role
// ------------------------------------------------------------------------------
export type UserRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

// ------------------------------------------------------------------------------
// Video Status
// ------------------------------------------------------------------------------
export type VideoStatus = 'DRAFT' | 'RENDERING' | 'READY' | 'PUBLISHED' | 'FAILED';

// ------------------------------------------------------------------------------
// Content Idea Status
// ------------------------------------------------------------------------------
export type ContentIdeaStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'IN_PRODUCTION'
  | 'PUBLISHED'
  | 'REJECTED';

// ------------------------------------------------------------------------------
// API Error
// ------------------------------------------------------------------------------
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
  requestId?: string;
  timestamp: string;
}

// ------------------------------------------------------------------------------
// Pagination
// ------------------------------------------------------------------------------
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ------------------------------------------------------------------------------
// Result<T, E> — Ok/Err discriminated union
// ------------------------------------------------------------------------------
export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

// ------------------------------------------------------------------------------
// JWT Payload
// ------------------------------------------------------------------------------
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ------------------------------------------------------------------------------
// Queue Job Data shapes
// ------------------------------------------------------------------------------
export interface BaseJobData {
  channelId: string;
  userId: string;
  correlationId: string;
  tier: TierName;
}
