import Phaser from "phaser";
import { WEAPON_SKINS } from "../skins/WeaponSkins";

/**
 * BootScene — generates detailed procedural pixel art sprites.
 * All characters are 16x16 source pixels, rendered at 4x (64x64) in-game.
 * Spritesheets are laid out horizontally: idle, walk1, walk2, walk3, walk4, shoot, death (7 frames x 16px = 112x16).
 */

// Frame indices within each spritesheet
export const ANIM_FRAME = {
  IDLE: 0,
  WALK_START: 1,
  WALK_END: 4,
  SHOOT: 5,
  DEATH: 6,
} as const;

const FRAME_COUNT = 7;
const CHAR_SIZE = 16;

// Color palettes for each character type
const PALETTES = {
  female: {
    skin: 0xfdd7aa,
    skinShadow: 0xe8b888,
    outfit: 0xff6eb4,
    outfitDark: 0xd94a8c,
    outfitLight: 0xff9ed2,
    hair: 0x5c3317,
    hairLight: 0x7a4422,
    eye: 0x1a0800,
    gun: 0x4488cc,
    gunDark: 0x336699,
  },
  male: {
    skin: 0xfdd7aa,
    skinShadow: 0xe8b888,
    outfit: 0x3a8fd4,
    outfitDark: 0x2a6fa4,
    outfitLight: 0x6ab5f5,
    hair: 0x2a1a0a,
    hairLight: 0x3d2a14,
    eye: 0x1a0800,
    gun: 0x44aa44,
    gunDark: 0x338833,
  },
  lgbtq: {
    skin: 0xfdd7aa,
    skinShadow: 0xe8b888,
    // Rainbow stripes drawn separately
    outfit: 0xff6666,
    outfitDark: 0xcc4444,
    outfitLight: 0xff9999,
    hair: 0x9933cc,
    hairLight: 0xbb55ee,
    eye: 0x1a0800,
    gun: 0xffaa00,
    gunDark: 0xcc8800,
  },
  ai: {
    skin: 0xfdd7aa,
    skinShadow: 0xe8b888,
    outfit: 0xff4444,
    outfitDark: 0xcc2222,
    outfitLight: 0xff7777,
    hair: 0x1a1a1a,
    hairLight: 0x333333,
    eye: 0xff0000,
    gun: 0x666666,
    gunDark: 0x444444,
  },
};

// Rainbow stripe colors for LGBTQ+ character outfit
const RAINBOW = [0xff0000, 0xff8800, 0xffff00, 0x00cc00, 0x0066ff, 0x9933cc];

type Palette = (typeof PALETTES)[keyof typeof PALETTES];

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    this.createAllTextures();
  }

  create(): void {
    this.scene.start("CharacterScene");
  }

  // ── Helpers ──────────────────────────────────────────────

  /** Set a single pixel on a Graphics object */
  private px(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number,
    alpha = 1
  ): void {
    gfx.fillStyle(color, alpha);
    gfx.fillRect(x, y, 1, 1);
  }

  /** Fill a small rectangular area */
  private rect(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    alpha = 1
  ): void {
    gfx.fillStyle(color, alpha);
    gfx.fillRect(x, y, w, h);
  }

  // ── Main texture generation ──────────────────────────────

  private createAllTextures(): void {
    // Character spritesheets
    for (const key of ["female", "male", "lgbtq", "ai"] as const) {
      this.createCharacterSheet(key, PALETTES[key]);
    }

    // Water projectile (default + per-skin variants)
    this.createWaterBullet();
    this.createSkinBulletTextures();

    // Water station
    this.createWaterStation();

    // Map tiles
    this.createGroundTile();
    this.createWallTile();
    this.createTempleTile();
    this.createRoadTile();
    this.createGrassTile();
    this.createPuddleTile();

    // Khao San Road specific tiles
    this.createNeonTile();
    this.createFoodCartTile();
    this.createHostelTile();

    // Water truck
    this.createWaterTruckTexture();

    // Particle texture (small white circle for particle emitters)
    this.createParticleTexture();
  }

  // ── Character spritesheet ────────────────────────────────

  private createCharacterSheet(key: string, pal: Palette): void {
    const sheetW = FRAME_COUNT * CHAR_SIZE; // 112
    const sheetH = CHAR_SIZE; // 16
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Frame 0: Idle
    this.drawCharIdle(gfx, 0, pal, key);

    // Frames 1-4: Walk animation (slight leg/arm variations)
    for (let f = 0; f < 4; f++) {
      this.drawCharWalk(gfx, (f + 1) * CHAR_SIZE, pal, key, f);
    }

    // Frame 5: Shoot (arm extended)
    this.drawCharShoot(gfx, 5 * CHAR_SIZE, pal, key);

    // Frame 6: Death (soaked/dripping)
    this.drawCharDeath(gfx, 6 * CHAR_SIZE, pal, key);

    gfx.generateTexture(`char_${key}`, sheetW, sheetH);
    gfx.destroy();

    // Create spritesheet frame data
    const tex = this.textures.get(`char_${key}`);
    tex.add(ANIM_FRAME.IDLE, 0, 0, 0, CHAR_SIZE, CHAR_SIZE);
    for (let f = 0; f < 4; f++) {
      tex.add(ANIM_FRAME.WALK_START + f, 0, (f + 1) * CHAR_SIZE, 0, CHAR_SIZE, CHAR_SIZE);
    }
    tex.add(ANIM_FRAME.SHOOT, 0, 5 * CHAR_SIZE, 0, CHAR_SIZE, CHAR_SIZE);
    tex.add(ANIM_FRAME.DEATH, 0, 6 * CHAR_SIZE, 0, CHAR_SIZE, CHAR_SIZE);

    // Create animations
    this.anims.create({
      key: `${key}_walk`,
      frames: [
        { key: `char_${key}`, frame: ANIM_FRAME.WALK_START },
        { key: `char_${key}`, frame: ANIM_FRAME.WALK_START + 1 },
        { key: `char_${key}`, frame: ANIM_FRAME.WALK_START + 2 },
        { key: `char_${key}`, frame: ANIM_FRAME.WALK_START + 3 },
      ],
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: `${key}_idle`,
      frames: [{ key: `char_${key}`, frame: ANIM_FRAME.IDLE }],
      frameRate: 1,
    });

    this.anims.create({
      key: `${key}_shoot`,
      frames: [{ key: `char_${key}`, frame: ANIM_FRAME.SHOOT }],
      frameRate: 1,
    });

    this.anims.create({
      key: `${key}_death`,
      frames: [{ key: `char_${key}`, frame: ANIM_FRAME.DEATH }],
      frameRate: 1,
    });
  }

  // ── Draw character in IDLE pose ──────────────────────────

  private drawCharIdle(
    gfx: Phaser.GameObjects.Graphics,
    ox: number,
    pal: Palette,
    key: string
  ): void {
    // Head (skin)
    this.rect(gfx, ox + 5, 1, 6, 6, pal.skin);
    this.rect(gfx, ox + 6, 0, 4, 1, pal.skin); // top of head

    // Hair
    this.drawHair(gfx, ox, pal, key);

    // Eyes
    this.px(gfx, ox + 6, 3, pal.eye);
    this.px(gfx, ox + 9, 3, pal.eye);

    // Mouth
    this.px(gfx, ox + 7, 5, pal.skinShadow);
    this.px(gfx, ox + 8, 5, pal.skinShadow);

    // Body/outfit
    this.drawOutfit(gfx, ox, 7, pal, key);

    // Arms at sides
    this.rect(gfx, ox + 3, 7, 2, 4, pal.skin);
    this.rect(gfx, ox + 11, 7, 2, 4, pal.skin);

    // Water gun in right hand
    this.rect(gfx, ox + 13, 8, 2, 1, pal.gun);
    this.px(gfx, ox + 14, 7, pal.gunDark);

    // Legs
    this.rect(gfx, ox + 5, 12, 2, 3, pal.outfitDark);
    this.rect(gfx, ox + 9, 12, 2, 3, pal.outfitDark);

    // Feet
    this.rect(gfx, ox + 5, 15, 2, 1, pal.skinShadow);
    this.rect(gfx, ox + 9, 15, 2, 1, pal.skinShadow);
  }

  // ── Draw character WALK frames ───────────────────────────

  private drawCharWalk(
    gfx: Phaser.GameObjects.Graphics,
    ox: number,
    pal: Palette,
    key: string,
    frame: number
  ): void {
    // Head (same as idle)
    this.rect(gfx, ox + 5, 1, 6, 6, pal.skin);
    this.rect(gfx, ox + 6, 0, 4, 1, pal.skin);
    this.drawHair(gfx, ox, pal, key);
    this.px(gfx, ox + 6, 3, pal.eye);
    this.px(gfx, ox + 9, 3, pal.eye);
    this.px(gfx, ox + 7, 5, pal.skinShadow);
    this.px(gfx, ox + 8, 5, pal.skinShadow);

    // Body
    this.drawOutfit(gfx, ox, 7, pal, key);

    // Arms swing based on frame
    const armSwing = [0, 1, 0, -1][frame];
    this.rect(gfx, ox + 3, 7 + armSwing, 2, 4, pal.skin);
    this.rect(gfx, ox + 11, 7 - armSwing, 2, 4, pal.skin);

    // Water gun bobs
    this.rect(gfx, ox + 13, 8 - armSwing, 2, 1, pal.gun);
    this.px(gfx, ox + 14, 7 - armSwing, pal.gunDark);

    // Legs alternate stride
    const legPatterns = [
      // frame 0: left forward, right back
      { lx: 4, ly: 12, rx: 10, ry: 12, lh: 3, rh: 3 },
      // frame 1: legs together
      { lx: 5, ly: 12, rx: 9, ry: 12, lh: 3, rh: 3 },
      // frame 2: right forward, left back
      { lx: 10, ly: 12, rx: 4, ry: 12, lh: 3, rh: 3 },
      // frame 3: legs together
      { lx: 5, ly: 12, rx: 9, ry: 12, lh: 3, rh: 3 },
    ];
    const lp = legPatterns[frame];
    this.rect(gfx, ox + lp.lx, lp.ly, 2, lp.lh, pal.outfitDark);
    this.rect(gfx, ox + lp.rx, lp.ry, 2, lp.rh, pal.outfitDark);

    // Feet
    this.rect(gfx, ox + lp.lx, 15, 2, 1, pal.skinShadow);
    this.rect(gfx, ox + lp.rx, 15, 2, 1, pal.skinShadow);
  }

  // ── Draw character SHOOT pose ────────────────────────────

  private drawCharShoot(
    gfx: Phaser.GameObjects.Graphics,
    ox: number,
    pal: Palette,
    key: string
  ): void {
    // Head
    this.rect(gfx, ox + 5, 1, 6, 6, pal.skin);
    this.rect(gfx, ox + 6, 0, 4, 1, pal.skin);
    this.drawHair(gfx, ox, pal, key);
    this.px(gfx, ox + 6, 3, pal.eye);
    this.px(gfx, ox + 9, 3, pal.eye);
    // Determined mouth
    this.px(gfx, ox + 7, 5, 0x000000);

    // Body
    this.drawOutfit(gfx, ox, 7, pal, key);

    // Left arm at side
    this.rect(gfx, ox + 3, 7, 2, 4, pal.skin);

    // Right arm EXTENDED forward with gun
    this.rect(gfx, ox + 11, 7, 2, 2, pal.skin);
    this.rect(gfx, ox + 13, 7, 2, 2, pal.skin);
    // Gun barrel extended
    this.rect(gfx, ox + 14, 7, 2, 1, pal.gun);
    this.px(gfx, ox + 15, 6, pal.gunDark); // gun tip

    // Water spray muzzle flash
    this.px(gfx, ox + 15, 7, 0x8ee5ff);

    // Legs (stable shooting stance)
    this.rect(gfx, ox + 4, 12, 3, 3, pal.outfitDark);
    this.rect(gfx, ox + 9, 12, 3, 3, pal.outfitDark);
    this.rect(gfx, ox + 4, 15, 3, 1, pal.skinShadow);
    this.rect(gfx, ox + 9, 15, 3, 1, pal.skinShadow);
  }

  // ── Draw character DEATH pose (soaked) ───────────────────

  private drawCharDeath(
    gfx: Phaser.GameObjects.Graphics,
    ox: number,
    pal: Palette,
    key: string
  ): void {
    // Darker, soaked versions of colors
    const soakTint = (c: number) => {
      const r = Math.max(0, ((c >> 16) & 0xff) - 40);
      const g = Math.max(0, ((c >> 8) & 0xff) - 40);
      const b = Math.min(255, (c & 0xff) + 30);
      return (r << 16) | (g << 8) | b;
    };

    // Head — soaked skin
    this.rect(gfx, ox + 5, 2, 6, 6, soakTint(pal.skin));
    this.rect(gfx, ox + 6, 1, 4, 1, soakTint(pal.skin));
    this.drawHairSoaked(gfx, ox, pal, key);

    // Dizzy/defeated eyes (X X)
    this.px(gfx, ox + 6, 4, pal.eye);
    this.px(gfx, ox + 7, 5, pal.eye);
    this.px(gfx, ox + 7, 3, pal.eye);
    this.px(gfx, ox + 9, 4, pal.eye);
    this.px(gfx, ox + 10, 5, pal.eye);
    this.px(gfx, ox + 10, 3, pal.eye);

    // Sad mouth
    this.px(gfx, ox + 7, 6, 0x000000);
    this.px(gfx, ox + 8, 7, 0x000000);
    this.px(gfx, ox + 9, 6, 0x000000);

    // Soaked body (darker, with drip lines)
    this.rect(gfx, ox + 5, 8, 6, 5, soakTint(pal.outfit));

    // Drip lines
    this.px(gfx, ox + 4, 9, 0x3ab5f5);
    this.px(gfx, ox + 4, 11, 0x3ab5f5);
    this.px(gfx, ox + 12, 10, 0x3ab5f5);
    this.px(gfx, ox + 12, 12, 0x3ab5f5);
    this.px(gfx, ox + 7, 13, 0x3ab5f5);
    this.px(gfx, ox + 9, 14, 0x3ab5f5);

    // Arms limp
    this.rect(gfx, ox + 3, 8, 2, 5, soakTint(pal.skin));
    this.rect(gfx, ox + 11, 8, 2, 5, soakTint(pal.skin));

    // Legs (slumped)
    this.rect(gfx, ox + 5, 13, 3, 2, soakTint(pal.outfitDark));
    this.rect(gfx, ox + 8, 13, 3, 2, soakTint(pal.outfitDark));
    this.rect(gfx, ox + 5, 15, 3, 1, soakTint(pal.skinShadow));
    this.rect(gfx, ox + 8, 15, 3, 1, soakTint(pal.skinShadow));

    // Water puddle beneath
    this.rect(gfx, ox + 3, 15, 10, 1, 0x3ab5f5);
  }

  // ── Hair drawing ─────────────────────────────────────────

  private drawHair(
    gfx: Phaser.GameObjects.Graphics,
    ox: number,
    pal: Palette,
    key: string
  ): void {
    if (key === "female") {
      // Ponytail hairstyle
      this.rect(gfx, ox + 5, 0, 6, 2, pal.hair);
      this.px(gfx, ox + 4, 1, pal.hair);
      this.px(gfx, ox + 11, 1, pal.hair);
      // Ponytail extending right
      this.rect(gfx, ox + 11, 0, 2, 1, pal.hair);
      this.rect(gfx, ox + 12, 1, 2, 1, pal.hair);
      this.rect(gfx, ox + 13, 2, 1, 2, pal.hairLight);
      this.px(gfx, ox + 14, 3, pal.hairLight);
      // Bangs
      this.rect(gfx, ox + 5, 1, 2, 1, pal.hairLight);
    } else if (key === "male") {
      // Short spiky hair
      this.rect(gfx, ox + 5, 0, 6, 2, pal.hair);
      this.px(gfx, ox + 4, 0, pal.hair);
      this.px(gfx, ox + 11, 0, pal.hair);
      // Spikes on top
      this.px(gfx, ox + 6, -1 < 0 ? 0 : 0, pal.hairLight);
      this.px(gfx, ox + 8, 0, pal.hairLight);
      this.px(gfx, ox + 10, 0, pal.hairLight);
    } else if (key === "lgbtq") {
      // Styled/swept hair with color highlights
      this.rect(gfx, ox + 4, 0, 8, 2, pal.hair);
      this.px(gfx, ox + 3, 1, pal.hair);
      this.px(gfx, ox + 12, 1, pal.hair);
      // Colorful highlights
      this.px(gfx, ox + 5, 0, 0xff6699);
      this.px(gfx, ox + 7, 0, 0x66ccff);
      this.px(gfx, ox + 9, 0, 0xffcc33);
      // Swoosh to the side
      this.rect(gfx, ox + 3, 2, 1, 2, pal.hairLight);
      this.px(gfx, ox + 2, 3, pal.hairLight);
    } else {
      // AI: menacing short hair
      this.rect(gfx, ox + 5, 0, 6, 2, pal.hair);
      this.px(gfx, ox + 4, 0, pal.hair);
      this.px(gfx, ox + 11, 0, pal.hair);
      this.px(gfx, ox + 4, 1, pal.hairLight);
      this.px(gfx, ox + 11, 1, pal.hairLight);
    }
  }

  private drawHairSoaked(
    gfx: Phaser.GameObjects.Graphics,
    ox: number,
    pal: Palette,
    key: string
  ): void {
    // Flattened/wet hair — darker, drooping
    const wetHair = ((pal.hair >> 1) & 0x7f7f7f); // darken
    if (key === "female") {
      this.rect(gfx, ox + 5, 1, 6, 2, wetHair);
      this.rect(gfx, ox + 11, 2, 2, 3, wetHair); // ponytail drooping down
      this.px(gfx, ox + 12, 5, wetHair);
    } else if (key === "lgbtq") {
      this.rect(gfx, ox + 4, 1, 8, 2, wetHair);
      this.rect(gfx, ox + 3, 3, 1, 3, wetHair); // swoosh dripping
    } else {
      this.rect(gfx, ox + 5, 1, 6, 2, wetHair);
      this.px(gfx, ox + 4, 1, wetHair);
      this.px(gfx, ox + 11, 1, wetHair);
    }
  }

  // ── Outfit drawing ───────────────────────────────────────

  private drawOutfit(
    gfx: Phaser.GameObjects.Graphics,
    ox: number,
    y: number,
    pal: Palette,
    key: string
  ): void {
    if (key === "lgbtq") {
      // Rainbow stripes across the torso
      for (let row = 0; row < 5; row++) {
        const color = RAINBOW[row % RAINBOW.length];
        this.rect(gfx, ox + 5, y + row, 6, 1, color);
      }
      // Slight dark outline
      this.px(gfx, ox + 5, y, pal.outfitDark);
      this.px(gfx, ox + 10, y, pal.outfitDark);
    } else {
      // Solid outfit with shading
      this.rect(gfx, ox + 5, y, 6, 5, pal.outfit);
      // Collar highlight
      this.rect(gfx, ox + 6, y, 4, 1, pal.outfitLight);
      // Side shadow
      this.px(gfx, ox + 5, y + 1, pal.outfitDark);
      this.px(gfx, ox + 5, y + 2, pal.outfitDark);
      this.px(gfx, ox + 10, y + 1, pal.outfitDark);
      this.px(gfx, ox + 10, y + 2, pal.outfitDark);
    }
  }

  // ── Water projectile ─────────────────────────────────────

  private createWaterBullet(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);
    const s = 8;

    // Outer droplet shape — darker blue
    gfx.fillStyle(0x2288cc, 1);
    gfx.fillCircle(s / 2, s / 2, s / 2);

    // Inner highlight — lighter blue
    gfx.fillStyle(0x66ccff, 0.9);
    gfx.fillCircle(s / 2 - 1, s / 2 - 1, s / 2 - 2);

    // Bright center specular
    gfx.fillStyle(0xccefff, 0.8);
    gfx.fillRect(2, 2, 2, 2);

    // Top highlight pixel
    gfx.fillStyle(0xffffff, 0.6);
    gfx.fillRect(3, 1, 1, 1);

    gfx.generateTexture("water_bullet", s, s);
    gfx.destroy();
  }

  // ── Skin-specific bullet textures ───────────────────────

  private createSkinBulletTextures(): void {
    for (const skin of WEAPON_SKINS) {
      // Skip default — already created as "water_bullet"
      if (skin.id === "default") continue;

      const s = 8;
      const gfx = this.make.graphics({ x: 0, y: 0 }, false);
      const [outer, inner, specular] = skin.colors;

      gfx.fillStyle(outer, 1);
      gfx.fillCircle(s / 2, s / 2, s / 2);

      gfx.fillStyle(inner, 0.9);
      gfx.fillCircle(s / 2 - 1, s / 2 - 1, s / 2 - 2);

      gfx.fillStyle(specular, 0.8);
      gfx.fillRect(2, 2, 2, 2);

      gfx.fillStyle(0xffffff, 0.6);
      gfx.fillRect(3, 1, 1, 1);

      gfx.generateTexture(`water_bullet_${skin.id}`, s, s);
      gfx.destroy();
    }
  }

  // ── Water station ────────────────────────────────────────

  private createWaterStation(): void {
    const size = 16;
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Barrel base — brown wood
    this.rect(gfx, 2, 3, 12, 12, 0x8b5e3c);
    // Barrel rim top
    this.rect(gfx, 1, 2, 14, 2, 0xa0714a);
    // Barrel rim bottom
    this.rect(gfx, 1, 13, 14, 2, 0xa0714a);
    // Metal bands
    this.rect(gfx, 1, 5, 14, 1, 0x888888);
    this.rect(gfx, 1, 11, 14, 1, 0x888888);
    // Barrel wood grain
    this.px(gfx, 5, 7, 0x7a4e2c);
    this.px(gfx, 5, 9, 0x7a4e2c);
    this.px(gfx, 10, 6, 0x7a4e2c);
    this.px(gfx, 10, 10, 0x7a4e2c);

    // Water visible inside (top opening)
    this.rect(gfx, 3, 3, 10, 2, 0x3ab5f5);
    this.rect(gfx, 4, 3, 8, 1, 0x8ee5ff); // water highlight

    // Tap on right side
    this.rect(gfx, 13, 8, 3, 1, 0x999999);
    this.rect(gfx, 15, 7, 1, 3, 0x888888);
    // Drip from tap
    this.px(gfx, 15, 10, 0x3ab5f5);

    // Shadow beneath
    this.rect(gfx, 2, 15, 12, 1, 0x000000);
    gfx.fillStyle(0x000000, 0.2);
    gfx.fillRect(2, 15, 12, 1);

    gfx.generateTexture("water_station", size, size);
    gfx.destroy();
  }

  // ── Map tiles (32x32) ────────────────────────────────────

  private createGroundTile(): void {
    const size = 32;
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Base road/stone color
    gfx.fillStyle(0xc8b89a, 1);
    gfx.fillRect(0, 0, size, size);

    // Stone pattern — irregular rectangles
    const stones = [
      { x: 1, y: 1, w: 14, h: 14, c: 0xd4c4a6 },
      { x: 17, y: 1, w: 13, h: 7, c: 0xbfaf91 },
      { x: 17, y: 10, w: 13, h: 5, c: 0xc8b89a },
      { x: 1, y: 17, w: 8, h: 13, c: 0xbfaf91 },
      { x: 11, y: 17, w: 9, h: 6, c: 0xd4c4a6 },
      { x: 11, y: 25, w: 19, h: 6, c: 0xc2b294 },
      { x: 17, y: 17, w: 13, h: 6, c: 0xbfaf91 },
    ];
    for (const s of stones) {
      gfx.fillStyle(s.c, 1);
      gfx.fillRect(s.x, s.y, s.w, s.h);
    }

    // Grout lines
    gfx.fillStyle(0x9a8a6c, 0.5);
    gfx.fillRect(0, 0, size, 1);
    gfx.fillRect(0, 16, size, 1);
    gfx.fillRect(16, 0, 1, size);
    gfx.fillRect(0, 0, 1, size);

    // Subtle noise/variation pixels
    for (let i = 0; i < 12; i++) {
      const px = Math.floor(Math.random() * size);
      const py = Math.floor(Math.random() * size);
      gfx.fillStyle(0xb8a88a, 0.3);
      gfx.fillRect(px, py, 1, 1);
    }

    gfx.generateTexture("tile_ground", size, size);
    gfx.destroy();
  }

  private createWallTile(): void {
    const size = 32;
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Terracotta/brick base
    gfx.fillStyle(0xb06040, 1);
    gfx.fillRect(0, 0, size, size);

    // Brick pattern
    const brickH = 6;
    const brickW = 14;
    for (let row = 0; row < 6; row++) {
      const offset = row % 2 === 0 ? 0 : 7;
      const by = row * (brickH + 1);
      for (let col = -1; col < 3; col++) {
        const bx = offset + col * (brickW + 1);
        const shade = 0xa05535 + (((row + col) % 3) * 0x0a0505);
        gfx.fillStyle(shade, 1);
        gfx.fillRect(
          Math.max(0, bx),
          by,
          Math.min(brickW, size - Math.max(0, bx)),
          brickH
        );
      }
    }

    // Mortar lines
    gfx.fillStyle(0x8a7a6a, 0.6);
    for (let row = 0; row <= 5; row++) {
      const y = row * (brickH + 1) + brickH;
      gfx.fillRect(0, y, size, 1);
    }

    gfx.generateTexture("tile_wall", size, size);
    gfx.destroy();
  }

  private createTempleTile(): void {
    const size = 32;
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Gold/orange temple base
    gfx.fillStyle(0xc89030, 1);
    gfx.fillRect(0, 0, size, size);

    // Ornate block pattern
    const blockH = 7;
    const blockW = 14;
    for (let row = 0; row < 5; row++) {
      const offset = row % 2 === 0 ? 0 : 7;
      const by = row * (blockH + 1);
      for (let col = -1; col < 3; col++) {
        const bx = offset + col * (blockW + 1);
        const shade = row % 2 === 0 ? 0xd4a040 : 0xb88028;
        gfx.fillStyle(shade, 1);
        gfx.fillRect(
          Math.max(0, bx),
          by,
          Math.min(blockW, size - Math.max(0, bx)),
          blockH
        );
      }
    }

    // Gold trim lines
    gfx.fillStyle(0xf0c848, 0.7);
    gfx.fillRect(0, 0, size, 1);
    gfx.fillRect(0, 8, size, 1);
    gfx.fillRect(0, 16, size, 1);
    gfx.fillRect(0, 24, size, 1);

    // Naga-scale decorative pixels
    gfx.fillStyle(0xe8b838, 0.5);
    gfx.fillRect(4, 4, 2, 2);
    gfx.fillRect(20, 12, 2, 2);
    gfx.fillRect(12, 20, 2, 2);
    gfx.fillRect(26, 28, 2, 2);

    gfx.generateTexture("tile_temple", size, size);
    gfx.destroy();
  }

  private createRoadTile(): void {
    const size = 32;
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Asphalt base — darker than ground
    gfx.fillStyle(0x7a7a7a, 1);
    gfx.fillRect(0, 0, size, size);

    // Road surface variation
    gfx.fillStyle(0x888888, 1);
    gfx.fillRect(0, 0, size, 14);
    gfx.fillStyle(0x707070, 1);
    gfx.fillRect(0, 18, size, 14);

    // White dashed center line
    gfx.fillStyle(0xeeeeee, 0.8);
    gfx.fillRect(4, 15, 10, 2);
    gfx.fillRect(20, 15, 10, 2);

    // Subtle noise
    for (let i = 0; i < 8; i++) {
      const px = Math.floor(Math.random() * size);
      const py = Math.floor(Math.random() * size);
      gfx.fillStyle(0x666666, 0.3);
      gfx.fillRect(px, py, 1, 1);
    }

    gfx.generateTexture("tile_road", size, size);
    gfx.destroy();
  }

  private createGrassTile(): void {
    const size = 32;
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Base green
    gfx.fillStyle(0x4a8a3a, 1);
    gfx.fillRect(0, 0, size, size);

    // Grass variations
    const greens = [0x5a9a4a, 0x3a7a2a, 0x4a8a3a, 0x6aaa5a];
    for (let i = 0; i < 30; i++) {
      const px = Math.floor(Math.random() * size);
      const py = Math.floor(Math.random() * size);
      const c = greens[Math.floor(Math.random() * greens.length)];
      gfx.fillStyle(c, 1);
      gfx.fillRect(px, py, 1 + Math.floor(Math.random() * 2), 1);
    }

    // Tiny flower accents
    gfx.fillStyle(0xffee55, 0.8);
    gfx.fillRect(5, 10, 1, 1);
    gfx.fillRect(22, 25, 1, 1);
    gfx.fillStyle(0xff88aa, 0.7);
    gfx.fillRect(15, 5, 1, 1);

    gfx.generateTexture("tile_grass", size, size);
    gfx.destroy();
  }

  private createPuddleTile(): void {
    const size = 32;
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Base: same as ground
    gfx.fillStyle(0xc8b89a, 1);
    gfx.fillRect(0, 0, size, size);

    // Water puddle in center
    gfx.fillStyle(0x6ab5f5, 0.6);
    gfx.fillCircle(size / 2, size / 2, 12);

    gfx.fillStyle(0x8ed5ff, 0.5);
    gfx.fillCircle(size / 2 - 2, size / 2 - 2, 8);

    // Ripple rings
    gfx.lineStyle(1, 0xaae4ff, 0.4);
    gfx.strokeCircle(size / 2, size / 2, 6);
    gfx.strokeCircle(size / 2, size / 2, 10);

    // Specular highlights
    gfx.fillStyle(0xffffff, 0.3);
    gfx.fillRect(12, 11, 2, 1);
    gfx.fillRect(18, 14, 1, 1);

    gfx.generateTexture("tile_puddle", size, size);
    gfx.destroy();
  }

  // ── Khao San Road tiles (32x32) ────────────────────────

  private createNeonTile(): void {
    const size = 32;
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Dark wall base
    gfx.fillStyle(0x2a2a3a, 1);
    gfx.fillRect(0, 0, size, size);

    // Neon sign post — vertical pole
    gfx.fillStyle(0x666666, 1);
    gfx.fillRect(14, 8, 4, 24);

    // Neon sign board
    gfx.fillStyle(0x111122, 1);
    gfx.fillRect(4, 2, 24, 14);

    // Neon border glow — hot pink
    gfx.fillStyle(0xff44aa, 0.9);
    gfx.fillRect(4, 2, 24, 2);   // top
    gfx.fillRect(4, 14, 24, 2);  // bottom
    gfx.fillRect(4, 2, 2, 14);   // left
    gfx.fillRect(26, 2, 2, 14);  // right

    // Inner neon text (abstract colored lines)
    gfx.fillStyle(0x00ffcc, 0.8);
    gfx.fillRect(8, 5, 6, 2);
    gfx.fillStyle(0xff66ff, 0.8);
    gfx.fillRect(16, 5, 8, 2);
    gfx.fillStyle(0xffff44, 0.7);
    gfx.fillRect(10, 9, 12, 2);

    // Glow halo (subtle)
    gfx.fillStyle(0xff44aa, 0.15);
    gfx.fillRect(2, 0, 28, 18);

    // Base ground
    gfx.fillStyle(0x444455, 1);
    gfx.fillRect(0, 28, size, 4);

    gfx.generateTexture("tile_neon", size, size);
    gfx.destroy();
  }

  private createFoodCartTile(): void {
    const size = 32;
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Ground base
    gfx.fillStyle(0xc8b89a, 1);
    gfx.fillRect(0, 0, size, size);

    // Cart body — brown wood
    gfx.fillStyle(0x8b5e3c, 1);
    gfx.fillRect(4, 12, 24, 14);

    // Cart top / counter
    gfx.fillStyle(0xa07848, 1);
    gfx.fillRect(3, 10, 26, 3);

    // Awning — orange/red striped
    gfx.fillStyle(0xdd5522, 1);
    gfx.fillRect(2, 2, 28, 8);
    gfx.fillStyle(0xeeaa33, 1);
    gfx.fillRect(2, 2, 28, 2);
    gfx.fillRect(2, 6, 28, 2);

    // Awning poles
    gfx.fillStyle(0x666666, 1);
    gfx.fillRect(4, 2, 1, 10);
    gfx.fillRect(27, 2, 1, 10);

    // Food items on counter (colored dots)
    gfx.fillStyle(0xff6644, 0.9);
    gfx.fillRect(8, 11, 3, 2);   // satay
    gfx.fillStyle(0xffcc22, 0.9);
    gfx.fillRect(14, 11, 3, 2);  // pad thai
    gfx.fillStyle(0x44bb44, 0.8);
    gfx.fillRect(20, 11, 3, 2);  // som tum

    // Wheels
    gfx.fillStyle(0x333333, 1);
    gfx.fillCircle(8, 27, 2);
    gfx.fillCircle(24, 27, 2);

    // Shadow
    gfx.fillStyle(0x000000, 0.15);
    gfx.fillRect(4, 28, 24, 4);

    gfx.generateTexture("tile_foodcart", size, size);
    gfx.destroy();
  }

  private createHostelTile(): void {
    const size = 32;
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Concrete wall base — gray
    gfx.fillStyle(0x8a8a8a, 1);
    gfx.fillRect(0, 0, size, size);

    // Concrete block lines
    gfx.fillStyle(0x777777, 0.6);
    gfx.fillRect(0, 10, size, 1);
    gfx.fillRect(0, 21, size, 1);
    gfx.fillRect(15, 0, 1, size);

    // Window — dark with frame
    gfx.fillStyle(0x555566, 1);
    gfx.fillRect(4, 4, 10, 8);
    // Window frame
    gfx.fillStyle(0x999999, 1);
    gfx.fillRect(3, 3, 12, 1);
    gfx.fillRect(3, 12, 12, 1);
    gfx.fillRect(3, 3, 1, 10);
    gfx.fillRect(14, 3, 1, 10);
    // Window cross bar
    gfx.fillRect(8, 3, 1, 10);
    gfx.fillRect(3, 7, 12, 1);

    // Glass reflection
    gfx.fillStyle(0x88aacc, 0.3);
    gfx.fillRect(5, 5, 3, 2);

    // Second smaller window
    gfx.fillStyle(0x555566, 1);
    gfx.fillRect(20, 14, 8, 6);
    gfx.fillStyle(0x999999, 1);
    gfx.fillRect(19, 13, 10, 1);
    gfx.fillRect(19, 20, 10, 1);
    gfx.fillRect(19, 13, 1, 8);
    gfx.fillRect(28, 13, 1, 8);

    // Stain/weathering
    gfx.fillStyle(0x707070, 0.3);
    gfx.fillRect(2, 24, 4, 8);
    gfx.fillRect(22, 24, 6, 8);

    gfx.generateTexture("tile_hostel", size, size);
    gfx.destroy();
  }

  // ── Water truck texture (32x16 songthaew shape) ─────────

  private createWaterTruckTexture(): void {
    const w = 32;
    const h = 16;
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Truck body — red songthaew base
    gfx.fillStyle(0xcc2222, 1);
    gfx.fillRect(2, 3, 26, 10);

    // Cab (front, right side)
    gfx.fillStyle(0xdd3333, 1);
    gfx.fillRect(24, 2, 7, 12);

    // Windshield
    gfx.fillStyle(0x88ccee, 0.9);
    gfx.fillRect(28, 4, 3, 5);

    // Roof rack / water tank on back
    gfx.fillStyle(0x3388cc, 1);
    gfx.fillRect(3, 1, 18, 3);

    // Tank highlight
    gfx.fillStyle(0x55aadd, 0.7);
    gfx.fillRect(4, 1, 8, 1);

    // Gold trim (Thai decoration)
    gfx.fillStyle(0xf0c040, 0.8);
    gfx.fillRect(2, 3, 22, 1);
    gfx.fillRect(2, 12, 22, 1);

    // Wheels
    gfx.fillStyle(0x222222, 1);
    gfx.fillCircle(8, 14, 2);
    gfx.fillCircle(24, 14, 2);

    // Wheel hubcaps
    gfx.fillStyle(0x888888, 1);
    gfx.fillRect(7, 13, 2, 2);
    gfx.fillRect(23, 13, 2, 2);

    // Water spray nozzle (back)
    gfx.fillStyle(0x6ab5f5, 0.8);
    gfx.fillRect(0, 6, 3, 4);

    // Headlight
    gfx.fillStyle(0xffffaa, 0.9);
    gfx.fillRect(30, 5, 1, 2);

    gfx.generateTexture("water_truck", w, h);
    gfx.destroy();
  }

  // ── Particle texture ─────────────────────────────────────

  private createParticleTexture(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture("particle_white", 8, 8);
    gfx.destroy();
  }
}
