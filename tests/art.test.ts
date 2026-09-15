import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { ASSETS } from "../src/game/assets";

test("every directional animation frame is present, unclipped, and padded in its runtime sheet", async () => {
  const manifest: Record<
    string,
    Record<string, [number, number, number, number]>
  > = JSON.parse(
    await readFile(
      new URL("../public/art/atlas.json", import.meta.url),
      "utf8",
    ),
  );
  const found = new Set<string>();
  for (const [file, frames] of Object.entries(manifest)) {
    const { data, info } = await sharp(
      new URL(`../public/art/${file}`, import.meta.url).pathname,
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.ok(
      info.width <= 4096 && info.height <= 4096,
      `${file}: mobile-sized sheet`,
    );
    for (const [id, [x, y, width, height]] of Object.entries(frames)) {
      assert.ok(x >= 1 && y >= 1 && width > 0 && height > 0);
      assert.ok(
        x + width < info.width && y + height < info.height,
        `${id}: frame inside sheet`,
      );
      assert.ok(!found.has(id), `${id}: unique frame`);
      found.add(id);
      const alpha = (px: number, py: number) =>
        data[((y + py) * info.width + x + px) * 4 + 3];
      for (let px = 0; px < width; px++) {
        assert.equal(alpha(px, 0), 0, `${id}: clipped top`);
        assert.equal(alpha(px, height - 1), 0, `${id}: clipped feet`);
      }
      for (let py = 0; py < height; py++) {
        assert.equal(alpha(0, py), 0, `${id}: clipped left`);
        assert.equal(alpha(width - 1, py), 0, `${id}: clipped right`);
      }
    }
  }
  for (const id of ASSETS)
    assert.ok(found.has(id), `${id}: loaded artwork exists`);
  assert.equal(found.size, ASSETS.length);
});
