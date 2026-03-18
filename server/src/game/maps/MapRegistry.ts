/**
 * MapRegistry — Centralised map data lookup.
 *
 * GameRoom calls `getMapConfig(mapId)` at creation time to load the correct
 * obstacles, water stations, spawn points, slippery zones, and hazard data.
 */

import {
  OBSTACLES as CM_OBSTACLES,
  WATER_STATION_POSITIONS as CM_WATER_STATIONS,
  SPAWN_POSITIONS as CM_SPAWNS,
  SLIPPERY_ZONES as CM_SLIPPERY,
  MAP_WIDTH as CM_MAP_WIDTH,
  MAP_HEIGHT as CM_MAP_HEIGHT,
  WATER_TRUCK,
} from "../GameConstants";

import {
  OBSTACLES as KS_OBSTACLES,
  WATER_STATION_POSITIONS as KS_WATER_STATIONS,
  SPAWN_POSITIONS as KS_SPAWNS,
  FLOOD_ZONES as KS_FLOOD_ZONES,
  FLOOD_SPEED_MULTIPLIER,
  FLOOD_REFILL_PER_SECOND,
  FLOOD_INTERVAL_MS,
  FLOOD_DURATION_MS,
  FLOOD_WARNING_MS,
  PARTY_ZONES as KS_PARTY_ZONES,
} from "./KhaoSanConstants";

// ── Types ────────────────────────────────────────────────────────────

export type MapId = "chiangmai" | "khaosan";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface WaterTruckConfig {
  y: number;
  speed: number;
  intervalMs: number;
  warningMs: number;
  hitRadius: number;
  wetDamage: number;
  startX: number;
  endX: number;
}

export interface FloodConfig {
  zones: Rect[];
  speedMultiplier: number;
  refillPerSecond: number;
  intervalMs: number;
  durationMs: number;
  warningMs: number;
}

export interface MapConfig {
  obstacles: Rect[];
  waterStations: Position[];
  spawnPositions: Position[];
  slipperyZones: Rect[];
  mapWidth: number;
  mapHeight: number;
  hazards: {
    waterTruck?: WaterTruckConfig;
    flood?: FloodConfig;
    partyZones?: Rect[];
  };
}

// ── Configs ──────────────────────────────────────────────────────────

const CHIANG_MAI_CONFIG: MapConfig = {
  obstacles: CM_OBSTACLES,
  waterStations: CM_WATER_STATIONS,
  spawnPositions: CM_SPAWNS,
  slipperyZones: CM_SLIPPERY,
  mapWidth: CM_MAP_WIDTH,
  mapHeight: CM_MAP_HEIGHT,
  hazards: {
    waterTruck: WATER_TRUCK,
  },
};

const KHAO_SAN_CONFIG: MapConfig = {
  obstacles: KS_OBSTACLES,
  waterStations: KS_WATER_STATIONS,
  spawnPositions: KS_SPAWNS,
  slipperyZones: [], // Khao San has no permanent slippery zones
  mapWidth: 1280, // Same 40x30 tile grid
  mapHeight: 960,
  hazards: {
    flood: {
      zones: KS_FLOOD_ZONES,
      speedMultiplier: FLOOD_SPEED_MULTIPLIER,
      refillPerSecond: FLOOD_REFILL_PER_SECOND,
      intervalMs: FLOOD_INTERVAL_MS,
      durationMs: FLOOD_DURATION_MS,
      warningMs: FLOOD_WARNING_MS,
    },
    partyZones: KS_PARTY_ZONES,
  },
};

const MAP_CONFIGS: Record<MapId, MapConfig> = {
  chiangmai: CHIANG_MAI_CONFIG,
  khaosan: KHAO_SAN_CONFIG,
};

// ── Public API ───────────────────────────────────────────────────────

/** Return the map configuration for the given map ID (defaults to 'chiangmai'). */
export function getMapConfig(mapId?: string): MapConfig {
  const id = (mapId ?? "chiangmai") as MapId;
  return MAP_CONFIGS[id] ?? MAP_CONFIGS.chiangmai;
}

/** Type-guard: is the string a valid MapId? */
export function isValidMapId(value: string): value is MapId {
  return value === "chiangmai" || value === "khaosan";
}
