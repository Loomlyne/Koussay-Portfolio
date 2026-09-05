import styles from "@/app/project/[slug]/page.module.css";

export default function ProjectTools({ tools = [], index }) {
  const items = tools.map((tool) => String(tool || "").trim()).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <section className={styles.toolsSection} aria-label="Tools used">
      <div className={styles.toolsHeader}>
        <p className={styles.sectionNumber} aria-hidden="true">
          {String(index).padStart(2, "0")}
        </p>
        <h2 className={styles.sectionTitle}>Tools</h2>
      </div>
      <ul className={styles.toolsList}>
        {items.map((tool) => (
          <li key={tool} className={styles.toolsItem}>
            {tool}
          </li>
        ))}
      </ul>
    </section>
  );
}
