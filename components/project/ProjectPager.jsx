"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getProjectDisplayIndex, projectImageSrc } from "@/lib/projects";
import { warmProject } from "@/lib/project/warm";

import styles from "@/app/project/[slug]/page.module.css";

import { useProjectPager } from "./ProjectPagerTransition";

function PagerLink({ project, direction }) {
  const pager = useProjectPager();
  const router = useRouter();
  const previous = direction === "previous";
  const label = previous ? "Previous work" : "Next work";
  const href = `/project/${project.slug}`;
  const imageSrc = projectImageSrc(project);

  useEffect(() => {
    warmProject(project, router);
  }, [project, router]);

  return (
    <Link
      href={href}
      scroll={false}
      prefetch
      className={`${styles.pagerCard} ${
        previous ? styles.pagerCardPrevious : styles.pagerCardNext
      }`}
      aria-label={`${label}: ${project.name}`}
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        if (!pager?.go) return;
        event.preventDefault();
        pager.go(href, direction, imageSrc);
      }}
    >
      {previous ? (
        <span className={styles.pagerArrow} aria-hidden="true">
          ←
        </span>
      ) : null}

      {previous ? (
        <div className={styles.pagerThumb}>
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="112px"
            className={styles.pagerThumbImage}
          />
        </div>
      ) : null}

      <div className={styles.pagerBody}>
        <span className={styles.pagerDirection}>{label}</span>
        <span className={styles.pagerName}>{project.name}</span>
        <span className={styles.pagerIndex}>
          {getProjectDisplayIndex(project)}
        </span>
      </div>

      {!previous ? (
        <div className={styles.pagerThumb}>
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="112px"
            className={styles.pagerThumbImage}
          />
        </div>
      ) : null}

      {!previous ? (
        <span className={styles.pagerArrow} aria-hidden="true">
          →
        </span>
      ) : null}
    </Link>
  );
}

export default function ProjectPager({ previous, next }) {
  if (!previous || !next) return null;

  return (
    <nav className={styles.pager} aria-label="Browse more work">
      <PagerLink project={previous} direction="previous" />
      <PagerLink project={next} direction="next" />
    </nav>
  );
}
