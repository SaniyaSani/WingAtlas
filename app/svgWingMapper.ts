import type { FamilyWingPoint, FamilyWingReference, FamilyWingTemplate } from "./PhyloAtlas";

type SourcePath = {
  element: SVGPathElement;
  points: FamilyWingPoint[];
  length: number;
};

type LabelCandidate = {
  label: string;
  point: FamilyWingPoint;
};

const VEIN_LABEL = /^(?:C|Sc|Rs|R(?:[1-5](?:\+[1-5])?)?|M(?:[1-4](?:\+[1-4])?)?|Cu(?:A|P|A[12])?|A[12]?|h|sc-r|r-r|r-m|m-m|m-cu|bm-cu|dm-m|dm-cu)$/;

function distance(a: FamilyWingPoint, b: FamilyWingPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function transformPoint(point: DOMPoint, matrix: DOMMatrix | null): FamilyWingPoint {
  if (!matrix) return { x: point.x, y: point.y };
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

function samplePath(path: SVGPathElement): SourcePath | null {
  try {
    const length = path.getTotalLength();
    if (!Number.isFinite(length) || length < 6) return null;
    const sampleCount = Math.max(4, Math.min(48, Math.ceil(length / 13)));
    const matrix = path.getCTM();
    const points = Array.from({ length: sampleCount + 1 }, (_, index) => {
      const point = path.getPointAtLength(length * index / sampleCount);
      return transformPoint(new DOMPoint(point.x, point.y), matrix);
    });
    const transformedLength = points.slice(1).reduce((total, point, index) => total + distance(points[index], point), 0);
    return { element: path, points, length: transformedLength };
  } catch {
    return null;
  }
}

function cssRgb(value: string) {
  const rgb = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  const hex = value.match(/#([0-9a-f]{6})/i);
  if (!hex) return null;
  return {
    r: Number.parseInt(hex[1].slice(0, 2), 16),
    g: Number.parseInt(hex[1].slice(2, 4), 16),
    b: Number.parseInt(hex[1].slice(4, 6), 16),
  };
}

function pathColour(path: SVGPathElement) {
  const style = window.getComputedStyle(path);
  return cssRgb(style.stroke)
    ?? cssRgb(path.getAttribute("stroke") ?? "")
    ?? cssRgb(path.getAttribute("style") ?? "");
}

function isLeaderPath(path: SVGPathElement) {
  const colour = pathColour(path);
  return Boolean(colour && colour.r > 90 && colour.r > colour.g * 1.55 && colour.r > colour.b * 1.55);
}

function isVenationPath(path: SVGPathElement) {
  const style = window.getComputedStyle(path);
  if (style.display === "none" || style.visibility === "hidden" || style.stroke === "none") return false;
  const colour = pathColour(path);
  if (!colour || isLeaderPath(path)) return false;
  const darkest = Math.max(colour.r, colour.g, colour.b);
  const spread = darkest - Math.min(colour.r, colour.g, colour.b);
  return darkest < 145 && spread < 90;
}

function simplify(points: FamilyWingPoint[], tolerance: number) {
  if (points.length < 3) return points;
  const squaredTolerance = tolerance * tolerance;
  const pointSegmentDistanceSquared = (point: FamilyWingPoint, start: FamilyWingPoint, end: FamilyWingPoint) => {
    let x = start.x;
    let y = start.y;
    let dx = end.x - x;
    let dy = end.y - y;
    if (dx || dy) {
      const t = ((point.x - x) * dx + (point.y - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = end.x;
        y = end.y;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = point.x - x;
    dy = point.y - y;
    return dx * dx + dy * dy;
  };
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let maximum = squaredTolerance;
    let index = -1;
    for (let cursor = first + 1; cursor < last; cursor += 1) {
      const squared = pointSegmentDistanceSquared(points[cursor], points[first], points[last]);
      if (squared > maximum) {
        index = cursor;
        maximum = squared;
      }
    }
    if (index > -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

function graphicsCenter(element: SVGGraphicsElement): FamilyWingPoint | null {
  try {
    const box = element.getBBox();
    return transformPoint(new DOMPoint(box.x + box.width / 2, box.y + box.height / 2), element.getCTM());
  } catch {
    return null;
  }
}

function normalizeLabel(value: string) {
  const compact = value
    .replace(/[₁₁]/g, "1")
    .replace(/[₂₂]/g, "2")
    .replace(/[₃₃]/g, "3")
    .replace(/[₄₄]/g, "4")
    .replace(/[₅₅]/g, "5")
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "")
    .replace(/^H$/, "h");
  return VEIN_LABEL.test(compact) ? compact : null;
}

function extractLabels(svg: SVGSVGElement): LabelCandidate[] {
  const candidates = new Map<SVGGraphicsElement, string>();
  Array.from(svg.querySelectorAll("text")).forEach((text) => {
    const parent = text.parentElement;
    const groupedTexts = parent?.tagName.toLowerCase().endsWith("g") ? parent.querySelectorAll("text") : null;
    const groupedLabel = groupedTexts && groupedTexts.length <= 3 ? normalizeLabel(parent!.textContent ?? "") : null;
    const element = groupedLabel ? parent as unknown as SVGGraphicsElement : text as SVGGraphicsElement;
    const label = groupedLabel ?? normalizeLabel(text.textContent ?? "");
    if (label) candidates.set(element, label);
  });
  return Array.from(candidates, ([element, label]) => {
    const point = graphicsCenter(element);
    return point ? { label, point } : null;
  }).filter((candidate): candidate is LabelCandidate => Boolean(candidate));
}

function closestPointDistance(point: FamilyWingPoint, path: SourcePath) {
  return path.points.reduce((minimum, candidate) => Math.min(minimum, distance(point, candidate)), Number.POSITIVE_INFINITY);
}

function colourForVein(label: string) {
  if (label === "C") return "#d4a72c";
  if (label === "Sc") return "#4f9ca4";
  if (/^R/.test(label)) return "#c85d48";
  if (/^M/.test(label)) return "#7a6bb0";
  if (/^Cu/.test(label)) return "#63875f";
  if (/^A/.test(label)) return "#5c7fa0";
  if (label.includes("-") || label === "h") return "#d97941";
  return "#748078";
}

function normalizeGeometry(paths: SourcePath[], outline: SourcePath | null) {
  const allPoints = [...paths.flatMap((path) => path.points), ...(outline?.points ?? [])];
  const minX = Math.min(...allPoints.map((point) => point.x));
  const maxX = Math.max(...allPoints.map((point) => point.x));
  const minY = Math.min(...allPoints.map((point) => point.y));
  const maxY = Math.max(...allPoints.map((point) => point.y));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const scale = Math.min(532 / width, 220 / height);
  const offsetX = 14 + (532 - width * scale) / 2;
  const offsetY = 13 + (220 - height * scale) / 2;
  const mapPoint = (point: FamilyWingPoint): FamilyWingPoint => ({
    x: offsetX + (point.x - minX) * scale,
    y: offsetY + (point.y - minY) * scale,
  });
  return {
    paths: paths.map((path) => ({ ...path, points: simplify(path.points, Math.max(.7, Math.hypot(width, height) / 700)).map(mapPoint) })),
    outlinePoints: outline ? simplify(outline.points, Math.max(.7, Math.hypot(width, height) / 700)).map(mapPoint) : undefined,
  };
}

export async function mapReferenceSvgToTemplate(reference: FamilyWingReference): Promise<FamilyWingTemplate> {
  const response = await fetch(reference.assetPath, { mode: "cors" });
  if (!response.ok) throw new Error(`Reference SVG returned ${response.status}.`);
  const source = await response.text();
  const documentSource = new DOMParser().parseFromString(source, "image/svg+xml");
  if (documentSource.querySelector("parsererror")) throw new Error("Reference SVG could not be parsed.");

  const stage = document.createElement("div");
  stage.setAttribute("aria-hidden", "true");
  // Keep the SVG laid out and technically visible so native geometry and
  // computed stroke styles remain measurable. `visibility:hidden` is inherited
  // by every path and made the venation detector reject the entire document.
  stage.style.cssText = "position:fixed;left:-100000px;top:0;opacity:0;pointer-events:none;z-index:-1;overflow:hidden";
  stage.innerHTML = new XMLSerializer().serializeToString(documentSource.documentElement);
  document.body.appendChild(stage);
  try {
    const svg = stage.querySelector("svg") as SVGSVGElement | null;
    if (!svg) throw new Error("Reference document has no SVG root.");
    svg.setAttribute("width", String(reference.width || 1000));
    svg.setAttribute("height", String(reference.height || 600));
    svg.style.width = `${reference.width || 1000}px`;
    svg.style.height = `${reference.height || 600}px`;

    const sampled = Array.from(svg.querySelectorAll("path")).map(samplePath).filter((path): path is SourcePath => Boolean(path));
    const venation = sampled.filter((path) => isVenationPath(path.element));
    const leaders = sampled.filter((path) => isLeaderPath(path.element));
    if (venation.length < 3) throw new Error("Too few venation paths were detected in this SVG.");

    const diagonal = Math.hypot(reference.width || 1000, reference.height || 600);
    const outline = [...venation]
      .sort((a, b) => b.length - a.length)
      .find((path) => {
        const endDistance = distance(path.points[0], path.points[path.points.length - 1]);
        return path.length > diagonal * .7 && endDistance < diagonal * .24;
      }) ?? null;
    const veinPaths = outline ? venation.filter((path) => path !== outline) : venation;
    const labels = extractLabels(svg);
    const assignments = new Map<SourcePath, { label: string; score: number }>();

    labels.forEach((candidate) => {
      let target = candidate.point;
      let leaderScore = Number.POSITIVE_INFINITY;
      leaders.forEach((leader) => {
        const start = leader.points[0];
        const end = leader.points[leader.points.length - 1];
        const startDistance = distance(candidate.point, start);
        const endDistance = distance(candidate.point, end);
        const score = Math.min(startDistance, endDistance);
        if (score < leaderScore && score < diagonal * .2) {
          leaderScore = score;
          target = startDistance < endDistance ? end : start;
        }
      });
      let closest: SourcePath | null = null;
      let score = Number.POSITIVE_INFINITY;
      veinPaths.forEach((path) => {
        const nextScore = closestPointDistance(target, path);
        if (nextScore < score) {
          score = nextScore;
          closest = path;
        }
      });
      if (!closest || score > diagonal * .17) return;
      const existing = assignments.get(closest);
      if (!existing || score < existing.score) assignments.set(closest, { label: candidate.label, score });
    });
    veinPaths.forEach((path) => {
      const embeddedLabel = normalizeLabel(path.element.getAttribute("data-vein") ?? path.element.getAttribute("data-label") ?? "");
      if (embeddedLabel) assignments.set(path, { label: embeddedLabel, score: 0 });
    });

    const geometry = normalizeGeometry(veinPaths, outline);
    const nodes: Record<string, FamilyWingPoint> = {};
    const paths: FamilyWingTemplate["paths"] = [];
    const labelCounts = new Map<string, number>();
    geometry.paths.forEach((path, pathIndex) => {
      const assignment = assignments.get(veinPaths[pathIndex]);
      const baseLabel = assignment?.label;
      const duplicate = baseLabel ? (labelCounts.get(baseLabel) ?? 0) + 1 : 0;
      if (baseLabel) labelCounts.set(baseLabel, duplicate);
      const veinId = baseLabel ? (duplicate === 1 ? baseLabel : `${baseLabel}·${duplicate}`) : `draft-${String(pathIndex + 1).padStart(2, "0")}`;
      const nodeIds = path.points.map((point, pointIndex) => {
        const nodeId = `auto-${pathIndex}-${pointIndex}`;
        nodes[nodeId] = point;
        return nodeId;
      });
      paths.push({
        veinId,
        displayLabel: baseLabel ?? `?${String(pathIndex + 1).padStart(2, "0")}`,
        nodeIds,
        color: colourForVein(baseLabel ?? ""),
        sourcePathId: veinPaths[pathIndex].element.id || `source-path-${pathIndex + 1}`,
        confidence: baseLabel ? (assignment!.score < diagonal * .045 ? "high" : "medium") : "unassigned",
      });
    });

    const namedPathCount = paths.filter((path) => path.confidence !== "unassigned").length;
    return {
      id: `family-${reference.family.toLowerCase()}-auto-svg`,
      name: `${reference.family} · machine-mapped SVG draft`,
      taxon: `${reference.family} · published SVG reference`,
      note: `Automatically reconstructed from ${reference.title}. ${namedPathCount} of ${paths.length} source paths received label suggestions; verify all homologies before review status.`,
      referenceSize: { width: 560, height: 246 },
      nodes,
      paths,
      outlinePoints: geometry.outlinePoints,
      mappingStatus: "machine-draft",
      mappingStats: { sourcePathCount: paths.length, namedPathCount, nodeCount: Object.keys(nodes).length },
      sourceReference: reference.sourcePage,
    };
  } finally {
    stage.remove();
  }
}
