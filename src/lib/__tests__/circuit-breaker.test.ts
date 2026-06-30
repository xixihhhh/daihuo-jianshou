import { describe, it, expect } from "vitest";
import { CircuitBreaker } from "@/lib/circuit-breaker";

describe("CircuitBreaker", () => {
  it("初始关闭；达阈值连续失败后打开", () => {
    const b = new CircuitBreaker(2, 1000);
    expect(b.isOpen()).toBe(false);
    b.recordFailure();
    expect(b.isOpen()).toBe(false); // 1 failure, threshold not reached
    b.recordFailure();
    expect(b.isOpen()).toBe(true); // 2nd failure hits threshold → open
  });

  it("一次成功即复位（清零失败计数与开断）", () => {
    const b = new CircuitBreaker(2, 1000);
    b.recordFailure();
    b.recordSuccess();
    b.recordFailure();
    expect(b.isOpen()).toBe(false); // after reset only 1 failure accumulated, threshold not reached
  });

  it("冷却期后自动半开（注入时钟）", () => {
    let t = 0;
    const b = new CircuitBreaker(1, 1000, () => t);
    b.recordFailure();
    expect(b.isOpen()).toBe(true);
    t = 999;
    expect(b.isOpen()).toBe(true);
    t = 1001;
    expect(b.isOpen()).toBe(false); // cooldown expired → half-open, allow through
  });
});
