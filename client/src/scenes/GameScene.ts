import Phaser from "phaser";
import { Player } from "../game/Player";
import { DummyAI } from "../game/DummyAI";
import { HUD } from "../ui/HUD";
import { PROJECTILE_SPEED, MATCH_DURATION, PROJECTILE_POOL_SIZE } from "../game/GameLogic";
import { soundManager } from "../audio/SoundManager";
import { matchStats } from "../game/MatchStats";
import {
  splashOnHit,
  shootMuzzle,
  refillBubbles,
  eliminationBurst,
  ambientDrips,
} from "../effects/ParticleEffects";
import { MapRenderer, type MapId } from "../map/MapRenderer";
import { WaterTruck } from "../game/WaterTruck";
import { FloodHazard } from "../game/FloodHazard";
import { PartyZone } from "../game/PartyZone";
import { TouchControls, isMobile } from "../ui/TouchControls";
import { getSelectedSkin } from "../skins/WeaponSkins";

interface GameData {
  character: string;
  nationality: string;
  nickname: string;
  mapId?: MapId;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private ai!: DummyAI;
  private hud!: HUD;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private aiProjectiles!: Phaser.Physics.Arcade.Group;
  private timeLeft = MATCH_DURATION;
  private gameOver = false;
  private gameData!: GameData;
  private wasRefilling = false;
  private waterLowPlayed = false;
  private muteButton!: Phaser.GameObjects.Text;
  private refillBubbleTimer = 0;
  private mapRenderer!: MapRenderer;
  private waterTruck!: WaterTruck;
  private touchControls: TouchControls | null = null;

  // Slippery zone popup state
  private wasInSlippery = false;
  private slipperyPopup: Phaser.GameObjects.Text | null = null;

  // Khao San hazards
  private floodHazard: FloodHazard | null = null;
  private partyZone: PartyZone | null = null;
  private floodElapsed = 0;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: GameData): void {
    this.gameData = data;
    this.timeLeft = MATCH_DURATION;
    this.gameOver = false;
    this.wasInSlippery = false;
    matchStats.reset();
  }

  create(): void {
    const mapId: MapId = this.gameData.mapId || "chiangmai";

    // Render map using MapRenderer (replaces manual ground/wall drawing)
    this.mapRenderer = new MapRenderer(this, mapId);
    this.mapRenderer.render(true);

    const mapWidth = this.mapRenderer.getMapWidth();
    const mapHeight = this.mapRenderer.getMapHeight();

    // Set world bounds to the map dimensions
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);

    // Water truck hazard — only on Chiang Mai (offline mode — local 30s timer)
    this.waterTruck = new WaterTruck(this, false, mapId !== "chiangmai");

    // Khao San Road hazards (offline — local flood timer)
    if (mapId === "khaosan") {
      this.floodHazard = new FloodHazard(this);
      const partyZones = this.mapRenderer.getPartyZones();
      if (partyZones.length > 0) {
        this.partyZone = new PartyZone(this, partyZones);
      }
      this.floodElapsed = 0;
    }

    // Player — spawn at S1 position
    this.player = new Player(
      this,
      48,
      48,
      this.gameData.character,
      this.gameData.nationality,
      this.gameData.nickname
    );

    // Dummy AI — spawn at S2 position
    this.ai = new DummyAI(
      this,
      1168,
      48,
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

    // Collisions with map walls
    this.physics.add.collider(this.player.sprite, this.mapRenderer.walls);
    this.physics.add.collider(this.ai.sprite, this.mapRenderer.walls);

    // Player bullets hit AI
    this.physics.add.overlap(
      this.projectiles,
      this.ai.sprite,
      (bullet, _aiSprite) => {
        (bullet as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
        this.ai.takeDamage(true);
        splashOnHit(this, this.ai.sprite.x, this.ai.sprite.y);
        soundManager.play("hit");
        matchStats.recordHit();

        if (!this.ai.isAlive) {
          this.player.score += 1;
          matchStats.recordElimination();
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
      (bullet, _playerSprite) => {
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
    this.physics.add.collider(this.projectiles, this.mapRenderer.walls, (bullet, _wall) => {
      const b = bullet as Phaser.Physics.Arcade.Sprite;
      splashOnHit(this, b.x, b.y);
      b.disableBody(true, true);
    });
    this.physics.add.collider(this.aiProjectiles, this.mapRenderer.walls, (bullet, _wall) => {
      const b = bullet as Phaser.Physics.Arcade.Sprite;
      splashOnHit(this, b.x, b.y);
      b.disableBody(true, true);
    });

    // Mouse shoot (desktop only — mobile uses TouchControls)
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver) return;
      if (this.touchControls) return; // handled by touch controls
      // Ignore clicks on the mute button area (top-right)
      if (pointer.x > this.scale.width - 50 && pointer.y < 40) return;
      this.playerShoot();
    });

    // HUD
    this.hud = new HUD(this);

    // Mobile touch controls
    if (isMobile()) {
      this.touchControls = new TouchControls(this);
      this.touchControls.onShoot = () => {
        if (!this.gameOver) this.playerShoot();
      };
    }

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

    // Crossfade to game music and start ambient water
    soundManager.playMusic("game");
    soundManager.startAmbientWater();

    // Camera follow player
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);

    // Match timer
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.gameOver) return;
        this.timeLeft--;
        // Intensify music in last 30 seconds
        if (this.timeLeft === 30) {
          soundManager.intensifyMusic();
        }
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
    const hintText = isMobile()
      ? "Joystick move · Tap shoot"
      : "WASD move · Mouse aim · Click shoot";
    this.add
      .text(this.scale.width / 2, this.scale.height - 20, hintText, {
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

    if (this.player.isAlive) {
      matchStats.updateTimeSurvived(delta / 1000);
    }

    // Touch controls: apply joystick input before player.update()
    if (this.touchControls) {
      const dir = this.touchControls.direction;
      if (dir.x !== 0 || dir.y !== 0) {
        this.player.applyTouchInput(dir);
      }
    }

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

    // Water truck update
    this.waterTruck.update(delta);

    // Check water truck hit on player
    if (this.waterTruck.isHitting(this.player.sprite.x, this.player.sprite.y)) {
      this.player.takeDamage(false); // splash damage from truck
      splashOnHit(this, this.player.sprite.x, this.player.sprite.y);
    }

    // Khao San flood timer (offline mode)
    // Config: 25s interval, 2s warning, 6s active
    if (this.floodHazard) {
      const FLOOD_INTERVAL = 25000;
      const FLOOD_WARNING = 2000;
      const FLOOD_DURATION = 6000;
      const CYCLE = FLOOD_INTERVAL + FLOOD_WARNING + FLOOD_DURATION;

      this.floodElapsed += delta;
      const phase = this.floodElapsed % CYCLE;

      if (phase < FLOOD_INTERVAL) {
        // Idle — no flood
        if (this.floodHazard.getState() !== "inactive") {
          this.floodHazard.deactivate();
        }
      } else if (phase < FLOOD_INTERVAL + FLOOD_WARNING) {
        // Warning phase
        if (this.floodHazard.getState() !== "warning") {
          this.floodHazard.showWarning(this.mapRenderer.getFloodZones());
        }
      } else {
        // Active phase
        if (this.floodHazard.getState() !== "active") {
          this.floodHazard.activate(this.mapRenderer.getFloodZones());
        }
      }

      // Show "+WATER" indicator when in flood
      this.floodHazard.showWaterRefillIndicator(
        this.player.sprite.x,
        this.player.sprite.y,
        delta
      );
    }

    // Party zone update (Khao San)
    if (this.partyZone) {
      this.partyZone.update(this.player.sprite.x, this.player.sprite.y, delta);
    }

    // Slippery zone check — show popup when entering
    const inSlippery = this.mapRenderer.isInSlipperyZone(
      this.player.sprite.x,
      this.player.sprite.y
    );
    if (inSlippery && !this.wasInSlippery) {
      this.showSlipperyPopup();
    }
    this.wasInSlippery = inSlippery;

    // Water station refill checks (uses MapRenderer stations)
    let playerRefilling = false;
    let aiRefilling = false;
    const dt = delta / 1000;

    for (const station of this.mapRenderer.waterStations) {
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

    // Touch controls: show/hide refill button
    if (this.touchControls) {
      this.touchControls.setRefillVisible(playerRefilling);
    }

    // Refill sound management
    if (playerRefilling && !this.wasRefilling) {
      soundManager.play("refill");
      matchStats.recordRefill();
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

  private showSlipperyPopup(): void {
    if (this.slipperyPopup) {
      this.slipperyPopup.destroy();
    }
    this.slipperyPopup = this.add
      .text(
        this.player.sprite.x,
        this.player.sprite.y - 50,
        "Slippery!",
        {
          fontSize: "14px",
          color: "#88ddff",
          fontFamily: "Kanit, sans-serif",
          fontStyle: "bold",
          stroke: "#003366",
          strokeThickness: 2,
        }
      )
      .setOrigin(0.5)
      .setDepth(50);

    this.tweens.add({
      targets: this.slipperyPopup,
      y: this.player.sprite.y - 80,
      alpha: 0,
      duration: 1200,
      ease: "Power2",
      onComplete: () => {
        if (this.slipperyPopup) {
          this.slipperyPopup.destroy();
          this.slipperyPopup = null;
        }
      },
    });
  }

  private playerShoot(): void {
    if (!this.player.tryShoot()) return;
    soundManager.play("shoot");
    matchStats.recordShot();

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
      const skinId = getSelectedSkin();
      const texKey = skinId === "default" ? "water_bullet" : `water_bullet_${skinId}`;
      const finalTex = this.textures.exists(texKey) ? texKey : "water_bullet";
      bullet = this.physics.add
        .sprite(x, y, finalTex)
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

  private endGame(winnerName: string): void {
    if (this.gameOver) return;
    this.gameOver = true;

    this.waterTruck.destroy();
    if (this.floodHazard) this.floodHazard.destroy();
    if (this.partyZone) this.partyZone.destroy();

    // Stop game music and ambient water
    soundManager.stopMusic(200);
    soundManager.stopAmbientWater();

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
        mapId: this.gameData.mapId || "chiangmai",
      });
    });
  }
}
