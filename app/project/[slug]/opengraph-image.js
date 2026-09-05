import { getProjects } from "@/lib/cms/projects";
import { ogImageResponse, OG_SIZE, OG_TYPE } from "@/lib/og-image";
import { getProjectBySlug, shareImageAlt } from "@/lib/projects";

export const runtime = "nodejs";
export const revalidate = 60;
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export async function generateImageMetadata({ params }) {
  const { slug } = await params;
  const projects = await getProjects();
  const project = getProjectBySlug(slug, projects);

  return [
    {
      id: "cover",
      alt: shareImageAlt(project),
      size: OG_SIZE,
      contentType: OG_TYPE,
    },
  ];
}

export default async function Image({ params }) {
  const { slug } = await params;
  const projects = await getProjects();
  return ogImageResponse(getProjectBySlug(slug, projects));
}
