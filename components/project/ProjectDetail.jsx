import styles from "@/app/project/[slug]/page.module.css";

import ProjectGallery from "./ProjectGallery";
import ProjectHero from "./ProjectHero";
import ProjectPager from "./ProjectPager";
import ProjectPageShell from "./ProjectPagerTransition";
import ProjectWarm from "./ProjectWarm";
import ProjectSections from "./ProjectSections";
import ProjectTestimonial from "./ProjectTestimonial";
import ProjectTools from "./ProjectTools";
import ScrollTop from "./ScrollTop";

export default function ProjectDetail({
  project,
  displayIndex,
  previous,
  next,
}) {
  const detail = project.detail ?? {};

  return (
    <main className={styles.page}>
      <ProjectWarm current={project} previous={previous} next={next} />
      <ScrollTop id={project.slug} />
      <ProjectPageShell id={project.slug}>
        <article className={styles.article}>
          <ProjectHero project={project} displayIndex={displayIndex} />

          <div className={`${styles.content} project-transition-content`}>
            {detail.summary ? (
              <header className={styles.intro}>
                <p className={styles.summary}>{detail.summary}</p>
              </header>
            ) : null}

            <ProjectSections detail={detail} />
            <ProjectGallery project={project} gallery={detail.gallery} />
            <ProjectTestimonial testimonial={detail.testimonial} />
            <ProjectTools tools={detail.tools} />
          </div>

          <div className="project-transition-content">
            <ProjectPager previous={previous} next={next} />
          </div>
        </article>
      </ProjectPageShell>
    </main>
  );
}
