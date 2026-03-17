# Songkran Royale -- k6 Load Tests

Load and stress tests for the Colyseus game server using [k6](https://k6.io/).

## Prerequisites

### Install k6

**macOS (Homebrew):**

```bash
brew install k6
```

**Linux (Debian/Ubuntu):**

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

**Windows (Chocolatey):**

```bash
choco install k6
```

**Docker:**

```bash
docker pull grafana/k6
```

### Start the game server

The server must be running before you execute any test:

```bash
cd server
npm run dev
# Server listens on http://localhost:2567
```

Verify it is up:

```bash
curl http://localhost:2567/health
# Expected: {"status":"ok","timestamp":...}
```

## Test Scripts

### k6_baseline.js -- Baseline Load Test

Simulates steady-state load with 20 concurrent players.

| Parameter        | Value                       |
|------------------|-----------------------------|
| Virtual Users    | 20 (gameplay) + 5 (health)  |
| Duration         | 30 seconds                  |
| Input rate       | 20 Hz per VU (WASD + angle) |
| Shoot rate       | Every 2 seconds per VU      |

**Run:**

```bash
k6 run k6_baseline.js
```

**Thresholds:**

| Metric                   | Pass criteria    | Meaning                                                    |
|--------------------------|------------------|------------------------------------------------------------|
| `http_req_duration p95`  | < 100 ms         | 95th percentile HTTP response time stays under 100 ms      |
| `error_rate`             | < 1 %            | Fewer than 1 in 100 operations fail                        |
| `matchmaker_duration_ms` | p95 < 100 ms     | Room join via Colyseus matchmaker completes quickly         |

### k6_stress.js -- Stress Test

Ramps the server to 50 concurrent players and holds for a full minute.

| Phase     | Duration | Target VUs |
|-----------|----------|------------|
| Ramp up   | 30 s     | 0 -> 50    |
| Hold      | 60 s     | 50         |
| Ramp down | 30 s     | 50 -> 0    |

**Run:**

```bash
k6 run k6_stress.js
```

**Thresholds:**

| Metric                   | Pass criteria | Meaning                                                       |
|--------------------------|---------------|---------------------------------------------------------------|
| `http_req_duration p95`  | < 200 ms      | Relaxed ceiling -- server may be under heavy load              |
| `error_rate`             | < 5 %         | Some errors are tolerable under stress, but not too many       |
| `matchmaker_duration_ms` | p95 < 200 ms  | Room joining still works under pressure                        |
| `server_crash_detected`  | < 1 %         | Health endpoint keeps responding (server has not crashed)       |

## Interpreting Results

After each run, k6 prints a summary table. Key columns:

- **http_req_duration** -- Round-trip time for HTTP requests (health check, matchmaker). Look at `p(95)` and `max`.
- **ws_connecting** -- Time to establish the WebSocket handshake. High values indicate the server is struggling with new connections.
- **ws_messages_sent / ws_messages_received** -- Total message throughput. During baseline, expect roughly `20 VUs x 20 Hz x 30 s = 12,000` input messages plus shoot messages.
- **error_rate** -- Fraction of failed checks. If this exceeds the threshold the test is marked as FAILED.
- **server_crash_detected** (stress only) -- If the health endpoint stops responding this metric spikes, indicating a crash or hang.

### Pass / Fail

k6 exits with code 0 if all thresholds pass, or code 99 if any threshold is breached. Use this in CI:

```bash
k6 run k6_baseline.js || echo "BASELINE FAILED"
k6 run k6_stress.js   || echo "STRESS TEST FAILED"
```

### Custom metrics

Both scripts export custom metrics visible in the summary:

| Metric                    | Type    | Description                              |
|---------------------------|---------|------------------------------------------|
| `ws_connections_total`    | Counter | Total WebSocket connections opened        |
| `ws_errors_total`         | Counter | Total WebSocket errors                    |
| `ws_messages_sent`        | Counter | Total messages sent over WebSocket        |
| `ws_messages_received`    | Counter | Total messages received over WebSocket    |
| `matchmaker_duration_ms`  | Trend   | Matchmaker join latency                   |
| `error_rate`              | Rate    | Fraction of operations that failed        |
| `server_crash_detected`   | Rate    | Health check failure rate (stress only)   |

## Tips

- Run baseline first to establish a performance floor, then stress to find the ceiling.
- Monitor server-side metrics (CPU, memory, event loop lag) alongside k6 output for a complete picture.
- If the Colyseus matchmaker rejects connections (room full, max 8 per room), the scripts automatically fall back to raw WebSocket connection testing.
- To output results in JSON for further analysis: `k6 run --out json=results.json k6_baseline.js`
- To stream results to Grafana Cloud or InfluxDB, see the [k6 output docs](https://grafana.com/docs/k6/latest/results-output/).
