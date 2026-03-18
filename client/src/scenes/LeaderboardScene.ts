import Phaser from "phaser";
import { soundManager } from "../audio/SoundManager";

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/^ws/, "http") ||
  "http://localhost:2567";

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  character: string;
  nationality: string;
  wins: number;
  games: number;
  kills: number;
  winRate: number;
}

export class LeaderboardScene extends Phaser.Scene {
  private scrollY = 0;
  private maxScroll = 0;
  private tableContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: "LeaderboardScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.cameras.main.setBackgroundColor(0x0a2540);

    // Title
    this.add
      .text(cx, 36, "\u{1F3C6} Leaderboard", {
        fontSize: "28px",
        color: "#f5c842",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 64, "Top 50 Water Warriors", {
        fontSize: "12px",
        color: "#7db8e8",
        fontFamily: "Sarabun, sans-serif",
      })
      .setOrigin(0.5);

    // Back button (top-left)
    const backBtn = this.add
      .text(20, 20, "\u2190 Back", {
        fontSize: "14px",
        color: "#3ab5f5",
        fontFamily: "Kanit, sans-serif",
      })
      .setInteractive({ useHandCursor: true });

    backBtn.on("pointerdown", () => {
      soundManager.play("button_click");
      this.scene.start("CharacterScene");
    });
    backBtn.on("pointerover", () => backBtn.setColor("#f5c842"));
    backBtn.on("pointerout", () => backBtn.setColor("#3ab5f5"));

    // Loading text
    const loadingText = this.add
      .text(cx, height / 2, "Loading...", {
        fontSize: "16px",
        color: "#7db8e8",
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);

    this.fetchLeaderboard(loadingText, cx, width, height);

    // Keyboard: ESC to go back
    this.input.keyboard!.on("keydown-ESC", () => {
      this.scene.start("CharacterScene");
    });
  }

  private async fetchLeaderboard(
    loadingText: Phaser.GameObjects.Text,
    cx: number,
    width: number,
    height: number
  ): Promise<void> {
    try {
      const res = await fetch(`${SERVER_URL}/api/leaderboard`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LeaderboardEntry[] = await res.json();
      loadingText.destroy();
      this.buildTable(data, cx, width, height);
    } catch (err) {
      loadingText.setText("Could not load leaderboard.\nCheck your connection and try again.");
      loadingText.setColor("#ff6666");
      loadingText.setAlign("center");
      console.warn("Leaderboard fetch error:", err);

      // Retry button
      const retryBtn = this.add
        .text(cx, height / 2 + 50, "Retry", {
          fontSize: "14px",
          color: "#3ab5f5",
          fontFamily: "Kanit, sans-serif",
          backgroundColor: "#ffffff10",
          padding: { x: 16, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      retryBtn.on("pointerdown", () => {
        loadingText.setText("Loading...").setColor("#7db8e8");
        retryBtn.destroy();
        this.fetchLeaderboard(loadingText, cx, width, height);
      });
    }
  }

  private buildTable(
    entries: LeaderboardEntry[],
    cx: number,
    width: number,
    height: number
  ): void {
    const headerY = 90;
    const rowHeight = 28;
    const tableTop = headerY + 30;
    const cols = {
      rank: 50,
      name: 150,
      char: 260,
      flag: 310,
      wins: 390,
      games: 450,
      kills: 520,
      winRate: 610,
    };

    // Header row
    const headerStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: "11px",
      color: "#7db8e8",
      fontFamily: "Kanit, sans-serif",
      fontStyle: "bold",
    };

    this.add.text(cols.rank, headerY, "#", headerStyle);
    this.add.text(cols.name, headerY, "Nickname", headerStyle);
    this.add.text(cols.char, headerY, "Char", headerStyle);
    this.add.text(cols.flag, headerY, "Nation", headerStyle);
    this.add.text(cols.wins, headerY, "Wins", headerStyle);
    this.add.text(cols.games, headerY, "Games", headerStyle);
    this.add.text(cols.kills, headerY, "Kills", headerStyle);
    this.add.text(cols.winRate, headerY, "Win%", headerStyle);

    // Separator line
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x7db8e8, 0.3);
    gfx.lineBetween(30, headerY + 18, width - 30, headerY + 18);

    // Scrollable container for rows
    this.tableContainer = this.add.container(0, 0);

    entries.forEach((entry, i) => {
      const y = tableTop + i * rowHeight;

      // Alternating row background
      const isTop3 = i < 3;
      const bgColor = isTop3 ? 0xf5c842 : i % 2 === 0 ? 0xffffff : 0x000000;
      const bgAlpha = isTop3 ? 0.08 : 0.03;
      const rowBg = this.add
        .rectangle(cx, y + rowHeight / 2, width - 40, rowHeight - 2, bgColor, bgAlpha)
        .setOrigin(0.5);
      this.tableContainer.add(rowBg);

      // Rank color: gold/silver/bronze for top 3
      const rankColors = ["#f5c842", "#c0c0c0", "#cd7f32"];
      const rankColor = i < 3 ? rankColors[i] : "#e8f4ff";
      const rankText = this.add.text(cols.rank, y + 4, `${entry.rank}`, {
        fontSize: "12px",
        color: rankColor,
        fontFamily: "Kanit, sans-serif",
        fontStyle: i < 3 ? "bold" : "normal",
      });
      this.tableContainer.add(rankText);

      const nameColor = i < 3 ? "#f5c842" : "#e8f4ff";
      const nameText = this.add.text(cols.name, y + 4, entry.nickname, {
        fontSize: "12px",
        color: nameColor,
        fontFamily: "Kanit, sans-serif",
      });
      this.tableContainer.add(nameText);

      // Character icon (use existing sprite texture)
      const charKey = entry.character || "male";
      const validKeys = ["female", "male", "lgbtq"];
      const texKey = `char_${validKeys.includes(charKey) ? charKey : "male"}`;
      if (this.textures.exists(texKey)) {
        const icon = this.add.sprite(cols.char + 10, y + rowHeight / 2, texKey).setScale(1.5);
        this.tableContainer.add(icon);
      }

      const flagText = this.add.text(cols.flag, y + 4, entry.nationality || "\u{1F3F3}", {
        fontSize: "12px",
        fontFamily: "Kanit, sans-serif",
      });
      this.tableContainer.add(flagText);

      const cellStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontSize: "12px",
        color: "#e8f4ff",
        fontFamily: "Sarabun, sans-serif",
      };

      const winsText = this.add.text(cols.wins, y + 4, `${entry.wins}`, cellStyle);
      this.tableContainer.add(winsText);

      const gamesText = this.add.text(cols.games, y + 4, `${entry.games}`, cellStyle);
      this.tableContainer.add(gamesText);

      const killsText = this.add.text(cols.kills, y + 4, `${entry.kills}`, cellStyle);
      this.tableContainer.add(killsText);

      const wr = entry.winRate != null ? `${Math.round(entry.winRate)}%` : "—";
      const wrText = this.add.text(cols.winRate, y + 4, wr, cellStyle);
      this.tableContainer.add(wrText);
    });

    // Calculate max scroll
    const totalTableHeight = entries.length * rowHeight;
    const visibleHeight = height - tableTop - 20;
    this.maxScroll = Math.max(0, totalTableHeight - visibleHeight);

    // Mouse wheel scrolling
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gos: unknown[], _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScroll);
      this.tableContainer.y = -this.scrollY;
    });

    // Mask the table area so rows don't bleed above header
    const maskShape = this.make.graphics({}, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, tableTop, width, height - tableTop);
    const mask = maskShape.createGeometryMask();
    this.tableContainer.setMask(mask);
  }
}
