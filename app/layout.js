import "./globals.css";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "./providers";
import JsonLd from "@/components/JsonLd";
import {
  graph,
  localBusinessSchema,
  personSchema,
  SITE_SHARE_IMAGE,
  websiteSchema,
} from "@/lib/seo";
import {
  SITE_DESCRIPTION,
  SITE_MARK_ALT,
  SITE_MARK_PATH,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Identities and digital experiences`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  icons: {
    icon: [
      { url: SITE_MARK_PATH, type: "image/png" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
    shortcut: SITE_MARK_PATH,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_AE",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Identities and digital experiences`,
    description: SITE_DESCRIPTION,
    images: [{ url: SITE_SHARE_IMAGE, alt: SITE_MARK_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Identities and digital experiences`,
    description: SITE_DESCRIPTION,
    images: [{ url: SITE_SHARE_IMAGE, alt: SITE_MARK_ALT }],
  },
};

const siteGraph = graph([
  personSchema(),
  websiteSchema(),
  localBusinessSchema(),
]);

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">
        <JsonLd data={siteGraph} />
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
