import type { Job } from 'bullmq';
import { prisma } from '@fvos/db';
import type { ModelRouter } from '@fvos/ai-router';
import { CostLedger } from '@fvos/cost-engine';
import { WORDS_PER_MINUTE_SPEECH } from '@fvos/core';

import type { ScriptGenerationJobData, ScriptGenerationResult } from '../types.js';

// ==============================================================================
// Script Generation Processor — Core of the first vertical slice
// ==============================================================================

const ledger = new CostLedger(prisma);

/**
 * Process a script-generation BullMQ job.
 *
 * Flow:
 *  1. Load channel + tier config from DB
 *  2. Load the pre-created Script record
 *  3. Build system + user prompts from context
 *  4. Call ModelRouter.generate() → get script content
 *  5. Parse and validate the generated script
 *  6. Update Script record in DB
 *  7. Record cost in CostLedger
 *  8. Return result metadata
 */
export async function processScriptGeneration(
  job: Job<ScriptGenerationJobData>,
  router: ModelRouter,
): Promise<ScriptGenerationResult> {
  const data = job.data;

  // --------------------------------------------------------------------------
  // 1. Load channel + tier config
  // --------------------------------------------------------------------------
  const channel = await prisma.channel.findUnique({
    where: { id: data.channelId },
    include: { brand: true },
  });

  if (!channel) {
    throw new Error(`Channel not found: ${data.channelId}`);
  }

  // --------------------------------------------------------------------------
  // 2. Load pre-created Script record
  // --------------------------------------------------------------------------
  const script = await prisma.script.findUnique({
    where: { id: data.scriptId },
  });

  if (!script) {
    throw new Error(`Script record not found: ${data.scriptId}`);
  }

  // --------------------------------------------------------------------------
  // 3. Build prompts
  // --------------------------------------------------------------------------
  const targetWords = Math.ceil((data.targetDurationSeconds / 60) * WORDS_PER_MINUTE_SPEECH);

  const systemPrompt = buildSystemPrompt({
    brandName: data.brandContext.name,
    niche: data.brandContext.niche,
    toneDescription: data.brandContext.toneDescription,
    language: data.language,
    platform: channel.platform,
  });

  const userPrompt = buildUserPrompt({
    topic: data.topic,
    format: data.format,
    tone: data.tone,
    targetWords,
    language: data.language,
    platform: channel.platform,
  });

  // --------------------------------------------------------------------------
  // 4. Route + generate via ModelRouter
  // --------------------------------------------------------------------------
  await job.updateProgress(10);

  const startMs = Date.now();

  const generationResult = await router.generate({
    taskType: 'SCRIPT_GENERATION',
    tier: data.tier,
    language: data.language,
    platform: channel.platform,
    channelId: data.channelId,
    systemPrompt,
    userPrompt,
    maxTokens: Math.min(targetWords * 2, 4096),
    temperature: data.temperature ?? 0.72,
  });

  await job.updateProgress(60);

  const latencyMs = Date.now() - startMs;

  // --------------------------------------------------------------------------
  // 5. Parse and validate generated script
  // --------------------------------------------------------------------------
  const cleanedContent = parseScriptContent(generationResult.content);
  const wordCount = countWords(cleanedContent);

  // Validate minimum quality
  if (wordCount < 50) {
    throw new Error(
      `Generated script is too short (${wordCount} words). Minimum is 50 words. ` +
      `Provider: ${generationResult.providerId}/${generationResult.modelId}`,
    );
  }

  // --------------------------------------------------------------------------
  // 6. Update Script record in DB
  // --------------------------------------------------------------------------
  await prisma.script.update({
    where: { id: data.scriptId },
    data: {
      content: cleanedContent,
      wordCount,
      modelUsed: `${generationResult.providerId}/${generationResult.modelId}`,
      costUsd: generationResult.actualCostUsd,
      tier: data.tier,
    },
  });

  await job.updateProgress(80);

  // --------------------------------------------------------------------------
  // 7. Record cost in CostLedger
  // --------------------------------------------------------------------------
  await ledger.record({
    channelId: data.channelId,
    provider: generationResult.providerId,
    model: generationResult.modelId,
    taskType: 'SCRIPT_GENERATION',
    tokensIn: generationResult.tokensIn,
    tokensOut: generationResult.tokensOut,
    costUsd: generationResult.actualCostUsd,
    tier: data.tier,
    metadata: {
      scriptId: data.scriptId,
      correlationId: data.correlationId,
      wordCount,
      targetWords,
      format: data.format,
      tone: data.tone,
      latencyMs,
    },
  });

  await job.updateProgress(100);

  // --------------------------------------------------------------------------
  // 8. Return result
  // --------------------------------------------------------------------------
  const result: ScriptGenerationResult = {
    scriptId: data.scriptId,
    channelId: data.channelId,
    wordCount,
    actualCostUsd: generationResult.actualCostUsd,
    modelUsed: `${generationResult.providerId}/${generationResult.modelId}`,
    providerId: generationResult.providerId,
    tokensIn: generationResult.tokensIn,
    tokensOut: generationResult.tokensOut,
    latencyMs,
    correlationId: data.correlationId,
  };

  console.log(
    `[script-generation] Completed scriptId=${data.scriptId} ` +
    `words=${wordCount} cost=$${generationResult.actualCostUsd.toFixed(4)} ` +
    `model=${result.modelUsed} latency=${latencyMs}ms`,
  );

  return result;
}

// ==============================================================================
// Prompt builders
// ==============================================================================

interface SystemPromptContext {
  brandName: string;
  niche?: string;
  toneDescription: string;
  language: string;
  platform: string;
}

function buildSystemPrompt(ctx: SystemPromptContext): string {
  const platformGuidelines = getPlatformGuidelines(ctx.platform);

  return `You are an expert video script writer for "${ctx.brandName}", a ${ctx.niche ? `${ctx.niche} ` : ''}content brand.

## Brand Voice
${ctx.toneDescription}

## Platform: ${ctx.platform}
${platformGuidelines}

## Output Format
Write the script in PLAIN TEXT only — no markdown, no headers, no asterisks, no special formatting.
Write as if narrating directly to camera: conversational, natural, engaging.
Language: ${ctx.language === 'ES' ? 'Spanish (Latin American)' : 'English'}.

Structure the script with:
- A hook (first 5–10 seconds that grabs attention immediately)
- Main content (structured, value-packed body)
- Clear call to action at the end

IMPORTANT: Output ONLY the script text, nothing else. No title, no scene descriptions, no [PAUSE] markers, no timestamps.`;
}

interface UserPromptContext {
  topic: string;
  format: string;
  tone: string;
  targetWords: number;
  language: string;
  platform: string;
}

function buildUserPrompt(ctx: UserPromptContext): string {
  const formatGuidance = getFormatGuidance(ctx.format);
  const toneGuidance = getToneGuidance(ctx.tone);

  return `Write a ${ctx.format} video script about: "${ctx.topic}"

Target length: approximately ${ctx.targetWords} words (${Math.ceil(ctx.targetWords / WORDS_PER_MINUTE_SPEECH * 60)} seconds of speech)
Tone: ${toneGuidance}
Format: ${formatGuidance}

Write the complete script now:`;
}

// ==============================================================================
// Platform guidelines
// ==============================================================================

function getPlatformGuidelines(platform: string): string {
  switch (platform) {
    case 'YOUTUBE':
      return `- Long-form content (5–20 minutes typical)
- Strong hook in first 30 seconds to reduce bounce rate
- Value-dense delivery — no filler
- Include mid-roll engagement cues ("Comment below if you agree...")
- End with subscribe CTA and mention of next video`;

    case 'TIKTOK':
      return `- Short, punchy content (30–90 seconds optimal)
- Hook MUST land within first 2 seconds or viewers swipe
- Fast pacing — new point every 5–8 seconds
- Trending, conversational language
- End with question or challenge to drive comments`;

    case 'INSTAGRAM':
      return `- Reels: 15–60 seconds for best reach
- Visual-first storytelling — script should work over B-roll
- Aspirational tone tends to perform well
- Strong first frame description
- End with save-worthy tip`;

    default:
      return '- Adapt content for the target platform.';
  }
}

function getFormatGuidance(format: string): string {
  const formats: Record<string, string> = {
    listicle: 'Numbered list of points (e.g., "5 reasons why...", "3 mistakes that...")',
    story: 'Narrative arc with conflict, journey, and resolution',
    tutorial: 'Step-by-step instructional walkthrough',
    debate: 'Present both sides, then deliver a clear verdict',
    review: 'Evaluation with pros, cons, and final recommendation',
  };
  return formats[format] ?? 'Engaging educational content';
}

function getToneGuidance(tone: string): string {
  const tones: Record<string, string> = {
    informative: 'Clear, authoritative, fact-based. Teach, don\'t preach.',
    entertaining: 'Fun, energetic, uses humor and relatable examples.',
    inspirational: 'Motivating, uplifting, personal growth-focused.',
    serious: 'Measured, respectful, appropriate for sensitive topics.',
    humorous: 'Light-hearted comedy — self-aware, witty, not sarcastic.',
  };
  return tones[tone] ?? 'Conversational and engaging';
}

// ==============================================================================
// Content utilities
// ==============================================================================

/**
 * Clean and normalize generated script content.
 * Removes markdown artifacts, excessive whitespace, etc.
 */
function parseScriptContent(raw: string): string {
  return raw
    .replace(/^#+\s+/gm, '') // Remove markdown headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove inline code
    .replace(/^\s*[-*]\s+/gm, '') // Remove bullet points
    .replace(/\[.*?\]/g, '') // Remove markdown links/brackets
    .replace(/\n{3,}/g, '\n\n') // Collapse excess newlines
    .trim();
}

/**
 * Count words in a string.
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}
