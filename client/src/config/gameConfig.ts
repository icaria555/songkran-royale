import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { CharacterScene } from "../scenes/CharacterScene";
import { LobbyScene } from "../scenes/LobbyScene";
import { GameScene } from "../scenes/GameScene";
import { OnlineGameScene } from "../scenes/OnlineGameScene";
import { ResultScene } from "../scenes/ResultScene";

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "app",
  backgroundColor: "#0a2540",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    touch: {
      capture: true,
    },
  },
  dom: {
    createContainer: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, CharacterScene, LobbyScene, GameScene, OnlineGameScene, ResultScene],
};
