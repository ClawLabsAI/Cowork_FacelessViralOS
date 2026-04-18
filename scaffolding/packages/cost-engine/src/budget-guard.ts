import type { PrismaClient } from '@fvos/db';

import type { CostLedger } from './ledger.js';

// ==============================================================================
// BudgetGuard — Enforces per-channel spending limits
// ==============================================================================

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  remainingBudget: number;
  estimatedCost: number;
  utilizationPercent: number;
  alertLevel: 'NONE' | 'SOFT' | 'HARD';
}

export interface BudgetStatus {
  channelId: string;
  monthlyBudgetUsd: number;
  spentThisMonthUsd: number;
  remainingUsd: number;
  utilizationPercent: number;
  alertLevel: 'NONE' | 'SOFT' | 'HARD';
  hardStopEnabled: boolean;
  alertThreshold: number;
}

export class BudgetGuard {
  constructor(
    private readonly db: PrismaClient,
    private readonly ledger: CostLedger,
  ) {}

  /**
   * Check whether a proposed cost is within the channel's budget.
   * Does NOT throw — returns a result object.
   */
  async check(channelId: string, estimatedCost: number): Promise<BudgetCheckResult> {
    const status = await this.getStatus(channelId);

    const utilizationWithNewCost =
      ((status.spentThisMonthUsd + estimatedCost) / status.monthlyBudgetUsd) * 100;

    if (utilizationWithNewCost >= 100 && status.hardStopEnabled) {
      return {
        allowed: false,
        reason: `Budget exhausted: spent $${status.spentThisMonthUsd.toFixed(4)} of $${status.monthlyBudgetUsd.toFixed(2)} monthly budget`,
        remainingBudget: status.remainingUsd,
        estimatedCost,
        utilizationPercent: utilizationWithNewCost,
        alertLevel: 'HARD',
      };
    }

    if (utilizationWithNewCost >= status.alertThreshold * 100) {
      return {
        allowed: true,
        reason: `Budget alert: ${utilizationWithNewCost.toFixed(1)}% utilized (threshold: ${(status.alertThreshold * 100).toFixed(0)}%)`,
        remainingBudget: status.remainingUsd,
        estimatedCost,
        utilizationPercent: utilizationWithNewCost,
        alertLevel: 'SOFT',
      };
    }

    return {
      allowed: true,
      remainingBudget: status.remainingUsd,
      estimatedCost,
      utilizationPercent: utilizationWithNewCost,
      alertLevel: 'NONE',
    };
  }

  /**
   * Enforce budget: throws a BudgetExceededError if the cost would put
   * the channel over its hard-stop threshold.
   */
  async enforce(channelId: string, estimatedCost: number): Promise<void> {
    const result = await this.check(channelId, estimatedCost);

    if (!result.allowed) {
      throw new BudgetExceededError(
        result.reason ?? 'Budget exceeded',
        channelId,
        result.remainingBudget,
        estimatedCost,
        result.utilizationPercent,
      );
    }
  }

  /**
   * Get the current budget status for a channel.
   */
  async getStatus(channelId: string): Promise<BudgetStatus> {
    const [channel, spentThisMonth] = await Promise.all([
      this.db.channel.findUnique({
        where: { id: channelId },
        select: { monthlyBudgetUsd: true },
      }),
      this.ledger.getCurrentMonthSpend(channelId),
    ]);

    // Get budget config (alert threshold, hard stop)
    const budget = await this.db.budget.findFirst({
      where: { entityType: 'CHANNEL', entityId: channelId, period: 'MONTHLY' },
    });

    const monthlyBudgetUsd = channel
      ? Number(channel.monthlyBudgetUsd)
      : budget
      ? Number(budget.amountUsd)
      : 25; // default

    const alertThreshold = budget ? Number(budget.alertThreshold) : 0.8;
    const hardStopEnabled = budget ? budget.hardStop : true;

    const remainingUsd = Math.max(0, monthlyBudgetUsd - spentThisMonth);
    const utilizationPercent =
      monthlyBudgetUsd > 0 ? (spentThisMonth / monthlyBudgetUsd) * 100 : 0;

    let alertLevel: 'NONE' | 'SOFT' | 'HARD' = 'NONE';
    if (utilizationPercent >= 100 && hardStopEnabled) {
      alertLevel = 'HARD';
    } else if (utilizationPercent >= alertThreshold * 100) {
      alertLevel = 'SOFT';
    }

    return {
      channelId,
      monthlyBudgetUsd,
      spentThisMonthUsd: spentThisMonth,
      remainingUsd,
      utilizationPercent,
      alertLevel,
      hardStopEnabled,
      alertThreshold,
    };
  }
}

// ==============================================================================
// BudgetExceededError
// ==============================================================================

export class BudgetExceededError extends Error {
  constructor(
    message: string,
    public readonly channelId: string,
    public readonly remainingBudget: number,
    public readonly requestedCost: number,
    public readonly utilizationPercent: number,
  ) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}
