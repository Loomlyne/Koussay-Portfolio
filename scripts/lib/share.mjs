/**
 * Authoring-time share-card renderer. Text is drawn from Geist glyph outlines
 * (fontkit) because sharp text input and SVG text elements silently fall back to Helvetica
 * on this machine. Fonts are read from node_modules, never committed.
 */
import { join } from "node:path";

import sharp from "sharp";
import * as fontkit from "fontkit";

import { root } from "./load-env.mjs";

export const SHARE_SIZE = { width: 1200, height: 630 };
const MAX_BYTES = 307200;
const FONT_DIR = join(root, "node_modules/geist/dist/fonts/geist-sans");

let fonts = null;
export function loadFonts() {
  fonts ??= {
    medium: fontkit.openSync(join(FONT_DIR, "Geist-Medium.ttf")),
    regular: fontkit.openSync(join(FONT_DIR, "Geist-Regular.ttf")),
  };
  return fonts;
}

const round = (n) => Math.round(n * 100) / 100;

function shape(font, text, size, tracking, label) {
  const run = font.layout(text);
  const scale = size / font.unitsPerEm;
  let pen = 0;
  let d = "";
  run.glyphs.forEach((glyph, i) => {
    if (glyph.id === 0) {
      throw new Error(`[share] ${label}: missing glyph in "${text}"`);
    }
    const pos = run.positions[i];
    const x = pen + pos.xOffset * scale;
    const y = -pos.yOffset * scale;
    d += glyph.path.scale(scale, -scale).translate(x, y).toSVG();
    pen += pos.xAdvance * scale;
    if (i < run.glyphs.length - 1) pen += tracking;
  });
  return { d, width: pen };
}

export function layoutLine(
  font,
  text,
  { size, floor, tracking, maxWidth, label, line = 1 },
) {
  const em = tracking / size;
  for (let s = size; s >= floor; s -= 4) {
    const { d, width } = shape(font, text, s, em * s, label);
    if (width <= maxWidth) return { d, width, size: s };
  }
  throw new Error(`[share] ${label}: line ${line} too long at ${floor} px`);
}

function group(line, x, baseline, attrs) {
  return `<g transform="translate(${x} ${baseline})" ${attrs}><path d="${line.d}"/></g>`;
}

export async function renderCard(coverBuffer, [line1, line2], { label }) {
  const { medium, regular } = loadFonts();
  const l1 = layoutLine(medium, line1, {
    size: 72,
    floor: 56,
    tracking: -0.02 * 72,
    maxWidth: 1072,
    label,
    line: 1,
  });
  const l2 = layoutLine(regular, line2, {
    size: 32,
    floor: 24,
    tracking: 0,
    maxWidth: 1072,
    label,
    line: 2,
  });
  const { width, height } = SHARE_SIZE;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0.40" stop-color="#000000" stop-opacity="0"/>` +
    `<stop offset="0.70" stop-color="#000000" stop-opacity="0.45"/>` +
    `<stop offset="1.00" stop-color="#000000" stop-opacity="0.80"/>` +
    `</linearGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#g)"/>` +
    group(l1, 64, 506, 'fill="#FFFFFF"') +
    group(l2, 64, 566, 'fill="#FFFFFF" fill-opacity="0.85"') +
    `</svg>`;
  const out = await sharp(coverBuffer)
    .rotate()
    .resize(width, height, { fit: "cover", position: "centre" })
    .composite([{ input: Buffer.from(svg) }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  if (out.length > MAX_BYTES) {
    throw new Error(`[share] ${label}: ${out.length} bytes over 300 KB`);
  }
  return out;
}

export async function renderBooking(logoBuffer) {
  return sharp(logoBuffer)
    .resize(SHARE_SIZE.width, SHARE_SIZE.height, {
      fit: "contain",
      position: "centre",
      background: { r: 244, g: 245, b: 246, alpha: 1 },
    })
    .png({ compressionLevel: 8 })
    .toBuffer();
}
