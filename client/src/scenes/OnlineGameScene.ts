import Phaser from "phaser";
import { Room } from "colyseus.js";
import { RemotePlayer } from "../game/RemotePlayer";
import { HUD } from "../ui/HUD";
import { PLAYER_SPEED } from "../game/GameLogic";
import { reconnect, setCurrentRoom, leaveRoom } from "../network/ColyseusClient";
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

interface OnlineGameData {
  character: string;
  nationality: string;
  nickname: string;
  room: Room;
  mapId?: MapId;
}

const RECONNECT_TIMEOUT_MS = 30_000;
const RECONNECT_RETRY_INTERVAL_MS = 2_000;

export class OnlineGameScene extends Phaser.Scene {
  private room!: Room;
  private sessionId!: string;
  private gameData!: OnlineGameData;
  private hud!: HUD;
  private mapRenderer!: MapRenderer;
  private waterTruck!: WaterTruck;

  // Local player sprite (client-side predicted)
  private localSprite!: Phaser.Physics.Arcade.Sprite;
  private localLabel!: Phaser.GameObjects.Text;

  // Remote players
  private remotePlayers = new Map<string, RemotePlayer>();

  // Server projectiles rendered locally
  private projectileSprites = new Map<string, Phaser.GameObjects.Sprite>();

  // Input state
  private cursors!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };
  private aimAngle = 0;
  private inputSendTimer = 0;
  private readonly INPUT_SEND_RATE = 1000 / 30; // 30Hz input send

  private gameOver = false;

  // Reconnect overlay
  private reconnectOverlay: Phaser.GameObjects.Rectangle | null = null;
  private reconnectText: Phaser.GameObjects.Text | null = null;
  private isReconnecting = false;
  private wasRefilling = false;
  private waterLowPlayed = false;
  private muteButton!: Phaser.GameObjects.Text;
  private refillBubbleTimer = 0;
  private touchControls: TouchControls | null = null;

  // Slippery zone popup
  private wasInSlippery = false;
  private slipperyPopup: Phaser.GameObjects.Text | null = null;

  // Khao San hazards
  private floodHazard: FloodHazard | null = null;
  private partyZone: PartyZone | null = null;

  constructor() {
    super({ key: "OnlineGameScene" });
  }

  init(data: OnlineGameData): void {
    this.gameData = data;
    this.room = data.room;
    this.sessionId = data.room.sessionId;
    this.gameOver = false;
    this.isReconnecting = false;
    this.wasInSlippery = false;
    this.remotePlayers.clear();
    this.projectileSprites.clear();
    matchStats.reset();
  }

  create(): void {
    // Read mapId from room state (if available) or from scene data
    const mapId: MapId = this.room.state?.mapId || this.gameData.mapId || "chiangmai";

    // Render map using MapRenderer (visual only — server handles collision)
    this.mapRenderer = new MapRenderer(this, mapId);
    this.mapRenderer.render(false);

    const mapWidth = this.mapRenderer.getMapWidth();
    const mapHeight = this.mapRenderer.getMapHeight();

    // Water truck (online mode — listens for server events; disabled on khaosan)
    this.waterTruck = new WaterTruck(this, true, mapId !== "chiangmai");

    // Khao San Road hazards
    if (mapId === "khaosan") {
      this.floodHazard = new FloodHazard(this);
      const partyZones = this.mapRenderer.getPartyZones();
      if (partyZones.length > 0) {
        this.partyZone = new PartyZone(this, partyZones);
      }
    }

    // Keyboard
    const kb = this.input.keyboard!;
    this.cursors = {
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Mouse shoot (desktop only — mobile uses TouchControls)
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.touchControls) return; // handled by touch controls
      if (!this.gameOver && !this.isReconnecting) {
        // Ignore clicks on mute button area
        if (pointer.x > this.scale.width - 50 && pointer.y < 40) return;
        this.onlineShoot();
      }
    });

    // HUD
    this.hud = new HUD(this);

    // Mobile touch controls
    if (isMobile()) {
      this.touchControls = new TouchControls(this);
      this.touchControls.onShoot = () => {
        if (!this.gameOver && !this.isReconnecting) this.onlineShoot();
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

    // Initialize sound manager
    soundManager.init();

    // Crossfade to game music and start ambient water
    soundManager.playMusic("game");
    soundManager.startAmbientWater();

    // Camera
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

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

    // Wire up Colyseus state listeners
    this.wireRoomListeners(this.room);
  }

  /** Centralised shoot action used by both desktop click and mobile touch. */
  private onlineShoot(): void {
    this.room.send("shoot", {});
    soundManager.play("shoot");
    matchStats.recordShot();
    if (this.localSprite) {
      shootMuzzle(this, this.localSprite.x, this.localSprite.y, this.aimAngle);
    }
  }

  // ── Room listener wiring (reusable for reconnect) ────────────

  private wireRoomListeners(room: Room): void {
    // Player added
    room.state.players.onAdd((player: any, sessionId: string) => {
      if (sessionId === this.sessionId) {
        // Local player
        if (!this.localSprite || !this.localSprite.active) {
          this.localSprite = this.physics.add
            .sprite(player.x, player.y, `char_${player.character}`)
            .setScale(4)
            .setDepth(10);
          this.localSprite.body!.setSize(12, 12);
          this.localSprite.body!.setOffset(2, 2);

          this.localLabel = this.add
            .text(player.x, player.y - 40, player.nickname, {
              fontSize: "10px",
              color: "#e8f4ff",
              fontFamily: "Kanit, sans-serif",
              stroke: "#000000",
              strokeThickness: 2,
            })
            .setOrigin(0.5, 1)
            .setDepth(11);

          this.cameras.main.startFollow(this.localSprite, true, 0.08, 0.08);
        } else {
          // Reconnect — snap to server position
          this.localSprite.setPosition(player.x, player.y);
          this.localSprite.setAlpha(player.isAlive ? 1 : 0.3);
        }

        // Listen for state changes on local player
        player.listen("wetMeter", (value: number) => {
          this.hud.updateWetMeter(value);
        });
        player.listen("waterLevel", (value: number) => {
          this.hud.updateWaterTank(value);
          // Water low warning
          if (value < 20 && !this.waterLowPlayed) {
            soundManager.play("water_low");
            this.waterLowPlayed = true;
          } else if (value >= 20) {
            this.waterLowPlayed = false;
          }
        });
        player.listen("isAlive", (alive: boolean) => {
          if (!alive) {
            this.localSprite.setAlpha(0.3);
            eliminationBurst(this, this.localSprite.x, this.localSprite.y);
            soundManager.play("elimination");
          }
        });
      } else {
        // Remote player
        const existing = this.remotePlayers.get(sessionId);
        if (existing) {
          existing.setTargetPosition(player.x, player.y);
        } else {
          const remote = new RemotePlayer(
            this,
            sessionId,
            player.x,
            player.y,
            player.character,
            player.nickname
          );
          this.remotePlayers.set(sessionId, remote);
        }

        // Listen for position changes
        player.listen("x", (x: number) => {
          const r = this.remotePlayers.get(sessionId);
          if (r) r.setTargetPosition(x, player.y);
        });
        player.listen("y", (y: number) => {
          const r = this.remotePlayers.get(sessionId);
          if (r) r.setTargetPosition(player.x, y);
        });
        player.listen("isAlive", (alive: boolean) => {
          const r = this.remotePlayers.get(sessionId);
          if (r) {
            r.setAlive(alive);
            if (!alive) {
              eliminationBurst(this, r.sprite.x, r.sprite.y);
              matchStats.recordElimination();
            }
          }
          if (!alive) {
            soundManager.play("elimination");
          }
        });
        player.listen("wetMeter", (wet: number) => {
          if (wet > (player.previousWet || 0)) {
            const r = this.remotePlayers.get(sessionId);
            if (r) {
              r.flashHit();
              splashOnHit(this, r.sprite.x, r.sprite.y);
            }
            soundManager.play("hit");
            matchStats.recordHit();
          }
          (player as any).previousWet = wet;
        });
      }
    });

    // Player removed
    room.state.players.onRemove((_player: any, sessionId: string) => {
      const remote = this.remotePlayers.get(sessionId);
      if (remote) {
        remote.destroy();
        this.remotePlayers.delete(sessionId);
      }
    });

    // Projectile added
    room.state.projectiles.onAdd((proj: any, id: string) => {
      const skinId = getSelectedSkin();
      const texKey = skinId === "default" ? "water_bullet" : `water_bullet_${skinId}`;
      const finalTex = this.textures.exists(texKey) ? texKey : "water_bullet";
      const sprite = this.add
        .sprite(proj.x, proj.y, finalTex)
        .setScale(2)
        .setDepth(5);
      this.projectileSprites.set(id, sprite);

      proj.listen("x", (x: number) => {
        const s = this.projectileSprites.get(id);
        if (s) s.x = x;
      });
      proj.listen("y", (y: number) => {
        const s = this.projectileSprites.get(id);
        if (s) s.y = y;
      });
    });

    // Projectile removed
    room.state.projectiles.onRemove((_proj: any, id: string) => {
      const sprite = this.projectileSprites.get(id);
      if (sprite) {
        splashOnHit(this, sprite.x, sprite.y);
        sprite.destroy();
        this.projectileSprites.delete(id);
      }
    });

    // Water truck events from server
    room.onMessage("waterTruck", (data: { phase: string; x?: number }) => {
      this.waterTruck.onServerEvent(data.phase, data.x);
    });

    room.onMessage("waterTruckSync", (data: { x: number }) => {
      this.waterTruck.syncPosition(data.x);
    });

    // Flood hazard events (Khao San)
    room.onMessage("floodWarning", (data: { zones?: Array<{ x: number; y: number; w: number; h: number }> }) => {
      if (this.floodHazard) {
        const zones = data.zones || this.mapRenderer.getFloodZones();
        this.floodHazard.showWarning(zones);
      }
    });

    room.onMessage("floodActive", (data: { zones?: Array<{ x: number; y: number; w: number; h: number }> }) => {
      if (this.floodHazard) {
        const zones = data.zones || this.mapRenderer.getFloodZones();
        this.floodHazard.activate(zones);
      }
    });

    room.onMessage("floodEnd", () => {
      if (this.floodHazard) {
        this.floodHazard.deactivate();
      }
    });

    // Party zone positions (Khao San)
    room.onMessage("partyZones", (data: { zones: Array<{ x: number; y: number; w: number; h: number }> }) => {
      if (this.partyZone) {
        this.partyZone.updateZones(data.zones);
      } else {
        this.partyZone = new PartyZone(this, data.zones);
      }
    });

    // Game phase changes
    room.state.listen("phase", (phase: string) => {
      if (phase === "countdown") {
        soundManager.play("countdown_tick");
      }
      if (phase === "playing") {
        soundManager.play("match_start");
      }
      if (phase === "ended") {
        this.gameOver = true;
        // Stop game music and ambient water
        soundManager.stopMusic(200);
        soundManager.stopAmbientWater();
        this.waterTruck.destroy();
        if (this.floodHazard) this.floodHazard.destroy();
        if (this.partyZone) this.partyZone.destroy();
        const winnerId = room.state.winnerId;
        const winner = room.state.players.get(winnerId);
        const winnerName = winner?.nickname || "Unknown";
        const isMe = winnerId === this.sessionId;

        this.hud.showStatus(
          isMe ? "จ้าวแห่งสงกรานต์!" : `${winnerName} wins!`
        );

        this.time.delayedCall(3000, () => {
          const localPlayer = room.state.players.get(this.sessionId);
          room.leave();
          this.scene.start("ResultScene", {
            winner: winnerName,
            playerName: this.gameData.nickname,
            playerChar: this.gameData.character,
            playerNat: this.gameData.nationality,
            playerWet: localPlayer?.wetMeter || 0,
            playerScore: localPlayer?.score || 0,
            aiWet: 0,
            timeLeft: room.state.timeLeft,
          });
        });
      }
    });

    // Timer
    room.state.listen("timeLeft", (time: number) => {
      this.hud.updateTimer(time);
      // Intensify music in last 30 seconds
      if (time === 30) {
        soundManager.intensifyMusic();
      }
    });

    // Handle disconnect — attempt reconnect
    room.onLeave((_code) => {
      if (!this.gameOver && this.scene.isActive("OnlineGameScene")) {
        this.startReconnect();
      }
    });
  }

  // ── Reconnect handling ───────────────────────────────────────

  private startReconnect(): void {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    // Show overlay
    this.showReconnectOverlay();

    const startTime = Date.now();

    const attemptReconnect = async () => {
      if (this.gameOver || !this.scene.isActive("OnlineGameScene")) {
        this.isReconnecting = false;
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= RECONNECT_TIMEOUT_MS) {
        // Give up
        this.isReconnecting = false;
        this.hideReconnectOverlay();
        leaveRoom();
        this.scene.start("ResultScene", {
          winner: "Disconnected",
          playerName: this.gameData.nickname,
          playerChar: this.gameData.character,
          playerNat: this.gameData.nationality,
          playerWet: 0,
          playerScore: 0,
          aiWet: 0,
          timeLeft: 0,
        });
        return;
      }

      // Update overlay text
      const remaining = Math.ceil((RECONNECT_TIMEOUT_MS - elapsed) / 1000);
      if (this.reconnectText) {
        this.reconnectText.setText(
          `Reconnecting... (${remaining}s)\nกำลังเชื่อมต่อใหม่...`
        );
      }

      try {
        const newRoom = await reconnect();
        if (newRoom) {
          // Success
          this.room = newRoom;
          this.sessionId = newRoom.sessionId;
          setCurrentRoom(newRoom);
          this.isReconnecting = false;
          this.hideReconnectOverlay();

          // Re-wire listeners on the new room
          this.wireRoomListeners(newRoom);
          return;
        }
      } catch (err) {
        console.warn("Reconnect attempt failed:", err);
      }

      // Retry after interval
      this.time.delayedCall(RECONNECT_RETRY_INTERVAL_MS, attemptReconnect);
    };

    attemptReconnect();
  }

  private showReconnectOverlay(): void {
    if (this.reconnectOverlay) return;

    this.reconnectOverlay = this.add
      .rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width,
        this.scale.height,
        0x000000,
        0.7
      )
      .setScrollFactor(0)
      .setDepth(200);

    this.reconnectText = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        "Reconnecting...\nกำลังเชื่อมต่อใหม่...",
        {
          fontSize: "20px",
          color: "#f5c842",
          fontFamily: "Kanit, sans-serif",
          fontStyle: "bold",
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);
  }

  private hideReconnectOverlay(): void {
    if (this.reconnectOverlay) {
      this.reconnectOverlay.destroy();
      this.reconnectOverlay = null;
    }
    if (this.reconnectText) {
      this.reconnectText.destroy();
      this.reconnectText = null;
    }
  }

  // ── Game loop ────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    if (this.gameOver || this.isReconnecting) return;
    if (!this.localSprite) return;

    // Track survival time
    matchStats.updateTimeSurvived(delta / 1000);

    // Water truck update (online: mainly for splash trail visuals)
    this.waterTruck.update(delta);

    // Update local player position from server state
    const serverPlayer = this.room.state.players.get(this.sessionId);
    if (serverPlayer) {
      // Interpolate local sprite toward server position
      this.localSprite.x = Phaser.Math.Linear(
        this.localSprite.x,
        serverPlayer.x,
        0.3
      );
      this.localSprite.y = Phaser.Math.Linear(
        this.localSprite.y,
        serverPlayer.y,
        0.3
      );
      this.localLabel.setPosition(this.localSprite.x, this.localSprite.y - 40);

      // Client-side prediction for responsiveness
      let vx = 0;
      let vy = 0;

      if (this.touchControls) {
        const dir = this.touchControls.direction;
        vx = dir.x;
        vy = dir.y;
      } else {
        if (this.cursors.a.isDown) vx = -1;
        if (this.cursors.d.isDown) vx = 1;
        if (this.cursors.w.isDown) vy = -1;
        if (this.cursors.s.isDown) vy = 1;

        if (vx !== 0 && vy !== 0) {
          const norm = 1 / Math.SQRT2;
          vx *= norm;
          vy *= norm;
        }
      }

      const dt = delta / 1000;
      this.localSprite.x += vx * PLAYER_SPEED * dt * 0.5; // 50% prediction blend
      this.localSprite.y += vy * PLAYER_SPEED * dt * 0.5;
    }

    // Aim: on mobile aim = movement direction, on desktop aim toward mouse
    if (this.touchControls) {
      const dir = this.touchControls.direction;
      if (Math.abs(dir.x) > 0.1 || Math.abs(dir.y) > 0.1) {
        this.aimAngle = Math.atan2(dir.y, dir.x);
      }
    } else {
      const pointer = this.input.activePointer;
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.aimAngle = Phaser.Math.Angle.Between(
        this.localSprite.x,
        this.localSprite.y,
        worldPoint.x,
        worldPoint.y
      );
    }

    // Send input to server at throttled rate
    this.inputSendTimer += delta;
    if (this.inputSendTimer >= this.INPUT_SEND_RATE) {
      this.inputSendTimer = 0;

      // Map joystick direction to WASD booleans for the server
      let keys: { w: boolean; a: boolean; s: boolean; d: boolean };
      if (this.touchControls) {
        const dir = this.touchControls.direction;
        keys = {
          w: dir.y < -0.3,
          a: dir.x < -0.3,
          s: dir.y > 0.3,
          d: dir.x > 0.3,
        };
      } else {
        keys = {
          w: this.cursors.w.isDown,
          a: this.cursors.a.isDown,
          s: this.cursors.s.isDown,
          d: this.cursors.d.isDown,
        };
      }

      this.room.send("input", {
        keys,
        angle: this.aimAngle,
      });
    }

    // Update remote players (interpolation)
    this.remotePlayers.forEach((remote) => remote.update());

    // Flood hazard update (Khao San)
    if (this.floodHazard && this.localSprite) {
      this.floodHazard.showWaterRefillIndicator(
        this.localSprite.x,
        this.localSprite.y,
        delta
      );
    }

    // Party zone update (Khao San)
    if (this.partyZone && this.localSprite) {
      this.partyZone.update(this.localSprite.x, this.localSprite.y, delta);
    }

    // Slippery zone popup
    const inSlippery = this.mapRenderer.isInSlipperyZone(
      this.localSprite.x,
      this.localSprite.y
    );
    if (inSlippery && !this.wasInSlippery) {
      this.showSlipperyPopup();
    }
    this.wasInSlippery = inSlippery;

    // Water station highlight (uses MapRenderer stations)
    if (serverPlayer) {
      const isRefilling = this.mapRenderer.waterStations.some((s) =>
        s.isPlayerInRange(this.localSprite.x, this.localSprite.y)
      );
      for (const station of this.mapRenderer.waterStations) {
        station.setHighlight(
          station.isPlayerInRange(this.localSprite.x, this.localSprite.y)
        );
      }

      // Touch controls: show/hide refill button
      if (this.touchControls) {
        this.touchControls.setRefillVisible(isRefilling);
      }

      // Refill sound management
      if (isRefilling && !this.wasRefilling) {
        soundManager.play("refill");
        matchStats.recordRefill();
      } else if (!isRefilling && this.wasRefilling) {
        soundManager.stopRefill();
      }
      this.wasRefilling = isRefilling;

      this.hud.showRefilling(isRefilling);

      // Refill bubble particles (throttled)
      this.refillBubbleTimer += delta;
      if (this.refillBubbleTimer >= 150) {
        this.refillBubbleTimer = 0;
        if (isRefilling) {
          refillBubbles(this, this.localSprite.x, this.localSprite.y);
        }
      }

      // Ambient drip particles for high wet meter
      if (serverPlayer.wetMeter > 50) {
        ambientDrips(this, this.localSprite.x, this.localSprite.y);
      }
    }

    // Ambient drips on remote players with high wet meter
    this.remotePlayers.forEach((remote) => {
      // We don't have direct access to wetMeter on remote, so drip based on alpha
      // (alpha < 1 means they've been hit)
      if (remote.sprite.alpha < 0.8 && remote.sprite.alpha > 0.2) {
        ambientDrips(this, remote.sprite.x, remote.sprite.y);
      }
    });
  }

  private showSlipperyPopup(): void {
    if (this.slipperyPopup) {
      this.slipperyPopup.destroy();
    }
    this.slipperyPopup = this.add
      .text(
        this.localSprite.x,
        this.localSprite.y - 50,
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
      y: this.localSprite.y - 80,
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
}
