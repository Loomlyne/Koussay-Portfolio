import { projectHref, projectShareImage } from "@/lib/projects";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const SITE_SHARE_IMAGE = `${SITE_URL}/opengraph-image.png`;

export function absoluteUrl(path = "/") {
  if (!path || path === "/") return SITE_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function personSchema() {
  return {
    "@type": "Person",
    "@id": `${SITE_URL}/#person`,
    name: SITE_NAME,
    url: SITE_URL,
    image: SITE_SHARE_IMAGE,
    jobTitle: "Creative developer and brand designer",
    description: SITE_DESCRIPTION,
    knowsAbout: ["Brand identity", "Web design", "Creative development"],
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}/#person` },
  };
}

export function localBusinessSchema() {
  return {
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}/#studio`,
    name: SITE_NAME,
    url: SITE_URL,
    image: SITE_SHARE_IMAGE,
    description: SITE_DESCRIPTION,
    areaServed: {
      "@type": "Country",
      name: "United Arab Emirates",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "AE",
    },
    founder: { "@id": `${SITE_URL}/#person` },
    availableLanguage: ["en"],
    priceRange: "$$",
    potentialAction: {
      "@type": "ReserveAction",
      name: "Start a project",
      target: `${SITE_URL}/book`,
    },
  };
}

export function breadcrumbSchema(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.href || "/"),
    })),
  };
}

export function projectSchema(project) {
  const url = absoluteUrl(projectHref(project.slug));
  const image = projectShareImage(project);
  return {
    "@type": "CreativeWork",
    "@id": `${url}#project`,
    name: project.name,
    url,
    description: project.detail?.summary || SITE_DESCRIPTION,
    image: image || SITE_SHARE_IMAGE,
    creator: { "@id": `${SITE_URL}/#person` },
    genre: project.type || undefined,
    dateCreated: project.year || undefined,
    ...(project.liveUrl ? { sameAs: project.liveUrl } : {}),
  };
}

export function projectListSchema(projects) {
  return {
    "@type": "ItemList",
    name: "Selected projects",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: projects.length,
    itemListElement: projects.map((project, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(projectHref(project.slug)),
      name: project.name,
    })),
  };
}

export function graph(nodes) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  };
}
