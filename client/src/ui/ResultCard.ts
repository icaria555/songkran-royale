/**
 * ResultCard — Draws the shareable post-match trophy card as a Phaser overlay.
 *
 * Features:
 * - Dark gradient background with water ripple effect
 * - Winner character with golden glow
 * - Stats panel with animated bar charts
 * - Rank badges (gold / silver / bronze)
 * - Share / Copy Link / Play Again / Main Menu buttons
 * - generateShareImage() via renderer.snapshot()
 * - triggerShare() via Web Share API with download fallback
 */

import Phaser from "phaser";
import { MatchStatsData } from "../game/MatchStats";
import { soundManager } from "../audio/SoundManager";

export interface ResultCardConfig {
  isWinner: boolean;
  winnerName: string;
  playerName: string;
  playerChar: string;
  playerNat: string;
  playerWet: number;
  aiWet: number;
  timeLeft: number;
  matchDuration: number;
  playerCount: number;
  roomCode: string;
  rank: number; // 1-based rank
  /** All players sorted by wet meter ascending (driest = best) */
  allPlayers: { name: string; wet: number; character: string }[];
  stats: MatchStatsData;
}

// Design tokens
const COLOR_BG_TOP = 0x0a2540;
const COLOR_BG_BOTTOM = 0x1a3a5c;
const COLOR_GOLD = "#F5C842";
const COLOR_GOLD_HEX = 0xf5c842;
const COLOR_SILVER = "#C0C0C0";
const COLOR_BRONZE = "#CD7F32";
const COLOR_WATER = "#3AB5F5";
const COLOR_WATER_HEX = 0x3ab5f5;
const COLOR_TEXT = "#e8f4ff";
const COLOR_TEXT_DIM = "#7db8e8";
const COLOR_CARD_BG = 0xffffff;
const COLOR_LOSE_TITLE = "#ff6b6b";

const FONT_TITLE = "Kanit, sans-serif";
const FONT_BODY = "Sarabun, sans-serif";

export class ResultCard {
  private scene: Phaser.Scene;
  private config: ResultCardConfig;
  private container!: Phaser.GameObjects.Container;
  private allObjects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, config: ResultCardConfig) {
    this.scene = scene;
    this.config = config;
  }

  /** Draw the full result card with entrance animation */
  draw(): void {
    const { width, height } = this.scene.scale;
    const cx = width / 2;

    this.container = this.scene.add.container(0, 0).setDepth(500);

    // -- Background gradient --
    this.drawGradientBackground(width, height);

    // -- Water ripple effect --
    this.drawWaterRipples(width, height);

    // -- Title --
    const titleY = 40;
    const titleText = this.config.isWinner
      ? "จ้าวแห่งสงกรานต์"
      : "ยังไม่ถึงเวลา...";
    const titleColor = this.config.isWinner ? COLOR_GOLD : COLOR_LOSE_TITLE;

    const title = this.scene.add
      .text(cx, titleY, titleText, {
        fontSize: "26px",
        color: titleColor,
        fontFamily: FONT_TITLE,
        fontStyle: "900",
        stroke: "#000000",
        strokeThickness: 4,
        shadow: {
          offsetX: 0,
          offsetY: 2,
          color: "#000000",
          blur: 8,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.container.add(title);

    const subtitle = this.scene.add
      .text(
        cx,
        titleY + 30,
        this.config.isWinner
          ? `${this.config.winnerName} is the Songkran Champion!`
          : `${this.config.winnerName} wins this round!`,
        {
          fontSize: "12px",
          color: COLOR_TEXT_DIM,
          fontFamily: FONT_BODY,
        }
      )
      .setOrigin(0.5)
      .setAlpha(0);
    this.container.add(subtitle);

    // -- Winner character with glow --
    const charY = 130;
    this.drawCharacterWithGlow(cx, charY);

    // -- Rank badge --
    this.drawRankBadge(cx + 55, charY - 40);

    // -- Stats panel --
    const panelY = 210;
    this.drawStatsPanel(cx, panelY);

    // -- Wet meter bars for all players --
    const barsY = panelY + 115;
    this.drawWetBars(cx, barsY);

    // -- Match info --
    const infoY = barsY + this.config.allPlayers.length * 28 + 20;
    this.drawMatchInfo(cx, infoY);

    // -- Buttons --
    const btnY = Math.min(infoY + 50, height - 60);
    this.drawButtons(cx, btnY);

    // -- Branding --
    this.scene.add
      .text(cx, height - 16, "Songkran Royale 2569", {
        fontSize: "9px",
        color: COLOR_TEXT_DIM,
        fontFamily: FONT_TITLE,
      })
      .setOrigin(0.5)
      .setDepth(501);

    // -- Entrance animation --
    this.animateEntrance(title, subtitle);
  }

  // ── Background ─────────────────────────────────────────

  private drawGradientBackground(w: number, h: number): void {
    const steps = 32;
    const stepH = Math.ceil(h / steps);
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.round(Phaser.Math.Linear((COLOR_BG_TOP >> 16) & 0xff, (COLOR_BG_BOTTOM >> 16) & 0xff, t));
      const g = Math.round(Phaser.Math.Linear((COLOR_BG_TOP >> 8) & 0xff, (COLOR_BG_BOTTOM >> 8) & 0xff, t));
      const b = Math.round(Phaser.Math.Linear(COLOR_BG_TOP & 0xff, COLOR_BG_BOTTOM & 0xff, t));
      const color = (r << 16) | (g << 8) | b;
      const rect = this.scene.add
        .rectangle(w / 2, i * stepH + stepH / 2, w, stepH + 1, color)
        .setDepth(499);
      this.allObjects.push(rect);
    }
  }

  private drawWaterRipples(w: number, h: number): void {
    // Subtle animated ripple circles at bottom
    const rippleCount = 5;
    for (let i = 0; i < rippleCount; i++) {
      const rx = Phaser.Math.Between(100, w - 100);
      const ry = h - Phaser.Math.Between(30, 120);
      const circle = this.scene.add
        .circle(rx, ry, 0, COLOR_WATER_HEX, 0)
        .setStrokeStyle(1, COLOR_WATER_HEX, 0.15)
        .setDepth(499);
      this.allObjects.push(circle);

      // Animate ripple expanding
      this.scene.tweens.add({
        targets: circle,
        radius: { from: 0, to: Phaser.Math.Between(40, 80) },
        alpha: { from: 0.2, to: 0 },
        duration: 3000 + i * 600,
        delay: i * 400,
        repeat: -1,
        onUpdate: () => {
          const r = (circle as any).radius || 20;
          circle.setStrokeStyle(1, COLOR_WATER_HEX, circle.alpha * 0.5);
          circle.setRadius(r);
        },
      });
    }
  }

  // ── Character with glow ────────────────────────────────

  private drawCharacterWithGlow(cx: number, cy: number): void {
    if (this.config.isWinner) {
      // Golden glow circle behind character
      const glow = this.scene.add
        .circle(cx, cy, 50, COLOR_GOLD_HEX, 0.15)
        .setDepth(500);
      this.container.add(glow);

      // Pulsing glow
      this.scene.tweens.add({
        targets: glow,
        alpha: { from: 0.1, to: 0.25 },
        scale: { from: 1, to: 1.15 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      // Crown above character (gold triangle + circle)
      const crownGfx = this.scene.add.graphics().setDepth(502);
      crownGfx.fillStyle(COLOR_GOLD_HEX, 1);
      // Simple crown shape
      crownGfx.fillTriangle(cx - 20, cy - 52, cx, cy - 72, cx + 20, cy - 52);
      crownGfx.fillTriangle(cx - 14, cy - 52, cx - 7, cy - 66, cx, cy - 52);
      crownGfx.fillTriangle(cx, cy - 52, cx + 7, cy - 66, cx + 14, cy - 52);
      crownGfx.fillRect(cx - 20, cy - 54, 40, 6);
      // Jewel
      crownGfx.fillStyle(0xff4444, 1);
      crownGfx.fillCircle(cx, cy - 51, 3);
      this.container.add(crownGfx);
    }

    const charSprite = this.scene.add
      .sprite(cx, cy, `char_${this.config.playerChar}`)
      .setScale(8)
      .setDepth(501);
    this.container.add(charSprite);
  }

  // ── Rank badge ─────────────────────────────────────────

  private drawRankBadge(x: number, y: number): void {
    const rank = this.config.rank;
    if (rank > 3) return;

    const badgeColors: Record<number, { bg: number; text: string; label: string }> = {
      1: { bg: COLOR_GOLD_HEX, text: "#1a0e00", label: "#1" },
      2: { bg: 0xc0c0c0, text: "#1a1a1a", label: "#2" },
      3: { bg: 0xcd7f32, text: "#1a0e00", label: "#3" },
    };

    const c = badgeColors[rank];
    const badge = this.scene.add
      .circle(x, y, 18, c.bg, 1)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setDepth(503);
    this.container.add(badge);

    const rankText = this.scene.add
      .text(x, y, c.label, {
        fontSize: "16px",
        color: c.text,
        fontFamily: FONT_TITLE,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(503);
    this.container.add(rankText);
  }

  // ── Stats panel ────────────────────────────────────────

  private drawStatsPanel(cx: number, startY: number): void {
    const panelW = 340;
    const panelH = 100;

    // Card background
    const card = this.scene.add
      .rectangle(cx, startY + panelH / 2, panelW, panelH, COLOR_CARD_BG, 0.06)
      .setStrokeStyle(1, 0xffffff, 0.1)
      .setDepth(500);
    this.container.add(card);

    const { stats } = this.config;
    const accuracy =
      stats.shotsFired > 0
        ? Math.round((stats.shotsHit / stats.shotsFired) * 100)
        : 0;
    const timeSurvivedStr = this.formatTime(Math.round(stats.timeSurvived));

    const statLines = [
      { label: "Shots Fired", value: `${stats.shotsFired}` },
      { label: "Shots Hit", value: `${stats.shotsHit}` },
      { label: "Accuracy", value: `${accuracy}%` },
      { label: "Time Survived", value: timeSurvivedStr },
      { label: "Water Refills", value: `${stats.waterRefills}` },
    ];

    statLines.forEach((s, i) => {
      const col = i < 3 ? 0 : 1;
      const row = i < 3 ? i : i - 3;
      const baseX = col === 0 ? cx - panelW / 2 + 20 : cx + 20;
      const y = startY + 14 + row * 26;

      const labelObj = this.scene.add
        .text(baseX, y, s.label, {
          fontSize: "10px",
          color: COLOR_TEXT_DIM,
          fontFamily: FONT_BODY,
        })
        .setOrigin(0, 0.5)
        .setDepth(501)
        .setAlpha(0);
      this.container.add(labelObj);

      const valueObj = this.scene.add
        .text(baseX + 130, y, s.value, {
          fontSize: "11px",
          color: COLOR_TEXT,
          fontFamily: FONT_TITLE,
          fontStyle: "bold",
        })
        .setOrigin(1, 0.5)
        .setDepth(501)
        .setAlpha(0);
      this.container.add(valueObj);

      // Stagger animate
      this.scene.tweens.add({
        targets: [labelObj, valueObj],
        alpha: { from: 0, to: 1 },
        x: { from: (t: Phaser.GameObjects.Text) => t.x - 15, to: (t: Phaser.GameObjects.Text) => t.x },
        duration: 300,
        delay: 600 + i * 50,
        ease: "Power2",
      });
    });
  }

  // ── Wet meter bars ─────────────────────────────────────

  private drawWetBars(cx: number, startY: number): void {
    const barW = 300;
    const barH = 16;
    const spacing = 28;
    const players = this.config.allPlayers;

    // Section title
    const sectionTitle = this.scene.add
      .text(cx, startY - 14, "Wet Meter Results", {
        fontSize: "11px",
        color: COLOR_GOLD,
        fontFamily: FONT_TITLE,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(501);
    this.container.add(sectionTitle);

    players.forEach((p, i) => {
      const y = startY + i * spacing + 8;

      // Player name
      const nameObj = this.scene.add
        .text(cx - barW / 2, y - 1, p.name, {
          fontSize: "10px",
          color: COLOR_TEXT,
          fontFamily: FONT_TITLE,
        })
        .setOrigin(0, 0.5)
        .setDepth(502)
        .setAlpha(0);
      this.container.add(nameObj);

      // Bar background
      const barBg = this.scene.add
        .rectangle(cx + 30, y, barW - 100, barH, 0xffffff, 0.08)
        .setOrigin(0, 0.5)
        .setDepth(501);
      this.container.add(barBg);

      // Bar fill
      const wetPct = Math.min(100, Math.max(0, p.wet));
      const barColor = wetPct >= 100 ? 0xff4444 : COLOR_WATER_HEX;
      const barFill = this.scene.add
        .rectangle(cx + 30, y, 0, barH - 2, barColor, 0.7)
        .setOrigin(0, 0.5)
        .setDepth(502);
      this.container.add(barFill);

      // Percentage text
      const pctObj = this.scene.add
        .text(cx + barW - 60, y, `${Math.round(wetPct)}%`, {
          fontSize: "10px",
          color: wetPct >= 100 ? "#ff6b6b" : COLOR_TEXT,
          fontFamily: FONT_TITLE,
          fontStyle: "bold",
        })
        .setOrigin(1, 0.5)
        .setDepth(502)
        .setAlpha(0);
      this.container.add(pctObj);

      // Animate bar fill and text
      const targetWidth = ((barW - 100) * wetPct) / 100;
      this.scene.tweens.add({
        targets: barFill,
        width: targetWidth,
        duration: 600,
        delay: 800 + i * 100,
        ease: "Power2",
      });

      this.scene.tweens.add({
        targets: [nameObj, pctObj],
        alpha: 1,
        duration: 300,
        delay: 800 + i * 100,
      });
    });
  }

  // ── Match info ─────────────────────────────────────────

  private drawMatchInfo(cx: number, y: number): void {
    const duration = this.config.matchDuration - this.config.timeLeft;
    const info = [
      this.config.roomCode ? `Room: ${this.config.roomCode}` : null,
      `Duration: ${this.formatTime(duration)}`,
      `Players: ${this.config.playerCount}`,
    ]
      .filter(Boolean)
      .join("  |  ");

    const infoText = this.scene.add
      .text(cx, y, info, {
        fontSize: "9px",
        color: COLOR_TEXT_DIM,
        fontFamily: FONT_BODY,
      })
      .setOrigin(0.5)
      .setDepth(501);
    this.container.add(infoText);
  }

  // ── Buttons ────────────────────────────────────────────

  private drawButtons(cx: number, btnY: number): void {
    const buttons = [
      {
        label: "Share",
        x: cx - 150,
        bg: COLOR_WATER_HEX,
        textColor: "#0a2540",
        action: () => this.triggerShare(),
      },
      {
        label: "Copy Link",
        x: cx - 50,
        bg: 0xffffff,
        bgAlpha: 0.1,
        textColor: COLOR_TEXT,
        action: () => this.copyLink(),
      },
      {
        label: "Play Again",
        x: cx + 55,
        bg: COLOR_GOLD_HEX,
        textColor: "#1a0e00",
        action: () => {
          soundManager.play("button_click");
          this.scene.scene.start("CharacterScene");
        },
      },
      {
        label: "Main Menu",
        x: cx + 155,
        bg: 0xffffff,
        bgAlpha: 0.1,
        textColor: COLOR_TEXT,
        action: () => {
          soundManager.play("button_click");
          this.scene.scene.start("CharacterScene");
        },
      },
    ];

    buttons.forEach((btn, i) => {
      const bgAlpha = btn.bgAlpha ?? 1;
      const btnBg = this.scene.add
        .rectangle(btn.x, btnY, 90, 32, btn.bg, bgAlpha)
        .setStrokeStyle(bgAlpha < 1 ? 1 : 0, 0xffffff, 0.2)
        .setInteractive({ useHandCursor: true })
        .setDepth(502)
        .setAlpha(0);
      this.container.add(btnBg);

      const btnText = this.scene.add
        .text(btn.x, btnY, btn.label, {
          fontSize: "11px",
          color: btn.textColor,
          fontFamily: FONT_TITLE,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(503)
        .setAlpha(0);
      this.container.add(btnText);

      // Hover effect
      btnBg.on("pointerover", () => {
        btnBg.setScale(1.05);
        btnText.setScale(1.05);
      });
      btnBg.on("pointerout", () => {
        btnBg.setScale(1);
        btnText.setScale(1);
      });
      btnBg.on("pointerdown", () => {
        soundManager.play("button_click");
        btn.action();
      });

      // Stagger appear
      this.scene.tweens.add({
        targets: [btnBg, btnText],
        alpha: 1,
        duration: 250,
        delay: 1200 + i * 80,
      });
    });
  }

  // ── Entrance animation ─────────────────────────────────

  private animateEntrance(
    title: Phaser.GameObjects.Text,
    subtitle: Phaser.GameObjects.Text
  ): void {
    // Slide container up from below + fade in
    this.container.setAlpha(0);
    this.container.y = 30;

    this.scene.tweens.add({
      targets: this.container,
      y: 0,
      alpha: 1,
      duration: 400,
      ease: "Power2",
    });

    // Title pops in
    this.scene.tweens.add({
      targets: title,
      alpha: 1,
      scale: { from: 0.7, to: 1 },
      duration: 400,
      delay: 200,
      ease: "Back.easeOut",
    });

    this.scene.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 300,
      delay: 350,
    });
  }

  // ── Share / download ───────────────────────────────────

  /** Capture the result card as a PNG using Phaser's renderer.snapshot() */
  generateShareImage(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const renderer = this.scene.game.renderer;
      if (renderer instanceof Phaser.Renderer.Canvas.CanvasRenderer ||
          renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
        renderer.snapshot((image: Phaser.Display.Color | HTMLImageElement) => {
          if (image instanceof HTMLImageElement) {
            // Convert to blob
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(image, 0, 0);
              canvas.toBlob((blob) => resolve(blob), "image/png");
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      } else {
        resolve(null);
      }
    });
  }

  /** Use Web Share API if available; fall back to download */
  async triggerShare(): Promise<void> {
    const blob = await this.generateShareImage();
    if (!blob) return;

    const file = new File([blob], "songkran-royale-result.png", {
      type: "image/png",
    });

    // Try Web Share API
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          title: "Songkran Royale",
          text: `${this.config.isWinner ? "I won!" : "GG!"} Songkran Royale 2569`,
          files: [file],
        });
        return;
      } catch {
        // User cancelled or not supported — fall through to download
      }
    }

    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "songkran-royale-result.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Copy a placeholder share URL to clipboard */
  private async copyLink(): Promise<void> {
    const url = `https://songkran-royale.app/match/${this.config.roomCode || "local"}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API not available — silent fail
    }
  }

  // ── Helpers ────────────────────────────────────────────

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.abs(seconds) % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
}
