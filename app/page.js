import { RegisterHome } from "@/components/HomeRing";
import JsonLd from "@/components/JsonLd";
import { getProjects } from "@/lib/cms/projects";
import { projectImageSrc } from "@/lib/projects";
import { graph, projectListSchema } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata() {
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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: SITE_DESCRIPTION,
    },
  };
}

export default async function Page() {
  const projects = await getProjects();
  const preload = projects
    .slice(0, 3)
    .map((project) => project.file)
    .filter(Boolean);

  return (
    <>
      {preload.map((file, index) => (
        <link
          key={file}
          rel="preload"
          href={projectImageSrc(file)}
          as="image"
          fetchPriority={index === 0 ? "high" : "low"}
        />
      ))}
      <h1 className="sr-only">{SITE_NAME}</h1>
      <JsonLd data={graph([projectListSchema(projects)])} />
      <RegisterHome projects={projects} />
    </>
  );
}
