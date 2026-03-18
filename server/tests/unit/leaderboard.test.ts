import { describe, it, expect, beforeEach } from "vitest";
import { Leaderboard } from "../../src/leaderboard/Leaderboard";

describe("Leaderboard", () => {
  let lb: Leaderboard;

  beforeEach(() => {
    lb = Leaderboard.getInstance();
    lb.reset();
  });

  it("is a singleton", () => {
    const a = Leaderboard.getInstance();
    const b = Leaderboard.getInstance();
    expect(a).toBe(b);
  });

  it("records a match and retrieves player stats", () => {
    lb.recordMatch({
      nickname: "Alice",
      character: "female",
      nationality: "TH",
      kills: 3,
      isWinner: true,
      matchDuration: 120,
    });

    const stats = lb.getPlayerStats("Alice");
    expect(stats).not.toBeNull();
    expect(stats!.wins).toBe(1);
    expect(stats!.gamesPlayed).toBe(1);
    expect(stats!.totalKills).toBe(3);
    expect(stats!.bestTime).toBe(120);
    expect(stats!.rank).toBe(1);
  });

  it("accumulates stats across multiple matches", () => {
    lb.recordMatch({
      nickname: "Bob",
      character: "male",
      nationality: "US",
      kills: 2,
      isWinner: true,
      matchDuration: 150,
    });
    lb.recordMatch({
      nickname: "Bob",
      character: "male",
      nationality: "US",
      kills: 1,
      isWinner: false,
      matchDuration: 180,
    });

    const stats = lb.getPlayerStats("Bob");
    expect(stats!.wins).toBe(1);
    expect(stats!.gamesPlayed).toBe(2);
    expect(stats!.totalKills).toBe(3);
    // bestTime stays at 150 (only updated on wins)
    expect(stats!.bestTime).toBe(150);
  });

  it("updates bestTime only when a win has a shorter duration", () => {
    lb.recordMatch({
      nickname: "Carol",
      character: "female",
      nationality: "JP",
      kills: 1,
      isWinner: true,
      matchDuration: 100,
    });
    lb.recordMatch({
      nickname: "Carol",
      character: "female",
      nationality: "JP",
      kills: 2,
      isWinner: true,
      matchDuration: 80,
    });
    lb.recordMatch({
      nickname: "Carol",
      character: "female",
      nationality: "JP",
      kills: 0,
      isWinner: true,
      matchDuration: 120,
    });

    const stats = lb.getPlayerStats("Carol");
    expect(stats!.bestTime).toBe(80);
  });

  it("sorts by wins desc then kills desc", () => {
    lb.recordMatch({ nickname: "A", character: "m", nationality: "X", kills: 5, isWinner: false, matchDuration: 180 });
    lb.recordMatch({ nickname: "B", character: "m", nationality: "X", kills: 1, isWinner: true, matchDuration: 100 });
    lb.recordMatch({ nickname: "C", character: "m", nationality: "X", kills: 10, isWinner: false, matchDuration: 180 });

    const top = lb.getTop(10);
    expect(top[0].nickname).toBe("B"); // 1 win
    expect(top[1].nickname).toBe("C"); // 0 wins, 10 kills
    expect(top[2].nickname).toBe("A"); // 0 wins, 5 kills
  });

  it("getTop limits results to n", () => {
    for (let i = 0; i < 10; i++) {
      lb.recordMatch({ nickname: `P${i}`, character: "m", nationality: "X", kills: i, isWinner: false, matchDuration: 180 });
    }
    const top3 = lb.getTop(3);
    expect(top3).toHaveLength(3);
    expect(top3[0].rank).toBe(1);
    expect(top3[2].rank).toBe(3);
  });

  it("returns null for unknown player", () => {
    expect(lb.getPlayerStats("nobody")).toBeNull();
  });

  it("reset clears all entries", () => {
    lb.recordMatch({ nickname: "Z", character: "m", nationality: "X", kills: 1, isWinner: true, matchDuration: 60 });
    expect(lb.size).toBe(1);
    lb.reset();
    expect(lb.size).toBe(0);
    expect(lb.getTop(10)).toHaveLength(0);
  });

  it("bestTime is 0 for players who never won", () => {
    lb.recordMatch({ nickname: "Loser", character: "m", nationality: "X", kills: 0, isWinner: false, matchDuration: 180 });
    const stats = lb.getPlayerStats("Loser");
    expect(stats!.bestTime).toBe(0);
  });

  it("prunes to MAX_ENTRIES (100)", () => {
    // Insert 105 players
    for (let i = 0; i < 105; i++) {
      lb.recordMatch({ nickname: `Player${i}`, character: "m", nationality: "X", kills: i, isWinner: false, matchDuration: 180 });
    }
    // Should be capped at 100
    expect(lb.size).toBeLessThanOrEqual(100);
    // Top-kill players should survive
    const top = lb.getTop(1);
    expect(top[0].nickname).toBe("Player104");
  });
});
