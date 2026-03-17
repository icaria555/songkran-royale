/** Shared game constants — must match client GameLogic.ts */

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

export const TICK_RATE = 20; // Hz
export const TICK_INTERVAL = 1000 / TICK_RATE; // 50ms

export const MAX_INPUT_RATE = 60; // max inputs/second per client
export const INPUT_RATE_WINDOW = 1000; // 1 second window

// Chiang Mai street arena — 40×30 tiles at 32px each
export const TILE_SIZE = 32;
export const MAP_TILES_X = 40;
export const MAP_TILES_Y = 30;
export const MAP_WIDTH = MAP_TILES_X * TILE_SIZE;   // 1280
export const MAP_HEIGHT = MAP_TILES_Y * TILE_SIZE;  // 960

export const PLAYER_HITBOX_RADIUS = 24; // 12 * scale factor for collision
export const PROJECTILE_HITBOX_RADIUS = 8;
export const PROJECTILE_LIFETIME = 2000; // ms

export const MIN_PLAYERS_TO_START = 2;
export const MAX_PLAYERS_PER_ROOM = 8;
export const COUNTDOWN_SECONDS = 3;
export const RECONNECT_GRACE_PERIOD = 30000; // 30s

// ── Chiang Mai Map — Water Refill Stations (6) ──────────────────
// Themed as hydrants and water tanks placed at strategic positions
export const WATER_STATION_POSITIONS = [
  { x: 496, y: 176 },   // NW road hydrant
  { x: 1136, y: 176 },  // NE road hydrant
  { x: 496, y: 784 },   // SW road hydrant
  { x: 1136, y: 784 },  // SE road hydrant
  { x: 80, y: 560 },    // West mid tank (border alcove)
  { x: 1200, y: 560 },  // East mid tank (border alcove)
];

// ── Chiang Mai Map — Spawn Points (8) ───────────────────────────
export const SPAWN_POSITIONS = [
  { x: 48, y: 48 },     // S1 — NW corner
  { x: 1168, y: 48 },   // S2 — NE corner
  { x: 880, y: 304 },   // S3 — East mid-north (near alley)
  { x: 80, y: 432 },    // S4 — West mid
  { x: 1136, y: 432 },  // S5 — East mid
  { x: 464, y: 656 },   // S6 — West mid-south
  { x: 48, y: 912 },    // S7 — SW corner
  { x: 1168, y: 912 },  // S8 — SE corner
];

// ── Chiang Mai Map — Obstacles (buildings, walls, cover) ────────
// Each entry is { x, y, w, h } where (x, y) is the CENTER of the rect.
export const WALL_THICKNESS = 32;

export const OBSTACLES = [
  // === Large buildings (shops & temples) — corner blocks ===
  { x: 176, y: 96, w: 96, h: 96 },     // NW shop block
  { x: 944, y: 96, w: 96, h: 96 },     // NE shop block
  { x: 176, y: 832, w: 96, h: 96 },    // SW temple block
  { x: 944, y: 832, w: 96, h: 96 },    // SE temple block

  // === Alley walls (north segments) ===
  { x: 272, y: 256, w: 32, h: 160 },   // West alley wall (north)
  { x: 912, y: 256, w: 32, h: 160 },   // East alley wall (north)

  // === Border blocks (mid-map narrows) ===
  { x: 64, y: 368, w: 128, h: 32 },    // W border block (upper)
  { x: 1216, y: 368, w: 128, h: 32 },  // E border block (upper)
  { x: 64, y: 592, w: 128, h: 32 },    // W border block (lower)
  { x: 1216, y: 592, w: 128, h: 32 },  // E border block (lower)

  // === Alley walls (south segments) ===
  { x: 272, y: 672, w: 32, h: 160 },   // West alley wall (south)
  { x: 912, y: 672, w: 32, h: 160 },   // East alley wall (south)

  // === Cover objects — tuk-tuks, stalls, songthaew ===
  { x: 176, y: 272, w: 32, h: 32 },    // NW tuk-tuk
  { x: 1072, y: 272, w: 32, h: 32 },   // NE tuk-tuk
  { x: 688, y: 368, w: 32, h: 32 },    // Center object (market stall)
  { x: 336, y: 112, w: 32, h: 32 },    // NW road stall
  { x: 816, y: 112, w: 32, h: 32 },    // NE road stall
  { x: 608, y: 464, w: 64, h: 32 },    // Mid-center pair (songthaew)
  { x: 176, y: 688, w: 32, h: 32 },    // SW tuk-tuk
  { x: 1072, y: 688, w: 32, h: 32 },   // SE tuk-tuk
  { x: 368, y: 848, w: 32, h: 32 },    // SW road stall
  { x: 816, y: 848, w: 32, h: 32 },    // SE road stall
];

// ── Chiang Mai Map — Hazard Zones ───────────────────────────────

// Slippery zones near temples — reduce movement speed by 30%
export const SLIPPERY_SPEED_MULTIPLIER = 0.7;
export const SLIPPERY_ZONES = [
  { x: 176, y: 848, w: 192, h: 64 },   // SW temple puddle
  { x: 976, y: 848, w: 192, h: 64 },   // SE temple puddle
];

// Water truck hazard — crosses the main road periodically
export const WATER_TRUCK = {
  y: 480,                // Center line of the truck path (row 15)
  speed: 320,            // px/s — crosses map in ~4 seconds
  intervalMs: 30000,     // Spawns every 30 seconds
  warningMs: 2000,       // Horn warning 2 seconds before entry
  hitRadius: 48,         // Players within 48px of center line get hit
  wetDamage: 25,         // +25% wet meter on hit
  startX: -64,           // Spawn off-screen left
  endX: 1344,            // Despawn off-screen right
};
