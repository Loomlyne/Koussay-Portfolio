import { createHash, createHmac } from "node:crypto";

const REGION = "auto"; // R2 ignores region but SigV4 requires one in the scope
const SERVICE = "s3";

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => createHmac("sha256", key).update(data).digest();

// encodeURIComponent leaves !'()* alone; RFC 3986 (and so SigV4) wants them escaped.
const uriEncode = (value) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

export function r2Config(env) {
  return {
    accountId: String(env.R2_ACCOUNT_ID || "").trim(),
    accessKeyId: String(env.R2_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: String(env.R2_SECRET_ACCESS_KEY || "").trim(),
    bucket: String(env.R2_BUCKET || "").trim(),
    publicBase: String(env.R2_PUBLIC_BASE || "")
      .trim()
      .replace(/\/+$/, ""),
  };
}

export function isR2Configured(config) {
  return Boolean(
    config.accountId &&
    config.accessKeyId &&
    config.secretAccessKey &&
    config.bucket,
  );
}

export function publicUrl(config, key) {
  if (!config.publicBase) return "";
  return `${config.publicBase}/${key.split("/").map(uriEncode).join("/")}`;
}

function signedRequest(config, { method, key, body, contentType, headers }) {
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = sha256(body ?? "");

  const canonicalPath = `/${config.bucket}/${key
    .split("/")
    .map(uriEncode)
    .join("/")}`;

  const signed = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(contentType ? { "content-type": contentType } : {}),
    ...headers,
  };
  const names = Object.keys(signed)
    .map((name) => name.toLowerCase())
    .sort();
  const canonicalHeaders = names
    .map((name) => `${name}:${String(signed[name]).trim()}\n`)
    .join("");
  const signedHeaders = names.join(";");

  const canonicalRequest = [
    method,
    canonicalPath,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${date}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  let signing = hmac(`AWS4${config.secretAccessKey}`, date);
  for (const part of [REGION, SERVICE, "aws4_request"]) {
    signing = hmac(signing, part);
  }
  const signature = createHmac("sha256", signing)
    .update(stringToSign)
    .digest("hex");

  return {
    url: `https://${host}${canonicalPath}`,
    headers: {
      ...signed,
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

export async function putObject(config, key, body, contentType, options = {}) {
  const extra = {};
  if (options.cacheControl) extra["cache-control"] = options.cacheControl;
  const { url, headers } = signedRequest(config, {
    method: "PUT",
    key,
    body,
    contentType,
    headers: extra,
  });
  const response = await fetch(url, {
    method: "PUT",
    headers,
    body,
    signal: AbortSignal.timeout(180000),
  });
  if (!response.ok) {
    throw new Error(
      `r2 put ${key} ${response.status}: ${await response.text()}`,
    );
  }
  return { key, url: publicUrl(config, key) };
}

export async function headObject(config, key) {
  const { url, headers } = signedRequest(config, { method: "HEAD", key });
  const response = await fetch(url, {
    method: "HEAD",
    headers,
    signal: AbortSignal.timeout(30000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`r2 head ${key} ${response.status}`);
  return { size: Number(response.headers.get("content-length") || 0) };
}

/**
 * The only deletable keys are throwaway health-check objects. Everything under
 * projects/ is content-addressed and served live, so the guard lives here, at
 * the point of the DELETE, not in a caller.
 */
export async function deleteObject(config, key) {
  if (!/^_healthcheck\/[\w-][\w.-]*$/.test(String(key))) {
    throw new Error(
      `r2 delete refused for ${key}: only _healthcheck/ objects may be deleted`,
    );
  }
  const { url, headers } = signedRequest(config, { method: "DELETE", key });
  const response = await fetch(url, {
    method: "DELETE",
    headers,
    signal: AbortSignal.timeout(30000),
  });
  if (![200, 204, 404].includes(response.status)) {
    throw new Error(`r2 delete ${key} ${response.status}`);
  }
}
