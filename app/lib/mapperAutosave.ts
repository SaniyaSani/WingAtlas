/*
 * Browser autosave for Wing Mapper annotations.
 *
 * Only geometry and labels are stored — never the photograph itself — so the
 * draft stays small. A draft is matched to an image by file name and pixel
 * size; it is offered for restore when that image is loaded again.
 */

import type { Point, TemplatePath, VeinDefinition, WingTemplate } from "./wingTypes";

export const AUTOSAVE_SCHEMA = "entowing-mapper-autosave/1";
export const MAX_AUTOSAVE_ENTRIES = 6;

export type AutosaveEntry = {
  imageKey: string;
  imageName: string;
  width: number;
  height: number;
  savedAt: string;
  map: Record<string, Point[]>;
  draftHypotheses: Record<string, number>;
  customVeins: VeinDefinition[];
  placedTemplate: WingTemplate | null;
  templateNodes: Record<string, Point>;
  activeVeinId: string;
};

export type AutosaveStore = { schema: typeof AUTOSAVE_SCHEMA; entries: AutosaveEntry[] };

export function imageKey(image: { name: string; width: number; height: number }) {
  return `${image.name}|${Math.round(image.width)}x${Math.round(image.height)}`;
}

function finitePoint(value: unknown): Point | null {
  if (!value || typeof value !== "object") return null;
  const x = Number((value as Point).x);
  const y = Number((value as Point).y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function sanitizeMap(value: unknown): Record<string, Point[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([id, points]) => {
    if (!Array.isArray(points)) return [];
    const clean = points.map(finitePoint).filter((point): point is Point => Boolean(point));
    return clean.length ? [[id, clean]] : [];
  }));
}

function sanitizeNodes(value: unknown): Record<string, Point> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([id, raw]) => {
    const point = finitePoint(raw);
    return point ? [[id, point]] : [];
  }));
}

function sanitizeTemplate(value: unknown, nodes: Record<string, Point>): WingTemplate | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<WingTemplate>;
  if (typeof raw.id !== "string" || !Array.isArray(raw.paths)) return null;
  const paths: TemplatePath[] = raw.paths.flatMap((path) => {
    if (!path || typeof path.veinId !== "string" || !Array.isArray(path.nodeIds)) return [];
    const nodeIds = path.nodeIds.filter((id): id is string => typeof id === "string" && Boolean(nodes[id]));
    return nodeIds.length >= 2 ? [{ veinId: path.veinId, nodeIds, ...(path.curve && typeof path.curve === "object" ? { curve: path.curve } : {}) }] : [];
  });
  if (!paths.length) return null;
  return {
    id: raw.id,
    name: typeof raw.name === "string" ? raw.name : "Restored template",
    taxon: typeof raw.taxon === "string" ? raw.taxon : "",
    note: typeof raw.note === "string" ? raw.note : "",
    referenceSize: raw.referenceSize && Number(raw.referenceSize.width) > 0 && Number(raw.referenceSize.height) > 0 ? { width: Number(raw.referenceSize.width), height: Number(raw.referenceSize.height) } : undefined,
    nodes: raw.nodes && typeof raw.nodes === "object" ? sanitizeNodes(raw.nodes) : {},
    paths,
  };
}

function sanitizeVeins(value: unknown): VeinDefinition[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || typeof (raw as VeinDefinition).id !== "string") return [];
    const vein = raw as VeinDefinition;
    const text = (input: unknown, fallback: string) => (typeof input === "string" && input ? input : fallback);
    return [{
      id: vein.id,
      label: text(vein.label, vein.id),
      fullName: text(vein.fullName, vein.id),
      symbolMeaning: text(vein.symbolMeaning, `${vein.id} = restored label`),
      plainMeaning: text(vein.plainMeaning, "restored custom structure"),
      group: text(vein.group, "custom"),
      color: /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(vein.color) ? vein.color : "#7b6f5d",
      note: text(vein.note, "Restored from a browser autosave."),
      ...(typeof vein.legacyAlias === "string" ? { legacyAlias: vein.legacyAlias } : {}),
    }];
  });
}

export function sanitizeEntry(value: unknown): AutosaveEntry | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<AutosaveEntry>;
  if (typeof raw.imageKey !== "string" || typeof raw.imageName !== "string") return null;
  const templateNodes = sanitizeNodes(raw.templateNodes);
  const draft = raw.draftHypotheses && typeof raw.draftHypotheses === "object" && !Array.isArray(raw.draftHypotheses)
    ? Object.fromEntries(Object.entries(raw.draftHypotheses).filter(([, confidence]) => typeof confidence === "number" && Number.isFinite(confidence)))
    : {};
  return {
    imageKey: raw.imageKey,
    imageName: raw.imageName,
    width: Number(raw.width) || 0,
    height: Number(raw.height) || 0,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : new Date(0).toISOString(),
    map: sanitizeMap(raw.map),
    draftHypotheses: draft as Record<string, number>,
    customVeins: sanitizeVeins(raw.customVeins),
    placedTemplate: sanitizeTemplate(raw.placedTemplate, templateNodes),
    templateNodes,
    activeVeinId: typeof raw.activeVeinId === "string" ? raw.activeVeinId : "R4+5",
  };
}

export function readStore(value: unknown): AutosaveStore {
  if (!value || typeof value !== "object" || (value as AutosaveStore).schema !== AUTOSAVE_SCHEMA || !Array.isArray((value as AutosaveStore).entries)) {
    return { schema: AUTOSAVE_SCHEMA, entries: [] };
  }
  return { schema: AUTOSAVE_SCHEMA, entries: (value as AutosaveStore).entries.map(sanitizeEntry).filter((entry): entry is AutosaveEntry => Boolean(entry)) };
}

export function entryHasContent(entry: Pick<AutosaveEntry, "map" | "placedTemplate">) {
  return Object.values(entry.map).some((points) => points.length > 0) || Boolean(entry.placedTemplate?.paths.length);
}

/** Insert or replace the entry for its image; newest first, bounded length. */
export function upsertEntry(store: AutosaveStore, entry: AutosaveEntry, max = MAX_AUTOSAVE_ENTRIES): AutosaveStore {
  return { schema: AUTOSAVE_SCHEMA, entries: [entry, ...store.entries.filter((item) => item.imageKey !== entry.imageKey)].slice(0, max) };
}

export function removeEntry(store: AutosaveStore, key: string): AutosaveStore {
  return { schema: AUTOSAVE_SCHEMA, entries: store.entries.filter((item) => item.imageKey !== key) };
}

export function findEntry(store: AutosaveStore, key: string) {
  return store.entries.find((item) => item.imageKey === key) ?? null;
}

export function describeEntry(entry: AutosaveEntry) {
  const veins = Object.values(entry.map).filter((points) => points.length >= 2).length;
  const points = Object.values(entry.map).reduce((sum, list) => sum + list.length, 0);
  const template = entry.placedTemplate ? ` · template “${entry.placedTemplate.name}”` : "";
  return `${veins} traced structure${veins === 1 ? "" : "s"} · ${points} points${template}`;
}
