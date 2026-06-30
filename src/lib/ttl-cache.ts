/**
 * Lightweight TTL + LRU cache (no dependencies, unit-testable).
 * Used for scenarios like aggregated asset retrieval where the same key is requested repeatedly
 * within a short window, to avoid hammering third-party APIs and hitting rate limits.
 * The `now` function is injectable to facilitate TTL expiry testing (defaults to Date.now).
 */
export class TtlCache<V> {
  private m = new Map<string, { at: number; v: V }>();

  constructor(
    private readonly ttlMs: number,
    private readonly max: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): V | undefined {
    const e = this.m.get(key);
    if (!e) return undefined;
    if (this.now() - e.at > this.ttlMs) {
      this.m.delete(key);
      return undefined;
    }
    // LRU: on hit, move the entry to the end (Map preserves insertion order; delete evicts the least recently used)
    this.m.delete(key);
    this.m.set(key, e);
    return e.v;
  }

  set(key: string, v: V): void {
    this.m.delete(key);
    this.m.set(key, { at: this.now(), v });
    if (this.m.size > this.max) {
      const oldest = this.m.keys().next().value;
      if (oldest !== undefined) this.m.delete(oldest);
    }
  }

  get size(): number {
    return this.m.size;
  }

  clear(): void {
    this.m.clear();
  }
}
