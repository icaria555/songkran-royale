/**
 * E2E tests — Character Selection screen
 *
 * These are placeholder specs for Playwright. The actual browser automation
 * will be filled in once a running server + client build is available.
 *
 * Run with:  npx playwright test client/tests/e2e/characterSelect.spec.ts
 */

import { test, expect } from "@playwright/test";

test.describe("Character Select screen", () => {
  test.skip("select each of 3 characters", async ({ page }) => {
    // TODO: Navigate to character select screen
    // TODO: Click each character option and verify selection highlight
  });

  test.skip("pick a nationality", async ({ page }) => {
    // TODO: Open nationality picker
    // TODO: Select a nationality flag
    // TODO: Verify the selected flag is displayed
  });

  test.skip("enter nickname", async ({ page }) => {
    // TODO: Focus the nickname input field
    // TODO: Type a nickname
    // TODO: Verify the input value
  });

  test.skip("click CTA to proceed to lobby", async ({ page }) => {
    // TODO: Fill in all required fields (character, nationality, nickname)
    // TODO: Click the "Play" / "Enter" CTA button
    // TODO: Verify navigation to the lobby screen
  });
});
