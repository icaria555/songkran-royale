import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GameState } from "../../src/schema/GameState";
import { PrivateRoom } from "../../src/rooms/PrivateRoom";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockClient(sessionId: string) {
  return {
    sessionId,
    send: vi.fn(),
    leave: vi.fn(),
    raw: vi.fn(),
    error: vi.fn(),
    close: vi.fn(),
    ref: {} as any,
    auth: {},
    userData: undefined as unknown,
  };
}

function createTestPrivateRoom(): PrivateRoom {
  const room = Object.create(PrivateRoom.prototype) as PrivateRoom;

  Object.defineProperty(room, "roomId", {
    value: "priv_" + Math.random().toString(36).slice(2, 8),
    writable: true,
    configurable: true,
  });
  (room as any).clients = [];
  (room as any).maxClients = 8;
  (room as any).autoDispose = true;
  (room as any)._events = {};
  (room as any).clock = { setTimeout: vi.fn(), setInterval: vi.fn(), clear: vi.fn() };
  (room as any).presence = {};
  (room as any).listing = {};

  const messageHandlers = new Map<string, (client: any, msg?: any) => void>();
  (room as any).onMessage = (type: string, handler: (client: any, msg?: any) => void) => {
    messageHandlers.set(type, handler);
  };
  (room as any)._simulateMessage = (type: string, client: any, msg?: any) => {
    const handler = messageHandlers.get(type);
    if (handler) handler(client, msg);
  };

  (room as any).setState = (state: GameState) => {
    (room as any).state = state;
  };

  (room as any).setSimulationInterval = vi.fn();
  (room as any).disconnect = vi.fn();

  // Initialize private fields from GameRoom
  (room as any).projectileIdCounter = 0;
  (room as any).projectileTimers = new Map<string, number>();
  (room as any).countdownInterval = null;

  // setMetadata stub — use Object.defineProperty to bypass Colyseus setter guard
  const metadataStore: Record<string, any> = {};
  Object.defineProperty(room, "metadata", {
    get: () => metadataStore,
    set: (val: any) => Object.assign(metadataStore, val),
    configurable: true,
  });
  (room as any).setMetadata = vi.fn(async (meta: Record<string, any>) => {
    Object.assign(metadataStore, meta);
  });

  return room;
}

async function bootPrivateRoom(
  opts?: { roomCode?: string }
): Promise<PrivateRoom> {
  const room = createTestPrivateRoom();
  await room.onCreate(opts);
  return room;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PrivateRoom — integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Room creates with 6-char room code
  it("creates with a 6-character room code", async () => {
    const room = await bootPrivateRoom();
    const code = (room as any).roomCode as string;

    expect(code).toBeDefined();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  // 2. Join with correct code succeeds
  it("join with correct code succeeds", async () => {
    const room = await bootPrivateRoom({ roomCode: "ABC123" });
    const state = (room as any).state as GameState;
    const client = createMockClient("p1");

    // Should not throw
    room.onJoin(client as any, {
      nickname: "Alice",
      character: "male",
      nationality: "TH",
      roomCode: "ABC123",
    });

    expect(state.players.size).toBe(1);
    expect(state.players.get("p1")!.nickname).toBe("Alice");
  });

  // 3. Join with wrong code fails
  it("join with wrong code throws error", async () => {
    const room = await bootPrivateRoom({ roomCode: "ABC123" });
    const client = createMockClient("p1");

    expect(() => {
      room.onJoin(client as any, {
        nickname: "Bob",
        character: "male",
        nationality: "TH",
        roomCode: "WRONG1",
      });
    }).toThrow("Invalid room code");

    const state = (room as any).state as GameState;
    expect(state.players.size).toBe(0);
  });

  // 4. Room code in metadata
  it("stores room code in metadata", async () => {
    const room = await bootPrivateRoom({ roomCode: "XYZ789" });

    expect((room as any).setMetadata).toHaveBeenCalledWith({
      roomCode: "XYZ789",
      private: true,
      mapId: "chiangmai",
    });
    expect((room as any).metadata.roomCode).toBe("XYZ789");
  });

  // 5. Join with missing code fails
  it("join with missing code throws error", async () => {
    const room = await bootPrivateRoom({ roomCode: "ABC123" });
    const client = createMockClient("p1");

    expect(() => {
      room.onJoin(client as any, {
        nickname: "Charlie",
        character: "male",
        nationality: "TH",
        roomCode: "",
      });
    }).toThrow("Invalid room code");
  });
});
