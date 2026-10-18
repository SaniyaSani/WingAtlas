/*
 * Second Atlas filter: what kind of plate a family has, and whether anyone has checked
 * its vein names. Pure module (no DOM, only type imports) so it can be unit-tested.
 */
import type { PlateIndexEntry } from "./plateVectors";

export type SourceFilter = "any" | "published" | "tracing" | "good" | "named";

export const SOURCE_FILTER_LABEL: Record<SourceFilter, string> = {
  any: "Any source",
  published: "Author's plate",
  tracing: "Book tracing",
  good: "Good tracing",
  named: "Checked names",
};

export const SOURCE_FILTER_HINT: Record<SourceFilter, string> = {
  any: "every kind of plate",
  published: "a plate drawn and published by its author (e.g. the Wikimedia Commons wing-vein series)",
  tracing: "an EntoWing tracing of a public-domain book figure",
  good: "a book tracing rated “good” (no known gaps)",
  named: "a plate whose vein names were checked on the Vein review page (in this browser or published)",
};

export type FamilyPlateFacts = { published: boolean; tracing: boolean; good: boolean; named: boolean };

type ReferenceLike = { id: string; family: string; author: string };

export function isTracingAuthor(author: string) {
  return /entowing (vector )?trac/i.test(author);
}

/** Facts per family (lower-case family name). */
export function familyPlateFacts(references: ReferenceLike[], plates: PlateIndexEntry[], namedIds: Set<string>) {
  const quality = new Map(plates.map((plate) => [plate.referenceId, plate.quality ?? null]));
  const facts = new Map<string, FamilyPlateFacts>();
  for (const reference of references) {
    const key = reference.family.toLowerCase();
    const current = facts.get(key) ?? { published: false, tracing: false, good: false, named: false };
    const tracing = isTracingAuthor(reference.author);
    if (tracing) current.tracing = true;
    else current.published = true;
    if (tracing && quality.get(reference.id) === "good") current.good = true;
    if (namedIds.has(reference.id)) current.named = true;
    facts.set(key, current);
  }
  return facts;
}

export function matchesSourceFilter(facts: FamilyPlateFacts | undefined, filter: SourceFilter) {
  if (filter === "any") return true;
  return Boolean(facts?.[filter]);
}

/** A stored review (raw JSON) counts as "named" when at least one name is attached to at least one line. */
export function storedReviewHasNames(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const raw = value as { labels?: Record<string, { status?: string; edgeIds?: unknown[] }>; userLabels?: { edgeIds?: unknown[] }[] };
  const printed = Object.values(raw.labels ?? {}).some((entry) => (entry?.status === "confirmed" || entry?.status === "corrected") && Array.isArray(entry.edgeIds) && entry.edgeIds.length > 0);
  const own = (raw.userLabels ?? []).some((entry) => Array.isArray(entry?.edgeIds) && entry.edgeIds.length > 0);
  return printed || own;
}
