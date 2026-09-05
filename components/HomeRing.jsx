"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useProjectPager } from "./project/ProjectPagerTransition";
import Carousel from "./Carousel";
import { HomeRingContext, useHomeRing } from "./homeRingContext";
import { useSharedTransition } from "./SharedTransitionProvider";

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
  const [homePending, setHomePending] = useState(false);
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
  const showHome = isHome || homePending;

  if (isHome && homePending) {
    setHomePending(false);
  }

  const prepareHome = useCallback(() => {
    shared?.abort?.();
    pager?.clear?.();
    if (projectsRef.current) setHomePending(true);
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
          <Carousel projects={projects} active={showHome} />
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
