# 08 — Tier System

**Faceless Viral OS | Founding Blueprint**
Version: 1.0 | Status: Engineering Reference

---

## Overview

The platform operates across 5 AI tiers. Each tier defines which AI models, TTS providers, and media generation tools are used for every task. Tier selection balances cost, output quality, and latency. The tier is set per-channel and can be overridden per-workflow or per-task by the routing engine.

The tier system is the primary cost governance mechanism. It interacts directly with the Cost & Tier Engine (Module 9) and the Model Routing Engine (described in `09-model-routing-engine.md`).

---

## Tier Definitions

---

### Tier 1: FREE

| Property | Value |
|---|---|
| **Purpose** | Experimentation, onboarding, low-volume testing |
| **Operator Profile** | New operators evaluating the platform, hobbyists |
| **Target Cost** | ~$0.00–$0.50 / video |
| **Quality Score** | 3/10 — acceptable output, not production-ready |
| **Expected Latency** | 30–120s for script; 5–20 min for video |
| **Output Limits** | 2 videos/day, 500 tokens/script, no translation |

#### Default Provider Assignments

| Task | Provider | Model |
|---|---|---|
| Script writing (long) | Groq | Llama 3.1 8B |
| Script writing (short) | Groq | Llama 3.1 8B |
| Title/hook generation | Groq | Llama 3.1 8B |
| Translation | Blocked (not available) | — |
| Voice generation | Coqui TTS | XTTS v2 (self-hosted) |
| Image generation | Stability AI | SDXL Turbo (low steps) |
| Video generation | Blocked | — |
| Rendering | ffmpeg | Standard preset |
| Niche research | Groq | Llama 3.1 8B |
| Analytics summarization | Groq | Llama 3.1 8B |

#### Limitations
- No translation support
- No video generation (AI video)
- Voice: robotic/neutral; no voice cloning
- Image quality: low resolution (512px), 10 steps
- No competitor analysis
- No autopilot workflows
- Scripts capped at 500 tokens (~375 words)

#### Escalation Rules
- Auto-escalate to ECONOMICAL if: script token limit is hit on 3 consecutive runs
- Operator can manually override to any tier

#### Downgrade Rules
- N/A (lowest tier)

---

### Tier 2: ECONOMICAL

| Property | Value |
|---|---|
| **Purpose** | High-volume, low-cost production for established niches |
| **Operator Profile** | Cost-focused operators scaling proven channels |
| **Target Cost** | ~$0.50–$2.00 / video |
| **Quality Score** | 5/10 — usable production quality |
| **Expected Latency** | 15–60s for script; 3–10 min for video |
| **Output Limits** | 20 videos/day, 2000 tokens/script, EN→ES/PT translation |

#### Default Provider Assignments

| Task | Provider | Model |
|---|---|---|
| Script writing (long) | Groq | Llama 3.1 70B |
| Script writing (short) | Groq | Llama 3.1 70B |
| Title/hook generation | Groq | Llama 3.1 70B |
| Translation EN↔ES | Groq | Llama 3.1 70B |
| Voice generation | OpenAI TTS | tts-1 (nova voice) |
| Image generation | Stability AI | SDXL 1.0 (20 steps) |
| Video generation | Blocked | — |
| Rendering | ffmpeg | H.264 preset |
| Niche research | Groq | Llama 3.1 70B |
| Analytics summarization | Groq | Llama 3.1 70B |
| Content recommendations | Groq | Llama 3.1 70B |

#### Limitations
- No AI video generation (image slideshow only)
- Voice: natural but limited style variation
- Image quality: 1024px, limited negative prompting
- No multi-language beyond ES/PT
- Competitor analysis: top 10 videos only

#### Escalation Rules
- Auto-escalate to OPTIMIZED if: output quality score falls below 6 (as rated by operator feedback)
- Auto-escalate if script requires >2000 tokens and content type demands it

#### Downgrade Rules
- Auto-downgrade to FREE if daily budget is exhausted before day end (operator-configured)

---

### Tier 3: OPTIMIZED

| Property | Value |
|---|---|
| **Purpose** | Balanced quality and cost; default production tier for most operators |
| **Operator Profile** | Growing channels needing consistent quality without premium cost |
| **Target Cost** | ~$2.00–$6.00 / video |
| **Quality Score** | 7/10 — strong production quality, audience-ready |
| **Expected Latency** | 10–30s for script; 3–8 min for video |
| **Output Limits** | 50 videos/day, 4000 tokens/script, 10 languages |

#### Default Provider Assignments

| Task | Provider | Model |
|---|---|---|
| Script writing (long) | Anthropic | Claude 3.5 Haiku |
| Script writing (short) | Groq | Llama 3.1 70B |
| Title/hook generation | Anthropic | Claude 3.5 Haiku |
| Translation EN↔ES/PT/FR/DE | Anthropic | Claude 3.5 Haiku |
| Voice generation | OpenAI TTS | tts-1-hd (alloy, shimmer, nova) |
| Image generation | Stability AI | SDXL 1.0 (30 steps, refiner) |
| Video generation | Blocked | — |
| Rendering | ffmpeg | H.264 high profile |
| Niche research | Anthropic | Claude 3.5 Haiku |
| Analytics summarization | Anthropic | Claude 3.5 Haiku |
| Content recommendations | Anthropic | Claude 3.5 Haiku |

#### Limitations
- No AI video generation (motion graphics via Remotion only)
- No voice cloning (predefined voices only)
- Image: no ControlNet / advanced compositing
- Language support: 10 most common languages

#### Escalation Rules
- Auto-escalate to PREMIUM if: task_type is `long-form-script` AND content is for PREMIUM channel tier
- Auto-escalate if operator marks content as "hero" content type

#### Downgrade Rules
- Auto-downgrade to ECONOMICAL if monthly spend reaches 80% of budget before month end

---

### Tier 4: PREMIUM

| Property | Value |
|---|---|
| **Purpose** | High-quality output for priority channels and monetized content |
| **Operator Profile** | Operators with monetized channels, brand deals, affiliate revenue |
| **Target Cost** | ~$6.00–$15.00 / video |
| **Quality Score** | 9/10 — near-professional quality |
| **Expected Latency** | 5–20s for script; 5–15 min for video |
| **Output Limits** | 100 videos/day, 8000 tokens/script, 25 languages |

#### Default Provider Assignments

| Task | Provider | Model |
|---|---|---|
| Script writing (long) | Anthropic | Claude Sonnet 4.5 |
| Script writing (short) | OpenAI | GPT-4o mini |
| Title/hook generation | OpenAI | GPT-4o |
| Translation (25 languages) | Anthropic | Claude Sonnet 4.5 |
| Voice generation | ElevenLabs | Multilingual v2 |
| Image generation | OpenAI | DALL-E 3 (HD quality) |
| Video generation | Blocked (operator opt-in) | — |
| Rendering | ffmpeg | H.264 + VP9 dual encode |
| Niche research | OpenAI | GPT-4o |
| Analytics summarization | OpenAI | GPT-4o |
| Content recommendations | OpenAI | GPT-4o |

#### Features Unlocked at PREMIUM
- ElevenLabs voice cloning (custom voice upload)
- DALL-E 3 with detailed style prompting
- Long-form scripts up to 8000 tokens (~6000 words)
- Full competitor intelligence (unlimited video analysis)
- A/B title testing across platforms
- AI-generated thumbnail concepts with DALL-E 3

#### Escalation Rules
- Auto-escalate to ULTRA if: task is video generation AND operator has ULTRA budget available

#### Downgrade Rules
- Auto-downgrade to OPTIMIZED if ElevenLabs API returns rate limit on 3 consecutive calls

---

### Tier 5: ULTRA

| Property | Value |
|---|---|
| **Purpose** | Maximum quality for flagship content, AI video, and high-stakes production |
| **Operator Profile** | Top-tier operators with high-revenue channels, willing to spend for best results |
| **Target Cost** | ~$15.00–$60.00+ / video (AI video significantly increases cost) |
| **Quality Score** | 10/10 — best-in-class across all task types |
| **Expected Latency** | 5–15s for script; 15–60 min for full AI video |
| **Output Limits** | Unlimited (budget-governed only) |

#### Default Provider Assignments

| Task | Provider | Model |
|---|---|---|
| Script writing (long) | Anthropic | Claude Sonnet 4.5 |
| Script writing (short) | OpenAI | GPT-4o |
| Title/hook generation | OpenAI | GPT-4o |
| Translation (all languages) | Anthropic | Claude Sonnet 4.5 |
| Voice generation | ElevenLabs | Multilingual v2 (voice clone) |
| Image generation | OpenAI | DALL-E 3 (HD, natural) |
| Video generation | Runway | Gen-3 Alpha Turbo |
| Rendering | ffmpeg | H.264 + AV1 multi-pass |
| Niche research | OpenAI | GPT-4o with browsing |
| Analytics summarization | OpenAI | GPT-4o (long context) |
| Content recommendations | Anthropic | Claude Sonnet 4.5 |

#### Features Exclusive to ULTRA
- Runway Gen-3 AI video generation (real motion video)
- Voice cloning with full expression control
- Unlimited token scripts with context window of 200K (Claude)
- Real-time GPT-4o with web browsing for trend research
- AV1 encoding for maximum quality at minimum file size
- Priority queue (jobs skip to front of media queue)

#### Escalation Rules
- N/A (highest tier)

#### Downgrade Rules
- Auto-downgrade to PREMIUM if daily AI video spend exceeds operator-set video budget cap
- Operator can set per-task-type tier overrides (e.g., ULTRA for TTS, PREMIUM for images)

---

## Task Routing Table

Full provider/model mapping by tier for each task type:

### Niche Research

| Tier | Provider | Model | Est. Cost / Run |
|---|---|---|---|
| FREE | Groq | Llama 3.1 8B | $0.001 |
| ECONOMICAL | Groq | Llama 3.1 70B | $0.01 |
| OPTIMIZED | Anthropic | Claude 3.5 Haiku | $0.04 |
| PREMIUM | OpenAI | GPT-4o | $0.15 |
| ULTRA | OpenAI | GPT-4o (+ browsing) | $0.30 |

### Trend Analysis

| Tier | Provider | Model | Est. Cost / Run |
|---|---|---|---|
| FREE | Groq | Llama 3.1 8B | $0.001 |
| ECONOMICAL | Groq | Llama 3.1 70B | $0.01 |
| OPTIMIZED | Anthropic | Claude 3.5 Haiku | $0.05 |
| PREMIUM | OpenAI | GPT-4o | $0.20 |
| ULTRA | OpenAI | GPT-4o (+ browsing) | $0.40 |

### Script Writing (Long-Form, 5–10 min video)

| Tier | Provider | Model | Est. Cost / Script |
|---|---|---|---|
| FREE | Groq | Llama 3.1 8B | $0.002 |
| ECONOMICAL | Groq | Llama 3.1 70B | $0.015 |
| OPTIMIZED | Anthropic | Claude 3.5 Haiku | $0.08 |
| PREMIUM | Anthropic | Claude Sonnet 4.5 | $0.35 |
| ULTRA | Anthropic | Claude Sonnet 4.5 | $0.50 |

### Script Writing (Short-Form, 30–60 sec)

| Tier | Provider | Model | Est. Cost / Script |
|---|---|---|---|
| FREE | Groq | Llama 3.1 8B | $0.001 |
| ECONOMICAL | Groq | Llama 3.1 70B | $0.005 |
| OPTIMIZED | Groq | Llama 3.1 70B | $0.005 |
| PREMIUM | OpenAI | GPT-4o mini | $0.01 |
| ULTRA | OpenAI | GPT-4o | $0.05 |

### Title / Hook Generation

| Tier | Provider | Model | Est. Cost / Run |
|---|---|---|---|
| FREE | Groq | Llama 3.1 8B | $0.001 |
| ECONOMICAL | Groq | Llama 3.1 70B | $0.005 |
| OPTIMIZED | Anthropic | Claude 3.5 Haiku | $0.02 |
| PREMIUM | OpenAI | GPT-4o | $0.08 |
| ULTRA | OpenAI | GPT-4o | $0.10 |

### Translation EN↔ES (per 1000 words)

| Tier | Provider | Model | Est. Cost / 1K Words |
|---|---|---|---|
| FREE | Blocked | — | — |
| ECONOMICAL | Groq | Llama 3.1 70B | $0.02 |
| OPTIMIZED | Anthropic | Claude 3.5 Haiku | $0.08 |
| PREMIUM | Anthropic | Claude Sonnet 4.5 | $0.20 |
| ULTRA | Anthropic | Claude Sonnet 4.5 | $0.25 |

### Voice Generation (per 1 min audio)

| Tier | Provider | Model / Voice | Est. Cost / Min |
|---|---|---|---|
| FREE | Coqui TTS | XTTS v2 (self-hosted) | ~$0.001 (compute) |
| ECONOMICAL | OpenAI TTS | tts-1 (nova) | $0.015 |
| OPTIMIZED | OpenAI TTS | tts-1-hd (shimmer) | $0.030 |
| PREMIUM | ElevenLabs | Multilingual v2 | $0.090 |
| ULTRA | ElevenLabs | v2 (cloned voice) | $0.120 |

### Image Generation (per image)

| Tier | Provider | Model | Est. Cost / Image |
|---|---|---|---|
| FREE | Stability AI | SDXL Turbo | $0.002 |
| ECONOMICAL | Stability AI | SDXL 1.0 | $0.005 |
| OPTIMIZED | Stability AI | SDXL 1.0 + refiner | $0.010 |
| PREMIUM | OpenAI | DALL-E 3 (HD) | $0.080 |
| ULTRA | OpenAI | DALL-E 3 (HD, natural) | $0.080 |

### Video Generation (per 4-sec clip)

| Tier | Provider | Model | Est. Cost / Clip |
|---|---|---|---|
| FREE | Blocked | — | — |
| ECONOMICAL | Blocked | — | — |
| OPTIMIZED | Blocked | — | — |
| PREMIUM | Opt-in only | Kling (standard) | $0.50 |
| ULTRA | Runway | Gen-3 Alpha Turbo | $0.75 |

### Rendering (per video minute of output)

| Tier | Tool | Profile | Est. Cost / Min |
|---|---|---|---|
| FREE | ffmpeg | libx264, CRF 28 | ~$0.001 (compute) |
| ECONOMICAL | ffmpeg | libx264, CRF 23 | ~$0.001 |
| OPTIMIZED | ffmpeg | libx264 high, CRF 20 | ~$0.002 |
| PREMIUM | ffmpeg | dual encode VP9+H264 | ~$0.003 |
| ULTRA | ffmpeg | AV1 multi-pass | ~$0.005 |

### Analytics Summarization (per channel/week)

| Tier | Provider | Model | Est. Cost / Run |
|---|---|---|---|
| FREE | Groq | Llama 3.1 8B | $0.003 |
| ECONOMICAL | Groq | Llama 3.1 70B | $0.010 |
| OPTIMIZED | Anthropic | Claude 3.5 Haiku | $0.040 |
| PREMIUM | OpenAI | GPT-4o | $0.150 |
| ULTRA | OpenAI | GPT-4o (long context) | $0.200 |

### Content Recommendations (per channel/week)

| Tier | Provider | Model | Est. Cost / Run |
|---|---|---|---|
| FREE | Groq | Llama 3.1 8B | $0.002 |
| ECONOMICAL | Groq | Llama 3.1 70B | $0.008 |
| OPTIMIZED | Anthropic | Claude 3.5 Haiku | $0.030 |
| PREMIUM | OpenAI | GPT-4o | $0.120 |
| ULTRA | Anthropic | Claude Sonnet 4.5 | $0.150 |

---

## Escalation and Downgrade Rules Reference

### Escalation Triggers

| Trigger | From Tier | To Tier | Condition |
|---|---|---|---|
| Token limit hit | FREE | ECONOMICAL | Script exceeds 500 token limit 3x |
| Quality feedback | ECONOMICAL | OPTIMIZED | Operator marks output quality < 5/10 on 3 videos |
| Hero content flag | OPTIMIZED | PREMIUM | Content marked as `content_type: hero` |
| AI video request | PREMIUM | ULTRA | Video generation task requested with budget headroom |
| Provider rate limit | Any | Next | Primary provider rate-limited; fallback is higher quality |

### Downgrade Triggers

| Trigger | From Tier | To Tier | Condition |
|---|---|---|---|
| Budget threshold | ECONOMICAL | FREE | Daily budget exhausted |
| Monthly spend warning | OPTIMIZED | ECONOMICAL | 80% of monthly budget used before month end |
| Provider sustained error | PREMIUM | OPTIMIZED | ElevenLabs rate limited 3x in 1 hour |
| Video budget cap hit | ULTRA | PREMIUM | Per-video AI spend exceeds operator cap |

---

## Tier Implementation Notes

### Tier Config Schema

```typescript
interface TierConfig {
  tier: 'FREE' | 'ECONOMICAL' | 'OPTIMIZED' | 'PREMIUM' | 'ULTRA';
  providers: Record<TaskType, ProviderConfig>;
  limits: {
    videosPerDay: number | null;           // null = unlimited
    tokensPerScript: number;
    languagesSupported: string[];
    videoGenerationEnabled: boolean;
    voiceCloningEnabled: boolean;
  };
  budgetGovernance: {
    dailySoftCap: number;                  // alert at this threshold
    dailyHardCap: number;                  // block at this threshold
    escalationEnabled: boolean;
    downgradeEnabled: boolean;
  };
  queuePriority: number;                  // 1 (low) to 10 (critical)
}
```

### Per-Channel Tier Overrides

Operators can override the tier at the channel level or per-task level:

```typescript
// Channel-level: channel uses OPTIMIZED for everything except scripts
channel.tierOverrides = {
  'script-writing-long': 'PREMIUM',
  '*': 'OPTIMIZED',
};

// Workflow-level: specific autopilot workflow uses ECONOMICAL
workflow.tierOverride = 'ECONOMICAL';
```

Overrides are stored in `tier_overrides` table and applied by the Cost & Tier Engine before routing.

---

*This document is part of the Faceless Viral OS founding blueprint series. Cross-reference: `06-system-architecture.md`, `07-core-modules.md`, `09-model-routing-engine.md`.*
