import Phaser from "phaser";

/**
 * Particle effects for Songkran Royale.
 * Uses Phaser 3.60+ particle system (scene.add.particles with texture key).
 */

/** Splash on hit — blue water droplets burst outward */
export function splashOnHit(scene: Phaser.Scene, x: number, y: number): void {
  const count = 8 + Math.floor(Math.random() * 5); // 8-12
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = 60 + Math.random() * 80;
    const size = 2 + Math.random() * 3;
    const particle = scene.add
      .circle(x, y, size, 0x3ab5f5, 0.9)
      .setDepth(25);

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed + 20, // gravity pull down
      alpha: 0,
      scale: 0.2,
      duration: 200,
      ease: "Power2",
      onComplete: () => particle.destroy(),
    });
  }
}

/** Shoot muzzle — small water spray forward from gun */
export function shootMuzzle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  angle: number
): void {
  const count = 4 + Math.floor(Math.random() * 3); // 4-6
  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * 0.6;
    const a = angle + spread;
    const speed = 20 + Math.random() * 30;
    const size = 1.5 + Math.random() * 2;
    const particle = scene.add
      .circle(x, y, size, 0x7dccf5, 0.8)
      .setDepth(25);

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(a) * speed,
      y: y + Math.sin(a) * speed,
      alpha: 0,
      scale: 0.3,
      duration: 100,
      ease: "Power1",
      onComplete: () => particle.destroy(),
    });
  }
}

/** Refill bubbles — rising bubbles when at water station */
export function refillBubbles(
  scene: Phaser.Scene,
  x: number,
  y: number
): void {
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const offsetX = (Math.random() - 0.5) * 20;
    const size = 1.5 + Math.random() * 2.5;
    const bubble = scene.add
      .circle(x + offsetX, y + 10, size, 0x8ee5ff, 0.6)
      .setDepth(25);

    scene.tweens.add({
      targets: bubble,
      y: y - 25 - Math.random() * 20,
      x: x + offsetX + (Math.random() - 0.5) * 12,
      alpha: 0,
      scale: 1.4,
      duration: 400 + Math.random() * 300,
      ease: "Sine.easeOut",
      onComplete: () => bubble.destroy(),
    });
  }
}

/** Elimination burst — big splash when player reaches 100% wet */
export function eliminationBurst(
  scene: Phaser.Scene,
  x: number,
  y: number
): void {
  const count = 20;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
    const speed = 40 + Math.random() * 120;
    const size = 2 + Math.random() * 4;
    const colors = [0x3ab5f5, 0x7dccf5, 0x8ee5ff, 0x1a6fb5];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const particle = scene.add
      .circle(x, y, size, color, 0.9)
      .setDepth(30);

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed + 40, // heavier gravity
      alpha: 0,
      scale: 0.1,
      duration: 500,
      ease: "Power3",
      onComplete: () => particle.destroy(),
    });
  }

  // Central flash ring
  const ring = scene.add.circle(x, y, 5, 0xffffff, 0.8).setDepth(30);
  scene.tweens.add({
    targets: ring,
    scale: 8,
    alpha: 0,
    duration: 400,
    ease: "Power2",
    onComplete: () => ring.destroy(),
  });
}

/** Ambient drips — occasional drip particles on players with high wet meter */
export function ambientDrips(
  scene: Phaser.Scene,
  x: number,
  y: number
): void {
  if (Math.random() > 0.15) return; // Only drip occasionally per frame call

  const offsetX = (Math.random() - 0.5) * 24;
  const drip = scene.add
    .circle(x + offsetX, y - 10, 1.5, 0x3ab5f5, 0.7)
    .setDepth(25);

  scene.tweens.add({
    targets: drip,
    y: y + 20 + Math.random() * 10,
    alpha: 0,
    duration: 350 + Math.random() * 200,
    ease: "Quad.easeIn",
    onComplete: () => drip.destroy(),
  });
}
