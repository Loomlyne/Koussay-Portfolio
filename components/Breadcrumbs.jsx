import Link from "next/link";

import BackToWorks from "@/components/BackToWorks";

export default function Breadcrumbs({ items = [] }) {
  if (items.length === 0) return null;

  return (
    <nav className="site-crumbs" aria-label="Breadcrumb">
      <ol className="site-crumbs-list">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="site-crumbs-item">
              {index > 0 ? (
                <span className="site-crumbs-mark" aria-hidden="true">
                  /
                </span>
              ) : null}
              {last || !item.href ? (
                <span aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              ) : item.href === "/" ? (
                <BackToWorks className="site-crumbs-link" arrow={false}>
                  {item.label}
                </BackToWorks>
              ) : (
                <Link href={item.href} className="site-crumbs-link">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
