import { test } from "node:test";
import assert from "node:assert/strict";
import { weaponPose, distance, facingSectorFor } from "../src/game/geometry";
import { WEAPONS } from "../src/game/assets";

const player = { x: 240, y: 350 };
test("gun surfaces turn toward targets independently of the viewer-facing cat", () => {
  for (const [x, y, expected] of [[1,0,"right"],[-1,0,"left"],[0,-1,"back"],[0,1,"front"]] as const) {
    const pose = weaponPose(player, "calico", "wood", { x: player.x + x * 150, y: player.y - 18 + y * 150 });
    assert.equal(pose.facingSector, expected);
  }
});
test("every gun stays in two short arms and its muzzle aims along the barrel", () => {
  for (const cat of ["orange", "calico", "cream"] as const)
    for (const weapon of ["wood", "coral", "fish"] as const)
      for (let degrees = 0; degrees < 360; degrees++) {
        const angle = degrees * Math.PI / 180;
        const target = { x: player.x + Math.cos(angle) * 150, y: player.y - 18 + Math.sin(angle) * 150 };
        const pose = weaponPose(player, cat, weapon, target);
        assert.ok(distance(pose.nearShoulder, pose.nearHand) <= 19, `${weapon} ${degrees}: trigger arm stretched`);
        assert.ok(distance(pose.farShoulder, pose.farHand) <= 21, `${weapon} ${degrees}: support arm stretched`);
        const dx = target.x - pose.muzzle.x, dy = target.y - pose.muzzle.y;
        assert.ok(Math.abs(dx * Math.sin(pose.angle) - dy * Math.cos(pose.angle)) < 1e-8);
        const w = WEAPONS[weapon];
        const authoredSpacing = Math.hypot((w.support[0] - w.grip[0]) * pose.width,
          (w.support[1] - w.grip[1]) * pose.height);
        assert.ok(Math.abs(distance(pose.nearHand, pose.farHand) - authoredSpacing) < 1e-8);
      }
});
test("idle pose preserves the last fired barrel angle", () => {
  for (let angle = -Math.PI; angle <= Math.PI; angle += Math.PI / 4) {
    const pose = weaponPose(player, "orange", "fish", null, angle);
    assert.equal(pose.angle, angle);
  }
});

test("turning across gun-view boundaries keeps physical hands and muzzle continuous", () => {
  for (const weapon of ["wood", "coral", "fish"] as const) {
    let previous = weaponPose({ ...player, gunSide: 1 }, "orange", weapon, null, -Math.PI);
    for (let i = 1; i <= 720; i++) {
      const pose = weaponPose({ ...player, gunSide: 1 }, "orange", weapon, null, -Math.PI + i * Math.PI / 360);
      assert.ok(distance(previous.grip, pose.grip) < .5);
      assert.ok(distance(previous.muzzle, pose.muzzle) < .8);
      previous = pose;
    }
  }
});
test("direction hysteresis and gun perspective keep the actor readable", () => {
  assert.equal(facingSectorFor(Math.PI / 4 + .05, "right"), "right");
  assert.equal(facingSectorFor(Math.PI / 4 + .2, "right"), "front");
  for (const weapon of ["wood", "coral", "fish"] as const) {
    const side = weaponPose(player, "cream", weapon, null, 0);
    const front = weaponPose(player, "cream", weapon, null, Math.PI / 2);
    const rear = weaponPose({...player, gunSide: 1}, "cream", weapon, null, -Math.PI / 2);
    assert.equal(front.height, side.height, "barrel cross-section remains rigid");
    assert.equal(front.width, side.width * .72);
    assert.ok(rear.muzzle.y > player.y - 24, "away muzzle stays below the chin");
    assert.equal(rear.width, side.width * .48);
  }
});

test("both anatomical shoulders stay on the torso through all aiming directions", () => {
  for (let angle = -Math.PI; angle < Math.PI; angle += .01) {
    const pose = weaponPose(player, "calico", "fish", null, angle);
    assert.equal(Math.abs(pose.nearShoulder.x - player.x), 10);
    assert.equal(pose.farShoulder.x + pose.nearShoulder.x, 2 * player.x);
    assert.equal(pose.nearShoulder.y, player.y - 21);
    assert.equal(pose.farShoulder.y, player.y - 21);
    assert.ok(pose.nearHand.y > player.y - 18 && pose.farHand.y > player.y - 24);
  }
});
