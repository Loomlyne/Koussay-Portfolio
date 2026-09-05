"use client";

import CmsLive from "@/components/CmsLive";
import { HomeRingProvider } from "@/components/HomeRing";
import { ProjectPagerProvider } from "@/components/project/ProjectPagerTransition";
import { SharedTransitionProvider } from "@/components/SharedTransitionProvider";
import SmoothScroll from "@/components/SmoothScroll";

export function Providers({ children }) {
  return (
    <SharedTransitionProvider>
      <SmoothScroll>
        <ProjectPagerProvider>
          <HomeRingProvider>
            <CmsLive />
            {children}
          </HomeRingProvider>
        </ProjectPagerProvider>
      </SmoothScroll>
    </SharedTransitionProvider>
  );
}
