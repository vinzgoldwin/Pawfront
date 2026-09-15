import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

// One small sheet per actor/gun avoids hundreds of HTTP image requests. Each
// frame keeps its native pixels and its own rectangle; nothing is rescaled.
export async function packArt(report) {
  const actors = [
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
  ];
  const groups = new Map([["static", []]]);
  for (const frame of report) {
    const group =
      actors.find((id) => frame.name.startsWith(id + "-")) ?? "static";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(frame);
  }
  const manifest = {};
  for (const [group, frames] of groups) {
    let x = 1,
      y = 1,
      rowHeight = 0,
      width = 0;
    const composites = [],
      rectangles = {};
    for (const frame of frames) {
      if (x + frame.width + 1 > 2048) {
        x = 1;
        y += rowHeight + 2;
        rowHeight = 0;
      }
      composites.push({
        input: await readFile(`public/art/${frame.name}.png`),
        left: x,
        top: y,
      });
      rectangles[frame.name] = [x, y, frame.width, frame.height];
      width = Math.max(width, x + frame.width + 1);
      x += frame.width + 2;
      rowHeight = Math.max(rowHeight, frame.height);
    }
    const file = `${group}-sheet.png`;
    await sharp({
      create: {
        width,
        height: y + rowHeight + 1,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .png()
      .toFile(`public/art/${file}`);
    manifest[file] = rectangles;
  }
  await writeFile("public/art/atlas.json", JSON.stringify(manifest));
  console.log(
    `Packed ${report.length} sprites into ${groups.size} runtime sheets.`,
  );
}
