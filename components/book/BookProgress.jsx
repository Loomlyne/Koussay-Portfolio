import styles from "@/app/book/page.module.css";

export default function BookProgress({ step, total }) {
  const progress = Math.max(0, Math.min(1, (step + 1) / total));

  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step + 1}
      aria-label={`Step ${step + 1} of ${total}`}
    >
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
