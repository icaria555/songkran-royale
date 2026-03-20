import Phaser from "phaser";

/** Renders a remote player with interpolated position */
export class RemotePlayer {
  sprite: Phaser.Physics.Arcade.Sprite;
  sessionId: string;
  private label: Phaser.GameObjects.Text;
  private scene: Phaser.Scene;
  private character: string;
  private alive = true;

  // Interpolation
  private targetX = 0;
  private targetY = 0;
  private prevX = 0;
  private prevY = 0;
  private readonly lerpSpeed = 0.15;

  constructor(
    scene: Phaser.Scene,
    sessionId: string,
    x: number,
    y: number,
    character: string,
    nickname: string
  ) {
    this.scene = scene;
    this.sessionId = sessionId;
    this.character = character;
    this.targetX = x;
    this.targetY = y;
    this.prevX = x;
    this.prevY = y;

    this.sprite = scene.physics.add
      .sprite(x, y, `char_${character}`)
      .setScale(4)
      .setDepth(10);

    this.sprite.body!.setSize(12, 12);
    this.sprite.body!.setOffset(2, 2);

    this.label = scene.add
      .text(x, y - 40, nickname, {
        fontSize: "10px",
        color: "#e8f4ff",
        fontFamily: "Kanit, sans-serif",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(11);
  }

  /** Called when server state updates */
  setTargetPosition(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  /** Interpolate toward server position each frame */
  update(): void {
    this.prevX = this.sprite.x;
    this.prevY = this.sprite.y;
    this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, this.lerpSpeed);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, this.lerpSpeed);
    this.label.setPosition(this.sprite.x, this.sprite.y - 40);

    // Animate based on movement
    if (!this.alive) {
      this.sprite.anims.play(`${this.character}_death`, true);
    } else {
      const dx = this.sprite.x - this.prevX;
      const dy = this.sprite.y - this.prevY;
      const moving = Math.abs(dx) + Math.abs(dy) > 0.5;
      if (moving) {
        this.sprite.anims.play(`${this.character}_walk`, true);
        this.sprite.setFlipX(dx < 0);
      } else {
        this.sprite.anims.play(`${this.character}_idle`, true);
      }
    }
  }

  setAlive(alive: boolean): void {
    this.alive = alive;
    this.sprite.setAlpha(alive ? 1 : 0.3);
    this.label.setAlpha(alive ? 1 : 0.3);
  }

  flashHit(): void {
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.label.destroy();
  }
}
