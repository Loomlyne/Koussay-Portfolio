import { PROJECTS as FALLBACK_PROJECTS } from "@/components/ring/projects";
import { isNotionProjectsConfigured } from "@/lib/env";
import { fetchNotionProjects } from "@/lib/notion/projects";
import { indexProjects } from "@/lib/projects";

export async function getProjects() {
  if (!isNotionProjectsConfigured()) {
    return indexProjects(FALLBACK_PROJECTS);
  }

  try {
    const fromNotion = await fetchNotionProjects();
    if (fromNotion.length === 0) {
      console.warn(
        "[projects] Notion returned no published covers; using local fallback",
      );
      return indexProjects(FALLBACK_PROJECTS);
    }
    return indexProjects(fromNotion);
  } catch (error) {
    console.warn("[projects] Notion failed; using local fallback", error);
    return indexProjects(FALLBACK_PROJECTS);
  }
}
