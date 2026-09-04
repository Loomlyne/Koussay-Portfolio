import styles from "@/app/book/page.module.css";

export default function BookProgress({ step, total }) {
  const remaining = Math.max(0, total - step);
  const progress = total > 1 ? (step - 1) / (total - 1) : 1;

  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      aria-label={`Step ${step} of ${total}`}
    >
      <div className={styles.progressMeta}>
        <span>
          {step} of {total}
        </span>
        <span>{remaining} left</span>
      </div>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
