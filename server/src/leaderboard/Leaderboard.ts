import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  character: string;
  nationality: string;
  wins: number;
  gamesPlayed: number;
  totalKills: number;
  bestTime: number; // best survival time in seconds (0 = no wins yet)
  lastPlayed: number; // epoch ms
}

export interface MatchPlayerData {
  nickname: string;
  character: string;
  nationality: string;
  kills: number;
  isWinner: boolean;
  /** Match duration in seconds. */
  matchDuration: number;
}

const MAX_ENTRIES = 100;

/**
 * Leaderboard with Supabase persistence + in-memory cache.
 *
 * - Reads serve from cache (refreshed on startup and after writes)
 * - Writes go to Supabase first, then update cache
 * - Falls back to in-memory-only if Supabase is not configured
 */
export class Leaderboard {
  private static instance: Leaderboard;

  private entries = new Map<string, Omit<LeaderboardEntry, "rank">>();
  private supabase: SupabaseClient | null = null;
  private initialized = false;

  private constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (url && key) {
      this.supabase = createClient(url, key);
      console.log("[Leaderboard] Supabase persistence enabled");
      this.loadFromSupabase();
    } else {
      console.log("[Leaderboard] No SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY — running in-memory only");
      this.initialized = true;
    }
  }

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
    // Update in-memory cache
    const existing = this.entries.get(data.nickname);

    if (existing) {
      existing.gamesPlayed++;
      existing.totalKills += data.kills;
      existing.character = data.character;
      existing.nationality = data.nationality;
      existing.lastPlayed = Date.now();

      if (data.isWinner) {
        existing.wins++;
        if (data.matchDuration < existing.bestTime || existing.bestTime === 0) {
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
        bestTime: data.isWinner ? data.matchDuration : 0,
        lastPlayed: Date.now(),
      });
    }

    this.prune();

    // Persist to Supabase (fire-and-forget)
    if (this.supabase) {
      this.persistToSupabase(data).catch((err) =>
        console.error("[Leaderboard] Supabase persist error:", err)
      );
    }
  }

  /**
   * Return the top `n` entries sorted by wins desc, then totalKills desc.
   */
  getTop(n: number): LeaderboardEntry[] {
    const sorted = this.sortedEntries();
    return sorted.slice(0, n).map((e, i) => ({
      ...e,
      rank: i + 1,
    }));
  }

  /**
   * Get stats for a specific player by nickname, or null if not found.
   */
  getPlayerStats(nickname: string): LeaderboardEntry | null {
    const entry = this.entries.get(nickname);
    if (!entry) return null;

    const sorted = this.sortedEntries();
    const rank = sorted.findIndex((e) => e.nickname === nickname) + 1;

    return { ...entry, rank };
  }

  /** Clear all leaderboard data (for testing). */
  reset(): void {
    this.entries.clear();
  }

  /** Number of tracked players. */
  get size(): number {
    return this.entries.size;
  }

  // ── Supabase persistence ──────────────────────────────────────

  /** Load leaderboard from Supabase on startup. */
  private async loadFromSupabase(): Promise<void> {
    if (!this.supabase) return;

    try {
      const { data, error } = await this.supabase
        .from("leaderboard")
        .select("*")
        .order("wins", { ascending: false })
        .order("total_kills", { ascending: false })
        .limit(MAX_ENTRIES);

      if (error) {
        console.error("[Leaderboard] Supabase load error:", error.message);
        this.initialized = true;
        return;
      }

      for (const row of data || []) {
        this.entries.set(row.nickname, {
          nickname: row.nickname,
          character: row.character,
          nationality: row.nationality,
          wins: row.wins,
          gamesPlayed: row.games_played,
          totalKills: row.total_kills,
          bestTime: row.best_time,
          lastPlayed: new Date(row.last_played).getTime(),
        });
      }

      console.log(`[Leaderboard] Loaded ${data?.length || 0} entries from Supabase`);
      this.initialized = true;
    } catch (err) {
      console.error("[Leaderboard] Supabase load exception:", err);
      this.initialized = true;
    }
  }

  /** Upsert a player's stats to Supabase after a match. */
  private async persistToSupabase(data: MatchPlayerData): Promise<void> {
    if (!this.supabase) return;

    const entry = this.entries.get(data.nickname);
    if (!entry) return;

    const { error } = await this.supabase.from("leaderboard").upsert(
      {
        nickname: entry.nickname,
        character: entry.character,
        nationality: entry.nationality,
        wins: entry.wins,
        games_played: entry.gamesPlayed,
        total_kills: entry.totalKills,
        best_time: entry.bestTime,
        last_played: new Date(entry.lastPlayed).toISOString(),
      },
      { onConflict: "nickname" }
    );

    if (error) {
      console.error("[Leaderboard] Supabase upsert error:", error.message);
    }
  }

  // ── Internals ──────────────────────────────────────────────────

  private sortedEntries(): Array<Omit<LeaderboardEntry, "rank">> {
    return [...this.entries.values()].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.totalKills - a.totalKills;
    });
  }

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
