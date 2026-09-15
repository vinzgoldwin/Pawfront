import sharp from "sharp";
import { readdir, mkdir, writeFile } from "node:fs/promises";
const groups = {
  cat: ["orange", "calico", "cream"],
  enemy: ["mushroom", "sprout", "acorn"],
  boss: ["boss"],
  scenery: ["tree", "rock", "small-rock", "pine", "bush"],
  weapon: ["wood", "coral", "fish"],
};
await mkdir("public/art", { recursive: true });
const report = [];
for (const [folder, names] of Object.entries(groups)) {
  const files = (await readdir(`Assets/${folder}`))
    .filter((x) => x.endsWith(".png"))
    .sort();
  for (let i = 0; i < files.length; i++) {
    const name = names[i],
      source = `Assets/${folder}/${files[i]}`;
    const { data, info } = await sharp(source)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const histogram = Array(256).fill(0);
    for (let p = 3; p < data.length; p += 4) histogram[data[p]]++;
    console.log(
      name,
      "alpha:",
      histogram
        .map((n, a) => (n > 5000 ? `${a}:${n}` : ""))
        .filter(Boolean)
        .join(" "),
    );
    const halo = ["fish", "small-rock", "bush"].includes(name);
    // These three sources carry a soft exterior halo. Keep the near-opaque painted
    // silhouette and its antialiasing; do not key out dark outlines by RGB color.
    if (halo)
      for (let p = 3; p < data.length; p += 4)
        data[p] = Math.round(
          Math.max(0, Math.min(1, (data[p] - 180) / 65)) * 255,
        );
    let left = info.width,
      top = info.height,
      right = 0,
      bottom = 0;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++)
        if (data[(y * info.width + x) * 4 + 3] > 8) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
    left = Math.max(0, left - 3);
    top = Math.max(0, top - 3);
    right = Math.min(info.width - 1, right + 3);
    bottom = Math.min(info.height - 1, bottom + 3);
    const width = right - left + 1,
      height = bottom - top + 1,
      size = ["tree", "pine", "boss"].includes(name)
        ? 384
        : ["rock", "small-rock", "bush"].includes(name)
          ? 256
          : 192;
    await sharp(data, { raw: info })
      .extract({ left, top, width, height })
      .resize({
        width: size,
        height: size,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toFile(`public/art/${name}.png`);
    report.push({
      name,
      source,
      crop: { left, top, width, height },
      maxDimension: size,
      haloCleanup: halo,
    });
  }
}
await writeFile(
  "public/art/preparation.json",
  JSON.stringify(report, null, 2) + "\n",
);
