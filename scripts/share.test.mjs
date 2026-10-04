import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

import { OWNER, projectLines, homeLines, inputsHash } from "../lib/share.mjs";
import { SITE_NAME, SITE_DESCRIPTION } from "../lib/site.js";
import {
  layoutLine,
  renderCard,
  renderBooking,
  loadFonts,
} from "./lib/share.mjs";
import { root } from "./lib/load-env.mjs";

const { medium, regular } = loadFonts();
const LINE1 = { size: 72, floor: 56, tracking: -0.02 * 72, maxWidth: 1072 };
const LINE2 = { size: 32, floor: 24, tracking: 0, maxWidth: 1072 };

test("projectLines", () => {
  assert.deepEqual(projectLines({ name: "Fido Homes", type: "Brand & Web" }), [
    "Fido Homes",
    "Brand & Web · Koussay Zayani",
  ]);
});

test("homeLines", () => {
  assert.deepEqual(homeLines(SITE_NAME, SITE_DESCRIPTION), [
    "Koussay Zayani",
    "Creative developer and brand designer",
  ]);
  assert.throws(() => homeLines("x", "no stop"));
  assert.equal(OWNER, SITE_NAME);
});

test("inputsHash", () => {
  const h = inputsHash("a", ["x", "y"]);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, inputsHash("a", ["x", "y"]));
  assert.notEqual(h, inputsHash("b", ["x", "y"]));
  assert.notEqual(h, inputsHash("a", ["x", "z"]));
});

test("layoutLine widths match the UI-SPEC probe", () => {
  const a = layoutLine(medium, "Almar Private Journey", {
    ...LINE1,
    label: "t",
    line: 1,
  });
  assert.equal(a.size, 72);
  assert.ok(Math.abs(a.width - 716) <= 3, `width ${a.width}`);
  const b = layoutLine(regular, "Creative developer and brand designer", {
    ...LINE2,
    label: "t",
    line: 2,
  });
  assert.ok(Math.abs(b.width - 564) <= 3, `width ${b.width}`);
});

test("layoutLine has the glyphs it needs", () => {
  for (const text of ["Élysée Home Design", "Brand & Web · Koussay Zayani"]) {
    layoutLine(medium, text, { ...LINE1, label: "t", line: 1 });
  }
  assert.throws(
    () => layoutLine(medium, "中", { ...LINE1, label: "t", line: 1 }),
    /missing glyph/,
  );
});

test("layoutLine throws when too long and shrinks in 4 px steps", () => {
  assert.throws(
    () => layoutLine(medium, "W".repeat(60), { ...LINE1, label: "t", line: 1 }),
    /too long at 56 px/,
  );
  const natural = layoutLine(medium, "W".repeat(15), {
    ...LINE1,
    maxWidth: 1e6,
    label: "t",
    line: 1,
  }).width;
  const r = layoutLine(medium, "W".repeat(15), {
    ...LINE1,
    maxWidth: natural - 10,
    label: "t",
    line: 1,
  });
  assert.equal(r.size, 68);
});

test("renderCard makes a 1200x630 JPEG under budget", async () => {
  const cover = await sharp({
    create: {
      width: 1600,
      height: 900,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .png()
    .toBuffer();
  const out = await renderCard(
    cover,
    ["Fido Homes", "Brand & Web · Koussay Zayani"],
    { label: "test" },
  );
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
  assert.ok(out.length < 307200);

  const px = await sharp(out)
    .extract({ left: 600, top: 100, width: 1, height: 1 })
    .raw()
    .toBuffer();
  for (const c of px) assert.ok(Math.abs(c - 128) <= 4, `channel ${c}`);

  const mean = async (left, width) => {
    const s = await sharp(out)
      .extract({ left, top: 470, width, height: 36 })
      .stats();
    return s.channels[0].mean;
  };
  assert.ok((await mean(64, 236)) > (await mean(900, 236)));
});

test("renderBooking is the logo on #F4F5F6", async () => {
  const out = await renderBooking(readFileSync(join(root, "public/logo.png")));
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, "png");
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
  const px = await sharp(out)
    .extract({ left: 10, top: 10, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();
  assert.deepEqual([...px], [244, 245, 246]);
});
