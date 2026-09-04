import { Client } from "@notionhq/client";

import { notionToken } from "@/lib/env";

let client;

export function notion() {
  const token = notionToken();
  if (!token) {
    throw new Error("NOTION_TOKEN is not set");
  }
  if (!client) {
    client = new Client({ auth: token });
  }
  return client;
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
