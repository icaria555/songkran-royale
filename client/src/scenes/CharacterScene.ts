import Phaser from "phaser";
import { soundManager } from "../audio/SoundManager";
import {
  WEAPON_SKINS,
  getUnlockedSkins,
  getSelectedSkin,
  setSelectedSkin,
  type PlayerStats,
  type WeaponSkin,
} from "../skins/WeaponSkins";

interface CharacterOption {
  key: string;
  label: string;
  subLabel: string;
  color: number;
  stats: { speed: number; power: number; range: number };
}

const CHARACTERS: CharacterOption[] = [
  {
    key: "female",
    label: "SHE / HER",
    subLabel: "สาวนักสู้ พลังงานสูง",
    color: 0xff8ec7,
    stats: { speed: 85, power: 70, range: 90 },
  },
  {
    key: "male",
    label: "HE / HIM",
    subLabel: "นักรบพลังน้ำ",
    color: 0x3ab5f5,
    stats: { speed: 70, power: 90, range: 75 },
  },
  {
    key: "lgbtq",
    label: "THEY / THEM",
    subLabel: "ราชาแห่งสายรุ้ง",
    color: 0x42e8b5,
    stats: { speed: 92, power: 78, range: 82 },
  },
];

const NATIONS = [
  { flag: "🇹🇭", name: "ไทย" },
  { flag: "🇯🇵", name: "ญี่ปุ่น" },
  { flag: "🇰🇷", name: "เกาหลี" },
  { flag: "🇺🇸", name: "อเมริกา" },
  { flag: "🇬🇧", name: "อังกฤษ" },
  { flag: "🇫🇷", name: "ฝรั่งเศส" },
  { flag: "🇩🇪", name: "เยอรมนี" },
  { flag: "🇨🇳", name: "จีน" },
  { flag: "🇮🇳", name: "อินเดีย" },
  { flag: "🇦🇺", name: "ออสเตรเลีย" },
  { flag: "🇧🇷", name: "บราซิล" },
  { flag: "🇲🇾", name: "มาเลเซีย" },
];

export class CharacterScene extends Phaser.Scene {
  private selectedChar = 1; // default male
  private selectedNation = 0; // default Thai
  private nickname = "";
  private charSprites: Phaser.GameObjects.Sprite[] = [];
  private selectionBoxes: Phaser.GameObjects.Rectangle[] = [];
  private nationTexts: Phaser.GameObjects.Text[] = [];
  private skinCards: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; skin: WeaponSkin }[] = [];

  constructor() {
    super({ key: "CharacterScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Background
    this.cameras.main.setBackgroundColor(0x0a2540);

    // Start menu music and ambient water
    soundManager.init();
    soundManager.playMusic("menu");
    soundManager.startAmbientWater();

    // Title
    this.add
      .text(cx, 40, "🌊 SONGKRAN ROYALE 2569", {
        fontSize: "12px",
        color: "#f5c842",
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 65, "เลือกนักรบของคุณ", {
        fontSize: "28px",
        color: "#e8f4ff",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 95, "Choose your fighter", {
        fontSize: "13px",
        color: "#7db8e8",
        fontFamily: "Sarabun, sans-serif",
      })
      .setOrigin(0.5);

    // Leaderboard button (top-right)
    const lbBtn = this.add
      .text(width - 20, 20, "\u{1F3C6}", {
        fontSize: "24px",
        fontFamily: "Kanit, sans-serif",
        backgroundColor: "#ffffff10",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    lbBtn.on("pointerdown", () => {
      soundManager.init();
      soundManager.play("button_click");
      this.scene.start("LeaderboardScene");
    });
    lbBtn.on("pointerover", () => lbBtn.setAlpha(0.7));
    lbBtn.on("pointerout", () => lbBtn.setAlpha(1));

    // Battle Pass button (top-right, next to leaderboard)
    const bpBtn = this.add
      .text(width - 60, 20, "\u{1F396}", {
        fontSize: "24px",
        fontFamily: "Kanit, sans-serif",
        backgroundColor: "#ffffff10",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    bpBtn.on("pointerdown", () => {
      soundManager.init();
      soundManager.play("button_click");
      this.scene.start("BattlePassScene");
    });
    bpBtn.on("pointerover", () => bpBtn.setAlpha(0.7));
    bpBtn.on("pointerout", () => bpBtn.setAlpha(1));

    // Character cards
    const cardWidth = 140;
    const cardGap = 20;
    const totalWidth = CHARACTERS.length * cardWidth + (CHARACTERS.length - 1) * cardGap;
    const startX = cx - totalWidth / 2 + cardWidth / 2;

    CHARACTERS.forEach((char, i) => {
      const cardX = startX + i * (cardWidth + cardGap);
      const cardY = 210;

      // Selection box
      const box = this.add
        .rectangle(cardX, cardY, cardWidth, 170, 0xffffff, 0.06)
        .setStrokeStyle(1.5, i === this.selectedChar ? 0xf5c842 : 0xffffff, i === this.selectedChar ? 1 : 0.12)
        .setInteractive({ useHandCursor: true });

      this.selectionBoxes.push(box);

      // Character sprite
      const sprite = this.add
        .sprite(cardX, cardY - 30, `char_${char.key}`)
        .setScale(4);
      this.charSprites.push(sprite);

      // Name
      this.add
        .text(cardX, cardY + 35, char.label, {
          fontSize: "14px",
          color: "#e8f4ff",
          fontFamily: "Kanit, sans-serif",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      this.add
        .text(cardX, cardY + 52, char.subLabel, {
          fontSize: "10px",
          color: "#7db8e8",
          fontFamily: "Sarabun, sans-serif",
        })
        .setOrigin(0.5);

      // Stat bars
      const statsY = cardY + 66;
      const labels = ["Speed", "Power", "Range"];
      const values = [char.stats.speed, char.stats.power, char.stats.range];
      labels.forEach((label, si) => {
        const y = statsY + si * 14;
        this.add
          .text(cardX - 55, y, label, {
            fontSize: "9px",
            color: "#7db8e8",
            fontFamily: "Sarabun, sans-serif",
          })
          .setOrigin(0, 0.5);

        // Bar background
        this.add.rectangle(cardX + 15, y, 70, 4, 0xffffff, 0.1).setOrigin(0, 0.5);
        // Bar fill
        this.add
          .rectangle(cardX + 15, y, 70 * (values[si] / 100), 4, char.color, 1)
          .setOrigin(0, 0.5);
      });

      box.on("pointerdown", () => {
        soundManager.init();
        soundManager.play("button_click");
        this.selectCharacter(i);
      });
    });

    // Nationality section
    this.add
      .text(cx, 320, "สัญชาติ — NATIONALITY", {
        fontSize: "10px",
        color: "#7db8e8",
        letterSpacing: 3,
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);

    const natPerRow = 6;
    const natBtnW = 110;
    const natBtnH = 26;
    const natGap = 6;

    NATIONS.forEach((nat, i) => {
      const row = Math.floor(i / natPerRow);
      const col = i % natPerRow;
      const rowWidth = Math.min(natPerRow, NATIONS.length - row * natPerRow) * (natBtnW + natGap) - natGap;
      const rowStartX = cx - rowWidth / 2 + natBtnW / 2;
      const nx = rowStartX + col * (natBtnW + natGap);
      const ny = 348 + row * (natBtnH + natGap);

      const isSelected = i === this.selectedNation;
      const bg = this.add
        .rectangle(nx, ny, natBtnW, natBtnH, isSelected ? 0xf5c842 : 0xffffff, isSelected ? 0.15 : 0.06)
        .setStrokeStyle(1, isSelected ? 0xf5c842 : 0xffffff, isSelected ? 1 : 0.12)
        .setInteractive({ useHandCursor: true });

      const txt = this.add
        .text(nx, ny, `${nat.flag} ${nat.name}`, {
          fontSize: "11px",
          color: isSelected ? "#f5c842" : "#7db8e8",
          fontFamily: "Kanit, sans-serif",
        })
        .setOrigin(0.5);

      this.nationTexts.push(txt);

      bg.on("pointerdown", () => {
        soundManager.init();
        soundManager.play("button_click");
        this.selectedNation = i;
        this.refreshNationUI();
      });

      // Store bg ref on text for refresh
      (txt as any)._bg = bg;
      (txt as any)._index = i;
    });

    // ── Water Gun Skin selector ─────────────────────────────
    this.buildSkinSelector(cx, 410);

    // Nickname input — Phaser text with keyboard capture
    const inputBg = this.add
      .rectangle(cx, 480, 240, 36, 0xffffff, 0.06)
      .setStrokeStyle(1.5, 0xffffff, 0.12)
      .setInteractive({ useHandCursor: true });

    const inputText = this.add
      .text(cx, 480, "ชื่อผู้เล่น / Nickname", {
        fontSize: "14px",
        color: "#7db8e8",
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);

    let isPlaceholder = true;
    const maxLen = 16;

    this.input.keyboard!.on("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        this.startGame();
        return;
      }
      if (event.key === "Backspace") {
        if (this.nickname.length > 0) {
          this.nickname = this.nickname.slice(0, -1);
          if (this.nickname.length === 0) {
            inputText.setText("ชื่อผู้เล่น / Nickname").setColor("#7db8e8");
            isPlaceholder = true;
          } else {
            inputText.setText(this.nickname);
          }
        }
        return;
      }
      // Only accept printable characters
      if (event.key.length === 1 && this.nickname.length < maxLen) {
        if (isPlaceholder) {
          this.nickname = "";
          isPlaceholder = false;
          inputText.setColor("#e8f4ff");
        }
        this.nickname += event.key;
        inputText.setText(this.nickname);
      }
    });

    inputBg.on("pointerdown", () => {
      // Visual focus indicator
      inputBg.setStrokeStyle(1.5, 0x3ab5f5, 1);
    });

    // CTA Button
    const ctaY = 530;
    const ctaBg = this.add
      .rectangle(cx, ctaY, 240, 48, 0xf5c842, 1)
      .setInteractive({ useHandCursor: true });

    // Rounded corners via postFX if available, otherwise just a rect
    ctaBg.setStrokeStyle(0);

    this.add
      .text(cx, ctaY, "🌊 เข้าสู่สนามรบ", {
        fontSize: "16px",
        color: "#1a0e00",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, ctaY + 32, "Press ENTER or click to start", {
        fontSize: "10px",
        color: "#7db8e8",
        fontFamily: "Sarabun, sans-serif",
      })
      .setOrigin(0.5);

    ctaBg.on("pointerdown", () => {
      soundManager.init();
      soundManager.play("button_click");
      this.startGame();
    });

    // Note: ENTER is handled in the keyboard input handler above
  }

  private selectCharacter(index: number): void {
    this.selectedChar = index;
    this.selectionBoxes.forEach((box, i) => {
      const isSelected = i === index;
      box.setStrokeStyle(
        1.5,
        isSelected ? 0xf5c842 : 0xffffff,
        isSelected ? 1 : 0.12
      );
      box.setFillStyle(0xffffff, isSelected ? 0.1 : 0.06);
    });
  }

  private refreshNationUI(): void {
    this.nationTexts.forEach((txt) => {
      const i = (txt as any)._index;
      const bg = (txt as any)._bg as Phaser.GameObjects.Rectangle;
      const isSelected = i === this.selectedNation;
      bg.setFillStyle(isSelected ? 0xf5c842 : 0xffffff, isSelected ? 0.15 : 0.06);
      bg.setStrokeStyle(1, isSelected ? 0xf5c842 : 0xffffff, isSelected ? 1 : 0.12);
      txt.setColor(isSelected ? "#f5c842" : "#7db8e8");
    });
  }

  private getPlayerStats(): PlayerStats {
    try {
      const raw = localStorage.getItem("songkran_player_stats");
      if (raw) return JSON.parse(raw) as PlayerStats;
    } catch {
      // ignore
    }
    return { wins: 0, games: 0, kills: 0 };
  }

  private buildSkinSelector(cx: number, baseY: number): void {
    this.add
      .text(cx, baseY - 16, "\u{1F52B} Water Gun — SKIN", {
        fontSize: "10px",
        color: "#7db8e8",
        letterSpacing: 3,
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);

    const stats = this.getPlayerStats();
    const unlocked = getUnlockedSkins(stats);
    const unlockedIds = new Set(unlocked.map((s) => s.id));
    const selectedId = getSelectedSkin();

    const skinW = 100;
    const skinH = 38;
    const skinGap = 8;
    const skinsPerRow = 6;
    const totalRowW = skinsPerRow * skinW + (skinsPerRow - 1) * skinGap;
    const rowStartX = cx - totalRowW / 2 + skinW / 2;

    this.skinCards = [];

    WEAPON_SKINS.forEach((skin, i) => {
      const col = i % skinsPerRow;
      const row = Math.floor(i / skinsPerRow);
      const sx = rowStartX + col * (skinW + skinGap);
      const sy = baseY + row * (skinH + skinGap);

      const isUnlocked = unlockedIds.has(skin.id);
      const isSelected = skin.id === selectedId && isUnlocked;

      const bg = this.add
        .rectangle(
          sx, sy, skinW, skinH,
          isSelected ? 0xf5c842 : 0xffffff,
          isSelected ? 0.15 : 0.05
        )
        .setStrokeStyle(
          1,
          isSelected ? 0xf5c842 : isUnlocked ? 0xffffff : 0x555555,
          isSelected ? 1 : 0.15
        )
        .setInteractive({ useHandCursor: isUnlocked });

      // Color swatch (small circle showing projectile color)
      const swatchColor = isUnlocked ? skin.colors[1] : 0x555555;
      this.add.circle(sx - skinW / 2 + 12, sy, 5, swatchColor, isUnlocked ? 1 : 0.4);

      const label = this.add
        .text(sx + 4, sy, isUnlocked ? skin.name : "\u{1F512} " + skin.unlockText, {
          fontSize: "9px",
          color: isUnlocked ? (isSelected ? "#f5c842" : "#e8f4ff") : "#555555",
          fontFamily: "Kanit, sans-serif",
        })
        .setOrigin(0, 0.5);

      this.skinCards.push({ bg, label, skin });

      if (isUnlocked) {
        bg.on("pointerdown", () => {
          soundManager.init();
          soundManager.play("button_click");
          setSelectedSkin(skin.id);
          this.refreshSkinUI();
        });
      }
    });
  }

  private refreshSkinUI(): void {
    const stats = this.getPlayerStats();
    const unlocked = getUnlockedSkins(stats);
    const unlockedIds = new Set(unlocked.map((s) => s.id));
    const selectedId = getSelectedSkin();

    this.skinCards.forEach(({ bg, label, skin }) => {
      const isUnlocked = unlockedIds.has(skin.id);
      const isSelected = skin.id === selectedId && isUnlocked;

      bg.setFillStyle(
        isSelected ? 0xf5c842 : 0xffffff,
        isSelected ? 0.15 : 0.05
      );
      bg.setStrokeStyle(
        1,
        isSelected ? 0xf5c842 : isUnlocked ? 0xffffff : 0x555555,
        isSelected ? 1 : 0.15
      );

      if (isUnlocked) {
        label.setText(skin.name);
        label.setColor(isSelected ? "#f5c842" : "#e8f4ff");
      }
    });
  }

  private startGame(): void {
    const char = CHARACTERS[this.selectedChar];
    const nat = NATIONS[this.selectedNation];
    const name = this.nickname.trim() || "นักรบนิรนาม";

    // Try online lobby first — falls back to offline GameScene if server unreachable
    this.scene.start("LobbyScene", {
      character: char.key,
      nationality: nat.flag,
      nickname: name,
    });
  }
}
