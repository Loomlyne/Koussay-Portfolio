import styles from "@/app/book/page.module.css";

export default function BookProgress({ step, total }) {
  const current = step;
  const lastIndex = total - 1;
  const remaining = Math.max(0, total - step - 1);
  const progress = lastIndex > 0 ? current / lastIndex : 0;

  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={lastIndex}
      aria-valuenow={current}
      aria-label={`Step ${current} of ${total}`}
    >
      <div className={styles.progressMeta}>
        <span>
          {current} of {total}
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
