# Faceless Viral OS — Master Execution Plan

> Version: 1.0 | Date: 2026-04-17 | Author: Claude (Founding Systems Architect)

---

## WHAT THIS PLAN COVERS

This document is the top-level orchestration guide for building **Faceless Viral OS** — a unified platform for operating a faceless viral content business across YouTube, TikTok, and Instagram. It defines:

- What documents will be produced and why
- What the repository scaffolding looks like
- What the first vertical slice implements
- How the private-first Phase 1 evolves into public SaaS Phase 2

---

## EXECUTION PHASES

### PHASE 1 — PLAN (this document)
Capture decisions, assumptions, and structure before writing a single line of code.

### PHASE 2 — DOCUMENTS (blueprint/)
19 structured blueprint sections + REPO EXECUTION PACKAGE. All become living repository docs under `docs/`.

### PHASE 3 — SCAFFOLDING (scaffolding/)
Monorepo skeleton with packages, configs, provider abstractions, Prisma schema, and CI pipeline.

### PHASE 4 — FIRST VERTICAL SLICE
End-to-end working feature: **Script Generation Pipeline** (API → Model Router → Provider → Cost Ledger → Response).

---

## DOCUMENT MANIFEST

| File | Section | Purpose |
|------|---------|---------|
| `blueprint/01-executive-summary.md` | §1 | What/why/how of the product |
| `blueprint/02-product-vision.md` | §2 | Mission, vision, milestones |
| `blueprint/03-prd.md` | §3 | Full product requirements |
| `blueprint/04-phase-strategy.md` | §4 | Phase 1 vs Phase 2 |
| `blueprint/05-mvp-definition.md` | §5 | MVP scope and P0/P1/P2 |
| `blueprint/06-system-architecture.md` | §6 | Stack, layers, tradeoffs |
| `blueprint/07-core-modules.md` | §7 | 11 core product modules |
| `blueprint/08-tier-system.md` | §8 | 5-tier spec + task routing |
| `blueprint/09-model-routing-engine.md` | §9 | Routing architecture + pseudocode |
| `blueprint/10-cost-governance.md` | §10 | Budget entities, ledger, hard stops |
| `blueprint/11-data-model.md` | §11 | Full entity model + Prisma schema |
| `blueprint/12-workflows.md` | §12 | 15 end-to-end workflows |
| `blueprint/13-ux-ui.md` | §13 | Operator-first UI structure |
| `blueprint/14-ai-system-design.md` | §14 | 15 AI agents spec |
| `blueprint/15-integrations.md` | §15 | Platform/provider integrations |
| `blueprint/16-compliance.md` | §16 | Legal, copyright, safety rules |
| `blueprint/17-engineering-plan.md` | §17 | Monorepo, CI/CD, standards |
| `blueprint/18-twelve-week-plan.md` | §18 | Weekly deliverables |
| `blueprint/19-extras.md` | §19 | Names, KPIs, automations, risks |
| `repo-execution-package/` | REP | Repo structure, schema, tickets |

---

## SCAFFOLDING MANIFEST

```
scaffolding/
├── package.json                    # workspace root
├── turbo.json                      # Turborepo config
├── .env.example                    # environment variable matrix
├── docker-compose.yml              # local dev services
├── .github/workflows/ci.yml        # GitHub Actions CI
├── apps/
│   ├── api/                        # Fastify/Node API server
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── routes/
│   │       │   ├── scripts.ts      # script generation endpoints
│   │       │   ├── channels.ts
│   │       │   ├── ideas.ts
│   │       │   └── analytics.ts
│   │       ├── middleware/
│   │       └── plugins/
│   └── web/                        # Next.js operator dashboard
│       ├── package.json
│       └── src/
│           └── app/
├── packages/
│   ├── db/                         # Prisma + DB client
│   │   ├── prisma/schema.prisma
│   │   └── src/index.ts
│   ├── ai-router/                  # Model Routing Engine
│   │   └── src/
│   │       ├── router.ts
│   │       ├── registry.ts
│   │       ├── scoring.ts
│   │       └── providers/
│   │           ├── openai.ts
│   │           ├── anthropic.ts
│   │           ├── groq.ts
│   │           └── base.ts
│   ├── cost-engine/                # Cost Governance Engine
│   │   └── src/
│   │       ├── estimator.ts
│   │       ├── ledger.ts
│   │       ├── budget-guard.ts
│   │       └── reporter.ts
│   ├── media-pipeline/             # TTS, video, rendering
│   │   └── src/
│   ├── publisher/                  # Multi-platform publisher
│   │   └── src/
│   └── core/                       # Shared types, utils, constants
│       └── src/
│           ├── types/
│           ├── constants/
│           └── utils/
```

---

## FIRST VERTICAL SLICE: SCRIPT GENERATION PIPELINE

**Why this slice?** It is the highest-leverage feature: it exercises every critical system (auth, model routing, provider abstraction, cost tracking) with the lowest external dependencies (no video rendering, no publishing).

**Slice boundary:**
```
POST /api/v1/scripts/generate
  → Auth middleware (JWT)
  → Cost Governance pre-check (budget guard)
  → Model Routing Engine (tier + task → provider + model)
  → Provider call (OpenAI / Anthropic / Groq)
  → Script persisted to DB
  → Cost ledger entry created
  → Response: { script, model_used, cost_estimate, tokens_used }
```

**Files implemented:**
- `packages/ai-router/src/router.ts` — routing logic
- `packages/ai-router/src/providers/base.ts` — provider interface
- `packages/ai-router/src/providers/openai.ts` — OpenAI adapter
- `packages/ai-router/src/providers/anthropic.ts` — Anthropic adapter
- `packages/cost-engine/src/estimator.ts` — pre-run cost estimation
- `packages/cost-engine/src/ledger.ts` — post-run recording
- `packages/db/prisma/schema.prisma` — Script + CostLedger models
- `apps/api/src/routes/scripts.ts` — REST endpoint
- `apps/api/src/routes/scripts.test.ts` — unit + integration tests

---

## KEY ARCHITECTURAL DECISIONS (summary)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo tooling | Turborepo + pnpm | Shared types, fast builds, easy SaaS split later |
| API framework | Fastify (Node/TS) | Fastest Node framework, schema validation, low overhead |
| Frontend | Next.js 14 (App Router) | SSR for analytics, React for interactivity |
| Database | PostgreSQL via Prisma | ACID, relational, mature, easy migration |
| Queue | BullMQ + Redis | Battle-tested, delay/retry/priority queues |
| AI routing | Custom engine (not LangChain) | Full control, no opinionated abstractions |
| Auth | NextAuth / JWT (Phase 1), Auth0 (Phase 2) | Simple internal first, enterprise-ready SaaS later |
| Storage | S3-compatible (Cloudflare R2) | Cheap egress, S3 API compatibility |
| Observability | OpenTelemetry + Grafana | Vendor-neutral, self-hosted for Phase 1 |
| Cost control | Custom engine | Business-critical, must not be a black box |

---

## ASSUMPTIONS DOCUMENTED

1. Phase 1 is single-operator (1–3 users). No multi-tenancy needed yet.
2. MoneyPrinterV2 (AGPL-3.0) is used as reference/inspiration only — no code will be copied. Clean-room reimplementation.
3. YouTube Data API v3 is the primary analytics source. TikTok Business API access may require approval.
4. Instagram publishing uses the Graph API (requires Facebook Business Manager).
5. Budget for Phase 1 AI costs: ~$200–500/month. Tier system must make this sustainable.
6. Default language support: English (primary) + Spanish (secondary via localization).
7. Video rendering in Phase 1 uses Remotion (open-source) or ffmpeg + stock assets.
8. No real-time features in Phase 1. Polling + webhooks are sufficient.

---

## SUCCESS CRITERIA

### Phase 1 Exit Criteria (→ Phase 2 gate)
- [ ] 3+ channels running on autopilot
- [ ] 50+ videos published
- [ ] At least 1 channel monetized (YT Partner Program or affiliate)
- [ ] Cost per video < $2 on ECONOMICAL tier
- [ ] Analytics feedback loop working (upload → data → next idea)
- [ ] System stable for 30 days without manual intervention

### First Vertical Slice Done Criteria
- [ ] `POST /api/v1/scripts/generate` returns valid script
- [ ] Model router selects correct provider based on tier
- [ ] Cost is estimated pre-run and recorded post-run
- [ ] Script is persisted in DB with full metadata
- [ ] Unit tests pass (router, estimator, ledger)
- [ ] Integration test passes (full request → response)
