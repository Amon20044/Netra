import { CIRCUIT_BREAKER_DEFAULTS } from "../constants/defaults.js";
import {
  defaultCircuitStore,
  type CircuitStore,
} from "./memoryCircuitStore.js";

export type CircuitStatus = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  key?: string;
  failureThreshold?: number;
  windowMs?: number;
  cooldownMs?: number;
  store?: CircuitStore;
  now?: () => number;
}

/**
 * A deliberately small circuit breaker. After `failureThreshold` failures
 * within `windowMs`, the circuit opens and `allowRequest()` returns false for
 * `cooldownMs`. After cooldown it goes half-open and permits a single trial;
 * a success closes it, a failure re-opens it.
 *
 * The server uses this to fall back to markdown when HTML generation keeps
 * failing, instead of repeatedly hammering a broken path.
 */
export class CircuitBreaker {
  private readonly key: string;
  private readonly failureThreshold: number;
  private readonly windowMs: number;
  private readonly cooldownMs: number;
  private readonly store: CircuitStore;
  private readonly now: () => number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.key = options.key ?? "default";
    this.failureThreshold =
      options.failureThreshold ?? CIRCUIT_BREAKER_DEFAULTS.failureThreshold;
    this.windowMs = options.windowMs ?? CIRCUIT_BREAKER_DEFAULTS.windowMs;
    this.cooldownMs = options.cooldownMs ?? CIRCUIT_BREAKER_DEFAULTS.cooldownMs;
    this.store = options.store ?? defaultCircuitStore;
    this.now = options.now ?? Date.now;
  }

  status(): CircuitStatus {
    const state = this.store.load(this.key);
    if (state.openedAt === null) return "closed";
    if (this.now() - state.openedAt >= this.cooldownMs) return "half-open";
    return "open";
  }

  /** True if a request may proceed right now. */
  allowRequest(): boolean {
    return this.status() !== "open";
  }

  recordSuccess(): void {
    this.store.save(this.key, { failures: [], openedAt: null });
  }

  recordFailure(): void {
    const t = this.now();
    const state = this.store.load(this.key);

    // If we were half-open, a failure immediately re-opens.
    if (state.openedAt !== null && t - state.openedAt >= this.cooldownMs) {
      this.store.save(this.key, { failures: [t], openedAt: t });
      return;
    }

    const failures = [...state.failures, t].filter(
      (ts) => t - ts < this.windowMs,
    );
    const openedAt =
      failures.length >= this.failureThreshold ? t : state.openedAt;
    this.store.save(this.key, { failures, openedAt });
  }

  reset(): void {
    this.store.save(this.key, { failures: [], openedAt: null });
  }
}
