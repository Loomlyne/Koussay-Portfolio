function keysOf(page) {
  return Object.keys(page?.properties ?? {});
}

export function findProp(page, ...names) {
  const wanted = names.map((name) => name.toLowerCase());
  const key = keysOf(page).find((name) => wanted.includes(name.toLowerCase()));
  return key ? page.properties[key] : null;
}

export function plainText(richText) {
  if (!Array.isArray(richText)) return "";
  return richText
    .map((part) => part.plain_text ?? "")
    .join("")
    .trim();
}

export function textOf(prop) {
  if (!prop) return "";
  switch (prop.type) {
    case "rich_text":
      return plainText(prop.rich_text);
    case "title":
      return plainText(prop.title);
    case "url":
      return (prop.url ?? "").trim();
    case "email":
      return (prop.email ?? "").trim();
    case "select":
      return (prop.select?.name ?? "").trim();
    case "status":
      return (prop.status?.name ?? "").trim();
    case "number":
      return prop.number == null ? "" : String(prop.number);
    case "checkbox":
      return prop.checkbox ? "true" : "";
    default:
      return "";
  }
}

export function dateRangeOf(prop) {
  if (!prop || prop.type !== "date" || !prop.date) return null;
  return {
    start: String(prop.date.start ?? "").trim(),
    end: String(prop.date.end ?? "").trim(),
    timeZone: String(prop.date.time_zone ?? "").trim(),
  };
}

export function rich(text) {
  const value = String(text ?? "");
  if (!value) return [];
  return [{ type: "text", text: { content: value.slice(0, 2000) } }];
}
