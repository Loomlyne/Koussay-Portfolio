import Image from "next/image";
import Link from "next/link";

import { getProjectDisplayIndex } from "@/lib/projects";

import styles from "@/app/work/[slug]/page.module.css";

function projectImageSrc(project) {
  return project.file.startsWith("/") ? project.file : `/${project.file}`;
}

function PagerLink({ project, direction }) {
  const previous = direction === "previous";
  const label = previous ? "Previous work" : "Next work";
  const imageSrc = projectImageSrc(project);

  return (
    <Link
      href={`/work/${project.slug}`}
      className={`${styles.pagerCard} ${
        previous ? styles.pagerCardPrevious : styles.pagerCardNext
      }`}
      aria-label={`${label}: ${project.name}`}
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
