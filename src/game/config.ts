export type CatId = "orange" | "calico" | "cream";
export type EnemyKind = "mushroom" | "sprout" | "acorn" | "boss";
export type Upgrade = "damage" | "rate" | "money";
export type WeaponId = "wood" | "coral" | "fish";
export type MissionId = "hunt" | "train" | "travel";
export const GUNS = {
  wood: { name: "Wooden blaster", damage: 1, rate: 1, cost: 0 },
  coral: { name: "Coral cannon", damage: 1.7, rate: 0.72, cost: 90 },
  fish: { name: "Fish repeater", damage: 0.8, rate: 1.8, cost: 260 },
} as const;
export const MISSIONS = {
  hunt: { stat: "kills", base: 10, step: 20, reward: 18 },
  train: { stat: "upgrades", base: 5, step: 5, reward: 30 },
  travel: { stat: "stages", base: 3, step: 3, reward: 24 },
} as const;
export type Motion = "system" | "reduce" | "full";
export const CONFIG = {
  width: 480,
  height: 640,
  step: 1 / 60,
  maxSteps: 6,
  terrain: { slope: 0.35 },
  player: { health: 100, speed: 158, radius: 12, range: 190 },
  motion: {
    playerTurn: 10,
    enemyTurn: 7,
    aimTolerance: 0.05,
  },
  shot: { damage: 10, interval: 0.8, speed: 460, lifetime: 1.3, radius: 3 },
  upgrades: {
    damageGrowth: 1.24,
    rateGrowth: 1.14,
    maxRate: 6,
    damageCost: 12,
    rateCost: 12,
    damageCostGrowth: 1.38,
    rateCostGrowth: 1.5,
    moneyCost: 18,
    moneyCostGrowth: 1.6,
    moneyGain: 0.2,
    maxMoneyLevel: 25,
    maxLevel: 120,
    milestones: [5, 12],
  },
  enemies: {
    mushroom: {
      health: 32,
      speed: 55,
      radius: 13,
      damage: 10,
      interval: 1.15,
      reward: 2,
      size: 48,
    },
    sprout: {
      health: 25,
      speed: 74,
      radius: 11,
      damage: 8,
      interval: 0.95,
      reward: 2,
      size: 48,
    },
    acorn: {
      health: 56,
      speed: 29,
      radius: 17,
      damage: 18,
      interval: 1.5,
      reward: 5,
      size: 58,
    },
    boss: {
      health: 540,
      speed: 26,
      radius: 32,
      damage: 16,
      interval: 1.4,
      reward: 40,
      size: 112,
    },
  },
  stage: {
    baseCount: 9,
    countGrowth: 0.65,
    maxCount: 28,
    spawnInterval: 0.4,
    spawnAcceleration: 0.055,
    minSpawnInterval: 0.22,
    initialDelay: 0.5,
    warning: 1.0,
    safeDistance: 155,
    spawnSeparation: 85,
    rewardGrowth: 0.08,
    healthGrowth: 0.115,
    lateHealthGrowth: 0.1,
    lateHealthStart: 10,
    damageGrowth: 0.035,
    speedGrowth: 0.016,
    maxSpeedScale: 1.8,
    transition: 1.2,
    defeat: 1.25,
  },
  sprout: { windup: 1.1, distance: 240, speed: 440, interval: 3.8, width: 15 },
  acorn: { windup: 1.25, radius: 64, range: 280, interval: 3.8 },
  boss: {
    every: 10,
    windup: 1.35,
    radius: 95,
    interval: 4.5,
    damage: 32,
    chipFraction: 0.25,
    chipRewardFraction: 0.15,
  },
  limits: {
    enemies: 32,
    projectiles: 32,
    particles: 90,
    sounds: 5,
    value: 1e12,
    stage: 1e6,
  },
  checkpointSeconds: 5,
} as const;
export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
export const safeValue = (v: number) =>
  Math.min(CONFIG.limits.value, Math.max(0, Number.isNaN(v) ? 0 : v));
export const damageAt = (level: number) =>
  Math.round(
    safeValue(CONFIG.shot.damage * CONFIG.upgrades.damageGrowth ** level),
  );
export const rateAt = (level: number) =>
  Math.min(
    CONFIG.upgrades.maxRate,
    (1 / CONFIG.shot.interval) * CONFIG.upgrades.rateGrowth ** level,
  );
export const costAt = (kind: Upgrade, level: number) =>
  Math.ceil(
    safeValue(
      kind === "damage"
        ? CONFIG.upgrades.damageCost * CONFIG.upgrades.damageCostGrowth ** level
        : kind === "rate"
          ? CONFIG.upgrades.rateCost * CONFIG.upgrades.rateCostGrowth ** level
          : CONFIG.upgrades.moneyCost *
            CONFIG.upgrades.moneyCostGrowth ** level,
    ),
  );
export const maxed = (
  kind: Upgrade,
  level: number,
  weapon: WeaponId = "wood",
) =>
  level >= CONFIG.upgrades.maxLevel ||
  (kind === "rate" &&
    rateFor({ weapon, damage: 0, rate: level }) >= CONFIG.upgrades.maxRate) ||
  (kind === "damage" &&
    (damageFor({ weapon, damage: level, rate: 0 }) >= CONFIG.limits.value ||
      damageFor({ weapon, damage: level + 1, rate: 0 }) <=
        damageFor({ weapon, damage: level, rate: 0 }))) ||
  (kind === "money" && level >= CONFIG.upgrades.maxMoneyLevel);
// Used only to migrate v1 cosmetic milestones into owned guns.
export const weaponAt = (level: number) =>
  level >= CONFIG.upgrades.milestones[1]
    ? "fish"
    : level >= CONFIG.upgrades.milestones[0]
      ? "coral"
      : "wood";
const wholeFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const compactFormat = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
export const format = (value: number, digits = 0) =>
  (value >= 10000
    ? compactFormat
    : digits
      ? decimalFormat
      : wholeFormat
  ).format(value);
export function encounter(stage: number): EnemyKind[] {
  if (stage % CONFIG.boss.every === 0) return ["boss"];
  return Array.from(
    {
      length: Math.min(
        CONFIG.stage.maxCount,
        CONFIG.stage.baseCount +
          Math.floor((stage - 1) * CONFIG.stage.countGrowth),
      ),
    },
    (_, i) =>
      stage >= 5 && i % 5 === 4
        ? "acorn"
        : stage >= 3 && i % 3 === 2
          ? "sprout"
          : "mushroom",
  );
}

// Gun multipliers are visible choices; all firing still respects the shared cap.
type CombatProgress = { weapon: WeaponId; damage: number; rate: number };
export const damageFor = (p: CombatProgress) =>
  Math.round(safeValue(damageAt(p.damage) * GUNS[p.weapon].damage));
export const rateFor = (p: CombatProgress) =>
  Math.min(
    CONFIG.upgrades.maxRate,
    (1 / CONFIG.shot.interval) *
      CONFIG.upgrades.rateGrowth ** p.rate *
      GUNS[p.weapon].rate,
  );
export const moneyAt = (level: number) =>
  1 +
  clamp(level, 0, CONFIG.upgrades.maxMoneyLevel) * CONFIG.upgrades.moneyGain;
export const stageLabel = (stage: number) =>
  `${Math.floor((stage - 1) / 10) + 1}-${((stage - 1) % 10) + 1}`;
export const biomeFor = (stage: number): "forest" | "desert" | "frost" =>
  (["forest", "desert", "frost"] as const)[Math.floor((stage - 1) / 5) % 3];
