/**
 * Prompt templates for the ring art.
 *
 * Three constraints shape all of these, and they are not negotiable from the
 * prompt side:
 *
 * 1. The art is read at 512x341 (atlas.js cells), often dimmed and off-axis at
 *    the edges of the ring. One dominant mass, generous negative space.
 * 2. No text. The atlas cover-crops every cell, so type is both illegible and
 *    liable to be cut mid-word.
 * 3. The value structure must be identical across all eighteen or the ring
 *    stops reading as one object. Only hue moves.
 */

// Walks the wheel once across eighteen slots, so scrolling the ring reads as a
// deliberate sequence rather than eighteen unrelated pictures.
const ACCENTS = [
  "electric yellow",
  "acid lime",
  "spring green",
  "cool mint",
  "deep teal",
  "cyan",
  "azure",
  "cobalt blue",
  "indigo",
  "violet",
  "magenta",
  "fuchsia",
  "hot pink",
  "crimson",
  "scarlet",
  "burnt orange",
  "amber",
  "pale gold",
];

const NEGATIVE =
  "No text, no letters, no numbers, no logos, no watermarks, no people, no faces, no borders, no frame.";

export const DIRECTIONS = {
  concrete: {
    label: "Concrete & Signal",
    image: (project, accent) =>
      `Abstract sculptural still life for a design studio portfolio card. Raw board-formed concrete, matte plaster and folded paper forms in a desaturated warm grey palette, with a single ${accent} accent element cutting sharply through the composition. Hard directional studio light from the upper left, deep crisp shadow, seamless neutral grey backdrop. One dominant central mass, generous negative space, shallow depth of field. Editorial medium-format product photography. Mood: ${project.type.toLowerCase()}, ${project.mood}. ${NEGATIVE}`,
    video:
      "Extremely slow, restrained camera push with a gentle parallax drift across the forms. The subject itself barely moves. Light shifts almost imperceptibly. Locked framing, no cuts, no zoom snap, no camera shake.",
  },
  chrome: {
    label: "Liquid Chrome",
    image: (project, accent) =>
      `Abstract studio render for a design portfolio card. Polished liquid chrome and thick viscous fluid forming a single heavy coiled mass, iridescent ${accent} sheen breaking across the highlights, on a near-black seamless background. High-key rim light, sharp specular reflections, deep falloff into black. One dominant central form, wide negative space, shallow depth of field. Mood: ${project.type.toLowerCase()}, ${project.mood}. ${NEGATIVE}`,
    video:
      "The liquid surface undulates slowly and continuously, reflections crawling across the chrome. Camera holds completely still. Seamless loop, no cuts, no camera movement.",
  },
  flatbed: {
    label: "Flatbed Archive",
    image: (project, accent) =>
      `Overhead flat-lay of physical graphic design artefacts on a seamless neutral grey sweep, photographed straight down. Folded printed sheets, a swatch book fanned open, strips of tape, metal pins and a trimmed paper stack, arranged off-centre with deliberate asymmetry. One ${accent} element anchors the composition. Soft broad overhead light with a short soft shadow. Printed surfaces are deliberately out of focus and illegible. Documentary studio photography. Mood: ${project.type.toLowerCase()}, ${project.mood}. ${NEGATIVE}`,
    video:
      "A hand-free slow vertical lift of the camera away from the flat-lay, a few centimetres only. Nothing on the table moves. Locked overhead angle, no cuts.",
  },
};

export const DIRECTION_KEYS = Object.keys(DIRECTIONS);

/**
 * The placeholder summaries are long and full of words like "speculative" that
 * steer a generator badly. Pull a short mood clause instead.
 */
function moodOf(project) {
  const summary = String(project.detail?.summary || "");
  const clause = summary
    .replace(/^A speculative\s*/i, "")
    .split(/[.,]/)[0]
    .trim();
  return clause.length > 12 ? clause.toLowerCase() : "quiet and considered";
}

export function accentFor(index) {
  return ACCENTS[index % ACCENTS.length];
}

export function buildImagePrompt(project, index, directionKey) {
  const direction = DIRECTIONS[directionKey];
  if (!direction) throw new Error(`unknown direction ${directionKey}`);
  return direction.image(
    { ...project, mood: moodOf(project) },
    accentFor(index),
  );
}

export function buildVideoPrompt(directionKey) {
  const direction = DIRECTIONS[directionKey];
  if (!direction) throw new Error(`unknown direction ${directionKey}`);
  return direction.video;
}
