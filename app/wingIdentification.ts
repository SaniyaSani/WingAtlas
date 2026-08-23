export type WingReferenceRecord = {
  family: string;
  title: string;
  assetPath: string;
  sourcePage: string;
  author: string;
  license: string;
  localAsset: boolean;
};

export type WingImageQuality = {
  contrast: number;
  sharpness: number;
  coverage: number;
  score: number;
  warnings: string[];
};

export type WingRotation = 0 | 90 | 180 | 270;

export type WingOrientation = {
  rotation: WingRotation;
  mirrored: boolean;
};

export type WingOrientationMatch = WingOrientation & {
  automatic: boolean;
  confidence: "low" | "medium" | "high";
  score: number;
};

export type WingIdCandidate = {
  id: string;
  family: string;
  taxon: string;
  rank: string;
  probability: number;
  similarity: number;
  reasons: string[];
  reference: WingReferenceRecord;
};

export type WingIdResult = {
  candidates: WingIdCandidate[];
  unknownProbability: number;
  quality: WingImageQuality;
  uncertain: boolean;
  referencesCompared: number;
  orientation: WingOrientationMatch;
};

type PixelBox = { x: number; y: number; width: number; height: number };
type WingDescriptor = {
  vector: number[];
  cells: number[];
  aspect: number;
  density: number;
};

const NORMAL_WIDTH = 168;
const NORMAL_HEIGHT = 98;
const GRID_COLUMNS = 12;
const GRID_ROWS = 7;
const descriptorCache = new Map<string, Promise<WingDescriptor>>();
const ALL_ORIENTATIONS: WingOrientation[] = ([0, 90, 180, 270] as WingRotation[]).flatMap((rotation) => [
  { rotation, mirrored: false },
  { rotation, mirrored: true },
]);

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function median(values: number[]) {
  if (!values.length) return 255;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function standardDeviation(values: Uint8Array) {
  let total = 0;
  for (const value of values) total += value;
  const mean = total / Math.max(1, values.length);
  let variance = 0;
  for (const value of values) variance += (value - mean) ** 2;
  return Math.sqrt(variance / Math.max(1, values.length));
}

function grayscale(imageData: ImageData) {
  const values = new Uint8Array(imageData.width * imageData.height);
  for (let index = 0; index < values.length; index += 1) {
    const source = index * 4;
    values[index] = Math.round(imageData.data[source] * .299 + imageData.data[source + 1] * .587 + imageData.data[source + 2] * .114);
  }
  return values;
}

function sobel(values: Uint8Array, width: number, height: number) {
  const result = new Float32Array(values.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const gx = -values[index - width - 1] - 2 * values[index - 1] - values[index + width - 1]
        + values[index - width + 1] + 2 * values[index + 1] + values[index + width + 1];
      const gy = -values[index - width - 1] - 2 * values[index - width] - values[index - width + 1]
        + values[index + width - 1] + 2 * values[index + width] + values[index + width + 1];
      result[index] = Math.min(255, Math.hypot(gx, gy) / 4);
    }
  }
  return result;
}

function borderMedian(values: Uint8Array, width: number, height: number) {
  const border: number[] = [];
  const band = Math.max(2, Math.round(Math.min(width, height) * .035));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x < band || y < band || x >= width - band || y >= height - band) border.push(values[y * width + x]);
    }
  }
  return median(border);
}

function findWingBox(values: Uint8Array, gradients: Float32Array, width: number, height: number, sensitivity: number) {
  const background = borderMedian(values, width, height);
  const deviationThreshold = 10 + (100 - sensitivity) * .22;
  const gradientThreshold = 24 + (100 - sensitivity) * .36;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let foreground = 0;

  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      const index = y * width + x;
      const isWing = Math.abs(values[index] - background) > deviationThreshold || gradients[index] > gradientThreshold;
      if (!isWing) continue;
      foreground += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!foreground || minX >= maxX || minY >= maxY) return { box: { x: 0, y: 0, width, height }, foreground: 0, background };
  const paddingX = Math.max(3, Math.round((maxX - minX) * .035));
  const paddingY = Math.max(3, Math.round((maxY - minY) * .07));
  const box = {
    x: Math.max(0, minX - paddingX),
    y: Math.max(0, minY - paddingY),
    width: Math.min(width, maxX + paddingX) - Math.max(0, minX - paddingX) + 1,
    height: Math.min(height, maxY + paddingY) - Math.max(0, minY - paddingY) + 1,
  };
  return { box, foreground, background };
}

function canvasContext(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not create an image-analysis canvas.");
  return { canvas, context };
}

function normalisedCanvas(source: CanvasImageSource, box: PixelBox) {
  const { canvas, context } = canvasContext(NORMAL_WIDTH, NORMAL_HEIGHT);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, NORMAL_WIDTH, NORMAL_HEIGHT);
  const padding = 7;
  const scale = Math.min((NORMAL_WIDTH - padding * 2) / box.width, (NORMAL_HEIGHT - padding * 2) / box.height);
  const targetWidth = box.width * scale;
  const targetHeight = box.height * scale;
  const targetX = (NORMAL_WIDTH - targetWidth) / 2;
  const targetY = (NORMAL_HEIGHT - targetHeight) / 2;
  context.drawImage(source, box.x, box.y, box.width, box.height, targetX, targetY, targetWidth, targetHeight);
  return canvas;
}

export function renderWingOrientation(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  orientation: WingOrientation,
) {
  const quarterTurn = orientation.rotation === 90 || orientation.rotation === 270;
  const outputWidth = quarterTurn ? sourceHeight : sourceWidth;
  const outputHeight = quarterTurn ? sourceWidth : sourceHeight;
  const { canvas, context } = canvasContext(outputWidth, outputHeight);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.translate(outputWidth / 2, outputHeight / 2);
  if (orientation.mirrored) context.scale(-1, 1);
  context.rotate(orientation.rotation * Math.PI / 180);
  context.drawImage(source, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
  return canvas;
}

function descriptorFromCanvas(canvas: HTMLCanvasElement, sensitivity: number): WingDescriptor {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Image analysis is unavailable in this browser.");
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const values = grayscale(imageData);
  const gradients = sobel(values, canvas.width, canvas.height);
  const background = borderMedian(values, canvas.width, canvas.height);
  const edgeFloor = 12 + (100 - sensitivity) * .26;
  const cells = new Array(GRID_COLUMNS * GRID_ROWS).fill(0);
  const counts = new Array(cells.length).fill(0);
  let density = 0;

  for (let y = 1; y < canvas.height - 1; y += 1) {
    for (let x = 1; x < canvas.width - 1; x += 1) {
      const index = y * canvas.width + x;
      const deviation = Math.abs(values[index] - background);
      const signal = Math.max(0, gradients[index] - edgeFloor) / 160 + Math.max(0, deviation - edgeFloor) / 255 * .28;
      const weight = clamp(signal);
      const column = Math.min(GRID_COLUMNS - 1, Math.floor(x / canvas.width * GRID_COLUMNS));
      const row = Math.min(GRID_ROWS - 1, Math.floor(y / canvas.height * GRID_ROWS));
      const cell = row * GRID_COLUMNS + column;
      cells[cell] += weight;
      counts[cell] += 1;
      density += weight;
    }
  }

  cells.forEach((_, index) => { cells[index] /= Math.max(1, counts[index]); });
  const columnProfile = new Array(GRID_COLUMNS).fill(0);
  const rowProfile = new Array(GRID_ROWS).fill(0);
  cells.forEach((value, index) => {
    columnProfile[index % GRID_COLUMNS] += value / GRID_ROWS;
    rowProfile[Math.floor(index / GRID_COLUMNS)] += value / GRID_COLUMNS;
  });
  const activeCells = cells.filter((value) => value > .035);
  const occupiedColumns = columnProfile.map((value, index) => value > .025 ? index : -1).filter((index) => index >= 0);
  const occupiedRows = rowProfile.map((value, index) => value > .025 ? index : -1).filter((index) => index >= 0);
  const aspect = occupiedColumns.length && occupiedRows.length
    ? (occupiedColumns[occupiedColumns.length - 1] - occupiedColumns[0] + 1) / (occupiedRows[occupiedRows.length - 1] - occupiedRows[0] + 1)
    : 1;
  const vector = [...cells, ...columnProfile.map((value) => value * 1.4), ...rowProfile.map((value) => value * 1.4), clamp(aspect / 4), clamp(density / (canvas.width * canvas.height) * 4)];
  const norm = Math.hypot(...vector) || 1;
  return { vector: vector.map((value) => value / norm), cells, aspect, density: activeCells.length / cells.length };
}

function prepareImage(source: CanvasImageSource, width: number, height: number, sensitivity: number) {
  const workingScale = Math.min(1, 420 / Math.max(width, height));
  const workingWidth = Math.max(80, Math.round(width * workingScale));
  const workingHeight = Math.max(60, Math.round(height * workingScale));
  const { canvas, context } = canvasContext(workingWidth, workingHeight);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, workingWidth, workingHeight);
  context.drawImage(source, 0, 0, workingWidth, workingHeight);
  const imageData = context.getImageData(0, 0, workingWidth, workingHeight);
  const values = grayscale(imageData);
  const gradients = sobel(values, workingWidth, workingHeight);
  const located = findWingBox(values, gradients, workingWidth, workingHeight, sensitivity);
  const normalised = normalisedCanvas(canvas, located.box);
  return { descriptor: descriptorFromCanvas(normalised, sensitivity), values, gradients, located, width: workingWidth, height: workingHeight };
}

function prepareOrientation(image: HTMLImageElement, sensitivity: number, orientation: WingOrientation) {
  const oriented = renderWingOrientation(image, image.naturalWidth, image.naturalHeight, orientation);
  return prepareImage(oriented, oriented.width, oriented.height, sensitivity);
}

function qualityFromPrepared(prepared: ReturnType<typeof prepareImage>): WingImageQuality {
  const contrastRaw = standardDeviation(prepared.values);
  let gradientTotal = 0;
  let gradientPixels = 0;
  for (const value of prepared.gradients) {
    if (value < 12) continue;
    gradientTotal += value;
    gradientPixels += 1;
  }
  const contrast = Math.round(clamp((contrastRaw - 8) / 46) * 100);
  const sharpness = Math.round(clamp(((gradientTotal / Math.max(1, gradientPixels)) - 18) / 70) * 100);
  const boxArea = prepared.located.box.width * prepared.located.box.height;
  const coverageRaw = boxArea / (prepared.width * prepared.height);
  const coverage = Math.round(clamp(coverageRaw / .68) * 100);
  const score = Math.round(contrast * .38 + sharpness * .42 + coverage * .2);
  const warnings: string[] = [];
  if (contrast < 35) warnings.push("Low contrast: use a pale, even background or increase transmitted light.");
  if (sharpness < 35) warnings.push("Vein intersections look soft: refocus or avoid compression and motion blur.");
  if (coverage < 42) warnings.push("The wing occupies too little of the frame: crop closer around one complete wing.");
  if (coverageRaw > .96) warnings.push("The wing edge may touch the frame: leave a narrow margin around the whole wing.");
  return { contrast, sharpness, coverage, score, warnings };
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("One reference image could not be decoded."));
    image.src = url;
  });
}

function removeNonVenation(svgText: string) {
  const documentNode = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (documentNode.querySelector("parsererror")) throw new Error("A reference SVG could not be parsed.");
  const svg = documentNode.documentElement;
  svg.querySelectorAll("text, title, desc, metadata").forEach((element) => element.remove());
  svg.querySelectorAll("path, line, polyline, polygon, circle, ellipse, rect").forEach((element) => {
    const paint = `${element.getAttribute("style") ?? ""};stroke:${element.getAttribute("stroke") ?? ""};fill:${element.getAttribute("fill") ?? ""}`.toLowerCase();
    const redLeader = /#9f0000|#a00000|#ff0000|rgb\(\s*(?:15[0-9]|1[6-9][0-9]|2[0-5][0-9])\s*,\s*(?:0|[1-6]?[0-9])\s*,\s*(?:0|[1-6]?[0-9])\s*\)/.test(paint);
    if (redLeader) element.remove();
  });
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return new XMLSerializer().serializeToString(svg);
}

async function referenceDescriptor(reference: WingReferenceRecord, sensitivity: number) {
  const cacheKey = `${reference.assetPath}:${Math.round(sensitivity / 5) * 5}`;
  if (!descriptorCache.has(cacheKey)) {
    descriptorCache.set(cacheKey, (async () => {
      const response = await fetch(reference.assetPath);
      if (!response.ok) throw new Error(`Reference ${reference.family} returned ${response.status}.`);
      const cleaned = removeNonVenation(await response.text());
      const objectUrl = URL.createObjectURL(new Blob([cleaned], { type: "image/svg+xml" }));
      try {
        const image = await loadImage(objectUrl);
        return prepareImage(image, image.naturalWidth || 750, image.naturalHeight || 420, sensitivity).descriptor;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    })());
  }
  return descriptorCache.get(cacheKey)!;
}

function cosine(first: number[], second: number[]) {
  let value = 0;
  const length = Math.min(first.length, second.length);
  for (let index = 0; index < length; index += 1) value += first[index] * second[index];
  return clamp(value);
}

function descriptorSimilarity(specimen: WingDescriptor, reference: WingDescriptor) {
  const vectorSimilarity = cosine(specimen.vector, reference.vector);
  const aspectSimilarity = Math.exp(-Math.abs(Math.log(Math.max(.2, specimen.aspect) / Math.max(.2, reference.aspect))));
  const densitySimilarity = 1 - Math.min(1, Math.abs(specimen.density - reference.density) * 2.2);
  return clamp(vectorSimilarity * .79 + aspectSimilarity * .14 + densitySimilarity * .07);
}

function regionSimilarity(first: WingDescriptor, second: WingDescriptor, predicate: (column: number, row: number) => boolean) {
  const firstRegion: number[] = [];
  const secondRegion: number[] = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      if (!predicate(column, row)) continue;
      const index = row * GRID_COLUMNS + column;
      firstRegion.push(first.cells[index]);
      secondRegion.push(second.cells[index]);
    }
  }
  const firstNorm = Math.hypot(...firstRegion) || 1;
  const secondNorm = Math.hypot(...secondRegion) || 1;
  return firstRegion.reduce((sum, value, index) => sum + value / firstNorm * (secondRegion[index] / secondNorm), 0);
}

function matchReasons(specimen: WingDescriptor, reference: WingDescriptor) {
  const regions = [
    { label: "basal junction network", score: regionSimilarity(specimen, reference, (column) => column <= 4) },
    { label: "apical branching pattern", score: regionSimilarity(specimen, reference, (column) => column >= 7) },
    { label: "anterior vein field", score: regionSimilarity(specimen, reference, (_column, row) => row <= 2) },
    { label: "posterior vein field", score: regionSimilarity(specimen, reference, (_column, row) => row >= 4) },
    { label: "overall wing proportions", score: Math.exp(-Math.abs(Math.log(Math.max(.2, specimen.aspect) / Math.max(.2, reference.aspect)))) },
  ];
  return regions.sort((a, b) => b.score - a.score).slice(0, 3).map((region) => region.label);
}

function illustratedTaxon(reference: WingReferenceRecord) {
  const cleaned = reference.title
    .replace(/\.svg$/i, "")
    .replace(/[-–—]?\s*wing\s+veins?.*$/i, "")
    .replace(/^generic\s+/i, "")
    .trim();
  if (/idae$/i.test(cleaned)) return { taxon: `${cleaned} morphotype`, rank: "family-level reference" };
  if (/inae$/i.test(cleaned)) return { taxon: `${cleaned} morphotype`, rank: "subfamily-level reference" };
  const genus = cleaned.match(/[A-Z][a-z]+/)?.[0];
  return genus
    ? { taxon: `${genus} sp.`, rank: "genus-level reference" }
    : { taxon: `${reference.family} morphotype`, rank: "family-level reference" };
}

export async function identifyWing(
  image: HTMLImageElement,
  references: Array<[string, WingReferenceRecord]>,
  sensitivity: number,
  requestedOrientation: WingOrientation,
  autoOrient: boolean,
  onProgress?: (done: number, total: number) => void,
): Promise<WingIdResult> {
  const available = references.filter(([, reference]) => reference.localAsset && reference.assetPath.startsWith("/"));
  let done = 0;
  const loadedReferences = (await Promise.all(available.map(async ([id, reference]) => {
    try {
      const descriptor = await referenceDescriptor(reference, sensitivity);
      return { id, reference, descriptor };
    } catch {
      return null;
    } finally {
      done += 1;
      onProgress?.(done, available.length);
    }
  }))).filter((value): value is NonNullable<typeof value> => Boolean(value));

  if (!loadedReferences.length) throw new Error("No local reference SVGs were available for comparison.");

  const sameOrientation = (first: WingOrientation, second: WingOrientation) => first.rotation === second.rotation && first.mirrored === second.mirrored;
  const orientationOptions = autoOrient
    ? [requestedOrientation, ...ALL_ORIENTATIONS.filter((orientation) => !sameOrientation(orientation, requestedOrientation))]
    : [requestedOrientation];
  const orientationScores = orientationOptions.map((orientation) => {
    const prepared = prepareOrientation(image, sensitivity, orientation);
    const similarities = loadedReferences
      .map(({ descriptor }) => descriptorSimilarity(prepared.descriptor, descriptor))
      .sort((a, b) => b - a);
    const score = (similarities[0] ?? 0) * .62 + (similarities[1] ?? similarities[0] ?? 0) * .25 + (similarities[2] ?? similarities[0] ?? 0) * .13;
    return { orientation, prepared, score };
  }).sort((a, b) => b.score - a.score);

  const selected = orientationScores[0];
  const orientationMargin = selected.score - (orientationScores[1]?.score ?? 0);
  const orientationConfidence: WingOrientationMatch["confidence"] = !autoOrient || orientationMargin >= .04
    ? "high"
    : orientationMargin >= .015 ? "medium" : "low";
  const quality = qualityFromPrepared(selected.prepared);
  const scores = loadedReferences.map(({ id, reference, descriptor }) => {
    const similarity = descriptorSimilarity(selected.prepared.descriptor, descriptor);
    const taxon = illustratedTaxon(reference);
    return { id, reference, similarity, reasons: matchReasons(selected.prepared.descriptor, descriptor), ...taxon };
  }).sort((a, b) => b.similarity - a.similarity);

  const top = scores.slice(0, 3);
  const maximum = top[0].similarity;
  const exponentials = top.map((candidate) => Math.exp((candidate.similarity - maximum) * 15));
  const exponentialTotal = exponentials.reduce((sum, value) => sum + value, 0);
  const qualityFactor = .5 + quality.score / 200;
  const evidence = clamp((maximum - .38) / .56, .12, .9) * qualityFactor;
  const candidates = top.map((candidate, index): WingIdCandidate => ({
    ...candidate,
    family: candidate.reference.family,
    probability: exponentials[index] / exponentialTotal * evidence,
  }));
  const margin = top.length > 1 ? top[0].similarity - top[1].similarity : top[0].similarity;
  return {
    candidates,
    unknownProbability: clamp(1 - candidates.reduce((sum, candidate) => sum + candidate.probability, 0)),
    quality,
    uncertain: maximum < .63 || margin < .018 || quality.score < 45,
    referencesCompared: scores.length,
    orientation: {
      ...selected.orientation,
      automatic: autoOrient,
      confidence: orientationConfidence,
      score: selected.score,
    },
  };
}
