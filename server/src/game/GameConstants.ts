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

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 900;

export const PLAYER_HITBOX_RADIUS = 24; // 12 * scale factor for collision
export const PROJECTILE_HITBOX_RADIUS = 8;
export const PROJECTILE_LIFETIME = 2000; // ms

export const MIN_PLAYERS_TO_START = 2;
export const MAX_PLAYERS_PER_ROOM = 8;
export const COUNTDOWN_SECONDS = 3;
export const RECONNECT_GRACE_PERIOD = 30000; // 30s

// Water station positions
export const WATER_STATION_POSITIONS = [
  { x: 200, y: 200 },
  { x: MAP_WIDTH - 200, y: 200 },
  { x: 200, y: MAP_HEIGHT - 200 },
  { x: MAP_WIDTH - 200, y: MAP_HEIGHT - 200 },
];

// Wall obstacles (must match client)
export const WALL_THICKNESS = 32;
export const OBSTACLES = [
  { x: 400, y: 300, w: 64, h: 128 },
  { x: 800, y: 600, w: 64, h: 128 },
  { x: 600, y: 450, w: 128, h: 64 },
  { x: 300, y: 700, w: 128, h: 64 },
  { x: 900, y: 250, w: 64, h: 64 },
];
