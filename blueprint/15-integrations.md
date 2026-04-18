# 15 — Integrations Reference

**Faceless Viral OS** | Blueprint Document 15 of 19
Last updated: 2026-04-17

---

## Overview

This document is the authoritative reference for every external integration in the Faceless Viral OS platform. For each integration it covers: what it provides, which SDK/API to use, key limitations, rate limits, authentication method, Phase 1 vs Phase 2 priority, and critical gotchas. Use this document when scoping stories, designing service boundaries, or debugging external API issues.

---

## Priority Matrix

| Integration | Phase 1 Must-Have | Phase 1 Nice-to-Have | Phase 2 Only |
|---|---|---|---|
| YouTube Data API v3 | X | | |
| TikTok Content Posting API | X | | |
| Instagram Graph API | | X | |
| OpenAI (GPT-4o, o3-mini) | X | | |
| Anthropic Claude Sonnet/Haiku | X | | |
| Groq (Llama 70B) | X | | |
| Google Gemini Flash | X | | |
| Google Gemini Pro | | X | |
| Mistral | | X | |
| ElevenLabs TTS | X | | |
| AWS Polly TTS | | X | |
| Coqui TTS (self-hosted) | | X | |
| Azure TTS | | | X |
| OpenAI Whisper API | X | | |
| OpenAI Whisper (self-hosted) | | X | |
| AssemblyAI | | X | |
| Deepgram | | | X |
| Pexels API | X | | |
| Pixabay API | X | | |
| Unsplash | | X | |
| Storyblocks | | | X |
| Runway ML | | X | |
| Stability AI Video | | X | |
| Kling | | | X |
| Local FFmpeg | X | | |
| Analytics Aggregation (internal polling) | X | | |
| YouTube Analytics API | X | | |
| TikTok Analytics API | | X | |
| Meta Insights API | | X | |
| Stripe | | | X |
| Slack Webhooks (alerts) | X | | |
| Resend (transactional email) | | X | |
| SendGrid | | | X |
| PagerDuty | | | X |
| Outbound Webhook System | | X | |

---

## 1. YouTube Data API v3

### What It Provides
- Video upload (resumable and multipart)
- Channel management (branding, description, settings)
- Playlist CRUD
- Video metadata update (title, description, tags, thumbnails, category)
- YouTube Analytics API (views, watch time, CTR, revenue)
- YouTube Search API
- Subscription management
- Comment management

### SDK / API
- REST API: `https://www.googleapis.com/youtube/v3/`
- Official Node.js client: `googleapis` npm package (`google-auth-library` + `@googleapis/youtube`)
- Resumable upload endpoint: `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable`

### Quota System (Critical)
- **Default quota: 10,000 units per project per day** (resets at midnight Pacific Time)
- Quota costs per operation:

| Operation | Quota Cost |
|---|---|
| `videos.insert` (upload) | 1,600 units |
| `videos.update` (metadata) | 50 units |
| `thumbnails.set` | 50 units |
| `search.list` | 100 units |
| `channels.list` | 1 unit |
| `playlists.insert` | 50 units |
| `playlistItems.insert` | 50 units |
| `analytics.query` | 1 unit |
| `videos.list` | 1 unit |

- At 10,000 units/day, you can upload roughly **6 videos per day** before exhausting quota (1,600 × 6 = 9,600 units). Plan accordingly.
- **Quota increase requests**: Submit via Google Cloud Console; approval is not guaranteed and takes 1–4 weeks. Request for production before launch.
- Multiple Google projects can be used to pool quota (one per Google Cloud project), but this requires careful key management.

### Resumable Upload Flow
1. Initiate upload session: POST to resumable upload URI with video metadata in body + `X-Upload-Content-Type` header → receive session URI in `Location` header
2. Upload video bytes: PUT to session URI with `Content-Range` header, chunked (recommended: 8 MB chunks minimum per Google spec; use 50 MB chunks in practice)
3. If interrupted: query upload status with PUT to session URI with `Content-Range: bytes */total_size` → server returns `308 Resume Incomplete` with `Range` header indicating bytes received
4. Resume from last acknowledged byte
5. On completion: server returns `200 OK` or `201 Created` with video resource

```
Session URI lifetime: 1 week from initiation. After expiry, start a new session.
```

### OAuth2 Scopes Required
| Scope | Purpose |
|---|---|
| `https://www.googleapis.com/auth/youtube.upload` | Upload videos |
| `https://www.googleapis.com/auth/youtube` | Manage account (required for playlists, metadata updates) |
| `https://www.googleapis.com/auth/youtube.readonly` | Read-only channel/video data |
| `https://www.googleapis.com/auth/yt-analytics.readonly` | Read YouTube Analytics |
| `https://www.googleapis.com/auth/yt-analytics-monetary.readonly` | Read revenue analytics |

### Auth Method
- OAuth 2.0 Authorization Code Flow
- Tokens stored per channel in encrypted secrets store (not in DB plaintext)
- Refresh tokens do not expire unless revoked; access tokens expire in 1 hour
- Token refresh handled automatically by `googleapis` client

### Rate Limits (non-quota)
- Concurrent upload streams: no documented hard limit; apply backpressure internally (max 3 concurrent uploads per channel recommended)
- Analytics API: 10 concurrent requests max

### Phase Priority
- Phase 1: Must-Have (primary publishing target)

### Gotchas
- Newly uploaded videos are always `private` until explicitly set to `public` — always set `status.privacyStatus` in the upload request
- `processingStatus` is async — a video is not immediately watchable after upload; poll `videos.list` for `processingDetails.processingStatus === "succeeded"` before marking as published
- Thumbnail upload requires a separate API call after video is processing/processed
- YouTube sometimes rejects videos silently (status stays `processing` indefinitely); implement a timeout check at 30 minutes
- Scheduled publishing requires `status.publishAt` (RFC 3339 format) + `status.privacyStatus: "private"` — the video becomes public automatically at that time
- Quota does NOT reset on demand — plan uploads in advance and implement a quota tracker service

---

## 2. TikTok Business API / Content Posting API

### What It Provides
- Video upload and publishing
- Caption/hashtag management
- TikTok for Business analytics
- Audience demographics
- Content discovery (TikTok Research API — limited access)

### SDK / API
- REST API base: `https://open.tiktokapis.com/v2/`
- No official Node.js SDK; use native `fetch` or `axios` with typed wrappers
- Content Posting API: `POST /v2/post/publish/video/init/` (chunked upload flow)

### Video Upload Flow (Content Posting API)
1. Initialize upload: POST `/v2/post/publish/video/init/` with video info → receive `publish_id` and `upload_url`
2. Upload video chunks to the returned `upload_url` (S3-compatible multipart)
3. Poll publish status: GET `/v2/post/publish/status/fetch/` with `publish_id`
4. On success: video live on TikTok profile

### Account Requirements
- **Business Account required** for Content Posting API access
- Must apply for API access through TikTok Developer Portal (review process: 1–4 weeks)
- App must be approved for the `video.publish` scope
- Creator accounts use a different flow (Direct Post vs In-App Upload — prefer Direct Post for automation)

### OAuth2 Scopes Required
| Scope | Purpose |
|---|---|
| `video.publish` | Publish videos to TikTok |
| `video.list` | Read user's videos |
| `user.info.basic` | Basic profile info |
| `user.info.stats` | Follower/following counts |

### Rate Limits
| Endpoint | Limit |
|---|---|
| `/v2/post/publish/video/init/` | 100 requests/day per user |
| `/v2/post/publish/status/fetch/` | 1,000 requests/day per user |
| General API | 100 requests/minute per app |

### Auth Method
- OAuth 2.0 Authorization Code Flow
- Access tokens expire in 24 hours; refresh tokens valid for 365 days
- Refresh token rotation on each use

### Phase Priority
- Phase 1: Must-Have (secondary publishing target)

### Gotchas
- TikTok's API approval process is slow and unpredictable — apply for access on Day 1 of the project, not at integration time
- Direct Post bypasses TikTok's in-app editor; videos must already have captions baked in or provided via API
- Video format requirements: MP4, H.264, max 4 GB, 9:16 aspect ratio for best performance
- Access tokens have short 24-hour TTL — implement aggressive refresh scheduling
- TikTok Research API (for trend data) has separate access requirements and is much more restricted
- Some regions have different API availability — test with target audience regions in mind
- TikTok can suspend API access if posting patterns look automated/spammy — respect minimum intervals between posts

---

## 3. Instagram Graph API / Facebook Graph API

### What It Provides
- Instagram Business/Creator account management
- Reels publishing (video content)
- Post scheduling
- Instagram Insights (reach, impressions, engagement)
- Hashtag search
- Mentions and comments management

### SDK / API
- REST API base: `https://graph.facebook.com/v19.0/`
- Official SDK: `fb` npm package or native REST calls
- Publishing is two-step: create media container → publish container

### Reel Publishing Flow
1. Create media container: POST `/{ig-user-id}/media` with `video_url`, `caption`, `media_type=REELS`
2. Wait for container to be ready: GET `/{ig-container-id}?fields=status_code` → poll until `FINISHED`
3. Publish container: POST `/{ig-user-id}/media_publish` with `creation_id`

### Account Requirements
- Instagram Business or Creator account required (personal accounts cannot use Graph API)
- Account must be connected to a Facebook Page
- App must go through Facebook App Review for production access to `instagram_content_publish` permission

### Permissions Required
| Permission | Purpose |
|---|---|
| `instagram_basic` | Read account info |
| `instagram_content_publish` | Publish posts and Reels |
| `instagram_manage_insights` | Read analytics |
| `pages_read_engagement` | Read connected Page data |
| `pages_show_list` | List connected Pages |

### Rate Limits
| Operation | Limit |
|---|---|
| Content Publishing | 25 API-published posts per 24 hours per account |
| Media Container Creation | 50 requests per hour per user |
| Graph API calls | 200 calls per hour per user |

### Auth Method
- OAuth 2.0 (Facebook Login)
- Long-lived Page Access Tokens (60 days) for server-side automation
- System User tokens (never expire) available via Business Manager — preferred for production

### Phase Priority
- Phase 1: Nice-to-Have (tertiary platform)
- Phase 2: Must-Have

### Gotchas
- Facebook App Review for `instagram_content_publish` can take 2–4 weeks; submit early
- Video must be hosted at a publicly accessible URL during container creation (use a signed R2 URL with sufficient TTL)
- Container creation is async — video is transcoded server-side; poll status before publishing
- Rate limit of 25 posts/day is per Instagram account, not per app
- Graph API version deprecation: versions are deprecated every ~2 years; pin version in URL and audit annually
- Reels have specific technical requirements: MP4, H.264, AAC audio, min 3 seconds, max 15 minutes, 9:16 aspect ratio recommended

---

## 4. AI Model Providers

### 4.1 OpenAI

**Models Used:** GPT-4o (PREMIUM tier), o3-mini (OPTIMIZED tier)

| Parameter | Value |
|---|---|
| API Base | `https://api.openai.com/v1/` |
| SDK | `openai` npm package (official) |
| Auth | API Key (`Authorization: Bearer sk-...`) |
| Context Window | GPT-4o: 128K tokens; o3-mini: 128K tokens |
| Output Limit | GPT-4o: 16K tokens; o3-mini: 65K tokens |

**Rate Limits (Tier 5):**
| Model | RPM | TPM | RPD |
|---|---|---|---|
| GPT-4o | 10,000 | 10,000,000 | — |
| o3-mini | 10,000 | 10,000,000 | — |

**Pricing (approximate):**
| Model | Input | Output |
|---|---|---|
| GPT-4o | $2.50/1M tokens | $10.00/1M tokens |
| o3-mini | $1.10/1M tokens | $4.40/1M tokens |

**Gotchas:**
- Enable `store: false` on all requests unless you explicitly want OpenAI to store your prompts (privacy consideration)
- Function calling / tool use adds overhead tokens — account for this in cost estimates
- o3-mini uses reasoning tokens internally; output tokens billed at standard rate but total processing time is higher
- Rate limits vary significantly by API key tier; new keys start at Tier 1 with very low limits

---

### 4.2 Anthropic (Claude)

**Models Used:** Claude Sonnet 4.x (OPTIMIZED tier), Claude Haiku 3.5 (ECONOMICAL tier)

| Parameter | Value |
|---|---|
| API Base | `https://api.anthropic.com/v1/` |
| SDK | `@anthropic-ai/sdk` npm package |
| Auth | API Key (`x-api-key` header) + `anthropic-version` header |
| Context Window | Sonnet: 200K tokens; Haiku: 200K tokens |

**Rate Limits:**
| Model | RPM | TPM |
|---|---|---|
| Claude Sonnet | 2,000 | 80,000,000 |
| Claude Haiku | 4,000 | 400,000,000 |

**Pricing:**
| Model | Input | Output |
|---|---|---|
| Claude Sonnet | $3.00/1M tokens | $15.00/1M tokens |
| Claude Haiku | $0.25/1M tokens | $1.25/1M tokens |

**Gotchas:**
- Anthropic requires `anthropic-version: 2023-06-01` header on all requests — omitting it causes errors
- Streaming responses are strongly recommended for long outputs to avoid timeout issues
- Claude has conservative content policies — some marketing/hook copy may be softened; fine-tune system prompts accordingly
- Extended thinking (for complex reasoning tasks) is available on Sonnet; costs more but significantly improves output quality for strategy tasks

---

### 4.3 Groq

**Models Used:** Llama 3.1 70B (FREE/ECONOMICAL tier — lowest cost)

| Parameter | Value |
|---|---|
| API Base | `https://api.groq.com/openai/v1/` |
| SDK | `groq-sdk` npm package (OpenAI-compatible) |
| Auth | API Key (`Authorization: Bearer gsk_...`) |
| Context Window | 128K tokens |

**Rate Limits (free tier):**
| Metric | Limit |
|---|---|
| RPM | 30 |
| TPM | 6,000 |
| RPD | 14,400 |

**Rate Limits (paid tier):**
| Metric | Limit |
|---|---|
| RPM | 6,000 |
| TPM | 200,000 |

**Pricing:** Free tier available; paid tier ~$0.59–$0.79/1M tokens (input/output)

**Gotchas:**
- Groq uses custom silicon (LPUs) — inference is extremely fast (hundreds of tokens/second) but context window support may lag behind model releases
- API is OpenAI-compatible — can use `openai` SDK pointing at Groq base URL
- Free tier TPM limits make it unsuitable for high-volume parallel generation without paid plan
- Model availability can change; pin specific model IDs rather than aliases

---

### 4.4 Google (Gemini)

**Models Used:** Gemini 2.0 Flash (OPTIMIZED tier), Gemini 1.5 Pro (PREMIUM tier)

| Parameter | Value |
|---|---|
| API Base | `https://generativelanguage.googleapis.com/v1beta/` |
| SDK | `@google/generative-ai` npm package |
| Auth | API Key or OAuth2 (Vertex AI for production) |
| Context Window | Flash: 1M tokens; Pro: 2M tokens |

**Rate Limits (API key, free tier):**
| Model | RPM | RPD |
|---|---|---|
| Gemini 2.0 Flash | 15 | 1,500 |
| Gemini 1.5 Pro | 2 | 50 |

**Rate Limits (paid):**
| Model | RPM |
|---|---|
| Gemini 2.0 Flash | 2,000 |
| Gemini 1.5 Pro | 1,000 |

**Pricing:**
| Model | Input | Output |
|---|---|---|
| Gemini 2.0 Flash | $0.075/1M tokens | $0.30/1M tokens |
| Gemini 1.5 Pro | $1.25/1M tokens | $5.00/1M tokens |

**Gotchas:**
- Use Vertex AI (GCP) for production, not the Google AI Studio API — better SLAs and IAM control
- Vertex AI requires GCP project setup and service account credentials
- Gemini's safety filters are aggressive — configure `safetySettings` to lower thresholds for marketing copy use cases (within acceptable limits)
- 1M+ context window is useful for competitor analysis with full transcripts

---

### 4.5 Mistral

**Models Used:** Mistral Large (OPTIMIZED), Mistral 7B (ECONOMICAL)

| Parameter | Value |
|---|---|
| API Base | `https://api.mistral.ai/v1/` |
| SDK | `@mistralai/mistralai` npm package (OpenAI-compatible) |
| Auth | API Key |
| Context Window | 32K–128K tokens depending on model |

**Pricing:** Mistral Large ~$3/1M input, $9/1M output; Mistral 7B ~$0.25/1M

**Phase Priority:** Phase 1 Nice-to-Have (useful as fallback in Model Router)

**Gotchas:**
- OpenAI-compatible API but with subtle differences in tool calling format
- European data residency option available — relevant for GDPR compliance in Phase 2

---

## 5. TTS Providers

### 5.1 ElevenLabs

**What It Provides:** High-quality neural TTS, voice cloning, multilingual synthesis

| Parameter | Value |
|---|---|
| API Base | `https://api.elevenlabs.io/v1/` |
| SDK | `elevenlabs` npm package |
| Auth | API Key (`xi-api-key` header) |

**Pricing:**
| Plan | Characters/Month | Cost |
|---|---|---|
| Free | 10,000 | $0 |
| Starter | 30,000 | $5/mo |
| Creator | 100,000 | $22/mo |
| Pro | 500,000 | $99/mo |
| Scale | 2,000,000 | $330/mo |
| Business | Custom | Custom |

**Voice Cloning Limits:**
- Instant voice cloning: available from Starter plan; requires 1+ minute of clean audio
- Professional voice cloning: requires minimum 30 minutes of studio-quality audio; higher fidelity
- Cloned voices are tied to the ElevenLabs account — store `voice_id` in DB per project/persona

**Rate Limits:**
- Free tier: concurrent requests limited to 2
- Paid tiers: vary by plan; Pro allows up to 50 concurrent requests

**Key Endpoints:**
- Text to speech: `POST /v1/text-to-speech/{voice_id}` → returns audio stream (MP3/PCM)
- Streaming TTS: `POST /v1/text-to-speech/{voice_id}/stream`
- List voices: `GET /v1/voices`
- Voice clone: `POST /v1/voices/add`

**Phase Priority:** Phase 1 Must-Have (primary TTS for quality tiers)

**Gotchas:**
- Character counting includes all characters including whitespace and punctuation — long scripts cost more than expected
- Audio output format: request `mp3_44100_128` for a good quality/size balance
- Stability and similarity_boost parameters heavily affect output quality — tune per voice
- Voice model selection affects quality AND latency: `eleven_turbo_v2` for speed, `eleven_multilingual_v2` for non-English
- Monitor character usage in real-time to avoid overage charges; implement a character budget per video

---

### 5.2 AWS Polly

**What It Provides:** Cost-effective cloud TTS, 60+ languages, Neural and Standard voices

| Parameter | Value |
|---|---|
| SDK | `@aws-sdk/client-polly` |
| Auth | AWS IAM credentials (access key + secret or role-based) |
| Output Formats | MP3, OGG, PCM |

**Pricing:**
- Standard voices: $4.00 per 1 million characters
- Neural voices: $16.00 per 1 million characters
- Free tier: 5 million characters/month for 12 months

**Rate Limits:**
- Standard: 100 requests/second
- Neural: 8 concurrent synthesis requests per account (expandable)
- Max text per request: 3,000 characters (SSML), 6,000 characters (plain text)

**Phase Priority:** Phase 1 Nice-to-Have (fallback/cheap tier)

**Gotchas:**
- Neural voices sound significantly better than Standard — use Neural for all customer-facing content
- Long scripts must be chunked into <3,000 character SSML segments and concatenated
- SSML support enables fine control over pacing, emphasis, and breaks — invest in good SSML templates
- Output is synchronous for short text; use `StartSpeechSynthesisTask` for longer content (async, result stored in S3)

---

### 5.3 Coqui TTS (Self-Hosted)

**What It Provides:** Open-source TTS with voice cloning, fully self-hostable, zero per-character cost

| Parameter | Value |
|---|---|
| Library | `TTS` Python package (run as a microservice) |
| Interface | HTTP REST API via custom FastAPI wrapper |
| Deployment | Docker container on GPU instance |

**Models:** XTTS v2 (best quality, supports voice cloning), YourTTS, Bark

**Cost:** Infrastructure only (GPU instance: ~$0.50–$2.00/hour on Lambda Labs or Vast.ai)

**Phase Priority:** Phase 1 Nice-to-Have (cost reduction at scale), Phase 2 recommended for ULTRA tier custom voices

**Gotchas:**
- XTTS v2 requires a GPU (at minimum NVIDIA T4); CPU inference is 10–30x slower
- Must build and maintain a Docker image; model weights are large (2–4 GB)
- Audio quality is good but slightly below ElevenLabs Pro
- Coqui the company is defunct (2023); the open-source library is community-maintained — check for forks
- Run as an internal microservice; wrap with a queue to handle GPU concurrency

---

### 5.4 Azure TTS

**What It Provides:** Microsoft Azure Cognitive Services TTS, Neural voices, custom neural voice (requires application)

| Parameter | Value |
|---|---|
| SDK | `microsoft-cognitiveservices-speech-sdk` |
| Auth | Azure subscription key + region |
| Pricing | ~$16/1M characters (Neural), $4/1M (Standard) |

**Phase Priority:** Phase 2 Only (useful for enterprise accounts or Azure-aligned customers)

**Gotchas:**
- Custom Neural Voice requires Microsoft approval and is an enterprise offering
- Azure has per-region quotas; deploy to the region closest to your infrastructure

---

## 6. Transcription Providers

### 6.1 OpenAI Whisper

**API Version:**
- API: POST `https://api.openai.com/v1/audio/transcriptions`
- Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
- Max file size: 25 MB (use chunking for longer audio)
- Pricing: $0.006 per minute
- Rate limits: 50 RPM, 25 concurrent requests

**Self-Hosted Version:**
- Use `openai/whisper` GitHub repo or `faster-whisper` (CTranslate2 backend — 4x faster)
- Deploy as Docker microservice with GPU for real-time performance
- Models: `base`, `small`, `medium`, `large-v3` — use `large-v3` for production quality
- `large-v3`: ~$0.00 marginal cost at scale but ~2–4 GB VRAM required

**Phase Priority:** Phase 1 Must-Have (API version); Phase 1 Nice-to-Have (self-hosted)

**Gotchas:**
- Whisper API returns word-level timestamps only with `timestamp_granularities[]=word` parameter
- For video captioning: use `verbose_json` response format to get segment timestamps for SRT generation
- Self-hosted `faster-whisper` is dramatically faster than the reference implementation — prefer it for high-volume use
- The API imposes a 25 MB limit — for long videos, strip audio to WAV first (smaller than MP4 audio track)

---

### 6.2 AssemblyAI

**What It Provides:** Transcription + speaker diarization, auto-chapters, sentiment analysis, topic detection

| Parameter | Value |
|---|---|
| API Base | `https://api.assemblyai.com/v2/` |
| SDK | `assemblyai` npm package |
| Auth | API Key |
| Pricing | $0.37/hour of audio (async), $0.55/hour (real-time) |

**Phase Priority:** Phase 1 Nice-to-Have (good for analytics and chapter extraction)

**Gotchas:**
- Transcription is async — submit file URL, poll for completion (or use webhooks)
- Speaker diarization adds latency; disable if not needed for subtitles-only use cases
- LeMUR (AssemblyAI's LLM feature) allows asking questions about transcripts — useful for analytics

---

### 6.3 Deepgram

**What It Provides:** Real-time and batch transcription, Nova-2 model, speaker diarization, custom vocabulary

| Parameter | Value |
|---|---|
| SDK | `@deepgram/sdk` npm package |
| Pricing | Nova-2: $0.0043/minute (~$0.26/hour) — very competitive |

**Phase Priority:** Phase 2 Only (evaluate as cost-effective alternative to Whisper API at scale)

---

## 7. Stock Media Providers

### 7.1 Pexels API

**What It Provides:** Free stock photos and videos, commercial license included

| Parameter | Value |
|---|---|
| API Base | `https://api.pexels.com/v1/` (photos), `https://api.pexels.com/videos/` |
| Auth | API Key header |
| Rate Limits | 200 requests/hour, 20,000 requests/month |
| License | Pexels License (free for commercial use, no attribution required) |

**Key Endpoints:**
- `GET /videos/search?query=...&per_page=15` — search videos
- `GET /videos/popular` — trending videos
- `GET /v1/photos/search?query=...` — search photos

**Phase Priority:** Phase 1 Must-Have

**Gotchas:**
- Rate limits are per API key — if running multiple workers, they share the same key limits
- Downloaded files should be cached in R2 to avoid re-downloading the same assets
- Always store the `url` and `photographer` in the asset provenance table — even though attribution is not required, it's needed for internal audit purposes
- Video quality varies widely — filter by `min_width=1920` and prefer portrait (1080x1920) for short-form

---

### 7.2 Pixabay API

**What It Provides:** Free stock photos, videos, and music; CC0 license

| Parameter | Value |
|---|---|
| API Base | `https://pixabay.com/api/` (photos/videos), `https://pixabay.com/api/videos/` |
| Auth | API Key parameter |
| Rate Limits | 100 requests/minute, 5,000 requests/hour |
| License | Pixabay License (free commercial use, no attribution required) |

**Phase Priority:** Phase 1 Must-Have

**Gotchas:**
- API key must be kept secret (include in server-side requests only — don't expose to frontend)
- Pixabay Music API is separate and requires additional approval
- CC0 content can be used for any purpose, but generated derivatives must not be claimed as original CC0

---

### 7.3 Unsplash

**What It Provides:** High-quality stock photography, developer-friendly API

| Parameter | Value |
|---|---|
| API Base | `https://api.unsplash.com/` |
| SDK | `unsplash-js` npm package |
| Rate Limits | Demo: 50 requests/hour; Production: 5,000 requests/hour (requires approval) |
| License | Unsplash License (free for commercial use; no reselling photos themselves) |

**Phase Priority:** Phase 1 Nice-to-Have (photos only — no video)

**Gotchas:**
- Must trigger a download endpoint call (`/photos/{id}/download`) when using a photo — required by Unsplash API terms (they track usage stats)
- Must apply for production access once app is ready; demo limits are very restrictive

---

### 7.4 Storyblocks

**What It Provides:** Subscription-based stock video, audio, images — very large library, high quality

| Parameter | Value |
|---|---|
| API | Storyblocks API (requires active subscription) |
| Pricing | ~$149–$349/month subscription |
| License | Subscription license — perpetual for content downloaded during subscription |

**Phase Priority:** Phase 2 Only

**Gotchas:**
- Subscription license means content downloaded during subscription can be used perpetually — but downloading content then canceling for future use is a TOS violation
- API access requires a separate developer program enrollment
- Best for operators who need consistent B-roll quality at scale

---

## 8. Video Generation

### 8.1 Runway ML

**What It Provides:** AI video generation (text-to-video, image-to-video), Gen-3 Alpha

| Parameter | Value |
|---|---|
| API Base | `https://api.dev.runwayml.com/v1/` |
| SDK | `@runwayml/sdk` npm package |
| Auth | API Key |
| Pricing | ~$0.05 per second of generated video (Gen-3 Alpha Turbo) |
| Output Quality | Up to 1280x768, up to 10 seconds per generation |

**Phase Priority:** Phase 1 Nice-to-Have, Phase 2 Must-Have for AI-generated B-roll

**Gotchas:**
- Generation is async — submit job, poll for completion (typically 30–120 seconds)
- Video generation is expensive at scale; reserve for hero shots and key scenes only
- Runway imposes content policies — violent, NSFW, and certain public figures are blocked
- Output video must be watermark-free on paid plans; verify plan tier

---

### 8.2 Stability AI Video (Stable Video Diffusion)

**What It Provides:** Image-to-video generation, open-source alternative with self-hosting option

| Parameter | Value |
|---|---|
| API | Stability AI Platform API |
| Self-Hosted | `stabilityai/stable-video-diffusion-img2vid-xt` on Hugging Face |
| Pricing (API) | ~$0.20–$0.30 per video generation |

**Phase Priority:** Phase 1 Nice-to-Have

**Gotchas:**
- SVD requires an initial image as input (image-to-video, not text-to-video)
- Self-hosted version requires high VRAM GPU (24+ GB for reliable generation)
- Output is typically 14–25 frames at 6–8 fps — stitch multiple clips for longer sequences

---

### 8.3 Kling

**What It Provides:** Chinese-developed text-to-video and image-to-video AI, competitive quality

| Parameter | Value |
|---|---|
| API | Kling API (via third-party wrappers or direct Kuaishou access) |
| Access | International access via API aggregators |

**Phase Priority:** Phase 2 Only

**Gotchas:**
- API availability outside China may be unreliable; evaluate at Phase 2 based on market stability
- Content policies differ from Western providers

---

### 8.4 Local FFmpeg

**What It Provides:** Video composition, audio mixing, subtitle rendering, format conversion — the backbone of the media pipeline

| Parameter | Value |
|---|---|
| Binary | `ffmpeg` (system-installed or via `@ffmpeg-installer/ffmpeg` npm) |
| Node.js Wrapper | `fluent-ffmpeg` npm package |
| Cost | Free (open source) |

**Phase Priority:** Phase 1 Must-Have (required for all video assembly)

**Key Operations:**
- Concatenate video clips: `concat` filter
- Overlay text/subtitles: `subtitles` filter (ASS/SRT) or `drawtext`
- Mix audio tracks: `amix` filter
- Resize/crop: `scale`, `crop` filters
- Add background music: `amix` with volume normalization
- Generate thumbnail: seek to timestamp and extract frame

**Gotchas:**
- FFmpeg must be available in the worker Docker image — add to Dockerfile explicitly
- Complex filter graphs can be fragile — unit test filter strings with known input/output
- Video processing is CPU-intensive — run on dedicated worker instances, not API servers
- Temporary files accumulate during processing — implement cleanup in job `finally` blocks
- GPU acceleration available (`h264_nvenc`, `h264_videotoolbox`) but complicates portability; use CPU for Phase 1

---

## 9. Analytics Aggregation

### Strategy
- **Phase 1:** Scheduled polling via BullMQ `analytics-ingest` queue (every 6 hours per channel)
- **Phase 2:** Supplement with platform webhooks where available

### YouTube Analytics API
- Endpoint: `https://youtubeanalytics.googleapis.com/v2/reports`
- Required scope: `yt-analytics.readonly`
- Metrics available: `views`, `estimatedMinutesWatched`, `averageViewDuration`, `subscribersGained`, `likes`, `comments`, `shares`, `impressions`, `impressionClickThroughRate`
- Dimensions: `video`, `day`, `country`, `ageGroup`, `gender`
- Data latency: 48–72 hours (analytics are not real-time)
- Quota: 1 unit per query — analytics queries are cheap

### TikTok Analytics
- Endpoint: `GET /v2/video/list/` and `GET /v2/research/video/query/`
- Metrics: views, likes, comments, shares, average_watch_time, full_video_watched_rate
- Data latency: 24 hours
- Phase 1: Nice-to-Have; Phase 2: Must-Have

### Meta/Instagram Insights
- Endpoint: `GET /{media-id}/insights?metric=reach,impressions,engagement`
- Metrics: `reach`, `impressions`, `saved`, `video_views`, `plays`
- Data latency: 24 hours

### Internal Polling Architecture
```
analytics-ingest queue
  → job per channel per platform
  → fetch metrics for all videos published in last 30 days
  → upsert into video_analytics table
  → trigger anomaly detection (if view spike > 3x baseline)
  → update channel performance aggregate
```

---

## 10. Billing (Phase 2) — Stripe

### What It Provides
- Subscription management (recurring plans)
- Metered/usage-based billing
- Customer portal (self-service plan management)
- Payment methods (cards, ACH, SEPA)
- Tax calculation (Stripe Tax)
- Revenue reporting

### SDK
- `stripe` npm package (official)
- Stripe Dashboard for configuration

### Key Concepts for Faceless Viral OS
- **Products:** FREE, ECONOMICAL, OPTIMIZED, PREMIUM, ULTRA tiers
- **Prices:** Monthly and annual variants per product
- **Usage Records:** Report AI token spend, video renders, storage for metered billing
- **Meters:** Create a Stripe Meter for each billable unit (AI credits, video renders)
- **Customer Portal:** Allow SaaS users to upgrade/downgrade/cancel

### Webhook Events to Handle
| Event | Action |
|---|---|
| `customer.subscription.created` | Provision workspace, set tier |
| `customer.subscription.updated` | Adjust tier, update DB |
| `customer.subscription.deleted` | Downgrade to FREE, disable features |
| `invoice.payment_succeeded` | Record payment, reset usage counters |
| `invoice.payment_failed` | Send dunning email, soft-disable features |

### Phase Priority: Phase 2 Only

### Gotchas
- Always verify webhook signatures using `stripe.webhooks.constructEvent()` — never trust webhook payloads without signature verification
- Idempotency keys are required on all write operations to prevent duplicate charges
- Stripe Tax requires explicit registration per jurisdiction — consult a tax advisor before enabling
- Test mode and live mode keys are different; never mix them

---

## 11. Alerts

### 11.1 Slack Webhooks

| Parameter | Value |
|---|---|
| Integration Type | Incoming Webhook |
| Setup | Create Slack App → add Incoming Webhooks → get webhook URL |
| SDK | Native `fetch` (POST JSON payload) |
| Rate Limits | 1 message/second per webhook |

**Alert Categories:**
- Job failures (render failed, publish failed)
- Budget threshold breaches (>80% of daily budget consumed)
- Channel anomalies (view spike, sudden drop)
- System errors (queue depth > threshold, worker down)

**Message Format:** Use Slack Block Kit for structured alerts (not just plain text)

**Phase Priority:** Phase 1 Must-Have

**Gotchas:**
- Webhook URLs are sensitive — treat as secrets, rotate if exposed
- Do not send more than 1 message/second or Slack will rate-limit and drop messages; implement a debounce/queue for alerts

---

### 11.2 Resend (Transactional Email)

| Parameter | Value |
|---|---|
| API Base | `https://api.resend.com/` |
| SDK | `resend` npm package |
| Auth | API Key |
| Free Tier | 3,000 emails/month, 100/day |

**Use Cases (Phase 1):** Internal operator alerts (publish confirmations, error notifications)
**Use Cases (Phase 2):** User onboarding, billing receipts, weekly analytics digests

**Phase Priority:** Phase 1 Nice-to-Have; Phase 2 Must-Have

**Gotchas:**
- Must verify sending domain via DNS records before production use
- For Phase 2 marketing emails, use a dedicated sending domain separate from transactional emails (different reputation)

---

### 11.3 PagerDuty

| Parameter | Value |
|---|---|
| SDK | `node-pagerduty` or REST API |
| Use Case | On-call alerting for critical system failures |

**Phase Priority:** Phase 2 Only

---

## 12. Outbound Webhook System

### What It Provides
- Allows operators to subscribe to platform events (video published, analytics updated, job failed)
- Enables integration with Zapier, Make.com, n8n, custom automation pipelines

### Architecture
```
Event emitted internally
  → EventEmitter or BullMQ event
  → WebhookDispatchJob created
  → POST to subscriber URL with HMAC signature
  → Retry with exponential backoff on failure (3 attempts)
  → Log delivery attempt in webhook_deliveries table
```

### Security
- HMAC-SHA256 signature on each outbound request (`X-Webhook-Signature` header)
- Shared secret per webhook subscription, stored encrypted
- Payload includes `event_id`, `timestamp`, `event_type`, `data`

### Phase Priority: Phase 1 Nice-to-Have; Phase 2 Must-Have for partner integrations

---

## Appendix A: Integration Health Monitoring

All integrations must expose health metrics:
- Request success rate (last 1 hour)
- P95 latency
- Current quota usage (where applicable)
- Last successful request timestamp

Expose these via internal `/internal/health/integrations` endpoint (not public).

## Appendix B: Secrets Management

All API keys, OAuth tokens, and webhook secrets are managed as follows:
- **Phase 1:** Environment variables (`.env` files, never committed to git) + encrypted columns in PostgreSQL for per-channel OAuth tokens
- **Phase 2:** HashiCorp Vault or AWS Secrets Manager for centralized secrets management with audit logging

Never log API keys. Never store them in plaintext in the database. Rotate them on a schedule and on any suspected compromise.
