import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@fvos/db';
import type { Language, TierName } from '@fvos/core';
import { generateId, QUEUE_NAMES } from '@fvos/core';
import { CostEstimator, BudgetGuard, CostLedger } from '@fvos/cost-engine';

import { authenticate } from '../middleware/auth.js';
import type { ScriptGenerationJobData } from '../../src/types.js';

// ==============================================================================
// Scripts Routes — First Vertical Slice
// ==============================================================================

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const GenerateScriptBodySchema = z.object({
  channelId: z.string().min(1),
  ideaId: z.string().optional(),
  language: z.enum(['EN', 'ES']).default('EN'),
  format: z.enum(['listicle', 'story', 'tutorial', 'debate', 'review']).default('listicle'),
  tone: z.enum(['informative', 'entertaining', 'inspirational', 'serious', 'humorous']).default('informative'),
  targetDurationSeconds: z.number().int().min(30).max(3600).default(300),
  topic: z.string().min(3).max(500),
  tier: z.enum(['FREE', 'ECONOMICAL', 'OPTIMIZED', 'PREMIUM', 'ULTRA']).optional(),
  temperature: z.number().min(0).max(1).optional(),
});

const ListScriptsQuerySchema = z.object({
  channelId: z.string().min(1),
  status: z.enum(['DRAFT', 'APPROVED', 'PROCESSING', 'READY']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const ApproveBodySchema = z.object({
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Redis + BullMQ setup (lazy-initialized)
// ---------------------------------------------------------------------------

let redisConnection: IORedis | null = null;
let contentQueue: Queue | null = null;

function getContentQueue(): Queue {
  if (!contentQueue) {
    redisConnection = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    contentQueue = new Queue(QUEUE_NAMES.CONTENT, { connection: redisConnection });
  }
  return contentQueue;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function scriptRoutes(app: FastifyInstance): Promise<void> {
  const estimator = new CostEstimator();
  const ledger = new CostLedger(prisma);
  const budgetGuard = new BudgetGuard(prisma, ledger);

  // --------------------------------------------------------------------------
  // POST /api/v1/scripts/generate
  // --------------------------------------------------------------------------
  app.post(
    '/generate',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = GenerateScriptBodySchema.parse(request.body);
      const { userId } = request.user;

      // 1. Verify channel ownership
      const channel = await prisma.channel.findFirst({
        where: {
          id: body.channelId,
          OR: [{ userId }, { brand: { ownerId: userId } }],
        },
        include: { brand: true },
      });

      if (!channel) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Channel not found or you do not have access',
        });
      }

      const tier: TierName = body.tier ?? channel.tier;

      // 2. Pre-run cost estimation
      // Estimate: ~150 words/minute speech, so durationSeconds / 60 * 150 words
      const estimatedWords = Math.ceil((body.targetDurationSeconds / 60) * 150);
      const estimatedPrompt = `Write a ${estimatedWords}-word ${body.format} script about "${body.topic}"`;
      const costEstimate = estimator.estimateTextGeneration(
        estimatedPrompt,
        estimatedWords * 2, // generous token budget for script generation
        tier === 'FREE' || tier === 'ECONOMICAL' ? 'gpt-4o-mini' : 'gpt-4o',
      );

      // 3. Budget guard check
      const budgetCheck = await budgetGuard.check(
        body.channelId,
        costEstimate.estimatedCostWithBufferUsd,
      );

      if (!budgetCheck.allowed) {
        return reply.status(402).send({
          statusCode: 402,
          error: 'Budget Exceeded',
          message: budgetCheck.reason,
          remainingBudgetUsd: budgetCheck.remainingBudget,
          estimatedCostUsd: budgetCheck.estimatedCost,
          utilizationPercent: budgetCheck.utilizationPercent,
        });
      }

      // 4. Pre-create the Script record in DB (DRAFT status with empty content)
      const script = await prisma.script.create({
        data: {
          channelId: body.channelId,
          ideaId: body.ideaId ?? null,
          language: body.language as Language,
          content: '', // Will be filled by the worker
          wordCount: 0,
          modelUsed: '',
          costUsd: 0,
          tier,
        },
      });

      // 5. Queue the script-generation BullMQ job
      const correlationId = generateId();
      const jobData: ScriptGenerationJobData = {
        scriptId: script.id,
        channelId: body.channelId,
        userId,
        ideaId: body.ideaId,
        language: body.language as Language,
        format: body.format,
        tone: body.tone,
        targetDurationSeconds: body.targetDurationSeconds,
        topic: body.topic,
        tier,
        temperature: body.temperature,
        correlationId,
        brandContext: {
          name: channel.brand.name,
          niche: channel.brand.niche ?? undefined,
          toneDescription: channel.brand.toneDescription,
          primaryLanguage: channel.brand.primaryLanguage,
        },
      };

      const queue = getContentQueue();
      const job = await queue.add('script-generation', jobData, {
        jobId: `script:${script.id}:${correlationId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      });

      return reply.status(202).send({
        scriptId: script.id,
        jobId: job.id,
        status: 'queued',
        estimatedCostUsd: costEstimate.estimatedCostWithBufferUsd,
        budgetStatus: {
          remainingBudgetUsd: budgetCheck.remainingBudget,
          alertLevel: budgetCheck.alertLevel,
        },
        correlationId,
      });
    },
  );

  // --------------------------------------------------------------------------
  // GET /api/v1/scripts
  // --------------------------------------------------------------------------
  app.get(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const query = ListScriptsQuerySchema.parse(request.query);
      const { userId } = request.user;

      // Verify channel access
      const channel = await prisma.channel.findFirst({
        where: {
          id: query.channelId,
          OR: [{ userId }, { brand: { ownerId: userId } }],
        },
      });

      if (!channel) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Channel not found or access denied',
        });
      }

      const skip = (query.page - 1) * query.limit;

      const [scripts, total] = await Promise.all([
        prisma.script.findMany({
          where: {
            channelId: query.channelId,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: query.limit,
          include: {
            idea: { select: { title: true, hook: true } },
          },
        }),
        prisma.script.count({ where: { channelId: query.channelId } }),
      ]);

      return reply.status(200).send({
        data: scripts,
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
          hasNextPage: skip + scripts.length < total,
          hasPrevPage: query.page > 1,
        },
      });
    },
  );

  // --------------------------------------------------------------------------
  // GET /api/v1/scripts/:id
  // --------------------------------------------------------------------------
  app.get(
    '/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { userId } = request.user;

      const script = await prisma.script.findFirst({
        where: {
          id,
          channel: {
            OR: [{ userId }, { brand: { ownerId: userId } }],
          },
        },
        include: {
          idea: { select: { id: true, title: true, hook: true, format: true } },
          channel: { select: { id: true, name: true, platform: true, tier: true } },
        },
      });

      if (!script) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Script not found',
        });
      }

      return reply.status(200).send(script);
    },
  );

  // --------------------------------------------------------------------------
  // PATCH /api/v1/scripts/:id/approve
  // --------------------------------------------------------------------------
  app.patch(
    '/:id/approve',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = ApproveBodySchema.parse(request.body);
      const { userId } = request.user;

      // Verify ownership and that script has content to approve
      const script = await prisma.script.findFirst({
        where: {
          id,
          channel: {
            OR: [{ userId }, { brand: { ownerId: userId } }],
          },
        },
      });

      if (!script) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Script not found',
        });
      }

      if (!script.content || script.content.trim().length === 0) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'Cannot approve a script with no content. Wait for generation to complete.',
        });
      }

      const updated = await prisma.script.update({
        where: { id },
        data: {
          approvedAt: new Date(),
        },
      });

      void body; // notes field stored separately if needed

      return reply.status(200).send({
        id: updated.id,
        approvedAt: updated.approvedAt,
        message: 'Script approved successfully',
      });
    },
  );
}
