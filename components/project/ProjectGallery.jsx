"use client";

import Image from "next/image";

import { projectImageSrc } from "@/lib/projects";
import { GALLERY_IMAGE_SIZES } from "@/lib/project/warm";

import styles from "@/app/work/[slug]/page.module.css";

export default function ProjectGallery({ project, gallery = [] }) {
  const items =
    gallery.length > 0
      ? gallery
      : [{ file: project.file, alt: `${project.name} — gallery` }];

  return (
    <section className={styles.gallerySection} aria-label="Gallery">
      <div className={styles.galleryHeader}>
        <p className={styles.sectionNumber} aria-hidden="true">
          04
        </p>
        <h2 className={styles.sectionTitle}>Gallery</h2>
      </div>
      <ul className={styles.galleryStack}>
        {items.map((item, index) => {
          const src = projectImageSrc(item.file ?? item);
          const alt =
            item.alt ?? `${project.name} — gallery image ${index + 1}`;

          return (
            <li key={`${src}-${index}`} className={styles.galleryItem}>
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
