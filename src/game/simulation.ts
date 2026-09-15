import {
  CONFIG as C,
  costAt,
  damageFor,
  GUNS,
  MISSIONS,
  moneyAt,
  encounter,
  maxed,
  rateFor,
  safeValue,
  type EnemyKind,
  type Upgrade,
  type WeaponId,
  type MissionId,
} from "./config";
import {
  distance,
  segmentHit,
  weaponPose,
  aimingAngle,
  facingSectorFor,
  type FacingSector,
  type Point,
} from "./geometry";
import { clampWorld, routeFor, routeCenter } from "./world";
import type { Progress } from "./save";
// Keep turns on the short arc, including across the -π/π seam.
export const angleDelta = (current: number, target: number) =>
  Math.atan2(Math.sin(target - current), Math.cos(target - current));
export const turnAngle = (current: number, target: number, maximum: number) => {
  const delta = angleDelta(current, target);
  return current + Math.max(-maximum, Math.min(maximum, delta));
};
export interface Enemy extends Point {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  reward: number;
  attack: number;
  hit: number;
  stomp: number;
  windup: number;
  chips: number;
  dash: Point | null;
  dashTime: number;
  dashHit: boolean;
  ground: Point | null;
  walk: number;
  moving: boolean;
  angle: number;
  attackAngle: number;
  facingSector: FacingSector;
}
export interface Shot extends Point {
  vx: number;
  vy: number;
  damage: number;
  life: number;
}
export interface Spawn extends Point {
  kind: EnemyKind;
  remaining: number;
}
export interface Effect extends Point {
  kind: "hit" | "coin" | "shot" | "stomp" | "damage";
  life: number;
  total: number;
  value: number;
}
export type SoundEvent = "shot" | "hit" | "upgrade" | "defeat" | "clear";
export interface Pack {
  at: Point;
  activated: boolean;
  kinds: EnemyKind[];
  scheduled: number;
}
export interface State {
  progress: Progress;
  encounterStage: number;
  furthestX: number;
  player: Point & {
    hp: number;
    hit: number;
    moving: boolean;
    walk: number;
    gunSide: number;
    gunSideTarget: number;
    facingSector: FacingSector;
    angle: number;
    recoil: number;
    shotAge: number;
  };
  enemies: Enemy[];
  shots: Shot[];
  effects: Effect[];
  pending: Spawn[];
  schedule: EnemyKind[];
  packs: Pack[];
  phase: "active" | "clear" | "defeat";
  phaseTime: number;
  time: number;
  nextSpawn: number;
  scheduled: number;
  defeated: number;
  fireCooldown: number;
  target: number | null;
  seed: number;
  nextId: number;
  revision: number;
  sounds: SoundEvent[];
}
export function createState(progress: Progress, seed = 12345): State {
  const s: State = {
    encounterStage: progress.stage,
    furthestX: routeFor(progress.stage).start.x,
    progress: {
      ...progress,
      ownedWeapons: [...progress.ownedWeapons],
      stats: { ...progress.stats },
      missions: { ...progress.missions },
    },
    player: {
      ...routeFor(progress.stage).start,
      hp: C.player.health,
      hit: 0,
      moving: false,
      walk: 0,
      gunSide: 1,
      gunSideTarget: 1,
      facingSector: "right",
      angle: 0,
      recoil: 0,
      shotAge: 1,
    },
    enemies: [],
    shots: [],
    effects: [],
    pending: [],
    schedule: [],
    packs: [],
    phase: "active",
    phaseTime: 0,
    time: 0,
    nextSpawn: 0,
    scheduled: 0,
    defeated: 0,
    fireCooldown: 0,
    target: null,
    seed: seed >>> 0,
    nextId: 1,
    revision: 0,
    sounds: [],
  };
  restart(s);
  return s;
}
export function restart(s: State) {
  s.encounterStage = s.progress.stage;
  s.player = {
    ...routeFor(s.progress.stage).start,
    hp: C.player.health,
    hit: 0,
    moving: false,
    walk: 0,
    gunSide: 1,
    gunSideTarget: 1,
    facingSector: "right",
    angle: 0,
    recoil: 0,
    shotAge: 1,
  };
  s.enemies.length = s.shots.length = s.effects.length = s.pending.length = 0;
  s.schedule = encounter(s.progress.stage);
  s.packs = routeFor(s.encounterStage).encounters.map((at, index) => ({
    at,
    activated: false,
    scheduled: 0,
    kinds: s.schedule.filter(
      (kind, i) =>
        (kind === "boss"
          ? 2
          : Math.min(2, Math.floor((i * 3) / s.schedule.length))) === index,
    ),
  }));
  s.furthestX = s.player.x;
  s.scheduled = s.defeated = 0;
  s.phase = "active";
  s.phaseTime = 0;
  s.time = 0;
  s.nextSpawn = C.stage.initialDelay;
  s.fireCooldown = 0;
  s.target = null;
  s.revision++;
}
function random(s: State) {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
export function makeEnemy(
  s: State,
  kind: EnemyKind,
  x: number,
  y: number,
): Enemy {
  const b = C.enemies[kind],
    n = s.progress.stage - 1;
  const lateScale =
    (1 +
      Math.max(0, s.progress.stage - C.stage.lateHealthStart) *
        C.stage.lateHealthGrowth) **
    2;
  const hp = Math.round(
    safeValue(b.health * (1 + n * C.stage.healthGrowth) * lateScale),
  );
  return {
    id: s.nextId++,
    kind,
    x,
    y,
    hp,
    maxHp: hp,
    speed:
      b.speed * Math.min(C.stage.maxSpeedScale, 1 + n * C.stage.speedGrowth),
    radius: b.radius,
    damage: Math.round(safeValue(b.damage * (1 + n * C.stage.damageGrowth))),
    reward: Math.ceil(b.reward * (1 + n * C.stage.rewardGrowth)),
    attack: 0.6,
    hit: 0,
    stomp: 2,
    windup: 0,
    chips: 0,
    dash: null,
    dashTime: 0,
    dashHit: false,
    ground: null,
    walk: 0,
    moving: false,
    angle: Math.atan2(s.player.y - y, s.player.x - x),
    attackAngle: Math.atan2(s.player.y - y, s.player.x - x),
    facingSector: facingSectorFor(Math.atan2(s.player.y - y, s.player.x - x)),
  };
}
export function addEffect(
  s: State,
  kind: Effect["kind"],
  x: number,
  y: number,
  value = 0,
) {
  if (s.effects.length >= C.limits.particles) return;
  const life =
    kind === "coin"
      ? 1
      : kind === "damage"
        ? 0.7
        : kind === "stomp"
          ? 0.35
          : 0.16;
  s.effects.push({ kind, x, y, value, life, total: life });
}
function sound(s: State, event: SoundEvent) {
  if (s.sounds.length < 12) s.sounds.push(event);
}
export function purchase(
  s: State,
  kind: Upgrade,
  expectedLevel: number,
): boolean {
  const p = s.progress,
    level = p[kind],
    cost = costAt(kind, level);
  if (level !== expectedLevel || maxed(kind, level, p.weapon) || p.coins < cost)
    return false;
  p.coins -= cost;
  p[kind]++;
  p.stats.upgrades = safeValue(p.stats.upgrades + 1);
  if (kind === "rate")
    s.fireCooldown = Math.min(s.fireCooldown, 1 / rateFor(p));
  s.revision++;
  sound(s, "upgrade");
  return true;
}
export function buyWeapon(s: State, id: WeaponId): boolean {
  const p = s.progress;
  if (
    !Object.hasOwn(GUNS, id) ||
    p.ownedWeapons.includes(id) ||
    p.coins < GUNS[id].cost
  )
    return false;
  p.coins -= GUNS[id].cost;
  p.ownedWeapons.push(id);
  s.revision++;
  sound(s, "upgrade");
  return true;
}
export function equipWeapon(s: State, id: WeaponId): boolean {
  const p = s.progress;
  if (!p.ownedWeapons.includes(id) || p.weapon === id) return false;
  const remainingFraction = s.fireCooldown * rateFor(p);
  p.weapon = id;
  // Preserve reload progress: swapping to a faster gun and back cannot accelerate it.
  s.fireCooldown = remainingFraction / rateFor(p);
  s.revision++;
  return true;
}
export function missionStatus(p: Progress) {
  return (Object.keys(MISSIONS) as MissionId[]).map((id) => {
    const definition = MISSIONS[id],
      tier = p.missions[id];
    const target = safeValue(definition.base + definition.step * tier);
    const progress = Math.min(target, p.stats[definition.stat]);
    const reward = Math.round(safeValue(definition.reward * (1 + tier * 0.5)));
    return {
      id,
      tier,
      progress,
      target,
      reward,
      ready: progress >= target && tier < C.limits.value,
    };
  });
}
export function claimMission(
  s: State,
  id: MissionId,
  expectedTier: number,
): boolean {
  const mission = missionStatus(s.progress).find((m) => m.id === id);
  if (!mission || !mission.ready || mission.tier !== expectedTier) return false;
  s.progress.missions[id]++;
  // Mission rewards are the advertised fixed cash amount, not multiplied again.
  s.progress.coins = safeValue(s.progress.coins + mission.reward);
  addEffect(s, "coin", s.player.x, s.player.y - 45, mission.reward);
  s.revision++;
  sound(s, "upgrade");
  return true;
}
function earn(s: State, base: number, x: number, y: number) {
  const amount = Math.ceil(safeValue(base * moneyAt(s.progress.money)));
  s.progress.coins = safeValue(s.progress.coins + amount);
  addEffect(s, "coin", x, y, amount);
}
// A finite pack activates when the player travels to it. Spawn locations are
// selected inside the corridor, with warnings restarted if a player camps one.
function spawnPoint(s: State, anchor: Point, radius: number): Point {
  let best = clampWorld(anchor, s.encounterStage, radius),
    score = -Infinity;
  const rotation = random(s) * Math.PI * 2;
  for (let i = 0; i < 16; i++) {
    const angle = rotation + (i * Math.PI) / 8;
    const point = clampWorld(
      {
        x: anchor.x + Math.cos(angle) * 165,
        y: anchor.y + Math.sin(angle) * 150,
      },
      s.encounterStage,
      radius,
    );
    const d = distance(point, s.player);
    // Spread warnings without sacrificing the player safety distance.
    const overlap = s.pending.reduce(
      (sum, p) => sum + Math.max(0, 65 - distance(p, point)),
      0,
    );
    const value = Math.min(d, 220) - overlap;
    if (d >= C.stage.safeDistance && value > score) {
      best = point;
      score = value;
    }
  }
  if (score === -Infinity) {
    const route = routeFor(s.encounterStage);
    const x =
      s.player.x < (route.left + route.right) / 2
        ? route.right - radius
        : route.left + radius;
    best = { x, y: routeCenter(x) };
  }
  return best;
}
function scheduleSpawn(s: State) {
  for (const pack of s.packs)
    if (s.player.x >= pack.at.x - 170) pack.activated = true;
  if (
    s.scheduled >= s.schedule.length ||
    s.enemies.length + s.pending.length >= C.limits.enemies ||
    s.time < s.nextSpawn
  )
    return;
  const pack = s.packs.find((p) => p.activated && p.scheduled < p.kinds.length);
  if (!pack) return;
  const kind = pack.kinds[pack.scheduled++];
  const point = spawnPoint(s, pack.at, C.enemies[kind].radius);
  s.scheduled++;
  s.pending.push({ ...point, kind, remaining: C.stage.warning });
  s.nextSpawn =
    s.time +
    Math.max(
      C.stage.minSpawnInterval,
      C.stage.spawnInterval -
        (s.encounterStage - 1) * C.stage.spawnAcceleration,
    );
}
export function exitReady(s: State): boolean {
  return (
    s.defeated === s.schedule.length &&
    s.scheduled === s.schedule.length &&
    !s.pending.length &&
    !s.enemies.length
  );
}
export function completion(s: State): number {
  if (s.phase === "clear") return 1;
  const route = routeFor(s.encounterStage);
  const travel = Math.min(1, Math.max(0, (s.furthestX - route.start.x) / 1200));
  const partial = s.enemies.reduce(
    (sum, e) => sum + 1 - Math.max(0, e.hp) / e.maxHp,
    0,
  );
  return Math.min(
    0.99,
    (0.8 * (s.defeated + partial)) / Math.max(1, s.schedule.length) +
      0.2 * travel,
  );
}
export function objective(s: State): Point {
  const targets: Point[] = [...s.enemies.filter((e) => e.hp > 0), ...s.pending];
  if (targets.length)
    return targets.reduce((a, b) =>
      distance(s.player, a) < distance(s.player, b) ? a : b,
    );
  return (
    s.packs.find((p) => !p.activated || p.scheduled < p.kinds.length)?.at ??
    routeFor(s.encounterStage).exit
  );
}
export function nearest(s: State): Enemy | null {
  let result: Enemy | null = null;
  let best: number = C.player.range;
  for (const e of s.enemies) {
    const d = distance(e, s.player);
    if (e.hp > 0 && d <= best) {
      best = d;
      result = e;
    }
  }
  // Small distance hysteresis lets a turning barrel finish acquiring one of
  // several nearly equidistant enemies instead of changing targets each tick.
  const current = s.enemies.find((e) => e.id === s.target && e.hp > 0);
  if (
    current &&
    distance(current, s.player) <= Math.min(C.player.range, best + 12)
  )
    return current;
  return result;
}
// Reward removal is the sole death settlement path. Removed enemies cannot pay twice.
export function settle(s: State) {
  // A solo boss must still fund stronger retries. Each quarter-health milestone
  // pays once in this encounter; visual effects are never the reward authority.
  for (const e of s.enemies)
    if (e.kind === "boss") {
      const reached = Math.min(
        3,
        Math.floor(
          (1 - Math.max(0, e.hp) / e.maxHp) / C.boss.chipFraction + 1e-9,
        ),
      );
      if (reached > e.chips) {
        const amount =
          (reached - e.chips) * Math.ceil(e.reward * C.boss.chipRewardFraction);
        e.chips = reached;
        earn(s, amount, e.x, e.y - 35);
      }
    }
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];
    if (e.hp > 0) continue;
    earn(s, e.reward, e.x, e.y - 25);
    s.progress.stats.kills = safeValue(s.progress.stats.kills + 1);
    s.defeated++;
    s.enemies.splice(i, 1);
  }
  if (s.phase !== "active") return;
  if (
    exitReady(s) &&
    distance(s.player, routeFor(s.encounterStage).exit) <= 28
  ) {
    s.phase = "clear";
    s.phaseTime = C.stage.transition;
    s.progress.stage = Math.min(C.limits.stage, s.progress.stage + 1);
    s.progress.stats.stages = safeValue(s.progress.stats.stages + 1);
    s.revision++;
    sound(s, "clear");
  } else if (s.player.hp <= 0) {
    s.phase = "defeat";
    s.phaseTime = C.stage.defeat;
    s.revision++;
    sound(s, "defeat");
  }
}
export function step(s: State, movement: Point, dt = C.step) {
  s.sounds.length = 0;
  for (let i = s.effects.length - 1; i >= 0; i--) {
    s.effects[i].life -= dt;
    if (s.effects[i].life <= 0) s.effects.splice(i, 1);
  }
  s.player.hit = Math.max(0, s.player.hit - dt);
  s.player.recoil = Math.max(0, s.player.recoil - dt);
  s.player.shotAge = Math.min(1, s.player.shotAge + dt);
  if (s.phase !== "active") {
    s.player.moving = false;
    for (const e of s.enemies) e.moving = false;
    s.phaseTime -= dt;
    if (s.phaseTime <= 0) restart(s);
    return;
  }
  s.time += dt;
  const len = Math.hypot(movement.x, movement.y),
    scale = len > 1 ? 1 / len : 1;
  const previousX = s.player.x,
    previousY = s.player.y;
  Object.assign(
    s.player,
    clampWorld(
      {
        x: s.player.x + movement.x * scale * C.player.speed * dt,
        y: s.player.y + movement.y * scale * C.player.speed * dt,
      },
      s.encounterStage,
      C.player.radius,
    ),
  );
  const traveled = Math.hypot(s.player.x - previousX, s.player.y - previousY);
  s.player.moving = traveled > 0.001;
  s.player.walk += traveled;
  s.furthestX = Math.max(s.furthestX, s.player.x);
  scheduleSpawn(s);
  for (let i = s.pending.length - 1; i >= 0; i--) {
    const p = s.pending[i];
    p.remaining -= dt;
    if (p.remaining <= 0 && s.enemies.length < C.limits.enemies) {
      // A player can approach a warning; defer it until the spawn remains safe.
      if (distance(p, s.player) < C.stage.spawnSeparation) {
        Object.assign(p, spawnPoint(s, s.player, C.enemies[p.kind].radius));
        p.remaining = C.stage.warning;
        continue;
      }
      s.enemies.push(makeEnemy(s, p.kind, p.x, p.y));
      s.pending.splice(i, 1);
    }
  }
  const enemyPositions = s.enemies.map((e) => ({ x: e.x, y: e.y }));
  for (const e of s.enemies) {
    e.hit = Math.max(0, e.hit - dt);
    e.attack -= dt;
    const d = distance(e, s.player),
      contact = e.radius + C.player.radius + 3;
    const hurt = (damage: number) => {
      s.player.hp -= damage;
      s.player.hit = 0.18;
    };
    if (e.dashTime > 0 && e.dash) {
      const duration = Math.min(dt, e.dashTime);
      const intended = {
        x: e.x + e.dash.x * C.sprout.speed * duration,
        y: e.y + e.dash.y * C.sprout.speed * duration,
      };
      const end = clampWorld(intended, s.encounterStage, e.radius);
      // A committed dash stops at a wall instead of bending along its edge.
      if (distance(end, intended) > 1e-6) {
        e.dashTime = 0;
        e.dash = null;
        continue;
      }
      if (
        !e.dashHit &&
        segmentHit(e, end, s.player, C.sprout.width + C.player.radius) !== null
      ) {
        hurt(e.damage);
        e.dashHit = true;
      }
      Object.assign(e, end);
      e.dashTime = Math.max(0, e.dashTime - dt);
      if (e.dashTime === 0) e.dash = null;
      continue;
    }
    if (e.windup > 0) {
      e.windup -= dt;
      if (e.windup <= 0) {
        e.windup = 0;
        if (e.kind === "sprout") {
          e.dashTime = C.sprout.distance / C.sprout.speed;
          e.dashHit = false;
          e.stomp = C.sprout.interval;
        } else if (e.kind === "acorn" && e.ground) {
          if (distance(s.player, e.ground) < C.acorn.radius + C.player.radius)
            hurt(e.damage);
          addEffect(s, "stomp", e.ground.x, e.ground.y, C.acorn.radius);
          e.ground = null;
          e.stomp = C.acorn.interval;
        } else if (e.kind === "boss") {
          if (d < C.boss.radius + C.player.radius)
            hurt(
              C.boss.damage *
                (1 + (s.encounterStage - 1) * C.stage.damageGrowth),
            );
          addEffect(s, "stomp", e.x, e.y, C.boss.radius);
          e.stomp = C.boss.interval;
        }
      }
      continue;
    }
    e.stomp -= dt;
    if (e.kind === "sprout" && e.stomp <= 0 && d < 260) {
      e.dash = {
        x: (s.player.x - e.x) / (d || 1),
        y: (s.player.y - e.y) / (d || 1),
      };
      e.attackAngle = Math.atan2(e.dash.y, e.dash.x);
      e.windup = C.sprout.windup;
    } else if (e.kind === "acorn" && e.stomp <= 0 && d < C.acorn.range) {
      e.ground = { x: s.player.x, y: s.player.y };
      e.attackAngle = Math.atan2(e.ground.y - e.y, e.ground.x - e.x);
      e.windup = C.acorn.windup;
    } else if (e.kind === "boss" && e.stomp <= 0 && d < C.boss.radius + 55) {
      e.attackAngle = Math.atan2(s.player.y - e.y, s.player.x - e.x);
      e.windup = C.boss.windup;
    } else {
      const standOff = e.kind === "acorn" ? 155 : contact;
      if (d > standOff && d > 0) {
        const travel = Math.min(e.speed * dt, d - standOff);
        e.x += ((s.player.x - e.x) / d) * travel;
        e.y += ((s.player.y - e.y) / d) * travel;
      }
      if (d <= contact + 1e-6 && e.attack <= 0) {
        hurt(e.damage);
        e.attack = C.enemies[e.kind].interval;
      }
    }
  }
  // Gentle separation prevents enemies from becoming an unreadable single stack.
  for (let i = 0; i < s.enemies.length; i++)
    for (let j = i + 1; j < s.enemies.length; j++) {
      const a = s.enemies[i],
        b = s.enemies[j],
        d = distance(a, b),
        desired = (a.radius + b.radius) * 0.85;
      if (
        d > 0 &&
        d < desired &&
        !a.windup &&
        !b.windup &&
        !a.dashTime &&
        !b.dashTime
      ) {
        const push = Math.min((desired - d) / 2, 18 * dt),
          x = ((b.x - a.x) / d) * push,
          y = ((b.y - a.y) / d) * push;
        a.x -= x;
        a.y -= y;
        b.x += x;
        b.y += y;
      }
    }
  for (let i = 0; i < s.enemies.length; i++) {
    const e = s.enemies[i],
      previous = enemyPositions[i];
    Object.assign(e, clampWorld(e, s.encounterStage, e.radius));
    const dx = e.x - previous.x,
      dy = e.y - previous.y;
    const traveled = Math.hypot(dx, dy);
    e.moving = traveled > 0.001;
    e.walk += traveled;
    if (e.windup || e.dashTime)
      e.angle = turnAngle(e.angle, e.attackAngle, C.motion.enemyTurn * dt);
    else if (e.moving)
      e.angle = turnAngle(e.angle, Math.atan2(dy, dx), C.motion.enemyTurn * dt);
    e.facingSector = facingSectorFor(e.angle, e.facingSector);
  }
  const target = nearest(s);
  s.target = target?.id ?? null;
  s.fireCooldown = Math.max(0, s.fireCooldown - dt);
  const aim = target ? { x: target.x, y: target.y - 12 } : null;
  if (aim) {
    const desired = aimingAngle(
      s.player,
      s.progress.cat,
      s.progress.weapon,
      aim,
      s.player.angle,
    );
    s.player.angle = turnAngle(
      s.player.angle,
      desired,
      C.motion.playerTurn * dt,
    );
  } else if (s.player.moving) {
    s.player.angle = turnAngle(
      s.player.angle,
      Math.atan2(s.player.y - previousY, s.player.x - previousX),
      C.motion.playerTurn * dt,
    );
  }
  const horizontal = Math.cos(s.player.angle);
  if (Math.abs(horizontal) > 0.35)
    s.player.gunSideTarget = Math.sign(horizontal);
  s.player.gunSide +=
    (s.player.gunSideTarget - s.player.gunSide) * (1 - Math.exp(-dt / 0.12));
  s.player.facingSector = facingSectorFor(
    s.player.angle,
    s.player.facingSector,
  );
  if (aim) {
    const pose = weaponPose(
      s.player,
      s.progress.cat,
      s.progress.weapon,
      null,
      s.player.angle,
    );
    const forward = { x: Math.cos(pose.angle), y: Math.sin(pose.angle) };
    const ahead =
      (aim.x - pose.muzzle.x) * forward.x + (aim.y - pose.muzzle.y) * forward.y;
    // Turning is visible. Wait for the barrel rather than firing sideways or
    // reversing a projectile toward a point-blank target behind the muzzle.
    // A muzzle already inside the collision body can still resolve a forward hit.
    if (
      s.fireCooldown <= 0 &&
      Math.abs(
        angleDelta(
          s.player.angle,
          aimingAngle(
            s.player,
            s.progress.cat,
            s.progress.weapon,
            aim,
            s.player.angle,
          ),
        ),
      ) <= C.motion.aimTolerance &&
      (ahead > 0 ||
        distance(pose.muzzle, aim) <= target!.radius + C.shot.radius)
    ) {
      // At six shots/s and a 1.3s lifetime, fewer than nine can coexist.
      // If a test/debug state fills the pool, defer firing instead of losing a shot.
      if (s.shots.length < C.limits.projectiles) {
        s.shots.push({
          ...pose.muzzle,
          vx: forward.x * C.shot.speed,
          vy: forward.y * C.shot.speed,
          damage: damageFor(s.progress),
          life: C.shot.lifetime,
        });
        s.fireCooldown = 1 / rateFor(s.progress);
        s.player.recoil = 0.11;
        s.player.shotAge = 0;
        addEffect(s, "shot", pose.muzzle.x, pose.muzzle.y);
        sound(s, "shot");
      }
    }
  }
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const p = s.shots[i],
      end = { x: p.x + p.vx * dt, y: p.y + p.vy * dt };
    let victim: Enemy | null = null,
      best = Infinity;
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      const t = segmentHit(
        p,
        end,
        { x: e.x, y: e.y - 12 },
        e.radius + C.shot.radius,
      );
      if (t !== null && t < best) {
        best = t;
        victim = e;
      }
    }
    if (victim) {
      victim.hp -= p.damage;
      victim.hit = 0.13;
      addEffect(
        s,
        "hit",
        p.x + (end.x - p.x) * best,
        p.y + (end.y - p.y) * best,
      );
      addEffect(s, "damage", victim.x, victim.y - 40, p.damage);
      sound(s, "hit");
      s.shots.splice(i, 1);
    } else {
      p.x = end.x;
      p.y = end.y;
      p.life -= dt;
      if (p.life <= 0) s.shots.splice(i, 1);
    }
  }
  s.player.hp = Math.max(0, s.player.hp);
  settle(s);
}
