# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Songkran Royale — real-time PvP browser game where players compete in a Songkran water gun battle. Top-down 2D arena, 8 players max, authoritative server model.

**Stack:** Phaser 3 + Vite + TypeScript (client) · Colyseus + Express + TypeScript (server)
**Deploy:** Vercel (frontend) · Railway Singapore (server)

## Commands

### Client (`client/`)
```bash
npm run dev              # Vite dev server on :5173
npm run build            # tsc && vite build
npm run test:e2e         # Playwright tests (auto-starts dev server)
npm run test:screenshots # Visual QA screenshots of every scene
npm run test:e2e:headed  # E2E with visible browser
```

### Server (`server/`)
```bash
npm run dev    # ts-node-dev on :2567
npm run build  # tsc → dist/
npm run start  # node dist/index.js
npm run test   # vitest run (74 tests: unit + integration)
```

Run a single test file: `cd server && npx vitest run tests/unit/wetMeter.test.ts`

## Architecture

### Authoritative Server Model
All game state lives on the server. Clients send **intent only** (input keys, shoot commands). Server validates everything, runs physics at 20Hz (50ms tick), and broadcasts state patches via Colyseus.

### Client Scenes (Phaser 3)
`BootScene` → `CharacterScene` → `LobbyScene` → `OnlineGameScene` → `ResultScene`

- `GameScene` is the offline single-player variant (uses `DummyAI`)
- `OnlineGameScene` syncs from Colyseus `room.state.players`
- `LeaderboardScene` and `BattlePassScene` accessible from CharacterScene

### Server Rooms (Colyseus)
- **LobbyRoom** — matchmaking queue. 10s countdown when 2+ ready, then creates GameRoom and transfers players via `matchMaker.reserveSeatFor`
- **GameRoom** — authoritative match. 20Hz loop: move players, move projectiles, check collisions, apply damage, check win condition. Supports 30s reconnect grace period
- **PrivateRoom** — extends GameRoom with 6-char room code validation

### State Schema (`server/src/schema/GameState.ts`)
```
GameState
├── players: MapSchema<PlayerState>     (position, wetMeter, waterLevel, isAlive, kills)
├── projectiles: MapSchema<ProjectileState>
├── waterTanks: ArraySchema<TankState>
├── phase: "lobby" | "countdown" | "playing" | "ended"
├── timeLeft, mapId, matchId, winnerId
```

### Multi-Map System
Maps are registered in `server/src/game/maps/MapRegistry.ts`. Each map provides obstacles, water stations, spawn positions, and hazard configs. GameRoom loads the right map via `options.mapId`.

- **Chiang Mai** (`chiangmai`) — open streets, water truck hazard, slippery zones
- **Khao San Road** (`khaosan`) — narrow alleys, flood hazard, party zones

Map data is duplicated: `client/src/map/{ChiangMaiMap,KhaoSanMap}.ts` for rendering, `server/src/game/{GameConstants,maps/KhaoSanConstants}.ts` for physics.

### Message Protocol (client → server)
- `input` → `{ keys: { w, a, s, d }, angle: number }` — every frame
- `shoot` → fires water projectile (costs 5 water)
- `ready` → toggle ready in lobby

### Key Game Constants (`server/src/game/GameConstants.ts`)
Player speed 200px/s, projectile speed 400px/s, direct hit 15% wetMeter, refill 30/s, match 180s, max 8 players.

## Testing

**Server tests** (Vitest): `server/tests/unit/` (wetMeter, waterTank, hitDetection, winCondition, leaderboard) + `server/tests/integration/` (gameRoom, lobbyRoom, privateRoom). Integration tests mock Colyseus clients with `Object.create(Room.prototype)` pattern.

**Client E2E** (Playwright): `client/tests/e2e/`. `characterSelect.spec.ts` is fully runnable. `fullMatch.spec.ts` is skipped (needs running Colyseus server). `visualScreenshots.spec.ts` captures every scene at desktop + mobile viewports.

**Phaser test introspection:** `window.__PHASER_GAME__` is exposed in dev mode. E2E helpers in `client/tests/e2e/helpers.ts` provide `waitForPhaserScene()`, `clickCanvas()`, `getPhaserSceneKey()`.

## CI/CD

`.github/workflows/deploy.yml` deploys on push to main. Requires GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RAILWAY_TOKEN`, `VITE_SERVER_URL`.

## Key Conventions

- **Server is truth:** Never add client-side physics or state mutation for gameplay. All hit detection, damage, movement validation happens server-side.
- **Pixel art scale:** 16×16 source sprites rendered at 4× (64×64 in-game). `pixelArt: true` in Phaser config.
- **Touch + Desktop:** All gameplay must work with both keyboard+mouse AND virtual joystick (`TouchControls.ts`, detected via `isMobile()`).
- **Thai + English:** UI text is bilingual. Thai fonts: Kanit (display), Sarabun (body).
- **Design system:** Background #0A2540, accent #3AB5F5 (water), highlight #F5C842 (gold).
- **Procedural assets:** All sprites, sounds, and music are generated via code (Phaser Graphics API, Web Audio API). No external asset files yet.
- **Screenshot QA:** Run `npm run test:screenshots` from client/ after UI changes. Screenshots saved to `client/test-results/screenshots/`.
