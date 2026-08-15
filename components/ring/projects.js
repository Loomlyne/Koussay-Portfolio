// Ring order, not filename order. Art is dealt straight down this list, so
// entry n sits one slot along from n-1 and the column can count 01..18 as the
// carousel turns. Reordering these rows moves the ring, the column and the
// numbering together; nothing else needs touching.
//
// TODO: every `type` and `year` is placeholder. Names marked (*) are guesses
// at the subject — the artwork carries no wordmark to read them off.
export const PROJECTS = [
  { file: "10.jpg", name: "Matchday", type: "Motion", year: "2025" }, // *
  { file: "12.jpg", name: "Nightshift", type: "Art Direction", year: "2023" }, // *
  { file: "14.jpg", name: "Volt", type: "Branding", year: "2024" }, // *
  { file: "16.png", name: "Keycard", type: "Product Design", year: "2026" }, // *
  { file: "18.jpg", name: "None", type: "Photography", year: "2026" },
  { file: "2.png", name: "Prestige Equine", type: "Web Design", year: "2025" },
  { file: "4.png", name: "Blue Room", type: "Identity", year: "2023" }, // *
  { file: "6.png", name: "Steininvest", type: "Web Design", year: "2024" },
  { file: "8.jpg", name: "CENE+", type: "Branding", year: "2026" },
  { file: "9.png", name: "Snuff", type: "Editorial", year: "2024" },
  { file: "7.jpg", name: "Iris", type: "Photography", year: "2023" }, // *
  { file: "5.jpg", name: "Sevenworlds", type: "Development", year: "2025" },
  { file: "3.png", name: "Irse a Volver", type: "Art Direction", year: "2024" },
  { file: "1.webp", name: "PM24", type: "Branding", year: "2024" },
  { file: "17.jpg", name: "Favor", type: "E-commerce", year: "2025" },
  { file: "15.png", name: "Freshweb", type: "Web Design", year: "2025" },
  { file: "13.png", name: "Proba", type: "Development", year: "2026" },
  { file: "11.jpg", name: "MVN", type: "Identity", year: "2025" },
];

export const IMAGE_FILES = PROJECTS.map((p) => p.file);
