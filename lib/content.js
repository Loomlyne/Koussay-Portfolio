import "server-only";

import { PROJECTS_IN_ORDER } from "@/content/projects/index.mjs";
import manifest from "@/content/media.json";
import { MAX_PLANES } from "@/components/shaders/planeShaders";
import { resolveContent } from "@/lib/content-schema.mjs";
import { indexProjects } from "@/lib/projects";
import { homeLines } from "@/lib/share.mjs";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// Resolved at module evaluation: a content defect throws here, so the build
// fails naming slug.field instead of serving a partial list.
const PROJECTS = indexProjects(
  resolveContent(PROJECTS_IN_ORDER, manifest, {
    maxPlanes: MAX_PLANES,
    site: { name: SITE_NAME, description: SITE_DESCRIPTION },
  }),
);

export function getProjects() {
  return PROJECTS;
}

export function getProject(slug) {
  return PROJECTS.find((project) => project.slug === slug) ?? null;
}

/** Home share card: url and size from the manifest, alt per the UI-SPEC. */
export function getHomeShare() {
  const { url, width, height } = manifest.site.home;
  const line2 = homeLines(SITE_NAME, SITE_DESCRIPTION)[1];
  const lower = line2.charAt(0).toLowerCase() + line2.slice(1);
  return {
    url,
    width,
    height,
    alt: `${SITE_NAME}, ${lower}, over the ${PROJECTS[0].name} project cover.`,
  };
}
