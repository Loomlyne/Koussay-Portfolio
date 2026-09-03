"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";

const SharedTransitionContext = createContext(null);

const DURATION = 0.9;
const EASE = "power3.inOut";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useSharedTransition() {
  return useContext(SharedTransitionContext);
}

export function SharedTransitionProvider({ children }) {
  const [active, setActive] = useState(null);
  const flyerRef = useRef(null);
  const scrimRef = useRef(null);
  const animatingRef = useRef(false);
  const landedRef = useRef(false);

  const finish = useCallback(() => {
    animatingRef.current = false;
    landedRef.current = false;
    setActive(null);
    document.documentElement.classList.remove("shared-transition");
    document.documentElement.dataset.sharedTransition = "";
  }, []);

  const start = useCallback(({ slug, src, from }) => {
    if (prefersReducedMotion()) return false;

    landedRef.current = false;
    animatingRef.current = false;
    setActive({ slug, src, from });
    document.documentElement.classList.add("shared-transition");
    document.documentElement.dataset.sharedTransition = "active";
    return true;
  }, []);

  const land = useCallback(
    (targetEl, slug) => {
      if (
        !active ||
        active.slug !== slug ||
        !targetEl ||
        !flyerRef.current ||
        animatingRef.current ||
        landedRef.current
      ) {
        return;
      }

      landedRef.current = true;
      animatingRef.current = true;

      const flyer = flyerRef.current;
      const scrim = scrimRef.current;
      const to = targetEl.getBoundingClientRect();
      const toRadius = parseFloat(getComputedStyle(targetEl).borderRadius) || 12;

      gsap.to(flyer, {
        left: to.left,
        top: to.top,
        width: to.width,
        height: to.height,
        borderRadius: toRadius,
        duration: DURATION,
        ease: EASE,
        onComplete: () => {
          gsap.to([flyer, scrim], {
            opacity: 0,
            duration: 0.22,
            ease: "power2.out",
            onComplete: finish,
          });
          document.documentElement.dataset.sharedTransition = "complete";
        },
      });

      gsap.to(scrim, {
        opacity: 1,
        duration: DURATION * 0.55,
        ease: "power2.out",
      });
    },
    [active, finish],
  );

  useEffect(() => {
    if (!active || !flyerRef.current) return;

    const { from } = active;
    gsap.set(flyerRef.current, {
      left: from.left,
      top: from.top,
      width: from.width,
      height: from.height,
      borderRadius: from.borderRadius ?? 12,
      opacity: 1,
    });

    if (scrimRef.current) {
      gsap.set(scrimRef.current, { opacity: 0.92 });
    }
  }, [active]);

  const value = {
    active,
    start,
    land,
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
            <div ref={flyerRef} className="shared-transition-flyer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={active.src} alt="" draggable={false} />
            </div>
          </div>,
          document.body,
        )}
    </SharedTransitionContext.Provider>
  );
}
