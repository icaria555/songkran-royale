/**
 * k6 Baseline Load Test for Songkran Royale
 *
 * Simulates 20 concurrent players connecting via WebSocket to the Colyseus
 * game server. Each virtual user joins a game room, sends a "ready" message,
 * streams movement inputs at 20 Hz for 30 seconds, shoots every 2 seconds,
 * and then disconnects gracefully.
 *
 * Colyseus uses its own binary protocol on top of WebSocket. Because k6 cannot
 * replicate that framing natively, this script takes a two-layer approach:
 *   1. HTTP layer  -- hits the Colyseus matchmaker (POST /matchmake/joinOrCreate/game)
 *      and the /health endpoint to measure HTTP latency under load.
 *   2. WebSocket layer -- opens raw WS connections to verify the server can
 *      sustain the target connection count and exchange messages without errors.
 *
 * Run:
 *   k6 run k6_baseline.js
 *
 * Prerequisites:
 *   - The game server must be running on localhost:2567
 *   - k6 must be installed (see README.md)
 */

import ws from "k6/ws";
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// ── Custom metrics ───────────────────────────────────────────────────────────
const wsConnections = new Counter("ws_connections_total");
const wsErrors = new Counter("ws_errors_total");
const wsMessagesSent = new Counter("ws_messages_sent");
const wsMessagesReceived = new Counter("ws_messages_received");
const matchmakerDuration = new Trend("matchmaker_duration_ms", true);
const errorRate = new Rate("error_rate");

// ── Options ──────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Scenario 1: HTTP health-check baseline
    health_check: {
      executor: "constant-vus",
      vus: 5,
      duration: "30s",
      exec: "healthCheck",
      tags: { scenario: "health_check" },
    },

    // Scenario 2: Matchmaker + WebSocket gameplay
    gameplay: {
      executor: "constant-vus",
      vus: 20,
      duration: "30s",
      exec: "gameplay",
      startTime: "0s",
      tags: { scenario: "gameplay" },
    },
  },

  thresholds: {
    // p95 HTTP response time must stay under 100 ms
    http_req_duration: ["p(95)<100"],
    // Overall error rate under 1 %
    error_rate: ["rate<0.01"],
    // Matchmaker join should complete in under 100 ms
    matchmaker_duration_ms: ["p(95)<100"],
  },
};

// ── Constants matching GameConstants.ts ───────────────────────────────────────
const BASE_URL = "http://localhost:2567";
const WS_URL = "ws://localhost:2567";
const INPUT_HZ = 20; // messages per second
const INPUT_INTERVAL_S = 1 / INPUT_HZ; // 0.05 s
const GAMEPLAY_DURATION_S = 30;
const SHOOT_INTERVAL_S = 2;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a random nickname for this VU. */
function randomNickname() {
  const names = [
    "SomchaiK6", "NongNamK6", "PlaraK6", "TukTukK6",
    "MooDeangK6", "SawasdeeK6", "SplashK6", "WaterK6",
  ];
  return names[Math.floor(Math.random() * names.length)] + `_${__VU}`;
}

/** Return random WASD key state. */
function randomKeys() {
  return {
    w: Math.random() > 0.5,
    a: Math.random() > 0.5,
    s: Math.random() > 0.5,
    d: Math.random() > 0.5,
  };
}

/** Return a random angle in radians. */
function randomAngle() {
  return Math.random() * Math.PI * 2;
}

// ── Scenario: Health Check ───────────────────────────────────────────────────
export function healthCheck() {
  const res = http.get(`${BASE_URL}/health`);
  const ok = check(res, {
    "health status 200": (r) => r.status === 200,
    "health body ok": (r) => {
      try {
        return JSON.parse(r.body).status === "ok";
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!ok);
  sleep(1);
}

// ── Scenario: Gameplay via Matchmaker + WebSocket ────────────────────────────
export function gameplay() {
  const nickname = randomNickname();

  // Step 1 -- Use the Colyseus HTTP matchmaker to join or create a "game" room.
  // Colyseus exposes POST /matchmake/joinOrCreate/<roomName> which returns
  // { room: { roomId, processId, sessionId }, ... } and a token/sessionId
  // that the WS connection needs.
  const joinPayload = JSON.stringify({
    nickname: nickname,
    character: "male",
    nationality: "TH",
  });

  const joinStart = Date.now();
  const joinRes = http.post(
    `${BASE_URL}/matchmake/joinOrCreate/game`,
    joinPayload,
    { headers: { "Content-Type": "application/json" } }
  );
  matchmakerDuration.add(Date.now() - joinStart);

  const joinOk = check(joinRes, {
    "matchmaker status 200": (r) => r.status === 200,
    "matchmaker has room": (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!body.room;
      } catch {
        return false;
      }
    },
  });

  if (!joinOk) {
    errorRate.add(true);
    // Fallback: still try a raw WS connection to measure connection capacity
    rawWebSocketTest(nickname);
    return;
  }

  errorRate.add(false);

  // Parse matchmaker response
  let roomData;
  try {
    roomData = JSON.parse(joinRes.body);
  } catch {
    errorRate.add(true);
    return;
  }

  const roomId = roomData.room.roomId;
  const sessionId = roomData.sessionId;
  const processId = roomData.room.processId || "";

  // Step 2 -- Open a WebSocket connection to the reserved seat.
  // Colyseus WS endpoint format: ws://host:port/roomId?sessionId=...
  const wsEndpoint = `${WS_URL}/${roomId}?sessionId=${sessionId}`;

  const res = ws.connect(wsEndpoint, null, function (socket) {
    wsConnections.add(1);

    socket.on("open", function () {
      // Step 3 -- Send "ready" message.
      // Colyseus uses a binary protocol; for raw WS we send JSON as a
      // best-effort simulation. The server may or may not parse it depending
      // on the transport layer, but this exercises the connection pipeline.
      socket.send(JSON.stringify([0, "ready", {}]));
      wsMessagesSent.add(1);
    });

    socket.on("message", function (_data) {
      wsMessagesReceived.add(1);
    });

    socket.on("error", function (e) {
      wsErrors.add(1);
      errorRate.add(true);
    });

    // Step 4 -- Simulate gameplay: send inputs at 20 Hz, shoot every 2s.
    const totalTicks = GAMEPLAY_DURATION_S * INPUT_HZ; // 600 ticks
    const shootEveryNTicks = SHOOT_INTERVAL_S * INPUT_HZ; // every 40 ticks

    for (let tick = 0; tick < totalTicks; tick++) {
      // Movement input
      const inputMsg = JSON.stringify([
        0,
        "input",
        { keys: randomKeys(), angle: randomAngle() },
      ]);
      socket.send(inputMsg);
      wsMessagesSent.add(1);

      // Shoot every 2 seconds
      if (tick % shootEveryNTicks === 0 && tick > 0) {
        socket.send(JSON.stringify([0, "shoot", {}]));
        wsMessagesSent.add(1);
      }

      sleep(INPUT_INTERVAL_S);
    }

    // Step 5 -- Graceful disconnect
    socket.close();
  });

  const wsOk = check(res, {
    "ws status 101": (r) => r && r.status === 101,
  });

  if (!wsOk) {
    errorRate.add(true);
  }
}

// ── Fallback: Raw WebSocket connection test ──────────────────────────────────
// Used when the matchmaker is unavailable or returns an unexpected format.
function rawWebSocketTest(nickname) {
  const res = ws.connect(WS_URL, null, function (socket) {
    wsConnections.add(1);

    socket.on("open", function () {
      // Just hold the connection open for the duration to stress-test
      // the server's connection handling capacity.
      socket.send(JSON.stringify({ type: "ping", nickname: nickname }));
      wsMessagesSent.add(1);
    });

    socket.on("message", function (_data) {
      wsMessagesReceived.add(1);
    });

    socket.on("error", function (_e) {
      wsErrors.add(1);
      errorRate.add(true);
    });

    // Hold connection for the gameplay duration
    sleep(GAMEPLAY_DURATION_S);
    socket.close();
  });

  check(res, {
    "raw ws status 101": (r) => r && r.status === 101,
  });
}
