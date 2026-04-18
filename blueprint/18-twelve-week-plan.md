# 18 — Twelve-Week Build Plan

**Faceless Viral OS** | Blueprint Document 18 of 19
Last updated: 2026-04-17

---

## Overview

This plan covers the first 12 weeks of building Faceless Viral OS from zero to a live channel with content publishing. The goal is a working private internal tool by the end of Week 12 — not a polished SaaS product. Every week produces something shippable and demonstrable. Speed is prioritized over completeness; perfect is the enemy of live.

**Assumptions:**
- 1 full-time engineer (with occasional AI pairing)
- API-first approach: UI is built to validate the API, not the other way around
- Tests written alongside code, not after
- No infrastructure yak-shaving — Docker Compose in Phase 1, scale later

---

## Milestone Table

| Milestone | Week | Description | Success Criteria |
|---|---|---|---|
| M1: Foundation Live | Week 1 | Monorepo running, API serving, DB connected | `GET /api/v1/health` returns 200 |
| M2: Data Model Complete | Week 2 | Full Prisma schema migrated and seeded | All core entities queryable via Prisma |
| M3: Model Router Live | Week 3 | Multi-provider AI routing working | GPT-4o and Claude both reachable via unified interface |
| M4: Cost Governance Live | Week 4 | Budget estimation and enforcement active | Requests over budget return 422 |
| M5: First Script Generated | Week 5 | End-to-end script generation pipeline working | Script visible in DB, API returns it |
| M6: Research Modules Live | Week 6 | Niche discovery + competitor intelligence functional | Niche report generated and stored |
| M7: Idea Pipeline Live | Week 7 | Ideas generated, ranked, manageable in UI | Kanban board showing idea cards |
| M8: Media Pipeline Live | Week 8 | Video with voiceover and subtitles generated | MP4 file in R2 |
| M9: First YouTube Publish | Week 9 | Video uploaded to a real YouTube channel | Video visible on YouTube (private) |
| M10: Analytics Loop Live | Week 10 | Analytics polling and basic dashboard active | View count visible in dashboard |
| M11: Autopilot Running | Week 11 | First automation rule executes without human touch | Idea → publish without manual intervention |
| M12: First Channel Live | Week 12 | Full cycle validated on a real channel | 5+ videos published, analytics tracking, autopilot active |

---

## Gantt-Style Dependency Map

```
Week:  1    2    3    4    5    6    7    8    9    10   11   12
       ─────────────────────────────────────────────────────────
Infra  [====]
DB     [=====]
Auth        [=]
Core         [====]
AI Router         [====]
Cost Eng               [====]
Script Gen                  [====]
Niche/Comp                       [====]
Idea Pipeline                         [====]
Media Pipeline                             [====]
Publisher                                       [====]
Analytics                                            [====]
Autopilot                                                 [====]
Hardening                                                      [===]

Legend: [====] = primary work week(s) for that module
```

**Critical Path:**
```
Infra → DB → AI Router → Cost Engine → Script Gen → Media Pipeline → Publisher → Channel Live
```

All other modules (Niche Research, Competitor Intelligence, Analytics, Autopilot) are parallel tracks that feed into the critical path.

---

## Week 1: Foundation

### Theme
Get the monorepo skeleton standing. Every subsequent week builds on this foundation — a bad Week 1 means technical debt in every future week.

### Deliverables
- [ ] Turborepo + pnpm workspace initialized and running locally
- [ ] `packages/core` created with shared types, error classes, Zod schemas
- [ ] `apps/api` (Fastify) running with health check route
- [ ] `apps/web` (Next.js) running with stub homepage
- [ ] `apps/worker` (BullMQ) running with stub processor
- [ ] PostgreSQL and Redis running in Docker Compose
- [ ] `packages/db` with Prisma initialized (empty schema, client exported)
- [ ] ESLint + Prettier + commitlint configured and enforced via Husky hooks
- [ ] GitHub Actions CI workflow running on push (lint + type-check + build)
- [ ] `.env.example` with all required variables documented
- [ ] Shared `tsconfig.base.json` with strict mode configured
- [ ] `README.md` with setup instructions

### Dependencies
- GitHub repo created (prerequisite)
- Node.js 20+ and pnpm installed on dev machine
- Docker Desktop running

### Risks
- Turborepo remote cache setup can be fiddly — skip remote cache in Week 1, configure it in Week 2
- pnpm workspace hoisting issues with some packages — resolve with `shamefully-hoist=false` and explicit peer deps

### Quick Wins
- Get `pnpm run dev` starting all three apps in one command by end of Day 2
- Get CI passing (even with trivial tests) by end of Day 3

### Validation Checkpoint
- `curl http://localhost:3000/api/v1/health` returns `{ "status": "ok", "version": "0.1.0" }`
- `pnpm run lint && pnpm run type-check && pnpm run build` all pass in < 2 minutes
- A commit with a non-conventional commit message is rejected by the pre-commit hook

---

## Week 2: Data Model + Core Entities

### Theme
Define the full Prisma schema for all core entities. Get the data model right now — it's cheapest to change before any business logic is written.

### Deliverables
- [ ] Prisma schema covering all core entities:
  - `workspaces`, `users`, `user_workspace_memberships`
  - `channels` (per platform: YouTube, TikTok, Instagram)
  - `oauth_tokens` (encrypted per channel)
  - `niches`, `niche_research_jobs`
  - `competitors`, `competitor_analyses`
  - `ideas`, `idea_rankings`
  - `videos` (full status machine: `draft` → `scripted` → `rendered` → `published`)
  - `video_scripts`, `video_assets`, `video_analytics`
  - `asset_provenance`
  - `ai_generation_logs`
  - `budget_configs`, `budget_ledger_entries`
  - `publish_jobs`, `automation_rules`
  - `audit_logs`
- [ ] First migration generated and tested
- [ ] Seed data for development (1 workspace, 1 user, 1 channel, 2 niches, 5 ideas)
- [ ] All Prisma model types exported from `packages/db`
- [ ] Basic CRUD repository functions for core entities (no service layer yet)
- [ ] Integration test verifying migrations and seed data

### Dependencies
- Week 1 complete (Prisma initialized)
- Data model review with product specs (Documents 01–14)

### Risks
- Schema decisions made now will be expensive to change later — spend extra time reviewing with the blueprint documents
- JSONB vs normalized tables: use JSONB for flexible metadata (e.g., `platform_metadata`, `ai_generation_params`); use normalized columns for frequently queried fields

### Quick Wins
- Paste the schema into a local PostgreSQL GUI (TablePlus/pgAdmin) and visually verify the relations look right before committing
- Generate a schema diagram using `prisma-erd-generator`

### Validation Checkpoint
- `pnpm run db:migrate` runs cleanly from scratch (drop + migrate + seed)
- `pnpm run db:seed` populates a complete set of test data
- Integration test creates a video, transitions it through status states, and verifies the final state in DB

---

## Week 3: Model Routing Engine

### Theme
Build the provider-agnostic AI router. This is the heart of the cost optimization system — every AI call flows through it.

### Deliverables
- [ ] `packages/ai-router` package created
- [ ] Provider adapters implemented:
  - OpenAI (GPT-4o, o3-mini)
  - Anthropic (Claude Sonnet, Claude Haiku)
  - Groq (Llama 70B)
  - Google Gemini (Flash, Pro)
- [ ] Provider registry with capability flags per model (supports streaming, function calling, vision, etc.)
- [ ] Routing logic: given `{ task, tier, maxTokens, requiresStreaming }` → select optimal provider/model
- [ ] Fallback chains: primary → fallback1 → fallback2 per tier
- [ ] Rate limiter per provider (Redis sliding window)
- [ ] Circuit breaker per provider (open/closed/half-open states)
- [ ] Streaming response support (async generator interface)
- [ ] All provider calls log to `ai_generation_logs` table
- [ ] Unit tests for routing logic (> 85% coverage)
- [ ] Integration tests hitting real provider APIs (with `--integration` flag; skipped in normal CI)

### Dependencies
- Week 1 (core package), Week 2 (DB package for logging)
- API keys for all providers (stored in `.env`)

### Risks
- Provider API rate limits during development — use personal keys, not shared dev keys
- Circuit breaker state management: use Redis for shared state across worker instances
- Streaming responses need careful testing to ensure backpressure is handled correctly

### Quick Wins
- Test all providers manually via a simple CLI script before wiring into the router
- Implement OpenAI first (most familiar), then Anthropic, then Groq, then Google

### Validation Checkpoint
- `aiRouter.complete({ task: 'script_generation', tier: 'OPTIMIZED', prompt: 'Write a script about...' })` returns a response from Claude Sonnet
- Force OpenAI to fail (invalid key) and verify the router falls back to Anthropic
- Rate limit Redis counter increments correctly after each request

---

## Week 4: Cost Governance Engine

### Theme
Build the budget system. Every generation request must be estimated and checked before it runs, and every actual cost must be recorded after.

### Deliverables
- [ ] `packages/cost-engine` package created
- [ ] Token cost table: per-model, per-provider, input/output prices (updateable without code changes)
- [ ] `CostEstimator`: given model + estimated input/output tokens → estimated cost in USD cents
- [ ] `CostLedger`: record actual costs from AI generation logs into `budget_ledger_entries`
- [ ] `BudgetGuard`: before generating, check remaining daily/monthly budget → throw if exceeded
- [ ] Per-workspace budget configuration: daily limit, monthly limit, per-video limit, per-AI-tier limit
- [ ] Budget consumption API: `GET /api/v1/workspaces/{id}/budget/summary` (remaining, spent, by tier)
- [ ] Budget alert: when spend reaches 80% of daily limit → trigger Slack notification job
- [ ] Unit tests for estimator and budget guard (> 90% coverage, covering boundary conditions)
- [ ] Integration test: generate a script that would exceed budget, verify it is blocked

### Dependencies
- Week 3 (ai-router for actual token counts post-generation)
- Week 2 (DB for budget config and ledger tables)

### Risks
- Token counting varies by model — use provider's actual token counts from API responses, not local estimates
- Budget enforcement race condition: two concurrent requests both see $5 remaining, both proceed — use DB-level atomic update + check in a transaction

### Quick Wins
- Hard-code a $10/day budget for the development workspace and see it enforce correctly
- Build a quick CLI script that prints today's AI spend by provider

### Validation Checkpoint
- Set daily budget to $0.01, attempt a GPT-4o generation, verify `BUDGET_EXCEEDED` error is returned
- After a successful generation, verify the cost is recorded in `budget_ledger_entries` within 100ms
- Budget summary API returns accurate remaining balance

---

## Week 5: Script Generation Pipeline — First Vertical Slice

### Theme
Connect everything built so far into a working end-to-end script generation flow. This is the first "it actually does something" milestone.

### Deliverables
- [ ] `ScriptGenerationProcessor` BullMQ job processor in `apps/worker`
- [ ] Script generation prompt templates (system + user) stored in `packages/core/src/prompts/`
- [ ] Prompt for short-form scripts (60–90 seconds, TikTok/Reels/Shorts)
- [ ] Prompt for long-form scripts (5–15 minutes, YouTube)
- [ ] Hook generation sub-prompt (5 hook variants per topic)
- [ ] Script safety review integration (LLM-based content check before storing)
- [ ] API endpoint: `POST /api/v1/workspaces/{id}/videos` → creates video in `draft` state, queues script generation job
- [ ] API endpoint: `GET /api/v1/workspaces/{id}/videos/{id}` → returns current status + script if ready
- [ ] Simple polling mechanism (frontend polls every 3 seconds while status is `scripting`)
- [ ] Estimated cost shown to operator before script generation begins
- [ ] Generated script stored in `video_scripts` table with prompt hash logged
- [ ] Error handling: provider failure → retry with fallback → mark video as `script_failed` after exhaustion

### Dependencies
- Week 3 (AI Router), Week 4 (Cost Engine), Week 2 (DB)

### Risks
- LLM outputs are non-deterministic — script quality validation must use human review initially; automated quality scoring comes later
- Prompt engineering takes time — budget 1–2 days for iterating on prompt quality

### Quick Wins
- Generate your first real script for a real niche and paste it into a Google Doc — evaluate quality immediately
- Print the actual cost per script generation to validate cost estimates

### Validation Checkpoint
- Hit `POST /api/v1/workspaces/{id}/videos` with a niche and topic → within 30 seconds, `GET` the same video and see a complete script in the response
- The `ai_generation_logs` table has a record with the correct model, token counts, and cost
- Submitting a prompt with obviously unsafe content returns a 422 with `SAFETY_CHECK_FAILED` code

---

## Week 6: Niche Discovery + Competitor Intelligence

### Theme
Build the research modules that feed the content strategy layer. These provide the raw intelligence that everything downstream depends on.

### Deliverables
- [ ] `NicheResearchProcessor`: given a seed keyword → fetch YouTube search data → score niche viability → store in `niche_research_jobs`
- [ ] Niche scoring algorithm: competition level, search volume proxy, growth trend, CPM proxy
- [ ] `CompetitorIntelligenceProcessor`: given a YouTube channel URL → extract video metadata → analyze pacing/hooks/structure → store findings
- [ ] Competitor analysis: top 10 videos by views, average video length, posting frequency, hook patterns
- [ ] YouTube Data API search integration (quota-aware — track units used per day)
- [ ] Store competitor channel data in `competitors` table; analyses in `competitor_analyses`
- [ ] API endpoints:
  - `POST /api/v1/workspaces/{id}/niches/research` — trigger niche research
  - `GET /api/v1/workspaces/{id}/niches` — list researched niches with scores
  - `POST /api/v1/workspaces/{id}/competitors/analyze` — trigger competitor analysis
  - `GET /api/v1/workspaces/{id}/competitors` — list competitor analyses
- [ ] Basic UI: niche list with score, competitor list with key metrics (no fancy charts yet)
- [ ] Competitor Intelligence UI disclaimer banner (per compliance doc)

### Dependencies
- Week 1 (API), Week 2 (DB), YouTube Data API key

### Risks
- YouTube search quota: 100 units per search — a niche research job might use 300–500 units; budget accordingly
- Competitor data can be sparse for new/small channels — handle gracefully

### Quick Wins
- Run a niche research job on a known profitable niche (e.g., "personal finance for millennials") and verify the output makes sense
- Manually compare AI-generated hook pattern analysis against what you can see by watching competitor videos

### Validation Checkpoint
- Niche research job completes for 3 different keywords with distinct scores
- Competitor analysis returns meaningful hook pattern data for a known successful channel
- YouTube quota usage does not exceed 2,000 units during a full niche research session (test by resetting quota counter)

---

## Week 7: Idea Generation + Kanban Board

### Theme
Build the ideas pipeline — the top of the content funnel. Operators should be able to see, filter, approve, and prioritize ideas with minimal friction.

### Deliverables
- [ ] `IdeaGenerationProcessor`: given a niche + competitor analysis → generate 20 video ideas → score by viral potential → store in `ideas` table
- [ ] Idea scoring: hook strength estimate, topic novelty, search demand, competition gap
- [ ] De-duplication: reject ideas with cosine similarity > 0.85 to existing ideas in the same niche
- [ ] Batch idea generation: generate ideas weekly per active niche (scheduled via BullMQ)
- [ ] API endpoints:
  - `GET /api/v1/workspaces/{id}/ideas` — list ideas with filters (niche, status, score)
  - `PATCH /api/v1/workspaces/{id}/ideas/{id}` — update status (approve, reject, defer)
  - `POST /api/v1/workspaces/{id}/ideas/{id}/generate-script` — promote idea to video, trigger script generation
- [ ] **Kanban Board UI** (core feature):
  - Columns: `generated` → `approved` → `scripting` → `scripted` → `rendering` → `publishing` → `published`
  - Drag-and-drop to move ideas between stages
  - Quick actions: Approve, Reject, Generate Script
  - Filter by niche, platform, score threshold
  - Idea count per column
- [ ] Keyboard shortcuts: `a` to approve, `r` to reject, `g` to generate script

### Dependencies
- Week 5 (Script Generation), Week 6 (Niche Research)

### Risks
- Drag-and-drop library choice: use `@dnd-kit/core` (more flexible than react-beautiful-dnd, which is abandoned)
- Idea quality is hard to measure automatically — the scoring model will need tuning after seeing real results

### Quick Wins
- Get a static Kanban board with hard-coded data working before wiring up the API — validate the UI feels right first
- Generate 20 ideas for a real niche and manually rate them to calibrate the scoring model

### Validation Checkpoint
- Kanban board loads in < 500ms with 100 ideas across all columns
- Dragging an idea from `generated` to `approved` triggers a PATCH API call and persists across refresh
- Batch idea generation runs automatically for 2 active niches and produces 40+ unique ideas

---

## Week 8: Media Pipeline — TTS + Video Assembly

### Theme
Transform approved scripts into real video files. This week produces the first actual MP4 that could be uploaded to YouTube.

### Deliverables
- [ ] `packages/media-pipeline` package created
- [ ] TTS adapter for ElevenLabs (primary):
  - Segment script into sections (max 500 chars per API call for good results)
  - Generate audio for each segment
  - Concatenate segments with FFmpeg
  - Normalize audio levels (-20 LUFS target)
- [ ] Whisper transcription of generated voiceover → word-level timestamps
- [ ] SRT/ASS subtitle generation from Whisper word timestamps
- [ ] Stock video selection: given script + niche → query Pexels API → select relevant clips → download and cache in R2
- [ ] FFmpeg video assembly pipeline:
  - Concatenate stock video clips to match voiceover duration
  - Overlay subtitles (burned-in, 9:16 format for Shorts/TikTok)
  - Mix background music (Pixabay Music) at -20 dB
  - Add intro/outro (5-second simple title card)
  - Output: 1080x1920 MP4, H.264, AAC, target < 150 MB
- [ ] `MediaRenderProcessor` BullMQ job with steps: TTS → Transcribe → Select Assets → Render → Upload to R2
- [ ] Video preview in dashboard (signed R2 URL, embedded `<video>` player)
- [ ] Render progress tracking (percentage complete, current step)
- [ ] Asset provenance recorded for all stock footage and music used

### Dependencies
- Week 5 (scripts in DB), Week 7 (video entity exists), ElevenLabs + Pexels API keys, FFmpeg in Docker image

### Risks
- FFmpeg is the highest-risk component — complex filter graphs fail silently or with cryptic errors
- TTS costs accumulate fast during development — use a cheap AWS Polly voice for iteration, switch to ElevenLabs for validation
- R2 upload of large video files needs multipart upload for files > 100 MB

### Quick Wins
- Start with the simplest possible pipeline: one TTS segment + one stock video + no music → one MP4
- Test FFmpeg commands manually in the terminal before wrapping in code

### Validation Checkpoint
- Full `script → TTS → render → R2 upload` completes in under 5 minutes for a 90-second video
- The output MP4 plays correctly in browser and mobile
- Asset provenance table has records for every stock clip and music track used
- Render job survives a worker restart mid-job and resumes from the last completed step

---

## Week 9: Publishing Layer — YouTube Integration

### Theme
Upload the first real video to YouTube programmatically. This is the highest-value integration in the platform.

### Deliverables
- [ ] `packages/publisher` package created
- [ ] YouTube OAuth2 flow:
  - `GET /api/v1/channels/youtube/auth` → redirect to Google OAuth consent screen
  - `GET /api/v1/channels/youtube/callback` → exchange code for tokens → store encrypted in DB
  - Token refresh middleware (auto-refresh access tokens before expiry)
- [ ] YouTube resumable upload implementation:
  - Initialize upload session (get session URI)
  - Upload in 50 MB chunks
  - Handle network interruptions (resume from last acknowledged byte)
  - Verify upload completion via `processingStatus` polling
- [ ] Video metadata: title, description (with affiliate disclosure), tags, category, thumbnail
- [ ] Thumbnail upload (separate API call after video processing completes)
- [ ] Scheduled publish support (`publishAt` RFC 3339 timestamp)
- [ ] `PublishProcessor` BullMQ job:
  - Pre-flight: provenance check, safety check, quota check
  - Upload video file from R2
  - Set metadata
  - Upload thumbnail
  - Poll for `processingStatus === 'succeeded'`
  - Update video record with `platform_video_id` and set status to `published`
  - Log publish action to `audit_logs`
- [ ] API endpoints:
  - `POST /api/v1/workspaces/{id}/videos/{id}/publish` — schedule publish job
  - `GET /api/v1/workspaces/{id}/channels` — list connected channels with token status
- [ ] UI: "Publish to YouTube" button in video detail page with platform account selector

### Dependencies
- Week 8 (rendered video in R2), Google Cloud project with YouTube Data API enabled, OAuth2 credentials

### Risks
- YouTube quota: upload = 1,600 units. With 10,000 unit/day limit, only 6 uploads/day. Test carefully.
- OAuth2 token expiry during long uploads — implement token refresh before initiating upload session
- YouTube processing status can take 5–30 minutes — don't wait synchronously; poll in a separate job

### Quick Wins
- Do a manual test upload via the YouTube API Explorer before writing any code — verify your credentials work
- Test the resume flow by intentionally killing the upload at 50% and verifying it resumes correctly

### Validation Checkpoint
- A video uploaded via the system appears in the YouTube Studio dashboard within 5 minutes
- Processing status polling correctly identifies when the video is ready
- A failed upload (simulate by cutting network) retries and completes successfully
- The publish action is recorded in `audit_logs`

---

## Week 10: Analytics Ingestion + Dashboard

### Theme
Close the feedback loop. The system now knows what it published — it should start learning how those videos are performing.

### Deliverables
- [ ] `AnalyticsIngestProcessor` BullMQ job (scheduled every 6 hours per channel):
  - Fetch YouTube Analytics API data for all videos published in last 30 days
  - Upsert into `video_analytics` table: views, watch_time, ctr, subscribers_gained, likes, comments
  - Calculate 7-day and 30-day rolling averages per channel
  - Detect view spikes (> 3x 7-day average) → trigger Slack notification
- [ ] Analytics aggregation service: channel performance summary, top videos by views, CTR distribution
- [ ] API endpoints:
  - `GET /api/v1/workspaces/{id}/analytics/overview` — channel-level summary
  - `GET /api/v1/workspaces/{id}/analytics/videos` — per-video performance table
  - `GET /api/v1/workspaces/{id}/analytics/trends` — 30-day trend data
- [ ] **Analytics Dashboard UI:**
  - Channel overview cards: total views (7d/30d), subscriber delta, estimated revenue
  - Video performance table (sortable by views, CTR, watch time)
  - Simple time-series chart (views per day, last 30 days) — use `recharts`
  - Top performer callout: "Your best video this week: [title] — [X] views"
  - Filter: by channel, by platform, by date range
- [ ] Data latency notice: "Analytics data is 24–72 hours delayed" displayed in UI

### Dependencies
- Week 9 (published videos exist), YouTube Analytics API enabled in Google Cloud project

### Risks
- YouTube Analytics data latency of 48–72 hours — set expectations in UI; don't make the dashboard look broken
- Analytics polling uses minimal quota (1 unit/query) — but still implement rate limiting to avoid hammering the API

### Quick Wins
- Start with a manual "refresh analytics" button before building the scheduler — validate the data is correct first
- Sort the video table by CTR descending and look at it — you'll immediately spot patterns

### Validation Checkpoint
- Analytics ingest job runs and populates data for 5 published test videos
- Dashboard displays accurate view counts matching YouTube Studio (within < 5% delta accounting for data latency)
- View spike detection triggers a Slack notification when a test video gets 3x its average views
- Dashboard loads in < 1 second (data is pre-aggregated, not computed on the fly)

---

## Week 11: Autopilot Engine + Automation Rules

### Theme
Build the first automation layer. The system should be able to take a niche and produce published videos without human intervention.

### Deliverables
- [ ] Automation rule data model: `automation_rules` table with `trigger`, `conditions`, `actions` JSONB fields
- [ ] Rule engine: evaluate rules against events; execute actions when conditions are met
- [ ] Supported triggers:
  - `schedule.daily` — runs once per day at configured time
  - `idea.approved` — when an idea status changes to approved
  - `video.published` — when a video is published
  - `analytics.view_spike` — when views exceed threshold
- [ ] Supported actions:
  - `idea.generate` — trigger idea generation for a niche
  - `script.generate` — trigger script generation for an idea
  - `video.render` — trigger video render for a scripted video
  - `video.publish` — schedule video for publish
  - `notification.slack` — send Slack alert
- [ ] **Autopilot Mode**: a pre-configured rule chain:
  1. Daily at 6 AM: Generate 10 ideas for the configured niche
  2. Auto-approve ideas with score > 80
  3. For each approved idea: generate script → render video → schedule publish for next open slot
- [ ] Autopilot on/off toggle per channel in the UI
- [ ] Autopilot configuration: target posts per week, niche, AI tier, daily budget cap
- [ ] Dry-run mode: simulate what Autopilot would do without executing (shows planned actions)
- [ ] Automation run log: every rule execution logged with trigger event, actions taken, results

### Dependencies
- Weeks 5–10 (all pipeline steps must be working)

### Risks
- Autopilot can generate unexpected costs if budget guard is misconfigured — double-check budget enforcement before enabling
- Automation bugs can flood the publish queue — add a circuit breaker: if > 5 publish failures in 1 hour, pause Autopilot and notify operator

### Quick Wins
- Test each automation action in isolation before wiring them together
- Run the full Autopilot loop in dry-run mode first and verify the planned action sequence is correct

### Validation Checkpoint
- Create a rule: "Every day at 9 AM, generate 5 ideas for niche X" → run it → verify 5 ideas appear in the Kanban board
- Enable Autopilot for a test channel → verify it generates ideas, approves high-scoring ones, and queues script generation without manual intervention
- Autopilot correctly respects the daily budget cap and stops generating when budget is exhausted

---

## Week 12: Integration, Hardening, First Channel Live

### Theme
Make everything work together reliably. Fix bugs found in the full end-to-end flow. Launch a real channel.

### Deliverables
- [ ] End-to-end test: complete flow from niche selection → idea → script → render → publish → analytics visible
- [ ] Fix all bugs found in the E2E test (budget ~80% of the week's time)
- [ ] Error handling audit: every job processor must handle all known failure modes gracefully
- [ ] Retry and DLQ audit: verify all queues have correct retry configs and DLQ alerts working
- [ ] Logging audit: every important event is logged at the right level (info/warn/error) with the right context
- [ ] Performance baseline: measure and document P50/P95 latency for:
  - Script generation (target: < 30s P95)
  - Video render (target: < 5 min P95 for 90-second video)
  - Video publish (target: < 10 min P95 including YouTube processing wait)
- [ ] Security baseline:
  - All API routes are auth-protected (no accidental public endpoints)
  - No API keys in logs
  - OAuth tokens are encrypted at rest
  - R2 URLs are signed with TTL (no public permanent URLs)
- [ ] **First Real Channel Launch:**
  - Create a new YouTube channel in target niche
  - Configure channel in the platform
  - Enable Autopilot with conservative settings (2 videos/week, ECONOMICAL tier)
  - Publish the first 3 videos manually (to validate quality before autopilot)
  - Enable autopilot for videos 4+
- [ ] Runbook written for: restarting workers, replaying DLQ jobs, rotating API keys
- [ ] `CHANGELOG.md` with Week 1–12 milestones

### Dependencies
- Weeks 1–11 (everything)

### Risks
- Integration bugs can be numerous — prioritize by: blocking (must fix before launch), degrading (fix in week 13), cosmetic (backlog)
- YouTube account suspension risk: new channel + immediate high-volume posting looks suspicious; warm up with 1 video/week initially
- Content quality issues: the first videos may not be good enough. Have the operator review every video before enabling autopilot.

### Quick Wins
- Publish the first video manually and watch the YouTube Studio stats — this is the most motivating moment in the project
- Write the runbook for DLQ replay before you need it (you will need it)

### Validation Checkpoint
**The launch checklist:**
- [ ] At least 3 videos published to a real YouTube channel
- [ ] All 3 videos pass manual quality review
- [ ] Analytics data visible in dashboard for all 3 videos
- [ ] Autopilot enabled and runs for 48 hours without human intervention
- [ ] No errors in DLQ after 48 hours of Autopilot
- [ ] Budget consumption tracked accurately (< 5% deviation from estimates)
- [ ] Slack alerts firing correctly for job failures and budget thresholds
- [ ] The team can identify and fix a production issue using only the logs and runbooks

---

## Weekly Cadence

Each week follows this rhythm:

| Day | Activity |
|---|---|
| Monday | Review previous week's validation checkpoint; plan current week's deliverables in detail |
| Tue–Thu | Primary build time; commit frequently; run CI |
| Friday | Validation checkpoint; demo deliverables; write retrospective note (1 paragraph: what worked, what didn't, what changes next week) |
| Daily | `pnpm run test` before committing; `pnpm run lint && pnpm run type-check` before pushing |

---

## Post-Week-12 Backlog (Week 13+)

These are important but don't block the Phase 1 launch:
- TikTok publishing integration
- Instagram Reels publishing
- Self-hosted Whisper for cost reduction
- Advanced analytics (cohort analysis, A/B testing thumbnails)
- Competitor Intelligence deep dive (hook pattern extraction from transcripts)
- Custom AI persona/voice management
- Multi-channel Autopilot management
- Stripe billing integration (Phase 2 prerequisite)
- Multi-workspace support (Phase 2 prerequisite)
