import Phaser from "phaser";

/**
 * WaterTruck — a hazard sprite that drives horizontally across the map.
 *
 * In offline mode (GameScene): runs on a local 30-second timer.
 * In online mode (OnlineGameScene): listens for server "waterTruck" messages.
 *
 * The truck texture ("water_truck") must be generated in BootScene before use.
 */

const TRUCK_Y = 480;
const TRUCK_SPEED = 320; // px/s
const TRUCK_INTERVAL = 30_000; // ms between spawns
const TRUCK_WARNING_MS = 2_000;
const TRUCK_START_X = -64;
const TRUCK_END_X = 1344;
const TRUCK_HIT_RADIUS = 48;
const TRUCK_WET_DAMAGE = 25;

export class WaterTruck {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private active = false;
  private warningText: Phaser.GameObjects.Text | null = null;
  private warningZone: Phaser.GameObjects.Rectangle | null = null;
  private truckTimer: Phaser.Time.TimerEvent | null = null;
  private isOnline: boolean;

  // Splash trail timer
  private splashTimer = 0;

  private disabled: boolean;

  constructor(scene: Phaser.Scene, online: boolean, disabled = false) {
    this.scene = scene;
    this.isOnline = online;
    this.disabled = disabled;

    if (!online && !disabled) {
      // Offline mode: start the periodic timer
      this.scheduleNextTruck();
    }
  }

  // ── Offline scheduling ─────────────────────────────────

  private scheduleNextTruck(): void {
    this.truckTimer = this.scene.time.delayedCall(
      TRUCK_INTERVAL - TRUCK_WARNING_MS,
      () => {
        this.showWarning();
        this.scene.time.delayedCall(TRUCK_WARNING_MS, () => {
          this.spawnTruck();
        });
      }
    );
  }

  // ── Online: call this from server message ──────────────

  /**
   * Called when the server sends a "waterTruck" event.
   * @param phase  "warning" or "spawn"
   * @param x      Optional: current truck x position for sync
   */
  onServerEvent(phase: string, x?: number): void {
    if (phase === "warning") {
      this.showWarning();
    } else if (phase === "spawn") {
      this.spawnTruck(x);
    }
  }

  /**
   * Sync truck position from server tick (online mode).
   */
  syncPosition(x: number): void {
    if (this.sprite && this.active) {
      this.sprite.x = x;
    }
  }

  // ── Warning indicator ──────────────────────────────────

  private showWarning(): void {
    // Flashing red zone across the truck path
    this.warningZone = this.scene.add
      .rectangle(640, TRUCK_Y, 1280, TRUCK_HIT_RADIUS * 2, 0xff0000, 0.1)
      .setDepth(3);

    this.scene.tweens.add({
      targets: this.warningZone,
      alpha: { from: 0.05, to: 0.2 },
      duration: 300,
      yoyo: true,
      repeat: 5,
      ease: "Sine.easeInOut",
    });

    // Warning text
    this.warningText = this.scene.add
      .text(640, TRUCK_Y - 50, "Water Truck!", {
        fontSize: "18px",
        color: "#ff4444",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.scene.tweens.add({
      targets: this.warningText,
      alpha: { from: 0.4, to: 1 },
      duration: 250,
      yoyo: true,
      repeat: 3,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (this.warningText) {
          this.warningText.destroy();
          this.warningText = null;
        }
      },
    });
  }

  // ── Spawn & drive ──────────────────────────────────────

  private spawnTruck(startX?: number): void {
    // Clean up warning zone
    if (this.warningZone) {
      this.warningZone.destroy();
      this.warningZone = null;
    }

    const sx = startX ?? TRUCK_START_X;

    this.sprite = this.scene.add
      .sprite(sx, TRUCK_Y, "water_truck")
      .setScale(2)
      .setDepth(15);

    this.active = true;
    this.splashTimer = 0;
  }

  // ── Per-frame update ───────────────────────────────────

  /**
   * Call from scene.update(). Returns hit info if the truck is near a position.
   */
  update(delta: number): void {
    if (!this.active || !this.sprite) return;

    // Move truck (in offline mode; online mode uses syncPosition)
    if (!this.isOnline) {
      this.sprite.x += TRUCK_SPEED * (delta / 1000);
    }

    // Water splash trail particles
    this.splashTimer += delta;
    if (this.splashTimer >= 80) {
      this.splashTimer = 0;
      this.emitSplashTrail();
    }

    // Check if truck is off-screen
    if (this.sprite.x > TRUCK_END_X) {
      this.despawnTruck();
      if (!this.isOnline) {
        this.scheduleNextTruck();
      }
    }
  }

  /**
   * Check if a player at (px, py) is hit by the truck this frame.
   */
  isHitting(px: number, py: number): boolean {
    if (!this.active || !this.sprite) return false;
    const dx = px - this.sprite.x;
    const dy = py - TRUCK_Y;
    return Math.abs(dy) < TRUCK_HIT_RADIUS && Math.abs(dx) < 48;
  }

  /**
   * The wet damage dealt on hit.
   */
  getWetDamage(): number {
    return TRUCK_WET_DAMAGE;
  }

  // ── Splash trail particles ─────────────────────────────

  private emitSplashTrail(): void {
    if (!this.sprite) return;

    for (let i = 0; i < 3; i++) {
      const ox = -20 - Math.random() * 20; // behind the truck
      const oy = (Math.random() - 0.5) * 40;
      const drop = this.scene.add
        .circle(this.sprite.x + ox, TRUCK_Y + oy, 2 + Math.random() * 2, 0x6ab5f5, 0.7)
        .setDepth(14);

      this.scene.tweens.add({
        targets: drop,
        x: drop.x - 30 - Math.random() * 20,
        y: drop.y + 10 + Math.random() * 15,
        alpha: 0,
        scale: 0.3,
        duration: 300 + Math.random() * 200,
        ease: "Power2",
        onComplete: () => drop.destroy(),
      });
    }
  }

  // ── Cleanup ────────────────────────────────────────────

  private despawnTruck(): void {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
    this.active = false;
  }

  destroy(): void {
    this.despawnTruck();
    if (this.truckTimer) {
      this.truckTimer.destroy();
      this.truckTimer = null;
    }
    if (this.warningText) {
      this.warningText.destroy();
      this.warningText = null;
    }
    if (this.warningZone) {
      this.warningZone.destroy();
      this.warningZone = null;
    }
  }
}
