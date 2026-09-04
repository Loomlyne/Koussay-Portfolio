import Carousel from "@/components/Carousel";
import { getProjects } from "@/lib/cms/projects";
import { projectImageSrc } from "@/lib/projects";

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
      <Carousel projects={projects} />
    </>
  );
}
