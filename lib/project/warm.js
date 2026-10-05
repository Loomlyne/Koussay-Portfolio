"use client";

import { projectHref, projectImageSrc } from "@/lib/projects";

export const HERO_IMAGE_SIZES =
  "(max-width: 1024px) min(70rem, calc(100vw - 64px)), min(49rem, 70vw)";

export const GALLERY_IMAGE_SIZES = "(max-width: 640px) 70vw, 70vw";

const retained = new Map();
const warmedRoutes = new Set();
const MAX_RETAINED = 24;

function collectSrcs(project) {
  if (!project) return { cover: "", first: "" };
  const cover = projectImageSrc(project);
  // Only the first gallery item: warming every page of a long gallery would
  // decode dozens of images on a ring hover.
  const first = project.detail?.gallery?.[0];
  const firstSrc = first ? projectImageSrc(first.file ?? first) : "";
  return { cover, first: firstSrc };
}

function retain(url) {
  if (!url || typeof window === "undefined") return Promise.resolve();
  const existing = retained.get(url);
  if (existing) {
    retained.delete(url);
    retained.set(url, existing);
    return existing.ready;
  }

  const image = new window.Image();
  image.decoding = "async";
  // Same request mode as the hero, so the cached response is reused.
  if (/^https?:/.test(url) && !url.startsWith(window.location.origin)) {
    image.crossOrigin = "anonymous";
  }
  image.src = url;
  const ready = image.decode
    ? image.decode().catch(() => {})
    : Promise.resolve();
  retained.set(url, { image, ready });

  while (retained.size > MAX_RETAINED) {
    const first = retained.keys().next().value;
    retained.delete(first);
  }

  return ready;
}

// The hero is unoptimized, so the cover is warmed raw only.
function warmCover(src) {
  return src ? retain(src) : Promise.resolve();
}

// Gallery images are unoptimized raw R2 files; warm that exact url.
function warmGallery(src) {
  return src ? retain(src) : Promise.resolve();
}

export function rememberProject(project) {
  if (!project) return;
  const { cover, first } = collectSrcs(project);
  warmCover(cover);
  warmGallery(first);
}

export function warmProject(project, router) {
  if (!project?.slug) return;
  const href = projectHref(project.slug);

  if (router && !warmedRoutes.has(href)) {
    warmedRoutes.add(href);
    try {
      router.prefetch(href);
    } catch {
      // Prefetch is best-effort; a missing route should not block the page.
    }
  }

  rememberProject(project);
}

export function warmHref(href, imageSrc, router) {
  if (href && router && !warmedRoutes.has(href)) {
    warmedRoutes.add(href);
    try {
      router.prefetch(href);
    } catch {
      // Prefetch is best-effort; a missing route should not block the page.
    }
  }
  if (imageSrc) warmCover(imageSrc);
}
