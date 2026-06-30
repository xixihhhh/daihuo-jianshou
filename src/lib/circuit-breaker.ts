/**
 * Minimal circuit breaker (no dependencies, unit-testable).
 * Opens when consecutive failures reach the threshold; while open, isOpen() returns true so callers
 * can fail-fast and avoid every request individually timing out when a downstream service is down.
 * A single success resets the breaker; after the cooldown period it automatically half-opens for retry.
 * `now` is injectable for testing the cooldown behavior (defaults to Date.now).
 */
export class CircuitBreaker {
  private fails = 0;
  private openUntil = 0;

  constructor(
    private readonly threshold: number,
    private readonly cooldownMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  isOpen(): boolean {
    return this.now() < this.openUntil;
  }

  recordSuccess(): void {
    this.fails = 0;
    this.openUntil = 0;
  }

  recordFailure(): void {
    this.fails++;
    if (this.fails >= this.threshold) this.openUntil = this.now() + this.cooldownMs;
  }
}
