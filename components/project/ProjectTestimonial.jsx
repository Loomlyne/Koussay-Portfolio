import styles from "@/app/project/[slug]/page.module.css";

function isPublishedQuote(quote) {
  const text = String(quote || "").trim();
  if (!text) return false;
  return !/placeholder client feedback|replace with a verified quote/i.test(
    text,
  );
}

export default function ProjectTestimonial({ testimonial, index }) {
  if (!isPublishedQuote(testimonial?.quote)) return null;

  const author = String(testimonial.author || "").trim();
  const role = String(testimonial.role || "").trim();

  return (
    <section className={styles.testimonialSection} aria-label="Testimonial">
      <div className={styles.testimonialHeader}>
        <p className={styles.sectionNumber} aria-hidden="true">
          {String(index).padStart(2, "0")}
        </p>
        <h2 className={styles.sectionTitle}>Testimonial</h2>
      </div>
      <figure className={styles.testimonialFigure}>
        <div className={styles.testimonialCopy}>
          <blockquote className={styles.testimonialQuote}>
            <p>{`“${testimonial.quote}”`}</p>
          </blockquote>
          {(author || role) && (
            <figcaption className={styles.testimonialAttribution}>
              {author ? (
                <span className={styles.testimonialAuthor}>{author}</span>
              ) : null}
              {role ? (
                <span className={styles.testimonialRole}>{role}</span>
              ) : null}
            </figcaption>
          )}
        </div>
      </figure>
    </section>
  );
}
