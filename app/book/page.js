import BookFlow from "@/components/book/BookFlow";

export const metadata = {
  title: { absolute: "Start a project" },
  description: "Book a call and start a new project with Koussay.",
};

export default function BookPage() {
  return <BookFlow />;
}
