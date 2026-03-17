import { Client, Room } from "colyseus.js";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";

let client: Client | null = null;
let currentRoom: Room | null = null;

export function getClient(): Client {
  if (!client) {
    client = new Client(SERVER_URL);
  }
  return client;
}

export function getCurrentRoom(): Room | null {
  return currentRoom;
}

export interface JoinOptions {
  nickname: string;
  character: string;
  nationality: string;
}

/** Join a public game room */
export async function joinGame(options: JoinOptions): Promise<Room> {
  const c = getClient();
  currentRoom = await c.joinOrCreate("game", options);
  return currentRoom;
}

/** Join a private room by code */
export async function joinPrivateRoom(
  roomId: string,
  options: JoinOptions
): Promise<Room> {
  const c = getClient();
  currentRoom = await c.joinById(roomId, options);
  return currentRoom;
}

/** Leave the current room */
export function leaveRoom(): void {
  if (currentRoom) {
    currentRoom.leave();
    currentRoom = null;
  }
}

/** Send input to server */
export function sendInput(keys: {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}, angle: number): void {
  currentRoom?.send("input", { keys, angle });
}

/** Send shoot command */
export function sendShoot(): void {
  currentRoom?.send("shoot", {});
}

/** Send ready signal */
export function sendReady(): void {
  currentRoom?.send("ready", {});
}
