import { definePDFJSModule, getDocumentProxy, renderPageAsImage } from "unpdf";

export const MAX_PDF_PAGES = 48;
const MAX_EDGE = 1600;
const byteCache = new Map();

let pdfjsReady;

function asUint8(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return new Uint8Array(view);
}

export function isPdfBytes(bytes, type = "") {
  if (String(type).toLowerCase().includes("pdf")) return true;
  if (!bytes || bytes.length < 5) return false;
  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

async function ensurePdfjs() {
  if (!pdfjsReady) {
    pdfjsReady = definePDFJSModule(
      () => import("pdfjs-dist/legacy/build/pdf.mjs"),
    );
  }
  await pdfjsReady;
}

async function documentFrom(bytes) {
  await ensurePdfjs();
  return getDocumentProxy(asUint8(bytes), {
    maxImageSize: 16_777_216,
  });
}

function cacheKey(url) {
  return String(url).split("?")[0];
}

export function rememberPdfBytes(url, bytes) {
  if (!url || !bytes?.length) return;
  byteCache.set(cacheKey(url), Buffer.from(bytes));
  if (byteCache.size > 6) {
    byteCache.delete(byteCache.keys().next().value);
  }
}

export function peekPdfBytes(url) {
  return byteCache.get(cacheKey(url)) || null;
}

export async function fetchPdfBytes(url) {
  const hit = peekPdfBytes(url);
  if (hit) return hit;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`[pdf] fetch ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  rememberPdfBytes(url, bytes);
  return bytes;
}

export async function pdfPageCount(bytes) {
  const pdf = await documentFrom(bytes);
  return Math.min(Math.max(1, pdf.numPages || 1), MAX_PDF_PAGES);
}

export async function renderPdfPage(bytes, pageNumber = 1) {
  const pdf = await documentFrom(bytes);
  const pages = Math.min(Math.max(1, pdf.numPages || 1), MAX_PDF_PAGES);
  const page = Math.min(Math.max(1, Number(pageNumber) || 1), pages);
  const image = await renderPageAsImage(pdf, page, {
    canvasImport: () => import("@napi-rs/canvas"),
    width: MAX_EDGE,
  });
  return Buffer.from(image);
}
