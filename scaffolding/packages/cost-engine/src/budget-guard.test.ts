/**
 * Unit tests for BudgetGuard
 *
 * Tests:
 * - check() returns allowed: true when under budget
 * - check() returns allowed: false when over budget
 * - check() returns correct alert levels (NONE / SOFT / HARD)
 * - enforce() throws BudgetExceededError when over budget
 * - enforce() resolves when under budget
 * - getStatus() returns accurate utilization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BudgetGuard, BudgetExceededError } from './budget-guard.js';

// ==============================================================================
// Mocks
// ==============================================================================

function makeDb(budget: { amountUsd: number; alertThreshold: number; hardStop: boolean } | null) {
  return {
    budget: {
      findFirst: vi.fn().mockResolvedValue(
        budget
          ? {
              ...budget,
              amountUsd: { toNumber: () => budget.amountUsd },
              alertThreshold: { toNumber: () => budget.alertThreshold },
            }
          : null,
      ),
    },
    channel: {
      findUnique: vi.fn().mockResolvedValue(
        budget ? { monthlyBudgetUsd: { toNumber: () => budget.amountUsd } } : null,
      ),
    },
  };
}

function makeLedger(spentUsd: number) {
  return {
    getChannelSpend: vi.fn().mockResolvedValue({
      totalCostUsd: spentUsd,
      entriesCount: 10,
    }),
  };
}

// ==============================================================================
// Tests
// ==============================================================================

describe('BudgetGuard', () => {
  const channelId = 'chan-test-001';

  // --------------------------------------------------------------------------
  // check()
  // --------------------------------------------------------------------------

  describe('check()', () => {
    it('returns allowed: true and NONE alert when well under budget', async () => {
      const db = makeDb({ amountUsd: 100, alertThreshold: 0.8, hardStop: true });
      const ledger = makeLedger(20); // 20% used
      const guard = new BudgetGuard(db as never, ledger as never);

      const result = await guard.check(channelId, 5);

      expect(result.allowed).toBe(true);
      expect(result.alertLevel).toBe('NONE');
      expect(result.remainingBudget).toBeCloseTo(80, 1); // 100 - 20 = 80
      expect(result.utilizationPercent).toBeCloseTo(20, 0);
    });

    it('returns allowed: true with SOFT alert when above alertThreshold', async () => {
      const db = makeDb({ amountUsd: 100, alertThreshold: 0.8, hardStop: true });
      const ledger = makeLedger(85); // 85% used (above 80% threshold)
      const guard = new BudgetGuard(db as never, ledger as never);

      const result = await guard.check(channelId, 5);

      // Still allowed (not over hard 100% limit), but soft alert
      expect(result.allowed).toBe(true);
      expect(result.alertLevel).toBe('SOFT');
      expect(result.utilizationPercent).toBeCloseTo(85, 0);
    });

    it('returns allowed: false and HARD alert when estimated cost would exceed budget', async () => {
      const db = makeDb({ amountUsd: 100, alertThreshold: 0.8, hardStop: true });
      const ledger = makeLedger(95); // 95% used
      const guard = new BudgetGuard(db as never, ledger as never);

      // Requesting $10 more when only $5 remains
      const result = await guard.check(channelId, 10);

      expect(result.allowed).toBe(false);
      expect(result.alertLevel).toBe('HARD');
      expect(result.reason).toContain('budget');
    });

    it('returns allowed: true even at 100% when hardStop is false', async () => {
      const db = makeDb({ amountUsd: 100, alertThreshold: 0.8, hardStop: false });
      const ledger = makeLedger(100); // 100% used
      const guard = new BudgetGuard(db as never, ledger as never);

      const result = await guard.check(channelId, 5);

      // hardStop: false means we don't block
      expect(result.allowed).toBe(true);
    });

    it('returns allowed: true when no budget is configured (permissive default)', async () => {
      const db = makeDb(null);
      // When channel also has no budget config
      db.channel.findUnique = vi.fn().mockResolvedValue(null);
      const ledger = makeLedger(0);
      const guard = new BudgetGuard(db as never, ledger as never);

      const result = await guard.check(channelId, 50);

      expect(result.allowed).toBe(true);
    });

    it('returns utilization and remaining budget values', async () => {
      const db = makeDb({ amountUsd: 200, alertThreshold: 0.7, hardStop: true });
      const ledger = makeLedger(60); // 30% used, $140 remaining
      const guard = new BudgetGuard(db as never, ledger as never);

      const result = await guard.check(channelId, 10);

      expect(result.remainingBudget).toBeCloseTo(140, 1);
      expect(result.estimatedCost).toBe(10);
      expect(result.utilizationPercent).toBeCloseTo(30, 0);
    });
  });

  // --------------------------------------------------------------------------
  // enforce()
  // --------------------------------------------------------------------------

  describe('enforce()', () => {
    it('resolves without throwing when budget is available', async () => {
      const db = makeDb({ amountUsd: 100, alertThreshold: 0.8, hardStop: true });
      const ledger = makeLedger(10);
      const guard = new BudgetGuard(db as never, ledger as never);

      await expect(guard.enforce(channelId, 5)).resolves.toBeUndefined();
    });

    it('throws BudgetExceededError when budget is exhausted and hardStop is true', async () => {
      const db = makeDb({ amountUsd: 100, alertThreshold: 0.8, hardStop: true });
      const ledger = makeLedger(95);
      const guard = new BudgetGuard(db as never, ledger as never);

      await expect(guard.enforce(channelId, 20)).rejects.toThrow(BudgetExceededError);
    });

    it('BudgetExceededError includes channel ID and remaining budget', async () => {
      const db = makeDb({ amountUsd: 100, alertThreshold: 0.8, hardStop: true });
      const ledger = makeLedger(98);
      const guard = new BudgetGuard(db as never, ledger as never);

      try {
        await guard.enforce(channelId, 10);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(BudgetExceededError);
        const budgetErr = err as BudgetExceededError;
        expect(budgetErr.channelId).toBe(channelId);
        expect(budgetErr.remainingBudget).toBeCloseTo(2, 1);
      }
    });

    it('does NOT throw when hardStop is false even if over budget', async () => {
      const db = makeDb({ amountUsd: 100, alertThreshold: 0.8, hardStop: false });
      const ledger = makeLedger(110); // Over budget!
      const guard = new BudgetGuard(db as never, ledger as never);

      // Should NOT throw because hardStop is disabled
      await expect(guard.enforce(channelId, 10)).resolves.toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // getStatus()
  // --------------------------------------------------------------------------

  describe('getStatus()', () => {
    it('returns complete budget status', async () => {
      const db = makeDb({ amountUsd: 500, alertThreshold: 0.75, hardStop: true });
      const ledger = makeLedger(200);
      const guard = new BudgetGuard(db as never, ledger as never);

      const status = await guard.getStatus(channelId);

      expect(status).toMatchObject({
        channelId,
        budgetUsd: 500,
        spentUsd: 200,
        remainingUsd: 300,
        utilizationPercent: 40,
        alertLevel: 'NONE',
        hardStopEnabled: true,
      });
    });

    it('shows SOFT alert level at 85% utilization', async () => {
      const db = makeDb({ amountUsd: 100, alertThreshold: 0.8, hardStop: true });
      const ledger = makeLedger(85);
      const guard = new BudgetGuard(db as never, ledger as never);

      const status = await guard.getStatus(channelId);

      expect(status.alertLevel).toBe('SOFT');
      expect(status.utilizationPercent).toBeCloseTo(85, 0);
    });
  });
});
