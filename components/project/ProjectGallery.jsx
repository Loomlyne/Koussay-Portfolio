"use client";

import Image from "next/image";

import { galleryImageAlt, projectImageSrc } from "@/lib/projects";
import { GALLERY_IMAGE_SIZES } from "@/lib/project/warm";

import styles from "@/app/project/[slug]/page.module.css";

export default function ProjectGallery({ project, gallery = [], index }) {
  const items = gallery.filter((item) => projectImageSrc(item.file ?? item));
  if (items.length === 0) return null;

  return (
    <section className={styles.gallerySection} aria-label="Gallery">
      <div className={styles.galleryHeader}>
        <p className={styles.sectionNumber} aria-hidden="true">
          {String(index).padStart(2, "0")}
        </p>
        <h2 className={styles.sectionTitle}>Gallery</h2>
      </div>
      <ul className={styles.galleryStack}>
        {items.map((item, itemIndex) => {
          const src = projectImageSrc(item.file ?? item);
          const alt = galleryImageAlt(project, item, itemIndex);

          return (
            <li key={`${src}-${itemIndex}`} className={styles.galleryItem}>
              <div className={styles.galleryFrame}>
                <Image
                  src={src}
                  alt={alt}
                  fill
                  loading="lazy"
                  sizes={GALLERY_IMAGE_SIZES}
                  className={styles.galleryImage}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
