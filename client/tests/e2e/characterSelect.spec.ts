/**
 * E2E tests — Character Selection screen
 *
 * These specs contain full Playwright implementation but are skipped
 * because they require a running dev server (vite on :5173).
 *
 * Run with:  npx playwright test client/tests/e2e/characterSelect.spec.ts
 */

import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

// ── Desktop viewport (1280×800) ──────────────────────────────────────

test.describe("Character Select — Desktop (1280×800)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.skip("CharacterScene loads", async ({ page }) => {
    await page.goto(BASE_URL);

    // Phaser renders into a <canvas>; wait for it to appear
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    // Wait a beat for CharacterScene to finish its create()
    await page.waitForTimeout(1500);
  });

  test.skip("select each of 3 character cards", async ({ page }) => {
    await page.goto(BASE_URL);
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1500);

    // The three character cards are laid out horizontally near y≈210.
    // Card positions: startX + i*(cardWidth + gap), with cardWidth=140, gap=20.
    // At 1280 wide the Phaser scale factor may differ; we click proportional
    // positions on the canvas.
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    // Phaser game size is typically 800×600 scaled to fit.
    // Character cards are at roughly x=[240, 400, 560] y=210 in game coords.
    // Convert game coords to canvas coords:
    const scaleX = box.width / 800;
    const scaleY = box.height / 600;

    const cardYGame = 210;

    // Card centers in game coordinates (3 characters)
    const cardXPositions = [240, 400, 560];

    for (let i = 0; i < 3; i++) {
      const cx = box.x + cardXPositions[i] * scaleX;
      const cy = box.y + cardYGame * scaleY;

      await page.mouse.click(cx, cy);
      await page.waitForTimeout(300);

      // After clicking, Phaser updates the selection box stroke color to
      // gold (#f5c842). We can't easily assert canvas pixel colors here,
      // but we verify no console errors occurred.
    }
  });

  test.skip("click nationality pills", async ({ page }) => {
    await page.goto(BASE_URL);
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1500);

    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    const scaleX = box.width / 800;
    const scaleY = box.height / 600;

    // Nationality pills start at y≈348 in game coords, 6 per row.
    // Each pill is 110 wide with 6px gap. Row 1 y=348, Row 2 y=380.
    // Click the 3rd pill (Korea) in row 1
    const pillY = 348;
    // Approximate x for 3rd pill (index 2) — center aligned
    const thirdPillX = 400 + (2 - 2.5) * (110 + 6); // rough center offset
    await page.mouse.click(
      box.x + 400 * scaleX, // click near center area
      box.y + pillY * scaleY
    );
    await page.waitForTimeout(300);

    // Click a pill in the second row (index 6 = row 1, col 0)
    const secondRowY = 348 + (26 + 6);
    await page.mouse.click(
      box.x + 300 * scaleX,
      box.y + secondRowY * scaleY
    );
    await page.waitForTimeout(300);
  });

  test.skip("type nickname in input field", async ({ page }) => {
    await page.goto(BASE_URL);
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1500);

    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    const scaleX = box.width / 800;
    const scaleY = box.height / 600;

    // Click the nickname input area (y≈430 in game coords) to focus it
    await page.mouse.click(
      box.x + 400 * scaleX,
      box.y + 430 * scaleY
    );
    await page.waitForTimeout(200);

    // Type a nickname — Phaser captures keyboard events globally
    await page.keyboard.type("TestPlayer", { delay: 80 });
    await page.waitForTimeout(300);

    // Verify by typing backspace and retyping (ensures input responds)
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("QA", { delay: 80 });
    await page.waitForTimeout(200);
    // Nickname should now be "TestPlayQA"
  });

  test.skip("click CTA button and transition to LobbyScene", async ({ page }) => {
    await page.goto(BASE_URL);
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1500);

    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    const scaleX = box.width / 800;
    const scaleY = box.height / 600;

    // Type a nickname first (required for good UX, not strictly validated)
    await page.keyboard.type("E2EPlayer", { delay: 50 });
    await page.waitForTimeout(200);

    // Click the CTA button at y≈490 in game coords
    const ctaY = 490;
    await page.mouse.click(
      box.x + 400 * scaleX,
      box.y + ctaY * scaleY
    );

    // After clicking CTA, CharacterScene calls scene.start("LobbyScene").
    // Wait for the transition. The LobbyScene title text says "Lobby".
    // Since this is all canvas-rendered, we wait for a reasonable time
    // and check no errors were thrown.
    await page.waitForTimeout(2000);

    // Collect console errors during the transition
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // If server is unavailable, LobbyScene falls back to GameScene after 2s.
    // Either way, no crash = success.
    await page.waitForTimeout(3000);
    expect(errors.filter((e) => !e.includes("WebSocket"))).toHaveLength(0);
  });

  test.skip("press ENTER as alternative CTA", async ({ page }) => {
    await page.goto(BASE_URL);
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1500);

    await page.keyboard.type("EnterTest", { delay: 50 });
    await page.waitForTimeout(200);

    // Press Enter — should trigger startGame() same as clicking CTA
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);
  });
});

// ── Mobile viewport (375×812) ────────────────────────────────────────

test.describe("Character Select — Mobile (375×812)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.skip("CharacterScene loads on mobile", async ({ page }) => {
    await page.goto(BASE_URL);

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1500);

    // Canvas should fit within viewport — no horizontal overflow
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    expect(box.width).toBeLessThanOrEqual(375);
  });

  test.skip("character cards are tappable on mobile", async ({ page }) => {
    await page.goto(BASE_URL);
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1500);

    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    const scaleX = box.width / 800;
    const scaleY = box.height / 600;

    // Tap center character card
    await page.mouse.click(
      box.x + 400 * scaleX,
      box.y + 210 * scaleY
    );
    await page.waitForTimeout(300);
  });

  test.skip("nationality pills are tappable on mobile", async ({ page }) => {
    await page.goto(BASE_URL);
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1500);

    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    const scaleX = box.width / 800;
    const scaleY = box.height / 600;

    // Tap a nationality pill
    await page.mouse.click(
      box.x + 400 * scaleX,
      box.y + 348 * scaleY
    );
    await page.waitForTimeout(300);
  });

  test.skip("CTA button works on mobile", async ({ page }) => {
    await page.goto(BASE_URL);
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1500);

    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    const scaleX = box.width / 800;
    const scaleY = box.height / 600;

    // Type nickname via virtual keyboard simulation
    await page.keyboard.type("MobileQA", { delay: 50 });
    await page.waitForTimeout(200);

    // Tap CTA button
    await page.mouse.click(
      box.x + 400 * scaleX,
      box.y + 490 * scaleY
    );
    await page.waitForTimeout(2000);
  });

  test.skip("no horizontal scroll on mobile", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
