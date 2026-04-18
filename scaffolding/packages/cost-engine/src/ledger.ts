import type { PrismaClient, TaskType, TierName, UsageRecord } from '@fvos/db';
import { startOfMonth, MINIMUM_COST_USD } from '@fvos/core';

// ==============================================================================
// CostLedger — Recording and querying AI usage costs
// ==============================================================================

export interface LedgerEntry {
  channelId: string;
  provider: string;
  model: string;
  taskType: TaskType;
  tokensIn: number;
  tokensOut: number;
  mediaSeconds?: number;
  costUsd: number;
  tier: TierName;
  metadata?: Record<string, unknown>;
}

export interface SpendSummary {
  totalCostUsd: number;
  recordCount: number;
  byTaskType: Record<string, number>;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
  averageCostPerRecord: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface Period {
  start: Date;
  end: Date;
}

export class CostLedger {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Record a usage event in the cost ledger.
   * Atomically updates the active ledger's running totals.
   */
  async record(entry: LedgerEntry): Promise<UsageRecord> {
    const cost = Math.max(entry.costUsd, MINIMUM_COST_USD);

    // Get or create the active ledger for this channel
    const ledger = await this.getOrCreateActiveLedger(entry.channelId);

    // Create usage record and update ledger totals in a transaction
    const [usageRecord] = await this.db.$transaction([
      this.db.usageRecord.create({
        data: {
          ledgerId: ledger.id,
          channelId: entry.channelId,
          provider: entry.provider,
          model: entry.model,
          taskType: entry.taskType as TaskType,
          tokensIn: entry.tokensIn,
          tokensOut: entry.tokensOut,
          mediaSeconds: entry.mediaSeconds ?? 0,
          costUsd: cost,
          tier: entry.tier as TierName,
          metadata: entry.metadata ?? {},
        },
      }),
      this.db.costLedger.update({
        where: { id: ledger.id },
        data: {
          spentUsd: { increment: cost },
          entriesCount: { increment: 1 },
        },
      }),
    ]);

    return usageRecord;
  }

  /**
   * Get aggregated spend for a channel over a time period.
   */
  async getChannelSpend(channelId: string, period: Period): Promise<SpendSummary> {
    const records = await this.db.usageRecord.findMany({
      where: {
        channelId,
        timestamp: { gte: period.start, lte: period.end },
      },
    });

    return this.aggregateRecords(records, period);
  }

  /**
   * Get aggregated spend for a specific provider over a time period.
   */
  async getProviderSpend(provider: string, period: Period): Promise<SpendSummary> {
    const records = await this.db.usageRecord.findMany({
      where: {
        provider,
        timestamp: { gte: period.start, lte: period.end },
      },
    });

    return this.aggregateRecords(records, period);
  }

  /**
   * Get or create the current active ledger for a channel (current calendar month).
   */
  async getOrCreateActiveLedger(channelId: string): Promise<{
    id: string;
    channelId: string;
    periodStart: Date;
    periodEnd: Date;
    budgetUsd: number;
    spentUsd: number;
  }> {
    const now = new Date();
    const periodStart = startOfMonth(now);
    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );

    // Load the channel's budget configuration
    const channel = await this.db.channel.findUnique({
      where: { id: channelId },
      select: { monthlyBudgetUsd: true },
    });

    const budgetUsd = channel ? Number(channel.monthlyBudgetUsd) : 25;

    const ledger = await this.db.costLedger.upsert({
      where: {
        // We need a unique constraint on channelId + periodStart — use findFirst instead
        id: 'sentinel-never-matches',
      },
      create: {
        channelId,
        periodStart,
        periodEnd,
        budgetUsd,
        spentUsd: 0,
        entriesCount: 0,
      },
      update: {},
    }).catch(async () => {
      // Upsert by unique key not available — use findFirst + create pattern
      const existing = await this.db.costLedger.findFirst({
        where: {
          channelId,
          periodStart: { lte: now },
          periodEnd: { gte: now },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) return existing;

      return this.db.costLedger.create({
        data: {
          channelId,
          periodStart,
          periodEnd,
          budgetUsd,
          spentUsd: 0,
          entriesCount: 0,
        },
      });
    });

    return {
      id: ledger.id,
      channelId: ledger.channelId,
      periodStart: ledger.periodStart,
      periodEnd: ledger.periodEnd,
      budgetUsd: Number(ledger.budgetUsd),
      spentUsd: Number(ledger.spentUsd),
    };
  }

  /**
   * Get current month's total spend for a channel (fast path).
   */
  async getCurrentMonthSpend(channelId: string): Promise<number> {
    const now = new Date();
    const periodStart = startOfMonth(now);

    const result = await this.db.usageRecord.aggregate({
      where: {
        channelId,
        timestamp: { gte: periodStart },
      },
      _sum: { costUsd: true },
    });

    return Number(result._sum.costUsd ?? 0);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private aggregateRecords(
    records: UsageRecord[],
    period: Period,
  ): SpendSummary {
    const byTaskType: Record<string, number> = {};
    const byProvider: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    let totalCostUsd = 0;

    for (const record of records) {
      const cost = Number(record.costUsd);
      totalCostUsd += cost;

      byTaskType[record.taskType] = (byTaskType[record.taskType] ?? 0) + cost;
      byProvider[record.provider] = (byProvider[record.provider] ?? 0) + cost;
      byModel[record.model] = (byModel[record.model] ?? 0) + cost;
    }

    return {
      totalCostUsd,
      recordCount: records.length,
      byTaskType,
      byProvider,
      byModel,
      averageCostPerRecord: records.length > 0 ? totalCostUsd / records.length : 0,
      periodStart: period.start,
      periodEnd: period.end,
    };
  }
}
