import styles from "@/app/work/[slug]/page.module.css";

const NARRATIVE = [
  { key: "overview", title: "Overview" },
  { key: "challenge", title: "Challenge" },
  { key: "outcome", title: "Outcome" },
];

export default function ProjectSections({ detail }) {
  const blocks = NARRATIVE.map(({ key, title }) => ({
    title,
    body: detail?.[key],
  })).filter((block) => block.body);

  if (blocks.length === 0) return null;

  return (
    <section className={styles.sections} aria-label="Project narrative">
      {blocks.map((section, index) => {
        const headingId = `project-section-${index + 1}`;

        return (
          <section
            key={section.title}
            className={styles.detailSection}
            aria-labelledby={headingId}
          >
            <p className={styles.sectionNumber} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </p>
            <div className={styles.sectionCopy}>
              <h2 id={headingId} className={styles.sectionTitle}>
                {section.title}
              </h2>
              <p className={styles.sectionBody}>{section.body}</p>
            </div>
          </section>
        );
      })}
    </section>
  );
}
