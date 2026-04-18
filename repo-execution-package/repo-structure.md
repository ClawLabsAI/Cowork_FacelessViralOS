# Faceless Viral OS — Repository Structure

## Overview

Faceless Viral OS is a monorepo managed with **Turborepo** and **pnpm workspaces**. The root workspace coordinates builds, linting, testing, and type-checking across all apps and packages with full incremental caching.

---

## Dependency Rules (Import Graph)

The following rules are enforced via ESLint `no-restricted-imports` and Turborepo pipeline ordering. Violations fail CI.

```
apps/*         → can import from packages/*
packages/db    → no imports from other internal packages (leaf node)
packages/core  → no imports from other internal packages (leaf node)
packages/ai-router   → imports: packages/core, packages/db
packages/cost-engine → imports: packages/core, packages/db, packages/ai-router
packages/media-pipeline → imports: packages/core, packages/db, packages/ai-router, packages/cost-engine
packages/publisher   → imports: packages/core, packages/db
apps/api       → imports: all packages
apps/worker    → imports: all packages
apps/web       → imports: packages/core only (NO direct db/ai-router access)
```

**Golden Rule:** `packages/core` and `packages/db` are the foundation. Nothing in `packages/` imports from `apps/`. The web app never imports db or ai-router directly — it communicates only via the API.

---

## Root

```
/
├── package.json                  # Root workspace manifest; defines pnpm workspaces glob
├── pnpm-workspace.yaml           # Declares workspace: ["apps/*", "packages/*"]
├── turbo.json                    # Turborepo pipeline: build, test, lint, typecheck tasks + caching config
├── .env.example                  # All environment variable keys with placeholder values (no secrets)
├── .gitignore                    # Ignores node_modules, .env, dist, .turbo, .next, prisma/migrations auto-gen
├── .eslintrc.js                  # Root ESLint config extending per-package configs; enforces import rules
├── .prettierrc                   # Shared Prettier config (2-space indent, single quotes, trailing commas)
├── tsconfig.base.json            # Shared TypeScript base config: strict, ESNext, path aliases
├── docker-compose.yml            # Local dev services: PostgreSQL 16, Redis 7, Mailhog
├── docker-compose.test.yml       # Isolated test DB + Redis for integration tests
├── Makefile                      # Developer shortcuts: make dev, make migrate, make seed, make test
└── README.md                     # Project overview, quickstart, environment setup instructions
```

---

## apps/api — Fastify REST API

```
apps/api/
├── package.json                  # Dependencies: fastify, @fastify/jwt, zod, @prisma/client, bullmq
├── tsconfig.json                 # Extends tsconfig.base.json; outputs to dist/
├── src/
│   ├── main.ts                   # Entry point: builds app, registers plugins, starts server on PORT
│   ├── app.ts                    # Fastify app factory (exported for testing); registers all plugins + routes
│   ├── config.ts                 # Typed config object parsed from process.env using Zod; fails fast on missing vars
│   │
│   ├── plugins/
│   │   ├── auth.ts               # @fastify/jwt plugin registration; decorates request with jwtVerify shorthand
│   │   ├── cors.ts               # @fastify/cors plugin; origins from config
│   │   ├── rate-limit.ts         # @fastify/rate-limit plugin; per-route overrides via route options
│   │   ├── sensible.ts           # @fastify/sensible plugin; adds httpErrors helpers to all handlers
│   │   ├── telemetry.ts          # OpenTelemetry SDK init; patches Fastify for trace propagation
│   │   └── error-handler.ts      # Global error handler; maps Zod errors → 422, auth errors → 401, etc.
│   │
│   ├── middleware/
│   │   ├── authenticate.ts       # Prehandler: verifies JWT, attaches req.user (userId, workspaceId, role)
│   │   ├── workspace-guard.ts    # Prehandler: validates user is a member of the target workspaceId
│   │   └── budget-guard.ts       # Prehandler: calls cost-engine BudgetGuard before AI-consuming routes
│   │
│   ├── routes/
│   │   ├── index.ts              # Registers all route modules under /api/v1 prefix
│   │   ├── auth/
│   │   │   ├── login.ts          # POST /auth/login — validates credentials, returns access + refresh tokens
│   │   │   ├── refresh.ts        # POST /auth/refresh — rotates refresh token, returns new access token
│   │   │   └── logout.ts         # POST /auth/logout — invalidates refresh token in DB
│   │   ├── channels/
│   │   │   ├── list.ts           # GET /channels — paginated list for workspace
│   │   │   ├── create.ts         # POST /channels — creates channel + enqueues niche-research job
│   │   │   ├── get.ts            # GET /channels/:id — returns channel with latest insight
│   │   │   └── update.ts         # PATCH /channels/:id — partial update with Zod validation
│   │   ├── scripts/
│   │   │   ├── generate.ts       # POST /scripts/generate — validates budget, enqueues script-generation job
│   │   │   ├── get.ts            # GET /scripts/:id — returns script with scenes and voice metadata
│   │   │   ├── list.ts           # GET /scripts — paginated list filtered by channel/status
│   │   │   └── approve.ts        # PATCH /scripts/:id/approve — updates status, triggers TTS + scene jobs
│   │   ├── ideas/
│   │   │   ├── generate-batch.ts # POST /ideas/generate-batch — enqueues niche-research with idea generation
│   │   │   ├── list.ts           # GET /ideas — filtered list by channel, status, niche
│   │   │   └── update-status.ts  # PATCH /ideas/:id/status — approve/reject/archive an idea
│   │   ├── videos/
│   │   │   ├── render.ts         # POST /videos/render — validates script approved, enqueues video-render
│   │   │   ├── get.ts            # GET /videos/:id — returns video with variants and publish jobs
│   │   │   └── status.ts         # GET /videos/:id/status — lightweight status polling endpoint
│   │   ├── publish-jobs/
│   │   │   ├── create.ts         # POST /publish-jobs — schedule or immediate publish for a video variant
│   │   │   ├── list.ts           # GET /publish-jobs — list with filters (status, platform, channel)
│   │   │   └── cancel.ts         # PATCH /publish-jobs/:id/cancel — cancels pending or scheduled job
│   │   ├── analytics/
│   │   │   ├── channel-summary.ts # GET /analytics/channels/:id/summary — aggregated KPIs
│   │   │   └── snapshots.ts      # GET /analytics/channels/:id/snapshots — time-series data
│   │   ├── cost/
│   │   │   ├── summary.ts        # GET /cost/summary — total spend by period and workspace
│   │   │   ├── ledger.ts         # GET /cost/ledger — paginated cost ledger entries
│   │   │   └── budget.ts         # GET /cost/budget — current budget state and utilization %
│   │   └── providers/
│   │       └── health.ts         # GET /providers/health — current provider registry health snapshot
│   │
│   ├── schemas/                  # Zod schemas for request/response validation (shared with types)
│   │   ├── auth.schema.ts
│   │   ├── channel.schema.ts
│   │   ├── script.schema.ts
│   │   ├── idea.schema.ts
│   │   ├── video.schema.ts
│   │   ├── publish.schema.ts
│   │   ├── analytics.schema.ts
│   │   ├── cost.schema.ts
│   │   └── provider.schema.ts
│   │
│   └── lib/
│       ├── queue.ts              # BullMQ queue instances (content, media, publish, analytics, research, governance)
│       └── prisma.ts             # Singleton Prisma client for the API process
│
└── test/
    ├── integration/              # Full HTTP integration tests using fastify.inject()
    └── unit/                     # Unit tests for route handlers in isolation
```

---

## apps/web — Next.js 14 App Router

```
apps/web/
├── package.json                  # Dependencies: next, react, tailwindcss, @tanstack/react-query, zustand
├── tsconfig.json                 # Extends tsconfig.base.json; includes Next.js types
├── next.config.js                # Next.js config: transpilePackages for internal packages, image domains
├── tailwind.config.ts            # Tailwind config: content paths, custom design tokens, dark mode
├── src/
│   ├── app/                      # Next.js App Router root
│   │   ├── layout.tsx            # Root layout: fonts, providers (ReactQuery, ThemeProvider, Auth)
│   │   ├── page.tsx              # Landing/redirect page: redirects authed users to /dashboard
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx    # Login form page
│   │   │   └── layout.tsx        # Auth layout: centered card, no sidebar
│   │   ├── (app)/
│   │   │   ├── layout.tsx        # App layout: sidebar navigation, header, workspace context
│   │   │   ├── dashboard/page.tsx # Overview: cost summary, channel health, recent videos
│   │   │   ├── channels/
│   │   │   │   ├── page.tsx      # Channel list with status badges
│   │   │   │   └── [id]/page.tsx # Channel detail: ideas, scripts, analytics tabs
│   │   │   ├── scripts/
│   │   │   │   ├── page.tsx      # Script list with approval workflow
│   │   │   │   └── [id]/page.tsx # Script editor + approval UI
│   │   │   ├── videos/
│   │   │   │   ├── page.tsx      # Video library with render status
│   │   │   │   └── [id]/page.tsx # Video detail: preview, variants, publish actions
│   │   │   ├── publish/page.tsx  # Publish queue: scheduled jobs, calendar view
│   │   │   ├── analytics/page.tsx # Analytics dashboard: charts, winner identification
│   │   │   └── cost/page.tsx     # Cost governance: budget utilization, ledger table
│   │   └── api/                  # Next.js API routes (minimal — mostly proxies or edge functions)
│   │       └── auth/[...nextauth]/route.ts  # NextAuth.js handler (Phase 2 Auth0 prep)
│   │
│   ├── components/
│   │   ├── ui/                   # Shadcn/ui base components (button, card, dialog, table, etc.)
│   │   ├── layout/               # Sidebar, Header, PageShell, Breadcrumb
│   │   ├── channels/             # ChannelCard, ChannelForm, ChannelStatusBadge
│   │   ├── scripts/              # ScriptEditor, ScriptStatusBadge, ApprovalActions
│   │   ├── videos/               # VideoPlayer, VideoStatusPoll, VariantSelector
│   │   ├── analytics/            # MetricCard, TimeSeriesChart, WinnerBadge
│   │   └── cost/                 # BudgetMeter, CostLedgerTable, SpendByProviderChart
│   │
│   ├── lib/
│   │   ├── api-client.ts         # Typed fetch wrapper; attaches Authorization header, handles refresh
│   │   ├── auth.ts               # Client-side auth helpers (getToken, logout, isAuthed)
│   │   └── query-client.ts       # ReactQuery client singleton with default retry + stale config
│   │
│   └── hooks/
│       ├── use-channels.ts       # ReactQuery hooks for channel CRUD
│       ├── use-scripts.ts        # ReactQuery hooks for scripts + approval
│       ├── use-videos.ts         # ReactQuery hooks for videos + status polling
│       └── use-cost.ts           # ReactQuery hooks for cost summary + budget
│
└── public/                       # Static assets: favicon, og-image, placeholder thumbnails
```

---

## apps/worker — BullMQ Job Processor

```
apps/worker/
├── package.json                  # Dependencies: bullmq, ioredis, @opentelemetry/sdk-node
├── tsconfig.json                 # Extends tsconfig.base.json
├── src/
│   ├── main.ts                   # Entry: initializes all workers, connects Redis, handles SIGTERM gracefully
│   ├── config.ts                 # Worker-specific config: concurrency per queue, Redis URL, etc.
│   │
│   ├── workers/
│   │   ├── content.worker.ts     # BullMQ Worker for "content" queue; routes to job handlers
│   │   ├── media.worker.ts       # BullMQ Worker for "media" queue; routes to job handlers
│   │   ├── publish.worker.ts     # BullMQ Worker for "publish" queue; routes to job handlers
│   │   ├── analytics.worker.ts   # BullMQ Worker for "analytics" queue; routes to job handlers
│   │   ├── research.worker.ts    # BullMQ Worker for "research" queue; routes to job handlers
│   │   └── governance.worker.ts  # BullMQ Worker for "governance" queue; routes to job handlers
│   │
│   ├── jobs/
│   │   ├── content/
│   │   │   ├── script-generation.job.ts    # Calls ai-router, writes Script + scenes to DB
│   │   │   └── scene-prompt-generation.job.ts # Generates image/B-roll prompts per scene
│   │   ├── media/
│   │   │   ├── tts-generation.job.ts       # Calls TTS provider, uploads audio to R2, updates Asset
│   │   │   ├── video-render.job.ts         # Calls media-pipeline renderer, uploads video to R2
│   │   │   └── platform-adapt.job.ts       # Reencodes video to per-platform specs, creates VideoVariants
│   │   ├── publish/
│   │   │   └── publish-job.job.ts          # Calls publisher adapters, updates PublishJob status
│   │   ├── analytics/
│   │   │   ├── analytics-ingest.job.ts     # Fetches platform metrics, writes AnalyticsSnapshot records
│   │   │   └── winner-identification.job.ts # Scores videos, flags winners, triggers autopilot if configured
│   │   ├── research/
│   │   │   ├── niche-research.job.ts       # Fetches trends, runs AI analysis, writes Trend + Niche records
│   │   │   └── competitor-analysis.job.ts  # Scrapes/fetches competitor data, writes CompetitorChannel + insights
│   │   ├── governance/
│   │   │   └── budget-check.job.ts         # Recalculates budget utilization, fires alerts if thresholds crossed
│   │   └── autopilot/
│   │       └── autopilot-trigger.job.ts    # Reads AutomationRules, enqueues downstream jobs based on conditions
│   │
│   └── lib/
│       ├── prisma.ts             # Singleton Prisma client for the worker process
│       ├── redis.ts              # IORedis connection (shared across all BullMQ workers)
│       └── telemetry.ts          # OpenTelemetry init for worker process
│
└── test/
    └── jobs/                     # Unit tests for individual job handlers (mocked deps)
```

---

## packages/db — Prisma + PostgreSQL

```
packages/db/
├── package.json                  # Dependencies: @prisma/client; devDependencies: prisma
├── tsconfig.json                 # Extends tsconfig.base.json
├── prisma/
│   ├── schema.prisma             # Single source of truth for all models, enums, relations
│   ├── migrations/               # Auto-generated migration SQL files (committed to git)
│   └── seed.ts                   # Seed script: creates demo workspace, admin user, sample channels
├── src/
│   ├── index.ts                  # Re-exports PrismaClient + all generated types for consumers
│   └── client.ts                 # PrismaClient singleton with connection pooling config + logging
└── README.md                     # Migration commands, seed instructions, schema conventions
```

---

## packages/core — Shared Types + Utilities

```
packages/core/
├── package.json                  # No runtime dependencies except zod
├── tsconfig.json                 # Extends tsconfig.base.json; strict mode
├── src/
│   ├── index.ts                  # Barrel export of all types, constants, and utilities
│   ├── types/
│   │   ├── api.types.ts          # Generic ApiResponse<T>, PaginatedResponse<T>, ApiError types
│   │   ├── job.types.ts          # Job payload interfaces for every BullMQ job (used by API + worker)
│   │   ├── auth.types.ts         # JWTPayload, AuthUser, TokenPair interfaces
│   │   ├── channel.types.ts      # Channel, ChannelWithInsight, ChannelMetrics DTOs
│   │   ├── script.types.ts       # Script, ScriptScene, VoiceConfig DTOs
│   │   ├── video.types.ts        # Video, VideoVariant, RenderConfig DTOs
│   │   └── cost.types.ts         # CostEstimate, BudgetState, LedgerEntry DTOs
│   │
│   ├── constants/
│   │   ├── platforms.ts          # Platform-specific constraints: max video length, aspect ratios, file size limits
│   │   ├── providers.ts          # AI provider names, model IDs, token limits
│   │   └── queues.ts             # Queue name constants (single source of truth — imported by api + worker)
│   │
│   ├── utils/
│   │   ├── pagination.ts         # buildPaginationMeta(), parsePaginationQuery() helpers
│   │   ├── slug.ts               # generateSlug() for URL-safe identifiers
│   │   ├── tokens.ts             # estimateTokenCount() rough estimator for cost pre-calculation
│   │   └── date.ts               # Date range helpers: getDateRange(), formatDuration()
│   │
│   └── errors/
│       ├── app-error.ts          # AppError base class with code, statusCode, isOperational flag
│       └── error-codes.ts        # Enum of all application error codes (BUDGET_EXCEEDED, PROVIDER_UNAVAILABLE, etc.)
└── test/
    └── utils/                    # Unit tests for utility functions
```

---

## packages/ai-router — Model Routing Engine

```
packages/ai-router/
├── package.json                  # Dependencies: openai, @anthropic-ai/sdk, packages/core, packages/db
├── tsconfig.json                 # Extends tsconfig.base.json
├── src/
│   ├── index.ts                  # Exports: AIRouter, ProviderRegistry, RoutingPolicy interfaces
│   ├── router.ts                 # AIRouter class: main entry point for all AI calls; applies routing policy
│   │
│   ├── registry/
│   │   ├── provider-registry.ts  # ProviderRegistry: stores providers, their models, health state
│   │   ├── provider.interface.ts # IProvider interface: complete(), embeddings(), health() methods
│   │   └── model-catalog.ts      # Static catalog of all supported models with capabilities + pricing metadata
│   │
│   ├── providers/
│   │   ├── openai.provider.ts    # OpenAI adapter: implements IProvider; handles GPT-4, GPT-4o, GPT-3.5
│   │   ├── anthropic.provider.ts # Anthropic adapter: implements IProvider; handles Claude 3 family
│   │   ├── gemini.provider.ts    # Google Gemini adapter (stub for Phase 2)
│   │   └── groq.provider.ts      # Groq adapter for low-latency inference (stub for Phase 2)
│   │
│   ├── routing/
│   │   ├── policy-engine.ts      # Evaluates RoutingPolicy rules to select provider + model for a task
│   │   ├── fallback-chain.ts     # Executes providers in priority order; catches errors and falls forward
│   │   ├── health-monitor.ts     # Pings providers on interval; updates health state in registry
│   │   └── load-balancer.ts      # Weighted round-robin across healthy providers for the same model tier
│   │
│   ├── context/
│   │   ├── prompt-builder.ts     # Builds structured prompts from templates + variables
│   │   └── token-counter.ts      # Accurate token counting per provider (uses tiktoken for OpenAI)
│   │
│   └── types/
│       ├── router.types.ts       # RouteRequest, RouteResponse, RoutingPolicy, ProviderConfig types
│       └── provider.types.ts     # ProviderHealth, ModelCapability, CompletionOptions types
│
└── test/
    ├── unit/
    │   ├── policy-engine.test.ts
    │   ├── fallback-chain.test.ts
    │   └── router.test.ts
    └── mocks/
        └── mock-provider.ts      # In-memory IProvider implementation for tests
```

---

## packages/cost-engine — Cost Governance Engine

```
packages/cost-engine/
├── package.json                  # Dependencies: packages/core, packages/db, packages/ai-router
├── tsconfig.json                 # Extends tsconfig.base.json
├── src/
│   ├── index.ts                  # Exports: CostEstimator, CostLedger, BudgetGuard
│   │
│   ├── estimator/
│   │   ├── cost-estimator.ts     # Pre-run cost estimate: input tokens × price + output estimate
│   │   ├── pricing-table.ts      # Per-model pricing ($/1k tokens input, $/1k tokens output)
│   │   └── media-pricing.ts      # TTS $/char, image $/generation, video $/minute pricing
│   │
│   ├── ledger/
│   │   ├── cost-ledger.ts        # Records actual cost after each AI call to CostLedger DB table
│   │   └── ledger-aggregator.ts  # Aggregates ledger entries by period, workspace, provider, taskType
│   │
│   ├── budget/
│   │   ├── budget-guard.ts       # Pre-request check: will this call exceed remaining budget?
│   │   ├── budget-service.ts     # CRUD for Budget records; recalculates utilization
│   │   └── alert-service.ts      # Fires webhook/email alerts at 80%, 95%, 100% budget thresholds
│   │
│   └── types/
│       └── cost-engine.types.ts  # CostEstimate, BudgetCheckResult, LedgerEntry, AlertPayload types
│
└── test/
    ├── unit/
    │   ├── cost-estimator.test.ts
    │   └── budget-guard.test.ts
    └── fixtures/
        └── usage-fixtures.ts     # Sample usage records for tests
```

---

## packages/media-pipeline — TTS + Video Rendering

```
packages/media-pipeline/
├── package.json                  # Dependencies: elevenlabs, openai (whisper/TTS), fluent-ffmpeg, packages/core
├── tsconfig.json                 # Extends tsconfig.base.json
├── src/
│   ├── index.ts                  # Exports: TTSService, VideoRenderer, PlatformAdapter
│   │
│   ├── tts/
│   │   ├── tts-service.ts        # Dispatches TTS requests to configured provider; returns audio buffer
│   │   ├── elevenlabs.adapter.ts # ElevenLabs TTS adapter: voice selection, streaming audio
│   │   ├── openai-tts.adapter.ts # OpenAI TTS adapter: tts-1, tts-1-hd voices
│   │   └── voice-normalizer.ts   # Normalizes VoiceProfile settings across providers
│   │
│   ├── video/
│   │   ├── renderer.ts           # Main VideoRenderer: orchestrates scene assembly → FFmpeg encode
│   │   ├── scene-assembler.ts    # Combines audio + image/video assets per scene with timing
│   │   ├── caption-overlay.ts    # Burns captions onto video using FFmpeg drawtext filter
│   │   ├── music-mixer.ts        # Mixes background music at configured volume under voiceover
│   │   └── ffmpeg-wrapper.ts     # Typed wrapper around fluent-ffmpeg; handles progress events
│   │
│   ├── platform/
│   │   ├── platform-adapter.ts   # Transcodes final video to per-platform specs (aspect ratio, bitrate)
│   │   ├── specs/
│   │   │   ├── youtube-shorts.spec.ts  # 9:16, 1080×1920, H.264, ≤60s
│   │   │   ├── tiktok.spec.ts          # 9:16, 1080×1920, H.264, ≤10min
│   │   │   ├── instagram-reels.spec.ts # 9:16, 1080×1920, H.264, ≤90s
│   │   │   └── youtube-long.spec.ts    # 16:9, 1920×1080, H.264, ≤12h
│   │   └── thumbnail-generator.ts     # Extracts/generates thumbnail from video at key timestamp
│   │
│   └── storage/
│       ├── r2-client.ts          # Cloudflare R2 S3-compatible client; upload/download/signed URLs
│       └── asset-manager.ts      # Manages Asset records in DB; tracks upload state + R2 key
│
└── test/
    └── unit/
        ├── tts-service.test.ts
        └── platform-adapter.test.ts
```

---

## packages/publisher — Platform Publishing Adapters

```
packages/publisher/
├── package.json                  # Dependencies: googleapis, packages/core, packages/db
├── tsconfig.json                 # Extends tsconfig.base.json
├── src/
│   ├── index.ts                  # Exports: PublisherService, all platform adapters
│   ├── publisher-service.ts      # Routes publish requests to the correct platform adapter
│   │
│   ├── adapters/
│   │   ├── publisher.interface.ts  # IPublisher interface: publish(), getStatus(), deletePost()
│   │   ├── youtube.adapter.ts    # YouTube Data API v3: uploads video, sets metadata, returns videoId
│   │   ├── tiktok.adapter.ts     # TikTok Content Posting API adapter (stub — API access gated)
│   │   └── instagram.adapter.ts  # Instagram Graph API adapter for Reels publishing
│   │
│   ├── oauth/
│   │   ├── token-manager.ts      # Manages OAuth2 tokens for platform accounts; auto-refreshes
│   │   └── token-store.ts        # Persists encrypted OAuth tokens to PlatformAccount DB records
│   │
│   └── types/
│       └── publisher.types.ts    # PublishRequest, PublishResult, PlatformCredentials types
│
└── test/
    └── unit/
        └── publisher-service.test.ts
```

---

## Turborepo Pipeline Summary

```
turbo.json pipeline tasks:
  build      → depends on: "^build" (build deps first); outputs: ["dist/**"]
  typecheck  → depends on: "^build"; no cache outputs
  lint       → no dependencies; cache outputs: []
  test       → depends on: "^build"; env vars: [DATABASE_URL, REDIS_URL]
  dev        → persistent: true; no cache
  db:migrate → not cached; runs in packages/db only
  db:seed    → not cached; runs in packages/db only
```

---

## Key Configuration Files

```
.env.example (all keys required at runtime):
  DATABASE_URL          # PostgreSQL connection string
  REDIS_URL             # Redis connection string
  JWT_SECRET            # HS256 signing secret (min 32 chars)
  JWT_REFRESH_SECRET    # Separate secret for refresh tokens
  OPENAI_API_KEY        # OpenAI API key
  ANTHROPIC_API_KEY     # Anthropic API key
  CLOUDFLARE_R2_BUCKET  # R2 bucket name
  CLOUDFLARE_R2_ENDPOINT # R2 S3-compatible endpoint
  CLOUDFLARE_ACCESS_KEY_ID
  CLOUDFLARE_SECRET_ACCESS_KEY
  ELEVENLABS_API_KEY    # ElevenLabs TTS API key
  OTEL_EXPORTER_OTLP_ENDPOINT  # OpenTelemetry collector endpoint
  PORT                  # API server port (default: 3001)
  NODE_ENV              # development | test | production
```
