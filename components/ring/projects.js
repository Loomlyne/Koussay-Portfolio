// Ring order, not filename order. Art is dealt straight down this list, so
// entry n sits one slot along from n-1 and the column can count 01..18 as the
// carousel turns. Reordering these rows moves the ring, the column and the
// numbering together; nothing else needs touching.
//
// TODO: every `type` and `year` is placeholder. Names marked (*) are guesses
// at the subject — the artwork carries no wordmark to read them off.
//
// `slug` is identity, not presentation: keep it explicit so a URL survives a
// later reorder of this ring. `detail` is deliberately marked as prototype
// content; it must not be read as a claim about the placeholder artwork.
// `detail` fields: overview, challenge, outcome, gallery, testimonial, tools.
// Placeholder copy only — replace before publishing.
const prototypeDetail = (summary, sections) => ({
  summary,
  overview: sections[0]?.body ?? "",
  challenge: sections[1]?.body ?? "",
  outcome: sections[2]?.body ?? "",
  gallery: [],
  testimonial: {
    quote:
      "Placeholder client feedback for this speculative case study. Replace with a verified quote before publishing.",
    author: "Client name",
    role: "Role · Company",
  },
  tools: ["Figma", "After Effects", "Cinema 4D"],
});

const PROJECTS_DATA = [
  {
    file: "10.webp",
    slug: "matchday",
    name: "Matchday",
    type: "Motion",
    year: "2025",
    detail: prototypeDetail(
      "A speculative motion study using repeated forms to suggest pace, pause, and collective energy.",
      [
        {
          title: "Brief",
          body: "Explore how one compact visual system could move between a still poster and a sequence.",
        },
        {
          title: "Approach",
          body: "Build a rhythm from modular blocks, letting compression and release carry the sense of movement.",
        },
        {
          title: "Material / output",
          body: "A proposed set of animated frames, transition studies, and a flexible still-image language.",
        },
      ],
    ),
  }, // *
  {
    file: "12.webp",
    slug: "nightshift",
    name: "Nightshift",
    type: "Art Direction",
    year: "2023",
    detail: prototypeDetail(
      "A speculative art-direction study for a nocturnal visual mood built from contrast, grain, and quiet space.",
      [
        {
          title: "Brief",
          body: "Shape an atmosphere that can feel immediate in a single image and unfold across a longer sequence.",
        },
        {
          title: "Approach",
          body: "Pair deep fields with small points of light and measured compositions to make stillness feel active.",
        },
        {
          title: "Material / output",
          body: "A proposed visual direction with image treatments, layout references, and a small set of campaign frames.",
        },
      ],
    ),
  }, // *
  {
    file: "14.webp",
    slug: "volt",
    name: "Volt",
    type: "Branding",
    year: "2024",
    detail: prototypeDetail(
      "A speculative identity exercise that treats energy as a system of sharp transitions and charged colour.",
      [
        {
          title: "Brief",
          body: "Test how a concise identity could communicate momentum without relying on a literal symbol.",
        },
        {
          title: "Approach",
          body: "Use angular forms, emphatic spacing, and controlled flashes of colour to create a repeatable visual pulse.",
        },
        {
          title: "Material / output",
          body: "A proposed mark study, type direction, colour set, and a handful of adaptable identity applications.",
        },
      ],
    ),
  }, // *
  {
    file: "16.webp",
    slug: "keycard",
    name: "Keycard",
    type: "Product Design",
    year: "2026",
    detail: prototypeDetail(
      "A speculative product-design study about access, sequence, and the small gestures around a digital threshold.",
      [
        {
          title: "Brief",
          body: "Imagine a focused interaction where recognition and progress are clear without becoming visually heavy.",
        },
        {
          title: "Approach",
          body: "Reduce the interface to deliberate states, using hierarchy and tactile cues to guide each handoff.",
        },
        {
          title: "Material / output",
          body: "A proposed interaction map, interface fragments, and a lightweight visual language for key moments.",
        },
      ],
    ),
  }, // *
  {
    file: "18.webp",
    slug: "none",
    name: "None",
    type: "Photography",
    year: "2026",
    detail: prototypeDetail(
      "A speculative photographic sequencing study focused on absence, pause, and the edges of a subject.",
      [
        {
          title: "Brief",
          body: "Find a restrained way to make a quiet image sequence hold attention without adding a narrative claim.",
        },
        {
          title: "Approach",
          body: "Let cropping, distance, and repeated tonal relationships create the structure from frame to frame.",
        },
        {
          title: "Material / output",
          body: "A proposed edit with sequencing notes, crop studies, and a considered presentation rhythm.",
        },
      ],
    ),
  },
  {
    file: "2.webp",
    slug: "prestige-equine",
    name: "Prestige Equine",
    type: "Web Design",
    year: "2025",
    detail: prototypeDetail(
      "A speculative web-design study for an equestrian subject, balancing editorial calm with moments of motion.",
      [
        {
          title: "Brief",
          body: "Explore a digital presentation that gives imagery room to breathe while keeping key information easy to find.",
        },
        {
          title: "Approach",
          body: "Combine wide image fields with a narrow typographic column and a measured sequence of supporting details.",
        },
        {
          title: "Material / output",
          body: "A proposed landing-page structure, responsive layout direction, and image-led content rhythm.",
        },
      ],
    ),
  },
  {
    file: "4.webp",
    slug: "blue-room",
    name: "Blue Room",
    type: "Identity",
    year: "2023",
    detail: prototypeDetail(
      "A speculative identity study built around the tension between a single colour family and open space.",
      [
        {
          title: "Brief",
          body: "Develop a recognisable visual attitude from a narrow palette without making the system feel repetitive.",
        },
        {
          title: "Approach",
          body: "Shift scale, density, and blue tones across a small set of forms so the identity can stay composed but alive.",
        },
        {
          title: "Material / output",
          body: "A proposed identity toolkit with typographic rules, colour relationships, and flexible compositions.",
        },
      ],
    ),
  }, // *
  {
    file: "6.webp",
    slug: "steininvest",
    name: "Steininvest",
    type: "Web Design",
    year: "2024",
    detail: prototypeDetail(
      "A speculative web-design exercise for a structured, information-heavy subject that still needs a human pace.",
      [
        {
          title: "Brief",
          body: "Test how a dense subject can be made legible through hierarchy, spacing, and a calm reading sequence.",
        },
        {
          title: "Approach",
          body: "Organise the interface around clear entry points, restrained contrast, and generous pauses between decisions.",
        },
        {
          title: "Material / output",
          body: "A proposed page architecture, responsive content modules, and a visual system for long-form information.",
        },
      ],
    ),
  },
  {
    file: "8.webp",
    slug: "cene-plus",
    name: "CENE+",
    type: "Branding",
    year: "2026",
    detail: prototypeDetail(
      "A speculative branding study that turns a compact name into a system of layered marks and editorial signals.",
      [
        {
          title: "Brief",
          body: "Explore how a short identity can carry different levels of emphasis across print, screen, and motion.",
        },
        {
          title: "Approach",
          body: "Work with repetition, overlap, and a deliberately tight typographic frame to make the system feel additive.",
        },
        {
          title: "Material / output",
          body: "A proposed wordmark direction, graphic toolkit, and sample compositions for changing contexts.",
        },
      ],
    ),
  },
  {
    file: "9.webp",
    slug: "snuff",
    name: "Snuff",
    type: "Editorial",
    year: "2024",
    detail: prototypeDetail(
      "A speculative editorial study that uses blunt scale changes and close crops to make a compact story feel physical.",
      [
        {
          title: "Brief",
          body: "Create an editorial rhythm that can move between direct statements and quieter visual rests.",
        },
        {
          title: "Approach",
          body: "Set heavy display moments against narrow reading measures, using interruption as part of the composition.",
        },
        {
          title: "Material / output",
          body: "A proposed cover direction, page sequence, and set of type-and-image relationships.",
        },
      ],
    ),
  },
  {
    file: "7.webp",
    slug: "iris",
    name: "Iris",
    type: "Photography",
    year: "2023",
    detail: prototypeDetail(
      "A speculative photographic study of focus and repetition, with small shifts carrying the sequence forward.",
      [
        {
          title: "Brief",
          body: "Build a visual set where attention moves through details rather than through an asserted storyline.",
        },
        {
          title: "Approach",
          body: "Use proximity, soft contrast, and recurring circular cues to connect otherwise independent frames.",
        },
        {
          title: "Material / output",
          body: "A proposed image edit, sequencing system, and presentation studies for a slow reveal.",
        },
      ],
    ),
  }, // *
  {
    file: "5.webp",
    slug: "sevenworlds",
    name: "Sevenworlds",
    type: "Development",
    year: "2025",
    detail: prototypeDetail(
      "A speculative development study about making several visual modes feel like one navigable experience.",
      [
        {
          title: "Brief",
          body: "Imagine a flexible digital structure that can move between distinct sections without losing its orientation.",
        },
        {
          title: "Approach",
          body: "Treat transitions, shared primitives, and responsive states as the connective tissue between each mode.",
        },
        {
          title: "Material / output",
          body: "A proposed interaction prototype, component direction, and notes for a modular front-end system.",
        },
      ],
    ),
  },
  {
    file: "3.webp",
    slug: "irse-a-volver",
    name: "Irse a Volver",
    type: "Art Direction",
    year: "2024",
    detail: prototypeDetail(
      "A speculative art-direction study about departure and return, expressed through echoes, intervals, and warm surfaces.",
      [
        {
          title: "Brief",
          body: "Find a visual language that can hold two opposing movements without forcing them into a literal narrative.",
        },
        {
          title: "Approach",
          body: "Layer familiar shapes with offset framing and recurring gestures so the work feels remembered rather than fixed.",
        },
        {
          title: "Material / output",
          body: "A proposed image direction, typographic mood, and sequence of visual references for further development.",
        },
      ],
    ),
  },
  {
    file: "1.webp",
    slug: "pm24",
    name: "PM24",
    type: "Branding",
    year: "2024",
    detail: prototypeDetail(
      "A speculative branding exercise using a compact alphanumeric mark as the starting point for a broader system.",
      [
        {
          title: "Brief",
          body: "Test how a minimal label can become recognisable through consistent proportion, pacing, and placement.",
        },
        {
          title: "Approach",
          body: "Build outward from the mark with modular grids, precise spacing, and a few high-contrast interventions.",
        },
        {
          title: "Material / output",
          body: "A proposed mark treatment, layout grid, and set of applications that keep the system adaptable.",
        },
      ],
    ),
  },
  {
    file: "17.webp",
    slug: "favor",
    name: "Favor",
    type: "E-commerce",
    year: "2025",
    detail: prototypeDetail(
      "A speculative e-commerce study that gives browsing a softer pace through material detail and clear choices.",
      [
        {
          title: "Brief",
          body: "Explore how a product-led interface can feel considered while keeping discovery and purchase paths direct.",
        },
        {
          title: "Approach",
          body: "Use close imagery, concise descriptions, and a small number of decisive states to reduce visual friction.",
        },
        {
          title: "Material / output",
          body: "A proposed storefront flow, product-detail structure, and responsive merchandising direction.",
        },
      ],
    ),
  },
  {
    file: "15.webp",
    slug: "freshweb",
    name: "Freshweb",
    type: "Web Design",
    year: "2025",
    detail: prototypeDetail(
      "A speculative web-design study about making a digital surface feel open, bright, and easy to move through.",
      [
        {
          title: "Brief",
          body: "Create a flexible starting point for content that can remain expressive without hiding the route ahead.",
        },
        {
          title: "Approach",
          body: "Balance crisp type, generous margins, and responsive shifts so the interface keeps its energy at every size.",
        },
        {
          title: "Material / output",
          body: "A proposed homepage composition, navigation pattern, and set of reusable content sections.",
        },
      ],
    ),
  },
  {
    file: "13.webp",
    slug: "proba",
    name: "Proba",
    type: "Development",
    year: "2026",
    detail: prototypeDetail(
      "A speculative development study that treats the interface as a sequence of small experiments and refinements.",
      [
        {
          title: "Brief",
          body: "Explore a build process where testing different visual behaviours is part of the visible experience.",
        },
        {
          title: "Approach",
          body: "Keep the primitives simple, make state changes legible, and let interaction provide the sense of progress.",
        },
        {
          title: "Material / output",
          body: "A proposed interactive prototype, implementation notes, and a small collection of reusable behaviours.",
        },
      ],
    ),
  },
  {
    file: "11.webp",
    slug: "mvn",
    name: "MVN",
    type: "Identity",
    year: "2025",
    detail: prototypeDetail(
      "A speculative identity study that uses three compact characters to explore rhythm, alignment, and variation.",
      [
        {
          title: "Brief",
          body: "Develop a system that can feel precise in a lockup and expressive when its parts are allowed to separate.",
        },
        {
          title: "Approach",
          body: "Use alignment shifts, repeated measures, and controlled scale changes to give the short mark a longer life.",
        },
        {
          title: "Material / output",
          body: "A proposed identity grammar, type direction, and set of modular compositions for future testing.",
        },
      ],
    ),
  },
];

// `liveUrl` is optional — set on a project when a shipped URL exists.
export const PROJECTS = PROJECTS_DATA.map((project) => ({
  ...project,
  liveUrl: project.liveUrl ?? null,
}));

export const IMAGE_FILES = PROJECTS.map((p) => p.file);
