// List order is ring order: art is dealt straight down this list, so reordering
// moves the ring, the column and the numbering together. `slug` is identity,
// not presentation: a URL survives a reorder.
import pixenhouse from "./pixenhouse.mjs";
import vamosTaxi from "./vamos-taxi.mjs";
import loomaKitchen from "./looma-kitchen.mjs";
import almarPrivateJourney from "./almar-private-journey.mjs";
import fidoHomes from "./fido-homes.mjs";
import elyseeHomeDesign from "./elysee-home-design.mjs";
import clickitStory from "./clickit-story.mjs";
import artemisLuxe from "./artemis-luxe.mjs";

export const PROJECTS_IN_ORDER = [
  pixenhouse,
  vamosTaxi,
  loomaKitchen,
  almarPrivateJourney,
  fidoHomes,
  elyseeHomeDesign,
  clickitStory,
  artemisLuxe,
];

export const ORDER = PROJECTS_IN_ORDER.map((p) => p.slug);
