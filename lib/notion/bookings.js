import { dataSourceId, notion } from "@/lib/notion/client";
import { rich } from "@/lib/notion/props";
import { notionBookingsDatabaseId } from "@/lib/env";

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

export async function createNotionBooking(booking) {
  const sourceId = await dataSourceId(notionBookingsDatabaseId());
  const database = await notion().dataSources.retrieve({
    data_source_id: sourceId,
  });
  const schema = database.properties;
  const properties = {};

  const titleKey = Object.keys(schema).find(
    (key) => schema[key].type === "title",
  );
  if (titleKey) {
    properties[titleKey] = { title: rich(booking.name) };
  }

  setProp(properties, schema, ["email"], (type) => asText(type, booking.email));
  setProp(properties, schema, ["date"], (type) =>
    type === "date"
      ? { date: { start: booking.date } }
      : asText(type, booking.date),
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
  setProp(properties, schema, ["attachment"], (type) =>
    asText(type, booking.attachmentName || "None"),
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

  try {
    return await notion().pages.create({
      parent: { data_source_id: sourceId },
      properties,
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: rich(summary) },
        },
      ],
    });
  } catch (error) {
    // Select/status/multi-select fail if the option isn't in the DB yet.
    return notion().pages.create({
      parent: { data_source_id: sourceId },
      properties: Object.fromEntries(
        Object.entries(properties).filter(([, value]) => {
          const type = Object.keys(value)[0];
          return !["select", "status", "multi_select"].includes(type);
        }),
      ),
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: rich(summary) },
        },
      ],
    });
  }
}
