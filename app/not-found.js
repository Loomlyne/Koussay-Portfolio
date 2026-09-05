import ProjectNotFound from "@/components/project/ProjectNotFound";

const description = "This address does not match a project in the current index.";

export const metadata = {
  title: "Project not found",
  description,
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: "Project not found",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Project not found",
    description,
  },
};

export default function NotFound() {
  return <ProjectNotFound />;
}
