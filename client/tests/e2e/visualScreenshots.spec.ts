/**
 * Visual Screenshot QA — Captures every reachable scene at desktop + mobile
 *
 * PURPOSE: These screenshots are saved so the agent (or a human) can review
 * every screen's visual state and identify UI issues for the next polish pass.
 *
 * Screenshots are saved to:
 *   client/test-results/screenshots/
 *
 * Run with:  npx playwright test tests/e2e/visualScreenshots.spec.ts
 */

import { test, expect } from "@playwright/test";
import {
  waitForCanvas,
  clickCanvas,
  waitForPhaserScene,
  getPhaserSceneKey,
} from "./helpers";

const SCREENSHOT_DIR = "test-results/screenshots";

// ── Helper: take a named screenshot ──────────────────────────────────

async function screenshot(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: true,
  });
}

// ── Boot → CharacterScene ────────────────────────────────────────────

test.describe("Visual QA — Scene Screenshots", () => {
  test("01 — BootScene loading screen", async ({ page }) => {
    await page.goto("/");
    // Capture immediately during boot/loading (before scene transitions)
    await page.waitForTimeout(500);
    await screenshot(page, "01-boot-loading");
  });

  test("02 — CharacterScene default state", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(500); // let animations settle
    await screenshot(page, "02-character-select-default");
  });

  test("03 — CharacterScene with female selected", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(300);
    // Click female character card (left card, roughly x=240, y=200)
    await clickCanvas(page, 240, 200);
    await page.waitForTimeout(300);
    await screenshot(page, "03-character-female-selected");
  });

  test("04 — CharacterScene with male selected", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(300);
    // Click male character card (center card, roughly x=400, y=200)
    await clickCanvas(page, 400, 200);
    await page.waitForTimeout(300);
    await screenshot(page, "04-character-male-selected");
  });

  test("05 — CharacterScene with LGBTQ+ selected", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(300);
    // Click LGBTQ+ character card (right card, roughly x=560, y=200)
    await clickCanvas(page, 560, 200);
    await page.waitForTimeout(300);
    await screenshot(page, "05-character-lgbtq-selected");
  });

  test("06 — CharacterScene nationality picker", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(300);
    // Click a nationality pill (row below characters, e.g. Japan flag)
    await clickCanvas(page, 300, 320);
    await page.waitForTimeout(300);
    await screenshot(page, "06-character-nationality-picked");
  });

  test("07 — CharacterScene skin selector area", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(300);
    // Scroll down or just capture full — skins should be visible below characters
    await screenshot(page, "07-character-skin-selector");
  });

  test("08 — LobbyScene (after clicking start)", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(500);

    // Type a nickname first (click nickname input area ~y=480)
    await clickCanvas(page, 400, 480);
    await page.waitForTimeout(200);
    await page.keyboard.type("TestPlayer");
    await page.waitForTimeout(200);

    // Click the CTA / Start button (~y=530)
    await clickCanvas(page, 400, 540);
    await page.waitForTimeout(1000);

    const scene = await getPhaserSceneKey(page);
    await screenshot(page, `08-lobby-or-next-scene-${scene}`);
  });

  test("09 — GameScene offline (if fallback triggers)", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(500);

    // Click nickname input and type
    await clickCanvas(page, 400, 480);
    await page.waitForTimeout(200);
    await page.keyboard.type("OfflineTest");
    await page.waitForTimeout(200);

    // Click start
    await clickCanvas(page, 400, 540);
    await page.waitForTimeout(2000); // wait for server connection attempt + fallback

    const scene = await getPhaserSceneKey(page);
    await screenshot(page, `09-game-scene-${scene}`);

    // If we made it to GameScene, take additional gameplay screenshots
    if (scene === "GameScene") {
      await page.waitForTimeout(1000);
      await screenshot(page, "09b-game-scene-after-1s");

      // Try moving (WASD)
      await page.keyboard.down("w");
      await page.waitForTimeout(500);
      await page.keyboard.up("w");
      await page.keyboard.down("d");
      await page.waitForTimeout(500);
      await page.keyboard.up("d");
      await screenshot(page, "09c-game-scene-after-movement");

      // Try shooting
      const canvas = page.locator("canvas");
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2 + 100, box.y + box.height / 2);
        await page.waitForTimeout(300);
        await screenshot(page, "09d-game-scene-after-shoot");
      }
    }
  });

  test("10 — LeaderboardScene", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(500);

    // Click the trophy/leaderboard button (top-right area)
    await clickCanvas(page, 740, 30);
    await page.waitForTimeout(1000);

    const scene = await getPhaserSceneKey(page);
    await screenshot(page, `10-leaderboard-${scene}`);
  });

  test("11 — BattlePassScene", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(500);

    // Click the battle pass button (top-right area, next to trophy)
    await clickCanvas(page, 700, 30);
    await page.waitForTimeout(1000);

    const scene = await getPhaserSceneKey(page);
    await screenshot(page, `11-battlepass-${scene}`);
  });
});

// ── Mobile-specific captures ─────────────────────────────────────────

test.describe("Visual QA — Mobile (375x812)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("12 — CharacterScene mobile layout", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(500);
    await screenshot(page, "12-mobile-character-select");
  });

  test("13 — CharacterScene mobile with selection", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(300);
    await clickCanvas(page, 200, 200); // click a character
    await page.waitForTimeout(300);
    await screenshot(page, "13-mobile-character-selected");
  });

  test("14 — GameScene mobile (offline fallback)", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(500);

    await clickCanvas(page, 200, 480);
    await page.waitForTimeout(200);
    await page.keyboard.type("MobileTest");
    await page.waitForTimeout(200);
    await clickCanvas(page, 200, 540);
    await page.waitForTimeout(2000);

    const scene = await getPhaserSceneKey(page);
    await screenshot(page, `14-mobile-game-${scene}`);

    if (scene === "GameScene") {
      await page.waitForTimeout(1000);
      await screenshot(page, "14b-mobile-game-gameplay");
    }
  });

  test("15 — Mobile leaderboard", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(500);
    await clickCanvas(page, 370, 30);
    await page.waitForTimeout(1000);
    const scene = await getPhaserSceneKey(page);
    await screenshot(page, `15-mobile-leaderboard-${scene}`);
  });

  test("16 — Mobile battle pass", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await waitForPhaserScene(page, "CharacterScene");
    await page.waitForTimeout(500);
    await clickCanvas(page, 350, 30);
    await page.waitForTimeout(1000);
    const scene = await getPhaserSceneKey(page);
    await screenshot(page, `16-mobile-battlepass-${scene}`);
  });
});
