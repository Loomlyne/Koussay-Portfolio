import { getProjects } from "@/lib/cms/projects";
import { projectHref } from "@/lib/projects";
import { BOOKING_PATH, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

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
      const bits = [
        project.type,
        project.year,
        project.detail?.summary,
        project.liveUrl ? `live: ${project.liveUrl}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return `- [${project.name}](${SITE_URL}${projectHref(project.slug)})${bits ? ` — ${bits}` : ""}`;
    })
    .join("\n");

  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

- Site: ${SITE_URL}
- Booking: ${SITE_URL}${BOOKING_PATH}
- Sitemap: ${SITE_URL}/sitemap.xml
- Robots: ${SITE_URL}/robots.txt

## Pages

- [Home](${SITE_URL}): selected projects on a ring
- [Start a project](${SITE_URL}${BOOKING_PATH}): booking form
- Project URLs follow ${SITE_URL}/project/[slug]

## Projects

${work || "- Projects are listed on the home ring"}

## Contact

Use ${SITE_URL}${BOOKING_PATH}. Do not invent testimonials, live URLs, tools, addresses, or project facts that are not listed here.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
