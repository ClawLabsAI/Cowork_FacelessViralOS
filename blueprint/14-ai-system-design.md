# 14 — AI System Design: Agent Definitions

**Faceless Viral OS | Blueprint Series**
Version: 1.0 | Status: Engineering-Ready | Phase: 1 + 2

---

## Table of Contents

1. [Agent Architecture Overview](#1-agent-architecture-overview)
2. [Agent Registry](#2-agent-registry)
3. [Agent Definitions](#3-agent-definitions)
   - [Agent 1: Trend Agent](#agent-1-trend-agent)
   - [Agent 2: Niche Agent](#agent-2-niche-agent)
   - [Agent 3: Strategy Agent](#agent-3-strategy-agent)
   - [Agent 4: Competitor Intelligence Agent](#agent-4-competitor-intelligence-agent)
   - [Agent 5: Idea Agent](#agent-5-idea-agent)
   - [Agent 6: Script Agent](#agent-6-script-agent)
   - [Agent 7: Localization Agent](#agent-7-localization-agent)
   - [Agent 8: Visual Agent](#agent-8-visual-agent)
   - [Agent 9: Voice Agent](#agent-9-voice-agent)
   - [Agent 10: Video Assembly Agent](#agent-10-video-assembly-agent)
   - [Agent 11: Publishing Agent](#agent-11-publishing-agent)
   - [Agent 12: Analytics Agent](#agent-12-analytics-agent)
   - [Agent 13: Optimization Agent](#agent-13-optimization-agent)
   - [Agent 14: Cost Control Agent](#agent-14-cost-control-agent)
   - [Agent 15: Routing Agent](#agent-15-routing-agent)
4. [Shared Infrastructure](#4-shared-infrastructure)
5. [Agent Interaction Map](#5-agent-interaction-map)

---

## 1. Agent Architecture Overview

### Design Principles

All 15 agents share a common execution model built on top of the Faceless Viral OS agent runtime:

```
┌──────────────────────────────────────────────────────────┐
│                   Agent Runtime                           │
│                                                           │
│  Input Validation → Context Assembly → LLM Call          │
│       → Output Validation → Tool Execution               │
│       → Memory Write → Ledger Write → Output             │
└──────────────────────────────────────────────────────────┘
```

**Every agent:**
1. Receives a typed input object
2. Assembles context from DB + memory
3. Makes one or more LLM calls (via Routing Agent for model selection)
4. Validates output with a Zod schema
5. Executes tool calls if needed (DB reads, API calls, web search)
6. Writes to memory (ephemeral or persistent)
7. Writes cost to ledger
8. Returns a typed output object

### Agent Base Class

```typescript
// packages/agents/src/base/agent.base.ts

export abstract class BaseAgent<TInput, TOutput> {
  abstract name: string;
  abstract taskType: TaskType;

  abstract buildSystemPrompt(input: TInput, context: AgentContext): string;
  abstract buildUserPrompt(input: TInput, context: AgentContext): string;
  abstract validateOutput(raw: string): TOutput;
  abstract getTools(): Tool[];

  async run(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>> {
    const start = Date.now();

    // 1. Pre-run budget estimate
    const estimate = await costEstimator.estimate({
      taskType:  this.taskType,
      provider:  context.routing.provider,
      model:     context.routing.model,
      input:     this.buildUserPrompt(input, context),
    });
    await budgetGate.check(context.channelId, estimate);

    // 2. LLM call
    const systemPrompt = this.buildSystemPrompt(input, context);
    const userPrompt   = this.buildUserPrompt(input, context);
    const rawOutput    = await llmClient.complete({
      provider: context.routing.provider,
      model:    context.routing.model,
      system:   systemPrompt,
      user:     userPrompt,
      tools:    this.getTools(),
    });

    // 3. Validate output
    const output = this.validateOutput(rawOutput.content);

    // 4. Write ledger entry
    await ledger.append({
      channelId:    context.channelId,
      workflowId:   context.workflowId,
      provider:     rawOutput.provider,
      model:        rawOutput.model,
      taskType:     this.taskType,
      tokensIn:     rawOutput.usage.promptTokens,
      tokensOut:    rawOutput.usage.completionTokens,
      costUsd:      rawOutput.cost,
      estimatedUsd: estimate.costUsd,
      tier:         context.tier,
    });

    return {
      output,
      tokensIn:     rawOutput.usage.promptTokens,
      tokensOut:    rawOutput.usage.completionTokens,
      costUsd:      rawOutput.cost,
      latencyMs:    Date.now() - start,
    };
  }
}
```

### Retry Policy

All agents use exponential backoff:
- Attempt 1: immediate
- Attempt 2: 2s delay
- Attempt 3: 8s delay
- After 3 failures: mark job FAILED; emit `agent_failed` event

### Timeout Policy

| Agent | Timeout |
|-------|---------|
| Trend, Niche, Strategy, Idea, Script | 60s |
| Competitor Intelligence | 120s (web scraping) |
| Localization | 60s |
| Visual | 30s per image |
| Voice | 120s per TTS segment |
| Video Assembly | 1800s (30 min) |
| Publishing | 300s per upload |
| Analytics, Cost Control, Routing | 30s |
| Optimization | 45s |

---

## 2. Agent Registry

| # | Agent | Task Type | Primary Model (OPTIMIZED) | Memory | Phase |
|---|-------|-----------|--------------------------|--------|-------|
| 1 | Trend Agent | `trend_analysis` | Groq Llama3-70b | Ephemeral | 1 |
| 2 | Niche Agent | `niche_scoring` | GPT-4o-mini | Persistent | 1 |
| 3 | Strategy Agent | `strategy_gen` | GPT-4o | Persistent | 1 |
| 4 | Competitor Intel | `competitor_analysis` | Claude 3.5 Sonnet | Persistent | 1 |
| 5 | Idea Agent | `idea_gen` | GPT-4o | Ephemeral + DB | 1 |
| 6 | Script Agent | `script_gen` | GPT-4o | Ephemeral + DB | 1 |
| 7 | Localization Agent | `localization` | GPT-4o | Ephemeral | 1 |
| 8 | Visual Agent | `image_prompt_gen` | GPT-4o-mini | Ephemeral | 1 |
| 9 | Voice Agent | `tts_orchestration` | (no LLM — orchestrator) | Ephemeral | 1 |
| 10 | Video Assembly Agent | `video_assembly` | (no LLM — orchestrator) | Ephemeral | 1 |
| 11 | Publishing Agent | `publish_metadata_gen` | GPT-4o-mini | Ephemeral | 1 |
| 12 | Analytics Agent | `analytics_synthesis` | GPT-4o-mini | Persistent | 1 |
| 13 | Optimization Agent | `optimization` | GPT-4o | Persistent | 1 |
| 14 | Cost Control Agent | `cost_governance` | GPT-4o-mini | Persistent | 1 |
| 15 | Routing Agent | `routing` | (rule-based + lightweight LLM) | Persistent | 1 |

---

## 3. Agent Definitions

---

### Agent 1: Trend Agent

**Mission:** Monitor platforms and web for emerging topics in tracked niches and surface actionable trend signals before competitors can act on them.

#### Inputs

```typescript
interface TrendAgentInput {
  niches:       string[];        // Niche names to scan
  platforms:    Platform[];      // YOUTUBE, TIKTOK, INSTAGRAM, GOOGLE
  languages:    string[];        // ['en', 'es']
  lookbackDays: number;          // Default: 7
  minSearchVolume: number;       // Default: 5000/month
}
```

#### Outputs

```typescript
interface TrendAgentOutput {
  trends: {
    keyword:      string;
    niche:        string;
    platform:     Platform;
    searchVolume: number;
    growthRate:   number;          // % change vs prior period
    urgency:      'HIGH' | 'MEDIUM' | 'LOW';
    suggestedAngles: string[];     // 3 content angles for this trend
  }[];
  emergingTopics: string[];        // New topics not yet in niches DB
  trendSummary:   string;          // 2–3 sentence executive summary
}
```

#### Tools Available

- `searchGoogleTrends(keyword, timeframe)` → Google Trends Pytrends API
- `searchYouTubeTrending(category, region)` → YouTube Data API v3
- `searchTikTokTrending(hashtag)` → TikTok Research API / Apify scraper
- `queryVectorDB(embedding, niche)` → semantic search against historical trend records
- `readDB(table: 'trends', filters)` → fetch recent trend records to avoid duplicates

#### Memory Strategy

- **Ephemeral:** Trend analysis context (assembled for this run only)
- **Persistent (DB):** All `trends` records written to DB for historical comparison
- **What's stored:** keyword, search_volume, growth_rate, platform, captured_at, suggested angles

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Trend freshness | All keywords < 48h old |
| Growth rate accuracy | ±15% vs actual (reconciled monthly) |
| Emerging topic recall | ≥ 80% of trends verified by human review |
| False positive rate | < 20% (trends that didn't materialize) |
| Urgency classification accuracy | ≥ 85% |

#### Failure Handling

- Google Trends API rate-limited → use cached data (last 48h); flag as STALE
- TikTok API unavailable → use Apify scraper fallback; log provider switch
- LLM timeout on angle generation → return trends without angles; angles generated on-demand
- All trend sources fail → return empty array; emit `trend_fetch_failed` event; alert operator

#### System Prompt Excerpt

```
You are the Trend Agent for Faceless Viral OS, a faceless content intelligence system.
Your job is to identify emerging, high-opportunity topics in the niches provided that
are trending RIGHT NOW and have not yet been saturated by competitor channels.

For each trend keyword provided, you must:
1. Assess urgency based on growth rate and time-to-saturation
2. Generate 3 concrete content angles that would perform well for a faceless channel
3. Flag any topic that shows signs of already being over-covered

Your output must be a valid JSON object matching the TrendAgentOutput schema.
Prioritize: recency, uniqueness, and monetization potential.
Do NOT suggest evergreen topics — this agent is specifically for time-sensitive trends.
Language output: match the language of the input niche.
```

---

### Agent 2: Niche Agent

**Mission:** Evaluate the viability and competitive landscape of a potential niche to produce a data-backed opportunity score that guides channel creation decisions.

#### Inputs

```typescript
interface NicheAgentInput {
  nicheName:      string;
  platform:       Platform;
  language:       string;
  trendData:      TrendData[];    // From Trend Agent
  competitorData: CompetitorSummary[]; // From search/scrape
  revenueSignals: RevenueSignal[];     // CPC, affiliate programs
}
```

#### Outputs

```typescript
interface NicheAgentOutput {
  nicheName:          string;
  opportunityScore:   number;       // 0.0 – 10.0
  competitionScore:   number;       // 0.0 – 1.0 (higher = more competition)
  revenuePotential:   RevenuePotential;
  trendScore:         number;       // 0.0 – 1.0
  reasoning:          string;       // 2–3 sentence explanation
  risks:              string[];     // Top 3 risks
  opportunities:      string[];     // Top 3 opportunities
  recommendedTier:    AiTier;       // Recommended starting tier
  estimatedMonthsToBreakeven: number;
}
```

#### Tools Available

- `searchAffiliatePrograms(niche)` → Scrape ClickBank, Amazon, Digistore24 for affiliate programs
- `estimateCPC(keyword)` → Google Ads Keyword Planner API
- `readDB(table: 'niches', 'competitor_channels')` → historical niche data
- `webSearch(query)` → general web search for market signals

#### Memory Strategy

- **Persistent:** `niches` DB record updated after each evaluation
- **Stored:** competition_score, revenue_potential, trend_score, risks, opportunities, last_analyzed_at
- **NOT stored:** full reasoning chain (only final scores)

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Score calibration | Correlation ≥ 0.70 between opportunity_score and channel 90-day performance |
| Reasoning quality | No hallucinated competitors or metrics |
| Revenue potential accuracy | ±1 tier vs actual (assessed at 6 months) |
| Break-even estimate | Within 50% of actual |

#### Failure Handling

- Insufficient data for scoring → produce score with LOW confidence flag; list what data is missing
- Affiliate scrape fails → mark affiliate_availability as UNKNOWN; reduce score weight for that component
- All competitor data unavailable → still score with available trend + revenue data; note low confidence

#### System Prompt Excerpt

```
You are the Niche Agent for Faceless Viral OS. You evaluate whether a niche is
worth building a faceless YouTube/TikTok/Instagram channel in.

You will receive trend data, competitor channel summaries, and revenue signals.
Your goal is to produce a structured viability assessment.

Key scoring factors:
- Revenue potential: Are there affiliate programs? High CPC? Sponsor demand?
- Competition: Are the top channels large and established, or are they small and beatable?
- Trend momentum: Is interest growing, stable, or declining?
- Content angle availability: Are there content gaps competitors haven't addressed?

Be skeptical. Do not inflate scores. A niche that looks exciting but has
$0.12 CPC and no affiliate programs should score LOW on revenue potential
regardless of trend strength.

Output: valid JSON matching NicheAgentOutput schema.
```

---

### Agent 3: Strategy Agent

**Mission:** Transform niche research and competitor intelligence into a structured, actionable channel strategy brief that serves as the creative and operational constitution for the channel.

#### Inputs

```typescript
interface StrategyAgentInput {
  niche:          NicheRecord;
  topCompetitors: ChannelInsight[];   // Top 3–5 analyzed competitors
  platform:       Platform;
  language:       string;
  channelConfig:  ChannelConfig;      // Tier, budget, audience target
  existingBrief?: string;             // Previous brief (for updates)
}
```

#### Outputs

```typescript
interface StrategyAgentOutput {
  brief: {
    executiveSummary:  string;
    audiencePersona:   AudiencePersona;
    uniquePositioning: string;        // 1 paragraph differentiation statement
    contentPillars:    ContentPillar[];
    hookFormulas:      string[];      // 8–12 tested hook templates
    formatStrategy:    FormatStrategy;
    postingSchedule:   PostingSchedule;
    monetizationStrategy: MonetizationStrategy;
    milestones:        Milestone[];   // 30 / 60 / 90 day targets
  };
  suggestedChannelName: string[];     // 3 candidates
  suggestedTone:        string;
}
```

#### Tools Available

- `readDB(table: 'niches', 'channel_insights', 'trends')` → context assembly
- `readDB(table: 'analytics_snapshots')` → existing performance data (for brief updates)
- `webSearch(query)` → research audience forums, Reddit, YouTube comments for pain points

#### Memory Strategy

- **Persistent:** Full brief stored in `channels.metadata.strategy_brief`
- **Versioned:** Each brief update stores previous version in `channels.metadata.strategy_brief_history`
- **Used in:** Every subsequent agent that needs channel context (Idea, Script, Visual)

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Hook formula quality | ≥ 3 of 8 hooks should produce CTR > channel average when used |
| Pillar relevance | 100% of pillars traceable to niche research data |
| Positioning uniqueness | Must differ from top competitor on ≥ 2 dimensions |
| Milestone realism | 90-day sub target within 30% of actual (assessed at 90 days) |

#### Failure Handling

- Insufficient competitor data → generate brief with "research pending" sections; flag for completion
- Existing brief present → diff against new data; only update sections where inputs changed
- LLM refuses to generate positioning (safety block) → fallback to template-based positioning

#### System Prompt Excerpt

```
You are the Strategy Agent for Faceless Viral OS. You build channel strategy briefs
for faceless content channels — channels run entirely with AI-generated content,
no human presenter, no personal brand.

A good strategy brief is:
1. Specific — not "make educational videos" but "15-second hooks leading into
   numbered listicles about AI tools, targeting 25–40 year old online entrepreneurs"
2. Differentiated — explicitly explains why viewers will choose THIS channel over
   the 3 biggest competitors
3. Monetizable — every pillar has a clear path to revenue (AdSense, affiliate, or sponsor)
4. Executable — a new channel can start following this brief tomorrow

Do not produce generic advice. Every recommendation must be grounded in the
competitor data and trend signals provided.

Output: valid JSON matching StrategyAgentOutput schema.
```

---

### Agent 4: Competitor Intelligence Agent

**Mission:** Analyze a competitor channel's content library to extract the specific formulas, hooks, and formats driving their performance — delivering intelligence that can be systematically applied to our channels.

#### Inputs

```typescript
interface CompetitorIntelligenceInput {
  competitorChannelId: string;
  platform:            Platform;
  videoCatalog:        VideoMetadata[];    // Top N videos with titles, descriptions, tags
  transcriptSamples:   TranscriptSample[]; // First 60s of top 5 videos (optional)
  depth:               'SURFACE' | 'DEEP';
}
```

#### Outputs

```typescript
interface CompetitorIntelligenceOutput {
  channelInsight: {
    hookPatterns:         string[];  // Formulaic hook templates
    pacing:               string;
    format:               ContentFormat;
    avgDuration:          number;    // seconds
    thumbnailStyle:       string;
    ctaPatterns:          string[];
    topPerformingTopics:  string[];
    contentCalendarPattern: string;  // e.g., "1 listicle + 1 tutorial per week"
    estimatedRPM:         number;    // Revenue Per Mille estimate
    weaknesses:           string[];  // Content gaps we can exploit
    strengths:            string[];  // What they do well (to match or exceed)
  };
  opportunityGaps: {
    topic:       string;
    rationale:   string;
    difficulty:  'LOW' | 'MEDIUM' | 'HIGH';
  }[];
}
```

#### Tools Available

- `fetchYouTubeTranscript(videoId)` → YouTube Caption API
- `whisperTranscribe(audioUrl)` → OpenAI Whisper for non-captioned videos
- `readDB(table: 'competitor_channels', 'channel_insights')` → prior analysis for comparison
- `webSearch(channelHandle + 'review OR criticism OR why I watch')` → audience sentiment

#### Memory Strategy

- **Persistent:** `channel_insights` DB record; updated on each re-analysis
- **Delta tracking:** New analysis compared to previous; changes flagged as "new insight"
- **Hook library:** All extracted hook patterns stored in a shared `hook_library` table (Phase 2)

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Hook pattern accuracy | Patterns should match actual video hooks with ≥ 90% fidelity |
| Opportunity gap validity | ≥ 50% of gaps verified as uncovered by competitor after 30 days |
| Format classification | ≥ 95% of format labels match human review |
| No hallucinated stats | Zero fabricated view counts or subscriber numbers |

#### Failure Handling

- Transcript unavailable → analyze titles + descriptions only; flag as SURFACE analysis
- Video catalog < 5 videos → mark analysis as LOW_CONFIDENCE; recommend re-analysis after 30 days
- Whisper fails → skip transcript; complete with available metadata

#### System Prompt Excerpt

```
You are the Competitor Intelligence Agent for Faceless Viral OS. Your job is to
reverse-engineer what makes a competitor YouTube/TikTok channel successful.

You are given their top videos' titles, descriptions, tags, and optional transcripts.
Extract the FORMULAS — not just observations. A formula is a repeatable template,
not a description of one video.

Bad output: "They make videos about AI tools"
Good output: "Hook formula: 'I tested [NUMBER] [CATEGORY] AI tools so you don't have to —
here's what [AUTHORITY FIGURE] doesn't want you to know about #[NUMBER]'"

For each insight, ask: can this be used as a template for our channel?
If yes, extract the template. If no, note the observation but don't call it a formula.

Flag their content gaps — topics in the niche that are trending but they haven't covered.
These are our opportunities.

Output: valid JSON matching CompetitorIntelligenceOutput schema.
```

---

### Agent 5: Idea Agent

**Mission:** Generate batches of ranked content ideas that combine trend relevance, competitor gap analysis, and channel strategy alignment to maximize the probability of producing a top-performing video.

#### Inputs

```typescript
interface IdeaAgentInput {
  channelId:        string;
  channelStrategy:  StrategyBrief;
  recentTrends:     TrendRecord[];      // Last 7 days
  existingIdeaTitles: string[];         // For deduplication
  competitorInsights: ChannelInsight[]; // For gap-based ideas
  count:            number;             // Default: 20
  pillarFilter?:    string;             // Optional: ideas for specific pillar only
  formatFilter?:    ContentFormat;      // Optional: specific format
  winnerFormula?:   WinnerFormula;      // From Workflow 12
}
```

#### Outputs

```typescript
interface IdeaAgentOutput {
  ideas: {
    title:            string;
    hook:             string;
    format:           ContentFormat;
    pillar:           string;
    trendKeyword:     string;
    whyItWillPerform: string;    // 1 sentence rationale
    competitorGap:    boolean;   // True if no competitor has covered this
    estimatedRoi:     number;    // 0.0 – 1.0
    trendAlignment:   number;    // 0.0 – 1.0
  }[];
  batchSummary: string;          // 1-sentence description of this batch's angle
}
```

#### Tools Available

- `readDB(table: 'content_ideas', 'trends', 'analytics_snapshots')` → context + dedup
- `semanticSearch(titles, embedding)` → vector similarity for dedup check
- `readDB(table: 'channel_insights')` → competitor gap data
- `webSearch(trend + "youtube views 2025")` → validate trend has video demand

#### Memory Strategy

- **Ephemeral:** Assembled context for this batch run
- **DB-backed:** All generated ideas written to `content_ideas` table
- **Learning:** Rejected ideas stored with reason; fed back as negative examples in next run

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Uniqueness | < 10% duplicate rate vs existing idea library |
| Trend freshness | ≥ 90% of ideas tied to trends < 7 days old |
| Format diversity | ≥ 3 different formats in any batch of 20 |
| ROI prediction accuracy | Correlation ≥ 0.50 with actual video performance |
| Hook quality | Every hook ≤ 15 seconds when read aloud |

#### Failure Handling

- Duplicate rate > 50% → re-run with explicit instruction to find new angles; provide rejected titles
- All trends stale → generate evergreen ideas flagged as EVERGREEN; note trend data gap
- JSON parse failure → retry with stricter structured output enforcement (GPT-4o JSON mode)

#### System Prompt Excerpt

```
You are the Idea Agent for Faceless Viral OS. You generate video ideas for faceless
AI-produced content channels. These are channels with no human presenter — the content
must stand on the strength of the topic, hook, and format alone.

For each idea, you must:
1. Write a title that is search-optimized AND curiosity-gap driven
2. Write a hook that creates an open loop in the first 5 seconds
3. Select a format that fits the topic (listicle for information density,
   story for emotional pull, tutorial for how-to searches)
4. Assign a content pillar from the channel strategy
5. Identify the trend keyword this idea capitalizes on
6. Explain in one sentence why this specific idea will outperform average

Rules:
- No generic titles. "10 AI Tools to Boost Productivity" is too generic.
  "I Tested 10 AI Tools That Replaced My $5,000/Month Freelancers" is specific.
- Every hook must have a clear implied payoff (what the viewer will learn/get)
- Do not repeat formats — vary them across the batch

Output: valid JSON matching IdeaAgentOutput schema.
```

---

### Agent 6: Script Agent

**Mission:** Write complete, production-ready scripts for faceless video content — structured for TTS narration, scene-by-scene visual direction, and platform-specific duration and pacing requirements.

#### Inputs

```typescript
interface ScriptAgentInput {
  idea:          ContentIdea;
  channelConfig: ChannelConfig;       // Tone, audience, strategy brief
  targetPlatform: Platform;
  targetDuration: number;             // Seconds
  voiceStyle:    string;              // 'narrative' | 'energetic' | 'calm'
  language:      string;
  previousScript?: string;           // For regeneration with feedback
  feedback?:     string;             // Operator feedback on previous draft
}
```

#### Outputs

```typescript
interface ScriptAgentOutput {
  title:     string;
  hook:      string;       // Verbatim first 15 seconds of narration
  intro:     string;       // Seconds 15–60
  sections:  ScriptSection[];
  cta:       string;
  fullScript: string;      // Concatenated, clean narration text
  wordCount: number;
  estimatedDurationSeconds: number;
  sceneBreakdown: SceneBreakdown[];
  seoKeywords: string[];   // For metadata generation
}

interface SceneBreakdown {
  id:                 number;
  type:               'voiceover' | 'b-roll' | 'text-overlay' | 'title-card';
  scriptSegment:      string;    // Narration for this scene
  visualDescription:  string;    // What to show (for Visual Agent)
  durationEstimate:   number;    // Seconds
  transitionType:     'cut' | 'fade' | 'wipe';
}
```

#### Tools Available

- `readDB(table: 'scripts', filter: {channel_id})` → prior scripts (style reference + dedup)
- `readDB(table: 'analytics_snapshots', filter: {channel_id})` → top performers (style reference)
- `readDB(table: 'channel_insights')` → hook patterns from competitors
- `countWords(text)` → utility for duration estimation

#### Memory Strategy

- **Ephemeral:** Run-time context (idea, brief, voice style)
- **DB-backed:** Script written to `scripts` table with full content
- **Versioned:** Each regeneration creates new record with incremented version number
- **Style memory:** Top-performing scripts referenced in future generations as style examples

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Duration accuracy | Within 5% of target duration |
| Hook open-loop quality | Hook must create a question that's answered only at the end |
| Scene count | 1 scene per 30–45 seconds of content |
| No competitor brand mentions | Zero mentions of competitor handles or brands |
| Readability | Flesch-Kincaid Grade Level ≤ 9 for EN; natural spoken language |
| CTA placement | CTA in last 10% of script |

#### Failure Handling

- Duration off by > 20% → targeted re-prompt: "Expand section 3 by 150 words" or "Trim intro by 80 words"
- Hook too weak (< 5 curiosity score) → regenerate hook only; keep rest of script
- Safety filter trigger → rephrase flagged section; log original + sanitized version
- Third retry failure → save as DRAFT; notify operator for manual completion

#### System Prompt Excerpt

```
You are the Script Agent for Faceless Viral OS. You write scripts for AI-voiced
faceless video content. No human face. No personal anecdotes. No "I remember when..."

The script will be read by a text-to-speech engine. Write for the ear, not the eye:
- Short sentences (avg 12–15 words)
- No parenthetical text, no footnotes, no "[pause here]" markers
- Transitions must be verbal ("Let's move on to..." not "---")
- Avoid words that are hard to pronounce or have ambiguous stress patterns

Structure every script as: Hook → Problem → Solution Preview → Main Content → CTA
The hook MUST create an open loop — the viewer must feel they CANNOT leave without
hearing the answer. The CTA must be natural, not desperate.

For the scene breakdown: think like a video editor. Each scene should have one
central visual idea. Describe the visual in terms of what would appear on screen,
not what the script says — they are complementary, not redundant.

Output: valid JSON matching ScriptAgentOutput schema. Full script in fullScript field.
```

---

### Agent 7: Localization Agent

**Mission:** Produce culturally-adapted, broadcast-quality translations of scripts from English to Spanish (and vice versa), preserving tone, hook effectiveness, and platform-appropriate phrasing for the target market.

#### Inputs

```typescript
interface LocalizationAgentInput {
  sourceScript:   ScriptAgentOutput;
  sourceLang:     'en' | 'es';
  targetLang:     'en' | 'es';
  targetMarket:   'ES_LATAM' | 'ES_SPAIN' | 'EN_US' | 'EN_UK';
  channelTone:    string;
  audiencePersona: AudiencePersona;
}
```

#### Outputs

```typescript
interface LocalizationAgentOutput {
  translatedScript: ScriptAgentOutput;  // Full script in target language
  adaptationNotes:  string[];           // Changes made beyond literal translation
  culturalAdaptations: {
    original: string;
    adapted:  string;
    reason:   string;
  }[];
  readabilityScore: number;            // Flesch-Kincaid equivalent for target lang
  wordCountDelta:   number;            // % change vs source (should be < 15%)
}
```

#### Tools Available

- `readDB(table: 'scripts', filter: {language: targetLang})` → reference translated scripts
- `dictionaryLookup(term, market)` → validate regional vocabulary
- `countWords(text)` → duration parity check

#### Memory Strategy

- **Ephemeral:** Single run; no cross-run context needed
- **DB-backed:** Translated script written as new `scripts` record (language = targetLang)
- **Terminology store (Phase 2):** Channel-specific terminology glossary to enforce consistency

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Hook effectiveness | ES hook must independently pass hook quality check |
| Duration parity | Word count within 10% of source |
| No anglicisms | Zero untranslated English terms (unless brand names) |
| Register consistency | Formal/informal consistent throughout |
| Cultural adaptations | At least 1 cultural adaptation per 500 source words |

#### Failure Handling

- Readability score too low (< 60 Flesch) → rephrase complex sentences; retry once
- Word count delta > 15% → targeted trim or expansion with explicit instruction
- Cultural reference cannot be adapted → substitute with target-culture equivalent; note in adaptationNotes

#### System Prompt Excerpt

```
You are the Localization Agent for Faceless Viral OS. You translate and culturally
adapt video scripts from English to Spanish (Latin American variant unless specified).

This is NOT a literal translation. It is a creative adaptation.

For each section of the script:
1. Translate the meaning, not the words
2. Ask: "Would a native speaker say it this way?" If not, rephrase
3. Adapt idioms and cultural references (e.g., "Super Bowl" → "la Copa del Mundo")
4. Maintain the hook's emotional impact — a weak ES hook is worse than no translation
5. Keep sentence length and rhythm similar to the source (TTS pacing must match)

Market: {{TARGET_MARKET}}. Use vocabulary appropriate for this market.
For ES-LATAM: Use "tú" (informal). For ES-Spain: Use "tú" (informal) unless topic demands "usted".

Output: valid JSON matching LocalizationAgentOutput schema.
```

---

### Agent 8: Visual Agent

**Mission:** Generate detailed, production-quality image prompts for every scene in a script, ensuring visual-narrative coherence and brand consistency across all scenes of a video.

#### Inputs

```typescript
interface VisualAgentInput {
  sceneBreakdown:   SceneBreakdown[];
  channelConfig:    ChannelConfig;
  brand:            BrandConfig;        // Colors, style, tone
  targetPlatform:   Platform;
  aspectRatio:      '16:9' | '9:16' | '1:1';
  imageProvider:    string;             // 'dalle3', 'sdxl', 'sdxl-turbo', 'pexels'
}
```

#### Outputs

```typescript
interface VisualAgentOutput {
  scenePrompts: {
    sceneId:      number;
    prompt:       string;           // Full image generation prompt
    negativePrompt?: string;        // For diffusion models
    style:        string;           // e.g., 'photorealistic', 'flat design'
    colorPalette: string[];         // Hex colors for scene
    searchQuery?: string;           // If falling back to stock search
  }[];
  thumbnailPrompt: {
    prompt:       string;
    textOverlay:  string;           // Text to composite on thumbnail
    style:        string;
  };
}
```

#### Tools Available

- `generateImage(prompt, provider, model)` → DALL-E 3 / SDXL / SDXL-Turbo
- `searchPexels(query, orientation)` → Pexels stock photo API (FREE tier fallback)
- `searchPixabay(query)` → Pixabay API (secondary stock fallback)
- `readDB(table: 'assets', filter: {channel_id, type: IMAGE})` → reuse existing channel assets

#### Memory Strategy

- **Ephemeral:** Scene prompts generated per video; not retained across runs
- **Asset library:** Generated images uploaded to R2 and stored in `assets` table
- **Style guide cache:** Brand style config cached in-memory for session duration

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Visual-narrative alignment | Every image must match its scene description |
| Brand consistency | Color palette consistent across all scenes |
| No text in generated images | Zero AI-generated text in scene images (causes artifacts) |
| Prompt specificity | Prompts > 50 words (vague prompts → generic output) |
| Aspect ratio compliance | All images at correct aspect ratio for platform |

#### Failure Handling

- Image generation fails → retry with simpler prompt; if still fails → use Pexels fallback
- NSFW filter triggered → remove flagged elements; rewrite prompt; retry once
- Stock photo search returns 0 results → broaden search terms; use abstract/conceptual search

#### System Prompt Excerpt

```
You are the Visual Agent for Faceless Viral OS. You write image generation prompts
for every scene in a faceless video. These images will appear on screen while
the AI voice narrates the corresponding script segment.

Guidelines:
1. Every prompt must describe a SINGLE, CLEAR visual scene — no collages
2. No text in generated images (text will be added in post-production)
3. Match the emotional tone of the script segment: exciting topic = dynamic composition
4. Use photorealistic style unless brand config specifies otherwise
5. For stat-heavy scenes: use abstract data visualization imagery, NOT screenshots
6. Thumbnail prompt: high contrast, clear focal point, designed to be readable at 120px wide

Negative prompts (for diffusion models): always include "text, watermark, blurry,
low resolution, distorted, multiple panels, collage, ugly, deformed"

Output: valid JSON matching VisualAgentOutput schema.
```

---

### Agent 9: Voice Agent

**Mission:** Orchestrate TTS generation across all script segments, selecting the optimal voice configuration for the channel and ensuring audio quality, consistent pacing, and accurate duration estimation.

#### Inputs

```typescript
interface VoiceAgentInput {
  scriptSegments: { id: number; text: string; }[];
  voiceProfile:   VoiceProfile;
  language:       string;
  targetDuration: number;   // seconds (for pacing calibration)
}
```

#### Outputs

```typescript
interface VoiceAgentOutput {
  audioSegments: {
    segmentId:     number;
    r2Url:         string;
    durationSeconds: number;
    costUsd:       number;
  }[];
  totalDurationSeconds: number;
  totalCostUsd:         number;
  pacingAccuracy:       number;   // actual / target duration ratio
}
```

#### Tools Available

- `callElevenLabs(voiceId, text, settings)` → ElevenLabs TTS API
- `callOpenAITTS(model, voice, input)` → OpenAI TTS API
- `callAzureTTS(voice, text, lang)` → Azure Cognitive Services TTS
- `uploadToR2(buffer, key)` → Cloudflare R2 upload
- `measureAudioDuration(audioBuffer)` → ffprobe utility

#### Memory Strategy

- **Ephemeral only** — audio generation is deterministic from inputs
- **Asset records:** Audio segments written to `assets` table with file URLs
- **Voice sample cache:** Short reference samples cached for quality comparison

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Duration accuracy | Actual vs estimated within 5% |
| Audio quality | No clipping, no artifacts (automated audio QA check) |
| Segment count | Matches scene_breakdown count exactly |
| Pacing | Speech rate within 10% of target WPM for language |
| Cost accuracy | Actual vs estimated within 15% |

#### Failure Handling

- ElevenLabs error on specific segment → retry with OpenAI TTS for that segment; continue others
- Audio duration > 10% over target → re-generate with increased speech speed (±0.1x) setting
- Upload to R2 fails → retry 3x; if still failing → halt pipeline; emit alert
- Character limit exceeded (ElevenLabs) → split segment at sentence boundary; generate in parts

#### System Prompt Excerpt

*Note: Voice Agent is primarily an orchestrator with minimal LLM involvement. LLM is only used for segment splitting decisions and quality assessment.*

```
You are the Voice Agent for Faceless Viral OS. Your job is to split a script into
optimal TTS segments and determine the best split points.

Rules for segment splitting:
1. Split at sentence boundaries only — never mid-sentence
2. Each segment should be 1–4 sentences (optimal for TTS quality)
3. Keep related information together — do not split a statistic from its context
4. Maximum 500 characters per segment for ElevenLabs

For each segment, note if it requires: emphasis (slower pace), urgency (faster pace),
or neutral (standard pace). These map to TTS speed settings.

Output: JSON array of segment objects with text and pace_modifier.
```

---

### Agent 10: Video Assembly Agent

**Mission:** Orchestrate the final video rendering pipeline — combining audio segments, scene images, text overlays, and transitions into a complete video file that meets platform technical requirements.

#### Inputs

```typescript
interface VideoAssemblyInput {
  videoId:         string;
  audioSegments:   AudioSegment[];
  sceneImages:     SceneImage[];
  sceneBreakdown:  SceneBreakdown[];
  renderConfig:    RenderConfig;     // Resolution, fps, codec, platform
  brandConfig:     BrandConfig;      // Intro/outro, watermark, fonts
}
```

#### Outputs

```typescript
interface VideoAssemblyOutput {
  videoId:          string;
  r2Url:            string;
  thumbnailUrl:     string;
  durationSeconds:  number;
  fileSize:         number;       // bytes
  resolution:       string;
  codec:            string;
  renderCostUsd:    number;
  qualityReport: {
    audioLufs:      number;       // Should be -14 LUFS for YouTube
    videoIntegrity: boolean;
    durationMatch:  boolean;
  };
}
```

#### Tools Available

- `renderWithRemotion(config)` → Remotion headless render (self-hosted)
- `renderWithCreatomate(config)` → Creatomate API render
- `renderWithFFmpeg(config)` → Direct ffmpeg pipeline (lowest cost)
- `uploadToR2(buffer, key)` → Cloudflare R2
- `generateThumbnail(videoPath, timestamp)` → ffmpeg thumbnail extraction
- `normalizeAudio(audioPath)` → ffmpeg LUFS normalization

#### Memory Strategy

- **Ephemeral only** — assembly is a pure transformation; no cross-run learning
- **Job state:** BullMQ job progress tracked (0–100%) and stored in Redis
- **R2 paths:** Written to `videos.file_url` and `videos.thumbnail_url`

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Render success rate | ≥ 99% |
| Duration accuracy | Actual vs target within 2% |
| Audio sync | No audio drift > 50ms |
| Audio level | -14 LUFS ± 2 dB |
| File size | Within platform limits (YT: 256GB, TikTok: 4GB) |

#### Failure Handling

- Remotion render crash → retry with FFmpeg fallback
- Image missing for scene → use preceding scene image; log gap
- Audio sync drift > 100ms → post-process with ffmpeg audio offset correction
- File too large → re-encode at 70% bitrate; check size; repeat until within limit

*No LLM system prompt — this agent is a pure orchestrator.*

---

### Agent 11: Publishing Agent

**Mission:** Generate platform-optimized metadata for each video variant and manage the execution of scheduled publish jobs with full retry logic and status tracking.

#### Inputs

```typescript
interface PublishingAgentInput {
  video:          VideoRecord;
  variant:        VideoVariant;
  platform:       Platform;
  channelConfig:  ChannelConfig;
  script:         ScriptRecord;
  scheduledAt?:   Date;
}
```

#### Outputs

```typescript
interface PublishingAgentOutput {
  metadata: {
    title:       string;
    description: string;
    tags:        string[];
    category?:   string;   // YouTube category ID
    hashtags:    string[];
    privacyStatus: 'public' | 'unlisted' | 'private';
    madeForKids: boolean;
  };
  publishJobId: string;
  scheduledAt:  Date;
}
```

#### Tools Available

- `uploadYouTube(videoPath, metadata, oauthToken)` → YouTube Data API v3
- `uploadTikTok(videoPath, caption, oauthToken)` → TikTok Content Posting API
- `uploadInstagram(videoPath, caption, oauthToken)` → Instagram Graph API
- `refreshOAuthToken(platformAccountId)` → Token refresh
- `readDB(table: 'analytics_snapshots')` → historical metadata performance (for title A/B insights)

#### Memory Strategy

- **Ephemeral:** Metadata generation per video
- **Historical metadata:** Stored in `video_variants` table
- **Performance learning (Phase 2):** CTR by title formula tracked; used for metadata improvement

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Title length | YouTube ≤ 60 chars, TikTok ≤ 150 chars |
| Tag count | YouTube: 15–20 tags |
| Keyword placement | Primary keyword in title position 1–3 |
| Description structure | Chapters included for videos > 5 min |
| Publish success rate | ≥ 99.5% |

#### Failure Handling

- OAuth expired → trigger token refresh; if refresh fails → alert operator; reschedule job by 1h
- Platform API 5xx → exponential backoff retry (5 attempts over 30 min)
- Video rejected by platform → parse error code; if fixable (wrong codec) → re-encode; else alert

#### System Prompt Excerpt

```
You are the Publishing Agent for Faceless Viral OS. You write platform-optimized
metadata for AI-produced faceless video content.

For YouTube titles:
- Primary keyword in first 3 words when possible
- Use curiosity gap or number list ("7 Ways...", "Why [X] is...")
- Maximum 60 characters (hard limit — truncate if needed)
- No clickbait that doesn't deliver (platform penalizes)

For YouTube descriptions:
- First 2 lines before "Show More" must hook the viewer
- Include timestamps for videos > 5 minutes
- Place affiliate links in first 300 characters
- Close with subscribe CTA

For TikTok/Reels captions:
- Lead with the hook (first 90 characters visible before "more")
- 5–7 relevant hashtags (not generic — niche-specific)
- Include a question to drive comments

Output: valid JSON matching PublishingAgentOutput.metadata schema.
```

---

### Agent 12: Analytics Agent

**Mission:** Synthesize raw performance snapshots into actionable insights — identifying winners, trends, and optimization opportunities across channels, time periods, and content formats.

#### Inputs

```typescript
interface AnalyticsAgentInput {
  channelId:     string;
  period:        '7d' | '30d' | '90d';
  snapshots:     AnalyticsSnapshot[];
  channelAvgs:   ChannelAverages;   // Baseline for comparison
  costData:      CostSummary;
}
```

#### Outputs

```typescript
interface AnalyticsAgentOutput {
  summary:        string;           // 3–5 sentence executive summary
  winners:        VideoInsight[];   // Top 3 overperformers with analysis
  underperformers: VideoInsight[];  // Bottom 3 with diagnosis
  formatInsights: {
    format:            ContentFormat;
    avgViews:          number;
    avgCTR:            number;
    recommendation:    string;
  }[];
  pillarInsights: {
    pillar:            string;
    performance:       'ABOVE' | 'AT' | 'BELOW';  // vs channel average
    recommendation:    string;
  }[];
  actionItems:    string[];         // Prioritized list of next actions
  roiSummary: {
    totalCost:     number;
    totalRevenue:  number;
    margin:        number;
    roiMultiple:   number;
  };
}
```

#### Tools Available

- `readDB(table: 'analytics_snapshots', 'ledger_entries', 'scripts')` → raw data
- `computePerformanceScore(snapshot, channelAvgs)` → scoring utility
- `detectAnomalies(timeSeries)` → statistical anomaly detection

#### Memory Strategy

- **Persistent:** Insights stored in `channel_insights_reports` table (Phase 2)
- **Winner patterns:** Top performer attributes stored for Idea Agent reference
- **Underperformer patterns:** Used as negative examples in next idea batch

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Winner detection precision | ≥ 90% of flagged winners verify as top quartile |
| Underperformer detection | ≥ 85% of flagged underperformers in bottom quartile |
| Action item relevance | ≥ 80% of action items rated "useful" by operator |
| Summary accuracy | No fabricated metrics |

#### Failure Handling

- Insufficient data (< 5 videos) → produce limited analysis; clearly label as LOW_CONFIDENCE
- All metrics null (API unavailable) → return previous cached insights; mark as STALE

#### System Prompt Excerpt

```
You are the Analytics Agent for Faceless Viral OS. You analyze content performance
data and turn numbers into decisions.

You are NOT a reporting tool — you are a decision engine. Every insight must end
in an action recommendation. Do not say "CTR is 3.2%". Say "CTR is 3.2%, which is
below the channel average of 4.8%. The thumbnail formula used in the top 3 videos
by CTR all featured red text. Recommend switching to that formula for next batch."

When identifying winners: explain the specific formula that drove performance
so it can be replicated.

When identifying underperformers: diagnose the specific failure point
(hook? thumbnail? topic?). Do not blame general factors.

Prioritize action items by expected impact.

Output: valid JSON matching AnalyticsAgentOutput schema.
```

---

### Agent 13: Optimization Agent

**Mission:** Analyze underperforming content and provide specific, testable recommendations for improving titles, thumbnails, hooks, and content structure to recover performance on existing videos and prevent similar failures in future production.

#### Inputs

```typescript
interface OptimizationAgentInput {
  video:          VideoRecord;
  script:         ScriptRecord;
  analytics:      AnalyticsSnapshot[];   // Full history for this video
  channelAvgs:    ChannelAverages;
  competitorInsights: ChannelInsight[];  // For benchmark comparison
  winnerFormulas: WinnerFormula[];       // Channel's proven winners
}
```

#### Outputs

```typescript
interface OptimizationAgentOutput {
  diagnosis:       string;         // Root cause analysis (2–3 sentences)
  titleAlternatives: string[];     // 3 alternative titles to A/B test
  thumbnailRecommendation: string; // Specific thumbnail change
  hookAlternatives: string[];      // 2 alternative opening hooks
  contentStructureNotes: string;   // What to change in next similar video
  expectedImpact:  string;         // Predicted improvement if changes made
  confidence:      'HIGH' | 'MEDIUM' | 'LOW';
}
```

#### Tools Available

- `readDB(table: 'scripts', 'analytics_snapshots', 'channel_insights')` → analysis context
- `semanticSearch(title, embedding)` → find similar high-performing titles
- `readDB(table: 'videos', filter: {channel_id, performance: 'HIGH'})` → winner references

#### Memory Strategy

- **Persistent:** Recommendations stored in video.metadata.optimization_notes
- **Learning:** Applied recommendations tracked; outcome measured at T+7d; feeds correction factor

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Title alternative quality | At least 1 of 3 alternatives achieves > 10% CTR improvement when tested |
| Diagnosis accuracy | ≥ 75% of diagnoses confirmed by operator as plausible |
| Confidence calibration | HIGH confidence recommendations outperform MEDIUM by measurable margin |

#### Failure Handling

- Insufficient analytics data (< 72h old) → return "too early to analyze"; schedule for retry at T+72h
- No competitor data available → produce recommendations based on channel internal data only

#### System Prompt Excerpt

```
You are the Optimization Agent for Faceless Viral OS. A video underperformed.
Your job is to diagnose why and produce testable fixes.

Diagnosis framework:
1. CTR problem (< channel avg) → thumbnail or title failure
2. AVD problem (< 40%) → hook failure or pacing failure
3. Both low → topic didn't resonate OR wrong audience targeting

For each problem type, your recommendations must be SPECIFIC:
- Not: "improve the thumbnail"
- Yes: "Replace current thumbnail with close-up image of dollar bill + '73% FAIL' in
  red bold text — this formula achieved 7.2% CTR on 3 of the top 5 performing videos
  on this channel"

Reference winner formulas explicitly. Your recommendations must be grounded in
what has already worked on this channel, not generic best practices.

Output: valid JSON matching OptimizationAgentOutput schema.
```

---

### Agent 14: Cost Control Agent

**Mission:** Monitor real-time and projected spending across all channels and providers, trigger governance actions when budgets are at risk, and recommend cost optimizations without sacrificing content quality.

#### Inputs

```typescript
interface CostControlAgentInput {
  channelId?:   string;          // null = global review
  period:       string;          // 'YYYY-MM'
  ledgerData:   LedgerSummary;
  budgetData:   BudgetRecord[];
  providerData: ProviderSpend[];
  performanceData: ChannelPerformanceSummary[];
}
```

#### Outputs

```typescript
interface CostControlAgentOutput {
  alerts:       CostAlert[];
  tierRecommendations: TierRecommendation[];
  providerRecommendations: ProviderRecommendation[];
  projectedMonthEnd: number;     // Projected total spend at month end
  savingsOpportunities: {
    description:    string;
    estimatedSaving: number;
    tradeoff:       string;
  }[];
  automatedActions: AutomatedAction[];  // Actions already taken
}
```

#### Tools Available

- `readDB(table: 'ledger_entries', 'budgets', 'channels')` → financial state
- `readDB(table: 'analytics_snapshots')` → ROI data
- `getProviderPricing(provider, model, taskType)` → current pricing
- `computeProjection(dailyAvg, daysRemaining)` → month-end spend projection
- `applyTierChange(channelId, newTier)` → execute tier downgrade (if auto_tier_management = true)

#### Memory Strategy

- **Persistent:** Tier review decisions stored in audit log
- **Alert dedup:** Alert state stored in Redis (prevents re-alerting for same event)
- **Projection history:** Month-end projections stored to assess projection accuracy

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Alert timeliness | SOFT_WARN fired before 80% reached (at ~75%) |
| Projection accuracy | ± 15% of actual month-end spend |
| Recommendation uptake | ≥ 60% of manual recommendations adopted by operator |
| False positive rate | < 5% of triggered hard stops were unnecessary |

#### Failure Handling

- DB unavailable → use Redis cached budget state; emit degraded mode warning
- All alerts fail to send → log to structured alert log; surface in UI on next load
- Tier change fails → log failure; retry once; alert operator if second failure

#### System Prompt Excerpt

```
You are the Cost Control Agent for Faceless Viral OS. You are the financial
guardian of the content operation.

Your job is to:
1. Flag when any budget entity (user, channel, provider) is approaching limits
2. Identify waste: provider calls that cost too much for their quality contribution
3. Recommend tier adjustments based on ROI — downgrade when ROI is negative,
   upgrade when ROI justifies the higher cost
4. Project month-end spend accurately so the operator is never surprised

When recommending downgrades: be specific about the tradeoff. "Downgrading from
PREMIUM to OPTIMIZED will save ~$35/month. Script quality may decrease by an
estimated 15% (based on benchmark comparisons). Given the channel's current
-22% ROI, this is the appropriate action."

When recommending savings: always state the tradeoff. Never recommend a change
that would cause a budget-breaking drop in content quality without flagging it.

Output: valid JSON matching CostControlAgentOutput schema.
```

---

### Agent 15: Routing Agent

**Mission:** Select the optimal AI provider and model for every task based on the channel's AI tier, current provider health, budget remaining, task requirements, and cost-quality tradeoffs — ensuring every job gets the best possible model within its constraints.

#### Inputs

```typescript
interface RoutingAgentInput {
  channelId:    string;
  tier:         AiTier;
  taskType:     TaskType;
  priority:     'SPEED' | 'QUALITY' | 'COST';
  budgetRemaining: number;    // USD remaining this period
  estimatedCost:   number;    // Pre-run estimate for this task
  preferredProvider?: string; // Channel-level override
}
```

#### Outputs

```typescript
interface RoutingAgentOutput {
  provider:    string;
  model:       string;
  fallbackChain: { provider: string; model: string; }[];
  rationale:   string;         // 1-sentence explanation
  estimatedCost: number;       // Updated estimate for selected model
  qualityScore:  number;       // Model's quality score for this task type
}
```

#### Tools Available

- `readDB(table: 'providers', 'models', 'tier_profiles', 'routing_policies')` → routing config
- `getProviderHealth(provider)` → real-time health status from Redis cache
- `getProviderDailyBudget(provider)` → remaining daily budget for provider
- `getModelBenchmark(model, taskType)` → quality + latency benchmarks

#### Memory Strategy

- **Persistent:** Routing decisions logged (provider, model, task_type, cost_actual) for performance analysis
- **Cache:** Provider health and pricing cached in Redis (TTL: 2 minutes)
- **Routing history:** Used to detect systematic fallbacks (provider repeatedly unavailable → alert)

#### Routing Decision Tree

```
1. Get tier config → preferred provider + model for this task_type
2. Check provider health: is preferred provider HEALTHY?
   → NO: fall to fallback_chain[0]
3. Check provider daily budget: has cap been reached?
   → YES: fall to next in fallback_chain
4. Check budget fit: does estimatedCost exceed remaining budget?
   → YES: try cheaper model in same provider family
5. Apply channel routing_policy override (if exists)
6. Return selected provider + model + remaining fallback chain
```

#### Evaluation Criteria

| Criterion | Target |
|-----------|--------|
| Routing accuracy | ≥ 99% of jobs routed to appropriate tier model |
| Fallback success | < 1% of jobs fail due to no available provider |
| Cost optimization | Routing decisions within 5% of theoretically optimal cost |
| Health check currency | Provider health data ≤ 2 min old |

#### Failure Handling

- All providers in fallback chain unavailable → emit `all_providers_down` event; fail job gracefully; alert
- Tier config missing → fall back to ECONOMICAL tier defaults
- Routing policy DB unavailable → use in-memory default routing table

#### System Prompt Excerpt

*Note: Routing Agent is primarily rule-based. LLM is invoked only for edge case resolution.*

```
You are the Routing Agent for Faceless Viral OS. You select the best AI provider
and model for a given task when the standard rule-based routing cannot resolve
a clear winner.

Edge cases you handle:
1. Multiple providers at same health/cost — select by quality score
2. Budget nearly exhausted — recommend cheapest viable option
3. Task has special requirements (e.g., >100K token context) — filter by context window

Your selection must always include a fallback chain of at least 2 alternatives.
Never return a routing decision without a fallback.

Optimize for: (1) task success, (2) quality within tier, (3) cost.
Never recommend a provider with health_status = DOWN.

Output: valid JSON matching RoutingAgentOutput schema.
```

---

## 4. Shared Infrastructure

### LLM Client Abstraction

```typescript
// packages/agents/src/llm/llm.client.ts

export class LLMClient {
  async complete(params: LLMParams): Promise<LLMResponse> {
    const adapter = this.getAdapter(params.provider);
    return adapter.complete(params);
  }

  private getAdapter(provider: string): LLMAdapter {
    const adapters: Record<string, LLMAdapter> = {
      openai:    new OpenAIAdapter(),
      anthropic: new AnthropicAdapter(),
      groq:      new GroqAdapter(),
      gemini:    new GeminiAdapter(),
    };
    return adapters[provider] ?? adapters['openai'];
  }
}
```

### Output Validation with Zod

```typescript
// Every agent output schema is defined as a Zod schema
// and validated before the output is returned.

const IdeaAgentOutputSchema = z.object({
  ideas: z.array(z.object({
    title:            z.string().min(10).max(100),
    hook:             z.string().min(5).max(200),
    format:           z.enum(['LISTICLE', 'STORY', 'TUTORIAL', 'REACTION', 'EXPLAINER']),
    pillar:           z.string(),
    trendKeyword:     z.string(),
    whyItWillPerform: z.string().max(200),
    competitorGap:    z.boolean(),
    estimatedRoi:     z.number().min(0).max(1),
    trendAlignment:   z.number().min(0).max(1),
  })).min(1).max(25),
  batchSummary: z.string().max(200),
});
```

---

## 5. Agent Interaction Map

```
EXTERNAL DATA SOURCES                    INTELLIGENCE AGENTS
  Google Trends ──────────────────────► Trend Agent (1)
  YouTube Data API ───────────────────► Trend Agent (1)
  TikTok Research API ────────────────► Trend Agent (1)
                                              │
  Platform Scraping ──────────────────► Competitor Intel (4)
                                              │
                                         Niche Agent (2) ◄── Trend Agent (1)
                                              │
                                        Strategy Agent (3) ◄── Niche Agent (2)
                                              │              ◄── Competitor Intel (4)
                                              │
CONTENT PRODUCTION AGENTS                     │
  Idea Agent (5) ◄──────────────────── Strategy Agent (3)
                                        ◄── Trend Agent (1)
       │                                ◄── Competitor Intel (4)
       ▼
  Script Agent (6) ─────────────────► Localization Agent (7)
       │                                      │
       ▼                                      ▼
  Visual Agent (8)              ES Script ready
       │
       ▼                 ┌── Voice Agent (9) ──┐
  Scene Images           │                     │
       │                 │   Audio Segments     │
       └─────────────────┼──────────────────────┘
                         ▼
              Video Assembly Agent (10)
                         │
                         ▼
              Publishing Agent (11) ──────────► Platform APIs
                         │
                         ▼
              Analytics Agent (12) ◄────────── Platform Analytics
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
  Optimization Agent (13)    Cost Control Agent (14)
              │                     │
              └──────────┬──────────┘
                         ▼
              Back to Idea Agent (5) [Winner Iteration Loop]

ROUTING AGENT (15) ─── serves ALL other agents ───────────────
COST CONTROL AGENT (14) ─── monitors ALL agent calls ─────────
```
