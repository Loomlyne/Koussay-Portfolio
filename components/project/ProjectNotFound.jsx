import Image from "next/image";
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
          <Image
            src="/404.webp"
            alt="404"
            width={908}
            height={636}
            priority
          />
        </Link>
      </section>
    </main>
  );
}
