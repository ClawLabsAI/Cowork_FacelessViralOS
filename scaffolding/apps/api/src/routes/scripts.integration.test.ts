/**
 * Integration test for the Script Generation Pipeline — First Vertical Slice
 *
 * Tests the full request path:
 *   POST /api/v1/scripts/generate
 *     → Auth middleware (JWT verify)
 *     → Channel ownership check
 *     → Cost estimation (CostEstimator)
 *     → Budget guard check (BudgetGuard)
 *     → Script pre-created in DB
 *     → BullMQ job enqueued
 *     → Response: 202 with scriptId, jobId, estimatedCostUsd
 *
 * Uses:
 * - Real Fastify server (in-memory)
 * - Mocked Prisma client (no real DB required)
 * - Mocked BullMQ Queue (no real Redis required)
 * - Real CostEstimator (no external calls)
 * - Mocked BudgetGuard
 *
 * Also tests error paths:
 * - Missing/invalid JWT → 401
 * - Channel not found → 404
 * - Budget exceeded → 402
 * - Invalid request body → 400
 * - Script not found → 404 on GET
 * - Cannot approve empty script → 409
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';

// ==============================================================================
// Mocks (set up before imports that use them)
// ==============================================================================

// Mock @fvos/db
vi.mock('@fvos/db', () => ({
  prisma: {
    channel: {
      findFirst: vi.fn(),
    },
    script: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock BullMQ Queue
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'mock-job-id-001' }),
  })),
}));

// Mock ioredis
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

// Mock BudgetGuard
vi.mock('@fvos/cost-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fvos/cost-engine')>();
  return {
    ...actual,
    BudgetGuard: vi.fn().mockImplementation(() => ({
      check: vi.fn().mockResolvedValue({
        allowed: true,
        remainingBudget: 80,
        estimatedCost: 0.02,
        utilizationPercent: 20,
        alertLevel: 'NONE',
      }),
    })),
  };
});

import { prisma } from '@fvos/db';
import { scriptRoutes } from './scripts.js';

// ==============================================================================
// Test server setup
// ==============================================================================

const JWT_SECRET = 'test-secret-key-for-integration-tests';
const MOCK_USER_ID = 'user-test-001';
const MOCK_CHANNEL_ID = 'chan-test-001';

function buildTestApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  // Register JWT plugin
  app.register(fastifyJwt, { secret: JWT_SECRET });

  // Register scripts routes
  app.register(scriptRoutes, { prefix: '/api/v1/scripts' });

  return app;
}

function signTestToken(payload = { userId: MOCK_USER_ID, email: 'test@fvos.local', role: 'OWNER' }) {
  // We need a signed token — create the app just for signing
  const signerApp = Fastify({ logger: false });
  signerApp.register(fastifyJwt, { secret: JWT_SECRET });
  // Return a pre-signed token using the library directly
  const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// ==============================================================================
// Test data fixtures
// ==============================================================================

const MOCK_CHANNEL = {
  id: MOCK_CHANNEL_ID,
  name: 'Test Channel',
  platform: 'YOUTUBE',
  tier: 'ECONOMICAL',
  userId: MOCK_USER_ID,
  brand: {
    id: 'brand-001',
    name: 'Test Brand',
    niche: 'personal finance',
    toneDescription: 'Informative, clear, and approachable.',
    primaryLanguage: 'EN',
    ownerId: MOCK_USER_ID,
  },
};

const MOCK_SCRIPT_CREATED = {
  id: 'script-test-001',
  channelId: MOCK_CHANNEL_ID,
  ideaId: null,
  language: 'EN',
  content: '',
  wordCount: 0,
  modelUsed: '',
  costUsd: 0,
  tier: 'ECONOMICAL',
  approvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_SCRIPT_WITH_CONTENT = {
  ...MOCK_SCRIPT_CREATED,
  content: 'This is a generated script about productivity hacks. Hook: Did you know that 90% of people fail at time management? Here are 5 proven strategies...',
  wordCount: 250,
  modelUsed: 'openai/gpt-4o-mini',
  costUsd: 0.0035,
};

// ==============================================================================
// Tests
// ==============================================================================

describe('Scripts API — Integration Tests', () => {
  let app: FastifyInstance;
  let validToken: string;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
    validToken = signTestToken();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // POST /api/v1/scripts/generate — Happy path
  // --------------------------------------------------------------------------

  describe('POST /api/v1/scripts/generate', () => {
    it('returns 202 with scriptId, jobId, estimatedCostUsd on valid request', async () => {
      // Setup mocks
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(MOCK_CHANNEL as never);
      vi.mocked(prisma.script.create).mockResolvedValue(MOCK_SCRIPT_CREATED as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scripts/generate',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          channelId: MOCK_CHANNEL_ID,
          language: 'EN',
          format: 'listicle',
          tone: 'informative',
          targetDurationSeconds: 300,
          topic: '5 productivity hacks that actually work',
          tier: 'ECONOMICAL',
        },
      });

      expect(response.statusCode).toBe(202);

      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body).toMatchObject({
        scriptId: 'script-test-001',
        jobId: expect.any(String),
        status: 'queued',
        estimatedCostUsd: expect.any(Number),
        correlationId: expect.any(String),
      });

      expect(body.estimatedCostUsd).toBeGreaterThan(0);
    });

    it('uses channel tier when no tier specified in body', async () => {
      vi.mocked(prisma.channel.findFirst).mockResolvedValue({
        ...MOCK_CHANNEL,
        tier: 'PREMIUM',
      } as never);
      vi.mocked(prisma.script.create).mockResolvedValue({
        ...MOCK_SCRIPT_CREATED,
        tier: 'PREMIUM',
      } as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scripts/generate',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          channelId: MOCK_CHANNEL_ID,
          topic: 'How to invest in index funds',
          // No tier specified — should default to channel.tier
        },
      });

      expect(response.statusCode).toBe(202);

      // Verify script was created with PREMIUM tier
      expect(prisma.script.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tier: 'PREMIUM' }),
        }),
      );
    });

    it('creates a Script record in the DB with empty content before queuing', async () => {
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(MOCK_CHANNEL as never);
      vi.mocked(prisma.script.create).mockResolvedValue(MOCK_SCRIPT_CREATED as never);

      await app.inject({
        method: 'POST',
        url: '/api/v1/scripts/generate',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          channelId: MOCK_CHANNEL_ID,
          topic: 'Test topic',
        },
      });

      expect(prisma.script.create).toHaveBeenCalledOnce();
      expect(prisma.script.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channelId: MOCK_CHANNEL_ID,
            content: '',
            wordCount: 0,
          }),
        }),
      );
    });

    it('includes budgetStatus in response', async () => {
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(MOCK_CHANNEL as never);
      vi.mocked(prisma.script.create).mockResolvedValue(MOCK_SCRIPT_CREATED as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scripts/generate',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          channelId: MOCK_CHANNEL_ID,
          topic: 'Test',
        },
      });

      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body.budgetStatus).toMatchObject({
        remainingBudgetUsd: expect.any(Number),
        alertLevel: expect.stringMatching(/^(NONE|SOFT|HARD)$/),
      });
    });
  });

  // --------------------------------------------------------------------------
  // POST /generate — Auth failures
  // --------------------------------------------------------------------------

  describe('POST /generate — authentication', () => {
    it('returns 401 when no Authorization header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scripts/generate',
        payload: { channelId: MOCK_CHANNEL_ID, topic: 'test' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 when JWT is malformed', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scripts/generate',
        headers: { authorization: 'Bearer this.is.not.a.valid.jwt' },
        payload: { channelId: MOCK_CHANNEL_ID, topic: 'test' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 when JWT is signed with wrong secret', async () => {
      const wrongToken = require('jsonwebtoken').sign(
        { userId: MOCK_USER_ID, email: 'test@fvos.local', role: 'OWNER' },
        'wrong-secret',
        { expiresIn: '1h' },
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scripts/generate',
        headers: { authorization: `Bearer ${wrongToken}` },
        payload: { channelId: MOCK_CHANNEL_ID, topic: 'test' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // --------------------------------------------------------------------------
  // POST /generate — Validation failures
  // --------------------------------------------------------------------------

  describe('POST /generate — validation', () => {
    it('returns 400 when channelId is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scripts/generate',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          // No channelId
          topic: 'Some topic',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when topic is empty string', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scripts/generate',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          channelId: MOCK_CHANNEL_ID,
          topic: '', // empty
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when targetDurationSeconds is below minimum (30)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scripts/generate',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          channelId: MOCK_CHANNEL_ID,
          topic: 'Valid topic',
          targetDurationSeconds: 5, // Too short
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when tier is not a valid enum value', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scripts/generate',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          channelId: MOCK_CHANNEL_ID,
          topic: 'Valid topic',
          tier: 'SUPER_PREMIUM_ULTRA_MAX', // Invalid
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // --------------------------------------------------------------------------
  // POST /generate — Business logic failures
  // --------------------------------------------------------------------------

  describe('POST /generate — business logic', () => {
    it('returns 404 when channel is not found', async () => {
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scripts/generate',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          channelId: 'non-existent-channel',
          topic: 'Test topic',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { message: string };
      expect(body.message).toContain('Channel not found');
    });

    it('returns 402 when budget is exceeded', async () => {
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(MOCK_CHANNEL as never);

      // Override BudgetGuard to deny the request
      const { BudgetGuard } = await import('@fvos/cost-engine');
      vi.mocked(BudgetGuard).mockImplementationOnce(() => ({
        check: vi.fn().mockResolvedValue({
          allowed: false,
          reason: 'Monthly budget of $100.00 exhausted. Spent: $95.00, Remaining: $5.00, Requested: $20.00.',
          remainingBudget: 5,
          estimatedCost: 20,
          utilizationPercent: 95,
          alertLevel: 'HARD',
        }),
        enforce: vi.fn(),
        getStatus: vi.fn(),
      }));

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scripts/generate',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          channelId: MOCK_CHANNEL_ID,
          topic: 'Expensive topic',
        },
      });

      expect(response.statusCode).toBe(402);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body.error).toBe('Budget Exceeded');
      expect(body.remainingBudgetUsd).toBe(5);
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/v1/scripts/:id
  // --------------------------------------------------------------------------

  describe('GET /api/v1/scripts/:id', () => {
    it('returns 200 with script details when found', async () => {
      vi.mocked(prisma.script.findFirst).mockResolvedValue({
        ...MOCK_SCRIPT_WITH_CONTENT,
        idea: null,
        channel: {
          id: MOCK_CHANNEL_ID,
          name: 'Test Channel',
          platform: 'YOUTUBE',
          tier: 'ECONOMICAL',
        },
      } as never);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/scripts/${MOCK_SCRIPT_WITH_CONTENT.id}`,
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body.id).toBe(MOCK_SCRIPT_WITH_CONTENT.id);
      expect(body.content).toContain('productivity hacks');
    });

    it('returns 404 when script is not found', async () => {
      vi.mocked(prisma.script.findFirst).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scripts/non-existent-script',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/v1/scripts (list)
  // --------------------------------------------------------------------------

  describe('GET /api/v1/scripts', () => {
    it('returns paginated list of scripts for a channel', async () => {
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(MOCK_CHANNEL as never);
      vi.mocked(prisma.script.findMany).mockResolvedValue([
        MOCK_SCRIPT_WITH_CONTENT,
        MOCK_SCRIPT_CREATED,
      ] as never);
      vi.mocked(prisma.script.count).mockResolvedValue(2);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/scripts?channelId=${MOCK_CHANNEL_ID}&page=1&limit=20`,
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        data: unknown[];
        meta: { total: number; page: number };
      };
      expect(body.data).toHaveLength(2);
      expect(body.meta.total).toBe(2);
      expect(body.meta.page).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // PATCH /api/v1/scripts/:id/approve
  // --------------------------------------------------------------------------

  describe('PATCH /api/v1/scripts/:id/approve', () => {
    it('returns 200 when approving a script with content', async () => {
      vi.mocked(prisma.script.findFirst).mockResolvedValue(MOCK_SCRIPT_WITH_CONTENT as never);
      vi.mocked(prisma.script.update).mockResolvedValue({
        ...MOCK_SCRIPT_WITH_CONTENT,
        approvedAt: new Date(),
      } as never);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/scripts/${MOCK_SCRIPT_WITH_CONTENT.id}/approve`,
        headers: { authorization: `Bearer ${validToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body.approvedAt).toBeTruthy();
    });

    it('returns 409 when trying to approve a script with no content (still generating)', async () => {
      vi.mocked(prisma.script.findFirst).mockResolvedValue(MOCK_SCRIPT_CREATED as never); // empty content

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/scripts/${MOCK_SCRIPT_CREATED.id}/approve`,
        headers: { authorization: `Bearer ${validToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { message: string };
      expect(body.message).toContain('no content');
    });

    it('returns 404 when script is not found', async () => {
      vi.mocked(prisma.script.findFirst).mockResolvedValue(null);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/scripts/ghost-script/approve',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
