import { notFound } from "next/navigation";

import ProjectDetail from "@/components/project/ProjectDetail";
import { getProjects } from "@/lib/cms/projects";
import {
  getProjectBySlug,
  getProjectDisplayIndex,
  getProjectNavigation,
  getProjectStaticParams,
} from "@/lib/projects";

export async function generateStaticParams() {
  const projects = await getProjects();
  return getProjectStaticParams(projects);
}

export const dynamicParams = true;
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const projects = await getProjects();
  const project = getProjectBySlug(slug, projects);

  if (!project) {
    return {
      title: { absolute: "Work not found" },
      description: "This address does not match a project in the work index.",
    };
  }

  return {
    title: { absolute: project.name },
    description:
      project.detail?.summary ??
      "Prototype / speculative material for this project.",
  };
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const projects = await getProjects();
  const project = getProjectBySlug(slug, projects);

  if (!project) notFound();

  const { previous, next } = getProjectNavigation(project, projects);

  return (
    <ProjectDetail
      project={project}
      displayIndex={getProjectDisplayIndex(project, projects)}
      previous={previous}
      next={next}
    />
  );
}
