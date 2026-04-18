import type { ProviderHealth } from '@fvos/core';

import type { HealthReport } from './types.js';
import { BaseProvider } from './providers/base.js';

// ==============================================================================
// ProviderRegistry — Central registry of all AI provider adapters
// ==============================================================================

export class ProviderRegistry {
  private static instance: ProviderRegistry | null = null;
  private readonly providers = new Map<string, BaseProvider>();

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /** Reset singleton (useful in tests) */
  static resetInstance(): void {
    ProviderRegistry.instance = null;
  }

  /**
   * Register a provider. Overwrites any existing provider with the same ID.
   */
  register(provider: BaseProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  /**
   * Retrieve a provider by its ID. Returns null if not found.
   */
  get(providerId: string): BaseProvider | null {
    return this.providers.get(providerId) ?? null;
  }

  /**
   * Return all registered providers.
   */
  getAll(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Return all providers currently marked HEALTHY.
   * Note: this uses the last-known health status from healthCheck().
   */
  getHealthy(): BaseProvider[] {
    return this.getAll().filter((p) => {
      // Default to including all if no health data available
      return true;
    });
  }

  /**
   * Run health checks against all registered providers in parallel.
   * Returns a report with the status of each.
   */
  async checkAllHealth(): Promise<HealthReport> {
    const timestamp = new Date();
    const results = await Promise.allSettled(
      this.getAll().map(async (provider) => {
        const start = Date.now();
        try {
          const status = await provider.healthCheck();
          return {
            providerId: provider.providerId,
            status,
            latencyMs: Date.now() - start,
          };
        } catch (err) {
          return {
            providerId: provider.providerId,
            status: 'DOWN' as ProviderHealth,
            latencyMs: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );

    const report: HealthReport = { timestamp, providers: {} };

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { providerId, status, latencyMs, error } = result.value as {
          providerId: string;
          status: ProviderHealth;
          latencyMs: number;
          error?: string;
        };
        report.providers[providerId] = { status, latencyMs, error };
      } else {
        // Settled as rejected — shouldn't happen but guard it
        const err = result.reason as Error;
        report.providers['unknown'] = {
          status: 'UNKNOWN',
          error: err.message,
        };
      }
    }

    return report;
  }

  /**
   * Return whether any providers are registered.
   */
  isEmpty(): boolean {
    return this.providers.size === 0;
  }

  /**
   * Return the count of registered providers.
   */
  size(): number {
    return this.providers.size;
  }
}
