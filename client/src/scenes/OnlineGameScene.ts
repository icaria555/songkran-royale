import Phaser from "phaser";
import { Room } from "colyseus.js";
import { RemotePlayer } from "../game/RemotePlayer";
import { WaterStation } from "../game/WaterStation";
import { HUD } from "../ui/HUD";
import { PLAYER_SPEED } from "../game/GameLogic";
import { reconnect, setCurrentRoom, leaveRoom } from "../network/ColyseusClient";

interface OnlineGameData {
  character: string;
  nationality: string;
  nickname: string;
  room: Room;
}

const RECONNECT_TIMEOUT_MS = 30_000;
const RECONNECT_RETRY_INTERVAL_MS = 2_000;

export class OnlineGameScene extends Phaser.Scene {
  private room!: Room;
  private sessionId!: string;
  private gameData!: OnlineGameData;
  private hud!: HUD;
  private waterStations: WaterStation[] = [];

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

  // Walls (visual only — server does collision)
  private walls!: Phaser.GameObjects.Group;

  private gameOver = false;

  // Reconnect overlay
  private reconnectOverlay: Phaser.GameObjects.Rectangle | null = null;
  private reconnectText: Phaser.GameObjects.Text | null = null;
  private isReconnecting = false;

  constructor() {
    super({ key: "OnlineGameScene" });
  }

  init(data: OnlineGameData): void {
    this.gameData = data;
    this.room = data.room;
    this.sessionId = data.room.sessionId;
    this.gameOver = false;
    this.isReconnecting = false;
    this.remotePlayers.clear();
    this.projectileSprites.clear();
  }

  create(): void {
    const mapWidth = 1200;
    const mapHeight = 900;

    // Draw ground
    for (let x = 0; x < mapWidth; x += 64) {
      for (let y = 0; y < mapHeight; y += 64) {
        this.add.image(x + 32, y + 32, "tile_ground").setScale(4).setDepth(0);
      }
    }

    // Visual walls
    this.createWalls(mapWidth, mapHeight);

    // Water stations (visual only — server handles refill logic)
    const stationPositions = [
      { x: 200, y: 200 },
      { x: mapWidth - 200, y: 200 },
      { x: 200, y: mapHeight - 200 },
      { x: mapWidth - 200, y: mapHeight - 200 },
    ];
    stationPositions.forEach((pos) => {
      this.waterStations.push(new WaterStation(this, pos.x, pos.y));
    });

    // Keyboard
    const kb = this.input.keyboard!;
    this.cursors = {
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Mouse shoot
    this.input.on("pointerdown", () => {
      if (!this.gameOver && !this.isReconnecting) {
        this.room.send("shoot", {});
      }
    });

    // HUD
    this.hud = new HUD(this);

    // Camera
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

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

    // Wire up Colyseus state listeners
    this.wireRoomListeners(this.room);
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
        });
        player.listen("isAlive", (alive: boolean) => {
          if (!alive) {
            this.localSprite.setAlpha(0.3);
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
          if (r) r.setAlive(alive);
        });
        player.listen("wetMeter", (wet: number) => {
          if (wet > (player.previousWet || 0)) {
            const r = this.remotePlayers.get(sessionId);
            if (r) r.flashHit();
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
      const sprite = this.add
        .sprite(proj.x, proj.y, "water_bullet")
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
        this.spawnHitEffect(sprite.x, sprite.y);
        sprite.destroy();
        this.projectileSprites.delete(id);
      }
    });

    // Game phase changes
    room.state.listen("phase", (phase: string) => {
      if (phase === "ended") {
        this.gameOver = true;
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
    });

    // Handle disconnect — attempt reconnect
    room.onLeave((code) => {
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

      // Also apply client-side prediction for responsiveness
      let vx = 0;
      let vy = 0;
      if (this.cursors.a.isDown) vx = -1;
      if (this.cursors.d.isDown) vx = 1;
      if (this.cursors.w.isDown) vy = -1;
      if (this.cursors.s.isDown) vy = 1;

      if (vx !== 0 && vy !== 0) {
        const norm = 1 / Math.SQRT2;
        vx *= norm;
        vy *= norm;
      }

      const dt = delta / 1000;
      this.localSprite.x += vx * PLAYER_SPEED * dt * 0.5; // 50% prediction blend
      this.localSprite.y += vy * PLAYER_SPEED * dt * 0.5;
    }

    // Aim toward mouse
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.aimAngle = Phaser.Math.Angle.Between(
      this.localSprite.x,
      this.localSprite.y,
      worldPoint.x,
      worldPoint.y
    );

    // Send input to server at throttled rate
    this.inputSendTimer += delta;
    if (this.inputSendTimer >= this.INPUT_SEND_RATE) {
      this.inputSendTimer = 0;
      this.room.send("input", {
        keys: {
          w: this.cursors.w.isDown,
          a: this.cursors.a.isDown,
          s: this.cursors.s.isDown,
          d: this.cursors.d.isDown,
        },
        angle: this.aimAngle,
      });
    }

    // Update remote players (interpolation)
    this.remotePlayers.forEach((remote) => remote.update());

    // Water station highlight
    if (serverPlayer) {
      for (const station of this.waterStations) {
        station.setHighlight(
          station.isPlayerInRange(this.localSprite.x, this.localSprite.y)
        );
      }
      this.hud.showRefilling(
        this.waterStations.some((s) =>
          s.isPlayerInRange(this.localSprite.x, this.localSprite.y)
        )
      );
    }
  }

  private spawnHitEffect(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const particle = this.add.circle(x, y, 3, 0x3ab5f5, 0.8).setDepth(20);
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
    this.add.rectangle(mapWidth / 2, wallThickness / 2, mapWidth, wallThickness, 0x5a3a2a).setDepth(5);
    this.add.rectangle(mapWidth / 2, mapHeight - wallThickness / 2, mapWidth, wallThickness, 0x5a3a2a).setDepth(5);
    this.add.rectangle(wallThickness / 2, mapHeight / 2, wallThickness, mapHeight, 0x5a3a2a).setDepth(5);
    this.add.rectangle(mapWidth - wallThickness / 2, mapHeight / 2, wallThickness, mapHeight, 0x5a3a2a).setDepth(5);

    // Obstacles
    const obstacles = [
      { x: 400, y: 300, w: 64, h: 128 },
      { x: 800, y: 600, w: 64, h: 128 },
      { x: 600, y: 450, w: 128, h: 64 },
      { x: 300, y: 700, w: 128, h: 64 },
      { x: 900, y: 250, w: 64, h: 64 },
    ];
    obstacles.forEach((obs) => {
      this.add.rectangle(obs.x, obs.y, obs.w, obs.h, 0x5a3a2a).setDepth(5);
    });
  }
}
