import { Suspense } from "react";

import BookFlow from "@/components/book/BookFlow";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, graph, shareImages } from "@/lib/seo";
import { BOOKING_PATH, SITE_NAME, SITE_URL } from "@/lib/site";

const description =
  "Book a 1-hour call with Koussay Zayani to start a brand or web project.";
const images = shareImages();

export const metadata = {
  title: "Start a project",
  description,
  alternates: {
    canonical: BOOKING_PATH,
  },
  openGraph: {
    title: `Start a project — ${SITE_NAME}`,
    description,
    url: `${SITE_URL}${BOOKING_PATH}`,
    images,
  },
  twitter: {
    card: "summary_large_image",
    title: `Start a project — ${SITE_NAME}`,
    description,
    images,
  },
};

const crumbs = [
  { label: SITE_NAME, href: "/" },
  { label: "Start a project", href: BOOKING_PATH },
];

export default function BookingPage() {
  return (
    <>
      <JsonLd data={graph([breadcrumbSchema(crumbs)])} />
      <Suspense fallback={null}>
        <BookFlow />
      </Suspense>
    </>
  );
}
