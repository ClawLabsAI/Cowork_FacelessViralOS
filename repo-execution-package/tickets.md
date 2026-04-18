# Faceless Viral OS — Implementation Tickets

Tickets are sequenced in dependency order. P0 = must complete before anything else. P1 = required for first vertical slice. P2 = important but not blocking the slice.

---

## FVOS-001

**Title:** Initialize monorepo with Turborepo + pnpm workspaces
**Type:** Infrastructure
**Priority:** P0
**Estimate:** 4 hours

### Description
Bootstrap the complete monorepo structure. This is the foundational step that all other tickets depend on. The output is a working repo where `pnpm install` succeeds, `turbo build` finds all packages and builds them (even if empty stubs), and local dev services start via Docker Compose.

### Acceptance Criteria
- [ ] `pnpm-workspace.yaml` declares `apps/*` and `packages/*` globs
- [ ] `turbo.json` defines `build`, `test`, `lint`, `typecheck`, `dev` pipeline tasks with correct `dependsOn` and `outputs` config
- [ ] `tsconfig.base.json` exists at root with `strict: true`, `moduleResolution: bundler`, `target: ES2022`
- [ ] All 9 workspace packages (`apps/api`, `apps/web`, `apps/worker`, `packages/db`, `packages/core`, `packages/ai-router`, `packages/cost-engine`, `packages/media-pipeline`, `packages/publisher`) have a `package.json` with correct `name`, `version: 0.1.0`, and a stub `src/index.ts`
- [ ] `docker-compose.yml` starts PostgreSQL 16 and Redis 7 on correct ports (5432, 6379)
- [ ] `pnpm install` completes without errors
- [ ] `turbo build` completes (stubs can have empty exports)
- [ ] `.env.example` documents all required environment variables
- [ ] `.gitignore` ignores `node_modules`, `.env`, `dist`, `.turbo`, `.next`
- [ ] Root `Makefile` has `make dev`, `make install`, `make build`, `make test` targets

### Dependencies
None

### Files Affected
```
/package.json
/pnpm-workspace.yaml
/turbo.json
/tsconfig.base.json
/docker-compose.yml
/.env.example
/.gitignore
/.eslintrc.js
/.prettierrc
/Makefile
/apps/api/package.json
/apps/api/tsconfig.json
/apps/api/src/index.ts
/apps/web/package.json
/apps/web/tsconfig.json
/apps/worker/package.json
/apps/worker/tsconfig.json
/packages/db/package.json
/packages/core/package.json
/packages/core/src/index.ts
/packages/ai-router/package.json
/packages/cost-engine/package.json
/packages/media-pipeline/package.json
/packages/publisher/package.json
```

---

## FVOS-002

**Title:** Set up Prisma schema and run first migration
**Type:** Infrastructure
**Priority:** P0
**Estimate:** 6 hours

### Description
Add the complete Prisma schema to `packages/db`, configure the Prisma client singleton, run the initial migration against a local PostgreSQL instance, and write a seed script that creates a usable development dataset.

### Acceptance Criteria
- [ ] `packages/db/prisma/schema.prisma` matches the canonical schema in `repo-execution-package/schema.prisma` (all 28 models, all 18 enums)
- [ ] `prisma generate` completes without errors and produces `@prisma/client`
- [ ] `prisma migrate dev --name init` creates a migration file under `packages/db/prisma/migrations/`
- [ ] `packages/db/src/client.ts` exports a singleton `PrismaClient` instance with `log: ['error', 'warn']` in non-production
- [ ] `packages/db/src/index.ts` re-exports `PrismaClient` and all Prisma generated types
- [ ] `packages/db/prisma/seed.ts` creates:
  - 1 demo Workspace (slug: `demo-workspace`, tier: `PRO`)
  - 1 admin User (email: `admin@demo.local`, password: `changeme123`)
  - 1 Membership linking user to workspace as `OWNER`
  - 1 Channel (name: `Finance Tips`, language: `EN`, status: `ACTIVE`)
  - 2 Provider records (OpenAI, Anthropic) with 3 Model records each
  - 1 TierProfile for the demo workspace
  - 1 Budget (monthly, $50 limit)
- [ ] `pnpm --filter @fvos/db db:seed` runs seed without errors
- [ ] `packages/db/package.json` has scripts: `db:migrate`, `db:migrate:prod`, `db:seed`, `db:studio`, `db:generate`

### Dependencies
FVOS-001

### Files Affected
```
/packages/db/package.json
/packages/db/prisma/schema.prisma
/packages/db/prisma/seed.ts
/packages/db/prisma/migrations/          (auto-generated)
/packages/db/src/client.ts
/packages/db/src/index.ts
```

---

## FVOS-003

**Title:** Implement JWT auth middleware for Fastify
**Type:** Feature
**Priority:** P0
**Estimate:** 5 hours

### Description
Build the authentication layer for the Fastify API: login/refresh/logout routes, JWT issuance with short-lived access tokens + long-lived refresh tokens, and a reusable `authenticate` prehandler that protects all non-auth routes.

### Acceptance Criteria
- [ ] `@fastify/jwt` plugin registered in `apps/api/src/plugins/auth.ts` with `JWT_SECRET` from config
- [ ] `POST /api/v1/auth/login` returns `{ accessToken, refreshToken, expiresIn, user, workspaces }` on valid credentials
- [ ] `POST /api/v1/auth/login` returns `401` with `{ code: 'INVALID_CREDENTIALS' }` on bad credentials
- [ ] Password comparison uses `bcryptjs.compare()` — no timing-safe shortcut
- [ ] Access tokens expire in 900 seconds (15 minutes), contain `{ sub: userId, workspaceId, role, iat, exp }`
- [ ] Refresh tokens are stored hashed (`bcryptjs.hash()`, rounds: 10) in `User.refreshToken`
- [ ] `POST /api/v1/auth/refresh` validates refresh token, rotates it (old token invalidated), returns new pair
- [ ] `POST /api/v1/auth/logout` clears `User.refreshToken` in DB
- [ ] `apps/api/src/middleware/authenticate.ts` prehandler verifies JWT, attaches `req.user` to request
- [ ] Unauthenticated requests to protected routes return `401 { code: 'UNAUTHORIZED' }`
- [ ] Unit tests cover: login success, login fail, refresh success, refresh reuse attack (second use of old token returns 401), logout
- [ ] `apps/api/src/config.ts` exports typed config using Zod; fails fast at startup if `JWT_SECRET` or `JWT_REFRESH_SECRET` missing

### Dependencies
FVOS-001, FVOS-002

### Files Affected
```
/apps/api/src/config.ts
/apps/api/src/app.ts
/apps/api/src/plugins/auth.ts
/apps/api/src/plugins/sensible.ts
/apps/api/src/plugins/error-handler.ts
/apps/api/src/middleware/authenticate.ts
/apps/api/src/routes/auth/login.ts
/apps/api/src/routes/auth/refresh.ts
/apps/api/src/routes/auth/logout.ts
/apps/api/src/routes/index.ts
/apps/api/src/schemas/auth.schema.ts
/apps/api/test/unit/auth.test.ts
```

---

## FVOS-004

**Title:** Build Provider Registry in ai-router package
**Type:** Feature
**Priority:** P1
**Estimate:** 6 hours

### Description
Implement the `ProviderRegistry` class that holds the runtime state of all configured AI providers. The registry loads provider configurations from the `Provider` and `Model` DB tables on startup, stores health state, and exposes methods for querying available providers by type, tier, and health status.

### Acceptance Criteria
- [ ] `IProvider` interface defined in `packages/ai-router/src/registry/provider.interface.ts` with methods: `complete(options): Promise<CompletionResult>`, `health(): Promise<ProviderHealth>`, `name: string`
- [ ] `ProviderRegistry` class implemented with:
  - `register(provider: IProvider): void`
  - `getProvider(name: string): IProvider | null`
  - `getHealthyProviders(type: ProviderType): IProvider[]`
  - `updateHealth(name: string, health: ProviderHealth): void`
  - `getAll(): ProviderInfo[]`
- [ ] `ProviderRegistry` loads initial data from DB (`Provider` + `Model` tables) on `initialize()`
- [ ] Health state stored in-memory (not reloaded from DB on every call — DB is source of truth for persistence, Redis for runtime)
- [ ] `ModelCatalog` in `packages/ai-router/src/registry/model-catalog.ts` provides static metadata (context windows, pricing, capabilities) for all supported model IDs
- [ ] `HealthMonitor` pings each registered provider every 60 seconds, updates registry health state and writes to `Provider.health` in DB
- [ ] Unit tests cover: register, getHealthyProviders filters correctly, health updates propagate

### Dependencies
FVOS-001, FVOS-002

### Files Affected
```
/packages/ai-router/package.json
/packages/ai-router/src/index.ts
/packages/ai-router/src/registry/provider.interface.ts
/packages/ai-router/src/registry/provider-registry.ts
/packages/ai-router/src/registry/model-catalog.ts
/packages/ai-router/src/routing/health-monitor.ts
/packages/ai-router/src/types/provider.types.ts
/packages/ai-router/src/types/router.types.ts
/packages/ai-router/test/unit/provider-registry.test.ts
/packages/ai-router/test/mocks/mock-provider.ts
```

---

## FVOS-005

**Title:** Implement Model Routing Engine core logic
**Type:** Feature
**Priority:** P1
**Estimate:** 8 hours

### Description
Build the `AIRouter` class and `PolicyEngine` that form the core of the model routing system. Given a `RouteRequest` (task type, workspace tier, estimated tokens, optional preferred model), the engine selects the best available provider+model and executes the call. If the primary fails, it falls through the fallback chain.

### Acceptance Criteria
- [ ] `AIRouter` class in `packages/ai-router/src/router.ts` with method `complete(request: RouteRequest): Promise<RouteResponse>`
- [ ] `PolicyEngine` evaluates a `RoutingPolicy` (loaded from DB or using default) to select provider + model for a given task type + tier
- [ ] `FallbackChain` executes providers in priority order; catches `ProviderError` and moves to next provider; throws `AllProvidersFailedError` if all fail
- [ ] `RouteResponse` includes: `text: string`, `provider: string`, `modelId: string`, `inputTokens: number`, `outputTokens: number`, `latencyMs: number`
- [ ] Default routing policy:
  - `SCRIPT_GENERATION`: PRO → GPT-4o → fallback: Claude 3.5 Sonnet; FREE → GPT-4o-mini → fallback: Claude 3 Haiku
  - `SCENE_PROMPT_GENERATION`: all tiers → GPT-4o-mini → fallback: Claude 3 Haiku
  - `IDEA_GENERATION`: all tiers → GPT-4o-mini
- [ ] `LoadBalancer` distributes requests across multiple healthy instances of equivalent models using weighted round-robin
- [ ] Router emits OpenTelemetry span for each call with attributes: `ai.provider`, `ai.model`, `ai.task_type`, `ai.input_tokens`, `ai.output_tokens`, `ai.latency_ms`
- [ ] Unit tests cover: policy selection, fallback on provider error, all-providers-failed error, load balancer distribution

### Dependencies
FVOS-004

### Files Affected
```
/packages/ai-router/src/router.ts
/packages/ai-router/src/routing/policy-engine.ts
/packages/ai-router/src/routing/fallback-chain.ts
/packages/ai-router/src/routing/load-balancer.ts
/packages/ai-router/src/context/prompt-builder.ts
/packages/ai-router/src/context/token-counter.ts
/packages/ai-router/test/unit/router.test.ts
/packages/ai-router/test/unit/policy-engine.test.ts
/packages/ai-router/test/unit/fallback-chain.test.ts
```

---

## FVOS-006

**Title:** Build Cost Estimator (pre-run)
**Type:** Feature
**Priority:** P1
**Estimate:** 5 hours

### Description
Implement the `CostEstimator` class that produces a USD cost estimate before any AI call is made. The estimator uses token counting + a pricing table to compute estimated input and output cost. The estimate is shown to users in the API response and consumed by the `BudgetGuard`.

### Acceptance Criteria
- [ ] `CostEstimator` class in `packages/cost-engine/src/estimator/cost-estimator.ts`
- [ ] `estimate(params: EstimateParams): CostEstimate` method accepts: `taskType`, `modelId`, `promptText`, `estimatedOutputTokens`
- [ ] Returns `CostEstimate`: `{ inputTokens, estimatedOutputTokens, inputCostUsd, outputCostUsd, totalEstimatedUsd, modelId, provider }`
- [ ] `pricing-table.ts` contains accurate pricing for: `gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo`, `claude-3-5-sonnet-20241022`, `claude-3-haiku-20240307`, `claude-3-opus-20240229`
- [ ] `media-pricing.ts` contains: ElevenLabs ($/char), OpenAI TTS ($/char), DALL-E 3 ($/image), standard video render ($/minute)
- [ ] Token counting uses `tiktoken` for OpenAI models and character-based approximation for Anthropic (4 chars/token)
- [ ] Unit tests cover: estimate for each supported model, media pricing calculations, edge cases (empty prompt, max context)

### Dependencies
FVOS-004

### Files Affected
```
/packages/cost-engine/package.json
/packages/cost-engine/src/index.ts
/packages/cost-engine/src/estimator/cost-estimator.ts
/packages/cost-engine/src/estimator/pricing-table.ts
/packages/cost-engine/src/estimator/media-pricing.ts
/packages/cost-engine/src/types/cost-engine.types.ts
/packages/cost-engine/test/unit/cost-estimator.test.ts
```

---

## FVOS-007

**Title:** Build Cost Ledger (post-run recording)
**Type:** Feature
**Priority:** P1
**Estimate:** 4 hours

### Description
Implement the `CostLedger` class that records actual AI call costs to the `CostLedger` DB table after each call completes. The ledger is the audit trail for all AI spending and feeds the cost summary and budget recalculation.

### Acceptance Criteria
- [ ] `CostLedger` class in `packages/cost-engine/src/ledger/cost-ledger.ts`
- [ ] `record(entry: LedgerEntry): Promise<void>` writes a record to the `cost_ledger` DB table
- [ ] `LedgerEntry` type includes all fields: `workspaceId`, `taskType`, `provider`, `modelId`, `inputTokens`, `outputTokens`, `costUsd`, `jobId`, `traceId`, `entityId`, `entityType`
- [ ] Actual cost calculated from actual token counts returned by provider (not the pre-run estimate)
- [ ] `LedgerAggregator` in `ledger-aggregator.ts` has method `summarize(workspaceId, from, to): Promise<LedgerSummary>` that aggregates by provider and taskType
- [ ] `CostLedger.record()` also calls `Budget.spentUsd += entry.costUsd` for the active budget in a DB transaction (atomic)
- [ ] Unit tests cover: record creates DB row, aggregation query returns correct totals, budget increment

### Dependencies
FVOS-002, FVOS-006

### Files Affected
```
/packages/cost-engine/src/ledger/cost-ledger.ts
/packages/cost-engine/src/ledger/ledger-aggregator.ts
/packages/cost-engine/test/unit/cost-ledger.test.ts
/packages/cost-engine/test/fixtures/usage-fixtures.ts
```

---

## FVOS-008

**Title:** Build Budget Guard middleware
**Type:** Feature
**Priority:** P1
**Estimate:** 4 hours

### Description
Implement the `BudgetGuard` as both a Fastify prehandler middleware (for API routes) and a callable service (for job handlers). Before any AI-consuming operation, the guard checks the workspace's remaining budget. If the estimate would exceed the remaining balance, the operation is blocked with a `BUDGET_EXCEEDED` error.

### Acceptance Criteria
- [ ] `BudgetGuard` class in `packages/cost-engine/src/budget/budget-guard.ts`
- [ ] `check(workspaceId, estimate: CostEstimate): Promise<BudgetCheckResult>` method
- [ ] `BudgetCheckResult`: `{ allowed: boolean, remainingUsd: number, budget: BudgetSummary, errorCode?: 'BUDGET_EXCEEDED' | 'NO_BUDGET_CONFIGURED' }`
- [ ] Guard first checks Redis key `fvos:budget:${workspaceId}:exceeded` (fast path — set by `budget-check` job)
- [ ] If Redis key absent, falls back to DB check: loads active `Budget` record, computes remaining = `limitUsd - spentUsd`
- [ ] Fastify prehandler version exported for use in `apps/api/src/middleware/budget-guard.ts`
- [ ] Prehandler reads `workspaceId` from `req.user`, calls `BudgetGuard.check()`, returns `402 { code: 'BUDGET_EXCEEDED', remaining: n }` if blocked
- [ ] `AlertService` in `alert-service.ts` sends webhook payload to configured `alertWebhookUrl` when threshold crossed
- [ ] Unit tests cover: allowed when under budget, blocked when exceeded, Redis fast path, no budget configured (allow through with warning)

### Dependencies
FVOS-003, FVOS-006, FVOS-007

### Files Affected
```
/packages/cost-engine/src/budget/budget-guard.ts
/packages/cost-engine/src/budget/budget-service.ts
/packages/cost-engine/src/budget/alert-service.ts
/apps/api/src/middleware/budget-guard.ts
/packages/cost-engine/test/unit/budget-guard.test.ts
```

---

## FVOS-009

**Title:** Implement OpenAI provider adapter
**Type:** Feature
**Priority:** P1
**Estimate:** 5 hours

### Description
Build the concrete OpenAI `IProvider` implementation that wraps the `openai` SDK. This is the first real provider adapter and the one used in the default routing policy for script generation.

### Acceptance Criteria
- [ ] `OpenAIProvider` class in `packages/ai-router/src/providers/openai.provider.ts` implements `IProvider`
- [ ] `complete(options: CompletionOptions): Promise<CompletionResult>` calls `openai.chat.completions.create()` with correct params
- [ ] `CompletionOptions`: `{ model, messages, temperature?, maxTokens?, systemPrompt?, responseFormat? }`
- [ ] `CompletionResult`: `{ text, inputTokens, outputTokens, finishReason, provider: 'openai', modelId }`
- [ ] Handles `APIError` from OpenAI SDK: rate limit (429) → `ProviderRateLimitError`, server error (5xx) → `ProviderUnavailableError`, auth error (401) → throws (non-retryable)
- [ ] `health()` method calls `openai.models.list()` with a 3-second timeout; returns `HEALTHY` or `DOWN`
- [ ] `OPENAI_API_KEY` loaded from environment via `packages/ai-router` config module; throws at init if missing
- [ ] OpenTelemetry span created for each call with model, token, and latency attributes
- [ ] Unit tests with mocked `openai` SDK: successful completion, rate limit error triggers `ProviderRateLimitError`, health check success and failure

### Dependencies
FVOS-004

### Files Affected
```
/packages/ai-router/src/providers/openai.provider.ts
/packages/ai-router/src/config.ts
/packages/ai-router/test/unit/openai.provider.test.ts
```

---

## FVOS-010

**Title:** Implement Anthropic provider adapter
**Type:** Feature
**Priority:** P1
**Estimate:** 5 hours

### Description
Build the Anthropic `IProvider` implementation wrapping `@anthropic-ai/sdk`. This provides the fallback provider in the default routing policy.

### Acceptance Criteria
- [ ] `AnthropicProvider` class in `packages/ai-router/src/providers/anthropic.provider.ts` implements `IProvider`
- [ ] `complete(options: CompletionOptions): Promise<CompletionResult>` calls `anthropic.messages.create()` correctly
- [ ] Anthropic SDK uses `messages` API format — adapter must map from the shared `CompletionOptions` format (which uses OpenAI-style `messages[]`) to Anthropic's `{ system, messages }` format
- [ ] Token counting for Anthropic uses character-based approximation (4 chars ≈ 1 token) since Anthropic does not expose a client-side tiktoken equivalent
- [ ] Actual token counts taken from `response.usage.input_tokens` and `response.usage.output_tokens`
- [ ] Error handling mirrors OpenAI adapter: rate limit → `ProviderRateLimitError`, 5xx → `ProviderUnavailableError`
- [ ] `health()` calls a minimal `anthropic.messages.create()` with `max_tokens: 1`; returns `HEALTHY` or `DOWN`
- [ ] `ANTHROPIC_API_KEY` required at init
- [ ] Unit tests: successful completion, message format conversion, error mapping

### Dependencies
FVOS-004

### Files Affected
```
/packages/ai-router/src/providers/anthropic.provider.ts
/packages/ai-router/test/unit/anthropic.provider.test.ts
```

---

## FVOS-011

**Title:** Build POST /api/v1/scripts/generate endpoint
**Type:** Feature
**Priority:** P1
**Estimate:** 6 hours

### Description
Implement the first user-facing AI-consuming API endpoint. This route orchestrates the pre-flight checks (auth, workspace guard, budget guard), creates the Script record, and enqueues the `script-generation` BullMQ job. The response returns immediately with the job ID.

### Acceptance Criteria
- [ ] `POST /api/v1/scripts/generate` route registered and protected by `authenticate` and `workspace-guard` prehandlers
- [ ] Request validated with Zod schema matching `GenerateScriptRequest` interface in `api-routes.md`
- [ ] `BudgetGuard` prehandler runs before handler; returns `402` if budget exceeded
- [ ] Handler creates `Script` record in DB with `status = 'DRAFT'` synchronously before enqueuing
- [ ] Handler builds `ScriptGenerationJobPayload` with all required fields including `traceContext` (W3C headers from current OTel span)
- [ ] Job enqueued to `content` queue with `priority: 7` and `attempts: 3`
- [ ] `CostEstimator` called to produce pre-run estimate included in response
- [ ] Response matches `GenerateScriptResponse` interface: `{ jobId, estimatedCostUsd, estimatedDurationSec, script: { id, status, title, createdAt } }`
- [ ] `GET /api/v1/scripts/:id` also implemented (returns script with scenes; see api-routes.md)
- [ ] Integration test using `fastify.inject()`: POST → 200 with job ID, unauthenticated POST → 401, budget exceeded → 402

### Dependencies
FVOS-003, FVOS-005, FVOS-006, FVOS-008

### Files Affected
```
/apps/api/src/routes/scripts/generate.ts
/apps/api/src/routes/scripts/get.ts
/apps/api/src/routes/scripts/list.ts
/apps/api/src/schemas/script.schema.ts
/apps/api/src/lib/queue.ts
/apps/api/src/middleware/workspace-guard.ts
/apps/api/test/integration/scripts.test.ts
```

---

## FVOS-012

**Title:** Build BullMQ worker for script-generation queue
**Type:** Feature
**Priority:** P1
**Estimate:** 8 hours

### Description
Implement the `apps/worker` entry point and the `script-generation` job handler. This is the first end-to-end job that calls the AI router, parses the response, writes to DB, and records cost. When this ticket is complete, the first full vertical slice (POST endpoint → queue → AI → DB) is functional.

### Acceptance Criteria
- [ ] `apps/worker/src/main.ts` initializes Prisma, Redis connection, and all Worker instances; handles `SIGTERM` gracefully (drains active jobs before shutdown)
- [ ] `ContentWorker` registered for `content` queue with `concurrency: 5`
- [ ] `ScriptGenerationJob` handler in `apps/worker/src/jobs/content/script-generation.job.ts`:
  - Calls `AIRouter.complete()` with `SCRIPT_GENERATION` task type
  - Parses response with Zod schema (extracts `hook`, `body`, `callToAction`, `scenes[]`)
  - Writes `Script` + `ScriptScene` records in a single Prisma transaction
  - Updates `Script.status = 'REVIEW'` on success, `'DRAFT'` on failure
  - Calls `CostLedger.record()` with actual token counts
  - Reports BullMQ job progress at 5%, 50%, 90%, 100% checkpoints
- [ ] On job failure: `Script.rejectionNote` updated with error message; `Script.status = 'DRAFT'` (not FAILED — remains editable)
- [ ] OTel trace span created with correct attributes; `traceContext` from payload used to continue the parent trace
- [ ] Worker logs each job start, completion, and failure with structured Pino log including `jobId`, `scriptId`, `workspaceId`
- [ ] Unit test for job handler using mocked `AIRouter` and `PrismaClient`

### Dependencies
FVOS-005, FVOS-007, FVOS-011

### Files Affected
```
/apps/worker/package.json
/apps/worker/src/main.ts
/apps/worker/src/config.ts
/apps/worker/src/workers/content.worker.ts
/apps/worker/src/jobs/content/script-generation.job.ts
/apps/worker/src/lib/prisma.ts
/apps/worker/src/lib/redis.ts
/apps/worker/test/jobs/script-generation.test.ts
```

---

## FVOS-013

**Title:** Set up OpenTelemetry tracing
**Type:** Infrastructure
**Priority:** P1
**Estimate:** 5 hours

### Description
Initialize OpenTelemetry SDK in both `apps/api` and `apps/worker`. Configure auto-instrumentation for Fastify, Prisma, HTTP clients, and BullMQ. Ensure that traces flow end-to-end from incoming HTTP request through the job queue to job completion.

### Acceptance Criteria
- [ ] `@opentelemetry/sdk-node` initialized in `apps/api/src/plugins/telemetry.ts` and `apps/worker/src/lib/telemetry.ts` before any other imports
- [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_SERVICE_NAME` read from environment
- [ ] Auto-instrumentation enabled for: `@opentelemetry/instrumentation-fastify`, `@opentelemetry/instrumentation-http`, `@opentelemetry/instrumentation-pg`
- [ ] Custom Prisma instrumentation: middleware wraps each Prisma operation in a span with `db.operation` and `db.table` attributes
- [ ] BullMQ job payloads include `traceContext: { traceparent, tracestate }` field populated from the active span before enqueue
- [ ] Job handlers extract `traceContext` from payload and start a child span using `propagator.extract()`
- [ ] `docker-compose.yml` includes Jaeger all-in-one on port 16686 for local trace visualization
- [ ] Verify: a POST to `/api/v1/scripts/generate` produces a trace in Jaeger with spans: `fastify.request`, `prisma.create`, `bullmq.enqueue`
- [ ] In production mode, OTLP exporter sends to `OTEL_EXPORTER_OTLP_ENDPOINT`; in development, console exporter also active

### Dependencies
FVOS-003

### Files Affected
```
/apps/api/src/plugins/telemetry.ts
/apps/api/src/main.ts
/apps/worker/src/lib/telemetry.ts
/apps/worker/src/main.ts
/docker-compose.yml                  (add Jaeger service)
/packages/core/src/utils/trace.ts    (helper: extractTraceContext, injectTraceContext)
```

---

## FVOS-014

**Title:** Write unit tests for Model Routing Engine
**Type:** Feature
**Priority:** P1
**Estimate:** 5 hours

### Description
Write comprehensive unit tests for the `packages/ai-router` package. Cover the `PolicyEngine`, `FallbackChain`, `AIRouter`, and `ProviderRegistry`. Use a `MockProvider` to avoid real API calls.

### Acceptance Criteria
- [ ] Test coverage for `packages/ai-router` >= 80% branch coverage (enforced in CI via `--coverage` threshold)
- [ ] `PolicyEngine` tests:
  - Selects correct model for each `taskType` + `tier` combination
  - Returns fallback model when primary model is unavailable (provider health = DOWN)
  - Reads custom `RoutingPolicy` when provided vs. falling back to default
- [ ] `FallbackChain` tests:
  - Calls primary provider first
  - On `ProviderRateLimitError`: moves to next provider in chain
  - On `ProviderUnavailableError`: moves to next provider in chain
  - Throws `AllProvidersFailedError` when all providers in chain fail
  - Does NOT retry on `ProviderAuthError` (non-retryable)
- [ ] `ProviderRegistry` tests:
  - `getHealthyProviders()` returns only providers with `HEALTHY` or `DEGRADED` status
  - `updateHealth()` correctly mutates health state
- [ ] `AIRouter.complete()` integration test (mocked providers):
  - Returns `RouteResponse` with provider, model, tokens, latency
  - Routes to correct tier-appropriate model
- [ ] `MockProvider` in `test/mocks/mock-provider.ts` is a controllable fake implementing `IProvider`

### Dependencies
FVOS-005, FVOS-009, FVOS-010

### Files Affected
```
/packages/ai-router/test/unit/router.test.ts
/packages/ai-router/test/unit/policy-engine.test.ts
/packages/ai-router/test/unit/fallback-chain.test.ts
/packages/ai-router/test/unit/provider-registry.test.ts
/packages/ai-router/test/mocks/mock-provider.ts
/packages/ai-router/vitest.config.ts
```

---

## FVOS-015

**Title:** Write integration test for script generation pipeline
**Type:** Feature
**Priority:** P1
**Estimate:** 6 hours

### Description
Write an end-to-end integration test that covers the full script generation vertical slice: HTTP request → auth → budget check → DB write → BullMQ job enqueue → job processing → DB update. This test uses real PostgreSQL and Redis (from `docker-compose.test.yml`) but mocks the AI provider to return a fixed response.

### Acceptance Criteria
- [ ] `docker-compose.test.yml` starts isolated PostgreSQL (port 5433) and Redis (port 6380) for tests
- [ ] Test setup runs migrations against test DB before the suite
- [ ] `MockProvider` returns deterministic script JSON: `{ hook: "...", body: "...", scenes: [...] }`
- [ ] Integration test scenario:
  1. Create workspace + user + channel in test DB (using seed helpers)
  2. POST `/api/v1/auth/login` → get access token
  3. POST `/api/v1/scripts/generate` → assert `200`, receive `scriptId` and `jobId`
  4. Wait for BullMQ job to complete (poll `GET /api/v1/scripts/:id` max 10s with 500ms interval)
  5. Assert `Script.status === 'REVIEW'`
  6. Assert `Script.hook`, `Script.body` are populated
  7. Assert `ScriptScene` records created
  8. Assert `CostLedger` record created with correct `workspaceId` and `taskType`
  9. Assert `Budget.spentUsd` incremented
- [ ] Test for budget exceeded path: set `Budget.spentUsd = Budget.limitUsd`, POST → assert `402`
- [ ] Tests run in CI via `turbo test` with `DATABASE_URL` and `REDIS_URL` pointing to `docker-compose.test.yml` services
- [ ] Test teardown truncates all tables (not drops — faster)

### Dependencies
FVOS-011, FVOS-012, FVOS-013

### Files Affected
```
/docker-compose.test.yml
/apps/api/test/integration/script-pipeline.test.ts
/apps/api/test/helpers/db-setup.ts        (migration + seed helpers for tests)
/apps/api/test/helpers/auth-helpers.ts    (login and token helpers)
/apps/worker/test/helpers/worker-test-utils.ts  (start/stop worker in test)
/vitest.workspace.ts                       (Vitest workspace config for monorepo)
```
