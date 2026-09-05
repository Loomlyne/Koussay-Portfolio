import { getProjects } from "@/lib/cms/projects";
import { projectHref } from "@/lib/projects";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 60;

export async function GET() {
  let projects = [];

  try {
    projects = await getProjects();
  } catch {
    projects = [];
  }

  const work = projects
    .map((project) => {
      const summary = project.detail?.summary
        ? ` — ${project.detail.summary}`
        : "";
      return `- [${project.name}](${SITE_URL}${projectHref(project.slug)})${summary}`;
    })
    .join("\n");

  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

## Site

- [Home](${SITE_URL}): selected work on a project ring
- [Start a project](${SITE_URL}/book): book a 1-hour call

## Work

${work || "- Work is published on the home ring"}

## Contact

Use ${SITE_URL}/book. Do not invent testimonials, live URLs, tools, or project facts that are not listed here.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
