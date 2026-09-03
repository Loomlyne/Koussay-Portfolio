import styles from "@/app/work/[slug]/page.module.css";

export default function ProjectTestimonial({ testimonial }) {
  if (!testimonial?.quote) return null;

  return (
    <section className={styles.testimonialSection} aria-label="Testimonial">
      <div className={styles.testimonialHeader}>
        <p className={styles.sectionNumber} aria-hidden="true">
          05
        </p>
        <h2 className={styles.sectionTitle}>Testimonial</h2>
      </div>
      <figure className={styles.testimonialFigure}>
        <div className={styles.testimonialCopy}>
          <blockquote className={styles.testimonialQuote}>
            <p>{`“${testimonial.quote}”`}</p>
          </blockquote>
          {(testimonial.author || testimonial.role) && (
            <figcaption className={styles.testimonialAttribution}>
              {testimonial.author ? (
                <span className={styles.testimonialAuthor}>
                  {testimonial.author}
                </span>
              ) : null}
              {testimonial.role ? (
                <span className={styles.testimonialRole}>
                  {testimonial.role}
                </span>
              ) : null}
            </figcaption>
          )}
        </div>
      </figure>
    </section>
  );
}
