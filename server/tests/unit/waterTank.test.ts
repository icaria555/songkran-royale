import { describe, it, expect } from "vitest";
import {
  MAX_WATER_LEVEL,
  WATER_COST_PER_SHOT,
  REFILL_RATE_PER_SECOND,
} from "../../src/game/GameConstants";

// Pure logic functions matching client/server implementation
function canShoot(waterLevel: number): boolean {
  return waterLevel >= WATER_COST_PER_SHOT;
}

function applyShot(waterLevel: number): number {
  return Math.max(0, waterLevel - WATER_COST_PER_SHOT);
}

function applyRefill(waterLevel: number, deltaSeconds: number): number {
  return Math.min(MAX_WATER_LEVEL, waterLevel + REFILL_RATE_PER_SECOND * deltaSeconds);
}

describe("Water Tank", () => {
  it("shoot deducts 5 per shot", () => {
    const level = applyShot(100);
    expect(level).toBe(100 - WATER_COST_PER_SHOT); // 95
  });

  it("multiple shots deduct correctly", () => {
    let level = 100;
    for (let i = 0; i < 3; i++) {
      level = applyShot(level);
    }
    expect(level).toBe(100 - 3 * WATER_COST_PER_SHOT); // 85
  });

  it("shoot is blocked when waterLevel === 0", () => {
    expect(canShoot(0)).toBe(false);
  });

  it("shoot is blocked when waterLevel < cost per shot", () => {
    expect(canShoot(WATER_COST_PER_SHOT - 1)).toBe(false);
  });

  it("shoot is allowed when waterLevel >= cost per shot", () => {
    expect(canShoot(WATER_COST_PER_SHOT)).toBe(true);
    expect(canShoot(100)).toBe(true);
  });

  it("applyShot never goes below 0", () => {
    const level = applyShot(3); // 3 - 5 = -2 -> clamped to 0
    expect(level).toBe(0);
  });

  it("refill adds correct amount per tick while in station range", () => {
    const dt = 1; // 1 second
    const level = applyRefill(50, dt);
    expect(level).toBe(50 + REFILL_RATE_PER_SECOND); // 80
  });

  it("refill is clamped to max 100", () => {
    const level = applyRefill(90, 1); // 90 + 30 = 120 -> clamped to 100
    expect(level).toBe(MAX_WATER_LEVEL);
  });

  it("refill from zero works correctly", () => {
    const level = applyRefill(0, 1);
    expect(level).toBe(REFILL_RATE_PER_SECOND); // 30
  });
});
