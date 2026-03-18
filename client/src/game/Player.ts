import Phaser from "phaser";
import {
  PLAYER_SPEED,
  WATER_COST_PER_SHOT,
  canShoot,
  applyShot,
} from "./GameLogic";

export class Player {
  sprite: Phaser.Physics.Arcade.Sprite;
  waterLevel = 100;
  wetMeter = 0;
  isAlive = true;
  character: string;
  nationality: string;
  nickname: string;
  score = 0;

  private scene: Phaser.Scene;
  private cursors: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };
  private aimAngle = 0;
  private touchActive = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    character: string,
    nationality: string,
    nickname: string
  ) {
    this.scene = scene;
    this.character = character;
    this.nationality = nationality;
    this.nickname = nickname;

    this.sprite = scene.physics.add
      .sprite(x, y, `char_${character}`)
      .setScale(4)
      .setCollideWorldBounds(true)
      .setDepth(10);

    this.sprite.body!.setSize(12, 12);
    this.sprite.body!.setOffset(2, 2);

    const kb = scene.input.keyboard!;
    this.cursors = {
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Nickname label above head
    scene.add
      .text(0, 0, nickname, {
        fontSize: "10px",
        color: "#e8f4ff",
        fontFamily: "Kanit, sans-serif",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(11)
      .setName("playerLabel");
  }

  /**
   * Apply movement from a virtual joystick. When called the player enters
   * "touch mode" and keyboard/mouse aim is bypassed for that frame.
   */
  applyTouchInput(joystick: { x: number; y: number }): void {
    this.touchActive = true;

    if (!this.isAlive) return;

    let vx = joystick.x;
    let vy = joystick.y;

    // Normalize if magnitude > 1
    const mag = Math.sqrt(vx * vx + vy * vy);
    if (mag > 1) {
      vx /= mag;
      vy /= mag;
    }

    this.sprite.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);

    // Aim in movement direction (auto-aim)
    if (mag > 0.1) {
      this.aimAngle = Math.atan2(vy, vx);
    }
  }

  update(): void {
    if (!this.isAlive) {
      this.sprite.setVelocity(0, 0);
      this.sprite.setAlpha(0.3);
      return;
    }

    // If touch input was applied this frame, skip keyboard/mouse handling
    if (this.touchActive) {
      this.touchActive = false;
    } else {
      // Movement
      let vx = 0;
      let vy = 0;
      if (this.cursors.a.isDown) vx = -1;
      if (this.cursors.d.isDown) vx = 1;
      if (this.cursors.w.isDown) vy = -1;
      if (this.cursors.s.isDown) vy = 1;

      // Normalize diagonal
      if (vx !== 0 && vy !== 0) {
        const norm = 1 / Math.SQRT2;
        vx *= norm;
        vy *= norm;
      }

      this.sprite.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);

      // Aim toward mouse
      const pointer = this.scene.input.activePointer;
      const worldPoint = this.scene.cameras.main.getWorldPoint(
        pointer.x,
        pointer.y
      );
      this.aimAngle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        worldPoint.x,
        worldPoint.y
      );
    }

    // Update label position
    const label = this.scene.children.getByName(
      "playerLabel"
    ) as Phaser.GameObjects.Text;
    if (label) {
      label.setPosition(this.sprite.x, this.sprite.y - 40);
    }
  }

  getAimAngle(): number {
    return this.aimAngle;
  }

  tryShoot(): boolean {
    if (!this.isAlive || !canShoot(this.waterLevel)) return false;
    this.waterLevel = applyShot(this.waterLevel);
    return true;
  }

  takeDamage(isDirect: boolean): void {
    const damage = isDirect ? 15 : 5;
    this.wetMeter = Math.min(100, this.wetMeter + damage);
    if (this.wetMeter >= 100) {
      this.isAlive = false;
    }
  }

  refill(deltaSeconds: number): void {
    this.waterLevel = Math.min(100, this.waterLevel + 30 * deltaSeconds);
  }
}
