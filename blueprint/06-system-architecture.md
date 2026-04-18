# 06 — System Architecture

**Faceless Viral OS | Founding Blueprint**
Version: 1.0 | Status: Engineering Reference

---

## 1. Architecture Overview

Faceless Viral OS is a multi-layer, event-driven platform built around a monorepo. All components share type definitions, utilities, and configuration through Turborepo workspaces. The system is designed for Phase 1 as a private single-operator tool and is architecturally pre-structured for Phase 2 multi-tenant SaaS expansion.

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│   Next.js 14 App Router (SSR + RSC + Client Components)            │
│   Dashboard / Studio / Publisher / Analytics / Settings             │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ HTTPS / REST + WebSocket
┌─────────────────────────▼───────────────────────────────────────────┐
│                        API GATEWAY LAYER                            │
│   Fastify + Node.js + TypeScript                                    │
│   Auth Middleware → Rate Limiter → Request Validator → Router       │
└────┬──────────────┬──────────────┬──────────────┬───────────────────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│ Content │  │  Media   │  │Publisher │  │  Analytics   │
│ Service │  │ Service  │  │ Service  │  │   Service    │
└────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘
     │             │             │               │
     └─────────────┴─────────────┴───────────────┘
                          │
                ┌─────────▼──────────┐
                │   MODEL ROUTING    │
                │      ENGINE        │
                │ (Tier + Task → AI) │
                └─────────┬──────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │  OpenAI    │  │ Anthropic  │  │  Groq /    │
   │ Gemini API │  │ Claude API │  │  Mistral   │
   └────────────┘  └────────────┘  └────────────┘
          │               │               │
          └───────────────┴───────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                        QUEUE LAYER                                  │
│   BullMQ + Redis                                                    │
│   content-queue / media-queue / publish-queue / analytics-queue     │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│                      STORAGE LAYER                                  │
│   PostgreSQL (via Prisma ORM) + Cloudflare R2 (S3-compatible)       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Layer (Next.js 14)

### Framework Decisions
- **App Router** with React Server Components (RSC) for all data-heavy pages
- Client components scoped to interactive widgets (video player, workflow builder, real-time status)
- Server Actions used for form submissions and quick mutations
- `nuqs` for URL-based state (filters, pagination, tab state)
- Zustand for client-side ephemeral state (editor state, upload progress)
- SWR or TanStack Query for data fetching with background revalidation

### Key Page Routes

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── callback/page.tsx
├── (dashboard)/
│   ├── layout.tsx              # Shell with sidebar nav
│   ├── page.tsx                # Command center / overview
│   ├── channels/
│   │   ├── page.tsx            # Channel list
│   │   └── [channelId]/page.tsx
│   ├── studio/
│   │   ├── page.tsx            # Content idea board
│   │   ├── [contentId]/
│   │   │   ├── script/page.tsx
│   │   │   ├── media/page.tsx
│   │   │   └── review/page.tsx
│   ├── publisher/
│   │   ├── calendar/page.tsx
│   │   └── queue/page.tsx
│   ├── analytics/
│   │   ├── page.tsx
│   │   └── [channelId]/page.tsx
│   ├── autopilot/page.tsx
│   └── settings/
│       ├── billing/page.tsx
│       ├── integrations/page.tsx
│       └── tier/page.tsx
```

### State Management Strategy

| Layer | Tool | What It Holds |
|---|---|---|
| Server | RSC + Prisma | Persistent DB state |
| URL | nuqs | Filters, pagination, selected tab |
| Client (global) | Zustand | Auth session, tier, notifications |
| Client (local) | React state | Form inputs, modal open/close |
| Remote cache | TanStack Query | API responses with stale-while-revalidate |

---

## 3. Backend / API Layer (Fastify)

### Why Fastify
- Schema-first with native JSON Schema validation (no extra middleware needed)
- 2–3x throughput vs Express in benchmarks
- Plugin-based architecture maps cleanly to domain services
- First-class TypeScript support via `@fastify/type-provider-typebox`

### Route Structure

```
/api/v1/
├── auth/
│   ├── POST /login
│   ├── POST /refresh
│   └── POST /logout
├── channels/
│   ├── GET /
│   ├── POST /
│   └── /:channelId/
│       ├── GET /
│       ├── PATCH /
│       └── DELETE /
├── content/
│   ├── POST /ideas/generate
│   ├── POST /scripts/generate
│   ├── GET  /scripts/:id
│   └── POST /scripts/:id/translate
├── media/
│   ├── POST /tts/generate
│   ├── POST /images/generate
│   ├── POST /video/assemble
│   └── GET  /jobs/:jobId/status
├── publish/
│   ├── POST /schedule
│   ├── GET  /queue
│   └── DELETE /queue/:id
├── analytics/
│   ├── GET /overview
│   ├── GET /channels/:channelId
│   └── POST /ingest (internal)
└── system/
    ├── GET /health
    └── GET /tier/status
```

### Middleware Stack (applied in order)

```typescript
// Registration order matters in Fastify
fastify.register(helmet)                  // Security headers
fastify.register(cors, corsOptions)       // CORS policy
fastify.register(rateLimit, rateLimits)   // Per-IP + per-key limits
fastify.register(jwtPlugin)               // JWT decode + attach user
fastify.register(tierPlugin)              // Attach tier to request context
fastify.register(requestLogger)           // Structured JSON logs → OTEL
fastify.register(errorHandler)            // Normalized error responses
```

### Request Context Object

Every authenticated request carries:

```typescript
interface RequestContext {
  userId: string;
  channelId?: string;
  tier: Tier;               // FREE | ECONOMICAL | OPTIMIZED | PREMIUM | ULTRA
  budgetRemaining: number;  // Remaining $ budget for this billing period
  apiKey?: string;          // If request is from automation
  traceId: string;          // OTEL trace propagation
}
```

---

## 4. Workflow Orchestration (BullMQ)

### Queue Topology

```
Redis
├── bull:content-queue      (priority: low)
│   ├── idea-generation
│   ├── script-generation
│   └── translation
├── bull:media-queue        (priority: high)
│   ├── tts-generation
│   ├── image-generation
│   ├── video-assembly
│   └── render-final
├── bull:publish-queue      (priority: critical)
│   ├── youtube-upload
│   ├── tiktok-upload
│   └── instagram-upload
├── bull:analytics-queue    (priority: low)
│   ├── metrics-ingest
│   └── report-aggregation
└── bull:system-queue       (priority: low)
    ├── provider-health-check
    └── budget-reconciliation
```

### Job Schema (base)

```typescript
interface BaseJob {
  jobId: string;
  userId: string;
  channelId: string;
  tier: Tier;
  contentId?: string;
  traceId: string;
  createdAt: string;
  maxRetries: number;
  timeoutMs: number;
}
```

### Retry Strategy by Queue

| Queue | Retries | Backoff | Timeout |
|---|---|---|---|
| content-queue | 3 | exponential (2s, 4s, 8s) | 120s |
| media-queue | 5 | exponential (5s, 10s, 20s) | 600s |
| publish-queue | 8 | fixed (30s) | 60s |
| analytics-queue | 2 | fixed (10s) | 30s |
| system-queue | 1 | none | 10s |

### Job Lifecycle

```
WAITING → ACTIVE → (COMPLETED | FAILED → RETRYING → FAILED_PERMANENTLY)
                  ↘ STALLED (worker crash) → back to WAITING
```

---

## 5. Provider Abstraction Layer

All external AI, TTS, and media providers are accessed through a unified interface. No route handler ever calls a provider SDK directly.

### Provider Interface

```typescript
interface AIProvider {
  id: string;
  name: string;
  supportedTasks: TaskType[];
  generate(request: ProviderRequest): Promise<ProviderResponse>;
  estimateCost(request: ProviderRequest): Promise<CostEstimate>;
  healthCheck(): Promise<HealthStatus>;
}
```

### Concrete Implementations

```
packages/providers/
├── ai/
│   ├── openai.provider.ts
│   ├── anthropic.provider.ts
│   ├── groq.provider.ts
│   ├── gemini.provider.ts
│   └── mistral.provider.ts
├── tts/
│   ├── elevenlabs.provider.ts
│   ├── openai-tts.provider.ts
│   └── coqui.provider.ts
├── image/
│   ├── dalle.provider.ts
│   ├── stability.provider.ts
│   └── flux.provider.ts
└── video/
    ├── runway.provider.ts
    └── kling.provider.ts
```

### Provider Registry

All providers self-register at startup:

```typescript
ProviderRegistry.register({
  provider: new OpenAIProvider(config.openaiKey),
  tasks: ['script-writing', 'title-generation', 'translation', 'niche-research'],
  tier: ['PREMIUM', 'ULTRA'],
  costPer1kTokens: 0.005,
  qualityScore: 9,
});
```

---

## 6. Model Routing Layer

Sits between the API/queue layer and provider implementations. Accepts a `RoutingRequest` (tier + task + context) and returns a ranked `ProviderSelection` with fallback chain. See `09-model-routing-engine.md` for full specification.

```
API Request
    │
    ▼
ModelRouter.selectProvider(request)
    │
    ├── Check provider health registry
    ├── Apply tier policy rules
    ├── Score candidates (cost × quality × latency)
    ├── Build fallback chain
    │
    ▼
ProviderSelection { primary, fallbacks[], estimatedCost }
    │
    ▼
ProviderExecutor → retries → fallback promotion → error
```

---

## 7. Media Pipeline

### Pipeline Stages

```
Content Script
     │
     ▼
[TTS Job] ─────────────────────────────────────────────────────────┐
  Provider: ElevenLabs / OpenAI TTS / Coqui                        │
  Output: audio.mp3 → R2: /media/{contentId}/audio/raw.mp3         │
     │                                                              │
     ▼                                                              │
[Image Generation Job]                                             │
  Provider: DALL-E / Stability AI / Flux                           │
  Output: frame_{n}.png → R2: /media/{contentId}/frames/           │
     │                                                              │
     ▼                                                              │
[Video Assembly Job] ◄─────────────────────────────────────────────┘
  Tool: Remotion (programmatic React → video) or ffmpeg
  Combines: audio + frames + captions + music
  Output: raw_video.mp4 → R2: /media/{contentId}/video/raw.mp4
     │
     ▼
[Render & Transcode Job]
  Tool: ffmpeg (via worker subprocess)
  Profiles: YouTube (1080p60), TikTok (1080x1920 9:16), Instagram (square + reel)
  Output: {platform}_final.mp4 → R2: /media/{contentId}/final/
     │
     ▼
[Thumbnail Generation]
  Provider: DALL-E / Stability AI
  Output: thumbnail.jpg → R2: /media/{contentId}/thumbnails/
```

### Remotion vs ffmpeg Decision

| Use Case | Tool |
|---|---|
| Animated text overlays, motion graphics, data viz | Remotion |
| Simple image slideshows, audio sync, fast transcoding | ffmpeg |
| Mixing audio tracks, adding SFX | ffmpeg |
| Custom React-based lower thirds or branding | Remotion |

---

## 8. Publishing Layer

### Platform Connectors

Each platform connector implements `PlatformPublisher`:

```typescript
interface PlatformPublisher {
  platform: Platform;
  authenticate(credentials: OAuthCredentials): Promise<void>;
  upload(media: MediaAsset, metadata: PublishMetadata): Promise<PublishResult>;
  schedulePost(post: ScheduledPost): Promise<ScheduledResult>;
  getPostStatus(postId: string): Promise<PostStatus>;
}
```

### Platform-Specific Notes

**YouTube Data API v3**
- Upload via resumable upload (chunked for large files)
- Quota: 10,000 units/day per project — quota management built into publish queue
- Metadata: title, description, tags, category, thumbnail, privacyStatus

**TikTok Content Posting API**
- Direct post or creator tool handoff
- Video spec: H.264, AAC, max 287.6MB, max 10min
- Rate limit: 3 posts/day on basic access

**Instagram Graph API**
- Two-phase: media container creation → publish
- Reels require video + audio
- Rate limit: 50 API calls per user per hour

### Publish Job Flow

```
ScheduledPost record created (DB)
    │
    ▼
Publish queue job fires at scheduled_at time
    │
    ▼
PlatformPublisher.upload()
    │
    ├── Success → update PostRecord.status = PUBLISHED, store platform post ID
    └── Failure → retry (up to 8x) → alert operator
```

---

## 9. Analytics Layer

### Ingestion

Two ingestion paths:
1. **Pull (scheduled)** — cron job every 6h fetches platform metrics via API (views, likes, shares, CTR, revenue)
2. **Push (webhook)** — YouTube/Instagram send event webhooks for real-time updates

### Storage Schema (summary)

```
analytics_events        — raw event log (time-series)
analytics_daily_roll    — daily aggregated per content/channel
analytics_channel_stats — channel-level KPIs (indexed)
analytics_snapshots     — weekly snapshots for trend comparison
```

### Aggregation Pipeline

```
Raw Events (analytics_events)
    │
    ▼ (BullMQ: analytics-queue every 1h)
Daily Rollup (analytics_daily_roll)
    │
    ▼ (nightly cron)
Channel Stats Update (analytics_channel_stats)
    │
    ▼ (AI summarization job, weekly)
Performance Insights → stored as text blobs → surfaced in dashboard
```

---

## 10. Auth System

### Phase 1: JWT

```
Login Request
    │
    ▼
Fastify /auth/login
    │
    ▼
Validate credentials (bcrypt hash in DB)
    │
    ▼
Sign JWT: { userId, tier, exp: 15min }
Sign Refresh Token: { userId, exp: 30d } → stored in HttpOnly cookie
    │
    ▼
Return access token in response body
```

Token validation is a Fastify `preHandler` hook. Refresh token rotation invalidates previous tokens by storing a token family ID in Redis.

### Phase 2: Auth0

Auth0 replaces custom JWT with:
- Universal Login for tenant onboarding
- Organizations feature for workspace isolation
- Machine-to-machine tokens for API keys
- RBAC roles: `operator`, `editor`, `viewer`, `billing-admin`

Migration path: Auth0 issues JWTs with same `userId` claim structure, so downstream services need no changes.

---

## 11. Storage (Cloudflare R2)

### Bucket Structure

```
r2://faceless-viral-os/
├── media/
│   └── {contentId}/
│       ├── audio/
│       │   ├── raw.mp3
│       │   └── normalized.mp3
│       ├── frames/
│       │   └── frame_{n}.png
│       ├── video/
│       │   ├── raw.mp4
│       │   └── final/
│       │       ├── youtube_1080p60.mp4
│       │       ├── tiktok_9x16.mp4
│       │       └── instagram_square.mp4
│       └── thumbnails/
│           └── thumbnail.jpg
├── assets/
│   └── {channelId}/
│       ├── logo.png
│       ├── watermark.png
│       └── intro.mp4
├── exports/
│   └── {userId}/
│       └── {date}/report.pdf
└── tmp/
    └── {jobId}/   ← cleaned up after job completes
```

### CDN Strategy

R2 public buckets are fronted by Cloudflare CDN. Media URLs follow the pattern:
`https://cdn.facelessviralos.com/media/{contentId}/final/youtube_1080p60.mp4`

Signed URLs (1h TTL) are used for private/in-progress assets during rendering.

---

## 12. Observability (OpenTelemetry + Grafana)

### Signal Collection

| Signal | Tool | Destination |
|---|---|---|
| Traces | OTEL SDK → OTEL Collector | Tempo (Grafana) |
| Metrics | OTEL SDK + Prometheus scrape | Prometheus → Grafana |
| Logs | Pino JSON → OTEL Collector | Loki (Grafana) |

### Instrumented Touch Points

- Every Fastify request (auto-instrumented via `@opentelemetry/instrumentation-fastify`)
- Every BullMQ job start/complete/fail
- Every provider call (wrapped in span with `provider.name`, `task.type`, `token.count`, `cost.usd`)
- Every DB query (auto-instrumented via Prisma OTEL integration)
- Every R2 operation

### Key Dashboards

1. **Request Rate / Error Rate / Latency (RED)** — per endpoint
2. **Queue Depth & Job Throughput** — per queue
3. **Provider Health & Cost** — cost by provider per day, error rate per provider
4. **Media Pipeline** — job success rate, avg render time by content type
5. **Publishing** — upload success rate per platform, quota consumption

### Alerting Rules

- P95 API latency > 3s → PagerDuty
- Any queue depth > 100 jobs → Slack alert
- Provider error rate > 10% over 5min → auto-failover + alert
- Daily AI spend > 80% of budget → alert + tier downgrade consideration

---

## 13. Future SaaS Control Plane (Phase 2)

Phase 2 adds a **Workspace Layer** sitting above all existing services. No existing services change interfaces — a tenant context is injected into the request context object.

### Additions

| Component | Purpose |
|---|---|
| Tenant Service | Create/manage workspaces, sub-domains, isolation |
| Billing Service | Stripe integration, subscription state, invoice generation |
| Quota Service | Per-tenant rate limits, usage tracking, enforcement |
| Role Service | RBAC within workspace (owner, editor, viewer) |
| Audit Log Service | Immutable action log per tenant |
| SaaS Dashboard | Operator admin panel, customer management |

### Tenant Isolation Model

- DB: Row-Level Security (RLS) in PostgreSQL with `tenant_id` on all tables
- Storage: Per-tenant R2 prefix (`r2://.../tenants/{tenantId}/...`)
- Queue: Per-tenant job namespacing
- Redis: Per-tenant key prefixes

---

## 14. Stack Recommendation with Tradeoffs

| Layer | Chosen | Alternative Considered | Reason Chosen |
|---|---|---|---|
| Frontend | Next.js 14 | Remix, SvelteKit | Ecosystem maturity, RSC for heavy data pages, Vercel deployment |
| API | Fastify | Express, Hono, NestJS | Schema validation built-in, high throughput, plugin model |
| ORM | Prisma | Drizzle, Kysely | Type safety, migration tooling, Prisma Studio for inspection |
| Queue | BullMQ | Inngest, Temporal | Redis-native, mature, great for long media jobs |
| DB | PostgreSQL | PlanetScale, Supabase | Full SQL power, RLS for Phase 2, self-hostable |
| Storage | Cloudflare R2 | AWS S3, Backblaze | Zero egress fees, S3-compatible API, CDN included |
| Auth (P1) | JWT (custom) | Auth0, Clerk | Zero external dependency for Phase 1, trivial migration |
| Auth (P2) | Auth0 | Clerk, Supabase Auth | Organizations feature, M2M tokens, mature RBAC |
| Monorepo | Turborepo + pnpm | Nx, Lerna | Fast caching, minimal config, pnpm saves disk |
| Observability | OTEL + Grafana | Datadog, New Relic | Open source, no vendor lock-in, full control |

---

## 15. What We Are NOT Using and Why

| Technology | Why Not |
|---|---|
| **LangChain** | Abstraction overhead, opaque behavior, harder to debug provider calls, no advantage when we control our own routing engine |
| **Firebase** | No PostgreSQL-grade SQL, vendor lock-in, poor for complex relational queries, no self-host path |
| **Vercel AI SDK** | Useful for small apps, but we need custom routing logic, cost tracking, and tier governance that SDK abstracts away |
| **Supabase** | Good starting point, but RLS limitations at scale and inability to run custom Postgres extensions without self-hosting |
| **GraphQL** | REST is sufficient for this domain, GraphQL adds resolver complexity and N+1 risk without meaningful client benefit here |
| **Kubernetes (Phase 1)** | Over-engineered for Phase 1; Railway or Fly.io provides sufficient orchestration with Docker |
| **Kafka** | BullMQ on Redis covers all queue needs; Kafka introduces operational complexity only needed at 10x scale |
| **Pinecone / Vector DB** | Considered for semantic search, deferred to Phase 2; current needs served by PostgreSQL full-text search |
| **Prisma Pulse** | Real-time CDC is not needed in Phase 1; WebSocket for job status is sufficient |

---

*This document is part of the Faceless Viral OS founding blueprint series. Cross-reference: `07-core-modules.md`, `08-tier-system.md`, `09-model-routing-engine.md`.*
