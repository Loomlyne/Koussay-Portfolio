/**
 * Fast gate for repo content: node scripts/check-content.mjs
 * The build runs the same validator through lib/content.js.
 * Exits 1 with "[content] <slug>.<field>: <reason>" lines on any defect.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { root } from "./lib/load-env.mjs";
import { resolveContent } from "../lib/content-schema.mjs";
import { SITE_DESCRIPTION, SITE_NAME } from "../lib/site.js";

const index = join(root, "content/projects/index.mjs");
if (!existsSync(index)) {
  console.error("[content] content/projects/index.mjs missing");
  process.exit(1);
}

try {
  const { PROJECTS_IN_ORDER } = await import(pathToFileURL(index).href);
  const { MAX_PLANES } = await import(
    pathToFileURL(join(root, "components/shaders/planeShaders.js")).href
  );
  const manifest = JSON.parse(
    readFileSync(join(root, "content/media.json"), "utf8"),
  );
  resolveContent(PROJECTS_IN_ORDER, manifest, {
    maxPlanes: MAX_PLANES,
    site: { name: SITE_NAME, description: SITE_DESCRIPTION },
  });
  const media = Object.values(manifest.projects).reduce(
    (n, p) => n + 1 + Object.keys(p.gallery).length,
    0,
  );
  console.log(
    `content ok: ${PROJECTS_IN_ORDER.length} projects, ${media} media, ${PROJECTS_IN_ORDER.length + 1} share`,
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
