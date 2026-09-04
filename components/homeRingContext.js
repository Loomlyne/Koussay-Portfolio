"use client";

import { createContext, useContext } from "react";

export const HomeRingContext = createContext(null);

export function useHomeRing() {
  return useContext(HomeRingContext);
}
