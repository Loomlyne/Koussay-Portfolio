"use client";

import { usePathname } from "next/navigation";

import ChargingMark from "@/components/ChargingMark";
import { useHomeRing } from "@/components/homeRingContext";

export default function Loading() {
  const pathname = usePathname();
  const home = useHomeRing();
  if (pathname !== "/" || home?.ready) return null;

  return (
    <div className="home-charging-fallback">
      <ChargingMark />
    </div>
  );
}
