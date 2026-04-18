# 13 — UX / UI Design

**Faceless Viral OS | Blueprint Series**
Version: 1.0 | Status: Engineering-Ready | Phase: 1 + 2

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Navigation Structure](#2-navigation-structure)
3. [Global Layout](#3-global-layout)
4. [Screen Designs](#4-screen-designs)
   - [1. Executive Dashboard](#screen-1-executive-dashboard)
   - [2. Niche Radar](#screen-2-niche-radar)
   - [3. Channel Portfolio](#screen-3-channel-portfolio)
   - [4. Competitor View](#screen-4-competitor-view)
   - [5. Kanban Production Board](#screen-5-kanban-production-board)
   - [6. AI Copilot Sidebar](#screen-6-ai-copilot-sidebar)
   - [7. Content Calendar](#screen-7-content-calendar)
   - [8. Publishing Queue](#screen-8-publishing-queue)
   - [9. Analytics Cockpit](#screen-9-analytics-cockpit)
   - [10. Automation Builder](#screen-10-automation-builder)
   - [11. Cost Dashboard](#screen-11-cost-dashboard)
   - [12. Provider Health Dashboard](#screen-12-provider-health-dashboard)
   - [13. Monetization Dashboard](#screen-13-monetization-dashboard)
   - [14. Per-Channel Settings](#screen-14-per-channel-settings)
5. [Keyboard Shortcuts](#5-keyboard-shortcuts)
6. [EN/ES Language Toggle](#6-enes-language-toggle)
7. [Design Tokens](#7-design-tokens)

---

## 1. Design Philosophy

**Operator-First, Not User-First.** This UI serves a single operator running a content business, not a consumer end-user. Density and power matter more than onboarding handholding. The UI should feel like a Bloomberg Terminal or a trading dashboard — every pixel earns its place.

**Principles:**
- **Density over whitespace** — show more, scroll less
- **Contextual actions** — right action in the right place, not in a menu three clicks deep
- **Data-forward** — numbers, trends, and statuses are never hidden
- **Progressive disclosure** — detail panels slide in without leaving context
- **Keyboard-native** — every primary action has a shortcut
- **Dark-mode default** — extended operator sessions; reduce eye strain

**Tech Stack (UI):**
- React 18 + TypeScript
- Tailwind CSS (utility-first)
- shadcn/ui components (Radix UI primitives)
- Recharts / Tremor for data visualization
- React Query (TanStack Query) for data fetching
- Zustand for client state
- React DnD for Kanban drag-and-drop
- i18next for EN/ES localization

---

## 2. Navigation Structure

### Primary Navigation (Left Sidebar, 64px wide, icon + label on hover)

```
┌─────────────────────────────────┐
│  [FVOS Logo]                    │
├─────────────────────────────────┤
│  ⊞  Dashboard          /        │
│  🔭 Niche Radar         /niches  │
│  📺 Channels            /chan    │
│  🎬 Production          /prod   │
│  📅 Calendar            /cal    │
│  📤 Publishing          /pub    │
│  📊 Analytics           /anal   │
│  🤖 Automation          /auto   │
│  💰 Cost                /cost   │
│  💡 Monetization        /mon    │
├─────────────────────────────────┤
│  ⚙️  Settings           /set    │
│  🔌 Providers           /prov   │
│  [User Avatar]                  │
└─────────────────────────────────┘
```

### Secondary Navigation (Top Tab Bar within sections)

Each primary section has contextual tabs:

| Section | Tabs |
|---------|------|
| Channels | Overview \| [Channel Name] \| + Add Channel |
| Production | Kanban \| Scripts \| Videos \| Assets |
| Analytics | Cross-Channel \| [Channel] \| Competitors |
| Cost | Overview \| By Channel \| By Provider \| Budgets |

### Breadcrumbs

Every deep-link shows: `Home > Channels > [Channel Name] > [Script Title]`

---

## 3. Global Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ TOPBAR: [Breadcrumb]          [Search ⌘K] [Alerts🔔] [EN|ES] [👤] │
├──────┬───────────────────────────────────────────────────────────┤
│      │                                                           │
│  64px│         MAIN CONTENT AREA                                 │
│  NAV │                                                     │ 380px│
│      │                                                     │ AI   │
│      │                                                     │ SIDE-│
│      │                                                     │ BAR  │
│      │                                                     │(tog) │
└──────┴─────────────────────────────────────────────────────┴─────┘
```

- **Top bar:** 48px height. Contains global search (⌘K command palette), notification bell with count badge, language toggle, user avatar menu.
- **Left nav:** 64px collapsed / 220px expanded (hover to expand). Icon-only in collapsed state.
- **Main content:** Fluid width, max-width 1600px, 24px padding.
- **AI Copilot sidebar:** 380px, slides in from right, toggled with ⌘\ shortcut. Context-aware — knows what screen you're on.

### Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| > 1280px | Full layout with sidebar |
| 1024–1280px | Nav collapsed, sidebar hidden by default |
| < 1024px | Mobile not supported in Phase 1; tablet gets stacked layout |

---

## 4. Screen Designs

---

### Screen 1: Executive Dashboard

**Purpose:** Operator's morning briefing. One glance to understand system health, today's queue, and business performance.

**Phase:** 1 (full)

#### Layout

```
┌────────────────────────────────────────────────────────────┐
│ KPI ROW (5 cards, equal width)                             │
│ [Videos This Month] [Total Views] [Revenue MTD] [Margin%] [Spend MTD] │
├──────────────────────┬─────────────────────────────────────┤
│ TODAY'S QUEUE        │ SYSTEM HEALTH                       │
│ ─────────────────    │ ─────────────────                   │
│ 3 scripts in prod    │ ● OpenAI: Healthy                   │
│ 2 videos rendering   │ ● ElevenLabs: Degraded ⚠           │
│ 5 jobs scheduled     │ ● R2 Storage: Healthy               │
│ 1 failed (retry)     │ ● YouTube API: Healthy              │
│                      │ ● TikTok API: Healthy               │
│ [View Queue →]       │ [View All Providers →]              │
├──────────────────────┴─────────────────────────────────────┤
│ PERFORMANCE CHART (7-day / 30-day toggle)                  │
│ Line chart: Views by channel | Stacked bar: Cost vs Revenue│
├──────────────────────────────┬─────────────────────────────┤
│ TOP PERFORMING VIDEOS (7d)   │ BUDGET STATUS               │
│ #1 [Title] Ch: AITools 48K👁 │ AITools: ████░░ 62% ($31/$50)│
│ #2 [Title] Ch: Finance  21K👁 │ Finance: ███░░░ 48% ($24/$50)│
│ #3 [Title] Ch: Health   18K👁 │ Total:   ████░░ 55% ($55/100)│
└──────────────────────────────┴─────────────────────────────┘
```

#### KPI Cards

| Card | Metric | Change Indicator |
|------|--------|-----------------|
| Videos This Month | Count | vs last month (%) |
| Total Views | Sum across all channels | 7d trend arrow |
| Revenue MTD | Sum from analytics_snapshots | vs last month |
| Gross Margin % | (revenue - cost) / revenue | vs last month |
| Spend MTD | Sum from ledger_entries | Budget % used |

#### Primary Actions

- "View Queue" → Publishing Queue screen
- "Generate Ideas" → opens Idea Batch modal for selected channel
- "Add Channel" → Channel Creation wizard

#### Data Refresh

- KPIs: real-time via WebSocket (BullMQ events)
- Charts: 5-minute polling
- System health: 2-minute polling

---

### Screen 2: Niche Radar

**Purpose:** Research and discovery interface for finding profitable niches.

**Phase:** 1 (core), Phase 2 (AI-assisted trend alerts, competitor map)

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ FILTERS: [Keywords input] [Platform ▼] [Language ▼] [Revenue Potential ▼] [Run Discovery] │
├────────────────────────────────────┬────────────────────────┤
│ NICHE TABLE (sortable)              │ DETAIL PANEL (on select)│
│ ─────────────────────────────────  │ ───────────────────────  │
│ Name         | Opp | Comp | Trend  │ [Niche Name]            │
│ AI Automation| 8.4 | Med  | ↑ 45% │                         │
│ Side Hustles | 7.9 | High | ↑ 12% │ Opportunity Score: 8.4  │
│ Stoicism     | 7.1 | Low  | → 2%  │ Competition: Medium     │
│ Crypto 2025  | 6.8 | High | ↑ 89% │ Trend: +45% (90d)       │
│ Minimalism   | 6.2 | Low  | ↓ 5%  │                         │
│                                    │ TOP KEYWORDS:           │
│ [Load More]                        │ • ai automation tools   │
│                                    │ • automate with AI      │
│                                    │ • AI side hustle        │
│                                    │                         │
│                                    │ TOP COMPETITORS:        │
│                                    │ @AIExplained (2.1M)     │
│                                    │ @AutomatewithAI (890K)  │
│                                    │                         │
│                                    │ [Analyze Competitors]   │
│                                    │ [Create Channel →]      │
└────────────────────────────────────┴────────────────────────┘
│ TREND CHART: Search volume over time for selected niche      │
└─────────────────────────────────────────────────────────────┘
```

#### Data Shown

- Niche table: name, opportunity_score, competition_score, revenue_potential, trend_score, trend_direction (7d)
- Detail panel: full scoring breakdown, top keywords, competitor previews
- Trend chart: 90-day search volume for top 3 keywords in niche

#### Primary Actions

- "Run Discovery" — triggers Workflow 1
- "Analyze Competitors" — triggers Workflow 3 for top competitors
- "Create Channel" — triggers Channel Creation wizard (Workflow 2)
- "Watch Niche" — adds to watched list; sends weekly trend update
- Column sort on all table columns
- Filter by: platform, language, revenue potential, competition level

#### Phase 2 Additions

- Map view: bubble chart (x=competition, y=revenue potential, size=trend_score)
- Alert configuration: "Notify me when a niche crosses 0.80 trend_score"
- Niche comparison mode: select 2–3 niches side-by-side

---

### Screen 3: Channel Portfolio

**Purpose:** Bird's eye view of all channels. Status, performance, and quick actions.

**Phase:** 1 (full)

#### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [+ Add Channel]    FILTERS: [Platform ▼] [Status ▼] [Sort ▼]│
├──────────────────────────────────────────────────────────────┤
│ CHANNEL GRID (card per channel)                               │
│                                                               │
│ ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│ │ [YT icon] AITool│  │ [TT icon] Fin.. │  │ [IG] Health.. │ │
│ │ ● ACTIVE        │  │ ⚠ DEGRADED      │  │ ⏸ PAUSED      │ │
│ │ PREMIUM tier    │  │ ECONOMICAL      │  │ FREE tier     │ │
│ │ ─────────────── │  │ ─────────────── │  │ ────────────  │ │
│ │ 48K views/wk    │  │ 12K views/wk    │  │ 3K views/wk   │ │
│ │ $1.24 rev/wk    │  │ $0.38 rev/wk    │  │ $0.09 rev/wk  │ │
│ │ Margin: 64%     │  │ Margin: 28%     │  │ Margin: -12%  │ │
│ │ Budget: 72% ████│  │ Budget: 45% ██░ │  │ Budget: 91% ██│ │
│ │ ─────────────── │  │ ─────────────── │  │ ────────────  │ │
│ │ [Open] [⚙️] [▶] │  │ [Open] [⚙️] [▶] │  │ [Open] [⚙️]   │ │
│ └─────────────────┘  └─────────────────┘  └───────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

#### Card Data

- Channel name, platform icon, handle
- Status badge (Active / Paused / Archived / Budget Warning)
- AI Tier badge with color coding
- Weekly views, weekly revenue, gross margin %
- Budget gauge (% used this period, color: green < 80%, yellow 80–95%, red > 95%)
- Quick actions: Open channel, Settings, Play/Pause autopilot

#### Primary Actions

- Open channel → goes to per-channel production board
- + Add Channel → Channel Creation wizard
- Bulk select → bulk pause/archive
- Sort by: views, revenue, margin, spend, tier

---

### Screen 4: Competitor View

**Purpose:** Deep analysis of competitor channels to extract hooks, formats, and content strategy signals.

**Phase:** 1 (core), Phase 2 (automated monitoring + alerts)

#### Layout

```
┌────────────────────────────────────────────────────────────┐
│ [Enter competitor URL or @handle]  [Platform ▼] [Analyze]  │
├──────────────────────┬─────────────────────────────────────┤
│ COMPETITOR LIST      │ INSIGHTS PANEL                      │
│ ─────────────────    │ ─────────────────                   │
│ @AIExplained    2.1M │ @AIExplained — Analysis             │
│ @AutomateAI     890K │                                     │
│ @TechHacks      540K │ HOOK PATTERNS:                      │
│                      │ "Did you know [STAT] about [X]?"    │
│ [+ Add Competitor]   │ "Most people get [X] completely..." │
│                      │ "[NUMBER] things [AUTHORITY] hides" │
│                      │ [Copy] [Use in Idea Batch]          │
│                      │                                     │
│                      │ FORMAT: Listicle (Top 7/10)         │
│                      │ PACING: Fast-cut (3–5s cuts)        │
│                      │ AVG DURATION: 8 min                 │
│                      │ UPLOAD FREQ: Daily                  │
│                      │                                     │
│                      │ TOP TOPICS:                         │
│                      │ • AI automation (38% of content)    │
│                      │ • ChatGPT prompts (22%)             │
│                      │ • Make money online (18%)           │
│                      │                                     │
│                      │ THUMBNAIL STYLE:                    │
│                      │ Red bold text + shocked expression  │
│                      │                                     │
│                      │ [Generate Ideas from This Style]    │
└──────────────────────┴─────────────────────────────────────┘
│ TOP VIDEOS TABLE                                            │
│ Title | Views | Likes | Duration | Published | Hook Preview │
└────────────────────────────────────────────────────────────┘
```

#### Primary Actions

- "Analyze" → triggers Workflow 3 (Competitor Analysis)
- "Copy Hook Pattern" → copies formula to clipboard
- "Use in Idea Batch" → pre-populates Idea Generation context with this hook style
- "Generate Ideas from This Style" → triggers Workflow 5 with competitor format context
- Click video title → opens video in side panel with transcript preview

#### Phase 2 Additions

- "Monitor Competitor" toggle → weekly re-analysis with change alerts
- Overlay: your channel's performance vs competitor's (normalized)
- "Gap Finder" — topics they haven't covered that trend well

---

### Screen 5: Kanban Production Board

**Purpose:** Visual pipeline for all content in production. The operational heartbeat of the platform.

**Phase:** 1 (full)

#### Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ Channel: [AITools ▼]  [+ New Idea]  [Generate Batch]  [Filters ▼]  │
├──────────┬────────────┬─────────────┬───────────────┬──────────────┤
│  IDEA    │  APPROVED  │  SCRIPTING  │   PRODUCTION  │  PUBLISHED   │
│  (12)    │  (5)       │  (3)        │   (4)         │  (47)        │
├──────────┼────────────┼─────────────┼───────────────┼──────────────┤
│ ┌──────┐ │ ┌────────┐ │ ┌─────────┐ │ ┌───────────┐ │ ┌──────────┐│
│ │AI    │ │ │Claude  │ │ │7 Prompts│ │ │[▶ 67%   ] │ │ │Top 10 AI ││
│ │Agents│ │ │for YT  │ │ │YT 2025  │ │ │rendering  │ │ │43K views ││
│ │ROI=82│ │ │ROI=78  │ │ │Script ✓ │ │ │           │ │ │$0.84 rev ││
│ │✦ LISTICLE│ │ Script▶│ │ Voices▶ │ │ │           │ │ │6 days ago││
│ └──────┘ │ └────────┘ │ └─────────┘ │ └───────────┘ │ └──────────┘│
│          │            │             │               │              │
│ ┌──────┐ │ ┌────────┐ │             │ ┌───────────┐ │ ┌──────────┐│
│ │Make  │ │ │10 Auto-│ │             │ │[■■■░░░   ]│ │ │Passive   ││
│ │$1k/wk│ │ │mation  │ │             │ │TTS in     │ │ │Income... ││
│ │ROI=71│ │ │ROI=75  │ │             │ │progress   │ │ │21K views ││
│ └──────┘ │ └────────┘ │             │ └───────────┘ │ └──────────┘│
└──────────┴────────────┴─────────────┴───────────────┴──────────────┘
```

#### Card Data (Idea column)

- Title (truncated)
- ROI score (color-coded)
- Format badge (LISTICLE, TUTORIAL, etc.)
- Trend alignment indicator
- Hover: full title, hook, pillar, estimated cost

#### Card Data (Production column)

- Title
- Progress bar (% of render complete)
- Current stage label (TTS / Images / Assembly)

#### Card Data (Published column)

- Title
- Views count
- Revenue earned
- Days since publish
- Performance badge: 🔥 WINNER / ⚠ SLOW

#### Primary Actions

- Drag card between columns
- Click card → opens detail panel (right slide-in)
- "+" in column header → create idea/script/etc. in that stage
- Column header count → filter to show only that column full-screen
- "Generate Batch" → trigger Workflow 5 with current channel context

#### Keyboard Navigation

- `→` / `←` → move selected card to next/previous column
- `Enter` → open card detail
- `N` → new idea in current column
- `G` → generate idea batch

---

### Screen 6: AI Copilot Sidebar

**Purpose:** Context-aware AI assistant that understands what screen the operator is on and provides relevant help, analysis, and actions.

**Phase:** 1 (basic), Phase 2 (memory + multi-turn context)

#### Layout

```
┌─────────────────────────────────────┐
│ 🤖 AI Copilot          [⌘\] [Clear] │
├─────────────────────────────────────┤
│ Context: Kanban — AITools channel   │
│ ─────────────────────────────────── │
│ SUGGESTIONS:                        │
│ ┌───────────────────────────────┐   │
│ │ 💡 "AI Agents for Beginners"  │   │
│ │    is trending this week.     │   │
│ │    Add to idea batch?         │   │
│ │    [Add Idea] [Dismiss]       │   │
│ └───────────────────────────────┘   │
│                                     │
│ ┌───────────────────────────────┐   │
│ │ ⚠️ Budget 72% used (8 days    │   │
│ │    left). Slow down pace?     │   │
│ │    [Adjust Schedule]          │   │
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤
│ CHAT INPUT                          │
│ ┌───────────────────────────────┐   │
│ │ Ask anything about this       │   │
│ │ channel...                    │   │
│ │                          [↵]  │   │
│ └───────────────────────────────┘   │
│                                     │
│ [Regenerate hook] [Analyze winners] │
│ [Suggest thumbnail] [Check budget]  │
└─────────────────────────────────────┘
```

#### Context Awareness

| Screen | Auto-suggestions |
|--------|-----------------|
| Dashboard | "3 channels have negative ROI — review?" |
| Niche Radar | "X niche just crossed trending threshold" |
| Kanban | "5 ideas awaiting approval — auto-approve top 3?" |
| Script Editor | "This hook tested poorly — want alternatives?" |
| Analytics | "Winner detected: iterate on this format?" |
| Cost Dashboard | "Provider Y is cheaper for this task type" |

#### Predefined Actions (Quick Buttons)

Change based on current screen. Always visible at bottom of sidebar:
- Kanban: `Regenerate hook`, `Analyze winners`, `Check budget`
- Analytics: `Find winner pattern`, `Compare to competitor`, `Suggest optimization`
- Cost: `Show cheapest provider`, `Estimate batch cost`, `Project this month`

#### Phase 2 Additions

- Persistent memory: remembers past decisions, preferences, dismissed suggestions
- Multi-turn conversation with full context of last 20 actions
- "Explain this" → right-click any number/chart and ask AI to explain it

---

### Screen 7: Content Calendar

**Purpose:** Visual scheduling interface for planned and published content.

**Phase:** 1 (view + schedule), Phase 2 (drag-reschedule + AI optimal time suggestions)

#### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Channel: [All Channels ▼]   [← April 2026 →]  [Week | Month]│
├──────────────────────────────────────────────────────────────┤
│ MON 14   │ TUE 15   │ WED 16   │ THU 17   │ FRI 18   │ ...  │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────┤
│ 09:00 YT │          │ 09:00 TT │          │ 09:00 YT │      │
│ ┌──────┐ │          │ ┌──────┐ │          │ ┌──────┐  │      │
│ │AI    │ │          │ │Side  │ │          │ │10 AI │  │      │
│ │Agent │ │          │ │Hustle│ │          │ │Tools │  │      │
│ │✓ PUB │ │          │ │⏳SCHED│ │          │ │🎬 PROD│ │      │
│ └──────┘ │          │ └──────┘ │          │ └──────┘  │      │
│          │ 14:00 YT │          │          │          │      │
│          │ ┌──────┐ │          │          │          │      │
│          │ │Claude│ │          │          │          │      │
│          │ │Prompts│ │         │          │          │      │
│          │ │✏ SCRIPT│          │          │          │      │
│          │ └──────┘ │          │          │          │      │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────┘
│ LEGEND: ✓ Published  ⏳ Scheduled  🎬 In Production  ✏ Scripting │
└──────────────────────────────────────────────────────────────┘
```

#### Card Status Colors

- Published: green border
- Scheduled: blue border
- In Production: orange border
- Scripting: yellow border
- Unscheduled / Draft: gray

#### Primary Actions

- Click card → opens video detail panel
- Drag card (Phase 2) → reschedule with confirmation
- Click empty slot → "Schedule video here" action
- "+ Add Video" button → opens idea selection panel
- "Optimal Time" button → AI suggests best posting times per platform

---

### Screen 8: Publishing Queue

**Purpose:** Operational view of all pending, active, and failed publish jobs.

**Phase:** 1 (full)

#### Layout

```
┌───────────────────────────────────────────────────────────────┐
│ TABS: [Pending (7)] [Processing (2)] [Published (134)] [Failed (1)] │
├───────────────────────────────────────────────────────────────┤
│ PENDING JOBS TABLE                                            │
│ ─────────────────────────────────────────────                 │
│ Video Title  | Channel | Platform | Scheduled | Status | Actions│
│ ──────────── │ ─────── │ ──────── │ ───────── │ ────── │ ─────│
│ AI Agents... │ AITools │ YouTube  │ 09:00 tmrw│ ⏳ PEND │ [✕][▶]│
│ Side Hustle  │ Finance │ TikTok   │ 14:00 tmrw│ ⏳ PEND │ [✕][▶]│
│ 10 Tools...  │ AITools │ YT Short │ 09:05 tmrw│ ⏳ PEND │ [✕][▶]│
├───────────────────────────────────────────────────────────────┤
│ FAILED JOBS                                         (1 item)  │
│ ─────────────────────────────────────────────────────────────│
│ ⚠️ "ChatGPT Tutorial" — TikTok — Failed 2h ago               │
│ Error: OAuth token expired for @FinanceWithJack               │
│ [Reconnect Account] [Retry] [Dismiss]                         │
└───────────────────────────────────────────────────────────────┘
```

#### Data Shown

- Pending: video title, channel, platform icon, scheduled time, status badge
- Processing: upload progress bar, estimated completion
- Published: platform video ID (linked), published time, initial views
- Failed: error message, retry count, action buttons

#### Primary Actions

- "Publish Now" → override scheduled time, publish immediately
- "Cancel" → remove pending job
- "Retry" → re-enqueue failed job
- "Reconnect Account" → trigger OAuth re-auth for failed account
- Bulk select → bulk cancel, bulk reschedule

---

### Screen 9: Analytics Cockpit

**Purpose:** Performance intelligence for all channels and individual videos.

**Phase:** 1 (core metrics), Phase 2 (revenue API integration, cohort analysis)

#### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ TABS: [Cross-Channel] [AITools] [Finance] [Health]  [+ Channel]│
├────────────────────────────────────────────────────────────────┤
│ PERIOD: [7D | 30D | 90D | Custom]   Compare to: [Prior Period] │
├───────────────────────┬────────────────────────────────────────┤
│ METRIC SUMMARY (row)  │                                        │
│ Total Views: 183,291  │  VIEWS OVER TIME (line chart)         │
│ Total Revenue: $48.20 │  Multi-series: one line per channel   │
│ Avg CTR: 4.8%         │                                        │
│ Avg AVD: 52%          │                                        │
├───────────────────────┴────────────────────────────────────────┤
│ TOP VIDEOS TABLE                                                │
│ Title | Channel | Platform | Views | CTR | AVD | Rev | Age    │
│ ─────────────────────────────────────────────────────────────  │
│ AI Agents... | AITools | YT | 48,320 | 6.2% | 61% | $12.40|3d│
│ Side Hustle  | Finance | TT | 21,100 | 4.1% | 48% | $5.20 |7d│
│ 10 Tools...  | AITools | YT | 18,940 | 5.8% | 55% | $4.90 |5d│
│ [🔥 WINNER badge on top row]                                   │
├────────────────────────────────────────────────────────────────┤
│ PLATFORM BREAKDOWN (bar chart)                                  │
│ YouTube vs TikTok vs Instagram: views, revenue, engagement rate │
└────────────────────────────────────────────────────────────────┘
```

#### Per-Channel Tab

Within a channel tab, shows:
- Channel-level metrics (subscribers, total views, revenue, margin)
- Per-video table with deep metrics
- Pillar breakdown: avg performance by content pillar
- Time-of-day heatmap: when videos get most views
- "Iterate on Winner" button on any video row

#### Primary Actions

- "Iterate on Winner" → triggers Workflow 12
- Click video row → opens video analytics detail panel
- Export → CSV export of shown table
- "Add Revenue" → manual revenue entry for a video

---

### Screen 10: Automation Builder

**Purpose:** Visual no-code interface for creating and managing autopilot rules.

**Phase:** 1 (rule list + JSON editing), Phase 2 (visual drag-and-drop builder)

#### Layout

```
┌───────────────────────────────────────────────────────────────┐
│ Channel: [AITools ▼]   [+ New Rule]                          │
├──────────────────────────────────┬────────────────────────────┤
│ RULE LIST                         │ RULE EDITOR                │
│ ──────────────────────────────── │ ──────────────────────────  │
│ ● Weekly Idea Batch (enabled)    │ Name: Weekly Idea Batch     │
│   TRIGGER: Mon 00:00 UTC         │                             │
│   ACTION: Generate 20 Ideas      │ TRIGGER:                    │
│   [Edit] [Disable] [Delete]      │ Type: [SCHEDULE ▼]         │
│                                  │ Cron: [0 0 * * 1      ]    │
│ ● Script on Approve (enabled)    │                             │
│   TRIGGER: idea.status=APPROVED  │ ACTION:                     │
│   ACTION: Create Script EN+ES    │ Type: [GENERATE_IDEAS ▼]   │
│   [Edit] [Disable] [Delete]      │ Count: [20]                 │
│                                  │ Channel: [AITools ▼]        │
│ ⏸ Daily Publish (disabled)       │ Auto-approve top: [5 ▼]    │
│   TRIGGER: Scheduled times       │                             │
│   ACTION: Publish next ready     │ BUDGET CAP:                 │
│   [Edit] [Enable] [Delete]       │ Max per run: [$5.00]        │
│                                  │                             │
│                                  │ [Test Rule] [Save]          │
└──────────────────────────────────┴────────────────────────────┘
```

#### Rule Components

**Trigger Types:**

| Trigger | Config Fields |
|---------|--------------|
| SCHEDULE | Cron expression + timezone |
| THRESHOLD | Metric + operator + value (e.g., budget_utilization > 0.80) |
| EVENT | Event type (idea.approved, video.done, etc.) |
| MANUAL | No config; operator-fired only |

**Action Types:**

| Action | Config Fields |
|--------|--------------|
| GENERATE_IDEAS | count, pillar_id (optional), auto_approve_top_n |
| CREATE_SCRIPT | language, auto_approve |
| RENDER_VIDEO | tier override (optional) |
| PUBLISH | schedule_offset (hours from ready), platform targets |
| ANALYZE | snapshot type, store results |
| TIER_ADJUST | review only vs auto-apply |

#### Phase 2 Additions

- Visual flow builder (node-based, like n8n)
- Conditional branches: "If views > 10K → trigger X, else trigger Y"
- Multi-step automation chains
- Rule templates library (preconfigured best-practice rules)

---

### Screen 11: Cost Dashboard

**Purpose:** Full visibility into AI and media spending, budget status, and cost efficiency.

**Phase:** 1 (full)

#### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ TABS: [Overview] [By Channel] [By Provider] [Budgets]          │
├────────────────────────────────────────────────────────────────┤
│ OVERVIEW TAB                                                    │
│                                                                 │
│ MTD SPEND: $87.43    BUDGET: $200.00    REMAINING: $112.57     │
│ GAUGE: ████████░░░░░░░░░░ 43.7%                                │
│                                                                 │
│ ┌──────────────────────────┬─────────────────────────────────┐ │
│ │ SPEND BY TASK TYPE (pie) │ SPEND OVER TIME (area chart)    │ │
│ │                          │ Daily spend last 30d             │ │
│ │ Script Gen: 22% ($19.23) │ Stacked by: channel / provider  │ │
│ │ TTS:        35% ($30.60) │                                  │ │
│ │ Images:     18% ($15.74) │                                  │ │
│ │ Video Rend: 15% ($13.11) │                                  │ │
│ │ Other:      10% ($8.75)  │                                  │ │
│ └──────────────────────────┴─────────────────────────────────┘ │
│                                                                 │
│ CHANNEL BUDGET GAUGES:                                          │
│ AITools:  ██████░░░░ 62% ($31.00 / $50.00) [Edit Budget]       │
│ Finance:  ████░░░░░░ 48% ($24.00 / $50.00) [Edit Budget]       │
│ Health:   █████████░ 91% ($45.50 / $50.00) ⚠ NEAR LIMIT       │
└────────────────────────────────────────────────────────────────┘
```

#### By Provider Tab

Table: Provider | Task Type | Calls Today | Calls MTD | Cost MTD | Avg Cost/Call | Status

#### By Channel Tab

Table: Channel | Tier | Budget | Spent | Remaining | % Used | Projected EOM | ROI Multiple

#### Budgets Tab

- Edit budget caps for each channel
- Alert threshold slider (default 80%)
- Hard stop toggle
- Carry queue toggle (queue overflow to next month vs fail)

#### Primary Actions

- "Edit Budget" → inline budget edit
- "Download Ledger" → export all ledger_entries as CSV
- "Alert Config" → configure email/Slack alerts
- Click any provider/channel → drills into ledger_entries for that entity

---

### Screen 12: Provider Health Dashboard

**Purpose:** Real-time monitoring of all AI and media provider APIs.

**Phase:** 1 (full)

#### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ LAST CHECKED: 2 min ago  [Refresh Now]                        │
├──────────────────────────────────────────────────────────────┤
│ PROVIDER STATUS TABLE                                          │
│ Provider      │ Type    │ Status    │ Latency │ Error Rate │ Cost │
│ ─────────────────────────────────────────────────────────────│
│ OpenAI GPT-4o │ LLM     │ ● Healthy │ 823ms   │ 0.2%      │$$$$  │
│ OpenAI GPT-4m │ LLM     │ ● Healthy │ 312ms   │ 0.1%      │$$$   │
│ Anthropic     │ LLM     │ ● Healthy │ 1.2s    │ 0.3%      │$$$$  │
│ Groq Llama3   │ LLM     │ ● Healthy │ 98ms    │ 0.0%      │$$    │
│ ElevenLabs    │ TTS     │ ⚠ Degraded│ 3.1s    │ 12%       │$$$   │
│ OpenAI TTS    │ TTS     │ ● Healthy │ 420ms   │ 0.1%      │$$    │
│ DALL-E 3      │ Image   │ ● Healthy │ 4.2s    │ 0.4%      │$$$$  │
│ SDXL-Turbo    │ Image   │ ● Healthy │ 1.8s    │ 0.2%      │$     │
│ Runway ML     │ Video   │ ● Healthy │ 45s     │ 1.2%      │$$$$$│
│ Remotion      │ Video   │ ● Healthy │ 22s     │ 0.0%      │$$    │
│ Cloudflare R2 │ Storage │ ● Healthy │ 45ms    │ 0.0%      │$     │
├────────────────────────────────────────────────────────────────┤
│ INCIDENT LOG (last 7 days)                                     │
│ [ElevenLabs degraded 2h ago — auto-routed to OpenAI TTS]      │
│ [OpenAI API outage Apr 14 03:22–04:11 UTC — 49 min impact]    │
└────────────────────────────────────────────────────────────────┘
```

#### Primary Actions

- "Set as Fallback" → configure fallback routing for degraded providers
- Click provider → historical latency chart (7-day p50/p95)
- "Force Health Check" → trigger immediate health ping
- "Disable Provider" → remove from routing until re-enabled

---

### Screen 13: Monetization Dashboard

**Purpose:** Track revenue, affiliate performance, and monetization strategy across channels.

**Phase:** 1 (manual entry + link tracking), Phase 2 (platform API revenue integration)

#### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ MTD REVENUE: $128.40   BEST DAY: $24.20 (Apr 12)              │
├────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────┬───────────────────────────┐   │
│ │ REVENUE BY SOURCE (pie)      │ DAILY REVENUE (bar chart) │   │
│ │ AdSense: 68% ($87.31)        │ Last 30 days               │   │
│ │ Affiliate: 24% ($30.82)      │                            │   │
│ │ Sponsorship: 8% ($10.27)     │                            │   │
│ └──────────────────────────────┴───────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│ AFFILIATE LINKS TABLE                                           │
│ Link Name | Provider | URL | Clicks | Conv | Revenue | CTR    │
│ ────────────────────────────────────────────────────────────── │
│ AI Tools Bundle | Amazon | [...] | 342 | 14 | $28.40 | 4.1%   │
│ Notion Affiliate | Notion | [...] | 218 | 8  | $16.00 | 3.7%  │
│ [+ Add Affiliate Link]                                         │
├────────────────────────────────────────────────────────────────┤
│ REVENUE BY CHANNEL                                             │
│ Channel | AdSense | Affiliate | Sponsor | Total | Cost | ROI  │
│ AITools | $62.40  | $24.20    | $10.27  | $96.87| $38.20 | 2.5x│
└────────────────────────────────────────────────────────────────┘
```

#### Primary Actions

- "+ Add Affiliate Link" → creates monetization_links record with tracked redirect URL
- "Add Revenue Entry" → manual revenue input (AdSense monthly report)
- Click link → open link analytics (clicks over time, conversion funnel)
- "Generate Tracking URL" → creates UTM-tagged redirect URL

---

### Screen 14: Per-Channel Settings

**Purpose:** All configuration for a single channel — tier, voice, autopilot, budget, and integrations.

**Phase:** 1 (full)

#### Layout (Tabbed)

```
┌────────────────────────────────────────────────────────────────┐
│ ◀ AITools Channel    TABS: [General] [AI Tier] [Voice] [Autopilot] [Budget] [Integrations] │
├────────────────────────────────────────────────────────────────┤
│ [General Tab]                                                  │
│ Channel Name: [AI Tools Hub          ]                         │
│ Handle:       [@AIToolsHub           ]                         │
│ Platform:     [YouTube ▼]                                      │
│ Status:       [Active ▼]                                       │
│ Niche:        [AI Tools & Automation ]                         │
│ Primary Language: [English ▼]                                  │
│ Secondary Language: [Spanish ✓]                                │
├────────────────────────────────────────────────────────────────┤
│ [AI Tier Tab]                                                  │
│ Current Tier: [PREMIUM ▼]                                      │
│                                                                │
│ TIER COMPARISON:                                               │
│ FREE      $0   │ Groq + OpenAI TTS + Stock images             │
│ ECONOMICAL $5–15│ GPT-4o-mini + OpenAI TTS + SDXL-Turbo       │
│ OPTIMIZED $15–40│ GPT-4o + ElevenLabs + SDXL + Remotion       │
│ PREMIUM   $40–100│ GPT-4o + EL v2 + DALL-E 3 + Creatomate     │
│ ULTRA    $100+  │ Claude 3.5 + EL v3 + Sora/Runway + 4K       │
│                                                                │
│ Auto-Tier Management: [ON ● ]                                  │
│ View Threshold: [2,000 views/video before tier review]         │
├────────────────────────────────────────────────────────────────┤
│ [Voice Tab]                                                    │
│ Default Voice Profile:                                         │
│ Provider: [ElevenLabs ▼] Voice: [Sofia (EN) ▼]                │
│ Style: [Narrative ▼]     Speed: [1.0x]                        │
│ [▶ Preview Voice]                                              │
│                                                                │
│ ES Voice Profile:                                              │
│ Provider: [ElevenLabs ▼] Voice: [Carlos (ES-LATAM) ▼]         │
│ [▶ Preview Voice]                                              │
├────────────────────────────────────────────────────────────────┤
│ [Autopilot Tab]                                                │
│ Autopilot Mode: [ON ●]                                         │
│ Ideas per week: [20 ▼]   Auto-approve top: [5 ▼]              │
│ Script: Auto-generate: [ON ●]  Auto-approve: [OFF ○]          │
│ Production: Auto-render: [ON ●]                                │
│ Publishing: Auto-publish: [ON ●]  Time: [09:00 ▼] [UTC ▼]    │
│                                                                │
│ Localization: [EN+ES ●]                                        │
└────────────────────────────────────────────────────────────────┘
```

#### Primary Actions per Tab

- General: Save changes
- AI Tier: Change tier (with cost impact warning)
- Voice: Preview voice, set as default, add new voice profile
- Autopilot: Toggle any stage, configure frequencies
- Budget: Edit monthly cap, alert threshold, hard stop toggle
- Integrations: Connect/disconnect platform accounts, manage OAuth tokens

---

## 5. Keyboard Shortcuts

### Global

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open command palette (search all screens, ideas, channels) |
| `⌘\` | Toggle AI Copilot sidebar |
| `⌘1` – `⌘9` | Jump to nav items 1–9 |
| `⌘/` | Show keyboard shortcut reference |
| `Escape` | Close modal / panel |
| `⌘S` | Save current form |

### Production Board

| Shortcut | Action |
|----------|--------|
| `N` | New idea in current channel |
| `G` | Generate idea batch |
| `→` | Move selected card to next column |
| `←` | Move selected card to previous column |
| `Enter` | Open card detail |
| `X` | Reject / delete selected card |
| `A` | Approve selected idea |

### Navigation

| Shortcut | Action |
|----------|--------|
| `D` | Go to Dashboard |
| `R` | Go to Niche Radar |
| `C` | Go to Channels |
| `P` | Go to Production Board |
| `L` | Go to Calendar |
| `U` | Go to Publishing Queue |
| `T` | Go to Analytics |
| `$` | Go to Cost Dashboard |

### Analytics

| Shortcut | Action |
|----------|--------|
| `I` | Iterate on selected winner |
| `E` | Export current view to CSV |
| `7` | Switch to 7-day view |
| `3` | Switch to 30-day view |

---

## 6. EN/ES Language Toggle

### UI Scope

The EN/ES toggle in the top bar switches the **operator interface language** — not the content language. This is for operators who prefer to work in Spanish.

### Implementation

```typescript
// i18n config
// packages/web/src/i18n/index.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, es: { translation: es } },
    lng: localStorage.getItem('ui_language') ?? 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
```

### Toggle Component

```tsx
// packages/web/src/components/LanguageToggle.tsx
export function LanguageToggle() {
  const { i18n } = useTranslation();
  const toggle = () => {
    const next = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('ui_language', next);
  };
  return (
    <button onClick={toggle} className="text-sm font-mono px-2 py-1 rounded border">
      {i18n.language === 'en' ? 'EN' : 'ES'}
    </button>
  );
}
```

### Coverage

All UI labels, error messages, notifications, and system-generated content titles are translated. Channel content (scripts, ideas) language is controlled separately by channel-level language settings.

---

## 7. Design Tokens

```typescript
// packages/web/src/design/tokens.ts

export const tokens = {
  colors: {
    bg:         '#0F0F11',    // Main background (near black)
    surface:    '#17171A',    // Cards, panels
    border:     '#27272A',    // Dividers
    muted:      '#71717A',    // Secondary text
    text:       '#FAFAFA',    // Primary text
    accent:     '#7C3AED',    // Primary accent (violet)
    success:    '#22C55E',    // Green
    warning:    '#F59E0B',    // Amber
    danger:     '#EF4444',    // Red
    info:       '#3B82F6',    // Blue
  },
  tiers: {
    FREE:        '#6B7280',   // Gray
    ECONOMICAL:  '#3B82F6',   // Blue
    OPTIMIZED:   '#8B5CF6',   // Purple
    PREMIUM:     '#F59E0B',   // Amber/Gold
    ULTRA:       '#EF4444',   // Red (premium)
  },
  status: {
    ACTIVE:     '#22C55E',
    PAUSED:     '#F59E0B',
    ARCHIVED:   '#6B7280',
    HEALTHY:    '#22C55E',
    DEGRADED:   '#F59E0B',
    DOWN:       '#EF4444',
  },
  spacing: {
    xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', '2xl': '48px',
  },
  radius: {
    sm: '4px', md: '8px', lg: '12px', full: '9999px',
  },
  font: {
    sans:  '"Inter", system-ui, sans-serif',
    mono:  '"JetBrains Mono", "Fira Code", monospace',
    size: { xs: '11px', sm: '12px', base: '14px', md: '16px', lg: '18px', xl: '24px' },
  },
};
```
