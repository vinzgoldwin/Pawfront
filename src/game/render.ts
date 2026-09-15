import { CONFIG as C, biomeFor, format } from "./config";
import { drawArt, type AssetId, type Images } from "./assets";
import { type Point } from "./geometry";
import { drawCat } from "./cat-render";
import { routeCenter, routeFor } from "./world";
import { objective, exitReady, type State } from "./simulation";
import type { Input } from "./input";
import { TEXT } from "./strings";
import {
  paintTerrain,
  PALETTES,
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  chunkTop,
} from "./terrain";
interface Prop {
  id: AssetId;
  x: number;
  y: number;
  height: number;
  flip?: boolean;
}
interface GroundChunk {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  props: Prop[];
}
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private chunks = new Map<number, GroundChunk>();
  private camera: Point = { x: 0, y: 0 };
  private inWorld = false;
  constructor(
    private canvas: HTMLCanvasElement,
    private images: Images,
  ) {
    this.ctx = canvas.getContext("2d")!;
  }
  private groundChunk(index: number): GroundChunk {
    const existing = this.chunks.get(index);
    if (existing) {
      this.chunks.delete(index);
      this.chunks.set(index, existing);
      return existing;
    }
    const x = index * CHUNK_WIDTH,
      y = chunkTop(x);
    const biome = biomeFor(Math.max(1, Math.floor(x / 1200) + 1));
    const canvas = document.createElement("canvas");
    canvas.width = CHUNK_WIDTH;
    canvas.height = CHUNK_HEIGHT;
    const c = canvas.getContext("2d")!;
    c.translate(-x, -y);
    paintTerrain(c, biome, x, y);
    const props: Prop[] = [
      {
        id: index % 2 ? "pine" : "tree",
        x: x + 55,
        y: routeCenter(x + 55) - 247,
        height: 86,
      },
      {
        id: index % 3 ? "tree" : "pine",
        x: x + 275,
        y: routeCenter(x + 275) - 190,
        height: 77,
      },
      {
        id: "small-rock",
        x: x + 155,
        y: routeCenter(x + 155) + 145,
        height: 23,
      },
      { id: "rock", x: x + 365, y: routeCenter(x + 365) - 153, height: 26 },
      { id: "bush", x: x + 48, y: routeCenter(x + 48) + 200, height: 29 },
    ].filter(
      (p) => biome !== "desert" || p.id === "rock" || p.id === "small-rock",
    ) as Prop[];
    const chunk = { canvas, x, y, props };
    this.chunks.set(index, chunk);
    // Three visible chunks plus nearby cached scenery, independent of route length.
    if (this.chunks.size > 8)
      this.chunks.delete(this.chunks.keys().next().value!);
    return chunk;
  }
  private visible(p: Point, margin = 90) {
    return (
      p.x >= this.camera.x - margin &&
      p.x <= this.camera.x + C.width + margin &&
      p.y >= this.camera.y - margin &&
      p.y <= this.camera.y + C.height + margin
    );
  }

  resize() {
    const r = this.canvas.getBoundingClientRect(),
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(r.width * dpr),
      h = Math.round(r.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.ctx.setTransform(w / C.width, 0, 0, h / C.height, 0, 0);
  }
  private sprite(
    id: AssetId,
    x: number,
    y: number,
    height: number,
    flip = false,
    anchor = 0.5,
  ) {
    const c = this.ctx,
      img = this.images[id],
      w = (height * img.width) / img.height;
    c.save();
    c.translate(x, y);
    c.scale(flip ? -1 : 1, 1);
    drawArt(c, img, -w * anchor, -height, w, height);
    c.restore();
  }
  private shadow(x: number, y: number, r: number) {
    const c = this.ctx;
    c.fillStyle = "rgba(66,72,36,.17)";
    c.beginPath();
    c.ellipse(x, y, r, r * 0.28, 0, 0, Math.PI * 2);
    c.fill();
  }
  draw(s: State, input: Input, reduced: boolean, camera: Point) {
    const c = this.ctx;
    this.camera = camera;
    c.clearRect(0, 0, C.width, C.height);
    c.fillStyle = PALETTES[biomeFor(s.encounterStage)].ground;
    c.fillRect(0, 0, C.width, C.height);
    c.save();
    c.translate(-camera.x, -camera.y);
    this.inWorld = true;
    const visibleProps: Prop[] = [];
    for (
      let i = Math.floor((camera.x - 100) / CHUNK_WIDTH);
      i <= Math.floor((camera.x + C.width + 100) / CHUNK_WIDTH);
      i++
    ) {
      const chunk = this.groundChunk(i);
      c.drawImage(chunk.canvas, chunk.x, chunk.y);
      visibleProps.push(
        ...chunk.props.filter((p) => this.visible(p, p.height)),
      );
    }
    this.landmarks(s);
    const objects: { y: number; draw: () => void }[] = visibleProps.map(
      (p) => ({
        y: p.y,
        draw: () => {
          this.shadow(p.x, p.y, p.height * 0.24);
          this.sprite(p.id, p.x, p.y, p.height, p.flip);
        },
      }),
    );
    for (const e of s.enemies) {
      if (e.windup <= 0 || !this.visible(e, 300)) continue;
      c.fillStyle = "rgba(235,87,40,.19)";
      c.strokeStyle = "#b5482d";
      c.lineWidth = 2.5;
      if (e.kind === "sprout" && e.dash) {
        const end = {
          x: e.x + e.dash.x * C.sprout.distance,
          y: e.y + e.dash.y * C.sprout.distance,
        };
        const normal = {
          x: -e.dash.y * C.sprout.width,
          y: e.dash.x * C.sprout.width,
        };
        c.beginPath();
        c.moveTo(e.x + normal.x, e.y + normal.y);
        c.lineTo(end.x + normal.x, end.y + normal.y);
        c.lineTo(end.x - normal.x, end.y - normal.y);
        c.lineTo(e.x - normal.x, e.y - normal.y);
        c.closePath();
        c.fill();
        c.stroke();
        c.setLineDash([7, 7]);
        c.beginPath();
        c.moveTo(e.x, e.y);
        c.lineTo(end.x, end.y);
        c.stroke();
        c.setLineDash([]);
      } else {
        const at = e.kind === "acorn" && e.ground ? e.ground : e;
        const radius = e.kind === "acorn" ? C.acorn.radius : C.boss.radius;
        const duration = e.kind === "acorn" ? C.acorn.windup : C.boss.windup;
        c.beginPath();
        c.arc(at.x, at.y, radius, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.setLineDash([5, 6]);
        c.beginPath();
        c.arc(
          at.x,
          at.y,
          radius * (0.25 + (1 - e.windup / duration) * 0.75),
          0,
          Math.PI * 2,
        );
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = "#693820";
        c.font = "bold 25px sans-serif";
        c.textAlign = "center";
        c.fillText("!", at.x, at.y + radius - 15);
      }
    }
    const target = s.enemies.find((e) => e.id === s.target);
    if (target && this.visible(target)) {
      c.strokeStyle = "#fffce6";
      c.lineWidth = 2.8;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.ellipse(
          target.x,
          target.y,
          target.radius + 7,
          (target.radius + 7) * 0.5,
          0,
          (i * Math.PI) / 2 + 0.15,
          (i * Math.PI) / 2 + 0.8,
        );
        c.strokeStyle = "#6a7045";
        c.lineWidth = 4.6;
        c.stroke();
        c.strokeStyle = "#fffce6";
        c.lineWidth = 2.6;
        c.stroke();
      }
    }
    for (const e of s.enemies)
      if (this.visible(e, 130))
        objects.push({
          y: e.y,
          draw: () => {
            const size = C.enemies[e.kind].size;
            const direction = e.facingSector;
            const frame: AssetId =
              e.moving && !e.windup && !reduced
                ? `${e.kind}-${direction}-walk${Math.floor(e.walk / 8) % 8}`
                : `${e.kind}-${direction}`;
            this.shadow(e.x, e.y, e.radius);
            c.save();
            if (e.hit > 0) c.globalAlpha = 0.7;
            this.sprite(frame, e.x, e.y, size);
            c.restore();
            const width = e.kind === "boss" ? 72 : 27,
              y = e.y - size - 7;
            c.fillStyle = "#645439";
            c.fillRect(e.x - width / 2 - 1, y - 1, width + 2, 5);
            c.fillStyle = "#f4e4ba";
            c.fillRect(e.x - width / 2, y, width, 3);
            c.fillStyle = e.kind === "boss" ? "#eb7951" : "#86b346";
            c.fillRect(
              e.x - width / 2,
              y,
              width * Math.max(0, e.hp / e.maxHp),
              3,
            );
          },
        });
    objects.push({
      y: s.player.y,
      draw: () => {
        const p = s.player;
        this.shadow(p.x, p.y, 17);
        c.save();
        if (s.phase === "defeat") {
          c.globalAlpha = Math.max(0.15, s.phaseTime / C.stage.defeat);
          if (!reduced) {
            c.translate(p.x, p.y);
            c.rotate((1 - s.phaseTime / C.stage.defeat) * 0.45);
            c.translate(-p.x, -p.y);
          }
        }
        if (p.hit > 0) c.globalAlpha *= 0.65;
        drawCat(
          c,
          this.images,
          p,
          s.progress.cat,
          s.progress.weapon,
          target ? { x: target.x, y: target.y - 12 } : null,
          s.time,
          reduced,
        );
        c.restore();
      },
    });
    for (const p of s.shots) {
      if (!this.visible(p, 80)) continue;
      // Projectiles share actor depth: away-going streaks pass behind the head.
      objects.push({ y: p.y + 12, draw: () => {
        c.lineCap = "round";
        // Long bright streaks keep the reference's shot rhythm legible at phone size.
        const length = Math.min(
          reduced ? 0.035 : 0.075,
          Math.max(0, C.shot.lifetime - p.life),
        );
        c.strokeStyle = "#d79724";
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(p.x - p.vx * length, p.y - p.vy * length);
        c.lineTo(p.x, p.y);
        c.stroke();
        c.strokeStyle = "#ffe939";
        c.lineWidth = 4;
        c.stroke();
        c.strokeStyle = "#fffac0";
        c.lineWidth = 1.5;
        c.stroke();
        c.lineCap = "butt";
      }});
    }
    objects.sort((a, b) => a.y - b.y);
    objects.forEach((o) => o.draw());
    for (const p of s.pending) {
      if (!this.visible(p, 40)) continue;
      c.strokeStyle = "#7b663a";
      c.lineWidth = 2;
      c.setLineDash([3, 4]);
      c.beginPath();
      c.ellipse(p.x, p.y, 19, 10, 0, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = "#615430";
      c.font = "bold 17px sans-serif";
      c.textAlign = "center";
      c.fillText("!", p.x, p.y - 14);
    }
    // Draw feedback after actors so numbers and rewards remain readable in a crowd.
    let noteBudget = 60;
    for (const e of s.effects) {
      if (e.kind === "shot" || !this.visible(e, 80)) continue;
      const t = 1 - e.life / e.total;
      c.save();
      c.globalAlpha = Math.min(1, (1 - t) * 3);
      if (e.kind === "coin") {
        for (let i = 0; i < 5 && noteBudget > 0; i++, noteBudget--) {
          const a = i * 2.399 + e.x * 0.01;
          const spread = reduced
            ? 17
            : 9 + Math.sin((Math.min(1, t * 1.7) * Math.PI) / 2) * 30;
          const x = e.x + Math.cos(a) * spread;
          const y =
            e.y +
            Math.sin(a) * spread * 0.65 -
            (reduced ? 0 : Math.sin(t * Math.PI) * 12);
          c.save();
          c.translate(x, y);
          c.rotate(reduced ? (i - 2) * 0.2 : a + t * 0.7);
          c.fillStyle = "#72d35b";
          c.strokeStyle = "#3e702a";
          c.lineWidth = 1.8;
          c.beginPath();
          c.roundRect(-6, -3.5, 12, 7, 1.5);
          c.fill();
          c.stroke();
          c.fillStyle = "#b5ef84";
          c.fillRect(-3.5, -2, 7, 4);
          c.fillStyle = "#5baa45";
          c.beginPath();
          c.ellipse(0, 0, 1.5, 2, 0, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
        this.label(
          `+$${format(e.value)}`,
          e.x,
          e.y - 25 - (reduced ? 0 : t * 21),
          22,
          "#a5ee59",
          "#385d25",
        );
      } else if (e.kind === "damage") {
        this.label(
          format(e.value),
          e.x,
          e.y - 13 - (reduced ? 0 : t * 25),
          19,
          "#fffdf1",
          "#5c4b35",
        );
      } else if (e.kind === "stomp") {
        c.strokeStyle = "#b5713f";
        c.lineWidth = 5;
        c.beginPath();
        c.arc(
          e.x,
          e.y,
          (e.value || C.boss.radius) * (reduced ? 1 : 0.9 + t * 0.15),
          0,
          Math.PI * 2,
        );
        c.stroke();
      } else {
        const r = reduced ? 7 : 14 * (1 - t * 0.5);
        c.fillStyle = "#fffadd";
        c.strokeStyle = "#efc339";
        c.lineWidth = 1.5;
        c.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6,
            d = i % 2 ? r * 0.25 : r;
          const x = e.x + Math.cos(a) * d,
            y = e.y + Math.sin(a) * d;
          if (i) c.lineTo(x, y);
          else c.moveTo(x, y);
        }
        c.closePath();
        c.fill();
        c.stroke();
      }
      c.restore();
    }
    c.restore();
    this.inWorld = false;
    this.objectiveArrow(s);
    if (input.origin && input.stick) {
      const o = input.origin,
        v = input.vector();
      c.strokeStyle = "rgba(65,79,47,.45)";
      c.fillStyle = "rgba(248,246,215,.2)";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(o.x, o.y, 42, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = "rgba(65,79,47,.4)";
      c.beginPath();
      c.arc(o.x + v.x * 30, o.y + v.y * 30, 13, 0, Math.PI * 2);
      c.fill();
    }
    if (s.phase !== "active") {
      this.label(
        s.phase === "clear" ? TEXT.clear : TEXT.defeat,
        240,
        300,
        29,
        "#fff4cd",
        "#6b4b2e",
      );
    }
  }
  private landmarks(s: State) {
    const c = this.ctx;
    s.packs.forEach((pack, i) => {
      if (!this.visible(pack.at, 100)) return;
      const x = pack.at.x,
        y = routeCenter(x) - 133;
      c.strokeStyle = "#6b5436";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, y - 29);
      c.stroke();
      c.fillStyle = pack.activated ? "#b1b982" : "#e5cc8a";
      c.strokeStyle = "#6b5436";
      c.beginPath();
      c.roundRect(x - 12, y - 34, 24, 18, 2);
      c.fill();
      c.stroke();
      c.fillStyle = "#635037";
      c.font = "bold 12px sans-serif";
      c.textAlign = "center";
      c.fillText(String(i + 1), x, y - 21);
    });
    const exit = routeFor(s.encounterStage).exit;
    if (!this.visible(exit, 140)) return;
    const ready = exitReady(s);
    c.strokeStyle = ready ? "#729442" : "#998961";
    c.lineWidth = 3;
    c.setLineDash([7, 7]);
    c.beginPath();
    c.moveTo(exit.x, exit.y - 110);
    c.lineTo(exit.x, exit.y + 110);
    c.stroke();
    c.setLineDash([]);
    const x = exit.x,
      y = exit.y - 128;
    this.label(TEXT.exit, x + 16, y - 68, 14, "#fff4cd", "#6b4b2e");
    c.strokeStyle = "#624d32";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y - 60);
    c.stroke();
    c.fillStyle = ready ? "#88b450" : "#d0b774";
    c.beginPath();
    c.moveTo(x + 2, y - 59);
    c.lineTo(x + 37, y - 50);
    c.lineTo(x + 2, y - 36);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = ready ? "#688d39" : "#998961";
    c.lineWidth = 5;
    c.lineJoin = "round";
    for (const offset of [-18, 0]) {
      c.beginPath();
      c.moveTo(exit.x + offset - 9, exit.y - 12);
      c.lineTo(exit.x + offset + 4, exit.y);
      c.lineTo(exit.x + offset - 9, exit.y + 12);
      c.stroke();
    }
  }
  private objectiveArrow(s: State) {
    if (s.phase !== "active") return;
    const goal = objective(s),
      x = goal.x - this.camera.x,
      y = goal.y - this.camera.y;
    if (x > 35 && x < C.width - 35 && y > 48 && y < C.height - 48) return;
    const px = s.player.x - this.camera.x,
      py = s.player.y - this.camera.y;
    const dx = x - px,
      dy = y - py;
    const t = Math.min(
      1,
      dx > 0 ? (C.width - 27 - px) / dx : dx < 0 ? (27 - px) / dx : Infinity,
      dy > 0 ? (C.height - 55 - py) / dy : dy < 0 ? (48 - py) / dy : Infinity,
    );
    const c = this.ctx;
    c.save();
    c.translate(px + dx * t, py + dy * t);
    c.rotate(Math.atan2(dy, dx));
    c.fillStyle = exitReady(s) ? "#8ac052" : "#fff2bf";
    c.strokeStyle = "#665236";
    c.lineWidth = 2.5;
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(10, 0);
    c.lineTo(-7, -8);
    c.lineTo(-3, 0);
    c.lineTo(-7, 8);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }
  private label(
    text: string,
    x: number,
    y: number,
    size: number,
    fill: string,
    outline: string,
  ) {
    const c = this.ctx;
    c.font = `900 ${size}px "Trebuchet MS", sans-serif`;
    c.textAlign = "center";
    c.lineJoin = "round";
    c.lineWidth = 4;
    c.strokeStyle = outline;
    // Keep edge kills' income figures inside the battlefield.
    const half = c.measureText(text).width / 2 + 4;
    const left = this.inWorld ? this.camera.x : 0;
    x = Math.max(left + half, Math.min(left + C.width - half, x));
    c.strokeText(text, x, y);
    c.fillStyle = fill;
    c.fillText(text, x, y);
  }
}
