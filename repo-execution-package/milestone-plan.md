# Faceless Viral OS — Milestone Plan

This document defines the first 5 milestones for building the Faceless Viral OS platform from zero to the first end-to-end working feature. Each milestone ends with a clear, verifiable done state.

---

## Milestone 0: Repo Bootstrap

**Days:** 1–2
**Tickets:** FVOS-001
**Goal:** A working monorepo where every developer can run `pnpm install && make dev` and get all local services started.

---

### Tasks

**Day 1: Scaffold**

1. Create root directory and initialize git repo
2. Create `pnpm-workspace.yaml`
3. Create root `package.json` with `engines: { node: ">=20", pnpm: ">=9" }`
4. Create `turbo.json` — full pipeline definition:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["NODE_ENV", "DATABASE_URL", "REDIS_URL"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": { "outputs": [] },
    "test": {
      "dependsOn": ["^build"],
      "env": ["DATABASE_URL", "REDIS_URL"]
    },
    "dev": { "persistent": true, "cache": false }
  }
}
```

5. Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

6. Create all 9 workspace `package.json` files with correct internal dependency declarations
7. Create stub `src/index.ts` in each package with a single export comment
8. Run `pnpm install` — verify lock file generated

**Day 2: Infrastructure files**

9. Create `docker-compose.yml`:
```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: fvos_dev
      POSTGRES_USER: fvos
      POSTGRES_PASSWORD: fvos_secret
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --appendonly yes
    volumes: [redis_data:/data]
volumes:
  postgres_data:
  redis_data:
```

10. Create `.env.example` with all 15 required env variables documented with comments
11. Create `Makefile`:
```makefile
.PHONY: dev install build test migrate seed

dev:
	docker-compose up -d && pnpm turbo dev

install:
	pnpm install

build:
	pnpm turbo build

test:
	docker-compose -f docker-compose.test.yml up -d && pnpm turbo test

migrate:
	pnpm --filter @fvos/db db:migrate

seed:
	pnpm --filter @fvos/db db:seed
```

12. Create `.eslintrc.js` with TypeScript rules + `no-restricted-imports` for dependency boundary enforcement
13. Create `.prettierrc`
14. Create `.gitignore`

### Commands to Run
```bash
pnpm install
pnpm turbo build       # should complete — stubs have no real code yet
docker-compose up -d   # starts postgres + redis
```

### Done Criteria
- [ ] `pnpm install` exits 0 with no peer dep warnings
- [ ] `turbo build` completes for all 9 packages (even if output is empty)
- [ ] `docker-compose up -d` starts postgres + redis, both healthy
- [ ] `docker-compose ps` shows 2 services running
- [ ] No TypeScript errors in stub files
- [ ] Git repo has at least one commit: "feat: initialize monorepo scaffold"

---

## Milestone 1: Data Foundation

**Days:** 3–5
**Tickets:** FVOS-002
**Goal:** Complete Prisma schema applied to a real database. Developers can inspect tables in Prisma Studio, run seed, and query the demo dataset.

---

### Tasks

**Day 3: Schema**

1. Copy `schema.prisma` from repo-execution-package to `packages/db/prisma/schema.prisma`
2. Install Prisma dependencies:
```bash
pnpm --filter @fvos/db add -D prisma
pnpm --filter @fvos/db add @prisma/client
```
3. Run `prisma format` — fix any whitespace/syntax issues
4. Run `prisma validate` — must pass with 0 errors
5. Create `packages/db/src/client.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Day 4: Migration + seed**

6. Copy `.env.example` to `.env`, fill in `DATABASE_URL=postgresql://fvos:fvos_secret@localhost:5432/fvos_dev`
7. Run first migration:
```bash
pnpm --filter @fvos/db db:migrate  # runs: prisma migrate dev --name init
```
8. Verify migration SQL file created in `packages/db/prisma/migrations/`
9. Write seed script `packages/db/prisma/seed.ts` — creates all demo data
10. Run `pnpm --filter @fvos/db db:seed`

**Day 5: Package wiring**

11. Update `packages/db/src/index.ts`:
```typescript
export { prisma } from './client';
export * from '@prisma/client';
```
12. Add `packages/db` as a dependency in `apps/api/package.json` and `apps/worker/package.json`
13. Write a quick smoke test: `packages/db/test/smoke.test.ts` that counts users and asserts > 0 after seed
14. Open Prisma Studio: `pnpm --filter @fvos/db db:studio` — visually inspect tables

### Commands to Run
```bash
docker-compose up -d
cp .env.example .env
# edit .env with DATABASE_URL
pnpm --filter @fvos/db db:generate
pnpm --filter @fvos/db db:migrate
pnpm --filter @fvos/db db:seed
pnpm --filter @fvos/db db:studio    # opens http://localhost:5555
```

### Done Criteria
- [ ] `prisma validate` exits 0
- [ ] `prisma migrate dev --name init` creates SQL migration file with all 28 tables
- [ ] All 18 enums created in PostgreSQL
- [ ] `prisma migrate status` shows "Database schema is up to date"
- [ ] Seed creates: 1 workspace, 1 user, 1 membership, 1 channel, 2 providers, 6 models, 1 tier profile, 1 budget
- [ ] Prisma Studio accessible at localhost:5555 showing all tables with seed data
- [ ] `packages/db/src/index.ts` exports `PrismaClient` and all generated types
- [ ] `pnpm turbo build` still passes after adding prisma to the build

---

## Milestone 2: Auth + API Shell

**Days:** 6–8
**Tickets:** FVOS-003
**Goal:** A running Fastify API server with JWT authentication. `POST /auth/login` returns a working token. All protected routes return 401 without a valid token.

---

### Tasks

**Day 6: Fastify app setup**

1. Install API dependencies:
```bash
pnpm --filter @fvos/api add fastify @fastify/jwt @fastify/cors @fastify/rate-limit @fastify/sensible bcryptjs zod @fastify/type-provider-zod pino
pnpm --filter @fvos/api add -D @types/bcryptjs vitest
```
2. Create `apps/api/src/config.ts` — Zod-validated config parser:
```typescript
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  // ... all other vars
});

export const config = configSchema.parse(process.env);
```
3. Create `apps/api/src/app.ts` — Fastify factory function returning the app instance
4. Create `apps/api/src/main.ts` — calls `buildApp()`, starts server, handles graceful shutdown
5. Register plugins: cors, sensible, rate-limit, jwt, error-handler

**Day 7: Auth routes**

6. Create `apps/api/src/middleware/authenticate.ts`:
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid or missing token' });
  }
}
```
7. Implement `POST /auth/login` — query user, compare password, issue tokens
8. Implement `POST /auth/refresh` — validate hashed refresh token, rotate, return new pair
9. Implement `POST /auth/logout` — clear refresh token field in DB
10. Implement `GET /api/v1/channels` and `GET /api/v1/channels/:id` as warm-up routes (uses `authenticate` prehandler)
11. Write unit tests for auth routes

**Day 8: Workspace guard + validation**

12. Create `workspace-guard.ts` middleware — extracts `workspaceId` from route param or body, verifies membership
13. Create Zod schemas for auth routes
14. Register all routes under `/api/v1` prefix in `src/routes/index.ts`
15. Run manual Postman/curl tests:
```bash
# Start the API
pnpm --filter @fvos/api dev

# Test login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.local","password":"changeme123"}'
# Expected: 200 with accessToken

# Test protected route without token
curl http://localhost:3001/api/v1/channels
# Expected: 401
```

### Commands to Run
```bash
pnpm --filter @fvos/api dev          # starts API on port 3001
pnpm --filter @fvos/api test         # runs unit tests
```

### Done Criteria
- [ ] Fastify server starts without errors on `PORT=3001`
- [ ] `POST /auth/login` with seed credentials returns `{ accessToken, refreshToken, expiresIn, user, workspaces }`
- [ ] `POST /auth/login` with wrong password returns `401 { code: 'INVALID_CREDENTIALS' }`
- [ ] `GET /api/v1/channels` without token returns `401`
- [ ] `GET /api/v1/channels` with valid token returns `200` with channels list
- [ ] `POST /auth/refresh` rotates token (re-using old refresh token returns 401)
- [ ] `POST /auth/logout` clears refresh token
- [ ] All auth unit tests pass
- [ ] Config fails fast at startup if `JWT_SECRET` is missing from `.env`
- [ ] `turbo build` passes for `apps/api`

---

## Milestone 3: Model Routing Engine

**Days:** 9–12
**Tickets:** FVOS-004, FVOS-005, FVOS-009, FVOS-010, FVOS-014
**Goal:** A fully tested Model Routing Engine. Given a task type and workspace tier, the engine selects the correct provider+model, makes the call, and returns the result with token usage. Fallback chain works.

---

### Tasks

**Day 9: Provider Registry + interfaces**

1. Install ai-router dependencies:
```bash
pnpm --filter @fvos/ai-router add openai @anthropic-ai/sdk tiktoken
```
2. Define all types in `packages/ai-router/src/types/`
3. Implement `IProvider` interface
4. Implement `ProviderRegistry` class with `register`, `getProvider`, `getHealthyProviders`, `updateHealth`
5. Implement `ModelCatalog` with static metadata for all supported models
6. Write `ProviderRegistry` unit tests

**Day 10: Provider adapters**

7. Implement `OpenAIProvider`:
   - `complete()` using `openai.chat.completions.create()`
   - `health()` with 3s timeout
   - Error mapping: 429 → `ProviderRateLimitError`, 5xx → `ProviderUnavailableError`
8. Implement `AnthropicProvider`:
   - Message format conversion from OpenAI-style to Anthropic `{ system, messages }`
   - `complete()` using `anthropic.messages.create()`
   - `health()` with minimal token call
9. Write unit tests for both providers with mocked SDKs

**Day 11: Routing logic**

10. Implement `PolicyEngine` — reads `RoutingPolicy` from DB, selects provider+model for task+tier
11. Implement `FallbackChain` — try providers in order, catch `ProviderRateLimitError` / `ProviderUnavailableError`, advance chain
12. Implement `LoadBalancer` — weighted round-robin across equivalent providers
13. Implement `AIRouter.complete()` — orchestrates PolicyEngine → FallbackChain → return `RouteResponse`
14. Add OTel span creation in `AIRouter.complete()`

**Day 12: Health monitor + comprehensive tests**

15. Implement `HealthMonitor` — pings all providers every 60s, updates registry + DB
16. Write `FallbackChain` tests (all permutations)
17. Write `PolicyEngine` tests (all tier × task combinations)
18. Write `AIRouter` integration test using `MockProvider`
19. Verify coverage ≥ 80%

### Commands to Run
```bash
# Install deps
pnpm install

# Run ai-router tests in watch mode during development
pnpm --filter @fvos/ai-router test --watch

# Check coverage
pnpm --filter @fvos/ai-router test --coverage

# Manual smoke test (requires OPENAI_API_KEY in .env)
# Add a temporary test script to packages/ai-router/scripts/smoke.ts
```

### Smoke Test Script (`packages/ai-router/scripts/smoke.ts`)
```typescript
import { AIRouter } from '../src/router';
import { OpenAIProvider } from '../src/providers/openai.provider';
import { ProviderRegistry } from '../src/registry/provider-registry';

const registry = new ProviderRegistry();
registry.register(new OpenAIProvider(process.env.OPENAI_API_KEY!));

const router = new AIRouter(registry);

const result = await router.complete({
  taskType: 'SCRIPT_GENERATION',
  tier: 'PRO',
  workspaceId: 'test',
  messages: [{ role: 'user', content: 'Write a 10-word test sentence.' }],
});

console.log('Provider:', result.provider);
console.log('Model:', result.modelId);
console.log('Output:', result.text);
console.log('Tokens:', result.inputTokens, '+', result.outputTokens);
```

### Done Criteria
- [ ] All `packages/ai-router` unit tests pass (0 failures)
- [ ] Test coverage ≥ 80% branch coverage
- [ ] `FallbackChain` advances to next provider on `ProviderRateLimitError` (verified in tests)
- [ ] `PolicyEngine` selects `gpt-4o-mini` for `SCENE_PROMPT_GENERATION` on any tier (verified in tests)
- [ ] `PolicyEngine` selects `gpt-4o` for `SCRIPT_GENERATION` on `PRO` tier (verified in tests)
- [ ] `PolicyEngine` selects `gpt-4o-mini` for `SCRIPT_GENERATION` on `FREE` tier (verified in tests)
- [ ] Smoke test script returns valid output from real OpenAI API
- [ ] `HealthMonitor` pings providers and updates registry health state (verified via test or manual observation)
- [ ] `turbo build` passes for `packages/ai-router`

---

## Milestone 4: Cost Governance Engine

**Days:** 13–16
**Tickets:** FVOS-006, FVOS-007, FVOS-008
**Goal:** Pre-run cost estimates work. Post-run costs are recorded to the ledger. The budget guard blocks AI calls when budget is exceeded. All three layers are tested.

---

### Tasks

**Day 13: Cost Estimator**

1. Install cost-engine dependencies:
```bash
pnpm --filter @fvos/cost-engine add tiktoken
```
2. Create `pricing-table.ts` with per-model pricing (input/output $/1M tokens):
```typescript
export const MODEL_PRICING: Record<string, { inputPerMToken: number; outputPerMToken: number }> = {
  'gpt-4o': { inputPerMToken: 2.50, outputPerMToken: 10.00 },
  'gpt-4o-mini': { inputPerMToken: 0.15, outputPerMToken: 0.60 },
  'gpt-3.5-turbo': { inputPerMToken: 0.50, outputPerMToken: 1.50 },
  'claude-3-5-sonnet-20241022': { inputPerMToken: 3.00, outputPerMToken: 15.00 },
  'claude-3-haiku-20240307': { inputPerMToken: 0.25, outputPerMToken: 1.25 },
  'claude-3-opus-20240229': { inputPerMToken: 15.00, outputPerMToken: 75.00 },
};
```
3. Create `media-pricing.ts` with TTS, image, video pricing
4. Implement `CostEstimator.estimate()` — token count from `tiktoken` for OpenAI models, char/4 for Anthropic
5. Write unit tests for all model price calculations
6. Export from `packages/cost-engine/src/index.ts`

**Day 14: Cost Ledger**

7. Implement `CostLedger.record()`:
```typescript
async record(entry: LedgerEntry): Promise<void> {
  await this.prisma.$transaction([
    this.prisma.costLedger.create({ data: entry }),
    this.prisma.budget.update({
      where: { workspaceId: entry.workspaceId, /* active period */ },
      data: { spentUsd: { increment: entry.costUsd } }
    })
  ]);
}
```
8. Implement `LedgerAggregator.summarize()` with GROUP BY provider and taskType
9. Write unit tests for ledger recording and aggregation

**Day 15: Budget Guard**

10. Implement `BudgetGuard.check()`:
    - Fast path: check Redis key `fvos:budget:${workspaceId}:exceeded`
    - Slow path: query DB for active budget, compute remaining
11. Create `apps/api/src/middleware/budget-guard.ts` Fastify prehandler:
```typescript
export async function budgetGuard(req: FastifyRequest, reply: FastifyReply) {
  const { workspaceId } = req.user;
  const estimate = req.budgetEstimate;  // set by route handler before prehandler
  const result = await budgetGuard.check(workspaceId, estimate);
  if (!result.allowed) {
    reply.status(402).send({
      code: 'BUDGET_EXCEEDED',
      remaining: result.remainingUsd,
      message: 'Monthly AI budget has been exhausted. Upgrade your plan or wait for renewal.'
    });
  }
}
```
12. Implement `AlertService.sendAlert()` for webhook notifications at thresholds
13. Write unit tests for budget guard (allowed, blocked, Redis fast path)

**Day 16: Wire into AI Router + integration**

14. Update `AIRouter.complete()` to call `CostLedger.record()` after every successful call
15. Create `budget-check.job.ts` in worker — recalculates all budgets, sets Redis keys
16. Register `governance` queue and worker in `apps/worker/src/main.ts`
17. Run manual end-to-end test: set budget to $0.01, attempt script generation, verify 402 response

### Commands to Run
```bash
pnpm --filter @fvos/cost-engine test --coverage
pnpm --filter @fvos/api test --run   # verify budget-guard middleware tests
```

### Done Criteria
- [ ] `CostEstimator.estimate('gpt-4o', 1000_inputTokens, 500_estimatedOutputTokens)` returns approximately `$0.0075`
- [ ] `CostLedger.record()` creates a `cost_ledger` DB row AND increments `Budget.spentUsd` atomically
- [ ] `BudgetGuard.check()` returns `{ allowed: false }` when `Budget.spentUsd >= Budget.limitUsd`
- [ ] Fastify prehandler returns `402` when budget exceeded
- [ ] Redis fast path correctly skips DB query when `fvos:budget:${workspaceId}:exceeded` key exists
- [ ] `budget-check.job.ts` cron job recalculates budget and sets Redis key when exceeded
- [ ] All `packages/cost-engine` unit tests pass, coverage ≥ 75%
- [ ] `POST /api/v1/scripts/generate` with an exceeded budget returns `402 { code: 'BUDGET_EXCEEDED' }`

---

## Milestone 5: Script Generation — First Vertical Slice

**Days:** 17–21
**Tickets:** FVOS-011, FVOS-012, FVOS-013, FVOS-015
**Goal:** The first end-to-end working feature. A user can POST to `/api/v1/scripts/generate`, the job runs through BullMQ, calls the AI router, and the completed script with scenes is available via `GET /api/v1/scripts/:id`. The integration test passes in CI.

---

### Tasks

**Day 17: Script generation endpoint**

1. Install remaining API dependencies:
```bash
pnpm --filter @fvos/api add bullmq ioredis
```
2. Create `apps/api/src/lib/queue.ts` — named BullMQ `Queue` instances:
```typescript
import { Queue } from 'bullmq';
import { redis } from './redis';

export const contentQueue = new Queue('content', { connection: redis });
export const mediaQueue = new Queue('media', { connection: redis });
export const publishQueue = new Queue('publish', { connection: redis });
export const analyticsQueue = new Queue('analytics', { connection: redis });
export const researchQueue = new Queue('research', { connection: redis });
export const governanceQueue = new Queue('governance', { connection: redis });
```
3. Implement `POST /api/v1/scripts/generate` route:
   - Validate request with Zod
   - Check channel ownership via workspace guard
   - Create `Script` record in DB with status `DRAFT`
   - Build job payload with `traceContext`
   - Call `CostEstimator.estimate()` for pre-run cost
   - Pass estimate to `BudgetGuard.check()` — return 402 if blocked
   - Enqueue job to `contentQueue` with priority 7
   - Return `{ jobId, estimatedCostUsd, script: { id, status, title } }`
4. Implement `GET /api/v1/scripts/:id` route

**Day 18: Worker setup + job handler**

5. Install worker dependencies:
```bash
pnpm --filter @fvos/worker add bullmq ioredis pino @fvos/ai-router @fvos/cost-engine @fvos/db
```
6. Create `apps/worker/src/lib/redis.ts` — IORedis connection
7. Create `apps/worker/src/main.ts` — entry point with graceful shutdown
8. Create `apps/worker/src/workers/content.worker.ts`:
```typescript
import { Worker } from 'bullmq';
import { scriptGenerationJob } from '../jobs/content/script-generation.job';

export const contentWorker = new Worker('content', async (job) => {
  switch (job.name) {
    case 'script-generation':
      return scriptGenerationJob(job);
    default:
      throw new Error(`Unknown job: ${job.name}`);
  }
}, { connection: redis, concurrency: 5 });
```
9. Implement `script-generation.job.ts` handler (full implementation per ticket FVOS-012)

**Day 19: OpenTelemetry**

10. Install OTel dependencies:
```bash
pnpm --filter @fvos/api add @opentelemetry/sdk-node @opentelemetry/instrumentation-fastify @opentelemetry/instrumentation-http @opentelemetry/instrumentation-pg @opentelemetry/exporter-trace-otlp-http
pnpm --filter @fvos/worker add @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http
```
11. Create `apps/api/src/plugins/telemetry.ts` — must be the very first import in `main.ts`
12. Create `apps/worker/src/lib/telemetry.ts`
13. Add `packages/core/src/utils/trace.ts` helpers for `extractTraceContext` / `injectTraceContext`
14. Update job payload builders to include `traceContext`
15. Update job handler to continue trace from payload
16. Add Jaeger to `docker-compose.yml`:
```yaml
jaeger:
  image: jaegertracing/all-in-one:1.56
  ports:
    - "16686:16686"   # Jaeger UI
    - "4317:4317"     # OTLP gRPC
    - "4318:4318"     # OTLP HTTP
```

**Day 20: Integration test setup**

17. Create `docker-compose.test.yml` with isolated postgres (port 5433) + redis (port 6380)
18. Create `vitest.workspace.ts` for monorepo test config
19. Create `apps/api/test/helpers/db-setup.ts`:
```typescript
import { execSync } from 'child_process';

export async function setupTestDb() {
  // Run migrations against test DB
  execSync('prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }
  });
}

export async function teardownTestDb(prisma: PrismaClient) {
  // Truncate all tables in reverse dependency order
  await prisma.$executeRaw`TRUNCATE TABLE cost_ledger, script_scenes, scripts, ... CASCADE`;
}
```
20. Create `apps/api/test/helpers/auth-helpers.ts` — creates test user, returns valid JWT

**Day 21: Integration test + CI**

21. Write `apps/api/test/integration/script-pipeline.test.ts`:
```typescript
describe('Script Generation Pipeline', () => {
  it('generates a script end-to-end', async () => {
    // 1. Setup: create workspace, user, channel via DB helpers
    // 2. Login: POST /auth/login → accessToken
    // 3. Generate: POST /scripts/generate → { scriptId, jobId }
    // 4. Poll: GET /scripts/:id until status = 'REVIEW' (max 10s)
    // 5. Assert: script.hook populated, scenes created, cost ledger entry exists
  });

  it('returns 402 when budget exceeded', async () => {
    // Set budget to $0.00, attempt generation, assert 402
  });
});
```
22. Wire up `MockProvider` to replace real AI calls in test environment
23. Add CI GitHub Actions workflow (or equivalent) that runs:
    - `docker-compose -f docker-compose.test.yml up -d`
    - `turbo test`
24. Verify full pipeline manually in Jaeger UI — see complete trace

### Commands to Run
```bash
# Start all local services
docker-compose up -d

# Start API and worker in dev mode (two terminals)
pnpm --filter @fvos/api dev
pnpm --filter @fvos/worker dev

# Manual E2E test
LOGIN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.local","password":"changeme123"}')
TOKEN=$(echo $LOGIN | jq -r '.accessToken')
WORKSPACE_ID=$(echo $LOGIN | jq -r '.workspaces[0].id')
CHANNEL_ID="<channel-id-from-seed>"

GENERATE=$(curl -s -X POST http://localhost:3001/api/v1/scripts/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"channelId\":\"$CHANNEL_ID\",\"title\":\"5 Money Habits That Changed My Life\",\"targetDurationSec\":60}")

SCRIPT_ID=$(echo $GENERATE | jq -r '.script.id')
echo "Script ID: $SCRIPT_ID"

# Poll for completion
sleep 20
curl -s http://localhost:3001/api/v1/scripts/$SCRIPT_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.status, .hook'

# Run integration tests
pnpm turbo test
```

### Done Criteria

**The integration test in `script-pipeline.test.ts` must pass with zero failures.**

Additionally:
- [ ] `POST /api/v1/scripts/generate` returns `200` with `scriptId` and `jobId`
- [ ] BullMQ job visible in queue while processing (verify via `bull-board` or direct Redis inspection)
- [ ] `Script.status` transitions: `DRAFT` → (job running) → `REVIEW`
- [ ] `Script.hook`, `Script.body` populated with AI-generated content
- [ ] `ScriptScene` records created (at least 3 scenes)
- [ ] `CostLedger` has 1 record for the generation call
- [ ] `Budget.spentUsd` incremented by cost of the call
- [ ] `GET /api/v1/scripts/:id` returns all fields including scenes
- [ ] `POST /api/v1/scripts/generate` with exceeded budget returns `402`
- [ ] Jaeger UI shows end-to-end trace: HTTP request → DB write → BullMQ enqueue → job span → AI call span → DB write span
- [ ] Worker handles `SIGTERM` gracefully (waits for active jobs to complete before exit)
- [ ] `turbo test` runs all tests and exits 0

---

## What Comes Next (Milestone 6+)

After Milestone 5 is complete, the first vertical slice is working. The next milestones build out the remaining features:

- **Milestone 6** — Script approval workflow + TTS generation + scene prompt generation
- **Milestone 7** — Video render pipeline (FFmpeg integration, R2 uploads)
- **Milestone 8** — Platform adaptation + YouTube publishing
- **Milestone 9** — Analytics ingestion + winner identification
- **Milestone 10** — Next.js web frontend (dashboard, channel management, script approval UI)
- **Milestone 11** — Autopilot rules engine + automation
- **Milestone 12** — Multi-tier billing enforcement + cost dashboard
