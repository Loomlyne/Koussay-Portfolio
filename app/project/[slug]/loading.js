"use client";

import { useSyncExternalStore } from "react";

import { isProjectPagerActive } from "@/components/project/ProjectPagerTransition";
import { isSharedTransitionActive } from "@/components/SharedTransitionProvider";

import styles from "./page.module.css";

function subscribe(onStoreChange) {
  if (typeof document === "undefined") return () => {};

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-shared-transition", "data-project-pager"],
  });

  return () => observer.disconnect();
}

export default function Loading() {
  const transitioning = useSyncExternalStore(
    subscribe,
    () => isSharedTransitionActive() || isProjectPagerActive(),
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
          <span className={styles.loadingLabel}>Loading project</span>
          <span className={styles.loadingRule} />
        </div>
      </div>
    </main>
  );
}
