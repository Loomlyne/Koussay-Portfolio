import Link from "next/link";

import styles from "./page.module.css";

export const metadata = {
  title: "Start a project — Viscose",
  description: "Book a call or start a new project with Koussay.",
};

export default function BookPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.backLink}>
          <span aria-hidden="true">←</span>
          Back to works
        </Link>
        <h1 className={styles.title}>Start a project</h1>
        <p className={styles.copy}>
          Booking is coming soon. This page will host a call scheduler and a
          short project brief form.
        </p>
      </div>
    </main>
  );
}
