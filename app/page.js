import { RegisterHome } from "@/components/HomeRing";
import { getProjects } from "@/lib/cms/projects";
import { projectImageSrc } from "@/lib/projects";

export const revalidate = 60;

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
      <RegisterHome projects={projects} />
    </>
  );
}
