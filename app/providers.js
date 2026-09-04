"use client";

import CmsLive from "@/components/CmsLive";
import { HomeRingProvider } from "@/components/HomeRing";
import { SharedTransitionProvider } from "@/components/SharedTransitionProvider";

export function Providers({ children }) {
  return (
    <SharedTransitionProvider>
      <HomeRingProvider>
        <CmsLive />
        {children}
      </HomeRingProvider>
    </SharedTransitionProvider>
  );
}
