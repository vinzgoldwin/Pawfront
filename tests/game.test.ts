import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIG,
  costAt,
  damageAt,
  damageFor,
  rateAt,
  rateFor,
  moneyAt,
  GUNS,
  stageLabel,
} from "../src/game/config";
import {
  createState,
  buyWeapon,
  equipWeapon,
  claimMission,
  missionStatus,
  makeEnemy,
  nearest,
  purchase,
  restart,
  settle,
  step,
  exitReady,
  completion,
  turnAngle,
  angleDelta,
} from "../src/game/simulation";
import {
  decode,
  defaults,
  SaveStore,
  SAVE_KEY,
  LEGACY_SAVE_KEY,
} from "../src/game/save";
import { segmentHit, weaponPose, aimingAngle } from "../src/game/geometry";
import { routeFor, routeCenter, clampWorld } from "../src/game/world";
const state = () => {
  const s = createState(defaults(), 7);
  Object.assign(s.player, { x: 240, y: 350 });
  s.nextSpawn = Infinity;
  return s;
};
test("only living targets in range are considered", () => {
  const s = state();
  const dead = makeEnemy(s, "mushroom", 240, 350);
  dead.hp = 0;
  const far = makeEnemy(s, "sprout", 438, 556);
  const alive = makeEnemy(s, "acorn", 250, 360);
  s.enemies = [dead, far, alive];
  assert.equal(nearest(s), alive);
  s.enemies = [dead, far];
  assert.equal(nearest(s), null);
  step(s, { x: 0, y: 0 });
  assert.equal(s.shots.length, 0);
});
test("swept collision catches crossing, starting inside, and misses", () => {
  assert.equal(
    segmentHit({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 0 }, 10),
    0.4,
  );
  assert.equal(
    segmentHit({ x: 50, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 0 }, 10),
    0,
  );
  assert.equal(
    segmentHit({ x: 0, y: 20 }, { x: 100, y: 20 }, { x: 50, y: 0 }, 10),
    null,
  );
});
test("projectile resolves one impact and one reward", () => {
  const s = state(),
    e = makeEnemy(s, "mushroom", 260, 350);
  s.enemies = [e];
  s.fireCooldown = 10;
  s.shots = [{ x: 240, y: 338, vx: 3000, vy: 0, damage: 100, life: 1 }];
  step(s, { x: 0, y: 0 });
  assert.equal(s.enemies.length, 0);
  assert.equal(s.shots.length, 0);
  assert.equal(s.progress.coins, 2);
  settle(s);
  assert.equal(s.progress.coins, 2);
});
test("purchases reject insufficient funds and stale duplicate actions atomically", () => {
  const s = state();
  assert.equal(purchase(s, "damage", 0), false);
  s.progress.coins = costAt("damage", 0);
  assert.equal(purchase(s, "damage", 0), true);
  assert.equal(s.progress.coins, 0);
  assert.equal(s.progress.damage, 1);
  s.progress.coins = 100;
  assert.equal(purchase(s, "damage", 0), false);
  assert.equal(s.progress.coins, 100);
  assert.ok(damageAt(1) > damageAt(0));
});
test("fire rate caps on every gun and stale max purchases do not spend", () => {
  for (const weapon of ["wood", "coral", "fish"] as const) {
    const s = state();
    s.progress.weapon = weapon;
    s.progress.rate = 120;
    s.progress.coins = 1e12;
    assert.equal(rateFor(s.progress), 6);
    assert.equal(purchase(s, "rate", 120), false);
    assert.equal(s.progress.coins, 1e12);
  }
  assert.equal(rateAt(120), 6);
});
test("empty arena does not clear while scheduled or pending enemies remain", () => {
  const s = state();
  settle(s);
  assert.equal(s.phase, "active");
  s.scheduled = s.schedule.length;
  s.defeated = s.schedule.length;
  s.pending = [{ kind: "mushroom", x: 42, y: 94, remaining: 1 }];
  settle(s);
  assert.equal(s.phase, "active");
});
test("simultaneous cat and final enemy deaths clear before defeat", () => {
  const s = state();
  Object.assign(s.player, routeFor(1).exit);
  s.schedule = ["mushroom"];
  s.scheduled = 1;
  const e = makeEnemy(s, "mushroom", s.player.x, s.player.y);
  e.hp = 10;
  e.attack = 0;
  s.enemies = [e];
  s.player.hp = 1;
  s.fireCooldown = 10;
  s.shots = [
    { x: s.player.x, y: s.player.y - 12, vx: 0, vy: 0, damage: 10, life: 1 },
  ];
  step(s, { x: 0, y: 0 });
  assert.equal(s.player.hp, 0);
  assert.equal(s.phase, "clear");
  assert.equal(s.progress.stage, 2);
  assert.equal(s.progress.coins, 2);
  for (let i = 0; i < 80; i++) step(s, { x: 0, y: 0 });
  assert.equal(s.phase, "active");
  assert.equal(s.player.hp, 100);
  assert.equal(s.enemies.length, 0);
});
test("defeat retry retains economy and resets encounter and inputs from callers", () => {
  const s = state();
  s.progress.coins = 25;
  s.progress.damage = 2;
  s.player.hp = 0;
  settle(s);
  assert.equal(s.phase, "defeat");
  for (let i = 0; i < 80; i++) step(s, { x: 0, y: 0 });
  assert.equal(s.progress.stage, 1);
  assert.equal(s.progress.coins, 25);
  assert.equal(s.progress.damage, 2);
  assert.equal(s.player.hp, 100);
  assert.equal(s.scheduled, 0);
  assert.equal(s.shots.length, 0);
  assert.equal(s.pending.length, 0);
});
test("enemy cap defers scheduled spawns", () => {
  const s = state();
  s.time = 5;
  s.enemies = Array.from({ length: CONFIG.limits.enemies }, () =>
    makeEnemy(s, "acorn", 42, 94),
  );
  step(s, { x: 0, y: 0 });
  assert.equal(s.scheduled, 0);
});
test("boss warning gives full windup and applies area damage once", () => {
  const s = state();
  s.progress.stage = 10;
  restart(s);
  const e = makeEnemy(s, "boss", s.player.x, s.player.y + 90);
  e.stomp = 0;
  s.enemies = [e];
  s.fireCooldown = 99;
  step(s, { x: 0, y: 0 });
  assert.equal(e.windup, CONFIG.boss.windup);
  for (let i = 0; i < 70; i++) step(s, { x: 0, y: 0 });
  assert.equal(s.player.hp, 100);
  for (let i = 0; i < 15; i++) step(s, { x: 0, y: 0 });
  const hp = s.player.hp;
  assert.ok(hp < 100);
  step(s, { x: 0, y: 0 });
  assert.equal(s.player.hp, hp);
});
test("boss area can be dodged during the warning", () => {
  const s = state(),
    e = makeEnemy(s, "boss", 240, 420);
  e.windup = CONFIG.boss.windup;
  s.enemies = [e];
  s.fireCooldown = 99;
  for (let i = 0; i < 90; i++) step(s, { x: 0, y: -1 });
  assert.equal(s.player.hp, 100);
});
test("movement normalizes diagonals and clamps collision body", () => {
  const a = state(),
    b = state();
  step(a, { x: 1, y: 0 });
  step(b, { x: 1, y: 1 });
  assert.ok(
    Math.abs(
      Math.hypot(b.player.x - 240, b.player.y - 350) - (a.player.x - 240),
    ) < 1e-8,
  );
  for (let i = 0; i < 600; i++) step(a, { x: 1, y: 0 });
  assert.equal(a.player.x, routeFor(1).right - CONFIG.player.radius);
});
test("all cat/weapon directional poses have finite muzzle positions", () => {
  for (const cat of ["orange", "calico", "cream"] as const)
    for (const weapon of ["wood", "coral", "fish"] as const)
      for (let a = 0; a < 8; a++) {
        const pose = weaponPose({ x: 240, y: 350 }, cat, weapon, {
          x: 240 + 100 * Math.cos((a * Math.PI) / 4),
          y: 350 + 100 * Math.sin((a * Math.PI) / 4),
        });
        assert.ok(
          Number.isFinite(pose.muzzle.x) && Number.isFinite(pose.muzzle.y),
        );
        assert.ok(
          Math.hypot(pose.muzzle.x - pose.grip.x, pose.muzzle.y - pose.grip.y) <
            40,
        );
      }
});
test("save rejects corrupt or future versions and validates unsafe fields", () => {
  for (const v of [null, "", "bad", "null", "[]", '{"version":3}'])
    assert.equal(decode(v), null);
  const v = decode(
    JSON.stringify({
      ...defaults(),
      coins: -1,
      damage: Infinity,
      stage: 0,
      cat: "bad",
      motion: "bad",
      rate: 1.5,
    }),
  );
  assert.deepEqual(v, defaults());
  assert.equal(
    decode(JSON.stringify({ ...defaults(), coins: 1e30 }))?.coins,
    0,
  );
});
test("save round trip restores progression, fresh health and encounter only", () => {
  let raw: string | null = null;
  const store = new SaveStore(() => ({
    getItem: () => raw,
    setItem: (_k, v) => {
      raw = v;
    },
  }));
  const p = {
    ...defaults(),
    stage: 12,
    coins: 98,
    damage: 5,
    cat: "cream" as const,
    motion: "reduce" as const,
  };
  assert.equal(store.save(p), true);
  assert.deepEqual(store.load(), p);
  const s = createState(store.load()!);
  assert.equal(s.player.hp, 100);
  assert.equal(s.enemies.length, 0);
  assert.equal(s.shots.length, 0);
});
test("denied storage and quota errors allow play without throwing", () => {
  const unavailable = new SaveStore(() => {
    throw Error("denied");
  });
  assert.equal(unavailable.load(), null);
  assert.equal(unavailable.save(defaults()), false);
  const quota = new SaveStore(() => ({
    getItem: () => null,
    setItem: () => {
      throw Error("quota");
    },
  }));
  assert.equal(quota.save(defaults()), false);
  assert.equal(quota.unavailable, true);
});
test("boss damage milestones fund retries without duplicate payouts", () => {
  const s = state(),
    e = makeEnemy(s, "boss", 240, 440);
  s.enemies = [e];
  e.hp = e.maxHp * 0.49;
  settle(s);
  const paid = s.progress.coins;
  assert.ok(paid > 0);
  settle(s);
  assert.equal(s.progress.coins, paid);
  e.hp = 0;
  settle(s);
  const total = s.progress.coins;
  assert.ok(total >= paid + e.reward);
  settle(s);
  assert.equal(s.progress.coins, total);
});

test("blocked movement stops walking animation", () => {
  const s = state();
  s.player.x = routeFor(1).right - CONFIG.player.radius;
  s.player.y = routeCenter(s.player.x);
  step(s, { x: 1, y: 0 });
  assert.equal(s.player.moving, false);
});
test("visual budgets never suppress rewards and full projectile pools defer firing", () => {
  const s = state();
  s.effects = Array.from({ length: CONFIG.limits.particles }, () => ({
    kind: "hit" as const,
    x: 0,
    y: 0,
    life: 1,
    total: 1,
    value: 0,
  }));
  const e = makeEnemy(s, "mushroom", 250, 350);
  e.hp = 0;
  s.enemies = [e];
  settle(s);
  assert.equal(s.progress.coins, 2);
  assert.equal(s.effects.length, CONFIG.limits.particles);
  const target = makeEnemy(s, "acorn", 250, 300);
  s.enemies = [target];
  s.player.angle = aimingAngle(
    s.player,
    s.progress.cat,
    s.progress.weapon,
    { x: target.x, y: target.y - 12 },
    0,
  );
  s.shots = Array.from({ length: CONFIG.limits.projectiles }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    damage: 10,
    life: 1,
  }));
  step(s, { x: 0, y: 0 });
  assert.equal(s.fireCooldown, 0);
  s.shots = [];
  step(s, { x: 0, y: 0 });
  assert.ok(s.fireCooldown > 0);
});
test("boss spawn respects the world corridor and collision radius", () => {
  for (let seed = 0; seed < 20; seed++) {
    const s = createState({ ...defaults(), stage: 10 }, seed);
    Object.assign(s.player, routeFor(10).encounters[2]);
    s.time = 3;
    step(s, { x: 0, y: 0 });
    const p = s.pending[0];
    assert.ok(p);
    assert.deepEqual(clampWorld(p, 10, CONFIG.enemies.boss.radius), {
      x: p.x,
      y: p.y,
    });
  }
});

test("Money improves even small enemy payouts and duplicate settlement does not repay", () => {
  const s = state();
  s.progress.coins = costAt("money", 0);
  assert.equal(purchase(s, "money", 0), true);
  assert.equal(purchase(s, "money", 0), false);
  assert.equal(moneyAt(1), 1.2);
  const e = makeEnemy(s, "mushroom", 240, 350);
  e.hp = 0;
  s.enemies = [e];
  settle(s);
  assert.equal(s.progress.coins, Math.ceil(e.reward * 1.2));
  assert.equal(s.progress.stats.kills, 1);
  settle(s);
  assert.equal(s.progress.stats.kills, 1);
  assert.equal(s.progress.coins, 3);
  s.progress.money = CONFIG.upgrades.maxMoneyLevel;
  s.progress.coins = 1e12;
  assert.equal(purchase(s, "money", CONFIG.upgrades.maxMoneyLevel), false);
});
test("gun purchases, equipment, stats and shot origin use the same gun", () => {
  const s = state();
  assert.equal(equipWeapon(s, "coral"), false);
  assert.equal(buyWeapon(s, "coral"), false);
  s.progress.coins = GUNS.coral.cost;
  assert.equal(buyWeapon(s, "coral"), true);
  assert.equal(s.progress.coins, 0);
  assert.equal(buyWeapon(s, "coral"), false);
  assert.equal(s.progress.weapon, "wood");
  assert.equal(equipWeapon(s, "coral"), true);
  assert.equal(equipWeapon(s, "coral"), false);
  assert.equal(damageFor(s.progress), 17);
  assert.ok(Math.abs(rateFor(s.progress) - 0.9) < 1e-8);
  const e = makeEnemy(s, "acorn", 240, 200);
  e.speed = 0;
  s.enemies = [e];
  s.player.angle = aimingAngle(
    s.player,
    s.progress.cat,
    "coral",
    { x: e.x, y: e.y - 12 },
    0,
  );
  const pose = weaponPose(
    s.player,
    s.progress.cat,
    "coral",
    null,
    s.player.angle,
  );
  step(s, { x: 0, y: 0 });
  assert.equal(s.shots[0].damage, 17);
  assert.ok(
    Math.abs(s.shots[0].x - s.shots[0].vx * CONFIG.step - pose.muzzle.x) < 1e-8,
  );
  assert.ok(Math.abs(s.fireCooldown - 1 / rateFor(s.progress)) < 1e-8);
});
test("mission claims reject unmet and stale tiers, persist once, and leave the next target visible", () => {
  const s = state();
  assert.equal(claimMission(s, "hunt", 0), false);
  s.progress.stats.kills = 50;
  const before = missionStatus(s.progress).find((m) => m.id === "hunt")!;
  assert.equal(before.ready, true);
  assert.equal(claimMission(s, "hunt", before.tier), true);
  assert.equal(s.progress.coins, before.reward);
  assert.equal(claimMission(s, "hunt", before.tier), false);
  const reloaded = createState(decode(JSON.stringify(s.progress))!);
  assert.equal(claimMission(reloaded, "hunt", before.tier), false);
  const next = missionStatus(reloaded.progress).find((m) => m.id === "hunt")!;
  assert.equal(next.tier, 1);
  assert.equal(next.target, 30);
  assert.equal(claimMission(reloaded, "hunt", next.tier), true);
  assert.equal(reloaded.progress.coins, before.reward + next.reward);
});
test("mission counters count only completed actions and stage settlement once", () => {
  const s = state();
  s.progress.coins = 20;
  purchase(s, "damage", 0);
  purchase(s, "damage", 0);
  assert.equal(s.progress.stats.upgrades, 1);
  s.schedule = ["mushroom"];
  s.scheduled = 1;
  Object.assign(s.player, routeFor(s.encounterStage).exit);
  const e = makeEnemy(s, "mushroom", 240, 350);
  e.hp = 0;
  s.enemies = [e];
  settle(s);
  settle(s);
  assert.equal(s.progress.stats.stages, 1);
  assert.equal(s.progress.stats.kills, 1);
});
test("legacy saves migrate earned appearances, economy and stage without losing progress", () => {
  const legacy = {
    version: 1,
    cat: "cream",
    coins: 123,
    damage: 12,
    rate: 4,
    stage: 25,
    muted: true,
    motion: "reduce",
  };
  const raw = JSON.stringify(legacy);
  const migrated = decode(raw)!;
  assert.equal(migrated.version, 2);
  assert.equal(migrated.coins, 123);
  assert.equal(migrated.weapon, "fish");
  assert.deepEqual(migrated.ownedWeapons, ["wood", "coral", "fish"]);
  assert.equal(migrated.stats.stages, 24);
  assert.equal(migrated.stats.upgrades, 16);
  const data = new Map([[LEGACY_SAVE_KEY, raw]]);
  const store = new SaveStore(() => ({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  }));
  assert.deepEqual(store.load(), migrated);
  store.save(defaults());
  assert.equal(store.load()?.stage, 1);
  assert.equal(data.get(LEGACY_SAVE_KEY), raw);
  data.set(SAVE_KEY, "corrupt");
  assert.equal(store.load(), null);
});
test("new save validates weapon ownership, mission counters and isolates mutable nested state", () => {
  const p = defaults();
  const s = createState(p);
  s.progress.ownedWeapons.push("coral");
  s.progress.stats.kills++;
  s.progress.missions.hunt++;
  assert.deepEqual(p, defaults());
  const decoded = decode(
    JSON.stringify({
      ...defaults(),
      weapon: "fish",
      ownedWeapons: ["coral", "coral", "invalid"],
      missions: { hunt: -1, train: Infinity, travel: 1.5 },
      stats: { kills: -1 },
      money: 500,
    }),
  )!;
  assert.equal(decoded.weapon, "wood");
  assert.deepEqual(decoded.ownedWeapons, ["wood", "coral"]);
  assert.deepEqual(decoded.missions, defaults().missions);
  assert.deepEqual(decoded.stats, defaults().stats);
  assert.equal(decoded.money, 0);
});
test("stage display counts ten substages per chapter and numeric caps remain finite", () => {
  assert.equal(stageLabel(1), "1-1");
  assert.equal(stageLabel(10), "1-10");
  assert.equal(stageLabel(11), "2-1");
  const s = state();
  s.progress.coins = 1e12;
  s.progress.money = 25;
  const e = makeEnemy(s, "boss", 240, 440);
  e.hp = 0;
  s.enemies = [e];
  settle(s);
  assert.equal(s.progress.coins, 1e12);
  assert.ok(Number.isFinite(damageFor({ ...s.progress, damage: 120 })));
});

test("movement and edge warnings follow the same diagonal ground band", () => {
  const s = createState(defaults());
  for (let i = 0; i < 300; i++) step(s, { x: -1, y: -1 });
  assert.equal(s.player.x, routeFor(1).left + CONFIG.player.radius);
  assert.equal(
    s.player.y,
    routeCenter(s.player.x) - 180 + CONFIG.player.radius,
  );
  for (let seed = 0; seed < 30; seed++) {
    const s = createState(defaults(), seed);
    Object.assign(s.player, routeFor(1).encounters[0]);
    s.time = 3;
    step(s, { x: 0, y: 0 });
    const p = s.pending[0];
    assert.ok(p);
    assert.deepEqual(clampWorld(p, 1, CONFIG.enemies[p.kind].radius), {
      x: p.x,
      y: p.y,
    });
    assert.ok(
      Math.hypot(p.x - s.player.x, p.y - s.player.y) >=
        CONFIG.stage.safeDistance,
    );
  }
});

test("boss warning respects minimum separation after sprite-safe inset", () => {
  for (let seed = 0; seed < 100; seed++) {
    const s = createState({ ...defaults(), stage: 10 }, seed);
    Object.assign(s.player, routeFor(10).encounters[2]);
    s.time = 3;
    step(s, { x: 0, y: 0 });
    for (const p of s.pending) {
      assert.ok(
        Math.hypot(p.x - s.player.x, p.y - s.player.y) >=
          CONFIG.stage.safeDistance,
      );
      assert.deepEqual(clampWorld(p, 10, CONFIG.enemies.boss.radius), {
        x: p.x,
        y: p.y,
      });
    }
    assert.equal(s.scheduled, s.pending.length);
  }
});
test("gun swaps preserve reload progress and cannot accelerate a slow gun", () => {
  const s = state();
  s.progress.ownedWeapons = ["wood", "coral", "fish"];
  s.progress.weapon = "coral";
  s.fireCooldown = 0.5 / rateFor(s.progress);
  const before = s.fireCooldown;
  equipWeapon(s, "fish");
  assert.ok(Math.abs(s.fireCooldown * rateFor(s.progress) - 0.5) < 1e-8);
  equipWeapon(s, "coral");
  assert.ok(Math.abs(s.fireCooldown - before) < 1e-8);
  s.fireCooldown = 0;
  equipWeapon(s, "wood");
  assert.equal(s.fireCooldown, 0);
});

test("Power rejects capped equipped damage without charging for unchanged shots", () => {
  for (const weapon of ["wood", "coral", "fish"] as const) {
    const s = state();
    s.progress.weapon = weapon;
    s.progress.coins = CONFIG.limits.value;
    while (
      s.progress.damage < CONFIG.upgrades.maxLevel &&
      damageFor({ ...s.progress, damage: s.progress.damage + 1 }) >
        damageFor(s.progress)
    )
      s.progress.damage++;
    assert.equal(purchase(s, "damage", s.progress.damage), false);
    assert.equal(s.progress.coins, CONFIG.limits.value);
    if (weapon === "coral") {
      assert.ok(s.progress.damage < CONFIG.upgrades.maxLevel);
      assert.equal(damageFor(s.progress), CONFIG.limits.value);
    }
  }
});

test("cleared encounter stage remains explicit at the progression cap", () => {
  const s = createState({ ...defaults(), stage: CONFIG.limits.stage });
  s.schedule = ["boss"];
  s.scheduled = 1;
  Object.assign(s.player, routeFor(s.encounterStage).exit);
  const boss = makeEnemy(s, "boss", 240, 440);
  boss.hp = 0;
  s.enemies = [boss];
  settle(s);
  assert.equal(s.phase, "clear");
  assert.equal(s.progress.stage, CONFIG.limits.stage);
  assert.equal(s.encounterStage, CONFIG.limits.stage);
  restart(s);
  assert.equal(s.encounterStage, CONFIG.limits.stage);
  const early = state();
  early.schedule = ["mushroom"];
  early.scheduled = 1;
  Object.assign(early.player, routeFor(early.encounterStage).exit);
  const enemy = makeEnemy(early, "mushroom", 240, 440);
  enemy.hp = 0;
  early.enemies = [enemy];
  settle(early);
  assert.equal(early.progress.stage, 2);
  assert.equal(early.encounterStage, 1);
  restart(early);
  assert.equal(early.encounterStage, 2);
});

test("standing at the route start cannot activate packs or advance", () => {
  const s = createState(defaults());
  for (let i = 0; i < 60 * 60; i++) step(s, { x: 0, y: 0 });
  assert.equal(s.scheduled, 0);
  assert.equal(s.progress.stage, 1);
  assert.deepEqual({ x: s.player.x, y: s.player.y }, routeFor(1).start);
  assert.equal(
    s.packs.some((p) => p.activated),
    false,
  );
});
test("travel activates three finite packs with simultaneous enemy pressure", () => {
  const s = createState(defaults());
  Object.assign(s.player, routeFor(1).encounters[0]);
  s.fireCooldown = 999;
  for (let i = 0; i < 150; i++) step(s, { x: 0, y: 0 });
  assert.equal(s.packs[0].activated, true);
  assert.equal(s.packs[1].activated, false);
  assert.equal(s.scheduled, s.packs[0].kinds.length);
  assert.ok(s.enemies.length >= 3);
  assert.equal(
    s.packs.reduce((sum, p) => sum + p.kinds.length, 0),
    s.schedule.length,
  );
});
test("all kills unlock the exit but clearing requires the player at the marker", () => {
  const s = createState(defaults());
  s.scheduled = s.defeated = s.schedule.length;
  settle(s);
  assert.equal(exitReady(s), true);
  assert.equal(s.phase, "active");
  assert.equal(s.progress.stage, 1);
  assert.ok(completion(s) < 1);
  Object.assign(s.player, routeFor(1).exit);
  settle(s);
  assert.equal(s.phase, "clear");
  assert.equal(completion(s), 1);
  assert.equal(s.progress.stage, 2);
  const previousExit = routeFor(s.encounterStage).exit;
  restart(s);
  assert.deepEqual({ x: s.player.x, y: s.player.y }, previousExit);
});
test("reaching the exit cannot bypass unactivated enemies", () => {
  const s = createState(defaults());
  Object.assign(s.player, routeFor(1).exit);
  settle(s);
  assert.equal(s.phase, "active");
  step(s, { x: 0, y: 0 });
  assert.equal(
    s.packs.every((p) => p.activated),
    true,
  );
  assert.ok(completion(s) < 1);
});
test("retry and reload discard route attempt while preserving v2 progression", () => {
  const s = createState({ ...defaults(), stage: 12, coins: 30 });
  s.player.x += 800;
  s.furthestX = s.player.x;
  s.player.hp = 0;
  settle(s);
  restart(s);
  const start = routeFor(12).start;
  assert.deepEqual({ x: s.player.x, y: s.player.y }, start);
  assert.equal(s.furthestX, start.x);
  assert.equal(s.progress.coins, 30);
  assert.equal(
    s.packs.some((p) => p.activated),
    false,
  );
  const reloaded = createState(decode(JSON.stringify(s.progress))!);
  assert.equal(reloaded.progress.version, 2);
  assert.deepEqual({ x: reloaded.player.x, y: reloaded.player.y }, start);
});
test("travel progress does not fall while dodging backward and stays below complete", () => {
  const s = createState(defaults());
  for (let i = 0; i < 20; i++) step(s, { x: 1, y: -0.35 });
  const progress = completion(s);
  for (let i = 0; i < 20; i++) step(s, { x: -1, y: 0.35 });
  assert.equal(completion(s), progress);
  s.furthestX = routeFor(1).exit.x;
  s.scheduled = s.defeated = s.schedule.length;
  assert.equal(completion(s), 0.99);
});
test("camping an expired warning relocates it with a full new warning", () => {
  const s = createState(defaults());
  const p = { ...s.player, kind: "mushroom" as const, remaining: 0 };
  s.pending = [p];
  s.nextSpawn = Infinity;
  step(s, { x: 0, y: 0 });
  assert.equal(s.enemies.length, 0);
  assert.equal(p.remaining, CONFIG.stage.warning);
  assert.ok(
    Math.hypot(p.x - s.player.x, p.y - s.player.y) >= CONFIG.stage.safeDistance,
  );
  for (let i = 0; i < 61; i++) step(s, { x: 0, y: 0 });
  assert.equal(s.pending.length, 0);
  assert.equal(s.enemies.length, 1);
});
test("sprout commits its dash direction for a full warning and damages once", () => {
  const s = state(),
    e = makeEnemy(s, "sprout", s.player.x - 100, s.player.y);
  e.stomp = 0;
  e.speed = 0;
  e.hp = e.maxHp = 999;
  s.enemies = [e];
  s.fireCooldown = 999;
  step(s, { x: 0, y: 0 });
  assert.equal(e.windup, CONFIG.sprout.windup);
  const direction = { ...e.dash! };
  for (let i = 0; i < 60; i++) step(s, { x: 0, y: 0 });
  assert.equal(s.player.hp, 100);
  assert.deepEqual(e.dash, direction);
  for (let i = 0; i < 45; i++) step(s, { x: 0, y: 0 });
  assert.equal(s.player.hp, 100 - e.damage);
});
test("moving perpendicular to a sprout warning escapes the committed dash", () => {
  const s = state(),
    e = makeEnemy(s, "sprout", s.player.x - 100, s.player.y);
  e.stomp = 0;
  e.hp = e.maxHp = 999;
  s.enemies = [e];
  s.fireCooldown = 999;
  step(s, { x: 0, y: 0 });
  const direction = { ...e.dash! };
  for (let i = 0; i < 60; i++) step(s, { x: 0, y: -1 });
  assert.deepEqual(e.dash, direction);
  for (let i = 0; i < 45; i++) step(s, { x: 0, y: 0 });
  assert.equal(s.player.hp, 100);
});
test("acorn captures a ground point for the full warning and permits a dodge", () => {
  for (const dodge of [false, true]) {
    const s = state(),
      e = makeEnemy(s, "acorn", s.player.x - 160, s.player.y);
    e.stomp = 0;
    e.hp = e.maxHp = 999;
    s.enemies = [e];
    s.fireCooldown = 999;
    step(s, { x: 0, y: 0 });
    assert.equal(e.windup, CONFIG.acorn.windup);
    const marked = { x: s.player.x, y: s.player.y };
    assert.deepEqual(e.ground, marked);
    for (let i = 0; i < 70; i++) step(s, { x: dodge ? 1 : 0, y: 0 });
    assert.equal(s.player.hp, 100);
    assert.deepEqual(e.ground, marked);
    for (let i = 0; i < 10; i++) step(s, { x: 0, y: 0 });
    assert.equal(s.player.hp, dodge ? 100 : 100 - e.damage);
    assert.equal(e.ground, null);
  }
});
test("world simulation stays finite and precise at the maximum saved stage", () => {
  const s = createState({ ...defaults(), stage: CONFIG.limits.stage });
  const before = { x: s.player.x, y: s.player.y };
  step(s, { x: 1, y: -0.35 });
  assert.ok(Number.isFinite(s.player.x) && Number.isFinite(s.player.y));
  assert.ok(
    Math.abs(
      Math.hypot(s.player.x - before.x, s.player.y - before.y) -
        CONFIG.player.speed * CONFIG.step,
    ) < 1e-6,
  );
});

test("committed sprout dash stops at the corridor wall without sliding", () => {
  const s = state();
  const e = makeEnemy(s, "sprout", 200, routeCenter(200) - 165);
  e.dash = { x: 0, y: -1 };
  e.dashTime = 0.5;
  s.enemies = [e];
  s.fireCooldown = 999;
  step(s, { x: 0, y: 0 });
  assert.equal(e.x, 200);
  assert.equal(e.y, routeCenter(200) - 165);
  assert.equal(e.dashTime, 0);
  assert.equal(e.dash, null);
});

test("walk phases measure actual movement and remain still at idle or a blocked wall", () => {
  const s = state();
  const e = makeEnemy(s, "mushroom", s.player.x + 180, s.player.y);
  s.enemies = [e];
  s.fireCooldown = 999;
  step(s, { x: 1, y: 0 });
  assert.ok(Math.abs(s.player.walk - CONFIG.player.speed * CONFIG.step) < 1e-8);
  assert.ok(Math.abs(e.walk - e.speed * CONFIG.step) < 1e-8);
  assert.equal(e.moving, true);
  const catWalk = s.player.walk;
  e.speed = 0;
  const enemyWalk = e.walk;
  step(s, { x: 0, y: 0 });
  assert.equal(s.player.walk, catWalk);
  assert.equal(e.walk, enemyWalk);
  assert.equal(e.moving, false);
  Object.assign(s.player, {
    x: routeFor(1).right - CONFIG.player.radius,
    y: routeCenter(routeFor(1).right - CONFIG.player.radius),
  });
  step(s, { x: 1, y: 0 });
  assert.equal(s.player.walk, catWalk);
  assert.equal(s.player.moving, false);
});
test("enemy facing turns with pursuit then holds the captured attack direction", () => {
  const s = state(),
    e = makeEnemy(s, "sprout", s.player.x - 120, s.player.y);
  e.angle = Math.PI;
  e.stomp = 0;
  e.hp = e.maxHp = 999;
  s.enemies = [e];
  s.fireCooldown = 999;
  step(s, { x: 0, y: 0 });
  const captured = e.attackAngle;
  assert.ok(
    Math.abs(angleDelta(Math.PI, e.angle)) <=
      CONFIG.motion.enemyTurn * CONFIG.step + 1e-8,
  );
  assert.equal(captured, 0);
  for (let i = 0; i < 50; i++) step(s, { x: 0, y: -1 });
  assert.equal(e.attackAngle, captured);
  assert.ok(Math.abs(angleDelta(e.angle, captured)) < 1e-8);
  assert.equal(e.walk, 0);
  assert.equal(e.moving, false);
  assert.equal(e.facingSector, "right");
});
test("shortest arc aiming crosses the angle seam without spinning around", () => {
  const start = Math.PI - 0.02,
    end = -Math.PI + 0.02;
  assert.ok(Math.abs(angleDelta(start, end) - 0.04) < 1e-8);
  assert.ok(Math.abs(turnAngle(start, end, 0.01) - (start + 0.01)) < 1e-8);
  assert.ok(Math.abs(angleDelta(turnAngle(start, end, 1), end)) < 1e-8);
  const s = state(),
    e = makeEnemy(s, "acorn", s.player.x - 160, s.player.y);
  e.speed = 0;
  s.enemies = [e];
  s.player.angle = start;
  step(s, { x: 0, y: 0 });
  assert.ok(
    Math.abs(angleDelta(start, s.player.angle)) <=
      CONFIG.motion.playerTurn * CONFIG.step + 1e-8,
  );
});
test("firing waits for the turning barrel and emitted shots travel forward along it", () => {
  const s = state(),
    e = makeEnemy(s, "acorn", s.player.x - 160, s.player.y);
  e.speed = 0;
  s.enemies = [e];
  step(s, { x: 0, y: 0 });
  assert.equal(s.shots.length, 0);
  assert.equal(s.fireCooldown, 0);
  assert.ok(
    Math.abs(s.player.angle) <= CONFIG.motion.playerTurn * CONFIG.step + 1e-8,
  );
  for (let i = 0; i < 45 && !s.shots.length; i++) step(s, { x: 0, y: 0 });
  assert.ok(s.shots.length > 0);
  const shot = s.shots[0];
  assert.ok(
    Math.abs(angleDelta(s.player.angle, Math.atan2(shot.vy, shot.vx))) < 1e-8,
  );
  const pose = weaponPose(
    s.player,
    s.progress.cat,
    s.progress.weapon,
    null,
    s.player.angle,
  );
  assert.ok(Math.abs(shot.x - shot.vx * CONFIG.step - pose.muzzle.x) < 1e-8);
  assert.ok(Math.abs(shot.y - shot.vy * CONFIG.step - pose.muzzle.y) < 1e-8);
});
test("point blank targets never cause reverse shots from the muzzle", () => {
  const s = state(),
    e = makeEnemy(s, "acorn", s.player.x + 10, s.player.y - 4);
  e.speed = 0;
  e.radius = 1;
  e.attack = 999;
  e.stomp = 999;
  s.enemies = [e];
  for (let i = 0; i < 30; i++) {
    const previousCooldown = s.fireCooldown;
    step(s, { x: 0, y: 0 });
    if (s.fireCooldown > previousCooldown) {
      const pose = weaponPose(
        s.player,
        s.progress.cat,
        s.progress.weapon,
        null,
        s.player.angle,
      );
      assert.ok(
        (e.x - pose.muzzle.x) * Math.cos(pose.angle) +
          (e.y - 12 - pose.muzzle.y) * Math.sin(pose.angle) >
          0,
      );
    }
  }
  assert.equal(s.shots.length, 0);
  assert.equal(s.fireCooldown, 0);
});
test("non-active encounters freeze actor travel animation", () => {
  const s = state(),
    e = makeEnemy(s, "mushroom", s.player.x + 100, s.player.y);
  s.enemies = [e];
  s.fireCooldown = 999;
  step(s, { x: 1, y: 0 });
  const before = { cat: s.player.walk, enemy: e.walk, angle: e.angle };
  s.phase = "defeat";
  s.phaseTime = 1;
  step(s, { x: 1, y: 0 });
  assert.deepEqual(
    { cat: s.player.walk, enemy: e.walk, angle: e.angle },
    before,
  );
  assert.equal(s.player.moving, false);
  assert.equal(e.moving, false);
});

test("unopposed travel turns the cat toward movement and idle preserves that heading", () => {
  const s = state();
  for (let i = 0; i < 30; i++) step(s, { x: 0, y: -1 });
  assert.ok(Math.abs(angleDelta(s.player.angle, -Math.PI / 2)) < 1e-8);
  assert.equal(s.player.facingSector, "back");
  const before = { walk: s.player.walk, angle: s.player.angle };
  for (let i = 0; i < 20; i++) step(s, { x: 0, y: 0 });
  assert.deepEqual({ walk: s.player.walk, angle: s.player.angle }, before);
  assert.equal(s.shots.length, 0);
});

test("nearly tied targets keep a smooth acquisition but a clearly closer foe wins", () => {
  const s = state();
  const first = makeEnemy(s, "mushroom", s.player.x + 100, s.player.y);
  const second = makeEnemy(s, "mushroom", s.player.x + 99, s.player.y);
  s.enemies = [first, second];
  s.target = first.id;
  assert.equal(nearest(s), first);
  second.x = s.player.x + 80;
  assert.equal(nearest(s), second);
  first.hp = 0;
  assert.equal(nearest(s), second);
});
test("a forward muzzle already inside an enemy still resolves point-blank damage", () => {
  const s = state(),
    e = makeEnemy(s, "mushroom", s.player.x + 16, s.player.y - 2);
  e.speed = 0;
  e.attack = 999;
  e.hp = 999;
  s.enemies = [e];
  const aim = { x: e.x, y: e.y - 12 };
  s.player.angle = aimingAngle(
    s.player,
    s.progress.cat,
    s.progress.weapon,
    aim,
    0,
  );
  const pose = weaponPose(
    s.player,
    s.progress.cat,
    s.progress.weapon,
    null,
    s.player.angle,
  );
  assert.ok(
    (aim.x - pose.muzzle.x) * Math.cos(pose.angle) +
      (aim.y - pose.muzzle.y) * Math.sin(pose.angle) <
      0,
  );
  step(s, { x: 0, y: 0 });
  assert.equal(e.hp, 999 - damageFor(s.progress));
  assert.ok(s.fireCooldown > 0);
});
test("floating-point contact boundaries do not create invulnerable stationary cats", () => {
  const s = state(),
    e = makeEnemy(
      s,
      "mushroom",
      s.player.x +
        CONFIG.enemies.mushroom.radius +
        CONFIG.player.radius +
        3 +
        1e-10,
      s.player.y,
    );
  e.speed = 0;
  e.attack = 0;
  s.enemies = [e];
  s.fireCooldown = 999;
  step(s, { x: 0, y: 0 });
  assert.equal(s.player.hp, CONFIG.player.health - e.damage);
});

test("upward belly hold fires without waiting for a lifted shoulder", () => {
  const s = state();
  const enemy = makeEnemy(s, "mushroom", 240, 210);
  enemy.speed = 0;
  enemy.hp = enemy.maxHp = 1000;
  s.enemies = [enemy];
  Object.assign(s.player, { angle: -Math.PI / 2, facingSector: "back", gunSide: 0.2, gunSideTarget: 1 });
  for (let i = 0; i < 10; i++) step(s, { x: 0, y: 0 });
  assert.ok(s.shots.length > 0 || enemy.hp < enemy.maxHp);
});
