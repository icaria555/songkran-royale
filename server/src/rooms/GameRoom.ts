import { Room, Client } from "colyseus";
import { GameState, PlayerState, TankState, ProjectileState } from "../schema/GameState";
import {
  TICK_INTERVAL,
  PLAYER_SPEED,
  PROJECTILE_SPEED,
  WATER_COST_PER_SHOT,
  DIRECT_HIT_DAMAGE,
  MAX_WATER_LEVEL,
  MAX_WET_METER,
  REFILL_RATE_PER_SECOND,
  MATCH_DURATION,
  MAX_INPUT_RATE,
  INPUT_RATE_WINDOW,
  MIN_PLAYERS_TO_START,
  MAX_PLAYERS_PER_ROOM,
  COUNTDOWN_SECONDS,
  WATER_STATION_POSITIONS,
  SPAWN_POSITIONS,
  MAP_WIDTH,
  MAP_HEIGHT,
  PROJECTILE_LIFETIME,
  RECONNECT_GRACE_PERIOD,
  SLIPPERY_ZONES,
  SLIPPERY_SPEED_MULTIPLIER,
  WATER_TRUCK,
} from "../game/GameConstants";
import {
  clampPlayerPosition,
  resolvePlayerObstacleCollision,
  projectileHitsPlayer,
  projectileCollidesWithWall,
  getRefillStationIndex,
} from "../game/CollisionHandler";
import { countAlivePlayers, getWinnerId, getLowestWetPlayer } from "../game/WinCondition";

interface InputMessage {
  keys: { w: boolean; a: boolean; s: boolean; d: boolean };
  angle: number;
}

interface JoinOptions {
  nickname: string;
  character: string;
  nationality: string;
}

// SPAWN_POSITIONS imported from GameConstants (Chiang Mai map layout)

/** Check if a point is inside a rect {x,y,w,h} where x,y = center */
function pointInRect(px: number, py: number, rect: { x: number; y: number; w: number; h: number }): boolean {
  const halfW = rect.w / 2;
  const halfH = rect.h / 2;
  return px >= rect.x - halfW && px <= rect.x + halfW && py >= rect.y - halfH && py <= rect.y + halfH;
}

export class GameRoom extends Room<{ state: GameState }> {
  private projectileIdCounter = 0;
  private projectileTimers = new Map<string, number>(); // id → creation timestamp
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private waterTruckX: number | null = null; // null = not active
  private waterTruckTimer = 0; // ms since last truck
  private waterTruckWarned = false;

  onCreate(_options?: Record<string, unknown>): void {
    this.setState(new GameState());
    this.maxClients = MAX_PLAYERS_PER_ROOM;

    // Generate a match ID
    this.state.matchId = this.generateMatchId();

    // Set up water stations
    WATER_STATION_POSITIONS.forEach((pos, i) => {
      const tank = new TankState();
      tank.id = `station_${i}`;
      tank.x = pos.x;
      tank.y = pos.y;
      tank.active = true;
      this.state.waterTanks.push(tank);
    });

    // Register message handlers
    this.onMessage("input", (client, message: InputMessage) => {
      this.handleInput(client, message);
    });

    this.onMessage("shoot", (client) => {
      this.handleShoot(client);
    });

    this.onMessage("ready", (client) => {
      this.handleReady(client);
    });

    // Main game loop at 20Hz
    this.setSimulationInterval((deltaTime) => {
      this.gameLoop(deltaTime);
    }, TICK_INTERVAL);

    console.log(`[GameRoom] Created room ${this.roomId} (match: ${this.state.matchId})`);
  }

  onJoin(client: Client, options: JoinOptions): void {
    const spawnIndex = this.state.players.size % SPAWN_POSITIONS.length;
    const spawn = SPAWN_POSITIONS[spawnIndex];

    const player = new PlayerState();
    player.id = client.sessionId;
    player.nickname = options.nickname || "Anonymous";
    player.character = options.character || "male";
    player.nationality = options.nationality || "🇹🇭";
    player.x = spawn.x;
    player.y = spawn.y;
    player.waterLevel = MAX_WATER_LEVEL;
    player.wetMeter = 0;
    player.isAlive = true;

    this.state.players.set(client.sessionId, player);

    console.log(`[GameRoom] ${player.nickname} (${client.sessionId}) joined. Players: ${this.state.players.size}`);
  }

  /**
   * Called when a client disconnects.
   * During an active match, allows 30 seconds for reconnection.
   * Player state (position, wet meter, water level) is preserved during the grace window.
   */
  async onLeave(client: Client, code?: number): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Code 4000+ means intentional leave (consented)
    const consented = code !== undefined && code >= 4000;

    console.log(
      `[GameRoom] ${player.nickname} left (code: ${code}, consented: ${consented})`
    );

    // If the game is actively playing and the disconnect was NOT intentional,
    // give the player a reconnection window.
    if (this.state.phase === "playing" && !consented) {
      try {
        console.log(
          `[GameRoom] Holding seat for ${player.nickname} (${RECONNECT_GRACE_PERIOD / 1000}s)`
        );

        // allowReconnection returns a promise that resolves when the client reconnects
        // or rejects when the timeout expires.
        await this.allowReconnection(client, RECONNECT_GRACE_PERIOD / 1000);

        // Client reconnected — restore full state (it was never removed)
        console.log(`[GameRoom] ${player.nickname} reconnected!`);
        return;
      } catch {
        // Reconnect window expired — fall through to removal
        console.log(
          `[GameRoom] ${player.nickname} reconnect window expired, removing`
        );
      }
    }

    // Remove the player
    this.state.players.delete(client.sessionId);

    // Re-evaluate win condition if game is playing
    if (this.state.phase === "playing") {
      this.checkWinCondition();
    }
  }

  onDispose(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    console.log(`[GameRoom] Room ${this.roomId} disposed`);
  }

  // ── Message Handlers ──────────────────────────────────────────

  private handleInput(client: Client, message: InputMessage): void {
    if (this.state.phase !== "playing") return;

    const player = this.state.players.get(client.sessionId);
    if (!player || !player.isAlive) return;

    // Rate limiting
    const now = Date.now();
    if (now - player.lastInputTime < INPUT_RATE_WINDOW) {
      player.inputCount++;
      if (player.inputCount > MAX_INPUT_RATE) return; // silently drop
    } else {
      player.inputCount = 1;
      player.lastInputTime = now;
    }

    // Calculate velocity from input keys
    let vx = 0;
    let vy = 0;
    if (message.keys.a) vx = -1;
    if (message.keys.d) vx = 1;
    if (message.keys.w) vy = -1;
    if (message.keys.s) vy = 1;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      const norm = 1 / Math.SQRT2;
      vx *= norm;
      vy *= norm;
    }

    player.vx = vx * PLAYER_SPEED;
    player.vy = vy * PLAYER_SPEED;
    player.angle = message.angle;
  }

  private handleShoot(client: Client): void {
    if (this.state.phase !== "playing") return;

    const player = this.state.players.get(client.sessionId);
    if (!player || !player.isAlive) return;
    if (player.waterLevel < WATER_COST_PER_SHOT) return;

    // Deduct water
    player.waterLevel = Math.max(0, player.waterLevel - WATER_COST_PER_SHOT);

    // Spawn projectile
    const id = `p_${this.projectileIdCounter++}`;
    const proj = new ProjectileState();
    proj.id = id;
    proj.x = player.x;
    proj.y = player.y;
    proj.vx = Math.cos(player.angle) * PROJECTILE_SPEED;
    proj.vy = Math.sin(player.angle) * PROJECTILE_SPEED;
    proj.ownerId = client.sessionId;

    this.state.projectiles.set(id, proj);
    this.projectileTimers.set(id, Date.now());
  }

  private handleReady(client: Client): void {
    if (this.state.phase !== "lobby") return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    player.ready = true;

    // Check if enough players are ready
    let readyCount = 0;
    this.state.players.forEach((p) => {
      if (p.ready) readyCount++;
    });

    if (readyCount >= MIN_PLAYERS_TO_START && this.state.players.size >= MIN_PLAYERS_TO_START) {
      this.startCountdown();
    }
  }

  // ── Game Loop ─────────────────────────────────────────────────

  private gameLoop(deltaTime: number): void {
    if (this.state.phase !== "playing") return;

    const dt = deltaTime / 1000;

    // Update player positions
    this.state.players.forEach((player) => {
      if (!player.isAlive) return;

      const prevX = player.x;
      const prevY = player.y;

      // Apply velocity
      let newX = player.x + player.vx * dt;
      let newY = player.y + player.vy * dt;

      // Clamp to map bounds
      const clamped = clampPlayerPosition(newX, newY);
      newX = clamped.x;
      newY = clamped.y;

      // Resolve obstacle collisions
      const resolved = resolvePlayerObstacleCollision(newX, newY, prevX, prevY);
      player.x = resolved.x;
      player.y = resolved.y;

      // Slippery zone check — reduce effective movement speed
      let inSlippery = false;
      for (const zone of SLIPPERY_ZONES) {
        if (pointInRect(player.x, player.y, zone)) {
          inSlippery = true;
          break;
        }
      }
      if (inSlippery) {
        // Retroactively reduce movement: lerp back toward prevX/prevY
        const factor = SLIPPERY_SPEED_MULTIPLIER;
        player.x = prevX + (player.x - prevX) * factor;
        player.y = prevY + (player.y - prevY) * factor;
      }

      // Water refill check
      const stationIdx = getRefillStationIndex(player.x, player.y);
      if (stationIdx >= 0) {
        player.waterLevel = Math.min(
          MAX_WATER_LEVEL,
          player.waterLevel + REFILL_RATE_PER_SECOND * dt
        );
      }
    });

    // Update projectiles
    const toRemove: string[] = [];
    const now = Date.now();

    this.state.projectiles.forEach((proj) => {
      // Move projectile
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      // Check lifetime
      const created = this.projectileTimers.get(proj.id) || now;
      if (now - created > PROJECTILE_LIFETIME) {
        toRemove.push(proj.id);
        return;
      }

      // Check wall collision
      if (projectileCollidesWithWall(proj.x, proj.y)) {
        toRemove.push(proj.id);
        return;
      }

      // Check hit on players
      this.state.players.forEach((player) => {
        if (!player.isAlive) return;
        if (player.id === proj.ownerId) return; // no self-damage

        if (projectileHitsPlayer(proj.x, proj.y, player.x, player.y)) {
          // Apply damage
          player.wetMeter = Math.min(100, player.wetMeter + DIRECT_HIT_DAMAGE);
          if (player.wetMeter >= 100) {
            player.isAlive = false;

            // Award score to shooter
            const shooter = this.state.players.get(proj.ownerId);
            if (shooter) shooter.score++;
          }

          toRemove.push(proj.id);
        }
      });
    });

    // Clean up projectiles
    for (const id of toRemove) {
      this.state.projectiles.delete(id);
      this.projectileTimers.delete(id);
    }

    // ── Water Truck Hazard ──────────────────────────────────────
    this.waterTruckTimer += deltaTime;

    if (this.waterTruckX === null) {
      // Truck not active — check if it's time to spawn
      if (this.waterTruckTimer >= WATER_TRUCK.intervalMs) {
        // Send warning first
        if (!this.waterTruckWarned && this.waterTruckTimer >= WATER_TRUCK.intervalMs - WATER_TRUCK.warningMs) {
          this.waterTruckWarned = true;
          this.broadcast("waterTruckWarning", {});
        }
        this.waterTruckX = WATER_TRUCK.startX;
        this.waterTruckTimer = 0;
        this.waterTruckWarned = false;
      }
    } else {
      // Truck is active — move it
      this.waterTruckX += WATER_TRUCK.speed * dt;
      this.broadcast("waterTruckPos", { x: this.waterTruckX, y: WATER_TRUCK.y });

      // Check if any player is in the truck's path
      this.state.players.forEach((player) => {
        if (!player.isAlive) return;
        if (Math.abs(player.y - WATER_TRUCK.y) < WATER_TRUCK.hitRadius &&
            Math.abs(player.x - this.waterTruckX!) < 64) {
          player.wetMeter = Math.min(MAX_WET_METER, player.wetMeter + WATER_TRUCK.wetDamage);
          if (player.wetMeter >= MAX_WET_METER) {
            player.isAlive = false;
          }
        }
      });

      // Remove truck when off-screen
      if (this.waterTruckX > WATER_TRUCK.endX) {
        this.waterTruckX = null;
      }
    }

    // Check win condition
    this.checkWinCondition();
  }

  // ── Phase Management ──────────────────────────────────────────

  private startCountdown(): void {
    this.state.phase = "countdown";
    this.state.countdownTimer = COUNTDOWN_SECONDS;

    this.countdownInterval = setInterval(() => {
      this.state.countdownTimer--;
      if (this.state.countdownTimer <= 0) {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
        this.startMatch();
      }
    }, 1000);
  }

  private startMatch(): void {
    this.state.phase = "playing";
    this.state.timeLeft = MATCH_DURATION;

    // Match timer
    const timerInterval = setInterval(() => {
      if (this.state.phase !== "playing") {
        clearInterval(timerInterval);
        return;
      }

      this.state.timeLeft--;
      if (this.state.timeLeft <= 0) {
        clearInterval(timerInterval);
        // Time's up — lowest wet meter wins
        const winnerId = getLowestWetPlayer(this.state.players);
        this.endMatch(winnerId);
      }
    }, 1000);

    console.log(`[GameRoom] Match started! ${this.state.players.size} players`);
  }

  private checkWinCondition(): void {
    if (this.state.phase !== "playing") return;

    const alive = countAlivePlayers(this.state.players);
    if (alive <= 1) {
      const winnerId = getWinnerId(this.state.players);
      this.endMatch(winnerId);
    }
  }

  private endMatch(winnerId: string): void {
    if (this.state.phase === "ended") return;

    this.state.phase = "ended";
    this.state.winnerId = winnerId;

    const winner = this.state.players.get(winnerId);
    console.log(
      `[GameRoom] Match ended! Winner: ${winner?.nickname || "none"} (${winnerId})`
    );

    // Auto-dispose room after 10 seconds
    this.clock.setTimeout(() => {
      this.disconnect();
    }, 10000);
  }

  // ── Utilities ─────────────────────────────────────────────────

  private generateMatchId(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
