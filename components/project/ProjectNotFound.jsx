import BrandMark from "@/components/BrandMark";
import BackToWorks from "@/components/BackToWorks";
import { PagerAbort } from "@/components/project/ProjectPagerTransition";
import styles from "@/app/project/[slug]/page.module.css";

export default function ProjectNotFound() {
  return (
    <main className={styles.page}>
      <PagerAbort />
      <BrandMark className={styles.pageBrandMark} />
      <section
        className={styles.notFoundState}
        aria-labelledby="project-not-found-title"
      >
        <p className={styles.notFoundNumber}>404</p>
        <div className={styles.notFoundCopy}>
          <p className={styles.eyebrow}>Koussay / Projects</p>
          <h1 id="project-not-found-title" className={styles.notFoundTitle}>
            Project not found
          </h1>
          <p className={styles.notFoundDescription}>
            This address does not match a project in the current index.
          </p>
          <BackToWorks className={styles.backLink} />
        </div>
      </section>
    </main>
  );
}
