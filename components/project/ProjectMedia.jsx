"use client";

import Image from "next/image";
import { useState } from "react";

import styles from "@/app/work/[slug]/page.module.css";

export default function ProjectMedia({ project, preload = false }) {
  const imageSrc = project.file.startsWith("/")
    ? project.file
    : `/${project.file}`;
  const [failedSrc, setFailedSrc] = useState(null);
  const imageFailed = failedSrc === imageSrc;

  return (
    <figure className={styles.mediaFigure}>
      <div className={styles.mediaFrame}>
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
            sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) 72vw, 52vw"
            className={styles.mediaImage}
            onError={() => setFailedSrc(imageSrc)}
          />
        )}
      </div>
      <figcaption className={styles.mediaCaption}>
        Placeholder artwork <span aria-hidden="true">·</span> {project.file}
      </figcaption>
    </figure>
  );
}
