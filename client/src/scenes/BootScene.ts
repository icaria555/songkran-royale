import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    // Generate placeholder textures — will be replaced with real spritesheets in Phase 3
    this.createPlaceholderTextures();
  }

  create(): void {
    this.scene.start("CharacterScene");
  }

  private createPlaceholderTextures(): void {
    // Player sprites (16×16 scaled 4×)
    const charColors: Record<string, number> = {
      female: 0xff8ec7,
      male: 0x3ab5f5,
      lgbtq: 0x42e8b5,
    };

    for (const [key, color] of Object.entries(charColors)) {
      const gfx = this.make.graphics({ x: 0, y: 0 }, false);
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, 0, 16, 16);
      // Darker outline
      gfx.lineStyle(1, 0x000000, 0.5);
      gfx.strokeRect(0, 0, 16, 16);
      // Eyes
      gfx.fillStyle(0x1a0800, 1);
      gfx.fillRect(4, 5, 2, 2);
      gfx.fillRect(10, 5, 2, 2);
      gfx.generateTexture(`char_${key}`, 16, 16);
      gfx.destroy();
    }

    // AI enemy
    const aiGfx = this.make.graphics({ x: 0, y: 0 }, false);
    aiGfx.fillStyle(0xff6b6b, 1);
    aiGfx.fillRect(0, 0, 16, 16);
    aiGfx.fillStyle(0x1a0800, 1);
    aiGfx.fillRect(4, 5, 2, 2);
    aiGfx.fillRect(10, 5, 2, 2);
    aiGfx.generateTexture("char_ai", 16, 16);
    aiGfx.destroy();

    // Water projectile
    const bulletGfx = this.make.graphics({ x: 0, y: 0 }, false);
    bulletGfx.fillStyle(0x3ab5f5, 1);
    bulletGfx.fillCircle(4, 4, 4);
    bulletGfx.generateTexture("water_bullet", 8, 8);
    bulletGfx.destroy();

    // Water station
    const stationGfx = this.make.graphics({ x: 0, y: 0 }, false);
    stationGfx.fillStyle(0x1a6fb5, 0.6);
    stationGfx.fillCircle(24, 24, 24);
    stationGfx.fillStyle(0x3ab5f5, 0.8);
    stationGfx.fillCircle(24, 24, 16);
    stationGfx.generateTexture("water_station", 48, 48);
    stationGfx.destroy();

    // Map tile placeholder
    const tileGfx = this.make.graphics({ x: 0, y: 0 }, false);
    tileGfx.fillStyle(0x2a4a3a, 1);
    tileGfx.fillRect(0, 0, 16, 16);
    tileGfx.lineStyle(0.5, 0x3a5a4a, 0.3);
    tileGfx.strokeRect(0, 0, 16, 16);
    tileGfx.generateTexture("tile_ground", 16, 16);
    tileGfx.destroy();

    // Wall tile
    const wallGfx = this.make.graphics({ x: 0, y: 0 }, false);
    wallGfx.fillStyle(0x5a3a2a, 1);
    wallGfx.fillRect(0, 0, 16, 16);
    wallGfx.lineStyle(1, 0x7a5a4a, 0.5);
    wallGfx.strokeRect(1, 1, 14, 14);
    wallGfx.generateTexture("tile_wall", 16, 16);
    wallGfx.destroy();
  }
}
