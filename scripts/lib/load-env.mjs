import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Reads .env.local then .env without a dotenv dependency. A real process env
 * var always wins, so `KEY=... npm run <script>` overrides the file.
 */
export function loadEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env"]) {
    let text = "";
    try {
      text = readFileSync(join(root, file), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const i = trimmed.indexOf("=");
      if (i === -1) continue;
      const key = trimmed.slice(0, i);
      if (env[key]) continue;
      env[key] = trimmed.slice(i + 1).trim();
    }
  }
  return env;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function requireEnv(env, keys, hint) {
  const missing = keys.filter((key) => !String(env[key] || "").trim());
  if (missing.length) {
    console.error(`Missing ${missing.join(", ")}`);
    if (hint) console.error(hint);
    process.exit(1);
  }
}
