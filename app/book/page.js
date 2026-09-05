import { Suspense } from "react";

import BookFlow from "@/components/book/BookFlow";

export const metadata = {
  title: "Start a project",
  description: "Book a call and start a new project with Koussay.",
  alternates: {
    canonical: "/book",
  },
};

export default function BookPage() {
  return (
    <Suspense fallback={null}>
      <BookFlow />
    </Suspense>
  );
}
