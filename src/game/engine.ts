import {
  CONFIG,
  type CatId,
  type Motion,
  type Upgrade,
  type WeaponId,
  type MissionId,
} from "./config";
import { type Images } from "./assets";
import { Audio } from "./audio";
import { Input } from "./input";
import { createCamera, followCamera } from "./camera";
import type { Point } from "./geometry";
import { Renderer } from "./render";
import {
  createState,
  completion,
  makeEnemy,
  purchase,
  buyWeapon,
  equipWeapon,
  claimMission,
  restart,
  step,
  type State,
} from "./simulation";
import { defaults, type Progress, SaveStore } from "./save";
export interface Hud {
  progress: Progress;
  hp: number;
  defeated: number;
  total: number;
  completion: number;
  stage: number;
  phase: State["phase"];
  hint: boolean;
  unavailable: boolean;
  paused: boolean;
}
export class Engine {
  state: State;
  camera: Point;
  manualPaused = false;
  input: Input;
  renderer: Renderer;
  audio = new Audio();
  private raf = 0;
  private last = 0;
  private accumulator = 0;
  private hudTime = 0;
  private saveTime = 0;
  private savedCoins: number;
  private revision: number;
  private modal = false;
  private blurred = false;
  private debugPaused = false;
  private observer: ResizeObserver;
  private media = window.matchMedia("(prefers-reduced-motion: reduce)");
  private disposed = false;
  constructor(
    private canvas: HTMLCanvasElement,
    images: Images,
    progress: Progress,
    private store: SaveStore,
    private publish: (hud: Hud) => void,
    paused: boolean,
  ) {
    this.state = createState(progress, Date.now());
    this.camera = createCamera(this.state.player);
    this.savedCoins = progress.coins;
    this.revision = this.state.revision;
    this.modal = paused;
    this.input = new Input(canvas, () => this.notify());
    this.renderer = new Renderer(canvas, images);
    this.observer = new ResizeObserver(() => {
      this.input.clear();
      this.renderer.resize();
      this.draw();
    });
    this.observer.observe(canvas);
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("blur", this.blur);
    window.addEventListener("focus", this.focus);
    window.addEventListener("pagehide", this.pagehide);
    this.media.addEventListener("change", this.motionChange);
    this.renderer.resize();
    this.sync();
    this.notify();
    if (import.meta.env.DEV) {
      (window as any).__pawfront = {
        engine: this,
        state: this.state,
        stage: (stage: number) => {
          this.state.progress.stage = stage;
          restart(this.state);
          this.camera = createCamera(this.state.player);
          this.notify();
          this.draw();
        },
        coins: (coins: number) => {
          this.state.progress.coins = coins;
          this.notify();
        },
        enemy: (
          kind: Parameters<typeof makeEnemy>[1],
          x: number,
          y: number,
        ) => {
          const e = makeEnemy(this.state, kind, x, y);
          this.state.enemies.push(e);
          this.draw();
          return e;
        },
        freeze: (paused: boolean) => {
          this.debugPaused = paused;
          this.sync();
        },
        tick: (n = 1) => {
          for (let i = 0; i < n; i++) this.advance({ x: 0, y: 0 });
          this.notify();
          this.draw();
        },
        draw: () => {
          this.notify();
          this.draw();
        },
      };
    }
  }
  get paused() {
    return (
      this.manualPaused ||
      this.modal ||
      this.blurred ||
      document.hidden ||
      this.debugPaused
    );
  }
  get reduced() {
    return (
      this.state.progress.motion === "reduce" ||
      (this.state.progress.motion === "system" && this.media.matches)
    );
  }
  private visibility = () => {
    this.input.clear();
    if (document.hidden) this.save();
    this.sync();
  };
  private blur = () => {
    this.blurred = true;
    this.input.clear();
    this.sync();
  };
  private focus = () => {
    this.blurred = false;
    this.sync();
  };
  private pagehide = () => this.save();
  private motionChange = () => this.draw();
  unlock = () => this.audio.unlock();
  private sync() {
    this.input.enabled = !this.paused;
    this.audio.sync(this.state.progress.muted, this.paused);
    cancelAnimationFrame(this.raf);
    this.last = 0;
    this.accumulator = 0;
    if (!this.paused && !this.disposed)
      this.raf = requestAnimationFrame(this.frame);
    else if (!document.hidden) this.draw();
  }
  setPaused(paused: boolean) {
    this.manualPaused = paused;
    this.input.clear();
    this.sync();
    this.notify();
  }
  private advance(movement: Point) {
    const previousPhase = this.state.phase;
    step(this.state, movement);
    if (previousPhase === "defeat" && this.state.phase === "active")
      this.camera = createCamera(this.state.player);
    else
      followCamera(this.camera, this.state.player, CONFIG.step, this.reduced);
  }
  setModal(open: boolean) {
    this.modal = open;
    this.input.clear();
    this.sync();
  }
  private frame = (now: number) => {
    if (this.paused || this.disposed) return;
    const delta = this.last
      ? Math.min((now - this.last) / 1000, CONFIG.step * CONFIG.maxSteps)
      : 0;
    this.last = now;
    this.accumulator += delta;
    this.hudTime += delta;
    this.saveTime += delta;
    let count = 0;
    while (this.accumulator >= CONFIG.step && count < CONFIG.maxSteps) {
      this.advance(this.input.vector());
      for (const event of this.state.sounds) this.audio.play(event);
      this.accumulator -= CONFIG.step;
      count++;
    }
    if (this.state.revision !== this.revision) {
      this.revision = this.state.revision;
      this.save();
      this.notify();
    } else if (this.hudTime >= 0.1) {
      this.hudTime = 0;
      this.notify();
    }
    if (this.saveTime >= CONFIG.checkpointSeconds) {
      this.saveTime = 0;
      if (this.savedCoins !== this.state.progress.coins) this.save();
    }
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };
  private draw() {
    if (!document.hidden)
      this.renderer.draw(this.state, this.input, this.reduced, this.camera);
  }
  notify() {
    this.publish({
      progress: { ...this.state.progress },
      hp: this.state.player.hp,
      defeated: this.state.defeated,
      total: this.state.schedule.length,
      stage: this.state.encounterStage,
      completion: completion(this.state),
      phase: this.state.phase,
      hint: !this.input.used,
      unavailable: this.store.unavailable,
      paused: this.manualPaused,
    });
  }
  save() {
    this.revision = this.state.revision;
    this.store.save(this.state.progress);
    this.savedCoins = this.state.progress.coins;
    this.notify();
  }
  buy(kind: Upgrade, level: number) {
    if (purchase(this.state, kind, level)) {
      this.audio.play("upgrade");
      this.save();
    }
  }
  buyGun(id: WeaponId) {
    if (buyWeapon(this.state, id)) {
      equipWeapon(this.state, id);
      this.audio.play("upgrade");
      this.save();
      this.draw();
    }
  }
  equip(id: WeaponId) {
    if (equipWeapon(this.state, id)) {
      this.save();
      this.draw();
    }
  }
  claim(id: MissionId, tier: number) {
    if (claimMission(this.state, id, tier)) {
      this.audio.play("upgrade");
      this.save();
    }
  }
  select(cat: CatId) {
    this.state.progress.cat = cat;
    this.save();
    this.draw();
  }
  settings(muted: boolean, motion: Motion) {
    this.state.progress.muted = muted;
    this.state.progress.motion = motion;
    this.audio.sync(muted, this.paused);
    this.save();
    this.draw();
  }
  reset() {
    this.state.progress = defaults();
    restart(this.state);
    this.camera = createCamera(this.state.player);
    this.input.used = false;
    this.save();
    this.draw();
  }
  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.input.destroy();
    this.observer.disconnect();
    this.audio.destroy();
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("blur", this.blur);
    window.removeEventListener("focus", this.focus);
    window.removeEventListener("pagehide", this.pagehide);
    this.media.removeEventListener("change", this.motionChange);
    if (import.meta.env.DEV) delete (window as any).__pawfront;
  }
}
