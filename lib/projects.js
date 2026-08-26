import { PROJECTS } from "../components/ring/projects";

const indexOfProject = (projectOrSlug) => {
  const slug =
    typeof projectOrSlug === "string" ? projectOrSlug : projectOrSlug?.slug;

  return PROJECTS.findIndex((project) => project.slug === slug);
};

/**
 * Find a project by its URL identity. Slugs are stored on each project rather
 * than generated from display names, so changing the ring order or a label
 * does not change an existing detail URL.
 */
export function getProjectBySlug(slug) {
  return PROJECTS.find((project) => project.slug === slug);
}

/**
 * Return the App Router params for every known detail route.
 */
export function getProjectStaticParams() {
  return PROJECTS.map(({ slug }) => ({ slug }));
}

/**
 * Return the one-based, padded position used by the carousel's display index.
 * The position follows ring order; the slug remains stable if that order moves.
 */
export function getProjectDisplayIndex(projectOrSlug) {
  const index = indexOfProject(projectOrSlug);

  return index === -1 ? undefined : String(index + 1).padStart(2, "0");
}

/**
 * Resolve the previous project in ring order, wrapping at either end.
 */
export function getPreviousProject(projectOrSlug) {
  const index = indexOfProject(projectOrSlug);

  if (index === -1 || PROJECTS.length === 0) return undefined;
  return PROJECTS[(index - 1 + PROJECTS.length) % PROJECTS.length];
}

/**
 * Resolve the next project in ring order, wrapping at either end.
 */
export function getNextProject(projectOrSlug) {
  const index = indexOfProject(projectOrSlug);

  if (index === -1 || PROJECTS.length === 0) return undefined;
  return PROJECTS[(index + 1) % PROJECTS.length];
}

/**
 * Resolve both pager targets from one stable project identity.
 */
export function getProjectNavigation(projectOrSlug) {
  return {
    previous: getPreviousProject(projectOrSlug),
    next: getNextProject(projectOrSlug),
  };
}
