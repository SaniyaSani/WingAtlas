/*
 * The six pages of the EntoWing field journal. One source of truth for the
 * tab navigation, the learning path on the Start page and the "you are here"
 * note on every page, so the three can never disagree.
 */

export type JourneyMode = "start" | "atlas" | "compare" | "identify" | "mapper" | "learn";

export type JourneyStep = {
  mode: JourneyMode;
  page: number;
  tab: string;
  title: string;
  hint: string;
  question: string;
  colour: "sun" | "grass" | "coral" | "sky" | "lavender" | "pink";
  doodle: "wing" | "tree" | "pair" | "lens" | "pencil" | "star";
  canDo: string[];
  next: JourneyMode;
  nextLabel: string;
};

export const JOURNEY: JourneyStep[] = [
  {
    mode: "start",
    page: 1,
    tab: "Start",
    title: "Meet the wing",
    hint: "how to read a fly wing",
    question: "I am new here",
    colour: "sun",
    doodle: "wing",
    canDo: [
      "Tap a vein system on the example wing to learn its name.",
      "Follow the numbered path — each stop opens one page of the journal.",
      "Look up words like crossvein, homology or morphotype in the glossary.",
    ],
    next: "atlas",
    nextLabel: "Explore the family atlas",
  },
  {
    mode: "atlas",
    page: 2,
    tab: "Atlas",
    title: "Explore the family tree",
    hint: "157 fly families",
    question: "How are fly families related?",
    colour: "grass",
    doodle: "tree",
    canDo: [
      "Type a family in “Find family”, or drag the board and click a card.",
      "Read its wing, reference plate and caveats in the panel on the right.",
      "Press “Set as A” / “Set as B” on two families, then “Open Compare”.",
    ],
    next: "compare",
    nextLabel: "Compare two wings",
  },
  {
    mode: "compare",
    page: 3,
    tab: "Compare",
    title: "Compare two wings",
    hint: "overlay · blink · difference",
    question: "How do two families differ?",
    colour: "coral",
    doodle: "pair",
    canDo: [
      "Search plate A and plate B, then switch between Split, Overlay, Blink and Difference.",
      "Move, scale or rotate each plate, or place base and apex and press “Align”.",
      "Read the warnings: scale is unknown and an overlay never proves homology.",
    ],
    next: "identify",
    nextLabel: "Try the Wing ID Lab",
  },
  {
    mode: "identify",
    page: 4,
    tab: "Wing ID Lab",
    title: "Find look-alike references",
    hint: "photo → 3 candidates",
    question: "I have a photo of a wing",
    colour: "sky",
    doodle: "lens",
    canDo: [
      "Upload one flat wing photographed straight from above.",
      "Press “Find three candidates” and read why each one was suggested.",
      "Open the photo in Wing Mapper to check the veins yourself.",
    ],
    next: "mapper",
    nextLabel: "Trace a wing in Mapper",
  },
  {
    mode: "mapper",
    page: 5,
    tab: "Wing Mapper",
    title: "Trace a real wing",
    hint: "draw the veins yourself",
    question: "I want to label my own specimen",
    colour: "lavender",
    doodle: "pencil",
    canDo: [
      "Load a photo (or the Eristalis reference) and place a template over it.",
      "Drag the junction dots onto the real veins; Undo / Redo are always there.",
      "Use it as annotation, then export SVG + JSON. Your draft autosaves in this browser.",
    ],
    next: "learn",
    nextLabel: "Quiz yourself",
  },
  {
    mode: "learn",
    page: 6,
    tab: "Learn",
    title: "Quiz yourself",
    hint: "find the vein",
    question: "Do I remember the vein names?",
    colour: "pink",
    doodle: "star",
    canDo: [
      "Read the vein name in the bubble and click that vein on the wing.",
      "No traced wing yet? Load the reviewed Eristalis example with one click.",
      "Wrong answers tell you which vein you actually clicked.",
    ],
    next: "start",
    nextLabel: "Back to the start page",
  },
];

export const JOURNEY_BY_MODE = new Map(JOURNEY.map((step) => [step.mode, step]));

export function journeyStep(mode: JourneyMode): JourneyStep {
  return JOURNEY_BY_MODE.get(mode) ?? JOURNEY[0];
}

export function isJourneyMode(value: unknown): value is JourneyMode {
  return typeof value === "string" && JOURNEY_BY_MODE.has(value as JourneyMode);
}

/** Keep only known modes, deduplicated, in journey order. */
export function sanitizeVisited(value: unknown): JourneyMode[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set(value.filter(isJourneyMode));
  return JOURNEY.map((step) => step.mode).filter((mode) => seen.has(mode));
}
