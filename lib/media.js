export function isPdfName(value) {
  const path = String(value || "")
    .split("?")[0]
    .split("#")[0]
    .toLowerCase();
  return path.endsWith(".pdf");
}

export function parseMediaSlot(slot = "cover") {
  if (!slot || slot === "cover") {
    return { kind: "cover", fileIndex: null, page: 1, lookup: "cover" };
  }
  const match = /^g(\d+)(?:p(\d+))?$/.exec(slot);
  if (!match) {
    return { kind: "unknown", fileIndex: null, page: 1, lookup: slot };
  }
  const fileIndex = Number(match[1]);
  const page = match[2] ? Math.max(1, Number(match[2])) : 1;
  return {
    kind: "gallery",
    fileIndex,
    page,
    lookup: `g${fileIndex}`,
  };
}

export function slotFromMediaPath(file) {
  const path = String(file || "").split("?")[0];
  const parts = path.split("/").filter(Boolean);
  return parts[3] || "";
}
