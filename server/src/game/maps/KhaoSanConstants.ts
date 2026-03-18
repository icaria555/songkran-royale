/**
 * Khao San Road Arena — Server-side Map Constants
 *
 * 40x30 tile map (1280x960 px at 32px/tile).
 * All obstacle/zone coordinates use center-based { x, y, w, h } rects.
 * Position-only entries use { x, y }.
 *
 * Must match client KhaoSanMap.ts exactly.
 */

// ── Khao San Road Map — Obstacles (buildings, walls, cover) ─────
// Each entry is { x, y, w, h } where (x, y) is the CENTER of the rect.
export const OBSTACLES = [
  // === Hostel blocks (N and S ends) ===
  { x: 304, y: 80, w: 96, h: 128 },    // NW hostel block
  { x: 1008, y: 80, w: 96, h: 128 },   // NE hostel block
  { x: 304, y: 864, w: 96, h: 96 },     // SW hostel block
  { x: 1008, y: 864, w: 96, h: 96 },    // SE hostel block

  // === Bar fronts (neon-lit structures) ===
  { x: 112, y: 224, w: 96, h: 96 },     // NW bar front
  { x: 1168, y: 224, w: 96, h: 96 },    // NE bar front
  { x: 112, y: 736, w: 96, h: 96 },     // SW bar front
  { x: 1168, y: 736, w: 96, h: 96 },    // SE bar front

  // === Alley walls (north segments) ===
  { x: 464, y: 224, w: 32, h: 160 },    // West alley wall (north)
  { x: 816, y: 224, w: 32, h: 160 },    // East alley wall (north)

  // === Alley walls (mid segments) ===
  { x: 464, y: 464, w: 32, h: 256 },    // West alley wall (mid)
  { x: 816, y: 464, w: 32, h: 256 },    // East alley wall (mid)

  // === Alley walls (south segments) ===
  { x: 464, y: 736, w: 32, h: 160 },    // West alley wall (south)
  { x: 816, y: 736, w: 32, h: 160 },    // East alley wall (south)

  // === Narrows blocks (cross streets) ===
  { x: 32, y: 336, w: 64, h: 32 },      // NW narrows
  { x: 1248, y: 336, w: 64, h: 32 },    // NE narrows
  { x: 448, y: 336, w: 64, h: 32 },     // West double alley (N)
  { x: 832, y: 336, w: 64, h: 32 },     // East double alley (N)
  { x: 32, y: 656, w: 64, h: 32 },      // SW narrows
  { x: 1248, y: 656, w: 64, h: 32 },    // SE narrows
  { x: 448, y: 656, w: 64, h: 32 },     // West double alley (S)
  { x: 832, y: 656, w: 64, h: 32 },     // East double alley (S)

  // === Cover objects — food carts, tuk-tuks, neon posts ===
  { x: 112, y: 112, w: 32, h: 32 },     // NW food cart
  { x: 496, y: 80, w: 32, h: 32 },      // N-center-W food cart
  { x: 784, y: 80, w: 32, h: 32 },      // N-center-E food cart
  { x: 240, y: 240, w: 32, h: 32 },     // W bar tuk-tuk
  { x: 1072, y: 240, w: 32, h: 32 },    // E bar tuk-tuk
  { x: 208, y: 496, w: 32, h: 32 },     // Mid-W neon post
  { x: 1072, y: 496, w: 32, h: 32 },    // Mid-E neon post
  { x: 496, y: 400, w: 32, h: 32 },     // Mid-center-W food cart
  { x: 784, y: 400, w: 32, h: 32 },     // Mid-center-E food cart
  { x: 496, y: 592, w: 32, h: 32 },     // Mid-center-W cart (S)
  { x: 784, y: 592, w: 32, h: 32 },     // Mid-center-E cart (S)
  { x: 240, y: 752, w: 32, h: 32 },     // W bar tuk-tuk (S)
  { x: 1072, y: 752, w: 32, h: 32 },    // E bar tuk-tuk (S)
  { x: 112, y: 880, w: 32, h: 32 },     // SW food cart
];

// ── Khao San Road Map — Water Refill Stations (5) ───────────────
export const WATER_STATION_POSITIONS = [
  { x: 496, y: 144 },    // NW street tap
  { x: 784, y: 144 },    // NE street tap
  { x: 592, y: 432 },    // Center-W hydrant
  { x: 688, y: 560 },    // Center-E hydrant
  { x: 496, y: 848 },    // SW street tap
];

// ── Khao San Road Map — Spawn Points (8) ────────────────────────
export const SPAWN_POSITIONS = [
  { x: 48, y: 48 },      // S1 — NW corner
  { x: 1200, y: 48 },    // S2 — NE corner
  { x: 624, y: 272 },    // S3 — Center-east
  { x: 80, y: 368 },     // S4 — West mid
  { x: 1200, y: 368 },   // S5 — East mid
  { x: 1200, y: 624 },   // S6 — SE mid
  { x: 624, y: 720 },    // S7 — Center-south
  { x: 48, y: 912 },     // S8 — SW corner
];

// ── Khao San Road Map — Flood Zones (periodic hazard) ───────────
// Every 25s, these zones flood for 6s: -40% speed, +5%/s water refill
export const FLOOD_ZONES = [
  { x: 304, y: 368, w: 96, h: 64 },    // NW flood strip
  { x: 976, y: 368, w: 96, h: 64 },     // NE flood strip
  { x: 304, y: 592, w: 96, h: 64 },     // SW flood strip
  { x: 976, y: 592, w: 96, h: 64 },     // SE flood strip
];

export const FLOOD_SPEED_MULTIPLIER = 0.6;    // -40% speed when flooded
export const FLOOD_REFILL_PER_SECOND = 5;     // +5% water/s when in flood
export const FLOOD_INTERVAL_MS = 25000;        // Flood every 25 seconds
export const FLOOD_DURATION_MS = 6000;         // Flood lasts 6 seconds
export const FLOOD_WARNING_MS = 2000;          // Warning 2s before flood

// ── Khao San Road Map — Party Zones (audio-masking hazard) ──────
// Players inside cannot hear directional audio cues from other players
export const PARTY_ZONES = [
  { x: 704, y: 496, w: 256, h: 64 },   // Center party zone
];
