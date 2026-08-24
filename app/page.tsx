"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import reviewedEristalisPayload from "./Eristalis-reference.entowing-template.json";
import PhyloAtlas, { FamilyWingTemplate, familyMorphotypes } from "./PhyloAtlas";

type Point = { x: number; y: number };
type CanvasView = { x: number; y: number; width: number; height: number };
type TemplateEditTool = "drag" | "insert" | "delete" | "join" | "crossvein";
type CurveNodeMode = "smooth" | "corner" | "bezier";
type CurveHandle = { dx: number; dy: number };
type CurveControl = { mode: CurveNodeMode; in?: CurveHandle; out?: CurveHandle };
type AtlasMode = "atlas" | "mapper" | "learn";
type VisualTheme = "scientific" | "nocturnal";
type WingImage = { src: string; name: string; width: number; height: number; isLocal: boolean };
type AutoCandidate = { id: string; points: Point[]; length: number };
type TemplatePath = { veinId: string; nodeIds: string[]; curve?: Record<string, CurveControl> };
type WingTemplate = {
  id: string;
  name: string;
  taxon: string;
  note: string;
  referenceSize?: { width: number; height: number };
  nodes: Record<string, Point>;
  paths: TemplatePath[];
};

type VeinDefinition = {
  id: string;
  label: string;
  fullName: string;
  symbolMeaning: string;
  plainMeaning: string;
  group: string;
  color: string;
  note: string;
  legacyAlias?: string;
};

type TemplateUndoSnapshot = {
  template: WingTemplate | null;
  nodes: Record<string, Point>;
  customVeins: VeinDefinition[];
  activeVeinId: string;
};

const referenceImage = "https://www.bugguide.net/images/raw/HSN/QV0/HSNQV0EQO08QB0HKV0RK2KGQD08Q108QC0HKB0SKEKHKBKGKZS4KHSVQZSAQD0HKAK8KOKWQV04QT0.jpg";

const presets: VeinDefinition[] = [
  { id: "C", label: "C", fullName: "Costa", symbolMeaning: "C = Costa", plainMeaning: "the leading-edge vein", group: "costal", color: "#d4a72c", note: "Costa runs along the anterior margin of the wing and is usually the easiest landmark for deciding which side is the leading edge." },
  { id: "Sc", label: "Sc", fullName: "Subcosta", symbolMeaning: "Sc = Subcosta", plainMeaning: "the vein just behind the costa", group: "subcostal", color: "#4f9ca4", note: "Subcosta is a longitudinal vein immediately posterior to the costa. The prefix sub- is a useful reminder that it lies behind the costal system." },
  { id: "R1", label: "R1", fullName: "First branch of Radius", symbolMeaning: "R = Radius · 1 = first branch", plainMeaning: "an anterior branch of the radial system", group: "radial", color: "#c85d48", note: "Radius is one of the major longitudinal vein systems. Its branches are numbered from anterior toward posterior; R1 is the anterior radial branch." },
  { id: "R2+3", label: "R2+3", fullName: "Fused radial branches R2 + R3", symbolMeaning: "R = Radius · 2+3 = fused branches", plainMeaning: "two radial branches travelling as one vein", group: "radial", color: "#c85d48", note: "In many Diptera, branches that are separate in the generalized venation are fused. R2+3 denotes a single visible vein representing radial branches 2 and 3 together." },
  { id: "R4+5", label: "R4+5", fullName: "Fused radial branches R4 + R5", symbolMeaning: "R = Radius · 4+5 = fused branches", plainMeaning: "a posterior branch of the radial system", group: "radial", color: "#c85d48", note: "R4+5 is a major radial landmark in many flies. It lies posterior to R2+3 and often helps define the shape of radial and medial cells." },
  { id: "Rs", label: "Rs", fullName: "Radial sector", symbolMeaning: "Rs = radial sector", plainMeaning: "the radial stem that gives rise to the distal radial branches", group: "radial", color: "#c85d48", note: "Used in the Bombyliidae morphotypes as the shared radial sector before the distal branches split." },
  { id: "R4+5 stem", label: "R4+5 stem", fullName: "Common stem of R4 and R5", symbolMeaning: "R4+5 = shared stem before R4 and R5 divide", plainMeaning: "the short common radial segment before two separate branches", group: "radial", color: "#c85d48", note: "Bombyliidae retain separate R4 and R5 distally; this segment keeps their common stem explicit and independently selectable." },
  { id: "R4", label: "R4", fullName: "Fourth radial branch", symbolMeaning: "R = Radius · 4 = fourth branch", plainMeaning: "the anterior branch of the distal R4/R5 pair", group: "radial", color: "#c85d48", note: "In the Bombyliidae reference morphotypes R4 and R5 are separate distally, unlike the fused R4+5 label used in the Eristalis anchor." },
  { id: "R5", label: "R5", fullName: "Fifth radial branch", symbolMeaning: "R = Radius · 5 = fifth branch", plainMeaning: "the posterior branch of the distal R4/R5 pair", group: "radial", color: "#c85d48", note: "R5 is a key Bombyliidae morphotype character: it may end free or converge distally with M1." },
  { id: "M1", label: "M1", fullName: "Vein M1 · modern Syrphidae", symbolMeaning: "M = Media · 1 = first branch", plainMeaning: "the branch of M that joins R4+5", group: "medial", color: "#7a6bb0", note: "Van Steenis et al. (2023): M1 is the branch of Media that joins R4+5; its apical direction varies among syrphid groups.", legacyAlias: "older Eristalis plates may place M3/M1+2 labels differently" },
  { id: "M4", label: "M4", fullName: "Vein M4 · modern Syrphidae", symbolMeaning: "M = Media · 4 = fourth medial vein", plainMeaning: "the posterior medial boundary of cell dm", group: "medial", color: "#7a6bb0", note: "Van Steenis et al. (2023) treats this as M4. In the older McAlpine system this structure was called CuA1.", legacyAlias: "CuA1 in the older system" },
  { id: "CuA", label: "CuA", fullName: "Vein CuA · modern Syrphidae", symbolMeaning: "Cu = Cubitus · A = anterior branch", plainMeaning: "the anterior cubital vein in the modern system", group: "cubital", color: "#63875f", note: "Van Steenis et al. (2023) uses CuA for the structure called CuA2 in the older system.", legacyAlias: "CuA2 in the older system" },
  { id: "CuP", label: "CuP", fullName: "Vein CuP · modern Syrphidae", symbolMeaning: "Cu = Cubitus · P = posterior branch", plainMeaning: "the posterior cubital vein", group: "cubital", color: "#63875f", note: "Van Steenis et al. (2023) uses CuP for the structure called A1 in the older system.", legacyAlias: "A1 in the older system" },
  { id: "A1", label: "A1", fullName: "Vein A1 · modern Syrphidae", symbolMeaning: "A = Anal · 1 = first anal vein", plainMeaning: "the first anal vein in the modern system", group: "anal", color: "#5c7fa0", note: "Van Steenis et al. (2023) uses A1 for the structure called A2 in the older system.", legacyAlias: "A2 in the older system" },
  { id: "r-m", label: "r-m", fullName: "Radial–medial crossvein", symbolMeaning: "r-m = Radius ↔ Media", plainMeaning: "a short crossvein joining radial and medial systems", group: "crossvein", color: "#d97941", note: "Unlike R and M, r-m is not a longitudinal vein. It is a short crossvein connecting the radial and medial systems; in many Diptera it links R4+5 with M1." },
  { id: "m-cu", label: "m-cu", fullName: "Medial–cubital crossvein · modern Syrphidae", symbolMeaning: "m-cu = Media ↔ Cubitus", plainMeaning: "the crossvein connecting the medial and cubital systems", group: "crossvein", color: "#b76f4e", note: "Modern Syrphidae terminology uses m-cu here; the 2023 glossary replaces the older name bm-cu with m-cu.", legacyAlias: "bm-cu in the older system" },
  { id: "dm-m", label: "dm-m", fullName: "Discal medial crossvein · modern Syrphidae", symbolMeaning: "dm-m = discal medial crossvein", plainMeaning: "the distal crossvein closing cell dm", group: "crossvein", color: "#d97941", note: "Van Steenis et al. (2023) uses dm-m for the crossvein called dm-cu in the older system.", legacyAlias: "dm-cu in the older system" },
  { id: "sv", label: "vena spuria", fullName: "Vena spuria · spurious vein", symbolMeaning: "vena spuria = the characteristic syrphid false vein", plainMeaning: "a vein-like longitudinal thickening rather than a standard true vein", group: "landmark", color: "#db7d87", note: "The vena spuria is a characteristic wing landmark of most Syrphidae. It is kept separate from the true longitudinal veins in EntoWing.", legacyAlias: "s or sv on older plates" },
  { id: "h", label: "h", fullName: "Humeral crossvein", symbolMeaning: "h = humeral crossvein", plainMeaning: "the basal crossvein near the costal region", group: "crossvein", color: "#b76f4e", note: "Modern Diptera/Syrphidae terminology treats h as the humeral crossvein." },
  { id: "M2", label: "M2", fullName: "Second medial branch", symbolMeaning: "M = Media · 2 = second branch", plainMeaning: "a medial branch retained in some fly lineages", group: "medial", color: "#7a6bb0", note: "M2 is important in the Bombyliidae morphotype set: the Bombylius- and Anthrax-types retain three medial branches, while the Usiinae-type shown here is reduced." },
  { id: "M3+4", label: "M3+4", fullName: "Fused medial branches M3 + M4", symbolMeaning: "M = Media · 3+4 = fused posterior branches", plainMeaning: "the posterior medial branch in the Bombyliidae reference diagrams", group: "medial", color: "#7a6bb0", note: "The Bombyliidae reference diagrams label the posterior medial branch M3+4. It is kept separate from the Syrphidae-specific modern M4 nomenclature used by the Eristalis anchor." },
  { id: "m-m", label: "m-m", fullName: "Medial crossvein", symbolMeaning: "m-m = Media ↔ Media", plainMeaning: "a crossvein joining medial branches", group: "crossvein", color: "#d97941", note: "Used in the Bombyliidae reference morphotypes; its exact endpoints shift when M2 is absent." },
  { id: "R5+M1", label: "R5+M1", fullName: "Common distal stem of R5 and M1", symbolMeaning: "R5 + M1 = convergent distal stem", plainMeaning: "two longitudinal systems sharing a short terminal stem", group: "fusion", color: "#9c665c", note: "Used in the Bombylius-type Bombyliidae morphotype to encode the diagnostic distal convergence without making R4+5 and M1 one unclickable path." },
  { id: "CuA+A1", label: "CuA+A1", fullName: "Common distal stem of CuA and A1", symbolMeaning: "CuA + A1 = convergent distal stem", plainMeaning: "cubital and anal veins sharing a terminal stem", group: "fusion", color: "#66817c", note: "Used in the Usiinae-type Bombyliidae morphotype. The two parent veins remain independently selectable before their shared terminal segment." },
  { id: "R4+5 app.", label: "R4+5 app.", fullName: "Appendix of vein R4+5", symbolMeaning: "R4+5 app. = short appendicular branch", plainMeaning: "a short incomplete branch projecting from R4+5 into cell r4+5", group: "radial appendix", color: "#c85d48", note: "The 2023 Syrphidae glossary recognizes an appendix of R4+5; it occurs in some syrphid groups and is useful as a morphotype-level character." },
];

const generalizedDipteraNodes: Record<string, Point> = {
  cBase: { x: 70, y: 195 }, scStart: { x: 105, y: 150 }, scMid: { x: 205, y: 103 }, scEnd: { x: 305, y: 78 },
  rBase: { x: 88, y: 200 }, rStem: { x: 190, y: 158 }, rFork: { x: 335, y: 145 }, r1Mid: { x: 360, y: 92 }, r1End: { x: 505, y: 66 },
  r23Mid: { x: 545, y: 108 }, r23End: { x: 735, y: 73 }, rmR: { x: 475, y: 180 }, r45Mid: { x: 680, y: 148 }, r45End: { x: 875, y: 103 },
  mBase: { x: 95, y: 230 }, mFork: { x: 275, y: 220 }, rmM: { x: 475, y: 221 }, dmTop: { x: 655, y: 220 }, m1End: { x: 910, y: 205 },
  m4Mid: { x: 478, y: 258 }, dmBottom: { x: 655, y: 282 }, m4End: { x: 850, y: 310 },
  cuBase: { x: 105, y: 262 }, cuMid1: { x: 300, y: 282 }, cuMid2: { x: 520, y: 317 }, cuEnd: { x: 735, y: 350 },
  aBase: { x: 100, y: 294 }, aMid: { x: 300, y: 342 }, aEnd: { x: 555, y: 380 },
  svStart: { x: 210, y: 198 }, svMid1: { x: 405, y: 202 }, svMid2: { x: 610, y: 218 }, svEnd: { x: 790, y: 242 },
};

const generalizedDipteraPaths: TemplatePath[] = [
  { veinId: "C", nodeIds: ["cBase", "scEnd", "r1End", "r23End", "r45End"] },
  { veinId: "Sc", nodeIds: ["scStart", "scMid", "scEnd"] },
  { veinId: "R1", nodeIds: ["rBase", "rStem", "r1Mid", "r1End"] },
  { veinId: "R2+3", nodeIds: ["rBase", "rStem", "rFork", "r23Mid", "r23End"] },
  { veinId: "R4+5", nodeIds: ["rBase", "rStem", "rFork", "rmR", "r45Mid", "r45End"] },
  { veinId: "M1", nodeIds: ["mBase", "mFork", "rmM", "dmTop", "m1End"] },
  { veinId: "M4", nodeIds: ["mBase", "mFork", "m4Mid", "dmBottom", "m4End"] },
  { veinId: "CuA", nodeIds: ["cuBase", "cuMid1", "cuMid2", "cuEnd"] },
  { veinId: "A1", nodeIds: ["aBase", "aMid", "aEnd"] },
  { veinId: "r-m", nodeIds: ["rmR", "rmM"] },
  { veinId: "dm-m", nodeIds: ["dmTop", "dmBottom"] },
];

const reviewedEristalisTemplate: WingTemplate = {
  id: "eristalis-reviewed",
  name: "Eristalis · reviewed · 2023 nomenclature",
  taxon: "Syrphidae · Eristalis · geometry user-reviewed · terminology van Steenis et al. 2023",
  note: "Primary EntoWing template: the user's hand-reviewed geometry on Eristalis-reference.jpg, labelled with the modern Syrphidae terminology of van Steenis et al. (2023).",
  referenceSize: {
    width: reviewedEristalisPayload.sourceImage.width,
    height: reviewedEristalisPayload.sourceImage.height,
  },
  nodes: reviewedEristalisPayload.nodes as Record<string, Point>,
  paths: (reviewedEristalisPayload.paths as TemplatePath[]).map((path) => path.veinId === "Cu1" ? { ...path, veinId: "m-cu" } : path),
};

const atlasMorphotypeTemplates: WingTemplate[] = [
  ...familyMorphotypes.bombyliidae,
  ...familyMorphotypes.syrphidae.filter((wing) => wing.morphotypeId !== "eristalis"),
].map((wing) => ({
  id: wing.id,
  name: wing.name,
  taxon: wing.taxon,
  note: wing.note,
  referenceSize: wing.referenceSize,
  nodes: Object.fromEntries(Object.entries(wing.nodes).map(([id, point]) => [id, { ...point }])),
  paths: wing.paths.map((path) => ({ veinId: path.veinId, nodeIds: [...path.nodeIds] })),
}));

const builtInTemplates: WingTemplate[] = [
  reviewedEristalisTemplate,
  ...atlasMorphotypeTemplates,
  {
    id: "diptera-general",
    name: "Generalized Diptera",
    taxon: "Diptera · alignment archetype",
    note: "A topology-aware starting network. It is a placement aid, not a family or species identification.",
    nodes: generalizedDipteraNodes,
    paths: generalizedDipteraPaths,
  },
  {
    id: "syrphidae-like",
    name: "Hover-fly type",
    taxon: "Syrphidae-like · alignment archetype",
    note: "Adds vena spuria as an editable landmark. Verify every homology against the specimen and your chosen nomenclature.",
    nodes: { ...generalizedDipteraNodes, m1End: { x: 900, y: 216 }, r45End: { x: 884, y: 122 } },
    paths: [...generalizedDipteraPaths, { veinId: "sv", nodeIds: ["svStart", "svMid1", "svMid2", "svEnd"] }],
  },
  {
    id: "muscoid-like",
    name: "Muscoid type",
    taxon: "Calyptrate-like · alignment archetype",
    note: "A starting geometry with a more apically curved medial/radial region. Use it only as an editable alignment guide.",
    nodes: { ...generalizedDipteraNodes, r45End: { x: 900, y: 128 }, m1End: { x: 885, y: 155 }, dmTop: { x: 660, y: 218 }, dmBottom: { x: 650, y: 286 } },
    paths: generalizedDipteraPaths,
  },
];

function clampControlVector(vector: Point, maxLength: number) {
  const length = Math.hypot(vector.x, vector.y);
  if (!length || length <= maxLength) return vector;
  const scale = maxLength / length;
  return { x: vector.x * scale, y: vector.y * scale };
}

function smoothPath(points: Point[], nodeIds?: string[], curve?: Record<string, CurveControl>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const segmentLength = Math.max(1, distance(p1, p2));
    const id1 = nodeIds?.[i];
    const id2 = nodeIds?.[i + 1];
    const control1 = id1 ? curve?.[id1] : undefined;
    const control2 = id2 ? curve?.[id2] : undefined;

    let out = clampControlVector({ x: (p2.x - p0.x) / 6, y: (p2.y - p0.y) / 6 }, segmentLength * .38);
    let incoming = clampControlVector({ x: (p1.x - p3.x) / 6, y: (p1.y - p3.y) / 6 }, segmentLength * .38);

    if (control1?.mode === "corner") out = { x: (p2.x - p1.x) / 3, y: (p2.y - p1.y) / 3 };
    if (control2?.mode === "corner") incoming = { x: (p1.x - p2.x) / 3, y: (p1.y - p2.y) / 3 };
    if (control1?.mode === "bezier" && control1.out) out = { x: control1.out.dx, y: control1.out.dy };
    if (control2?.mode === "bezier" && control2.in) incoming = { x: control2.in.dx, y: control2.in.dy };

    const cp1x = p1.x + out.x;
    const cp1y = p1.y + out.y;
    const cp2x = p2.x + incoming.x;
    const cp2y = p2.y + incoming.y;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function withSharedJunctionCorners(template: WingTemplate): WingTemplate {
  const referenceCounts = new Map<string, number>();
  template.paths.forEach((path) => path.nodeIds.forEach((nodeId) => referenceCounts.set(nodeId, (referenceCounts.get(nodeId) ?? 0) + 1)));
  return {
    ...template,
    paths: template.paths.map((path) => {
      const curve = { ...(path.curve ?? {}) };
      path.nodeIds.forEach((nodeId) => {
        if ((referenceCounts.get(nodeId) ?? 0) > 1 && !curve[nodeId]) curve[nodeId] = { mode: "corner" };
      });
      return { ...path, nodeIds: [...path.nodeIds], curve };
    }),
  };
}

function scaleCurveHandles(template: WingTemplate, factor: number): WingTemplate {
  if (Math.abs(factor - 1) < .0001) return template;
  return {
    ...template,
    paths: template.paths.map((path) => ({
      ...path,
      curve: path.curve ? Object.fromEntries(Object.entries(path.curve).map(([nodeId, control]) => [nodeId, {
        ...control,
        in: control.in ? { dx: control.in.dx * factor, dy: control.in.dy * factor } : undefined,
        out: control.out ? { dx: control.out.dx * factor, dy: control.out.dy * factor } : undefined,
      }])) : undefined,
    })),
  };
}

function readCurveControls(value: unknown, allowedNodeIds: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const allowed = new Set(allowedNodeIds);
  const result: Record<string, CurveControl> = {};
  Object.entries(value as Record<string, unknown>).forEach(([nodeId, raw]) => {
    if (!allowed.has(nodeId) || !raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const candidate = raw as { mode?: unknown; in?: unknown; out?: unknown };
    if (candidate.mode !== "smooth" && candidate.mode !== "corner" && candidate.mode !== "bezier") return;
    const readHandle = (handle: unknown): CurveHandle | undefined => {
      if (!handle || typeof handle !== "object" || Array.isArray(handle)) return undefined;
      const dx = Number((handle as { dx?: unknown }).dx);
      const dy = Number((handle as { dy?: unknown }).dy);
      return Number.isFinite(dx) && Number.isFinite(dy) ? { dx, dy } : undefined;
    };
    result[nodeId] = { mode: candidate.mode, in: readHandle(candidate.in), out: readHandle(candidate.out) };
  });
  return Object.keys(result).length ? result : undefined;
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pointLineDistance(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function simplifyPoints(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = pointLineDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }
  if (maxDistance <= epsilon) return [points[0], points[points.length - 1]];
  const left = simplifyPoints(points.slice(0, index + 1), epsilon);
  const right = simplifyPoints(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
}

function thinBinaryMask(input: Uint8Array, width: number, height: number) {
  const mask = new Uint8Array(input);
  const remove = new Uint8Array(mask.length);
  const p = (x: number, y: number) => mask[y * width + x];
  let changed = true;
  let iteration = 0;

  while (changed && iteration < 22) {
    changed = false;
    iteration += 1;
    for (let pass = 0; pass < 2; pass += 1) {
      remove.fill(0);
      let found = false;
      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const idx = y * width + x;
          if (!mask[idx]) continue;
          const n = [p(x, y - 1), p(x + 1, y - 1), p(x + 1, y), p(x + 1, y + 1), p(x, y + 1), p(x - 1, y + 1), p(x - 1, y), p(x - 1, y - 1)];
          const count = n.reduce((sum, value) => sum + value, 0);
          if (count < 2 || count > 6) continue;
          let transitions = 0;
          for (let i = 0; i < 8; i += 1) if (n[i] === 0 && n[(i + 1) % 8] === 1) transitions += 1;
          if (transitions !== 1) continue;
          const passRule = pass === 0
            ? n[0] * n[2] * n[4] === 0 && n[2] * n[4] * n[6] === 0
            : n[0] * n[2] * n[6] === 0 && n[0] * n[4] * n[6] === 0;
          if (!passRule) continue;
          remove[idx] = 1;
          found = true;
        }
      }
      if (found) {
        changed = true;
        for (let i = 0; i < mask.length; i += 1) if (remove[i]) mask[i] = 0;
      }
    }
  }
  return mask;
}

function skeletonSegments(mask: Uint8Array, width: number, height: number) {
  const total = width * height;
  const offsets = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  const neighbors = (idx: number) => {
    const x = idx % width;
    const y = Math.floor(idx / width);
    const result: number[] = [];
    for (const [dx, dy] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const next = ny * width + nx;
        if (mask[next]) result.push(next);
      }
    }
    return result;
  };
  const edgeKey = (a: number, b: number) => a < b ? a * total + b : b * total + a;
  const visited = new Set<number>();
  const segments: { points: Point[]; length: number }[] = [];

  for (let start = 0; start < total; start += 1) {
    if (!mask[start]) continue;
    const startNeighbors = neighbors(start);
    if (startNeighbors.length === 0 || startNeighbors.length === 2) continue;
    for (const first of startNeighbors) {
      if (visited.has(edgeKey(start, first))) continue;
      const indices = [start];
      let previous = start;
      let current = first;
      visited.add(edgeKey(previous, current));
      indices.push(current);

      while (true) {
        const options = neighbors(current).filter((item) => item !== previous);
        if (options.length !== 1) break;
        const next = options[0];
        const key = edgeKey(current, next);
        if (visited.has(key)) break;
        visited.add(key);
        previous = current;
        current = next;
        indices.push(current);
      }

      let length = 0;
      const points = indices.map((idx) => ({ x: idx % width, y: Math.floor(idx / width) }));
      for (let i = 1; i < points.length; i += 1) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      if (length >= Math.max(5, width * 0.008)) segments.push({ points, length });
    }
  }
  return segments.sort((a, b) => b.length - a.length).slice(0, 96);
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function templateFitScale(template: WingTemplate, width: number, height: number) {
  if (template.referenceSize?.width && template.referenceSize?.height) {
    return Math.min(width / template.referenceSize.width, height / template.referenceSize.height);
  }
  const points = Object.values(template.nodes);
  if (!points.length) return 1;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const sourceWidth = Math.max(1, Math.max(...xs) - Math.min(...xs));
  const sourceHeight = Math.max(1, Math.max(...ys) - Math.min(...ys));
  return Math.min((width * .84) / sourceWidth, (height * .78) / sourceHeight);
}

function fitTemplateNodes(template: WingTemplate, width: number, height: number) {
  const entries = Object.entries(template.nodes);
  if (!entries.length) return {};
  if (template.referenceSize?.width && template.referenceSize?.height) {
    const scale = Math.min(width / template.referenceSize.width, height / template.referenceSize.height);
    const offsetX = (width - template.referenceSize.width * scale) / 2;
    const offsetY = (height - template.referenceSize.height * scale) / 2;
    return Object.fromEntries(entries.map(([id, point]) => [id, {
      x: offsetX + point.x * scale,
      y: offsetY + point.y * scale,
    }]));
  }
  const xs = entries.map(([, point]) => point.x);
  const ys = entries.map(([, point]) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sourceWidth = Math.max(1, maxX - minX);
  const sourceHeight = Math.max(1, maxY - minY);
  const scale = Math.min((width * .84) / sourceWidth, (height * .78) / sourceHeight);
  const offsetX = (width - sourceWidth * scale) / 2;
  const offsetY = (height - sourceHeight * scale) / 2;
  return Object.fromEntries(entries.map(([id, point]) => [id, {
    x: offsetX + (point.x - minX) * scale,
    y: offsetY + (point.y - minY) * scale,
  }]));
}

function transformTemplateNodes(nodes: Record<string, Point>, transform: (point: Point, center: Point) => Point) {
  const values = Object.values(nodes);
  if (!values.length) return nodes;
  const center = {
    x: values.reduce((sum, point) => sum + point.x, 0) / values.length,
    y: values.reduce((sum, point) => sum + point.y, 0) / values.length,
  };
  return Object.fromEntries(Object.entries(nodes).map(([id, point]) => [id, transform(point, center)]));
}

function stitchCandidates(candidates: AutoCandidate[]) {
  if (!candidates.length) return [];
  const remaining = candidates.map((candidate) => [...candidate.points]).filter((points) => points.length > 1);
  if (!remaining.length) return [];
  let chain = remaining.shift()!;

  while (remaining.length) {
    const chainStart = chain[0];
    const chainEnd = chain[chain.length - 1];
    let best = { index: 0, mode: 0, gap: Number.POSITIVE_INFINITY };
    remaining.forEach((points, index) => {
      const start = points[0];
      const end = points[points.length - 1];
      const options = [
        distance(chainEnd, start),
        distance(chainEnd, end),
        distance(chainStart, end),
        distance(chainStart, start),
      ];
      options.forEach((gap, mode) => {
        if (gap < best.gap) best = { index, mode, gap };
      });
    });
    const next = remaining.splice(best.index, 1)[0];
    if (best.mode === 0) chain = [...chain, ...next];
    if (best.mode === 1) chain = [...chain, ...next.slice().reverse()];
    if (best.mode === 2) chain = [...next, ...chain];
    if (best.mode === 3) chain = [...next.slice().reverse(), ...chain];
  }
  return chain;
}

function candidateEnds(candidate: AutoCandidate) {
  const points = candidate.points;
  if (points.length < 2) return [];
  const look = Math.min(2, points.length - 1);
  const startVector = { x: points[0].x - points[look].x, y: points[0].y - points[look].y };
  const endVector = { x: points[points.length - 1].x - points[points.length - 1 - look].x, y: points[points.length - 1].y - points[points.length - 1 - look].y };
  const normalize = (vector: Point) => {
    const length = Math.hypot(vector.x, vector.y) || 1;
    return { x: vector.x / length, y: vector.y / length };
  };
  return [
    { point: points[0], direction: normalize(startVector) },
    { point: points[points.length - 1], direction: normalize(endVector) },
  ];
}

function growCandidateSelection(ids: string[], candidates: AutoCandidate[], maxGap: number) {
  const selected = new Set(ids);
  if (!selected.size) return ids;
  let changed = true;
  let passes = 0;
  while (changed && passes < 8) {
    changed = false;
    passes += 1;
    const selectedEnds = candidates.filter((candidate) => selected.has(candidate.id)).flatMap(candidateEnds);
    for (const candidate of candidates) {
      if (selected.has(candidate.id)) continue;
      const isContinuation = candidateEnds(candidate).some((candidateEnd) => selectedEnds.some((selectedEnd) => {
        if (distance(candidateEnd.point, selectedEnd.point) > maxGap) return false;
        const dot = candidateEnd.direction.x * selectedEnd.direction.x + candidateEnd.direction.y * selectedEnd.direction.y;
        return dot < -0.5;
      }));
      if (isContinuation) {
        selected.add(candidate.id);
        changed = true;
      }
    }
  }
  return candidates.filter((candidate) => selected.has(candidate.id)).map((candidate) => candidate.id);
}

async function makeAutoTrace(src: string, naturalWidth: number, naturalHeight: number, sensitivity: number): Promise<AutoCandidate[]> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read this image."));
    img.src = src;
  });
  const scale = Math.min(1, 640 / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(8, Math.round(naturalWidth * scale));
  const height = Math.max(8, Math.round(naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Image processing is not available in this browser.");
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i += 1) {
    const offset = i * 4;
    gray[i] = Math.round(pixels[offset] * .299 + pixels[offset + 1] * .587 + pixels[offset + 2] * .114);
  }

  const integral = new Uint32Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y += 1) {
    let row = 0;
    for (let x = 1; x <= width; x += 1) {
      row += gray[(y - 1) * width + (x - 1)];
      integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + row;
    }
  }

  const radius = Math.max(3, Math.round(width / 150));
  const threshold = 25 - sensitivity * .18;
  const mask = new Uint8Array(width * height);
  for (let y = radius; y < height - radius; y += 1) {
    for (let x = radius; x < width - radius; x += 1) {
      const x0 = x - radius;
      const y0 = y - radius;
      const x1 = x + radius;
      const y1 = y + radius;
      const stride = width + 1;
      const sum = integral[(y1 + 1) * stride + (x1 + 1)] - integral[y0 * stride + (x1 + 1)] - integral[(y1 + 1) * stride + x0] + integral[y0 * stride + x0];
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const localMean = sum / area;
      if (localMean - gray[y * width + x] > threshold) mask[y * width + x] = 1;
    }
  }

  const skeleton = thinBinaryMask(mask, width, height);
  const rawSegments = skeletonSegments(skeleton, width, height);
  return rawSegments.map((segment, index) => {
    const simplified = simplifyPoints(segment.points, 1.6).map((point) => ({ x: point.x / scale, y: point.y / scale }));
    return { id: `auto-${index + 1}`, points: simplified, length: segment.length / scale };
  });
}

type DraftAssignment = { veinId: string; points: Point[]; confidence: number; candidateIds: string[] };

function approximateWholeWingDraft(candidates: AutoCandidate[], width: number, height: number, anteriorAtTop: boolean, baseSide: "left" | "right") {
  const used = new Set<string>();
  const chains: { ids: string[]; points: Point[]; length: number; xSpan: number; ySpan: number; centerX: number; centerY: number }[] = [];
  const byLength = [...candidates].sort((a, b) => b.length - a.length);

  for (const seed of byLength) {
    if (used.has(seed.id)) continue;
    const grownIds = growCandidateSelection([seed.id], candidates, Math.max(8, width * .018)).filter((id) => !used.has(id));
    const members = candidates.filter((candidate) => grownIds.includes(candidate.id));
    if (!members.length) continue;
    members.forEach((candidate) => used.add(candidate.id));
    const points = stitchCandidates(members);
    if (points.length < 2) continue;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    let length = 0;
    for (let i = 1; i < points.length; i += 1) length += distance(points[i - 1], points[i]);
    chains.push({
      ids: members.map((candidate) => candidate.id),
      points,
      length,
      xSpan: Math.max(...xs) - Math.min(...xs),
      ySpan: Math.max(...ys) - Math.min(...ys),
      centerX: xs.reduce((sum, value) => sum + value, 0) / xs.length,
      centerY: ys.reduce((sum, value) => sum + value, 0) / ys.length,
    });
  }

  const orientedY = (chain: (typeof chains)[number]) => anteriorAtTop ? chain.centerY : height - chain.centerY;
  const longitudinal = chains
    .filter((chain) => chain.length > width * .055 && chain.xSpan > Math.max(width * .045, chain.ySpan * .9))
    .sort((a, b) => b.length - a.length)
    .slice(0, 9)
    .sort((a, b) => orientedY(a) - orientedY(b));
  const longitudinalIds = ["C", "Sc", "R1", "R2+3", "R4+5", "M1", "M4", "CuA", "A1"];
  const assignments: DraftAssignment[] = longitudinal.map((chain, index) => {
    const labelIndex = longitudinal.length <= 1 ? 4 : Math.round(index * (longitudinalIds.length - 1) / (longitudinal.length - 1));
    const straightness = chain.xSpan / Math.max(1, chain.xSpan + chain.ySpan);
    const spanScore = Math.min(1, chain.length / Math.max(1, width * .45));
    return { veinId: longitudinalIds[labelIndex], points: simplifyPoints(chain.points, Math.max(1.5, width / 420)), confidence: Math.min(.78, .28 + straightness * .24 + spanScore * .26), candidateIds: chain.ids };
  });

  const usedLongitudinal = new Set(assignments.flatMap((assignment) => assignment.candidateIds));
  const crossCandidates = chains
    .filter((chain) => !chain.ids.some((id) => usedLongitudinal.has(id)))
    .filter((chain) => chain.length > width * .018 && chain.length < width * .28 && chain.ySpan > chain.xSpan * .55)
    .filter((chain) => chain.centerX > width * .12 && chain.centerX < width * .9 && chain.centerY > height * .08 && chain.centerY < height * .92)
    .sort((a, b) => b.length - a.length)
    .slice(0, 5)
    .sort((a, b) => baseSide === "left" ? a.centerX - b.centerX : b.centerX - a.centerX)
    .slice(0, 2);
  const crossIds = ["r-m", "dm-m"];
  crossCandidates.forEach((chain, index) => assignments.push({
    veinId: crossIds[index],
    points: simplifyPoints(chain.points, Math.max(1.5, width / 420)),
    confidence: Math.min(.58, .26 + Math.min(1, chain.length / (width * .15)) * .24),
    candidateIds: chain.ids,
  }));

  const assignedCandidateIds = new Set(assignments.flatMap((assignment) => assignment.candidateIds));
  return { assignments, leftovers: candidates.filter((candidate) => !assignedCandidateIds.has(candidate.id)) };
}

type GuidedResult = { points: Point[]; confidence: "high" | "medium" | "low"; score: number };

async function traceBetweenAnchors(src: string, naturalWidth: number, naturalHeight: number, start: Point, end: Point): Promise<GuidedResult> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read this image."));
    img.src = src;
  });
  const scale = Math.min(1, 480 / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(12, Math.round(naturalWidth * scale));
  const height = Math.max(12, Math.round(naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Image processing is not available in this browser.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i += 1) {
    const offset = i * 4;
    gray[i] = Math.round(pixels[offset] * .299 + pixels[offset + 1] * .587 + pixels[offset + 2] * .114);
  }

  const integral = new Uint32Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y += 1) {
    let row = 0;
    for (let x = 1; x <= width; x += 1) {
      row += gray[(y - 1) * width + x - 1];
      integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + row;
    }
  }

  const radius = Math.max(2, Math.round(width / 120));
  const score = new Float32Array(width * height);
  const stride = width + 1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.max(0, x - radius);
      const y0 = Math.max(0, y - radius);
      const x1 = Math.min(width - 1, x + radius);
      const y1 = Math.min(height - 1, y + radius);
      const sum = integral[(y1 + 1) * stride + x1 + 1] - integral[y0 * stride + x1 + 1] - integral[(y1 + 1) * stride + x0] + integral[y0 * stride + x0];
      const mean = sum / ((x1 - x0 + 1) * (y1 - y0 + 1));
      const idx = y * width + x;
      const localDark = Math.max(0, Math.min(1, (mean - gray[idx]) / 52));
      const absoluteDark = (255 - gray[idx]) / 255;
      score[idx] = Math.min(1, localDark * .78 + absoluteDark * .22);
    }
  }

  const toAnalysis = (point: Point) => ({ x: Math.max(0, Math.min(width - 1, Math.round(point.x * scale))), y: Math.max(0, Math.min(height - 1, Math.round(point.y * scale))) });
  const snap = (point: Point) => {
    const radiusPx = Math.max(4, Math.round(width * .014));
    let best = { ...point, value: -1 };
    for (let y = Math.max(0, point.y - radiusPx); y <= Math.min(height - 1, point.y + radiusPx); y += 1) {
      for (let x = Math.max(0, point.x - radiusPx); x <= Math.min(width - 1, point.x + radiusPx); x += 1) {
        const d = Math.hypot(x - point.x, y - point.y) / radiusPx;
        if (d > 1) continue;
        const value = score[y * width + x] - d * .08;
        if (value > best.value) best = { x, y, value };
      }
    }
    return { x: best.x, y: best.y };
  };
  const routeStart = snap(toAnalysis(start));
  const routeEnd = snap(toAnalysis(end));
  const startIndex = routeStart.y * width + routeStart.x;
  const endIndex = routeEnd.y * width + routeEnd.x;

  const distances = new Float32Array(width * height);
  distances.fill(Number.POSITIVE_INFINITY);
  const previous = new Int32Array(width * height);
  previous.fill(-1);
  const closed = new Uint8Array(width * height);
  const heap: { index: number; priority: number }[] = [];
  const heapPush = (item: { index: number; priority: number }) => {
    heap.push(item);
    let cursor = heap.length - 1;
    while (cursor > 0) {
      const parent = Math.floor((cursor - 1) / 2);
      if (heap[parent].priority <= heap[cursor].priority) break;
      [heap[parent], heap[cursor]] = [heap[cursor], heap[parent]];
      cursor = parent;
    }
  };
  const heapPop = () => {
    const first = heap[0];
    const last = heap.pop();
    if (!heap.length || !last) return first;
    heap[0] = last;
    let cursor = 0;
    while (true) {
      const left = cursor * 2 + 1;
      const right = left + 1;
      let smallest = cursor;
      if (left < heap.length && heap[left].priority < heap[smallest].priority) smallest = left;
      if (right < heap.length && heap[right].priority < heap[smallest].priority) smallest = right;
      if (smallest === cursor) break;
      [heap[cursor], heap[smallest]] = [heap[smallest], heap[cursor]];
      cursor = smallest;
    }
    return first;
  };

  const anchorDistance = Math.max(20, distance(routeStart, routeEnd));
  const heuristic = (x: number, y: number) => Math.hypot(routeEnd.x - x, routeEnd.y - y);
  const neighbors = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  distances[startIndex] = 0;
  heapPush({ index: startIndex, priority: heuristic(routeStart.x, routeStart.y) });

  while (heap.length) {
    const current = heapPop();
    if (!current || closed[current.index]) continue;
    closed[current.index] = 1;
    if (current.index === endIndex) break;
    const x = current.index % width;
    const y = Math.floor(current.index / width);
    for (const [dx, dy] of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const next = ny * width + nx;
      if (closed[next]) continue;
      const darknessCost = 1 + Math.pow(1 - score[next], 2) * 8.5;
      const corridor = pointLineDistance({ x: nx, y: ny }, routeStart, routeEnd) / anchorDistance;
      const stepCost = darknessCost * (dx && dy ? 1.414 : 1) + Math.min(4, corridor * corridor * 3);
      const nextDistance = distances[current.index] + stepCost;
      if (nextDistance >= distances[next]) continue;
      distances[next] = nextDistance;
      previous[next] = current.index;
      heapPush({ index: next, priority: nextDistance + heuristic(nx, ny) });
    }
  }

  if (endIndex !== startIndex && previous[endIndex] < 0) throw new Error("No stable route found between these anchors. Try placing them closer to the visible vein.");
  const route: Point[] = [];
  let cursor = endIndex;
  let guard = width * height;
  while (guard > 0) {
    route.push({ x: cursor % width, y: Math.floor(cursor / width) });
    if (cursor === startIndex) break;
    cursor = previous[cursor];
    if (cursor < 0) break;
    guard -= 1;
  }
  route.reverse();
  const averageScore = route.reduce((sum, point) => sum + score[Math.round(point.y) * width + Math.round(point.x)], 0) / Math.max(1, route.length);
  const simplified = simplifyPoints(route, 1.35).map((point) => ({ x: point.x / scale, y: point.y / scale }));
  const confidence = averageScore >= .38 ? "high" : averageScore >= .22 ? "medium" : "low";
  return { points: simplified, confidence, score: averageScore };
}

export default function Home() {
  const [mode, setMode] = useState<AtlasMode>("atlas");
  const [visualTheme, setVisualTheme] = useState<VisualTheme>("scientific");
  const [wingImage, setWingImage] = useState<WingImage>({ src: referenceImage, name: "Eristalis-reference.jpg", width: 560, height: 246, isLocal: false });
  const [map, setMap] = useState<Record<string, Point[]>>({});
  const [customVeins, setCustomVeins] = useState<VeinDefinition[]>([]);
  const [customName, setCustomName] = useState("");
  const [activeVeinId, setActiveVeinId] = useState("R4+5");
  const [selectedVeinId, setSelectedVeinId] = useState<string | null>(null);
  const [hoveredVeinId, setHoveredVeinId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ veinId: string; pointIndex: number } | null>(null);
  const [mapperPreview, setMapperPreview] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [quizTarget, setQuizTarget] = useState<string | null>(null);
  const [quizMessage, setQuizMessage] = useState("Map at least two veins to start a quiz.");
  const [autoCandidates, setAutoCandidates] = useState<AutoCandidate[]>([]);
  const [selectedAutoIds, setSelectedAutoIds] = useState<string[]>([]);
  const [autoSensitivity, setAutoSensitivity] = useState(55);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoStatus, setAutoStatus] = useState("Upload your own wing photo to create an automatic SVG draft.");
  const [manualAddMode, setManualAddMode] = useState(true);
  const [guidedMode, setGuidedMode] = useState(false);
  const [guidedAnchors, setGuidedAnchors] = useState<Point[]>([]);
  const [guidedRunning, setGuidedRunning] = useState(false);
  const [guidedStatus, setGuidedStatus] = useState("Choose a vein, then let the photo guide the route between two anchors.");
  const [wholeDraftRunning, setWholeDraftRunning] = useState(false);
  const [wholeDraftStatus, setWholeDraftStatus] = useState("Let EntoWing propose a rough whole-wing topology, then review every label.");
  const [anteriorAtTop, setAnteriorAtTop] = useState(true);
  const [baseSide, setBaseSide] = useState<"left" | "right">("left");
  const [draftHypotheses, setDraftHypotheses] = useState<Record<string, number>>({});
  const [customTemplates, setCustomTemplates] = useState<WingTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("eristalis-reviewed");
  const [placedTemplate, setPlacedTemplate] = useState<WingTemplate | null>(null);
  const [templateNodes, setTemplateNodes] = useState<Record<string, Point>>({});
  const [templateOpacity, setTemplateOpacity] = useState(.72);
  const [templateEditMode, setTemplateEditMode] = useState(true);
  const [templateDraggingNode, setTemplateDraggingNode] = useState<string | null>(null);
  const [selectedTemplateNodeId, setSelectedTemplateNodeId] = useState<string | null>(null);
  const [templateDraggingHandle, setTemplateDraggingHandle] = useState<{ veinId: string; nodeId: string; side: "in" | "out" } | null>(null);
  const [templateEditTool, setTemplateEditTool] = useState<TemplateEditTool>("drag");
  const [templateJoinNodeId, setTemplateJoinNodeId] = useState<string | null>(null);
  const [templateCrossveinNodeId, setTemplateCrossveinNodeId] = useState<string | null>(null);
  const [templateCrossveinLabel, setTemplateCrossveinLabel] = useState("");
  const [templateUndoStack, setTemplateUndoStack] = useState<TemplateUndoSnapshot[]>([]);
  const [templateMagneticRunning, setTemplateMagneticRunning] = useState(false);
  const [templateStatus, setTemplateStatus] = useState("Choose an anatomical archetype, place it over the photo, then drag shared junctions into position.");
  const [templateSaveName, setTemplateSaveName] = useState("");
  const [canvasView, setCanvasView] = useState<CanvasView>({ x: 0, y: 0, width: 560, height: 246 });
  const svgRef = useRef<SVGSVGElement>(null);
  const touchPointersRef = useRef(new Map<number, Point>());
  const touchTapRef = useRef(new Map<number, Point>());
  const touchWasPinchRef = useRef(false);
  const templateDragSnapshotTakenRef = useRef(false);
  const pinchStartRef = useRef<{ distance: number; zoom: number; focus: Point } | null>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("entowing-visual-theme-v1");
    if (savedTheme === "scientific" || savedTheme === "nocturnal") setVisualTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.entowingTheme = visualTheme;
    window.localStorage.setItem("entowing-visual-theme-v1", visualTheme);
  }, [visualTheme]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("entowing-custom-templates-v1");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;
      const restoreTimer = window.setTimeout(() => setCustomTemplates(parsed), 0);
      return () => window.clearTimeout(restoreTimer);
    } catch {
      // A damaged local preference must never block the mapper.
    }
  }, []);

  const allVeins = useMemo(() => [...presets, ...customVeins], [customVeins]);
  const allTemplates = useMemo(() => [...builtInTemplates, ...customTemplates], [customTemplates]);
  const selectedTemplate = allTemplates.find((template) => template.id === selectedTemplateId) ?? allTemplates[0];
  const activeVein = allVeins.find((vein) => vein.id === activeVeinId) ?? allVeins[0];
  const selectedVein = allVeins.find((vein) => vein.id === selectedVeinId) ?? null;
  const mappedVeins = useMemo(() => allVeins.filter((vein) => (map[vein.id]?.length ?? 0) >= 2), [allVeins, map]);
  const canvasZoom = Math.max(1, wingImage.width / Math.max(1, canvasView.width));
  const activeTemplatePath = placedTemplate?.paths.find((path) => path.veinId === activeVeinId) ?? null;
  const selectedCurveMode: CurveNodeMode = selectedTemplateNodeId && activeTemplatePath?.nodeIds.includes(selectedTemplateNodeId)
    ? activeTemplatePath.curve?.[selectedTemplateNodeId]?.mode ?? "smooth"
    : "smooth";

  useEffect(() => {
    const handleUndoShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== "z") return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) return;
      if (templateEditMode && placedTemplate && templateUndoStack.length) {
        event.preventDefault();
        undoTemplateAction();
      } else if (!templateEditMode && (map[activeVeinId]?.length ?? 0) > 0) {
        event.preventDefault();
        undoPoint();
      }
    };
    window.addEventListener("keydown", handleUndoShortcut);
    return () => window.removeEventListener("keydown", handleUndoShortcut);
  }, [templateUndoStack, templateEditMode, placedTemplate, map, activeVeinId]);

  function rememberTemplateState() {
    const snapshot: TemplateUndoSnapshot = {
      template: placedTemplate,
      nodes: templateNodes,
      customVeins,
      activeVeinId,
    };
    setTemplateUndoStack((current) => [...current.slice(-79), snapshot]);
  }

  function undoTemplateAction() {
    const snapshot = templateUndoStack[templateUndoStack.length - 1];
    if (!snapshot) {
      setTemplateStatus("Nothing to undo yet.");
      return;
    }
    setPlacedTemplate(snapshot.template);
    setTemplateNodes(snapshot.nodes);
    setCustomVeins(snapshot.customVeins);
    setActiveVeinId(snapshot.activeVeinId);
    setTemplateUndoStack((current) => current.slice(0, -1));
    setTemplateDraggingNode(null);
    setTemplateDraggingHandle(null);
    setSelectedTemplateNodeId(null);
    setTemplateJoinNodeId(null);
    setTemplateCrossveinNodeId(null);
    setTemplateEditTool("drag");
    setTemplateStatus("Undid the last template edit. Ctrl/Cmd + Z works here too.");
  }

  function screenToWing(clientX: number, clientY: number): Point | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const transformed = point.matrixTransform(ctm.inverse());
    return {
      x: Math.max(0, Math.min(wingImage.width, transformed.x)),
      y: Math.max(0, Math.min(wingImage.height, transformed.y)),
    };
  }

  function clampView(view: CanvasView): CanvasView {
    const width = Math.min(wingImage.width, Math.max(wingImage.width / 12, view.width));
    const height = Math.min(wingImage.height, Math.max(wingImage.height / 12, view.height));
    return {
      x: Math.max(0, Math.min(wingImage.width - width, view.x)),
      y: Math.max(0, Math.min(wingImage.height - height, view.y)),
      width,
      height,
    };
  }

  function resetCanvasZoom() {
    setCanvasView({ x: 0, y: 0, width: wingImage.width, height: wingImage.height });
  }

  function zoomCanvas(factor: number) {
    setCanvasView((current) => {
      const currentZoom = wingImage.width / Math.max(1, current.width);
      const nextZoom = Math.max(1, Math.min(12, currentZoom * factor));
      const width = wingImage.width / nextZoom;
      const height = wingImage.height / nextZoom;
      const center = { x: current.x + current.width / 2, y: current.y + current.height / 2 };
      return clampView({ x: center.x - width / 2, y: center.y - height / 2, width, height });
    });
  }

  function beginTouchGesture(pointerId: number, clientX: number, clientY: number, pointerType: string) {
    if (pointerType !== "touch") return;
    touchPointersRef.current.set(pointerId, { x: clientX, y: clientY });
    if (touchPointersRef.current.size !== 2) return;
    touchWasPinchRef.current = true;
    touchTapRef.current.clear();
    setDragging(null);
    setTemplateDraggingNode(null);
    setTemplateDraggingHandle(null);
    const points = [...touchPointersRef.current.values()];
    const distancePx = Math.max(1, distance(points[0], points[1]));
    const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (midpoint.x - rect.left) / Math.max(1, rect.width)));
    const ny = Math.max(0, Math.min(1, (midpoint.y - rect.top) / Math.max(1, rect.height)));
    pinchStartRef.current = {
      distance: distancePx,
      zoom: wingImage.width / Math.max(1, canvasView.width),
      focus: { x: canvasView.x + nx * canvasView.width, y: canvasView.y + ny * canvasView.height },
    };
  }

  function moveTouchGesture(pointerId: number, clientX: number, clientY: number, pointerType: string) {
    if (pointerType !== "touch" || !touchPointersRef.current.has(pointerId)) return;
    touchPointersRef.current.set(pointerId, { x: clientX, y: clientY });
    const start = pinchStartRef.current;
    if (!start || touchPointersRef.current.size < 2) return;
    const points = [...touchPointersRef.current.values()].slice(0, 2);
    const distancePx = Math.max(1, distance(points[0], points[1]));
    const nextZoom = Math.max(1, Math.min(12, start.zoom * distancePx / start.distance));
    const width = wingImage.width / nextZoom;
    const height = wingImage.height / nextZoom;
    const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (midpoint.x - rect.left) / Math.max(1, rect.width)));
    const ny = Math.max(0, Math.min(1, (midpoint.y - rect.top) / Math.max(1, rect.height)));
    setCanvasView(clampView({ x: start.focus.x - nx * width, y: start.focus.y - ny * height, width, height }));
  }

  function registerCanvasTouchTap(pointerId: number, clientX: number, clientY: number, pointerType: string) {
    if (pointerType !== "touch" || touchWasPinchRef.current) return;
    touchTapRef.current.set(pointerId, { x: clientX, y: clientY });
  }

  function endTouchGesture(pointerId: number, clientX: number, clientY: number, pointerType: string, cancelled = false) {
    if (pointerType !== "touch") return;
    const start = touchTapRef.current.get(pointerId);
    const shouldTap = !cancelled && !touchWasPinchRef.current && start && distance(start, { x: clientX, y: clientY }) < 10;
    touchTapRef.current.delete(pointerId);
    touchPointersRef.current.delete(pointerId);
    if (shouldTap) handleCanvasPointerDown(clientX, clientY);
    if (touchPointersRef.current.size < 2) pinchStartRef.current = null;
    if (touchPointersRef.current.size === 0) touchWasPinchRef.current = false;
  }

  function persistCustomTemplate(template: WingTemplate) {
    setCustomTemplates((current) => {
      const next = [...current.filter((item) => item.id !== template.id), template];
      try { window.localStorage.setItem("entowing-custom-templates-v1", JSON.stringify(next)); } catch { /* local storage can be unavailable in private contexts */ }
      return next;
    });
  }

  function currentReusableTemplate(name: string): WingTemplate | null {
    if (placedTemplate && templateEditMode && placedTemplate.paths.length) {
      const usedNodeIds = new Set(placedTemplate.paths.flatMap((path) => path.nodeIds));
      const nodes = Object.fromEntries(Object.entries(templateNodes).filter(([id]) => usedNodeIds.has(id)).map(([id, point]) => [id, { ...point }]));
      return {
        id: `saved-${Date.now()}`,
        name,
        taxon: `${placedTemplate.taxon} · user-edited tracing`,
        note: `User-edited EntoWing topology from ${wingImage.name}. The source photograph is not included.`,
        referenceSize: { width: wingImage.width, height: wingImage.height },
        nodes,
        paths: placedTemplate.paths.map((path) => ({ ...path, nodeIds: [...path.nodeIds] })),
      };
    }
    if (!mappedVeins.length) return null;
    const nodes: Record<string, Point> = {};
    const paths: TemplatePath[] = [];
    const mergeRadius = Math.max(2, wingImage.width * .006);
    let nodeCounter = 0;
    const nodeForPoint = (point: Point) => {
      const existing = Object.entries(nodes).find(([, candidate]) => distance(candidate, point) <= mergeRadius);
      if (existing) return existing[0];
      nodeCounter += 1;
      const id = `saved-node-${nodeCounter}`;
      nodes[id] = { ...point };
      return id;
    };
    mappedVeins.forEach((vein) => {
      const points = map[vein.id] ?? [];
      if (points.length < 2) return;
      paths.push({ veinId: vein.id, nodeIds: points.map(nodeForPoint) });
    });
    return {
      id: `saved-${Date.now()}`,
      name,
      taxon: "My reviewed EntoWing tracing",
      note: `${paths.length} reviewed paths saved from ${wingImage.name}. The source photograph is not included.`,
      referenceSize: { width: wingImage.width, height: wingImage.height },
      nodes,
      paths,
    };
  }

  function saveTracingAsTemplate() {
    const fallbackName = wingImage.name.replace(/\.[^.]+$/, "") || "My wing";
    const name = templateSaveName.trim() || fallbackName;
    const template = currentReusableTemplate(name);
    if (!template) {
      setTemplateStatus("Trace at least one complete vein, or edit a placed template, before saving it.");
      return;
    }
    persistCustomTemplate(template);
    setSelectedTemplateId(template.id);
    setTemplateSaveName("");
    setTemplateStatus(`“${name}” saved to My Templates on this device. It is now selected and ready to place on another wing.`);
  }

  function exportReusableTemplate() {
    const fallbackName = wingImage.name.replace(/\.[^.]+$/, "") || "My wing";
    const name = templateSaveName.trim() || fallbackName;
    const template = currentReusableTemplate(name);
    if (!template) {
      setTemplateStatus("Trace at least one complete vein, or edit a placed template, before exporting it.");
      return;
    }
    const veinIds = new Set(template.paths.map((path) => path.veinId));
    const veinDefinitions = allVeins.filter((vein) => veinIds.has(vein.id));
    const payload = {
      schema: "entowing-template/1.0",
      kind: "wing-template",
      name: template.name,
      taxon: template.taxon,
      note: template.note,
      sourceImage: { fileName: wingImage.name, width: wingImage.width, height: wingImage.height, embedded: false },
      nodes: template.nodes,
      paths: template.paths,
      veins: veinDefinitions,
    };
    const safeName = name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "entowing-template";
    downloadText(`${safeName}.entowing-template.json`, JSON.stringify(payload, null, 2), "application/json");
    setTemplateStatus(`Template file downloaded: ${safeName}.entowing-template.json. You can send this small JSON file to me; it contains the editable topology, not the wing photo.`);
  }

  function addPoint(clientX: number, clientY: number) {
    if (mapperPreview || dragging || !manualAddMode || (placedTemplate && templateEditMode)) return;
    const point = screenToWing(clientX, clientY);
    if (!point) return;
    setMap((current) => ({ ...current, [activeVeinId]: [...(current[activeVeinId] ?? []), point] }));
    setDraftHypotheses((current) => {
      if (!(activeVeinId in current)) return current;
      const next = { ...current };
      delete next[activeVeinId];
      return next;
    });
  }

  function startGuidedTrace() {
    if (!wingImage.isLocal) {
      setGuidedStatus("Load your own wing photo first — Guided Trace needs local pixel access.");
      return;
    }
    if (guidedRunning) return;
    setGuidedMode(true);
    setGuidedAnchors([]);
    setSelectedAutoIds([]);
    setManualAddMode(false);
    setMapperPreview(false);
    setGuidedStatus(`Tap approximately at the START of ${activeVein.label}.`);
  }

  function cancelGuidedTrace() {
    if (guidedRunning) return;
    setGuidedMode(false);
    setGuidedAnchors([]);
    setManualAddMode(true);
    setGuidedStatus("Guided Trace cancelled. Existing annotation was not changed.");
  }

  function handleCanvasPointerDown(clientX: number, clientY: number) {
    if (placedTemplate && templateEditMode && !guidedMode) return;
    if (!guidedMode) {
      addPoint(clientX, clientY);
      return;
    }
    if (guidedRunning) return;
    const point = screenToWing(clientX, clientY);
    if (!point) return;
    if (!guidedAnchors.length) {
      setGuidedAnchors([point]);
      setGuidedStatus(`START set for ${activeVein.label}. Now tap approximately at the END of the same vein.`);
      return;
    }

    const start = guidedAnchors[0];
    const end = point;
    if (distance(start, end) < Math.max(10, wingImage.width * .012)) {
      setGuidedStatus("END is too close to START. Tap farther along the same vein — the first anchor is still saved.");
      return;
    }
    const veinId = activeVeinId;
    const veinLabel = activeVein.label;
    setGuidedAnchors([start, end]);
    setGuidedRunning(true);
    setGuidedStatus(`Following visible line evidence from START to END for ${veinLabel}…`);
    window.setTimeout(async () => {
      try {
        const result = await traceBetweenAnchors(wingImage.src, wingImage.width, wingImage.height, start, end);
        setMap((current) => ({ ...current, [veinId]: result.points }));
        setDraftHypotheses((current) => {
          const next = { ...current };
          delete next[veinId];
          return next;
        });
        setGuidedStatus(`${veinLabel} routed with ${result.confidence} image confidence · ${result.points.length} editable control points. Drag any point to correct it.`);
      } catch (error) {
        setGuidedStatus(error instanceof Error ? error.message : "Guided Trace could not follow this vein.");
      } finally {
        setGuidedRunning(false);
        setGuidedMode(false);
        setGuidedAnchors([]);
        setManualAddMode(true);
      }
    }, 35);
  }

  function moveDraggedPoint(clientX: number, clientY: number) {
    if (!dragging) return;
    const point = screenToWing(clientX, clientY);
    if (!point) return;
    setMap((current) => {
      const nextPoints = [...(current[dragging.veinId] ?? [])];
      nextPoints[dragging.pointIndex] = point;
      return { ...current, [dragging.veinId]: nextPoints };
    });
    setDraftHypotheses((current) => {
      if (!(dragging.veinId in current)) return current;
      const next = { ...current };
      delete next[dragging.veinId];
      return next;
    });
  }

  function moveTemplateNode(clientX: number, clientY: number) {
    if (!templateDraggingNode || templateEditTool !== "drag") return;
    const point = screenToWing(clientX, clientY);
    if (!point) return;
    if (!templateDragSnapshotTakenRef.current) {
      rememberTemplateState();
      templateDragSnapshotTakenRef.current = true;
    }
    setTemplateNodes((current) => ({ ...current, [templateDraggingNode]: point }));
  }

  function setSelectedPointCurveMode(mode: CurveNodeMode) {
    if (!placedTemplate || !selectedTemplateNodeId) {
      setTemplateStatus("Tap a point first, then choose Smooth, Corner, or Handles.");
      return;
    }
    const path = placedTemplate.paths.find((item) => item.veinId === activeVeinId && item.nodeIds.includes(selectedTemplateNodeId));
    if (!path) {
      setTemplateStatus("Tap the coloured vein first, then select one of its points.");
      return;
    }
    const index = path.nodeIds.indexOf(selectedTemplateNodeId);
    const point = templateNodes[selectedTemplateNodeId];
    if (!point) return;
    const previous = index > 0 ? templateNodes[path.nodeIds[index - 1]] : undefined;
    const next = index < path.nodeIds.length - 1 ? templateNodes[path.nodeIds[index + 1]] : undefined;
    const control: CurveControl = mode === "bezier"
      ? {
          mode,
          in: previous ? { dx: (previous.x - point.x) / 3, dy: (previous.y - point.y) / 3 } : undefined,
          out: next ? { dx: (next.x - point.x) / 3, dy: (next.y - point.y) / 3 } : undefined,
        }
      : { mode };
    rememberTemplateState();
    setPlacedTemplate((current) => current ? {
      ...current,
      paths: current.paths.map((item) => item.veinId === path.veinId ? { ...item, curve: { ...(item.curve ?? {}), [selectedTemplateNodeId]: control } } : item),
    } : current);
    setTemplateEditTool("drag");
    setTemplateStatus(mode === "corner"
      ? `${activeVein.label}: this point is now a Corner. The curve cannot overshoot through the junction.`
      : mode === "bezier"
        ? `${activeVein.label}: Bézier handles are active. Drag either little handle to shape the bend without adding more points.`
        : `${activeVein.label}: this point is Smooth again. EntoWing uses a clamped automatic tangent here.`);
  }

  function moveTemplateHandle(clientX: number, clientY: number) {
    if (!templateDraggingHandle || !placedTemplate) return;
    const point = screenToWing(clientX, clientY);
    const anchor = templateNodes[templateDraggingHandle.nodeId];
    if (!point || !anchor) return;
    const vector = { dx: point.x - anchor.x, dy: point.y - anchor.y };
    const { veinId, nodeId, side } = templateDraggingHandle;
    setPlacedTemplate((current) => current ? {
      ...current,
      paths: current.paths.map((path) => {
        if (path.veinId !== veinId) return path;
        const existing = path.curve?.[nodeId] ?? { mode: "bezier" as const };
        return { ...path, curve: { ...(path.curve ?? {}), [nodeId]: { ...existing, mode: "bezier", [side]: vector } } };
      }),
    } : current);
  }

  function transformPlacedCurveHandles(transform: (handle: CurveHandle) => CurveHandle) {
    setPlacedTemplate((current) => current ? {
      ...current,
      paths: current.paths.map((path) => ({
        ...path,
        curve: path.curve ? Object.fromEntries(Object.entries(path.curve).map(([nodeId, control]) => [nodeId, {
          ...control,
          in: control.in ? transform(control.in) : undefined,
          out: control.out ? transform(control.out) : undefined,
        }])) : undefined,
      })),
    } : current);
  }

  function placeSelectedTemplate() {
    if (!selectedTemplate) return;
    const prepared = withSharedJunctionCorners(selectedTemplate);
    const placed = scaleCurveHandles(prepared, templateFitScale(prepared, wingImage.width, wingImage.height));
    setPlacedTemplate(placed);
    setTemplateNodes(fitTemplateNodes(prepared, wingImage.width, wingImage.height));
    setTemplateEditMode(true);
    setTemplateEditTool("drag");
    setSelectedTemplateNodeId(null);
    setTemplateDraggingHandle(null);
    setTemplateJoinNodeId(null);
    setTemplateCrossveinNodeId(null);
    setTemplateUndoStack([]);
    setMapperPreview(false);
    setGuidedMode(false);
    setSelectedAutoIds([]);
    setManualAddMode(false);
    setTemplateStatus(`${selectedTemplate.name} placed. Move/scale/rotate the whole graph, then drag the junction handles onto the specimen.`);
  }

  function chooseTemplateEditTool(tool: TemplateEditTool) {
    setTemplateEditMode(true);
    setMapperPreview(false);
    setManualAddMode(false);
    setTemplateEditTool(tool);
    if (tool !== "join") setTemplateJoinNodeId(null);
    if (tool !== "crossvein") setTemplateCrossveinNodeId(null);
    if (tool === "drag") setTemplateStatus("Drag any template point. Dark points are shared junctions; pale points bend one vein locally.");
    if (tool === "insert") setTemplateStatus("Insert point: tap directly on any coloured template vein. A new control point is inserted between its neighbours.");
    if (tool === "delete") setTemplateStatus("Delete: choose a vein, then tap its unwanted point. If a vein has only two endpoints, deleting either endpoint removes that vein from this template; points still used by neighbouring veins are preserved.");
    if (tool === "join") setTemplateStatus("Join points: tap the first point, then a point on another vein. They become one shared junction.");
    if (tool === "crossvein") setTemplateStatus(templateCrossveinLabel.trim()
      ? `Crossvein ${templateCrossveinLabel.trim()}: tap its first endpoint, then a point on another vein. The endpoints will stay separate.`
      : "Name the new crossvein first (for example h, x, or m-cu), then tap its two endpoints.");
  }

  function insertTemplatePoint(path: TemplatePath, clientX: number, clientY: number) {
    if (!placedTemplate) return;
    const point = screenToWing(clientX, clientY);
    if (!point) return;
    const pathPoints = path.nodeIds.map((id) => templateNodes[id]).filter((value): value is Point => Boolean(value));
    if (pathPoints.length < 2) return;
    let bestSegment = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < pathPoints.length - 1; index += 1) {
      const candidateDistance = pointLineDistance(point, pathPoints[index], pathPoints[index + 1]);
      if (candidateDistance < bestDistance) {
        bestDistance = candidateDistance;
        bestSegment = index;
      }
    }
    const nodeId = `edit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nextNodeIds = [...path.nodeIds];
    nextNodeIds.splice(bestSegment + 1, 0, nodeId);
    rememberTemplateState();
    setTemplateNodes((current) => ({ ...current, [nodeId]: point }));
    setPlacedTemplate((current) => current ? { ...current, paths: current.paths.map((item) => item.veinId === path.veinId ? { ...item, nodeIds: nextNodeIds } : item) } : current);
    setActiveVeinId(path.veinId);
    setTemplateStatus(`Added a new control point to ${path.veinId}. Switch to Drag and pull it onto the exact bend.`);
  }

  function deleteTemplatePoint(nodeId: string) {
    if (!placedTemplate) return;
    const owners = placedTemplate.paths.filter((path) => path.nodeIds.includes(nodeId));
    const owner = owners.find((path) => path.veinId === activeVeinId) ?? (owners.length === 1 ? owners[0] : null);
    if (!owner) {
      setTemplateStatus(`This is a shared junction used by ${owners.map((path) => path.veinId).join(", ")}. Tap the vein you want to edit first, then tap the junction again.`);
      return;
    }
    if (owner.nodeIds.length <= 2) {
      rememberTemplateState();
      const nextPaths = placedTemplate.paths.filter((path) => path.veinId !== owner.veinId);
      const referencedNodeIds = new Set(nextPaths.flatMap((path) => path.nodeIds));
      const nextNodes = Object.fromEntries(Object.entries(templateNodes).filter(([id]) => referencedNodeIds.has(id)));
      const remainingOwner = nextPaths.find((path) => path.nodeIds.includes(nodeId));
      setPlacedTemplate({ ...placedTemplate, paths: nextPaths });
      setTemplateNodes(nextNodes);
      if (!presets.some((vein) => vein.id === owner.veinId)) {
        setCustomVeins((current) => current.filter((vein) => vein.id !== owner.veinId));
      }
      if (remainingOwner) setActiveVeinId(remainingOwner.veinId);
      else if (nextPaths.length) setActiveVeinId(nextPaths[0].veinId);
      setTemplateJoinNodeId(null);
      setTemplateCrossveinNodeId(null);
      setTemplateStatus(`${owner.veinId} removed from this template because it only had two endpoints.${remainingOwner ? ` This junction is still used by ${remainingOwner.veinId}; tap it again if you also want to remove that control point.` : ""} Undo will restore it.`);
      return;
    }
    rememberTemplateState();
    const nextPaths = placedTemplate.paths.map((path) => path.veinId === owner.veinId ? { ...path, nodeIds: path.nodeIds.filter((id) => id !== nodeId) } : path);
    setPlacedTemplate({ ...placedTemplate, paths: nextPaths });
    if (!nextPaths.some((path) => path.nodeIds.includes(nodeId))) {
      setTemplateNodes((current) => { const next = { ...current }; delete next[nodeId]; return next; });
    }
    setTemplateStatus(`${nodeId && owners.length > 1 ? "Detached" : "Deleted"} point from ${owner.veinId}. The rest of the vein stays connected.`);
  }

  function joinTemplatePoint(nodeId: string) {
    if (!placedTemplate) return;
    if (!templateJoinNodeId) {
      setTemplateJoinNodeId(nodeId);
      setTemplateStatus("First point selected. Now tap the point on another vein that this one should join.");
      return;
    }
    if (templateJoinNodeId === nodeId) {
      setTemplateJoinNodeId(null);
      setTemplateStatus("Join cancelled. Choose two different points.");
      return;
    }
    const samePath = placedTemplate.paths.some((path) => path.nodeIds.includes(templateJoinNodeId) && path.nodeIds.includes(nodeId));
    if (samePath) {
      setTemplateStatus("Those points already belong to the same vein. Choose a point on another vein to create a junction.");
      return;
    }
    const sourceId = templateJoinNodeId;
    rememberTemplateState();
    const nextPaths = placedTemplate.paths.map((path) => {
      const replaced = path.nodeIds.map((id) => id === sourceId ? nodeId : id);
      return { ...path, nodeIds: replaced.filter((id, index) => index === 0 || id !== replaced[index - 1]) };
    });
    setPlacedTemplate({ ...placedTemplate, paths: nextPaths });
    setTemplateNodes((current) => { const next = { ...current }; delete next[sourceId]; return next; });
    setTemplateJoinNodeId(null);
    setTemplateEditTool("drag");
    setTemplateStatus("Junction created. The connected veins now share this point; dragging it moves the connection together.");
  }

  function createCrossveinToPoint(nodeId: string) {
    if (!placedTemplate) return;
    const label = templateCrossveinLabel.trim();
    if (!label) {
      setTemplateStatus("Give the new crossvein a name first, then tap its two endpoint points.");
      return;
    }
    if (!templateCrossveinNodeId) {
      setTemplateCrossveinNodeId(nodeId);
      setTemplateStatus(`First endpoint selected for ${label}. Now tap its endpoint on the other vein.`);
      return;
    }
    if (templateCrossveinNodeId === nodeId) {
      setTemplateCrossveinNodeId(null);
      setTemplateStatus(`First endpoint for ${label} cleared. Choose two different points.`);
      return;
    }
    const sourceId = templateCrossveinNodeId;
    const sourceOwners = placedTemplate.paths.filter((path) => path.nodeIds.includes(sourceId)).map((path) => path.veinId);
    const targetOwners = placedTemplate.paths.filter((path) => path.nodeIds.includes(nodeId)).map((path) => path.veinId);
    if (sourceOwners.some((owner) => targetOwners.includes(owner))) {
      setTemplateStatus("Those two points already belong to the same vein. Choose endpoints on two different veins for a crossvein.");
      return;
    }

    const knownDefinition = allVeins.find((vein) => vein.id.toLowerCase() === label.toLowerCase() || vein.label.toLowerCase() === label.toLowerCase());
    const base = knownDefinition?.id ?? (label.replace(/[^a-zA-Z0-9+_-]/g, "-") || "crossvein");
    let id = base;
    let suffix = 2;
    while (placedTemplate.paths.some((path) => path.veinId === id) || (!knownDefinition && allVeins.some((vein) => vein.id === id))) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    const newVein: VeinDefinition | null = knownDefinition ? null : {
      id,
      label,
      fullName: `${label} · user-defined crossvein`,
      symbolMeaning: `${label} = user-defined crossvein`,
      plainMeaning: "a user-added transverse vein connecting two existing veins",
      group: "crossvein",
      color: "#b76f4e",
      note: "Added manually from this specimen. Verify its homology and name against the nomenclature used for your taxon.",
    };
    rememberTemplateState();
    if (newVein) setCustomVeins((current) => [...current, newVein]);
    setPlacedTemplate({ ...placedTemplate, paths: [...placedTemplate.paths, { veinId: id, nodeIds: [sourceId, nodeId] }] });
    setActiveVeinId(id);
    setTemplateCrossveinNodeId(null);
    setTemplateCrossveinLabel("");
    setTemplateEditTool("drag");
    setTemplateStatus(`Crossvein ${label} created. Its endpoints stay on their original veins instead of being merged; it will be included when you export this template.`);
  }

  function shiftTemplate(dx: number, dy: number) {
    rememberTemplateState();
    setTemplateNodes((current) => Object.fromEntries(Object.entries(current).map(([id, point]) => [id, { x: point.x + dx, y: point.y + dy }])));
  }

  function scaleTemplate(factor: number) {
    rememberTemplateState();
    setTemplateNodes((current) => transformTemplateNodes(current, (point, center) => ({
      x: center.x + (point.x - center.x) * factor,
      y: center.y + (point.y - center.y) * factor,
    })));
    transformPlacedCurveHandles((handle) => ({ dx: handle.dx * factor, dy: handle.dy * factor }));
  }

  function rotateTemplate(degrees: number) {
    rememberTemplateState();
    const radians = degrees * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    setTemplateNodes((current) => transformTemplateNodes(current, (point, center) => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
    }));
    transformPlacedCurveHandles((handle) => ({ dx: handle.dx * cos - handle.dy * sin, dy: handle.dx * sin + handle.dy * cos }));
  }

  function mirrorTemplate() {
    rememberTemplateState();
    setTemplateNodes((current) => transformTemplateNodes(current, (point, center) => ({ x: center.x - (point.x - center.x), y: point.y })));
    transformPlacedCurveHandles((handle) => ({ dx: -handle.dx, dy: handle.dy }));
  }

  function resetTemplateFit() {
    if (!placedTemplate) return;
    rememberTemplateState();
    setTemplateNodes(fitTemplateNodes(placedTemplate, wingImage.width, wingImage.height));
    setTemplateEditTool("drag");
    setTemplateJoinNodeId(null);
    setTemplateCrossveinNodeId(null);
    setTemplateStatus("Template fit reset. Use Undo if you want the previous fit back.");
  }

  function applyTemplateToMap() {
    if (!placedTemplate) return;
    const pathsToAdd = placedTemplate.paths.filter((path) => (map[path.veinId]?.length ?? 0) < 2);
    setMap((current) => {
      const next = { ...current };
      pathsToAdd.forEach((path) => {
        if ((current[path.veinId]?.length ?? 0) >= 2) return;
        const points = path.nodeIds.map((id) => templateNodes[id]).filter((point): point is Point => Boolean(point));
        if (points.length >= 2) {
          next[path.veinId] = points;
        }
      });
      return next;
    });
    setTemplateEditMode(false);
    setManualAddMode(true);
    setTemplateStatus(`Template transferred to ${pathsToAdd.length} empty annotation paths. Existing manual veins were preserved. Edit any control point, or magnetically refine one vein at a time.`);
  }

  async function magneticFitActiveTemplateVein() {
    if (!placedTemplate || !wingImage.isLocal || templateMagneticRunning) {
      if (!wingImage.isLocal) setTemplateStatus("Magnetic fitting needs a photo loaded from your device; template placement itself still works on the reference plate.");
      return;
    }
    const path = placedTemplate.paths.find((item) => item.veinId === activeVeinId);
    if (!path) {
      setTemplateStatus(`${activeVein.label} is not present in this template. Choose a mapped template vein first.`);
      return;
    }
    const anchors = path.nodeIds.map((id) => templateNodes[id]).filter((point): point is Point => Boolean(point));
    if (anchors.length < 2) return;
    setTemplateMagneticRunning(true);
    setTemplateStatus(`Following local image evidence around the ${activeVein.label} template corridor…`);
    try {
      const routed: Point[] = [];
      const confidenceScores: number[] = [];
      for (let index = 1; index < anchors.length; index += 1) {
        const result = await traceBetweenAnchors(wingImage.src, wingImage.width, wingImage.height, anchors[index - 1], anchors[index]);
        confidenceScores.push(result.score);
        routed.push(...(index === 1 ? result.points : result.points.slice(1)));
      }
      const points = simplifyPoints(routed, Math.max(1.1, wingImage.width / 650));
      setMap((current) => ({ ...current, [activeVeinId]: points }));
      setDraftHypotheses((current) => { const next = { ...current }; delete next[activeVeinId]; return next; });
      const mean = confidenceScores.reduce((sum, score) => sum + score, 0) / Math.max(1, confidenceScores.length);
      setTemplateStatus(`${activeVein.label} magnetically refined near its template path · ${Math.round(mean * 100)}% local image score · ${points.length} editable points.`);
      setTemplateEditMode(false);
      setManualAddMode(true);
    } catch (error) {
      setTemplateStatus(error instanceof Error ? error.message : "Magnetic fitting could not follow this template vein.");
    } finally {
      setTemplateMagneticRunning(false);
    }
  }

  function loadTemplateMap(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result));
        if (payload?.schema === "entowing-template/1.0" && payload?.nodes && Array.isArray(payload?.paths)) {
          const nodes: Record<string, Point> = {};
          Object.entries(payload.nodes as Record<string, { x?: unknown; y?: unknown }>).forEach(([id, point]) => {
            const x = Number(point?.x);
            const y = Number(point?.y);
            if (Number.isFinite(x) && Number.isFinite(y)) nodes[id] = { x, y };
          });
          const paths: TemplatePath[] = payload.paths.flatMap((path: { veinId?: unknown; nodeIds?: unknown; curve?: unknown }) => {
            if (typeof path?.veinId !== "string" || !Array.isArray(path.nodeIds)) return [];
            const nodeIds = path.nodeIds.filter((id): id is string => typeof id === "string" && Boolean(nodes[id]));
            const veinId = path.veinId === "Cu1" ? "m-cu" : path.veinId;
            return nodeIds.length >= 2 ? [{ veinId, nodeIds, curve: readCurveControls(path.curve, nodeIds) }] : [];
          });
          if (!paths.length) throw new Error("This EntoWing template does not contain reusable vein paths.");
          const importedDefinitions = Array.isArray(payload.veins) ? payload.veins : [];
          importedDefinitions.forEach((vein: Partial<VeinDefinition>) => {
            if (vein.id === "Cu1") return;
            if (!vein.id || presets.some((preset) => preset.id === vein.id)) return;
            setCustomVeins((current) => current.some((item) => item.id === vein.id) ? current : [...current, {
              id: vein.id!,
              label: vein.label || vein.id!,
              fullName: vein.fullName || "Imported custom structure",
              symbolMeaning: vein.symbolMeaning || `${vein.id} · imported label`,
              plainMeaning: vein.plainMeaning || "custom structure imported from a reviewed EntoWing template",
              group: vein.group || "custom",
              color: vein.color || "#7b6f5d",
              note: vein.note || "Imported from a user-reviewed EntoWing template; verify terminology against its source.",
            }]);
          });
          const template: WingTemplate = {
            id: `custom-${Date.now()}`,
            name: String(payload.name || file.name.replace(/\.entowing-template\.json$|\.json$/i, "")),
            taxon: String(payload.taxon || "User-supplied EntoWing template"),
            note: String(payload.note || "Portable reviewed template. Shared junctions and editable control points are preserved."),
            referenceSize: Number(payload?.sourceImage?.width) > 0 && Number(payload?.sourceImage?.height) > 0
              ? { width: Number(payload.sourceImage.width), height: Number(payload.sourceImage.height) }
              : undefined,
            nodes,
            paths,
          };
          persistCustomTemplate(template);
          setSelectedTemplateId(template.id);
          setTemplateStatus(`${template.name} imported with ${paths.length} paths and its shared topology intact. Press “Place template” to use it.`);
          return;
        }
        if (!Array.isArray(payload?.veins) || !payload.veins.length) throw new Error("This JSON does not contain EntoWing vein paths.");
        const nodes: Record<string, Point> = {};
        const paths: TemplatePath[] = [];
        payload.veins.forEach((vein: VeinDefinition & { points?: Point[] }, veinIndex: number) => {
          if (!Array.isArray(vein.points) || vein.points.length < 2 || !vein.id) return;
          const nodeIds = vein.points.map((point, pointIndex) => {
            const nodeId = `import-${veinIndex}-${pointIndex}`;
            nodes[nodeId] = { x: Number(point.x), y: Number(point.y) };
            return nodeId;
          });
          const modernVeinId = vein.id === "Cu1" ? "m-cu" : vein.id;
          paths.push({ veinId: modernVeinId, nodeIds });
          if (!presets.some((preset) => preset.id === modernVeinId)) {
            setCustomVeins((current) => current.some((item) => item.id === modernVeinId) ? current : [...current, {
              id: modernVeinId,
              label: vein.label || modernVeinId,
              fullName: vein.fullName || "Imported custom structure",
              symbolMeaning: vein.symbolMeaning || `${modernVeinId} · imported label`,
              plainMeaning: vein.plainMeaning || "custom structure imported from a previous EntoWing map",
              group: vein.group || "custom",
              color: vein.color || "#7b6f5d",
              note: vein.note || "Imported from a user-reviewed EntoWing map; verify terminology against its original source.",
            }]);
          }
        });
        if (!paths.length) throw new Error("No reusable vein paths were found in this map.");
        const template: WingTemplate = { id: `custom-${Date.now()}`, name: file.name.replace(/\.entowing\.json$|\.json$/i, ""), taxon: "Your reusable EntoWing map", note: "Imported from a previous annotation. Its labels and homologies are preserved as user-supplied data.", nodes, paths };
        persistCustomTemplate(template);
        setSelectedTemplateId(template.id);
        setTemplateStatus(`${template.name} added to the template library. Press “Place template” to fit it over this wing.`);
      } catch (error) {
        setTemplateStatus(error instanceof Error ? error.message : "Could not read this template map.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function loadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        setWingImage({ src, name: file.name, width: img.naturalWidth, height: img.naturalHeight, isLocal: true });
        setCanvasView({ x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight });
        touchPointersRef.current.clear();
        touchTapRef.current.clear();
        pinchStartRef.current = null;
        setMap({});
        setSelectedVeinId(null);
        setMapperPreview(false);
        setAutoCandidates([]);
        setSelectedAutoIds([]);
        setManualAddMode(true);
        setGuidedMode(false);
        setGuidedAnchors([]);
        setGuidedRunning(false);
        setGuidedStatus("Choose a vein, then place two anchors for Guided Trace.");
        setDraftHypotheses({});
        setPlacedTemplate(null);
        setTemplateNodes({});
        setTemplateUndoStack([]);
        setTemplateEditMode(true);
        setTemplateDraggingNode(null);
        setTemplateStatus("Photo ready. Choose a template and place its shared junctions over the specimen.");
        setWholeDraftStatus("Ready to propose a rough whole-wing topology.");
        setAutoStatus("Ready to make an automatic SVG draft.");
        setMode("mapper");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function resetToReference() {
    setWingImage({ src: referenceImage, name: "Eristalis-reference.jpg", width: 560, height: 246, isLocal: false });
    setSelectedTemplateId("eristalis-reviewed");
    setCanvasView({ x: 0, y: 0, width: 560, height: 246 });
    touchPointersRef.current.clear();
    touchTapRef.current.clear();
    pinchStartRef.current = null;
    setMap({});
    setSelectedVeinId(null);
    setMapperPreview(false);
    setAutoCandidates([]);
    setSelectedAutoIds([]);
    setManualAddMode(true);
    setGuidedMode(false);
    setGuidedAnchors([]);
    setGuidedRunning(false);
    setGuidedStatus("Guided Trace works on photos you load from your device.");
    setDraftHypotheses({});
    setPlacedTemplate(null);
    setTemplateNodes({});
    setTemplateUndoStack([]);
    setTemplateEditMode(true);
    setTemplateDraggingNode(null);
    setTemplateStatus("Choose an anatomical archetype, place it over the reference, then drag shared junctions into position.");
    setWholeDraftStatus("Whole-wing draft works on photos you load from your device.");
    setAutoStatus("Auto Trace works on photos you load from your device.");
    setMode("mapper");
  }

  function runAutoTrace() {
    if (!wingImage.isLocal || autoRunning || wholeDraftRunning) {
      if (!wingImage.isLocal) setAutoStatus("Load your own JPG, PNG or WEBP first — the reference plate stays read-only for Auto Trace.");
      return;
    }
    setAutoRunning(true);
    setSelectedAutoIds([]);
    setManualAddMode(false);
    setGuidedMode(false);
    setGuidedAnchors([]);
    setAutoStatus("Looking for dark linear structures…");
    window.setTimeout(async () => {
      try {
        const candidates = await makeAutoTrace(wingImage.src, wingImage.width, wingImage.height, autoSensitivity);
        setAutoCandidates(candidates);
        setAutoStatus(candidates.length ? `${candidates.length} SVG draft pieces found. Click every piece that belongs to one vein, then join them.` : "No stable line segments found. Try higher sensitivity or a higher-contrast wing image.");
      } catch (error) {
        setAutoCandidates([]);
        setAutoStatus(error instanceof Error ? error.message : "Auto Trace could not process this image.");
      } finally {
        setAutoRunning(false);
      }
    }, 40);
  }

  function runWholeWingDraft() {
    if (!wingImage.isLocal || wholeDraftRunning) {
      if (!wingImage.isLocal) setWholeDraftStatus("Load your own wing photo first. Whole-wing reconstruction needs local pixel access.");
      return;
    }
    setWholeDraftRunning(true);
    setSelectedAutoIds([]);
    setGuidedMode(false);
    setGuidedAnchors([]);
    setMapperPreview(false);
    setManualAddMode(false);
    setWholeDraftStatus("Detecting the network, grouping likely continuations, and proposing vein identities…");
    window.setTimeout(async () => {
      try {
        const candidates = await makeAutoTrace(wingImage.src, wingImage.width, wingImage.height, autoSensitivity);
        const draft = approximateWholeWingDraft(candidates, wingImage.width, wingImage.height, anteriorAtTop, baseSide);
        const applied = draft.assignments.filter((assignment) => (map[assignment.veinId]?.length ?? 0) < 2);
        setMap((current) => {
          const next = { ...current };
          applied.forEach((assignment) => { next[assignment.veinId] = assignment.points; });
          return next;
        });
        setDraftHypotheses((current) => ({ ...current, ...Object.fromEntries(applied.map((assignment) => [assignment.veinId, assignment.confidence])) }));
        setAutoCandidates(draft.leftovers);
        if (applied[0]) setActiveVeinId(applied[0].veinId);
        setWholeDraftStatus(applied.length ? `${applied.length} editable vein hypotheses placed. ≈ means “machine suggestion”: drag a point or retrace a vein to mark it as reviewed. ${draft.leftovers.length} unassigned fragments remain available.` : "No new stable vein hypotheses could be placed. Try higher sensitivity or check the wing orientation controls.");
        setManualAddMode(true);
      } catch (error) {
        setWholeDraftStatus(error instanceof Error ? error.message : "Whole-wing reconstruction could not process this image.");
        setManualAddMode(true);
      } finally {
        setWholeDraftRunning(false);
      }
    }, 40);
  }

  function toggleAutoCandidate(id: string) {
    setSelectedAutoIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setMapperPreview(false);
  }

  function growAutoSelection() {
    if (!selectedAutoIds.length) return;
    const grown = growCandidateSelection(selectedAutoIds, autoCandidates, Math.max(8, wingImage.width * .022));
    setSelectedAutoIds(grown);
    setAutoStatus(grown.length > selectedAutoIds.length ? `Extended selection from ${selectedAutoIds.length} to ${grown.length} likely continuation pieces. Tap any wrong piece to remove it.` : "No confident continuation found. Select the next piece manually.");
  }

  function acceptAutoCandidates() {
    const selected = autoCandidates.filter((item) => selectedAutoIds.includes(item.id));
    if (!selected.length) return;
    const stitched = stitchCandidates(selected);
    setMap((current) => ({ ...current, [activeVeinId]: stitched }));
    setDraftHypotheses((current) => {
      const next = { ...current };
      delete next[activeVeinId];
      return next;
    });
    setAutoCandidates((current) => current.filter((item) => !selectedAutoIds.includes(item.id)));
    if (autoCandidates.length === selected.length) setManualAddMode(true);
    setSelectedAutoIds([]);
    setMapperPreview(false);
    setAutoStatus(`${selected.length} draft ${selected.length === 1 ? "piece" : "pieces"} joined as ${activeVein.label}. Every control point can now be dragged.`);
  }

  function discardAutoCandidates() {
    if (!selectedAutoIds.length) return;
    if (autoCandidates.length === selectedAutoIds.length) setManualAddMode(true);
    setAutoCandidates((current) => current.filter((item) => !selectedAutoIds.includes(item.id)));
    setSelectedAutoIds([]);
  }

  function undoPoint() {
    setMap((current) => ({ ...current, [activeVeinId]: (current[activeVeinId] ?? []).slice(0, -1) }));
  }

  function clearVein() {
    setMap((current) => ({ ...current, [activeVeinId]: [] }));
    setDraftHypotheses((current) => {
      const next = { ...current };
      delete next[activeVeinId];
      return next;
    });
  }

  function finishVein() {
    const currentIndex = allVeins.findIndex((vein) => vein.id === activeVeinId);
    const following = [...allVeins.slice(currentIndex + 1), ...allVeins.slice(0, currentIndex)].find((vein) => (map[vein.id]?.length ?? 0) < 2);
    if (following) setActiveVeinId(following.id);
  }

  function addCustomVein() {
    const trimmed = customName.trim();
    if (!trimmed) return;
    const base = trimmed.replace(/[^a-zA-Z0-9+_-]/g, "-") || "custom";
    let id = base;
    let suffix = 2;
    while (allVeins.some((vein) => vein.id === id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    const newVein: VeinDefinition = { id, label: trimmed, fullName: trimmed, symbolMeaning: `${trimmed} = custom structure`, plainMeaning: "a user-defined structure", group: "custom", color: "#526a58", note: "Custom structure annotated on this specimen." };
    setCustomVeins((current) => [...current, newVein]);
    setActiveVeinId(id);
    setCustomName("");
  }

  function enterAtlas() {
    setMapperPreview(false);
    setSelectedVeinId(mappedVeins[0]?.id ?? null);
    setMode("atlas");
  }

  function enterLearn() {
    const first = mappedVeins[0];
    setMode("learn");
    setSelectedVeinId(null);
    if (first) {
      setQuizTarget(first.id);
      setQuizMessage(`Find ${first.label} on the wing.`);
    } else {
      setQuizTarget(null);
      setQuizMessage("Map at least two veins to start a quiz.");
    }
  }

  function chooseAtlasVein(id: string) {
    if (mode === "learn" && quizTarget) {
      if (id === quizTarget) {
        const alternatives = mappedVeins.filter((vein) => vein.id !== id);
        const next = alternatives.length ? alternatives[Math.floor(Math.random() * alternatives.length)] : mappedVeins[0];
        setQuizTarget(next?.id ?? null);
        setQuizMessage(next ? `Correct! Now find ${next.label}.` : `Correct — ${id}.`);
      } else {
        setQuizMessage(`That was ${id}. Try again: find ${quizTarget}.`);
      }
      return;
    }
    setSelectedVeinId(id);
  }

  function exportJson() {
    const payload = {
      schema: "entowing-wing-map/0.2",
      image: { fileName: wingImage.name, width: wingImage.width, height: wingImage.height },
      veins: mappedVeins.map((vein) => ({ ...vein, points: map[vein.id], path: smoothPath(map[vein.id]) })),
    };
    downloadText(`${wingImage.name.replace(/\.[^.]+$/, "") || "wing"}.entowing.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function exportSvg() {
    const paths = mappedVeins.map((vein) => `  <path id="${escapeXml(vein.id)}" data-label="${escapeXml(vein.label)}" d="${smoothPath(map[vein.id])}" fill="none" stroke="${vein.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join("\n");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wingImage.width} ${wingImage.height}" width="${wingImage.width}" height="${wingImage.height}">\n  <image href="${escapeXml(wingImage.src)}" x="0" y="0" width="${wingImage.width}" height="${wingImage.height}"/>\n  <g id="entowing-venation">\n${paths}\n  </g>\n</svg>`;
    downloadText(`${wingImage.name.replace(/\.[^.]+$/, "") || "wing"}-annotated.svg`, svg, "image/svg+xml");
  }

  function openFamilyWingInMapper(familyId: string, familyWing: FamilyWingTemplate) {
    // Use the exact morphotype selected in the atlas. v0.34 forced every Syrphidae
    // selection back to Eristalis here, which defeated the new family variation.
    // Also replace the Eristalis photo background with a neutral workspace canvas,
    // otherwise every family morphotype appears to have "turned back into" Eristalis.
    const source: WingTemplate = {
      ...familyWing,
      paths: familyWing.paths.map((path) => ({ ...path, veinId: path.veinId === "vena spuria" ? "sv" : path.veinId, nodeIds: [...path.nodeIds] })),
      nodes: Object.fromEntries(Object.entries(familyWing.nodes).map(([id, point]) => [id, { ...point }])),
    };
    const prepared = withSharedJunctionCorners(source);
    const targetWidth = Math.max(560, prepared.referenceSize?.width ?? 560);
    const targetHeight = Math.max(320, prepared.referenceSize?.height ?? Math.round(targetWidth * .56));
    const neutralWorkspace = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}"><rect width="100%" height="100%" fill="#f6f2e8"/><path d="M 28 ${Math.round(targetHeight * .68)} Q ${Math.round(targetWidth * .34)} ${Math.round(targetHeight * .12)}, ${Math.round(targetWidth * .95)} ${Math.round(targetHeight * .38)}" fill="none" stroke="#d7d0c0" stroke-width="2" stroke-dasharray="8 8" opacity=".9"/></svg>`)}`;
    if (familyId !== "syrphidae" || familyWing.morphotypeId !== "eristalis") persistCustomTemplate(prepared);
    setWingImage({
      src: neutralWorkspace,
      name: `${prepared.name}.workspace.svg`,
      width: targetWidth,
      height: targetHeight,
      isLocal: false,
    });
    setMap({});
    setCanvasView({ x: 0, y: 0, width: targetWidth, height: targetHeight });
    setSelectedTemplateId(prepared.id);
    setPlacedTemplate(prepared);
    setTemplateNodes(fitTemplateNodes(prepared, targetWidth, targetHeight));
    setActiveVeinId(prepared.paths[0]?.veinId ?? "R4+5");
    setSelectedTemplateNodeId(null);
    setTemplateEditTool("drag");
    setTemplateEditMode(true);
    setTemplateUndoStack([]);
    setTemplateStatus(`${prepared.name} loaded from the evolutionary atlas. The Mapper now opens on a neutral workspace so this family wing is no longer visually collapsed back onto the Eristalis photo.`);
    setMapperPreview(false);
    setMode("mapper");
    window.setTimeout(() => document.querySelector(".mapper-shell")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  return (
    <main className="atlas-shell" data-visual-theme={visualTheme}>
      <header className="topbar">
        <button className="brand brand-button" onClick={() => setMode("atlas")} aria-label="EntoWing atlas home">
          <span className="brand-mark" aria-hidden="true">EW</span>
          <span><strong>EntoWing</strong><small>Interactive Diptera Wing Atlas</small></span>
        </button>
        <nav className="nav-pills" aria-label="EntoWing modes">
          <button className={mode === "atlas" ? "active" : ""} onClick={enterAtlas}>Atlas</button>
          <button className={mode === "mapper" ? "active" : ""} onClick={() => setMode("mapper")}>Wing Mapper</button>
          <button className={mode === "learn" ? "active" : ""} onClick={enterLearn}>Learn</button>
          <button className="soft-disabled" title="Planned next">Compare <sup>soon</sup></button>
        </nav>
        <div className="topbar-meta">
          <div className="theme-toggle" role="group" aria-label="Atlas visual theme">
            <button
              type="button"
              className={visualTheme === "scientific" ? "active" : ""}
              aria-pressed={visualTheme === "scientific"}
              onClick={() => setVisualTheme("scientific")}
            >
              <span aria-hidden="true">⌁</span> Scientific
            </button>
            <button
              type="button"
              className={visualTheme === "nocturnal" ? "active" : ""}
              aria-pressed={visualTheme === "nocturnal"}
              onClick={() => setVisualTheme("nocturnal")}
            >
              <span aria-hidden="true">✦</span> Nocturnal
            </button>
          </div>
          <div className="version-chip">Research atlas · v0.35</div>
        </div>
      </header>

      {mode === "atlas" ? (
        <PhyloAtlas onOpenMapper={openFamilyWingInMapper} />
      ) : mode === "mapper" ? (
        <>
          <section className="intro mapper-intro">
            <div>
              <p className="eyebrow">WING MAPPER · SPECIMEN-TRUE OVERLAYS</p>
              <h1>Trace what is really there.</h1>
            </div>
            <p className="intro-copy">Align a topology-aware wing template to the real specimen, warp shared junctions, then refine individual veins from the photograph. Anatomy guides the pixels — not the other way around.</p>
          </section>

          <section className="mapper-shell" aria-label="Wing annotation editor">
            <aside className="mapper-sidebar mapper-preflight" id="mapper-setup">
              <div className="mapper-setup-heading">
                <div>
                  <span className="tool-kicker">SETUP & TRACE</span>
                  <strong>Prepare the wing once.</strong>
                  <p>Load, place a template, and trace here. When you are ready to refine the venation, scroll down — this whole setup area stays behind.</p>
                </div>
                <a href="#wing-workspace">WORKSPACE ↓</a>
              </div>
              <div className="mapper-side-section image-source">
                <span className="tool-kicker">01 · IMAGE</span>
                <label className="primary-upload">
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={loadImage} />
                  <span className="upload-icon">＋</span>
                  <span><strong>Load wing photo</strong><small>JPG · PNG · WEBP</small></span>
                </label>
                <button className="text-button" onClick={resetToReference}>Use Eristalis reference plate</button>
                <div className="template-card">
                  <div className="template-title"><span>TEMPLATE MAPPER · v0.18</span><b>2023 NOMENCLATURE</b></div>
                  <p>Start from known wing topology instead of asking pixels to invent anatomy. Align the graph first; refine the specimen second.</p>
                  <label className="template-select-label">
                    <span>Alignment archetype</span>
                    <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                      <optgroup label="Built-in templates">
                        {builtInTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                      </optgroup>
                      {!!customTemplates.length && <optgroup label="My Templates · this device">
                        {customTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                      </optgroup>}
                    </select>
                  </label>
                  <div className="template-meta"><strong>{selectedTemplate.taxon}</strong><span>{selectedTemplate.note}</span></div>
                  <button className="template-place-button" onClick={placeSelectedTemplate}>◇ Place template over wing</button>
                  <label className="template-import">
                    <input type="file" accept="application/json,.json" onChange={loadTemplateMap} />
                    ＋ Import .entowing-template.json or map
                  </label>
                  {placedTemplate && <div className="template-controls">
                    <div className="template-control-title"><span>ALIGN · {placedTemplate.name}</span><b>{templateEditMode ? "JUNCTION EDIT" : "ANNOTATION EDIT"}</b></div>
                    <div className="template-nudge" aria-label="Template alignment controls">
                      <button aria-label="Move template left" onClick={() => shiftTemplate(-wingImage.width * .02, 0)}>←</button>
                      <button aria-label="Move template up" onClick={() => shiftTemplate(0, -wingImage.height * .035)}>↑</button>
                      <button aria-label="Move template down" onClick={() => shiftTemplate(0, wingImage.height * .035)}>↓</button>
                      <button aria-label="Move template right" onClick={() => shiftTemplate(wingImage.width * .02, 0)}>→</button>
                      <button aria-label="Scale template down" onClick={() => scaleTemplate(.94)}>− size</button>
                      <button aria-label="Scale template up" onClick={() => scaleTemplate(1.06)}>＋ size</button>
                      <button aria-label="Rotate template counter-clockwise" onClick={() => rotateTemplate(-2)}>↶ 2°</button>
                      <button aria-label="Rotate template clockwise" onClick={() => rotateTemplate(2)}>↷ 2°</button>
                    </div>
                    <div className="template-secondary-actions">
                      <button onClick={mirrorTemplate}>⇋ Mirror</button>
                      <button onClick={resetTemplateFit}>Reset fit</button>
                    </div>
                    <label className="template-opacity"><span>Overlay opacity</span><input type="range" min="20" max="100" value={Math.round(templateOpacity * 100)} onChange={(event) => setTemplateOpacity(Number(event.target.value) / 100)} /></label>
                    <div className="template-point-editor">
                      <div className="point-editor-title"><span>POINT EDITOR</span><b>{activeVein.label}</b></div>
                      <div className="point-tool-grid">
                        <button className={templateEditTool === "drag" ? "active" : ""} onClick={() => chooseTemplateEditTool("drag")}>↔ Drag</button>
                        <button className={templateEditTool === "insert" ? "active" : ""} onClick={() => chooseTemplateEditTool("insert")}>＋ Insert</button>
                        <button className={templateEditTool === "delete" ? "active" : ""} onClick={() => chooseTemplateEditTool("delete")}>− Delete</button>
                        <button className={templateEditTool === "join" ? "active" : ""} onClick={() => chooseTemplateEditTool("join")}>⌁ Join</button>
                      </div>
                      <small>{templateEditTool === "drag" ? "Drag any dot to shape the vein." : templateEditTool === "insert" ? "Tap a coloured vein to add a bend point." : templateEditTool === "delete" ? "Tap an unwanted point. A 2-endpoint vein is removed as a whole; shared nodes stay on neighbouring veins." : templateJoinNodeId ? "1/2 selected · tap the point it should connect to." : "Tap two points on different veins to connect them."}</small>
                    </div>
                    <button className={`template-warp-button ${templateEditMode ? "active" : ""}`} onClick={() => { const next = !templateEditMode; setTemplateEditMode(next); setManualAddMode(!next); setTemplateEditTool("drag"); setTemplateJoinNodeId(null); setTemplateCrossveinNodeId(null); }}>{templateEditMode ? "◇ Editing template points" : "✎ Editing final annotation"}</button>
                    <button className="template-apply-button" onClick={applyTemplateToMap}>Use aligned template as annotation</button>
                    <button className="template-magnet-button" disabled={!wingImage.isLocal || templateMagneticRunning} onClick={magneticFitActiveTemplateVein}>{templateMagneticRunning ? "Following the photograph…" : `⌁ Magnetic fit selected ${activeVein.label}`}</button>
                  </div>}
                  <div className="template-save-box">
                    <span>SAVE / SHARE YOUR TRACING</span>
                    <div><input value={templateSaveName} onChange={(event) => setTemplateSaveName(event.target.value)} placeholder="Template name…" aria-label="Template name" /><button onClick={saveTracingAsTemplate} disabled={!mappedVeins.length && !(placedTemplate && Object.keys(templateNodes).length)}>Save</button></div>
                    <button className="template-download-button" onClick={exportReusableTemplate} disabled={!mappedVeins.length && !(placedTemplate && Object.keys(templateNodes).length)}>↓ Download template file</button>
                    <small>Save keeps it on this device. Download creates a small shareable file with points, vein labels and connections — never the wing photo. Send that file to me and I can build your reviewed tracing into EntoWing.</small>
                  </div>
                  <small>{templateStatus}</small>
                  <em>Template names constrain geometry; they do not identify your specimen. Shared junctions stay connected while you warp the overlay.</em>
                </div>
                <details className="legacy-auto">
                  <summary>Advanced · pixel-only Auto Trace</summary>
                  <div className="auto-trace-card">
                    <div className="auto-trace-title"><span>FREE AUTO TRACE · LEGACY</span><b>PIXELS ONLY</b></div>
                    <p>Find likely dark linear structures, select all pieces of one vein, then join them into one editable SVG path.</p>
                    <label className="sensitivity-row">
                      <span>Sensitivity <b>{autoSensitivity}</b></span>
                      <input type="range" min="20" max="90" value={autoSensitivity} onChange={(event) => setAutoSensitivity(Number(event.target.value))} disabled={autoRunning || wholeDraftRunning} />
                    </label>
                    <button className="auto-trace-button" onClick={runAutoTrace} disabled={!wingImage.isLocal || autoRunning || wholeDraftRunning}>{autoRunning ? "Tracing…" : "✦ Make SVG draft"}</button>
                    <small className="auto-status">{autoStatus}</small>
                    {!!autoCandidates.length && <button className="clear-auto" onClick={() => { setAutoCandidates([]); setSelectedAutoIds([]); setManualAddMode(true); setAutoStatus("Draft cleared. Manual point editing is active."); }}>Clear draft network</button>}
                  </div>
                </details>
                <p className="privacy-note">Your image stays in this browser session unless you export it.</p>
              </div>

              <div className="mapper-side-section vein-palette">
                <div className="tool-title-row"><span className="tool-kicker">02 · CHOOSE STRUCTURE</span><span>{mappedVeins.length}/{allVeins.length}</span></div>
                <div className="vein-grid">
                  {allVeins.map((vein) => {
                    const count = map[vein.id]?.length ?? 0;
                    return (
                      <button key={vein.id} title={vein.symbolMeaning} className={activeVeinId === vein.id ? "active" : ""} disabled={guidedRunning || wholeDraftRunning} onClick={() => { setActiveVeinId(vein.id); setMapperPreview(false); setGuidedMode(false); setGuidedAnchors([]); setManualAddMode(true); }}>
                        <i style={{ background: vein.color }} />
                        <span>{vein.label}</span>
                        <small className={draftHypotheses[vein.id] !== undefined ? "hypothesis" : count >= 2 ? "complete" : ""}>{draftHypotheses[vein.id] !== undefined ? "≈" : count >= 2 ? "✓" : count || "–"}</small>
                      </button>
                    );
                  })}
                </div>
                <div className="custom-vein-row">
                  <input value={customName} onChange={(event) => setCustomName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addCustomVein(); }} placeholder="Custom label…" aria-label="Custom vein label" />
                  <button onClick={addCustomVein}>Add</button>
                </div>
                <details className="notation-key">
                  <summary>Modern Syrphidae nomenclature · 2023</summary>
                  <dl>
                    <div><dt>C</dt><dd><b>Costa</b><span>leading-edge vein</span></dd></div>
                    <div><dt>Sc</dt><dd><b>Subcosta</b><span>vein just behind Costa</span></dd></div>
                    <div><dt>R</dt><dd><b>Radius</b><span>major longitudinal system behind Sc; a vein-system name, not “radial symmetry”</span></dd></div>
                    <div><dt>M</dt><dd><b>Media</b><span>middle longitudinal system behind Radius</span></dd></div>
                    <div><dt>Cu</dt><dd><b>Cubitus</b><span>longitudinal system behind Media</span></dd></div>
                    <div><dt>A</dt><dd><b>Anal</b><span>veins of the posterior/anal region</span></dd></div>
                  </dl>
                  <small>Primary terminology: van Steenis, Miranda, Tot, Mengual & Skevington (2023), following the modern wing system adopted from Cumming & Wood. Older names are shown as aliases instead of silently mixed into the template. <a href="https://doi.org/10.55710/1.AIMS1978" target="_blank" rel="noreferrer">Source ↗</a></small>
                </details>
              </div>

              <div className="mapper-side-section current-tool">
                <span className="tool-kicker">03 · TRACE</span>
                <div className="active-vein-name"><i style={{ background: activeVein.color }} /><div><strong>{activeVein.label}</strong><small>{activeVein.fullName}</small></div></div>
                <div className="vein-meaning-card">
                  <strong>{activeVein.symbolMeaning}</strong>
                  <span>{activeVein.plainMeaning}</span>
                  {activeVein.legacyAlias && <em>Historical alias: {activeVein.legacyAlias}</em>}
                  <p>{activeVein.note}</p>
                  {draftHypotheses[activeVein.id] !== undefined && <div className="active-hypothesis"><span>≈ suggested · {Math.round(draftHypotheses[activeVein.id] * 100)}% geometric confidence</span><button onClick={() => setDraftHypotheses((current) => { const next = { ...current }; delete next[activeVein.id]; return next; })}>✓ Accept label as reviewed</button></div>}
                </div>
                <div className={`guided-trace-card ${guidedMode ? "active" : ""}`}>
                  <div className="guided-title"><span>GUIDED TRACE · NEW</span><b>{guidedAnchors.length}/2 anchors</b></div>
                  <p>{guidedStatus}</p>
                  {!guidedMode ? (
                    <button className="guided-start" onClick={startGuidedTrace} disabled={!wingImage.isLocal || guidedRunning || wholeDraftRunning}>{guidedRunning ? "Following vein…" : `◎ Start → End for ${activeVein.label}`}</button>
                  ) : (
                    <div className="guided-actions">
                      <span className={guidedAnchors.length >= 1 ? "done" : ""}>1 · START</span>
                      <span className={guidedAnchors.length >= 2 ? "done" : ""}>2 · END</span>
                      <button onClick={cancelGuidedTrace} disabled={guidedRunning}>Cancel</button>
                    </div>
                  )}
                </div>
                {selectedAutoIds.length ? (
                  <div className="auto-selection">
                    <span>BUILD ONE WHOLE VEIN</span>
                    <strong>{selectedAutoIds.length} {selectedAutoIds.length === 1 ? "piece" : "pieces"} selected</strong>
                    <p>Tap more green pieces that belong to <b>{activeVein.label}</b>. Orange pieces will be joined into one path.</p>
                    <div className="auto-selection-actions">
                      <button onClick={acceptAutoCandidates}>Join & use as {activeVein.label}</button>
                      <button onClick={growAutoSelection}>Grow selection</button>
                      <button onClick={() => setSelectedAutoIds([])}>Unselect</button>
                      <button onClick={discardAutoCandidates}>Discard pieces</button>
                    </div>
                  </div>
                ) : <p>{autoCandidates.length ? "Tap the first green piece of a vein. Then add its other pieces — you are no longer limited to one fragment." : "Click along the centre of the vein. Existing control points can always be dragged to a better position."}</p>}
                <div className="edit-actions">
                  <button onClick={undoPoint} disabled={!map[activeVeinId]?.length || guidedMode}>↶ Undo point</button>
                  <button onClick={clearVein} disabled={!map[activeVeinId]?.length || guidedMode}>Clear vein</button>
                </div>
                {!guidedMode && <button className={`manual-mode-button ${manualAddMode ? "active" : ""}`} onClick={() => setManualAddMode((current) => !current)}>{manualAddMode ? "＋ Manual point add · ON" : "✦ Auto-piece selection · ON"}</button>}
                <button className="finish-button" onClick={finishVein} disabled={(map[activeVeinId]?.length ?? 0) < 2 || guidedMode}>Finish vein →</button>
              </div>
            </aside>

            <div className="mapper-main" id="wing-workspace">
              <aside className="active-vein-dock" aria-label={`Currently editing ${activeVein.label}`}>
                <div className="active-vein-dock-title">
                  <span className="tool-kicker">ACTIVE VEIN</span>
                  <small>changes when you tap a vein</small>
                </div>
                <div className="active-vein-name active-vein-name-dock">
                  <i style={{ background: activeVein.color }} />
                  <div><strong>{activeVein.label}</strong><small>{activeVein.fullName}</small></div>
                </div>
                <div className="vein-meaning-card vein-dock-meaning">
                  <strong>{activeVein.symbolMeaning}</strong>
                  <span>{activeVein.plainMeaning}</span>
                  {activeVein.legacyAlias && <em>Historical alias: {activeVein.legacyAlias}</em>}
                  <p>{activeVein.note}</p>
                </div>
                <div className="vein-dock-stats">
                  <div><span>PATH</span><b>{activeTemplatePath?.nodeIds.length ?? map[activeVeinId]?.length ?? 0} points</b></div>
                  <div><span>CURVE</span><b>{selectedTemplateNodeId ? selectedCurveMode : "tap a point"}</b></div>
                </div>
                {selectedTemplateNodeId && <div className="selected-point-note"><span>SELECTED POINT</span><b>{selectedTemplateNodeId}</b><small>Use Smooth / Corner / Handles in the toolbar above the wing.</small></div>}
                <div className="vein-dock-hint">Tap any coloured vein on the wing to make it active. Its name and anatomical meaning will stay here while you edit.</div>
                <a className="back-to-setup" href="#mapper-setup">↑ Setup & tracing</a>
              </aside>
              <div className="mapper-toolbar">
                <div className="image-meta"><strong>{wingImage.name}</strong><span>{wingImage.width} × {wingImage.height} px · {Math.round(canvasZoom * 100)}%</span></div>
                <div className="zoom-controls" aria-label="Wing canvas zoom">
                  <button onClick={() => zoomCanvas(.8)} disabled={canvasZoom <= 1.01} aria-label="Zoom out">−</button>
                  <span>{Math.round(canvasZoom * 100)}%</span>
                  <button onClick={() => zoomCanvas(1.25)} disabled={canvasZoom >= 11.9} aria-label="Zoom in">＋</button>
                  <button onClick={resetCanvasZoom} disabled={canvasZoom <= 1.01}>Fit</button>
                </div>
                <div className="mapper-toolbar-actions">
                  <button className={mapperPreview ? "active" : ""} disabled={guidedMode || guidedRunning} onClick={() => setMapperPreview((current) => !current)}>{mapperPreview ? "Edit points" : "Preview"}</button>
                  <button onClick={exportJson} disabled={!mappedVeins.length}>Export map</button>
                  <button onClick={exportSvg} disabled={!mappedVeins.length}>Export SVG</button>
                  <button className="atlas-button" onClick={enterAtlas} disabled={!mappedVeins.length}>Use in Atlas →</button>
                </div>
              </div>

              {placedTemplate && <div className="canvas-edit-strip" aria-label="Template editing tools">
                <div className="canvas-tool-group edit-group">
                  <span>EDIT · <b>{activeVein.label}</b></span>
                  <div>
                    <button className="undo-edit" disabled={!templateUndoStack.length} title="Undo last edit · Ctrl/Cmd + Z" aria-label="Undo last template edit" onClick={undoTemplateAction}>↶ Undo</button>
                    <button className={templateEditTool === "drag" && templateEditMode ? "active" : ""} onClick={() => chooseTemplateEditTool("drag")}>↔ Drag</button>
                    <button className={templateEditTool === "insert" && templateEditMode ? "active" : ""} onClick={() => chooseTemplateEditTool("insert")}>＋ Insert</button>
                    <button className={templateEditTool === "delete" && templateEditMode ? "active danger" : ""} onClick={() => chooseTemplateEditTool("delete")}>− Delete</button>
                    <button className={templateEditTool === "join" && templateEditMode ? "active" : ""} onClick={() => chooseTemplateEditTool("join")}>⌁ Join</button>
                  </div>
                </div>
                <div className="canvas-tool-group curve-group">
                  <span>{selectedTemplateNodeId ? "CURVE · SELECTED POINT" : "CURVE · TAP A POINT"}</span>
                  <div>
                    <button disabled={!selectedTemplateNodeId} className={selectedTemplateNodeId && selectedCurveMode === "smooth" ? "active" : ""} onClick={() => setSelectedPointCurveMode("smooth")}>∿ Smooth</button>
                    <button disabled={!selectedTemplateNodeId} className={selectedTemplateNodeId && selectedCurveMode === "corner" ? "active" : ""} onClick={() => setSelectedPointCurveMode("corner")}>⌞ Corner</button>
                    <button disabled={!selectedTemplateNodeId} className={selectedTemplateNodeId && selectedCurveMode === "bezier" ? "active" : ""} onClick={() => setSelectedPointCurveMode("bezier")}>◇ Handles</button>
                  </div>
                </div>
                <div className="canvas-crossvein-tool">
                  <span>NEW CROSSVEIN</span>
                  <div>
                    <input
                      aria-label="New crossvein name"
                      value={templateCrossveinLabel}
                      onChange={(event) => setTemplateCrossveinLabel(event.target.value)}
                      onKeyDown={(event) => { if (event.key === "Enter") chooseTemplateEditTool("crossvein"); }}
                      placeholder="name · e.g. h"
                    />
                    <button className={templateEditTool === "crossvein" && templateEditMode ? "active" : ""} onClick={() => chooseTemplateEditTool("crossvein")}>↗ Crossvein</button>
                  </div>
                  <small>{templateEditTool === "crossvein" && templateCrossveinNodeId ? "1 / 2 · tap the second point" : "name → tap two existing points"}</small>
                </div>
                <div className="canvas-tool-group move-group">
                  <span>MOVE TEMPLATE</span>
                  <div>
                    <button aria-label="Move template left" onClick={() => shiftTemplate(-wingImage.width * .02, 0)}>←</button>
                    <button aria-label="Move template up" onClick={() => shiftTemplate(0, -wingImage.height * .035)}>↑</button>
                    <button aria-label="Move template down" onClick={() => shiftTemplate(0, wingImage.height * .035)}>↓</button>
                    <button aria-label="Move template right" onClick={() => shiftTemplate(wingImage.width * .02, 0)}>→</button>
                  </div>
                </div>
                <div className="canvas-tool-group shape-group">
                  <span>SHAPE</span>
                  <div>
                    <button onClick={() => scaleTemplate(.94)}>− size</button>
                    <button onClick={() => scaleTemplate(1.06)}>＋ size</button>
                    <button onClick={() => rotateTemplate(-2)}>↶ 2°</button>
                    <button onClick={() => rotateTemplate(2)}>↷ 2°</button>
                    <button onClick={mirrorTemplate}>⇋ Mirror</button>
                    <button onClick={resetTemplateFit}>Reset</button>
                  </div>
                </div>
                <label className="canvas-opacity">
                  <span>OPACITY · {Math.round(templateOpacity * 100)}%</span>
                  <input aria-label="Template overlay opacity" type="range" min="20" max="100" value={Math.round(templateOpacity * 100)} onChange={(event) => setTemplateOpacity(Number(event.target.value) / 100)} />
                </label>
                <div className="canvas-tool-actions">
                  <button className="magnet" disabled={!wingImage.isLocal || templateMagneticRunning} onClick={magneticFitActiveTemplateVein}>{templateMagneticRunning ? "Following…" : `⌁ Fit ${activeVein.label}`}</button>
                  <button className="apply" onClick={applyTemplateToMap}>Use as annotation →</button>
                </div>
              </div>}

              <div className={`mapper-canvas-wrap ${mapperPreview ? "is-preview" : ""} ${guidedMode ? "is-guided" : ""}`}>
                <svg
                  ref={svgRef}
                  className="mapper-svg"
                  viewBox={`${canvasView.x} ${canvasView.y} ${canvasView.width} ${canvasView.height}`}
                  onPointerDownCapture={(event) => beginTouchGesture(event.pointerId, event.clientX, event.clientY, event.pointerType)}
                  onPointerMoveCapture={(event) => moveTouchGesture(event.pointerId, event.clientX, event.clientY, event.pointerType)}
                  onPointerUpCapture={(event) => endTouchGesture(event.pointerId, event.clientX, event.clientY, event.pointerType)}
                  onPointerCancelCapture={(event) => endTouchGesture(event.pointerId, event.clientX, event.clientY, event.pointerType, true)}
                  onPointerDown={(event) => event.pointerType === "touch" ? registerCanvasTouchTap(event.pointerId, event.clientX, event.clientY, event.pointerType) : handleCanvasPointerDown(event.clientX, event.clientY)}
                  onPointerMove={(event) => { moveDraggedPoint(event.clientX, event.clientY); moveTemplateNode(event.clientX, event.clientY); moveTemplateHandle(event.clientX, event.clientY); }}
                  onPointerUp={() => { setDragging(null); setTemplateDraggingNode(null); setTemplateDraggingHandle(null); templateDragSnapshotTakenRef.current = false; }}
                  onPointerLeave={() => { setDragging(null); setTemplateDraggingNode(null); setTemplateDraggingHandle(null); templateDragSnapshotTakenRef.current = false; }}
                  role="img"
                  aria-label="Wing image annotation canvas"
                >
                  <image href={wingImage.src} x="0" y="0" width={wingImage.width} height={wingImage.height} preserveAspectRatio="xMidYMid meet" />
                  {placedTemplate && placedTemplate.paths.map((templatePath) => {
                    const points = templatePath.nodeIds.map((id) => templateNodes[id]).filter((point): point is Point => Boolean(point));
                    if (points.length < 2) return null;
                    const vein = allVeins.find((item) => item.id === templatePath.veinId);
                    const isActive = activeVeinId === templatePath.veinId;
                    const labelPoint = vein?.group === "crossvein"
                      ? { x: (points[0].x + points[points.length - 1].x) / 2, y: (points[0].y + points[points.length - 1].y) / 2 }
                      : points[Math.max(0, points.length - 2)];
                    return <g key={`template-${templatePath.veinId}`} className={`template-path-group ${isActive ? "active" : ""}`} style={{ opacity: templateOpacity }}>
                      <path d={smoothPath(points, templatePath.nodeIds, templatePath.curve)} fill="none" className="template-path-halo" vectorEffect="non-scaling-stroke" />
                      <path d={smoothPath(points, templatePath.nodeIds, templatePath.curve)} fill="none" stroke={vein?.color ?? "#8d7044"} className="template-path-line" vectorEffect="non-scaling-stroke" />
                      {!mapperPreview && <path d={smoothPath(points, templatePath.nodeIds, templatePath.curve)} fill="none" stroke="transparent" strokeWidth="16" vectorEffect="non-scaling-stroke" className="template-path-hit" onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.pointerType === "touch" && touchPointersRef.current.size > 1) return;
                        setActiveVeinId(templatePath.veinId);
                        if (templateEditMode && templateEditTool === "insert") insertTemplatePoint(templatePath, event.clientX, event.clientY);
                      }} />}
                      {!mapperPreview && templateEditMode && <text x={labelPoint.x + 5 / canvasZoom} y={labelPoint.y - 5 / canvasZoom} style={{ fontSize: `${10 / canvasZoom}px` }} className="template-vein-label">{vein?.label ?? templatePath.veinId}</text>}
                    </g>;
                  })}
                  {placedTemplate && !mapperPreview && templateEditMode && selectedTemplateNodeId && activeTemplatePath?.nodeIds.includes(selectedTemplateNodeId) && (() => {
                    const control = activeTemplatePath.curve?.[selectedTemplateNodeId];
                    const anchor = templateNodes[selectedTemplateNodeId];
                    const index = activeTemplatePath.nodeIds.indexOf(selectedTemplateNodeId);
                    if (!anchor || control?.mode !== "bezier") return null;
                    const handles = [
                      index > 0 && control.in ? { side: "in" as const, point: { x: anchor.x + control.in.dx, y: anchor.y + control.in.dy } } : null,
                      index < activeTemplatePath.nodeIds.length - 1 && control.out ? { side: "out" as const, point: { x: anchor.x + control.out.dx, y: anchor.y + control.out.dy } } : null,
                    ].filter((item): item is { side: "in" | "out"; point: Point } => Boolean(item));
                    return <g className="template-bezier-controls">
                      {handles.map((handle) => <g key={`handle-${handle.side}`}>
                        <line x1={anchor.x} y1={anchor.y} x2={handle.point.x} y2={handle.point.y} vectorEffect="non-scaling-stroke" />
                        <circle
                          cx={handle.point.x}
                          cy={handle.point.y}
                          r={5.5 / canvasZoom}
                          className="template-bezier-handle"
                          vectorEffect="non-scaling-stroke"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            if (event.pointerType === "touch" && touchPointersRef.current.size > 1) return;
                            event.currentTarget.setPointerCapture(event.pointerId);
                            rememberTemplateState();
                            setTemplateDraggingHandle({ veinId: activeTemplatePath.veinId, nodeId: selectedTemplateNodeId, side: handle.side });
                          }}
                        />
                      </g>)}
                    </g>;
                  })()}
                  {placedTemplate && !mapperPreview && templateEditMode && Object.entries(templateNodes).map(([nodeId, point]) => {
                    const ownerPaths = placedTemplate.paths.filter((path) => path.nodeIds.includes(nodeId));
                    const references = ownerPaths.length;
                    const shared = references > 1;
                    return <g
                      key={`template-node-${nodeId}`}
                      data-template-node-id={nodeId}
                      className={`${templateJoinNodeId === nodeId ? "join-source" : templateCrossveinNodeId === nodeId ? "crossvein-source" : ""} ${selectedTemplateNodeId === nodeId ? "curve-selected" : ""}`}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.pointerType === "touch" && touchPointersRef.current.size > 1) return;
                        if (templateEditTool === "delete") { deleteTemplatePoint(nodeId); return; }
                        if (templateEditTool === "join") { joinTemplatePoint(nodeId); return; }
                        if (templateEditTool === "crossvein") { createCrossveinToPoint(nodeId); return; }
                        if (templateEditTool === "insert") { setTemplateStatus("Tap the coloured vein line between points to insert a new bend point."); return; }
                        setSelectedTemplateNodeId(nodeId);
                        if (!ownerPaths.some((path) => path.veinId === activeVeinId) && ownerPaths[0]) setActiveVeinId(ownerPaths[0].veinId);
                        event.currentTarget.setPointerCapture(event.pointerId);
                        templateDragSnapshotTakenRef.current = false;
                        setTemplateDraggingNode(nodeId);
                      }}
                    >
                      <circle cx={point.x} cy={point.y} r={11 / canvasZoom} className="template-node-hit" />
                      <circle cx={point.x} cy={point.y} r={Math.max(shared ? 4.4 : 2.6, wingImage.width / (shared ? 175 : 260)) / canvasZoom} className={`template-node ${shared ? "shared" : "control"}`} vectorEffect="non-scaling-stroke" pointerEvents="none" />
                    </g>;
                  })}
                  {!mapperPreview && !guidedMode && autoCandidates.map((candidate) => {
                    const isSelected = selectedAutoIds.includes(candidate.id);
                    const draftPath = smoothPath(candidate.points);
                    return (
                      <g key={candidate.id} className={`auto-candidate-group ${isSelected ? "selected" : ""}`}>
                        <path d={draftPath} fill="none" vectorEffect="non-scaling-stroke" className="auto-candidate-visible" />
                        <path
                          d={draftPath}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="18"
                          vectorEffect="non-scaling-stroke"
                          className="auto-candidate-hit"
                          onPointerDown={(event) => { event.stopPropagation(); if (event.pointerType === "touch" && touchPointersRef.current.size > 1) return; toggleAutoCandidate(candidate.id); }}
                        />
                      </g>
                    );
                  })}
                  {allVeins.map((vein) => {
                    const points = map[vein.id] ?? [];
                    if (!points.length) return null;
                    const isActive = vein.id === activeVeinId;
                    return (
                      <g key={vein.id} className={`mapper-path-group ${isActive ? "active" : ""}`}>
                        <path d={smoothPath(points)} fill="none" stroke={vein.color} vectorEffect="non-scaling-stroke" className="mapped-path" />
                        {!mapperPreview && !guidedMode && <path
                          d={smoothPath(points)}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="15"
                          vectorEffect="non-scaling-stroke"
                          className="mapped-path-hit"
                          onPointerDown={(event) => { event.stopPropagation(); if (event.pointerType === "touch" && touchPointersRef.current.size > 1) return; setActiveVeinId(vein.id); }}
                        />}
                        {!mapperPreview && !guidedMode && points.map((point, pointIndex) => (
                          <circle
                            key={`${vein.id}-${pointIndex}`}
                            cx={point.x}
                            cy={point.y}
                            r={Math.max(isActive ? 4 : 3, wingImage.width / (isActive ? 175 : 220)) / canvasZoom}
                            vectorEffect="non-scaling-stroke"
                            className={`mapper-node ${isActive ? "active" : "inactive"}`}
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              if (event.pointerType === "touch" && touchPointersRef.current.size > 1) return;
                              event.currentTarget.setPointerCapture(event.pointerId);
                              setActiveVeinId(vein.id);
                              setDragging({ veinId: vein.id, pointIndex });
                            }}
                          />
                        ))}
                      </g>
                    );
                  })}
                  {!mapperPreview && guidedAnchors.map((anchor, index) => (
                    <g key={`guided-${index}`} className={`guided-anchor anchor-${index + 1}`} pointerEvents="none">
                      <circle cx={anchor.x} cy={anchor.y} r={Math.max(7, wingImage.width / 115) / canvasZoom} vectorEffect="non-scaling-stroke" />
                      <circle cx={anchor.x} cy={anchor.y} r={Math.max(2.5, wingImage.width / 360) / canvasZoom} vectorEffect="non-scaling-stroke" className="guided-anchor-core" />
                      <text x={anchor.x} y={anchor.y - Math.max(12, wingImage.width / 70) / canvasZoom} textAnchor="middle" fontSize={Math.max(10, wingImage.width / 95) / canvasZoom}>{index === 0 ? "START" : "END"}</text>
                    </g>
                  ))}
                </svg>
                {!mapperPreview && <div className={`canvas-hint ${guidedMode ? "guided-hint" : placedTemplate && templateEditMode ? "template-hint" : autoCandidates.length && !manualAddMode ? "auto-hint" : ""}`}><span>{guidedMode ? "◎" : placedTemplate && templateEditMode ? "◇" : autoCandidates.length && !manualAddMode ? "✦" : "+"}</span>{guidedMode ? guidedRunning ? ` Finding the likely route for ${activeVein.label}…` : guidedAnchors.length ? ` START set · tap the END of ${activeVein.label}` : ` Tap approximately at the START of ${activeVein.label}` : placedTemplate && templateEditMode ? " Template warp · drag circles onto the real junctions; shared nodes keep connected veins together" : selectedAutoIds.length ? ` ${selectedAutoIds.length} pieces selected · tap more or Join & use as ${activeVein.label}` : autoCandidates.length && !manualAddMode ? " Auto selection mode · tap green pieces without accidentally creating points" : " Drag any existing point · click empty wing area to extend the active vein"}</div>}
                {mapperPreview && <div className="canvas-hint preview-hint"><span>👁</span> Preview · nodes hidden</div>}
              </div>

              <div className="mapper-statusbar">
                <span><i className="status-dot" /> Same coordinate system: image + SVG</span>
                <span className="pinch-status">↔ 2-finger pinch · zoom + pan</span>
                <span>{mappedVeins.length} structures mapped</span>
                {!!Object.keys(draftHypotheses).length && <span>≈ {Object.keys(draftHypotheses).length} unreviewed hypotheses</span>}
                {placedTemplate && <span>◇ {placedTemplate.name} template</span>}
                {!!autoCandidates.length && <span>{autoCandidates.length} draft segments</span>}
                <span>{Object.values(map).reduce((sum, points) => sum + points.length, 0)} control points</span>
              </div>
            </div>
          </section>

          <section className="mapper-explainer">
            <span className="section-number">02</span>
            <div><h2>Why this one cannot drift.</h2><p>The photograph sits inside the same SVG <code>viewBox</code> as every point you place. Resize the browser, open it on a phone, or export the file: the path coordinates remain tied to the original image pixels.</p></div>
            <div className="mini-flow"><span>PHOTO</span><b>→</b><span>POINTS</span><b>→</b><span>SVG PATH</span><b>→</b><span>ATLAS</span></div>
          </section>
        </>
      ) : (
        <>
          <section className="intro">
            <div>
              <p className="eyebrow">{mode === "learn" ? "LEARN · YOUR OWN ANNOTATION" : "ATLAS · SPECIMEN-TRUE OVERLAY"}</p>
              <h1>{mode === "learn" ? "Find it on the real wing." : "The image is the map."}</h1>
            </div>
            <p className="intro-copy">{mode === "learn" ? quizMessage : "Hover the real wing. Only the paths you traced in Wing Mapper become interactive — no invented geometry, no second schematic underneath."}</p>
          </section>

          <section className="atlas-workbench">
            <div className="atlas-image-panel">
              <div className="atlas-toolbar">
                <div><span className="tool-kicker">CURRENT WING</span><strong>{wingImage.name}</strong></div>
                <div className="atlas-toolbar-actions">
                  {mode === "atlas" && <label className="overlay-toggle"><input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} /> Show all mapped veins</label>}
                  <button onClick={() => setMode("mapper")}>Edit map</button>
                </div>
              </div>

              <div className="atlas-svg-wrap">
                <svg className="atlas-photo-svg" viewBox={`0 0 ${wingImage.width} ${wingImage.height}`} role="img" aria-label="Mapped wing with interactive vein overlay">
                  <image href={wingImage.src} x="0" y="0" width={wingImage.width} height={wingImage.height} />
                  {mappedVeins.map((vein) => {
                    const isHot = hoveredVeinId === vein.id || (mode === "atlas" && selectedVeinId === vein.id);
                    return (
                      <g key={vein.id} className={`atlas-vein ${isHot ? "hot" : ""}`}>
                        <path d={smoothPath(map[vein.id])} fill="none" stroke={vein.color} vectorEffect="non-scaling-stroke" className="atlas-vein-visible" style={{ opacity: showAll || isHot ? 1 : 0 }} />
                        <path
                          d={smoothPath(map[vein.id])}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="18"
                          vectorEffect="non-scaling-stroke"
                          className="atlas-vein-hit"
                          role="button"
                          tabIndex={0}
                          aria-label={`${vein.label}: ${vein.fullName}`}
                          onMouseEnter={() => setHoveredVeinId(vein.id)}
                          onMouseLeave={() => setHoveredVeinId(null)}
                          onFocus={() => setHoveredVeinId(vein.id)}
                          onBlur={() => setHoveredVeinId(null)}
                          onClick={() => chooseAtlasVein(vein.id)}
                          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") chooseAtlasVein(vein.id); }}
                        />
                      </g>
                    );
                  })}
                </svg>
                {!mappedVeins.length && (
                  <div className="no-map-callout"><span>NO OVERLAY YET</span><strong>This is the real image. Now tell EntoWing where its veins are.</strong><button onClick={() => setMode("mapper")}>Open Wing Mapper →</button></div>
                )}
                {mode === "learn" && quizTarget && <div className="quiz-float"><span>FIND</span><strong>{quizTarget}</strong><small>{quizMessage}</small></div>}
              </div>

              <div className="atlas-legend">
                <span>{mappedVeins.length} mapped structures</span>
                <span className="legend-tip">Hover directly over a real vein to reveal your SVG trace.</span>
              </div>
            </div>

            <aside className="atlas-info-panel">
              {selectedVein && mode === "atlas" ? (
                <>
                  <div className="atlas-selected-head"><i style={{ background: selectedVein.color }} /><div><span>{selectedVein.group}</span><h2>{selectedVein.label}</h2></div></div>
                  <h3>{selectedVein.fullName}</h3>
                  <div className="atlas-symbol-card"><strong>{selectedVein.symbolMeaning}</strong><span>{selectedVein.plainMeaning}</span></div>
                  <p>{selectedVein.note}</p>
                  {draftHypotheses[selectedVein.id] !== undefined && <div className="hypothesis-warning"><span>≈ WHOLE-WING DRAFT · VERIFY</span><strong>{Math.round(draftHypotheses[selectedVein.id] * 100)}% geometric confidence</strong><small>This label was proposed from image geometry and position, not taxonomically identified. Review it before scientific use.</small></div>}
                  <div className="coordinate-card"><span>YOUR TRACE</span><strong>{map[selectedVein.id]?.length ?? 0} control points</strong><small>Stored in the natural pixel coordinates of this wing image.</small></div>
                </>
              ) : mode === "learn" ? (
                <>
                  <span className="tool-kicker">LEARN MODE</span>
                  <h2 className="learn-title">No labels. Just the wing.</h2>
                  <p>Move over the photograph and click the structure you think is correct. The invisible hit area follows your own trace.</p>
                  <div className="coordinate-card"><span>CURRENT TARGET</span><strong>{quizTarget ?? "Map more veins"}</strong><small>{quizMessage}</small></div>
                </>
              ) : (
                <>
                  <span className="tool-kicker">WING MAP</span>
                  <h2 className="learn-title">Your atlas starts with your specimen.</h2>
                  <p>Open Wing Mapper, align an anatomical template to the specimen, then correct its junctions and paths. The template is a tracing scaffold, never a taxonomic determination.</p>
                </>
              )}

              <div className="mapped-list">
                <div className="tool-title-row"><span className="tool-kicker">MAPPED</span><span>{mappedVeins.length}</span></div>
                {mappedVeins.map((vein) => <button key={vein.id} onClick={() => { setSelectedVeinId(vein.id); setMode("atlas"); }}><i style={{ background: vein.color }} />{vein.label}<span>{map[vein.id].length} pts</span></button>)}
              </div>
            </aside>
          </section>

          <section className="science-note">
            <div><span className="section-number">01</span><h2>A template is a scaffold, not an identification.</h2></div>
            <div className="science-copy"><p>Template Mapper preserves known connectivity while you align shared junctions to the real wing. Magnetic fitting then searches locally around one chosen template vein, so image evidence can refine geometry without inventing the whole anatomy from dark pixels.</p><p className="method-note">Wing-vein nomenclature follows the familiar Diptera systems C (Costa), Sc (Subcosta), R (Radius), M (Media), Cu (Cubitus) and A (Anal). Homologies and retained branches vary among fly groups: verify the selected archetype and every final label against the specimen and an appropriate taxonomic source.</p><a href="https://www.bugguide.net/node/view/240586" target="_blank" rel="noreferrer">Open reference source ↗</a></div>
          </section>
        </>
      )}

      <footer>
        <div><strong>EntoWing</strong><span>Specimen image → your annotation → interactive atlas.</span></div>
        <div className="footer-roadmap"><span className="done">01 · IMAGE</span><span className="done">02 · MAP</span><span className={mappedVeins.length ? "done" : ""}>03 · ATLAS</span><span>04 · CELLS</span><span>05 · COMPARE</span></div>
      </footer>
    </main>
  );
}
