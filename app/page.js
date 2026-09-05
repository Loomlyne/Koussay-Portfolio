import { RegisterHome } from "@/components/HomeRing";
import JsonLd from "@/components/JsonLd";
import { getProjects } from "@/lib/cms/projects";
import { projectImageSrc } from "@/lib/projects";
import { graph, projectListSchema, shareImages } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata() {
  const projects = await getProjects();
  const featured = projects.find((project) => projectImageSrc(project));
  const images = shareImages(featured);
  const title = `${SITE_NAME} — Identities and digital experiences`;

  return {
    title: { absolute: title },
    description: SITE_DESCRIPTION,
    alternates: {
      canonical: SITE_URL,
    },
    openGraph: {
      title,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: SITE_DESCRIPTION,
      images,
    },
  };
}

export default async function Page() {
  const projects = await getProjects();
  const seed = projects[0]?.file;

  return (
    <>
      {seed ? (
        <link
          rel="preload"
          href={projectImageSrc(seed)}
          as="image"
          fetchPriority="high"
        />
      ) : null}
      <h1 className="sr-only">{SITE_NAME}</h1>
      <JsonLd data={graph([projectListSchema(projects)])} />
      <RegisterHome projects={projects} />
    </>
  );
}
