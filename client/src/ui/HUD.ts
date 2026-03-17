import Phaser from "phaser";

export class HUD {
  private scene: Phaser.Scene;

  // Wet meter (damage received)
  private wetMeterBg: Phaser.GameObjects.Rectangle;
  private wetMeterFill: Phaser.GameObjects.Rectangle;
  private wetMeterLabel: Phaser.GameObjects.Text;

  // Water tank (ammo)
  private waterTankBg: Phaser.GameObjects.Rectangle;
  private waterTankFill: Phaser.GameObjects.Rectangle;
  private waterTankLabel: Phaser.GameObjects.Text;

  // Timer
  private timerText: Phaser.GameObjects.Text;

  // Status text
  private statusText: Phaser.GameObjects.Text;

  // Refill indicator
  private refillIndicator: Phaser.GameObjects.Text;

  private readonly barWidth = 160;
  private readonly barHeight = 14;
  private readonly padding = 16;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const uiDepth = 100;
    const x = this.padding;
    const y = this.padding;

    // Wet Meter
    this.wetMeterLabel = scene.add
      .text(x, y, "💧 WET METER", {
        fontSize: "9px",
        color: "#7db8e8",
        fontFamily: "Kanit, sans-serif",
      })
      .setScrollFactor(0)
      .setDepth(uiDepth);

    this.wetMeterBg = scene.add
      .rectangle(x, y + 16, this.barWidth, this.barHeight, 0xffffff, 0.1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(uiDepth);

    this.wetMeterFill = scene.add
      .rectangle(x, y + 16, 0, this.barHeight, 0xff6b6b, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(uiDepth);

    // Water Tank
    const tankY = y + 42;
    this.waterTankLabel = scene.add
      .text(x, tankY, "🔫 WATER TANK", {
        fontSize: "9px",
        color: "#7db8e8",
        fontFamily: "Kanit, sans-serif",
      })
      .setScrollFactor(0)
      .setDepth(uiDepth);

    this.waterTankBg = scene.add
      .rectangle(x, tankY + 16, this.barWidth, this.barHeight, 0xffffff, 0.1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(uiDepth);

    this.waterTankFill = scene.add
      .rectangle(x, tankY + 16, this.barWidth, this.barHeight, 0x3ab5f5, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(uiDepth);

    // Timer (top center)
    this.timerText = scene.add
      .text(scene.scale.width / 2, this.padding, "3:00", {
        fontSize: "20px",
        color: "#f5c842",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(uiDepth);

    // Status text (center screen, hidden by default)
    this.statusText = scene.add
      .text(scene.scale.width / 2, scene.scale.height / 2, "", {
        fontSize: "28px",
        color: "#f5c842",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(uiDepth + 1)
      .setVisible(false);

    // Refill indicator
    this.refillIndicator = scene.add
      .text(scene.scale.width / 2, scene.scale.height - 60, "💧 REFILLING...", {
        fontSize: "14px",
        color: "#3ab5f5",
        fontFamily: "Kanit, sans-serif",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(uiDepth)
      .setVisible(false);
  }

  updateWetMeter(value: number): void {
    const w = (value / 100) * this.barWidth;
    this.wetMeterFill.setSize(w, this.barHeight);

    // Color shifts from green → yellow → red
    if (value < 40) {
      this.wetMeterFill.setFillStyle(0x42e8b5, 1);
    } else if (value < 70) {
      this.wetMeterFill.setFillStyle(0xf5c842, 1);
    } else {
      this.wetMeterFill.setFillStyle(0xff6b6b, 1);
    }

    this.wetMeterLabel.setText(`💧 WET ${Math.round(value)}%`);
  }

  updateWaterTank(value: number): void {
    const w = (value / 100) * this.barWidth;
    this.waterTankFill.setSize(w, this.barHeight);

    if (value < 20) {
      this.waterTankFill.setFillStyle(0xff6b6b, 1);
    } else {
      this.waterTankFill.setFillStyle(0x3ab5f5, 1);
    }

    this.waterTankLabel.setText(`🔫 WATER ${Math.round(value)}%`);
  }

  updateTimer(seconds: number): void {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    this.timerText.setText(`${m}:${s.toString().padStart(2, "0")}`);

    if (seconds <= 30) {
      this.timerText.setColor("#ff6b6b");
    }
  }

  showRefilling(visible: boolean): void {
    this.refillIndicator.setVisible(visible);
  }

  showStatus(text: string): void {
    this.statusText.setText(text).setVisible(true);
  }

  hideStatus(): void {
    this.statusText.setVisible(false);
  }
}
