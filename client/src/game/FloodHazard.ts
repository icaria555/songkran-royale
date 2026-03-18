import Phaser from "phaser";

/**
 * FloodHazard — renders flood zone visuals for Khao San Road map.
 *
 * Three states:
 *   - inactive: zones hidden
 *   - warning:  flashing blue rectangles + warning text
 *   - active:   solid blue water overlay with ripple animation + flood text
 */

interface FloodZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class FloodHazard {
  private scene: Phaser.Scene;
  private overlays: Phaser.GameObjects.Rectangle[] = [];
  private rippleOverlays: Phaser.GameObjects.Rectangle[] = [];
  private warningText: Phaser.GameObjects.Text | null = null;
  private floodText: Phaser.GameObjects.Text | null = null;
  private warningTweens: Phaser.Tweens.Tween[] = [];
  private rippleTweens: Phaser.Tweens.Tween[] = [];
  private state: "inactive" | "warning" | "active" = "inactive";
  private zones: FloodZone[] = [];

  // Water refill indicator
  private refillTexts: Phaser.GameObjects.Text[] = [];
  private refillTimer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show flashing blue zone warning before flood activates.
   */
  showWarning(zones: FloodZone[]): void {
    this.deactivate();
    this.state = "warning";
    this.zones = zones;

    for (const zone of zones) {
      const overlay = this.scene.add
        .rectangle(zone.x, zone.y, zone.w, zone.h, 0x3388ff, 0.15)
        .setDepth(2);

      const tween = this.scene.tweens.add({
        targets: overlay,
        alpha: { from: 0.05, to: 0.35 },
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.overlays.push(overlay);
      this.warningTweens.push(tween);
    }

    // Warning text (scroll-factor 0 = HUD-pinned)
    this.warningText = this.scene.add
      .text(
        this.scene.scale.width / 2,
        60,
        "FLOOD INCOMING!",
        {
          fontSize: "16px",
          color: "#55aaff",
          fontFamily: "Kanit, sans-serif",
          fontStyle: "bold",
          stroke: "#002244",
          strokeThickness: 3,
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    // Flash the warning text
    this.scene.tweens.add({
      targets: this.warningText,
      alpha: { from: 0.4, to: 1 },
      duration: 250,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Activate flood — solid water overlay with ripple animation.
   */
  activate(zones: FloodZone[]): void {
    this.deactivate();
    this.state = "active";
    this.zones = zones;

    for (const zone of zones) {
      // Base water layer
      const overlay = this.scene.add
        .rectangle(zone.x, zone.y, zone.w, zone.h, 0x2277cc, 0.4)
        .setDepth(2);
      this.overlays.push(overlay);

      // Ripple layer on top
      const ripple = this.scene.add
        .rectangle(zone.x, zone.y, zone.w, zone.h, 0x55bbff, 0.15)
        .setDepth(2);

      const rippleTween = this.scene.tweens.add({
        targets: ripple,
        alpha: { from: 0.08, to: 0.25 },
        scaleX: { from: 0.95, to: 1.05 },
        scaleY: { from: 0.95, to: 1.05 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.rippleOverlays.push(ripple);
      this.rippleTweens.push(rippleTween);
    }

    // Flood active text
    this.floodText = this.scene.add
      .text(
        this.scene.scale.width / 2,
        60,
        "FLOOD!",
        {
          fontSize: "18px",
          color: "#66ccff",
          fontFamily: "Kanit, sans-serif",
          fontStyle: "bold",
          stroke: "#003366",
          strokeThickness: 3,
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
  }

  /**
   * Hide all flood visuals and clean up.
   */
  deactivate(): void {
    this.state = "inactive";

    // Clean warning tweens
    for (const t of this.warningTweens) {
      t.stop();
      t.destroy();
    }
    this.warningTweens = [];

    // Clean ripple tweens
    for (const t of this.rippleTweens) {
      t.stop();
      t.destroy();
    }
    this.rippleTweens = [];

    // Destroy overlays
    for (const o of this.overlays) {
      o.destroy();
    }
    this.overlays = [];

    for (const r of this.rippleOverlays) {
      r.destroy();
    }
    this.rippleOverlays = [];

    // Destroy texts
    if (this.warningText) {
      this.warningText.destroy();
      this.warningText = null;
    }
    if (this.floodText) {
      this.floodText.destroy();
      this.floodText = null;
    }

    // Destroy refill texts
    for (const t of this.refillTexts) {
      t.destroy();
    }
    this.refillTexts = [];

    this.zones = [];
  }

  /**
   * Check whether a point is inside any active flood zone.
   */
  isInFloodZone(x: number, y: number): boolean {
    if (this.state !== "active") return false;
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
   * Show "+WATER" floating text when player is standing in flood zone.
   * Call from update loop with delta.
   */
  showWaterRefillIndicator(x: number, y: number, delta: number): void {
    if (this.state !== "active") return;
    if (!this.isInFloodZone(x, y)) return;

    this.refillTimer += delta;
    if (this.refillTimer < 500) return; // throttle to every 500ms
    this.refillTimer = 0;

    const text = this.scene.add
      .text(x + (Math.random() - 0.5) * 20, y - 20, "+WATER", {
        fontSize: "10px",
        color: "#66ddff",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
        stroke: "#003355",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.refillTexts.push(text);

    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: "Power2",
      onComplete: () => {
        text.destroy();
        const idx = this.refillTexts.indexOf(text);
        if (idx !== -1) this.refillTexts.splice(idx, 1);
      },
    });
  }

  getState(): "inactive" | "warning" | "active" {
    return this.state;
  }

  destroy(): void {
    this.deactivate();
  }
}
