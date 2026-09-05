"use client";

import Image from "next/image";
import Link from "next/link";

import { SITE_MARK_ALT } from "@/lib/site";
import { useHomeRing } from "./homeRingContext";

export default function BrandMark({ className = "", size = 40 }) {
  const home = useHomeRing();

  return (
    <Link
      href="/"
      aria-label="Koussay Zayani — home"
      className={`inline-block leading-none transition-opacity hover:opacity-70 ${className}`.trim()}
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
      <Image
        src="/logo.png"
        alt={SITE_MARK_ALT}
        width={size}
        height={size}
        priority
      />
    </Link>
  );
}
