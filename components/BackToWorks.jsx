"use client";

import Link from "next/link";

import { useHomeRing } from "./homeRingContext";

export default function BackToWorks({
  className,
  children = "Back to projects",
  arrow = true,
}) {
  const home = useHomeRing();

  return (
    <Link
      href="/"
      className={className}
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        home?.prepareHome?.();
      }}
    >
      {arrow ? <span aria-hidden="true">←</span> : null}
      {children}
    </Link>
  );
}
