import styles from "@/app/project/[slug]/page.module.css";

function isPublishedQuote(quote) {
  const text = String(quote || "").trim();
  if (!text) return false;
  return !/placeholder client feedback|replace with a verified quote/i.test(
    text,
  );
}

export default function ProjectTestimonial({ testimonial }) {
  if (!isPublishedQuote(testimonial?.quote)) return null;

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
