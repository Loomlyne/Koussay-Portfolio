import styles from "@/app/work/[slug]/page.module.css";

export default function ProjectSections({ sections }) {
  if (sections.length === 0) return null;

  return (
    <section className={styles.sections} aria-label="Project details">
      {sections.map((section, index) => {
        const headingId = `project-section-${index + 1}`;

        return (
          <section
            key={`${section.title}-${index}`}
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
