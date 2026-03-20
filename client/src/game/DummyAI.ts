import Phaser from "phaser";
import { PLAYER_SPEED } from "./GameLogic";

export class DummyAI {
  sprite: Phaser.Physics.Arcade.Sprite;
  waterLevel = 100;
  wetMeter = 0;
  isAlive = true;

  private scene: Phaser.Scene;
  private moveTimer = 0;
  private shootTimer = 0;
  private moveDir = { x: 0, y: 0 };
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, name: string) {
    this.scene = scene;

    this.sprite = scene.physics.add
      .sprite(x, y, "char_ai")
      .setScale(4)
      .setCollideWorldBounds(true)
      .setDepth(10);

    this.sprite.body!.setSize(12, 12);
    this.sprite.body!.setOffset(2, 2);

    this.label = scene.add
      .text(x, y - 40, `🤖 ${name}`, {
        fontSize: "10px",
        color: "#ff6b6b",
        fontFamily: "Kanit, sans-serif",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(11);
  }

  update(delta: number, playerX: number, playerY: number): number | null {
    if (!this.isAlive) {
      this.sprite.setVelocity(0, 0);
      this.sprite.setAlpha(0.3);
      this.label.setAlpha(0.3);
      this.sprite.anims.play("ai_death", true);
      return null;
    }

    this.label.setPosition(this.sprite.x, this.sprite.y - 40);
    const dt = delta / 1000;

    // Change direction every 1-3 seconds
    this.moveTimer -= dt;
    if (this.moveTimer <= 0) {
      this.moveTimer = 1 + Math.random() * 2;

      // 50% chance to move toward player, 50% random
      if (Math.random() < 0.5) {
        const angle = Phaser.Math.Angle.Between(
          this.sprite.x,
          this.sprite.y,
          playerX,
          playerY
        );
        this.moveDir.x = Math.cos(angle);
        this.moveDir.y = Math.sin(angle);
      } else {
        const angle = Math.random() * Math.PI * 2;
        this.moveDir.x = Math.cos(angle);
        this.moveDir.y = Math.sin(angle);
      }
    }

    const speed = PLAYER_SPEED * 0.7;
    this.sprite.setVelocity(
      this.moveDir.x * speed,
      this.moveDir.y * speed
    );

    // Flip sprite based on movement direction
    if (this.moveDir.x !== 0) {
      this.sprite.setFlipX(this.moveDir.x < 0);
    }

    // Shoot toward player periodically
    this.shootTimer -= dt;
    let shotAngle: number | null = null;
    if (this.shootTimer <= 0 && this.waterLevel >= 5) {
      this.shootTimer = 0.8 + Math.random() * 1.5;
      const dist = Phaser.Math.Distance.Between(
        this.sprite.x,
        this.sprite.y,
        playerX,
        playerY
      );

      if (dist < 300 && this.waterLevel >= 5) {
        this.waterLevel = Math.max(0, this.waterLevel - 5);
        shotAngle = Phaser.Math.Angle.Between(
          this.sprite.x,
          this.sprite.y,
          playerX,
          playerY
        );

        // Brief shoot animation
        this.sprite.anims.play("ai_shoot", true);
        this.scene.time.delayedCall(150, () => {
          if (this.sprite.active && this.isAlive) {
            this.sprite.anims.play("ai_walk", true);
          }
        });
        return shotAngle;
      }
    }

    // Walk/idle animation
    const moving = this.sprite.body!.velocity.length() > 10;
    if (moving) {
      this.sprite.anims.play("ai_walk", true);
    } else {
      this.sprite.anims.play("ai_idle", true);
    }

    return null;
  }

  takeDamage(isDirect: boolean): void {
    const damage = isDirect ? 15 : 5;
    this.wetMeter = Math.min(100, this.wetMeter + damage);
    if (this.wetMeter >= 100) {
      this.isAlive = false;
    }

    // Flash red on hit
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });
  }

  refill(deltaSeconds: number): void {
    this.waterLevel = Math.min(100, this.waterLevel + 30 * deltaSeconds);
  }
}
