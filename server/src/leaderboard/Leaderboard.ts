// TODO: Add persistence (e.g. SQLite, Redis, or JSON file) so data survives server restarts.

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  character: string;
  nationality: string;
  wins: number;
  gamesPlayed: number;
  totalKills: number;
  bestTime: number; // shortest match win time in seconds (lower is better)
  lastPlayed: number; // epoch ms
}

export interface MatchPlayerData {
  nickname: string;
  character: string;
  nationality: string;
  kills: number;
  isWinner: boolean;
  /** Match duration in seconds (timeLeft at match end subtracted from total). */
  matchDuration: number;
}

const MAX_ENTRIES = 100;

/**
 * In-memory leaderboard singleton.
 * Tracks cumulative player stats keyed by nickname.
 */
export class Leaderboard {
  private static instance: Leaderboard;

  /** Internal map keyed by nickname (case-sensitive). */
  private entries = new Map<string, Omit<LeaderboardEntry, "rank">>();

  private constructor() {}

  static getInstance(): Leaderboard {
    if (!Leaderboard.instance) {
      Leaderboard.instance = new Leaderboard();
    }
    return Leaderboard.instance;
  }

  /**
   * Record a single player's result after a match ends.
   */
  recordMatch(data: MatchPlayerData): void {
    const existing = this.entries.get(data.nickname);

    if (existing) {
      existing.gamesPlayed++;
      existing.totalKills += data.kills;
      existing.character = data.character;
      existing.nationality = data.nationality;
      existing.lastPlayed = Date.now();

      if (data.isWinner) {
        existing.wins++;
        if (data.matchDuration < existing.bestTime) {
          existing.bestTime = data.matchDuration;
        }
      }
    } else {
      this.entries.set(data.nickname, {
        nickname: data.nickname,
        character: data.character,
        nationality: data.nationality,
        wins: data.isWinner ? 1 : 0,
        gamesPlayed: 1,
        totalKills: data.kills,
        bestTime: data.isWinner ? data.matchDuration : Infinity,
        lastPlayed: Date.now(),
      });
    }

    this.prune();
  }

  /**
   * Return the top `n` entries sorted by wins desc, then totalKills desc.
   */
  getTop(n: number): LeaderboardEntry[] {
    const sorted = this.sortedEntries();
    return sorted.slice(0, n).map((e, i) => ({
      ...e,
      rank: i + 1,
      bestTime: e.bestTime === Infinity ? 0 : e.bestTime,
    }));
  }

  /**
   * Get stats for a specific player by nickname, or null if not found.
   */
  getPlayerStats(nickname: string): LeaderboardEntry | null {
    const entry = this.entries.get(nickname);
    if (!entry) return null;

    // Determine rank by sorting all entries
    const sorted = this.sortedEntries();
    const rank = sorted.findIndex((e) => e.nickname === nickname) + 1;

    return {
      ...entry,
      rank,
      bestTime: entry.bestTime === Infinity ? 0 : entry.bestTime,
    };
  }

  /**
   * Clear all leaderboard data.
   */
  reset(): void {
    this.entries.clear();
  }

  /** Number of tracked players. */
  get size(): number {
    return this.entries.size;
  }

  // ── Internals ──────────────────────────────────────────────────

  private sortedEntries(): Array<Omit<LeaderboardEntry, "rank">> {
    return [...this.entries.values()].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.totalKills - a.totalKills;
    });
  }

  /**
   * If we exceed MAX_ENTRIES, drop the lowest-ranked players.
   */
  private prune(): void {
    if (this.entries.size <= MAX_ENTRIES) return;

    const sorted = this.sortedEntries();
    const keep = new Set(sorted.slice(0, MAX_ENTRIES).map((e) => e.nickname));

    for (const key of this.entries.keys()) {
      if (!keep.has(key)) {
        this.entries.delete(key);
      }
    }
  }
}
