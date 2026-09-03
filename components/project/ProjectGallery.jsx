"use client";

import Image from "next/image";

import styles from "@/app/work/[slug]/page.module.css";

function imageSrc(file) {
  return file.startsWith("/") ? file : `/${file}`;
}

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
      <ul className={styles.galleryGrid}>
        {items.map((item, index) => {
          const src = imageSrc(item.file ?? item);
          const alt =
            item.alt ?? `${project.name} — gallery image ${index + 1}`;

          return (
            <li key={`${src}-${index}`} className={styles.galleryItem}>
              <div className={styles.galleryFrame}>
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
