"use client";

import { useLayoutEffect, useRef } from "react";
import { useLenis } from "lenis/react";

import { isProjectPagerActive } from "./ProjectPagerTransition";
import { isSharedTransitionActive } from "@/components/SharedTransitionProvider";

export default function ScrollTop({ id }) {
  const lenis = useLenis();
  const lenisRef = useRef(lenis);

  useLayoutEffect(() => {
    lenisRef.current = lenis;
  });

  useLayoutEffect(() => {
    if (isProjectPagerActive() || isSharedTransitionActive()) return;

    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true, force: true });
      return;
    }
    window.scrollTo(0, 0);
  }, [id]);

  return null;
}
