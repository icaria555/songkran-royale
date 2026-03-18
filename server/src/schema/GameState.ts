import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

export class ProjectileState extends Schema {
  @type("string") id: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("float32") vx: number = 0;
  @type("float32") vy: number = 0;
  @type("string") ownerId: string = "";
}

export class PlayerState extends Schema {
  @type("string") id: string = "";
  @type("string") nickname: string = "";
  @type("string") character: string = "male";
  @type("string") nationality: string = "🇹🇭";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("float32") angle: number = 0;
  @type("float32") waterLevel: number = 100;
  @type("float32") wetMeter: number = 0;
  @type("boolean") isAlive: boolean = true;
  @type("int32") score: number = 0;
  @type("int32") kills: number = 0;
  @type("boolean") ready: boolean = false;

  // Server-side only (not synced)
  vx: number = 0;
  vy: number = 0;
  lastInputTime: number = 0;
  inputCount: number = 0;
}

export class TankState extends Schema {
  @type("string") id: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("boolean") active: boolean = true;
}

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type([TankState]) waterTanks = new ArraySchema<TankState>();
  @type({ map: ProjectileState }) projectiles = new MapSchema<ProjectileState>();
  @type("string") phase: string = "lobby"; // lobby | countdown | playing | ended
  @type("int32") timeLeft: number = 180;
  @type("string") winnerId: string = "";
  @type("string") matchId: string = "";
  @type("int32") countdownTimer: number = 3;
}
