import { getProjects } from "@/lib/cms/projects";
import { projectHref } from "@/lib/projects";
import { SITE_URL } from "@/lib/site";

export default async function sitemap() {
  const now = new Date();
  let projects = [];

  try {
    projects = await getProjects();
  } catch {
    projects = [];
  }

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/book`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...projects.map((project) => ({
      url: `${SITE_URL}${projectHref(project.slug)}`,
      lastModified: project.updatedAt ? new Date(project.updatedAt) : now,
      changeFrequency: "monthly",
      priority: 0.8,
    })),
  ];
}
