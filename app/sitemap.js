import { getProjects } from "@/lib/content";
import { projectHref } from "@/lib/projects";
import { BOOKING_PATH, SITE_URL } from "@/lib/site";

export default async function sitemap() {
  const now = new Date();
  const projects = getProjects();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}${BOOKING_PATH}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...projects.map((project) => ({
      url: `${SITE_URL}${projectHref(project.slug)}`,
      lastModified: new Date(project.updatedAt),
      changeFrequency: "monthly",
      priority: 0.8,
    })),
  ];
}
