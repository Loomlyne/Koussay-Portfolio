import Link from "next/link";

import BrandMark from "@/components/BrandMark";
import BackToWorks from "@/components/BackToWorks";
import styles from "@/app/project/[slug]/page.module.css";

import ProjectMedia from "./ProjectMedia";

export default function ProjectHero({ project, displayIndex }) {
  const hasLiveUrl = Boolean(project.liveUrl);

  return (
    <header className={styles.hero} aria-labelledby="project-title">
      <div className={styles.heroMeta}>
        <div className={styles.brandRow}>
          <BrandMark className={styles.brandMark} />
          <BackToWorks className={styles.backLink} />
        </div>
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
              className="glass-btn glass-btn--cta"
            >
              View live project
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
          <Link
            href="/book"
            className="glass-btn glass-btn--cta glass-btn--solid"
          >
            Start a project
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
