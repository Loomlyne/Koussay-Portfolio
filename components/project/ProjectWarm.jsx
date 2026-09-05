"use client";

import { useLayoutEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { projectImageSrc } from "@/lib/projects";
import { HERO_IMAGE_SIZES, rememberProject, warmProject } from "@/lib/project/warm";
import styles from "@/app/work/[slug]/page.module.css";

export default function ProjectWarm({ current, previous, next }) {
  const router = useRouter();
  const neighbors = [previous, next].filter(Boolean);

  useLayoutEffect(() => {
    rememberProject(current);
    warmProject(previous, router);
    warmProject(next, router);
  }, [current, previous, next, router]);

  return (
    <div className={styles.warmCache} aria-hidden="true">
      {neighbors.map((project) => {
        const src = projectImageSrc(project);
        if (!src) return null;
        return (
          <span key={project.slug} className={styles.warmSlot}>
            <Image
              src={src}
              alt=""
              fill
              sizes={HERO_IMAGE_SIZES}
            />
          </span>
        );
      })}
    </div>
  );
}
