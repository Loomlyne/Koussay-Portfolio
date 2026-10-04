import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright output
    "playwright-report/**",
    "test-results/**",
    // Local, generated Obsidian board (never committed)
    ".obsidian/**",
    "Board/**",
  ]),
]);

export default eslintConfig;
