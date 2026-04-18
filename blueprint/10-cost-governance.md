# 10 — Cost Governance Engine

**Faceless Viral OS | Blueprint Series**
Version: 1.0 | Status: Engineering-Ready | Phase: 1 + 2

---

## Table of Contents

1. [Overview](#overview)
2. [Budget Entities](#budget-entities)
3. [Usage Ledger](#usage-ledger)
4. [Pre-Run Estimators](#pre-run-estimators)
5. [Post-Run Reconciliation](#post-run-reconciliation)
6. [Budget Alerts](#budget-alerts)
7. [Hard-Stop Logic](#hard-stop-logic)
8. [Downgrade / Upgrade Automation](#downgrade--upgrade-automation)
9. [ROI and Margin Reporting](#roi-and-margin-reporting)
10. [Implementation Checklist](#implementation-checklist)

---

## 1. Overview

The Cost Governance Engine (CGE) is the financial control plane of Faceless Viral OS. It ensures that every AI call, TTS render, and video assembly operation is budgeted, tracked, reconciled, and reportable — before it happens and after. In Phase 1 (single operator), the CGE operates as a personal finance dashboard for content operations. In Phase 2 (multi-tenant SaaS), it becomes the billing enforcement layer.

The CGE is **not** a payment processor. It tracks internal operational costs (what we pay providers) and correlates them with external revenue (YouTube AdSense, affiliate links) to compute margin.

### Design Principles

- **Append-only ledger** — cost records are never mutated, only annotated
- **Estimate-before-execute** — no job runs without a pre-flight cost estimate
- **Fail-safe by default** — when budget state is unknown, block execution
- **Graceful degradation** — prefer tier downgrade over hard failure
- **Auditability** — every dollar spent is traceable to a workflow, channel, and provider

---

## 2. Budget Entities

The CGE operates on five budget scopes, each with independent limits and alert thresholds. Budgets nest hierarchically — a workflow budget cannot exceed its channel budget, which cannot exceed the user budget.

### 2.1 Budget Hierarchy

```
User Budget (global monthly ceiling)
  └── Channel Budget (per-channel monthly cap)
        └── Workflow Budget (per automation run cap)
              └── Batch Budget (per content batch cap)
                    └── Provider Budget (per provider daily cap)
```

### 2.2 Entity Definitions

#### User Budget
- **Scope:** All spending across all channels and workflows for a single operator account
- **Period:** Monthly (calendar month, UTC)
- **Phase 1:** Single user = single budget; effectively the business P&L ceiling
- **Phase 2:** Per workspace, enforced at billing tier

| Field | Type | Description |
|---|---|---|
| `user_id` | UUID | Owner |
| `period` | YYYY-MM | Budget month |
| `amount_usd` | Decimal(10,4) | Hard ceiling |
| `alert_threshold` | Float | Default 0.80 |
| `hard_stop` | Boolean | Default true |
| `rollover_unused` | Boolean | Whether unused budget carries to next month |

#### Channel Budget
- **Scope:** All AI and media spending for a single channel in a calendar month
- **Period:** Monthly, resets on the 1st at 00:00 UTC
- **Inheritance:** Must be ≤ remaining user budget at time of configuration
- **Behavior:** When a channel exhausts its budget, new jobs for that channel are queued to the next period (not failed), unless `hard_stop = true`

| Field | Type | Description |
|---|---|---|
| `channel_id` | UUID | Channel reference |
| `period` | YYYY-MM | Budget month |
| `amount_usd` | Decimal(10,4) | Monthly cap |
| `tier` | Enum | AI tier that applies to this channel |
| `alert_threshold` | Float | Soft alert at this fraction (default 0.80) |
| `hard_stop` | Boolean | Block new jobs at 100% |
| `carry_queue` | Boolean | Queue overflow to next period |

#### Workflow Budget
- **Scope:** A single automation rule execution (one trigger → one run)
- **Period:** Per-run (not calendar-based)
- **Purpose:** Prevents runaway automation from consuming the entire channel budget in one malformed run

| Field | Type | Description |
|---|---|---|
| `workflow_id` | UUID | Automation rule reference |
| `run_id` | UUID | Unique execution ID |
| `cap_usd` | Decimal(10,4) | Max spend for this run |
| `abort_on_exceed` | Boolean | Kill run mid-flight if exceeded |

#### Batch Budget
- **Scope:** A content batch (e.g., "generate 20 scripts this week")
- **Period:** Per-batch (lifecycle = batch lifetime)
- **Relationship:** A batch belongs to a workflow run; batch budget ≤ workflow run cap

| Field | Type | Description |
|---|---|---|
| `batch_id` | UUID | Content batch reference |
| `cap_usd` | Decimal(10,4) | Max spend for this batch |
| `item_count` | Integer | Number of items in batch |
| `per_item_cap` | Decimal(10,4) | Derived: cap_usd / item_count |

#### Provider Budget
- **Scope:** Daily spend cap for a specific AI provider (e.g., OpenAI, ElevenLabs)
- **Period:** Daily (UTC day), independent of calendar month budget
- **Purpose:** Rate-limiting risk and exposure to any single vendor
- **Behavior:** When provider budget is exhausted, the routing layer automatically uses fallback providers

| Field | Type | Description |
|---|---|---|
| `provider_id` | UUID | Provider reference |
| `date` | Date | UTC day |
| `cap_usd` | Decimal(10,4) | Daily cap |
| `current_spend` | Decimal(10,4) | Running total (updated in real-time) |
| `fallback_on_exceed` | Boolean | Route to fallback vs hard stop |

---

## 3. Usage Ledger

### 3.1 Design Principles

The ledger is a **strict append-only log**. Records are inserted after every completed provider call and are never updated or deleted. Corrections are entered as new records with a `correction_of` reference. This design enables:

- Full historical audit trail
- Point-in-time budget reconstruction
- Correction factor training without data loss
- Regulatory compliance (future SaaS billing)

### 3.2 Ledger Entry Schema

```sql
CREATE TABLE ledger_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id          UUID NOT NULL REFERENCES users(id),
  channel_id       UUID REFERENCES channels(id),
  workflow_id      UUID REFERENCES automation_rules(id),
  run_id           UUID,                          -- workflow execution instance
  batch_id         UUID,                          -- content batch instance
  provider         TEXT NOT NULL,                 -- 'openai', 'elevenlabs', 'runwayml', etc.
  model            TEXT NOT NULL,                 -- 'gpt-4o', 'eleven_multilingual_v2', etc.
  task_type        TEXT NOT NULL,                 -- 'script_gen', 'tts', 'image_gen', 'video_render'
  tokens_in        INTEGER,                       -- input tokens (LLM tasks)
  tokens_out       INTEGER,                       -- output tokens (LLM tasks)
  media_seconds    FLOAT,                         -- audio/video duration (media tasks)
  images_generated INTEGER,                       -- count (image tasks)
  cost_usd         DECIMAL(10, 6) NOT NULL,       -- actual cost
  estimated_usd    DECIMAL(10, 6),                -- pre-run estimate (for reconciliation)
  tier             TEXT NOT NULL,                 -- 'FREE','ECONOMICAL','OPTIMIZED','PREMIUM','ULTRA'
  status           TEXT NOT NULL DEFAULT 'completed', -- 'completed','failed','refunded'
  correction_of    UUID REFERENCES ledger_entries(id), -- for correction entries
  metadata         JSONB,                         -- raw provider response, request params, etc.
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for common query patterns
CREATE INDEX idx_ledger_channel_period ON ledger_entries (channel_id, timestamp);
CREATE INDEX idx_ledger_provider_date  ON ledger_entries (provider, DATE(timestamp));
CREATE INDEX idx_ledger_workflow       ON ledger_entries (workflow_id, run_id);
CREATE INDEX idx_ledger_task_type      ON ledger_entries (task_type, timestamp);
CREATE INDEX idx_ledger_user_period    ON ledger_entries (user_id, timestamp);
```

### 3.3 Aggregation Views

```sql
-- Daily spend by channel
CREATE MATERIALIZED VIEW mv_daily_spend_by_channel AS
SELECT
  channel_id,
  DATE(timestamp) AS day,
  SUM(cost_usd)   AS total_usd,
  COUNT(*)        AS entry_count,
  SUM(tokens_in)  AS total_tokens_in,
  SUM(tokens_out) AS total_tokens_out
FROM ledger_entries
WHERE status = 'completed'
GROUP BY channel_id, DATE(timestamp);

-- Monthly spend by channel
CREATE MATERIALIZED VIEW mv_monthly_spend_by_channel AS
SELECT
  channel_id,
  TO_CHAR(timestamp, 'YYYY-MM') AS month,
  SUM(cost_usd) AS total_usd,
  COUNT(*)      AS entry_count
FROM ledger_entries
WHERE status = 'completed'
GROUP BY channel_id, TO_CHAR(timestamp, 'YYYY-MM');

-- Daily spend by provider
CREATE MATERIALIZED VIEW mv_daily_spend_by_provider AS
SELECT
  provider,
  model,
  DATE(timestamp) AS day,
  SUM(cost_usd)   AS total_usd,
  COUNT(*)        AS call_count,
  AVG(cost_usd)   AS avg_cost_per_call
FROM ledger_entries
WHERE status = 'completed'
GROUP BY provider, model, DATE(timestamp);

-- Weekly task-type breakdown
CREATE MATERIALIZED VIEW mv_weekly_task_breakdown AS
SELECT
  channel_id,
  task_type,
  tier,
  DATE_TRUNC('week', timestamp) AS week_start,
  SUM(cost_usd)  AS total_usd,
  COUNT(*)       AS call_count
FROM ledger_entries
WHERE status = 'completed'
GROUP BY channel_id, task_type, tier, DATE_TRUNC('week', timestamp);
```

Views are refreshed on a schedule:

```typescript
// packages/queue/src/jobs/refreshLedgerViews.ts
export const refreshLedgerViewsJob = {
  name: 'refresh-ledger-views',
  schedule: '*/15 * * * *', // every 15 minutes
  handler: async () => {
    await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_spend_by_channel`;
    await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_spend_by_channel`;
    await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_spend_by_provider`;
    await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_weekly_task_breakdown`;
  }
};
```

### 3.4 Ledger Service API

```typescript
// packages/cost-governance/src/ledger.service.ts

export interface LedgerEntryInput {
  userId: string;
  channelId?: string;
  workflowId?: string;
  runId?: string;
  batchId?: string;
  provider: string;
  model: string;
  taskType: TaskType;
  tokensIn?: number;
  tokensOut?: number;
  mediaSeconds?: number;
  imagesGenerated?: number;
  costUsd: number;
  estimatedUsd?: number;
  tier: AiTier;
  status?: 'completed' | 'failed' | 'refunded';
  metadata?: Record<string, unknown>;
}

export class LedgerService {
  async append(entry: LedgerEntryInput): Promise<LedgerEntry> {
    // Never throws — cost tracking must not interrupt the happy path
    try {
      return await db.ledgerEntry.create({ data: entry });
    } catch (err) {
      logger.error({ err, entry }, 'Failed to write ledger entry');
      // Emit to dead-letter queue for async retry
      await ledgerDLQ.add('retry-ledger-entry', entry);
      throw err; // Re-throw so caller can log but not crash
    }
  }

  async getChannelSpend(channelId: string, period: string): Promise<number> {
    const result = await db.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM(cost_usd), 0) AS total
      FROM ledger_entries
      WHERE channel_id = ${channelId}
        AND TO_CHAR(timestamp, 'YYYY-MM') = ${period}
        AND status = 'completed'
    `;
    return result[0].total;
  }

  async getProviderDailySpend(provider: string, date: Date): Promise<number> {
    const result = await db.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM(cost_usd), 0) AS total
      FROM ledger_entries
      WHERE provider = ${provider}
        AND DATE(timestamp) = ${date}
        AND status = 'completed'
    `;
    return result[0].total;
  }
}
```

---

## 4. Pre-Run Estimators

Every job entering the queue must pass through the Pre-Run Cost Estimator before being enqueued. If the estimate would breach any applicable budget, the job is rejected with a `BUDGET_EXCEEDED` error and the user is notified.

### 4.1 Estimator Architecture

```
Job Request
    │
    ▼
┌─────────────────────────┐
│  Pre-Run Estimator      │
│  ┌─────────────────┐    │
│  │ Token Estimator │    │
│  │ TTS Estimator   │    │
│  │ Video Estimator │    │
│  │ Image Estimator │    │
│  │ Batch Estimator │    │
│  └─────────────────┘    │
│   ▼                     │
│  Correction Factor Apply│
│   ▼                     │
│  Budget Gate Check      │
└─────────────────────────┘
    │                │
  PASS            REJECT
    │                │
  Enqueue      Return Error
```

### 4.2 Token Estimation (LLM Tasks)

```typescript
// packages/cost-governance/src/estimators/token.estimator.ts

interface TokenEstimateInput {
  systemPrompt: string;
  userPrompt: string;
  expectedOutputWords: number;    // Caller provides rough expected output length
  provider: string;
  model: string;
}

interface TokenEstimateResult {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Rough token-to-word ratios (calibrated per provider)
const TOKEN_WORD_RATIOS: Record<string, number> = {
  'openai':    1.33,  // ~750 words per 1000 tokens
  'anthropic': 1.30,
  'gemini':    1.35,
  'groq':      1.33,
  'default':   1.35,
};

export function estimateTokens(input: TokenEstimateInput): TokenEstimateResult {
  const ratio = TOKEN_WORD_RATIOS[input.provider] ?? TOKEN_WORD_RATIOS['default'];

  // Count approximate input tokens
  const systemWords  = wordCount(input.systemPrompt);
  const userWords    = wordCount(input.userPrompt);
  const tokensIn     = Math.ceil((systemWords + userWords) * ratio);

  // Estimate output tokens from expected word count
  const tokensOut    = Math.ceil(input.expectedOutputWords * ratio);

  // Look up model pricing
  const pricing      = getModelPricing(input.provider, input.model);
  const costIn       = (tokensIn  / 1000) * pricing.costPer1kInput;
  const costOut      = (tokensOut / 1000) * pricing.costPer1kOutput;

  // Apply historical correction factor
  const correctionFactor = getCorrectionFactor(input.provider, input.model, 'llm');
  const costUsd = (costIn + costOut) * correctionFactor;

  return {
    tokensIn,
    tokensOut,
    costUsd,
    confidence: correctionFactor > 0.95 && correctionFactor < 1.05 ? 'HIGH' : 'MEDIUM',
  };
}
```

**Word count function** — uses a simple whitespace split plus punctuation normalization. For multi-language prompts (EN/ES), character count is used instead with a language-specific ratio.

### 4.3 TTS Duration Estimation

```typescript
// packages/cost-governance/src/estimators/tts.estimator.ts

interface TtsEstimateInput {
  scriptText: string;
  language: 'en' | 'es' | 'pt' | 'fr';
  provider: string;         // 'elevenlabs', 'openai_tts', 'azure_tts'
  voiceStyle: string;       // 'narrative', 'energetic', 'calm'
}

// Average speaking rates (words per minute) by language and style
const SPEAKING_RATES: Record<string, Record<string, number>> = {
  en: { narrative: 140, energetic: 165, calm: 120, default: 145 },
  es: { narrative: 155, energetic: 175, calm: 130, default: 155 },
  pt: { narrative: 150, energetic: 170, calm: 125, default: 150 },
  fr: { narrative: 145, energetic: 160, calm: 115, default: 145 },
};

// TTS pricing structures
const TTS_PRICING: Record<string, { perChar?: number; perSecond?: number; per1kChars?: number }> = {
  elevenlabs:  { perChar: 0.000030 },        // $0.30 per 10k chars
  openai_tts:  { per1kChars: 0.015 },        // $0.015 per 1k chars
  azure_tts:   { perSecond: 0.000016 },      // $0.016 per 1000 seconds
};

export function estimateTtsCost(input: TtsEstimateInput): {
  durationSeconds: number;
  charCount: number;
  costUsd: number;
} {
  const words   = wordCount(input.scriptText);
  const chars   = input.scriptText.length;
  const wpm     = SPEAKING_RATES[input.language]?.[input.voiceStyle]
                  ?? SPEAKING_RATES[input.language]?.['default']
                  ?? 145;

  const durationMinutes = words / wpm;
  const durationSeconds = durationMinutes * 60;

  const pricing  = TTS_PRICING[input.provider];
  let rawCost    = 0;

  if (pricing.perChar)    rawCost = chars * pricing.perChar;
  if (pricing.per1kChars) rawCost = (chars / 1000) * pricing.per1kChars;
  if (pricing.perSecond)  rawCost = durationSeconds * pricing.perSecond;

  const correctionFactor = getCorrectionFactor(input.provider, 'tts', 'tts');
  const costUsd = rawCost * correctionFactor;

  return { durationSeconds, charCount: chars, costUsd };
}
```

**Script Word Count → Duration Table (Reference)**

| Words | Language | Est. Duration | ElevenLabs Cost | OpenAI TTS Cost |
|-------|----------|---------------|-----------------|-----------------|
| 500   | EN       | ~3.5 min      | ~$0.045         | ~$0.012         |
| 1000  | EN       | ~7 min        | ~$0.090         | ~$0.024         |
| 1500  | EN       | ~10.5 min     | ~$0.135         | ~$0.036         |
| 500   | ES       | ~3.2 min      | ~$0.045         | ~$0.012         |
| 1000  | ES       | ~6.5 min      | ~$0.090         | ~$0.024         |

### 4.4 Video Rendering Estimation

```typescript
// packages/cost-governance/src/estimators/video.estimator.ts

interface VideoEstimateInput {
  provider: 'runwayml' | 'pika' | 'kling' | 'remotion' | 'creatomate';
  sceneCount: number;
  sceneDurationSeconds: number;  // per scene
  resolution: '720p' | '1080p' | '4K';
  hasMotion: boolean;            // AI video generation vs static slideshow
  platform: 'youtube' | 'shorts' | 'tiktok' | 'reels';
}

const VIDEO_PRICING: Record<string, {
  perSecond?: number;
  perScene?: number;
  perRender?: number;
  resolutionMultiplier?: Record<string, number>;
}> = {
  runwayml:   { perSecond: 0.05, resolutionMultiplier: { '720p': 1.0, '1080p': 1.5, '4K': 2.5 } },
  pika:       { perSecond: 0.04, resolutionMultiplier: { '720p': 1.0, '1080p': 1.3, '4K': 2.0 } },
  kling:      { perSecond: 0.035 },
  remotion:   { perRender: 0.02 },     // Self-hosted compute estimation
  creatomate: { perRender: 0.10 },     // Template render
};

export function estimateVideoRenderCost(input: VideoEstimateInput): {
  totalDurationSeconds: number;
  costUsd: number;
} {
  const totalDuration = input.sceneCount * input.sceneDurationSeconds;
  const pricing       = VIDEO_PRICING[input.provider];
  const resMult       = pricing.resolutionMultiplier?.[input.resolution] ?? 1.0;
  const motionMult    = input.hasMotion ? 1.0 : 0.3; // Static renders are much cheaper

  let rawCost = 0;
  if (pricing.perSecond) rawCost = totalDuration * pricing.perSecond * resMult * motionMult;
  if (pricing.perScene)  rawCost = input.sceneCount * pricing.perScene * resMult;
  if (pricing.perRender) rawCost = pricing.perRender;

  const correctionFactor = getCorrectionFactor(input.provider, 'video', 'video_render');
  return { totalDurationSeconds: totalDuration, costUsd: rawCost * correctionFactor };
}
```

### 4.5 Batch Estimation

```typescript
// packages/cost-governance/src/estimators/batch.estimator.ts

interface BatchEstimateInput {
  itemCount: number;
  taskType: 'script_gen' | 'tts' | 'image_gen' | 'video_render' | 'full_video';
  tier: AiTier;
  channelId: string;
  avgWordsPerScript?: number;     // for script tasks
  avgSceneDuration?: number;      // for video tasks
  platform?: Platform;
}

export async function estimateBatchCost(input: BatchEstimateInput): Promise<{
  totalEstimatedUsd: number;
  perItemEstimatedUsd: number;
  breakdown: Record<string, number>;
  budgetFeasible: boolean;
  remainingBudget: number;
}> {
  // Get current channel budget state
  const budget         = await getBudget('channel', input.channelId);
  const currentSpend   = await getCurrentPeriodSpend(input.channelId);
  const remainingBudget = budget.amount_usd - currentSpend;

  // Get tier-appropriate routing
  const routing = await getRoutingPolicy(input.channelId, input.tier, input.taskType);

  // Per-item estimate based on task type
  let perItemCost = 0;
  const breakdown: Record<string, number> = {};

  if (input.taskType === 'full_video') {
    // A full video = script + TTS + images + assembly
    const scriptCost = estimateTokens({ /* ... */ }).costUsd;
    const ttsCost    = estimateTtsCost({ /* ... */ }).costUsd;
    const imageCost  = (input.avgSceneDuration ?? 8) / 5 * 0.04; // avg 5s per image, $0.04/image
    const assemblyCost = 0.10; // Remotion render base cost
    perItemCost = scriptCost + ttsCost + imageCost + assemblyCost;
    breakdown = { script: scriptCost, tts: ttsCost, images: imageCost, assembly: assemblyCost };
  }
  // ... other task types

  const totalEstimatedUsd = perItemCost * input.itemCount;

  return {
    totalEstimatedUsd,
    perItemEstimatedUsd: perItemCost,
    breakdown,
    budgetFeasible: totalEstimatedUsd <= remainingBudget,
    remainingBudget,
  };
}
```

---

## 5. Post-Run Reconciliation

### 5.1 Reconciliation Flow

After every provider call completes, a reconciliation record is written that compares the estimate with actuals. This feeds the correction factor learning system.

```
Provider Call Completes
        │
        ▼
   Parse Actual Usage
   (from provider response headers / usage object)
        │
        ▼
   Write Ledger Entry (actual)
        │
        ▼
   Compute Diff = actual_cost - estimated_cost
        │
        ▼
   Update Correction Factor
   (moving average per provider/model/task_type)
        │
        ▼
   Emit reconciliation event
   (for real-time dashboard update)
```

### 5.2 Correction Factor Learning

```typescript
// packages/cost-governance/src/reconciliation/correction-factor.service.ts

interface CorrectionRecord {
  provider: string;
  model: string;
  taskType: string;
  estimatedUsd: number;
  actualUsd: number;
  ratio: number;           // actual / estimated
  timestamp: Date;
}

const CORRECTION_WINDOW = 50; // Last N samples for moving average

export class CorrectionFactorService {
  /**
   * Returns the correction factor to apply to future estimates.
   * A factor of 1.12 means estimates have been running 12% low.
   */
  async getCorrectionFactor(
    provider: string,
    model: string,
    taskType: string
  ): Promise<number> {
    const samples = await db.correctionSample.findMany({
      where: { provider, model, taskType },
      orderBy: { timestamp: 'desc' },
      take: CORRECTION_WINDOW,
    });

    if (samples.length < 5) return 1.0; // Not enough data yet

    // Exponential moving average (recent samples weighted more heavily)
    const alpha  = 2 / (samples.length + 1);
    let ema      = samples[samples.length - 1].ratio;
    for (let i = samples.length - 2; i >= 0; i--) {
      ema = samples[i].ratio * alpha + ema * (1 - alpha);
    }

    // Clamp to prevent extreme corrections (0.5x to 2.0x)
    return Math.min(2.0, Math.max(0.5, ema));
  }

  async recordReconciliation(record: CorrectionRecord): Promise<void> {
    await db.correctionSample.create({ data: record });
    // Trim old samples beyond 2x the window
    await db.$executeRaw`
      DELETE FROM correction_samples
      WHERE id NOT IN (
        SELECT id FROM correction_samples
        WHERE provider = ${record.provider}
          AND model    = ${record.model}
          AND task_type = ${record.taskType}
        ORDER BY timestamp DESC
        LIMIT ${CORRECTION_WINDOW * 2}
      )
    `;
  }
}
```

### 5.3 Reconciliation Report Schema

```sql
CREATE TABLE reconciliation_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period          TEXT NOT NULL,           -- 'YYYY-MM'
  channel_id      UUID REFERENCES channels(id),
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  task_type       TEXT NOT NULL,
  total_estimated DECIMAL(10,4),
  total_actual    DECIMAL(10,4),
  diff_usd        DECIMAL(10,4),           -- actual - estimated
  diff_pct        FLOAT,                   -- (actual - estimated) / estimated
  sample_count    INTEGER,
  avg_correction  FLOAT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Budget Alerts

### 6.1 Alert Levels

| Level | Threshold | Action | Channels |
|-------|-----------|--------|----------|
| INFO | 50% spent | Dashboard indicator | UI only |
| SOFT WARN | 80% spent | Notification sent | Email + Slack |
| HARD WARN | 95% spent | Urgent notification | Email + Slack + SMS (optional) |
| HARD STOP | 100% spent | Block new jobs | All + in-app banner |

### 6.2 Alert Engine

```typescript
// packages/cost-governance/src/alerts/budget-alert.service.ts

type AlertLevel = 'INFO' | 'SOFT_WARN' | 'HARD_WARN' | 'HARD_STOP';

interface BudgetState {
  entityType: 'user' | 'channel' | 'provider';
  entityId: string;
  period: string;
  budgetUsd: number;
  spentUsd: number;
  utilization: number;   // 0.0 to 1.0+
  level: AlertLevel;
}

export class BudgetAlertService {
  private readonly thresholds = [
    { level: 'HARD_STOP' as AlertLevel,  at: 1.00 },
    { level: 'HARD_WARN' as AlertLevel,  at: 0.95 },
    { level: 'SOFT_WARN' as AlertLevel,  at: 0.80 },
    { level: 'INFO'      as AlertLevel,  at: 0.50 },
  ];

  async checkAndAlert(state: BudgetState): Promise<void> {
    const triggered = this.thresholds.find(t => state.utilization >= t.at);
    if (!triggered) return;

    // Deduplicate — don't re-alert for the same level in the same period
    const alreadyAlerted = await this.wasAlerted(state.entityId, state.period, triggered.level);
    if (alreadyAlerted) return;

    await this.recordAlert(state, triggered.level);
    await this.dispatchNotifications(state, triggered.level);
  }

  private async dispatchNotifications(state: BudgetState, level: AlertLevel): Promise<void> {
    const config = await this.getNotificationConfig(state.entityId);
    const message = this.buildAlertMessage(state, level);

    const dispatchers: Promise<void>[] = [];

    if (config.emailEnabled) {
      dispatchers.push(emailService.send({
        to:      config.emailAddress,
        subject: `[Faceless Viral OS] Budget Alert: ${level} — ${state.entityId}`,
        body:    message,
      }));
    }

    if (config.slackEnabled && config.slackWebhook) {
      dispatchers.push(slackService.postMessage({
        webhook: config.slackWebhook,
        text:    message,
        color:   level === 'HARD_STOP' ? 'danger' : level === 'HARD_WARN' ? 'warning' : 'good',
      }));
    }

    await Promise.allSettled(dispatchers); // Never let notification failure block governance
  }

  private buildAlertMessage(state: BudgetState, level: AlertLevel): string {
    const pct = (state.utilization * 100).toFixed(1);
    return [
      `Budget ${level} for ${state.entityType} [${state.entityId}]`,
      `Period: ${state.period}`,
      `Spent: $${state.spentUsd.toFixed(4)} of $${state.budgetUsd.toFixed(4)} (${pct}%)`,
      level === 'HARD_STOP' ? 'ACTION REQUIRED: All new jobs are blocked until next period.' : '',
    ].filter(Boolean).join('\n');
  }
}
```

### 6.3 Notification Config Schema

```typescript
interface NotificationConfig {
  entityId:     string;
  emailEnabled: boolean;
  emailAddress: string;
  slackEnabled: boolean;
  slackWebhook: string | null;
  smsEnabled:   boolean;        // Phase 2
  smsNumber:    string | null;  // Phase 2
  alertLevels:  AlertLevel[];   // Which levels trigger notifications
}
```

---

## 7. Hard-Stop Logic

### 7.1 BullMQ Middleware Gate

The hard-stop gate is implemented as a BullMQ job processor middleware that runs before any job handler. It is the last line of defense before actual provider calls are made.

```typescript
// packages/queue/src/middleware/budget-gate.middleware.ts

import { Job } from 'bullmq';
import { BudgetService } from '@fvos/cost-governance';

export async function budgetGateMiddleware(job: Job, next: () => Promise<void>): Promise<void> {
  const { channelId, userId, workflowId, taskType } = job.data;

  // Check all applicable budget scopes in parallel
  const [userCheck, channelCheck, providerCheck] = await Promise.all([
    budgetService.checkBudget('user',     userId,     getCurrentPeriod()),
    budgetService.checkBudget('channel',  channelId,  getCurrentPeriod()),
    budgetService.checkProviderDailyBudget(job.data.provider),
  ]);

  const hardStops = [userCheck, channelCheck, providerCheck].filter(c => c.isHardStop);

  if (hardStops.length > 0) {
    const reason = hardStops.map(c => c.reason).join('; ');
    logger.warn({ jobId: job.id, reason }, 'Job blocked by budget hard-stop');

    // Determine behavior: queue to next period or fail
    const config = await getBudgetConfig(channelId);

    if (config.carryQueue) {
      // Move job to next-period queue
      const delay = msUntilNextPeriodStart();
      await job.moveToDelayed(Date.now() + delay);
      logger.info({ jobId: job.id, delay }, 'Job delayed to next budget period');
    } else {
      // Fail the job cleanly
      throw new BudgetExceededError(reason);
    }

    return; // Do not call next()
  }

  // All checks passed — proceed
  await next();
}
```

### 7.2 Graceful Degradation Strategy

```
Budget Status Check
        │
  ┌─────┴──────┐
  │            │
PASS        BLOCKED
  │            │
 Run      carryQueue = true?
           ├── YES → Delay job to next period start
           │         Emit QUEUED_TO_NEXT_PERIOD event
           │         Return 202 Accepted to caller
           └── NO  → Fail job with BUDGET_EXCEEDED
                      Emit BUDGET_EXCEEDED event
                      Return 402 Payment Required to caller
```

### 7.3 Next Period Calculation

```typescript
export function msUntilNextPeriodStart(): number {
  const now      = new Date();
  const nextMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0);
  return nextMonth.getTime() - now.getTime();
}
```

---

## 8. Downgrade / Upgrade Automation

### 8.1 Tier Decision Algorithm

The automation engine evaluates each channel's ROI weekly and recommends (or automatically applies) tier changes.

```
WEEKLY_TIER_REVIEW_JOB (runs every Monday 00:00 UTC):
  For each active channel:
    1. Compute roi_score = (revenue_7d - cost_7d) / cost_7d
    2. Compute performance_trend = avg_views_7d / avg_views_prev_7d - 1
    3. Compute cost_efficiency = revenue_per_dollar_spent_7d

    4. DOWNGRADE conditions (any of):
       - roi_score < -0.20   (losing >20% of what we spend)
       - cost_7d > channel_budget * 0.90  (nearly over budget)
       - avg_views_7d < threshold[niche] AND roi_score < 0
       → Action: downgrade to next cheaper tier, log reason

    5. UPGRADE conditions (all of):
       - roi_score > 0.50    (returning >50% on spend)
       - performance_trend > 0.20  (views growing >20% WoW)
       - current_tier != ULTRA
       - headroom = channel_budget - cost_7d*4 > upgrade_cost_delta
       → Action: upgrade to next tier, log reason, notify operator

    6. HOLD conditions (default):
       - No significant signal
       → Keep current tier, log review
```

### 8.2 Pseudocode Implementation

```typescript
// packages/cost-governance/src/tier-automation/tier-review.job.ts

interface TierReviewResult {
  channelId:       string;
  currentTier:     AiTier;
  recommendedTier: AiTier;
  action:          'DOWNGRADE' | 'UPGRADE' | 'HOLD';
  reason:          string;
  autoApplied:     boolean;
}

const TIER_ORDER: AiTier[] = ['FREE', 'ECONOMICAL', 'OPTIMIZED', 'PREMIUM', 'ULTRA'];

export async function reviewChannelTier(channelId: string): Promise<TierReviewResult> {
  const [analytics, costData, budget, config] = await Promise.all([
    analyticsService.getChannelSummary(channelId, 7),   // last 7 days
    ledgerService.getChannelSpend(channelId, 7),
    budgetService.getBudget('channel', channelId),
    channelService.getTierConfig(channelId),
  ]);

  const currentTierIdx = TIER_ORDER.indexOf(config.tier);
  const roiScore       = (analytics.revenue7d - costData.total7d) / Math.max(costData.total7d, 0.01);
  const perfTrend      = analytics.avgViews7d / Math.max(analytics.avgViewsPrev7d, 1) - 1;
  const budgetUtil     = costData.total7d * 4 / budget.amount_usd; // 4-week projection

  // DOWNGRADE check
  const shouldDowngrade =
    roiScore < -0.20 ||
    budgetUtil > 0.90 ||
    (analytics.avgViews7d < config.viewThreshold && roiScore < 0);

  if (shouldDowngrade && currentTierIdx > 0) {
    const newTier = TIER_ORDER[currentTierIdx - 1];
    const result: TierReviewResult = {
      channelId,
      currentTier:     config.tier,
      recommendedTier: newTier,
      action:          'DOWNGRADE',
      reason:          `ROI=${(roiScore*100).toFixed(1)}%, budgetUtil=${(budgetUtil*100).toFixed(1)}%`,
      autoApplied:     config.autoTierManagement,
    };
    if (config.autoTierManagement) {
      await channelService.setTier(channelId, newTier);
    }
    return result;
  }

  // UPGRADE check
  const upgradeHeadroom = budget.amount_usd - costData.total7d * 4;
  const upgradeCostDelta = TIER_COST_DELTAS[config.tier] ?? 0;
  const shouldUpgrade =
    roiScore > 0.50 &&
    perfTrend > 0.20 &&
    currentTierIdx < TIER_ORDER.length - 1 &&
    upgradeHeadroom > upgradeCostDelta;

  if (shouldUpgrade) {
    const newTier = TIER_ORDER[currentTierIdx + 1];
    const result: TierReviewResult = {
      channelId,
      currentTier:     config.tier,
      recommendedTier: newTier,
      action:          'UPGRADE',
      reason:          `ROI=${(roiScore*100).toFixed(1)}%, trend=+${(perfTrend*100).toFixed(1)}%`,
      autoApplied:     config.autoTierManagement,
    };
    if (config.autoTierManagement) {
      await channelService.setTier(channelId, newTier);
    }
    return result;
  }

  return {
    channelId,
    currentTier:     config.tier,
    recommendedTier: config.tier,
    action:          'HOLD',
    reason:          'No significant signal',
    autoApplied:     false,
  };
}
```

### 8.3 Tier Cost Deltas (Approximate)

| From → To | Additional Monthly Cost | Break-Even Views Needed |
|-----------|------------------------|------------------------|
| FREE → ECONOMICAL | +$5–15 | 2,000 |
| ECONOMICAL → OPTIMIZED | +$15–40 | 8,000 |
| OPTIMIZED → PREMIUM | +$40–100 | 25,000 |
| PREMIUM → ULTRA | +$100–300 | 100,000 |

---

## 9. ROI and Margin Reporting

### 9.1 Revenue Inputs

Revenue is tracked from three sources:

| Source | Input Method | Latency |
|--------|-------------|---------|
| YouTube AdSense | Manual CSV import + API (Phase 2) | T+2 days |
| Affiliate links | Click tracking via redirect URL | Near real-time |
| Sponsorships | Manual entry | Immediate |
| TikTok Creator Fund | Manual import | T+7 days |

### 9.2 Cost Per Video

```typescript
interface VideoEconomics {
  videoId:           string;
  channelId:         string;
  publishedAt:       Date;
  
  // Costs (from ledger)
  scriptCostUsd:     number;    // LLM tokens for script generation
  ttsCostUsd:        number;    // Voice synthesis
  imageCostUsd:      number;    // Scene image generation
  renderCostUsd:     number;    // Video assembly
  totalCostUsd:      number;    // Sum of above
  
  // Revenue (from analytics + manual)
  adRevenueUsd:      number;    // Platform monetization
  affiliateUsd:      number;    // Tracked affiliate clicks
  otherRevenueUsd:   number;    // Sponsorships, etc.
  totalRevenueUsd:   number;    // Sum of above

  // Derived
  grossMarginUsd:    number;    // revenue - cost
  grossMarginPct:    number;    // margin / revenue
  roiMultiple:       number;    // revenue / cost
  paybackDays:       number;    // days until revenue covered cost
}
```

### 9.3 Margin Reporting Views

**Margin by Channel**

```sql
CREATE VIEW v_channel_margin AS
SELECT
  c.id                                     AS channel_id,
  c.handle,
  c.platform,
  TO_CHAR(le.timestamp, 'YYYY-MM')         AS period,
  SUM(le.cost_usd)                         AS total_cost_usd,
  COALESCE(SUM(ar.total_revenue_usd), 0)   AS total_revenue_usd,
  COALESCE(SUM(ar.total_revenue_usd), 0)
    - SUM(le.cost_usd)                     AS gross_margin_usd,
  CASE WHEN COALESCE(SUM(ar.total_revenue_usd), 0) > 0
    THEN (COALESCE(SUM(ar.total_revenue_usd), 0) - SUM(le.cost_usd))
         / SUM(ar.total_revenue_usd) * 100
    ELSE NULL
  END                                      AS gross_margin_pct
FROM channels c
JOIN ledger_entries le ON le.channel_id = c.id
LEFT JOIN analytics_snapshots ar ON ar.channel_id = c.id
  AND TO_CHAR(ar.captured_at, 'YYYY-MM') = TO_CHAR(le.timestamp, 'YYYY-MM')
WHERE le.status = 'completed'
GROUP BY c.id, c.handle, c.platform, TO_CHAR(le.timestamp, 'YYYY-MM');
```

**Margin by Tier**

```sql
CREATE VIEW v_tier_margin AS
SELECT
  le.tier,
  TO_CHAR(le.timestamp, 'YYYY-MM')       AS period,
  COUNT(DISTINCT le.channel_id)          AS channel_count,
  SUM(le.cost_usd)                       AS total_cost_usd,
  COALESCE(SUM(ar.total_revenue_usd), 0) AS total_revenue_usd,
  COALESCE(SUM(ar.total_revenue_usd), 0)
    - SUM(le.cost_usd)                   AS gross_margin_usd,
  AVG(le.cost_usd)                       AS avg_cost_per_entry
FROM ledger_entries le
LEFT JOIN analytics_snapshots ar ON ar.channel_id = le.channel_id
  AND DATE(ar.captured_at) = DATE(le.timestamp)
WHERE le.status = 'completed'
GROUP BY le.tier, TO_CHAR(le.timestamp, 'YYYY-MM');
```

**Margin by Content Series (Pillar)**

```sql
CREATE VIEW v_series_margin AS
SELECT
  cp.id                                    AS pillar_id,
  cp.name                                  AS series_name,
  cp.channel_id,
  COUNT(DISTINCT v.id)                     AS video_count,
  SUM(le.cost_usd)                         AS total_cost_usd,
  COALESCE(SUM(ars.revenue_usd), 0)        AS total_revenue_usd,
  COALESCE(SUM(ars.revenue_usd), 0)
    - SUM(le.cost_usd)                     AS gross_margin_usd,
  AVG(ars.views)                           AS avg_views,
  AVG(ars.avd)                             AS avg_retention_pct
FROM content_pillars cp
JOIN content_ideas ci ON ci.pillar_id = cp.id
JOIN scripts s ON s.idea_id = ci.id
JOIN videos v ON v.script_id = s.id
JOIN ledger_entries le ON le.channel_id = cp.channel_id
  AND le.metadata->>'video_id' = v.id::text
LEFT JOIN analytics_snapshots ars ON ars.video_id = v.id
WHERE le.status = 'completed'
GROUP BY cp.id, cp.name, cp.channel_id;
```

### 9.4 KPI Definitions

| KPI | Formula | Target |
|-----|---------|--------|
| Cost per Video | Total production cost / video count | < $0.50 (ECONOMICAL) |
| Revenue per Video | Total revenue / video count | > $2.00 (mature channel) |
| Gross Margin | (Revenue - Cost) / Revenue | > 60% |
| ROI Multiple | Revenue / Cost | > 3x |
| Cost per View | Total cost / total views | < $0.001 |
| Payback Period | Cost / daily revenue rate | < 14 days |

---

## 10. Implementation Checklist

### Phase 1 (MVP)

- [ ] `ledger_entries` table with indices
- [ ] `LedgerService.append()` with DLQ fallback
- [ ] Token estimator (OpenAI + Anthropic)
- [ ] TTS estimator (ElevenLabs)
- [ ] Budget entity tables (user, channel, provider)
- [ ] `BudgetAlertService` with email notifications
- [ ] `budgetGateMiddleware` for BullMQ
- [ ] Materialized views + 15-minute refresh job
- [ ] Weekly tier review job (manual apply)
- [ ] Cost per video dashboard query

### Phase 2 (SaaS)

- [ ] Workspace-scoped budgets
- [ ] Per-tenant billing integration (Stripe metered)
- [ ] Correction factor persistence + dashboard
- [ ] Automated tier management (autoApplied = true)
- [ ] Video render + image generation estimators
- [ ] Revenue import from YouTube Data API
- [ ] Affiliate click tracking pixel
- [ ] Slack + SMS alert channels
- [ ] ROI margin reports in API + dashboard
