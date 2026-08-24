export type WingReferenceRecord = {
  family: string;
  title: string;
  taxon?: string;
  rank?: string;
  assetPath: string;
  classifierAssetPath?: string;
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
  noReliableMatch: boolean;
  rejectionReasons: string[];
  referencesCompared: number;
  orientation: WingOrientationMatch;
  analysisPreview: string;
};

type PixelBox = { x: number; y: number; width: number; height: number };
type Component = { count: number; minX: number; minY: number; maxX: number; maxY: number };
type WingDescriptor = {
  vector: number[];
  cells: number[];
  fineCells: number[];
  interiorCells: number[];
  endpointMap: number[];
  interiorEndpointCount: number;
  directions: number[];
  aspect: number;
  density: number;
};

const NORMAL_WIDTH = 168;
const NORMAL_HEIGHT = 98;
const GRID_COLUMNS = 12;
const GRID_ROWS = 7;
const FINE_COLUMNS = 24;
const FINE_ROWS = 14;
const ENDPOINT_COLUMNS = 12;
const ENDPOINT_ROWS = 7;
const DIRECTION_COLUMNS = 6;
const DIRECTION_ROWS = 4;
const DIRECTION_BINS = 4;
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

function rawSignalMask(values: Uint8Array, gradients: Float32Array, width: number, height: number, sensitivity: number) {
  const background = borderMedian(values, width, height);
  const darkThreshold = 10 + (100 - sensitivity) * .22;
  const gradientThreshold = 24 + (100 - sensitivity) * .34;
  const mask = new Uint8Array(values.length);
  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      const index = y * width + x;
      if (background - values[index] > darkThreshold || gradients[index] > gradientThreshold) mask[index] = 1;
    }
  }
  return { mask, background, darkThreshold, gradientThreshold };
}

function dilate(mask: Uint8Array, width: number, height: number, passes: number) {
  let current = mask;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = current.slice();
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (!current[index]) continue;
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) next[index + oy * width + ox] = 1;
        }
      }
    }
    current = next;
  }
  return current;
}

function connectedComponents(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  const components: Component[] = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    let head = 0;
    let tail = 0;
    let count = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    queue[tail++] = start;
    visited[start] = 1;
    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      count += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (let oy = -1; oy <= 1; oy += 1) {
        const nextY = y + oy;
        if (nextY < 0 || nextY >= height) continue;
        for (let ox = -1; ox <= 1; ox += 1) {
          const nextX = x + ox;
          if ((!ox && !oy) || nextX < 0 || nextX >= width) continue;
          const next = nextY * width + nextX;
          if (!mask[next] || visited[next]) continue;
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }
    components.push({ count, minX, minY, maxX, maxY });
  }
  return components;
}

function findWingBox(values: Uint8Array, gradients: Float32Array, width: number, height: number, sensitivity: number) {
  const signal = rawSignalMask(values, gradients, width, height, sensitivity);
  const joined = dilate(signal.mask, width, height, Math.max(1, Math.round(Math.min(width, height) / 170)));
  const componentScore = (component: Component) => {
    const boxWidth = component.maxX - component.minX + 1;
    const boxHeight = component.maxY - component.minY + 1;
    return boxWidth * boxHeight * (.75 + Math.min(.25, component.count / Math.max(1, boxWidth * boxHeight)));
  };
  const best = connectedComponents(joined, width, height)
    .filter((component) => component.maxX - component.minX >= width * .18 && component.maxY - component.minY >= height * .08)
    .sort((first, second) => componentScore(second) - componentScore(first))[0];

  let minX = best?.minX ?? width;
  let minY = best?.minY ?? height;
  let maxX = best?.maxX ?? 0;
  let maxY = best?.maxY ?? 0;
  if (!best) {
    for (let index = 0; index < signal.mask.length; index += 1) {
      if (!signal.mask[index]) continue;
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (minX >= maxX || minY >= maxY) return { box: { x: 0, y: 0, width, height }, foreground: 0, background: signal.background };

  const paddingX = Math.max(4, Math.round((maxX - minX) * .045));
  const paddingY = Math.max(4, Math.round((maxY - minY) * .08));
  const x = Math.max(0, minX - paddingX);
  const y = Math.max(0, minY - paddingY);
  const right = Math.min(width - 1, maxX + paddingX);
  const bottom = Math.min(height - 1, maxY + paddingY);
  let foreground = 0;
  for (let row = y; row <= bottom; row += 1) {
    for (let column = x; column <= right; column += 1) foreground += signal.mask[row * width + column];
  }
  return { box: { x, y, width: right - x + 1, height: bottom - y + 1 }, foreground, background: signal.background };
}

function canvasContext(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not create an image-analysis canvas.");
  return { canvas, context };
}

function normalisedSignalCanvas(
  values: Uint8Array,
  gradients: Float32Array,
  sourceWidth: number,
  sourceHeight: number,
  box: PixelBox,
  sensitivity: number,
) {
  const signal = rawSignalMask(values, gradients, sourceWidth, sourceHeight, sensitivity);
  const { canvas: signalCanvas, context: signalContext } = canvasContext(sourceWidth, sourceHeight);
  const signalImage = signalContext.createImageData(sourceWidth, sourceHeight);
  for (let index = 0; index < values.length; index += 1) {
    const darkness = Math.max(0, signal.background - values[index] - signal.darkThreshold) / 72;
    const edge = Math.max(0, gradients[index] - signal.gradientThreshold) / 105;
    const weight = clamp(edge * .72 + darkness * .38);
    const shade = 255 - Math.round(weight * 235);
    const target = index * 4;
    signalImage.data[target] = shade;
    signalImage.data[target + 1] = shade;
    signalImage.data[target + 2] = shade;
    signalImage.data[target + 3] = 255;
  }
  signalContext.putImageData(signalImage, 0, 0);

  const { canvas, context } = canvasContext(NORMAL_WIDTH, NORMAL_HEIGHT);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, NORMAL_WIDTH, NORMAL_HEIGHT);
  const padding = 7;
  const scale = Math.min((NORMAL_WIDTH - padding * 2) / box.width, (NORMAL_HEIGHT - padding * 2) / box.height);
  const targetWidth = box.width * scale;
  const targetHeight = box.height * scale;
  const targetX = (NORMAL_WIDTH - targetWidth) / 2;
  const targetY = (NORMAL_HEIGHT - targetHeight) / 2;
  context.drawImage(signalCanvas, box.x, box.y, box.width, box.height, targetX, targetY, targetWidth, targetHeight);
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

function endpointFeatures(fineCells: number[]) {
  const activeValues = fineCells.filter((value) => value > .004).sort((a, b) => a - b);
  const adaptive = activeValues.length ? activeValues[Math.floor(activeValues.length * .42)] * .55 : .012;
  const threshold = Math.max(.01, Math.min(.045, adaptive));
  const active = fineCells.map((value) => value > threshold);
  const activeColumns: number[] = [];
  const activeRows: number[] = [];
  active.forEach((value, index) => {
    if (!value) return;
    activeColumns.push(index % FINE_COLUMNS);
    activeRows.push(Math.floor(index / FINE_COLUMNS));
  });
  const minColumn = activeColumns.length ? Math.min(...activeColumns) : 0;
  const maxColumn = activeColumns.length ? Math.max(...activeColumns) : FINE_COLUMNS - 1;
  const minRow = activeRows.length ? Math.min(...activeRows) : 0;
  const maxRow = activeRows.length ? Math.max(...activeRows) : FINE_ROWS - 1;
  const interiorCells = fineCells.map((value, index) => {
    const column = index % FINE_COLUMNS;
    const row = Math.floor(index / FINE_COLUMNS);
    const interior = column >= minColumn + 2 && column <= maxColumn - 2 && row >= minRow + 2 && row <= maxRow - 2;
    return interior ? value : 0;
  });
  const endpointMap = new Array(ENDPOINT_COLUMNS * ENDPOINT_ROWS).fill(0);
  let interiorEndpointCount = 0;
  const offsets = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

  for (let row = minRow + 2; row <= maxRow - 2; row += 1) {
    for (let column = minColumn + 2; column <= maxColumn - 2; column += 1) {
      if (!active[row * FINE_COLUMNS + column]) continue;
      const ring = offsets.map(([ox, oy]) => active[(row + oy) * FINE_COLUMNS + column + ox]);
      const neighbourCount = ring.filter(Boolean).length;
      let transitions = 0;
      for (let index = 0; index < ring.length; index += 1) {
        if (!ring[index] && ring[(index + 1) % ring.length]) transitions += 1;
      }
      if (neighbourCount < 1 || neighbourCount > 3 || transitions !== 1) continue;
      const targetColumn = Math.min(ENDPOINT_COLUMNS - 1, Math.floor(column / FINE_COLUMNS * ENDPOINT_COLUMNS));
      const targetRow = Math.min(ENDPOINT_ROWS - 1, Math.floor(row / FINE_ROWS * ENDPOINT_ROWS));
      endpointMap[targetRow * ENDPOINT_COLUMNS + targetColumn] += 1;
      interiorEndpointCount += 1;
    }
  }
  return { interiorCells, endpointMap, interiorEndpointCount };
}

function descriptorFromCanvas(canvas: HTMLCanvasElement, sensitivity: number): WingDescriptor {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Image analysis is unavailable in this browser.");
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const values = grayscale(imageData);
  const gradients = sobel(values, canvas.width, canvas.height);
  const cells = new Array(GRID_COLUMNS * GRID_ROWS).fill(0);
  const counts = new Array(cells.length).fill(0);
  const fineCells = new Array(FINE_COLUMNS * FINE_ROWS).fill(0);
  const fineCounts = new Array(fineCells.length).fill(0);
  const directions = new Array(DIRECTION_COLUMNS * DIRECTION_ROWS * DIRECTION_BINS).fill(0);
  const signalFloor = .018 + (100 - sensitivity) * .00006;
  let activePixels = 0;

  for (let y = 1; y < canvas.height - 1; y += 1) {
    for (let x = 1; x < canvas.width - 1; x += 1) {
      const index = y * canvas.width + x;
      const weight = clamp((255 - values[index]) / 225);
      const column = Math.min(GRID_COLUMNS - 1, Math.floor(x / canvas.width * GRID_COLUMNS));
      const row = Math.min(GRID_ROWS - 1, Math.floor(y / canvas.height * GRID_ROWS));
      const fineColumn = Math.min(FINE_COLUMNS - 1, Math.floor(x / canvas.width * FINE_COLUMNS));
      const fineRow = Math.min(FINE_ROWS - 1, Math.floor(y / canvas.height * FINE_ROWS));
      cells[row * GRID_COLUMNS + column] += weight;
      counts[row * GRID_COLUMNS + column] += 1;
      fineCells[fineRow * FINE_COLUMNS + fineColumn] += weight;
      fineCounts[fineRow * FINE_COLUMNS + fineColumn] += 1;
      if (weight > signalFloor) activePixels += 1;

      if (gradients[index] > 8) {
        const gx = -values[index - canvas.width - 1] - 2 * values[index - 1] - values[index + canvas.width - 1]
          + values[index - canvas.width + 1] + 2 * values[index + 1] + values[index + canvas.width + 1];
        const gy = -values[index - canvas.width - 1] - 2 * values[index - canvas.width] - values[index - canvas.width + 1]
          + values[index + canvas.width - 1] + 2 * values[index + canvas.width] + values[index + canvas.width + 1];
        const lineAngle = (Math.atan2(gy, gx) + Math.PI / 2 + Math.PI) % Math.PI;
        const directionColumn = Math.min(DIRECTION_COLUMNS - 1, Math.floor(x / canvas.width * DIRECTION_COLUMNS));
        const directionRow = Math.min(DIRECTION_ROWS - 1, Math.floor(y / canvas.height * DIRECTION_ROWS));
        const directionBin = Math.min(DIRECTION_BINS - 1, Math.floor(lineAngle / Math.PI * DIRECTION_BINS));
        directions[(directionRow * DIRECTION_COLUMNS + directionColumn) * DIRECTION_BINS + directionBin] += Math.min(1, gradients[index] / 110);
      }
    }
  }

  cells.forEach((_, index) => { cells[index] /= Math.max(1, counts[index]); });
  fineCells.forEach((_, index) => { fineCells[index] /= Math.max(1, fineCounts[index]); });
  const endpointEvidence = endpointFeatures(fineCells);
  const directionTotal = directions.reduce((sum, value) => sum + value, 0) || 1;
  directions.forEach((_, index) => { directions[index] /= directionTotal; });
  const columnProfile = new Array(GRID_COLUMNS).fill(0);
  const rowProfile = new Array(GRID_ROWS).fill(0);
  cells.forEach((value, index) => {
    columnProfile[index % GRID_COLUMNS] += value / GRID_ROWS;
    rowProfile[Math.floor(index / GRID_COLUMNS)] += value / GRID_COLUMNS;
  });
  const occupiedColumns = columnProfile.map((value, index) => value > .014 ? index : -1).filter((index) => index >= 0);
  const occupiedRows = rowProfile.map((value, index) => value > .014 ? index : -1).filter((index) => index >= 0);
  const aspect = occupiedColumns.length && occupiedRows.length
    ? (occupiedColumns[occupiedColumns.length - 1] - occupiedColumns[0] + 1) / (occupiedRows[occupiedRows.length - 1] - occupiedRows[0] + 1)
    : 1;
  const density = activePixels / (canvas.width * canvas.height);
  const vector = [
    ...cells,
    ...columnProfile.map((value) => value * 1.45),
    ...rowProfile.map((value) => value * 1.45),
    ...directions.map((value) => value * 4),
    clamp(aspect / 4),
    clamp(density * 8),
  ];
  const norm = Math.hypot(...vector) || 1;
  return {
    vector: vector.map((value) => value / norm),
    cells,
    fineCells,
    interiorCells: endpointEvidence.interiorCells,
    endpointMap: endpointEvidence.endpointMap,
    interiorEndpointCount: endpointEvidence.interiorEndpointCount,
    directions,
    aspect,
    density,
  };
}

function prepareImage(source: CanvasImageSource, width: number, height: number, sensitivity: number) {
  const workingScale = Math.min(1, 420 / Math.max(width, height));
  const workingWidth = Math.max(80, Math.round(width * workingScale));
  const workingHeight = Math.max(60, Math.round(height * workingScale));
  const { context } = canvasContext(workingWidth, workingHeight);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, workingWidth, workingHeight);
  context.drawImage(source, 0, 0, workingWidth, workingHeight);
  const imageData = context.getImageData(0, 0, workingWidth, workingHeight);
  const values = grayscale(imageData);
  const gradients = sobel(values, workingWidth, workingHeight);
  const located = findWingBox(values, gradients, workingWidth, workingHeight, sensitivity);
  const normalised = normalisedSignalCanvas(values, gradients, workingWidth, workingHeight, located.box, sensitivity);
  return {
    descriptor: descriptorFromCanvas(normalised, sensitivity),
    preview: normalised.toDataURL("image/png"),
    values,
    gradients,
    located,
    width: workingWidth,
    height: workingHeight,
  };
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
  svg.querySelectorAll("text, title, desc, metadata, image, foreignObject").forEach((element) => element.remove());
  svg.querySelectorAll("path, line, polyline, polygon, circle, ellipse, rect").forEach((element) => {
    const identity = `${element.id} ${element.getAttribute("class") ?? ""}`.toLowerCase();
    const paint = `${element.getAttribute("style") ?? ""};stroke:${element.getAttribute("stroke") ?? ""};fill:${element.getAttribute("fill") ?? ""}`.toLowerCase();
    const annotation = /label|leader|callout|arrow|caption/.test(identity);
    const redLeader = /#9f0000|#a00000|#ff0000|rgb\(\s*(?:15[0-9]|1[6-9][0-9]|2[0-5][0-9])\s*,\s*(?:0|[1-6]?[0-9])\s*,\s*(?:0|[1-6]?[0-9])\s*\)/.test(paint);
    const style = element.getAttribute("style") ?? "";
    const fill = element.getAttribute("fill") ?? style.match(/(?:^|;)\s*fill\s*:\s*([^;]+)/i)?.[1] ?? "";
    const stroke = element.getAttribute("stroke") ?? style.match(/(?:^|;)\s*stroke\s*:\s*([^;]+)/i)?.[1] ?? "";
    const filledSurface = fill !== "" && !/^(?:none|transparent)$/i.test(fill.trim())
      && (stroke === "" || /^(?:none|transparent)$/i.test(stroke.trim()));
    if (annotation || redLeader || filledSurface) {
      element.remove();
      return;
    }

    // The atlas keeps its original coloured, clickable SVG. This serialized copy is
    // classifier-only: one neutral centreline style, without membrane fills or labels.
    element.setAttribute("fill", "none");
    element.setAttribute("stroke", "#111111");
    element.setAttribute("stroke-opacity", "1");
    element.setAttribute("stroke-linecap", "round");
    element.setAttribute("stroke-linejoin", "round");
    element.removeAttribute("style");
  });
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return new XMLSerializer().serializeToString(svg);
}

async function referenceDescriptor(reference: WingReferenceRecord, sensitivity: number) {
  const classifierAssetPath = reference.classifierAssetPath ?? reference.assetPath;
  const cacheKey = `dual-mask-v1:${classifierAssetPath}:${Math.round(sensitivity / 5) * 5}`;
  if (!descriptorCache.has(cacheKey)) {
    descriptorCache.set(cacheKey, (async () => {
      const response = await fetch(classifierAssetPath);
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
  let firstNorm = 0;
  let secondNorm = 0;
  const length = Math.min(first.length, second.length);
  for (let index = 0; index < length; index += 1) {
    value += first[index] * second[index];
    firstNorm += first[index] ** 2;
    secondNorm += second[index] ** 2;
  }
  return clamp(value / Math.max(.000001, Math.sqrt(firstNorm * secondNorm)));
}

function countSimilarity(first: number, second: number) {
  return Math.exp(-Math.abs(Math.log((first + 1) / (second + 1))));
}

function descriptorSimilarity(specimen: WingDescriptor, reference: WingDescriptor) {
  const vectorSimilarity = cosine(specimen.vector, reference.vector);
  const fineSimilarity = cosine(specimen.fineCells, reference.fineCells);
  const interiorSimilarity = cosine(specimen.interiorCells, reference.interiorCells);
  const directionSimilarity = cosine(specimen.directions, reference.directions);
  const endpointSimilarity = specimen.interiorEndpointCount || reference.interiorEndpointCount
    ? cosine(specimen.endpointMap, reference.endpointMap)
    : 1;
  const endpointCountSimilarity = countSimilarity(specimen.interiorEndpointCount, reference.interiorEndpointCount);
  const aspectSimilarity = Math.exp(-Math.abs(Math.log(Math.max(.2, specimen.aspect) / Math.max(.2, reference.aspect))));
  const densitySimilarity = Math.exp(-Math.abs(Math.log((specimen.density + .01) / (reference.density + .01))));
  return clamp(
    vectorSimilarity * .32
    + fineSimilarity * .13
    + interiorSimilarity * .28
    + directionSimilarity * .09
    + endpointSimilarity * .08
    + endpointCountSimilarity * .03
    + aspectSimilarity * .06
    + densitySimilarity * .01,
  );
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
    { label: "basal vein-field layout", score: regionSimilarity(specimen, reference, (column) => column <= 4) },
    { label: "apical line distribution", score: regionSimilarity(specimen, reference, (column) => column >= 7) },
    { label: "anterior vein-field layout", score: regionSimilarity(specimen, reference, (_column, row) => row <= 2) },
    { label: "posterior vein-field layout", score: regionSimilarity(specimen, reference, (_column, row) => row >= 4) },
    { label: "interior vein endings", score: cosine(specimen.endpointMap, reference.endpointMap) },
    { label: "internal vein field", score: cosine(specimen.interiorCells, reference.interiorCells) },
    { label: "overall wing proportions", score: Math.exp(-Math.abs(Math.log(Math.max(.2, specimen.aspect) / Math.max(.2, reference.aspect)))) },
  ];
  return regions.sort((a, b) => b.score - a.score).slice(0, 3).map((region) => region.label);
}

function illustratedTaxon(reference: WingReferenceRecord) {
  if (reference.taxon) {
    return {
      taxon: reference.taxon,
      rank: reference.rank ?? "illustrated reference",
    };
  }
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
    // Multiple morphotypes must broaden a family's coverage without giving that
    // family several votes when the global photo orientation is chosen.
    const bestByFamily = new Map<string, number>();
    loadedReferences.forEach(({ reference, descriptor }) => {
      const similarity = descriptorSimilarity(prepared.descriptor, descriptor);
      bestByFamily.set(reference.family, Math.max(bestByFamily.get(reference.family) ?? 0, similarity));
    });
    const similarities = [...bestByFamily.values()].sort((a, b) => b - a);
    const score = (similarities[0] ?? 0) * .62 + (similarities[1] ?? similarities[0] ?? 0) * .25 + (similarities[2] ?? similarities[0] ?? 0) * .13;
    return { orientation, prepared, score };
  }).sort((a, b) => b.score - a.score);

  const selected = orientationScores[0];
  const orientationMargin = selected.score - (orientationScores[1]?.score ?? 0);
  const orientationConfidence: WingOrientationMatch["confidence"] = !autoOrient || orientationMargin >= .04
    ? "high"
    : orientationMargin >= .015 ? "medium" : "low";
  const quality = qualityFromPrepared(selected.prepared);
  const referenceScores = loadedReferences.map(({ id, reference, descriptor }) => {
    const similarity = descriptorSimilarity(selected.prepared.descriptor, descriptor);
    const taxon = illustratedTaxon(reference);
    return { id, reference, similarity, reasons: matchReasons(selected.prepared.descriptor, descriptor), ...taxon };
  }).sort((a, b) => b.similarity - a.similarity);

  // Several morphotypes may represent one variable family. Keep the strongest
  // morphotype for that family so three cards never repeat the same family.
  const familyScores = new Map<string, (typeof referenceScores)[number]>();
  referenceScores.forEach((candidate) => {
    const current = familyScores.get(candidate.reference.family);
    if (!current || candidate.similarity > current.similarity) familyScores.set(candidate.reference.family, candidate);
  });
  const scores = [...familyScores.values()].sort((a, b) => b.similarity - a.similarity);

  const top = scores.slice(0, 3);
  const maximum = top[0].similarity;
  const margin = top.length > 1 ? top[0].similarity - top[1].similarity : top[0].similarity;
  const absoluteEvidence = clamp((maximum - .48) / .42);
  const separationEvidence = clamp((margin - .004) / .055);
  const qualityEvidence = clamp((quality.score - 24) / 66);
  const evidence = absoluteEvidence * (.7 + separationEvidence * .3) * (.72 + qualityEvidence * .28);
  const rejectionReasons: string[] = [];
  if (maximum < .60) rejectionReasons.push("the cleaned vein field remains too different from every reference");
  if (maximum < .74 && margin < .01) rejectionReasons.push("the nearest references are too similar to one another for a family call");
  if (quality.score < 32) rejectionReasons.push("the photograph does not retain enough clear vein evidence");
  let noReliableMatch = rejectionReasons.length > 0;
  if (!noReliableMatch && evidence < .30) {
    noReliableMatch = true;
    rejectionReasons.push("combined image evidence remains below the acceptance threshold");
  }
  const unknownProbability = noReliableMatch
    ? clamp(Math.max(.55, 1 - evidence), .55, .92)
    : clamp(1 - evidence, .1, .52);
  const candidateEvidence = 1 - unknownProbability;
  const exponentials = top.map((candidate) => Math.exp((candidate.similarity - maximum) * 16));
  const exponentialTotal = exponentials.reduce((sum, value) => sum + value, 0) || 1;
  const candidates = top.map((candidate, index): WingIdCandidate => ({
    ...candidate,
    family: candidate.reference.family,
    probability: exponentials[index] / exponentialTotal * candidateEvidence,
  }));
  return {
    candidates,
    unknownProbability,
    quality,
    uncertain: noReliableMatch || maximum < .68 || margin < .018 || quality.score < 45 || orientationConfidence === "low",
    noReliableMatch,
    rejectionReasons,
    referencesCompared: loadedReferences.length,
    orientation: {
      ...selected.orientation,
      automatic: autoOrient,
      confidence: orientationConfidence,
      score: selected.score,
    },
    analysisPreview: selected.prepared.preview,
  };
}
