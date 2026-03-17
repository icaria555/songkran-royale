import Phaser from "phaser";
import { Player } from "../game/Player";
import { DummyAI } from "../game/DummyAI";
import { WaterStation } from "../game/WaterStation";
import { HUD } from "../ui/HUD";
import { PROJECTILE_SPEED, MATCH_DURATION, PROJECTILE_POOL_SIZE } from "../game/GameLogic";

interface GameData {
  character: string;
  nationality: string;
  nickname: string;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private ai!: DummyAI;
  private hud!: HUD;
  private waterStations: WaterStation[] = [];
  private projectiles!: Phaser.Physics.Arcade.Group;
  private aiProjectiles!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private timeLeft = MATCH_DURATION;
  private gameOver = false;
  private gameData!: GameData;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: GameData): void {
    this.gameData = data;
    this.timeLeft = MATCH_DURATION;
    this.gameOver = false;
  }

  create(): void {
    // Set world bounds (larger than camera for scrolling)
    const mapWidth = 1200;
    const mapHeight = 900;
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);

    // Draw ground tiles
    for (let x = 0; x < mapWidth; x += 64) {
      for (let y = 0; y < mapHeight; y += 64) {
        this.add.image(x + 32, y + 32, "tile_ground").setScale(4).setDepth(0);
      }
    }

    // Walls around edges and some obstacles
    this.walls = this.physics.add.staticGroup();
    this.createWalls(mapWidth, mapHeight);

    // Water stations at 4 corners-ish positions
    const stationPositions = [
      { x: 200, y: 200 },
      { x: mapWidth - 200, y: 200 },
      { x: 200, y: mapHeight - 200 },
      { x: mapWidth - 200, y: mapHeight - 200 },
    ];
    stationPositions.forEach((pos) => {
      this.waterStations.push(new WaterStation(this, pos.x, pos.y));
    });

    // Player
    this.player = new Player(
      this,
      mapWidth / 2 - 100,
      mapHeight / 2,
      this.gameData.character,
      this.gameData.nationality,
      this.gameData.nickname
    );

    // Dummy AI
    this.ai = new DummyAI(
      this,
      mapWidth / 2 + 100,
      mapHeight / 2,
      "Bot สมชาย"
    );

    // Projectile pools
    this.projectiles = this.physics.add.group({
      maxSize: PROJECTILE_POOL_SIZE,
      allowGravity: false,
    });

    this.aiProjectiles = this.physics.add.group({
      maxSize: PROJECTILE_POOL_SIZE,
      allowGravity: false,
    });

    // Collisions
    this.physics.add.collider(this.player.sprite, this.walls);
    this.physics.add.collider(this.ai.sprite, this.walls);

    // Player bullets hit AI
    this.physics.add.overlap(
      this.projectiles,
      this.ai.sprite,
      (_aiSprite, bullet) => {
        (bullet as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
        this.ai.takeDamage(true);
        this.spawnHitEffect(this.ai.sprite.x, this.ai.sprite.y);

        if (!this.ai.isAlive) {
          this.player.score += 1;
          this.endGame(this.gameData.nickname);
        }
      }
    );

    // AI bullets hit player
    this.physics.add.overlap(
      this.aiProjectiles,
      this.player.sprite,
      (_playerSprite, bullet) => {
        (bullet as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
        this.player.takeDamage(true);

        // Flash player red
        this.player.sprite.setTint(0xff0000);
        this.time.delayedCall(100, () => {
          if (this.player.sprite.active) this.player.sprite.clearTint();
        });

        if (!this.player.isAlive) {
          this.endGame("Bot สมชาย");
        }
      }
    );

    // Bullets hit walls
    this.physics.add.collider(this.projectiles, this.walls, (_wall, bullet) => {
      (bullet as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    });
    this.physics.add.collider(this.aiProjectiles, this.walls, (_wall, bullet) => {
      (bullet as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    });

    // Mouse shoot
    this.input.on("pointerdown", () => {
      if (this.gameOver) return;
      this.playerShoot();
    });

    // HUD
    this.hud = new HUD(this);

    // Camera follow player
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);

    // Match timer
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.gameOver) return;
        this.timeLeft--;
        if (this.timeLeft <= 0) {
          // Time's up — lower wet meter wins
          const winner =
            this.player.wetMeter <= this.ai.wetMeter
              ? this.gameData.nickname
              : "Bot สมชาย";
          this.endGame(winner);
        }
      },
      loop: true,
    });

    // Controls hint
    this.add
      .text(this.scale.width / 2, this.scale.height - 20, "WASD move · Mouse aim · Click shoot", {
        fontSize: "10px",
        color: "#7db8e8",
        fontFamily: "Sarabun, sans-serif",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;

    this.player.update();
    const aiShootAngle = this.ai.update(
      delta,
      this.player.sprite.x,
      this.player.sprite.y
    );

    // AI shooting
    if (aiShootAngle !== null) {
      this.fireProjectile(
        this.aiProjectiles,
        this.ai.sprite.x,
        this.ai.sprite.y,
        aiShootAngle
      );
    }

    // Water station refill checks
    let playerRefilling = false;
    let aiRefilling = false;
    const dt = delta / 1000;

    for (const station of this.waterStations) {
      if (station.isPlayerInRange(this.player.sprite.x, this.player.sprite.y)) {
        playerRefilling = true;
        this.player.refill(dt);
        station.setHighlight(true);
      } else if (
        station.isPlayerInRange(this.ai.sprite.x, this.ai.sprite.y)
      ) {
        aiRefilling = true;
        this.ai.refill(dt);
        station.setHighlight(true);
      } else {
        station.setHighlight(false);
      }
    }

    // HUD updates
    this.hud.updateWetMeter(this.player.wetMeter);
    this.hud.updateWaterTank(this.player.waterLevel);
    this.hud.updateTimer(this.timeLeft);
    this.hud.showRefilling(playerRefilling);

    // Kill out-of-bounds projectiles
    this.cleanupProjectiles(this.projectiles);
    this.cleanupProjectiles(this.aiProjectiles);
  }

  private playerShoot(): void {
    if (!this.player.tryShoot()) return;

    this.fireProjectile(
      this.projectiles,
      this.player.sprite.x,
      this.player.sprite.y,
      this.player.getAimAngle()
    );
  }

  private fireProjectile(
    group: Phaser.Physics.Arcade.Group,
    x: number,
    y: number,
    angle: number
  ): void {
    let bullet = group.getFirstDead(false) as Phaser.Physics.Arcade.Sprite | null;

    if (!bullet) {
      bullet = this.physics.add
        .sprite(x, y, "water_bullet")
        .setScale(2)
        .setDepth(5);
      group.add(bullet);
    } else {
      bullet.enableBody(true, x, y, true, true);
    }

    bullet.setVelocity(
      Math.cos(angle) * PROJECTILE_SPEED,
      Math.sin(angle) * PROJECTILE_SPEED
    );

    // Auto-destroy after 2 seconds
    this.time.delayedCall(2000, () => {
      if (bullet && bullet.active) {
        bullet.disableBody(true, true);
      }
    });
  }

  private cleanupProjectiles(group: Phaser.Physics.Arcade.Group): void {
    const bounds = this.physics.world.bounds;
    group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (
        sprite.active &&
        (sprite.x < bounds.x - 50 ||
          sprite.x > bounds.right + 50 ||
          sprite.y < bounds.y - 50 ||
          sprite.y > bounds.bottom + 50)
      ) {
        sprite.disableBody(true, true);
      }
    });
  }

  private spawnHitEffect(x: number, y: number): void {
    // Simple splash particles
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const particle = this.add
        .circle(x, y, 3, 0x3ab5f5, 0.8)
        .setDepth(20);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 30,
        y: y + Math.sin(angle) * 30,
        alpha: 0,
        scale: 0.5,
        duration: 300,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private createWalls(mapWidth: number, mapHeight: number): void {
    const wallThickness = 32;

    // Border walls
    // Top
    const topWall = this.add.rectangle(mapWidth / 2, wallThickness / 2, mapWidth, wallThickness, 0x5a3a2a).setDepth(5);
    this.walls.add(topWall);
    // Bottom
    const bottomWall = this.add.rectangle(mapWidth / 2, mapHeight - wallThickness / 2, mapWidth, wallThickness, 0x5a3a2a).setDepth(5);
    this.walls.add(bottomWall);
    // Left
    const leftWall = this.add.rectangle(wallThickness / 2, mapHeight / 2, wallThickness, mapHeight, 0x5a3a2a).setDepth(5);
    this.walls.add(leftWall);
    // Right
    const rightWall = this.add.rectangle(mapWidth - wallThickness / 2, mapHeight / 2, wallThickness, mapHeight, 0x5a3a2a).setDepth(5);
    this.walls.add(rightWall);

    // Some obstacle walls in the middle for cover
    const obstacles = [
      { x: 400, y: 300, w: 64, h: 128 },
      { x: 800, y: 600, w: 64, h: 128 },
      { x: 600, y: 450, w: 128, h: 64 },
      { x: 300, y: 700, w: 128, h: 64 },
      { x: 900, y: 250, w: 64, h: 64 },
    ];

    obstacles.forEach((obs) => {
      const wall = this.add
        .rectangle(obs.x, obs.y, obs.w, obs.h, 0x5a3a2a)
        .setDepth(5);
      this.walls.add(wall);
    });
  }

  private endGame(winnerName: string): void {
    if (this.gameOver) return;
    this.gameOver = true;

    this.hud.showStatus(
      winnerName === this.gameData.nickname
        ? "🏆 จ้าวแห่งสงกรานต์!"
        : "💀 เปียกหมดแล้ว..."
    );

    // Freeze physics
    this.physics.pause();

    // Transition to result after 2 seconds
    this.time.delayedCall(2000, () => {
      this.scene.start("ResultScene", {
        winner: winnerName,
        playerName: this.gameData.nickname,
        playerChar: this.gameData.character,
        playerNat: this.gameData.nationality,
        playerWet: this.player.wetMeter,
        playerScore: this.player.score,
        aiWet: this.ai.wetMeter,
        timeLeft: this.timeLeft,
      });
    });
  }
}
