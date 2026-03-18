import Phaser from "phaser";
import { soundManager } from "../audio/SoundManager";

/**
 * PartyZone — renders party zone visuals for Khao San Road map.
 *
 * Visual:
 *   - Semi-transparent purple/magenta overlay with pulsing alpha
 *   - Musical note particles floating upward
 *
 * Audio:
 *   - When local player enters: muffle SFX (30% volume)
 *   - When local player leaves: restore normal audio
 */

interface PartyZoneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class PartyZone {
  private scene: Phaser.Scene;
  private zones: PartyZoneRect[] = [];
  private overlays: Phaser.GameObjects.Rectangle[] = [];
  private pulseTweens: Phaser.Tweens.Tween[] = [];
  private noteTimer = 0;
  private isPlayerInside = false;
  private originalVolume: number | null = null;

  constructor(scene: Phaser.Scene, zones: PartyZoneRect[]) {
    this.scene = scene;
    this.zones = zones;
    this.createOverlays();
  }

  private createOverlays(): void {
    for (const zone of this.zones) {
      // Purple/magenta semi-transparent overlay
      const overlay = this.scene.add
        .rectangle(zone.x, zone.y, zone.w, zone.h, 0xcc44aa, 0.2)
        .setDepth(2);

      // Pulsing alpha animation
      const tween = this.scene.tweens.add({
        targets: overlay,
        alpha: { from: 0.12, to: 0.28 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.overlays.push(overlay);
      this.pulseTweens.push(tween);
    }
  }

  /**
   * Check if a point is inside any party zone.
   */
  isInPartyZone(x: number, y: number): boolean {
    for (const z of this.zones) {
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

  /**
   * Call from update loop. Handles musical note particles and audio muffling.
   */
  update(playerX: number, playerY: number, delta: number): void {
    // Musical note particles
    this.noteTimer += delta;
    if (this.noteTimer >= 400) {
      this.noteTimer = 0;
      this.spawnMusicNotes();
    }

    // Audio muffling based on player position
    const inZone = this.isInPartyZone(playerX, playerY);

    if (inZone && !this.isPlayerInside) {
      // Entering party zone — muffle SFX
      this.isPlayerInside = true;
      this.originalVolume = soundManager.getVolume();
      soundManager.setVolume(this.originalVolume * 0.3);
    } else if (!inZone && this.isPlayerInside) {
      // Leaving party zone — restore audio
      this.isPlayerInside = false;
      if (this.originalVolume !== null) {
        soundManager.setVolume(this.originalVolume);
        this.originalVolume = null;
      }
    }
  }

  private spawnMusicNotes(): void {
    for (const zone of this.zones) {
      // Spawn 1-2 notes per zone per interval
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const offsetX = (Math.random() - 0.5) * zone.w * 0.8;
        const offsetY = (Math.random() - 0.5) * zone.h * 0.6;
        const noteX = zone.x + offsetX;
        const noteY = zone.y + offsetY;

        // Small colored circles as musical note particles
        const colors = [0xff66cc, 0xcc44ff, 0xff44aa, 0xaa33dd, 0xff88ee];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = 2 + Math.random() * 2;

        const note = this.scene.add
          .circle(noteX, noteY, size, color, 0.7)
          .setDepth(25);

        this.scene.tweens.add({
          targets: note,
          y: noteY - 30 - Math.random() * 20,
          x: noteX + (Math.random() - 0.5) * 16,
          alpha: 0,
          scale: 0.3,
          duration: 800 + Math.random() * 400,
          ease: "Sine.easeOut",
          onComplete: () => note.destroy(),
        });
      }
    }
  }

  /**
   * Update zone positions (used when receiving server data).
   */
  updateZones(zones: PartyZoneRect[]): void {
    this.destroy();
    this.zones = zones;
    this.createOverlays();
  }

  destroy(): void {
    // Restore audio if player was inside
    if (this.isPlayerInside && this.originalVolume !== null) {
      soundManager.setVolume(this.originalVolume);
      this.isPlayerInside = false;
      this.originalVolume = null;
    }

    for (const t of this.pulseTweens) {
      t.stop();
      t.destroy();
    }
    this.pulseTweens = [];

    for (const o of this.overlays) {
      o.destroy();
    }
    this.overlays = [];
  }
}
