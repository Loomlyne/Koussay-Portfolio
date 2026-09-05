import { PROJECTS as FALLBACK_PROJECTS } from "@/components/ring/projects";
import { MAX_PLANES } from "@/components/shaders/planeShaders";
import { SITE_MARK_ALT, SITE_URL } from "@/lib/site";

const indexOfProject = (list, projectOrSlug) => {
  const slug =
    typeof projectOrSlug === "string" ? projectOrSlug : projectOrSlug?.slug;

  return list.findIndex((project) => project.slug === slug);
};

export function projectHref(slug) {
  return `/project/${slug}`;
}

export function projectSlugFromPath(pathname) {
  if (!pathname) return "";
  for (const prefix of ["/project/", "/work/"]) {
    if (pathname.startsWith(prefix)) {
      return decodeURIComponent(pathname.slice(prefix.length).split("/")[0]);
    }
  }
  return "";
}

export function projectImageSrc(fileOrProject) {
  const file =
    typeof fileOrProject === "string" ? fileOrProject : fileOrProject?.file;
  if (!file) return "";
  if (
    file.startsWith("http://") ||
    file.startsWith("https://") ||
    file.startsWith("/")
  ) {
    return file;
  }
  return `/${file}`;
}

export function projectShareImage(project) {
  const src = projectImageSrc(project);
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `${SITE_URL}${src}`;
}

export function shareImageAlt(project) {
  if (!project?.name) return SITE_MARK_ALT;

  const kind = project.type || "Selected work";
  const when = project.year ? ` (${project.year})` : "";
  const summary = String(project.detail?.summary || "").trim();
  const lead = `${project.name} cover. ${kind}${when} by Koussay Zayani.`;
  return summary ? `${lead} ${summary}` : lead;
}

export function galleryImageAlt(project, item, index = 0) {
  const raw = String(item?.alt || item?.name || "").trim();
  const looksLikeFile =
    !raw ||
    /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(raw) ||
    raw === `${project.name} — gallery` ||
    raw === `${project.name} — gallery image ${index + 1}`;

  if (!looksLikeFile) return raw;
  const kind = project.type || "Selected work";
  return `${project.name} — gallery image ${index + 1}. ${kind} by Koussay Zayani.`;
}

export function indexProjects(projects) {
  return projects.slice(0, MAX_PLANES).map((project, index) => ({
    ...project,
    index,
    liveUrl: project.liveUrl ?? null,
  }));
}

export const PROJECTS = indexProjects(FALLBACK_PROJECTS);

export const IMAGE_FILES = PROJECTS.map((project) => project.file);

/**
 * Find a project by its URL identity. Slugs are stored on each project rather
 * than generated from display names, so changing the ring order or a label
 * does not change an existing detail URL.
 */
export function getProjectBySlug(slug, list = PROJECTS) {
  return list.find((project) => project.slug === slug);
}

/**
 * Return the App Router params for every known detail route.
 */
export function getProjectStaticParams(list = PROJECTS) {
  return list.map(({ slug }) => ({ slug }));
}

/**
 * Return the one-based, padded position used by the carousel's display index.
 * The position follows ring order; the slug remains stable if that order moves.
 */
export function getProjectDisplayIndex(projectOrSlug, list = PROJECTS) {
  if (
    typeof projectOrSlug === "object" &&
    Number.isInteger(projectOrSlug?.index)
  ) {
    return String(projectOrSlug.index + 1).padStart(2, "0");
  }

  const index = indexOfProject(list, projectOrSlug);
  return index === -1 ? undefined : String(index + 1).padStart(2, "0");
}

/**
 * Resolve the previous project in ring order, wrapping at either end.
 */
export function getPreviousProject(projectOrSlug, list = PROJECTS) {
  const index = indexOfProject(list, projectOrSlug);

  if (index === -1 || list.length === 0) return undefined;
  return list[(index - 1 + list.length) % list.length];
}

/**
 * Resolve the next project in ring order, wrapping at either end.
 */
export function getNextProject(projectOrSlug, list = PROJECTS) {
  const index = indexOfProject(list, projectOrSlug);

  if (index === -1 || list.length === 0) return undefined;
  return list[(index + 1) % list.length];
}

/**
 * Resolve both pager targets from one stable project identity.
 */
export function getProjectNavigation(projectOrSlug, list = PROJECTS) {
  return {
    previous: getPreviousProject(projectOrSlug, list),
    next: getNextProject(projectOrSlug, list),
  };
}
