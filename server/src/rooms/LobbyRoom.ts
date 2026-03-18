import { Room, Client, matchMaker } from "colyseus";
import { LobbyState, LobbyPlayerState } from "../schema/LobbyState";
import {
  MIN_PLAYERS_TO_START,
  MAX_PLAYERS_PER_ROOM,
} from "../game/GameConstants";

/** Countdown duration in seconds once enough players are ready */
const LOBBY_COUNTDOWN_SECONDS = 10;

interface LobbyJoinOptions {
  nickname: string;
  character: string;
  nationality: string;
  mapId?: string;
}

/**
 * LobbyRoom — Matchmaking queue room.
 *
 * Players join here first. Once >= 2 players are ready a 10-second countdown
 * begins. When the countdown finishes (or 8 ready players fill the room)
 * a GameRoom is created and all ready players are transferred into it.
 */
export class LobbyRoom extends Room<{ state: LobbyState }> {
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private mapId: string = "chiangmai";

  /** Called when the room is first created. */
  async onCreate(options?: Record<string, unknown>): Promise<void> {
    this.setState(new LobbyState());
    this.maxClients = MAX_PLAYERS_PER_ROOM;

    if (options?.mapId && typeof options.mapId === "string") {
      this.mapId = options.mapId;
    }

    this.onMessage("ready", (client) => {
      this.handleReady(client);
    });

    this.onMessage("unready", (client) => {
      this.handleUnready(client);
    });

    console.log(`[LobbyRoom] Created room ${this.roomId}`);
  }

  /** Called when a client joins the lobby. */
  onJoin(client: Client, options: LobbyJoinOptions): void {
    // First joiner's mapId preference wins (if not already set by room creation)
    if (options.mapId && this.state.players.size === 0) {
      this.mapId = options.mapId;
    }

    const player = new LobbyPlayerState();
    player.id = client.sessionId;
    player.nickname = options.nickname || "Anonymous";
    player.character = options.character || "male";
    player.nationality = options.nationality || "🇹🇭";
    player.ready = false;

    this.state.players.set(client.sessionId, player);

    console.log(
      `[LobbyRoom] ${player.nickname} (${client.sessionId}) joined. ` +
        `Players: ${this.state.players.size}`
    );
  }

  /** Called when a client leaves the lobby. */
  onLeave(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`[LobbyRoom] ${player.nickname} left`);
    }
    this.state.players.delete(client.sessionId);

    // Re-evaluate countdown — if not enough ready players, cancel
    if (this.state.status === "countdown") {
      const readyCount = this.countReady();
      if (readyCount < MIN_PLAYERS_TO_START) {
        this.cancelCountdown();
      }
    }
  }

  /** Called when the room is disposed. */
  onDispose(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    console.log(`[LobbyRoom] Room ${this.roomId} disposed`);
  }

  // ── Message Handlers ──────────────────────────────────────────

  /** Mark the player as ready and potentially start countdown. */
  private handleReady(client: Client): void {
    if (this.state.status === "transferring") return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    player.ready = true;

    const readyCount = this.countReady();

    // If room is full with all ready, skip remaining countdown
    if (readyCount >= MAX_PLAYERS_PER_ROOM) {
      this.transferPlayers();
      return;
    }

    // Start countdown if enough players ready and not already counting
    if (readyCount >= MIN_PLAYERS_TO_START && this.state.status === "waiting") {
      this.startCountdown();
    }
  }

  /** Mark the player as not ready. */
  private handleUnready(client: Client): void {
    if (this.state.status === "transferring") return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    player.ready = false;

    // Cancel countdown if not enough ready players
    if (this.state.status === "countdown") {
      const readyCount = this.countReady();
      if (readyCount < MIN_PLAYERS_TO_START) {
        this.cancelCountdown();
      }
    }
  }

  // ── Countdown ─────────────────────────────────────────────────

  /** Start the 10-second countdown before match creation. */
  private startCountdown(): void {
    this.state.status = "countdown";
    this.state.countdownTimer = LOBBY_COUNTDOWN_SECONDS;

    this.countdownInterval = setInterval(() => {
      this.state.countdownTimer--;

      if (this.state.countdownTimer <= 0) {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
        this.transferPlayers();
      }
    }, 1000);

    console.log(`[LobbyRoom] Countdown started (${LOBBY_COUNTDOWN_SECONDS}s)`);
  }

  /** Cancel an in-progress countdown. */
  private cancelCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.state.status = "waiting";
    this.state.countdownTimer = -1;

    console.log("[LobbyRoom] Countdown cancelled — not enough ready players");
  }

  // ── Transfer ──────────────────────────────────────────────────

  /**
   * Create a GameRoom and transfer all ready players into it.
   * Players who are not ready stay in the lobby.
   */
  private async transferPlayers(): Promise<void> {
    this.state.status = "transferring";

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    try {
      // Create a new GameRoom via matchmaker, passing selected map
      const gameRoom = await matchMaker.createRoom("game", { mapId: this.mapId });

      console.log(
        `[LobbyRoom] Created GameRoom ${gameRoom.roomId}, transferring players...`
      );

      // Collect ready players
      const readyClients: { client: Client; options: Record<string, string> }[] = [];
      for (const client of this.clients) {
        const player = this.state.players.get(client.sessionId);
        if (player?.ready) {
          readyClients.push({
            client,
            options: {
              nickname: player.nickname,
              character: player.character,
              nationality: player.nationality,
            },
          });
        }
      }

      // Send transfer message to each ready client with the game room info
      for (const { client, options } of readyClients) {
        // Reserve a seat in the game room for this client
        const reservation = await matchMaker.reserveSeatFor(gameRoom, options);

        // Tell the client to switch rooms
        client.send("transfer", {
          roomId: gameRoom.roomId,
          sessionId: reservation.sessionId,
          reservationToken: reservation,
        });
      }

      // Remove ready players from lobby state after transfer
      for (const { client } of readyClients) {
        this.state.players.delete(client.sessionId);
      }

      // Reset lobby status for remaining players
      this.state.status = "waiting";
      this.state.countdownTimer = -1;

      console.log(
        `[LobbyRoom] Transferred ${readyClients.length} players. ` +
          `Remaining in lobby: ${this.state.players.size}`
      );
    } catch (err) {
      console.error("[LobbyRoom] Failed to transfer players:", err);
      // Reset status so players can try again
      this.state.status = "waiting";
      this.state.countdownTimer = -1;
    }
  }

  // ── Utilities ─────────────────────────────────────────────────

  /** Count the number of ready players. */
  private countReady(): number {
    let count = 0;
    this.state.players.forEach((p) => {
      if (p.ready) count++;
    });
    return count;
  }
}
