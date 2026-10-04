"use client";

import { HomeRingProvider } from "@/components/HomeRing";
import { ProjectPagerProvider } from "@/components/project/ProjectPagerTransition";
import { SharedTransitionProvider } from "@/components/SharedTransitionProvider";
import SmoothScroll from "@/components/SmoothScroll";

export function Providers({ children }) {
  return (
    <SharedTransitionProvider>
      <SmoothScroll>
        <ProjectPagerProvider>
          <HomeRingProvider>{children}</HomeRingProvider>
        </ProjectPagerProvider>
      </SmoothScroll>
    </SharedTransitionProvider>
  );
}
