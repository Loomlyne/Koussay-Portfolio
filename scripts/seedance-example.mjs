/**
 * One Seedance 2.5 text-to-video generation through the official Higgsfield
 * SDK. Billable: every run spends credits.
 *
 *   node scripts/seedance-example.mjs
 *
 * Reads HF_CREDENTIALS ("key-id:key-secret") from .env.local at runtime and
 * never prints it. Exits non-zero unless the request completed with a video.
 */
import {
  APIError,
  HiggsfieldError,
  config,
  higgsfield,
} from "@higgsfield/client/v2";
import { loadEnv, requireEnv } from "./lib/load-env.mjs";

const MODEL = "bytedance/seedance-2.5/text-to-video";

const env = loadEnv();
requireEnv(env, ["HF_CREDENTIALS"]);

config({
  credentials: env.HF_CREDENTIALS,
  // The SDK retries a failed submit by default; a retried paid submit can
  // bill twice, so submit exactly once.
  maxRetries: 0,
  // Video renders can outlast the SDK's 5-minute default.
  maxPollTime: 15 * 60 * 1000,
});

let result;
try {
  result = await higgsfield.subscribe(MODEL, {
    input: {
      prompt: "A cinematic scene at sunset",
      duration: 5,
      resolution: "720p",
      aspect_ratio: "16:9",
    },
    withPolling: true,
  });
} catch (error) {
  // Log name, status and message only: the error object carries request
  // headers, which include the credentials.
  const status = error instanceof APIError ? ` (HTTP ${error.statusCode})` : "";
  const kind = error instanceof HiggsfieldError ? error.name : "Error";
  console.error(`[seedance] ${kind}${status}: ${error.message}`);
  process.exit(1);
}

const url = result?.video?.url;
if (result?.status !== "completed" || !url) {
  const why =
    result?.status === "nsfw"
      ? "rejected by moderation"
      : result?.status === "failed"
        ? "generation failed"
        : `ended as "${result?.status ?? "unknown"}" with no video`;
  console.error(
    `[seedance] Not generated: ${why}. Request ${result?.request_id ?? "n/a"}.`,
  );
  process.exit(1);
}

console.log(`[seedance] Completed. Request ${result.request_id}.`);
console.log(url);
