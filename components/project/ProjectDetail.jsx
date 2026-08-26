import styles from "@/app/work/[slug]/page.module.css";

import ProjectHero from "./ProjectHero";
import ProjectPager from "./ProjectPager";
import ProjectSections from "./ProjectSections";

export default function ProjectDetail({
  project,
  displayIndex,
  previous,
  next,
}) {
  const detail = project.detail ?? {};
  const sections = Array.isArray(detail.sections) ? detail.sections : [];

  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <ProjectHero project={project} displayIndex={displayIndex} />

        <div className={styles.content}>
          <header className={styles.intro}>
            <div className={styles.introMeta}>
              <p className={styles.eyebrow}>
                {detail.label ?? "Prototype / speculative"}
              </p>
              {detail.notice ? (
                <aside className={styles.prototypeNotice}>
                  <p>{detail.notice}</p>
                </aside>
              ) : null}
            </div>
            <p className={styles.summary}>{detail.summary}</p>
          </header>

          <ProjectSections sections={sections} />
        </div>

        <ProjectPager previous={previous} next={next} />
      </article>
    </main>
  );
}
