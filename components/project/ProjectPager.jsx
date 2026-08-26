import Link from "next/link";

import { getProjectDisplayIndex } from "@/lib/projects";

import styles from "@/app/work/[slug]/page.module.css";

function PagerLink({ project, direction }) {
  const previous = direction === "previous";
  const label = previous ? "Previous work" : "Next work";

  return (
    <Link
      href={`/work/${project.slug}`}
      className={`${styles.pagerLink} ${
        previous ? styles.pagerPrevious : styles.pagerNext
      }`}
      aria-label={`${label}: ${project.name}`}
    >
      <span className={styles.pagerDirection}>{label}</span>
      <span className={styles.pagerName}>{project.name}</span>
      <span className={styles.pagerIndex}>
        {getProjectDisplayIndex(project)}
      </span>
      <span className={styles.pagerArrow} aria-hidden="true">
        {previous ? "←" : "→"}
      </span>
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
