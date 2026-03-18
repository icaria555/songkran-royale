import { Client } from "colyseus";
import { GameRoom } from "./GameRoom";

interface PrivateRoomCreateOptions {
  private?: boolean;
  roomCode?: string;
  mapId?: string;
}

interface PrivateJoinOptions {
  nickname: string;
  character: string;
  nationality: string;
  roomCode: string;
}

/**
 * PrivateRoom — A GameRoom that requires a 6-character room code to join.
 *
 * Created with `{ private: true }` — the server generates a room code.
 * Players join by providing the correct `roomCode` in their join options.
 */
export class PrivateRoom extends GameRoom {
  /** The 6-character code required to join this room. */
  private roomCode: string = "";

  /** Called when the room is first created. */
  async onCreate(options?: PrivateRoomCreateOptions): Promise<void> {
    // Generate or use provided room code
    this.roomCode = options?.roomCode || this.generateRoomCode();

    // Call parent onCreate to set up game state, handlers, loop, etc.
    // Pass mapId through to GameRoom.onCreate
    super.onCreate({ mapId: options?.mapId });

    // Store the room code in metadata so clients can find it
    await this.setMetadata({ roomCode: this.roomCode, private: true, mapId: options?.mapId || "chiangmai" });

    console.log(
      `[PrivateRoom] Created room ${this.roomId} with code: ${this.roomCode}`
    );
  }

  /**
   * Called when a client attempts to join.
   * Validates the room code before allowing entry.
   */
  onJoin(client: Client, options: PrivateJoinOptions): void {
    // Validate room code
    if (!options.roomCode || options.roomCode !== this.roomCode) {
      throw new Error("Invalid room code");
    }

    // Delegate to parent GameRoom.onJoin
    super.onJoin(client, options);

    console.log(
      `[PrivateRoom] ${options.nickname || "Anonymous"} joined with code ${this.roomCode}`
    );
  }

  /** Generate a random 6-character alphanumeric room code. */
  private generateRoomCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
