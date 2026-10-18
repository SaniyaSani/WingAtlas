/*
 * Types and pure helpers for extracted plate vectors (entowing-plate-vectors/1.0)
 * and the user's review of them (entowing-plate-review/1.0).
 */

export type PlateEdge = { id: string; from: string; to: string; strokeWidth: number; points: [number, number][]; sourceElementId: string | null };
export type PlateLabel = {
  id: string;
  text: string;
  kind: "vein" | "crossvein" | "landmark" | "cell" | "other";
  method: "leader" | "proximity" | "none";
  anchor: [number, number];
  textBox: [number, number, number, number];
  edgeIds?: string[];
  suggestedEdgeIds?: string[];
  anchorDistance?: number | null;
  anchorOnVein?: [number, number];
  anchorRule?: string;
  review?: string;
  onThinLine?: boolean;
};
/** Where a raster tracing came from (public-domain book figures, v0.51). */
export type PlateProvenance = {
  genusAsPrinted: string;
  familyAsPrinted: string;
  modernFamily: string;
  familyBasis: string;
  figure: string;
  pdfPage: number;
  archiveId: string;
  pdf: string;
  mirrored: boolean;
  /** Naming system of the lettering printed on the figure, if any (not transcribed). */
  letteringSystem?: string | null;
  quality: "good" | "fair" | string;
  notes: string[];
};
/** "vector-plate": lines taken from the author's own SVG; "raster-tracing": centre lines traced from a scanned print. */
export type PlateKind = "vector-plate" | "raster-tracing";
export type PlateVectors = {
  schema: "entowing-plate-vectors/1.0";
  referenceId: string;
  family: string;
  plateTitle: string;
  kind?: PlateKind;
  /** The printed figure carries vein lettering that is visible in the scan but was not transcribed. */
  printedLettering?: boolean;
  provenance?: PlateProvenance;
  source: { page: string; author: string; credit: string; license: string; licenseUrl: string; file: string };
  derivative: { note: string; license: string; attribution: string; generatedOn: string; precision: string };
  terminology: string;
  box: { x: number; y: number; width: number; height: number };
  edges: PlateEdge[];
  nodes: { id: string; x: number; y: number; degree: number }[];
  faintLines: { id: string; points: [number, number][] }[];
  leaders: { points: [number, number][] }[];
  labels: PlateLabel[];
};
export type PlateIndexEntry = { referenceId: string; family: string; plateTitle: string; labels: number; veinLabels: number; flagged: number; edges: number; kind?: PlateKind; source?: string; quality?: string; printedLettering?: boolean };

export function plateKind(plate: { kind?: string } | null | undefined): PlateKind {
  return plate?.kind === "raster-tracing" ? "raster-tracing" : "vector-plate";
}

/** Group the review index: labelled vector plates first, then tracings by source book. */
export function groupPlateIndex(entries: PlateIndexEntry[]) {
  const groups = new Map<string, PlateIndexEntry[]>();
  for (const entry of entries) {
    const key = plateKind(entry) === "vector-plate" ? "Labelled vector plates" : `Traced from ${entry.source ?? "a public-domain book"}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return [...groups.entries()].map(([title, plates]) => ({ title, plates: [...plates].sort((a, b) => a.family.localeCompare(b.family) || a.plateTitle.localeCompare(b.plateTitle)) }));
}

export type LabelStatus = "unreviewed" | "confirmed" | "corrected" | "rejected";
export type LabelReview = { status: LabelStatus; edgeIds: string[]; note: string };
export type UserLabel = { id: string; text: string; edgeIds: string[]; note: string };
export type PlateReview = {
  schema: "entowing-plate-review/1.0";
  referenceId: string;
  reviewer: string;
  updatedAt: string;
  labels: Record<string, LabelReview>;
  userLabels: UserLabel[];
};

export const REVIEW_STORAGE_PREFIX = "entowing-plate-review-v1:";

/*
 * Older (McAlpine 1981-style) names and their counterparts in the system of
 * Cumming & Wood (2017), which van Steenis et al. (2023) adopt for Syrphidae.
 * Shown only as a hint for plates that use older-only names; never applied automatically.
 */
export const LEGACY_TO_MODERN: Record<string, string> = {
  CuA1: "M4",
  CuA2: "CuA",
  A1: "CuP",
  A2: "A1",
  "dm-cu": "dm-m",
  "bm-cu": "m-cu",
};
const LEGACY_ONLY = new Set(["CuA1", "CuA2", "dm-cu", "bm-cu", "A2"]);

export function plateUsesOlderNames(labels: Pick<PlateLabel, "text">[]) {
  return labels.some((label) => LEGACY_ONLY.has(label.text));
}

export function modernHint(text: string, olderSystem: boolean) {
  return olderSystem ? LEGACY_TO_MODERN[text] ?? null : null;
}

export function systemOf(text: string): "C" | "Sc" | "R" | "M" | "Cu" | "A" | "cross" | "other" {
  if (text === "C") return "C";
  if (text === "Sc") return "Sc";
  if (/^(h|[a-z]+-[a-z]+)$/.test(text)) return "cross";
  if (/^R/.test(text)) return "R";
  if (/^M/.test(text)) return "M";
  if (/^Cu/.test(text)) return "Cu";
  if (/^A/.test(text)) return "A";
  return "other";
}

export const SYSTEM_COLOUR: Record<ReturnType<typeof systemOf>, string> = {
  C: "#c98a10",
  Sc: "#2f8c99",
  R: "#c8452f",
  M: "#6a52b8",
  Cu: "#3f8a3f",
  A: "#3d6fa6",
  cross: "#d9661c",
  other: "#7a7a7a",
};

export function emptyReview(referenceId: string): PlateReview {
  return { schema: "entowing-plate-review/1.0", referenceId, reviewer: "", updatedAt: new Date(0).toISOString(), labels: {}, userLabels: [] };
}

/** Accept only well-formed review data (from storage or an imported file). */
export function sanitizeReview(value: unknown, plate: Pick<PlateVectors, "referenceId" | "edges" | "labels">): PlateReview {
  const base = emptyReview(plate.referenceId);
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<PlateReview>;
  const edgeIds = new Set(plate.edges.map((edge) => edge.id));
  const labelIds = new Set(plate.labels.map((label) => label.id));
  const cleanEdges = (list: unknown) => (Array.isArray(list) ? [...new Set(list.filter((id): id is string => typeof id === "string" && edgeIds.has(id)))] : []);
  const statuses = new Set<LabelStatus>(["unreviewed", "confirmed", "corrected", "rejected"]);
  if (raw.labels && typeof raw.labels === "object") {
    for (const [id, entry] of Object.entries(raw.labels)) {
      if (!labelIds.has(id) || !entry || typeof entry !== "object") continue;
      const status = statuses.has((entry as LabelReview).status) ? (entry as LabelReview).status : "unreviewed";
      base.labels[id] = { status, edgeIds: cleanEdges((entry as LabelReview).edgeIds), note: typeof (entry as LabelReview).note === "string" ? (entry as LabelReview).note.slice(0, 1000) : "" };
    }
  }
  if (Array.isArray(raw.userLabels)) {
    base.userLabels = raw.userLabels.flatMap((entry, index) => {
      if (!entry || typeof entry !== "object" || typeof entry.text !== "string" || !entry.text.trim()) return [];
      return [{ id: typeof entry.id === "string" ? entry.id : `u${index + 1}`, text: entry.text.trim().slice(0, 40), edgeIds: cleanEdges(entry.edgeIds), note: typeof entry.note === "string" ? entry.note.slice(0, 1000) : "" }];
    });
  }
  base.reviewer = typeof raw.reviewer === "string" ? raw.reviewer.slice(0, 120) : "";
  base.updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : base.updatedAt;
  return base;
}

/** Edges currently assigned to a label: the reviewer's choice once made, otherwise the leader-anchored edge. */
export function effectiveEdges(label: PlateLabel, review?: LabelReview) {
  if (review && review.status !== "unreviewed") return review.status === "rejected" ? [] : review.edgeIds;
  return label.edgeIds ?? [];
}

export function reviewProgress(plate: Pick<PlateVectors, "labels">, review: PlateReview) {
  const reviewable = plate.labels.filter((label) => label.kind === "vein" || label.kind === "crossvein" || label.kind === "landmark");
  const done = reviewable.filter((label) => (review.labels[label.id]?.status ?? "unreviewed") !== "unreviewed").length;
  return { done, total: reviewable.length, complete: reviewable.length > 0 && done === reviewable.length };
}

export function pointsToPath(points: [number, number][]) {
  return points.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`).join(" ");
}

/* ---------- v0.52 · reviewed names leave the review page ---------- */

export const PUBLISHED_REVIEW_INDEX = "/plate-reviews/index.json";
export type PublishedReviewEntry = { referenceId: string; reviewer: string; updatedAt: string; names: number };

/** Every name the reviewer accepted, with the line pieces it covers (printed names first, then the reviewer's own). */
export function reviewedNames(plate: Pick<PlateVectors, "labels" | "edges">, review: PlateReview) {
  const names: { id: string; text: string; edgeIds: string[]; source: "printed" | "reviewer"; status: LabelStatus | "user" }[] = [];
  for (const label of plate.labels) {
    const entry = review.labels[label.id];
    if (!entry || (entry.status !== "confirmed" && entry.status !== "corrected")) continue;
    if (!entry.edgeIds.length) continue;
    names.push({ id: label.id, text: label.text, edgeIds: entry.edgeIds, source: "printed", status: entry.status });
  }
  for (const label of review.userLabels) {
    if (label.edgeIds.length) names.push({ id: label.id, text: label.text, edgeIds: label.edgeIds, source: "reviewer", status: "user" });
  }
  return names;
}

/** Join line pieces into as few ordered chains as possible (shared end points). */
export function chainEdges(edges: Pick<PlateEdge, "id" | "from" | "to" | "points">[]) {
  const remaining = [...edges];
  const chains: [number, number][][] = [];
  while (remaining.length) {
    const first = remaining.shift()!;
    let chain = [...first.points];
    let head = first.from;
    let tail = first.to;
    let grew = true;
    while (grew) {
      grew = false;
      for (let index = 0; index < remaining.length; index += 1) {
        const edge = remaining[index];
        if (edge.from === tail) { chain = [...chain, ...edge.points.slice(1)]; tail = edge.to; }
        else if (edge.to === tail) { chain = [...chain, ...[...edge.points].reverse().slice(1)]; tail = edge.from; }
        else if (edge.to === head) { chain = [...edge.points.slice(0, -1), ...chain]; head = edge.from; }
        else if (edge.from === head) { chain = [...[...edge.points].reverse().slice(0, -1), ...chain]; head = edge.to; }
        else continue;
        remaining.splice(index, 1);
        grew = true;
        break;
      }
    }
    chains.push(chain);
  }
  return chains;
}

/** Thin a dense polyline to at most `limit` points, keeping both ends. */
function thinPoints(points: [number, number][], limit = 14) {
  if (points.length <= limit) return points;
  const step = (points.length - 1) / (limit - 1);
  return Array.from({ length: limit }, (_, index) => points[Math.round(index * step)]);
}

/**
 * Reviewed names as a Wing Mapper map ({ name: points }) in plate coordinates.
 * A name whose pieces do not join becomes "name", "name·2", … (the Mapper's own duplicate convention).
 */
export function reviewToVeinMap(plate: Pick<PlateVectors, "labels" | "edges" | "box">, review: PlateReview) {
  const byId = new Map(plate.edges.map((edge) => [edge.id, edge]));
  const map: Record<string, { x: number; y: number }[]> = {};
  for (const name of reviewedNames(plate, review)) {
    const edges = name.edgeIds.map((id) => byId.get(id)).filter((edge): edge is PlateEdge => Boolean(edge));
    chainEdges(edges).forEach((chain, index) => {
      let key = index ? `${name.text}·${index + 1}` : name.text;
      let suffix = index + 1;
      while (map[key]) { suffix += 1; key = `${name.text}·${suffix}`; }
      map[key] = thinPoints(chain).map(([x, y]) => ({ x: x - plate.box.x, y: y - plate.box.y }));
    });
  }
  return map;
}
