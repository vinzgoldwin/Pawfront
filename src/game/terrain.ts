import { routeCenter } from "./world";

export type Biome = "forest" | "desert" | "frost";
export const PALETTES = {
  forest: {
    ground: "#d0d69a",
    patch: "#d8dda8",
    fleck: "#b7c77e",
    rim: "#86a756",
    rock: "#856044",
    dark: "#483320",
    line: "#68482e",
    detail: "#a08355",
  },
  desert: {
    ground: "#f4ce91",
    patch: "#f9d9a4",
    fleck: "#d6b77e",
    rim: "#d2ae66",
    rock: "#b57848",
    dark: "#583d29",
    line: "#805336",
    detail: "#ca9a62",
  },
  frost: {
    ground: "#d9e8db",
    patch: "#e8f0e4",
    fleck: "#b6d1c3",
    rim: "#9cc9b4",
    rock: "#8eaba0",
    dark: "#455a53",
    line: "#6a8478",
    detail: "#aec7bd",
  },
} as const;

function polygon(
  c: CanvasRenderingContext2D,
  points: number[][],
  color: string,
  stroke?: string,
) {
  c.fillStyle = color;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 3;
    c.stroke();
  }
}

export const CHUNK_WIDTH = 400;
export const CHUNK_HEIGHT = 1280;
export const chunkTop = (x: number) =>
  Math.floor(routeCenter(x + CHUNK_WIDTH / 2) - CHUNK_HEIGHT / 2);
const noise = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// Chunks use world coordinates, so cliff silhouettes and texture meet at seams.
// Their rock toes exactly match the walkable corridor used by clampWorld.
export function paintTerrain(
  c: CanvasRenderingContext2D,
  biome: Biome,
  left: number,
  top: number,
) {
  const p = PALETTES[biome],
    right = left + CHUNK_WIDTH,
    bottom = top + CHUNK_HEIGHT;
  const upper = (x: number) => routeCenter(x) - 180;
  const lower = (x: number) => routeCenter(x) + 180;
  c.fillStyle = p.ground;
  c.fillRect(left, top, CHUNK_WIDTH, CHUNK_HEIGHT);
  polygon(
    c,
    [
      [left, routeCenter(left) - 110],
      [right, routeCenter(right) - 110],
      [right, routeCenter(right) + 95],
      [left, routeCenter(left) + 95],
    ],
    p.patch,
  );

  const ridge: number[][] = [],
    lip: number[][] = [];
  for (let x = left - 40; x <= right + 40; x += 20) {
    const rough = noise(x / 20) * 8;
    ridge.push(
      [x, upper(x) - 79 + rough],
      [x + 10, upper(x + 10) - 79 + rough],
    );
    lip.push([x, lower(x) + rough - 4], [x + 10, lower(x + 10) + rough - 4]);
  }
  polygon(
    c,
    [
      [left, top],
      [right, top],
      [right, upper(right)],
      [left, upper(left)],
    ],
    p.rock,
  );
  // Upright fissures create height without rotating the player or the camera.
  for (let x = Math.floor((left - 90) / 80) * 80; x < right + 80; x += 80) {
    const width = 18 + noise(x) * 19;
    polygon(
      c,
      [
        [x, upper(x) - 78],
        [x + width, upper(x + width) - 78],
        [x + width - 10, upper(x + width - 10) - 35],
        [x + width - 4, upper(x + width - 4) - 12],
        [x + width - 13, upper(x + width - 13)],
        [x + 8, upper(x + 8) - 28],
      ],
      p.line,
    );
    c.strokeStyle = p.detail;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 45, upper(x + 45) - 62);
    c.lineTo(x + 40, upper(x + 40) - 34);
    c.lineTo(x + 44, upper(x + 44) - 22);
    c.stroke();
  }
  polygon(
    c,
    [[left - 40, top], [right + 40, top], ...ridge.slice().reverse()],
    p.rim,
    p.line,
  );
  polygon(
    c,
    [[left - 40, bottom], [right + 40, bottom], ...lip.slice().reverse()],
    p.dark,
    p.line,
  );
  for (let x = Math.floor((left - 100) / 95) * 95; x < right + 95; x += 95) {
    polygon(
      c,
      [
        [x, lower(x) + 12],
        [x + 35, lower(x + 35) + 10],
        [x + 28, lower(x + 28) + 100],
        [x + 13, lower(x + 13) + 147],
        [x - 2, bottom],
        [x - 8, bottom],
      ],
      p.rock,
    );
  }
  c.strokeStyle = p.line;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(left, upper(left));
  c.lineTo(right, upper(right));
  c.stroke();
  c.strokeStyle = p.rim;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(left, upper(left) + 4);
  c.lineTo(right, upper(right) + 4);
  c.stroke();

  // Deterministic cells avoid texture swimming as chunks are evicted/recreated.
  for (let gx = Math.floor(left / 28); gx <= Math.ceil(right / 28); gx++) {
    for (let gy = -5; gy <= 5; gy++) {
      const n = gx * 19 + gy * 107,
        x = gx * 28 + noise(n) * 21;
      const y = routeCenter(x) + gy * 29 + noise(n + 1) * 18;
      c.strokeStyle = p.fleck;
      c.fillStyle = p.fleck;
      c.lineWidth = 2;
      if (noise(n + 2) > 0.46) {
        c.beginPath();
        c.moveTo(x - 2, y);
        c.lineTo(x - 3, y - 4);
        c.moveTo(x, y);
        c.lineTo(x + 2, y - 6);
        c.stroke();
      } else {
        c.beginPath();
        c.ellipse(x, y, 2.5, 1.2, -0.3, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  if (biome === "desert") {
    cactus(c, left + 85, upper(left + 85) - 78, 38);
    cactus(c, left + 325, lower(left + 325) - 7, 34);
  }
  if (biome === "frost") {
    for (const x of [left + 55, left + 220, left + 350]) {
      c.fillStyle = "#f4f7ee";
      c.beginPath();
      c.ellipse(x, upper(x) - 77, 26, 7, -0.2, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.ellipse(x + 36, lower(x + 36) - 5, 22, 6, -0.2, 0, Math.PI * 2);
      c.fill();
    }
  }
}

function cactus(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
) {
  c.save();
  c.translate(x, y);
  c.lineCap = "round";
  const shape = () => {
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -height);
    c.moveTo(0, -height * 0.4);
    c.lineTo(-13, -height * 0.4);
    c.lineTo(-13, -height * 0.7);
    c.moveTo(0, -height * 0.55);
    c.lineTo(13, -height * 0.55);
    c.lineTo(13, -height * 0.85);
    c.stroke();
  };
  c.strokeStyle = "#5a683d";
  c.lineWidth = 13;
  shape();
  c.strokeStyle = "#8eae69";
  c.lineWidth = 8;
  shape();
  c.restore();
}
