import { notFound } from "next/navigation";

import { getProjects } from "@/lib/content";
import { ogImageResponse, OG_SIZE, OG_TYPE } from "@/lib/og-image";
import { getProjectBySlug, shareImageAlt } from "@/lib/projects";

export const runtime = "nodejs";
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
  const project = getProjectBySlug(slug, projects);
  // D-07: an unknown slug is a 404, never the site logo with a 200.
  if (!project) notFound();
  return ogImageResponse(project);
}
