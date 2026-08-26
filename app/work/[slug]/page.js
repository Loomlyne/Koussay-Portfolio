import { notFound } from "next/navigation";

import ProjectDetail from "@/components/project/ProjectDetail";
import {
  getProjectBySlug,
  getProjectDisplayIndex,
  getProjectNavigation,
  getProjectStaticParams,
} from "@/lib/projects";

export function generateStaticParams() {
  return getProjectStaticParams();
}

export const dynamicParams = false;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    return {
      title: "Work not found — Viscose",
      description:
        "The requested work is not part of the Viscose project index.",
    };
  }

  return {
    title: `${project.name} — Viscose`,
    description:
      project.detail?.summary ??
      "Prototype / speculative material for this project.",
  };
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) notFound();

  const { previous, next } = getProjectNavigation(project);

  return (
    <ProjectDetail
      project={project}
      displayIndex={getProjectDisplayIndex(project)}
      previous={previous}
      next={next}
    />
  );
}
