# 07 — Core Modules

**Faceless Viral OS | Founding Blueprint**
Version: 1.0 | Status: Engineering Reference

---

## Module Overview

The platform is composed of 11 discrete modules. Each module maps to a domain service in the backend, a section of the UI, and one or more BullMQ job types. Modules communicate through the database and job queue — never through direct service-to-service calls in Phase 1.

| # | Module | Primary Job |
|---|---|---|
| 1 | Opportunity Finder | Discover winning niches and trends |
| 2 | Channel Factory | Bootstrap and configure channels |
| 3 | Competitor Intelligence | Analyze what's working for competitors |
| 4 | AI Content Studio | Ideate, script, localize content |
| 5 | Media Production Pipeline | Voice, visuals, video assembly |
| 6 | Unified Publisher | Schedule and post across platforms |
| 7 | Analytics & Feedback Engine | Ingest and surface performance data |
| 8 | Autopilot Engine | Automate workflows via rules |
| 9 | Cost & Tier Engine | Route AI tasks, govern spend |
| 10 | Monetization Engine | Track revenue and affiliate performance |
| 11 | SaaS Workspace Layer | Multi-tenant isolation (Phase 2 only) |

---

## Module 1: Opportunity Finder

### Purpose
Discovers profitable niches and real-time content opportunities using AI-powered market research, search trend analysis, and platform data signals. The operator uses this to identify where to build channels and what topics to target.

### Inputs / Outputs

| Type | Detail |
|---|---|
| **Input** | Seed keywords, target languages, platform filters, competition tolerance (low/med/high) |
| **Output** | Ranked niche list with opportunity scores, trend reports, keyword clusters, recommended pillar topics |

### Key Components
- **Trend Fetcher** — polls Google Trends API, YouTube trending, TikTok Creative Center, RapidAPI social search
- **Niche Scorer** — AI-powered scoring across: search volume, competition density, monetization potential, content velocity
- **Keyword Clusterer** — groups related queries into content pillars using embedding similarity (pgvector in Phase 2, heuristic grouping in Phase 1)
- **Opportunity Report Generator** — produces structured markdown report summarizing findings

### Data Read / Written

| Table | Operation |
|---|---|
| `niches` | Write: niche records with score, keywords, status |
| `trend_snapshots` | Write: point-in-time trend data |
| `opportunity_reports` | Write: full report blobs |
| `channels` | Read: existing channel niches to avoid duplication |

### External Integrations
- Google Trends (via SerpAPI or unofficial API)
- YouTube Data API v3 (trending, search)
- TikTok Creative Center (trending sounds, hashtags)
- RapidAPI: social-searcher, keyword-tool

### Phase 1 vs Phase 2

| Feature | Phase 1 | Phase 2 |
|---|---|---|
| Niche discovery | Manual seed + AI scoring | Fully automated scheduled scans |
| Trend monitoring | On-demand runs | Continuous monitoring with alerts |
| Keyword clustering | Rule-based grouping | Embedding-based semantic clustering |
| Report format | Markdown blob | Interactive dashboard with charts |

---

## Module 2: Channel Factory

### Purpose
Manages the full lifecycle of a faceless channel from initial strategy through configuration. A "channel" is a distinct content operation (niche + platform + persona) with its own identity, content pillars, and publishing cadence.

### Inputs / Outputs

| Type | Detail |
|---|---|
| **Input** | Niche selection, target platform, language, content style preferences |
| **Output** | Channel record with strategy doc, content pillars, brand identity, platform connection |

### Key Components
- **Channel Strategy Generator** — AI produces a channel brief: name ideas, persona, tone, 5 content pillars, hook formulas, CTA patterns
- **Brand Kit Generator** — produces channel name, logo prompt, color palette, watermark
- **Platform Connector** — OAuth handshake with YouTube/TikTok/Instagram, stores credentials encrypted
- **Publishing Cadence Scheduler** — recommended posting frequency based on niche velocity
- **Channel Dashboard** — KPI summary, next scheduled content, recent performance

### Data Read / Written

| Table | Operation |
|---|---|
| `channels` | Write/Read: all channel config |
| `channel_strategies` | Write: AI-generated strategy docs |
| `platform_credentials` | Write: encrypted OAuth tokens |
| `content_pillars` | Write: pillar definitions per channel |
| `publishing_schedules` | Write: cadence config |

### External Integrations
- YouTube OAuth 2.0 (channel management scope)
- TikTok OAuth (content publishing scope)
- Instagram Graph API (business account connection)
- Cloudflare R2 (brand asset storage)

### Phase 1 vs Phase 2

| Feature | Phase 1 | Phase 2 |
|---|---|---|
| Channel limit | Unlimited (operator tool) | Quota-gated by plan |
| Brand kit | Logo prompt only | Full AI logo generation |
| Platform connections | Manual OAuth flow | Guided wizard with validation |
| Multi-language channels | Manual language config | Auto-localization channel cloning |

---

## Module 3: Competitor Intelligence

### Purpose
Analyzes competitor channels to extract winning formats, hook patterns, title structures, posting cadences, and audience engagement signals. Turns competitive data into actionable content templates.

### Inputs / Outputs

| Type | Detail |
|---|---|
| **Input** | Competitor channel URLs or handles, target platform, analysis depth (quick/deep) |
| **Output** | Competitor profile, top content breakdown, extracted hook/title formulas, format templates |

### Key Components
- **Channel Scraper** — fetches public metadata for competitor videos (title, views, likes, duration, tags, post date)
- **Format Extractor** — AI analyzes top 20 videos to extract: hook type, structure pattern (problem/agitate/solve, listicle, story), CTA style
- **Title Analyzer** — clusters title patterns, identifies power words, optimal length, bracket/number usage
- **Trend Velocity Detector** — identifies which content types are accelerating vs declining for this channel
- **Template Generator** — produces reusable content templates based on extracted patterns

### Data Read / Written

| Table | Operation |
|---|---|
| `competitors` | Write/Read: competitor channel records |
| `competitor_videos` | Write: video metadata snapshots |
| `content_templates` | Write: extracted format templates |
| `competitor_analyses` | Write: AI analysis reports |

### External Integrations
- YouTube Data API v3 (channel stats, video list, video details)
- TikTok Research API (limited public data)
- SerpAPI (Google SERP for video rankings)

### Phase 1 vs Phase 2

| Feature | Phase 1 | Phase 2 |
|---|---|---|
| Competitor tracking | On-demand snapshots | Scheduled monitoring |
| Video analysis | Top 20 per run | Continuous library analysis |
| Cross-channel comparison | Manual | Side-by-side dashboard |
| Template export | Manual | One-click "use this template" |

---

## Module 4: AI Content Studio

### Purpose
The primary content creation workspace. Takes an idea (or generates one) and produces a complete content package: script, hooks, titles, descriptions, tags, and translated variants. Integrates directly with the tier system for AI model selection.

### Inputs / Outputs

| Type | Detail |
|---|---|
| **Input** | Channel context, content pillar, optional seed idea, target platform, language, content format, tier |
| **Output** | Idea record, full script, title variants, description, tags, thumbnail concept, translated versions |

### Key Components
- **Idea Generator** — produces 10 ideas based on pillar + trend data, scored by estimated virality
- **Script Writer** — generates full video script with: hook, intro, body sections, CTA, outro; format-aware (long vs short)
- **Title/Hook Factory** — generates 5 title variants and 3 hook variants per idea
- **Description Builder** — SEO-optimized description with timestamp markers
- **Tag Generator** — keyword-enriched tag sets per platform
- **Localization Engine** — translates script and metadata to target languages, preserving tone and cultural context
- **Script Editor** — in-browser rich text editor for human review and edits before production

### Data Read / Written

| Table | Operation |
|---|---|
| `content_ideas` | Write/Read |
| `scripts` | Write/Read |
| `script_versions` | Write: version history |
| `content_metadata` | Write: titles, descriptions, tags |
| `translations` | Write: per-language variants |
| `content_templates` | Read: competitor-derived templates |

### External Integrations
- OpenAI / Anthropic / Groq / Gemini (via Model Routing Engine)
- DeepL API (translation, Phase 2 supplemental)

### Phase 1 vs Phase 2

| Feature | Phase 1 | Phase 2 |
|---|---|---|
| Idea generation | On-demand | Bulk batch (50+ at once) |
| Script formats | YouTube long + TikTok short | All formats including podcast, newsletter |
| Localization | EN→ES, EN→PT | 25+ languages |
| Script editor | Basic markdown editor | Full collaborative rich text editor |
| Version history | Last 5 versions | Full history with diff view |

---

## Module 5: Media Production Pipeline

### Purpose
Converts a completed script into a production-ready video. Orchestrates TTS voice generation, AI image creation, video assembly, captioning, and final transcoding. Entirely automated; no manual video editing required.

### Inputs / Outputs

| Type | Detail |
|---|---|
| **Input** | Script, channel brand config, voice selection, visual style, target platform(s), tier |
| **Output** | Final video files per platform, thumbnail, captions file (SRT) |

### Key Components
- **TTS Engine** — generates voiceover audio from script using selected voice and provider
- **Audio Normalizer** — normalizes loudness to -14 LUFS (YouTube/Spotify standard) via ffmpeg
- **Image Prompt Generator** — converts script sections into image prompts
- **Image Generator** — creates visual frames from prompts
- **Background Music Mixer** — overlays royalty-free music at configurable volume
- **Video Assembler** — combines audio + images into timed video (Remotion or ffmpeg)
- **Caption Generator** — produces SRT captions via Whisper transcription of audio
- **Caption Burner** — optionally burns captions into video (TikTok/Reels optimized)
- **Transcoder** — outputs platform-specific formats (1080p60 YouTube, 9:16 TikTok, 1:1 Instagram)
- **Thumbnail Generator** — creates thumbnail from key frame + text overlay

### Data Read / Written

| Table | Operation |
|---|---|
| `media_jobs` | Write: job records, status |
| `media_assets` | Write: file references (R2 keys) |
| `content_ideas` | Read: script, metadata |
| `channels` | Read: brand config, voice settings |

### External Integrations
- ElevenLabs / OpenAI TTS / Coqui (TTS)
- DALL-E / Stability AI / Flux (image generation)
- Runway / Kling (video generation, ULTRA tier)
- Cloudflare R2 (asset storage)
- ffmpeg (transcoding, normalization)
- Remotion (programmatic video)
- OpenAI Whisper (captioning)

### Phase 1 vs Phase 2

| Feature | Phase 1 | Phase 2 |
|---|---|---|
| Voice cloning | ElevenLabs cloned voices | Custom voice training pipeline |
| Video style | Static image slideshow | AI animated video (Runway) |
| Batch production | One video at a time | Parallel batch (10+ simultaneous) |
| Custom intros/outros | Manual upload | Template library |

---

## Module 6: Unified Publisher

### Purpose
Schedules and executes content publishing across YouTube, TikTok, and Instagram. Manages platform-specific metadata, upload mechanics, scheduling queues, and post-publish status tracking.

### Inputs / Outputs

| Type | Detail |
|---|---|
| **Input** | Content record (with media assets), platform targets, publish time, metadata per platform |
| **Output** | Published post records with platform post IDs, publish status, URLs |

### Key Components
- **Publishing Calendar** — visual calendar view of scheduled posts per channel/platform
- **Platform Adapter** — per-platform upload implementations (YouTube resumable upload, TikTok direct post, Instagram two-phase container)
- **Metadata Manager** — platform-specific metadata validation (title length, tag count, category codes)
- **Quota Manager** — tracks YouTube API unit consumption, prevents quota exhaustion
- **Retry Manager** — handles partial failures, resumes interrupted uploads
- **Post Monitor** — polls for post-publish status (processing → live → indexed)
- **Scheduling Optimizer** — suggests optimal publish times based on audience analytics

### Data Read / Written

| Table | Operation |
|---|---|
| `scheduled_posts` | Write/Read |
| `published_posts` | Write: post records with platform IDs |
| `platform_credentials` | Read: OAuth tokens |
| `media_assets` | Read: final video files |
| `platform_quota_usage` | Write: API unit tracking |

### External Integrations
- YouTube Data API v3 (videos.insert, videos.update)
- TikTok Content Posting API
- Instagram Graph API (media, media_publish)
- Cloudflare R2 (read final media)

### Phase 1 vs Phase 2

| Feature | Phase 1 | Phase 2 |
|---|---|---|
| Platforms | YouTube, TikTok, Instagram | + Pinterest, X, LinkedIn |
| Scheduling | Manual time selection | AI-optimized scheduling |
| Bulk scheduling | One post at a time | Bulk queue (week at a time) |
| Failure alerts | Email notification | Slack + PagerDuty |

---

## Module 7: Analytics & Feedback Engine

### Purpose
Ingests performance metrics from all platforms, aggregates them into unified KPIs, and surfaces actionable insights. Feeds back into content decisions to continuously improve output quality and channel growth.

### Inputs / Outputs

| Type | Detail |
|---|---|
| **Input** | Platform API metrics (views, CTR, watch time, revenue), published post records |
| **Output** | Unified dashboard KPIs, per-video performance reports, channel trend analysis, AI-generated insights |

### Key Components
- **Metrics Fetcher** — scheduled pull from YouTube Analytics API, TikTok API, Instagram Insights
- **Event Normalizer** — maps platform-native metric names to unified schema
- **Time-Series Store** — analytics_events table with efficient range queries
- **Aggregation Engine** — rolls up raw events into daily/weekly/monthly summaries
- **Insight Generator** — weekly AI-powered summary: what's working, what to do more of, what to drop
- **A/B Tracker** — tracks title variants and thumbnail variants against performance
- **Alert Engine** — notifies when a video is breaking out (views spike) or underperforming

### Data Read / Written

| Table | Operation |
|---|---|
| `analytics_events` | Write: raw metrics |
| `analytics_daily_roll` | Write: aggregated daily |
| `analytics_channel_stats` | Write: channel-level KPIs |
| `performance_insights` | Write: AI-generated text insights |
| `published_posts` | Read: post IDs to fetch metrics for |

### External Integrations
- YouTube Analytics API
- TikTok Analytics API
- Instagram Graph API (media insights)

### Phase 1 vs Phase 2

| Feature | Phase 1 | Phase 2 |
|---|---|---|
| Metric refresh | Every 6 hours | Real-time (webhook) |
| AI insights | Weekly batch | On-demand with GPT-4o |
| Revenue tracking | YouTube AdSense only | All monetization sources |
| Comparative analysis | Single channel | Cross-channel benchmarking |

---

## Module 8: Autopilot Engine

### Purpose
Enables fully automated content operations through a rule-based workflow engine. Operators define triggers and actions; the engine executes them without human intervention. The backbone of the "set and forget" value proposition.

### Inputs / Outputs

| Type | Detail |
|---|---|
| **Input** | Workflow definitions (trigger + conditions + actions), channel state, analytics events |
| **Output** | Automatically created content, scheduled posts, alerts, tier adjustments |

### Key Components
- **Workflow Builder UI** — visual rule builder: "When [trigger] AND [condition] THEN [action]"
- **Trigger Registry** — registered triggers: schedule (cron), analytics threshold, external webhook, manual
- **Condition Evaluator** — evaluates conditions against current state (e.g., `channel.viewsThisWeek > 10000`)
- **Action Executor** — dispatches actions: create content job, publish post, send alert, change tier
- **Run History** — full audit log of every autopilot execution
- **Conflict Detector** — prevents overlapping workflows from creating duplicate content

### Trigger Examples

| Trigger | Example |
|---|---|
| Cron schedule | "Every Monday at 9am, generate 3 video ideas" |
| Analytics threshold | "When video views > 50k in 48h, create follow-up video" |
| Trend spike | "When niche trend score > 80, create trending content" |
| Publish complete | "When video published, schedule analytics check in 48h" |

### Data Read / Written

| Table | Operation |
|---|---|
| `autopilot_workflows` | Write/Read: workflow definitions |
| `autopilot_runs` | Write: execution history |
| `content_jobs` | Write: triggers content creation jobs |
| `scheduled_posts` | Write: triggers publishing jobs |

### Phase 1 vs Phase 2

| Feature | Phase 1 | Phase 2 |
|---|---|---|
| Workflow builder | JSON config file | Visual drag-and-drop builder |
| Trigger types | Schedule + analytics | All triggers including webhooks |
| Parallel workflows | 3 simultaneous | Unlimited |
| Workflow templates | None | Library of pre-built workflows |

---

## Module 9: Cost & Tier Engine

### Purpose
The financial governor of the platform. Routes all AI tasks to appropriate providers based on active tier, tracks spend in real time, enforces budget limits, and manages tier escalation/downgrade logic. Every AI call passes through this module.

### Inputs / Outputs

| Type | Detail |
|---|---|
| **Input** | Task request (type + context + tier), current budget state |
| **Output** | Provider selection, cost estimate, approval/denial decision, updated spend records |

### Key Components
- **Tier Config Store** — static tier definitions loaded at startup, overridable per channel
- **Budget Tracker** — real-time spend tracking in Redis (low-latency reads), reconciled to DB hourly
- **Model Router** — selects provider/model for task based on tier policy (see `09-model-routing-engine.md`)
- **Cost Calculator** — post-call cost attribution using actual token counts and provider pricing
- **Quota Enforcer** — blocks requests when budget exhausted; returns 402 with remaining budget
- **Escalation Logic** — auto-upgrades tier when quality requirements cannot be met at current tier
- **Downgrade Logic** — auto-downgrades when budget is at risk or quality requirements are relaxed

### Data Read / Written

| Table | Operation |
|---|---|
| `tier_configs` | Read |
| `spend_records` | Write: per-call cost records |
| `budget_limits` | Read: per-user, per-channel limits |
| `tier_overrides` | Read/Write: channel-specific tier overrides |

### Phase 1 vs Phase 2

| Feature | Phase 1 | Phase 2 |
|---|---|---|
| Budget granularity | Total daily budget | Per-channel, per-task-type budgets |
| Tier management | Single global tier | Per-workspace tier with plan enforcement |
| Spend reporting | Daily total | Real-time spend dashboard |
| Auto-escalation | Operator-defined rules | AI-managed dynamic routing |

---

## Module 10: Monetization Engine

### Purpose
Tracks all revenue streams generated by channels: YouTube AdSense, affiliate commissions, digital product sales, brand deals, and sponsorships. Correlates revenue with content performance to identify highest-value content types.

### Inputs / Outputs

| Type | Detail |
|---|---|
| **Input** | Revenue events from platforms, affiliate link click/conversion data, manual revenue entries |
| **Output** | Revenue dashboard, ROI per video, affiliate performance report, top revenue content |

### Key Components
- **Revenue Ingester** — pulls YouTube monetization data from YouTube Analytics API, affiliate platform APIs
- **Affiliate Link Manager** — stores, tracks, and rotates affiliate links; generates short links for video descriptions
- **ROI Calculator** — net revenue per video = platform revenue + affiliate revenue − production cost (AI spend)
- **Attribution Engine** — links revenue back to specific videos and content types
- **Revenue Dashboard** — total revenue, revenue by channel, revenue by content type, projected monthly

### Supported Revenue Streams

| Stream | Integration |
|---|---|
| YouTube AdSense | YouTube Analytics API (revenue metrics) |
| Affiliate (Amazon) | Amazon Affiliate API |
| Affiliate (ClickBank) | ClickBank API |
| Affiliate (Impact) | Impact Radius API |
| Digital products | Manual entry (Phase 1), Gumroad API (Phase 2) |
| Sponsorships | Manual entry |

### Data Read / Written

| Table | Operation |
|---|---|
| `revenue_events` | Write: raw revenue data |
| `affiliate_links` | Write/Read |
| `revenue_summaries` | Write: aggregated totals |
| `content_roi` | Write: per-video ROI records |

### Phase 1 vs Phase 2

| Feature | Phase 1 | Phase 2 |
|---|---|---|
| Revenue sources | YouTube + manual | All integrations |
| Affiliate tracking | Static links | Dynamic link rotation |
| ROI per video | Manual cost input | Automatic from spend records |
| Revenue forecasting | None | AI-powered monthly forecast |

---

## Module 11: SaaS Workspace Layer (Phase 2 Only)

### Purpose
Enables multi-tenant operation of the platform as a public SaaS product. Provides workspace isolation, subscription management, user roles, and usage-based billing. All existing modules remain unchanged; this layer adds the tenant context.

### Inputs / Outputs

| Type | Detail |
|---|---|
| **Input** | Tenant registration, subscription plan, user invitations, role assignments |
| **Output** | Isolated workspace, onboarding flow, billing events, usage reports |

### Key Components
- **Workspace Service** — creates tenant records, provisions isolated DB namespace (RLS), creates R2 prefix
- **Billing Service** — Stripe integration: subscription creation, usage metering, invoice generation, webhook handling
- **Quota Service** — enforces per-plan limits (channels, videos/mo, AI credits, seats)
- **Role Service** — RBAC within workspace: Owner, Admin, Editor, Viewer
- **Onboarding Flow** — guided setup wizard (Auth0 → create workspace → connect channel → first content)
- **Audit Log** — immutable append-only log of all actions within workspace
- **Admin Panel** — internal operator view: all tenants, revenue, usage, support tools

### Data Read / Written (new tables)

| Table | Operation |
|---|---|
| `workspaces` | Write/Read |
| `workspace_members` | Write/Read |
| `subscription_plans` | Read |
| `subscriptions` | Write/Read |
| `usage_events` | Write: metered usage |
| `audit_logs` | Write |
| `quota_configs` | Read |

### External Integrations
- Stripe (billing, subscriptions, metering)
- Auth0 Organizations (tenant auth)
- PostHog (product analytics, phase 2)
- Intercom (in-app support)

### Phase 2 Scope

This module is entirely Phase 2. In Phase 1, a single implicit "workspace" is assumed for the operator. The DB schema includes `workspace_id` columns on all tables (nullable in Phase 1) so the migration is additive, not destructive.

---

*This document is part of the Faceless Viral OS founding blueprint series. Cross-reference: `06-system-architecture.md`, `08-tier-system.md`, `09-model-routing-engine.md`.*
