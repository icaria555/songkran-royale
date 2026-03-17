/**
 * Shared game logic — designed to run on both client (Phase 1) and server (Phase 2).
 * Pure functions with no Phaser or Colyseus dependencies.
 */

export const PLAYER_SPEED = 200;
export const PROJECTILE_SPEED = 400;
export const MAX_WATER_LEVEL = 100;
export const MAX_WET_METER = 100;
export const WATER_COST_PER_SHOT = 5;
export const DIRECT_HIT_DAMAGE = 15;
export const SPLASH_DAMAGE = 5;
export const REFILL_RATE_PER_SECOND = 30;
export const REFILL_RANGE = 60;
export const MATCH_DURATION = 180;
export const PROJECTILE_POOL_SIZE = 20;

export interface PlayerData {
  x: number;
  y: number;
  angle: number;
  waterLevel: number;
  wetMeter: number;
  isAlive: boolean;
  character: string;
  nationality: string;
  nickname: string;
  score: number;
}

export function createPlayerData(
  x: number,
  y: number,
  character: string,
  nationality: string,
  nickname: string
): PlayerData {
  return {
    x,
    y,
    angle: 0,
    waterLevel: MAX_WATER_LEVEL,
    wetMeter: 0,
    isAlive: true,
    character,
    nationality,
    nickname,
    score: 0,
  };
}

export function canShoot(waterLevel: number): boolean {
  return waterLevel >= WATER_COST_PER_SHOT;
}

export function applyShot(waterLevel: number): number {
  return Math.max(0, waterLevel - WATER_COST_PER_SHOT);
}

export function applyDamage(
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

export function applyRefill(
  waterLevel: number,
  deltaSeconds: number
): number {
  return Math.min(
    MAX_WATER_LEVEL,
    waterLevel + REFILL_RATE_PER_SECOND * deltaSeconds
  );
}

export function isInRefillRange(
  px: number,
  py: number,
  sx: number,
  sy: number
): boolean {
  const dx = px - sx;
  const dy = py - sy;
  return Math.sqrt(dx * dx + dy * dy) <= REFILL_RANGE;
}

export function checkWinCondition(alivePlayers: number): boolean {
  return alivePlayers <= 1;
}
