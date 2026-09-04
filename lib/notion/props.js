function keysOf(page) {
  return Object.keys(page?.properties ?? {});
}

export function findProp(page, ...names) {
  const wanted = names.map((name) => name.toLowerCase());
  const key = keysOf(page).find((name) => wanted.includes(name.toLowerCase()));
  return key ? page.properties[key] : null;
}

export function titleOf(page) {
  const titled = Object.values(page?.properties ?? {}).find(
    (prop) => prop?.type === "title",
  );
  return plainText(titled?.title);
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

export function numberOf(prop) {
  if (!prop) return null;
  if (prop.type === "number" && typeof prop.number === "number") {
    return prop.number;
  }
  const parsed = Number.parseFloat(textOf(prop));
  return Number.isFinite(parsed) ? parsed : null;
}

export function checkboxOf(prop) {
  if (!prop) return null;
  if (prop.type === "checkbox") return Boolean(prop.checkbox);
  return null;
}

export function selectOf(prop) {
  return textOf(prop);
}

export function multiSelectOf(prop) {
  if (!prop) return [];
  if (prop.type === "multi_select") {
    return (prop.multi_select ?? []).map((item) => item.name).filter(Boolean);
  }
  return textOf(prop)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function dateStartOf(prop) {
  if (!prop) return "";
  if (prop.type === "date") return (prop.date?.start ?? "").trim();
  return textOf(prop);
}

export function filesOf(prop) {
  if (!prop || prop.type !== "files") return [];
  return (prop.files ?? [])
    .map((file) => ({
      name: file.name ?? "file",
      url: file.file?.url || file.external?.url || "",
    }))
    .filter((file) => file.url);
}

export function coverOf(page) {
  const cover = page?.cover;
  if (!cover) return "";
  return cover.file?.url || cover.external?.url || "";
}

export function rich(text) {
  const value = String(text ?? "");
  if (!value) return [];
  return [{ type: "text", text: { content: value.slice(0, 2000) } }];
}
