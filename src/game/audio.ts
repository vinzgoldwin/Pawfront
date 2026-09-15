import { CONFIG } from "./config";
import type { SoundEvent } from "./simulation";
export class Audio {
  context: AudioContext | null = null;
  muted = false;
  paused = false;
  private active = 0;
  private lastHit = 0;
  unlock() {
    if (!this.context) this.context = new AudioContext();
    if (!this.muted && !this.paused) void this.context.resume().catch(() => {});
  }
  sync(muted: boolean, paused: boolean) {
    this.muted = muted;
    this.paused = paused;
    if (!this.context) return;
    if (muted || paused) void this.context.suspend().catch(() => {});
    else void this.context.resume().catch(() => {});
  }
  play(kind: SoundEvent) {
    const c = this.context;
    if (
      !c ||
      c.state !== "running" ||
      this.muted ||
      this.paused ||
      this.active >= CONFIG.limits.sounds
    )
      return;
    if (kind === "hit" && c.currentTime - this.lastHit < 0.09) return;
    if (kind === "hit") this.lastHit = c.currentTime;
    const sounds = {
      shot: [260, 110, 0.045, 0.018],
      hit: [150, 70, 0.045, 0.025],
      upgrade: [480, 920, 0.18, 0.04],
      defeat: [260, 80, 0.3, 0.035],
      clear: [580, 780, 0.2, 0.025],
    };
    const [start, end, duration, volume] = sounds[kind],
      o = c.createOscillator(),
      g = c.createGain();
    o.type = kind === "shot" ? "triangle" : "sine";
    o.frequency.setValueAtTime(start, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(end, c.currentTime + duration);
    g.gain.setValueAtTime(volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    o.connect(g);
    g.connect(c.destination);
    this.active++;
    o.onended = () => {
      this.active--;
      o.disconnect();
      g.disconnect();
    };
    o.start();
    o.stop(c.currentTime + duration);
  }
  destroy() {
    void this.context?.close();
  }
}
