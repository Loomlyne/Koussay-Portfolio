"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis } from "lenis/react";

import "lenis/dist/lenis.css";

const OPTIONS = {
  autoRaf: true,
  lerp: 0.08,
  wheelMultiplier: 0.88,
  touchMultiplier: 1,
  anchors: true,
  allowNestedScroll: true,
  stopInertiaOnNavigate: true,
  respectReducedMotion: true,
};

function isScrollLocked() {
  const html = document.documentElement;
  return (
    html.classList.contains("ring-lock") ||
    html.classList.contains("shared-transition") ||
    html.classList.contains("project-pager")
  );
}

function syncLenis(lenis) {
  if (!lenis) return;
  if (isScrollLocked()) lenis.stop();
  else lenis.start();
}

function LenisGate() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return undefined;

    const apply = () => syncLenis(lenis);
    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-project-pager", "data-shared-transition"],
    });

    return () => observer.disconnect();
  }, [lenis]);

  return null;
}

function useRingLock() {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const read = () => {
      setLocked(document.documentElement.classList.contains("ring-lock"));
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return locked;
}

export default function SmoothScroll({ children }) {
  const pathname = usePathname();
  const ringLocked = useRingLock();
  // The home ring owns wheel/touch. Unmount Lenis there instead of stop() —
  // a stopped instance still consumes those events.
  const enabled = pathname !== "/" && !ringLocked;

  return (
    <>
      {enabled ? (
        <>
          <ReactLenis root options={OPTIONS} />
          <LenisGate />
        </>
      ) : null}
      {children}
    </>
  );
}
