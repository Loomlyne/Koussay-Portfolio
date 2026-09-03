"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";

import { useSharedTransition } from "@/components/SharedTransitionProvider";
import styles from "@/app/work/[slug]/page.module.css";

export default function ProjectMedia({ project, preload = false }) {
  const imageSrc = project.file.startsWith("/")
    ? project.file
    : `/${project.file}`;
  const [failedSrc, setFailedSrc] = useState(null);
  const imageFailed = failedSrc === imageSrc;
  const frameRef = useRef(null);
  const sharedTransition = useSharedTransition();
  const isTransitionTarget = sharedTransition?.isTarget(project.slug) ?? false;

  useLayoutEffect(() => {
    if (!isTransitionTarget || !frameRef.current || !sharedTransition) return;

    let cancelled = false;

    const run = () => {
      if (!cancelled) {
        sharedTransition.land(frameRef.current, project.slug);
      }
    };

    // Two frames so the hero frame has its final layout before we measure it.
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [isTransitionTarget, project.slug, sharedTransition]);

  return (
    <figure
      className={`${styles.mediaFigure} ${isTransitionTarget ? styles.mediaFigureTransitioning : ""}`}
    >
      <div ref={frameRef} className={styles.mediaFrame}>
        {imageFailed ? (
          <div
            className={styles.mediaFallback}
            role="img"
            aria-label={`Artwork unavailable for ${project.name}`}
          >
            <span className={styles.mediaFallbackLabel}>
              Artwork unavailable
            </span>
            <span className={styles.mediaFallbackFile}>{project.file}</span>
          </div>
        ) : (
          <Image
            src={imageSrc}
            alt={`${project.name} — placeholder artwork`}
            fill
            preload={preload}
            sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) 86vw, 62vw"
            className={styles.mediaImage}
            onError={() => setFailedSrc(imageSrc)}
          />
        )}
      </div>
    </figure>
  );
}
