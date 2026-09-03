"use client";

import { useSyncExternalStore } from "react";

import { isSharedTransitionActive } from "@/components/SharedTransitionProvider";

import styles from "./page.module.css";

function subscribe(onStoreChange) {
  if (typeof document === "undefined") return () => {};

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-shared-transition"],
  });

  return () => observer.disconnect();
}

export default function Loading() {
  const transitioning = useSyncExternalStore(
    subscribe,
    isSharedTransitionActive,
    () => false,
  );

  if (transitioning) return null;

  return (
    <main className={styles.page} aria-busy="true" aria-label="Loading project">
      <div className={styles.loadingState}>
        <div className={styles.loadingTopline} aria-hidden="true">
          <span className={styles.loadingRule} />
          <span className={styles.loadingNumber}>00</span>
        </div>

        <div className={styles.loadingHero} aria-hidden="true">
          <div className={styles.loadingFrame} />
        </div>

        <div className={styles.loadingFooter} aria-hidden="true">
          <span className={styles.loadingLabel}>Loading work</span>
          <span className={styles.loadingRule} />
        </div>
      </div>
    </main>
  );
}
