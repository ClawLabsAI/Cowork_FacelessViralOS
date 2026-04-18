import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '@fvos/core';
import { ProviderRegistry, OpenAIProvider, AnthropicProvider, ModelRouter } from '@fvos/ai-router';
import { prisma } from '@fvos/db';

import { processScriptGeneration } from './processors/script-generation.js';
import type { ScriptGenerationJobData } from './types.js';

// ==============================================================================
// Worker Bootstrap — BullMQ Queue Processors
// ==============================================================================

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

// ---------------------------------------------------------------------------
// Redis connection (shared across workers — BullMQ requires maxRetriesPerRequest: null)
// ---------------------------------------------------------------------------
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
});

connection.on('connect', () => console.log('Redis connected'));
connection.on('error', (err) => console.error('Redis error:', err));

// ---------------------------------------------------------------------------
// AI Provider Registry
// ---------------------------------------------------------------------------
function buildProviderRegistry(): ProviderRegistry {
  const registry = ProviderRegistry.getInstance();

  const openaiKey = process.env['OPENAI_API_KEY'];
  if (openaiKey) {
    registry.register(new OpenAIProvider({ apiKey: openaiKey }));
    console.log('Registered OpenAI provider');
  } else {
    console.warn('OPENAI_API_KEY not set — OpenAI provider not registered');
  }

  const anthropicKey = process.env['ANTHROPIC_API_KEY'];
  if (anthropicKey) {
    registry.register(new AnthropicProvider({ apiKey: anthropicKey }));
    console.log('Registered Anthropic provider');
  } else {
    console.warn('ANTHROPIC_API_KEY not set — Anthropic provider not registered');
  }

  if (registry.isEmpty()) {
    throw new Error('No AI providers configured. Set at least one API key (OPENAI_API_KEY or ANTHROPIC_API_KEY).');
  }

  return registry;
}

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------
function createWorker(
  queueName: string,
  processor: (job: Job) => Promise<unknown>,
  concurrency = 5,
): Worker {
  const worker = new Worker(queueName, processor, {
    connection,
    concurrency,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  });

  worker.on('completed', (job) => {
    console.log(`[${queueName}] Job ${job.id ?? 'unknown'} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[${queueName}] Job ${job?.id ?? 'unknown'} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error(`[${queueName}] Worker error:`, err);
  });

  return worker;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
async function start() {
  console.log('Starting Faceless Viral OS worker...');

  const registry = buildProviderRegistry();
  const router = new ModelRouter(registry, prisma);

  const workers: Worker[] = [];

  // Content queue — script generation, scene generation, etc.
  workers.push(
    createWorker(
      QUEUE_NAMES.CONTENT,
      async (job: Job) => {
        if (job.name === 'script-generation') {
          return processScriptGeneration(job as Job<ScriptGenerationJobData>, router);
        }
        throw new Error(`Unknown job type in content queue: ${job.name}`);
      },
      3, // concurrency
    ),
  );

  // Media queue — TTS, video render (processors to be implemented)
  workers.push(
    createWorker(
      QUEUE_NAMES.MEDIA,
      async (job: Job) => {
        throw new Error(`Media job processor not yet implemented for: ${job.name}`);
      },
      2,
    ),
  );

  // Publish queue
  workers.push(
    createWorker(
      QUEUE_NAMES.PUBLISH,
      async (job: Job) => {
        throw new Error(`Publish job processor not yet implemented for: ${job.name}`);
      },
      2,
    ),
  );

  // Analytics queue
  workers.push(
    createWorker(
      QUEUE_NAMES.ANALYTICS,
      async (job: Job) => {
        throw new Error(`Analytics job processor not yet implemented for: ${job.name}`);
      },
      5,
    ),
  );

  // Research queue
  workers.push(
    createWorker(
      QUEUE_NAMES.RESEARCH,
      async (job: Job) => {
        throw new Error(`Research job processor not yet implemented for: ${job.name}`);
      },
      2,
    ),
  );

  // Governance queue
  workers.push(
    createWorker(
      QUEUE_NAMES.GOVERNANCE,
      async (job: Job) => {
        throw new Error(`Governance job processor not yet implemented for: ${job.name}`);
      },
      1,
    ),
  );

  console.log(`Worker started. Listening on ${workers.length} queues.`);
  console.log('Queues:', workers.map((w) => w.name).join(', '));

  // ---------------------------------------------------------------------------
  // Graceful shutdown
  // ---------------------------------------------------------------------------
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Closing workers...`);

    await Promise.all(workers.map((w) => w.close()));
    await connection.quit();
    await prisma.$disconnect();

    console.log('Worker shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });
}

void start().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
