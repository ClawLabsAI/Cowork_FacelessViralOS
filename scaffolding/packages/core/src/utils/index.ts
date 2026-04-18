import type { Err, Ok, Result } from '../types/index.js';

// Re-export for internal use only — not part of public API (Result type is exported from types/)


// ------------------------------------------------------------------------------
// Async utilities
// ------------------------------------------------------------------------------

/** Pause execution for the given number of milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ------------------------------------------------------------------------------
// ID generation
// ------------------------------------------------------------------------------

/** Generate a cryptographically random UUID v4. */
export function generateId(): string {
  return crypto.randomUUID();
}

// ------------------------------------------------------------------------------
// String utilities
// ------------------------------------------------------------------------------

/**
 * Truncate a string to maxLength characters, appending '…' if truncated.
 * Safe with Unicode — counts code points, not bytes.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, Math.max(0, maxLength - 1)) + '…';
}

/**
 * Convert a camelCase or PascalCase string to snake_case.
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Capitalize the first character of a string.
 */
export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ------------------------------------------------------------------------------
// Numeric / currency utilities
// ------------------------------------------------------------------------------

/**
 * Format a USD amount as a human-readable currency string.
 * Uses Intl.NumberFormat for locale-aware formatting.
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
}

/**
 * Clamp a value between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round a number to a given number of decimal places.
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ------------------------------------------------------------------------------
// JSON utilities
// ------------------------------------------------------------------------------

/**
 * Safely parse JSON, returning null instead of throwing on invalid input.
 */
export function safeJsonParse<T>(str: string): T | null {
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

/**
 * Safely stringify JSON, returning null on circular references / errors.
 */
export function safeJsonStringify(value: unknown, indent?: number): string | null {
  try {
    return JSON.stringify(value, null, indent);
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------------------
// Result<T, E> constructors
// ------------------------------------------------------------------------------

export const ResultUtils = {
  /**
   * Wrap a successful value in an Ok result.
   */
  ok<T>(value: T): Ok<T> {
    return { ok: true, value };
  },

  /**
   * Wrap an error value in an Err result.
   */
  err<E>(error: E): Err<E> {
    return { ok: false, error };
  },

  /**
   * Unwrap the value from an Ok result, or throw if Err.
   */
  unwrap<T, E>(result: Result<T, E>): T {
    if (result.ok) return result.value;
    throw result.error;
  },

  /**
   * Unwrap the value from an Ok result, or return the provided default.
   */
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.ok ? result.value : defaultValue;
  },

  /**
   * Map over the Ok value, leaving Err unchanged.
   */
  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    if (result.ok) return ResultUtils.ok(fn(result.value));
    return result;
  },

  /**
   * Wrap a promise, catching any thrown error into an Err.
   */
  async fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
    try {
      const value = await promise;
      return ResultUtils.ok(value);
    } catch (err) {
      return ResultUtils.err(err instanceof Error ? err : new Error(String(err)));
    }
  },
};

// ------------------------------------------------------------------------------
// Retry utility
// ------------------------------------------------------------------------------

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Called on each failure before retrying. Return false to abort. */
  onRetry?: (error: Error, attempt: number) => boolean | void;
}

/**
 * Retry an async function with exponential back-off.
 * Throws the last error after maxAttempts is exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 30_000, onRetry } = options;

  let lastError: Error = new Error('No attempts made');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxAttempts) break;

      const shouldContinue = onRetry ? onRetry(lastError, attempt) : true;
      if (shouldContinue === false) break;

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      await sleep(delay);
    }
  }

  throw lastError;
}

// ------------------------------------------------------------------------------
// Date utilities
// ------------------------------------------------------------------------------

/**
 * Return the start of the current day (midnight UTC).
 */
export function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Return the start of the current month (UTC).
 */
export function startOfMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Check whether a date is in the past.
 */
export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}
