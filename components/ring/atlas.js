import * as THREE from "three";
import { IMAGE_FILES } from "./projects";
import { signedOffset } from "./utils";

const loadBitmap = (src, priority) => {
  const fetchOne = async () => {
    const res = await fetch(src, { priority, mode: "same-origin" });
    if (!res.ok) throw new Error(`failed to load ${src}`);
    const blob = await res.blob();
    if (typeof createImageBitmap === "function") {
      return createImageBitmap(blob);
    }
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`failed to load ${src}`));
      img.src = URL.createObjectURL(blob);
    });
  };
  return fetchOne();
};

const runPool = async (items, limit, fn) => {
  let cursor = 0;
  const n = Math.min(Math.max(1, limit), items.length);
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        await fn(items[i]);
      }
    }),
  );
};

/**
 * Packs every image into one texture. A single atlas rather than one texture
 * per plane because ESSL 1.00 cannot index an array of samplers with a
 * non-constant index.
 *
 * Returns synchronously with the sheet blank and filling in as images arrive:
 * the caller needs something to bind on frame one, and the entry shows cell 0
 * while the rest are still coming.
 *
 * Images are fetched in fan order (the facing card, then either side) so the
 * visible arc is painted before the ones still off-screen. `onProgress` is
 * scaled to `launchAt`, not the full set, so the counter can hit 100 and the
 * ring can start without waiting on every file. Remaining cells keep streaming.
 *
 * `first` settles once cell 0 is on the texture, `ready` once all of them are.
 * Neither rejects — a missing file leaves its cell blank and still counts as
 * settled, so one bad path cannot strand the entry.
 */
export function buildAtlas(files = IMAGE_FILES, onProgress, options = {}) {
  const cellW = options.cell ?? 512;
  const cellH = Math.round(cellW / 1.5);
  const mipmaps = options.mipmaps !== false;
  const launchAt = Math.min(
    files.length,
    Math.max(1, options.launchAt ?? files.length),
  );
  const concurrency = options.concurrency ?? 4;

  const cols = Math.ceil(Math.sqrt(files.length));
  const rows = Math.ceil(files.length / cols);

  const canvas = document.createElement("canvas");
  canvas.width = cols * cellW;
  canvas.height = rows * cellH;
  const ctx = canvas.getContext("2d", { alpha: false });

  const texture = new THREE.CanvasTexture(canvas);
  // The shader flips each cell itself, so leave the sheet as drawn.
  texture.flipY = false;
  // NoColorSpace deliberately: this shader writes straight to the framebuffer
  // with no encoding step, and decoding on read without encoding on write is
  // what washes everything out.
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  if (mipmaps) {
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
  } else {
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
  }

  const paint = (img, i) => {
    const x = (i % cols) * cellW;
    const y = Math.floor(i / cols) * cellH;
    const iw = img.width;
    const ih = img.height;

    // Cover fit: fill the cell, crop the overflow, never squash.
    const scale = Math.max(cellW / iw, cellH / ih);
    const dw = iw * scale;
    const dh = ih * scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cellW, cellH); // clip, or an oversized image bleeds
    ctx.clip();
    ctx.drawImage(img, x + (cellW - dw) / 2, y + (cellH - dh) / 2, dw, dh);
    ctx.restore();
    if (typeof img.close === "function") img.close();
  };

  let settled = 0;
  let uploadQueued = false;
  const requestUpload = () => {
    if (uploadQueued) return;
    uploadQueued = true;
    requestAnimationFrame(() => {
      uploadQueued = false;
      texture.needsUpdate = true;
    });
  };

  const tick = () => onProgress?.(Math.min(1, settled / launchAt));

  const fetchInto = (i, priority) =>
    loadBitmap(`/${files[i]}`, priority)
      .then((img) => {
        paint(img, i);
        requestUpload();
      })
      .catch((err) => console.warn("[atlas]", err.message))
      .finally(() => {
        settled++;
        tick();
      });

  const n = files.length;
  // Fan order, same deal the ring uses: facing cell first, then alternating
  // neighbours, so the arc on screen is what lands before the counter opens.
  const fan = [];
  for (let i = 0; i < n; i++) {
    const slot = signedOffset(i);
    fan.push((((n - slot) % n) + n) % n);
  }

  const seed = fan[0];
  const rest = fan.slice(1);

  const first = fetchInto(seed, "high").then(() => {
    texture.needsUpdate = true;
  });

  const ready = (async () => {
    await first;
    await runPool(rest, concurrency, (i) => fetchInto(i, "low"));
    texture.needsUpdate = true;
  })();

  tick();
  return { texture, grid: [cols, rows], count: files.length, first, ready };
}
