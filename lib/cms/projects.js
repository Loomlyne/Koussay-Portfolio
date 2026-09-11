import { cache } from "react";

import { PROJECTS as FALLBACK_PROJECTS } from "@/components/ring/projects";
import { isNotionProjectsConfigured } from "@/lib/env";
import { getCachedProjectBundle } from "@/lib/notion/projects";
import { indexProjects } from "@/lib/projects";

const FALLBACK = indexProjects(FALLBACK_PROJECTS);
let lastGood = null;

export const getProjects = cache(async () => {
  if (!isNotionProjectsConfigured()) {
    return FALLBACK;
  }

  try {
    const bundle = await getCachedProjectBundle();
    const list = indexProjects(bundle.projects);
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
