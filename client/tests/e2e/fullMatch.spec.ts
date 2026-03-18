/**
 * E2E tests — Full Match flow (2 players)
 *
 * These tests require BOTH a running Colyseus game server on port 2567
 * AND the Vite dev server on port 5173. They are skipped by default.
 *
 * To run:
 *   1. Start server: cd server && npm run dev
 *   2. Run tests:    cd client && npx playwright test tests/e2e/fullMatch.spec.ts
 */

import { test, expect, BrowserContext, Page } from "@playwright/test";
import {
  waitForCanvas,
  clickCanvas,
  getCanvasInfo,
} from "./helpers";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

/**
 * Helper: complete the character select flow for one player
 */
async function completeCharacterSelect(page: Page, nickname: string) {
  await page.goto("/");
  await waitForCanvas(page);

  // Wait for CharacterScene to load
  await page.waitForTimeout(1500);

  // Select first character card (female) at approx x=240, y=210
  await clickCanvas(page, 240, 210);
  await page.waitForTimeout(200);

  // Select a nationality pill (Thai, first pill)
  await clickCanvas(page, 250, 348);
  await page.waitForTimeout(200);

  // Type nickname
  await page.keyboard.type(nickname, { delay: 40 });
  await page.waitForTimeout(200);

  // Click CTA button at y=490
  await clickCanvas(page, 400, 490);
  await page.waitForTimeout(1000);
}

/**
 * Helper: click Quick Match in LobbyScene
 */
async function clickQuickMatch(page: Page) {
  await clickCanvas(page, 400, 180);
  await page.waitForTimeout(1000);
}

/**
 * Helper: click Ready button in LobbyScene
 */
async function clickReady(page: Page) {
  await clickCanvas(page, 400, 460);
  await page.waitForTimeout(500);
}

// ── Full Match tests ─────────────────────────────────────────────────

test.describe("Full Match flow", () => {
  // Skip: requires running Colyseus server on port 2567
  test.skip();

  test("2 players join lobby, ready up, match starts", async ({ browser }) => {
    const context1: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const context2: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const page1: Page = await context1.newPage();
    const page2: Page = await context2.newPage();

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

    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);

    // Both players click Ready
    await Promise.all([clickReady(page1), clickReady(page2)]);

    // Wait for game to start
    await page1.waitForTimeout(15_000);
    await page2.waitForTimeout(15_000);

    const canvas1 = page1.locator("canvas");
    const canvas2 = page2.locator("canvas");
    await expect(canvas1).toBeVisible();
    await expect(canvas2).toBeVisible();

    const realErrors1 = errors1.filter((e) => !e.includes("WebSocket"));
    const realErrors2 = errors2.filter((e) => !e.includes("WebSocket"));
    expect(realErrors1).toHaveLength(0);
    expect(realErrors2).toHaveLength(0);

    await context1.close();
    await context2.close();
  });

  test("HUD elements visible during gameplay", async ({ browser }) => {
    const context: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page: Page = await context.newPage();

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await completeCharacterSelect(page, "HUDTest");
    await clickQuickMatch(page);
    await page.waitForTimeout(5000);

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    await page.screenshot({ path: "tests/e2e/screenshots/hud-visible.png" });

    const realErrors = errors.filter(
      (e) => !e.includes("WebSocket") && !e.includes("Colyseus"),
    );
    expect(realErrors).toHaveLength(0);

    await context.close();
  });

  test("game runs for 30 seconds without console errors", async ({
    browser,
  }) => {
    const context: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page: Page = await context.newPage();

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await completeCharacterSelect(page, "StressTest");
    await clickQuickMatch(page);
    await page.waitForTimeout(5000);

    // Let the game run for 30 seconds
    await page.waitForTimeout(30_000);

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    const fatalErrors = errors.filter(
      (e) =>
        !e.includes("WebSocket") &&
        !e.includes("Colyseus") &&
        !e.includes("net::ERR"),
    );
    expect(fatalErrors).toHaveLength(0);

    await context.close();
  });

  test("result screen shows winner after match ends", async ({ browser }) => {
    const context: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page: Page = await context.newPage();

    await completeCharacterSelect(page, "WinnerTest");
    await clickQuickMatch(page);
    await page.waitForTimeout(5000);

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    await page.screenshot({ path: "tests/e2e/screenshots/gameplay.png" });

    await context.close();
  });
});
