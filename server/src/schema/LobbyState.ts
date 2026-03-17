import { Schema, MapSchema, type } from "@colyseus/schema";

export class LobbyPlayerState extends Schema {
  @type("string") id: string = "";
  @type("string") nickname: string = "";
  @type("string") character: string = "male";
  @type("string") nationality: string = "🇹🇭";
  @type("boolean") ready: boolean = false;
}

export class LobbyState extends Schema {
  @type({ map: LobbyPlayerState }) players = new MapSchema<LobbyPlayerState>();
  @type("int32") countdownTimer: number = -1; // -1 = not counting down
  @type("string") status: string = "waiting"; // waiting | countdown | transferring
}
