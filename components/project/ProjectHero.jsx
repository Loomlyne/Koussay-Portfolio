import Link from "next/link";

import styles from "@/app/work/[slug]/page.module.css";

import ProjectMedia from "./ProjectMedia";

export default function ProjectHero({ project, displayIndex }) {
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
        <h1 id="project-title" className={styles.heroTitle}>
          {project.name}
        </h1>
        <p className={styles.heroYear}>{project.year}</p>
      </div>
    </header>
  );
}
