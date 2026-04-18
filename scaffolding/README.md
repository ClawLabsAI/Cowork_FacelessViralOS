# Faceless Viral OS

> A unified platform for operating a faceless viral content business across YouTube, TikTok, and Instagram.

---

## Quick Start

```bash
# Requirements: Node 20+, pnpm 9+, Docker
pnpm install
cp .env.example .env
docker-compose up -d
pnpm db:migrate
pnpm dev
```

---

## Repository Structure

```
faceless-viral-os/
├── apps/
│   ├── api/             # Fastify REST API (port 3001)
│   ├── web/             # Next.js operator dashboard (port 3000)
│   └── worker/          # BullMQ job processor
├── packages/
│   ├── ai-router/       # Model Routing Engine
│   ├── cost-engine/     # Cost Governance Engine
│   ├── db/              # Prisma + PostgreSQL
│   ├── media-pipeline/  # TTS + video rendering
│   ├── publisher/       # YouTube/TikTok/Instagram publisher
│   └── core/            # Shared types + utilities
├── blueprint/           # Full product blueprint (19 sections)
├── repo-execution-package/ # ADRs, tickets, milestone plan
├── PLAN.md              # Master execution plan
└── VERTICAL_SLICE.md    # First vertical slice documentation
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| API | Fastify 4 + TypeScript |
| Frontend | Next.js 14 App Router |
| Worker | BullMQ + Redis |
| Database | PostgreSQL 16 + Prisma 5 |
| Storage | Cloudflare R2 (S3-compatible) |
| Auth | JWT (Phase 1) |
| AI Routing | Custom ModelRouter engine |
| Observability | OpenTelemetry |

---

## Development

```bash
pnpm dev          # Start all apps in dev mode
pnpm test         # Run all tests
pnpm build        # Build all packages
pnpm typecheck    # TypeScript check all packages
pnpm lint         # Lint all packages
pnpm db:studio    # Open Prisma Studio
```

---

## First Vertical Slice

See [VERTICAL_SLICE.md](./VERTICAL_SLICE.md) for the complete Script Generation Pipeline implementation.

---

## Blueprint

The `../blueprint/` directory contains 19 sections of product, architecture, and engineering documentation:

- `01-executive-summary.md` — What/why/how
- `02-product-vision.md` — Mission, milestones
- `03-prd.md` — Full PRD
- `04-phase-strategy.md` — Phase 1 vs Phase 2
- `05-mvp-definition.md` — MVP scope
- `06-system-architecture.md` — System design
- `07-core-modules.md` — 11 product modules
- `08-tier-system.md` — 5-tier AI cost system
- `09-model-routing-engine.md` — Routing architecture
- `10-cost-governance.md` — Budget + cost tracking
- `11-data-model.md` — Full data model + Prisma schema
- `12-workflows.md` — 15 end-to-end workflows
- `13-ux-ui.md` — Operator-first UI design
- `14-ai-system-design.md` — 15 AI agents
- `15-integrations.md` — Platform + provider integrations
- `16-compliance.md` — Legal + copyright rules
- `17-engineering-plan.md` — Engineering standards
- `18-twelve-week-plan.md` — Build plan
- `19-extras.md` — Names, KPIs, automations, risks

---

## Environment Variables

See `.env.example` for the complete list. Minimum required to run locally:

```bash
DATABASE_URL=postgresql://fvos:fvos@localhost:5432/fvos
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
OPENAI_API_KEY=sk-...     # or ANTHROPIC_API_KEY
```

---

## License

Private — internal use only. Phase 2 will add a public license when launched as SaaS.

**AGPL-3.0 note:** MoneyPrinterV2 was used as a reference/inspiration only. No code was copied. See `../blueprint/16-compliance.md` for the clean-room implementation protocol.
