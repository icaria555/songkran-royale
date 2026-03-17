import { MapSchema } from "@colyseus/schema";
import { PlayerState } from "../schema/GameState";

/** Count players that are still alive */
export function countAlivePlayers(players: MapSchema<PlayerState>): number {
  let count = 0;
  players.forEach((player) => {
    if (player.isAlive) count++;
  });
  return count;
}

/** Get the last alive player's ID, or empty string if 0 or 2+ alive */
export function getWinnerId(players: MapSchema<PlayerState>): string {
  let aliveId = "";
  let aliveCount = 0;

  players.forEach((player) => {
    if (player.isAlive) {
      aliveCount++;
      aliveId = player.id;
    }
  });

  if (aliveCount === 1) return aliveId;
  return "";
}

/** For time-up: return the player with the lowest wet meter */
export function getLowestWetPlayer(players: MapSchema<PlayerState>): string {
  let lowestWet = Infinity;
  let winnerId = "";

  players.forEach((player) => {
    if (player.isAlive && player.wetMeter < lowestWet) {
      lowestWet = player.wetMeter;
      winnerId = player.id;
    }
  });

  return winnerId;
}
