# 17 — Engineering Plan

**Faceless Viral OS** | Blueprint Document 17 of 19
Last updated: 2026-04-17

---

## Overview

This document defines the engineering architecture, standards, and practices for building the Faceless Viral OS platform. It covers repository structure, service boundaries, coding standards, API design, queue architecture, testing strategy, CI/CD, feature flags, and the migration path from a private internal tool to a public SaaS product.

---

## 1. Monorepo vs Polyrepo Decision

### Recommendation: Monorepo (Turborepo + pnpm workspaces)

**Decision:** Build a monorepo from day one.

### Tradeoff Analysis

| Dimension | Monorepo | Polyrepo |
|---|---|---|
| Code sharing | Trivial (local workspace packages) | Requires publishing to npm or private registry |
| Refactoring | Single PR touches all affected code | Cross-repo PRs are painful and error-prone |
| Onboarding | One clone, one `pnpm install` | Multiple repos, multiple setups |
| CI/CD | Turborepo caches make it fast; affected-only builds | Simpler per-repo but no cross-repo cache |
| Dependency management | One lock file; consistent versions | Version drift between repos is common |
| Independent deployment | Possible via Turborepo pipelines | Natural boundary per repo |
| Access control | Everyone sees everything (fine for Phase 1) | Granular per-repo permissions (needed for large orgs) |
| Repo size over time | Can grow large; manageable with Turborepo | Stays small per repo |

**Why monorepo wins for this project:**
- 1–3 operators in Phase 1; no need for access control complexity
- Heavy code sharing between packages (types, DB client, cost engine, AI router)
- Turborepo's remote caching makes CI fast despite monorepo size
- Refactoring the data model (which will happen often in Phase 1) touches multiple packages — monorepo makes this safe
- Single `tsconfig.json` base with strict mode enforced everywhere

**pnpm over npm/yarn:**
- Disk-efficient (content-addressed store; packages not duplicated)
- `pnpm workspaces` is the best-in-class monorepo package manager
- Strict dependency isolation (prevents phantom dependency bugs)
- Fastest install times of the three

---

## 2. Repository Structure

```
faceless-viral-os/
├── apps/
│   ├── api/                    # Fastify REST API server
│   │   ├── src/
│   │   │   ├── routes/         # Route handlers (organized by domain)
│   │   │   ├── plugins/        # Fastify plugins (auth, cors, swagger)
│   │   │   ├── middleware/     # Request lifecycle hooks
│   │   │   └── server.ts       # Server bootstrap
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                    # Next.js operator dashboard
│   │   ├── app/                # Next.js App Router pages
│   │   │   ├── (auth)/         # Auth routes
│   │   │   ├── (dashboard)/    # Main operator UI
│   │   │   └── api/            # Next.js API routes (thin proxy to Fastify)
│   │   ├── components/         # UI components
│   │   ├── lib/                # Client utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── worker/                 # BullMQ job processor
│       ├── src/
│       │   ├── processors/     # One file per queue processor
│       │   ├── schedulers/     # Recurring job schedulers
│       │   └── worker.ts       # Worker bootstrap
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── db/                     # Prisma schema + generated client + migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── client.ts       # Singleton Prisma client
│   │   │   └── seed.ts         # Seed data
│   │   └── package.json
│   │
│   ├── ai-router/              # Model Routing Engine
│   │   ├── src/
│   │   │   ├── providers/      # One adapter per AI provider
│   │   │   ├── router.ts       # Routing logic + fallback chains
│   │   │   ├── registry.ts     # Provider registry
│   │   │   └── types.ts        # Shared AI types
│   │   └── package.json
│   │
│   ├── cost-engine/            # Cost Governance Engine
│   │   ├── src/
│   │   │   ├── estimator.ts    # Pre-generation cost estimation
│   │   │   ├── ledger.ts       # Cost tracking + recording
│   │   │   ├── budget-guard.ts # Budget enforcement
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── media-pipeline/         # TTS + video rendering pipeline
│   │   ├── src/
│   │   │   ├── tts/            # TTS provider adapters
│   │   │   ├── video/          # FFmpeg wrapper + composition logic
│   │   │   ├── subtitles/      # Whisper → SRT/ASS conversion
│   │   │   ├── assets/         # Asset fetching + R2 storage
│   │   │   └── pipeline.ts     # Orchestration
│   │   └── package.json
│   │
│   ├── publisher/              # Platform publishing adapters
│   │   ├── src/
│   │   │   ├── youtube/        # YouTube Data API v3 publisher
│   │   │   ├── tiktok/         # TikTok Content Posting API publisher
│   │   │   ├── instagram/      # Instagram Graph API publisher
│   │   │   └── publisher.ts    # Unified publish interface
│   │   └── package.json
│   │
│   └── core/                   # Shared types, utilities, constants
│       ├── src/
│       │   ├── types/          # Shared TypeScript types and interfaces
│       │   ├── constants/      # Platform limits, tier definitions, etc.
│       │   ├── utils/          # Pure utility functions
│       │   ├── errors/         # Custom error classes
│       │   └── schemas/        # Shared Zod schemas
│       └── package.json
│
├── docs/
│   ├── blueprint/              # This document and siblings
│   ├── feature-specs/          # Clean-room feature specs (for AGPL compliance)
│   ├── runbooks/               # Operational runbooks
│   └── adr/                    # Architecture Decision Records
│
├── infra/
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.worker
│   │   └── docker-compose.yml  # Local development
│   ├── k8s/                    # Kubernetes manifests (Phase 2)
│   └── terraform/              # Infrastructure as Code (Phase 2)
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # PR checks
│   │   ├── deploy-staging.yml  # Deploy on merge to main
│   │   └── deploy-prod.yml     # Deploy on tag
│   └── pull_request_template.md
│
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml         # pnpm workspace definition
├── package.json                # Root package.json (devDependencies)
├── tsconfig.base.json          # Shared TypeScript base config
├── .eslintrc.js                # Shared ESLint config
├── .prettierrc                 # Shared Prettier config
└── .env.example                # Template for required env vars
```

### Root Configuration Files

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**`turbo.json`:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {},
    "type-check": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## 3. Service Boundaries and Import Rules

Each package has a defined scope. Violating import rules creates circular dependencies and makes the codebase unmaintainable. These rules are enforced via ESLint's `import/no-restricted-paths` rule.

| Package | Owns | Can Import From | Cannot Import From |
|---|---|---|---|
| `core` | Shared types, utils, constants, Zod schemas, error classes | Nothing internal | Any other internal package |
| `db` | Prisma schema, generated client, migrations, seed | `core` | `ai-router`, `cost-engine`, `media-pipeline`, `publisher` |
| `ai-router` | Provider adapters, routing logic, fallback chains | `core`, `db` (read-only, for logging) | `cost-engine`, `media-pipeline`, `publisher` |
| `cost-engine` | Cost estimation, ledger, budget guard | `core`, `db`, `ai-router` (types only) | `media-pipeline`, `publisher` |
| `media-pipeline` | TTS, video assembly, subtitle gen, asset management | `core`, `db`, `ai-router`, `cost-engine` | `publisher` |
| `publisher` | Platform upload/publish logic | `core`, `db` | `ai-router`, `cost-engine`, `media-pipeline` |
| `apps/api` | HTTP routes, plugins, auth | All packages | — |
| `apps/worker` | BullMQ processors | All packages | `apps/api`, `apps/web` |
| `apps/web` | Next.js UI | `core` only (types/schemas) | `db` (never query DB from frontend), `ai-router`, etc. |

**Rule Summary:**
- `core` has zero internal dependencies (it is the foundation)
- `db` only depends on `core`
- `apps/web` never imports from `db`, `ai-router`, `cost-engine`, `media-pipeline`, or `publisher` — all data flows through the API
- Data always flows: `web` → `api` → `worker` → (packages) → `db`

---

## 4. Coding Standards

### 4.1 TypeScript Configuration

**`tsconfig.base.json`** (shared strict settings):
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

**Rules:**
- `strict: true` is non-negotiable. PRs disabling strict checks are rejected.
- `noUncheckedIndexedAccess: true` — prevents undefined access on array/object index operations
- `exactOptionalPropertyTypes: true` — prevents accidentally setting optional properties to `undefined`
- All `any` types require a `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment with a justification comment above it explaining why `any` is necessary

### 4.2 ESLint Configuration

Key rules enforced:
```javascript
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "import/no-cycle": "error",
    "import/no-restricted-paths": [...], // enforce package boundary rules
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error"
  }
}
```

- `@typescript-eslint/no-floating-promises`: Every async call must be awaited or explicitly `.catch()`'d — prevents silent promise failures
- `import/no-cycle`: Prevents circular imports
- `no-console`: Use the logger (Pino) instead of `console.log`

### 4.3 Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

Prettier runs as a pre-commit hook (via Husky + lint-staged) — no style debates in PRs.

### 4.4 Conventional Commits

All commit messages must follow the Conventional Commits specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`

**Scopes** (match package/app names): `api`, `web`, `worker`, `db`, `ai-router`, `cost-engine`, `media-pipeline`, `publisher`, `core`, `infra`

**Examples:**
```
feat(ai-router): add Groq provider adapter with Llama 70B support
fix(publisher): handle YouTube resumable upload resume on network error
chore(db): add index on video_analytics(video_id, recorded_at)
perf(media-pipeline): parallelize TTS generation for multi-segment scripts
```

Enforced via `commitlint` (run on commit via Husky hook).

### 4.5 PR Size Limits

- **Target:** < 400 lines changed (excluding generated files, lock files, migrations)
- **Hard limit:** 600 lines changed — PRs above this require a comment from the author justifying the size
- Large features must be split into logical sub-PRs (infrastructure PR, then feature PR)
- Database migrations are always in their own PR (with schema PR as a prerequisite)

### 4.6 Business Logic Testing Requirement

All functions in `packages/` (not `apps/`) that contain business logic must have:
- At minimum one happy-path unit test
- At minimum one failure/edge-case test
- If it involves money (cost-engine): at minimum 5 tests covering boundary conditions

No PR touching `packages/` is merged without tests for new/modified business logic. This is enforced by PR review checklist (not automated — rely on reviewer discipline in Phase 1).

---

## 5. API Design Standards

### 5.1 Framework and Schema Validation

- **Framework:** Fastify 4.x
- **Schema validation:** Zod (via `fastify-type-provider-zod`) — all request bodies, query params, and responses are Zod-validated
- **Documentation:** Swagger/OpenAPI auto-generated from Zod schemas via `@fastify/swagger` + `@fastify/swagger-ui`

### 5.2 URL Structure

```
Base URL: https://api.facelessviralos.com
Versioned: /api/v1/

Resource hierarchy:
/api/v1/workspaces/{workspaceId}/channels
/api/v1/workspaces/{workspaceId}/videos
/api/v1/workspaces/{workspaceId}/videos/{videoId}
/api/v1/workspaces/{workspaceId}/niches
/api/v1/workspaces/{workspaceId}/analytics

Non-resource:
/api/v1/auth/login
/api/v1/auth/refresh
/api/v1/health

Internal (not exposed to SaaS users):
/internal/health/integrations
/internal/metrics
```

### 5.3 Standard Error Format

All errors return this JSON structure:
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Video with id 'abc-123' was not found",
    "details": {},
    "requestId": "req_01HN..."
  }
}
```

**Error Codes (standardized):**

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body/params failed Zod validation |
| 400 | `INVALID_STATE` | Resource in wrong state for this operation |
| 401 | `UNAUTHORIZED` | Missing or invalid auth token |
| 403 | `FORBIDDEN` | Valid auth but insufficient permissions |
| 404 | `RESOURCE_NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Optimistic locking failure or duplicate |
| 422 | `BUSINESS_RULE_VIOLATION` | Passed validation but violates business logic |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unhandled error (never expose stack trace) |
| 503 | `SERVICE_UNAVAILABLE` | Dependency down or circuit breaker open |

**Request ID:** Every request gets a `requestId` (ULIDv2 prefixed with `req_`) injected by middleware, logged with every log line for that request, and returned in the error response and the `X-Request-Id` response header.

### 5.4 Auth Header Standard

```
Authorization: Bearer <jwt_token>
```

JWT payload:
```json
{
  "sub": "user_01HN...",
  "workspaceId": "ws_01HN...",
  "role": "owner",
  "iat": 1714000000,
  "exp": 1714086400
}
```

- JWT signed with RS256 (asymmetric) — public key can be distributed for validation
- Access token TTL: 1 hour
- Refresh token TTL: 30 days
- Refresh tokens stored in DB (allows revocation)

### 5.5 Pagination Standard

All list endpoints support cursor-based pagination:
```
GET /api/v1/workspaces/{id}/videos?limit=25&cursor=<opaque_cursor>

Response:
{
  "data": [...],
  "pagination": {
    "hasNextPage": true,
    "nextCursor": "<opaque_cursor>",
    "totalCount": 142
  }
}
```

Cursor is a base64-encoded `{id, createdAt}` tuple for stable pagination.

---

## 6. Queue Architecture (BullMQ)

### 6.1 Queue Definitions

| Queue Name | Purpose | Priority | Concurrency | Retry Config |
|---|---|---|---|---|
| `script-generation` | LLM script generation jobs | Normal | 10 | 3 retries, exponential backoff 30s/120s/300s |
| `media-render` | TTS + video assembly | Normal | 3 (CPU bound) | 2 retries, 60s/300s |
| `publish` | Platform upload/publish | High | 5 | 5 retries, 30s/60s/120s/300s/600s |
| `analytics-ingest` | Fetch analytics from platforms | Low | 20 | 3 retries, 300s/600s/1800s |
| `niche-research` | Niche discovery + validation | Low | 5 | 3 retries, 60s/300s/600s |
| `competitor-intelligence` | Competitor data collection | Low | 5 | 3 retries, 60s/300s |
| `webhook-dispatch` | Outbound webhook delivery | High | 20 | 5 retries, 10s/30s/60s/300s/600s |
| `notifications` | Internal alerts (Slack, email) | High | 10 | 3 retries, 10s/30s/60s |

### 6.2 Job Priority Levels

BullMQ supports numeric priorities (lower number = higher priority):
- `1` — Critical (system alerts, time-sensitive publishes)
- `5` — High (publish jobs, webhook dispatch)
- `10` — Normal (script generation, renders)
- `20` — Low (analytics, research, background tasks)

### 6.3 Dead Letter Queue Strategy

Jobs that exhaust all retries are moved to a dedicated DLQ:
- Each queue has a corresponding `{queue-name}:dlq` queue in Redis
- DLQ jobs are stored with full error context (stack trace, attempt count, last error message)
- A daily BullMQ scheduled job inspects DLQ depth and sends a Slack alert if > 10 jobs are in any DLQ
- Operations can replay DLQ jobs via admin API endpoint (`POST /internal/queues/{name}/dlq/replay`)
- DLQ jobs are retained for 7 days, then auto-deleted

### 6.4 Job Data Conventions

All job payloads are typed via Zod schemas in `packages/core/src/schemas/jobs.ts`. Jobs must:
- Contain only serializable data (no class instances, no Buffers in payload — use R2 keys instead)
- Include `workspaceId` for multi-tenant isolation
- Include `traceId` for distributed tracing
- Be as small as possible (pass IDs, not full objects)

**Example job payload:**
```typescript
const ScriptGenerationJobSchema = z.object({
  workspaceId: z.string().ulid(),
  videoId: z.string().ulid(),
  traceId: z.string(),
  niche: z.string(),
  topic: z.string(),
  targetDuration: z.number().int().min(30).max(3600),
  aiTier: AiTierSchema,
  budgetCents: z.number().int().positive(),
});
```

### 6.5 Idempotency

- All job processors must be idempotent (safe to re-run if the first run partially succeeded)
- Use the video/job status in DB to skip already-completed steps
- Never assume a job runs exactly once — assume at-least-once delivery

### 6.6 Bull Board (Phase 1 Monitoring)

Deploy `@bull-board/fastify` as an internal admin route at `/internal/bull-board` (auth-protected, IP-restricted). Provides a real-time view of queue depth, active jobs, failed jobs, and DLQ contents.

---

## 7. Testing Strategy

### 7.1 Test Stack

| Tool | Purpose |
|---|---|
| Vitest | Unit and integration tests (all packages and apps) |
| Supertest | HTTP integration tests for Fastify API routes |
| Playwright | E2E tests for critical UI flows (Phase 2) |
| Testcontainers | Spin up real PostgreSQL and Redis for integration tests |
| `@faker-js/faker` | Generate realistic test data |
| `nock` | HTTP mocking for external API calls in unit tests |

### 7.2 Test Types and Scope

**Unit Tests** (packages only):
- Test pure functions in isolation
- Mock all external dependencies (DB, APIs)
- Must be fast (< 50ms per test)
- Location: `src/__tests__/unit/` alongside source files

**Integration Tests** (packages + API):
- Test service methods against real PostgreSQL (via Testcontainers)
- Test BullMQ processors with real Redis (via Testcontainers)
- Test Fastify routes end-to-end with `Supertest`
- Location: `src/__tests__/integration/`

**E2E Tests** (Phase 2 only):
- Test critical user journeys in the browser
- Run against staging environment
- Scope: video creation flow, publish flow, analytics view

### 7.3 Coverage Targets

| Package | Coverage Target | Rationale |
|---|---|---|
| `core` | 95% | Utilities and types used everywhere — must be bulletproof |
| `db` | 70% | Schema types are generated; test seed and migrations |
| `ai-router` | 85% | Routing logic and fallback chains are complex and costly to debug in production |
| `cost-engine` | 90% | Money is involved; every edge case must be tested |
| `media-pipeline` | 75% | Some paths are hard to test without real GPU/FFmpeg; use integration tests |
| `publisher` | 80% | Platform API interactions must be tested with mocked HTTP |
| `apps/api` | 70% | Route handlers tested via integration tests |
| `apps/worker` | 75% | Processor logic tested with real queue infrastructure |

Coverage is measured by Vitest's built-in coverage (via `v8` provider). CI fails if coverage drops below threshold.

### 7.4 Test Data Management

- Use `packages/db/src/seed.ts` for development and CI seed data
- Integration tests create isolated data using unique `workspaceId` per test run
- Use `beforeEach` / `afterEach` for DB cleanup in integration tests (transaction rollback pattern)
- Never use production data in tests

---

## 8. CI/CD Pipeline

### 8.1 GitHub Actions Workflows

**On Pull Request (`ci.yml`):**
```
Trigger: PR opened, PR updated

Jobs (parallel where possible):
1. lint          → pnpm run lint (ESLint + Prettier check)
2. type-check    → pnpm run type-check (tsc --noEmit)
3. test          → pnpm run test (Vitest, with Testcontainers)
4. build         → pnpm run build (ensure everything compiles)

All 4 jobs must pass for PR to be mergeable.
Turborepo remote cache (Vercel) used to skip unchanged packages.
```

**On merge to main (`deploy-staging.yml`):**
```
Trigger: push to main branch

Steps:
1. Run full CI suite (lint, type-check, test, build)
2. Build Docker images (api, worker)
3. Push to container registry (GitHub Container Registry / GHCR)
4. Deploy to staging environment (docker-compose on staging VM, Phase 1)
5. Run smoke tests (ping /api/v1/health)
6. Post success/failure to Slack #deployments channel
```

**On tag (`deploy-prod.yml`):**
```
Trigger: push of tag matching v[0-9]+.[0-9]+.[0-9]+

Steps:
1. Verify tag is on main branch
2. Run full CI suite
3. Build and push production Docker images (tagged with version)
4. Run database migrations (prisma migrate deploy)
5. Deploy to production (blue-green rollout in Phase 2; direct replace in Phase 1)
6. Run smoke tests
7. Post release notes to Slack #releases channel
```

### 8.2 Environment Matrix

| Environment | Purpose | Deployment | DB | Redis |
|---|---|---|---|---|
| `local` | Developer machines | `docker-compose up` | Local PostgreSQL container | Local Redis container |
| `staging` | Integration + QA | Auto-deploy on main merge | Managed PostgreSQL | Managed Redis |
| `production` | Live system | Manual tag deploy | Managed PostgreSQL (HA) | Managed Redis (HA) |

### 8.3 Secrets Management in CI

- All secrets stored in GitHub Actions Secrets (never hardcoded)
- Environment-specific secrets prefixed with `STAGING_` or `PROD_`
- Rotation: every 90 days (rotate all API keys, DB passwords)
- Never log secrets (GitHub Actions automatically masks them, but avoid printing env vars)

### 8.4 Rollback Procedure

Phase 1 (manual):
1. Identify the last known-good Docker image tag in GHCR
2. SSH to server
3. Update `docker-compose.yml` to pin previous image tag
4. `docker-compose up -d`
5. Verify health
6. Run DB rollback if schema migration is involved (`prisma migrate resolve --rolled-back`)

Phase 2 (automated blue-green):
- Keep previous deployment running until health checks on new deployment pass
- Automated rollback if health checks fail within 5 minutes of deploy

---

## 9. Feature Flags

### 9.1 Phase 1: Environment Variable Based

Simple, zero-dependency feature flags via environment variables:

```typescript
// packages/core/src/feature-flags.ts
export const FeatureFlags = {
  INSTAGRAM_PUBLISHING: process.env.FF_INSTAGRAM_PUBLISHING === 'true',
  AI_VIDEO_GENERATION: process.env.FF_AI_VIDEO_GENERATION === 'true',
  ANALYTICS_WEBHOOKS: process.env.FF_ANALYTICS_WEBHOOKS === 'true',
  COMPETITOR_INTELLIGENCE: process.env.FF_COMPETITOR_INTELLIGENCE === 'true',
  OUTBOUND_WEBHOOKS: process.env.FF_OUTBOUND_WEBHOOKS === 'true',
} as const;
```

- Flags are boolean only in Phase 1
- Changing a flag requires a redeploy (acceptable for 1–3 operators)
- Document all flags in `.env.example` with descriptions

### 9.2 Phase 2: LaunchDarkly or Unleash

**Recommendation: Unleash** (self-hosted, cost-effective for early SaaS stage)
- Supports per-user/per-workspace targeting (needed for gradual SaaS rollout)
- Open-source core with paid hosted option
- Node.js SDK: `unleash-client`
- Gradual rollout: `% of users` strategy for new features
- A/B testing support via variant flags

**LaunchDarkly** is the alternative if budget allows:
- Better UX for non-technical operators managing flags
- More sophisticated targeting rules
- Higher cost ($75–$300/month)

---

## 10. Migration Path: Private Tool → Public SaaS

### Current State (Phase 1)
- Single workspace, 1–3 operators
- Direct DB access (no row-level security by workspace)
- JWT auth with hardcoded user accounts
- Single deployment instance
- No billing

### Target State (Phase 2)
- Multi-tenant (hundreds/thousands of workspaces)
- Row-level security via `workspace_id` on every table
- Auth0 or Clerk for identity management
- Horizontally scaled API + worker fleet
- Stripe billing

### 8-Step Migration Plan

**Step 1: Add `workspace_id` to all tables (DB migration)**
- Add `workspace_id UUID NOT NULL` column to every table
- Backfill all existing rows with the single Phase 1 workspace ID
- Add `REFERENCES workspaces(id)` foreign key constraint
- Add index on `workspace_id` for every table
- **Risk:** Large migration on live DB — use `pg_repack` or run during maintenance window
- **Validation:** Verify row counts before and after migration

**Step 2: Enforce `workspace_id` in all queries (Application migration)**
- Add `workspaceId` to all repository method signatures
- All Prisma queries must include `where: { workspaceId }` clause
- Write a lint rule that flags any `prisma.{model}.findMany()` without `workspaceId` in where clause
- Add integration tests that verify cross-workspace data leakage is impossible
- **Duration:** 2–3 weeks of careful, test-driven refactoring

**Step 3: Add workspace isolation middleware**
- Extract `workspaceId` from JWT on every API request
- Inject into a `RequestContext` (via AsyncLocalStorage) accessible throughout the request lifecycle
- Repository layer reads `workspaceId` from context automatically
- **Risk:** Missing context in background jobs — ensure BullMQ job payloads always include `workspaceId`

**Step 4: Implement workspace registration flow**
- Sign-up endpoint (`POST /api/v1/auth/register`)
- Workspace creation on sign-up
- Email verification flow
- **Dependency:** Resend for transactional email must be production-configured

**Step 5: Replace hardcoded auth with Auth0 or Clerk**
- Integrate Auth0 (or Clerk) for identity management
- Migrate existing Phase 1 user accounts to Auth0
- Update JWT validation middleware to verify Auth0 JWTs
- Add role management (owner, admin, member) scoped per workspace
- **Breaking change:** All existing tokens invalidated — coordinate with current operators

**Step 6: Implement Stripe billing**
- Create Products and Prices in Stripe for each AI tier
- Add `stripe_customer_id` and `stripe_subscription_id` to workspace table
- Implement webhook handlers for subscription lifecycle events
- Gate feature access based on subscription tier stored in DB
- Implement usage metering for AI tokens, video renders, storage
- **Risk:** Billing logic bugs can overcharge or undercharge customers — test exhaustively in Stripe test mode

**Step 7: Add self-service onboarding UI**
- Pricing page
- Sign-up / sign-in flows
- Workspace settings (team management, billing portal)
- API key management for automation customers

**Step 8: Horizontal scaling preparation**
- Ensure all state is in DB or Redis (no in-process state)
- Replace local file system usage with R2 (already required for Phase 1)
- Add connection pooling (PgBouncer) for PostgreSQL
- Add Redis Cluster support to BullMQ config
- Implement rate limiting at the API gateway level (not just application level)
- Load test with k6 before Phase 2 launch

### What Breaks During Migration and How to Fix It

| Breaking Point | What Breaks | Fix |
|---|---|---|
| `workspace_id` migration | All queries without workspace filter return all-workspace data | Fix by enforcing filter at repository layer + middleware |
| Auth0 migration | Phase 1 JWT tokens become invalid | Coordinate with operators; issue new tokens after migration |
| Multi-tenancy | Background jobs without `workspaceId` fail | Ensure all job schemas include `workspaceId`; add validation in processor |
| File paths in R2 | R2 paths without workspace prefix allow cross-workspace access | Migrate all R2 paths to `{workspaceId}/{path}` scheme early in Phase 1 |
| Analytics queries | Aggregate queries across all workspaces | Add `workspace_id` filter to all analytics queries |
| Stripe webhook | Webhook not associated with a workspace | Look up workspace by `stripe_customer_id` before processing |

---

## Appendix: Development Environment Setup

### Prerequisites
- Node.js 20+ (LTS)
- pnpm 9+
- Docker + Docker Compose
- PostgreSQL client (for debugging)

### First-Time Setup
```bash
git clone git@github.com:org/faceless-viral-os.git
cd faceless-viral-os
pnpm install
cp .env.example .env          # Fill in required env vars
docker-compose up -d          # Start PostgreSQL + Redis
pnpm run db:migrate           # Run Prisma migrations
pnpm run db:seed              # Seed development data
pnpm run dev                  # Start all apps in parallel (Turborepo)
```

### Daily Development
```bash
pnpm run dev                  # Starts api, web, worker in watch mode
pnpm run test                 # Run all tests
pnpm run test --filter=cost-engine  # Run tests for one package
pnpm run lint                 # Lint all packages
pnpm run type-check           # Type-check all packages
pnpm run build                # Build all packages
```
