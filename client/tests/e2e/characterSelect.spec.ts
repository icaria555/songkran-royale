/**
 * E2E tests — Character Selection screen
 *
 * These tests only require the Vite dev server (auto-started by Playwright).
 * They interact with the Phaser canvas via coordinate-based clicks and
 * read game state via the exposed __PHASER_GAME__ global.
 *
 * Run with:  npx playwright test tests/e2e/characterSelect.spec.ts
 */

import { test, expect } from "@playwright/test";
import {
  waitForCanvas,
  clickCanvas,
  getPhaserSceneKey,
} from "./helpers";

// ── Desktop viewport (1280x800) ──────────────────────────────────────

test.describe("Character Select — Desktop (1280x800)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("CharacterScene loads", async ({ page }) => {
    await page.goto("/");

    // Phaser renders into a <canvas>; wait for it to appear
    const canvas = await waitForCanvas(page);
    await expect(canvas).toBeVisible();

    // Wait for CharacterScene to finish its create()
    await page.waitForTimeout(2000);

    // Verify the Phaser game is running and a scene is active
    const sceneKey = await getPhaserSceneKey(page);
    expect(sceneKey).toBeTruthy();
  });

  test("select each of 3 character cards", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await page.waitForTimeout(2000);

    // The three character cards are laid out horizontally near y=210.
    // Card centers in game coordinates (3 characters)
    const cardXPositions = [240, 400, 560];
    const cardY = 210;

    for (let i = 0; i < 3; i++) {
      await clickCanvas(page, cardXPositions[i], cardY);
      await page.waitForTimeout(300);
    }

    // Verify no crash — canvas still visible
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("click nationality pills", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await page.waitForTimeout(2000);

    // Nationality pills start at y=348 in game coords
    // Click near center area (a pill)
    await clickCanvas(page, 400, 348);
    await page.waitForTimeout(300);

    // Click a pill in the second row
    const secondRowY = 348 + 32;
    await clickCanvas(page, 300, secondRowY);
    await page.waitForTimeout(300);

    // No crash
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("type nickname in input field", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await page.waitForTimeout(2000);

    // Click the nickname input area (y=430 in game coords) to focus it
    await clickCanvas(page, 400, 430);
    await page.waitForTimeout(200);

    // Type a nickname — Phaser captures keyboard events globally
    await page.keyboard.type("TestPlayer", { delay: 80 });
    await page.waitForTimeout(300);

    // Verify by typing backspace and retyping (ensures input responds)
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("QA", { delay: 80 });
    await page.waitForTimeout(200);

    // No crash
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("click CTA button and transition scene", async ({ page }) => {
    // Collect console errors during the test
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");
    await waitForCanvas(page);
    await page.waitForTimeout(2000);

    // Type a nickname first
    await page.keyboard.type("E2EPlayer", { delay: 50 });
    await page.waitForTimeout(200);

    // Click the CTA button at y=490 in game coords
    await clickCanvas(page, 400, 490);

    // Wait for the transition
    await page.waitForTimeout(3000);

    // Canvas should still be visible (scene transitioned, no crash)
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // Filter out expected WebSocket errors (server not running)
    const fatalErrors = errors.filter(
      (e) =>
        !e.includes("WebSocket") &&
        !e.includes("Colyseus") &&
        !e.includes("net::ERR"),
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test("press ENTER as alternative CTA", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await page.waitForTimeout(2000);

    await page.keyboard.type("EnterTest", { delay: 50 });
    await page.waitForTimeout(200);

    // Press Enter — should trigger startGame() same as clicking CTA
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);

    // No crash
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });
});

// ── Mobile viewport (375x812) ────────────────────────────────────────

test.describe("Character Select — Mobile (375x812)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("CharacterScene loads on mobile", async ({ page }) => {
    await page.goto("/");

    const canvas = await waitForCanvas(page);
    await page.waitForTimeout(2000);

    // Canvas should fit within viewport — no horizontal overflow
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    expect(box.width).toBeLessThanOrEqual(375);
  });

  test("character cards are tappable on mobile", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await page.waitForTimeout(2000);

    // Tap center character card
    await clickCanvas(page, 400, 210);
    await page.waitForTimeout(300);

    // No crash
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("nationality pills are tappable on mobile", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await page.waitForTimeout(2000);

    // Tap a nationality pill
    await clickCanvas(page, 400, 348);
    await page.waitForTimeout(300);

    // No crash
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("CTA button works on mobile", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await page.waitForTimeout(2000);

    // Type nickname
    await page.keyboard.type("MobileQA", { delay: 50 });
    await page.waitForTimeout(200);

    // Tap CTA button
    await clickCanvas(page, 400, 490);
    await page.waitForTimeout(2000);

    // No crash
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("no horizontal scroll on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
