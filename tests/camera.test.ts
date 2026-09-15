import test from "node:test";
import assert from "node:assert/strict";
import {
  createCamera,
  followCamera,
  screenToWorld,
  worldToScreen,
} from "../src/game/camera";

test("world and screen coordinates round trip far along the trail", () => {
  const p = { x: 1.2e9 + 13, y: -4.2e8 + 8 },
    c = createCamera(p),
    screen = worldToScreen(p, c);
  assert.deepEqual(screen, { x: 240, y: 384 });
  assert.deepEqual(screenToWorld(screen, c), p);
});
test("camera holds its dead zone and follows travel without rotating movement", () => {
  const camera = createCamera({ x: 0, y: 400 }),
    before = { ...camera };
  followCamera(camera, { x: 15, y: 410 }, 1 / 60, false);
  assert.deepEqual(camera, before);
  const player = { x: 220, y: 330 };
  for (let i = 0; i < 120; i++) followCamera(camera, player, 1 / 60, false);
  const screen = worldToScreen(player, camera);
  assert.ok(screen.x <= 274.01 && screen.y >= 338.99);
  assert.ok(camera.x > before.x + 180);
});
test("reduced motion removes camera easing, and zero elapsed time does not advance smoothing", () => {
  const camera = createCamera({ x: 0, y: 400 }),
    before = { ...camera };
  followCamera(camera, { x: 300, y: 220 }, 0, false);
  assert.deepEqual(camera, before);
  followCamera(camera, { x: 300, y: 220 }, 1 / 60, true);
  const screen = worldToScreen({ x: 300, y: 220 }, camera);
  assert.equal(screen.x, 274);
  assert.equal(screen.y, 339);
});
