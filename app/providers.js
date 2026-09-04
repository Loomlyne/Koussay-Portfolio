"use client";

import { SharedTransitionProvider } from "@/components/SharedTransitionProvider";
import CmsLive from "@/components/CmsLive";

export function Providers({ children }) {
  return (
    <SharedTransitionProvider>
      <CmsLive />
      {children}
    </SharedTransitionProvider>
  );
}
