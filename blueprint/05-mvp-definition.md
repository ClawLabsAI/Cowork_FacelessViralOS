# Faceless Viral OS — MVP Definition

**Document status:** Blueprint v1.0  
**Last updated:** 2026-04-17  
**Classification:** Internal — Founding Team Only

---

## Purpose

This document defines the exact scope of the Phase 1 internal MVP: what is built, what is explicitly excluded, which technical shortcuts are acceptable, and what technical debt must be resolved before Phase 2. Every engineering decision in Phase 1 must be measured against this document.

---

## Feature List with Priority

Priority definitions:
- **P0** — Must ship before the platform can be used at all. Blocking.
- **P1** — Must ship before the platform can be used in production reliably. Required for Phase 1 validation.
- **P2** — Valuable in Phase 1 but not blocking. Ship when P0+P1 are stable.

| Feature | Priority | Description | Acceptance Criteria |
|---|---|---|---|
| **Auth (single-user JWT)** | P0 | Single hardcoded operator account; JWT-based session; no registration flow | Can log in; session persists across refreshes; invalid JWT returns 401 |
| **Main dashboard** | P0 | Portfolio-level view: channels list, pending jobs count, recent publishes, weekly cost summary | Loads in <2s; shows accurate job counts and cost totals |
| **Channel portfolio** | P0 | Create, edit, archive channels; per-channel config (niche, language, AI tier, voice profile) | Can create ≥10 channels; each stores config independently |
| **Niche discovery (basic)** | P1 | Input keyword → returns YouTube search volume estimate, Google Trends signal, and top 5 channels in that niche | Returns results in <10s; data is sourced and datestamped |
| **Competitor analysis (basic)** | P1 | Input competitor channel URL → returns top 10 videos by views, posting frequency, average video length, title patterns | Data returns within 30s; covers title, view count, publish date |
| **Idea generation** | P1 | Given niche + competitor data + channel config → generate 10 video ideas with title, hook, and format recommendation | Ideas are niche-specific; respects language setting; configurable count |
| **Script generation** | P0 | Given a video idea → generate full script (hook, body, CTA) with configurable length and tone; supports EN/ES | Script outputs stored to DB; version history per script; token count tracked |
| **TTS / voice synthesis** | P0 | Send script to ElevenLabs (or configured provider); receive audio file; store to R2 | Audio generated in <60s for standard script; stored with job reference; cost tracked |
| **Subtitle generation** | P1 | Generate word-level subtitle file (SRT/VTT) from audio; sync accuracy ≥95% at word level | SRT file generated; timing validated against audio length; EN/ES both work |
| **Short-form video pipeline** | P0 | Assemble: stock footage + TTS audio + subtitles → MP4; 9:16 aspect ratio; configurable duration (15s, 30s, 60s) | Output MP4 plays correctly; correct aspect ratio; subtitles visible and synced |
| **Publishing queue** | P0 | BullMQ job queue for all pipeline steps; retry on failure (max 3); per-job status visible in UI; dead-letter queue for failed jobs | Jobs transition through states (queued → processing → complete / failed); retries work; failed jobs visible |
| **Analytics (basic)** | P1 | Pull views, watch time, subscriber count delta per channel from YouTube Analytics API; display per-channel and portfolio-level | Data refreshed daily; shows 30-day trend; visible in dashboard |
| **EN/ES support** | P0 | All pipeline steps (niche, ideation, script, TTS, subtitles) work correctly in English and Spanish | A video can be produced end-to-end entirely in Spanish; subtitles are in correct language |
| **Simple autopilot** | P2 | Schedule a channel to run a weekly content cycle automatically (generate ideas → script → voice → video → queue for publish) on a cron schedule | Autopilot runs unattended for 7 days; operator notified on completion or failure |
| **Tier selection** | P0 | Operator selects AI tier (FREE / ECONOMICAL / OPTIMIZED / PREMIUM / ULTRA) per job or per channel default; tier controls model selection | Tier setting is respected by all AI calls; different tiers produce cost-appropriate outputs |
| **Cost tracking** | P0 | Track actual API cost per job step; aggregate per video, per channel, per week; display in dashboard and per-job detail | Cost displayed within 5% of actual API invoice; per-video breakdown visible |

---

## In Scope vs Out of Scope

| Feature / Capability | In Scope (MVP) | Out of Scope | Rationale |
|---|---|---|---|
| Single-user auth | Yes | — | Required for any usage |
| Multi-user / team auth | — | Yes | No internal need; adds complexity |
| Channel portfolio management | Yes | — | Core operator workflow |
| Client / agency account management | — | Yes | Phase 2 only |
| Niche discovery (keyword + trends) | Yes | — | Foundation of production flywheel |
| Advanced niche scoring (ML-based) | — | Yes | Requires data volume we don't have |
| Competitor analysis (basic scraping) | Yes | — | Manual input → structured data |
| Competitor monitoring / alerts | — | Yes | Phase 2 feature |
| Idea generation | Yes | — | Required to populate script queue |
| Script generation | Yes | — | Core production step |
| Script A/B testing | — | Yes | No analytics baseline yet |
| TTS via ElevenLabs | Yes | — | Best quality/cost tradeoff |
| Custom voice clone management | — | Yes | Phase 2 with voice profile manager |
| Subtitle generation (auto) | Yes | — | Required for platform compliance |
| Subtitle manual editing UI | — | Yes | Out of scope; edit the SRT file directly |
| Short-form video assembly (9:16) | Yes | — | Core deliverable |
| Long-form video assembly (16:9) | — | Yes | Phase 2; different pipeline |
| Stock footage sourcing | Yes (Pexels/Pixabay API) | — | Free tier sufficient for MVP |
| Licensed premium footage | — | Yes | Cost/complexity not justified in Phase 1 |
| YouTube API publishing | Yes | — | Primary platform |
| TikTok API publishing | — | Yes (manual export) | API approval timeline uncertain; manual export bridge |
| Instagram API publishing | — | Yes (manual export) | Same as TikTok |
| Basic analytics (views, subs) | Yes | — | Minimum signal for channel health |
| Advanced analytics (cohort, retention) | — | Yes | Phase 2 |
| BullMQ job queue | Yes | — | Required for async pipeline |
| Job priority / weighting | — | Yes | Phase 2 optimization |
| Publishing queue UI | Yes | — | Operator must see job status |
| EN/ES pipeline | Yes | — | Strategic bet; MVP requirement |
| PT/FR pipeline | — | Yes | Phase 2 based on demand signal |
| Autopilot (basic scheduled run) | Yes (P2) | — | Phase 1 stretch goal |
| Autopilot with performance logic | — | Yes | Requires analytics baseline |
| Cost tracking (per job/channel) | Yes | — | Core to unit economics validation |
| Billing / Stripe | — | Yes | No external users |
| API for external integrations | — | Yes | Phase 2 agency tier |
| Mobile app | — | Yes | Not needed for operators |
| Documentation site | — | Yes | Phase 2 public launch requirement |

---

## Acceptable Technical Shortcuts (With Debt Documented)

These shortcuts are explicitly approved for Phase 1. Each has a corresponding debt item that must be resolved before Phase 2 public launch.

| Shortcut | Justification | Debt Item |
|---|---|---|
| **Hardcoded single-user credentials via ENV** | No auth complexity needed internally | Replace with proper multi-tenant auth (Clerk or custom) in Phase 2 |
| **TikTok/Instagram: manual export + notes** | API approval and review process takes weeks; doesn't block internal validation | Build full TikTok and Instagram API publishing in Phase 2 |
| **Stock footage: free tier APIs only (Pexels/Pixabay)** | Sufficient quality for Phase 1 validation; no licensing risk | Evaluate premium footage providers (Storyblocks, Shutterstock) based on channel performance data |
| **Video assembly: server-side FFmpeg synchronous process** | Simplest path to working video output | Migrate to async worker pool with dedicated video encoding queue in Phase 2 for parallel throughput |
| **No email / push notifications (UI polling only)** | Internal operators can watch the dashboard | Add proper notification system (email + in-app) before Phase 2 launch |
| **Analytics pulled daily via cron (not real-time)** | API rate limits + simplicity; daily is sufficient for internal use | Real-time or near-real-time analytics needed for SaaS perceived quality |
| **No soft delete / audit log** | Complexity not justified internally | Required for Phase 2 (customer data integrity, support, billing disputes) |
| **Single-region deployment** | Latency is acceptable for 1–3 internal operators in same geography | Multi-region or edge deployment needed for global SaaS customers |
| **No rate limiting on internal API** | No external attack surface | Required before Phase 2 to prevent abuse and protect AI cost budget |
| **Subtitle manual SRT editing (no in-app editor)** | Low frequency operation; operators can use external SRT editor | Build in-app subtitle editor for Phase 2 (significant UX improvement for customers) |
| **Monolithic Fastify API (no service separation)** | Fastest to build and debug with small team | Evaluate service decomposition (publishing service, AI orchestration service) before Phase 2 scaling |

---

## Technical Debt We Can Tolerate (Must Fix Before Phase 2)

| Debt Item | Risk if Unresolved | Priority for Phase 2 |
|---|---|---|
| Single-user auth with ENV credentials | Security: any env leak = full access; cannot support teams | Must fix — blocks multi-tenant |
| No rate limiting | Cost explosion risk if external users hit AI endpoints; no abuse protection | Must fix — blocks public launch |
| Synchronous video encoding | Cannot parallelize; will become bottleneck at 50+ jobs/day | Must fix — performance blocker |
| No audit log / soft delete | Cannot support customer disputes, debugging, or data recovery | Must fix — trust/support requirement |
| No email notifications | Customers will not tolerate polling a dashboard to know if jobs completed | Must fix — SaaS UX table stakes |
| Manual TikTok/Instagram publishing | Friction for customers; major competitive weakness | Must fix — competitive parity |
| No input validation on API routes | First-order security concern once externally exposed | Must fix — security requirement |
| No API versioning | Breaking changes will be painful to manage with external integrations | Must fix before API launch |
| No backup / disaster recovery plan | Acceptable for internal (operators know the risk); unacceptable for paying customers | Must fix — SaaS reliability requirement |
| Hardcoded prompt templates (no versioning) | Prompt drift management is manual; hard to A/B test or roll back | Should fix — affects output quality management |

---

## MVP Success Criteria

The MVP is considered successful when all of the following are true simultaneously:

1. **Pipeline completes end-to-end** — a video goes from idea → script → voice → subtitles → assembled MP4 → queued for publish in under 30 minutes on the OPTIMIZED tier without manual operator intervention at any step.

2. **Portfolio is live** — at least 3 faceless channels are actively publishing ≥5 videos per week each using the platform as the exclusive production system.

3. **Cost visibility is accurate** — cost-per-video is tracked and displayed within ≤5% of actual API provider invoices, verifiable by comparing platform cost totals to monthly API bills.

4. **Unit economics are positive** — at least 2 channels show channel revenue > platform AI cost for that channel over a 30-day period.

5. **Autopilot runs unattended** — at least 1 channel completes a full 7-day automated content cycle (5 videos) without any operator intervention.

6. **Both languages work** — at least 20 videos published in Spanish using the Spanish pipeline end-to-end, with quality validated by the operator.

7. **Queue reliability is demonstrated** — job failure rate is <5% over a rolling 14-day window; all failures are logged with actionable error messages; retries succeed on transient failures.

8. **Phase 2 wishlist is documented** — at least 15 deferred features are documented in the backlog with enough context for an engineer to build them without additional operator explanation.

---

## Non-Goals (Explicit)

The following are explicit non-goals for the MVP. They will not be designed for, prototyped, or accidentally built. Any engineering decision that creates coupling to these areas should be flagged and reviewed.

1. **Supporting multiple user accounts.** The MVP is single-user. No auth flows, no role systems, no invite links.

2. **Monetizing the platform itself.** No billing, no subscription tiers, no Stripe integration. Phase 1 revenue comes from channels, not from the platform.

3. **Supporting on-camera or non-faceless content.** The pipeline is designed specifically for AI-narrated, stock-footage-driven content. No concessions to other content types.

4. **Building for scale beyond 3 operators and 20 channels.** Phase 1 infrastructure is not designed for horizontal scale. We will not pre-optimize for 500 concurrent users.

5. **Producing long-form video (>10 minutes).** Short-form (15s–90s) and YouTube Shorts format only. Long-form encoding, chapter generation, and thumbnail design are Phase 2 features.

6. **Building a public API.** No external integrations, no webhooks, no API keys for third parties. All platform interaction is through the internal UI.

7. **Building a documentation or marketing site.** No public-facing content. No SEO. No landing page. The product does not exist publicly in Phase 1.

8. **Community features.** No prompt marketplace, no template sharing, no leaderboards, no public channel performance comparisons. Internal use only.
