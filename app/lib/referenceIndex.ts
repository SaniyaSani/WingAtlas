import manifest from "../family-wing-references.generated.json";
import curation from "../reference-curation.json";
import { buildReferenceIndex, type CurationOverlay, type RawWingReference, type WingReferenceRecord } from "./referenceModel";

/** All references (local and remote), normalized once per bundle. */
export const REFERENCE_RECORDS: WingReferenceRecord[] = buildReferenceIndex(
  manifest as Record<string, RawWingReference>,
  curation as unknown as CurationOverlay,
);

export const REFERENCE_BY_ID = new Map(REFERENCE_RECORDS.map((record) => [record.id, record]));

/** Plates stored under public/reference-wings — the only ones Compare and the ID Lab can analyse. */
export const LOCAL_REFERENCE_RECORDS = REFERENCE_RECORDS.filter((record) => record.asset.local);

/** Family-level ids (manifest keys equal to a family id) that own at least one local plate. */
export function localPlatesForFamily(family: string) {
  const key = family.toLowerCase();
  return LOCAL_REFERENCE_RECORDS.filter((record) => record.family.toLowerCase() === key);
}

export function primaryLocalPlateId(familyId: string): string | null {
  const direct = REFERENCE_BY_ID.get(familyId);
  if (direct?.asset.local) return direct.id;
  const family = direct?.family ?? familyId;
  return localPlatesForFamily(family)[0]?.id ?? null;
}
