/**
 * WeaponSkins — cosmetic projectile trail skins unlocked by player stats.
 * Selected skin is persisted in localStorage.
 */

export interface PlayerStats {
  wins: number;
  games: number;
  kills: number;
}

export interface WeaponSkin {
  id: string;
  name: string;
  description: string;
  unlockCondition: (stats: PlayerStats) => boolean;
  /** Human-readable unlock requirement text */
  unlockText: string;
  /** Colors used for projectile trail [outer, inner, specular] */
  colors: [number, number, number];
}

export const WEAPON_SKINS: WeaponSkin[] = [
  {
    id: "default",
    name: "Classic Water",
    description: "Standard water blaster",
    unlockCondition: () => true,
    unlockText: "Always unlocked",
    colors: [0x2288cc, 0x66ccff, 0xccefff],
  },
  {
    id: "golden",
    name: "Golden Stream",
    description: "Liquid gold for true champions",
    unlockCondition: (s) => s.wins >= 10,
    unlockText: "Win 10 games",
    colors: [0xcc9900, 0xf5c842, 0xfff4cc],
  },
  {
    id: "neon",
    name: "Neon Splash",
    description: "Electrifying neon burst",
    unlockCondition: (s) => s.wins >= 25,
    unlockText: "Win 25 games",
    colors: [0x00cc88, 0x44ffbb, 0xccffe8],
  },
  {
    id: "rainbow",
    name: "Rainbow Blast",
    description: "All colors of Songkran",
    unlockCondition: (s) => s.wins >= 50,
    unlockText: "Win 50 games",
    colors: [0xff4488, 0xff88cc, 0xffccee],
  },
  {
    id: "thai_pattern",
    name: "Thai Pattern",
    description: "Traditional temple gold",
    unlockCondition: (s) => s.games >= 5,
    unlockText: "Play 5 games",
    colors: [0xb06040, 0xd4a040, 0xf0d888],
  },
  {
    id: "songkran_special",
    name: "Songkran Special",
    description: "Legendary water warrior skin",
    unlockCondition: (s) => s.kills >= 100,
    unlockText: "Get 100 kills",
    colors: [0x6622cc, 0xaa66ff, 0xddbbff],
  },
];

const STORAGE_KEY = "songkran_selected_skin";

/** Return all skins the player has unlocked */
export function getUnlockedSkins(stats: PlayerStats): WeaponSkin[] {
  return WEAPON_SKINS.filter((s) => s.unlockCondition(stats));
}

/** Get the currently selected skin id from localStorage */
export function getSelectedSkin(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "default";
  } catch {
    return "default";
  }
}

/** Persist the selected skin id */
export function setSelectedSkin(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage not available
  }
}

/** Convenience: get the full WeaponSkin object for the current selection */
export function getSelectedSkinData(): WeaponSkin {
  const id = getSelectedSkin();
  return WEAPON_SKINS.find((s) => s.id === id) || WEAPON_SKINS[0];
}
