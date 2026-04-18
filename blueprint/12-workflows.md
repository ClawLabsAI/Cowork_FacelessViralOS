# 12 — End-to-End Workflows

**Faceless Viral OS | Blueprint Series**
Version: 1.0 | Status: Engineering-Ready | Phase: 1 + 2

---

## Table of Contents

1. [Profitable Niche Discovery](#workflow-1-profitable-niche-discovery)
2. [Channel Creation](#workflow-2-channel-creation)
3. [Competitor Analysis](#workflow-3-competitor-analysis)
4. [Strategy Brief Generation](#workflow-4-strategy-brief-generation)
5. [Idea Batch Generation](#workflow-5-idea-batch-generation)
6. [ROI-Aware Idea Selection](#workflow-6-roi-aware-idea-selection)
7. [Script Generation](#workflow-7-script-generation)
8. [Voice + Scenes + Video Assembly](#workflow-8-voice--scenes--video-assembly)
9. [Per-Platform Adaptation](#workflow-9-per-platform-adaptation)
10. [Publishing](#workflow-10-publishing)
11. [Analytics Ingestion](#workflow-11-analytics-ingestion)
12. [Winner Iteration Loop](#workflow-12-winner-iteration-loop)
13. [EN/ES Localization](#workflow-13-enes-localization)
14. [Scaling Winners](#workflow-14-scaling-winners)
15. [Cost Reduction on Low-Performers](#workflow-15-cost-reduction-on-low-performers)

---

## Workflow 1: Profitable Niche Discovery

**Trigger:** Operator opens Niche Radar and clicks "Discover Niches" OR scheduled weekly discovery job fires.

**Actors:** Operator, Trend Agent, Niche Agent, External APIs (YouTube Data, Google Trends, TikTok Research)

**Goal:** Produce a ranked list of niches with viability scores so the operator can confidently choose where to build.

---

### Step-by-Step Flow

```
1. INPUT COLLECTION
   └── Operator provides (optional):
       - Seed keywords (e.g., "AI tools", "personal finance")
       - Language filter (EN, ES, or both)
       - Platform target (YouTube / TikTok / Instagram)
       - Revenue potential floor (e.g., "HIGH or better")

2. TREND AGENT: KEYWORD EXPANSION
   └── Takes seed keywords → calls Google Trends API + YouTube Data API
   └── Expands each seed into 20–50 related keyword variants
   └── Filters: min 10k monthly searches, growth_rate > 0%
   └── Stores raw results in trends table

3. NICHE AGENT: CLUSTER & SCORE
   └── Clusters expanded keywords into niche buckets
   └── For each niche bucket:
       a. Fetches top 10 YouTube/TikTok channels in that space
       b. Estimates competition score = f(channel sizes, upload frequency, view velocity)
       c. Estimates revenue potential from:
          - CPC data (Google Keyword Planner)
          - Affiliate program availability (Amazon, ClickBank, Digistore24)
          - Sponsor interest signals (Grin, Creator.co queries)
       d. Computes trend_score from 90-day momentum

4. SCORING ENGINE
   └── For each niche:
       opportunity_score = (revenue_potential * 0.35)
                         + (1 - competition_score) * 0.30
                         + trend_score * 0.25
                         + affiliate_availability * 0.10
   └── Ranks niches descending by opportunity_score
   └── Flags "Red Ocean" (competition_score > 0.85)
   └── Flags "Trending Now" (trend_score > 0.80 AND growth_rate > 50%)

5. OPERATOR REVIEW
   └── Ranked list displayed in Niche Radar UI
   └── Operator can:
       - Click into niche → see full detail panel
       - Filter by revenue potential, platform, language
       - Mark niche as "Watching", "Selected", or "Dismissed"

6. SELECTION
   └── Operator selects niche → triggers Workflow 2 (Channel Creation)
   └── Niche record written to DB with selected_at timestamp
```

### Decision Branches

| Condition | Branch |
|-----------|--------|
| No seed keywords provided | Agent uses top-trending niches from last 7 days as seeds |
| All candidates are Red Ocean | Alert operator; show "emerging niches" sub-tier |
| No affiliate programs found | Mark revenue_potential as LOW; still list for ad-revenue play |
| Trend data API rate-limited | Use cached data from prior 48h run; flag as "stale" |

### Outputs

- `niches` records with scores and metadata
- `trends` records for each keyword cluster
- Ranked niche list rendered in UI

### Error Handling

- YouTube Data API quota exceeded → fall back to scrape-based estimation (Bright Data proxy)
- Google Trends timeout → mark trend_score as null; proceed with available data
- Niche Agent LLM timeout → retry with exponential backoff (3 attempts, then fail gracefully)

---

## Workflow 2: Channel Creation

**Trigger:** Operator selects a niche and clicks "Create Channel" in Niche Radar.

**Actors:** Operator, Strategy Agent, System (DB writes, OAuth)

**Goal:** Produce a fully configured channel with brand identity, content strategy, voice profile, and budget settings.

---

### Step-by-Step Flow

```
1. NICHE HANDOFF
   └── Selected niche_id passed to Channel Creation wizard
   └── Operator provides:
       - Platform (YouTube / TikTok / Instagram)
       - Primary language (EN / ES / both)
       - Monthly budget ($USD)
       - AI tier selection (or "Auto")
       - Brand name (or "Generate for me")

2. BRAND IDENTITY GENERATION (if requested)
   └── Strategy Agent generates:
       - 5 candidate brand names
       - Channel description (1 paragraph)
       - Content tone (e.g., "Professional but approachable, uses analogies")
       - Primary content pillar suggestions (3–5 pillars)
   └── Operator selects or edits

3. CHANNEL RECORD CREATION
   └── Writes: brands record (niche, tone, language_primary)
   └── Writes: channels record (platform, handle, status=ACTIVE, tier, monthly_budget)
   └── Writes: content_pillars records (3–5 pillars)
   └── Writes: budgets record for channel

4. PLATFORM OAUTH CONNECTION
   └── Operator clicks "Connect [Platform] Account"
   └── System redirects to platform OAuth flow
   └── On callback: stores oauth_access_token + refresh_token (encrypted)
   └── Writes: platform_accounts record

5. VOICE PROFILE SETUP
   └── Strategy Agent recommends voice style based on niche + tone
   └── System fetches available voices from ElevenLabs API
   └── Operator previews and selects voice
   └── Writes: voice_profiles record (is_default = true)

6. ROUTING POLICY INITIALIZATION
   └── Based on selected tier, system writes default routing_policies:
       - script_gen → tier-appropriate LLM
       - tts → tier-appropriate TTS provider
       - image_gen → tier-appropriate image provider
       - video_render → tier-appropriate video tool

7. AUTOMATION RULE STUBS (optional)
   └── Operator enables "Autopilot" toggle
   └── System writes default automation_rules:
       - SCHEDULE trigger: "Generate 5 ideas every Monday"
       - THRESHOLD trigger: "Create script when idea is approved"
       - SCHEDULE trigger: "Publish daily at 09:00 local"

8. CONFIRMATION
   └── Channel dashboard is shown
   └── System sends notification: "Channel [handle] is ready"
```

### Decision Branches

| Condition | Branch |
|-----------|--------|
| Brand name manually provided | Skip name generation step |
| OAuth connection fails | Operator can skip; platform_account created later |
| Tier = AUTO | System assigns ECONOMICAL by default; CGE adjusts over time |
| Autopilot disabled | Automation rules are created but enabled = false |

### Outputs

- `brands` record
- `channels` record
- `content_pillars` records (3–5)
- `platform_accounts` record (if OAuth completed)
- `voice_profiles` record
- `routing_policies` records
- `automation_rules` records (if autopilot enabled)
- `budgets` record

### Error Handling

- OAuth callback missing → session stored, operator can reconnect later from Settings
- ElevenLabs API down → voice profile deferred; default OpenAI TTS used temporarily

---

## Workflow 3: Competitor Analysis

**Trigger:** Operator enters a competitor URL in Competitor View, or Niche Discovery auto-queues top competitors.

**Actors:** Competitor Intelligence Agent, Scraping Layer (Bright Data / Apify), Operator

**Goal:** Extract structured intelligence from a competitor channel to inform content strategy.

---

### Step-by-Step Flow

```
1. INPUT
   └── Competitor channel URL (YouTube, TikTok, or Instagram)
   └── Optional: depth level (SURFACE = top 10 videos / DEEP = top 50 + transcript analysis)

2. CHANNEL METADATA FETCH
   └── YouTube Data API v3: GET channel info + statistics
   └── OR TikTok/Instagram: scraping via Bright Data (platform API unavailable)
   └── Extracts: subscriber count, total views, upload frequency, avg video length

3. VIDEO CATALOG PULL
   └── Fetch top N videos (sorted by views):
       - Title, description, tags, view count, likes, comments, publish date
       - Thumbnail URL (for visual analysis)

4. TRANSCRIPT EXTRACTION (DEEP mode)
   └── For each video: fetch YouTube auto-captions OR use Whisper transcription
   └── Extracts first 60 seconds of transcript (hook analysis)

5. COMPETITOR INTELLIGENCE AGENT: ANALYSIS
   └── Processes video catalog + transcripts
   └── Outputs structured ChannelInsight:
       a. hook_patterns: ["Did you know [SHOCKING STAT]?", "Most people get X wrong..."]
       b. pacing: "fast-cut with text overlays every 3-5 seconds"
       c. format: "listicle (Top 7 / Top 10)"
       d. avg_duration: 480 seconds
       e. thumbnail_style: "red text on dark background, shocked face graphic"
       f. cta_patterns: ["Comment below if you agree", "Link in bio for free guide"]
       g. top_performing_topics: ["AI automation", "Make money online", "Passive income"]

6. STORAGE
   └── Writes: competitor_channels record (updated with latest stats)
   └── Writes: channel_insights record

7. DISPLAY
   └── Competitor View updated with structured insight cards
   └── "Copy hook pattern" one-click action for each pattern
   └── "Generate idea from this format" action button
```

### Decision Branches

| Condition | Branch |
|-----------|--------|
| YouTube API quota exhausted | Use Apify YouTube scraper as fallback |
| Channel is private / unavailable | Log error; mark competitor_channel.status = UNAVAILABLE |
| DEEP mode requested | Queue transcript extraction as separate BullMQ job (async) |
| Transcript language not EN/ES | Flag; offer translation before hook analysis |

### Outputs

- `competitor_channels` record (upserted)
- `channel_insights` record
- UI: structured insight panel with hook patterns and format breakdown

### Error Handling

- Scraping blocked (Cloudflare) → rotate proxy; wait 60s; retry 3x; then alert operator
- Whisper transcription fails → skip transcript; complete analysis with title/description only
- Intelligence Agent returns malformed JSON → validate schema; retry with stricter prompt

---

## Workflow 4: Strategy Brief Generation

**Trigger:** Operator clicks "Generate Strategy Brief" from Competitor View or Channel Settings.

**Actors:** Strategy Agent, Operator

**Goal:** Produce a publishable, actionable strategy brief that defines what the channel will create, why, and how.

---

### Step-by-Step Flow

```
1. CONTEXT ASSEMBLY
   └── System compiles brief package:
       - Niche data (competition_score, trend_score, revenue_potential)
       - Top 3–5 competitor channel_insights records
       - Channel config (platform, language, tier, pillar names)
       - Any existing performance data (if channel has prior videos)

2. STRATEGY AGENT: BRIEF GENERATION
   └── Generates structured brief (Markdown):
       a. Executive Summary (2–3 sentences)
       b. Audience Persona (age range, pain points, aspirations)
       c. Unique Positioning (differentiation from top 3 competitors)
       d. Content Pillars (3–5, with rationale)
       e. Hook Formulas (5–10 tested patterns from competitor analysis)
       f. Format Strategy (primary: listicle; secondary: tutorial)
       g. Posting Schedule recommendation
       h. Monetization Strategy (primary: AdSense; secondary: affiliate)
       i. 90-Day Milestone Targets (views, subscribers, revenue)

3. OPERATOR REVIEW
   └── Brief displayed in editor panel
   └── Operator can edit any section inline
   └── "Regenerate Section" per-section action available

4. APPROVAL + STORAGE
   └── Operator clicks "Approve Brief"
   └── Brief stored as JSON in channel metadata
   └── Content pillars updated if changed
   └── Triggers availability of Workflow 5 (Idea Batch Generation)
```

### Outputs

- Strategy brief JSON stored in channel.metadata
- Updated content_pillars records
- Brief PDF export available (Phase 2)

### Error Handling

- Strategy Agent hallucination detected (brief contains competitor handles as our own) → validation layer strips competitor references; flag for operator review
- Brief generation times out → partial brief saved as draft; retry remaining sections

---

## Workflow 5: Idea Batch Generation

**Trigger:** Autopilot schedule (e.g., every Monday) OR manual "Generate Ideas" button.

**Actors:** Idea Agent, Trend Agent (for freshness check), Operator

**Goal:** Produce a batch of 20 ranked content ideas, each with hook, format, and estimated ROI.

---

### Step-by-Step Flow

```
1. PRE-RUN BUDGET CHECK
   └── Batch Estimator calculates cost for 20 idea + ROI scoring calls
   └── Budget gate: if channel remaining budget < estimate → reduce batch to 10 → 5 → reject

2. CONTEXT PACKAGE ASSEMBLY
   └── Strategy brief (current approved version)
   └── Recent trends data (last 7 days from trends table)
   └── Existing idea titles (to avoid duplicates)
   └── Top 5 performing existing videos (from analytics_snapshots)
   └── Competitor hook_patterns (from channel_insights)

3. IDEA AGENT: GENERATION
   └── Generates 20 raw ideas in structured JSON:
       {
         title: string,
         hook: string,
         format: ContentFormat,
         pillar: string,
         why_it_will_perform: string,
         trend_keyword: string
       }

4. ROI SCORING
   └── For each idea:
       a. trend_alignment = keyword_match_score(idea.trend_keyword, recent_trends)
       b. competition_gap = 1 - how_many_competitors_covered_this(idea.title)
       c. format_performance = historical_avg_views[idea.format] / channel_avg_views
       d. estimated_roi = weighted_score(trend_alignment, competition_gap, format_performance)
   └── Ideas sorted by estimated_roi DESC

5. DEDUPLICATION
   └── Semantic similarity check against existing content_ideas
   └── Ideas with cosine_similarity > 0.85 to existing titles are filtered out or merged

6. STORAGE
   └── Writes 20 content_ideas records (status = IDEA)
   └── Emits batch_complete event → triggers UI notification

7. OPERATOR REVIEW (if autopilot not fully enabled)
   └── Ideas appear in Kanban board, IDEA column
   └── Operator can approve, reject, or edit each idea
```

### Decision Branches

| Condition | Branch |
|-----------|--------|
| Budget insufficient for 20 | Reduce to 10, then 5, then reject with alert |
| Trend data is stale (>48h) | Refresh trends before generation; delay batch by up to 5 min |
| All generated ideas duplicates | Widen prompt context; try different format angles |
| Autopilot enabled | Skip operator review → auto-approve top 5 by ROI score |

### Outputs

- 20 `content_ideas` records
- BullMQ notification event to frontend

### Error Handling

- Idea Agent returns < 20 ideas → log warning; proceed with what was returned
- JSON parse failure → retry with structured output enforcement; max 3 retries

---

## Workflow 6: ROI-Aware Idea Selection

**Trigger:** Ideas available in Kanban board (post Workflow 5) OR manual operator review session.

**Actors:** Operator, Optimization Agent (provides scoring context), Budget Gate

**Goal:** Select ideas that maximize ROI given the current budget, tier, and channel strategy.

---

### Step-by-Step Flow

```
1. RANKING DISPLAY
   └── Ideas sorted by estimated_roi in Kanban IDEA column
   └── Each card shows: title, hook, format, estimated_roi, trend_alignment, competition_gap
   └── Color coding: green (ROI > 0.7), yellow (0.4–0.7), red (< 0.4)

2. BUDGET CONTEXT
   └── Budget gauge shown: "You can afford X videos this month at current tier"
   └── Estimated cost per video displayed on hover (from Pre-run Estimator)

3. OPERATOR SELECTION
   └── Operator drags ideas from IDEA → APPROVED column
   └── OR uses "Auto-select top N by ROI" button
   └── OR uses filter: "Show only format=LISTICLE" then bulk approve

4. APPROVAL GATE
   └── On approve:
       a. Re-run ROI estimate with current market data (trends freshness check)
       b. Check: estimated_roi dropped > 30% since generation? → warn operator
       c. Check: budget headroom ≥ estimated_cost? → allow; else warn

5. STATUS UPDATE
   └── content_ideas.status → APPROVED
   └── content_ideas.approved_by = operator user_id
   └── content_ideas.approved_at = now()
   └── If autopilot: triggers Workflow 7 (Script Generation) automatically

6. REJECTION HANDLING
   └── Rejected ideas: status → REJECTED; reason stored in metadata
   └── Rejection reasons feed back into Idea Agent context for next batch
```

### Outputs

- Updated `content_ideas` records (status = APPROVED)
- Trigger events for script generation queue

---

## Workflow 7: Script Generation

**Trigger:** Idea status changes to APPROVED (event-driven) OR manual "Generate Script" action.

**Actors:** Script Agent, Localization Agent (for ES version), Budget Gate

**Goal:** Produce approved scripts in EN (and optionally ES) ready for TTS and visual production.

---

### Step-by-Step Flow

```
1. PRE-RUN ESTIMATE
   └── Token estimator: estimate script generation cost
   └── Budget gate check: channel + workflow budget
   └── If budget insufficient → queue for next period (carryQueue = true)

2. CONTEXT ASSEMBLY
   └── Idea details (title, hook, format, pillar)
   └── Channel strategy brief (tone, audience, positioning)
   └── Voice profile (affects pacing and word choice)
   └── Target duration (derived from platform: YT=8–12 min, Shorts=60s, TikTok=60–90s)
   └── Hook patterns from competitor analysis

3. SCRIPT AGENT: GENERATION
   └── Generates script in structured format:
       {
         title: string,
         hook: string,           // First 15 seconds
         intro: string,          // 15–60 seconds
         sections: [{            // Body sections
           heading: string,
           content: string,
           duration_est: number  // seconds
         }],
         cta: string,            // Last 30 seconds
         total_word_count: number,
         scene_breakdown: [{
           id: number,
           type: "voiceover" | "b-roll" | "text-overlay",
           script_segment: string,
           visual_description: string,
           duration_est: number
         }]
       }

4. SCRIPT VALIDATION
   └── Word count within 10% of target
   └── Hook duration ≤ 15 seconds
   └── No competitor brand names mentioned
   └── Language matches channel.language_primary

5. OPERATOR REVIEW (if not autopilot)
   └── Script editor shown with scene breakdown sidebar
   └── Operator can edit inline, regenerate sections, or reject

6. APPROVAL
   └── scripts.status → APPROVED
   └── Ledger entry written for script generation cost

7. EN→ES TRANSLATION (if channel.language_secondary includes 'es')
   └── Triggers Workflow 13 (Localization) as parallel job
   └── ES script created as separate scripts record (version = 1, language = 'es')

8. SCENE BREAKDOWN STORAGE
   └── scripts.scene_breakdown JSONB written
   └── Ready for Workflow 8 (Video Assembly)
```

### Decision Branches

| Condition | Branch |
|-----------|--------|
| Platform = YouTube Shorts | Generate 60s script; hook = first 5s |
| Platform = TikTok | 60–90s; energetic pacing; informal tone |
| Script fails validation | Auto-regenerate once; then present to operator |
| word_count off by > 20% | Trim (if long) or expand (if short) with targeted re-prompt |

### Outputs

- `scripts` record (EN)
- `scripts` record (ES) if localization enabled
- `ledger_entries` record for script generation cost
- Scene breakdown JSON ready for visual agent

### Error Handling

- Script Agent timeout → partial script saved; retry remaining sections
- Validation fail after 3 retries → escalate to operator for manual completion

---

## Workflow 8: Voice + Scenes + Video Assembly

**Trigger:** Script status = APPROVED (event-driven) OR manual "Produce Video" action.

**Actors:** Voice Agent, Visual Agent, Video Assembly Agent, BullMQ Job Queues

**Goal:** Convert an approved script into a fully rendered video file stored on Cloudflare R2.

---

### Step-by-Step Flow

```
1. PRE-RUN ESTIMATE
   └── TTS cost estimate (word count → duration → provider cost)
   └── Image generation cost estimate (scene count × cost/image)
   └── Video render cost estimate (duration × resolution × provider)
   └── Total estimate checked against channel budget

2. JOB GRAPH CREATION
   └── System creates a dependency graph of sub-jobs:
       [TTS Job] ──┐
       [Image Job 1] ──┤
       [Image Job 2] ──┤──► [Assembly Job]
       [Image Job N] ──┘
   └── All TTS + image jobs run in parallel
   └── Assembly job waits for all dependencies

3. VOICE AGENT: TTS GENERATION
   └── Fetches channel's default VoiceProfile
   └── Splits script into segments (by scene_breakdown)
   └── Calls TTS provider for each segment:
       - ElevenLabs: /v1/text-to-speech/{voice_id}
       - OpenAI TTS: /v1/audio/speech
   └── Uploads audio segments to Cloudflare R2
   └── Writes duration_seconds measured from actual audio
   └── Writes ledger_entry for TTS cost (actual)

4. VISUAL AGENT: SCENE IMAGE GENERATION
   └── For each scene in scene_breakdown:
       a. Takes visual_description from scene
       b. Enriches with brand style guidelines (from strategy brief)
       c. Generates image prompt
       d. Calls image provider:
          - OPTIMIZED/PREMIUM: Stable Diffusion XL / DALL-E 3
          - ECONOMICAL: SDXL-Turbo / local ComfyUI
          - FREE: Pexels stock search (no generation cost)
       e. Uploads image to Cloudflare R2
       f. Writes ledger_entry per image

5. VIDEO ASSEMBLY AGENT: ORCHESTRATION
   └── Receives all audio segments + images
   └── Calls Remotion (self-hosted) or Creatomate (API):
       - Assembles timeline: image appears for scene duration
       - Audio track: concatenated TTS segments
       - Text overlays: from scene_breakdown text-overlay type scenes
       - Transitions: fade or cut (based on brand config)
       - Outro: standard branded end card
   └── Renders at configured resolution (default 1080p)
   └── Uploads final video to Cloudflare R2
   └── Writes: videos record (status = DONE, file_url, duration_seconds, render_cost_usd)
   └── Writes: ledger_entry for render cost

6. THUMBNAIL GENERATION
   └── Visual Agent generates thumbnail:
       - Picks highest-impact frame from video
       - OR generates standalone thumbnail image
       - Applies text overlay with video title (condensed)
   └── Uploads thumbnail to R2
   └── Writes: videos.thumbnail_url

7. POST-PRODUCTION CHECK
   └── Video duration within 5% of target
   └── Audio levels normalized (-14 LUFS)
   └── Resolution and codec match platform requirements
   └── If check fails: flag video for operator review
```

### Decision Branches

| Condition | Branch |
|-----------|--------|
| ElevenLabs API down | Fall back to OpenAI TTS; log provider failover |
| Image generation provider over budget | Fall back to Pexels stock search |
| Assembly job fails mid-render | Re-enqueue with last checkpoint; max 3 retries |
| Duration > platform max | Trim at scene boundary closest to limit |

### Outputs

- `videos` record (status = DONE)
- Audio segments on Cloudflare R2
- Scene images on Cloudflare R2
- Final video on Cloudflare R2
- Thumbnail on Cloudflare R2
- Multiple `ledger_entries` records

### Error Handling

- R2 upload fails → retry with exponential backoff; if persistent, fail job and alert
- Render timeout (> 30 min) → kill job; create incident; notify operator
- Audio/video sync drift detected → post-process with ffmpeg normalize step

---

## Workflow 9: Per-Platform Adaptation

**Trigger:** Video status = DONE AND channel has multiple platform targets, OR manual "Create Variants" action.

**Actors:** Video Assembly Agent, Publishing Agent (metadata generation)

**Goal:** Produce platform-optimized variants from the master 16:9 YouTube video.

---

### Step-by-Step Flow

```
1. VARIANT PLAN
   └── Based on channel.platform and linked platforms:
       - YouTube: 16:9, 1080p, full duration → video_variants record
       - YouTube Shorts: 9:16, 60s max, cropped → separate variant
       - TikTok: 9:16, 60–90s, cropped → separate variant
       - Instagram Reels: 9:16, 60–90s, cropped → separate variant

2. CROP & REFRAME (for vertical variants)
   └── Smart crop: detect face/subject in each frame using vision model
   └── Reframe: keep subject centered in 9:16 crop
   └── If no clear subject: center-crop with padding

3. DURATION TRIM
   └── For Shorts/Reels/TikTok (≤ 60s):
       - Extract highest-density information segment
       - OR take first 60s (hook + key point + CTA)
       - Ensure trim ends at natural sentence boundary (from transcript)

4. METADATA GENERATION (per platform)
   └── Publishing Agent generates platform-specific metadata:
       YouTube:
         - Title: optimized for search (keyword front-loaded, ≤ 60 chars)
         - Description: 2500 chars, keyword-rich, links, chapters
         - Tags: 15–20 tags
         - Category: from niche config
       TikTok / Reels:
         - Caption: 150 chars, 5–7 hashtags, hook in first line
         - Sticker suggestions (TikTok)
       Shorts:
         - Title: ≤ 60 chars, action-oriented
         - Description: short, 1–2 hashtags

5. STORAGE
   └── Writes: video_variants records (one per platform)
   └── Each variant: file_url, thumbnail_url, title, description, tags, aspect_ratio

6. QUALITY CHECK
   └── Each variant: verify resolution, bitrate, codec
   └── File size within platform limits (YT: 256GB, TikTok: 4GB, IG: 4GB)
```

### Outputs

- `video_variants` records (1–4 per master video)
- Platform-specific metadata attached
- Files on Cloudflare R2

### Error Handling

- Smart crop fails → fall back to center crop
- Variant file size exceeds limit → re-encode with lower bitrate
- Metadata generation returns too-long title → auto-truncate with ellipsis

---

## Workflow 10: Publishing

**Trigger:** `publish_jobs.scheduled_at` reached (cron check every 5 min) OR manual "Publish Now" action.

**Actors:** Publishing Agent, Platform APIs (YouTube, TikTok, Instagram), BullMQ Scheduler

**Goal:** Upload video variant to platform at scheduled time with retry logic and status tracking.

---

### Step-by-Step Flow

```
1. SCHEDULE TRIGGER
   └── Cron job (*/5 * * * *) queries:
       SELECT * FROM publish_jobs
       WHERE status = 'PENDING'
         AND scheduled_at <= NOW()
       ORDER BY scheduled_at ASC
       LIMIT 10
   └── Enqueues qualifying jobs to BullMQ publish queue

2. PRE-PUBLISH CHECKS
   └── OAuth token valid? If not → refresh token → if refresh fails → fail job, alert operator
   └── Video file accessible on R2? → presign URL for upload
   └── Platform account status: active?
   └── Platform-specific quota: within daily upload limits?

3. UPLOAD
   YouTube:
     └── POST /upload/youtube/v3/videos?uploadType=resumable
     └── Resumable upload (chunked, 256KB chunks)
     └── Set metadata: title, description, tags, category, privacyStatus
     └── On complete: capture platform_video_id
   TikTok:
     └── POST /v2/post/publish/video/init/
     └── Upload via TikTok's direct post API
     └── Capture video_id
   Instagram (Reels):
     └── POST /v21.0/{ig-user-id}/media (container creation)
     └── POST /v21.0/{ig-user-id}/media_publish (publish)
     └── Capture media_id

4. STATUS UPDATE
   └── publish_jobs.status → PUBLISHED
   └── publish_jobs.platform_video_id = captured ID
   └── publish_jobs.platform_url = constructed URL
   └── publish_jobs.published_at = now()
   └── content_ideas.status → PUBLISHED
   └── Emit publish_success event → triggers Workflow 11 (Analytics Ingestion, T+24h)

5. POST-PUBLISH ENRICHMENT
   └── Publishing Agent writes first analytics snapshot at T+0:
       views=0, likes=0, comments=0 (baseline record)
   └── Schedules analytics pull jobs at T+6h, T+24h, T+72h, T+7d, T+30d
```

### Decision Branches

| Condition | Branch |
|-----------|--------|
| Upload fails mid-stream | Resume from last checkpoint (resumable upload); max 3 retries |
| OAuth token expired | Refresh; if refresh fails → pause all jobs for this account; alert operator |
| Platform rate limit hit | Back off for rate_limit_reset period; re-enqueue |
| Video violates platform policy | Mark publish_job.status = FAILED; store last_error; alert operator |
| Scheduled time missed by > 2h | Publish immediately; log delay |

### Outputs

- `publish_jobs.status` = PUBLISHED
- `platform_video_id` captured
- Initial `analytics_snapshots` record (baseline)

### Error Handling

- Max 5 retry attempts per job
- After 5 failures: status = FAILED; send notification; surface in Publishing Queue UI
- Partial uploads cleaned up on R2 on final failure

---

## Workflow 11: Analytics Ingestion

**Trigger:** Scheduled pull jobs at T+6h, T+24h, T+72h, T+7d, T+30d after publish; OR daily channel-level sweep.

**Actors:** Analytics Agent, Platform APIs, BullMQ Scheduler

**Goal:** Ingest performance data from all platforms, store snapshots, and detect early winners or failures.

---

### Step-by-Step Flow

```
1. JOB TRIGGER
   └── BullMQ delayed job fires for specific video at scheduled interval
   └── OR daily sweep: for all active channels, fetch last 30 days of video stats

2. PLATFORM API CALLS
   YouTube:
     └── GET /youtube/v3/videos?part=statistics&id={video_id}
     └── Returns: viewCount, likeCount, commentCount, favoriteCount
     └── GET /youtube/v3/videoAnalytics (if YT Analytics API access granted):
         → averageViewDuration, averageViewPercentage, estimatedRevenue, ctr
   TikTok:
     └── GET /v2/video/query/?video_ids=[...]
     └── Returns: play_count, like_count, comment_count, share_count, reach
   Instagram:
     └── GET /v21.0/{media_id}/insights?metric=impressions,reach,plays,likes,comments

3. DATA NORMALIZATION
   └── Analytics Agent maps platform-specific field names to internal schema:
       views, likes, comments, shares, ctr, avd, revenue_usd

4. SNAPSHOT WRITE
   └── Writes: analytics_snapshots record
       (channel_id, video_id, platform, views, likes, comments, shares, ctr, avd, revenue_usd, captured_at)

5. WINNER DETECTION
   └── Analytics Agent computes performance_score:
       score = (views / channel_avg_views) * 0.5
             + (ctr  / channel_avg_ctr)   * 0.3
             + (avd  / channel_avg_avd)   * 0.2
   └── If score > 1.5 AND captured_at = T+24h snapshot:
       → Flag as EARLY_WINNER
       → Emit winner_detected event → triggers Workflow 12

6. FAILURE DETECTION
   └── If views at T+72h < channel_avg_views * 0.3:
       → Flag as UNDERPERFORMER
       → Trigger Optimization Agent review (recommend thumbnail/title changes)

7. CHANNEL-LEVEL AGGREGATION
   └── Update cost_ledgers.spent_usd with actual revenue (for ROI calc)
   └── Update content_pillars.performance_avg
```

### Outputs

- `analytics_snapshots` records (per video, per interval)
- Winner/underperformer flags
- Events: `winner_detected`, `underperformer_detected`

### Error Handling

- API quota exceeded → skip interval; retry at next scheduled interval
- Video deleted on platform → mark publish_job.status = REMOVED; stop scheduled pulls
- Revenue data unavailable (monetization not enabled) → set revenue_usd = null; not 0

---

## Workflow 12: Winner Iteration Loop

**Trigger:** `winner_detected` event from Workflow 11 (analytics ingestion).

**Actors:** Analytics Agent, Optimization Agent, Idea Agent, Operator

**Goal:** Automatically generate a batch of content ideas that iterate on the winner's formula.

---

### Step-by-Step Flow

```
1. WINNER CONTEXT EXTRACTION
   └── Fetch winner video + script + idea records
   └── Analytics Agent generates winner analysis:
       - What hook formula was used
       - What format was used
       - Which pillar it belonged to
       - Trending keywords at time of publish
       - Thumbnail style

2. OPTIMIZATION AGENT: FORMULA EXTRACTION
   └── Generates "Winner Formula Card":
       {
         hook_template: "[NUMBER] [SHOCKING FACTS] about [TOPIC] that [AUTHORITY] won't tell you",
         format: "LISTICLE",
         optimal_duration: 480,
         tone: "confrontational but educational",
         key_keyword: "AI automation secrets",
         thumbnail_formula: "Red text + shocked graphic + dark BG"
       }

3. IDEA AGENT: ITERATION BATCH
   └── Generates 10 new ideas using winner formula as template:
       - Same hook template, new topic
       - Same format, adjacent niche angle
       - Long-tail keyword variations of winning keyword
   └── 5 additional ideas: "adjacent niche" variations (related but different pillar)

4. SCORING + FILTERING
   └── Same ROI scoring as Workflow 5
   └── Bias: ideas matching winner format get +0.20 ROI bonus
   └── Filtered: remove ideas too similar to winner title

5. FAST-TRACK APPROVAL
   └── If autopilot = true: top 3 winner-iteration ideas auto-approved
   └── If autopilot = false: displayed in Kanban with "Winner Iteration" badge

6. SCALE SIGNAL
   └── If performance_score > 2.0 (viral threshold):
       → Emit scale_signal event → triggers Workflow 14 (Scaling Winners)
```

### Outputs

- 10–15 new `content_ideas` records (winner iteration batch)
- Winner Formula Card stored in channel.metadata
- Scale signal emitted if threshold crossed

---

## Workflow 13: EN/ES Localization

**Trigger:** Script approved with channel.language_secondary including 'es'; OR manual "Translate Script" action.

**Actors:** Localization Agent, Voice Agent (for ES TTS)

**Goal:** Produce a high-quality Spanish adaptation of the EN script, with culturally appropriate voice-over.

---

### Step-by-Step Flow

```
1. TRANSLATION
   └── Localization Agent receives:
       - EN script (full content + scene_breakdown)
       - Channel tone + audience (persona may differ for ES market)
       - Target market flag: ES-LATAM vs ES-SPAIN (affects vocabulary)
   └── Produces:
       - Full ES script translation
       - Localized title and hook (adapted, not literal translation)
       - Scene descriptions translated
       - CTA adapted for cultural norms

2. QUALITY CHECK
   └── Word count within 10% of EN version (duration parity)
   └── Hook translated and culturally adapted (not literal)
   └── No anglicisms left untranslated (spell-check pass)
   └── Formal/informal register consistent throughout

3. ES SCRIPT RECORD
   └── Writes: scripts record (language='es', idea_id=same, version=1)
   └── References same idea; separate language variant

4. ES VOICE PROFILE SELECTION
   └── Voice Agent selects appropriate ES voice:
       - ES-LATAM: Latino accent voices (ElevenLabs: Sofia, Carlos, etc.)
       - ES-SPAIN: Castilian accent voices
   └── If no ES voice profile exists: creates default one

5. ES VIDEO PRODUCTION
   └── Triggers Workflow 8 (Video Assembly) with:
       - ES script record
       - ES voice profile
       - Same visual assets (images, b-roll) — no re-generation needed
       - Language tag appended to file names

6. ES VIDEO VARIANTS + PUBLISH JOBS
   └── Triggers Workflow 9 and 10 for ES variants
   └── Published to same platform account with ES metadata
   └── OR published to separate ES channel if brand has one
```

### Outputs

- `scripts` record (ES)
- `videos` record (ES audio, same visuals)
- `video_variants` records (ES, all platforms)
- `publish_jobs` for ES content

### Error Handling

- Localization Agent produces machine-translation-quality output (detected by readability score) → flag for operator review; do not auto-approve
- ES voice provider error → fall back to OpenAI TTS with ES model

---

## Workflow 14: Scaling Winners

**Trigger:** `scale_signal` event (performance_score > 2.0) from Workflow 12.

**Actors:** Optimization Agent, Cost Control Agent, Operator

**Goal:** Systematically scale a winning channel by increasing production volume and potentially upgrading the AI tier.

---

### Step-by-Step Flow

```
1. SCALE ASSESSMENT
   └── Optimization Agent evaluates:
       - Current publishing frequency vs recommended
       - Current tier vs optimal tier for scale
       - Budget headroom (how much budget remains this period)
       - ROI multiple: is spend generating sufficient return?

2. SCALE PLAN GENERATION
   └── Produces scale plan:
       {
         recommendation: "INCREASE_FREQUENCY",
         current_videos_per_week: 3,
         recommended_videos_per_week: 5,
         tier_recommendation: "UPGRADE_TO_PREMIUM",
         tier_rationale: "ROI=2.4x; upgrade cost covered by projected ad revenue increase",
         budget_increase_needed: 45.00,
         projected_roi_at_scale: 3.1
       }

3. OPERATOR APPROVAL (or autopilot)
   └── If auto_tier_management = false: present plan in Cost Dashboard; operator approves
   └── If auto_tier_management = true: execute plan automatically

4. TIER UPGRADE
   └── channels.tier updated
   └── routing_policies updated to use new tier's model configs
   └── Budget adjusted (if within user budget ceiling)

5. AUTOMATION RULE ADJUSTMENT
   └── automation_rules.trigger_config updated:
       cron changed from "3x/week" → "5x/week"
   └── Next run scheduled accordingly

6. BATCH ACCELERATION
   └── Immediately generate a new idea batch (Workflow 5) for the winning pillar
   └── Fast-track these through to production
```

### Outputs

- Updated `channels.tier`
- Updated `automation_rules` schedules
- New idea batch queued
- Scale plan stored in audit log

---

## Workflow 15: Cost Reduction on Low-Performers

**Trigger:** Weekly tier review job (Monday 00:00 UTC) detects `roi_score < -0.20` OR budget_utilization > 90%.

**Actors:** Cost Control Agent, Tier Review Job, Operator (notification)

**Goal:** Automatically reduce spending on underperforming channels to protect overall budget margins.

---

### Step-by-Step Flow

```
1. LOW-PERFORMER DETECTION
   └── Tier review job computes for each channel:
       - roi_score = (revenue_7d - cost_7d) / cost_7d
       - avg_views_7d vs channel view_threshold
       - budget_utilization = projected_monthly_cost / monthly_budget

2. DOWNGRADE DECISION
   └── If roi_score < -0.20 AND current_tier != FREE:
       → Downgrade to next cheaper tier
   └── If budget_utilization > 0.90 AND roi_score < 0:
       → Downgrade AND reduce batch size (ideas/week: 20 → 10)
   └── Reason logged in tier_review_log

3. PAUSE DECISION
   └── If roi_score < -0.50 for 2 consecutive weeks:
       → Set channel.status = PAUSED
       → Disable all automation_rules for channel
       → Notify operator: "Channel [handle] paused — 2 weeks negative ROI"
   └── Operator must manually re-activate

4. EXECUTION
   └── channels.tier updated (downgrade)
   └── routing_policies updated to cheaper model configs
   └── If paused: automation_rules.enabled = false
   └── Ledger note written: "Automated downgrade — negative ROI"

5. NOTIFICATION
   └── Email: "Cost reduction applied to [channel]: [OLD_TIER] → [NEW_TIER]"
   └── In-app alert in Cost Dashboard
   └── If paused: urgent banner in Channel Portfolio view

6. RECOVERY MONITORING
   └── Even after downgrade: analytics ingestion continues
   └── If roi_score > 0 for 2 consecutive weeks at lower tier:
       → Emit recovery_signal → triggers optional upgrade review (Workflow 14)
```

### Decision Branches

| Condition | Branch |
|-----------|--------|
| Channel is already on FREE tier | Cannot downgrade further; move to PAUSE decision |
| auto_tier_management = false | Log recommendation but do not auto-apply; notify operator |
| Channel < 4 weeks old | Grace period: do not trigger downgrade; log as "too early to assess" |
| Budget exceeded but ROI positive | Do not downgrade; instead alert operator to increase budget |

### Outputs

- Updated `channels.tier` (downgraded)
- Updated `channels.status` (if paused)
- Disabled `automation_rules` (if paused)
- Notification events dispatched
- Tier review log entry

### Error Handling

- Tier review job fails mid-run → channels already processed retain changes; job marked failed; re-run skips completed channels
- Notification delivery fails → log failure; surface in operator notification center next login
