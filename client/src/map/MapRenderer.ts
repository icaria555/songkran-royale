import Phaser from "phaser";
import {
  getMapData,
  getObstacleRects,
  getWaterStationPositions,
  getSpawnPositions,
  getSlipperyZones,
  TILE_SIZE,
  MAP_W,
  MAP_H,
  MAP_WIDTH,
  MAP_HEIGHT,
} from "./ChiangMaiMap";
import { WaterStation } from "../game/WaterStation";

/**
 * MapRenderer — draws the Chiang Mai tilemap and sets up physics bodies.
 *
 * Tile texture mapping:
 *   0 (ground)      -> tile_ground
 *   1 (building)    -> tile_wall
 *   2 (temple)      -> tile_temple
 *   3 (road marking)-> tile_road
 *   4 (cover)       -> tile_wall (same brick look, smaller)
 *   5 (puddle)      -> tile_puddle
 *   6 (water stn)   -> tile_ground (station sprite drawn separately)
 *   7 (alley wall)  -> tile_wall
 *   8 (spawn)       -> tile_ground
 */

const TILE_TEXTURE: Record<number, string> = {
  0: "tile_ground",
  1: "tile_wall",
  2: "tile_temple",
  3: "tile_road",
  4: "tile_wall",
  5: "tile_puddle",
  6: "tile_ground",
  7: "tile_wall",
  8: "tile_ground",
};

export class MapRenderer {
  private scene: Phaser.Scene;
  private slipperyOverlays: Phaser.GameObjects.Rectangle[] = [];

  /** Populated after render — use for physics collisions in GameScene */
  walls!: Phaser.Physics.Arcade.StaticGroup;

  /** Populated after render — use for refill logic */
  waterStations: WaterStation[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Renders the full map: tiles, obstacles, slippery overlays, water stations,
   * and spawn markers.
   *
   * @param usePhysics  If true, obstacle rects get static Arcade bodies (GameScene).
   *                    If false, only visuals are drawn (OnlineGameScene).
   */
  render(usePhysics: boolean): void {
    this.drawTileGrid();

    if (usePhysics) {
      this.walls = this.scene.physics.add.staticGroup();
      this.createObstaclePhysics();
    } else {
      this.createObstacleVisuals();
    }

    this.createSlipperyOverlays();
    this.createWaterStations();
    this.createSpawnMarkers();
  }

  // ── Tile grid ──────────────────────────────────────────

  private drawTileGrid(): void {
    const mapData = getMapData();
    for (let row = 0; row < MAP_H; row++) {
      for (let col = 0; col < MAP_W; col++) {
        const tileId = mapData[row][col];
        const texKey = TILE_TEXTURE[tileId] || "tile_ground";
        const px = col * TILE_SIZE + TILE_SIZE / 2;
        const py = row * TILE_SIZE + TILE_SIZE / 2;
        this.scene.add.image(px, py, texKey).setDepth(0);
      }
    }
  }

  // ── Obstacles with physics ─────────────────────────────

  private createObstaclePhysics(): void {
    const obstacles = getObstacleRects();
    for (const obs of obstacles) {
      const rect = this.scene.add
        .rectangle(obs.x, obs.y, obs.w, obs.h, 0x000000, 0)
        .setDepth(5);
      this.walls.add(rect);
    }
  }

  // ── Obstacles visual-only (server handles collision) ───

  private createObstacleVisuals(): void {
    // Obstacles are already rendered as wall tiles in the grid.
    // No additional visuals needed — the tilemap tiles cover them.
  }

  // ── Slippery zone overlays ─────────────────────────────

  private createSlipperyOverlays(): void {
    const zones = getSlipperyZones();
    for (const zone of zones) {
      // Semi-transparent blue-white overlay
      const overlay = this.scene.add
        .rectangle(zone.x, zone.y, zone.w, zone.h, 0x88ccff, 0.25)
        .setDepth(1);
      this.slipperyOverlays.push(overlay);

      // Ripple animation — oscillate alpha
      this.scene.tweens.add({
        targets: overlay,
        alpha: { from: 0.15, to: 0.35 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // ── Water stations ─────────────────────────────────────

  private createWaterStations(): void {
    const positions = getWaterStationPositions();
    for (const pos of positions) {
      this.waterStations.push(new WaterStation(this.scene, pos.x, pos.y));
    }
  }

  // ── Spawn point markers ────────────────────────────────

  private createSpawnMarkers(): void {
    const spawns = getSpawnPositions();
    for (let i = 0; i < spawns.length; i++) {
      const sp = spawns[i];
      // Subtle diamond marker
      const marker = this.scene.add
        .circle(sp.x, sp.y, 8, 0xffdd44, 0.15)
        .setDepth(1);

      // Gentle pulse
      this.scene.tweens.add({
        targets: marker,
        alpha: { from: 0.1, to: 0.25 },
        scale: { from: 1, to: 1.3 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // ── Public helpers ─────────────────────────────────────

  /**
   * Check if a world position is inside any slippery zone.
   */
  isInSlipperyZone(x: number, y: number): boolean {
    const zones = getSlipperyZones();
    for (const z of zones) {
      const left = z.x - z.w / 2;
      const right = z.x + z.w / 2;
      const top = z.y - z.h / 2;
      const bottom = z.y + z.h / 2;
      if (x >= left && x <= right && y >= top && y <= bottom) {
        return true;
      }
    }
    return false;
  }

  getMapWidth(): number {
    return MAP_WIDTH;
  }

  getMapHeight(): number {
    return MAP_HEIGHT;
  }
}
