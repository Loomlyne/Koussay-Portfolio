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
      <ul className={styles.galleryStack}>
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
                  loading="lazy"
                  sizes="(max-width: 640px) 70vw, 70vw"
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
