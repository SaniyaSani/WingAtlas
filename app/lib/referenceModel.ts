/*
 * EntoWing reference data model · entowing-reference/1.0
 *
 * The generated manifest (family-wing-references.generated.json) stays the
 * backwards-compatible source of truth. This module derives a stricter record
 * from it without guessing: every field records where its value came from, and
 * anything that is not present in the manifest or in the explicit curation
 * overlay is reported as "unknown".
 *
 * Pure module: no JSON imports and no DOM access, so it can be unit-tested with
 * `node --test` directly.
 */

export const UNKNOWN = "unknown" as const;
export type Unknown = typeof UNKNOWN;
export type Known<T extends string = string> = T | Unknown;

/** Shape of one entry in app/family-wing-references.generated.json (v0.47 and earlier). */
export type RawWingReference = {
  family: string;
  title: string;
  taxon?: string;
  rank?: string;
  assetPath: string;
  classifierAssetPath?: string;
  sourcePage: string;
  originalUrl: string;
  author: string;
  credit: string;
  license: string;
  licenseUrl: string;
  width: number;
  height: number;
  localAsset: boolean;
  referenceOnly: boolean;
};

export type ImageType = "photograph" | "illustration" | "tracing" | "reconstruction" | Unknown;
export type ReferenceStatus = "published-figure" | "derived-tracing" | "user-reviewed-tracing" | Unknown;
export type ReviewStatus = "not-recorded" | "user-reviewed" | "expert-reviewed";
export type FieldBasis = "manifest" | "curation" | "rule" | "unknown";

export type ReferenceOrientation = {
  baseSide: "left" | "right" | Unknown;
  anteriorEdge: "top" | "bottom" | Unknown;
};

export type WingReferenceRecord = {
  schema: "entowing-reference/1.0";
  id: string;
  family: string;
  taxon: Known;
  taxonomicRank: Known;
  morphotype: Known;
  /** Voucher / specimen information. None of the current plates carries one. */
  specimen: Known;
  referenceStatus: ReferenceStatus;
  imageType: ImageType;
  plateTitle: string;
  source: { page: string; originalUrl: string };
  author: Known;
  credit: Known;
  license: { name: Known; url: Known };
  terminologySystem: Known;
  orientation: ReferenceOrientation;
  scaleKnown: boolean | Unknown;
  review: { status: ReviewStatus; reviewer: Known; lastChecked: Known };
  publication: { doi: Known; url: Known };
  notes: string[];
  asset: { path: string; local: boolean; width: number; height: number; classifierPath?: string };
  /** Where each scientific field came from. */
  basis: Record<CuratableField, FieldBasis>;
};

export type CuratableField =
  | "taxon"
  | "taxonomicRank"
  | "morphotype"
  | "specimen"
  | "referenceStatus"
  | "imageType"
  | "author"
  | "license"
  | "terminologySystem"
  | "orientation"
  | "scaleKnown"
  | "review"
  | "publication";

/** One curated entry. Every value must carry a written basis; nothing is inferred. */
export type CurationEntry = Partial<{
  taxon: string;
  taxonomicRank: string;
  morphotype: string;
  specimen: string;
  referenceStatus: Exclude<ReferenceStatus, Unknown>;
  imageType: Exclude<ImageType, Unknown>;
  terminologySystem: string;
  orientation: Partial<ReferenceOrientation>;
  scaleKnown: boolean;
  review: Partial<{ status: ReviewStatus; reviewer: string; lastChecked: string }>;
  publication: Partial<{ doi: string; url: string }>;
  notes: string[];
}> & { basis: string };

export type CurationOverlay = {
  schema: "entowing-reference-curation/1.0";
  entries: Record<string, CurationEntry>;
};

const CURATABLE_FIELDS: CuratableField[] = [
  "taxon",
  "taxonomicRank",
  "morphotype",
  "specimen",
  "referenceStatus",
  "imageType",
  "author",
  "license",
  "terminologySystem",
  "orientation",
  "scaleKnown",
  "review",
  "publication",
];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function knownOr(value: unknown): Known {
  const trimmed = text(value);
  return trimmed ? trimmed : UNKNOWN;
}

export function isUnknown(value: unknown): boolean {
  return value === UNKNOWN || value === undefined || value === null || value === "";
}

/** "species-level reference" → "species". Only exact rank words are accepted. */
export function rankFromManifest(rank: string | undefined): Known {
  const value = text(rank).toLowerCase();
  const match = value.match(/\b(species|genus|subgenus|tribe|subfamily|family)\b-level/);
  return match ? match[1] : UNKNOWN;
}

function fileExtension(path: string) {
  const clean = path.split(/[?#]/)[0];
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

/**
 * Rule-based facts that follow directly from the manifest text.
 * They are labelled "rule" so the interface can show that they were not curated.
 */
function ruleImageType(raw: RawWingReference): ImageType {
  // Only the author field decides "tracing": a credit such as "· EntoWing
  // neutral classifier trace" describes the separate classifier mask, not the
  // displayed plate.
  const author = raw.author.toLowerCase();
  if (/entowing/.test(author) && /trac/.test(author)) return "tracing";
  // An SVG drawn by an author is a vector drawing. Raster figures (PNG/JPG)
  // can be photographs or drawings, so they stay unknown.
  if (fileExtension(raw.title) === "svg" || fileExtension(raw.assetPath) === "svg") return "illustration";
  return UNKNOWN;
}

function ruleReferenceStatus(raw: RawWingReference): ReferenceStatus {
  const author = raw.author.toLowerCase();
  if (/user-reviewed/.test(`${author} ${(raw.rank ?? "").toLowerCase()}`)) return "user-reviewed-tracing";
  if (/entowing/.test(author) && /trac/.test(author)) return "derived-tracing";
  if (/commons\.wikimedia\.org/.test(raw.sourcePage) && /own work|figure/i.test(raw.credit)) return "published-figure";
  return UNKNOWN;
}

function ruleMorphotype(raw: RawWingReference): Known {
  const taxon = text(raw.taxon);
  return /morphotype/i.test(taxon) ? taxon : UNKNOWN;
}

export function normalizeReference(id: string, raw: RawWingReference, curation?: CurationEntry): WingReferenceRecord {
  const basis = Object.fromEntries(CURATABLE_FIELDS.map((field) => [field, "unknown"])) as Record<CuratableField, FieldBasis>;

  const taxon = curation?.taxon ? (basis.taxon = "curation", curation.taxon) : raw.taxon ? (basis.taxon = "manifest", knownOr(raw.taxon)) : UNKNOWN;

  const manifestRank = rankFromManifest(raw.rank);
  const taxonomicRank = curation?.taxonomicRank
    ? (basis.taxonomicRank = "curation", curation.taxonomicRank)
    : manifestRank !== UNKNOWN ? (basis.taxonomicRank = "manifest", manifestRank) : UNKNOWN;

  const ruleMorph = ruleMorphotype(raw);
  const morphotype = curation?.morphotype
    ? (basis.morphotype = "curation", curation.morphotype)
    : ruleMorph !== UNKNOWN ? (basis.morphotype = "manifest", ruleMorph) : UNKNOWN;

  const specimen = curation?.specimen ? (basis.specimen = "curation", curation.specimen) : UNKNOWN;

  const ruleStatus = ruleReferenceStatus(raw);
  const referenceStatus = curation?.referenceStatus
    ? (basis.referenceStatus = "curation", curation.referenceStatus)
    : ruleStatus !== UNKNOWN ? (basis.referenceStatus = "rule", ruleStatus) : UNKNOWN;

  const ruleType = ruleImageType(raw);
  const imageType = curation?.imageType
    ? (basis.imageType = "curation", curation.imageType)
    : ruleType !== UNKNOWN ? (basis.imageType = "rule", ruleType) : UNKNOWN;

  const author = knownOr(raw.author);
  if (author !== UNKNOWN) basis.author = "manifest";
  const licenseName = knownOr(raw.license);
  const licenseUrl = knownOr(raw.licenseUrl);
  if (licenseName !== UNKNOWN) basis.license = "manifest";

  const terminologySystem = curation?.terminologySystem ? (basis.terminologySystem = "curation", curation.terminologySystem) : UNKNOWN;

  const orientation: ReferenceOrientation = {
    baseSide: curation?.orientation?.baseSide ?? UNKNOWN,
    anteriorEdge: curation?.orientation?.anteriorEdge ?? UNKNOWN,
  };
  if (curation?.orientation) basis.orientation = "curation";

  const scaleKnown: boolean | Unknown = typeof curation?.scaleKnown === "boolean" ? (basis.scaleKnown = "curation", curation.scaleKnown) : UNKNOWN;

  const review = {
    status: (curation?.review?.status ?? (/user-reviewed/i.test(`${raw.rank ?? ""} ${raw.author}`) ? "user-reviewed" : "not-recorded")) as ReviewStatus,
    reviewer: knownOr(curation?.review?.reviewer),
    lastChecked: knownOr(curation?.review?.lastChecked),
  };
  basis.review = curation?.review ? "curation" : review.status === "user-reviewed" ? "manifest" : "unknown";

  const publication = { doi: knownOr(curation?.publication?.doi), url: knownOr(curation?.publication?.url) };
  if (curation?.publication) basis.publication = "curation";

  const notes = [
    ...(raw.rank ? [`Manifest rank note: ${raw.rank}`] : []),
    ...(curation?.notes ?? []),
    ...(curation ? [`Curation basis: ${curation.basis}`] : []),
  ];

  return {
    schema: "entowing-reference/1.0",
    id,
    family: text(raw.family),
    taxon,
    taxonomicRank,
    morphotype,
    specimen,
    referenceStatus,
    imageType,
    plateTitle: text(raw.title).replace(/\.(svg|png|jpe?g|webp)$/i, ""),
    source: { page: text(raw.sourcePage), originalUrl: text(raw.originalUrl) },
    author,
    credit: knownOr(raw.credit),
    license: { name: licenseName, url: licenseUrl },
    terminologySystem,
    orientation,
    scaleKnown,
    review,
    publication,
    notes,
    asset: {
      path: text(raw.assetPath),
      local: raw.localAsset === true && text(raw.assetPath).startsWith("/"),
      width: Number(raw.width) || 0,
      height: Number(raw.height) || 0,
      ...(raw.classifierAssetPath ? { classifierPath: raw.classifierAssetPath } : {}),
    },
    basis,
  };
}

export function buildReferenceIndex(manifest: Record<string, RawWingReference>, overlay?: CurationOverlay) {
  return Object.entries(manifest)
    .map(([id, raw]) => normalizeReference(id, raw, overlay?.entries[id]))
    .sort((a, b) => a.family.localeCompare(b.family) || a.id.localeCompare(b.id));
}

export type ReferenceIssue = { level: "error" | "warning"; field: string; message: string };

export function validateReferenceRecord(record: WingReferenceRecord): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];
  const error = (field: string, message: string) => issues.push({ level: "error", field, message });
  const warning = (field: string, message: string) => issues.push({ level: "warning", field, message });
  if (!record.family) error("family", "family name is missing");
  if (!record.plateTitle) error("plateTitle", "plate title is missing");
  if (!/^https:\/\//.test(record.source.page)) error("source.page", "source page must be an https URL");
  if (record.license.name === UNKNOWN) error("license", "license is missing");
  if (record.license.url !== UNKNOWN && !/^https:\/\//.test(record.license.url)) error("license.url", "license URL must be https");
  if (record.license.url === UNKNOWN && record.license.name !== UNKNOWN) warning("license.url", "license has no URL");
  if (record.author === UNKNOWN) warning("author", "author is unknown");
  if (!(record.asset.width > 0 && record.asset.height > 0)) error("asset", "image dimensions must be positive");
  if (record.asset.local && !record.asset.path.startsWith("/reference-wings/")) error("asset.path", "local plates must live under /reference-wings/");
  if (!record.asset.local && !/^https:\/\//.test(record.asset.path)) error("asset.path", "remote plates must use https");
  if (record.publication.doi !== UNKNOWN && !/^10\.\d{4,9}\/\S+$/.test(record.publication.doi)) error("publication.doi", "DOI must look like 10.xxxx/…");
  if (record.review.lastChecked !== UNKNOWN && Number.isNaN(Date.parse(record.review.lastChecked))) error("review.lastChecked", "last-checked date is not ISO-like");
  return issues;
}

/** Fields that describe scientific provenance. Used for an honest completeness readout. */
export function metadataCompleteness(record: WingReferenceRecord) {
  const checks: Array<[string, boolean]> = [
    ["taxon", record.taxon !== UNKNOWN],
    ["rank", record.taxonomicRank !== UNKNOWN],
    ["specimen", record.specimen !== UNKNOWN],
    ["image type", record.imageType !== UNKNOWN],
    ["author", record.author !== UNKNOWN],
    ["license", record.license.name !== UNKNOWN],
    ["terminology", record.terminologySystem !== UNKNOWN],
    ["orientation", record.orientation.baseSide !== UNKNOWN && record.orientation.anteriorEdge !== UNKNOWN],
    ["scale", record.scaleKnown !== UNKNOWN],
    ["reviewer", record.review.reviewer !== UNKNOWN],
    ["last checked", record.review.lastChecked !== UNKNOWN],
    ["publication", record.publication.doi !== UNKNOWN || record.publication.url !== UNKNOWN],
  ];
  return {
    known: checks.filter(([, known]) => known).length,
    total: checks.length,
    missing: checks.filter(([, known]) => !known).map(([label]) => label),
  };
}

export function referenceDisplayName(record: WingReferenceRecord) {
  return record.taxon !== UNKNOWN ? record.taxon : record.plateTitle;
}

function fold(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Ranked search over family, taxon, plate title and author. Empty query keeps the input order. */
export function searchReferences<T extends WingReferenceRecord>(records: T[], query: string): T[] {
  const needle = fold(query.trim());
  if (!needle) return records;
  const scored = records.flatMap((record) => {
    const family = fold(record.family);
    const taxon = fold(record.taxon === UNKNOWN ? "" : record.taxon);
    const title = fold(record.plateTitle);
    const author = fold(record.author === UNKNOWN ? "" : record.author);
    let score = -1;
    if (family === needle) score = 100;
    else if (family.startsWith(needle)) score = 80;
    else if (taxon.startsWith(needle)) score = 70;
    else if (title.startsWith(needle)) score = 60;
    else if (family.includes(needle)) score = 50;
    else if (taxon.includes(needle) || title.includes(needle)) score = 40;
    else if (author.includes(needle)) score = 20;
    return score < 0 ? [] : [{ record, score }];
  });
  return scored.sort((a, b) => b.score - a.score || a.record.family.localeCompare(b.record.family)).map((item) => item.record);
}

export const IMAGE_TYPE_LABEL: Record<string, string> = {
  photograph: "photograph",
  illustration: "illustration (vector drawing)",
  tracing: "tracing",
  reconstruction: "reconstruction",
  unknown: "unknown",
};

export const REFERENCE_STATUS_LABEL: Record<string, string> = {
  "published-figure": "published plate / figure",
  "derived-tracing": "EntoWing tracing of a published figure",
  "user-reviewed-tracing": "user-reviewed EntoWing tracing",
  unknown: "unknown",
};

export const BASIS_LABEL: Record<FieldBasis, string> = {
  manifest: "from source manifest",
  curation: "curated with written basis",
  rule: "derived by documented rule",
  unknown: "not recorded",
};
