/**
 * Chiang Mai Street Arena — Tilemap Data Module
 *
 * Programmatic tilemap matching the ASCII art from the design doc.
 * 40x30 grid, each tile = 32x32 px, total 1280x960.
 *
 * Tile IDs:
 *   0 = ground/road (walkable)
 *   1 = building wall (impassable)
 *   2 = temple wall (impassable)
 *   3 = road marking (walkable, cosmetic)
 *   4 = cover object (impassable)
 *   5 = puddle/slippery (walkable, -30% speed)
 *   6 = water station marker (walkable)
 *   7 = alley wall (impassable)
 *   8 = spawn point (walkable)
 */

const TILE_SIZE = 32;
const MAP_W = 40;
const MAP_H = 30;

// ASCII map from design doc — each char maps to a tile ID
// Legend: . = 0, # = 1, T = 2, = = 3, C = 4, W = 6, ~ = 5, | = 7, S = 8
const ASCII_MAP: string[] = [
  // R00
  "########################################",
  // R01
  "#S1..............====..............S2..#",
  // R02
  "#....###........====........###........#",
  // R03
  "#....###..C.....====.....C.###........#",
  // R04
  "#....###........====........###........#",
  // R05
  "#..............W====..............W...#",
  // R06
  "#.......|.......====.......|...........#",
  // R07
  "#.......|.......====.......|...........#",
  // R08
  "#..C...|.......====.......|....C......#",
  // R09
  "#.......|...............S3.|...........#",
  // R10
  "#.......|..............................#",
  // R11
  "####....|............C............|.####",
  // R12
  "#..........====..........====.........#",
  // R13
  "#.S4.....====..........====......S5..#",
  // R14
  "#..........====....CC....====.........#",
  // R15
  "#..........====..........====.........#",
  // R16
  "#..........====..........====.........#",
  // R17
  "#.W.......====..........====........W.#",
  // R18
  "####....|...........................|.####",
  // R19
  "#.......|..............................#",
  // R20
  "#.......|.....S6..........|...........#",
  // R21
  "#..C...|.......====.......|....C......#",
  // R22
  "#.......|.......====.......|...........#",
  // R23
  "#.......|.......====.......|...........#",
  // R24
  "#..............W====..............W...#",
  // R25
  "#....TTT........====........TTT........#",
  // R26
  "#..~~TTT~~.C....====....C.~~TTT~~....#",
  // R27
  "#..~~TTT~~......====......~~TTT~~....#",
  // R28
  "#S7..............====..............S8..#",
  // R29
  "########################################",
];

function charToTile(ch: string): number {
  switch (ch) {
    case "#":
      return 1;
    case "T":
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
 * Returns the 40x30 2D tile array for the Chiang Mai map.
 */
export function getMapData(): number[][] {
  if (!cachedMapData) {
    cachedMapData = buildMapData();
  }
  return cachedMapData;
}

/**
 * Obstacle rectangles for physics — { x, y, w, h } where (x,y) is the center.
 * Matches server GameConstants.OBSTACLES exactly.
 */
export function getObstacleRects(): Array<{
  x: number;
  y: number;
  w: number;
  h: number;
}> {
  return [
    // Large buildings (shops & temples) — corner blocks
    { x: 176, y: 96, w: 96, h: 96 }, // NW shop block
    { x: 944, y: 96, w: 96, h: 96 }, // NE shop block
    { x: 176, y: 832, w: 96, h: 96 }, // SW temple block
    { x: 944, y: 832, w: 96, h: 96 }, // SE temple block

    // Alley walls (north segments)
    { x: 272, y: 256, w: 32, h: 160 }, // West alley wall (north)
    { x: 912, y: 256, w: 32, h: 160 }, // East alley wall (north)

    // Border blocks (mid-map narrows)
    { x: 64, y: 368, w: 128, h: 32 }, // W border block (upper)
    { x: 1216, y: 368, w: 128, h: 32 }, // E border block (upper)
    { x: 64, y: 592, w: 128, h: 32 }, // W border block (lower)
    { x: 1216, y: 592, w: 128, h: 32 }, // E border block (lower)

    // Alley walls (south segments)
    { x: 272, y: 672, w: 32, h: 160 }, // West alley wall (south)
    { x: 912, y: 672, w: 32, h: 160 }, // East alley wall (south)

    // Cover objects — tuk-tuks, stalls, songthaew
    { x: 176, y: 272, w: 32, h: 32 }, // NW tuk-tuk
    { x: 1072, y: 272, w: 32, h: 32 }, // NE tuk-tuk
    { x: 688, y: 368, w: 32, h: 32 }, // Center object (market stall)
    { x: 336, y: 112, w: 32, h: 32 }, // NW road stall
    { x: 816, y: 112, w: 32, h: 32 }, // NE road stall
    { x: 608, y: 464, w: 64, h: 32 }, // Mid-center pair (songthaew)
    { x: 176, y: 688, w: 32, h: 32 }, // SW tuk-tuk
    { x: 1072, y: 688, w: 32, h: 32 }, // SE tuk-tuk
    { x: 368, y: 848, w: 32, h: 32 }, // SW road stall
    { x: 816, y: 848, w: 32, h: 32 }, // SE road stall
  ];
}

/**
 * Water refill station positions (6 total). Matches server.
 */
export function getWaterStationPositions(): Array<{
  x: number;
  y: number;
}> {
  return [
    { x: 496, y: 176 }, // NW road hydrant
    { x: 1136, y: 176 }, // NE road hydrant
    { x: 496, y: 784 }, // SW road hydrant
    { x: 1136, y: 784 }, // SE road hydrant
    { x: 80, y: 560 }, // West mid tank
    { x: 1200, y: 560 }, // East mid tank
  ];
}

/**
 * Spawn positions for up to 8 players. Matches server.
 */
export function getSpawnPositions(): Array<{ x: number; y: number }> {
  return [
    { x: 48, y: 48 }, // S1 NW
    { x: 1168, y: 48 }, // S2 NE
    { x: 880, y: 304 }, // S3 East mid-north
    { x: 80, y: 432 }, // S4 West mid
    { x: 1136, y: 432 }, // S5 East mid
    { x: 464, y: 656 }, // S6 West mid-south
    { x: 48, y: 912 }, // S7 SW
    { x: 1168, y: 912 }, // S8 SE
  ];
}

/**
 * Slippery zone rectangles (center-based). Matches server.
 */
export function getSlipperyZones(): Array<{
  x: number;
  y: number;
  w: number;
  h: number;
}> {
  return [
    { x: 176, y: 848, w: 192, h: 64 }, // SW temple puddle
    { x: 976, y: 848, w: 192, h: 64 }, // SE temple puddle
  ];
}

export const MAP_WIDTH = MAP_W * TILE_SIZE; // 1280
export const MAP_HEIGHT = MAP_H * TILE_SIZE; // 960
export { TILE_SIZE, MAP_W, MAP_H };
