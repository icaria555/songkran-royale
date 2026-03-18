import {
  MAP_WIDTH,
  MAP_HEIGHT,
  WALL_THICKNESS,
  OBSTACLES,
  PLAYER_HITBOX_RADIUS,
  PROJECTILE_HITBOX_RADIUS,
  REFILL_RANGE,
  WATER_STATION_POSITIONS,
} from "./GameConstants";
import type { MapConfig } from "./maps/MapRegistry";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Check if a circle collides with a rectangle */
function circleRectCollision(
  cx: number,
  cy: number,
  cr: number,
  rect: Rect
): boolean {
  const halfW = rect.w / 2;
  const halfH = rect.h / 2;
  const closestX = Math.max(rect.x - halfW, Math.min(cx, rect.x + halfW));
  const closestY = Math.max(rect.y - halfH, Math.min(cy, rect.y + halfH));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

// ── Legacy functions (use default Chiang Mai constants) ──────────────

/** Clamp player position to stay inside map bounds (accounting for walls) */
export function clampPlayerPosition(
  x: number,
  y: number
): { x: number; y: number } {
  const r = PLAYER_HITBOX_RADIUS;
  const minX = WALL_THICKNESS + r;
  const maxX = MAP_WIDTH - WALL_THICKNESS - r;
  const minY = WALL_THICKNESS + r;
  const maxY = MAP_HEIGHT - WALL_THICKNESS - r;

  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  };
}

/** Check if player collides with any obstacle wall */
export function playerCollidesWithObstacle(
  x: number,
  y: number
): boolean {
  for (const obs of OBSTACLES) {
    if (circleRectCollision(x, y, PLAYER_HITBOX_RADIUS, obs)) {
      return true;
    }
  }
  return false;
}

/** Resolve player position if it collides with obstacles (push out) */
export function resolvePlayerObstacleCollision(
  x: number,
  y: number,
  prevX: number,
  prevY: number
): { x: number; y: number } {
  if (!playerCollidesWithObstacle(x, y)) {
    return { x, y };
  }

  // Try moving only on X axis
  if (!playerCollidesWithObstacle(x, prevY)) {
    return { x, y: prevY };
  }

  // Try moving only on Y axis
  if (!playerCollidesWithObstacle(prevX, y)) {
    return { x: prevX, y };
  }

  // Can't move at all — stay at previous position
  return { x: prevX, y: prevY };
}

/** Check if a projectile hits a specific player (circle-circle) */
export function projectileHitsPlayer(
  px: number,
  py: number,
  playerX: number,
  playerY: number
): boolean {
  const dx = px - playerX;
  const dy = py - playerY;
  const dist = PROJECTILE_HITBOX_RADIUS + PLAYER_HITBOX_RADIUS;
  return dx * dx + dy * dy < dist * dist;
}

/** Check if projectile collides with any wall or obstacle */
export function projectileCollidesWithWall(
  x: number,
  y: number
): boolean {
  // Map boundaries
  if (
    x < WALL_THICKNESS ||
    x > MAP_WIDTH - WALL_THICKNESS ||
    y < WALL_THICKNESS ||
    y > MAP_HEIGHT - WALL_THICKNESS
  ) {
    return true;
  }

  // Obstacles
  for (const obs of OBSTACLES) {
    if (circleRectCollision(x, y, PROJECTILE_HITBOX_RADIUS, obs)) {
      return true;
    }
  }

  return false;
}

/** Check if player is in range of any water station, return station index or -1 */
export function getRefillStationIndex(
  playerX: number,
  playerY: number
): number {
  for (let i = 0; i < WATER_STATION_POSITIONS.length; i++) {
    const s = WATER_STATION_POSITIONS[i];
    const dx = playerX - s.x;
    const dy = playerY - s.y;
    if (Math.sqrt(dx * dx + dy * dy) <= REFILL_RANGE) {
      return i;
    }
  }
  return -1;
}

// ── Map-aware collision helpers ──────────────────────────────────────
// These accept a MapConfig so GameRoom can use the correct obstacle/station data.

/** Create collision helpers bound to a specific map configuration. */
export function createMapCollisionHelpers(mapConfig: MapConfig) {
  const { obstacles, waterStations, mapWidth, mapHeight } = mapConfig;

  function clamp(x: number, y: number): { x: number; y: number } {
    const r = PLAYER_HITBOX_RADIUS;
    const minX = WALL_THICKNESS + r;
    const maxX = mapWidth - WALL_THICKNESS - r;
    const minY = WALL_THICKNESS + r;
    const maxY = mapHeight - WALL_THICKNESS - r;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }

  function playerCollides(x: number, y: number): boolean {
    for (const obs of obstacles) {
      if (circleRectCollision(x, y, PLAYER_HITBOX_RADIUS, obs)) {
        return true;
      }
    }
    return false;
  }

  function resolveObstacle(
    x: number,
    y: number,
    prevX: number,
    prevY: number
  ): { x: number; y: number } {
    if (!playerCollides(x, y)) return { x, y };
    if (!playerCollides(x, prevY)) return { x, y: prevY };
    if (!playerCollides(prevX, y)) return { x: prevX, y };
    return { x: prevX, y: prevY };
  }

  function projectileWall(x: number, y: number): boolean {
    if (
      x < WALL_THICKNESS ||
      x > mapWidth - WALL_THICKNESS ||
      y < WALL_THICKNESS ||
      y > mapHeight - WALL_THICKNESS
    ) {
      return true;
    }
    for (const obs of obstacles) {
      if (circleRectCollision(x, y, PROJECTILE_HITBOX_RADIUS, obs)) {
        return true;
      }
    }
    return false;
  }

  function refillStationIndex(playerX: number, playerY: number): number {
    for (let i = 0; i < waterStations.length; i++) {
      const s = waterStations[i];
      const dx = playerX - s.x;
      const dy = playerY - s.y;
      if (Math.sqrt(dx * dx + dy * dy) <= REFILL_RANGE) {
        return i;
      }
    }
    return -1;
  }

  return {
    clampPlayerPosition: clamp,
    resolvePlayerObstacleCollision: resolveObstacle,
    projectileCollidesWithWall: projectileWall,
    getRefillStationIndex: refillStationIndex,
  };
}
