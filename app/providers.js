"use client";

import { SharedTransitionProvider } from "@/components/SharedTransitionProvider";

export function Providers({ children }) {
  return <SharedTransitionProvider>{children}</SharedTransitionProvider>;
}
