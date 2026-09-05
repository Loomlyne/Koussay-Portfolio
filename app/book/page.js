import { Suspense } from "react";

import BookFlow from "@/components/book/BookFlow";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, graph, SITE_SHARE_IMAGE } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const description =
  "Book a 1-hour call with Koussay Zayani to start a brand or web project.";

export const metadata = {
  title: "Start a project",
  description,
  alternates: {
    canonical: "/book",
  },
  openGraph: {
    title: `Start a project — ${SITE_NAME}`,
    description,
    url: `${SITE_URL}/book`,
    images: [{ url: SITE_SHARE_IMAGE, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Start a project — ${SITE_NAME}`,
    description,
    images: [SITE_SHARE_IMAGE],
  },
};

const crumbs = [
  { label: SITE_NAME, href: "/" },
  { label: "Start a project", href: "/book" },
];

export default function BookPage() {
  return (
    <>
      <JsonLd data={graph([breadcrumbSchema(crumbs)])} />
      <Suspense fallback={null}>
        <BookFlow />
      </Suspense>
    </>
  );
}
