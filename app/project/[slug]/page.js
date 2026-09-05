import { notFound } from "next/navigation";

import { RegisterHome } from "@/components/HomeRing";
import ProjectDetail from "@/components/project/ProjectDetail";
import { getProjects } from "@/lib/cms/projects";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import {
  getProjectBySlug,
  getProjectDisplayIndex,
  getProjectNavigation,
  getProjectStaticParams,
  projectHref,
} from "@/lib/projects";

export async function generateStaticParams() {
  try {
    const projects = await getProjects();
    return getProjectStaticParams(projects);
  } catch {
    return [];
  }
}

export const dynamicParams = true;
export const revalidate = 60;

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

  const description = project.detail?.summary || SITE_DESCRIPTION;
  const url = `${SITE_URL}${projectHref(project.slug)}`;

  return {
    title: project.name,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: project.name,
      description,
      url,
      type: "article",
    },
    twitter: {
      title: project.name,
      description,
    },
  };
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const projects = await getProjects();
  const project = getProjectBySlug(slug, projects);

  if (!project) notFound();

  const { previous, next } = getProjectNavigation(project, projects);

  return (
    <>
      <RegisterHome projects={projects} />
      <ProjectDetail
        project={project}
        displayIndex={getProjectDisplayIndex(project, projects)}
        previous={previous}
        next={next}
      />
    </>
  );
}
