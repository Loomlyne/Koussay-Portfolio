import Link from "next/link";

import { PagerAbort } from "@/components/project/ProjectPagerTransition";
import styles from "@/app/project/[slug]/page.module.css";

export default function ProjectNotFound() {
  return (
    <main className={styles.page}>
      <PagerAbort />
      <h1 className="sr-only">404</h1>
      <section className={styles.notFoundState}>
        <Link href="/" aria-label="Home" className={styles.notFoundMark}>
          <span className={styles.notFoundText} aria-hidden="true">
            404
          </span>
        </Link>
      </section>
    </main>
  );
}
