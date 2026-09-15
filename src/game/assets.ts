import type { CatId } from "./config";
export const CATS: CatId[] = ["orange", "calico", "cream"];
export const DIRECTIONS = ["front", "back", "left", "right"] as const;
export type Direction = (typeof DIRECTIONS)[number];
const ACTORS = [
  "mushroom",
  "sprout",
  "acorn",
  "boss",
] as const;
const BASE_ASSETS = [
  "orange",
  "calico",
  "cream",
  "mushroom",
  "sprout",
  "acorn",
  "boss",
  "wood",
  "coral",
  "fish",
  "tree",
  "pine",
  "rock",
  "small-rock",
  "bush",
] as const;
export type AssetId =
  | (typeof BASE_ASSETS)[number]
  | `${(typeof ACTORS)[number]}-${Direction}${"" | `-walk${number}`}`
  | `${"wood" | "coral" | "fish"}-${Direction}`
  | `${CatId}-${"body" | `body-walk${number}` | "head" | "ear-left" | "ear-right" | "tail"}`;
export const ASSETS: AssetId[] = [
  ...BASE_ASSETS,
  ...CATS.flatMap((cat) => [
    ...(["body", "head", "ear-left", "ear-right", "tail"] as const).map(layer => `${cat}-${layer}` as AssetId),
    ...Array.from({ length: 8 }, (_, frame) => `${cat}-body-walk${frame}` as AssetId),
  ]),
  ...ACTORS.flatMap((id) =>
    DIRECTIONS.flatMap((direction) => [
      `${id}-${direction}` as AssetId,
      ...Array.from(
        { length: 8 },
        (_, frame) => `${id}-${direction}-walk${frame}` as AssetId,
      ),
    ]),
  ),
  ...(["wood", "coral", "fish"] as const).flatMap((id) =>
    DIRECTIONS.map((direction) => `${id}-${direction}` as AssetId),
  ),
];
export interface ArtFrame {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
}
export type Images = Record<AssetId, ArtFrame>;
export function drawArt(
  c: CanvasRenderingContext2D,
  frame: ArtFrame,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  c.drawImage(
    frame.image,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    x,
    y,
    width,
    height,
  );
}
export const artUrl = (id: AssetId) =>
  `${import.meta.env.BASE_URL}art/${id}.png`;
// Combat bodies have no baked-in paws. Their feet share the same 150×192 origin.
export const CAT_FUR = {
  orange: "#ffb652",
  calico: "#fff1cf",
  cream: "#ffe6b8",
};
export const WEAPONS = {
  wood: {
    width: 36,
    aspect: 192 / 76,
    grip: [0.4, 0.8],
    support: [0.65, 0.68],
    muzzle: [0.96, 0.49],
  },
  coral: {
    width: 28,
    aspect: 192 / 151,
    grip: [0.36, 0.73],
    support: [0.63, 0.6],
    muzzle: [0.96, 0.38],
  },
  fish: {
    width: 28,
    aspect: 192 / 139,
    grip: [0.35, 0.8],
    support: [0.75, 0.60],
    muzzle: [0.97, 0.49],
  },
} as const;
export async function loadImages(): Promise<Images> {
  const response = await fetch(`${import.meta.env.BASE_URL}art/atlas.json`);
  if (!response.ok) throw new Error("Artwork manifest unavailable");
  const manifest: Record<
    string,
    Record<AssetId, [number, number, number, number]>
  > = await response.json();
  const images = {} as Images;
  await Promise.all(
    Object.entries(manifest).map(async ([file, frames]) => {
      const image = new Image();
      image.src = `${import.meta.env.BASE_URL}art/${file}`;
      await image.decode();
      for (const [id, [x, y, width, height]] of Object.entries(frames))
        images[id as AssetId] = { image, x, y, width, height };
    }),
  );
  if (ASSETS.some((id) => !images[id]))
    throw new Error("Artwork frame unavailable");
  return images;
}
