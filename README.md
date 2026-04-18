# Faceless Viral OS

> A unified platform for operating a faceless viral content business across YouTube, TikTok, and Instagram.

**Status:** Phase 1 — Private Internal Tool | **Stack:** Turborepo · Fastify · Next.js · PostgreSQL · BullMQ · TypeScript

---

## What Is This?

Faceless Viral OS is a startup-grade operator platform for running multiple faceless content channels at scale. It handles everything from niche discovery to AI script generation, video production, automated publishing, and analytics feedback loops — with a cost-controlled 5-tier AI pipeline built in from day one.

**Phase 1** (current): Private internal tool for 1–3 operators running multiple channels profitably.  
**Phase 2**: Public SaaS after Phase 1 validates the model.

---

## Repository Structure

```
Cowork_FacelessViralOS/
├── blueprint/                   # 19-section product & architecture blueprint
│   ├── 01-executive-summary.md
│   ├── 02-product-vision.md
│   ├── 03-prd.md
│   ├── 04-phase-strategy.md
│   ├── 05-mvp-definition.md
│   ├── 06-system-architecture.md
│   ├── 07-core-modules.md
│   ├── 08-tier-system.md        # FREE → ECONOMICAL → OPTIMIZED → PREMIUM → ULTRA
│   ├── 09-model-routing-engine.md
│   ├── 10-cost-governance.md
│   ├── 11-data-model.md         # Full Prisma schema (28 models)
│   ├── 12-workflows.md          # 15 end-to-end workflows
│   ├── 13-ux-ui.md
│   ├── 14-ai-system-design.md   # 15 AI agents
│   ├── 15-integrations.md
│   ├── 16-compliance.md
│   ├── 17-engineering-plan.md
│   ├── 18-twelve-week-plan.md
│   └── 19-extras.md
├── repo-execution-package/      # Engineering execution artifacts
│   ├── adr/ADR-INDEX.md         # 10 Architecture Decision Records
│   ├── schema.prisma            # Production Prisma schema
│   ├── api-routes.md            # 23 documented API routes
│   ├── background-jobs.md       # 12 BullMQ job specs
│   ├── tickets.md               # 15 implementation tickets (FVOS-001–015)
│   ├── milestone-plan.md        # 5 milestones, Days 1–21
│   └── repo-structure.md
├── scaffolding/                 # Runnable monorepo code
│   ├── apps/
│   │   ├── api/                 # Fastify REST API
│   │   ├── web/                 # Next.js operator dashboard
│   │   └── worker/              # BullMQ job processor
│   ├── packages/
│   │   ├── ai-router/           # Model Routing Engine ✅
│   │   ├── cost-engine/         # Cost Governance Engine ✅
│   │   ├── db/                  # Prisma + PostgreSQL ✅
│   │   ├── media-pipeline/      # TTS + video rendering
│   │   ├── publisher/           # YouTube/TikTok/Instagram
│   │   └── core/                # Shared types + utilities
│   ├── docker-compose.yml
│   ├── turbo.json
│   └── VERTICAL_SLICE.md        # First vertical slice docs
└── PLAN.md                      # Master execution plan
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| API | Fastify 4 + TypeScript + Zod |
| Frontend | Next.js 14 App Router + Tailwind |
| Worker | BullMQ + Redis |
| Database | PostgreSQL 16 + Prisma 5 |
| Storage | Cloudflare R2 (S3-compatible) |
| Auth | JWT (Phase 1) → Auth0 (Phase 2) |
| AI Routing | Custom ModelRouter (5-tier) |
| Observability | OpenTelemetry + Grafana |

---

## First Vertical Slice — Script Generation Pipeline

The first working end-to-end feature:

```
POST /api/v1/scripts/generate
  → JWT auth → Channel check → Cost estimation
  → Budget guard → DB record → BullMQ job
  → ModelRouter → OpenAI/Anthropic/Groq
  → Script saved → Cost ledger updated
  → Response: { scriptId, jobId, estimatedCostUsd }
```

See [`scaffolding/VERTICAL_SLICE.md`](scaffolding/VERTICAL_SLICE.md) for full docs and how to run it.

---

## Quick Start

```bash
cd scaffolding/
pnpm install
cp .env.example .env        # Add API keys
docker-compose up -d        # Postgres + Redis
pnpm db:migrate
pnpm dev
```

Minimum `.env` values:
```bash
DATABASE_URL=postgresql://fvos:fvos@localhost:5432/fvos
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me
OPENAI_API_KEY=sk-...
```

---

## 5-Tier AI Cost System

| Tier | Target Cost/Video | Models | Use Case |
|------|------------------|--------|---------|
| FREE | ~$0 | Local/Groq | Testing only |
| ECONOMICAL | < $0.50 | GPT-4o-mini, Claude Haiku | High-volume channels |
| OPTIMIZED | $0.50–$2 | GPT-4o, Claude Sonnet | Standard production |
| PREMIUM | $2–$5 | GPT-4o, Claude Sonnet+ | Hero content |
| ULTRA | $5–$15 | Best available | Flagship campaigns |

---

## Current Status

- [x] Full 19-section product blueprint
- [x] Architecture Decision Records (10 ADRs)
- [x] Prisma schema (28 models, 13 enums)
- [x] Monorepo scaffolding (66 files)
- [x] Model Routing Engine + fallback chains
- [x] Cost Governance Engine + budget guard
- [x] Script Generation Pipeline (first vertical slice)
- [x] Unit + integration tests
- [ ] Niche discovery module (Week 6)
- [ ] Media pipeline / TTS (Week 8)
- [ ] YouTube publishing (Week 9)
- [ ] Analytics ingestion (Week 10)
- [ ] Autopilot engine (Week 11)

---

## License

Private — internal use only.  
AGPL-3.0 note: MoneyPrinterV2 referenced as inspiration only. No code copied. See `blueprint/16-compliance.md`.
