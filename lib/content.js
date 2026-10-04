import "server-only";

import { PROJECTS_IN_ORDER } from "@/content/projects/index.mjs";
import manifest from "@/content/media.json";
import { MAX_PLANES } from "@/components/shaders/planeShaders";
import { resolveContent } from "@/lib/content-schema.mjs";
import { indexProjects } from "@/lib/projects";

// Resolved at module evaluation: a content defect throws here, so the build
// fails naming slug.field instead of serving a partial list.
const PROJECTS = indexProjects(
  resolveContent(PROJECTS_IN_ORDER, manifest, { maxPlanes: MAX_PLANES }),
);

export function getProjects() {
  return PROJECTS;
}

export function getProject(slug) {
  return PROJECTS.find((project) => project.slug === slug) ?? null;
}
