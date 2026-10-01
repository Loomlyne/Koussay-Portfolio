import { sleep } from "./load-env.mjs";

export const API_BASE = "https://api.higgsfield.ai";

// Terminal states per the Higgsfield request lifecycle. Anything else is
// still working, including states this script has never seen.
const DONE = new Set(["completed", "failed", "nsfw", "canceled", "cancelled"]);

export function authHeader(env) {
  const id = String(env.HIGGSFIELD_API_KEY_ID || "").trim();
  const secret = String(env.HIGGSFIELD_API_KEY_SECRET || "").trim();
  return `Key ${id}:${secret}`;
}

function endpointUrl(endpoint) {
  if (/^https?:\/\//.test(endpoint)) return endpoint;
  return `${API_BASE}/${String(endpoint).replace(/^\/+/, "")}`;
}

async function readBody(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function submit(endpoint, body, env) {
  const response = await fetch(endpointUrl(endpoint), {
    method: "POST",
    headers: {
      Authorization: authHeader(env),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  const payload = await readBody(response);
  if (!response.ok) {
    throw new Error(
      `submit ${response.status}: ${payload.detail || payload.message || payload.raw || "unknown"}`,
    );
  }
  const requestId = payload.request_id || payload.id;
  if (!requestId) throw new Error(`submit returned no request_id`);
  return {
    requestId,
    statusUrl: payload.status_url || `${API_BASE}/requests/${requestId}/status`,
  };
}

/**
 * Polls until terminal. Generation is minutes, not seconds, so this backs off
 * to a steady 5s rather than hammering, and surfaces `nsfw` as its own failure
 * because the fix for it is a prompt edit, not a retry.
 */
export async function poll(statusUrl, env, { timeoutMs = 900000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let wait = 2000;
  for (;;) {
    if (Date.now() > deadline) throw new Error(`poll timed out`);
    await sleep(wait);
    wait = Math.min(5000, Math.round(wait * 1.3));

    let payload;
    try {
      const response = await fetch(statusUrl, {
        headers: { Authorization: authHeader(env) },
        signal: AbortSignal.timeout(30000),
      });
      payload = await readBody(response);
      // A transient 5xx on the status endpoint is not a failed generation.
      if (!response.ok && response.status < 500) {
        throw new Error(
          `status ${response.status}: ${payload.detail || payload.raw || ""}`,
        );
      }
      if (!response.ok) continue;
    } catch (error) {
      if (error.name === "TimeoutError") continue;
      throw error;
    }

    const status = String(payload.status || "").toLowerCase();
    if (!DONE.has(status)) continue;
    if (status !== "completed") {
      throw new Error(
        `generation ${status}${payload.detail ? `: ${payload.detail}` : ""}`,
      );
    }
    return payload;
  }
}

/** Flattens whichever array this model returns into plain URLs. */
export function outputUrls(payload) {
  const urls = [];
  const push = (value) => {
    if (!value) return;
    if (typeof value === "string") urls.push(value);
    else if (typeof value.url === "string") urls.push(value.url);
  };
  for (const key of ["images", "videos", "results", "outputs", "files"]) {
    const list = payload?.[key];
    if (Array.isArray(list)) list.forEach(push);
  }
  push(payload?.url);
  push(payload?.result);
  return [...new Set(urls)];
}

export async function generate(endpoint, body, env, options) {
  const { requestId, statusUrl } = await submit(endpoint, body, env);
  const payload = await poll(statusUrl, env, options);
  const urls = outputUrls(payload);
  if (!urls.length) throw new Error(`completed with no output url`);
  return { requestId, urls, payload };
}

export async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`download ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
