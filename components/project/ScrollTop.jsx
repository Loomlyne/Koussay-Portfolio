"use client";

import { useLayoutEffect } from "react";

export default function ScrollTop({ id }) {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  return null;
}
