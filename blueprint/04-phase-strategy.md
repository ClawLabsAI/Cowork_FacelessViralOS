# Faceless Viral OS — Phase Strategy

**Document status:** Blueprint v1.0  
**Last updated:** 2026-04-17  
**Classification:** Internal — Founding Team Only

---

## Overview

The platform launches in two sequential phases with a defined exit gate between them. Phase 1 is a private internal tool. Phase 2 is a public SaaS. The transition is gated on explicit validation milestones (see `02-product-vision.md`), not on a calendar date. This document defines what each phase builds, what it deliberately excludes, how it is operated, and how it earns its exit.

---

## Phase 1: Private Internal Tool

### Goal

Validate the end-to-end content production flywheel in a real production environment with real revenue signals, while building the platform infrastructure that Phase 2 will run on. Prove unit economics before making any public pricing commitment.

### Scope: What Is Included

| Domain | Included |
|---|---|
| Auth | Single-user JWT auth; no multi-tenant, no team accounts |
| Channel management | Create, configure, and manage a portfolio of faceless channels |
| Niche discovery | Basic keyword + trend signal research (YouTube search data, Google Trends API) |
| Competitor analysis | Scrape top-performing competitor channel data (titles, descriptions, cadence) |
| Idea generation | AI-assisted idea generation from niche + competitor signal |
| Script generation | Full script writing with configurable structure, tone, and length |
| Voice synthesis | TTS integration (ElevenLabs + open-source fallback); EN/ES support |
| Subtitle generation | Auto-subtitle from voice output; word-level timing |
| Short-form video assembly | Stock footage + TTS + subtitles → MP4; Shorts/Reels/TikTok format |
| Publishing queue | BullMQ-backed job queue; retry on failure; per-job cost tracking |
| Publishing | YouTube upload via API; TikTok and Instagram as manual export initially |
| Analytics | Basic: views, watch time, subscriber delta per channel; pulled from platform APIs |
| AI tier selection | All 5 tiers (FREE → ULTRA) selectable per job |
| Cost tracking | Per-video, per-channel cost breakdown; actual vs estimate |
| EN/ES pipeline | Both languages supported across all production steps |
| Autopilot (basic) | Scheduled weekly content cycle for a single stable channel |

### What NOT to Build in Phase 1 (and Why)

| Feature | Why Excluded |
|---|---|
| Multi-user / team accounts | Adds auth complexity with zero internal benefit; Phase 2 concern |
| Billing / Stripe integration | No paying customers; billing infra is Phase 2 |
| Onboarding flows / UX polish | Internal operators tolerate rough UX; polish is a Phase 2 SaaS requirement |
| Advanced analytics (cohort, retention) | Requires data volume we won't have until Phase 2 |
| API / webhook integrations for third parties | No external integrations needed internally |
| White-label output | No clients to white-label for in Phase 1 |
| Marketplace / template sharing | Requires a user base; meaningless with 1–3 operators |
| Mobile app | Operators use desktop; mobile is a Phase 2 nicety |
| Long-form video (>10 min) | Short-form is the MVP; long-form adds encoding complexity without validated demand |
| Full TikTok / Instagram API publishing | API access requires business account verification and review periods; start with manual export + notes on cadence, automate in Phase 2 |

### Validation Metrics (How We Know Phase 1 Worked)

All 10 milestones from `02-product-vision.md` must pass. The key quantitative thresholds:

| Metric | Phase 1 Target |
|---|---|
| Channels actively publishing | ≥3 |
| Videos published per week (portfolio total) | ≥15 |
| End-to-end pipeline time (median) | <30 minutes on OPTIMIZED tier |
| Platform uptime over rolling 30 days | ≥99% |
| Cost-per-video accuracy vs actual API invoice | ≤5% error |
| Channels with positive margin | ≥2 |
| Autopilot runs without intervention | ≥1 channel × 30 days |
| Features deferred and documented for Phase 2 | ≥15 items |

### Operational Model

- **Infrastructure:** Turborepo monorepo; Fastify API; Next.js frontend; PostgreSQL/Prisma; BullMQ/Redis; Cloudflare R2 for video/asset storage
- **Deployment:** Single VPS or small cloud instance; no high-availability setup required
- **Monitoring:** Basic error logging (Axiom or equivalent); queue health visible in admin dashboard
- **Team:** 1–2 engineers, 1–3 operators. Engineers are also operators.
- **Incident response:** Best-effort; no SLA; operators are internal and can tolerate degradation

### Monetization Logic

Phase 1 is not monetized as a SaaS product. Revenue comes from the channels the platform operates. The business model in Phase 1 is:

- Platform produces content → channels generate views → channels monetize via AdSense, sponsorships, affiliate links
- Platform AI costs are business operating expenses
- Phase 1 success = channel revenue > platform AI cost (positive unit economics)

### Exit Criteria

Phase 1 exits when all 10 validation milestones are confirmed and documented. The founding team conducts a formal Phase 1 retrospective, documenting:
1. Which workflows are production-ready
2. Which features need hardening before external users
3. Exact cost-per-video at each AI tier based on real production data
4. The Phase 2 feature wishlist (≥15 items from real operational pain)
5. Initial SaaS pricing hypothesis based on observed unit economics

---

## Phase 2: Public SaaS

### Goal

Take the validated internal platform and productize it for paying external operators. Reach $10k MRR within 12 months of Phase 2 launch. Build the infrastructure, UX polish, billing, and onboarding required for self-serve customers to succeed without hand-holding.

### Scope: What Is Included (Phase 2 Additions)

| Domain | Phase 2 Addition |
|---|---|
| Auth | Multi-tenant accounts; team member invites; role-based permissions (owner, editor, viewer) |
| Billing | Stripe integration; subscription tiers; usage-based overage billing |
| Onboarding | Guided onboarding flow; channel setup wizard; first video in <30 min guarantee |
| TikTok / Instagram publishing | Full API publishing via official business account integrations |
| Long-form video pipeline | YouTube long-form (8–20 min) video assembly pipeline |
| Advanced analytics | Cohort analysis; content performance scoring; niche benchmarking |
| Prompt library | Save and version custom prompts per channel; share/fork community prompts |
| Voice profile management | Save custom voice configurations per channel; import custom ElevenLabs voice clones |
| Autopilot V2 | Multi-channel autopilot with performance-triggered pause/resume logic |
| Support system | In-app support chat; help documentation; status page |
| API access (power tier) | REST API for agencies to build on top of the platform |
| White-label output | Remove platform branding from exported assets (agency tier) |
| Additional languages | Portuguese, French as tier-2 languages based on demand signal |
| Admin panel | Customer management, usage monitoring, billing overrides for internal ops |

### What NOT to Build in Phase 2 (and Why)

| Feature | Why Excluded |
|---|---|
| Mobile app | Web is sufficient; native app is expensive to maintain; defer to Phase 3 |
| Community / social features | Forum, public channel leaderboards — distraction from core product value |
| Video editing suite | We are not a video editor; deep editing is out of scope permanently |
| On-camera content tools | Against product philosophy; anti-use-case |
| Acquisition / M&A channel management | Specialized enough to be a separate product or partnership |

### Operational Model

- **Infrastructure:** High-availability deployment; multi-region Cloudflare R2; Redis Sentinel or managed Redis; managed PostgreSQL (Supabase or Neon)
- **Monitoring:** Full observability (Axiom + Sentry + BullMQ dashboard); alerting on queue depth, error rate, cost anomalies
- **Team:** 2–4 engineers; 1 product; 1 customer success; 1–2 operators continuing internal channels
- **SLA:** 99.5% uptime commitment to paying customers; 4-hour critical incident response
- **Support:** In-app chat (Intercom or Plain); async email for non-critical issues

### Monetization Logic

| Tier | Monthly Price | Channels | Videos/Month | AI Tier Access | Target Segment |
|---|---|---|---|---|---|
| Starter | $49 | 2 | 40 | FREE + ECONOMICAL | Solo beginner |
| Growth | $99 | 5 | 100 | + OPTIMIZED | Solo entrepreneur |
| Pro | $199 | 15 | 300 | + PREMIUM | Power operator |
| Agency | $499 | Unlimited | 1,000 | All tiers incl. ULTRA | Small agency |
| Enterprise | Custom | Unlimited | Custom | All tiers + API | MCN / large agency |

*Pricing is a hypothesis to be validated based on Phase 1 unit economics data.*

### Exit Criteria (Phase 2 → Phase 3 / Expansion)

Phase 2 is considered validated when:
- $10k MRR sustained for 3 consecutive months
- Net Revenue Retention (NRR) ≥ 100% (expansion offsetting churn)
- ≥50 active paying accounts
- Support ticket volume per account per month is declining (product getting more reliable)
- At least one agency account generating >$500 MRR (proves B2B2C potential)

---

## Phase Comparison Table

| Dimension | Phase 1 | Phase 2 |
|---|---|---|
| **User type** | Internal operators only (1–3 people) | External paying customers (50–500+) |
| **Revenue model** | Channel ad revenue / affiliate | SaaS subscriptions |
| **Auth** | Single-user JWT | Multi-tenant with roles |
| **Billing** | None | Stripe subscriptions |
| **Publishing** | YouTube API + manual TikTok/IG export | Full API publishing all 3 platforms |
| **Onboarding** | Zero; operators set it up themselves | Guided wizard; <30 min to first video |
| **Uptime requirement** | Best-effort; no SLA | 99.5% with alerting |
| **Support** | None (internal team fixes their own issues) | In-app chat + async email |
| **Analytics depth** | Basic: views, subs, watch time | Advanced: cohort, scoring, benchmarking |
| **Video formats** | Short-form only | Short-form + long-form |
| **Languages** | EN + ES | EN + ES + PT + FR (roadmap) |
| **Autopilot** | Single channel, scheduled | Multi-channel, performance-aware |
| **Team size** | 1–2 engineers + 1–3 operators | 4–6 people across eng/product/CS |
| **Infrastructure** | Single VPS acceptable | HA, multi-region, managed DB |
| **Primary success metric** | Channel revenue > AI cost | MRR growth + NRR |
| **Build philosophy** | Move fast, document debt | Harden, polish, productize |
