/*
 * Geometry for the Compare workbench. Pure functions only, so they can be
 * unit-tested without a browser.
 *
 * Coordinate systems
 *  - plate space: natural pixel coordinates of one reference image (0…width, 0…height)
 *  - stage space: a fixed STAGE_WIDTH × STAGE_HEIGHT drawing board shared by both plates
 */

export const STAGE_WIDTH = 1000;
export const STAGE_HEIGHT = 560;
const FIT_WIDTH = STAGE_WIDTH * .88;
const FIT_HEIGHT = STAGE_HEIGHT * .82;

export type Vec = { x: number; y: number };
export type PlateSize = { width: number; height: number };

/** User transform of one plate, applied on top of the automatic fit. */
export type PlateTransform = {
  /** stage-space offset of the plate centre from the stage centre */
  x: number;
  y: number;
  /** multiplier of the automatic fit scale (1 = fitted) */
  scale: number;
  /** degrees, clockwise on screen */
  rotation: number;
  mirror: boolean;
};

export type Landmarks = { base?: Vec; apex?: Vec };

export const IDENTITY_TRANSFORM: PlateTransform = { x: 0, y: 0, scale: 1, rotation: 0, mirror: false };

export const SCALE_LIMITS = { min: .2, max: 6 } as const;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeDegrees(value: number) {
  const wrapped = ((value % 360) + 540) % 360 - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

export function sanitizeTransform(value: Partial<PlateTransform> | null | undefined): PlateTransform {
  const number = (input: unknown, fallback: number) => (typeof input === "number" && Number.isFinite(input) ? input : fallback);
  return {
    x: clamp(number(value?.x, 0), -STAGE_WIDTH * 2, STAGE_WIDTH * 2),
    y: clamp(number(value?.y, 0), -STAGE_HEIGHT * 2, STAGE_HEIGHT * 2),
    scale: clamp(number(value?.scale, 1), SCALE_LIMITS.min, SCALE_LIMITS.max),
    rotation: normalizeDegrees(number(value?.rotation, 0)),
    mirror: value?.mirror === true,
  };
}

/** Scale that fits a plate into the stage before any user transform. */
export function fitScale(size: PlateSize) {
  const width = size.width > 0 ? size.width : 1;
  const height = size.height > 0 ? size.height : 1;
  return Math.min(FIT_WIDTH / width, FIT_HEIGHT / height);
}

/** SVG transform attribute that places a plate (drawn at 0,0 with its natural size) on the stage. */
export function plateTransformAttribute(size: PlateSize, transform: PlateTransform) {
  const k = fitScale(size) * transform.scale;
  const sx = transform.mirror ? -k : k;
  return `translate(${(STAGE_WIDTH / 2 + transform.x).toFixed(3)} ${(STAGE_HEIGHT / 2 + transform.y).toFixed(3)}) rotate(${transform.rotation.toFixed(3)}) scale(${sx.toFixed(5)} ${k.toFixed(5)}) translate(${(-size.width / 2).toFixed(3)} ${(-size.height / 2).toFixed(3)})`;
}

/** plate space → stage space */
export function plateToStage(point: Vec, size: PlateSize, transform: PlateTransform): Vec {
  const k = fitScale(size) * transform.scale;
  const local = { x: (point.x - size.width / 2) * k * (transform.mirror ? -1 : 1), y: (point.y - size.height / 2) * k };
  const radians = transform.rotation * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: STAGE_WIDTH / 2 + transform.x + local.x * cos - local.y * sin,
    y: STAGE_HEIGHT / 2 + transform.y + local.x * sin + local.y * cos,
  };
}

/** stage space → plate space (inverse of plateToStage) */
export function stageToPlate(point: Vec, size: PlateSize, transform: PlateTransform): Vec {
  const k = fitScale(size) * transform.scale;
  const radians = -transform.rotation * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - STAGE_WIDTH / 2 - transform.x;
  const dy = point.y - STAGE_HEIGHT / 2 - transform.y;
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  return {
    x: rx / (k * (transform.mirror ? -1 : 1)) + size.width / 2,
    y: ry / k + size.height / 2,
  };
}

export type LandmarkAlignment =
  | { ok: true; transform: PlateTransform; relativeScale: number; rotationChange: number }
  | { ok: false; reason: string };

/**
 * Similarity transform (translation, rotation, uniform scale) that puts the
 * moving plate's base and apex landmarks exactly onto the fixed plate's
 * landmarks on the stage. The moving plate keeps its current mirror state.
 *
 * This normalizes size to the base–apex distance. It must never be read as an
 * absolute size comparison: none of the current plates has a known scale.
 */
export function alignByLandmarks(
  fixed: { size: PlateSize; transform: PlateTransform; landmarks: Landmarks },
  moving: { size: PlateSize; transform: PlateTransform; landmarks: Landmarks },
): LandmarkAlignment {
  const { base: fb, apex: fa } = fixed.landmarks;
  const { base: mb, apex: ma } = moving.landmarks;
  if (!fb || !fa) return { ok: false, reason: "Place both base and apex on plate A first." };
  if (!mb || !ma) return { ok: false, reason: "Place both base and apex on plate B first." };

  const targetBase = plateToStage(fb, fixed.size, fixed.transform);
  const targetApex = plateToStage(fa, fixed.size, fixed.transform);
  const target = { x: targetApex.x - targetBase.x, y: targetApex.y - targetBase.y };
  const sign = moving.transform.mirror ? -1 : 1;
  const source = { x: (ma.x - mb.x) * sign, y: ma.y - mb.y };
  const targetLength = Math.hypot(target.x, target.y);
  const sourceLength = Math.hypot(source.x, source.y);
  if (targetLength < 1e-6 || sourceLength < 1e-6) return { ok: false, reason: "Base and apex must be placed at different points." };

  const fit = fitScale(moving.size);
  const k = targetLength / sourceLength;
  const scale = k / fit;
  if (scale < SCALE_LIMITS.min || scale > SCALE_LIMITS.max) {
    return { ok: false, reason: `Alignment would need ×${scale.toFixed(2)} scale, outside the supported ${SCALE_LIMITS.min}–${SCALE_LIMITS.max} range. Check the landmarks.` };
  }
  const theta = Math.atan2(target.y, target.x) - Math.atan2(source.y, source.x);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const local = { x: (mb.x - moving.size.width / 2) * k * sign, y: (mb.y - moving.size.height / 2) * k };
  const rotatedLocal = { x: local.x * cos - local.y * sin, y: local.x * sin + local.y * cos };
  const transform = sanitizeTransform({
    x: targetBase.x - rotatedLocal.x - STAGE_WIDTH / 2,
    y: targetBase.y - rotatedLocal.y - STAGE_HEIGHT / 2,
    scale,
    rotation: theta * 180 / Math.PI,
    mirror: moving.transform.mirror,
  });
  return {
    ok: true,
    transform,
    relativeScale: (fit * scale) / (fitScale(fixed.size) * fixed.transform.scale),
    rotationChange: normalizeDegrees(transform.rotation - moving.transform.rotation),
  };
}

/** Apparent base→apex angle on the stage, in degrees (0 = pointing right). */
export function landmarkAxisAngle(size: PlateSize, transform: PlateTransform, landmarks: Landmarks) {
  if (!landmarks.base || !landmarks.apex) return null;
  const base = plateToStage(landmarks.base, size, transform);
  const apex = plateToStage(landmarks.apex, size, transform);
  return Math.atan2(apex.y - base.y, apex.x - base.x) * 180 / Math.PI;
}

export type ProportionReport = {
  aspectA: number;
  aspectB: number;
  /** relative difference of the file canvas aspect ratios, 0.12 = 12 % */
  aspectDifference: number;
  aspectWarning: boolean;
  /** displayed size of B relative to A on the stage (1 = same pixels per plate width) */
  displayedScaleRatio: number;
  scaleWarning: boolean;
  /** base–apex length ratio B/A in stage units when all four landmarks exist */
  landmarkLengthRatio: number | null;
};

export function proportionReport(
  a: { size: PlateSize; transform: PlateTransform; landmarks: Landmarks },
  b: { size: PlateSize; transform: PlateTransform; landmarks: Landmarks },
): ProportionReport {
  const aspectA = a.size.width / Math.max(1, a.size.height);
  const aspectB = b.size.width / Math.max(1, b.size.height);
  const aspectDifference = Math.abs(aspectA - aspectB) / Math.max(aspectA, aspectB);
  const displayedA = fitScale(a.size) * a.transform.scale * a.size.width;
  const displayedB = fitScale(b.size) * b.transform.scale * b.size.width;
  const displayedScaleRatio = displayedB / Math.max(1e-6, displayedA);
  let landmarkLengthRatio: number | null = null;
  if (a.landmarks.base && a.landmarks.apex && b.landmarks.base && b.landmarks.apex) {
    const lengthOnStage = (plate: typeof a) => {
      const base = plateToStage(plate.landmarks.base!, plate.size, plate.transform);
      const apex = plateToStage(plate.landmarks.apex!, plate.size, plate.transform);
      return Math.hypot(apex.x - base.x, apex.y - base.y);
    };
    landmarkLengthRatio = lengthOnStage(b) / Math.max(1e-6, lengthOnStage(a));
  }
  return {
    aspectA,
    aspectB,
    aspectDifference,
    aspectWarning: aspectDifference > .1,
    displayedScaleRatio,
    scaleWarning: Math.abs(Math.log(displayedScaleRatio)) > Math.log(1.15),
    landmarkLengthRatio,
  };
}

/* ---------- viewport (zoom + pan) ---------- */

export type StageView = { zoom: number; cx: number; cy: number };
export const DEFAULT_VIEW: StageView = { zoom: 1, cx: STAGE_WIDTH / 2, cy: STAGE_HEIGHT / 2 };
export const ZOOM_LIMITS = { min: 1, max: 8 } as const;

export function clampView(view: StageView): StageView {
  const zoom = clamp(Number.isFinite(view.zoom) ? view.zoom : 1, ZOOM_LIMITS.min, ZOOM_LIMITS.max);
  const halfW = STAGE_WIDTH / zoom / 2;
  const halfH = STAGE_HEIGHT / zoom / 2;
  return {
    zoom,
    cx: clamp(Number.isFinite(view.cx) ? view.cx : STAGE_WIDTH / 2, halfW, STAGE_WIDTH - halfW),
    cy: clamp(Number.isFinite(view.cy) ? view.cy : STAGE_HEIGHT / 2, halfH, STAGE_HEIGHT - halfH),
  };
}

export function viewBoxFor(view: StageView) {
  const safe = clampView(view);
  const width = STAGE_WIDTH / safe.zoom;
  const height = STAGE_HEIGHT / safe.zoom;
  return `${(safe.cx - width / 2).toFixed(2)} ${(safe.cy - height / 2).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
}

/** Zoom by `factor` while keeping the stage point `focus` under the same screen position. */
export function zoomAt(view: StageView, factor: number, focus?: Vec): StageView {
  const nextZoom = clamp(view.zoom * factor, ZOOM_LIMITS.min, ZOOM_LIMITS.max);
  if (!focus) return clampView({ ...view, zoom: nextZoom });
  const ratio = view.zoom / nextZoom;
  return clampView({
    zoom: nextZoom,
    cx: focus.x + (view.cx - focus.x) * ratio,
    cy: focus.y + (view.cy - focus.y) * ratio,
  });
}

export function panBy(view: StageView, dxStage: number, dyStage: number): StageView {
  return clampView({ ...view, cx: view.cx - dxStage, cy: view.cy - dyStage });
}

/**
 * Feature-matrix values for an SVG feColorMatrix that recolours dark line art
 * towards `rgb` (0…1) while keeping the white membrane white.
 */
export function lineTintMatrix(rgb: [number, number, number]) {
  const rows = rgb.map((channel) => {
    const keep = 1 - channel;
    return [keep * .2126, keep * .7152, keep * .0722, 0, channel];
  });
  return [...rows.flat(), 0, 0, 0, 1, 0].map((value) => Number(value.toFixed(4))).join(" ");
}
