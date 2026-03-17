import Phaser from "phaser";

interface ResultData {
  winner: string;
  playerName: string;
  playerChar: string;
  playerNat: string;
  playerWet: number;
  playerScore: number;
  aiWet: number;
  timeLeft: number;
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
    const { width, height } = this.scale;
    const cx = width / 2;
    const isWinner = this.result.winner === this.result.playerName;

    this.cameras.main.setBackgroundColor(0x0a2540);

    // Title
    this.add
      .text(cx, 60, isWinner ? "🏆 จ้าวแห่งสงกรานต์!" : "💧 เปียกหมดแล้ว...", {
        fontSize: "28px",
        color: isWinner ? "#f5c842" : "#ff6b6b",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 95, isWinner ? "You are the Songkran Champion!" : "Better luck next time!", {
        fontSize: "13px",
        color: "#7db8e8",
        fontFamily: "Sarabun, sans-serif",
      })
      .setOrigin(0.5);

    // Winner character
    this.add
      .sprite(cx, 170, `char_${this.result.playerChar}`)
      .setScale(6);

    // Stats card
    const cardX = cx;
    const cardY = 300;

    this.add
      .rectangle(cardX, cardY, 300, 180, 0xffffff, 0.06)
      .setStrokeStyle(1, 0xffffff, 0.12);

    const stats = [
      { label: "Winner", value: this.result.winner },
      { label: "Player", value: `${this.result.playerNat} ${this.result.playerName}` },
      { label: "Your Wet Meter", value: `${Math.round(this.result.playerWet)}%` },
      { label: "Enemy Wet Meter", value: `${Math.round(this.result.aiWet)}%` },
      {
        label: "Time",
        value: `${Math.floor((180 - this.result.timeLeft) / 60)}:${((180 - this.result.timeLeft) % 60).toString().padStart(2, "0")}`,
      },
    ];

    stats.forEach((stat, i) => {
      const y = cardY - 70 + i * 30;
      this.add
        .text(cardX - 120, y, stat.label, {
          fontSize: "12px",
          color: "#7db8e8",
          fontFamily: "Sarabun, sans-serif",
        })
        .setOrigin(0, 0.5);

      this.add
        .text(cardX + 120, y, stat.value, {
          fontSize: "13px",
          color: "#e8f4ff",
          fontFamily: "Kanit, sans-serif",
          fontStyle: "bold",
        })
        .setOrigin(1, 0.5);
    });

    // Buttons
    const playAgainBtn = this.add
      .rectangle(cx - 80, 440, 140, 40, 0xf5c842, 1)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(cx - 80, 440, "🔄 Play Again", {
        fontSize: "14px",
        color: "#1a0e00",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    playAgainBtn.on("pointerdown", () => {
      this.scene.start("CharacterScene");
    });

    const mainMenuBtn = this.add
      .rectangle(cx + 80, 440, 140, 40, 0xffffff, 0.1)
      .setStrokeStyle(1, 0xffffff, 0.2)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(cx + 80, 440, "🏠 Main Menu", {
        fontSize: "14px",
        color: "#e8f4ff",
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);

    mainMenuBtn.on("pointerdown", () => {
      this.scene.start("CharacterScene");
    });

    // Keyboard
    this.input.keyboard!.on("keydown-ENTER", () => {
      this.scene.start("CharacterScene");
    });

    // Songkran Royale branding
    this.add
      .text(cx, height - 30, "🌊 Songkran Royale 2569", {
        fontSize: "10px",
        color: "#7db8e8",
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);
  }
}
