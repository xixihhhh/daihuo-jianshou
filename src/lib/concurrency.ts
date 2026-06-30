/**
 * Bounded-concurrency map (no dependencies, order-preserving, unit-testable).
 * Uses `limit` workers that each pull the next item in turn, avoiding a thundering-herd
 * against downstream APIs / connection pools while still being faster than serial execution.
 * Results are returned in input order (results[idx]). If any fn throws, the whole call rejects.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const n = Math.max(1, Math.min(limit, items.length));

  async function worker(): Promise<void> {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}
