import { Client } from "@notionhq/client";
import { unstable_cache } from "next/cache";

import { notionToken } from "@/lib/env";

let client;

export function notion() {
  const token = notionToken();
  if (!token) {
    throw new Error("NOTION_TOKEN is not set");
  }
  if (!client) {
    // Defaults are 60s and two retries. A 429 with Retry-After ~59s is what
    // parked the charging counter on 001: each cover waited a minute, and
    // CmsLive polling the stamp every 1.5s is how the limit was hit.
    client = new Client({
      auth: token,
      timeoutMs: 4000,
      retry: false,
    });
  }
  return client;
}

export function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function notionPageId(id) {
  return String(id || "").replace(/-/g, "");
}

export async function dataSourceId(databaseOrSourceId) {
  try {
    const database = await notion().databases.retrieve({
      database_id: databaseOrSourceId,
    });
    const source = database.data_sources?.[0]?.id;
    if (source) return source;
  } catch {
    // The env var may already be a data source id.
  }
  return databaseOrSourceId;
}

// databases.retrieve on every stamp/list call is how a 20s poll still
// burned the Notion budget. Resolve once; webhook tag busts it.
export const cachedDataSourceId = unstable_cache(
  async (id) => dataSourceId(id),
  ["notion-datasource"],
  { revalidate: 3600, tags: ["projects"] },
);
