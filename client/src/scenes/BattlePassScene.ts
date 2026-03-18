import Phaser from "phaser";
import {
  getProgress,
  getAllRewards,
  isRewardUnlocked,
  getCurrentTier,
  type BattlePassReward,
  XP_PER_TIER,
  MAX_TIER,
} from "../progression/BattlePass";

/**
 * BattlePassScene — visual battle pass display.
 *
 * Horizontal scrolling tier track (left to right), each tier as a card
 * showing tier number, reward icon, and reward name.
 * Current progress bar between tiers.
 * Unlocked tiers: gold/colored. Locked: gray.
 * Current tier pulsing/highlighted.
 * XP counter at top.
 * Back button to CharacterScene.
 */

const CARD_W = 100;
const CARD_H = 120;
const CARD_GAP = 16;
const TRACK_Y = 300;
const TRACK_PADDING_X = 60;

const REWARD_ICON: Record<string, string> = {
  title: "\u{1F3C5}",
  skin: "\u{1F3A8}",
  emote: "\u{1F4AC}",
};

export class BattlePassScene extends Phaser.Scene {
  private scrollContainer!: Phaser.GameObjects.Container;
  private isDragging = false;
  private dragStartX = 0;
  private scrollStartX = 0;

  constructor() {
    super({ key: "BattlePassScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.cameras.main.setBackgroundColor(0x0a2540);

    // Title
    this.add
      .text(cx, 30, "SONGKRAN ROYALE", {
        fontSize: "12px",
        color: "#f5c842",
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 55, "Battle Pass", {
        fontSize: "26px",
        color: "#e8f4ff",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // XP counter
    const progress = getProgress();
    const currentTier = getCurrentTier();

    const xpText =
      currentTier >= MAX_TIER
        ? "MAX TIER REACHED!"
        : `${progress.xp} / ${XP_PER_TIER} XP to next tier`;

    this.add
      .text(cx, 90, `Tier ${currentTier} — ${xpText}`, {
        fontSize: "14px",
        color: "#7db8e8",
        fontFamily: "Sarabun, sans-serif",
      })
      .setOrigin(0.5);

    // Progress bar for current tier
    if (currentTier < MAX_TIER) {
      const barW = 300;
      const barH = 12;
      const barX = cx - barW / 2;
      const barY = 115;

      // Background
      this.add.rectangle(cx, barY, barW, barH, 0xffffff, 0.1).setStrokeStyle(1, 0xffffff, 0.2);

      // Fill
      const fillRatio = progress.xp / XP_PER_TIER;
      if (fillRatio > 0) {
        const fillW = barW * fillRatio;
        this.add
          .rectangle(barX + fillW / 2, barY, fillW, barH, 0xf5c842, 1)
          .setOrigin(0, 0.5)
          .setPosition(barX, barY);
      }
    }

    // Tier label row
    this.add
      .text(cx, 145, "\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E23\u0E32\u0E07\u0E27\u0E31\u0E25 \u2014 REWARD TIERS", {
        fontSize: "10px",
        color: "#7db8e8",
        letterSpacing: 3,
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);

    // ── Scrollable tier track ─────────────────────────────

    this.scrollContainer = this.add.container(0, 0);

    // Build all 20 tier cards + any rewards
    const allRewards = getAllRewards();
    const rewardsByTier = new Map<number, BattlePassReward[]>();
    for (const r of allRewards) {
      const arr = rewardsByTier.get(r.tier) || [];
      arr.push(r);
      rewardsByTier.set(r.tier, arr);
    }

    for (let tier = 1; tier <= MAX_TIER; tier++) {
      const cardX = TRACK_PADDING_X + (tier - 1) * (CARD_W + CARD_GAP) + CARD_W / 2;
      const cardY = TRACK_Y;

      const isUnlocked = tier <= currentTier;
      const isCurrent = tier === currentTier;
      const hasReward = rewardsByTier.has(tier);
      const rewards = rewardsByTier.get(tier) || [];

      // Card background
      const bgColor = isUnlocked ? 0xf5c842 : 0xffffff;
      const bgAlpha = isUnlocked ? 0.15 : 0.05;
      const strokeColor = isUnlocked ? 0xf5c842 : 0x555555;
      const strokeAlpha = isUnlocked ? 1 : 0.3;

      const bg = this.add
        .rectangle(cardX, cardY, CARD_W, CARD_H, bgColor, bgAlpha)
        .setStrokeStyle(isCurrent ? 3 : 1.5, strokeColor, strokeAlpha);
      this.scrollContainer.add(bg);

      // Pulse animation for current tier
      if (isCurrent) {
        this.tweens.add({
          targets: bg,
          alpha: { from: 1, to: 0.6 },
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }

      // Tier number
      const tierLabel = this.add
        .text(cardX, cardY - 40, `${tier}`, {
          fontSize: "22px",
          color: isUnlocked ? "#f5c842" : "#555555",
          fontFamily: "Kanit, sans-serif",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(tierLabel);

      // Reward info
      if (hasReward) {
        const reward = rewards[0];
        const icon = REWARD_ICON[reward.type] || "";
        const unlocked = isRewardUnlocked(reward.id);

        const iconText = this.add
          .text(cardX, cardY - 8, icon, {
            fontSize: "24px",
          })
          .setOrigin(0.5)
          .setAlpha(unlocked ? 1 : 0.4);
        this.scrollContainer.add(iconText);

        const rewardName = this.add
          .text(cardX, cardY + 18, reward.name, {
            fontSize: "10px",
            color: unlocked ? "#e8f4ff" : "#555555",
            fontFamily: "Kanit, sans-serif",
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: CARD_W - 8 },
          })
          .setOrigin(0.5);
        this.scrollContainer.add(rewardName);

        const rewardDesc = this.add
          .text(cardX, cardY + 34, reward.description, {
            fontSize: "8px",
            color: unlocked ? "#7db8e8" : "#444444",
            fontFamily: "Sarabun, sans-serif",
            align: "center",
          })
          .setOrigin(0.5);
        this.scrollContainer.add(rewardDesc);

        // Show additional rewards for same tier
        if (rewards.length > 1) {
          const extraText = this.add
            .text(cardX, cardY + 48, `+${rewards.length - 1} more`, {
              fontSize: "8px",
              color: "#7db8e8",
              fontFamily: "Sarabun, sans-serif",
            })
            .setOrigin(0.5);
          this.scrollContainer.add(extraText);
        }
      } else {
        // No reward for this tier — show empty marker
        const emptyLabel = this.add
          .text(cardX, cardY, "—", {
            fontSize: "16px",
            color: isUnlocked ? "#7db8e8" : "#444444",
            fontFamily: "Kanit, sans-serif",
          })
          .setOrigin(0.5);
        this.scrollContainer.add(emptyLabel);
      }
    }

    // Connection line between cards
    const lineY = TRACK_Y + CARD_H / 2 + 10;
    const lineStartX = TRACK_PADDING_X + CARD_W / 2;
    const lineEndX = TRACK_PADDING_X + (MAX_TIER - 1) * (CARD_W + CARD_GAP) + CARD_W / 2;
    const line = this.add
      .rectangle((lineStartX + lineEndX) / 2, lineY, lineEndX - lineStartX, 3, 0xffffff, 0.08);
    this.scrollContainer.add(line);

    // Progress fill on connection line
    if (currentTier > 0) {
      const progressEnd =
        TRACK_PADDING_X + (Math.min(currentTier, MAX_TIER) - 1) * (CARD_W + CARD_GAP) + CARD_W / 2;
      const progressW = progressEnd - lineStartX;
      if (progressW > 0) {
        const progressLine = this.add
          .rectangle(lineStartX + progressW / 2, lineY, progressW, 3, 0xf5c842, 0.6);
        this.scrollContainer.add(progressLine);
      }
    }

    // ── Scroll / drag logic ──────────────────────────────
    const totalTrackW =
      TRACK_PADDING_X * 2 + MAX_TIER * CARD_W + (MAX_TIER - 1) * CARD_GAP;
    const minScroll = Math.min(0, width - totalTrackW);
    const maxScroll = 0;

    // Start scrolled to show current tier
    const currentTierX =
      TRACK_PADDING_X + (Math.max(0, currentTier - 1)) * (CARD_W + CARD_GAP);
    const initialScroll = Phaser.Math.Clamp(-currentTierX + width / 2, minScroll, maxScroll);
    this.scrollContainer.x = initialScroll;

    // Interactive drag zone
    const dragZone = this.add
      .rectangle(cx, TRACK_Y, width, CARD_H + 80, 0x000000, 0)
      .setInteractive({ draggable: false, useHandCursor: true });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.y > TRACK_Y - CARD_H && pointer.y < TRACK_Y + CARD_H) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.scrollStartX = this.scrollContainer.x;
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const dx = pointer.x - this.dragStartX;
        this.scrollContainer.x = Phaser.Math.Clamp(
          this.scrollStartX + dx,
          minScroll,
          maxScroll
        );
      }
    });

    this.input.on("pointerup", () => {
      this.isDragging = false;
    });

    // ── Back button ─────────────────────────────────────
    const backBtn = this.add
      .rectangle(cx, height - 50, 180, 40, 0xffffff, 0.1)
      .setStrokeStyle(1, 0xffffff, 0.2)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(cx, height - 50, "< Back", {
        fontSize: "14px",
        color: "#7db8e8",
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);

    backBtn.on("pointerdown", () => {
      this.scene.start("CharacterScene");
    });
  }
}
