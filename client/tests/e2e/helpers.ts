import { Page, expect } from "@playwright/test";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

/**
 * Wait until the Phaser canvas element is visible on the page.
 */
export async function waitForCanvas(page: Page, timeout = 10_000) {
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible({ timeout });
  return canvas;
}

/**
 * Get the canvas bounding box and scale factors relative to the 800x600 game.
 */
export async function getCanvasInfo(page: Page) {
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounding box not found");
  return {
    box,
    scaleX: box.width / GAME_WIDTH,
    scaleY: box.height / GAME_HEIGHT,
  };
}

/**
 * Click at game coordinates (800x600 space), accounting for canvas scale and position.
 */
export async function clickCanvas(page: Page, gameX: number, gameY: number) {
  const { box, scaleX, scaleY } = await getCanvasInfo(page);
  await page.mouse.click(box.x + gameX * scaleX, box.y + gameY * scaleY);
}

/**
 * Return the current active Phaser scene key via the exposed __PHASER_GAME__ global.
 * Returns null if the game instance is not exposed or no scene is active.
 */
export async function getPhaserSceneKey(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const game = (window as any).__PHASER_GAME__ as Phaser.Game | undefined;
    if (!game) return null;
    const active = game.scene.getScenes(true);
    return active.length > 0 ? active[0].scene.key : null;
  });
}

/**
 * Poll until the active Phaser scene matches the given key.
 * Throws if the scene does not appear within the timeout.
 */
export async function waitForPhaserScene(
  page: Page,
  sceneName: string,
  timeout = 15_000,
) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const key = await getPhaserSceneKey(page);
    if (key === sceneName) return;
    await page.waitForTimeout(250);
  }
  throw new Error(
    `Timed out waiting for Phaser scene "${sceneName}" (last seen: ${await getPhaserSceneKey(page)})`,
  );
}

/**
 * Evaluate an arbitrary expression path on the Phaser game instance.
 * Example: getGameObject(page, "scene.scenes[0].children.list.length")
 */
export async function getGameObject(page: Page, path: string): Promise<any> {
  return page.evaluate((p) => {
    const game = (window as any).__PHASER_GAME__;
    if (!game) return undefined;
    // Walk the path safely
    let obj: any = game;
    for (const key of p.split(".")) {
      const match = key.match(/^(\w+)\[(\d+)]$/);
      if (match) {
        obj = obj?.[match[1]]?.[Number(match[2])];
      } else {
        obj = obj?.[key];
      }
    }
    return obj;
  }, path);
}
