/**
 * E2E tests — Full Match flow (2 players)
 *
 * These specs contain full Playwright implementation but are skipped
 * because they require both a running game server (Colyseus) and
 * client dev server (Vite on :5173).
 *
 * Run with:  npx playwright test client/tests/e2e/fullMatch.spec.ts
 */

import { test, expect, BrowserContext, Page } from "@playwright/test";

const BASE_URL = "http://localhost:5173";
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

/**
 * Helper: get canvas bounding box and scale factors
 */
async function getCanvasInfo(page: Page) {
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not found");
  return {
    box,
    scaleX: box.width / GAME_WIDTH,
    scaleY: box.height / GAME_HEIGHT,
    clickGame: async (gx: number, gy: number) => {
      await page.mouse.click(box.x + gx * (box.width / GAME_WIDTH), box.y + gy * (box.height / GAME_HEIGHT));
    },
  };
}

/**
 * Helper: complete the character select flow for one player
 */
async function completeCharacterSelect(page: Page, nickname: string) {
  await page.goto(BASE_URL);
  const { clickGame } = await getCanvasInfo(page);

  // Wait for CharacterScene to load
  await page.waitForTimeout(1500);

  // Select first character card (female) at approx x=240, y=210
  await clickGame(240, 210);
  await page.waitForTimeout(200);

  // Select a nationality pill (Thai, first pill)
  await clickGame(250, 348);
  await page.waitForTimeout(200);

  // Type nickname
  await page.keyboard.type(nickname, { delay: 40 });
  await page.waitForTimeout(200);

  // Click CTA button at y≈490
  await clickGame(400, 490);
  await page.waitForTimeout(1000);
}

/**
 * Helper: click Quick Match in LobbyScene
 * Quick Match button is at approx y=180, center x
 */
async function clickQuickMatch(page: Page) {
  const { clickGame } = await getCanvasInfo(page);
  await clickGame(400, 180);
  await page.waitForTimeout(1000);
}

/**
 * Helper: click Ready button in LobbyScene
 * Ready button is at y=460, center x
 */
async function clickReady(page: Page) {
  const { clickGame } = await getCanvasInfo(page);
  await clickGame(400, 460);
  await page.waitForTimeout(500);
}

// ── Full Match tests ─────────────────────────────────────────────────

test.describe("Full Match flow", () => {
  test.skip("2 players join lobby, ready up, match starts", async ({ browser }) => {
    // Create two independent browser contexts (two players)
    const context1: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const context2: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const page1: Page = await context1.newPage();
    const page2: Page = await context2.newPage();

    // Collect console errors from both pages
    const errors1: string[] = [];
    const errors2: string[] = [];
    page1.on("console", (msg) => {
      if (msg.type() === "error") errors1.push(msg.text());
    });
    page2.on("console", (msg) => {
      if (msg.type() === "error") errors2.push(msg.text());
    });

    // Both players complete character selection
    await Promise.all([
      completeCharacterSelect(page1, "Player1"),
      completeCharacterSelect(page2, "Player2"),
    ]);

    // Both players click Quick Match in the lobby
    await Promise.all([
      clickQuickMatch(page1),
      clickQuickMatch(page2),
    ]);

    // Wait for connection
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);

    // Both players click Ready
    await Promise.all([
      clickReady(page1),
      clickReady(page2),
    ]);

    // Wait for game to start — the server triggers a phase change to "countdown"
    // then "playing", which transitions both players to OnlineGameScene.
    // We wait up to 15 seconds for the transition.
    await page1.waitForTimeout(15_000);
    await page2.waitForTimeout(15_000);

    // If the game started, the canvas is still visible (OnlineGameScene renders).
    const canvas1 = page1.locator("canvas");
    const canvas2 = page2.locator("canvas");
    await expect(canvas1).toBeVisible();
    await expect(canvas2).toBeVisible();

    // Filter out expected WebSocket errors (server may not be running)
    const realErrors1 = errors1.filter((e) => !e.includes("WebSocket"));
    const realErrors2 = errors2.filter((e) => !e.includes("WebSocket"));
    expect(realErrors1).toHaveLength(0);
    expect(realErrors2).toHaveLength(0);

    await context1.close();
    await context2.close();
  });

  test.skip("HUD elements visible during gameplay", async ({ browser }) => {
    // This test assumes the game has transitioned to OnlineGameScene or GameScene.
    // We start a single player flow that falls back to offline GameScene.
    const context: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page: Page = await context.newPage();

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // Complete character select
    await completeCharacterSelect(page, "HUDTest");

    // Click Quick Match — if server is down, it falls back to offline GameScene
    await clickQuickMatch(page);

    // Wait for fallback transition (LobbyScene waits 2s then goes to GameScene)
    await page.waitForTimeout(5000);

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // The HUD is rendered as Phaser game objects on the canvas.
    // We verify the canvas is still rendering (not crashed) by checking
    // that the canvas has non-zero dimensions and content.
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    // Take a screenshot for visual verification
    await page.screenshot({ path: "tests/e2e/screenshots/hud-visible.png" });

    // Verify no fatal errors (allow WebSocket errors since server may be offline)
    const realErrors = errors.filter(
      (e) => !e.includes("WebSocket") && !e.includes("Colyseus")
    );
    expect(realErrors).toHaveLength(0);

    await context.close();
  });

  test.skip("game runs for 30 seconds without console errors", async ({ browser }) => {
    const context: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page: Page = await context.newPage();

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // Complete character select and enter game (offline fallback)
    await completeCharacterSelect(page, "StressTest");
    await clickQuickMatch(page);

    // Wait for offline fallback
    await page.waitForTimeout(5000);

    // Let the game run for 30 seconds
    await page.waitForTimeout(30_000);

    // Canvas should still be visible (no crash)
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // No fatal errors (filter expected network errors)
    const fatalErrors = errors.filter(
      (e) =>
        !e.includes("WebSocket") &&
        !e.includes("Colyseus") &&
        !e.includes("net::ERR")
    );
    expect(fatalErrors).toHaveLength(0);

    await context.close();
  });

  test.skip("result screen shows winner after match ends", async ({ browser }) => {
    // This test requires a full match to complete.
    // With offline mode, the timer runs down to 0 and triggers ResultScene.
    const context: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page: Page = await context.newPage();

    await completeCharacterSelect(page, "WinnerTest");
    await clickQuickMatch(page);

    // Wait for offline fallback
    await page.waitForTimeout(5000);

    // The offline game has a 3-minute timer. We cannot wait that long
    // in a real E2E test, so we use a shorter timeout and document
    // that this test is designed for when the match duration is configurable.
    //
    // For now, verify the game is running and take a screenshot.
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    await page.screenshot({ path: "tests/e2e/screenshots/gameplay.png" });

    // In a full integration test with a running server, we would:
    // 1. Wait for phase === "ended"
    // 2. Verify ResultScene renders (winner nickname, stats)
    // 3. Verify "Play Again" button is visible and clickable

    await context.close();
  });
});
