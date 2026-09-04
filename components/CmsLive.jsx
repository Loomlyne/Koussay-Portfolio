"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

function isLiveHost() {
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

export default function CmsLive() {
  const router = useRouter();
  const stampRef = useRef(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!isLiveHost()) return undefined;

    let cancelled = false;

    const tick = async () => {
      if (cancelled || refreshingRef.current) return;
      try {
        const response = await fetch("/api/cms-stamp", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const next = data?.stamp;
        if (!next) return;
        if (stampRef.current && next !== stampRef.current) {
          refreshingRef.current = true;
          router.refresh();
          window.setTimeout(() => {
            refreshingRef.current = false;
          }, 1200);
        }
        stampRef.current = next;
      } catch {
        // Stay on the last good frame if Notion blips.
      }
    };

    tick();
    const id = window.setInterval(tick, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [router]);

  return null;
}
