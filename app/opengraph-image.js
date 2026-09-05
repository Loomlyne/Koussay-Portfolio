import { getProjects } from "@/lib/cms/projects";
import { ogImageResponse, OG_SIZE, OG_TYPE } from "@/lib/og-image";
import { projectImageSrc, shareImageAlt } from "@/lib/projects";

export const runtime = "nodejs";
export const revalidate = 60;
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export async function generateImageMetadata() {
  const projects = await getProjects();
  const featured = projects.find((project) => projectImageSrc(project));

  return [
    {
      id: "cover",
      alt: shareImageAlt(featured),
      size: OG_SIZE,
      contentType: OG_TYPE,
    },
  ];
}

export default async function Image() {
  const projects = await getProjects();
  const featured = projects.find((project) => projectImageSrc(project));
  return ogImageResponse(featured);
}
