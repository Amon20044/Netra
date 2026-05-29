/** State shared between the breaker and its backing store. */
export interface CircuitState {
  /** Timestamps (ms) of recent failures within the rolling window. */
  failures: number[];
  /** When the circuit was opened (ms), or null if closed. */
  openedAt: number | null;
}

/**
 * Pluggable storage for circuit state. The default is process-memory, keyed by
 * a string (e.g. per-route). Swap in a Redis-backed implementation for
 * multi-instance deployments.
 */
export interface CircuitStore {
  load(key: string): CircuitState;
  save(key: string, state: CircuitState): void;
}

export class MemoryCircuitStore implements CircuitStore {
  private states = new Map<string, CircuitState>();

  load(key: string): CircuitState {
    return this.states.get(key) ?? { failures: [], openedAt: null };
  }

  save(key: string, state: CircuitState): void {
    this.states.set(key, state);
  }
}

/** Shared default store instance. */
export const defaultCircuitStore = new MemoryCircuitStore();
