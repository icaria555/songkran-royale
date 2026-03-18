/**
 * MatchStats — Singleton that tracks per-match player statistics.
 * Used by GameScene / OnlineGameScene and displayed in ResultScene.
 */

export interface MatchStatsData {
  shotsFired: number;
  shotsHit: number;
  waterRefills: number;
  timeSurvived: number; // seconds
  finalWetMeter: number;
  eliminations: number;
}

class MatchStats {
  private stats: MatchStatsData = this.emptyStats();

  private emptyStats(): MatchStatsData {
    return {
      shotsFired: 0,
      shotsHit: 0,
      waterRefills: 0,
      timeSurvived: 0,
      finalWetMeter: 0,
      eliminations: 0,
    };
  }

  reset(): void {
    this.stats = this.emptyStats();
  }

  recordShot(): void {
    this.stats.shotsFired++;
  }

  recordHit(): void {
    this.stats.shotsHit++;
  }

  recordRefill(): void {
    this.stats.waterRefills++;
  }

  recordElimination(): void {
    this.stats.eliminations++;
  }

  /** Call every frame with delta in seconds to accumulate survival time */
  updateTimeSurvived(deltaSec: number): void {
    this.stats.timeSurvived += deltaSec;
  }

  setFinalWetMeter(value: number): void {
    this.stats.finalWetMeter = value;
  }

  getStats(): MatchStatsData {
    return { ...this.stats };
  }
}

/** Singleton instance */
export const matchStats = new MatchStats();
