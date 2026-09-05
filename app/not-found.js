import ProjectNotFound from "@/components/project/ProjectNotFound";

export const metadata = {
  title: "Project not found",
  description: "This address does not match a project in the current index.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return <ProjectNotFound />;
}
