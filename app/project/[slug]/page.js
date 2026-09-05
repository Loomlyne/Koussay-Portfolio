import { notFound } from "next/navigation";

import { RegisterHome } from "@/components/HomeRing";
import JsonLd from "@/components/JsonLd";
import ProjectDetail from "@/components/project/ProjectDetail";
import { getProjects } from "@/lib/cms/projects";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import {
  getProjectBySlug,
  getProjectDisplayIndex,
  getProjectNavigation,
  getProjectStaticParams,
  projectHref,
  projectShareImage,
} from "@/lib/projects";
import {
  breadcrumbSchema,
  graph,
  projectSchema,
  SITE_SHARE_IMAGE,
} from "@/lib/seo";

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
      title: { absolute: "Project not found" },
      description: "This address does not match a project in the current index.",
    };
  }

  const description = project.detail?.summary || SITE_DESCRIPTION;
  const url = `${SITE_URL}${projectHref(project.slug)}`;
  const image = projectShareImage(project);
  const shareImage = image
    ? [{ url: image, alt: `${project.name} cover` }]
    : [{ url: SITE_SHARE_IMAGE, alt: SITE_NAME }];

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
      images: shareImage,
    },
    twitter: {
      card: "summary_large_image",
      title: project.name,
      description,
      images: image ? [image] : [SITE_SHARE_IMAGE],
    },
  };
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const projects = await getProjects();
  const project = getProjectBySlug(slug, projects);

  if (!project) notFound();

  const { previous, next } = getProjectNavigation(project, projects);

  const crumbs = [
    { label: SITE_NAME, href: "/" },
    { label: "Projects", href: "/" },
    { label: project.name, href: projectHref(project.slug) },
  ];

  return (
    <>
      <JsonLd data={graph([projectSchema(project), breadcrumbSchema(crumbs)])} />
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
