"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { isPdfName } from "@/lib/media";
import { galleryImageAlt, projectImageSrc } from "@/lib/projects";
import { GALLERY_IMAGE_SIZES } from "@/lib/project/warm";

import styles from "@/app/project/[slug]/page.module.css";

function isPaperItem(item, src) {
  if (item?.kind === "pdf") return true;
  return (
    isPdfName(item?.alt) || isPdfName(src) || /\/g\d+p\d+(?:\?|$)/.test(src)
  );
}

function pagedSrc(src, page) {
  const [path, query] = String(src).split("?");
  const next = path.replace(/\/(g\d+)(?:p\d+)?$/, `/$1p${page}`);
  return query ? `${next}?${query}` : next;
}

function PdfPageImage({ src, alt, eager }) {
  return (
    // Rasterized PDF pages are already webp from /api/media.
    // next/image fill + the optimizer is what left Safari showing
    // the native PDF viewer on phones.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={styles.galleryImagePaper}
    />
  );
}

function PdfStack({ project, item, src, itemIndex }) {
  const known = Number(item.pages) || 0;
  const [pages, setPages] = useState(known || 1);

  useEffect(() => {
    if (known > 1) return undefined;
    const meta = `${src}${src.includes("?") ? "&" : "?"}pages=1`;
    let cancelled = false;
    fetch(meta)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const count = Number(data?.pages);
        if (!cancelled && count >= 1) setPages(count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [known, src]);

  const count = known || pages;

  return Array.from({ length: count }, (_, index) => {
    const page = index + 1;
    const pageItem = { ...item, kind: "pdf", page, pages: count };
    return (
      <li key={`${src}-p${page}`} className={styles.galleryItem}>
        <div className={`${styles.galleryFrame} ${styles.galleryFramePaper}`}>
          <PdfPageImage
            src={pagedSrc(src, page)}
            alt={galleryImageAlt(project, pageItem, itemIndex + index)}
            eager={index < 2}
          />
        </div>
      </li>
    );
  });
}

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
          const paper = isPaperItem(item, src);

          if (paper && Number(item.pages || 0) <= 1) {
            return (
              <PdfStack
                key={`${src}-${itemIndex}`}
                project={project}
                item={item}
                src={src}
                itemIndex={itemIndex}
              />
            );
          }

          return (
            <li key={`${src}-${itemIndex}`} className={styles.galleryItem}>
              <div
                className={`${styles.galleryFrame} ${paper ? styles.galleryFramePaper : ""}`}
              >
                {paper ? (
                  <PdfPageImage src={src} alt={alt} eager={itemIndex < 2} />
                ) : (
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    loading="lazy"
                    sizes={GALLERY_IMAGE_SIZES}
                    className={styles.galleryImage}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
