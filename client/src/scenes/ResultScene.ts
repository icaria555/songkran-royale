import Phaser from "phaser";
import { soundManager } from "../audio/SoundManager";
import { ResultCard, ResultCardConfig } from "../ui/ResultCard";
import { matchStats } from "../game/MatchStats";
import { MATCH_DURATION } from "../game/GameLogic";
import { addXP, calculateMatchXP, getProgress, getCurrentTier } from "../progression/BattlePass";

export interface ResultData {
  winner: string;
  playerName: string;
  playerChar: string;
  playerNat: string;
  playerWet: number;
  playerScore: number;
  aiWet: number;
  timeLeft: number;
  /** Optional fields passed from online mode */
  roomCode?: string;
  playerCount?: number;
  /** All players for the bar chart — falls back to 2-player layout */
  allPlayers?: { name: string; wet: number; character: string }[];
  mapId?: string;
}

export class ResultScene extends Phaser.Scene {
  private result!: ResultData;

  constructor() {
    super({ key: "ResultScene" });
  }

  init(data: ResultData): void {
    this.result = data;
  }

  create(): void {
    const isWinner = this.result.winner === this.result.playerName;

    // Play victory or defeat sound
    soundManager.play(isWinner ? "victory" : "defeat");

    // Play result music track
    soundManager.playMusic(isWinner ? "result_win" : "result_lose");

    // Finalize match stats
    matchStats.setFinalWetMeter(this.result.playerWet);
    const stats = matchStats.getStats();

    // Build allPlayers list (fall back to 2 players for offline mode)
    const allPlayers = this.result.allPlayers ?? [
      {
        name: this.result.playerName,
        wet: this.result.playerWet,
        character: this.result.playerChar,
      },
      {
        name: "Bot",
        wet: this.result.aiWet,
        character: "ai",
      },
    ];

    // Sort by wet meter ascending (driest = best rank)
    const sorted = [...allPlayers].sort((a, b) => a.wet - b.wet);
    const rank =
      sorted.findIndex((p) => p.name === this.result.playerName) + 1 || allPlayers.length;

    const config: ResultCardConfig = {
      isWinner,
      winnerName: this.result.winner,
      playerName: this.result.playerName,
      playerChar: this.result.playerChar,
      playerNat: this.result.playerNat,
      playerWet: this.result.playerWet,
      aiWet: this.result.aiWet,
      timeLeft: this.result.timeLeft,
      matchDuration: MATCH_DURATION,
      playerCount: this.result.playerCount ?? allPlayers.length,
      roomCode: this.result.roomCode ?? "",
      rank,
      allPlayers: sorted,
      stats,
    };

    const card = new ResultCard(this, config);
    card.draw();

    // ── Battle Pass XP award ─────────────────────────────
    const xpResult = calculateMatchXP({
      won: isWinner,
      kills: stats.eliminations,
      timeSurvivedSec: stats.timeSurvived,
    });

    const prevTier = getCurrentTier();
    addXP(xpResult.total);
    const newTier = getCurrentTier();
    const progress = getProgress();

    // XP gained popup (bottom area)
    const { width, height } = this.scale;
    const popupY = height - 90;

    const xpBg = this.add
      .rectangle(width / 2, popupY, 260, 60, 0xffffff, 0.08)
      .setStrokeStyle(1, 0xf5c842, 0.5);

    this.add
      .text(width / 2, popupY - 18, `+${xpResult.total} XP`, {
        fontSize: "18px",
        color: "#f5c842",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const breakdownStr = xpResult.breakdown.map((b) => `${b.label}: +${b.xp}`).join("  ");
    this.add
      .text(width / 2, popupY + 4, breakdownStr, {
        fontSize: "9px",
        color: "#7db8e8",
        fontFamily: "Sarabun, sans-serif",
        align: "center",
      })
      .setOrigin(0.5);

    // Tier info
    const tierStr =
      newTier > prevTier
        ? `Tier ${prevTier} -> ${newTier}  LEVEL UP!`
        : `Tier ${newTier} — ${progress.xp}/${progress.xpToNext} XP`;
    this.add
      .text(width / 2, popupY + 20, tierStr, {
        fontSize: "10px",
        color: newTier > prevTier ? "#f5c842" : "#7db8e8",
        fontFamily: "Kanit, sans-serif",
        fontStyle: newTier > prevTier ? "bold" : "normal",
      })
      .setOrigin(0.5);

    // Keyboard shortcut: ENTER = Play Again
    this.input.keyboard!.on("keydown-ENTER", () => {
      this.scene.start("CharacterScene");
    });
  }
}
