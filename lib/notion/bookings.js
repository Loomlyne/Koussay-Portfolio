import { dataSourceId, notion } from "@/lib/notion/client";
import { dateStartOf, findProp, rich, textOf } from "@/lib/notion/props";
import { notionBookingsDatabaseId } from "@/lib/env";
import { notionDateValue, slotStartMs } from "@/lib/book/time";

const CLOSED_STATUSES = new Set([
  "cancelled",
  "canceled",
  "declined",
  "archived",
]);

function schemaKey(schema, ...names) {
  const wanted = names.map((name) => name.toLowerCase());
  return Object.keys(schema).find((name) =>
    wanted.includes(name.toLowerCase()),
  );
}

function setProp(properties, schema, names, write) {
  const key = schemaKey(schema, ...names);
  if (!key) return;
  const value = write(schema[key].type);
  if (value) properties[key] = value;
}

function asText(type, content) {
  const value = String(content ?? "").trim();
  if (!value) return null;
  if (type === "rich_text") return { rich_text: rich(value) };
  if (type === "title") return { title: rich(value) };
  if (type === "select") return { select: { name: value.slice(0, 100) } };
  if (type === "status") return { status: { name: value.slice(0, 100) } };
  if (type === "url") return { url: value };
  if (type === "email") return { email: value };
  return null;
}

function safeFilename(name) {
  const base = String(name || "attachment")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .trim();
  return base.slice(0, 100) || "attachment";
}

function fileBlock(attachment, fileUploadId) {
  const name = safeFilename(attachment.filename);
  const type = String(attachment.contentType || "").toLowerCase();
  const lower = name.toLowerCase();
  const upload = {
    type: "file_upload",
    file_upload: { id: fileUploadId },
  };

  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif)$/.test(lower)) {
    return { object: "block", type: "image", image: upload };
  }
  if (type === "application/pdf" || lower.endsWith(".pdf")) {
    return { object: "block", type: "pdf", pdf: upload };
  }
  return {
    object: "block",
    type: "file",
    file: { ...upload, name },
  };
}

export async function uploadNotionFile(attachment) {
  if (!attachment?.buffer || !attachment.filename) return null;

  const filename = safeFilename(attachment.filename);
  const contentType = attachment.contentType || "application/octet-stream";
  const created = await notion().fileUploads.create({
    mode: "single_part",
    filename,
    content_type: contentType,
  });
  const bytes = new Uint8Array(attachment.buffer);
  await notion().fileUploads.send({
    file_upload_id: created.id,
    file: {
      filename,
      data: new Blob([bytes], { type: contentType }),
    },
  });
  return created.id;
}

function instantFromPage(page) {
  const status = textOf(findProp(page, "status")).toLowerCase();
  if (CLOSED_STATUSES.has(status)) return null;

  const dateProp = findProp(page, "date");
  const start = dateStartOf(dateProp);
  if (start.includes("T")) {
    const ms = Date.parse(start);
    return Number.isFinite(ms) ? ms : null;
  }

  const date = start.slice(0, 10);
  const time = textOf(findProp(page, "time"));
  const timezone = textOf(findProp(page, "timezone")) || "Dubai/GST";
  return slotStartMs(date, time, timezone);
}

async function bookingsSource() {
  const sourceId = await dataSourceId(notionBookingsDatabaseId());
  const database = await notion().dataSources.retrieve({
    data_source_id: sourceId,
  });
  return { sourceId, schema: database.properties };
}

export async function fetchBookedStarts() {
  const { sourceId, schema } = await bookingsSource();
  const dateKey = schemaKey(schema, "date");
  const filter =
    dateKey && schema[dateKey].type === "date"
      ? {
          property: dateKey,
          date: {
            on_or_after: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10),
          },
        }
      : undefined;

  const results = [];
  let startCursor;
  do {
    try {
      const page = await notion().dataSources.query({
        data_source_id: sourceId,
        start_cursor: startCursor,
        page_size: 100,
        filter,
        sorts: [{ timestamp: "created_time", direction: "descending" }],
      });
      results.push(...page.results);
      startCursor = page.has_more ? page.next_cursor : undefined;
    } catch (error) {
      if (filter) {
        return fetchBookedStartsUnfiltered(sourceId);
      }
      throw error;
    }
  } while (startCursor && results.length < 300);

  return bookedStartsFromPages(results);
}

async function fetchBookedStartsUnfiltered(sourceId) {
  const results = [];
  let startCursor;
  do {
    const page = await notion().dataSources.query({
      data_source_id: sourceId,
      start_cursor: startCursor,
      page_size: 100,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    });
    results.push(...page.results);
    startCursor = page.has_more ? page.next_cursor : undefined;
  } while (startCursor && results.length < 300);
  return bookedStartsFromPages(results);
}

function bookedStartsFromPages(results) {
  const taken = new Set();
  for (const page of results) {
    if (page.object !== "page" || page.archived || page.in_trash) continue;
    const start = instantFromPage(page);
    if (start != null) taken.add(start);
  }
  return taken;
}

export async function createNotionBooking(booking, attachment) {
  const { sourceId, schema } = await bookingsSource();
  const properties = {};
  let fileUploadId = null;

  if (attachment) {
    try {
      fileUploadId = await uploadNotionFile(attachment);
    } catch (error) {
      console.error("[book] Notion file upload failed", error);
    }
  }

  const titleKey = Object.keys(schema).find(
    (key) => schema[key].type === "title",
  );
  if (titleKey) {
    properties[titleKey] = { title: rich(booking.name) };
  }

  setProp(properties, schema, ["email"], (type) => asText(type, booking.email));
  setProp(properties, schema, ["date"], (type) =>
    type === "date"
      ? {
          date: notionDateValue(booking.date, booking.time, booking.timezone),
        }
      : asText(type, `${booking.date} ${booking.time}`),
  );
  setProp(properties, schema, ["time"], (type) => asText(type, booking.time));
  setProp(properties, schema, ["timezone"], (type) =>
    asText(type, booking.timezone),
  );
  setProp(properties, schema, ["company"], (type) =>
    asText(type, booking.company),
  );
  setProp(properties, schema, ["website", "url"], (type) =>
    asText(type, booking.website),
  );
  setProp(properties, schema, ["services", "help"], (type) =>
    type === "multi_select"
      ? { multi_select: booking.services.map((name) => ({ name })) }
      : asText(type, booking.services.join(", ")),
  );
  setProp(properties, schema, ["budget"], (type) =>
    asText(type, booking.budget),
  );
  setProp(properties, schema, ["deadline"], (type) =>
    asText(type, booking.deadline),
  );
  setProp(properties, schema, ["details", "notes", "about"], (type) =>
    asText(type, booking.details || "Skipped"),
  );
  setProp(
    properties,
    schema,
    ["attachment", "file", "files", "document"],
    (type) => {
      if (type === "files" && fileUploadId) {
        return {
          files: [
            {
              type: "file_upload",
              file_upload: { id: fileUploadId },
              name: safeFilename(booking.attachmentName),
            },
          ],
        };
      }
      if (type === "files") return null;
      return asText(type, booking.attachmentName || "None");
    },
  );
  setProp(properties, schema, ["status"], (type) => asText(type, "New"));

  const summary = [
    `${booking.name} · ${booking.email}`,
    `${booking.date} ${booking.time} (${booking.timezone})`,
    booking.company,
    booking.website,
    booking.services.join(", "),
    `${booking.budget} · ${booking.deadline}`,
    booking.details || "Details skipped",
    booking.attachmentName ? `Attached: ${booking.attachmentName}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const children = [
    {
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: rich(summary) },
    },
  ];
  if (fileUploadId && attachment) {
    children.push(fileBlock(attachment, fileUploadId));
  }

  try {
    return await notion().pages.create({
      parent: { data_source_id: sourceId },
      properties,
      children,
    });
  } catch (error) {
    // Select/status/multi-select fail if the option isn't in the DB yet.
    // Files/datetime can also miss if the property isn't set up for them.
    const fallback = Object.fromEntries(
      Object.entries(properties).filter(([, value]) => {
        const type = Object.keys(value)[0];
        return !["select", "status", "multi_select", "files"].includes(type);
      }),
    );
    const dateKey = schemaKey(schema, "date");
    if (dateKey && fallback[dateKey]?.date?.start?.includes("T")) {
      fallback[dateKey] = { date: { start: booking.date } };
    }
    return notion().pages.create({
      parent: { data_source_id: sourceId },
      properties: fallback,
      children,
    });
  }
}
