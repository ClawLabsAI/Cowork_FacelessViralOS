# Architecture Decision Records — Faceless Viral OS

This index lists all accepted ADRs for the Faceless Viral OS platform. Each record is included in full below.

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-001 | Monorepo with Turborepo | Accepted | 2026-04-17 |
| ADR-002 | Fastify over Express/Hono for API | Accepted | 2026-04-17 |
| ADR-003 | Custom Model Routing Engine over LangChain | Accepted | 2026-04-17 |
| ADR-004 | BullMQ + Redis for job queues | Accepted | 2026-04-17 |
| ADR-005 | Prisma over raw SQL / Drizzle | Accepted | 2026-04-17 |
| ADR-006 | Cloudflare R2 for media storage | Accepted | 2026-04-17 |
| ADR-007 | Phase 1 JWT auth, Phase 2 Auth0 migration | Accepted | 2026-04-17 |
| ADR-008 | OpenTelemetry for observability | Accepted | 2026-04-17 |
| ADR-009 | Tiered AI cost system as first-class feature | Accepted | 2026-04-17 |
| ADR-010 | Clean-room implementation (no AGPL MoneyPrinterV2 code) | Accepted | 2026-04-17 |

---

## ADR-001: Monorepo with Turborepo

**Status:** Accepted
**Date:** 2026-04-17

### Context

The Faceless Viral OS platform spans multiple deployment targets: an HTTP API server, a Next.js web application, and a background job worker process. These three runtimes share substantial logic — job payload types, database models, cost calculation utilities, and AI provider interfaces. Without a monorepo, this shared logic would require publishing private npm packages with their own versioning, or worse, copy-pasting code across three separate repos. In addition, the development experience of running all services together and ensuring consistent TypeScript versions, lint rules, and build tooling would fragment quickly across repos.

### Decision

Adopt a **Turborepo + pnpm workspaces** monorepo. All apps (`api`, `web`, `worker`) and packages (`db`, `core`, `ai-router`, `cost-engine`, `media-pipeline`, `publisher`) live in a single git repository. Turborepo handles incremental build caching and task orchestration. pnpm is chosen as the package manager for its symlink-based workspace linking, strict hoisting behavior, and significantly smaller `node_modules` footprint compared to npm/Yarn.

### Options Considered

1. **Separate git repositories** — Maximum isolation, separate CI pipelines, independent versioning. Rejected because shared type safety becomes impossible without a private package registry, and the operational overhead for a small founding team is high.
2. **Nx monorepo** — Feature-comparable to Turborepo. Rejected because Nx introduces a steeper learning curve, more configuration surface area, and its plugin ecosystem is heavier than required. Turborepo's mental model (pipelines + caching) is simpler to onboard new developers to.
3. **Turborepo + pnpm (chosen)** — Lightweight pipeline definition in `turbo.json`, zero-config workspace linking, and remote caching available via Vercel or self-hosted. The combination is the current community standard for TypeScript fullstack monorepos.

### Consequences

- **Accepted:** All developers must use pnpm. The `package-lock.json` and `yarn.lock` files are explicitly gitignored.
- **Accepted:** Changes to `packages/core` types trigger rebuilds of all downstream packages in CI. This is desirable — it catches type regressions immediately.
- **Accepted:** Deployment requires building only the affected workspace target. Docker images for `api` and `worker` are built with `turbo prune` to produce minimal standalone builds.
- **Watch:** Turborepo remote caching requires a Vercel account or a self-hosted Turborepo Remote Cache server for team-wide cache sharing.

---

## ADR-002: Fastify over Express/Hono for API

**Status:** Accepted
**Date:** 2026-04-17

### Context

The API server is a TypeScript Node.js HTTP service that needs to handle concurrent requests for AI job dispatch, polling, analytics ingestion callbacks, and provider health checks. Performance matters: the server should not be the bottleneck when requests are I/O-bound on the database and job queue. The framework must integrate cleanly with TypeScript, support request/response schema validation with minimal boilerplate, and have a mature plugin ecosystem for JWT, rate limiting, CORS, and OpenTelemetry.

### Decision

Use **Fastify v4** as the HTTP framework. Fastify offers measurable throughput advantages over Express through its JSON serialization engine (`fast-json-stringify`) and schema-based validation. It has first-party TypeScript support with full type inference for route handlers when schemas are provided. The plugin lifecycle (`fastify.register()`) is explicit and composable, which suits a structured codebase better than Express middleware soup.

### Options Considered

1. **Express v4/v5** — The most familiar Node.js framework. Rejected because: no built-in schema validation, JSON serialization is slow compared to Fastify, TypeScript support requires community wrappers, and it is architecturally a middleware stack rather than a plugin system.
2. **Hono** — An extremely fast edge-first framework that runs on Cloudflare Workers, Deno, Bun, and Node.js. Considered seriously. Rejected because: the primary deployment target is a containerized Node.js server, not an edge runtime; the plugin/decorator ecosystem is smaller; and JWT + rate-limit plugins require more manual wiring than Fastify's first-party packages.
3. **Fastify v4 (chosen)** — Battle-tested in production at scale, first-party `@fastify/jwt`, `@fastify/rate-limit`, `@fastify/cors` plugins, JSON schema validation with TypeBox or Zod, and official OpenTelemetry instrumentation. The `fastify.inject()` method makes integration testing trivial without spinning up a real HTTP server.

### Consequences

- **Accepted:** Fastify's plugin system requires understanding the encapsulation model (scoped vs. non-scoped plugins). New developers must read the Fastify docs for this before writing plugins.
- **Accepted:** Zod schemas must be converted to JSON Schema for Fastify's built-in validation, or use `@fastify/type-provider-zod` for direct Zod integration. We use the latter.
- **Benefit:** `fastify.inject()` enables fast, stateless integration tests without a running HTTP server, reducing test infrastructure complexity.

---

## ADR-003: Custom Model Routing Engine over LangChain

**Status:** Accepted
**Date:** 2026-04-17

### Context

The platform requires a layer that sits between application code and AI providers (OpenAI, Anthropic, Gemini, Groq). This layer must: select the appropriate model for a given task type, enforce cost constraints before making calls, fall back to alternative providers when the primary is unavailable or rate-limited, record actual token usage for cost ledgering, and expose health state for all configured providers. The question is whether to build this layer on top of LangChain or as a custom implementation.

### Decision

Build a **custom Model Routing Engine** in `packages/ai-router`. Expose it as a typed TypeScript package with clean interfaces (`IProvider`, `AIRouter`, `RoutingPolicy`). The engine does not use LangChain, LlamaIndex, or any AI orchestration framework.

### Options Considered

1. **LangChain.js** — The most widely known AI orchestration framework. Rejected because: LangChain abstracts over provider APIs in ways that obscure token counting and pricing, making accurate cost ledgering difficult; it has a large dependency footprint; its abstractions change rapidly between versions causing upgrade pain; and it is optimized for chain/agent composition workflows rather than our primary use case of cost-governed, policy-routed completions.
2. **Vercel AI SDK** — Lightweight, well-typed, streaming-first. Closer to our needs than LangChain. Rejected because: it lacks a provider health monitoring system, routing policy enforcement, and budget guard integration points. It is excellent for UI streaming but not for backend orchestration with governance.
3. **Custom engine (chosen)** — Full control over the call path, zero abstraction over token counting, direct SDK usage (`openai`, `@anthropic-ai/sdk`), explicit fallback chain logic, and clean integration with `packages/cost-engine`. The implementation is ~600 lines of TypeScript — small enough to own completely.

### Consequences

- **Accepted:** We own the implementation. When providers update their SDKs or add new models, we must update our provider adapters.
- **Accepted:** No auto-generated agent tools or RAG utilities — these would need to be built if required in a future phase.
- **Benefit:** The routing policy is stored in the database (`RoutingPolicy` model) and is configurable per workspace per tier, something LangChain does not natively support.
- **Benefit:** Every AI call passes through a single code path, making cost attribution, tracing, and debugging deterministic.

---

## ADR-004: BullMQ + Redis for Job Queues

**Status:** Accepted
**Date:** 2026-04-17

### Context

The core value-generating operations (script generation, TTS, video rendering, platform publishing, analytics ingestion) are long-running, IO-bound, and must not block the HTTP request/response cycle. They need reliable at-least-once delivery, configurable retry with backoff, priority ordering, cron scheduling, and visibility into job state (waiting, active, completed, failed). The choice of queueing infrastructure has major implications for operational complexity and reliability.

### Decision

Use **BullMQ** with **Redis 7** as the job queue system. BullMQ is a fully-featured, TypeScript-native queue library built on Redis. It provides: named queues, typed job payloads, priority, delay, cron repeatable jobs, job progress events, retry with exponential backoff, and a rich event system. The `apps/worker` process runs multiple `Worker` instances pointing to named queues.

### Options Considered

1. **PostgreSQL-backed queue (pg-boss, Graphile Worker)** — Eliminates Redis as an infrastructure dependency. Attractive for operational simplicity. Rejected because: at the expected job throughput (TTS + video render jobs may have 100ms-level lock contention), Redis outperforms Postgres as a queue backend by an order of magnitude; and BullMQ's real-time event streaming (via Redis Pub/Sub) is required for job progress polling.
2. **AWS SQS / Cloud queue service** — Managed, highly durable, no infrastructure to run. Rejected for Phase 1 because: vendor lock-in to AWS is undesirable; SQS does not natively support priority queues or cron scheduling; adding SQS would require deploying to AWS which is out of scope for the self-hosted Phase 1 architecture.
3. **BullMQ + Redis (chosen)** — Runs locally via `docker-compose.yml`, minimal configuration, first-class TypeScript, well-maintained (used in production by major companies), and pairs naturally with `bull-board` or `bull-monitor` for a queue dashboard UI in Phase 2.

### Consequences

- **Accepted:** Redis is added to the infrastructure stack. It must be deployed alongside PostgreSQL in all environments. This is mitigated by the `docker-compose.yml` which starts both services together.
- **Accepted:** BullMQ requires that all job data be JSON-serializable (no class instances, Date objects must be serialized as ISO strings).
- **Watch:** In production, Redis must be configured with `appendonly yes` (AOF persistence) or RDB snapshots to prevent job loss on restart.

---

## ADR-005: Prisma over Raw SQL / Drizzle

**Status:** Accepted
**Date:** 2026-04-17

### Context

The platform has a rich relational schema (~25 models) with complex relationships (User → Workspace → Channel → Script → Video → PublishJob, etc.). The database access layer must support type-safe queries, schema migrations with a deterministic workflow, relation loading, and be maintainable by developers who may not be Postgres experts. The performance requirements are moderate — database queries are not the primary bottleneck (AI inference and video rendering are).

### Decision

Use **Prisma ORM** with the `packages/db` package as the single integration point. The `schema.prisma` file is the single source of truth for the database schema. Prisma Migrate handles all schema changes. The generated `PrismaClient` is consumed directly by `apps/api` and `apps/worker` via the re-exported singleton from `packages/db`.

### Options Considered

1. **Raw SQL with postgres.js or pg** — Maximum control, no ORM overhead, full use of advanced Postgres features (window functions, CTEs, lateral joins). Rejected because: hand-written SQL migrations are error-prone, there is no type inference from queries, and the developer experience for a complex 25-model schema would be significantly worse.
2. **Drizzle ORM** — The current community darling for type-safe SQL. Type inference is excellent; it is closer to SQL than Prisma. Seriously considered. Rejected for this project because: Drizzle's migration story (`drizzle-kit`) is less mature than Prisma Migrate; relation queries require more manual JOIN specification; and Prisma's schema language is more readable as a specification artifact (ADRs, onboarding docs).
3. **Prisma v5 (chosen)** — Battle-tested, excellent VSCode extension for schema editing, automatic type generation, `prisma studio` for local data inspection, and a well-understood `schema.prisma → migration SQL` workflow. The performance characteristics of Prisma Client are well-documented and acceptable for our load profile.

### Consequences

- **Accepted:** Prisma generates a large `node_modules/.prisma` artifact. Docker builds must run `prisma generate` after `npm install`.
- **Accepted:** Prisma's N+1 query behavior for relations must be avoided by explicitly using `include` or `select` rather than lazy loading (Prisma does not have lazy loading by design, which is actually a feature).
- **Watch:** Prisma v6 may introduce breaking changes. Pin the version in `packages/db/package.json` and upgrade deliberately.

---

## ADR-006: Cloudflare R2 for Media Storage

**Status:** Accepted
**Date:** 2026-04-17

### Context

The platform generates substantial binary media: audio files (TTS output, ~1–5MB per video), raw video renders (~50–200MB before platform adaptation), adapted platform variants (~10–50MB each), and thumbnail images (~200KB). These files must be stored durably, accessible by the worker processes for FFmpeg processing, and deliverable to the web frontend via pre-signed URLs or a CDN. Egress cost is a significant concern — video files are large and will be downloaded frequently during platform publishing and preview.

### Decision

Use **Cloudflare R2** as the primary object store for all media assets. R2 is S3-compatible, meaning the standard `@aws-sdk/client-s3` SDK works without modification. The defining advantage of R2 over S3 is **zero egress fees** — reads from R2 to the internet are free. This is critical for a video-heavy platform.

### Options Considered

1. **AWS S3** — The industry standard. Excellent durability, global availability, rich ecosystem. Rejected as primary store because: egress fees are $0.09/GB, which for a video-heavy platform (thousands of videos per workspace) accumulates rapidly; and there is no functional advantage over R2 for our use case.
2. **Backblaze B2** — Similarly priced to R2, also S3-compatible. Rejected because: Cloudflare R2 integrates natively with Cloudflare's CDN (Cloudflare Images, Stream, and Workers) which provides future extensibility for thumbnail serving and video streaming without additional CDN configuration.
3. **Cloudflare R2 (chosen)** — S3-compatible API (no SDK changes), $0.015/GB storage (vs. S3's $0.023/GB), zero egress fees, 10M Class A and 1M Class B operations free per month, and native Cloudflare CDN integration. The `packages/media-pipeline/src/storage/r2-client.ts` implementation uses `@aws-sdk/client-s3` pointed at the R2 endpoint.

### Consequences

- **Accepted:** Cloudflare account required. R2 is not available on the free tier for custom domains without Cloudflare's CDN being active.
- **Accepted:** Pre-signed URLs for R2 expire and must be refreshed. The `AssetManager` handles re-signing on access.
- **Benefit:** Future integration with Cloudflare Stream for adaptive bitrate video streaming is straightforward.

---

## ADR-007: Phase 1 JWT Auth, Phase 2 Auth0 Migration

**Status:** Accepted
**Date:** 2026-04-17

### Context

Authentication is a critical security concern. Options range from fully custom JWT implementations to delegating entirely to a third-party identity provider. The platform targets B2B SaaS usage (workspace-based multi-tenancy), which will eventually require enterprise SSO (SAML, OIDC), MFA, and audit logs. However, in Phase 1, the team and user base is small, and speed of implementation is paramount. Adding Auth0 or a similar service adds a paid dependency and integration complexity before product-market fit is established.

### Decision

**Phase 1:** Implement custom JWT authentication in the API using `@fastify/jwt`. Issue short-lived access tokens (15 minutes) and long-lived refresh tokens (30 days) stored in the `User` table (hashed). The `authenticate` middleware verifies access tokens on every protected request. Password hashing uses `bcryptjs`.

**Phase 2:** Migrate to **Auth0** (or Clerk as an alternative) when the workspace count exceeds 10 or enterprise SSO is required. The migration path is defined: Auth0 user IDs will be stored in the `User.externalId` field (added in a migration) and the `authenticate` middleware will be updated to verify Auth0 JWTs instead of locally-issued ones.

### Options Considered

1. **Auth0 from Day 1** — Best-in-class identity provider with SSO, MFA, anomaly detection, and a generous free tier. Rejected for Phase 1 because: it introduces an external dependency before the product is validated; the M2M token flow for worker processes requires additional Auth0 configuration; and the team velocity benefit of a simple JWT implementation outweighs the Auth0 features during early development.
2. **Clerk** — Modern, developer-friendly auth with excellent Next.js integration via `@clerk/nextjs`. Considered for Phase 2 as an alternative to Auth0. It is noted as the preferred Auth0 alternative if Next.js integration is the primary concern.
3. **Phase 1 JWT → Phase 2 Auth0 (chosen)** — Pragmatic phased approach. The `User.externalId` field is reserved in the Prisma schema from Day 1 to make the migration non-breaking. The `authenticate` middleware is isolated in a single file, making the swap a localized change.

### Consequences

- **Accepted:** Phase 1 auth is a custom implementation and therefore carries the risk of implementation errors. Mitigated by: using well-tested libraries (`@fastify/jwt`, `bcryptjs`), writing unit tests for the auth middleware, and conducting a security review before any production deployment.
- **Accepted:** Phase 2 migration will require a user-facing re-authentication flow or a token migration script.
- **Watch:** The refresh token rotation strategy must be implemented carefully to prevent token reuse attacks. Refresh tokens are single-use; after rotation, the old token is invalidated immediately.

---

## ADR-008: OpenTelemetry for Observability

**Status:** Accepted
**Date:** 2026-04-17

### Context

The platform involves multiple async processes: an HTTP API, a background worker, AI provider calls, database queries, and R2 operations. When something goes wrong (a script generation job silently fails, a video render times out, a provider returns an error), understanding the cause requires tracing the execution path across process boundaries. Logging alone is insufficient for distributed systems. Metrics are needed for cost and performance dashboards. The observability strategy must be decided early because it affects instrumentation throughout the codebase.

### Decision

Use **OpenTelemetry (OTel)** as the single observability framework for traces, metrics, and logs. The Node.js SDK (`@opentelemetry/sdk-node`) is initialized in both `apps/api` and `apps/worker`. Auto-instrumentation packages cover Fastify, Prisma, and HTTP client calls. BullMQ jobs create child spans under the initiating API request trace, propagated via job data. The OTel exporter is configured via the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable, allowing the backend to be swapped between Jaeger (local dev), Grafana Tempo (self-hosted), or Datadog (production) without code changes.

### Options Considered

1. **Datadog APM from Day 1** — Excellent product, auto-instrumentation, and dashboards out of the box. Rejected because: the Datadog agent cost at production scale is significant; it creates vendor lock-in; and using OTel achieves the same instrumentation with the ability to switch backends.
2. **Pino structured logging only** — Minimal approach: rich JSON logs with trace IDs. Sufficient for a monolith. Rejected because: without distributed traces, understanding cross-queue job failures requires manual log correlation, which is painful in a multi-process system.
3. **OpenTelemetry (chosen)** — Vendor-neutral, industry standard, supported by all major observability backends. For local development, `docker-compose.yml` includes Jaeger for trace visualization. For production, the same code exports to any OTLP-compatible backend. Pino is still used for structured logging; OTel trace IDs are injected into log lines for correlation.

### Consequences

- **Accepted:** OTel initialization adds ~50–100ms to cold start time. This is acceptable for a server process that does not cold-start frequently.
- **Accepted:** Developers must add manual span creation for significant code paths (AI calls, media processing steps). This is documented in the contributing guide.
- **Benefit:** BullMQ job payloads include a `traceContext` field carrying the W3C TraceContext headers, enabling end-to-end traces from API request through to job completion.

---

## ADR-009: Tiered AI Cost System as First-Class Feature

**Status:** Accepted
**Date:** 2026-04-17

### Context

AI inference is the dominant variable cost in the platform. A single GPT-4o call for script generation can cost $0.05–$0.50 depending on script length. At scale (100 videos/day per workspace), unconstrained AI spending can result in hundreds of dollars of unexpected charges within hours. The platform must provide cost visibility, pre-run estimation, and hard budget limits as foundational infrastructure, not as an afterthought. Additionally, different users have different cost tolerance: a bootstrapper running 5 videos/week needs different defaults than an agency running 50 videos/day.

### Decision

Build the **Cost Governance Engine** (`packages/cost-engine`) as a first-class feature with three layers:

1. **CostEstimator** — Pre-run estimation using token counting and a pricing table. Called before any AI request to show the user an estimated cost.
2. **BudgetGuard** — A middleware/service layer that checks remaining budget before dispatching AI calls. Returns `BUDGET_EXCEEDED` error if the estimate would exceed the remaining balance for the current period.
3. **TierProfile** — Database-driven tier configurations (FREE, STARTER, PRO, AGENCY) that define default model routing policies and monthly budget caps. The routing engine consults the tier profile to select cheaper models for lower tiers.

This system is implemented in Phase 4 and is used by every AI-consuming route and job from that point forward.

### Options Considered

1. **Soft limits with alerts only** — Track spend and send email alerts but never block. Rejected because: silent budget overruns are unacceptable for a commercial product and could result in chargebacks and user churn.
2. **Cloudflare/OpenAI usage limits** — Rely on provider-side spend limits. Rejected because: provider limits are coarse-grained (monthly totals), do not support per-workspace budget isolation, and do not enable tier-based model routing.
3. **First-class cost engine (chosen)** — Full control over cost visibility, enforcement, and routing optimization. The cost engine enables a key business model feature: upsell from FREE (capped, cheaper models) to PRO (higher budget, GPT-4o) is enforced by the platform itself.

### Consequences

- **Accepted:** Every AI call path must go through the cost engine. This is enforced via the `budget-guard` prehandler on all AI-consuming routes and via direct calls in job handlers.
- **Accepted:** Pricing table (`packages/cost-engine/src/estimator/pricing-table.ts`) must be kept up to date as providers change their pricing. A stale pricing table means inaccurate estimates.
- **Benefit:** The cost ledger provides a complete audit trail of all AI spending, queryable by workspace, provider, model, task type, and time period.

---

## ADR-010: Clean-Room Implementation (No AGPL MoneyPrinterV2 Code)

**Status:** Accepted
**Date:** 2026-04-17

### Context

MoneyPrinterV2 is an open-source tool licensed under the **GNU Affero General Public License v3 (AGPL-3.0)**. The AGPL is a "strong copyleft" license: if you deploy a modified version of AGPL software as a network service (SaaS), you are required to release your complete source code to all users of that service under the same AGPL license. For a commercial SaaS platform, this would mean open-sourcing the entire codebase including all business logic, defeating the competitive moat.

### Decision

Faceless Viral OS is a **clean-room implementation**. No source code, algorithms, or data structures are copied from MoneyPrinterV2 or any other AGPL-licensed project. All developers working on this codebase must confirm they have not read the MoneyPrinterV2 source code immediately before contributing to this project. The platform is inspired by the general concept of automated faceless video creation, but all implementation decisions are made independently and documented in these ADRs.

### Options Considered

1. **Fork MoneyPrinterV2 and operate under AGPL** — Legally permissible. Rejected because: the AGPL would require open-sourcing all platform code, eliminating the ability to build proprietary business logic, and the existing Python/Flask architecture of MoneyPrinterV2 is incompatible with our TypeScript/Fastify/Next.js stack.
2. **Relicense MoneyPrinterV2 via a commercial license** — Some open-source projects offer commercial licenses. MoneyPrinterV2 does not offer this option as of the time of this decision.
3. **Clean-room implementation (chosen)** — Full IP ownership, no license compliance risk, architectural freedom to build a production-grade TypeScript platform. All technical decisions are independently derived and documented. This ADR itself serves as evidence of independent derivation.

### Consequences

- **Accepted:** The platform must be built entirely from scratch. There are no code shortcuts from existing implementations.
- **Accepted:** All contributors must acknowledge in their onboarding that they have not copied code from AGPL projects.
- **Benefit:** Full IP ownership enables the platform to be licensed, sold, or used as a SaaS product without legal encumbrance.
- **Benefit:** The clean-room TypeScript architecture is objectively more suitable for a production SaaS platform than a Python script-based tool, resulting in a better end product.
