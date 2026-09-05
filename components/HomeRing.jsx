"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useProjectPager } from "./project/ProjectPagerTransition";
import Carousel from "./Carousel";
import { HomeRingContext, useHomeRing } from "./homeRingContext";
import { useSharedTransition } from "./SharedTransitionProvider";
import { projectSlugFromPath } from "@/lib/projects";

function ringKey(list) {
  if (!list?.length) return "";
  return list.map((p) => `${p.slug ?? ""}:${p.file}`).join("|");
}

export function RegisterHome({ projects }) {
  const home = useHomeRing();
  useLayoutEffect(() => {
    home?.setProjects(projects);
  }, [home, projects]);
  return null;
}

export function HomeRingProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const shared = useSharedTransition();
  const pager = useProjectPager();
  const [projects, setProjectsState] = useState(null);
  const [coverPath, setCoverPath] = useState(null);
  const [resumeSlug, setResumeSlug] = useState(null);
  const projectsRef = useRef(null);

  const setProjects = useCallback((next) => {
    if (!next?.length) return;
    setProjectsState((prev) => {
      if (ringKey(prev) === ringKey(next)) return prev;
      return next;
    });
    projectsRef.current = next;
  }, []);

  const isHome = pathname === "/";
  const showHome = isHome || pathname === coverPath;

  const prepareHome = useCallback(() => {
    shared?.abort?.();
    pager?.clear?.();
    const slug = projectSlugFromPath(pathname);
    setResumeSlug(slug || null);
    if (projectsRef.current) setCoverPath(pathname);
    if (pathname !== "/") router.push("/");
  }, [shared, pager, pathname, router]);

  const value = useMemo(
    () => ({ setProjects, prepareHome, ready: Boolean(projects) }),
    [setProjects, prepareHome, projects],
  );

  return (
    <HomeRingContext.Provider value={value}>
      {projects ? (
        <div
          className={showHome ? "home-ring" : "home-ring home-ring--parked"}
          aria-hidden={!showHome}
        >
          <Carousel
            projects={projects}
            active={showHome}
            resumeSlug={resumeSlug}
          />
        </div>
      ) : null}
      <div
        className={
          showHome && !isHome
            ? "home-outlet home-outlet--covered"
            : "home-outlet"
        }
        aria-hidden={showHome && !isHome}
      >
        {children}
      </div>
    </HomeRingContext.Provider>
  );
}
