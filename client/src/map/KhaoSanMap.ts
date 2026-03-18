/**
 * Khao San Road Arena — Tilemap Data Module
 *
 * Programmatic tilemap matching the ASCII art from the design doc.
 * 40x30 grid, each tile = 32x32 px, total 1280x960.
 *
 * Tile IDs:
 *   0 = ground/road (walkable)
 *   1 = building wall (impassable) — hostels, shops
 *   2 = bar front (impassable) — neon-lit structures
 *   3 = road marking (walkable, cosmetic)
 *   4 = cover object (impassable)
 *   5 = flood zone (walkable, periodic slow + refill)
 *   6 = water station marker (walkable)
 *   7 = alley wall (impassable)
 *   8 = spawn point (walkable)
 *   9 = party zone (walkable, masks audio)
 */

const TILE_SIZE = 32;
const MAP_W = 40;
const MAP_H = 30;

// ASCII map from design doc — each char maps to a tile ID
// Legend: . = 0, # = 1, B = 2, = = 3, C = 4, W = 6, ~ = 5, | = 7, S = 8, * = 9
const ASCII_MAP: string[] = [
  // R00
  "########################################",
  // R01
  "#S1.....###.........==.........###.S2..#",
  // R02
  "#.......###....C....==....C...###.....#",
  // R03
  "#..C....###.........==........###.....#",
  // R04
  "#.......###...W.....==....W...###.....#",
  // R05
  "#.............|.....==....|...........#",
  // R06
  "#.BBB.........|.....==....|.......BBB.#",
  // R07
  "#.BBB..C.....|.....==....|....C.BBB.#",
  // R08
  "#.BBB.........|..S3.==....|.......BBB.#",
  // R09
  "#.............|.....==....|...........#",
  // R10
  "##...........||....====....||..........##",
  // R11
  "#.S4....~~~.........==........~~~.S5..#",
  // R12
  "#.......~~~....C....==....C...~~~.....#",
  // R13
  "#.......~~~...|..W..==..W.|...~~~.....#",
  // R14
  "#.............|.....==....|...........#",
  // R15
  "#......C.....|..********..|....C......#",
  // R16
  "#.............|..********..|...........#",
  // R17
  "#.............|..W..==..W.|...........#",
  // R18
  "#.......~~~....C....==....C...~~~.....#",
  // R19
  "#.......~~~.........==........~~~.S6..#",
  // R20
  "##..........||....====....||..........##",
  // R21
  "#.............|.....==....|...........#",
  // R22
  "#.BBB.........|..S7.==....|.......BBB.#",
  // R23
  "#.BBB..C.....|.....==....|....C.BBB.#",
  // R24
  "#.BBB.........|.....==....|.......BBB.#",
  // R25
  "#.............|.....==....|...........#",
  // R26
  "#.......###...W.....==....W...###.....#",
  // R27
  "#..C....###.........==........###.....#",
  // R28
  "#S8.....###.........==.........###....#",
  // R29
  "########################################",
];

function charToTile(ch: string): number {
  switch (ch) {
    case "#":
      return 1;
    case "B":
      return 2;
    case "=":
      return 3;
    case "C":
      return 4;
    case "W":
      return 6;
    case "~":
      return 5;
    case "|":
      return 7;
    case "S":
      return 8;
    case "*":
      return 9;
    default:
      return 0; // '.', digits, spaces all become ground
  }
}

function buildMapData(): number[][] {
  const grid: number[][] = [];
  for (let row = 0; row < MAP_H; row++) {
    const line = ASCII_MAP[row] || "";
    const tileRow: number[] = [];
    // Parse the line, skipping digit characters that are part of spawn labels (S1, S2, etc.)
    let col = 0;
    let lineIdx = 0;
    while (col < MAP_W && lineIdx < line.length) {
      const ch = line[lineIdx];
      // Digit characters right after S are spawn label numbers — skip them
      if (ch >= "0" && ch <= "9") {
        lineIdx++;
        continue;
      }
      tileRow.push(charToTile(ch));
      col++;
      lineIdx++;
    }
    // Pad remaining columns with ground
    while (tileRow.length < MAP_W) {
      tileRow.push(0);
    }
    grid.push(tileRow);
  }
  return grid;
}

let cachedMapData: number[][] | null = null;

/**
 * Returns the 40x30 2D tile array for the Khao San Road map.
 */
export function getMapData(): number[][] {
  if (!cachedMapData) {
    cachedMapData = buildMapData();
  }
  return cachedMapData;
}

/**
 * Obstacle rectangles for physics — { x, y, w, h } where (x,y) is the center.
 * Matches server KhaoSanConstants.OBSTACLES exactly.
 */
export function getObstacleRects(): Array<{
  x: number;
  y: number;
  w: number;
  h: number;
}> {
  return [
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
}

/**
 * Water refill station positions (5 total). Matches server.
 */
export function getWaterStationPositions(): Array<{
  x: number;
  y: number;
}> {
  return [
    { x: 496, y: 144 },    // NW street tap
    { x: 784, y: 144 },    // NE street tap
    { x: 592, y: 432 },    // Center-W hydrant
    { x: 688, y: 560 },    // Center-E hydrant
    { x: 496, y: 848 },    // SW street tap
  ];
}

/**
 * Spawn positions for up to 8 players. Matches server.
 */
export function getSpawnPositions(): Array<{ x: number; y: number }> {
  return [
    { x: 48, y: 48 },      // S1 NW corner
    { x: 1200, y: 48 },    // S2 NE corner
    { x: 624, y: 272 },    // S3 Center-east
    { x: 80, y: 368 },     // S4 West mid
    { x: 1200, y: 368 },   // S5 East mid
    { x: 1200, y: 624 },   // S6 SE mid
    { x: 624, y: 720 },    // S7 Center-south
    { x: 48, y: 912 },     // S8 SW corner
  ];
}

/**
 * Flood zone rectangles (center-based) — periodic slow + refill hazard.
 * Matches server KhaoSanConstants.FLOOD_ZONES.
 */
export function getFloodZones(): Array<{
  x: number;
  y: number;
  w: number;
  h: number;
}> {
  return [
    { x: 304, y: 368, w: 96, h: 64 },    // NW flood strip
    { x: 976, y: 368, w: 96, h: 64 },     // NE flood strip
    { x: 304, y: 592, w: 96, h: 64 },     // SW flood strip
    { x: 976, y: 592, w: 96, h: 64 },     // SE flood strip
  ];
}

/**
 * Party zone rectangles (center-based) — masks audio cues.
 * Matches server KhaoSanConstants.PARTY_ZONES.
 */
export function getPartyZones(): Array<{
  x: number;
  y: number;
  w: number;
  h: number;
}> {
  return [
    { x: 704, y: 496, w: 256, h: 64 },   // Center party zone
  ];
}

/**
 * Slippery zones — reuses flood zones for compatibility with shared interface.
 * On this map, slippery behavior is periodic (flood-based) rather than permanent.
 */
export function getSlipperyZones(): Array<{
  x: number;
  y: number;
  w: number;
  h: number;
}> {
  return getFloodZones();
}

export const MAP_WIDTH = MAP_W * TILE_SIZE; // 1280
export const MAP_HEIGHT = MAP_H * TILE_SIZE; // 960
export { TILE_SIZE, MAP_W, MAP_H };
