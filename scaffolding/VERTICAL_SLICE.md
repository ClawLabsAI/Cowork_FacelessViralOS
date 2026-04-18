# First Vertical Slice — Script Generation Pipeline

> Status: **Implemented** | Date: 2026-04-17

---

## What This Slice Proves

The Script Generation Pipeline is the first end-to-end working feature of Faceless Viral OS. It touches every critical system layer and proves the core architecture works before adding more complexity.

**Boundary:**
```
POST /api/v1/scripts/generate
  → JWT auth middleware
  → Channel ownership check (Prisma)
  → Pre-run cost estimation (CostEstimator)
  → Budget guard check (BudgetGuard)
  → Script record created in DB (Prisma)
  → Job enqueued in BullMQ content queue
  → Response: 202 { scriptId, jobId, estimatedCostUsd, correlationId }

BullMQ Worker (processScriptGeneration):
  → Load channel + brand context (Prisma)
  → Load pre-created Script record
  → Build platform-aware system prompt
  → Route to optimal provider (ModelRouter)
  → Call AI provider (OpenAI / Anthropic / Groq)
  → Parse and clean generated content
  → Update Script record in DB
  → Record cost in CostLedger
  → Return ScriptGenerationResult
```

---

## Files Implemented

### API Layer
| File | Purpose |
|------|---------|
| `apps/api/src/index.ts` | Fastify server bootstrap |
| `apps/api/src/middleware/auth.ts` | JWT authentication middleware |
| `apps/api/src/routes/scripts.ts` | Script CRUD + generate endpoint |
| `apps/api/src/routes/auth.ts` | Login / refresh / logout |

### Worker Layer
| File | Purpose |
|------|---------|
| `apps/worker/src/index.ts` | BullMQ worker bootstrap |
| `apps/worker/src/processors/script-generation.ts` | Core job processor |

### Model Routing Engine
| File | Purpose |
|------|---------|
| `packages/ai-router/src/types.ts` | RoutingRequest, ProviderSelection, GenerationResult |
| `packages/ai-router/src/providers/base.ts` | BaseProvider abstract class + ProviderError |
| `packages/ai-router/src/providers/openai.ts` | OpenAI adapter (gpt-4o, gpt-4o-mini, o3-mini) |
| `packages/ai-router/src/providers/anthropic.ts` | Anthropic adapter (claude-sonnet, claude-haiku) |
| `packages/ai-router/src/registry.ts` | ProviderRegistry singleton |
| `packages/ai-router/src/scoring.ts` | 5-component weighted scoring algorithm |
| `packages/ai-router/src/router.ts` | ModelRouter — routing + fallback + generation |

### Cost Governance Engine
| File | Purpose |
|------|---------|
| `packages/cost-engine/src/estimator.ts` | Pre-run cost estimation (LLM, TTS, image, video) |
| `packages/cost-engine/src/ledger.ts` | Post-run cost recording (append-only) |
| `packages/cost-engine/src/budget-guard.ts` | Budget enforcement + BudgetExceededError |

### Data Model
| File | Purpose |
|------|---------|
| `packages/db/prisma/schema.prisma` | Full Prisma schema (28 models, 13 enums) |
| `packages/db/src/index.ts` | PrismaClient singleton |
| `packages/db/prisma/seed.ts` | Initial seed data |

### Tests
| File | Type | Coverage target |
|------|------|----------------|
| `packages/ai-router/src/router.test.ts` | Unit | ModelRouter routing + fallbacks |
| `packages/ai-router/src/scoring.test.ts` | Unit | Scoring algorithm weights |
| `packages/cost-engine/src/estimator.test.ts` | Unit | All estimation methods |
| `packages/cost-engine/src/budget-guard.test.ts` | Unit | Budget check + enforce |
| `apps/api/src/routes/scripts.integration.test.ts` | Integration | Full request/response cycle |

---

## How to Run

### Prerequisites
```bash
# Node 20+, pnpm 9+
node --version   # >= 20.0.0
pnpm --version   # >= 9.0.0
```

### 1. Bootstrap
```bash
cd scaffolding/
pnpm install
cp .env.example .env
# Edit .env: add OPENAI_API_KEY or ANTHROPIC_API_KEY
```

### 2. Start local services
```bash
docker-compose up -d   # starts postgres:16 + redis:7
```

### 3. Run database migrations
```bash
pnpm db:migrate        # runs prisma migrate dev
```

### 4. Seed initial data
```bash
pnpm --filter @fvos/db seed
# Creates: admin user, providers, tier profiles, sample channel
```

### 5. Run tests (no real API keys needed)
```bash
# Unit tests only (all mocked)
pnpm --filter @fvos/ai-router test
pnpm --filter @fvos/cost-engine test

# Integration test (mocked DB + queue)
pnpm --filter @fvos/api test

# All tests via turborepo
pnpm test
```

### 6. Start the development server
```bash
# Terminal 1: API server
pnpm --filter @fvos/api dev    # → http://localhost:3001

# Terminal 2: Worker
pnpm --filter @fvos/worker dev

# Or both at once:
pnpm dev
```

### 7. Test the endpoint manually
```bash
# 1. Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fvos.local","password":"admin123"}'
# → { "accessToken": "eyJ..." }

# 2. Generate a script
curl -X POST http://localhost:3001/api/v1/scripts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{
    "channelId": "<channel-id-from-seed>",
    "topic": "5 productivity hacks that actually work",
    "format": "listicle",
    "tone": "informative",
    "targetDurationSeconds": 300,
    "tier": "ECONOMICAL"
  }'
# → { "scriptId": "...", "jobId": "...", "status": "queued", "estimatedCostUsd": 0.024 }

# 3. Check the script (after worker processes it)
curl http://localhost:3001/api/v1/scripts/<scriptId> \
  -H "Authorization: Bearer eyJ..."
# → { "id": "...", "content": "Did you know that...", "wordCount": 312, ... }
```

---

## Model Routing in Action

For `tier: ECONOMICAL` + `taskType: SCRIPT_GENERATION`:

```
Scoring (all registered providers):
  openai/gpt-4o-mini:    costFit=28, qualityFit=17, latencyFit=18, health=15, history=10 → 88
  anthropic/claude-haiku: costFit=25, qualityFit=16, latencyFit=17, health=15, history=9  → 82
  openai/gpt-4o:          costFit=12, qualityFit=22, latencyFit=14, health=15, history=10 → 73

Selected: openai/gpt-4o-mini (score: 88)
Fallback chain: [anthropic/claude-haiku, openai/gpt-4o]
```

For `tier: ULTRA` + same task:
```
  openai/gpt-4o:           costFit=22, qualityFit=24, latencyFit=16, health=15, history=10 → 87
  anthropic/claude-sonnet: costFit=20, qualityFit=23, latencyFit=17, health=15, history=9  → 84

Selected: openai/gpt-4o (score: 87)
```

---

## Cost Tracking in Action

For a 5-minute YouTube script (`targetDurationSeconds: 300`):
- Estimated words: ~750 (300s / 60 * 150 wpm)
- Model: gpt-4o-mini (ECONOMICAL tier)
- Estimated cost: ~$0.001–0.003
- With buffer (1.2×): ~$0.0012–0.0036
- After generation, actual cost recorded in `usage_records` table

---

## Done Criteria

- [x] `POST /api/v1/scripts/generate` returns valid 202 response
- [x] Model router selects correct provider based on tier
- [x] Cost is estimated pre-run
- [x] Budget is checked before queuing
- [x] Script is pre-created in DB with empty content
- [x] BullMQ job is enqueued with full context
- [x] Worker processes job and updates Script record
- [x] Actual cost is recorded in CostLedger post-run
- [x] Unit tests pass (router, scoring, estimator, budget-guard)
- [x] Integration test covers happy path + 6 error cases
- [x] Platform-specific system prompts (YouTube/TikTok/Instagram)
- [x] EN/ES language support in prompts
- [x] Fallback chain: primary → secondary → tertiary → error
