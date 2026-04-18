# 11 — Data Model

**Faceless Viral OS | Blueprint Series**
Version: 1.0 | Status: Engineering-Ready | Phase: 1 + 2

---

## Table of Contents

1. [Conceptual Model](#conceptual-model)
2. [Entity Definitions](#entity-definitions)
3. [Prisma Schema](#prisma-schema)

---

## 1. Conceptual Model

### 1.1 Overview in Prose

The data model is organized around five domains that reflect the lifecycle of a faceless content business:

**Identity & Access** — Users own Brands. In Phase 2, Workspaces group users into teams with role-based membership. A Brand is the business identity (niche, tone, language) that governs one or more Channels.

**Market Intelligence** — Niches are researched market segments. Each Niche yields Trends (keyword momentum data) and has associated CompetitorChannels. Competitor channels are analyzed to produce ChannelInsights, which feed into the Strategy Brief.

**Content Production** — Channels organize their content into ContentPillars (thematic series). Each Pillar spawns ContentIdeas, which are scored and selected. Approved Ideas become Scripts. Scripts reference VoiceProfiles for TTS and Assets (stock footage, images) for visual assembly. Scripts are rendered into Videos, which are then adapted into VideoVariants per platform.

**Distribution** — VideoVariants are dispatched as PublishJobs to PlatformAccounts. A Channel can have one PlatformAccount per platform. Publish jobs carry scheduling metadata, retry state, and the platform's assigned video ID after success.

**Economics** — Every provider call writes to the Usage Ledger (CostLedger + UsageRecords). Budgets enforce spend caps at entity level. AnalyticsSnapshots capture performance data ingested from platform APIs and feed back into ROI calculations.

**Automation** — AutomationRules define trigger/action pairs that operate the content pipeline. MonetizationLinks track affiliate and sponsor URLs. Providers and Models are catalog entries that the routing engine uses for optimal selection.

### 1.2 Entity Relationship Diagram

```
┌─────────┐       ┌──────────────┐     ┌────────────┐
│  users  │──1:N──│    brands    │─1:N─│  channels  │
└─────────┘       └──────────────┘     └─────┬──────┘
     │                                        │
     │ [Phase 2]                    ┌──────────┼──────────────────┐
┌────┴──────┐                       │          │                  │
│workspaces │               platform_accounts  │          automation_rules
│membership │                                  │
└───────────┘                        ┌─────────┼───────────────────┐
                                     │         │                   │
                              content_pillars   │           channel_insights
                                     │    voice_profiles
                              content_ideas                  (← competitor_channels
                                     │                          ← niches ← trends)
                                  scripts
                                     │
                                  videos
                                     │
                              video_variants
                                     │
                              publish_jobs ──── platform_accounts
                                     │
                        analytics_snapshots
                                     
┌──────────────────────────────────────────────────────┐
│ Economics Layer                                       │
│  budgets ── cost_ledgers ── usage_records            │
│  ledger_entries (append-only)                        │
│  providers ── models ── routing_policies             │
│  tier_profiles                                        │
└──────────────────────────────────────────────────────┘
```

---

## 2. Entity Definitions

### users

Primary actor. In Phase 1, one user = the operator. In Phase 2, users belong to workspaces.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `email` | String, unique | Login identifier |
| `name` | String | Display name |
| `role` | Enum: ADMIN, OPERATOR, VIEWER | Platform role |
| `password_hash` | String | Argon2id |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

**Relations:** owns many Brands; belongs to many Workspaces (Phase 2)

---

### workspaces *(Phase 2)*

Multi-tenant container. Each workspace is an isolated content business.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `name` | String | Business/team name |
| `owner_id` | UUID FK → users | Workspace creator |
| `plan` | Enum: STARTER, GROWTH, SCALE | Billing plan |
| `created_at` | Timestamp | |

**Relations:** has many Memberships; has many Brands

---

### memberships *(Phase 2)*

Junction table: user ↔ workspace with role.

| Field | Type | Notes |
|-------|------|-------|
| `workspace_id` | UUID FK → workspaces | |
| `user_id` | UUID FK → users | |
| `role` | Enum: OWNER, ADMIN, EDITOR, VIEWER | |
| `joined_at` | Timestamp | |

**PK:** composite (workspace_id, user_id)

---

### brands

The business entity behind one or more channels. Defines niche, tone, and language strategy.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `name` | String | Brand name |
| `owner_id` | UUID FK → users | |
| `workspace_id` | UUID FK → workspaces | Phase 2 only |
| `niche` | String | Primary niche tag |
| `tone` | String | e.g., 'educational', 'entertaining' |
| `language_primary` | String | ISO 639-1: 'en', 'es' |
| `language_secondary` | String[] | Additional languages |
| `created_at` | Timestamp | |

**Relations:** has many Channels

---

### channels

A single content channel on a specific platform. The atomic unit of the content business.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `brand_id` | UUID FK → brands | |
| `platform` | Enum: YOUTUBE, TIKTOK, INSTAGRAM | |
| `handle` | String | @handle or channel name |
| `status` | Enum: ACTIVE, PAUSED, ARCHIVED | |
| `tier` | Enum: FREE, ECONOMICAL, OPTIMIZED, PREMIUM, ULTRA | AI tier |
| `monthly_budget` | Decimal(10,4) | USD cap for this channel/month |
| `auto_tier_management` | Boolean | Let CGE auto-adjust tier |
| `view_threshold` | Integer | Min views/video for tier review |
| `created_at` | Timestamp | |

**Relations:** belongs to Brand; has many ContentPillars, ContentIdeas, Videos, PlatformAccounts, AnalyticsSnapshots, AutomationRules, Budgets

---

### platform_accounts

OAuth credentials for a specific platform account linked to a channel.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `channel_id` | UUID FK → channels | |
| `platform` | Enum: YOUTUBE, TIKTOK, INSTAGRAM | |
| `account_id` | String | Platform's native account ID |
| `oauth_access_token` | String (encrypted) | |
| `oauth_refresh_token` | String (encrypted) | |
| `token_expires_at` | Timestamp | |
| `scopes` | String[] | Granted OAuth scopes |
| `created_at` | Timestamp | |

**Relations:** has many PublishJobs

---

### niches

Researched market segments with viability scoring.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `name` | String, unique | e.g., 'AI Tools for Entrepreneurs' |
| `category` | String | Parent category |
| `competition_score` | Float | 0.0 (low) – 1.0 (high) |
| `revenue_potential` | Enum: LOW, MEDIUM, HIGH, VERY_HIGH | |
| `trend_score` | Float | 0.0 – 1.0, derived from recent trend data |
| `last_analyzed_at` | Timestamp | |
| `created_at` | Timestamp | |

**Relations:** has many Trends, CompetitorChannels

---

### trends

Keyword momentum snapshots for a niche, captured from research tools.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `niche_id` | UUID FK → niches | |
| `keyword` | String | Search term |
| `search_volume` | Integer | Monthly searches |
| `growth_rate` | Float | % change vs prior period |
| `platform` | Enum: YOUTUBE, TIKTOK, INSTAGRAM, GOOGLE | |
| `captured_at` | Timestamp | When data was fetched |

---

### competitor_channels

Tracked competitor channels for analysis.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `niche_id` | UUID FK → niches | |
| `platform` | Enum | |
| `handle` | String | |
| `channel_url` | String | Full URL |
| `subscribers` | Integer | Last known count |
| `avg_views` | Integer | Average views per video |
| `avg_views_30d` | Integer | Rolling 30-day average |
| `content_style` | String | Brief description |
| `upload_frequency` | String | e.g., 'daily', '3x/week' |
| `last_scraped_at` | Timestamp | |

**Relations:** has many ChannelInsights

---

### channel_insights

Structured intelligence extracted from competitor channel analysis.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `competitor_channel_id` | UUID FK → competitor_channels | |
| `hook_patterns` | String[] | Common opening hook formulas |
| `pacing` | String | e.g., 'fast-cut', 'narrative', 'educational' |
| `format` | String | e.g., 'listicle', 'story', 'tutorial' |
| `avg_duration` | Integer | Seconds |
| `thumbnail_style` | String | Description of thumbnail approach |
| `cta_patterns` | String[] | Call-to-action formulas used |
| `top_performing_topics` | String[] | |
| `analyzed_at` | Timestamp | |
| `model_used` | String | Which AI model did the analysis |

---

### content_pillars

Thematic content series within a channel. Organizes the content calendar.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `channel_id` | UUID FK → channels | |
| `name` | String | e.g., 'AI Tool Reviews' |
| `description` | Text | |
| `video_count` | Integer | Published videos in this pillar |
| `performance_avg` | Float | Average view score |
| `is_active` | Boolean | |
| `created_at` | Timestamp | |

---

### content_ideas

Individual video ideas, generated and scored before becoming scripts.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `channel_id` | UUID FK → channels | |
| `pillar_id` | UUID FK → content_pillars | |
| `title` | String | Proposed video title |
| `hook` | String | Opening hook sentence |
| `format` | Enum: LISTICLE, STORY, TUTORIAL, REACTION, EXPLAINER | |
| `estimated_roi` | Float | Predicted ROI score |
| `trend_alignment` | Float | 0.0 – 1.0 |
| `competition_gap` | Float | Opportunity score |
| `status` | Enum: IDEA, APPROVED, IN_PRODUCTION, PUBLISHED, REJECTED | |
| `approved_by` | UUID FK → users | |
| `approved_at` | Timestamp | |
| `created_at` | Timestamp | |

---

### scripts

The text content of a video. Versioned, with cost tracking.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `idea_id` | UUID FK → content_ideas | |
| `channel_id` | UUID FK → channels | Denormalized for query efficiency |
| `language` | String | ISO 639-1 |
| `content` | Text | Full script text |
| `word_count` | Integer | |
| `scene_breakdown` | JSONB | Array of scene objects |
| `model_used` | String | LLM model identifier |
| `cost_usd` | Decimal(10,6) | Cost to generate this script |
| `version` | Integer | Script revision number |
| `status` | Enum: DRAFT, APPROVED, REJECTED | |
| `approved_by` | UUID FK → users | |
| `created_at` | Timestamp | |

---

### voice_profiles

TTS voice configuration for a channel.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `channel_id` | UUID FK → channels | |
| `provider` | String | 'elevenlabs', 'openai_tts', 'azure_tts' |
| `voice_id` | String | Provider's voice identifier |
| `language` | String | |
| `style` | String | 'narrative', 'energetic', 'calm' |
| `settings` | JSONB | Stability, similarity, speed, etc. |
| `is_default` | Boolean | |
| `sample_url` | String | URL to sample audio |
| `created_at` | Timestamp | |

---

### assets

Media assets (stock images, footage clips, music) used in video production.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `channel_id` | UUID FK → channels | |
| `type` | Enum: IMAGE, VIDEO_CLIP, MUSIC, SOUND_EFFECT, BACKGROUND | |
| `url` | String | Cloudflare R2 URL |
| `source` | String | 'pexels', 'pixabay', 'generated', 'uploaded' |
| `license` | String | 'cc0', 'commercial', 'generated' |
| `tags` | String[] | Searchable tags |
| `metadata` | JSONB | Dimensions, duration, file size, etc. |
| `created_at` | Timestamp | |

---

### videos

A rendered video asset, before platform-specific adaptation.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `script_id` | UUID FK → scripts | |
| `channel_id` | UUID FK → channels | Denormalized |
| `status` | Enum: QUEUED, RENDERING, DONE, FAILED | |
| `render_job_id` | String | BullMQ job ID |
| `duration_seconds` | Float | |
| `file_url` | String | Cloudflare R2 URL |
| `thumbnail_url` | String | Auto-generated thumbnail |
| `render_cost_usd` | Decimal(10,6) | |
| `render_provider` | String | |
| `created_at` | Timestamp | |
| `completed_at` | Timestamp | |

**Relations:** has many VideoVariants

---

### video_variants

Platform-specific adaptations of a master video.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `video_id` | UUID FK → videos | |
| `platform` | Enum: YOUTUBE, TIKTOK, INSTAGRAM | |
| `aspect_ratio` | String | '16:9', '9:16', '1:1' |
| `duration` | Float | May be trimmed for platform limits |
| `file_url` | String | Cloudflare R2 URL |
| `thumbnail_url` | String | |
| `title` | String | Platform-specific title |
| `description` | Text | Platform-specific description |
| `tags` | String[] | |
| `status` | Enum: PENDING, READY, FAILED | |
| `created_at` | Timestamp | |

**Relations:** has many PublishJobs

---

### publish_jobs

Scheduled or immediate dispatch of a video variant to a platform.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `video_variant_id` | UUID FK → video_variants | |
| `platform_account_id` | UUID FK → platform_accounts | |
| `scheduled_at` | Timestamp | Desired publish time |
| `published_at` | Timestamp | Actual publish time |
| `status` | Enum: PENDING, PROCESSING, PUBLISHED, FAILED, CANCELLED | |
| `platform_video_id` | String | ID assigned by platform after upload |
| `platform_url` | String | Public URL of published video |
| `attempt_count` | Integer | Retry counter |
| `last_error` | Text | Last failure message |
| `metadata` | JSONB | Platform-specific response data |
| `created_at` | Timestamp | |

---

### analytics_snapshots

Point-in-time performance metrics ingested from platform APIs.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `channel_id` | UUID FK → channels | |
| `video_id` | UUID FK → videos | Nullable (channel-level snapshots) |
| `platform` | Enum | |
| `views` | Integer | |
| `likes` | Integer | |
| `comments` | Integer | |
| `shares` | Integer | |
| `ctr` | Float | Click-through rate % |
| `avd` | Float | Average view duration (seconds or %) |
| `revenue_usd` | Decimal(10,4) | Platform-reported revenue |
| `captured_at` | Timestamp | When this snapshot was taken |

**Index:** (channel_id, video_id, captured_at)

---

### automation_rules

Trigger/action definitions for the autopilot engine.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `channel_id` | UUID FK → channels | |
| `name` | String | Human-readable rule name |
| `trigger_type` | Enum: SCHEDULE, THRESHOLD, MANUAL, EVENT | |
| `trigger_config` | JSONB | Cron expression or threshold params |
| `action_type` | Enum: GENERATE_IDEAS, CREATE_SCRIPT, RENDER_VIDEO, PUBLISH, ANALYZE | |
| `action_config` | JSONB | Action parameters |
| `enabled` | Boolean | |
| `last_run_at` | Timestamp | |
| `next_run_at` | Timestamp | |
| `run_count` | Integer | |
| `created_at` | Timestamp | |

---

### monetization_links

Affiliate and tracked links associated with a channel.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `channel_id` | UUID FK → channels | |
| `type` | Enum: AFFILIATE, SPONSOR, PRODUCT, CHANNEL | |
| `url` | String | Destination URL |
| `tracking_url` | String | Redirect URL with tracking |
| `provider` | String | 'amazon', 'digistore24', 'custom' |
| `tracking_params` | JSONB | UTM params, affiliate ID, etc. |
| `clicks` | Integer | Tracked click count |
| `conversions` | Integer | Tracked conversions |
| `revenue_usd` | Decimal(10,4) | Earned revenue |
| `created_at` | Timestamp | |

---

### providers

AI and media service provider catalog.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `name` | String, unique | 'openai', 'anthropic', 'elevenlabs', etc. |
| `type` | Enum: LLM, TTS, IMAGE_GEN, VIDEO_GEN, TRANSCRIPTION | |
| `base_url` | String | API endpoint |
| `health_status` | Enum: HEALTHY, DEGRADED, DOWN | |
| `last_checked_at` | Timestamp | |
| `api_key_env` | String | Env var name holding API key |
| `metadata` | JSONB | Rate limits, tier compatibility, etc. |

---

### models

AI model catalog entries with pricing.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `provider_id` | UUID FK → providers | |
| `model_id` | String | Provider's model identifier |
| `display_name` | String | Human-readable name |
| `task_types` | String[] | Supported task types |
| `cost_per_1k_input` | Decimal(10,6) | USD |
| `cost_per_1k_output` | Decimal(10,6) | USD |
| `quality_score` | Float | 0.0 – 10.0 (internal benchmark) |
| `latency_ms` | Integer | Average p50 latency |
| `context_window` | Integer | Max tokens |
| `is_active` | Boolean | |
| `tiers_allowed` | String[] | Which AI tiers can use this model |

---

### tier_profiles

Configuration presets per AI tier.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `tier_name` | Enum: FREE, ECONOMICAL, OPTIMIZED, PREMIUM, ULTRA | Unique |
| `config_json` | JSONB | Full tier config (see routing) |
| `updated_at` | Timestamp | |

**config_json structure:**
```json
{
  "script": { "provider": "groq", "model": "llama3-70b-8192" },
  "tts": { "provider": "openai_tts", "model": "tts-1" },
  "image": { "provider": "sdxl-turbo", "model": "sdxl-turbo" },
  "video": { "provider": "remotion", "template": "basic" }
}
```

---

### routing_policies

Channel-level overrides for AI model routing.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `channel_id` | UUID FK → channels | |
| `tier` | Enum | |
| `task_type` | String | |
| `preferred_provider_id` | UUID FK → providers | |
| `fallback_chain` | UUID[] | Ordered list of fallback provider IDs |
| `created_at` | Timestamp | |

---

### cost_ledgers

Monthly cost summary per channel.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `channel_id` | UUID FK → channels | |
| `period_start` | Date | First day of month |
| `period_end` | Date | Last day of month |
| `budget_usd` | Decimal(10,4) | Budget at period start |
| `spent_usd` | Decimal(10,4) | Running total |
| `entries_count` | Integer | Number of ledger entries |
| `updated_at` | Timestamp | |

---

### budgets

Budget caps for any entity type.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `entity_type` | Enum: USER, CHANNEL, WORKFLOW, BATCH, PROVIDER | |
| `entity_id` | String | UUID of the entity |
| `period` | String | 'YYYY-MM' or 'YYYY-MM-DD' or 'run' |
| `amount_usd` | Decimal(10,4) | |
| `alert_threshold` | Float | 0.80 default |
| `hard_stop` | Boolean | true default |
| `carry_queue` | Boolean | Queue overflow to next period |
| `created_at` | Timestamp | |

---

### usage_records

Individual provider call records within a cost ledger.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `ledger_id` | UUID FK → cost_ledgers | |
| `timestamp` | Timestamp | |
| `provider` | String | |
| `model` | String | |
| `task_type` | String | |
| `tokens_in` | Integer | |
| `tokens_out` | Integer | |
| `cost_usd` | Decimal(10,6) | |
| `metadata` | JSONB | |

---

## 3. Prisma Schema

```prisma
// prisma/schema.prisma
// Faceless Viral OS — Production Prisma Schema
// Generator: Prisma Client JS + Prisma Migrate

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgcrypto, pg_trgm]
}

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum UserRole {
  ADMIN
  OPERATOR
  VIEWER
}

enum WorkspacePlan {
  STARTER
  GROWTH
  SCALE
}

enum MembershipRole {
  OWNER
  ADMIN
  EDITOR
  VIEWER
}

enum Platform {
  YOUTUBE
  TIKTOK
  INSTAGRAM
}

enum ChannelStatus {
  ACTIVE
  PAUSED
  ARCHIVED
}

enum AiTier {
  FREE
  ECONOMICAL
  OPTIMIZED
  PREMIUM
  ULTRA
}

enum RevenuePotential {
  LOW
  MEDIUM
  HIGH
  VERY_HIGH
}

enum ContentFormat {
  LISTICLE
  STORY
  TUTORIAL
  REACTION
  EXPLAINER
  DOCUMENTARY
  COMPILATION
}

enum IdeaStatus {
  IDEA
  APPROVED
  IN_PRODUCTION
  PUBLISHED
  REJECTED
}

enum ScriptStatus {
  DRAFT
  APPROVED
  REJECTED
}

enum VideoStatus {
  QUEUED
  RENDERING
  DONE
  FAILED
}

enum VariantStatus {
  PENDING
  READY
  FAILED
}

enum PublishStatus {
  PENDING
  PROCESSING
  PUBLISHED
  FAILED
  CANCELLED
}

enum AssetType {
  IMAGE
  VIDEO_CLIP
  MUSIC
  SOUND_EFFECT
  BACKGROUND
}

enum MonetizationLinkType {
  AFFILIATE
  SPONSOR
  PRODUCT
  CHANNEL
}

enum ProviderType {
  LLM
  TTS
  IMAGE_GEN
  VIDEO_GEN
  TRANSCRIPTION
}

enum ProviderHealth {
  HEALTHY
  DEGRADED
  DOWN
}

enum TriggerType {
  SCHEDULE
  THRESHOLD
  MANUAL
  EVENT
}

enum ActionType {
  GENERATE_IDEAS
  CREATE_SCRIPT
  RENDER_VIDEO
  PUBLISH
  ANALYZE
  TIER_ADJUST
}

enum BudgetEntityType {
  USER
  CHANNEL
  WORKFLOW
  BATCH
  PROVIDER
}

enum LedgerStatus {
  COMPLETED
  FAILED
  REFUNDED
}

// ─────────────────────────────────────────────
// IDENTITY & ACCESS
// ─────────────────────────────────────────────

model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email        String   @unique
  name         String
  role         UserRole @default(OPERATOR)
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  brands      Brand[]
  memberships Membership[]
  approvedIdeas ContentIdea[] @relation("ApprovedIdeas")
  approvedScripts Script[]    @relation("ApprovedScripts")

  @@map("users")
}

model Workspace {
  id        String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name      String
  ownerId   String        @map("owner_id") @db.Uuid
  plan      WorkspacePlan @default(STARTER)
  createdAt DateTime      @default(now()) @map("created_at")

  memberships Membership[]
  brands      Brand[]

  @@map("workspaces")
}

model Membership {
  workspaceId String         @map("workspace_id") @db.Uuid
  userId      String         @map("user_id") @db.Uuid
  role        MembershipRole @default(VIEWER)
  joinedAt    DateTime       @default(now()) @map("joined_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([workspaceId, userId])
  @@map("memberships")
}

// ─────────────────────────────────────────────
// BRANDS & CHANNELS
// ─────────────────────────────────────────────

model Brand {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name              String
  ownerId           String   @map("owner_id") @db.Uuid
  workspaceId       String?  @map("workspace_id") @db.Uuid
  niche             String
  tone              String
  languagePrimary   String   @default("en") @map("language_primary")
  languageSecondary String[] @default([]) @map("language_secondary")
  createdAt         DateTime @default(now()) @map("created_at")

  owner     User       @relation(fields: [ownerId], references: [id])
  workspace Workspace? @relation(fields: [workspaceId], references: [id])
  channels  Channel[]

  @@map("brands")
}

model Channel {
  id                  String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  brandId             String        @map("brand_id") @db.Uuid
  platform            Platform
  handle              String
  status              ChannelStatus @default(ACTIVE)
  tier                AiTier        @default(ECONOMICAL)
  monthlyBudget       Decimal       @map("monthly_budget") @db.Decimal(10, 4)
  autoTierManagement  Boolean       @default(false) @map("auto_tier_management")
  viewThreshold       Int           @default(1000) @map("view_threshold")
  createdAt           DateTime      @default(now()) @map("created_at")

  brand              Brand               @relation(fields: [brandId], references: [id])
  platformAccounts   PlatformAccount[]
  contentPillars     ContentPillar[]
  contentIdeas       ContentIdea[]
  scripts            Script[]
  voiceProfiles      VoiceProfile[]
  assets             Asset[]
  videos             Video[]
  analyticsSnapshots AnalyticsSnapshot[]
  automationRules    AutomationRule[]
  monetizationLinks  MonetizationLink[]
  routingPolicies    RoutingPolicy[]
  costLedgers        CostLedger[]
  budgets            Budget[]            @relation("ChannelBudgets")
  ledgerEntries      LedgerEntry[]

  @@unique([platform, handle])
  @@map("channels")
}

model PlatformAccount {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  channelId          String   @map("channel_id") @db.Uuid
  platform           Platform
  accountId          String   @map("account_id")
  oauthAccessToken   String   @map("oauth_access_token")
  oauthRefreshToken  String   @map("oauth_refresh_token")
  tokenExpiresAt     DateTime @map("token_expires_at")
  scopes             String[]
  createdAt          DateTime @default(now()) @map("created_at")

  channel     Channel      @relation(fields: [channelId], references: [id], onDelete: Cascade)
  publishJobs PublishJob[]

  @@unique([channelId, platform])
  @@map("platform_accounts")
}

// ─────────────────────────────────────────────
// MARKET INTELLIGENCE
// ─────────────────────────────────────────────

model Niche {
  id               String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name             String           @unique
  category         String
  competitionScore Float            @default(0.5) @map("competition_score")
  revenuePotential RevenuePotential @default(MEDIUM) @map("revenue_potential")
  trendScore       Float            @default(0.5) @map("trend_score")
  lastAnalyzedAt   DateTime?        @map("last_analyzed_at")
  createdAt        DateTime         @default(now()) @map("created_at")

  trends              Trend[]
  competitorChannels  CompetitorChannel[]

  @@map("niches")
}

model Trend {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  nicheId      String   @map("niche_id") @db.Uuid
  keyword      String
  searchVolume Int      @map("search_volume")
  growthRate   Float    @map("growth_rate")
  platform     Platform
  capturedAt   DateTime @map("captured_at")

  niche Niche @relation(fields: [nicheId], references: [id], onDelete: Cascade)

  @@index([nicheId, capturedAt])
  @@map("trends")
}

model CompetitorChannel {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  nicheId         String   @map("niche_id") @db.Uuid
  platform        Platform
  handle          String
  channelUrl      String   @map("channel_url")
  subscribers     Int      @default(0)
  avgViews        Int      @default(0) @map("avg_views")
  avgViews30d     Int      @default(0) @map("avg_views_30d")
  contentStyle    String   @map("content_style")
  uploadFrequency String   @default("unknown") @map("upload_frequency")
  lastScrapedAt   DateTime @map("last_scraped_at")

  niche    Niche            @relation(fields: [nicheId], references: [id])
  insights ChannelInsight[]

  @@index([nicheId])
  @@map("competitor_channels")
}

model ChannelInsight {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  competitorChannelId   String   @map("competitor_channel_id") @db.Uuid
  hookPatterns          String[] @map("hook_patterns")
  pacing                String
  format                String
  avgDuration           Int      @map("avg_duration")
  thumbnailStyle        String   @map("thumbnail_style")
  ctaPatterns           String[] @map("cta_patterns")
  topPerformingTopics   String[] @map("top_performing_topics")
  analyzedAt            DateTime @map("analyzed_at")
  modelUsed             String   @map("model_used")

  competitorChannel CompetitorChannel @relation(fields: [competitorChannelId], references: [id], onDelete: Cascade)

  @@map("channel_insights")
}

// ─────────────────────────────────────────────
// CONTENT PRODUCTION
// ─────────────────────────────────────────────

model ContentPillar {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  channelId      String   @map("channel_id") @db.Uuid
  name           String
  description    String
  videoCount     Int      @default(0) @map("video_count")
  performanceAvg Float    @default(0) @map("performance_avg")
  isActive       Boolean  @default(true) @map("is_active")
  createdAt      DateTime @default(now()) @map("created_at")

  channel      Channel       @relation(fields: [channelId], references: [id], onDelete: Cascade)
  contentIdeas ContentIdea[]

  @@map("content_pillars")
}

model ContentIdea {
  id              String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  channelId       String        @map("channel_id") @db.Uuid
  pillarId        String?       @map("pillar_id") @db.Uuid
  title           String
  hook            String
  format          ContentFormat @default(EXPLAINER)
  estimatedRoi    Float         @default(0) @map("estimated_roi")
  trendAlignment  Float         @default(0) @map("trend_alignment")
  competitionGap  Float         @default(0) @map("competition_gap")
  status          IdeaStatus    @default(IDEA)
  approvedBy      String?       @map("approved_by") @db.Uuid
  approvedAt      DateTime?     @map("approved_at")
  createdAt       DateTime      @default(now()) @map("created_at")

  channel Channel        @relation(fields: [channelId], references: [id], onDelete: Cascade)
  pillar  ContentPillar? @relation(fields: [pillarId], references: [id])
  approver User?         @relation("ApprovedIdeas", fields: [approvedBy], references: [id])
  scripts Script[]

  @@index([channelId, status])
  @@map("content_ideas")
}

model Script {
  id             String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ideaId         String       @map("idea_id") @db.Uuid
  channelId      String       @map("channel_id") @db.Uuid
  language       String       @default("en")
  content        String
  wordCount      Int          @map("word_count")
  sceneBreakdown Json         @default("[]") @map("scene_breakdown")
  modelUsed      String       @map("model_used")
  costUsd        Decimal      @map("cost_usd") @db.Decimal(10, 6)
  version        Int          @default(1)
  status         ScriptStatus @default(DRAFT)
  approvedBy     String?      @map("approved_by") @db.Uuid
  createdAt      DateTime     @default(now()) @map("created_at")

  idea     ContentIdea @relation(fields: [ideaId], references: [id])
  channel  Channel     @relation(fields: [channelId], references: [id])
  approver User?       @relation("ApprovedScripts", fields: [approvedBy], references: [id])
  videos   Video[]

  @@index([ideaId])
  @@index([channelId, status])
  @@map("scripts")
}

model VoiceProfile {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  channelId String   @map("channel_id") @db.Uuid
  provider  String
  voiceId   String   @map("voice_id")
  language  String
  style     String
  settings  Json     @default("{}")
  isDefault Boolean  @default(false) @map("is_default")
  sampleUrl String?  @map("sample_url")
  createdAt DateTime @default(now()) @map("created_at")

  channel Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@unique([channelId, provider, voiceId, language])
  @@map("voice_profiles")
}

model Asset {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  channelId String    @map("channel_id") @db.Uuid
  type      AssetType
  url       String
  source    String
  license   String
  tags      String[]  @default([])
  metadata  Json      @default("{}")
  createdAt DateTime  @default(now()) @map("created_at")

  channel Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@index([channelId, type])
  @@map("assets")
}

model Video {
  id             String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  scriptId       String      @map("script_id") @db.Uuid
  channelId      String      @map("channel_id") @db.Uuid
  status         VideoStatus @default(QUEUED)
  renderJobId    String?     @map("render_job_id")
  durationSeconds Float?     @map("duration_seconds")
  fileUrl        String?     @map("file_url")
  thumbnailUrl   String?     @map("thumbnail_url")
  renderCostUsd  Decimal?    @map("render_cost_usd") @db.Decimal(10, 6)
  renderProvider String?     @map("render_provider")
  createdAt      DateTime    @default(now()) @map("created_at")
  completedAt    DateTime?   @map("completed_at")

  script             Script              @relation(fields: [scriptId], references: [id])
  channel            Channel             @relation(fields: [channelId], references: [id])
  videoVariants      VideoVariant[]
  analyticsSnapshots AnalyticsSnapshot[]

  @@index([channelId, status])
  @@map("videos")
}

model VideoVariant {
  id           String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  videoId      String        @map("video_id") @db.Uuid
  platform     Platform
  aspectRatio  String        @map("aspect_ratio")
  duration     Float
  fileUrl      String        @map("file_url")
  thumbnailUrl String?       @map("thumbnail_url")
  title        String
  description  String
  tags         String[]      @default([])
  status       VariantStatus @default(PENDING)
  createdAt    DateTime      @default(now()) @map("created_at")

  video       Video        @relation(fields: [videoId], references: [id], onDelete: Cascade)
  publishJobs PublishJob[]

  @@index([videoId, platform])
  @@map("video_variants")
}

model PublishJob {
  id               String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  videoVariantId   String        @map("video_variant_id") @db.Uuid
  platformAccountId String       @map("platform_account_id") @db.Uuid
  scheduledAt      DateTime      @map("scheduled_at")
  publishedAt      DateTime?     @map("published_at")
  status           PublishStatus @default(PENDING)
  platformVideoId  String?       @map("platform_video_id")
  platformUrl      String?       @map("platform_url")
  attemptCount     Int           @default(0) @map("attempt_count")
  lastError        String?       @map("last_error")
  metadata         Json          @default("{}")
  createdAt        DateTime      @default(now()) @map("created_at")

  videoVariant    VideoVariant    @relation(fields: [videoVariantId], references: [id])
  platformAccount PlatformAccount @relation(fields: [platformAccountId], references: [id])

  @@index([platformAccountId, status])
  @@index([scheduledAt])
  @@map("publish_jobs")
}

// ─────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────

model AnalyticsSnapshot {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  channelId   String   @map("channel_id") @db.Uuid
  videoId     String?  @map("video_id") @db.Uuid
  platform    Platform
  views       Int      @default(0)
  likes       Int      @default(0)
  comments    Int      @default(0)
  shares      Int      @default(0)
  ctr         Float    @default(0)
  avd         Float    @default(0)
  revenueUsd  Decimal  @default(0) @map("revenue_usd") @db.Decimal(10, 4)
  capturedAt  DateTime @map("captured_at")

  channel Channel @relation(fields: [channelId], references: [id])
  video   Video?  @relation(fields: [videoId], references: [id])

  @@index([channelId, capturedAt])
  @@index([videoId, capturedAt])
  @@map("analytics_snapshots")
}

// ─────────────────────────────────────────────
// AUTOMATION
// ─────────────────────────────────────────────

model AutomationRule {
  id            String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  channelId     String      @map("channel_id") @db.Uuid
  name          String
  triggerType   TriggerType @map("trigger_type")
  triggerConfig Json        @map("trigger_config")
  actionType    ActionType  @map("action_type")
  actionConfig  Json        @map("action_config")
  enabled       Boolean     @default(true)
  lastRunAt     DateTime?   @map("last_run_at")
  nextRunAt     DateTime?   @map("next_run_at")
  runCount      Int         @default(0) @map("run_count")
  createdAt     DateTime    @default(now()) @map("created_at")

  channel      Channel      @relation(fields: [channelId], references: [id], onDelete: Cascade)
  ledgerEntries LedgerEntry[]

  @@index([channelId, enabled])
  @@map("automation_rules")
}

// ─────────────────────────────────────────────
// MONETIZATION
// ─────────────────────────────────────────────

model MonetizationLink {
  id           String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  channelId    String               @map("channel_id") @db.Uuid
  type         MonetizationLinkType
  url          String
  trackingUrl  String               @map("tracking_url")
  provider     String
  trackingParams Json               @default("{}") @map("tracking_params")
  clicks       Int                  @default(0)
  conversions  Int                  @default(0)
  revenueUsd   Decimal              @default(0) @map("revenue_usd") @db.Decimal(10, 4)
  createdAt    DateTime             @default(now()) @map("created_at")

  channel Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@map("monetization_links")
}

// ─────────────────────────────────────────────
// PROVIDERS & ROUTING
// ─────────────────────────────────────────────

model Provider {
  id            String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name          String         @unique
  type          ProviderType
  baseUrl       String         @map("base_url")
  healthStatus  ProviderHealth @default(HEALTHY) @map("health_status")
  lastCheckedAt DateTime?      @map("last_checked_at")
  apiKeyEnv     String         @map("api_key_env")
  metadata      Json           @default("{}")

  models          Model[]
  routingPolicies RoutingPolicy[]

  @@map("providers")
}

model Model {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  providerId     String   @map("provider_id") @db.Uuid
  modelId        String   @map("model_id")
  displayName    String   @map("display_name")
  taskTypes      String[] @map("task_types")
  costPer1kInput Decimal  @map("cost_per_1k_input") @db.Decimal(10, 6)
  costPer1kOutput Decimal @map("cost_per_1k_output") @db.Decimal(10, 6)
  qualityScore   Float    @map("quality_score")
  latencyMs      Int      @map("latency_ms")
  contextWindow  Int      @map("context_window")
  isActive       Boolean  @default(true) @map("is_active")
  tiersAllowed   String[] @map("tiers_allowed")

  provider Provider @relation(fields: [providerId], references: [id])

  @@unique([providerId, modelId])
  @@map("models")
}

model TierProfile {
  id         String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tierName   AiTier  @unique @map("tier_name")
  configJson Json    @map("config_json")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("tier_profiles")
}

model RoutingPolicy {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  channelId           String   @map("channel_id") @db.Uuid
  tier                AiTier
  taskType            String   @map("task_type")
  preferredProviderId String   @map("preferred_provider_id") @db.Uuid
  fallbackChain       String[] @map("fallback_chain") @db.Uuid
  createdAt           DateTime @default(now()) @map("created_at")

  channel           Channel  @relation(fields: [channelId], references: [id], onDelete: Cascade)
  preferredProvider Provider @relation(fields: [preferredProviderId], references: [id])

  @@unique([channelId, tier, taskType])
  @@map("routing_policies")
}

// ─────────────────────────────────────────────
// COST GOVERNANCE
// ─────────────────────────────────────────────

model CostLedger {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  channelId    String   @map("channel_id") @db.Uuid
  periodStart  DateTime @map("period_start") @db.Date
  periodEnd    DateTime @map("period_end") @db.Date
  budgetUsd    Decimal  @map("budget_usd") @db.Decimal(10, 4)
  spentUsd     Decimal  @default(0) @map("spent_usd") @db.Decimal(10, 4)
  entriesCount Int      @default(0) @map("entries_count")
  updatedAt    DateTime @updatedAt @map("updated_at")

  channel      Channel       @relation(fields: [channelId], references: [id])
  usageRecords UsageRecord[]

  @@unique([channelId, periodStart])
  @@map("cost_ledgers")
}

model Budget {
  id             String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  entityType     BudgetEntityType @map("entity_type")
  entityId       String           @map("entity_id")
  period         String
  amountUsd      Decimal          @map("amount_usd") @db.Decimal(10, 4)
  alertThreshold Float            @default(0.80) @map("alert_threshold")
  hardStop       Boolean          @default(true) @map("hard_stop")
  carryQueue     Boolean          @default(false) @map("carry_queue")
  createdAt      DateTime         @default(now()) @map("created_at")

  channel Channel? @relation("ChannelBudgets", fields: [entityId], references: [id], map: "budgets_channel_fk")

  @@unique([entityType, entityId, period])
  @@map("budgets")
}

model UsageRecord {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ledgerId  String   @map("ledger_id") @db.Uuid
  timestamp DateTime @default(now())
  provider  String
  model     String
  taskType  String   @map("task_type")
  tokensIn  Int?     @map("tokens_in")
  tokensOut Int?     @map("tokens_out")
  costUsd   Decimal  @map("cost_usd") @db.Decimal(10, 6)
  metadata  Json     @default("{}")

  ledger CostLedger @relation(fields: [ledgerId], references: [id])

  @@index([ledgerId, timestamp])
  @@map("usage_records")
}

// Append-only audit ledger — never mutated
model LedgerEntry {
  id               String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  timestamp        DateTime     @default(now())
  userId           String       @map("user_id") @db.Uuid
  channelId        String?      @map("channel_id") @db.Uuid
  workflowId       String?      @map("workflow_id") @db.Uuid
  runId            String?      @map("run_id") @db.Uuid
  batchId          String?      @map("batch_id") @db.Uuid
  provider         String
  model            String
  taskType         String       @map("task_type")
  tokensIn         Int?         @map("tokens_in")
  tokensOut        Int?         @map("tokens_out")
  mediaSeconds     Float?       @map("media_seconds")
  imagesGenerated  Int?         @map("images_generated")
  costUsd          Decimal      @map("cost_usd") @db.Decimal(10, 6)
  estimatedUsd     Decimal?     @map("estimated_usd") @db.Decimal(10, 6)
  tier             AiTier
  status           LedgerStatus @default(COMPLETED)
  correctionOf     String?      @map("correction_of") @db.Uuid
  metadata         Json         @default("{}")
  createdAt        DateTime     @default(now()) @map("created_at")

  channel      Channel?        @relation(fields: [channelId], references: [id])
  workflow     AutomationRule? @relation(fields: [workflowId], references: [id])
  correctedBy  LedgerEntry?    @relation("LedgerCorrections", fields: [correctionOf], references: [id])
  corrections  LedgerEntry[]   @relation("LedgerCorrections")

  @@index([channelId, timestamp])
  @@index([provider, timestamp])
  @@index([workflowId, runId])
  @@index([userId, timestamp])
  @@map("ledger_entries")
}
```
