import { cache } from "react";
import { unstable_cache } from "next/cache";

import { PROJECTS as FALLBACK_PROJECTS } from "@/components/ring/projects";
import { isNotionProjectsConfigured } from "@/lib/env";
import { fetchNotionProjects } from "@/lib/notion/projects";
import { indexProjects } from "@/lib/projects";

const FALLBACK = indexProjects(FALLBACK_PROJECTS);
let lastGood = null;

async function loadProjects() {
  const fromNotion = await fetchNotionProjects();
  if (fromNotion.length === 0) {
    throw new Error("[projects] Notion returned no published covers");
  }
  return indexProjects(fromNotion);
}

const getCachedProjects = unstable_cache(loadProjects, ["cms-projects"], {
  tags: ["projects"],
  revalidate: 300,
});

export const getProjects = cache(async () => {
  if (!isNotionProjectsConfigured()) {
    return FALLBACK;
  }

  try {
    const list = await getCachedProjects();
    lastGood = list;
    return list;
  } catch (error) {
    console.warn(
      "[projects] Notion failed; using last good or fallback",
      error,
    );
    // lastGood is per-instance only. Never return the 18 local placeholders
    // from inside unstable_cache — that is what replaced the live set.
    if (lastGood) return lastGood;
    // Request-only. A cold miss must not be stored as the project list.
    return FALLBACK;
  }
});
