"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";

import { useSharedTransition } from "@/components/SharedTransitionProvider";
import { projectImageSrc } from "@/lib/projects";
import { HERO_IMAGE_SIZES } from "@/lib/project/warm";
import styles from "@/app/work/[slug]/page.module.css";

export default function ProjectMedia({ project, preload = false }) {
  const imageSrc = projectImageSrc(project);
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

  const fitToImage = (image) => {
    const width = image?.naturalWidth;
    const height = image?.naturalHeight;
    if (!width || !height || !frameRef.current) return;
    frameRef.current.style.setProperty("--media-ratio", String(width / height));
  };

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
            sizes={HERO_IMAGE_SIZES}
            className={styles.mediaImage}
            onLoad={(event) => fitToImage(event.currentTarget)}
            onError={() => setFailedSrc(imageSrc)}
          />
        )}
      </div>
    </figure>
  );
}
