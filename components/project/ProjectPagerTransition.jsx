"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLenis } from "lenis/react";
import gsap from "gsap";

const ProjectPagerContext = createContext(null);

const DURATION = 1.2;
const FAILSAFE = 5000;
const LENIS_EASE = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function currentScroll(lenis) {
  if (typeof lenis?.scroll === "number") return lenis.scroll;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function captureFlyer(lenis) {
  const page = document.querySelector("[data-project-page]");
  if (!page) return null;

  const flyer = document.createElement("div");
  flyer.className = "project-pager-flyer";
  flyer.setAttribute("aria-hidden", "true");

  const clone = page.cloneNode(true);
  clone.removeAttribute("data-project-page");
  clone.removeAttribute("data-pager-landed");
  clone.removeAttribute("inert");
  clone.style.transform = `translateY(${-currentScroll(lenis)}px)`;
  flyer.appendChild(clone);
  document.body.appendChild(flyer);
  page.setAttribute("data-project-outgoing", "");

  return flyer;
}

function lockPager(direction) {
  document.documentElement.classList.add("project-pager");
  document.documentElement.dataset.projectPager = direction;
}

function unlockPager() {
  document.documentElement.classList.remove("project-pager");
  document.documentElement.removeAttribute("data-project-pager");
  document.querySelectorAll("[data-project-outgoing]").forEach((node) => {
    node.removeAttribute("data-project-outgoing");
  });
}

export function isProjectPagerActive() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("project-pager");
}

export function useProjectPager() {
  return useContext(ProjectPagerContext);
}

export function ProjectPagerProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const pendingRef = useRef(null);
  const failsafeRef = useRef(0);
  const genRef = useRef(0);
  const lenisRef = useRef(lenis);

  useLayoutEffect(() => {
    lenisRef.current = lenis;
  });

  const clear = useCallback(() => {
    genRef.current += 1;
    const pending = pendingRef.current;
    if (pending?.flyer?.isConnected) {
      gsap.killTweensOf(pending.flyer);
      pending.flyer.remove();
    }
    pendingRef.current = null;
    window.clearTimeout(failsafeRef.current);
    unlockPager();
    const currentLenis = lenisRef.current;
    currentLenis?.start();
    currentLenis?.resize();
  }, []);

  useEffect(() => () => clear(), [clear]);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (pathname === pending.from || pathname === pending.href) return;
    clear();
  }, [pathname, clear]);

  const begin = useCallback(
    (direction, href) => {
      if (pendingRef.current) return false;

      lockPager(direction);
      lenisRef.current?.stop();

      const flyer = prefersReducedMotion() ? null : captureFlyer(lenisRef.current);
      pendingRef.current = {
        direction,
        flyer,
        href,
        from: pathname,
      };
      failsafeRef.current = window.setTimeout(clear, FAILSAFE);
      return true;
    },
    [clear, pathname],
  );

  const peek = useCallback(() => pendingRef.current?.direction ?? null, []);

  const play = useCallback((incomingEl) => {
    const pending = pendingRef.current;
    if (!pending) return false;

    window.clearTimeout(failsafeRef.current);
    const gen = ++genRef.current;
    const { direction, flyer } = pending;
    const distance = window.innerHeight;
    const outY = direction === "next" ? -distance : distance;
    const inY = direction === "next" ? distance : -distance;
    const currentLenis = lenisRef.current;

    currentLenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);

    const done = () => {
      if (gen !== genRef.current) return;
      if (incomingEl) incomingEl.removeAttribute("inert");
      // Drop the pager CSS offset while GSAP still holds y:0, then clear the
      // inline transform so the page does not snap back to 100svh.
      clear();
      if (incomingEl) {
        gsap.set(incomingEl, { clearProps: "transform" });
        document.getElementById("project-title")?.focus({ preventScroll: true });
      }
    };

    if (flyer) {
      gsap.killTweensOf(flyer);
      gsap.fromTo(
        flyer,
        { y: 0, force3D: true },
        {
          y: outY,
          duration: DURATION,
          ease: LENIS_EASE,
          overwrite: true,
          onComplete: () => {
            flyer.remove();
            if (!incomingEl) done();
          },
        },
      );
    }

    if (incomingEl) {
      incomingEl.setAttribute("inert", "");
      incomingEl.setAttribute("data-pager-landed", "");
      gsap.killTweensOf(incomingEl);
      gsap.fromTo(
        incomingEl,
        { y: inY, force3D: true },
        {
          y: 0,
          duration: DURATION,
          ease: LENIS_EASE,
          overwrite: true,
          onComplete: done,
        },
      );
    } else if (!flyer) {
      done();
    }

    return true;
  }, [clear]);

  const go = useCallback(
    (href, direction, previewSrc) => {
      if (pendingRef.current) return;

      router.prefetch(href);
      if (previewSrc && typeof window !== "undefined") {
        const image = new window.Image();
        image.decoding = "async";
        image.src = previewSrc;
      }

      if (prefersReducedMotion()) {
        router.push(href, { scroll: false });
        return;
      }

      if (!begin(direction, href)) return;
      router.push(href, { scroll: false });
    },
    [begin, router],
  );

  const value = useMemo(
    () => ({ go, peek, play, clear }),
    [go, peek, play, clear],
  );

  return (
    <ProjectPagerContext.Provider value={value}>
      {children}
    </ProjectPagerContext.Provider>
  );
}

export function PagerAbort() {
  const pager = useProjectPager();

  useEffect(() => {
    pager?.clear?.();
  }, [pager]);

  return null;
}

export default function ProjectPageShell({ id, children }) {
  const ref = useRef(null);
  const pager = useProjectPager();
  const pagerRef = useRef(pager);

  useLayoutEffect(() => {
    pagerRef.current = pager;
  });

  useLayoutEffect(() => {
    const incoming = ref.current;
    const currentPager = pagerRef.current;
    const direction = currentPager?.peek();

    if (direction && incoming) {
      currentPager.play(incoming);
      return () => {
        gsap.killTweensOf(incoming);
      };
    }

    incoming?.removeAttribute("data-pager-landed");
    incoming?.removeAttribute("inert");
    if (incoming) gsap.set(incoming, { y: 0, clearProps: "transform" });
    return undefined;
  }, [id]);

  return (
    <div ref={ref} data-project-page>
      {children}
    </div>
  );
}
