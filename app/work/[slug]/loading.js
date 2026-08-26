import styles from "./page.module.css";

export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true" aria-label="Loading project">
      <div className={styles.loadingState}>
        <div className={styles.loadingTopline} aria-hidden="true">
          <span className={styles.loadingRule} />
          <span className={styles.loadingNumber}>00</span>
        </div>

        <div className={styles.loadingHero} aria-hidden="true">
          <div className={styles.loadingFrame} />
        </div>

        <div className={styles.loadingFooter} aria-hidden="true">
          <span className={styles.loadingLabel}>Loading work</span>
          <span className={styles.loadingRule} />
        </div>
      </div>
    </main>
  );
}
