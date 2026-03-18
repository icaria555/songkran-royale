import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { GameRoom } from "./rooms/GameRoom";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { PrivateRoom } from "./rooms/PrivateRoom";
import { Leaderboard } from "./leaderboard/Leaderboard";

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: Date.now() });
});

// Leaderboard endpoints
app.get("/api/leaderboard", (_req, res) => {
  const leaderboard = Leaderboard.getInstance();
  res.status(200).json(leaderboard.getTop(50));
});

app.get("/api/leaderboard/:nickname", (req, res) => {
  const leaderboard = Leaderboard.getInstance();
  const stats = leaderboard.getPlayerStats(req.params.nickname);
  if (!stats) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.status(200).json(stats);
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
