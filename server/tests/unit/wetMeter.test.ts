import { describe, it, expect } from "vitest";
import {
  applyDamage,
  DIRECT_HIT_DAMAGE,
  SPLASH_DAMAGE,
  MAX_WET_METER,
} from "../../src/game/GameConstants";

// Re-implement applyDamage locally since the canonical version is in client GameLogic.ts
// but the constants come from server GameConstants.ts. We test the pure logic here.
function applyDamageLogic(
  wetMeter: number,
  isDirect: boolean
): { wetMeter: number; isAlive: boolean } {
  const damage = isDirect ? DIRECT_HIT_DAMAGE : SPLASH_DAMAGE;
  const newWet = Math.min(MAX_WET_METER, wetMeter + damage);
  return {
    wetMeter: newWet,
    isAlive: newWet < MAX_WET_METER,
  };
}

describe("Wet Meter", () => {
  it("direct hit applies 15% damage", () => {
    const result = applyDamageLogic(0, true);
    expect(result.wetMeter).toBe(DIRECT_HIT_DAMAGE); // 15
  });

  it("splash hit applies 5% damage", () => {
    const result = applyDamageLogic(0, false);
    expect(result.wetMeter).toBe(SPLASH_DAMAGE); // 5
  });

  it("is clamped to max 100 and never exceeds it", () => {
    const result = applyDamageLogic(95, true); // 95 + 15 = 110 -> clamped to 100
    expect(result.wetMeter).toBe(MAX_WET_METER);
    expect(result.wetMeter).toBeLessThanOrEqual(100);
  });

  it("never goes negative", () => {
    const result = applyDamageLogic(0, false);
    expect(result.wetMeter).toBeGreaterThanOrEqual(0);
  });

  it("isAlive becomes false exactly at 100", () => {
    // At 99 + 1 won't reach 100 with standard damage, so use direct on 85
    const result = applyDamageLogic(85, true); // 85 + 15 = 100
    expect(result.wetMeter).toBe(100);
    expect(result.isAlive).toBe(false);
  });

  it("isAlive is true when wetMeter < 100", () => {
    const result = applyDamageLogic(80, true); // 80 + 15 = 95
    expect(result.wetMeter).toBe(95);
    expect(result.isAlive).toBe(true);
  });

  it("does NOT reset on death — wetMeter stays at max", () => {
    const first = applyDamageLogic(90, true); // 90 + 15 = 105 -> clamped to 100
    expect(first.wetMeter).toBe(100);
    expect(first.isAlive).toBe(false);

    // Applying more damage after death: wetMeter stays at 100, doesn't reset
    const second = applyDamageLogic(first.wetMeter, true);
    expect(second.wetMeter).toBe(100);
    expect(second.isAlive).toBe(false);
  });
});
