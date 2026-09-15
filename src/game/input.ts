import { CONFIG, clamp } from "./config";
import type { Point } from "./geometry";
const movementKeys = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowleft",
  "arrowdown",
  "arrowright",
]);
export const isEditing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  !!target.closest('input,textarea,select,[contenteditable="true"]');
export class Input {
  keys = new Set<string>();
  pointer: number | null = null;
  origin: Point | null = null;
  stick: Point | null = null;
  enabled = true;
  used = false;
  private listeners: (() => void)[] = [];
  constructor(
    private canvas: HTMLCanvasElement,
    private onUse: () => void,
  ) {
    const on = <K extends keyof HTMLElementEventMap>(
      el: HTMLElement | Window,
      type: K,
      fn: (event: any) => void,
      options?: AddEventListenerOptions,
    ) => {
      el.addEventListener(type, fn, options);
      this.listeners.push(() => el.removeEventListener(type, fn, options));
    };
    on(window, "keydown", (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!this.enabled || isEditing(e.target) || !movementKeys.has(k)) return;
      e.preventDefault();
      this.keys.add(k);
      this.markUsed();
    });
    on(window, "keyup", (e: KeyboardEvent) =>
      this.keys.delete(e.key.toLowerCase()),
    );
    on(window, "blur", () => this.clear());
    on(canvas, "pointerdown", (e: PointerEvent) => {
      if (!this.enabled || this.pointer !== null || e.button !== 0) return;
      e.preventDefault();
      this.pointer = e.pointerId;
      this.origin = this.point(e);
      this.stick = this.origin;
      canvas.setPointerCapture(e.pointerId);
    });
    on(canvas, "pointermove", (e: PointerEvent) => {
      if (e.pointerId !== this.pointer || !this.origin) return;
      e.preventDefault();
      this.stick = this.point(e);
      if (
        Math.hypot(this.stick.x - this.origin.x, this.stick.y - this.origin.y) >
        5
      )
        this.markUsed();
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId === this.pointer) this.clearPointer();
    };
    on(canvas, "pointerup", release);
    on(canvas, "pointercancel", release);
    on(canvas, "lostpointercapture", release);
  }
  private point(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * CONFIG.width) / r.width,
      y: ((e.clientY - r.top) * CONFIG.height) / r.height,
    };
  }
  private markUsed() {
    if (!this.used) {
      this.used = true;
      this.onUse();
    }
  }
  private clearPointer() {
    const id = this.pointer;
    this.pointer = null;
    this.origin = this.stick = null;
    if (id !== null && this.canvas.hasPointerCapture(id))
      this.canvas.releasePointerCapture(id);
  }
  clear() {
    this.keys.clear();
    this.clearPointer();
  }
  vector(): Point {
    if (!this.enabled) return { x: 0, y: 0 };
    if (this.origin && this.stick) {
      const dx = this.stick.x - this.origin.x,
        dy = this.stick.y - this.origin.y,
        d = Math.hypot(dx, dy),
        strength = clamp((d - 5) / 37, 0, 1);
      return d
        ? { x: (dx / d) * strength, y: (dy / d) * strength }
        : { x: 0, y: 0 };
    }
    const x =
      Number(this.keys.has("d") || this.keys.has("arrowright")) -
      Number(this.keys.has("a") || this.keys.has("arrowleft"));
    const y =
      Number(this.keys.has("s") || this.keys.has("arrowdown")) -
      Number(this.keys.has("w") || this.keys.has("arrowup"));
    const d = Math.hypot(x, y) || 1;
    return { x: x / d, y: y / d };
  }
  destroy() {
    this.clear();
    this.listeners.forEach((fn) => fn());
  }
}
