import BrandMark from "@/components/BrandMark";
import BackToWorks from "@/components/BackToWorks";
import { PagerAbort } from "@/components/project/ProjectPagerTransition";
import styles from "@/app/work/[slug]/page.module.css";

export default function ProjectNotFound() {
  return (
    <main className={styles.page}>
      <PagerAbort />
      <BrandMark className={styles.pageBrandMark} />
      <section
        className={styles.notFoundState}
        aria-labelledby="work-not-found-title"
      >
        <p className={styles.notFoundNumber}>404</p>
        <div className={styles.notFoundCopy}>
          <p className={styles.eyebrow}>Koussay / Works</p>
          <h1 id="work-not-found-title" className={styles.notFoundTitle}>
            Work not found
          </h1>
          <p className={styles.notFoundDescription}>
            This address does not match a project in the current work index.
          </p>
          <BackToWorks className={styles.backLink} />
        </div>
      </section>
    </main>
  );
}
