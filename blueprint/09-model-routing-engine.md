# 09 — Model Routing Engine

**Faceless Viral OS | Founding Blueprint**
Version: 1.0 | Status: Engineering Reference

---

## Overview

The Model Routing Engine (MRE) is the central intelligence layer that sits between every AI task request in the system and the external provider APIs. No service calls a provider directly. Every AI call — whether from the API layer, a BullMQ worker, or the Autopilot Engine — flows through the MRE.

The MRE is responsible for:
1. Selecting the optimal provider and model for a given task based on tier, cost, quality, latency, and provider health
2. Building a ranked fallback chain for resilience
3. Enforcing tier constraints and budget limits
4. Attributing cost back to the originating request
5. Recording routing decisions for observability and quality improvement

---

## 1. Position in the Request Path

```
Incoming Task Request
(from: API handler | BullMQ worker | Autopilot engine)
        │
        ▼
┌─────────────────────────────────────────────────┐
│              Cost & Tier Engine                 │
│  - Reads active tier for channel/workflow       │
│  - Checks budget remaining                      │
│  - Applies tier overrides                       │
└────────────────────┬────────────────────────────┘
                     │ RoutingRequest { tier, task_type, ... }
                     ▼
┌─────────────────────────────────────────────────┐
│          Model Routing Engine (MRE)             │
│                                                 │
│  ┌─────────────┐   ┌──────────────────────────┐ │
│  │  Provider   │   │   Routing Policy Store   │ │
│  │  Registry   │   │   (per-tier, per-task)   │ │
│  └──────┬──────┘   └────────────┬─────────────┘ │
│         │                       │               │
│         ▼                       ▼               │
│  ┌────────────────────────────────────────────┐ │
│  │            Scoring & Selection             │ │
│  │  (health × cost × quality × latency ...)   │ │
│  └──────────────────────┬─────────────────────┘ │
│                         │ ProviderSelection      │
└─────────────────────────┼───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────┐
│             Provider Executor                   │
│  primary → (fallback[0]) → (fallback[1]) → err │
└─────────────────────────────────────────────────┘
                          │
                          ▼
              ProviderResponse + cost attribution
```

---

## 2. Provider Registry

All providers and their models are registered at application startup. The registry is stored in memory (with a Redis-backed health state overlay). New providers are added by implementing the `AIProvider` interface and calling `ProviderRegistry.register()`.

### Provider Registry Schema

```typescript
interface ProviderRegistration {
  providerId: string;                     // e.g., 'openai', 'anthropic', 'groq'
  displayName: string;
  models: ModelMetadata[];
  healthStatus: 'healthy' | 'degraded' | 'down';
  lastHealthCheck: Date;
  rateLimitState: RateLimitState;
}

interface ModelMetadata {
  modelId: string;                        // e.g., 'gpt-4o', 'claude-sonnet-4-5'
  supportedTasks: TaskType[];
  contextWindowTokens: number;
  maxOutputTokens: number;
  costPer1kInputTokens: number;           // USD
  costPer1kOutputTokens: number;          // USD
  qualityScores: Record<TaskType, number>;// 1–10 per task type
  latencyP50Ms: number;                   // median observed latency
  latencyP95Ms: number;
  tierMinimum: Tier;                      // minimum tier required to use this model
  capabilities: ModelCapability[];        // 'json-mode', 'function-calling', 'vision', 'streaming'
}
```

### Provider Registry Example (JSON)

```json
{
  "providers": [
    {
      "providerId": "openai",
      "displayName": "OpenAI",
      "healthStatus": "healthy",
      "models": [
        {
          "modelId": "gpt-4o",
          "supportedTasks": [
            "script-writing-long",
            "script-writing-short",
            "title-hook-generation",
            "translation",
            "niche-research",
            "trend-analysis",
            "analytics-summarization",
            "content-recommendations"
          ],
          "contextWindowTokens": 128000,
          "maxOutputTokens": 16384,
          "costPer1kInputTokens": 0.0025,
          "costPer1kOutputTokens": 0.0100,
          "qualityScores": {
            "script-writing-long": 9,
            "script-writing-short": 9,
            "title-hook-generation": 9,
            "translation": 8,
            "niche-research": 9,
            "analytics-summarization": 9
          },
          "latencyP50Ms": 2200,
          "latencyP95Ms": 5800,
          "tierMinimum": "PREMIUM",
          "capabilities": ["json-mode", "function-calling", "vision", "streaming"]
        },
        {
          "modelId": "gpt-4o-mini",
          "supportedTasks": [
            "script-writing-short",
            "title-hook-generation",
            "translation",
            "content-recommendations"
          ],
          "contextWindowTokens": 128000,
          "maxOutputTokens": 16384,
          "costPer1kInputTokens": 0.00015,
          "costPer1kOutputTokens": 0.00060,
          "qualityScores": {
            "script-writing-short": 7,
            "title-hook-generation": 7,
            "translation": 7
          },
          "latencyP50Ms": 800,
          "latencyP95Ms": 2200,
          "tierMinimum": "PREMIUM",
          "capabilities": ["json-mode", "function-calling", "streaming"]
        }
      ]
    },
    {
      "providerId": "anthropic",
      "displayName": "Anthropic",
      "healthStatus": "healthy",
      "models": [
        {
          "modelId": "claude-sonnet-4-5",
          "supportedTasks": [
            "script-writing-long",
            "script-writing-short",
            "title-hook-generation",
            "translation",
            "niche-research",
            "analytics-summarization",
            "content-recommendations"
          ],
          "contextWindowTokens": 200000,
          "maxOutputTokens": 8192,
          "costPer1kInputTokens": 0.0030,
          "costPer1kOutputTokens": 0.0150,
          "qualityScores": {
            "script-writing-long": 9,
            "script-writing-short": 8,
            "title-hook-generation": 8,
            "translation": 9,
            "analytics-summarization": 9
          },
          "latencyP50Ms": 2800,
          "latencyP95Ms": 7000,
          "tierMinimum": "PREMIUM",
          "capabilities": ["json-mode", "function-calling", "vision", "streaming"]
        },
        {
          "modelId": "claude-3-5-haiku-20241022",
          "supportedTasks": [
            "script-writing-long",
            "script-writing-short",
            "title-hook-generation",
            "translation",
            "niche-research",
            "analytics-summarization"
          ],
          "contextWindowTokens": 200000,
          "maxOutputTokens": 8192,
          "costPer1kInputTokens": 0.00080,
          "costPer1kOutputTokens": 0.00400,
          "qualityScores": {
            "script-writing-long": 7,
            "script-writing-short": 7,
            "title-hook-generation": 7,
            "translation": 8
          },
          "latencyP50Ms": 900,
          "latencyP95Ms": 2500,
          "tierMinimum": "OPTIMIZED",
          "capabilities": ["json-mode", "function-calling", "streaming"]
        }
      ]
    },
    {
      "providerId": "groq",
      "displayName": "Groq",
      "healthStatus": "healthy",
      "models": [
        {
          "modelId": "llama-3.1-70b-versatile",
          "supportedTasks": [
            "script-writing-long",
            "script-writing-short",
            "title-hook-generation",
            "translation",
            "niche-research",
            "analytics-summarization",
            "content-recommendations"
          ],
          "contextWindowTokens": 128000,
          "maxOutputTokens": 8000,
          "costPer1kInputTokens": 0.00059,
          "costPer1kOutputTokens": 0.00079,
          "qualityScores": {
            "script-writing-long": 6,
            "script-writing-short": 6,
            "title-hook-generation": 6,
            "translation": 6
          },
          "latencyP50Ms": 280,
          "latencyP95Ms": 700,
          "tierMinimum": "ECONOMICAL",
          "capabilities": ["json-mode", "streaming"]
        },
        {
          "modelId": "llama-3.1-8b-instant",
          "supportedTasks": [
            "script-writing-short",
            "title-hook-generation",
            "niche-research",
            "analytics-summarization"
          ],
          "contextWindowTokens": 128000,
          "maxOutputTokens": 8000,
          "costPer1kInputTokens": 0.00005,
          "costPer1kOutputTokens": 0.00008,
          "qualityScores": {
            "script-writing-short": 4,
            "title-hook-generation": 4,
            "niche-research": 4
          },
          "latencyP50Ms": 120,
          "latencyP95Ms": 350,
          "tierMinimum": "FREE",
          "capabilities": ["json-mode", "streaming"]
        }
      ]
    },
    {
      "providerId": "google",
      "displayName": "Google (Gemini)",
      "healthStatus": "healthy",
      "models": [
        {
          "modelId": "gemini-2.0-flash",
          "supportedTasks": [
            "script-writing-long",
            "script-writing-short",
            "title-hook-generation",
            "translation",
            "niche-research",
            "trend-analysis"
          ],
          "contextWindowTokens": 1000000,
          "maxOutputTokens": 8192,
          "costPer1kInputTokens": 0.00010,
          "costPer1kOutputTokens": 0.00040,
          "qualityScores": {
            "script-writing-long": 7,
            "translation": 8,
            "trend-analysis": 8
          },
          "latencyP50Ms": 1100,
          "latencyP95Ms": 3200,
          "tierMinimum": "OPTIMIZED",
          "capabilities": ["json-mode", "function-calling", "vision", "streaming"]
        }
      ]
    }
  ]
}
```

---

## 3. Routing Policy Schema

Routing policies are stored in the database and cached in Redis. Each policy defines which models to consider for a given tier + task combination, with weight adjustments.

```typescript
interface RoutingPolicy {
  policyId: string;
  tier: Tier;
  taskType: TaskType;
  candidateModels: ModelCandidate[];
  scoringWeights: ScoringWeights;
  hardConstraints: HardConstraint[];
  softConstraints: SoftConstraint[];
  fallbackBehavior: 'next-in-chain' | 'error' | 'queue-retry';
}

interface ModelCandidate {
  providerId: string;
  modelId: string;
  priority: number;             // 1 = primary, 2 = first fallback, etc.
  maxCostUsd?: number;          // reject if estimated cost exceeds this
  requiredCapabilities?: ModelCapability[];
}

interface ScoringWeights {
  quality: number;              // weight 0.0–1.0
  cost: number;
  latency: number;
  providerHealth: number;
  historicalSuccessRate: number;
}

interface HardConstraint {
  type: 'max-cost' | 'max-latency' | 'required-capability' | 'blocked-provider';
  value: string | number;
}
```

### Routing Policy Example (ECONOMICAL, script-writing-long)

```json
{
  "policyId": "pol_econ_script_long_v1",
  "tier": "ECONOMICAL",
  "taskType": "script-writing-long",
  "candidateModels": [
    {
      "providerId": "groq",
      "modelId": "llama-3.1-70b-versatile",
      "priority": 1,
      "maxCostUsd": 0.05
    },
    {
      "providerId": "google",
      "modelId": "gemini-2.0-flash",
      "priority": 2,
      "maxCostUsd": 0.08
    },
    {
      "providerId": "anthropic",
      "modelId": "claude-3-5-haiku-20241022",
      "priority": 3,
      "maxCostUsd": 0.15
    }
  ],
  "scoringWeights": {
    "quality": 0.25,
    "cost": 0.50,
    "latency": 0.15,
    "providerHealth": 0.07,
    "historicalSuccessRate": 0.03
  },
  "hardConstraints": [
    { "type": "max-cost", "value": 0.15 },
    { "type": "required-capability", "value": "json-mode" }
  ],
  "softConstraints": [],
  "fallbackBehavior": "next-in-chain"
}
```

---

## 4. Input Signals

The routing function receives the following signals as input:

| Signal | Type | Source | Description |
|---|---|---|---|
| `tier` | Tier enum | Cost & Tier Engine | Active tier for the request |
| `task_type` | TaskType enum | Request | Type of AI task to perform |
| `language` | string | Request | Target language (affects translation/localization model choice) |
| `platform` | Platform enum | Request | Target platform (YouTube / TikTok / Instagram) |
| `budget_remaining` | number (USD) | Budget Tracker (Redis) | Remaining budget for this period |
| `urgency` | 'low' \| 'normal' \| 'high' | Request | High urgency prefers lower latency models |
| `provider_health` | Record<string, HealthStatus> | Health Registry (Redis) | Current health of all providers |
| `historical_quality` | Record<string, number> | DB (analytics) | Past quality scores per provider for this operator |
| `estimated_input_tokens` | number | Pre-call estimate | Estimated token count for cost calculation |
| `content_type` | string | Request | 'hero' \| 'standard' \| 'bulk' — affects quality bias |
| `channel_policy` | ChannelPolicy | DB | Per-channel provider preferences or blocks |

---

## 5. Scoring Algorithm

Candidates are scored independently. The highest-scoring available candidate that passes all hard constraints is selected as primary. The next N candidates form the fallback chain.

### Composite Score Formula

```
score(candidate) =
  (qualityScore(candidate, task) / 10) * weights.quality
  + (1 - normalizedCost(candidate)) * weights.cost
  + (1 - normalizedLatency(candidate)) * weights.latency
  + (healthScore(candidate)) * weights.providerHealth
  + (historicalSuccessRate(candidate)) * weights.historicalSuccessRate
```

Where:
- `normalizedCost` = `estimatedCost / maxCostInCandidateSet` (0 = cheapest, 1 = most expensive)
- `normalizedLatency` = `p50Latency / maxLatencyInCandidateSet`
- `healthScore` = 1.0 if healthy, 0.5 if degraded, 0.0 if down
- `historicalSuccessRate` = rolling 7-day success rate for this operator × provider combination

### Urgency Modifier

When `urgency = 'high'`, the latency weight is boosted by 2x and cost weight is halved before scoring:

```typescript
if (request.urgency === 'high') {
  weights.latency *= 2;
  weights.cost *= 0.5;
  // re-normalize weights to sum to 1.0
}
```

### Content Type Modifier

When `content_type = 'hero'`, quality weight is boosted by 1.5x regardless of tier:

```typescript
if (request.contentType === 'hero') {
  weights.quality *= 1.5;
  // re-normalize
}
```

---

## 6. Routing Function (TypeScript Pseudocode)

```typescript
interface RoutingRequest {
  tier: Tier;
  taskType: TaskType;
  language: string;
  platform: Platform;
  budgetRemaining: number;
  urgency: 'low' | 'normal' | 'high';
  contentType: 'bulk' | 'standard' | 'hero';
  estimatedInputTokens: number;
  channelPolicy?: ChannelPolicy;
  workflowOverride?: Partial<RoutingPolicy>;
  operatorOverride?: { providerId: string; modelId: string };
}

interface ProviderSelection {
  primary: ResolvedModel;
  fallbacks: ResolvedModel[];
  estimatedCostUsd: number;
  policyId: string;
  scoringTrace: ScoringTrace[];   // for observability
}

interface ResolvedModel {
  providerId: string;
  modelId: string;
  score: number;
  estimatedCostUsd: number;
  estimatedLatencyMs: number;
}

async function selectProvider(request: RoutingRequest): Promise<ProviderSelection> {
  // 1. Operator hard override — bypass all logic
  if (request.operatorOverride) {
    const model = ProviderRegistry.get(
      request.operatorOverride.providerId,
      request.operatorOverride.modelId
    );
    if (!model || model.healthStatus === 'down') {
      throw new ProviderUnavailableError(request.operatorOverride.providerId);
    }
    return buildSingleSelection(model, request);
  }

  // 2. Load routing policy for this tier + task
  const policy = await PolicyStore.get(request.tier, request.taskType)
    ?? DefaultPolicies.get(request.tier, request.taskType);

  // 3. Apply workflow-level overrides (partial policy merge)
  const effectivePolicy = request.workflowOverride
    ? mergePolicy(policy, request.workflowOverride)
    : policy;

  // 4. Get candidate models from registry, filtered by health
  const candidates = effectivePolicy.candidateModels
    .map(c => ProviderRegistry.get(c.providerId, c.modelId))
    .filter(m => m !== null && m.healthStatus !== 'down');

  if (candidates.length === 0) {
    throw new NoProvidersAvailableError(request.taskType, request.tier);
  }

  // 5. Apply hard constraints — eliminate candidates that fail
  const estimatedCosts = await Promise.all(
    candidates.map(c => estimateCost(c, request.estimatedInputTokens))
  );

  const eligible = candidates.filter((c, i) => {
    for (const constraint of effectivePolicy.hardConstraints) {
      if (constraint.type === 'max-cost' && estimatedCosts[i] > constraint.value) {
        return false;
      }
      if (constraint.type === 'required-capability' &&
          !c.capabilities.includes(constraint.value as ModelCapability)) {
        return false;
      }
      if (constraint.type === 'blocked-provider' && c.providerId === constraint.value) {
        return false;
      }
    }
    // Budget check: estimated cost must be within remaining budget
    if (estimatedCosts[i] > request.budgetRemaining) {
      return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    // All candidates blocked — attempt budget-relaxed fallback with warning
    const budgetExhausted = candidates.every((c, i) => estimatedCosts[i] > request.budgetRemaining);
    if (budgetExhausted) {
      throw new BudgetExhaustedError(request.budgetRemaining);
    }
    throw new AllCandidatesFilteredError(request.taskType, request.tier);
  }

  // 6. Compute scoring weights (apply urgency + content type modifiers)
  const weights = computeWeights(effectivePolicy.scoringWeights, request);

  // 7. Load historical quality data
  const historicalRates = await QualityStore.getSuccessRates(
    eligible.map(c => c.providerId),
    request.channelPolicy?.channelId
  );

  // 8. Score each eligible candidate
  const scored: Array<{ model: ResolvedModel; score: number; trace: ScoringTrace }> =
    eligible.map((c, i) => {
      const maxCost = Math.max(...estimatedCosts);
      const maxLatency = Math.max(...eligible.map(m => m.latencyP50Ms));

      const qualityRaw = (c.qualityScores[request.taskType] ?? 5) / 10;
      const costRaw = 1 - (estimatedCosts[i] / (maxCost || 1));
      const latencyRaw = 1 - (c.latencyP50Ms / (maxLatency || 1));
      const healthRaw = c.healthStatus === 'healthy' ? 1.0 : 0.5;
      const histRaw = historicalRates[c.providerId] ?? 0.95;

      const score =
        qualityRaw * weights.quality +
        costRaw * weights.cost +
        latencyRaw * weights.latency +
        healthRaw * weights.providerHealth +
        histRaw * weights.historicalSuccessRate;

      return {
        model: {
          providerId: c.providerId,
          modelId: c.modelId,
          score,
          estimatedCostUsd: estimatedCosts[i],
          estimatedLatencyMs: c.latencyP50Ms,
        },
        score,
        trace: { qualityRaw, costRaw, latencyRaw, healthRaw, histRaw, weights },
      };
    });

  // 9. Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // 10. Apply channel policy provider preferences (soft boost)
  if (request.channelPolicy?.preferredProviders) {
    applyPreferenceSoftBoost(scored, request.channelPolicy.preferredProviders);
    scored.sort((a, b) => b.score - a.score);
  }

  // 11. Return primary + fallback chain
  return {
    primary: scored[0].model,
    fallbacks: scored.slice(1).map(s => s.model),
    estimatedCostUsd: scored[0].model.estimatedCostUsd,
    policyId: effectivePolicy.policyId,
    scoringTrace: scored.map(s => s.trace),
  };
}
```

---

## 7. Fallback Chain Example — Script Writing

```
Task: script-writing-long | Tier: PREMIUM

Primary:
  └─ Anthropic / Claude Sonnet 4.5
        ├─ Attempt 1: Success → done
        ├─ Attempt 1: Timeout (>30s) → promote fallback[0]
        └─ Attempt 1: 429 Rate Limit → promote fallback[0]

Fallback[0]:
  └─ OpenAI / GPT-4o
        ├─ Attempt 1: Success → done
        ├─ Attempt 1: 503 Service Down → promote fallback[1]
        └─ Attempt 1: Context limit exceeded → promote fallback[1]

Fallback[1]:
  └─ Groq / Llama 3.1 70B
        ├─ Attempt 1: Success → done (with quality warning logged)
        └─ Attempt 1: Any error → promote fallback[2]

Fallback[2] (implicit, tier-floor model):
  └─ Google / Gemini 2.0 Flash
        ├─ Attempt 1: Success → done (with quality + tier mismatch warning)
        └─ Attempt 1: Any error → throw ProviderChainExhaustedError

On ProviderChainExhaustedError:
  - Log structured error to OTEL with all attempt details
  - Mark job as FAILED in BullMQ (will retry per queue retry policy)
  - Send alert if this is the 3rd chain exhaustion in 15min
  - Return 503 to caller with Retry-After header
```

---

## 8. Override Mechanisms

### Override Priority (highest to lowest)

```
1. Operator hard override (request.operatorOverride) — bypasses all routing
2. Workflow-level override (request.workflowOverride) — partially overrides policy
3. Channel policy (request.channelPolicy) — soft preferences + blocked providers
4. Tier routing policy (from PolicyStore) — base rules
5. Default policy (hardcoded fallback) — used if no policy exists in DB
```

### Channel Policy Schema

```typescript
interface ChannelPolicy {
  channelId: string;
  blockedProviders: string[];            // never use these
  preferredProviders: string[];          // apply soft score boost
  taskOverrides: Record<TaskType, {      // override model for specific task
    providerId: string;
    modelId: string;
  }>;
  maxCostPerTaskUsd: Record<TaskType, number>;
}
```

---

## 9. Failure Handling

### Primary Provider Down

When a provider's health status is `'down'` in the health registry:
- All models from that provider are excluded from candidate set before scoring
- The exclusion is logged as a routing decision reason in the scoring trace
- Health is checked every 60 seconds via a system-queue job (`provider-health-check`)
- Health state is stored in Redis with TTL — if the health check job fails, state expires and provider is treated as `'degraded'`

```typescript
// Health check job (runs every 60s per provider)
async function checkProviderHealth(providerId: string): Promise<void> {
  const provider = ProviderRegistry.getProvider(providerId);
  const result = await provider.healthCheck();           // lightweight ping/probe call
  await Redis.setex(
    `provider:health:${providerId}`,
    120,                                                  // 2-minute TTL
    result.status                                         // 'healthy' | 'degraded' | 'down'
  );
}
```

### Rate Limit Handling

When a provider returns HTTP 429:
1. Mark provider as `'degraded'` in Redis (TTL: duration from `Retry-After` header, default 60s)
2. Immediately promote the next fallback — do not retry the rate-limited provider in this request
3. Record rate limit event in `provider_rate_limit_events` table
4. If rate limits from this provider exceed 5 events in 10 minutes, mark as `'down'` temporarily and alert

```typescript
function handleRateLimit(providerId: string, retryAfterSeconds: number): void {
  const ttl = retryAfterSeconds || 60;
  Redis.setex(`provider:health:${providerId}`, ttl, 'degraded');
  RateLimitEventStore.record(providerId, Date.now());

  const recentCount = RateLimitEventStore.countInWindow(providerId, 10 * 60 * 1000);
  if (recentCount >= 5) {
    Redis.setex(`provider:health:${providerId}`, 300, 'down');
    AlertService.send(`Provider ${providerId} rate limited 5+ times in 10 min → marked down`);
  }
}
```

### Timeout Handling

Each provider call is wrapped in a timeout governed by the model's `latencyP95Ms` + a buffer:

```typescript
const timeoutMs = model.latencyP95Ms * 1.5;              // 50% buffer over P95
const result = await Promise.race([
  provider.generate(request),
  timeout(timeoutMs).then(() => { throw new ProviderTimeoutError(providerId, timeoutMs); })
]);
```

On timeout:
1. Log timeout event with duration and provider ID
2. Increment timeout counter in Redis for this provider
3. If timeouts > 3 in 5 minutes, mark provider as `'degraded'`
4. Promote next fallback immediately

### Cost Overrun Handling

Before executing any provider call, the MRE checks the estimated cost against the remaining budget:

```typescript
const estimatedCost = await estimateCost(model, request.estimatedInputTokens);

if (estimatedCost > request.budgetRemaining) {
  // Try next candidate with lower cost
  // If no candidate fits within budget → throw BudgetExhaustedError
  throw new BudgetExhaustedError({
    requested: estimatedCost,
    remaining: request.budgetRemaining,
    tier: request.tier,
  });
}
```

On `BudgetExhaustedError`:
- The Cost & Tier Engine catches this and marks the channel as budget-exhausted for the day
- Subsequent requests are rejected with HTTP 402 until budget resets (midnight UTC)
- An alert is sent to the operator if budget exhaustion occurs before 6pm UTC (early exhaustion signal)
- If `auto_downgrade_on_budget` is enabled for the channel, the tier is temporarily downgraded to access lower-cost models

### Actual Cost Attribution

After a successful provider call, actual token counts are used (not estimates) for cost attribution:

```typescript
async function attributeCost(
  selection: ProviderSelection,
  response: ProviderResponse
): Promise<void> {
  const actualCost =
    (response.inputTokens / 1000) * selection.primary.model.costPer1kInputTokens +
    (response.outputTokens / 1000) * selection.primary.model.costPer1kOutputTokens;

  // Write to DB for audit trail
  await SpendRecordStore.create({
    providerId: selection.primary.providerId,
    modelId: selection.primary.modelId,
    taskType: response.taskType,
    channelId: response.channelId,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    costUsd: actualCost,
    policyId: selection.policyId,
    traceId: response.traceId,
  });

  // Update Redis budget counter (fast path)
  await Redis.incrbyfloat(`budget:used:${response.channelId}:${todayKey()}`, actualCost);
}
```

---

## 10. Observability Integration

Every routing decision emits an OTEL span:

```
Span: model_routing.select_provider
  attributes:
    routing.tier: "PREMIUM"
    routing.task_type: "script-writing-long"
    routing.primary_provider: "anthropic"
    routing.primary_model: "claude-sonnet-4-5"
    routing.fallback_count: 2
    routing.policy_id: "pol_prem_script_long_v1"
    routing.estimated_cost_usd: 0.35
    routing.urgency: "normal"
    routing.provider_health.anthropic: "healthy"
    routing.provider_health.openai: "healthy"
    routing.score.anthropic_sonnet: 0.842
    routing.score.openai_gpt4o: 0.791
```

This enables Grafana dashboards showing:
- Which providers are being selected most often (cost allocation analysis)
- Fallback promotion rate per provider (reliability metric)
- Average routing latency (overhead tracking)
- Score distribution across tiers (routing quality)

---

*This document is part of the Faceless Viral OS founding blueprint series. Cross-reference: `06-system-architecture.md`, `07-core-modules.md`, `08-tier-system.md`.*
