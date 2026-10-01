import { config, higgsfield } from "@higgsfield/client/v2";

/**
 * Thin wrapper over the official SDK. `subscribe` with `withPolling` already
 * handles submit-and-poll, so this only adds credential plumbing, output
 * normalisation and a download.
 */

// Exactly 3:2, and the largest Soul size at that ratio. atlas.js packs cells at
// cellW / 1.5, so this crops essentially nothing on the way into the ring.
export const SOUL_SIZE_3_2 = "2016x1344";

export const IMAGE_ENDPOINT = "/v1/text2image/soul";
export const VIDEO_ENDPOINT = "/v1/image2video/dop";

let configured = false;

/**
 * Accepts either HF_CREDENTIALS ("id:secret", the SDK's own convention) or the
 * two halves separately, because the console hands them over as a pair.
 */
export function configure(env) {
  if (configured) return;
  const joined = String(env.HF_CREDENTIALS || "").trim();
  const id = String(env.HIGGSFIELD_API_KEY_ID || "").trim();
  const secret = String(env.HIGGSFIELD_API_KEY_SECRET || "").trim();

  if (joined) config({ credentials: joined });
  else if (id && secret) config({ apiKey: id, apiSecret: secret });
  else throw new Error("no Higgsfield credentials");

  configured = true;
}

export function hasCredentials(env) {
  if (String(env.HF_CREDENTIALS || "").trim()) return true;
  return Boolean(
    String(env.HIGGSFIELD_API_KEY_ID || "").trim() &&
    String(env.HIGGSFIELD_API_KEY_SECRET || "").trim(),
  );
}

/**
 * V2Response returns `images` as an array but `video` as a single object, so a
 * naive "look for the plural" read silently finds nothing on every video.
 */
export function outputUrls(payload) {
  const urls = [];
  const push = (value) => {
    if (!value) return;
    if (typeof value === "string") urls.push(value);
    else if (typeof value.url === "string") urls.push(value.url);
  };
  if (Array.isArray(payload?.images)) payload.images.forEach(push);
  push(payload?.video);
  if (Array.isArray(payload?.videos)) payload.videos.forEach(push);
  return [...new Set(urls)];
}

export async function generate(endpoint, input, env) {
  configure(env);
  const result = await higgsfield.subscribe(endpoint, {
    input,
    withPolling: true,
  });

  const status = String(result?.status || "").toLowerCase();
  if (status !== "completed") {
    // nsfw is its own outcome: the fix is a prompt edit, not a retry.
    throw new Error(`generation ${status || "returned no status"}`);
  }

  const urls = outputUrls(result);
  if (!urls.length) throw new Error("completed with no output url");
  return { requestId: result.request_id, urls, payload: result };
}

export function imageInput(prompt, extra = {}) {
  return {
    prompt,
    width_and_height: SOUL_SIZE_3_2,
    quality: "1080p",
    batch_size: 1,
    ...extra,
  };
}

export function videoInput(prompt, startImageUrl, extra = {}) {
  return {
    model: "dop-standard",
    prompt,
    input_images: [{ type: "image_url", image_url: startImageUrl }],
    ...extra,
  };
}

export async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`download ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
