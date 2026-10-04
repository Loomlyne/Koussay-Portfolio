/**
 * Share-card text and inputs hash. Pure: no app dependencies, no env, so the
 * authoring script and the build validator compute the same strings and hash.
 */
import { createHash } from "node:crypto";

export const LAYOUT_VERSION = 1;
export const OWNER = "Koussay Zayani";

export function projectLines(project) {
  // A null type must not print "null" on the card.
  return [project.name, project.type ? `${project.type} · ${OWNER}` : OWNER];
}

export function homeLines(name, description) {
  const stop = description.indexOf(".");
  if (stop < 0) {
    throw new Error("[share] home description has no full stop");
  }
  return [name, description.slice(0, stop)];
}

export function inputsHash(coverSha256, lines) {
  return createHash("sha256")
    .update(JSON.stringify([LAYOUT_VERSION, coverSha256, ...lines]))
    .digest("hex");
}
