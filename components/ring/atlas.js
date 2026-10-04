import * as THREE from "three";
import { IMAGE_FILES } from "./projects";
import { projectImageSrc } from "@/lib/projects";
import { signedOffset } from "./utils";

const load = (src, priority, ms = 12000) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    // R2 is another origin; must precede src or the canvas is tainted.
    img.crossOrigin = "anonymous";
    // Must be set before src or the request is already away.
    if (priority) img.fetchPriority = priority;
    img.decoding = "async";
    let done = false;
    let timer;
    const finish = (err) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      if (err) {
        img.src = "";
        reject(err);
      } else {
        resolve(img);
      }
    };
    timer = window.setTimeout(() => finish(new Error(`timed out ${src}`)), ms);
    img.onload = () => finish();
    img.onerror = () => finish(new Error(`failed to load ${src}`));
    img.src = src;
  });

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
 * visible arc is painted first. GPU uploads are coalesced to one per frame
 * and skipped while the ring is being thrown — marking dirty per image used
 * to re-send the whole sheet and freeze the tab.
 *
 * `first` settles once cell 0 is on the texture, `ready` once all of them are.
 * Neither rejects — a missing file leaves its cell blank and still counts as
 * settled, so one bad path cannot strand the entry.
 */
export function buildAtlas(files = IMAGE_FILES, onProgress, options = {}) {
  const cellW = options.cell ?? 512;
  const cellH = Math.round(cellW / 1.5);
  const mipmaps = options.mipmaps !== false;
  const n = files.length;
  const launchAt = Math.min(n, Math.max(1, options.launchAt ?? n));

  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);

  const canvas = document.createElement("canvas");
  canvas.width = cols * cellW;
  canvas.height = rows * cellH;
  const ctx = canvas.getContext("2d");

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

    // Cover fit: fill the cell, crop the overflow, never squash.
    const scale = Math.max(cellW / img.width, cellH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cellW, cellH); // clip, or an oversized image bleeds
    ctx.clip();
    ctx.drawImage(img, x + (cellW - dw) / 2, y + (cellH - dh) / 2, dw, dh);
    ctx.restore();
  };

  let settled = 0;
  let paused = false;
  let disposed = false;
  let raf = 0;
  let pendingFlush = false;

  const flush = () => {
    raf = 0;
    pendingFlush = false;
    if (disposed || paused) return;
    texture.needsUpdate = true;
  };

  const markDirty = () => {
    if (disposed) return;
    if (paused) {
      pendingFlush = true;
      return;
    }
    if (raf) return;
    raf = window.requestAnimationFrame(flush);
  };

  const setPaused = (next) => {
    paused = next;
    if (!paused && pendingFlush) markDirty();
  };

  const tick = () => onProgress?.(Math.min(1, settled / launchAt));

  const fetchInto = (i, priority) =>
    load(projectImageSrc(files[i]), priority)
      .then((img) => {
        if (disposed) return;
        paint(img, i);
        markDirty();
      })
      .catch((err) => console.error("[atlas]", err.message))
      .finally(() => {
        settled++;
        tick();
      });

  // Fan order, same deal the ring uses: facing cell first, then alternating
  // neighbours, so the arc on screen is what lands before the counter opens.
  const fan = [];
  for (let i = 0; i < n; i++) {
    const slot = signedOffset(i);
    fan.push((((n - slot) % n) + n) % n);
  }

  const seed = fan[0];
  const rest = fan.slice(1);

  const first = fetchInto(seed, "high");

  const ready = (async () => {
    await Promise.all([first, ...rest.map((i) => fetchInto(i, "low"))]);
    markDirty();
  })();

  tick();
  return {
    texture,
    grid: [cols, rows],
    count: n,
    first,
    ready,
    setPaused,
    dispose: () => {
      disposed = true;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
