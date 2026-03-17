import Phaser from "phaser";
import { REFILL_RANGE } from "./GameLogic";

export class WaterStation {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  private pulseEffect: Phaser.Tweens.Tween;
  private rangeCircle: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;

    // Range indicator (subtle circle)
    this.rangeCircle = scene.add
      .circle(x, y, REFILL_RANGE, 0x3ab5f5, 0.08)
      .setDepth(1);

    this.sprite = scene.add
      .sprite(x, y, "water_station")
      .setDepth(2);

    // Label
    scene.add
      .text(x, y - 32, "💧", {
        fontSize: "16px",
      })
      .setOrigin(0.5)
      .setDepth(3);

    // Pulse animation
    this.pulseEffect = scene.tweens.add({
      targets: this.rangeCircle,
      alpha: { from: 0.08, to: 0.2 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  isPlayerInRange(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= REFILL_RANGE;
  }

  setHighlight(active: boolean): void {
    if (active) {
      this.rangeCircle.setFillStyle(0x3ab5f5, 0.25);
    } else {
      this.rangeCircle.setFillStyle(0x3ab5f5, 0.08);
    }
  }
}
