import Phaser from "phaser";

/** Returns true when running on a touch-capable mobile device. */
export function isMobile(): boolean {
  const hasTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;
  const narrowScreen = window.innerWidth < 768;
  return hasTouch && narrowScreen;
}

export interface JoystickVector {
  x: number; // -1 .. 1
  y: number; // -1 .. 1
}

/**
 * Mobile touch controls overlay: virtual joystick (left), shoot button (right),
 * and a contextual refill button.
 *
 * All elements are placed in the HUD layer (scrollFactor 0) at depth 500+
 * so they render above every game object.
 */
export class TouchControls {
  private scene: Phaser.Scene;

  // ── Joystick ─────────────────────────────────────────────
  private joystickBase: Phaser.GameObjects.Arc;
  private joystickThumb: Phaser.GameObjects.Arc;
  private joystickPointerID: number | null = null;
  private joystickCenter: Phaser.Math.Vector2;
  private readonly joystickRadius = 48; // base radius
  private readonly thumbRadius = 24;
  private readonly deadZone = 0.1; // fraction of radius

  /** Normalised direction the joystick is pointing (-1..1 each axis). */
  direction: JoystickVector = { x: 0, y: 0 };

  // ── Shoot button ─────────────────────────────────────────
  private shootButton: Phaser.GameObjects.Arc;
  private shootLabel: Phaser.GameObjects.Text;
  private shootPointerID: number | null = null;
  private autoFireTimer: Phaser.Time.TimerEvent | null = null;

  /** Fires once on tap, then repeatedly while held. */
  onShoot: (() => void) | null = null;

  // ── Refill button ────────────────────────────────────────
  private refillButton: Phaser.GameObjects.Arc;
  private refillLabel: Phaser.GameObjects.Text;
  onRefill: (() => void) | null = null;

  /** Set to true externally when the player is near a water station. */
  private _showRefill = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const { width, height } = scene.scale;
    const depth = 500;

    // ── Joystick ───────────────────────────────────────────
    const jx = 80;
    const jy = height - 160;
    this.joystickCenter = new Phaser.Math.Vector2(jx, jy);

    this.joystickBase = scene.add
      .circle(jx, jy, this.joystickRadius, 0x000000, 0.35)
      .setScrollFactor(0)
      .setDepth(depth)
      .setStrokeStyle(2, 0xffffff, 0.2);

    this.joystickThumb = scene.add
      .circle(jx, jy, this.thumbRadius, 0xffffff, 0.4)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    // ── Shoot button ───────────────────────────────────────
    const sx = width - 80;
    const sy = height - 160;

    this.shootButton = scene.add
      .circle(sx, sy, 40, 0x3ab5f5, 0.6)
      .setScrollFactor(0)
      .setDepth(depth)
      .setStrokeStyle(2, 0xffffff, 0.3)
      .setInteractive();

    this.shootLabel = scene.add
      .text(sx, sy, "\uD83D\uDCA6", { fontSize: "28px" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    // ── Refill button (above shoot, hidden by default) ────
    const rx = sx;
    const ry = sy - 100;

    this.refillButton = scene.add
      .circle(rx, ry, 28, 0x42e8b5, 0.6)
      .setScrollFactor(0)
      .setDepth(depth)
      .setStrokeStyle(2, 0xffffff, 0.3)
      .setInteractive()
      .setVisible(false);

    this.refillLabel = scene.add
      .text(rx, ry, "\uD83D\uDEB0", { fontSize: "22px" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1)
      .setVisible(false);

    // ── Pointer events ─────────────────────────────────────
    scene.input.on("pointerdown", this.handlePointerDown, this);
    scene.input.on("pointermove", this.handlePointerMove, this);
    scene.input.on("pointerup", this.handlePointerUp, this);

    // Refill button tap
    this.refillButton.on("pointerdown", () => {
      if (this.onRefill) this.onRefill();
    });
  }

  // ── Public API ───────────────────────────────────────────

  /** Call from scene update() to keep auto-fire going (no-op otherwise). */
  update(): void {
    // Nothing needed per-frame right now; auto-fire is timer-based.
  }

  setRefillVisible(visible: boolean): void {
    if (visible === this._showRefill) return;
    this._showRefill = visible;
    this.refillButton.setVisible(visible);
    this.refillLabel.setVisible(visible);
  }

  destroy(): void {
    this.scene.input.off("pointerdown", this.handlePointerDown, this);
    this.scene.input.off("pointermove", this.handlePointerMove, this);
    this.scene.input.off("pointerup", this.handlePointerUp, this);

    if (this.autoFireTimer) {
      this.autoFireTimer.destroy();
      this.autoFireTimer = null;
    }

    this.joystickBase.destroy();
    this.joystickThumb.destroy();
    this.shootButton.destroy();
    this.shootLabel.destroy();
    this.refillButton.destroy();
    this.refillLabel.destroy();
  }

  // ── Internal pointer handling ────────────────────────────

  private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    pointer.event.preventDefault();

    const { width } = this.scene.scale;
    const halfW = width / 2;

    // Left half → joystick
    if (pointer.x < halfW && this.joystickPointerID === null) {
      this.joystickPointerID = pointer.id;
      this.updateJoystick(pointer);
      return;
    }

    // Right half → shoot (but not if we hit refill button area)
    if (pointer.x >= halfW && this.shootPointerID === null) {
      // Check if this is a refill tap
      if (this._showRefill) {
        const rx = this.refillButton.x;
        const ry = this.refillButton.y;
        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, rx, ry);
        if (dist <= 36) {
          // Refill tap — don't claim as shoot
          if (this.onRefill) this.onRefill();
          return;
        }
      }

      this.shootPointerID = pointer.id;
      this.fireOnce();
      this.startAutoFire();

      // Visual feedback
      this.shootButton.setScale(0.9);
    }
  };

  private handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    pointer.event.preventDefault();

    if (pointer.id === this.joystickPointerID) {
      this.updateJoystick(pointer);
    }
  };

  private handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.joystickPointerID) {
      this.joystickPointerID = null;
      this.direction = { x: 0, y: 0 };
      // Snap thumb back to centre
      this.joystickThumb.setPosition(
        this.joystickCenter.x,
        this.joystickCenter.y
      );
    }

    if (pointer.id === this.shootPointerID) {
      this.shootPointerID = null;
      this.stopAutoFire();
      // Visual feedback — bounce back
      this.scene.tweens.add({
        targets: this.shootButton,
        scale: 1,
        duration: 100,
        ease: "Back.easeOut",
      });
    }
  };

  // ── Joystick math ────────────────────────────────────────

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.joystickCenter.x;
    const dy = pointer.y - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.joystickRadius * this.deadZone) {
      // Inside dead zone
      this.direction = { x: 0, y: 0 };
      this.joystickThumb.setPosition(
        this.joystickCenter.x,
        this.joystickCenter.y
      );
      return;
    }

    // Clamp to base radius
    const clamped = Math.min(dist, this.joystickRadius);
    const angle = Math.atan2(dy, dx);

    this.joystickThumb.setPosition(
      this.joystickCenter.x + Math.cos(angle) * clamped,
      this.joystickCenter.y + Math.sin(angle) * clamped
    );

    // Normalise to -1..1
    const norm = clamped / this.joystickRadius;
    this.direction = {
      x: Math.cos(angle) * norm,
      y: Math.sin(angle) * norm,
    };
  }

  // ── Shoot helpers ────────────────────────────────────────

  private fireOnce(): void {
    if (this.onShoot) this.onShoot();
  }

  private startAutoFire(): void {
    this.stopAutoFire();
    this.autoFireTimer = this.scene.time.addEvent({
      delay: 200,
      callback: () => this.fireOnce(),
      loop: true,
    });
  }

  private stopAutoFire(): void {
    if (this.autoFireTimer) {
      this.autoFireTimer.destroy();
      this.autoFireTimer = null;
    }
  }
}
