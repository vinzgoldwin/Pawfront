import { CONFIG, clamp } from "./config";
import type { Point } from "./geometry";

const startX = (stage: number) =>
  (clamp(Math.floor(stage), 1, CONFIG.limits.stage) - 1) * 1200;
export const routeCenter = (x: number) => 400 - CONFIG.terrain.slope * x;
export function routeFor(stage: number) {
  const x = startX(stage);
  return {
    start: { x, y: routeCenter(x) },
    exit: { x: x + 1200, y: routeCenter(x + 1200) },
    left: x - 60,
    right: x + 1260,
    halfWidth: 180,
    encounters: [230, 620, 1010].map((offset) => ({
      x: x + offset,
      y: routeCenter(x + offset),
    })),
  };
}
export function clampWorld(point: Point, stage: number, radius = 0): Point {
  const start = startX(stage);
  const x = clamp(point.x, start - 60 + radius, start + 1260 - radius);
  const center = routeCenter(x);
  return { x, y: clamp(point.y, center - 180 + radius, center + 180 - radius) };
}
