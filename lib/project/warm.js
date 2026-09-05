"use client";

import { getImageProps } from "next/image";

import { projectHref, projectImageSrc } from "@/lib/projects";

export const HERO_IMAGE_SIZES =
  "(max-width: 1024px) min(70rem, calc(100vw - 64px)), min(49rem, 70vw)";

export const GALLERY_IMAGE_SIZES = "(max-width: 640px) 70vw, 70vw";

const retained = new Map();
const warmedRoutes = new Set();
const MAX_RETAINED = 24;

function collectSrcs(project) {
  if (!project) return [];
  const srcs = [];
  const cover = projectImageSrc(project);
  if (cover) srcs.push(cover);
  for (const item of project.detail?.gallery ?? []) {
    const src = projectImageSrc(item?.file ?? item);
    if (src) srcs.push(src);
  }
  return [...new Set(srcs)];
}

function urlsFor(src, sizes) {
  if (!src) return [];
  try {
    const { props } = getImageProps({
      src,
      alt: "",
      fill: true,
      sizes,
    });
    const urls = [];
    if (props.srcSet) {
      for (const part of props.srcSet.split(",")) {
        const [url, descriptor] = part.trim().split(/\s+/);
        if (url) {
          urls.push({
            url,
            width: Number.parseInt(descriptor, 10) || 0,
          });
        }
      }
    }
    if (props.src) urls.push({ url: props.src, width: 0 });
    return urls;
  } catch {
    return [{ url: src, width: 0 }];
  }
}

function pickBest(urls) {
  if (urls.length === 0) return "";
  const need = Math.ceil(
    (typeof window === "undefined" ? 1280 : window.innerWidth) *
      (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1),
  );
  const ranked = [...urls].sort((a, b) => a.width - b.width);
  return (ranked.find((item) => item.width >= need) || ranked.at(-1)).url;
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
  image.src = url;
  const ready = image.decode ? image.decode().catch(() => {}) : Promise.resolve();
  retained.set(url, { image, ready });

  while (retained.size > MAX_RETAINED) {
    const first = retained.keys().next().value;
    retained.delete(first);
  }

  return ready;
}

function warmSrc(src, sizes) {
  if (!src) return Promise.resolve();
  retain(src);
  const optimized = pickBest(urlsFor(src, sizes));
  return Promise.all([retain(src), optimized ? retain(optimized) : null]);
}

export function rememberProject(project) {
  if (!project) return;
  for (const src of collectSrcs(project)) {
    warmSrc(src, HERO_IMAGE_SIZES);
    warmSrc(src, GALLERY_IMAGE_SIZES);
  }
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
  if (imageSrc) {
    warmSrc(imageSrc, HERO_IMAGE_SIZES);
    warmSrc(imageSrc, GALLERY_IMAGE_SIZES);
  }
}
