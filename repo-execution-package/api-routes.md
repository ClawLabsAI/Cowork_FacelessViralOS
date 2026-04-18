# Faceless Viral OS — API Routes Reference

**Base URL:** `/api/v1`
**Auth:** All protected routes require `Authorization: Bearer <access_token>` header.
**Rate limits:** Specified per route. Limits are per-workspace unless noted as per-IP.

---

## Auth

### POST /api/v1/auth/login

**Description:** Authenticates a user with email and password. Returns a short-lived access token and a long-lived refresh token.

**Auth required:** No

**Rate limit:** 10 requests/minute per IP

**Queue job triggered:** None

**Request body:**
```typescript
interface LoginRequest {
  email: string;       // valid email format
  password: string;    // min 8 chars
}
```

**Response body:**
```typescript
interface LoginResponse {
  accessToken: string;          // JWT, expires in 15 minutes
  refreshToken: string;         // opaque token, expires in 30 days
  expiresIn: number;            // seconds until access token expiry (900)
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  };
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    tier: 'FREE' | 'STARTER' | 'PRO' | 'AGENCY';
    role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  }>;
}
```

**Error responses:**
- `401 Unauthorized` — Invalid credentials
- `429 Too Many Requests` — Rate limit exceeded

---

### POST /api/v1/auth/refresh

**Description:** Exchanges a valid refresh token for a new access token and rotated refresh token. Old refresh token is invalidated immediately after use.

**Auth required:** No

**Rate limit:** 30 requests/minute per IP

**Queue job triggered:** None

**Request body:**
```typescript
interface RefreshRequest {
  refreshToken: string;
}
```

**Response body:**
```typescript
interface RefreshResponse {
  accessToken: string;    // new JWT, expires in 15 minutes
  refreshToken: string;   // new refresh token (old one is now invalid)
  expiresIn: number;      // 900
}
```

**Error responses:**
- `401 Unauthorized` — Invalid, expired, or already-used refresh token

---

### POST /api/v1/auth/logout

**Description:** Invalidates the current refresh token. The access token will expire naturally (no server-side revocation in Phase 1).

**Auth required:** Yes

**Rate limit:** 60 requests/minute per user

**Queue job triggered:** None

**Request body:**
```typescript
interface LogoutRequest {
  refreshToken: string;
}
```

**Response body:**
```typescript
interface LogoutResponse {
  success: true;
}
```

---

## Channels

### GET /api/v1/channels

**Description:** Returns a paginated list of channels for the authenticated user's current workspace.

**Auth required:** Yes

**Rate limit:** 120 requests/minute per workspace

**Queue job triggered:** None

**Query parameters:**
```typescript
interface ListChannelsQuery {
  status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'SETUP';
  page?: number;    // default: 1
  limit?: number;   // default: 20, max: 100
}
```

**Response body:**
```typescript
interface ListChannelsResponse {
  data: Array<{
    id: string;
    name: string;
    slug: string;
    status: ChannelStatus;
    language: Language;
    targetNiches: string[];
    publishingCadence: number | null;
    latestInsight: {
      summary: string;
      generatedAt: string;
    } | null;
    platformAccounts: Array<{
      platform: Platform;
      handle: string | null;
      isActive: boolean;
    }>;
    createdAt: string;
    updatedAt: string;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

### POST /api/v1/channels

**Description:** Creates a new channel in the current workspace. Automatically enqueues a `niche-research` job to seed initial niche and trend data.

**Auth required:** Yes (OWNER or ADMIN role required)

**Rate limit:** 10 requests/minute per workspace

**Queue job triggered:** `niche-research` on queue `research`

**Request body:**
```typescript
interface CreateChannelRequest {
  name: string;                  // 2–100 chars
  language: Language;            // 'EN' | 'ES' | 'FR' | ...
  targetNiches: string[];        // 1–5 niche keywords
  publishingCadence?: number;    // target videos per week, 1–14
  brandId?: string;              // link to existing Brand
  description?: string;
}
```

**Response body:**
```typescript
interface CreateChannelResponse {
  channel: {
    id: string;
    name: string;
    slug: string;
    status: 'SETUP';
    language: Language;
    targetNiches: string[];
    createdAt: string;
  };
  jobId: string;   // BullMQ niche-research job ID for status polling
}
```

**Error responses:**
- `400 Bad Request` — Validation error (Zod)
- `403 Forbidden` — Insufficient role
- `422 Unprocessable Entity` — Max channel limit reached for tier

---

### GET /api/v1/channels/:id

**Description:** Returns a single channel by ID, including its latest channel insight, platform account connections, and content pillar configuration.

**Auth required:** Yes

**Rate limit:** 240 requests/minute per workspace

**Queue job triggered:** None

**Response body:**
```typescript
interface GetChannelResponse {
  id: string;
  name: string;
  slug: string;
  status: ChannelStatus;
  language: Language;
  targetNiches: string[];
  publishingCadence: number | null;
  description: string | null;
  brand: {
    id: string;
    name: string;
    voiceTone: string | null;
  } | null;
  platformAccounts: Array<{
    id: string;
    platform: Platform;
    platformChannelId: string;
    handle: string | null;
    isActive: boolean;
    lastPublishedAt: string | null;
  }>;
  contentPillars: Array<{
    id: string;
    name: string;
    percentage: number;
    isActive: boolean;
  }>;
  latestInsight: {
    summary: string;
    strengths: string[];
    opportunities: string[];
    recommendations: Record<string, unknown>;
    generatedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}
```

**Error responses:**
- `404 Not Found` — Channel not found or not in user's workspace

---

### PATCH /api/v1/channels/:id

**Description:** Partially updates a channel's mutable fields. All fields are optional; only provided fields are updated.

**Auth required:** Yes (OWNER, ADMIN, or EDITOR role)

**Rate limit:** 60 requests/minute per workspace

**Queue job triggered:** None (if targetNiches changes, optionally triggers `niche-research`)

**Request body:**
```typescript
interface UpdateChannelRequest {
  name?: string;
  status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  targetNiches?: string[];
  publishingCadence?: number;
  description?: string;
  brandId?: string | null;
}
```

**Response body:**
```typescript
interface UpdateChannelResponse {
  channel: GetChannelResponse;   // full updated channel object
  nicheResearchJobId?: string;   // present if targetNiches was updated
}
```

---

## Scripts

### POST /api/v1/scripts/generate

**Description:** Enqueues a script generation job using the AI router. Budget guard runs synchronously before enqueuing — if budget is exceeded, the request is rejected. Returns immediately with the job ID for polling.

**Auth required:** Yes

**Rate limit:** 30 requests/minute per workspace

**Queue job triggered:** `script-generation` on queue `content`

**Request body:**
```typescript
interface GenerateScriptRequest {
  channelId: string;
  ideaId?: string;          // link to an existing approved ContentIdea
  title: string;            // video title / topic
  targetDurationSec: number; // 30–600
  language?: Language;      // defaults to channel language
  voiceProfileId?: string;
  customInstructions?: string; // additional prompt guidance
  keywords?: string[];
}
```

**Response body:**
```typescript
interface GenerateScriptResponse {
  jobId: string;           // BullMQ job ID — use GET /scripts/:id to poll
  estimatedCostUsd: number; // pre-run cost estimate
  estimatedDurationSec: number; // estimated processing time
  script: {
    id: string;            // script record created immediately with DRAFT status
    status: 'DRAFT';
    title: string;
    createdAt: string;
  };
}
```

**Error responses:**
- `402 Payment Required` — Budget exceeded (`BUDGET_EXCEEDED` error code)
- `403 Forbidden` — Channel not in workspace
- `422 Unprocessable Entity` — Channel status is not ACTIVE

---

### GET /api/v1/scripts/:id

**Description:** Returns a script by ID including all scenes.

**Auth required:** Yes

**Rate limit:** 240 requests/minute per workspace

**Queue job triggered:** None

**Response body:**
```typescript
interface GetScriptResponse {
  id: string;
  channelId: string;
  ideaId: string | null;
  title: string;
  hook: string;
  body: string;
  callToAction: string | null;
  estimatedDuration: number | null;
  wordCount: number | null;
  language: Language;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  rejectionNote: string | null;
  approvedAt: string | null;
  generatedBy: string | null;
  costUsd: number | null;
  scenes: Array<{
    id: string;
    sceneNumber: number;
    narration: string;
    visualPrompt: string | null;
    durationSec: number | null;
    keywords: string[];
  }>;
  generationJob: {
    status: JobStatus;
    progress: number;
    errorMessage: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}
```

---

### GET /api/v1/scripts

**Description:** Returns a paginated list of scripts for the workspace with optional filters.

**Auth required:** Yes

**Rate limit:** 120 requests/minute per workspace

**Queue job triggered:** None

**Query parameters:**
```typescript
interface ListScriptsQuery {
  channelId?: string;
  status?: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  page?: number;
  limit?: number;   // default: 20, max: 50
  orderBy?: 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}
```

**Response body:**
```typescript
interface ListScriptsResponse {
  data: Array<Omit<GetScriptResponse, 'scenes' | 'generationJob'>>;
  meta: PaginationMeta;
}
```

---

### PATCH /api/v1/scripts/:id/approve

**Description:** Approves a script, setting its status to `APPROVED`. Automatically enqueues both `tts-generation` and `scene-prompt-generation` jobs in parallel.

**Auth required:** Yes (OWNER, ADMIN, or EDITOR role)

**Rate limit:** 60 requests/minute per workspace

**Queue job triggered:**
- `tts-generation` on queue `media`
- `scene-prompt-generation` on queue `content`

**Request body:**
```typescript
interface ApproveScriptRequest {
  // All optional — reviewer can add notes or override voice
  reviewNote?: string;
  voiceProfileId?: string;  // override channel default voice
}
```

**Response body:**
```typescript
interface ApproveScriptResponse {
  script: {
    id: string;
    status: 'APPROVED';
    approvedAt: string;
    approvedBy: string;
  };
  jobs: {
    ttsJobId: string;
    scenePromptJobId: string;
  };
}
```

---

## Ideas

### POST /api/v1/ideas/generate-batch

**Description:** Enqueues an idea generation job that uses the AI router to generate a batch of content ideas based on channel niches and trends.

**Auth required:** Yes

**Rate limit:** 20 requests/minute per workspace

**Queue job triggered:** `niche-research` on queue `research` (with `includeIdeaGeneration: true`)

**Request body:**
```typescript
interface GenerateBatchIdeasRequest {
  channelId: string;
  count?: number;          // number of ideas to generate, default: 10, max: 30
  nicheIds?: string[];     // target specific niches; defaults to all active
  pillarIds?: string[];    // target specific content pillars
  trendBoosted?: boolean;  // prioritize trending topics, default: true
}
```

**Response body:**
```typescript
interface GenerateBatchIdeasResponse {
  jobId: string;
  estimatedCount: number;
  estimatedCostUsd: number;
}
```

---

### GET /api/v1/ideas

**Description:** Returns a paginated list of content ideas for the workspace.

**Auth required:** Yes

**Rate limit:** 120 requests/minute per workspace

**Queue job triggered:** None

**Query parameters:**
```typescript
interface ListIdeasQuery {
  channelId?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SCRIPTED' | 'ARCHIVED';
  nicheId?: string;
  pillarId?: string;
  page?: number;
  limit?: number;
}
```

**Response body:**
```typescript
interface ListIdeasResponse {
  data: Array<{
    id: string;
    channelId: string;
    title: string;
    hook: string | null;
    angle: string | null;
    keywords: string[];
    estimatedViews: number | null;
    status: string;
    niche: { id: string; name: string } | null;
    pillar: { id: string; name: string } | null;
    createdAt: string;
  }>;
  meta: PaginationMeta;
}
```

---

### PATCH /api/v1/ideas/:id/status

**Description:** Updates the status of a content idea. Rejecting an idea requires a reason. Approving makes it available for script generation.

**Auth required:** Yes

**Rate limit:** 120 requests/minute per workspace

**Queue job triggered:** None

**Request body:**
```typescript
interface UpdateIdeaStatusRequest {
  status: 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  rejectionReason?: string;   // required when status is 'REJECTED'
}
```

**Response body:**
```typescript
interface UpdateIdeaStatusResponse {
  idea: {
    id: string;
    status: string;
    rejectionReason: string | null;
    updatedAt: string;
  };
}
```

---

## Videos

### POST /api/v1/videos/render

**Description:** Initiates a video render job for an approved script. Validates that TTS assets and scene prompts are ready before enqueuing.

**Auth required:** Yes

**Rate limit:** 20 requests/minute per workspace

**Queue job triggered:** `video-render` on queue `media`

**Request body:**
```typescript
interface RenderVideoRequest {
  scriptId: string;
  backgroundMusicKey?: string;    // R2 key for background music track
  musicVolume?: number;           // 0.0–1.0, default: 0.15
  captionsEnabled?: boolean;      // default: true
  thumbnailTimestampSec?: number; // second to extract thumbnail from, default: 3
}
```

**Response body:**
```typescript
interface RenderVideoResponse {
  video: {
    id: string;
    status: 'RENDERING';
    renderJobId: string;
    renderStartedAt: string;
    estimatedCompletionSec: number;
  };
}
```

**Error responses:**
- `409 Conflict` — Script not yet approved or TTS/scene assets not ready
- `422 Unprocessable Entity` — Script not found or not in workspace

---

### GET /api/v1/videos/:id

**Description:** Returns a video record with its variants and most recent publish jobs.

**Auth required:** Yes

**Rate limit:** 240 requests/minute per workspace

**Queue job triggered:** None

**Response body:**
```typescript
interface GetVideoResponse {
  id: string;
  channelId: string;
  title: string;
  status: VideoStatus;
  durationSec: number | null;
  captionsEnabled: boolean;
  isWinner: boolean;
  winnerScore: number | null;
  script: {
    id: string;
    title: string;
    hook: string;
  };
  variants: Array<{
    id: string;
    platform: Platform;
    width: number;
    height: number;
    durationSec: number;
    sizeBytes: string;    // BigInt as string
    createdAt: string;
  }>;
  recentPublishJobs: Array<{
    id: string;
    platform: Platform;
    status: PublishStatus;
    scheduledAt: string | null;
    publishedAt: string | null;
    platformPostUrl: string | null;
  }>;
  thumbnailUrl: string | null;   // pre-signed R2 URL
  renderStartedAt: string | null;
  renderCompletedAt: string | null;
  renderError: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

### GET /api/v1/videos/:id/status

**Description:** Lightweight endpoint for polling video render status. Returns only status fields.

**Auth required:** Yes

**Rate limit:** 600 requests/minute per workspace (optimized for polling)

**Queue job triggered:** None

**Response body:**
```typescript
interface VideoStatusResponse {
  id: string;
  status: VideoStatus;
  renderJobId: string | null;
  renderProgress: number | null;   // 0–100, from BullMQ job progress
  renderStartedAt: string | null;
  renderCompletedAt: string | null;
  renderError: string | null;
  variantCount: number;            // how many variants are ready
}
```

---

## Publishing

### POST /api/v1/publish-jobs

**Description:** Schedules a video variant for publishing to a platform. Can be scheduled for a future time or set for immediate dispatch.

**Auth required:** Yes

**Rate limit:** 30 requests/minute per workspace

**Queue job triggered:** `publish-job` on queue `publish` (immediately or at scheduledAt)

**Request body:**
```typescript
interface CreatePublishJobRequest {
  variantId: string;
  platformAccountId: string;
  scheduledAt?: string;      // ISO 8601; if omitted, publishes immediately
  title?: string;            // override video title for this platform
  description?: string;
  tags?: string[];           // max 30 tags
}
```

**Response body:**
```typescript
interface CreatePublishJobResponse {
  publishJob: {
    id: string;
    platform: Platform;
    status: 'SCHEDULED' | 'QUEUED';
    scheduledAt: string | null;
    bullJobId: string;
    createdAt: string;
  };
}
```

**Error responses:**
- `404 Not Found` — Variant or platform account not found
- `409 Conflict` — Video variant already published to this platform account

---

### GET /api/v1/publish-jobs

**Description:** Returns a paginated list of publish jobs for the workspace.

**Auth required:** Yes

**Rate limit:** 120 requests/minute per workspace

**Queue job triggered:** None

**Query parameters:**
```typescript
interface ListPublishJobsQuery {
  channelId?: string;
  platform?: Platform;
  status?: PublishStatus;
  from?: string;    // ISO 8601 date
  to?: string;      // ISO 8601 date
  page?: number;
  limit?: number;
}
```

**Response body:**
```typescript
interface ListPublishJobsResponse {
  data: Array<{
    id: string;
    platform: Platform;
    status: PublishStatus;
    scheduledAt: string | null;
    publishedAt: string | null;
    platformPostUrl: string | null;
    errorMessage: string | null;
    attempts: number;
    video: {
      id: string;
      title: string;
      durationSec: number | null;
    };
    channel: {
      id: string;
      name: string;
    };
    createdAt: string;
  }>;
  meta: PaginationMeta;
}
```

---

### PATCH /api/v1/publish-jobs/:id/cancel

**Description:** Cancels a pending or scheduled publish job. Active (in-progress) jobs cannot be cancelled.

**Auth required:** Yes (OWNER or ADMIN role)

**Rate limit:** 60 requests/minute per workspace

**Queue job triggered:** None (removes BullMQ job from queue)

**Request body:** None required

**Response body:**
```typescript
interface CancelPublishJobResponse {
  publishJob: {
    id: string;
    status: 'CANCELLED';
    updatedAt: string;
  };
}
```

**Error responses:**
- `409 Conflict` — Job is already active, completed, or failed; cannot cancel

---

## Analytics

### GET /api/v1/analytics/channels/:id/summary

**Description:** Returns aggregated performance KPIs for a channel across all connected platforms for a specified date range.

**Auth required:** Yes

**Rate limit:** 60 requests/minute per workspace

**Queue job triggered:** None

**Query parameters:**
```typescript
interface ChannelSummaryQuery {
  from: string;       // ISO 8601 date (required)
  to: string;         // ISO 8601 date (required)
  platform?: Platform; // filter to specific platform
}
```

**Response body:**
```typescript
interface ChannelSummaryResponse {
  channelId: string;
  dateRange: { from: string; to: string };
  totals: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    watchTimeMin: number;
    estimatedRevenue: number;    // USD
  };
  growth: {
    viewsGrowthPct: number;      // vs. previous equivalent period
    subscriberGrowthPct: number;
  };
  topVideos: Array<{
    videoId: string;
    title: string;
    platform: Platform;
    views: number;
    engagementRate: number;     // (likes + comments + shares) / views
    isWinner: boolean;
  }>;
  byPlatform: Array<{
    platform: Platform;
    views: number;
    likes: number;
    subscriberCount: number;
  }>;
}
```

---

### GET /api/v1/analytics/channels/:id/snapshots

**Description:** Returns raw time-series analytics snapshot data for charting.

**Auth required:** Yes

**Rate limit:** 60 requests/minute per workspace

**Queue job triggered:** None

**Query parameters:**
```typescript
interface SnapshotsQuery {
  from: string;
  to: string;
  platform?: Platform;
  granularity?: 'day' | 'week';  // default: 'day'
}
```

**Response body:**
```typescript
interface SnapshotsResponse {
  channelId: string;
  platform: Platform | 'all';
  granularity: 'day' | 'week';
  snapshots: Array<{
    date: string;       // ISO 8601 date
    views: number;
    likes: number;
    comments: number;
    shares: number;
    subscribers: number;
    watchTimeMin: number | null;
  }>;
}
```

---

## Cost

### GET /api/v1/cost/summary

**Description:** Returns aggregated AI cost spending for the workspace, broken down by provider and task type.

**Auth required:** Yes

**Rate limit:** 60 requests/minute per workspace

**Queue job triggered:** None

**Query parameters:**
```typescript
interface CostSummaryQuery {
  period: 'day' | 'week' | 'month' | 'custom';
  from?: string;   // required if period = 'custom'
  to?: string;     // required if period = 'custom'
}
```

**Response body:**
```typescript
interface CostSummaryResponse {
  period: { from: string; to: string };
  totalUsd: number;
  byProvider: Array<{
    provider: string;
    totalUsd: number;
    callCount: number;
    pct: number;     // percentage of total
  }>;
  byTaskType: Array<{
    taskType: TaskType;
    totalUsd: number;
    callCount: number;
  }>;
  trend: Array<{    // daily spend for the period
    date: string;
    totalUsd: number;
  }>;
}
```

---

### GET /api/v1/cost/ledger

**Description:** Returns a paginated view of raw cost ledger entries with full detail for auditing.

**Auth required:** Yes (OWNER or ADMIN role)

**Rate limit:** 30 requests/minute per workspace

**Queue job triggered:** None

**Query parameters:**
```typescript
interface CostLedgerQuery {
  provider?: string;
  taskType?: TaskType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;   // default: 50, max: 200
}
```

**Response body:**
```typescript
interface CostLedgerResponse {
  data: Array<{
    id: string;
    taskType: TaskType;
    provider: string;
    modelId: string;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: number;
    entityType: string | null;
    entityId: string | null;
    traceId: string | null;
    recordedAt: string;
  }>;
  meta: PaginationMeta;
  periodTotal: number;   // sum for the filtered period
}
```

---

### GET /api/v1/cost/budget

**Description:** Returns the current budget state for the workspace, including utilization percentage and alert thresholds.

**Auth required:** Yes

**Rate limit:** 120 requests/minute per workspace

**Queue job triggered:** None

**Response body:**
```typescript
interface BudgetResponse {
  budgets: Array<{
    id: string;
    name: string;
    limitUsd: number;
    spentUsd: number;
    remainingUsd: number;
    utilizationPct: number;
    period: BudgetPeriod;
    periodStartsAt: string;
    periodEndsAt: string;
    hardStop: boolean;
    alertState: 'OK' | 'WARNING_80' | 'WARNING_95' | 'EXCEEDED';
  }>;
  lastRecalcAt: string | null;
}
```

---

## Providers

### GET /api/v1/providers/health

**Description:** Returns the current health status of all registered AI providers and their models. Used by the frontend to show provider availability indicators.

**Auth required:** Yes

**Rate limit:** 60 requests/minute per workspace

**Queue job triggered:** None

**Response body:**
```typescript
interface ProvidersHealthResponse {
  providers: Array<{
    id: string;
    name: string;
    displayName: string;
    type: ProviderType;
    health: ProviderHealth;
    lastHealthCheck: string | null;
    models: Array<{
      modelId: string;
      displayName: string;
      isEnabled: boolean;
      tier: TierName;
    }>;
  }>;
  checkedAt: string;
}
```

---

## Shared Types

```typescript
interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

type Language = 'EN' | 'ES' | 'FR' | 'DE' | 'PT' | 'JA' | 'KO' | 'ZH' | 'HI' | 'AR';
type Platform = 'YOUTUBE' | 'YOUTUBE_SHORTS' | 'TIKTOK' | 'INSTAGRAM_REELS' | 'FACEBOOK_REELS' | 'SNAPCHAT';
type ChannelStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'SETUP';
type VideoStatus = 'DRAFT' | 'RENDERING' | 'RENDER_FAILED' | 'READY' | 'PUBLISHED' | 'ARCHIVED';
type PublishStatus = 'SCHEDULED' | 'QUEUED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'CANCELLED';
type JobStatus = 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'DELAYED' | 'CANCELLED';
type BudgetPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';
type TierName = 'FREE' | 'STARTER' | 'PRO' | 'AGENCY';
type ProviderType = 'LLM' | 'TTS' | 'IMAGE_GEN' | 'EMBEDDING';
type ProviderHealth = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
type TaskType =
  | 'SCRIPT_GENERATION'
  | 'SCENE_PROMPT_GENERATION'
  | 'IDEA_GENERATION'
  | 'NICHE_RESEARCH'
  | 'COMPETITOR_ANALYSIS'
  | 'TTS_GENERATION'
  | 'IMAGE_GENERATION'
  | 'VIDEO_RENDER'
  | 'PLATFORM_PUBLISH'
  | 'ANALYTICS_INGEST';
```
