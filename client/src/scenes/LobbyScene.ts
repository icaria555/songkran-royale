import Phaser from "phaser";
import { joinGame, getCurrentRoom, sendReady, leaveRoom } from "../network/ColyseusClient";

interface LobbyData {
  character: string;
  nationality: string;
  nickname: string;
}

export class LobbyScene extends Phaser.Scene {
  private lobbyData!: LobbyData;
  private statusText!: Phaser.GameObjects.Text;
  private playerListText!: Phaser.GameObjects.Text;
  private readyButton!: Phaser.GameObjects.Rectangle;
  private readyLabel!: Phaser.GameObjects.Text;
  private isReady = false;
  private connected = false;

  constructor() {
    super({ key: "LobbyScene" });
  }

  init(data: LobbyData): void {
    this.lobbyData = data;
    this.isReady = false;
    this.connected = false;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.cameras.main.setBackgroundColor(0x0a2540);

    // Title
    this.add
      .text(cx, 50, "🌊 SONGKRAN ROYALE", {
        fontSize: "12px",
        color: "#f5c842",
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 80, "ห้องรอ — Lobby", {
        fontSize: "24px",
        color: "#e8f4ff",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Status
    this.statusText = this.add
      .text(cx, 130, "กำลังเชื่อมต่อ... Connecting...", {
        fontSize: "14px",
        color: "#7db8e8",
        fontFamily: "Sarabun, sans-serif",
      })
      .setOrigin(0.5);

    // Player list
    this.add
      .text(cx, 180, "ผู้เล่นในห้อง — Players", {
        fontSize: "11px",
        color: "#7db8e8",
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);

    this.playerListText = this.add
      .text(cx, 260, "", {
        fontSize: "14px",
        color: "#e8f4ff",
        fontFamily: "Kanit, sans-serif",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    // Ready button
    this.readyButton = this.add
      .rectangle(cx, 400, 200, 48, 0x42e8b5, 1)
      .setInteractive({ useHandCursor: true });

    this.readyLabel = this.add
      .text(cx, 400, "✅ พร้อม! / READY", {
        fontSize: "14px",
        color: "#1a0e00",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.readyButton.on("pointerdown", () => this.toggleReady());

    // Back button
    const backBtn = this.add
      .rectangle(cx, 470, 140, 36, 0xffffff, 0.1)
      .setStrokeStyle(1, 0xffffff, 0.2)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(cx, 470, "← ย้อนกลับ", {
        fontSize: "12px",
        color: "#7db8e8",
        fontFamily: "Kanit, sans-serif",
      })
      .setOrigin(0.5);

    backBtn.on("pointerdown", () => {
      leaveRoom();
      this.scene.start("CharacterScene");
    });

    // Hint
    this.add
      .text(cx, height - 30, "ต้องมีผู้เล่นอย่างน้อย 2 คนจึงจะเริ่มได้", {
        fontSize: "10px",
        color: "#7db8e8",
        fontFamily: "Sarabun, sans-serif",
      })
      .setOrigin(0.5);

    // Connect to server
    this.connectToServer();
  }

  private async connectToServer(): Promise<void> {
    try {
      const room = await joinGame({
        nickname: this.lobbyData.nickname,
        character: this.lobbyData.character,
        nationality: this.lobbyData.nationality,
      });

      this.connected = true;
      this.statusText.setText(
        `เชื่อมต่อแล้ว! Room: ${room.roomId}\nConnected! Waiting for players...`
      );

      // Listen for state changes
      room.state.listen("phase", (phase: string) => {
        if (phase === "countdown") {
          this.statusText.setText("⏳ เตรียมตัว... Countdown!");
          this.statusText.setColor("#f5c842");
        }
        if (phase === "playing") {
          // Transition to game
          this.scene.start("OnlineGameScene", {
            ...this.lobbyData,
            room,
          });
        }
      });

      room.state.listen("countdownTimer", (count: number) => {
        if (room.state.phase === "countdown") {
          this.statusText.setText(`🕐 ${count}...`);
        }
      });

      // Listen for player changes
      room.state.players.onAdd((player: any, sessionId: string) => {
        this.updatePlayerList();
      });

      room.state.players.onRemove((player: any, sessionId: string) => {
        this.updatePlayerList();
      });

      // Handle disconnect
      room.onLeave((code) => {
        if (this.scene.isActive("LobbyScene")) {
          this.statusText.setText("❌ Disconnected. กลับหน้าหลัก...");
          this.time.delayedCall(2000, () => {
            this.scene.start("CharacterScene");
          });
        }
      });

      this.updatePlayerList();
    } catch (err) {
      console.error("Failed to connect:", err);
      this.statusText.setText(
        "❌ เชื่อมต่อไม่ได้\nCannot connect to server.\nTrying offline mode..."
      );
      this.statusText.setColor("#ff6b6b");

      // Fallback to offline mode after 2s
      this.time.delayedCall(2000, () => {
        this.scene.start("GameScene", this.lobbyData);
      });
    }
  }

  private toggleReady(): void {
    if (!this.connected) return;

    this.isReady = !this.isReady;
    sendReady();

    if (this.isReady) {
      this.readyButton.setFillStyle(0xf5c842, 1);
      this.readyLabel.setText("⏳ รอผู้เล่นอื่น...");
    } else {
      this.readyButton.setFillStyle(0x42e8b5, 1);
      this.readyLabel.setText("✅ พร้อม! / READY");
    }
  }

  private updatePlayerList(): void {
    const room = getCurrentRoom();
    if (!room) return;

    const lines: string[] = [];
    room.state.players.forEach((player: any, sessionId: string) => {
      const readyMark = player.ready ? "✅" : "⏳";
      const isMe = sessionId === room.sessionId ? " (คุณ)" : "";
      lines.push(
        `${readyMark} ${player.nationality} ${player.nickname}${isMe}`
      );
    });

    this.playerListText.setText(
      lines.length > 0 ? lines.join("\n") : "ยังไม่มีผู้เล่น..."
    );
  }
}
