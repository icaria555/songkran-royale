import { Client, Room } from "colyseus.js";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";

let client: Client | null = null;
let currentRoom: Room | null = null;
let lobbyRoom: Room | null = null;

// Reconnection token storage
const RECONNECT_TOKEN_KEY = "songkran_reconnect_token";
const RECONNECT_ROOM_ID_KEY = "songkran_reconnect_room_id";

export function getClient(): Client {
  if (!client) {
    client = new Client(SERVER_URL);
  }
  return client;
}

export function getCurrentRoom(): Room | null {
  return currentRoom;
}

export function getLobbyRoom(): Room | null {
  return lobbyRoom;
}

export interface JoinOptions {
  nickname: string;
  character: string;
  nationality: string;
  mapId?: string;
}

// ── Reconnection token helpers ─────────────────────────────────

function storeReconnectToken(room: Room): void {
  try {
    sessionStorage.setItem(RECONNECT_TOKEN_KEY, room.reconnectionToken);
    sessionStorage.setItem(RECONNECT_ROOM_ID_KEY, room.roomId);
  } catch {
    // sessionStorage not available — silently ignore
  }
}

function getStoredReconnectToken(): { token: string; roomId: string } | null {
  try {
    const token = sessionStorage.getItem(RECONNECT_TOKEN_KEY);
    const roomId = sessionStorage.getItem(RECONNECT_ROOM_ID_KEY);
    if (token && roomId) return { token, roomId };
  } catch {
    // ignore
  }
  return null;
}

function clearReconnectToken(): void {
  try {
    sessionStorage.removeItem(RECONNECT_TOKEN_KEY);
    sessionStorage.removeItem(RECONNECT_ROOM_ID_KEY);
  } catch {
    // ignore
  }
}

// ── Lobby (matchmaking) ────────────────────────────────────────

/** Join the LobbyRoom for matchmaking. Returns the lobby room. */
export async function joinLobby(options: JoinOptions): Promise<Room> {
  const c = getClient();
  lobbyRoom = await c.joinOrCreate("lobby", options);
  return lobbyRoom;
}

/** Leave the lobby room */
export function leaveLobby(): void {
  if (lobbyRoom) {
    lobbyRoom.leave();
    lobbyRoom = null;
  }
}

// ── Private Room ───────────────────────────────────────────────

/** Create a PrivateRoom and return the room (room.metadata.code has the code) */
export async function createPrivateRoom(options: JoinOptions): Promise<Room> {
  const c = getClient();
  currentRoom = await c.create("private", options);
  storeReconnectToken(currentRoom);
  return currentRoom;
}

/** Join a PrivateRoom by room code */
export async function joinPrivateRoom(
  roomCode: string,
  options: JoinOptions
): Promise<Room> {
  const c = getClient();
  // Join the "private" room type with the code as a filter option
  currentRoom = await c.join("private", {
    ...options,
    roomCode: roomCode.toUpperCase(),
  });
  storeReconnectToken(currentRoom);
  return currentRoom;
}

// ── Direct join (fallback / transferred game room) ─────────────

/** Join a public game room directly */
export async function joinGame(options: JoinOptions): Promise<Room> {
  const c = getClient();
  currentRoom = await c.joinOrCreate("game", options);
  storeReconnectToken(currentRoom);
  return currentRoom;
}

/** Join an existing room by ID (used for lobby → game transfer) */
export async function joinRoomById(
  roomId: string,
  options: Record<string, unknown>
): Promise<Room> {
  const c = getClient();
  currentRoom = await c.joinById(roomId, options);
  storeReconnectToken(currentRoom);
  return currentRoom;
}

// ── Reconnect ──────────────────────────────────────────────────

/** Attempt to reconnect to a game room using stored token */
export async function reconnect(): Promise<Room | null> {
  const stored = getStoredReconnectToken();
  if (!stored) return null;

  try {
    const c = getClient();
    currentRoom = await c.reconnect(stored.token);
    storeReconnectToken(currentRoom); // refresh token
    return currentRoom;
  } catch (err) {
    console.warn("Reconnect failed:", err);
    clearReconnectToken();
    return null;
  }
}

/** Check if we have a stored reconnect token */
export function hasReconnectToken(): boolean {
  return getStoredReconnectToken() !== null;
}

// ── Room management ────────────────────────────────────────────

/** Set the current game room (e.g. after transfer from lobby) */
export function setCurrentRoom(room: Room): void {
  currentRoom = room;
  storeReconnectToken(room);
}

/** Leave the current room */
export function leaveRoom(): void {
  if (currentRoom) {
    currentRoom.leave();
    currentRoom = null;
    clearReconnectToken();
  }
}

/** Send input to server */
export function sendInput(
  keys: { w: boolean; a: boolean; s: boolean; d: boolean },
  angle: number
): void {
  currentRoom?.send("input", { keys, angle });
}

/** Send shoot command */
export function sendShoot(): void {
  currentRoom?.send("shoot", {});
}

/** Send ready signal */
export function sendReady(): void {
  // Send to whichever room is active (lobby or game)
  const room = currentRoom || lobbyRoom;
  room?.send("ready", {});
}
