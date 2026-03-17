import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { GameRoom } from "./rooms/GameRoom";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { PrivateRoom } from "./rooms/PrivateRoom";

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: Date.now() });
});

const httpServer = createServer(app);
const port = Number(process.env.PORT) || 2567;

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// Register rooms
gameServer.define("lobby", LobbyRoom);
gameServer.define("game", GameRoom);
gameServer.define("private", PrivateRoom);

gameServer.listen(port).then(() => {
  console.log(`🌊 Songkran Royale Server listening on port ${port}`);
  console.log(`   Health check: http://localhost:${port}/health`);
  console.log(`   Rooms: lobby, game, private`);
});
