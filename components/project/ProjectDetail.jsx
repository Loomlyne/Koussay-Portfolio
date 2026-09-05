import styles from "@/app/project/[slug]/page.module.css";

import { projectImageSrc } from "@/lib/projects";

import ProjectGallery from "./ProjectGallery";
import ProjectHero from "./ProjectHero";
import ProjectPager from "./ProjectPager";
import ProjectPageShell from "./ProjectPagerTransition";
import ProjectWarm from "./ProjectWarm";
import ProjectSections from "./ProjectSections";
import ProjectTestimonial from "./ProjectTestimonial";
import ProjectTools from "./ProjectTools";
import ScrollTop from "./ScrollTop";

function filled(value) {
  return Boolean(String(value || "").trim());
}

function hasPublishedQuote(quote) {
  const text = String(quote || "").trim();
  if (!text) return false;
  return !/placeholder client feedback|replace with a verified quote/i.test(
    text,
  );
}

export default function ProjectDetail({
  project,
  displayIndex,
  previous,
  next,
}) {
  const detail = project.detail ?? {};
  const summary = String(detail.summary || "").trim();
  const gallery = (detail.gallery ?? []).filter((item) =>
    projectImageSrc(item.file ?? item),
  );
  const tools = (detail.tools ?? [])
    .map((tool) => String(tool || "").trim())
    .filter(Boolean);
  const testimonial = hasPublishedQuote(detail.testimonial?.quote)
    ? detail.testimonial
    : null;

  const narrativeCount = ["overview", "challenge", "outcome"].filter((key) =>
    filled(detail[key]),
  ).length;

  let section = narrativeCount + 1;
  const take = () => section++;

  return (
    <main className={styles.page}>
      <ProjectWarm current={project} previous={previous} next={next} />
      <ScrollTop id={project.slug} />
      <ProjectPageShell id={project.slug}>
        <article className={styles.article}>
          <ProjectHero project={project} displayIndex={displayIndex} />

          <div className={`${styles.content} project-transition-content`}>
            {summary ? (
              <header className={styles.intro}>
                <p className={styles.summary}>{summary}</p>
              </header>
            ) : null}

            <ProjectSections detail={detail} />
            {gallery.length > 0 ? (
              <ProjectGallery
                project={project}
                gallery={gallery}
                index={take()}
              />
            ) : null}
            {testimonial ? (
              <ProjectTestimonial testimonial={testimonial} index={take()} />
            ) : null}
            {tools.length > 0 ? (
              <ProjectTools tools={tools} index={take()} />
            ) : null}
          </div>

          <div className="project-transition-content">
            <ProjectPager previous={previous} next={next} />
          </div>
        </article>
      </ProjectPageShell>
    </main>
  );
}
