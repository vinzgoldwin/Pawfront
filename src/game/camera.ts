import { CONFIG, clamp } from "./config";
import type { Point } from "./geometry";

// Camera coordinates are the world point at the viewport's top-left corner.
const anchor = { x: CONFIG.width / 2, y: CONFIG.height * 0.6 };
export const createCamera = (player: Point): Point => ({
  x: player.x - anchor.x,
  y: player.y - anchor.y,
});
export const worldToScreen = (world: Point, camera: Point): Point => ({
  x: world.x - camera.x,
  y: world.y - camera.y,
});
export const screenToWorld = (screen: Point, camera: Point): Point => ({
  x: screen.x + camera.x,
  y: screen.y + camera.y,
});
export function followCamera(
  camera: Point,
  player: Point,
  dt: number,
  reduced: boolean,
) {
  const screen = worldToScreen(player, camera);
  const dx = screen.x - clamp(screen.x, anchor.x - 34, anchor.x + 34);
  const dy = screen.y - clamp(screen.y, anchor.y - 45, anchor.y + 45);
  const blend = reduced ? 1 : 1 - Math.exp(-Math.max(0, dt) / 0.12);
  camera.x += dx * blend;
  camera.y += dy * blend;
}
