/**
 * E2E tests — Full Match flow
 *
 * These are placeholder specs for Playwright. They require both a running
 * game server and a built client. We will fill in the actual browser
 * automation later.
 *
 * Run with:  npx playwright test client/tests/e2e/fullMatch.spec.ts
 */

import { test, expect } from "@playwright/test";

test.describe("Full Match flow", () => {
  test.skip("2 players join lobby, ready up, match starts", async ({ browser }) => {
    // TODO: Open two browser contexts (two players)
    // TODO: Both players go through character select
    // TODO: Both join the lobby room
    // TODO: Both click "Ready"
    // TODO: Verify countdown starts
    // TODO: Verify both are transferred to the game room
    // TODO: Verify the game phase transitions to "playing"
  });

  test.skip("one player eliminates the other", async ({ browser }) => {
    // TODO: Start a match with 2 players (from the flow above)
    // TODO: Player 1 shoots Player 2 repeatedly until wetMeter >= 100
    // TODO: Verify Player 2 is eliminated (isAlive = false)
    // TODO: Verify the game phase transitions to "ended"
  });

  test.skip("result screen shows winner", async ({ browser }) => {
    // TODO: After a match ends, verify the result/winner screen appears
    // TODO: Verify the winner's nickname is displayed
    // TODO: Verify "Play Again" or "Back to Lobby" button is visible
  });
});
