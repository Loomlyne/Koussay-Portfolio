import styles from "@/app/work/[slug]/page.module.css";

export default function ProjectTools({ tools = [] }) {
  if (tools.length === 0) return null;

  return (
    <section className={styles.toolsSection} aria-label="Tools used">
      <div className={styles.toolsHeader}>
        <p className={styles.sectionNumber} aria-hidden="true">
          06
        </p>
        <h2 className={styles.sectionTitle}>Tools</h2>
      </div>
      <ul className={styles.toolsList}>
        {tools.map((tool) => (
          <li key={tool} className={styles.toolsItem}>
            {tool}
          </li>
        ))}
      </ul>
    </section>
  );
}
