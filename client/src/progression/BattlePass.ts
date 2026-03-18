/**
 * BattlePass — seasonal progression system for Songkran Royale.
 *
 * XP sources:
 *   Win:              +100 XP
 *   Kill (per elim):  +25 XP
 *   Game played:      +15 XP
 *   Survive 2+ min:   +20 XP bonus
 *
 * 20 tiers, each tier = 200 XP.
 * Progress is stored in localStorage under "songkran_battlepass".
 */

const STORAGE_KEY = "songkran_battlepass";
const XP_PER_TIER = 200;
const MAX_TIER = 20;

// ── XP awards ─────────────────────────────────────────────
export const XP_WIN = 100;
export const XP_KILL = 25;
export const XP_GAME_PLAYED = 15;
export const XP_SURVIVE_2MIN = 20;

// ── Reward types ──────────────────────────────────────────
export type RewardType = "title" | "skin" | "emote";

export interface BattlePassReward {
  id: string;
  tier: number;
  type: RewardType;
  name: string;
  description: string;
}

const TIER_REWARDS: BattlePassReward[] = [
  { id: "title_tourist",          tier: 1,  type: "title", name: "\u0E19\u0E31\u0E01\u0E17\u0E48\u0E2D\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27",           description: "Tourist" },
  { id: "skin_thai_pattern",      tier: 3,  type: "skin",  name: "Thai Pattern",        description: "Skin unlock" },
  { id: "title_water_warrior",    tier: 5,  type: "title", name: "\u0E19\u0E31\u0E01\u0E23\u0E1A\u0E19\u0E49\u0E33",               description: "Water Warrior" },
  { id: "emote_spray_1",          tier: 7,  type: "emote", name: "Spray / Emote",       description: "Emote placeholder" },
  { id: "skin_golden",            tier: 10, type: "skin",  name: "Golden",              description: "Skin unlock" },
  { id: "title_songkran_expert",  tier: 13, type: "title", name: "\u0E40\u0E0B\u0E35\u0E22\u0E19\u0E2A\u0E07\u0E01\u0E23\u0E32\u0E19\u0E15\u0E4C",         description: "Songkran Expert" },
  { id: "skin_neon",              tier: 15, type: "skin",  name: "Neon",                description: "Skin unlock" },
  { id: "title_water_commander",  tier: 18, type: "title", name: "\u0E08\u0E2D\u0E21\u0E17\u0E31\u0E1E\u0E19\u0E49\u0E33",             description: "Water Commander" },
  { id: "skin_rainbow",           tier: 20, type: "skin",  name: "Rainbow",             description: "Skin unlock" },
  { id: "title_king_songkran",    tier: 20, type: "title", name: "\u0E08\u0E49\u0E32\u0E27\u0E41\u0E2B\u0E48\u0E07\u0E2A\u0E07\u0E01\u0E23\u0E32\u0E19\u0E15\u0E4C",     description: "King/Queen of Songkran" },
];

// ── Persisted state ───────────────────────────────────────
export interface BattlePassState {
  xp: number;
  tier: number;
  unlockedRewards: string[];
}

function loadState(): BattlePassState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as BattlePassState;
  } catch {
    // ignore corrupt data
  }
  return { xp: 0, tier: 0, unlockedRewards: [] };
}

function saveState(state: BattlePassState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage not available
  }
}

// ── Public API ────────────────────────────────────────────

let state = loadState();

/** Add XP and advance tiers. Returns the new total XP gained this call. */
export function addXP(amount: number): number {
  state.xp += amount;

  // Advance tiers
  while (state.tier < MAX_TIER && state.xp >= XP_PER_TIER) {
    state.xp -= XP_PER_TIER;
    state.tier += 1;

    // Unlock rewards for the new tier
    const rewards = getRewardsForTier(state.tier);
    for (const reward of rewards) {
      if (!state.unlockedRewards.includes(reward.id)) {
        state.unlockedRewards.push(reward.id);
      }
    }
  }

  // Cap XP at max tier
  if (state.tier >= MAX_TIER) {
    state.tier = MAX_TIER;
    state.xp = 0;
  }

  saveState(state);
  return amount;
}

/** Calculate total XP to award after a match. */
export function calculateMatchXP(opts: {
  won: boolean;
  kills: number;
  timeSurvivedSec: number;
}): { total: number; breakdown: { label: string; xp: number }[] } {
  const breakdown: { label: string; xp: number }[] = [];

  breakdown.push({ label: "Game Played", xp: XP_GAME_PLAYED });

  if (opts.won) {
    breakdown.push({ label: "Victory!", xp: XP_WIN });
  }

  if (opts.kills > 0) {
    const killXP = opts.kills * XP_KILL;
    breakdown.push({ label: `${opts.kills} Elimination${opts.kills > 1 ? "s" : ""}`, xp: killXP });
  }

  if (opts.timeSurvivedSec >= 120) {
    breakdown.push({ label: "Survived 2+ min", xp: XP_SURVIVE_2MIN });
  }

  const total = breakdown.reduce((sum, b) => sum + b.xp, 0);
  return { total, breakdown };
}

export function getCurrentTier(): number {
  return state.tier;
}

export function getProgress(): { xp: number; tier: number; xpToNext: number; maxTier: number } {
  return {
    xp: state.xp,
    tier: state.tier,
    xpToNext: state.tier >= MAX_TIER ? 0 : XP_PER_TIER,
    maxTier: MAX_TIER,
  };
}

export function getRewardsForTier(tier: number): BattlePassReward[] {
  return TIER_REWARDS.filter((r) => r.tier === tier);
}

export function getAllRewards(): BattlePassReward[] {
  return [...TIER_REWARDS];
}

export function isRewardUnlocked(rewardId: string): boolean {
  return state.unlockedRewards.includes(rewardId);
}

export function getState(): BattlePassState {
  return { ...state };
}

/** Force reload from localStorage (useful after external changes) */
export function reload(): void {
  state = loadState();
}

export { XP_PER_TIER, MAX_TIER };
