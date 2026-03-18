import Phaser from "phaser";
import { gameConfig } from "./config/gameConfig";

const game = new Phaser.Game(gameConfig);

// Expose game instance for E2E testing (dev mode only)
if (import.meta.env.DEV) {
  (window as any).__PHASER_GAME__ = game;
}
