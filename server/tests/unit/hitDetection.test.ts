import { describe, it, expect } from "vitest";
import {
  projectileHitsPlayer,
  projectileCollidesWithWall,
  clampPlayerPosition,
} from "../../src/game/CollisionHandler";
import {
  PLAYER_HITBOX_RADIUS,
  PROJECTILE_HITBOX_RADIUS,
  MAP_WIDTH,
  MAP_HEIGHT,
  WALL_THICKNESS,
} from "../../src/game/GameConstants";

describe("Hit Detection — projectile vs player", () => {
  const combinedRadius = PLAYER_HITBOX_RADIUS + PROJECTILE_HITBOX_RADIUS; // 24 + 8 = 32

  it("projectile within range hits player", () => {
    // Projectile 20px away from player center — well within combined radius of 32
    const hit = projectileHitsPlayer(500, 500, 520, 500);
    expect(hit).toBe(true);
  });

  it("projectile exactly overlapping player hits", () => {
    const hit = projectileHitsPlayer(500, 500, 500, 500);
    expect(hit).toBe(true);
  });

  it("projectile just inside combined radius hits", () => {
    // Place projectile at distance = combinedRadius - 1 (31px away)
    const hit = projectileHitsPlayer(500, 500, 500 + combinedRadius - 1, 500);
    expect(hit).toBe(true);
  });

  it("projectile outside range misses", () => {
    // Place projectile at distance = combinedRadius + 1 (33px away)
    const hit = projectileHitsPlayer(500, 500, 500 + combinedRadius + 1, 500);
    expect(hit).toBe(false);
  });

  it("projectile exactly at combined radius boundary misses (strict less-than)", () => {
    // The check uses < (strict), so exactly at boundary should miss
    const hit = projectileHitsPlayer(500, 500, 500 + combinedRadius, 500);
    expect(hit).toBe(false);
  });
});

describe("Hit Detection — projectile vs wall", () => {
  it("projectile inside map does not collide with wall", () => {
    // Pick a spot clear of any obstacle — open road area
    const collides = projectileCollidesWithWall(500, 480);
    expect(collides).toBe(false);
  });

  it("projectile at left wall boundary collides", () => {
    const collides = projectileCollidesWithWall(WALL_THICKNESS - 1, 450);
    expect(collides).toBe(true);
  });

  it("projectile at right wall boundary collides", () => {
    const collides = projectileCollidesWithWall(MAP_WIDTH - WALL_THICKNESS + 1, 450);
    expect(collides).toBe(true);
  });

  it("projectile at top wall boundary collides", () => {
    const collides = projectileCollidesWithWall(600, WALL_THICKNESS - 1);
    expect(collides).toBe(true);
  });

  it("projectile at bottom wall boundary collides", () => {
    const collides = projectileCollidesWithWall(600, MAP_HEIGHT - WALL_THICKNESS + 1);
    expect(collides).toBe(true);
  });

  it("projectile hitting an obstacle collides", () => {
    // First obstacle is NW shop block at { x: 176, y: 96, w: 96, h: 96 }
    // Its center is (176, 96), so placing projectile right at center should collide
    const collides = projectileCollidesWithWall(176, 96);
    expect(collides).toBe(true);
  });
});

describe("Player position clamped to map bounds", () => {
  const minX = WALL_THICKNESS + PLAYER_HITBOX_RADIUS; // 32 + 24 = 56
  const maxX = MAP_WIDTH - WALL_THICKNESS - PLAYER_HITBOX_RADIUS; // 1200 - 32 - 24 = 1144
  const minY = WALL_THICKNESS + PLAYER_HITBOX_RADIUS; // 56
  const maxY = MAP_HEIGHT - WALL_THICKNESS - PLAYER_HITBOX_RADIUS; // 900 - 32 - 24 = 844

  it("position inside bounds is unchanged", () => {
    const pos = clampPlayerPosition(500, 400);
    expect(pos.x).toBe(500);
    expect(pos.y).toBe(400);
  });

  it("position below min is clamped to min", () => {
    const pos = clampPlayerPosition(-10, -10);
    expect(pos.x).toBe(minX);
    expect(pos.y).toBe(minY);
  });

  it("position above max is clamped to max", () => {
    const pos = clampPlayerPosition(2000, 2000);
    expect(pos.x).toBe(maxX);
    expect(pos.y).toBe(maxY);
  });

  it("x clamped independently of y", () => {
    const pos = clampPlayerPosition(-10, 500);
    expect(pos.x).toBe(minX);
    expect(pos.y).toBe(500);
  });
});
