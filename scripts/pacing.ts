import {
  CONFIG,
  GUNS,
  costAt,
  damageFor,
  rateFor,
  maxed,
  type WeaponId,
} from "../src/game/config";
import {
  createState,
  buyWeapon,
  equipWeapon,
  claimMission,
  missionStatus,
  purchase,
  step,
  type State,
  objective,
  makeEnemy,
} from "../src/game/simulation";
import { defaults } from "../src/game/save";
import { clampWorld, routeFor } from "../src/game/world";
import { distance, segmentHit, type Point } from "../src/game/geometry";
export type Strategy = "stationary" | "route" | "avoid";
export function movement(s: State, strategy: Strategy, _time: number): Point {
  if (strategy === "stationary") return { x: 0, y: 0 };
  const goal = objective(s);
  if (strategy === "route") {
    const d = distance(s.player, goal) || 1;
    if ((s.enemies.length || s.pending.length) && d < 115)
      return { x: 0, y: 0 };
    return { x: (goal.x - s.player.x) / d, y: (goal.y - s.player.y) / d };
  }
  let best = { x: 0, y: 0 },
    score = -Infinity;
  for (let i = -1; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    const v = i === -1 ? { x: 0, y: 0 } : { x: Math.cos(a), y: Math.sin(a) };
    const p = { x: s.player.x + v.x * 55, y: s.player.y + v.y * 55 };
    const clamped = clampWorld(p, s.encounterStage, CONFIG.player.radius + 8);
    if (distance(p, clamped) > 1) continue;
    let value =
      s.enemies.length || s.pending.length
        ? -Math.abs(distance(p, goal) - 130) * 0.08
        : -distance(p, goal) * 0.12;
    for (const e of s.enemies) {
      const d = distance(p, e);
      value -= 14000 / (d * d + 100);
      if (e.kind === "boss" && e.windup > 0 && d < CONFIG.boss.radius + 28)
        value -= 100;
      if (e.ground && distance(p, e.ground) < CONFIG.acorn.radius + 25)
        value -= 100;
      if (e.dash) {
        const end = {
          x: e.x + e.dash.x * CONFIG.sprout.distance,
          y: e.y + e.dash.y * CONFIG.sprout.distance,
        };
        if (segmentHit(e, end, p, CONFIG.sprout.width + 28) !== null)
          value -= 100;
      }
    }
    for (const pnd of s.pending) value -= 4000 / (distance(p, pnd) ** 2 + 100);
    if (value > score) {
      score = value;
      best = v;
    }
  }
  return best;
}
const timestamp = (value: number | null) => value?.toFixed(1);
export function run(strategy: Strategy, seed: number, seconds = 600) {
  const s = createState(defaults(), seed);
  let firstUpgrade: number | null = null,
    firstBoss: number | null = null,
    bossClear: number | null = null,
    firstMission: number | null = null,
    firstMoney: number | null = null,
    coralAt: number | null = null,
    fishAt: number | null = null,
    retries = 0,
    earned = 0,
    purchases = 0,
    failedEarnings: number[] = [];
  let attemptEarned = 0,
    phase = s.phase;
  let maxEnemies = 0,
    maxShots = 0;
  for (let tick = 0; tick < seconds * 60; tick++) {
    const time = tick / 60,
      before = s.progress.coins;
    step(s, movement(s, strategy, time));
    earned += s.progress.coins - before;
    attemptEarned += s.progress.coins - before;
    if (s.phase !== phase) {
      if (s.phase === "defeat") {
        retries++;
        failedEarnings.push(attemptEarned);
      }
      if (s.phase === "active") attemptEarned = 0;
      phase = s.phase;
    }
    if (s.progress.stage === 10 && s.phase === "active" && firstBoss === null)
      firstBoss = time;
    if (s.progress.stage === 11 && bossClear === null) bossClear = time;
    // Claim completed missions; buy the cheapest next upgrade or unowned gun.
    // Equip the owned gun with the highest current damage per second.
    for (const mission of missionStatus(s.progress))
      if (mission.ready && claimMission(s, mission.id, mission.tier)) {
        firstMission ??= time;
        earned += mission.reward;
      }
    const choices = [
      ...(["damage", "rate", "money"] as const)
        .filter((kind) => !maxed(kind, s.progress[kind], s.progress.weapon))
        .map((kind) => ({
          cost: costAt(kind, s.progress[kind]),
          buy: () => {
            const bought = purchase(s, kind, s.progress[kind]);
            if (bought) {
              firstUpgrade ??= time;
              purchases++;
              if (kind === "money") firstMoney ??= time;
            }
            return bought;
          },
        })),
      ...(["coral", "fish"] as WeaponId[])
        .filter((id) => !s.progress.ownedWeapons.includes(id))
        .map((id) => ({
          cost: GUNS[id].cost,
          buy: () => {
            const bought = buyWeapon(s, id);
            if (bought && id === "coral") coralAt ??= time;
            if (bought && id === "fish") fishAt ??= time;
            return bought;
          },
        })),
    ].sort((a, b) => a.cost - b.cost);
    for (const choice of choices) choice.buy();
    const bestGun = s.progress.ownedWeapons.reduce((best, weapon) => {
      const candidate = { ...s.progress, weapon },
        previous = { ...s.progress, weapon: best };
      return damageFor(candidate) * rateFor(candidate) >
        damageFor(previous) * rateFor(previous)
        ? weapon
        : best;
    }, s.progress.weapon);
    equipWeapon(s, bestGun);
    maxEnemies = Math.max(maxEnemies, s.enemies.length);
    maxShots = Math.max(maxShots, s.shots.length);
  }
  return {
    strategy,
    seed,
    seconds,
    firstUpgrade: timestamp(firstUpgrade),
    firstBoss: timestamp(firstBoss),
    bossClear: timestamp(bossClear),
    firstMission: timestamp(firstMission),
    firstMoney: timestamp(firstMoney),
    coralAt: timestamp(coralAt),
    fishAt: timestamp(fishAt),
    stage: s.progress.stage,
    retries,
    earned,
    purchases,
    damageLevel: s.progress.damage,
    rateLevel: s.progress.rate,
    moneyLevel: s.progress.money,
    weapon: s.progress.weapon,
    ownedWeapons: s.progress.ownedWeapons,
    failedEarnings,
    maxEnemies,
    maxShots,
  };
}
if (process.argv[1]?.endsWith("pacing.ts"))
  for (const strategy of ["stationary", "route", "avoid"] as const)
    for (const seed of [7, 42, 2026])
      console.log(JSON.stringify(run(strategy, seed)));

// Matched combat uses identical stage, stats, seed and simultaneous attackers.
// It isolates dodging from the deliberate no-travel/no-activation control.
export function matchedCombat(strategy: "stationary" | "avoid", seed: number) {
  const s = createState({ ...defaults(), stage: 5, damage: 2, rate: 1 }, seed);
  Object.assign(s.player, routeFor(5).encounters[1]);
  s.nextSpawn = Infinity;
  const kinds = [
    "mushroom",
    "mushroom",
    "mushroom",
    "sprout",
    "sprout",
    "acorn",
  ] as const;
  s.schedule = [...kinds];
  s.scheduled = kinds.length;
  s.enemies = kinds.map((kind, i) => {
    const angle = ((i + seed / 100) * Math.PI) / 3;
    const p = clampWorld(
      {
        x: s.player.x + Math.cos(angle) * 170,
        y: s.player.y + Math.sin(angle) * 140,
      },
      5,
      CONFIG.enemies[kind].radius,
    );
    return makeEnemy(s, kind, p.x, p.y);
  });
  let tick = 0;
  while (tick < 60 * 60 && s.phase === "active" && s.enemies.length) {
    step(s, movement(s, strategy, tick / 60));
    tick++;
  }
  return {
    strategy,
    seed,
    seconds: (tick / 60).toFixed(1),
    hp: Math.round(s.player.hp),
    kills: s.defeated,
    survived: s.player.hp > 0,
    cleared: s.enemies.length === 0,
  };
}
if (process.argv[1]?.endsWith("pacing.ts"))
  for (const seed of [7, 42, 2026])
    for (const strategy of ["stationary", "avoid"] as const)
      console.log(
        JSON.stringify({ matchedCombat: matchedCombat(strategy, seed) }),
      );
