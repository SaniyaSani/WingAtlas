/*
 * Validation and migration for imported EntoWing files.
 *
 * Accepted inputs (all remain importable):
 *  - entowing-template/1.0   · reusable topology (nodes + paths + optional veins)
 *  - entowing-wing-map/0.2   · older per-vein point maps exported by "Export map"
 *  - any object with a `veins` array of `{ id, points[] }` (pre-schema maps)
 *
 * The parser never throws on content problems it can repair; it reports them
 * so the Mapper can show the user exactly what changed during import.
 */

import type { CurveControl, CurveHandle, Point, TemplatePath, VeinDefinition, WingTemplate } from "./wingTypes";

export const MAX_IMPORT_NODES = 5000;
export const MAX_IMPORT_PATHS = 400;

/** Pre-2023 names that EntoWing migrates on import. */
const VEIN_ID_MIGRATIONS: Record<string, string> = { Cu1: "m-cu" };

export type TemplateImportResult =
  | {
      ok: true;
      format: "template" | "legacy-map";
      template: Omit<WingTemplate, "id">;
      customVeins: VeinDefinition[];
      warnings: string[];
      nomenclature: NomenclatureReport;
    }
  | { ok: false; error: string };

export type NomenclatureReport = {
  legacyTerms: string[];
  modernTerms: string[];
  mixed: boolean;
  message: string | null;
};

/*
 * Terms that only occur in one system. A1 and CuA are deliberately excluded:
 * they exist in both systems with different meanings, so their presence alone
 * says nothing about which system a file uses.
 */
const LEGACY_ONLY_TERMS = new Set(["CuA1", "CuA2", "dm-cu", "bm-cu", "A2", "Cu1"]);
const MODERN_ONLY_TERMS = new Set(["M4", "CuP", "dm-m"]);

function baseTerm(id: string) {
  // "CuA1·2" (duplicate label from SVG mapping) → "CuA1"; "M4-2" (dedup suffix) → "M4"
  const withoutDot = id.replace(/·\d+$/, "");
  const suffixed = withoutDot.match(/^(.*)-(\d+)$/);
  if (suffixed && (LEGACY_ONLY_TERMS.has(suffixed[1]) || MODERN_ONLY_TERMS.has(suffixed[1]))) return suffixed[1];
  return withoutDot;
}

export function detectNomenclature(veinIds: Iterable<string>): NomenclatureReport {
  const legacy = new Set<string>();
  const modern = new Set<string>();
  for (const raw of veinIds) {
    const id = baseTerm(String(raw));
    if (LEGACY_ONLY_TERMS.has(id)) legacy.add(id);
    if (MODERN_ONLY_TERMS.has(id)) modern.add(id);
  }
  const legacyTerms = [...legacy].sort();
  const modernTerms = [...modern].sort();
  const mixed = legacyTerms.length > 0 && modernTerms.length > 0;
  return {
    legacyTerms,
    modernTerms,
    mixed,
    message: mixed
      ? `Possible mixed nomenclature: older-system names (${legacyTerms.join(", ")}) appear together with modern-system names (${modernTerms.join(", ")}). The same structure may carry different names in each system — choose one system before interpreting homology.`
      : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finitePoint(value: unknown): Point | null {
  if (!isRecord(value)) return null;
  const x = Number(value.x);
  const y = Number(value.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function readHandle(handle: unknown): CurveHandle | undefined {
  if (!isRecord(handle)) return undefined;
  const dx = Number(handle.dx);
  const dy = Number(handle.dy);
  return Number.isFinite(dx) && Number.isFinite(dy) ? { dx, dy } : undefined;
}

export function readCurveControls(value: unknown, allowedNodeIds: string[]) {
  if (!isRecord(value)) return undefined;
  const allowed = new Set(allowedNodeIds);
  const result: Record<string, CurveControl> = {};
  Object.entries(value).forEach(([nodeId, raw]) => {
    if (!allowed.has(nodeId) || !isRecord(raw)) return;
    if (raw.mode !== "smooth" && raw.mode !== "corner" && raw.mode !== "bezier") return;
    result[nodeId] = { mode: raw.mode, in: readHandle(raw.in), out: readHandle(raw.out) };
  });
  return Object.keys(result).length ? result : undefined;
}

const HEX_COLOR = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;

function importedVein(raw: Record<string, unknown>, id: string, origin: string): VeinDefinition {
  const string = (key: string) => (typeof raw[key] === "string" && String(raw[key]).trim() ? String(raw[key]).trim() : "");
  const color = string("color");
  return {
    id,
    label: string("label") || id,
    fullName: string("fullName") || "Imported custom structure",
    symbolMeaning: string("symbolMeaning") || `${id} · imported label`,
    plainMeaning: string("plainMeaning") || `custom structure imported from ${origin}`,
    group: string("group") || "custom",
    color: HEX_COLOR.test(color) ? color : "#7b6f5d",
    note: string("note") || `Imported from ${origin}; verify terminology against its source.`,
  };
}

function uniqueVeinId(id: string, used: Set<string>, warnings: string[]) {
  if (!used.has(id)) {
    used.add(id);
    return id;
  }
  let suffix = 2;
  while (used.has(`${id}-${suffix}`)) suffix += 1;
  const next = `${id}-${suffix}`;
  used.add(next);
  warnings.push(`Duplicate vein id “${id}” renamed to “${next}” so both paths stay editable.`);
  return next;
}

function migrateVeinId(id: string, migrated: Set<string>) {
  const next = VEIN_ID_MIGRATIONS[id];
  if (!next) return id;
  migrated.add(`${id} → ${next}`);
  return next;
}

export function parseTemplatePayload(payload: unknown, options: { presetIds: Iterable<string>; fileName: string }): TemplateImportResult {
  if (!isRecord(payload)) return { ok: false, error: "This file is not an EntoWing JSON object." };
  const presetIds = new Set(options.presetIds);
  const warnings: string[] = [];
  const migrated = new Set<string>();
  const usedVeinIds = new Set<string>();
  const customVeins = new Map<string, VeinDefinition>();
  const baseName = options.fileName.replace(/\.entowing-template\.json$|\.entowing\.json$|\.json$/i, "") || "Imported template";

  const schema = typeof payload.schema === "string" ? payload.schema : "";
  const looksLikeTemplate = isRecord(payload.nodes) && Array.isArray(payload.paths);

  if (looksLikeTemplate) {
    if (schema && schema !== "entowing-template/1.0") {
      if (!schema.startsWith("entowing-template/")) return { ok: false, error: `Unsupported schema “${schema}”.` };
      warnings.push(`Schema ${schema} is newer or older than this Mapper (entowing-template/1.0); fields it does not know were ignored.`);
    }
    if (!schema) warnings.push("The file has no schema field; it was read as entowing-template/1.0.");

    const rawNodes = Object.entries(payload.nodes as Record<string, unknown>);
    if (rawNodes.length > MAX_IMPORT_NODES) return { ok: false, error: `Too many nodes (${rawNodes.length}); the limit is ${MAX_IMPORT_NODES}.` };
    const nodes: Record<string, Point> = {};
    let droppedNodes = 0;
    rawNodes.forEach(([id, raw]) => {
      const point = finitePoint(raw);
      if (point) nodes[id] = point;
      else droppedNodes += 1;
    });
    if (droppedNodes) warnings.push(`${droppedNodes} node${droppedNodes === 1 ? "" : "s"} with missing or non-numeric coordinates were skipped.`);

    const rawPaths = payload.paths as unknown[];
    if (rawPaths.length > MAX_IMPORT_PATHS) return { ok: false, error: `Too many paths (${rawPaths.length}); the limit is ${MAX_IMPORT_PATHS}.` };
    let danglingReferences = 0;
    let droppedPaths = 0;
    const paths: TemplatePath[] = [];
    rawPaths.forEach((rawPath) => {
      if (!isRecord(rawPath) || typeof rawPath.veinId !== "string" || !rawPath.veinId.trim() || !Array.isArray(rawPath.nodeIds)) {
        droppedPaths += 1;
        return;
      }
      const ids = rawPath.nodeIds.filter((id): id is string => typeof id === "string");
      const existing = ids.filter((id) => nodes[id]);
      danglingReferences += ids.length - existing.length;
      const nodeIds = existing.filter((id, index) => index === 0 || id !== existing[index - 1]);
      if (nodeIds.length < 2) {
        droppedPaths += 1;
        return;
      }
      const veinId = uniqueVeinId(migrateVeinId(rawPath.veinId.trim(), migrated), usedVeinIds, warnings);
      paths.push({ veinId, nodeIds, curve: readCurveControls(rawPath.curve, nodeIds) });
    });
    if (danglingReferences) warnings.push(`${danglingReferences} path reference${danglingReferences === 1 ? "" : "s"} pointed to missing nodes and were removed.`);
    if (droppedPaths) warnings.push(`${droppedPaths} path${droppedPaths === 1 ? "" : "s"} had fewer than two valid points and were skipped.`);
    if (!paths.length) return { ok: false, error: "This EntoWing template does not contain reusable vein paths." };

    const usedNodeIds = new Set(paths.flatMap((path) => path.nodeIds));
    const orphanNodes = Object.keys(nodes).filter((id) => !usedNodeIds.has(id));
    orphanNodes.forEach((id) => delete nodes[id]);
    if (orphanNodes.length) warnings.push(`${orphanNodes.length} unused node${orphanNodes.length === 1 ? "" : "s"} removed.`);

    const sourceImage = isRecord(payload.sourceImage) ? payload.sourceImage : null;
    const width = Number(sourceImage?.width);
    const height = Number(sourceImage?.height);
    const referenceSize = width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height) ? { width, height } : undefined;
    if (referenceSize) {
      const outside = Object.values(nodes).filter((point) => point.x < -referenceSize.width * .25 || point.x > referenceSize.width * 1.25 || point.y < -referenceSize.height * .25 || point.y > referenceSize.height * 1.25).length;
      if (outside) warnings.push(`${outside} node${outside === 1 ? " lies" : "s lie"} far outside the recorded source image (${referenceSize.width} × ${referenceSize.height}); check that the file belongs to this photograph size.`);
    } else {
      warnings.push("No source image size recorded; the template will be fitted to its own bounding box.");
    }

    const veinList = Array.isArray(payload.veins) ? payload.veins : [];
    const usedPathIds = new Set(paths.map((path) => path.veinId));
    veinList.forEach((raw) => {
      if (!isRecord(raw) || typeof raw.id !== "string") return;
      const id = migrateVeinId(raw.id, migrated);
      if (raw.id === "Cu1" || presetIds.has(id) || customVeins.has(id) || !usedPathIds.has(id)) return;
      customVeins.set(id, importedVein(raw, id, "a user-reviewed EntoWing template"));
    });
    paths.forEach((path) => {
      if (!presetIds.has(path.veinId) && !customVeins.has(path.veinId)) {
        customVeins.set(path.veinId, importedVein({}, path.veinId, "an EntoWing template without a definition for this label"));
      }
    });

    if (migrated.size) warnings.push(`Migrated older vein ids: ${[...migrated].join(", ")}.`);
    const nomenclature = detectNomenclature(paths.map((path) => path.veinId));
    if (nomenclature.message) warnings.push(nomenclature.message);

    return {
      ok: true,
      format: "template",
      template: {
        name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : baseName,
        taxon: typeof payload.taxon === "string" && payload.taxon.trim() ? payload.taxon.trim() : "User-supplied EntoWing template",
        note: typeof payload.note === "string" && payload.note.trim() ? payload.note.trim() : "Portable reviewed template. Shared junctions and editable control points are preserved.",
        referenceSize,
        nodes,
        paths,
      },
      customVeins: [...customVeins.values()],
      warnings,
      nomenclature,
    };
  }

  if (!Array.isArray(payload.veins) || !payload.veins.length) return { ok: false, error: "This JSON does not contain EntoWing vein paths." };
  const nodes: Record<string, Point> = {};
  const paths: TemplatePath[] = [];
  let droppedPoints = 0;
  let droppedVeins = 0;
  payload.veins.forEach((raw, veinIndex) => {
    if (!isRecord(raw) || typeof raw.id !== "string" || !raw.id.trim() || !Array.isArray(raw.points)) {
      droppedVeins += 1;
      return;
    }
    const points = raw.points.map(finitePoint);
    droppedPoints += points.filter((point) => !point).length;
    const valid = points.filter((point): point is Point => Boolean(point));
    if (valid.length < 2) {
      droppedVeins += 1;
      return;
    }
    const nodeIds = valid.map((point, pointIndex) => {
      const nodeId = `import-${veinIndex}-${pointIndex}`;
      nodes[nodeId] = point;
      return nodeId;
    });
    const veinId = uniqueVeinId(migrateVeinId(raw.id.trim(), migrated), usedVeinIds, warnings);
    paths.push({ veinId, nodeIds });
    if (!presetIds.has(veinId) && !customVeins.has(veinId)) customVeins.set(veinId, importedVein(raw, veinId, "a previous EntoWing map"));
  });
  if (droppedPoints) warnings.push(`${droppedPoints} point${droppedPoints === 1 ? "" : "s"} with non-numeric coordinates were skipped.`);
  if (droppedVeins) warnings.push(`${droppedVeins} vein${droppedVeins === 1 ? "" : "s"} had fewer than two valid points and were skipped.`);
  if (!paths.length) return { ok: false, error: "No reusable vein paths were found in this map." };
  if (migrated.size) warnings.push(`Migrated older vein ids: ${[...migrated].join(", ")}.`);
  const nomenclature = detectNomenclature(paths.map((path) => path.veinId));
  if (nomenclature.message) warnings.push(nomenclature.message);
  // v0.47 behaviour is kept on purpose: legacy maps are fitted to their own
  // bounding box (no referenceSize), so re-imported maps land where they used to.
  return {
    ok: true,
    format: "legacy-map",
    template: {
      name: baseName,
      taxon: "Your reusable EntoWing map",
      note: "Imported from a previous annotation. Its labels and homologies are preserved as user-supplied data.",
      nodes,
      paths,
    },
    customVeins: [...customVeins.values()],
    warnings,
    nomenclature,
  };
}
