import Link from "next/link";

import styles from "@/app/work/[slug]/page.module.css";

import ProjectMedia from "./ProjectMedia";

export default function ProjectHero({ project, displayIndex }) {
  const hasLiveUrl = Boolean(project.liveUrl);

  return (
    <header className={styles.hero} aria-labelledby="project-title">
      <div className={styles.heroMeta}>
        <Link href="/" className={styles.backLink}>
          <span aria-hidden="true">←</span>
          Back to works
        </Link>
        <p className={styles.heroIndex} aria-label={`Project ${displayIndex}`}>
          {displayIndex}
        </p>
      </div>

      <div className={styles.heroMedia}>
        <ProjectMedia project={project} preload />
      </div>

      <div className={styles.heroInfo}>
        <p className={styles.heroType}>{project.type}</p>
        <p className={styles.heroYear}>{project.year}</p>
      </div>

      <div className={styles.heroFoot}>
        <h1 id="project-title" className={styles.heroTitle}>
          {project.name}
        </h1>

        <div className={styles.heroActions}>
          {hasLiveUrl ? (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.heroAction}
            >
              View live project
              <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <span className={`${styles.heroAction} ${styles.heroActionMuted}`}>
              View live project
              <span aria-hidden="true">↗</span>
            </span>
          )}
          <Link href="/book" className={styles.heroAction}>
            Start a project
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
