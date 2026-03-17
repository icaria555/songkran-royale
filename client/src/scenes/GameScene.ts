import Phaser from "phaser";
import { Player } from "../game/Player";
import { DummyAI } from "../game/DummyAI";
import { WaterStation } from "../game/WaterStation";
import { HUD } from "../ui/HUD";
import { PROJECTILE_SPEED, MATCH_DURATION, PROJECTILE_POOL_SIZE } from "../game/GameLogic";
import { soundManager } from "../audio/SoundManager";
import {
  splashOnHit,
  shootMuzzle,
  refillBubbles,
  eliminationBurst,
  ambientDrips,
} from "../effects/ParticleEffects";

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
  private wasRefilling = false;
  private waterLowPlayed = false;
  private muteButton!: Phaser.GameObjects.Text;
  private refillBubbleTimer = 0;

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
        splashOnHit(this, this.ai.sprite.x, this.ai.sprite.y);
        soundManager.play("hit");

        if (!this.ai.isAlive) {
          this.player.score += 1;
          eliminationBurst(this, this.ai.sprite.x, this.ai.sprite.y);
          soundManager.play("elimination");
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
        splashOnHit(this, this.player.sprite.x, this.player.sprite.y);
        soundManager.play("hit");

        // Flash player red
        this.player.sprite.setTint(0xff0000);
        this.time.delayedCall(100, () => {
          if (this.player.sprite.active) this.player.sprite.clearTint();
        });

        if (!this.player.isAlive) {
          eliminationBurst(this, this.player.sprite.x, this.player.sprite.y);
          soundManager.play("elimination");
          this.endGame("Bot สมชาย");
        }
      }
    );

    // Bullets hit walls
    this.physics.add.collider(this.projectiles, this.walls, (_wall, bullet) => {
      const b = bullet as Phaser.Physics.Arcade.Sprite;
      splashOnHit(this, b.x, b.y);
      b.disableBody(true, true);
    });
    this.physics.add.collider(this.aiProjectiles, this.walls, (_wall, bullet) => {
      const b = bullet as Phaser.Physics.Arcade.Sprite;
      splashOnHit(this, b.x, b.y);
      b.disableBody(true, true);
    });

    // Mouse shoot
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver) return;
      // Ignore clicks on the mute button area (top-right)
      if (pointer.x > this.scale.width - 50 && pointer.y < 40) return;
      this.playerShoot();
    });

    // HUD
    this.hud = new HUD(this);

    // Mute button (top-right)
    this.muteButton = this.add
      .text(this.scale.width - 20, 16, soundManager.isMuted() ? "🔇" : "🔊", {
        fontSize: "20px",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });

    this.muteButton.on("pointerdown", () => {
      soundManager.toggleMute();
      this.muteButton.setText(soundManager.isMuted() ? "🔇" : "🔊");
    });

    // Initialize sound manager (in case not already done)
    soundManager.init();

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

    // AI shooting with muzzle effect
    if (aiShootAngle !== null) {
      shootMuzzle(this, this.ai.sprite.x, this.ai.sprite.y, aiShootAngle);
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

    // Refill sound management
    if (playerRefilling && !this.wasRefilling) {
      soundManager.play("refill");
    } else if (!playerRefilling && this.wasRefilling) {
      soundManager.stopRefill();
    }
    this.wasRefilling = playerRefilling;

    // Refill bubble particles (throttled)
    this.refillBubbleTimer += delta;
    if (this.refillBubbleTimer >= 150) {
      this.refillBubbleTimer = 0;
      if (playerRefilling) {
        refillBubbles(this, this.player.sprite.x, this.player.sprite.y);
      }
      if (aiRefilling) {
        refillBubbles(this, this.ai.sprite.x, this.ai.sprite.y);
      }
    }

    // Ambient drip particles for high wet meter
    if (this.player.wetMeter > 50) {
      ambientDrips(this, this.player.sprite.x, this.player.sprite.y);
    }
    if (this.ai.wetMeter > 50) {
      ambientDrips(this, this.ai.sprite.x, this.ai.sprite.y);
    }

    // Water low warning
    if (this.player.waterLevel < 20 && !this.waterLowPlayed) {
      soundManager.play("water_low");
      this.waterLowPlayed = true;
    } else if (this.player.waterLevel >= 20) {
      this.waterLowPlayed = false;
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
    soundManager.play("shoot");

    const angle = this.player.getAimAngle();
    shootMuzzle(this, this.player.sprite.x, this.player.sprite.y, angle);

    this.fireProjectile(
      this.projectiles,
      this.player.sprite.x,
      this.player.sprite.y,
      angle
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
