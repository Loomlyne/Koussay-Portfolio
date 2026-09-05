"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import gsap from "gsap";

const SharedTransitionContext = createContext(null);

const DURATION = 0.88;
const FADE = 0.18;
const FAILSAFE = 4200;
const LENIS_EASE = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

function flyerFrom(from) {
  return {
    left: from.left,
    top: from.top,
    width: from.width,
    height: from.height,
    borderRadius: from.borderRadius ?? 12,
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    transformOrigin: "0 0",
    opacity: 1,
    force3D: true,
  };
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function useSharedTransition() {
  return useContext(SharedTransitionContext);
}

export function isSharedTransitionActive() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("shared-transition");
}

export function SharedTransitionProvider({ children }) {
  const pathname = usePathname();
  const [active, setActive] = useState(null);
  const flyerRef = useRef(null);
  const scrimRef = useRef(null);
  const animatingRef = useRef(false);
  const landedRef = useRef(false);
  const activeRef = useRef(null);
  const paintReadyRef = useRef(null);
  const startGenRef = useRef(0);

  useLayoutEffect(() => {
    activeRef.current = active;
  }, [active]);

  const finish = useCallback(() => {
    animatingRef.current = false;
    landedRef.current = false;
    setActive(null);
    document.documentElement.classList.remove("shared-transition");
    document.documentElement.dataset.sharedTransition = "";
  }, []);

  const abort = useCallback(() => {
    startGenRef.current += 1;
    paintReadyRef.current?.(false);
    paintReadyRef.current = null;
    if (flyerRef.current) gsap.killTweensOf(flyerRef.current);
    if (scrimRef.current) gsap.killTweensOf(scrimRef.current);
    finish();
  }, [finish]);

  const start = useCallback(({ slug, src, from }) => {
    if (prefersReducedMotion()) return Promise.resolve(false);

    const gen = ++startGenRef.current;

    return preloadImage(src)
      .catch(() => null)
      .then((image) => {
        if (gen !== startGenRef.current) return false;
        const ratio =
          image?.naturalWidth && image.naturalHeight
            ? image.naturalWidth / image.naturalHeight
            : null;
        return new Promise((resolve) => {
          paintReadyRef.current = resolve;
          landedRef.current = false;
          animatingRef.current = false;
          setActive({ slug, src, from, ratio });
          document.documentElement.classList.add("shared-transition");
          document.documentElement.dataset.sharedTransition = "holding";
        });
      });
  }, []);

  const land = useCallback(
    (targetEl, slug) => {
      const current = activeRef.current;
      if (
        !current ||
        current.slug !== slug ||
        !targetEl ||
        !flyerRef.current ||
        animatingRef.current ||
        landedRef.current
      ) {
        return;
      }

      landedRef.current = true;
      animatingRef.current = true;
      document.documentElement.dataset.sharedTransition = "animating";

      const flyer = flyerRef.current;
      const from = current.from;
      const to = targetEl.getBoundingClientRect();
      const toRadius =
        parseFloat(getComputedStyle(targetEl).borderRadius) || 12;

      const scaleX = to.width / Math.max(1, from.width);
      const scaleY = to.height / Math.max(1, from.height);

      gsap.killTweensOf(flyer);
      gsap.set(flyer, {
        ...flyerFrom(from),
        willChange: "transform, border-radius",
      });

      gsap.to(flyer, {
        x: to.left - from.left,
        y: to.top - from.top,
        scaleX,
        scaleY,
        borderRadius: toRadius,
        duration: DURATION,
        ease: LENIS_EASE,
        overwrite: true,
        onComplete: () => {
          document.documentElement.dataset.sharedTransition = "complete";
          gsap.to(flyer, {
            opacity: 0,
            duration: FADE,
            ease: "power2.out",
            onComplete: finish,
          });
        },
      });
    },
    [finish],
  );

  useEffect(() => {
    const current = activeRef.current;
    if (!current) return;
    if (pathname === `/work/${current.slug}`) return;
    abort();
  }, [pathname, abort]);

  useEffect(() => {
    if (!active) return undefined;
    const id = window.setTimeout(() => abort(), FAILSAFE);
    return () => window.clearTimeout(id);
  }, [active, abort]);

  useLayoutEffect(() => {
    if (!active || !flyerRef.current) return;

    const { from } = active;
    const flyer = flyerRef.current;
    const scrim = scrimRef.current;

    gsap.killTweensOf(flyer);
    gsap.set(flyer, {
      ...flyerFrom(from),
      clearProps: "willChange",
    });

    if (scrim) {
      gsap.set(scrim, { opacity: 1 });
    }

    const ready = paintReadyRef.current;
    paintReadyRef.current = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ready?.(true);
      });
    });
  }, [active]);

  const value = {
    active,
    start,
    land,
    abort,
    isTarget: (slug) => active?.slug === slug,
  };

  return (
    <SharedTransitionContext.Provider value={value}>
      {children}
      {active &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="shared-transition-root" aria-hidden="true">
            <div ref={scrimRef} className="shared-transition-scrim" />
            <div
              ref={flyerRef}
              className="shared-transition-flyer"
              style={{
                left: active.from.left,
                top: active.from.top,
                width: active.from.width,
                height: active.from.height,
                borderRadius: active.from.borderRadius ?? 12,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={active.src} alt="" draggable={false} decoding="sync" />
            </div>
          </div>,
          document.body,
        )}
    </SharedTransitionContext.Provider>
  );
}
