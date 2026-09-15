import {
  CONFIG,
  GUNS,
  weaponAt,
  type CatId,
  type Motion,
  type WeaponId,
  type MissionId,
} from "./config";
export interface Progress {
  version: 2;
  cat: CatId;
  coins: number;
  damage: number;
  rate: number;
  money: number;
  weapon: WeaponId;
  ownedWeapons: WeaponId[];
  stats: { kills: number; upgrades: number; stages: number };
  missions: Record<MissionId, number>;
  stage: number;
  muted: boolean;
  motion: Motion;
}
export const SAVE_KEY = "pawfront.progress.v2";
export const LEGACY_SAVE_KEY = "pawfront.progress.v1";
export const defaults = (): Progress => ({
  version: 2,
  cat: "orange",
  coins: 0,
  damage: 0,
  rate: 0,
  money: 0,
  weapon: "wood",
  ownedWeapons: ["wood"],
  stats: { kills: 0, upgrades: 0, stages: 0 },
  missions: { hunt: 0, train: 0, travel: 0 },
  stage: 1,
  muted: false,
  motion: "system",
});
const integer = (value: unknown, max: number, fallback: number) =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= max
    ? value
    : fallback;
const weaponId = (value: unknown): value is WeaponId =>
  typeof value === "string" && Object.hasOwn(GUNS, value);
export function decode(raw: string | null): Progress | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || (v.version !== 1 && v.version !== 2))
      return null;
    const p: Progress = {
      ...defaults(),
      cat: ["orange", "calico", "cream"].includes(v.cat) ? v.cat : "orange",
      coins: integer(v.coins, CONFIG.limits.value, 0),
      damage: integer(v.damage, CONFIG.upgrades.maxLevel, 0),
      rate: integer(v.rate, CONFIG.upgrades.maxLevel, 0),
      stage: Math.max(1, integer(v.stage, CONFIG.limits.stage, 1)),
      muted: v.muted === true,
      motion: ["system", "reduce", "full"].includes(v.motion)
        ? v.motion
        : "system",
    };
    if (v.version === 1) {
      // Keep previously earned appearances as owned guns when upgrading the save.
      p.weapon = weaponAt(p.damage);
      p.ownedWeapons =
        p.weapon === "fish"
          ? ["wood", "coral", "fish"]
          : p.weapon === "coral"
            ? ["wood", "coral"]
            : ["wood"];
      p.stats.upgrades = p.damage + p.rate;
      p.stats.stages = p.stage - 1;
    } else {
      p.money = integer(v.money, CONFIG.upgrades.maxMoneyLevel, 0);
      p.ownedWeapons = [
        "wood",
        ...new Set<WeaponId>(
          (Array.isArray(v.ownedWeapons) ? v.ownedWeapons : []).filter(
            (id: unknown): id is WeaponId => weaponId(id) && id !== "wood",
          ),
        ),
      ];
      p.weapon =
        weaponId(v.weapon) && p.ownedWeapons.includes(v.weapon)
          ? v.weapon
          : "wood";
      for (const stat of ["kills", "upgrades", "stages"] as const)
        p.stats[stat] = integer(v.stats?.[stat], CONFIG.limits.value, 0);
      for (const id of ["hunt", "train", "travel"] as const)
        p.missions[id] = integer(v.missions?.[id], CONFIG.limits.value, 0);
    }
    return p;
  } catch {
    return null;
  }
}
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export class SaveStore {
  unavailable = false;
  private storage?: StoragePort;
  constructor(getStorage: () => StoragePort = () => window.localStorage) {
    try {
      this.storage = getStorage();
    } catch {
      this.unavailable = true;
    }
  }
  load() {
    try {
      if (!this.storage) return null;
      const current = this.storage.getItem(SAVE_KEY);
      // A corrupt/future v2 save must not silently resurrect stale v1 progress.
      return decode(
        current === null ? this.storage.getItem(LEGACY_SAVE_KEY) : current,
      );
    } catch {
      this.unavailable = true;
      return null;
    }
  }
  save(progress: Progress) {
    if (this.unavailable) return false;
    try {
      this.storage!.setItem(SAVE_KEY, JSON.stringify(progress));
      return true;
    } catch {
      this.unavailable = true;
      return false;
    }
  }
}
