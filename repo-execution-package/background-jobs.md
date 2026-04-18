# Faceless Viral OS — Background Jobs Reference

All jobs are processed by `apps/worker`. Each queue has a dedicated BullMQ `Worker` instance with queue-specific concurrency settings.

**Queue Concurrency Defaults:**
- `content`: 5 concurrent jobs
- `media`: 2 concurrent jobs (CPU/IO intensive)
- `publish`: 3 concurrent jobs
- `analytics`: 3 concurrent jobs
- `research`: 2 concurrent jobs
- `governance`: 10 concurrent jobs

**Job Payload Convention:** All payloads must be JSON-serializable. Dates are ISO 8601 strings. BigInts are serialized as strings.

**Tracing:** Every job payload includes a `traceContext` field (W3C TraceContext headers) injected by the API when the job is enqueued, enabling end-to-end OTel traces from HTTP request through job completion.

---

## 1. script-generation

**Queue:** `content`
**Job name:** `script-generation`

### Trigger
`POST /api/v1/scripts/generate` — enqueued after budget guard approves the request.

### Input Payload
```typescript
interface ScriptGenerationJobPayload {
  scriptId: string;           // pre-created Script record with DRAFT status
  channelId: string;
  workspaceId: string;
  title: string;
  targetDurationSec: number;
  language: string;
  voiceProfileId: string | null;
  customInstructions: string | null;
  keywords: string[];
  ideaId: string | null;
  channelContext: {
    name: string;
    targetNiches: string[];
    voiceTone: string | null;
    language: string;
  };
  routingPolicy: {
    taskType: 'SCRIPT_GENERATION';
    tier: string;
    preferredModelId: string | null;
  };
  traceContext: Record<string, string>;  // W3C TraceContext headers
}
```

### Processing Steps
1. Set Script status → `DRAFT`, update job progress to 5%
2. Load channel context, voice profile, and any linked ContentIdea from DB
3. Build structured prompt via `packages/ai-router` `PromptBuilder` with system template `script-generation-v2`
4. Call `AIRouter.complete()` — routes to configured model per tier profile (e.g. GPT-4o for PRO, GPT-4o-mini for FREE)
5. Parse AI response: extract `hook`, `body`, `callToAction`, and `scenes[]` using Zod schema
6. Count words, estimate duration based on ~130 words/minute speaking pace
7. Write parsed content to `Script` record + create `ScriptScene` records in a DB transaction
8. Record actual cost to `CostLedger` and update `Budget.spentUsd`
9. Update Script status → `REVIEW`, progress 100%
10. Emit `script.generated` event to Redis Pub/Sub for real-time UI notification

### Output / Side Effects
- `Script` record updated: `hook`, `body`, `callToAction`, `wordCount`, `estimatedDuration`, `generatedBy`, `inputTokens`, `outputTokens`, `costUsd`, `status = 'REVIEW'`
- `ScriptScene` records created (one per scene)
- `CostLedger` entry created
- `Budget.spentUsd` incremented
- Redis event published: `fvos:script:${scriptId}:generated`

### Retry Config
- Attempts: **3**
- Backoff: Exponential, starting at 30 seconds
- On final failure: Script status → `DRAFT` with `rejectionNote` set to error message

### Priority
**7** (high — user is waiting for interactive result)

### Estimated Duration
**15–45 seconds** (dominated by AI inference latency)

---

## 2. tts-generation

**Queue:** `media`
**Job name:** `tts-generation`

### Trigger
`PATCH /api/v1/scripts/:id/approve` — enqueued immediately upon script approval, in parallel with `scene-prompt-generation`.

### Input Payload
```typescript
interface TtsGenerationJobPayload {
  scriptId: string;
  channelId: string;
  workspaceId: string;
  voiceProfileId: string;
  scenes: Array<{
    sceneId: string;
    sceneNumber: number;
    narration: string;
  }>;
  language: string;
  traceContext: Record<string, string>;
}
```

### Processing Steps
1. Load `VoiceProfile` from DB for the given `voiceProfileId`
2. For each scene (processed sequentially to manage TTS API rate limits):
   a. Call `TTSService.synthesize(narration, voiceProfile)` in `packages/media-pipeline`
   b. Receive audio buffer (MP3)
   c. Upload audio buffer to Cloudflare R2 at key `channels/{channelId}/tts/{scriptId}/scene-{sceneNumber}.mp3`
   d. Create `Asset` record with type `AUDIO_TTS`, R2 key, size, and duration
   e. Update job progress: `(sceneIndex / totalScenes) * 100`
3. Record TTS cost to `CostLedger` (billed per character)
4. Check if `scene-prompt-generation` job for same script is also complete
5. If both TTS and scenes ready: enqueue `video-render` job

### Output / Side Effects
- `Asset` records created for each scene's audio
- `CostLedger` entry for TTS spend
- Conditionally enqueues `video-render`

### Retry Config
- Attempts: **4**
- Backoff: Exponential, starting at 60 seconds (TTS APIs have rate limits)
- Per-scene retry: individual scene failures retry before failing the whole job

### Priority
**6**

### Estimated Duration
**30–120 seconds** depending on script length (150–600 chars per scene, 3–15 scenes)

---

## 3. scene-prompt-generation

**Queue:** `content`
**Job name:** `scene-prompt-generation`

### Trigger
`PATCH /api/v1/scripts/:id/approve` — enqueued in parallel with `tts-generation`.

### Input Payload
```typescript
interface ScenePromptJobPayload {
  scriptId: string;
  channelId: string;
  workspaceId: string;
  scenes: Array<{
    sceneId: string;
    sceneNumber: number;
    narration: string;
    existingVisualPrompt: string | null;
  }>;
  channelContext: {
    name: string;
    targetNiches: string[];
    voiceTone: string | null;
  };
  traceContext: Record<string, string>;
}
```

### Processing Steps
1. Filter scenes that do not already have a `visualPrompt` set
2. Build batch prompt: send all scene narrations in a single AI call requesting image-generation-optimized prompts
3. Call `AIRouter.complete()` with `SCENE_PROMPT_GENERATION` task type (uses cheaper model, e.g. GPT-4o-mini)
4. Parse response: map prompts back to scene IDs
5. Update each `ScriptScene.visualPrompt` in DB (batch update)
6. Record cost to `CostLedger`
7. Check if `tts-generation` job for same script is also complete
8. If both TTS and scenes ready: enqueue `video-render` job (idempotent — uses Redis SET NX to avoid double-enqueue)

### Output / Side Effects
- `ScriptScene.visualPrompt` fields updated
- `CostLedger` entry
- Conditionally enqueues `video-render`

### Retry Config
- Attempts: **3**
- Backoff: Exponential, 15 seconds base

### Priority
**6**

### Estimated Duration
**10–25 seconds** (single batched AI call)

---

## 4. video-render

**Queue:** `media`
**Job name:** `video-render`

### Trigger
Enqueued by either `tts-generation` or `scene-prompt-generation` when both are detected as complete (idempotent enqueue via Redis `SET NX`).

### Input Payload
```typescript
interface VideoRenderJobPayload {
  videoId: string;
  scriptId: string;
  channelId: string;
  workspaceId: string;
  scenes: Array<{
    sceneId: string;
    sceneNumber: number;
    audioAssetId: string;    // R2 key for TTS audio
    visualPrompt: string;
    durationSec: number;
  }>;
  backgroundMusicKey: string | null;
  musicVolume: number;
  captionsEnabled: boolean;
  thumbnailTimestampSec: number;
  traceContext: Record<string, string>;
}
```

### Processing Steps
1. Set `Video.status = 'RENDERING'`, `renderStartedAt = now()`
2. Download all scene audio files from R2 to worker's `/tmp` directory
3. For each scene: generate or download scene visual asset (stock footage lookup or AI image generation — Phase 2)
4. Call `VideoRenderer.render(scenes, options)` in `packages/media-pipeline`:
   a. `SceneAssembler` combines audio + visuals per scene with FFmpeg
   b. `CaptionOverlay` burns animated captions if enabled
   c. `MusicMixer` blends background track at configured volume
   d. Final `ffmpeg` encode to H.264 MP4 baseline
   e. Report progress events (10%, 25%, 50%, 75%, 90%)
5. Upload rendered MP4 to R2 at `channels/{channelId}/videos/{videoId}/raw.mp4`
6. Create `Asset` record for raw video
7. Extract thumbnail at `thumbnailTimestampSec`, upload to R2, create `Asset` record
8. Update `Video`: `status = 'READY'`, `durationSec`, `renderCompletedAt`, `thumbnailAssetId`
9. Clean up `/tmp` files
10. Enqueue `platform-adapt` job for each connected platform account on the channel

### Output / Side Effects
- Raw video uploaded to R2
- Thumbnail uploaded to R2
- `Video` record updated to `READY`
- `Asset` records created
- `platform-adapt` jobs enqueued for each platform

### Retry Config
- Attempts: **2** (renders are expensive; fail fast and alert)
- Backoff: Fixed 120 seconds
- On failure: `Video.status = 'RENDER_FAILED'`, `Video.renderError` set

### Priority
**5**

### Estimated Duration
**2–8 minutes** depending on script length (60s video = ~3 min render)

---

## 5. platform-adapt

**Queue:** `media`
**Job name:** `platform-adapt`

### Trigger
Enqueued by `video-render` upon successful render completion — one job per target platform.

### Input Payload
```typescript
interface PlatformAdaptJobPayload {
  videoId: string;
  channelId: string;
  platform: Platform;
  rawVideoR2Key: string;
  rawVideoDurationSec: number;
  traceContext: Record<string, string>;
}
```

### Processing Steps
1. Download raw video from R2 to `/tmp`
2. Load platform spec from `packages/media-pipeline/src/platform/specs/`
3. Call `PlatformAdapter.adapt(rawVideoPath, platformSpec)`:
   a. Determine if video needs crop/pad for aspect ratio (16:9 → 9:16 adds blur pillarbars)
   b. Re-encode with platform-specific bitrate, codec profile, and container settings
   c. Trim to platform max duration if needed (e.g. YouTube Shorts ≤60s)
4. Upload adapted video to R2 at `channels/{channelId}/videos/{videoId}/{platform.toLowerCase()}.mp4`
5. Create `VideoVariant` record with dimensions, bitrate, size, duration
6. Clean up `/tmp` files

### Output / Side Effects
- `VideoVariant` record created for the platform
- Adapted video uploaded to R2

### Retry Config
- Attempts: **3**
- Backoff: Exponential, 30 seconds base

### Priority
**5**

### Estimated Duration
**1–3 minutes** per platform (FFmpeg transcode)

---

## 6. publish-job

**Queue:** `publish`
**Job name:** `publish-job`

### Trigger
- `POST /api/v1/publish-jobs` with no `scheduledAt` → immediate enqueue
- `POST /api/v1/publish-jobs` with `scheduledAt` in the future → BullMQ delayed job
- `autopilot-trigger` job for automated publishing

### Input Payload
```typescript
interface PublishJobPayload {
  publishJobId: string;
  videoId: string;
  variantId: string;
  platformAccountId: string;
  platform: Platform;
  title: string;
  description: string;
  tags: string[];
  traceContext: Record<string, string>;
}
```

### Processing Steps
1. Set `PublishJob.status = 'PUBLISHING'`
2. Load `VideoVariant` R2 key and `PlatformAccount` credentials
3. Get fresh OAuth2 token via `TokenManager.getValidToken(platformAccountId)`; refresh if expired
4. Download video file from R2 to `/tmp`
5. Call `PublisherService.publish(platform, videoFile, metadata, credentials)`:
   - YouTube: Upload via resumable upload API, set title/description/tags/category
   - TikTok: Upload via Content Posting API
   - Instagram: Upload via Graph API Reels endpoint
6. Receive `platformPostId` and `platformPostUrl` from adapter
7. Update `PublishJob`: `status = 'PUBLISHED'`, `publishedAt = now()`, `platformPostId`, `platformPostUrl`
8. Update `PlatformAccount.lastPublishedAt`
9. Clean up `/tmp` files

### Output / Side Effects
- Video published to the platform
- `PublishJob` record updated to `PUBLISHED`
- `PlatformAccount.lastPublishedAt` updated

### Retry Config
- Attempts: **3**
- Backoff: Exponential, 120 seconds base (platform upload APIs are slow to recover from errors)
- On final failure: `PublishJob.status = 'FAILED'`, `errorMessage` set, alert sent to workspace

### Priority
**8** (time-sensitive — users schedule posts for specific times)

### Estimated Duration
**30 seconds – 5 minutes** (dominated by video upload size and platform API speed)

---

## 7. analytics-ingest

**Queue:** `analytics`
**Job name:** `analytics-ingest`

### Trigger
Cron: every **6 hours** (`0 */6 * * *`)
Also triggered manually via internal admin endpoint.

### Input Payload
```typescript
interface AnalyticsIngestJobPayload {
  workspaceId: string | null;  // null = run for all active workspaces
  channelId: string | null;    // null = run for all active channels
  platforms: Platform[];
  traceContext: Record<string, string>;
}
```

### Processing Steps
1. Query DB for all active channels with connected `PlatformAccount` records (scoped by workspace/channel if provided)
2. For each channel + platform pair:
   a. Get valid OAuth token
   b. Fetch last 7 days of analytics from platform API
   c. Write `AnalyticsSnapshot` records (upsert by `channelId + platform + snapshotAt`)
3. For each video with a `platformPostId`: fetch individual video analytics and update any denormalized fields
4. Batch write all snapshots in a single Prisma `createMany`

### Output / Side Effects
- `AnalyticsSnapshot` records created/updated

### Retry Config
- Attempts: **3**
- Backoff: Exponential, 5 minutes base (API rate limits)

### Priority
**3** (background, not user-facing)

### Estimated Duration
**2–10 minutes** depending on channel count and platform API response times

---

## 8. niche-research

**Queue:** `research`
**Job name:** `niche-research`

### Trigger
- `POST /api/v1/channels` (channel creation)
- `PATCH /api/v1/channels/:id` when `targetNiches` changes
- `POST /api/v1/ideas/generate-batch` with `includeIdeaGeneration: true`
- Weekly cron for active channels: Mondays at 06:00 UTC

### Input Payload
```typescript
interface NicheResearchJobPayload {
  channelId: string;
  workspaceId: string;
  targetNiches: string[];
  language: string;
  includeIdeaGeneration: boolean;
  ideaCount: number;           // number of ideas to generate if includeIdeaGeneration = true
  traceContext: Record<string, string>;
}
```

### Processing Steps
1. For each target niche keyword:
   a. Fetch Google Trends data (via SerpAPI or RapidAPI Google Trends endpoint)
   b. Fetch YouTube search volume estimate
   c. Estimate CPM based on niche category
   d. Upsert `Niche` record with updated metrics
2. Fetch trending YouTube topics in niche category → create `Trend` records
3. Call `AIRouter.complete()` for strategic niche analysis → update `ChannelInsight`
4. If `includeIdeaGeneration`:
   a. Build idea generation prompt with niche + trend context
   b. Call `AIRouter.complete()` for idea batch
   c. Parse and create `ContentIdea` records (status = `PENDING`)
5. Record costs to `CostLedger`

### Output / Side Effects
- `Niche` records upserted
- `Trend` records created
- `ChannelInsight` record created
- `ContentIdea` records created (if idea generation enabled)

### Retry Config
- Attempts: **3**
- Backoff: Exponential, 30 seconds

### Priority
**4**

### Estimated Duration
**45–120 seconds**

---

## 9. competitor-analysis

**Queue:** `research`
**Job name:** `competitor-analysis`

### Trigger
- Manual trigger from API (internal endpoint)
- Weekly cron for channels with `CompetitorChannel` records: Sundays at 04:00 UTC

### Input Payload
```typescript
interface CompetitorAnalysisJobPayload {
  channelId: string;
  workspaceId: string;
  competitorChannelIds: string[];   // specific IDs or empty = all for channel
  traceContext: Record<string, string>;
}
```

### Processing Steps
1. For each `CompetitorChannel`:
   a. Fetch channel stats via YouTube Data API (subscriber count, video count, recent uploads)
   b. Fetch last 10 video titles, descriptions, and thumbnail URLs
   c. Update `CompetitorChannel` stats in DB
2. Pass collected competitor data to `AIRouter.complete()` for competitive analysis
3. Extract: top performing formats, content gaps, hook patterns
4. Update `ChannelInsight` with competitive context appended to existing insight
5. Record costs

### Output / Side Effects
- `CompetitorChannel` records updated with latest stats
- `ChannelInsight` record updated

### Retry Config
- Attempts: **2**
- Backoff: Fixed 60 seconds

### Priority
**2**

### Estimated Duration
**30–90 seconds**

---

## 10. budget-check

**Queue:** `governance`
**Job name:** `budget-check`

### Trigger
Cron: every **15 minutes** (`*/15 * * * *`)

### Input Payload
```typescript
interface BudgetCheckJobPayload {
  workspaceId: string | null;  // null = check all workspaces
  traceContext: Record<string, string>;
}
```

### Processing Steps
1. Query all `Budget` records where `periodEndsAt > now()` (active budgets), scoped by workspace if provided
2. For each budget:
   a. Sum `CostLedger.costUsd` for the budget's `workspaceId` and `periodStartsAt`–`now()` window
   b. Recalculate `utilizationPct = (spentUsd / limitUsd) * 100`
   c. Update `Budget.spentUsd`, `Budget.utilizationPct`, `Budget.lastRecalcAt`
   d. Check alert thresholds:
      - ≥80% and `alertAt80 = true` and alert not yet sent this period → fire alert
      - ≥95% and `alertAt95 = true` and alert not yet sent this period → fire alert
      - ≥100% and `hardStop = true` → set workspace-level flag in Redis (`fvos:budget:${workspaceId}:exceeded`)
3. Recycle expired budgets: if `periodEndsAt < now()`, create the next period's Budget record

### Output / Side Effects
- `Budget` records updated
- Alert emails/webhooks fired at thresholds
- Redis key set if budget exceeded (checked by `BudgetGuard` middleware)

### Retry Config
- Attempts: **5**
- Backoff: Fixed 60 seconds (must succeed to prevent silent overspend)

### Priority
**10** (highest — governance must run)

### Estimated Duration
**2–10 seconds**

---

## 11. winner-identification

**Queue:** `analytics`
**Job name:** `winner-identification`

### Trigger
Cron: daily at **02:00 UTC** (`0 2 * * *`)

### Input Payload
```typescript
interface WinnerIdentificationJobPayload {
  workspaceId: string | null;
  lookbackDays: number;        // default: 14
  traceContext: Record<string, string>;
}
```

### Processing Steps
1. Query all published `Video` records that have `AnalyticsSnapshot` data in the lookback window
2. For each video: compute a winner score:
   ```
   winnerScore =
     (views * 0.4) +
     (engagementRate * 0.3) +   // (likes + comments + shares) / views
     (watchTimePct * 0.2) +     // watch time / duration
     (clickThroughRate * 0.1)   // if available
   ```
   Normalize across channel to 0–100 scale
3. Flag top 10% of videos as `isWinner = true`, update `winnerScore`
4. For channels with `AutomationRule` of type `GENERATE_SCRIPT` triggered by winners: enqueue `script-generation` for winner topics
5. Call `AIRouter.complete()` to generate brief insight: "What made this video win?"
6. Update `ChannelInsight` with winner analysis

### Output / Side Effects
- `Video.winnerScore` and `Video.isWinner` fields updated
- Optionally enqueues `script-generation` jobs for winner topics (if autopilot rule configured)
- `ChannelInsight` updated with winner analysis

### Retry Config
- Attempts: **3**
- Backoff: Exponential, 5 minutes

### Priority
**3**

### Estimated Duration
**30–120 seconds** depending on video/snapshot volume

---

## 12. autopilot-trigger

**Queue:** `autopilot`
**Job name:** `autopilot-trigger`

### Trigger
Cron: every **hour** (`0 * * * *`)

### Input Payload
```typescript
interface AutopilotTriggerJobPayload {
  traceContext: Record<string, string>;
}
```

### Processing Steps
1. Query all `AutomationRule` records where `isActive = true` and `triggerType = 'CRON'`
2. For each rule:
   a. Parse cron expression from `triggerConfig.cron`
   b. Check if the rule should fire this hour (using cron parser library)
   c. If yes:
      - Evaluate `actionType` and `actionConfig`
      - Dispatch appropriate downstream job:
        - `GENERATE_SCRIPT` → enqueue `script-generation` per configured channel
        - `RENDER_VIDEO` → enqueue `video-render` for approved scripts
        - `PUBLISH_VIDEO` → enqueue `publish-job` for ready video variants
        - `SEND_ALERT` → send webhook or email
        - `PAUSE_CHANNEL` → update `Channel.status = 'PAUSED'`
      - Update `AutomationRule.lastRunAt = now()`, `runCount++`
3. Query rules with `triggerType = 'EVENT'` and check Redis event log for matching events since last run

### Output / Side Effects
- Downstream jobs enqueued based on rule configurations
- `AutomationRule.lastRunAt` and `runCount` updated

### Retry Config
- Attempts: **3**
- Backoff: Fixed 5 minutes

### Priority
**4**

### Estimated Duration
**5–30 seconds** (mostly DB reads + job enqueue operations)
