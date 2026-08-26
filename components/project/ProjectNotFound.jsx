import Link from "next/link";

import styles from "@/app/work/[slug]/page.module.css";

export default function ProjectNotFound() {
  return (
    <main className={styles.page}>
      <section
        className={styles.notFoundState}
        aria-labelledby="work-not-found-title"
      >
        <p className={styles.notFoundNumber}>404</p>
        <div className={styles.notFoundCopy}>
          <p className={styles.eyebrow}>Viscose / Works</p>
          <h1 id="work-not-found-title" className={styles.notFoundTitle}>
            Work not found
          </h1>
          <p className={styles.notFoundDescription}>
            This address does not match a project in the current work index.
          </p>
          <Link href="/" className={styles.backLink}>
            <span aria-hidden="true">←</span>
            Back to works
          </Link>
        </div>
      </section>
    </main>
  );
}
