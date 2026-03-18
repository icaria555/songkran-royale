import Phaser from "phaser";
import {
  joinLobby,
  joinPrivateRoom,
  createPrivateRoom,
  joinRoomById,
  getCurrentRoom,
  getLobbyRoom,
  setCurrentRoom,
  sendReady,
  leaveRoom,
  leaveLobby,
} from "../network/ColyseusClient";
import { Room, Callbacks } from "@colyseus/sdk";
import type { MapId } from "../map/MapRenderer";

interface LobbyData {
  character: string;
  nationality: string;
  nickname: string;
}

type LobbyMode = "menu" | "quickmatch" | "private-menu" | "create-room" | "join-room" | "waiting";

interface MapOption {
  id: MapId;
  name: string;
  description: string;
}

const MAP_OPTIONS: MapOption[] = [
  { id: "chiangmai", name: "\u0E40\u0E0A\u0E35\u0E22\u0E07\u0E43\u0E2B\u0E21\u0E48", description: "Open streets, water truck hazard" },
  { id: "khaosan", name: "\u0E02\u0E49\u0E32\u0E27\u0E2A\u0E32\u0E23", description: "Narrow alleys, street flood" },
];

export class LobbyScene extends Phaser.Scene {
  private lobbyData!: LobbyData;
  private statusText!: Phaser.GameObjects.Text;
  private playerListText!: Phaser.GameObjects.Text;
  private readyButton!: Phaser.GameObjects.Rectangle;
  private readyLabel!: Phaser.GameObjects.Text;
  private isReady = false;
  private connected = false;
  private mode: LobbyMode = "menu";

  // Dynamic UI elements (destroyed on mode change)
  private dynamicObjects: Phaser.GameObjects.GameObject[] = [];

  // Room code for private rooms
  private roomCode = "";
  private roomCodeInput = "";

  // Active game room (after transfer or private join)
  private gameRoom: Room | null = null;

  // Map selection
  private selectedMapIndex = 0;
  private mapCardBgs: Phaser.GameObjects.Rectangle[] = [];
  private mapCardLabels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: "LobbyScene" });
  }

  init(data: LobbyData): void {
    this.lobbyData = data;
    this.isReady = false;
    this.connected = false;
    this.mode = "menu";
    this.roomCode = "";
    this.roomCodeInput = "";
    this.gameRoom = null;
    this.dynamicObjects = [];
    this.selectedMapIndex = 0;
    this.mapCardBgs = [];
    this.mapCardLabels = [];
  }

  private getSelectedMapId(): MapId {
    return MAP_OPTIONS[this.selectedMapIndex].id;
  }

  create(): void {
    const { width } = this.scale;
    const cx = width / 2;

    this.cameras.main.setBackgroundColor(0x0a2540);

    // Title
    this.add
      .text(cx, 30, "SONGKRAN ROYALE", {
        fontSize: "12px",
        color: "#f5c842",
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 55, "Lobby", {
        fontSize: "24px",
        color: "#e8f4ff",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Status text
    this.statusText = this.add
      .text(cx, 90, "", {
        fontSize: "14px",
        color: "#7db8e8",
        fontFamily: "Sarabun, sans-serif",
        align: "center",
      })
      .setOrigin(0.5);

    // Player list
    this.playerListText = this.add
      .text(cx, 320, "", {
        fontSize: "13px",
        color: "#e8f4ff",
        fontFamily: "Kanit, sans-serif",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    // Ready button (hidden initially)
    this.readyButton = this.add
      .rectangle(cx, 460, 200, 48, 0x42e8b5, 1)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    this.readyLabel = this.add
      .text(cx, 460, "พร้อม! / READY", {
        fontSize: "14px",
        color: "#1a0e00",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.readyButton.on("pointerdown", () => this.toggleReady());

    // Show main menu
    this.showMainMenu();
  }

  // ── Mode rendering ──────────────────────────────────────────

  private clearDynamic(): void {
    this.dynamicObjects.forEach((obj) => obj.destroy());
    this.dynamicObjects = [];
    this.readyButton.setVisible(false);
    this.readyLabel.setVisible(false);
    this.playerListText.setText("");
    this.statusText.setText("").setColor("#7db8e8");
  }

  private showMainMenu(): void {
    this.clearDynamic();
    this.mode = "menu";

    const { width } = this.scale;
    const cx = width / 2;

    this.statusText.setText(
      `${this.lobbyData.nickname} — เลือกโหมด / Choose mode`
    );

    // ── Map Picker ──────────────────────────────────────
    const mapLabel = this.add
      .text(cx, 118, "เลือกแผนที่ — SELECT MAP", {
        fontSize: "10px",
        color: "#7db8e8",
        letterSpacing: 2,
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(mapLabel);

    this.mapCardBgs = [];
    this.mapCardLabels = [];

    const cardW = 170;
    const cardH = 72;
    const cardGap = 16;
    const totalW = MAP_OPTIONS.length * cardW + (MAP_OPTIONS.length - 1) * cardGap;
    const startX = cx - totalW / 2 + cardW / 2;

    MAP_OPTIONS.forEach((mapOpt, i) => {
      const cardX = startX + i * (cardW + cardGap);
      const cardY = 165;
      const isSelected = i === this.selectedMapIndex;

      const bg = this.add
        .rectangle(
          cardX, cardY, cardW, cardH,
          isSelected ? 0xf5c842 : 0xffffff,
          isSelected ? 0.15 : 0.06
        )
        .setStrokeStyle(2, isSelected ? 0xf5c842 : 0xffffff, isSelected ? 1 : 0.12)
        .setInteractive({ useHandCursor: true });
      this.dynamicObjects.push(bg);
      this.mapCardBgs.push(bg);

      const name = this.add
        .text(cardX, cardY - 14, mapOpt.name, {
          fontSize: "16px",
          color: isSelected ? "#f5c842" : "#e8f4ff",
          fontFamily: "Kanit, sans-serif",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.dynamicObjects.push(name);
      this.mapCardLabels.push(name);

      const desc = this.add
        .text(cardX, cardY + 10, mapOpt.description, {
          fontSize: "9px",
          color: isSelected ? "#f5c842" : "#7db8e8",
          fontFamily: "Sarabun, sans-serif",
        })
        .setOrigin(0.5);
      this.dynamicObjects.push(desc);
      this.mapCardLabels.push(desc);

      bg.on("pointerdown", () => {
        this.selectedMapIndex = i;
        this.refreshMapPickerUI();
      });
    });

    // ── Quick Match button ──────────────────────────────
    const qmBg = this.add
      .rectangle(cx, 240, 280, 56, 0x3ab5f5, 1)
      .setInteractive({ useHandCursor: true });
    this.dynamicObjects.push(qmBg);

    const qmLabel = this.add
      .text(cx, 235, "Quick Match", {
        fontSize: "18px",
        color: "#0a2540",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(qmLabel);

    const qmSub = this.add
      .text(cx, 255, "จับคู่อัตโนมัติ — Auto matchmaking", {
        fontSize: "10px",
        color: "#0a2540",
        fontFamily: "Sarabun, sans-serif",
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(qmSub);

    qmBg.on("pointerdown", () => this.startQuickMatch());

    // ── Private Room button ─────────────────────────────
    const prBg = this.add
      .rectangle(cx, 320, 280, 56, 0xf5c842, 1)
      .setInteractive({ useHandCursor: true });
    this.dynamicObjects.push(prBg);

    const prLabel = this.add
      .text(cx, 315, "Private Room", {
        fontSize: "18px",
        color: "#0a2540",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(prLabel);

    const prSub = this.add
      .text(cx, 335, "สร้างหรือเข้าห้องส่วนตัว — Room code", {
        fontSize: "10px",
        color: "#0a2540",
        fontFamily: "Sarabun, sans-serif",
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(prSub);

    prBg.on("pointerdown", () => this.showPrivateMenu());

    // Back button
    this.addBackButton(420, () => {
      leaveRoom();
      leaveLobby();
      this.scene.start("CharacterScene");
    });
  }

  private refreshMapPickerUI(): void {
    MAP_OPTIONS.forEach((_, i) => {
      const isSelected = i === this.selectedMapIndex;
      const bg = this.mapCardBgs[i];
      if (bg) {
        bg.setFillStyle(isSelected ? 0xf5c842 : 0xffffff, isSelected ? 0.15 : 0.06);
        bg.setStrokeStyle(2, isSelected ? 0xf5c842 : 0xffffff, isSelected ? 1 : 0.12);
      }
      // Each map has 2 label entries: name and description
      const nameLabel = this.mapCardLabels[i * 2];
      const descLabel = this.mapCardLabels[i * 2 + 1];
      if (nameLabel) nameLabel.setColor(isSelected ? "#f5c842" : "#e8f4ff");
      if (descLabel) descLabel.setColor(isSelected ? "#f5c842" : "#7db8e8");
    });
  }

  // ── Quick Match ──────────────────────────────────────────────

  private async startQuickMatch(): Promise<void> {
    this.clearDynamic();
    this.mode = "quickmatch";
    this.statusText.setText("กำลังค้นหาห้อง...\nFinding a match...");

    try {
      const lobby = await joinLobby({
        nickname: this.lobbyData.nickname,
        character: this.lobbyData.character,
        nationality: this.lobbyData.nationality,
        mapId: this.getSelectedMapId(),
      });

      this.connected = true;
      this.statusText.setText(
        "เชื่อมต่อแล้ว! รอผู้เล่นอื่น...\nConnected! Waiting for players..."
      );

      this.showReadyButton();

      // Listen for player count updates
      lobby.onMessage("playerCount", (count: number) => {
        if (this.mode === "quickmatch") {
          this.statusText.setText(
            `รอผู้เล่น ${count} คน...\nWaiting — ${count} player(s) in queue`
          );
        }
      });

      // Listen for room transfer (lobby matched us into a game room)
      lobby.onMessage("transfer", async (data: { roomId: string; sessionId: string; reservationToken: any }) => {
        this.statusText.setText("พบห้องแล้ว! กำลังเข้าร่วม...\nMatch found! Joining...");
        this.statusText.setColor("#f5c842");

        try {
          const { getClient } = await import("../network/ColyseusClient");
          const gameRoom = await getClient().consumeSeatReservation(data.reservationToken);
          leaveLobby();
          this.gameRoom = gameRoom;
          setCurrentRoom(gameRoom);
          this.wireGameRoom(gameRoom);
          // Auto-ready since we came from a lobby that already confirmed readiness
          gameRoom.send("ready");
        } catch (err) {
          console.error("Failed to join game room:", err);
          this.statusText.setText("เข้าห้องไม่ได้ / Failed to join game");
          this.statusText.setColor("#ff6b6b");
        }
      });

      // Listen for state changes on lobby room (players list, phase)
      this.wireLobbyListeners(lobby);

      // Back button
      this.addBackButton(530, () => {
        leaveLobby();
        this.showMainMenu();
      });
    } catch (err) {
      console.error("Quick match failed:", err);
      this.statusText.setText(
        "เชื่อมต่อไม่ได้\nCannot connect to server.\nTrying offline..."
      );
      this.statusText.setColor("#ff6b6b");

      this.time.delayedCall(2000, () => {
        this.scene.start("GameScene", { ...this.lobbyData, mapId: this.getSelectedMapId() });
      });
    }
  }

  // ── Private Room menu ────────────────────────────────────────

  private showPrivateMenu(): void {
    this.clearDynamic();
    this.mode = "private-menu";

    const { width } = this.scale;
    const cx = width / 2;

    this.statusText.setText("ห้องส่วนตัว — Private Room");

    // Create Room button
    const crBg = this.add
      .rectangle(cx, 180, 260, 50, 0x42e8b5, 1)
      .setInteractive({ useHandCursor: true });
    this.dynamicObjects.push(crBg);

    const crLabel = this.add
      .text(cx, 175, "สร้างห้อง / Create Room", {
        fontSize: "15px",
        color: "#0a2540",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(crLabel);

    const crSub = this.add
      .text(cx, 195, "ได้รับรหัสห้องเพื่อแชร์ให้เพื่อน", {
        fontSize: "10px",
        color: "#0a2540",
        fontFamily: "Sarabun, sans-serif",
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(crSub);

    crBg.on("pointerdown", () => this.doCreateRoom());

    // Join Room button
    const jrBg = this.add
      .rectangle(cx, 260, 260, 50, 0xffffff, 0.1)
      .setStrokeStyle(1.5, 0x3ab5f5, 1)
      .setInteractive({ useHandCursor: true });
    this.dynamicObjects.push(jrBg);

    const jrLabel = this.add
      .text(cx, 255, "เข้าห้อง / Join Room", {
        fontSize: "15px",
        color: "#3ab5f5",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(jrLabel);

    const jrSub = this.add
      .text(cx, 275, "ใส่รหัสห้องเพื่อเข้าร่วม", {
        fontSize: "10px",
        color: "#7db8e8",
        fontFamily: "Sarabun, sans-serif",
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(jrSub);

    jrBg.on("pointerdown", () => this.showJoinRoomInput());

    // Back
    this.addBackButton(370, () => this.showMainMenu());
  }

  // ── Create Room ──────────────────────────────────────────────

  private async doCreateRoom(): Promise<void> {
    this.clearDynamic();
    this.mode = "create-room";
    this.statusText.setText("กำลังสร้างห้อง...\nCreating room...");

    const { width } = this.scale;
    const cx = width / 2;

    try {
      const room = await createPrivateRoom({
        nickname: this.lobbyData.nickname,
        character: this.lobbyData.character,
        nationality: this.lobbyData.nationality,
        mapId: this.getSelectedMapId(),
      });

      this.connected = true;
      this.gameRoom = room;
      setCurrentRoom(room);

      // Get room code from metadata or roomId
      this.roomCode =
        (room.state?.roomCode as string) ||
        (room as any).metadata?.code ||
        room.roomId.slice(0, 6).toUpperCase();

      this.statusText.setText("ห้องพร้อมแล้ว! แชร์รหัสให้เพื่อน\nRoom ready! Share the code:");

      // Room code display
      const codeBg = this.add
        .rectangle(cx, 150, 240, 60, 0xffffff, 0.1)
        .setStrokeStyle(2, 0xf5c842, 1);
      this.dynamicObjects.push(codeBg);

      const codeText = this.add
        .text(cx, 145, this.roomCode, {
          fontSize: "32px",
          color: "#f5c842",
          fontFamily: "Kanit, sans-serif",
          fontStyle: "bold",
          letterSpacing: 8,
        })
        .setOrigin(0.5);
      this.dynamicObjects.push(codeText);

      // Copy button
      const copyBg = this.add
        .rectangle(cx, 200, 120, 30, 0xffffff, 0.08)
        .setStrokeStyle(1, 0xffffff, 0.2)
        .setInteractive({ useHandCursor: true });
      this.dynamicObjects.push(copyBg);

      const copyLabel = this.add
        .text(cx, 200, "Copy Code", {
          fontSize: "11px",
          color: "#7db8e8",
          fontFamily: "Sarabun, sans-serif",
        })
        .setOrigin(0.5);
      this.dynamicObjects.push(copyLabel);

      copyBg.on("pointerdown", () => {
        navigator.clipboard
          .writeText(this.roomCode)
          .then(() => {
            copyLabel.setText("Copied!");
            this.time.delayedCall(1500, () => copyLabel.setText("Copy Code"));
          })
          .catch(() => {
            copyLabel.setText("Failed");
            this.time.delayedCall(1500, () => copyLabel.setText("Copy Code"));
          });
      });

      // Player header
      const phdr = this.add
        .text(cx, 240, "ผู้เล่นในห้อง — Players", {
          fontSize: "11px",
          color: "#7db8e8",
          fontFamily: "Kanit, sans-serif",
        })
        .setOrigin(0.5);
      this.dynamicObjects.push(phdr);

      this.showReadyButton();
      this.wireGameRoom(room);

      this.addBackButton(530, () => {
        leaveRoom();
        this.showPrivateMenu();
      });
    } catch (err) {
      console.error("Create room failed:", err);
      this.statusText.setText("สร้างห้องไม่ได้ / Failed to create room");
      this.statusText.setColor("#ff6b6b");
      this.addBackButton(370, () => this.showPrivateMenu());
    }
  }

  // ── Join Room (code input) ───────────────────────────────────

  private showJoinRoomInput(): void {
    this.clearDynamic();
    this.mode = "join-room";
    this.roomCodeInput = "";

    const { width } = this.scale;
    const cx = width / 2;

    this.statusText.setText("ใส่รหัสห้อง — Enter room code");

    // Input background
    const inputBg = this.add
      .rectangle(cx, 170, 260, 52, 0xffffff, 0.08)
      .setStrokeStyle(2, 0x3ab5f5, 1);
    this.dynamicObjects.push(inputBg);

    const inputText = this.add
      .text(cx, 170, "_ _ _ _ _ _", {
        fontSize: "28px",
        color: "#7db8e8",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(inputText);

    // Join button
    const joinBg = this.add
      .rectangle(cx, 230, 200, 44, 0x3ab5f5, 1)
      .setInteractive({ useHandCursor: true });
    this.dynamicObjects.push(joinBg);

    const joinLabel = this.add
      .text(cx, 230, "เข้าห้อง / Join", {
        fontSize: "15px",
        color: "#0a2540",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(joinLabel);

    // Error text
    const errorText = this.add
      .text(cx, 270, "", {
        fontSize: "12px",
        color: "#ff6b6b",
        fontFamily: "Sarabun, sans-serif",
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(errorText);

    // Keyboard handler for code input
    const keyHandler = (event: KeyboardEvent) => {
      if (this.mode !== "join-room") return;

      if (event.key === "Backspace") {
        this.roomCodeInput = this.roomCodeInput.slice(0, -1);
        inputText.setText(
          this.roomCodeInput.length > 0
            ? this.roomCodeInput.toUpperCase()
            : "_ _ _ _ _ _"
        );
        inputText.setColor(this.roomCodeInput.length > 0 ? "#f5c842" : "#7db8e8");
        return;
      }

      if (event.key === "Enter" && this.roomCodeInput.length > 0) {
        this.doJoinRoom(this.roomCodeInput, errorText);
        return;
      }

      // Accept alphanumeric
      if (/^[a-zA-Z0-9]$/.test(event.key) && this.roomCodeInput.length < 8) {
        this.roomCodeInput += event.key.toUpperCase();
        inputText.setText(this.roomCodeInput).setColor("#f5c842");
      }
    };

    this.input.keyboard!.on("keydown", keyHandler);

    joinBg.on("pointerdown", () => {
      if (this.roomCodeInput.length > 0) {
        this.doJoinRoom(this.roomCodeInput, errorText);
      }
    });

    this.addBackButton(370, () => {
      this.input.keyboard!.off("keydown", keyHandler);
      this.showPrivateMenu();
    });
  }

  private async doJoinRoom(
    code: string,
    errorText: Phaser.GameObjects.Text
  ): Promise<void> {
    errorText.setText("");
    this.statusText.setText("กำลังเข้าห้อง...\nJoining room...");

    try {
      const room = await joinPrivateRoom(code, {
        nickname: this.lobbyData.nickname,
        character: this.lobbyData.character,
        nationality: this.lobbyData.nationality,
        mapId: this.getSelectedMapId(),
      });

      this.connected = true;
      this.gameRoom = room;
      setCurrentRoom(room);
      this.roomCode = code.toUpperCase();

      // Switch to waiting mode
      this.showWaitingRoom();
    } catch (err: any) {
      console.error("Join room failed:", err);
      errorText.setText(
        err?.message?.includes("not found")
          ? "ไม่พบห้อง / Room not found"
          : "เข้าห้องไม่ได้ / Failed to join"
      );
      this.statusText.setText("ใส่รหัสห้อง — Enter room code");
    }
  }

  // ── Waiting room (after joining private room) ────────────────

  private showWaitingRoom(): void {
    this.clearDynamic();
    this.mode = "waiting";

    const { width } = this.scale;
    const cx = width / 2;

    this.statusText.setText(
      `ห้อง: ${this.roomCode}\nRoom: ${this.roomCode} — Waiting for players...`
    );

    // Room code display
    const codeBg = this.add
      .rectangle(cx, 150, 200, 50, 0xffffff, 0.08)
      .setStrokeStyle(2, 0xf5c842, 1);
    this.dynamicObjects.push(codeBg);

    const codeLabel = this.add
      .text(cx, 150, this.roomCode, {
        fontSize: "26px",
        color: "#f5c842",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
        letterSpacing: 6,
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(codeLabel);

    const phdr = this.add
      .text(cx, 240, "ผู้เล่นในห้อง — Players", {
        fontSize: "11px",
        color: "#7db8e8",
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(phdr);

    this.showReadyButton();

    if (this.gameRoom) {
      this.wireGameRoom(this.gameRoom);
    }

    this.addBackButton(530, () => {
      leaveRoom();
      this.showPrivateMenu();
    });
  }

  // ── Shared listeners ─────────────────────────────────────────

  private wireLobbyListeners(lobby: Room): void {
    // If the lobby itself has players state, use v0.17 Callbacks API
    if ((lobby.state as any)?.players) {
      const $ = Callbacks.get(lobby) as any;
      $.onAdd("players", () => this.updatePlayerListFromRoom(lobby), true);
      $.onRemove("players", () => this.updatePlayerListFromRoom(lobby));
      this.updatePlayerListFromRoom(lobby);
    }

    lobby.onLeave((_code) => {
      if (this.mode === "quickmatch" && this.scene.isActive("LobbyScene")) {
        // If we got transferred, the lobby leaving is expected
        if (!this.gameRoom) {
          this.statusText.setText("Disconnected.");
          this.time.delayedCall(2000, () => this.showMainMenu());
        }
      }
    });
  }

  private wireGameRoom(room: Room): void {
    // Listen for state changes via onStateChange (v0.17 compatible)
    room.onStateChange((state: any) => {
      const phase = state.phase;
      const count = state.countdownTimer;

      if (phase === "countdown") {
        this.statusText.setText(count >= 0 ? `${count}...` : "เตรียมตัว... Countdown!");
        this.statusText.setColor("#f5c842");
      }

      if (phase === "playing" && this.scene.isActive("LobbyScene")) {
        this.scene.start("OnlineGameScene", {
          ...this.lobbyData,
          room,
          mapId: state.mapId || this.getSelectedMapId(),
        });
      }
    });

    if (room.state) {
      // Player list — use v0.17 Callbacks API
      const state = room.state as any;
      if (state.players) {
        const $ = Callbacks.get(room) as any;
        $.onAdd("players", () => this.updatePlayerListFromRoom(room), true);
        $.onRemove("players", () => this.updatePlayerListFromRoom(room));
        this.updatePlayerListFromRoom(room);
      }
    }

    // Handle disconnect
    room.onLeave((code) => {
      if (this.scene.isActive("LobbyScene") && !this.gameOver()) {
        this.statusText.setText("Disconnected.");
        this.statusText.setColor("#ff6b6b");
        this.time.delayedCall(2000, () => this.showMainMenu());
      }
    });
  }

  private gameOver(): boolean {
    return false; // lobby never "ends" — transition handles it
  }

  // ── UI Helpers ───────────────────────────────────────────────

  private showReadyButton(): void {
    this.readyButton.setVisible(true);
    this.readyLabel.setVisible(true);
    this.isReady = false;
    this.readyButton.setFillStyle(0x42e8b5, 1);
    this.readyLabel.setText("พร้อม! / READY");
  }

  private toggleReady(): void {
    if (!this.connected) return;

    this.isReady = !this.isReady;
    sendReady();

    if (this.isReady) {
      this.readyButton.setFillStyle(0xf5c842, 1);
      this.readyLabel.setText("รอผู้เล่นอื่น... Waiting...");
    } else {
      this.readyButton.setFillStyle(0x42e8b5, 1);
      this.readyLabel.setText("พร้อม! / READY");
    }
  }

  private updatePlayerListFromRoom(room: Room): void {
    if (!room.state?.players) return;

    const lines: string[] = [];
    room.state.players.forEach((player: any, sessionId: string) => {
      const readyMark = player.ready ? "[Ready]" : "[...]";
      const isMe = sessionId === room.sessionId ? " (You)" : "";
      lines.push(
        `${readyMark} ${player.nationality || ""} ${player.nickname || "Player"}${isMe}`
      );
    });

    this.playerListText.setText(
      lines.length > 0 ? lines.join("\n") : "Waiting for players..."
    );
  }

  private addBackButton(y: number, callback: () => void): void {
    const { width } = this.scale;
    const cx = width / 2;

    const backBtn = this.add
      .rectangle(cx, y, 140, 36, 0xffffff, 0.1)
      .setStrokeStyle(1, 0xffffff, 0.2)
      .setInteractive({ useHandCursor: true });
    this.dynamicObjects.push(backBtn);

    const backLabel = this.add
      .text(cx, y, "< Back", {
        fontSize: "12px",
        color: "#7db8e8",
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);
    this.dynamicObjects.push(backLabel);

    backBtn.on("pointerdown", callback);
  }
}
