/**
 * LeaderboardAPI — HTTP client for leaderboard endpoints.
 *
 * Uses the same base URL as the Colyseus server but over HTTP.
 */

const BASE_URL = (
  import.meta.env.VITE_SERVER_URL || "ws://localhost:2567"
)
  .replace(/^ws/, "http"); // ws:// → http://, wss:// → https://

export type Timeframe = "daily" | "weekly" | "alltime";

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  character: string;
  nationality: string;
  elo: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface PlayerStats {
  playerId: string;
  nickname: string;
  character: string;
  nationality: string;
  elo: number;
  wins: number;
  losses: number;
  winRate: number;
  rank: number;
  matchesPlayed: number;
}

export interface GlobalStats {
  totalMatches: number;
  totalPlayers: number;
}

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Fetch leaderboard entries for a given timeframe. */
export function fetchLeaderboard(
  timeframe: Timeframe,
  limit = 50,
): Promise<LeaderboardEntry[] | null> {
  return safeFetch<LeaderboardEntry[]>(
    `${BASE_URL}/api/leaderboard?timeframe=${timeframe}&limit=${limit}`,
  );
}

/** Fetch stats for a single player. */
export function fetchPlayerStats(
  playerId: string,
): Promise<PlayerStats | null> {
  return safeFetch<PlayerStats>(
    `${BASE_URL}/api/leaderboard/${encodeURIComponent(playerId)}`,
  );
}

/** Fetch global aggregate stats. */
export function fetchGlobalStats(): Promise<GlobalStats | null> {
  return safeFetch<GlobalStats>(`${BASE_URL}/api/leaderboard/stats`);
}
