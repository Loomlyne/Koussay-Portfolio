"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { rememberProject, warmProject } from "@/lib/project/warm";

export default function ProjectWarm({ current, previous, next }) {
  const router = useRouter();

  useEffect(() => {
    rememberProject(current);
    warmProject(previous, router);
    warmProject(next, router);
  }, [current, previous, next, router]);

  return null;
}
