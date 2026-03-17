import { describe, it, expect } from "vitest";
import { MapSchema } from "@colyseus/schema";
import { PlayerState } from "../../src/schema/GameState";
import {
  countAlivePlayers,
  getWinnerId,
  getLowestWetPlayer,
} from "../../src/game/WinCondition";

function makePlayer(id: string, isAlive: boolean, wetMeter: number): PlayerState {
  const p = new PlayerState();
  p.id = id;
  p.isAlive = isAlive;
  p.wetMeter = wetMeter;
  return p;
}

function buildPlayers(
  entries: Array<{ id: string; isAlive: boolean; wetMeter: number }>
): MapSchema<PlayerState> {
  const map = new MapSchema<PlayerState>();
  for (const e of entries) {
    map.set(e.id, makePlayer(e.id, e.isAlive, e.wetMeter));
  }
  return map;
}

describe("Win Condition — last player alive", () => {
  it("returns winner when exactly one player is alive", () => {
    const players = buildPlayers([
      { id: "p1", isAlive: false, wetMeter: 100 },
      { id: "p2", isAlive: true, wetMeter: 50 },
      { id: "p3", isAlive: false, wetMeter: 100 },
    ]);

    expect(countAlivePlayers(players)).toBe(1);
    expect(getWinnerId(players)).toBe("p2");
  });

  it("returns empty string when multiple players are alive", () => {
    const players = buildPlayers([
      { id: "p1", isAlive: true, wetMeter: 30 },
      { id: "p2", isAlive: true, wetMeter: 50 },
    ]);

    expect(countAlivePlayers(players)).toBe(2);
    expect(getWinnerId(players)).toBe("");
  });

  it("returns empty string when no players are alive", () => {
    const players = buildPlayers([
      { id: "p1", isAlive: false, wetMeter: 100 },
      { id: "p2", isAlive: false, wetMeter: 100 },
    ]);

    expect(countAlivePlayers(players)).toBe(0);
    expect(getWinnerId(players)).toBe("");
  });
});

describe("Win Condition — time runs out, lowest wet meter wins", () => {
  it("player with lowest wet meter wins", () => {
    const players = buildPlayers([
      { id: "p1", isAlive: true, wetMeter: 60 },
      { id: "p2", isAlive: true, wetMeter: 30 },
      { id: "p3", isAlive: true, wetMeter: 80 },
    ]);

    expect(getLowestWetPlayer(players)).toBe("p2");
  });

  it("dead players are excluded from lowest wet calculation", () => {
    const players = buildPlayers([
      { id: "p1", isAlive: false, wetMeter: 10 }, // dead, lowest but excluded
      { id: "p2", isAlive: true, wetMeter: 50 },
      { id: "p3", isAlive: true, wetMeter: 70 },
    ]);

    expect(getLowestWetPlayer(players)).toBe("p2");
  });

  it("tie-breaking: first player found with lowest wet meter wins (deterministic iteration)", () => {
    // MapSchema iteration order is insertion order, so p1 should win the tie
    const players = buildPlayers([
      { id: "p1", isAlive: true, wetMeter: 40 },
      { id: "p2", isAlive: true, wetMeter: 40 },
      { id: "p3", isAlive: true, wetMeter: 90 },
    ]);

    const winner = getLowestWetPlayer(players);
    // Both p1 and p2 have wetMeter=40. The implementation picks the first one
    // encountered with strict < comparison. Since p1 is inserted first, p1 wins.
    expect(winner).toBe("p1");
  });

  it("single alive player wins by default on time-up", () => {
    const players = buildPlayers([
      { id: "p1", isAlive: false, wetMeter: 100 },
      { id: "p2", isAlive: true, wetMeter: 99 },
    ]);

    expect(getLowestWetPlayer(players)).toBe("p2");
  });

  it("returns empty string when no alive players exist", () => {
    const players = buildPlayers([
      { id: "p1", isAlive: false, wetMeter: 100 },
      { id: "p2", isAlive: false, wetMeter: 100 },
    ]);

    expect(getLowestWetPlayer(players)).toBe("");
  });
});
