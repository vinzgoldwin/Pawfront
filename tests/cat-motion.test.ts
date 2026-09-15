import { test } from "node:test";
import assert from "node:assert/strict";
import { catMotion } from "../src/game/cat-motion";
import { createState, makeEnemy, restart, step } from "../src/game/simulation";
import { defaults } from "../src/game/save";

test("cosmetic head turns remain slight across every shooting direction", () => {
  for (let angle = -Math.PI; angle < Math.PI; angle += .05)
    for (let age = 0; age <= 1; age += .02) {
      const pose = catMotion(angle, age * 64, true, age, 2, false);
      assert.ok(Math.abs(pose.headTilt) < Math.PI / 36, "head tilt stays below five degrees");
      assert.ok(Math.abs(pose.headX) < 1 && Math.abs(pose.headY) < 1, "head stays attached to neck");
      assert.ok(Math.abs(pose.leftEar) < .25 && Math.abs(pose.rightEar) < .25);
    }
});

test("idle stops walking follow-through and reduced motion removes secondary animation", () => {
  assert.deepEqual(catMotion(0, 0, false, 1, 2, false), catMotion(0, 45, false, 1, 2, false));
  const still = catMotion(0, 0, false, 1, 0, true);
  for (let time = 0; time < 10; time += .1)
    assert.deepEqual(catMotion(time, time * 60, true, time % 1, time, true), still);
});

test("shooting follow-through starts without a jump and settles independently of fire rate", () => {
  const rest = catMotion(.8, 0, false, 1, 2, false);
  const start = catMotion(.8, 0, false, 0, 2, false);
  const kick = catMotion(.8, 0, false, .04, 2, false);
  const settled = catMotion(.8, 0, false, .6, 2, false);
  for (const key of Object.keys(rest) as (keyof typeof rest)[]) {
    assert.ok(Math.abs(rest[key] - start[key]) < .001);
    assert.ok(Math.abs(rest[key] - settled[key]) < .001);
  }
  assert.ok(Math.abs(kick.leftEar - rest.leftEar) > .05);
});

test("shot performance begins on an actual shot and a retry clears it", () => {
  const s = createState(defaults(), 7);
  s.nextSpawn = Infinity;
  const enemy = makeEnemy(s, "mushroom", s.player.x + 100, s.player.y);
  enemy.speed = 0;
  s.enemies.push(enemy);
  for (let i = 0; i < 60 && s.player.shotAge !== 0; i++) step(s, { x: 0, y: 0 });
  assert.equal(s.player.shotAge, 0);
  assert.ok(s.shots.length > 0);
  s.enemies.length = 0;
  for (let i = 0; i < 65; i++) step(s, { x: 0, y: 0 });
  assert.equal(s.player.shotAge, 1);
  s.player.shotAge = .04;
  restart(s);
  assert.equal(s.player.shotAge, 1);
});
