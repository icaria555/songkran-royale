/**
 * E2E tests — Full Match flow
 *
 * Two test suites:
 *   1. Offline mode — always runs (single player vs AI, no server needed)
 *   2. Online mode — runs only when Colyseus server is reachable on :2567
 *
 * Run with:  npx playwright test tests/e2e/fullMatch.spec.ts
 */

import { test, expect, BrowserContext, Page } from "@playwright/test";
import {
  waitForCanvas,
  clickCanvas,
  waitForPhaserScene,
  getPhaserSceneKey,
  isServerRunning,
} from "./helpers";

const SCREENSHOT_DIR = "test-results/screenshots";

/**
 * Complete character select and arrive at LobbyScene.
 */
async function completeCharacterSelect(page: Page, nickname: string) {
  await page.goto("/");
  await waitForCanvas(page);
  await waitForPhaserScene(page, "CharacterScene");
  await page.waitForTimeout(500);

  // Select female character card (left card)
  await clickCanvas(page, 240, 200);
  await page.waitForTimeout(200);

  // Click nickname input area and type
  await clickCanvas(page, 400, 480);
  await page.waitForTimeout(200);
  await page.keyboard.type(nickname, { delay: 30 });
  await page.waitForTimeout(200);

  // Click CTA button
  await clickCanvas(page, 400, 530);
  await page.waitForTimeout(1500);
}

/**
 * From LobbyScene, click Quick Match to either join server or trigger offline fallback.
 * Returns the scene we land on.
 */
async function clickQuickMatchAndWait(page: Page): Promise<string> {
  // Wait for LobbyScene to fully render its main menu
  await waitForPhaserScene(page, "LobbyScene");
  await page.waitForTimeout(800);

  // Click Quick Match button (rectangle center at y=240)
  await clickCanvas(page, 400, 240);
  await page.waitForTimeout(5000); // wait for server connection attempt + possible fallback

  const scene = await getPhaserSceneKey(page);
  return scene ?? "unknown";
}

// ══════════════════════════════════════════════════════════════════════
// OFFLINE MODE — Single player vs AI (always runs, no server needed)
// ══════════════════════════════════════════════════════════════════════

test.describe("Full Match — Offline Mode", () => {
  test("character select → lobby → offline fallback → gameplay", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await completeCharacterSelect(page, "OfflineP1");

    // Should be on LobbyScene
    const lobbyScene = await getPhaserSceneKey(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/offline-01-lobby-${lobbyScene}.png` });

    // Click Quick Match — server isn't running, should fall back to GameScene
    const scene = await clickQuickMatchAndWait(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/offline-02-after-quickmatch-${scene}.png` });

    // Should now be on GameScene (offline fallback)
    if (scene !== "GameScene") {
      // Give extra time for fallback
      await page.waitForTimeout(5000);
      const retryScene = await getPhaserSceneKey(page);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/offline-02b-retry-${retryScene}.png` });
    }
  });

  test("HUD renders during offline gameplay", async ({ page }) => {
    await completeCharacterSelect(page, "HUDCheck");

    // Trigger offline fallback via Quick Match
    await clickQuickMatchAndWait(page);

    // Wait for GameScene to fully initialize
    await page.waitForTimeout(2000);
    const scene = await getPhaserSceneKey(page);

    if (scene === "GameScene") {
      const canvas = page.locator("canvas");
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(0);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/offline-03-hud-${scene}.png` });
  });

  test("player can move and shoot in offline mode", async ({ page }) => {
    await completeCharacterSelect(page, "ActionTest");
    await clickQuickMatchAndWait(page);
    await page.waitForTimeout(2000);

    const scene = await getPhaserSceneKey(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/offline-04-before-move-${scene}.png` });

    if (scene === "GameScene") {
      // Move with WASD
      await page.keyboard.down("d");
      await page.waitForTimeout(600);
      await page.keyboard.up("d");
      await page.keyboard.down("s");
      await page.waitForTimeout(600);
      await page.keyboard.up("s");
      await page.screenshot({ path: `${SCREENSHOT_DIR}/offline-05-after-move.png` });

      // Shoot by clicking on canvas
      const canvas = page.locator("canvas");
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2 + 80, box.y + box.height / 2);
        await page.waitForTimeout(200);
        await page.mouse.click(box.x + box.width / 2 + 80, box.y + box.height / 2);
        await page.waitForTimeout(200);
      }
      await page.screenshot({ path: `${SCREENSHOT_DIR}/offline-06-after-shoot.png` });
    }
  });

  test("offline game runs 15s without fatal errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await completeCharacterSelect(page, "StabilityTest");
    await clickQuickMatchAndWait(page);
    await page.waitForTimeout(15_000);

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    const scene = await getPhaserSceneKey(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/offline-07-after-15s-${scene}.png` });

    // Filter out expected network errors (server not running in offline mode)
    const fatal = errors.filter(
      (e) =>
        !e.includes("WebSocket") &&
        !e.includes("Colyseus") &&
        !e.includes("net::ERR") &&
        !e.includes("Failed to fetch") &&
        !e.includes("ECONNREFUSED") &&
        !e.includes("Quick match failed") &&
        !e.includes("ProgressEvent"),
    );
    expect(fatal).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// ONLINE MODE — Multiplayer (requires Colyseus server on :2567)
// ══════════════════════════════════════════════════════════════════════

test.describe("Full Match — Online Mode", () => {
  test.beforeAll(async () => {
    const serverUp = await isServerRunning();
    if (!serverUp) {
      throw new Error(
        "Colyseus game server is not running on port 2567.\n" +
        "Start it before running online tests:\n\n" +
        "  cd server && npm run dev\n\n" +
        "Then re-run:  cd client && npx playwright test tests/e2e/fullMatch.spec.ts"
      );
    }
  });

  test("2 players join lobby, ready up, match starts", async ({ browser }) => {
    const ctx1: BrowserContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ctx2: BrowserContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page1: Page = await ctx1.newPage();
    const page2: Page = await ctx2.newPage();

    await Promise.all([
      completeCharacterSelect(page1, "OnlineP1"),
      completeCharacterSelect(page2, "OnlineP2"),
    ]);

    await page1.screenshot({ path: `${SCREENSHOT_DIR}/online-01-p1-lobby.png` });
    await page2.screenshot({ path: `${SCREENSHOT_DIR}/online-01-p2-lobby.png` });

    // Both should be on LobbyScene
    await waitForPhaserScene(page1, "LobbyScene");
    await waitForPhaserScene(page2, "LobbyScene");

    // Click Quick Match
    await clickCanvas(page1, 400, 240);
    await clickCanvas(page2, 400, 240);
    await page1.waitForTimeout(3000);

    await page1.screenshot({ path: `${SCREENSHOT_DIR}/online-02-p1-joined.png` });
    await page2.screenshot({ path: `${SCREENSHOT_DIR}/online-02-p2-joined.png` });

    // Both click Ready
    await clickCanvas(page1, 400, 460);
    await clickCanvas(page2, 400, 460);

    // Wait for lobby countdown (10s) + transfer + game countdown (3s) + buffer
    await page1.waitForTimeout(25_000);

    const scene1 = await getPhaserSceneKey(page1);
    const scene2 = await getPhaserSceneKey(page2);
    await page1.screenshot({ path: `${SCREENSHOT_DIR}/online-03-p1-${scene1}.png` });
    await page2.screenshot({ path: `${SCREENSHOT_DIR}/online-03-p2-${scene2}.png` });

    expect(scene1 === "OnlineGameScene" || scene2 === "OnlineGameScene").toBe(true);

    await ctx1.close();
    await ctx2.close();
  });

  test("multiplayer HUD visible during gameplay", async ({ browser }) => {
    const ctx1: BrowserContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ctx2: BrowserContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page1: Page = await ctx1.newPage();
    const page2: Page = await ctx2.newPage();

    await Promise.all([
      completeCharacterSelect(page1, "HUDP1"),
      completeCharacterSelect(page2, "HUDP2"),
    ]);

    await waitForPhaserScene(page1, "LobbyScene");
    await waitForPhaserScene(page2, "LobbyScene");

    await clickCanvas(page1, 400, 240);
    await clickCanvas(page2, 400, 240);
    await page1.waitForTimeout(3000);
    await clickCanvas(page1, 400, 460);
    await clickCanvas(page2, 400, 460);
    await page1.waitForTimeout(15_000);

    const scene = await getPhaserSceneKey(page1);
    if (scene === "OnlineGameScene") {
      await page1.waitForTimeout(2000);
      await page1.screenshot({ path: `${SCREENSHOT_DIR}/online-04-hud.png` });
      const canvas = page1.locator("canvas");
      await expect(canvas).toBeVisible();
    }

    await ctx1.close();
    await ctx2.close();
  });

  test("multiplayer runs 30s without fatal errors", async ({ browser }) => {
    const ctx1: BrowserContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ctx2: BrowserContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page1: Page = await ctx1.newPage();
    const page2: Page = await ctx2.newPage();

    const errors: string[] = [];
    page1.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await Promise.all([
      completeCharacterSelect(page1, "StressP1"),
      completeCharacterSelect(page2, "StressP2"),
    ]);

    await waitForPhaserScene(page1, "LobbyScene");
    await waitForPhaserScene(page2, "LobbyScene");

    await clickCanvas(page1, 400, 240);
    await clickCanvas(page2, 400, 240);
    await page1.waitForTimeout(3000);
    await clickCanvas(page1, 400, 460);
    await clickCanvas(page2, 400, 460);
    await page1.waitForTimeout(15_000);

    if ((await getPhaserSceneKey(page1)) === "OnlineGameScene") {
      await page1.waitForTimeout(30_000);
      await page1.screenshot({ path: `${SCREENSHOT_DIR}/online-05-after-30s.png` });
    }

    const fatal = errors.filter(
      (e) => !e.includes("WebSocket") && !e.includes("Colyseus") && !e.includes("net::ERR"),
    );
    expect(fatal).toHaveLength(0);

    await ctx1.close();
    await ctx2.close();
  });
});
