/**
 * k6 Stress Test for Songkran Royale
 *
 * Ramps from 0 to 50 virtual users over 30 seconds, holds at 50 for 60
 * seconds, then ramps back down over 30 seconds. Each VU follows the same
 * gameplay simulation as the baseline test (join room, ready, input at 20 Hz,
 * shoot every 2 s, disconnect).
 *
 * This test is designed to find the server's breaking point and verify it
 * degrades gracefully rather than crashing.
 *
 * Run:
 *   k6 run k6_stress.js
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
const serverCrashDetected = new Rate("server_crash_detected");

// ── Options ──────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Scenario 1: Ramping health check to detect server crashes
    health_monitor: {
      executor: "constant-vus",
      vus: 2,
      duration: "120s",
      exec: "healthMonitor",
      tags: { scenario: "health_monitor" },
    },

    // Scenario 2: Ramping gameplay stress test
    stress_gameplay: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },  // Ramp up to 50
        { duration: "60s", target: 50 },  // Hold at 50
        { duration: "30s", target: 0 },   // Ramp down
      ],
      exec: "gameplay",
      tags: { scenario: "stress_gameplay" },
    },
  },

  thresholds: {
    // p95 HTTP response time under 200 ms (relaxed for stress)
    http_req_duration: ["p(95)<200"],
    // Error rate under 5 %
    error_rate: ["rate<0.05"],
    // Matchmaker should still respond in under 200 ms
    matchmaker_duration_ms: ["p(95)<200"],
    // Server must not crash (health endpoint keeps responding)
    server_crash_detected: ["rate<0.01"],
  },
};

// ── Constants ────────────────────────────────────────────────────────────────
const BASE_URL = "http://localhost:2567";
const WS_URL = "ws://localhost:2567";
const INPUT_HZ = 20;
const INPUT_INTERVAL_S = 1 / INPUT_HZ;
const SHOOT_INTERVAL_S = 2;

// Each VU gameplay session lasts ~20 s so VUs churn through multiple sessions
// during the 60 s hold period, creating realistic join/leave pressure.
const SESSION_DURATION_S = 20;

// ── Helpers ──────────────────────────────────────────────────────────────────

function randomNickname() {
  const names = [
    "StressBot", "FloodTest", "TsunamiK6", "MonsoonVU",
    "WaterCannon", "SplashStorm", "NamTokK6", "RainMaker",
  ];
  return names[Math.floor(Math.random() * names.length)] + `_${__VU}_${__ITER}`;
}

function randomKeys() {
  return {
    w: Math.random() > 0.5,
    a: Math.random() > 0.5,
    s: Math.random() > 0.5,
    d: Math.random() > 0.5,
  };
}

function randomAngle() {
  return Math.random() * Math.PI * 2;
}

// ── Scenario: Health Monitor ─────────────────────────────────────────────────
// Runs continuously throughout the stress test. Any failure here means the
// server has become unresponsive or crashed.
export function healthMonitor() {
  const res = http.get(`${BASE_URL}/health`, { timeout: "5s" });
  const ok = check(res, {
    "health status 200": (r) => r.status === 200,
    "health response valid": (r) => {
      try {
        return JSON.parse(r.body).status === "ok";
      } catch {
        return false;
      }
    },
  });

  serverCrashDetected.add(!ok);
  errorRate.add(!ok);
  sleep(2);
}

// ── Scenario: Stress Gameplay ────────────────────────────────────────────────
export function gameplay() {
  const nickname = randomNickname();

  // Step 1 -- Join via matchmaker
  const joinPayload = JSON.stringify({
    nickname: nickname,
    character: Math.random() > 0.5 ? "male" : "female",
    nationality: "TH",
  });

  const joinStart = Date.now();
  const joinRes = http.post(
    `${BASE_URL}/matchmake/joinOrCreate/game`,
    joinPayload,
    {
      headers: { "Content-Type": "application/json" },
      timeout: "10s",
    }
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
    // Fallback: raw WS connection test
    rawConnectionTest(nickname);
    return;
  }

  errorRate.add(false);

  let roomData;
  try {
    roomData = JSON.parse(joinRes.body);
  } catch {
    errorRate.add(true);
    return;
  }

  const roomId = roomData.room.roomId;
  const sessionId = roomData.sessionId;

  // Step 2 -- Open WebSocket
  const wsEndpoint = `${WS_URL}/${roomId}?sessionId=${sessionId}`;

  const res = ws.connect(wsEndpoint, null, function (socket) {
    wsConnections.add(1);

    socket.on("open", function () {
      // Send ready
      socket.send(JSON.stringify([0, "ready", {}]));
      wsMessagesSent.add(1);
    });

    socket.on("message", function (_data) {
      wsMessagesReceived.add(1);
    });

    socket.on("error", function (_e) {
      wsErrors.add(1);
      errorRate.add(true);
    });

    // Step 3 -- Simulate gameplay for SESSION_DURATION_S
    const totalTicks = SESSION_DURATION_S * INPUT_HZ;
    const shootEveryNTicks = SHOOT_INTERVAL_S * INPUT_HZ;

    for (let tick = 0; tick < totalTicks; tick++) {
      const inputMsg = JSON.stringify([
        0,
        "input",
        { keys: randomKeys(), angle: randomAngle() },
      ]);
      socket.send(inputMsg);
      wsMessagesSent.add(1);

      if (tick % shootEveryNTicks === 0 && tick > 0) {
        socket.send(JSON.stringify([0, "shoot", {}]));
        wsMessagesSent.add(1);
      }

      sleep(INPUT_INTERVAL_S);
    }

    // Step 4 -- Graceful disconnect
    socket.close();
  });

  const wsOk = check(res, {
    "ws status 101": (r) => r && r.status === 101,
  });

  if (!wsOk) {
    errorRate.add(true);
  }

  // Brief pause before VU loops back and creates a new session
  sleep(1);
}

// ── Fallback: Raw connection test ────────────────────────────────────────────
function rawConnectionTest(nickname) {
  // If matchmaker fails, test raw WS connection capacity
  const res = ws.connect(WS_URL, null, function (socket) {
    wsConnections.add(1);

    socket.on("open", function () {
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

    sleep(SESSION_DURATION_S);
    socket.close();
  });

  check(res, {
    "raw ws status 101": (r) => r && r.status === 101,
  });
}
