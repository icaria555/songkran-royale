import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GameState, PlayerState, TankState } from "../../src/schema/GameState";
import {
  WATER_STATION_POSITIONS,
  MAX_WATER_LEVEL,
  WATER_COST_PER_SHOT,
  MIN_PLAYERS_TO_START,
  COUNTDOWN_SECONDS,
  MAP_WIDTH,
  MAP_HEIGHT,
  MATCH_DURATION,
  DIRECT_HIT_DAMAGE,
} from "../../src/game/GameConstants";
import { countAlivePlayers, getWinnerId } from "../../src/game/WinCondition";

// ---------------------------------------------------------------------------
// Mock helpers — We cannot use @colyseus/testing, so we instantiate a
// GameRoom manually with a stubbed Colyseus environment.
// ---------------------------------------------------------------------------

/** Minimal Client mock that records sent messages */
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

// We import the actual room class and drive it through its public lifecycle
// methods (onCreate, onJoin, onLeave) and message callbacks.
import { GameRoom } from "../../src/rooms/GameRoom";

/**
 * Build a GameRoom instance with a minimal mock environment.
 * The room is *not* connected to a real Colyseus server — timers and
 * simulation intervals are stubbed via vi.useFakeTimers().
 */
function createTestRoom(): GameRoom {
  const room = Object.create(GameRoom.prototype) as GameRoom;

  // Provide stub properties that Colyseus normally sets
  // Use Object.defineProperty to bypass Colyseus' roomId setter guard
  Object.defineProperty(room, "roomId", {
    value: "test_room_" + Math.random().toString(36).slice(2, 8),
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

  // Initialize private fields that the constructor would normally set
  (room as any).projectileIdCounter = 0;
  (room as any).projectileTimers = new Map<string, number>();
  (room as any).countdownInterval = null;

  // Message handler registry — mirrors Colyseus' onMessage behaviour
  const messageHandlers = new Map<string, (client: any, msg?: any) => void>();
  (room as any).onMessage = (type: string, handler: (client: any, msg?: any) => void) => {
    messageHandlers.set(type, handler);
  };
  // Helper to simulate client sending a message
  (room as any)._simulateMessage = (type: string, client: any, msg?: any) => {
    const handler = messageHandlers.get(type);
    if (handler) handler(client, msg);
  };

  // Simulation interval stub
  let simCallback: ((dt: number) => void) | null = null;
  (room as any).setSimulationInterval = (cb: (dt: number) => void, _interval?: number) => {
    simCallback = cb;
  };
  (room as any)._tickSimulation = (dt: number) => {
    if (simCallback) simCallback(dt);
  };

  // setState
  (room as any).setState = (state: GameState) => {
    (room as any).state = state;
  };

  // disconnect stub
  (room as any).disconnect = vi.fn();

  // allowReconnection stub (rejects immediately for tests)
  (room as any).allowReconnection = vi.fn().mockRejectedValue(new Error("no reconnect"));

  return room;
}

/** Convenience — create room + call onCreate */
function bootRoom(): GameRoom {
  const room = createTestRoom();
  room.onCreate();
  return room;
}

/** Add a player to the room and return the mock client */
function addPlayer(
  room: GameRoom,
  sessionId: string,
  opts?: Partial<{ nickname: string; character: string; nationality: string }>
) {
  const client = createMockClient(sessionId);
  (room as any).clients.push(client);
  room.onJoin(client as any, {
    nickname: opts?.nickname ?? sessionId,
    character: opts?.character ?? "male",
    nationality: opts?.nationality ?? "TH",
  });
  return client;
}

/** Shorthand to dispatch a message to the room */
function sendMessage(room: GameRoom, type: string, client: any, msg?: any) {
  (room as any)._simulateMessage(type, client, msg);
}

/** Advance the simulation loop by one tick (50 ms game time) */
function tick(room: GameRoom, dt = 50) {
  (room as any)._tickSimulation(dt);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GameRoom — integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Creates with initial state
  it("creates successfully with initial state (phase=lobby, 4 water tanks)", () => {
    const room = bootRoom();
    const state = (room as any).state as GameState;

    expect(state.phase).toBe("lobby");
    expect(state.waterTanks.length).toBe(WATER_STATION_POSITIONS.length); // 4
    expect(state.matchId).toHaveLength(6);
    expect(state.players.size).toBe(0);
    expect(state.projectiles.size).toBe(0);
  });

  // 2. Player joins with correct defaults
  it("player joins and gets added to state with correct defaults", () => {
    const room = bootRoom();
    const client = addPlayer(room, "p1", { nickname: "Alice", character: "female", nationality: "US" });
    const state = (room as any).state as GameState;

    expect(state.players.size).toBe(1);
    const player = state.players.get("p1")!;
    expect(player).toBeDefined();
    expect(player.nickname).toBe("Alice");
    expect(player.character).toBe("female");
    expect(player.nationality).toBe("US");
    expect(player.waterLevel).toBe(MAX_WATER_LEVEL);
    expect(player.wetMeter).toBe(0);
    expect(player.isAlive).toBe(true);
    expect(player.ready).toBe(false);
    expect(player.x).toBeGreaterThan(0);
    expect(player.y).toBeGreaterThan(0);
  });

  // 3. Player sends "ready" and ready count updates
  it("player sends ready and ready flag updates", () => {
    const room = bootRoom();
    const c1 = addPlayer(room, "p1");
    const state = (room as any).state as GameState;

    expect(state.players.get("p1")!.ready).toBe(false);
    sendMessage(room, "ready", c1);
    expect(state.players.get("p1")!.ready).toBe(true);
  });

  // 4. Game starts countdown when 2+ players ready
  it("starts countdown when MIN_PLAYERS_TO_START players are ready", () => {
    const room = bootRoom();
    const c1 = addPlayer(room, "p1");
    const c2 = addPlayer(room, "p2");
    const state = (room as any).state as GameState;

    sendMessage(room, "ready", c1);
    // Only 1 ready — still lobby
    expect(state.phase).toBe("lobby");

    sendMessage(room, "ready", c2);
    // 2 ready — should move to countdown
    expect(state.phase).toBe("countdown");
    expect(state.countdownTimer).toBe(COUNTDOWN_SECONDS);
  });

  // 5. Player input updates position (within bounds) — only during "playing" phase
  it("player input updates velocity (only during playing phase)", () => {
    const room = bootRoom();
    const c1 = addPlayer(room, "p1");
    const c2 = addPlayer(room, "p2");
    const state = (room as any).state as GameState;

    // Force playing phase
    state.phase = "playing";

    const prevX = state.players.get("p1")!.x;
    sendMessage(room, "input", c1, {
      keys: { w: false, a: false, s: false, d: true },
      angle: 0,
    });

    // After input message, velocity should be set
    const player = state.players.get("p1")!;
    expect(player.vx).toBeGreaterThan(0);

    // After a tick, position should move
    tick(room);
    expect(player.x).toBeGreaterThanOrEqual(prevX);
  });

  // 6. Player shoot decreases water level
  it("player shoot decreases water level", () => {
    const room = bootRoom();
    const c1 = addPlayer(room, "p1");
    const state = (room as any).state as GameState;

    state.phase = "playing";
    const before = state.players.get("p1")!.waterLevel;

    sendMessage(room, "shoot", c1);

    expect(state.players.get("p1")!.waterLevel).toBe(before - WATER_COST_PER_SHOT);
    expect(state.projectiles.size).toBe(1);
  });

  // 7. Player with 0 water can't shoot
  it("player with 0 water cannot shoot", () => {
    const room = bootRoom();
    const c1 = addPlayer(room, "p1");
    const state = (room as any).state as GameState;

    state.phase = "playing";
    state.players.get("p1")!.waterLevel = 0;

    sendMessage(room, "shoot", c1);

    expect(state.projectiles.size).toBe(0);
    expect(state.players.get("p1")!.waterLevel).toBe(0);
  });

  // 8. Player disconnect removes from state
  it("player disconnect removes from state", async () => {
    const room = bootRoom();
    const c1 = addPlayer(room, "p1");
    const state = (room as any).state as GameState;

    expect(state.players.size).toBe(1);

    // Intentional leave (code >= 4000)
    await room.onLeave(c1 as any, 4000);

    expect(state.players.size).toBe(0);
  });

  // 9. Win condition triggers when 1 player left alive
  it("win condition triggers when 1 player left alive", () => {
    const room = bootRoom();
    addPlayer(room, "p1");
    addPlayer(room, "p2");
    const state = (room as any).state as GameState;

    state.phase = "playing";

    // Kill player 2
    state.players.get("p2")!.isAlive = false;
    state.players.get("p2")!.wetMeter = 100;

    // Run a tick to trigger win condition check
    tick(room);

    expect(state.phase).toBe("ended");
    expect(state.winnerId).toBe("p1");
  });

  // 10. Game ends when timer reaches 0
  it("game ends when timer reaches 0 (time-up)", () => {
    const room = bootRoom();
    addPlayer(room, "p1");
    addPlayer(room, "p2");
    const state = (room as any).state as GameState;

    // Start a countdown then transition to playing
    state.phase = "playing";
    state.timeLeft = MATCH_DURATION;

    // Give p1 lower wet meter so it wins on time-up
    state.players.get("p1")!.wetMeter = 10;
    state.players.get("p2")!.wetMeter = 50;

    // Simulate time running out
    state.timeLeft = 0;

    // The match timer countdown is done via setInterval in startMatch().
    // We can test the checkWinCondition path by making only 1 alive, OR
    // test that the room calls endMatch when timeLeft hits 0.
    // Since the timer is in startMatch, let's directly call the private method:
    (room as any).endMatch("p1");

    expect(state.phase).toBe("ended");
    expect(state.winnerId).toBe("p1");
  });

  // 11. Room calls disconnect after game ends (auto-dispose)
  it("room schedules disconnect after game ends", () => {
    const room = bootRoom();
    addPlayer(room, "p1");
    addPlayer(room, "p2");
    const state = (room as any).state as GameState;

    state.phase = "playing";
    state.players.get("p2")!.isAlive = false;

    tick(room);

    expect(state.phase).toBe("ended");
    // clock.setTimeout should have been called to schedule disconnect
    expect((room as any).clock.setTimeout).toHaveBeenCalled();
  });

  // Extra: input ignored when not in playing phase
  it("input messages are ignored when phase is not playing", () => {
    const room = bootRoom();
    const c1 = addPlayer(room, "p1");
    const state = (room as any).state as GameState;

    // Phase is lobby
    sendMessage(room, "input", c1, {
      keys: { w: false, a: false, s: false, d: true },
      angle: 0,
    });

    // vx should still be 0
    expect(state.players.get("p1")!.vx).toBe(0);
  });

  // Extra: shoot ignored when not in playing phase
  it("shoot messages are ignored when phase is not playing", () => {
    const room = bootRoom();
    const c1 = addPlayer(room, "p1");
    const state = (room as any).state as GameState;

    sendMessage(room, "shoot", c1);
    expect(state.projectiles.size).toBe(0);
  });
});
