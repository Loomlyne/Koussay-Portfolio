import Carousel from "@/components/Carousel";
import { IMAGE_FILES } from "@/components/ring/projects";

export default function Page() {
  const seed = IMAGE_FILES[0];
  return (
    <>
      {seed ? (
        <link rel="preload" href={`/${seed}`} as="image" fetchPriority="high" />
      ) : null}
      <Carousel />
    </>
  );
}
