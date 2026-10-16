"use client";

import { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import ReferenceMetadataCard from "./components/ReferenceMetadataCard";
import SearchCombobox from "./components/SearchCombobox";
import {
  alignByLandmarks,
  clamp,
  DEFAULT_VIEW,
  IDENTITY_TRANSFORM,
  Landmarks,
  lineTintMatrix,
  normalizeDegrees,
  panBy,
  plateToStage,
  PlateTransform,
  plateTransformAttribute,
  proportionReport,
  sanitizeTransform,
  SCALE_LIMITS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  stageToPlate,
  StageView,
  Vec,
  viewBoxFor,
  zoomAt,
} from "./lib/compareMath";
import { LOCAL_REFERENCE_RECORDS } from "./lib/referenceIndex";
import { IMAGE_TYPE_LABEL, searchReferences, UNKNOWN, WingReferenceRecord } from "./lib/referenceModel";
import { readStoredJson, STORAGE_KEYS, writeStoredJson } from "./lib/safeStorage";

type Slot = "A" | "B";
type ViewMode = "split" | "overlay" | "blink" | "difference";
type Tool = "pan" | "move" | "base" | "apex";

type CompareSession = {
  schema: "entowing-compare-session/1";
  ids: Record<Slot, string>;
  view: ViewMode;
  transforms: Record<Slot, PlateTransform>;
  /** landmarks are stored per plate id so they survive swapping and re-selection */
  landmarks: Record<string, Landmarks>;
  opacity: number;
  tint: boolean;
  syncZoom: boolean;
  blinkMs: number;
  showLandmarks: boolean;
};

export type ComparePair = { a?: string | null; b?: string | null };

const PLATES = LOCAL_REFERENCE_RECORDS;
const PLATE_BY_ID = new Map(PLATES.map((record) => [record.id, record]));
const SLOTS: Slot[] = ["A", "B"];
const SLOT_TINT: Record<Slot, [number, number, number]> = { A: [.16, .52, .45], B: [.74, .25, .45] };
const VIEW_LABEL: Record<ViewMode, string> = { split: "Split", overlay: "Overlay", blink: "Blink A/B", difference: "Difference" };
const TOOL_LABEL: Record<Tool, string> = { pan: "Pan view", move: "Move plate", base: "Place base", apex: "Place apex" };
const TOOL_ICON: Record<Tool, string> = { pan: "✥", move: "⇲", base: "◼", apex: "▲" };

function validId(id: string | null | undefined) {
  return id && PLATE_BY_ID.has(id) ? id : null;
}

function fallbackId(preferred: string, index: number) {
  return validId(preferred) ?? PLATES[index]?.id ?? PLATES[0]?.id ?? "";
}

function sanitizeLandmarks(value: unknown): Record<string, Landmarks> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const point = (raw: unknown): Vec | undefined => {
    if (!raw || typeof raw !== "object") return undefined;
    const x = Number((raw as Vec).x);
    const y = Number((raw as Vec).y);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
  };
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([id, raw]) => {
    if (!PLATE_BY_ID.has(id) || !raw || typeof raw !== "object") return [];
    const entry = raw as Landmarks;
    const landmarks: Landmarks = {};
    const base = point(entry.base);
    const apex = point(entry.apex);
    if (base) landmarks.base = base;
    if (apex) landmarks.apex = apex;
    return base || apex ? [[id, landmarks]] : [];
  }));
}

function initialSession(pair?: ComparePair | null): CompareSession {
  const stored = readStoredJson<Partial<CompareSession>>(STORAGE_KEYS.compareSession);
  const base: CompareSession = {
    schema: "entowing-compare-session/1",
    ids: { A: fallbackId("syrphidae", 0), B: fallbackId("muscidae", 1) },
    view: "split",
    transforms: { A: { ...IDENTITY_TRANSFORM }, B: { ...IDENTITY_TRANSFORM } },
    landmarks: {},
    opacity: 55,
    tint: true,
    syncZoom: true,
    blinkMs: 800,
    showLandmarks: true,
  };
  if (stored && typeof stored === "object") {
    const ids = stored.ids ?? ({} as Partial<Record<Slot, string>>);
    base.ids = { A: validId(ids.A) ?? base.ids.A, B: validId(ids.B) ?? base.ids.B };
    if (stored.view && stored.view in VIEW_LABEL) base.view = stored.view;
    base.transforms = { A: sanitizeTransform(stored.transforms?.A), B: sanitizeTransform(stored.transforms?.B) };
    base.landmarks = sanitizeLandmarks(stored.landmarks);
    base.opacity = clamp(Number(stored.opacity) || base.opacity, 10, 90);
    base.tint = stored.tint !== false;
    base.syncZoom = stored.syncZoom !== false;
    base.blinkMs = clamp(Number(stored.blinkMs) || base.blinkMs, 400, 2000);
    base.showLandmarks = stored.showLandmarks !== false;
  }
  // An explicit request from the Atlas wins over the stored session; new plates start fitted.
  const requestedA = validId(pair?.a);
  const requestedB = validId(pair?.b);
  if (requestedA && requestedA !== base.ids.A) {
    base.ids.A = requestedA;
    base.transforms.A = { ...IDENTITY_TRANSFORM };
  }
  if (requestedB && requestedB !== base.ids.B) {
    base.ids.B = requestedB;
    base.transforms.B = { ...IDENTITY_TRANSFORM };
  }
  return base;
}

function prefersReducedMotion() {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function plateName(record: WingReferenceRecord) {
  return `${record.family} — ${record.taxon !== UNKNOWN ? record.taxon : record.plateTitle}`;
}

const searchPlates = (items: WingReferenceRecord[], query: string) => searchReferences(items, query);

function cleanId(raw: string) {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

type StagePlate = { slot: Slot; record: WingReferenceRecord; transform: PlateTransform; landmarks: Landmarks };

function CompareStage({
  plates,
  mode,
  view,
  onViewChange,
  activeSlot,
  onActivate,
  tool,
  onTransform,
  onLandmark,
  opacity,
  tint,
  showLandmarks,
  label,
  children,
}: {
  plates: StagePlate[];
  mode: ViewMode;
  view: StageView;
  onViewChange: (next: StageView) => void;
  activeSlot: Slot;
  onActivate: (slot: Slot) => void;
  tool: Tool;
  onTransform: (slot: Slot, next: PlateTransform) => void;
  onLandmark: (slot: Slot, kind: "base" | "apex", point: Vec) => void;
  opacity: number;
  tint: boolean;
  showLandmarks: boolean;
  label: string;
  children?: ReactNode;
}) {
  const uid = cleanId(useId());
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ pointerId: number; kind: "pan" | "move"; slot: Slot; startX: number; startY: number; startView: StageView; startTransform: PlateTransform } | null>(null);
  const latest = useRef({ view, onViewChange });
  useEffect(() => {
    latest.current = { view, onViewChange };
  });

  const targetSlot = plates.length === 1 ? plates[0].slot : activeSlot;
  const target = plates.find((plate) => plate.slot === targetSlot) ?? plates[0];

  const toStage = useCallback((clientX: number, clientY: number): Vec | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const local = point.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // Native listener: React registers wheel as passive, so preventDefault would be ignored.
    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      const focus = toStage(event.clientX, event.clientY) ?? undefined;
      latest.current.onViewChange(zoomAt(latest.current.view, Math.exp(-event.deltaY * .0025), focus));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [toStage]);

  function pointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || !target) return;
    event.currentTarget.focus({ preventScroll: true });
    if (plates.length === 1 && plates[0].slot !== activeSlot) onActivate(plates[0].slot);
    const point = toStage(event.clientX, event.clientY);
    if (!point) return;
    if (tool === "base" || tool === "apex") {
      const local = stageToPlate(point, { width: target.record.asset.width, height: target.record.asset.height }, target.transform);
      const w = target.record.asset.width;
      const h = target.record.asset.height;
      if (local.x < -w * .1 || local.x > w * 1.1 || local.y < -h * .1 || local.y > h * 1.1) return;
      onLandmark(target.slot, tool, { x: Number(local.x.toFixed(2)), y: Number(local.y.toFixed(2)) });
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, kind: tool === "move" ? "move" : "pan", slot: target.slot, startX: event.clientX, startY: event.clientY, startView: view, startTransform: target.transform };
  }

  function pointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const gesture = drag.current;
    const ctm = svgRef.current?.getScreenCTM();
    if (!gesture || gesture.pointerId !== event.pointerId || !ctm) return;
    const dx = (event.clientX - gesture.startX) / ctm.a;
    const dy = (event.clientY - gesture.startY) / ctm.d;
    if (gesture.kind === "pan") onViewChange(panBy(gesture.startView, dx, dy));
    else onTransform(gesture.slot, sanitizeTransform({ ...gesture.startTransform, x: gesture.startTransform.x + dx, y: gesture.startTransform.y + dy }));
  }

  function pointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function keyDown(event: ReactKeyboardEvent<SVGSVGElement>) {
    if (!target) return;
    const step = event.shiftKey ? 25 : 5;
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const key = event.key;
    if (arrows[key]) {
      event.preventDefault();
      const [dx, dy] = arrows[key];
      if (tool === "pan") onViewChange(panBy(view, -dx / view.zoom, -dy / view.zoom));
      else onTransform(target.slot, sanitizeTransform({ ...target.transform, x: target.transform.x + dx / view.zoom, y: target.transform.y + dy / view.zoom }));
    } else if (key === "+" || key === "=") {
      event.preventDefault();
      onViewChange(zoomAt(view, 1.25));
    } else if (key === "-" || key === "_") {
      event.preventDefault();
      onViewChange(zoomAt(view, .8));
    } else if (key === "0") {
      event.preventDefault();
      onViewChange(DEFAULT_VIEW);
    } else if (key === "[" || key === "]") {
      event.preventDefault();
      const delta = (key === "[" ? -1 : 1) * (event.shiftKey ? 5 : .5);
      onTransform(target.slot, sanitizeTransform({ ...target.transform, rotation: target.transform.rotation + delta }));
    } else if (key.toLowerCase() === "m") {
      event.preventDefault();
      onTransform(target.slot, { ...target.transform, mirror: !target.transform.mirror });
    } else if ((key === "a" || key === "b" || key === "A" || key === "B") && plates.length > 1) {
      event.preventDefault();
      onActivate(key.toUpperCase() as Slot);
    }
  }

  const isDifference = mode === "difference";
  const background = isDifference ? "#000000" : "#fbfaf5";
  const zoom = view.zoom;

  return (
    <div className={`cmp-stage tool-${tool} mode-${mode}`}>
      <svg
        ref={svgRef}
        className="cmp-stage-svg"
        viewBox={viewBoxFor(view)}
        tabIndex={0}
        role="application"
        aria-roledescription="comparison stage"
        aria-label={`${label}. Tool: ${TOOL_LABEL[tool]}. Arrow keys ${tool === "pan" ? "pan the view" : "move the active plate"}; plus and minus zoom; 0 fits; brackets rotate; M mirrors.`}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onKeyDown={keyDown}
      >
        <defs>
          <pattern id={`${uid}-grid`} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={isDifference ? "rgba(255,255,255,.06)" : "rgba(41,72,59,.07)"} strokeWidth="1" />
          </pattern>
          {SLOTS.map((slot) => <filter key={`tint-${slot}`} id={`${uid}-tint-${slot}`} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={lineTintMatrix(SLOT_TINT[slot])} />
          </filter>)}
          {SLOTS.map((slot) => {
            const [r, g, b] = SLOT_TINT[slot].map((channel) => Math.min(1, channel + .28));
            return <filter key={`diff-${slot}`} id={`${uid}-diff-${slot}`} colorInterpolationFilters="sRGB" x="0" y="0" width="1" height="1">
              <feFlood floodColor="#ffffff" result="paper" />
              <feComposite in="SourceGraphic" in2="paper" operator="over" result="flat" />
              <feColorMatrix in="flat" type="matrix" values={`${-r * .2126} ${-r * .7152} ${-r * .0722} 0 ${r} ${-g * .2126} ${-g * .7152} ${-g * .0722} 0 ${g} ${-b * .2126} ${-b * .7152} ${-b * .0722} 0 ${b} 0 0 0 0 1`} />
            </filter>;
          })}
        </defs>
        <rect x={-STAGE_WIDTH} y={-STAGE_HEIGHT} width={STAGE_WIDTH * 3} height={STAGE_HEIGHT * 3} fill={background} />
        <rect x={-STAGE_WIDTH} y={-STAGE_HEIGHT} width={STAGE_WIDTH * 3} height={STAGE_HEIGHT * 3} fill={`url(#${uid}-grid)`} pointerEvents="none" />
        <g style={{ isolation: "isolate" }}>
          {plates.map((plate, index) => {
            const size = { width: plate.record.asset.width, height: plate.record.asset.height };
            const overlayLike = mode === "overlay";
            const filter = isDifference
              ? `url(#${uid}-diff-${plate.slot})`
              : overlayLike && tint ? `url(#${uid}-tint-${plate.slot})` : undefined;
            const style = isDifference
              ? (index > 0 ? { mixBlendMode: "screen" as const } : undefined)
              : overlayLike ? { mixBlendMode: "multiply" as const } : undefined;
            const layerOpacity = overlayLike && index > 0 ? opacity / 100 : 1;
            return <g key={plate.slot} className={`cmp-plate slot-${plate.slot.toLowerCase()} ${plate.slot === targetSlot ? "is-target" : ""}`} transform={plateTransformAttribute(size, plate.transform)}>
              <g filter={filter} style={style} opacity={layerOpacity}>
                <image href={plate.record.asset.path} x="0" y="0" width={size.width} height={size.height} preserveAspectRatio="xMidYMid meet" />
              </g>
              {(tool === "move" || plates.length > 1) && plate.slot === targetSlot && <rect className="cmp-plate-bounds" x="0" y="0" width={size.width} height={size.height} fill="none" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
            </g>;
          })}
        </g>
        {showLandmarks && plates.map((plate) => {
          const size = { width: plate.record.asset.width, height: plate.record.asset.height };
          const base = plate.landmarks.base ? plateToStage(plate.landmarks.base, size, plate.transform) : null;
          const apex = plate.landmarks.apex ? plateToStage(plate.landmarks.apex, size, plate.transform) : null;
          const r = 7 / zoom;
          return <g key={`landmarks-${plate.slot}`} className={`cmp-landmarks slot-${plate.slot.toLowerCase()}`} pointerEvents="none">
            {base && apex && <line x1={base.x} y1={base.y} x2={apex.x} y2={apex.y} vectorEffect="non-scaling-stroke" className="cmp-axis" />}
            {base && <g><rect x={base.x - r} y={base.y - r} width={r * 2} height={r * 2} vectorEffect="non-scaling-stroke" /><text x={base.x + r * 1.5} y={base.y - r * 1.2} style={{ fontSize: `${12 / zoom}px` }}>{plate.slot} base</text></g>}
            {apex && <g><path d={`M ${apex.x} ${apex.y - r * 1.25} L ${apex.x + r * 1.1} ${apex.y + r * .8} L ${apex.x - r * 1.1} ${apex.y + r * .8} Z`} vectorEffect="non-scaling-stroke" /><text x={apex.x + r * 1.5} y={apex.y - r * 1.2} style={{ fontSize: `${12 / zoom}px` }}>{plate.slot} apex</text></g>}
          </g>;
        })}
      </svg>
      {children}
    </div>
  );
}

function NumberField({ label, value, min, max, step, onChange, suffix }: { label: string; value: number; min: number; max: number; step: number; onChange: (next: number) => void; suffix?: string }) {
  const id = useId();
  return (
    <div className="cmp-number-field">
      <label htmlFor={id}>{label}</label>
      <input id={`${id}-range`} type="range" aria-label={`${label} slider`} min={min} max={max} step={step} value={clamp(value, min, max)} onChange={(event) => onChange(Number(event.target.value))} />
      <span>
        <input id={id} type="number" min={min} max={max} step={step} value={Number(value.toFixed(step < 1 ? 2 : 0))} onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) onChange(clamp(next, min, max)); }} />
        {suffix && <small>{suffix}</small>}
      </span>
    </div>
  );
}

export default function WingCompare({ initialPair, onOpenInMapper, onOpenInAtlas }: {
  initialPair?: ComparePair | null;
  onOpenInMapper?: (referenceId: string) => void;
  onOpenInAtlas?: (referenceId: string) => void;
}) {
  const [session, setSession] = useState<CompareSession>(() => initialSession(initialPair));
  const [views, setViews] = useState<Record<Slot, StageView>>({ A: DEFAULT_VIEW, B: DEFAULT_VIEW });
  const [activeSlot, setActiveSlot] = useState<Slot>("B");
  const [tool, setTool] = useState<Tool>("pan");
  const [blinkShowing, setBlinkShowing] = useState<Slot>("A");
  const [blinkRunning, setBlinkRunning] = useState(() => !prefersReducedMotion());
  const [reducedMotion] = useState(prefersReducedMotion);
  const [announcement, setAnnouncement] = useState("");
  const [alignmentNote, setAlignmentNote] = useState<string | null>(null);

  const records: Record<Slot, WingReferenceRecord> = useMemo(() => ({
    A: PLATE_BY_ID.get(session.ids.A) ?? PLATES[0],
    B: PLATE_BY_ID.get(session.ids.B) ?? PLATES[1] ?? PLATES[0],
  }), [session.ids.A, session.ids.B]);

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
    const timer = window.setTimeout(() => writeStoredJson(STORAGE_KEYS.compareSession, session), 300);
    return () => window.clearTimeout(timer);
  }, [session]);
  useEffect(() => () => {
    // Flush on unmount so a quick switch to another mode keeps the last change.
    writeStoredJson(STORAGE_KEYS.compareSession, sessionRef.current);
  }, []);

  useEffect(() => {
    if (session.view !== "blink" || !blinkRunning) return;
    const timer = window.setInterval(() => setBlinkShowing((current) => (current === "A" ? "B" : "A")), Math.max(400, session.blinkMs));
    return () => window.clearInterval(timer);
  }, [session.view, session.blinkMs, blinkRunning]);

  const landmarksFor = useCallback((slot: Slot) => session.landmarks[session.ids[slot]] ?? {}, [session.landmarks, session.ids]);

  const plateState = useCallback((slot: Slot) => ({
    size: { width: records[slot].asset.width, height: records[slot].asset.height },
    transform: session.transforms[slot],
    landmarks: landmarksFor(slot),
  }), [records, session.transforms, landmarksFor]);

  const report = useMemo(() => proportionReport(plateState("A"), plateState("B")), [plateState]);

  if (!PLATES.length) return null;

  function update(patch: Partial<CompareSession>) {
    setSession((current) => ({ ...current, ...patch }));
  }

  function setTransform(slot: Slot, next: PlateTransform) {
    setSession((current) => ({ ...current, transforms: { ...current.transforms, [slot]: sanitizeTransform(next) } }));
    setAlignmentNote(null);
  }

  function patchTransform(slot: Slot, patch: Partial<PlateTransform>) {
    setTransform(slot, { ...session.transforms[slot], ...patch });
  }

  function choosePlate(slot: Slot, record: WingReferenceRecord) {
    setSession((current) => ({
      ...current,
      ids: { ...current.ids, [slot]: record.id },
      transforms: { ...current.transforms, [slot]: { ...IDENTITY_TRANSFORM } },
    }));
    setAlignmentNote(null);
    setAnnouncement(`Plate ${slot} is now ${plateName(record)}. Its transform was reset to the fitted view.`);
  }

  function swapPlates() {
    setSession((current) => ({
      ...current,
      ids: { A: current.ids.B, B: current.ids.A },
      transforms: { A: current.transforms.B, B: current.transforms.A },
    }));
    setAnnouncement("Plates A and B swapped, including their transforms.");
  }

  function setLandmark(slot: Slot, kind: "base" | "apex", point: Vec) {
    const id = session.ids[slot];
    setSession((current) => ({ ...current, landmarks: { ...current.landmarks, [id]: { ...(current.landmarks[id] ?? {}), [kind]: point } } }));
    setAlignmentNote(null);
    setAnnouncement(`${slot} ${kind} placed at ${Math.round(point.x)}, ${Math.round(point.y)} px on ${records[slot].family}.`);
    if (kind === "base") setTool("apex");
    else if (!landmarksFor(slot).base) setTool("base");
    else setTool("pan");
  }

  function clearLandmarks(slot: Slot) {
    const id = session.ids[slot];
    setSession((current) => {
      const next = { ...current.landmarks };
      delete next[id];
      return { ...current, landmarks: next };
    });
    setAlignmentNote(null);
    setAnnouncement(`Landmarks cleared for plate ${slot}.`);
  }

  function resetPlate(slot: Slot) {
    setTransform(slot, { ...IDENTITY_TRANSFORM });
    setAnnouncement(`Plate ${slot} reset to its fitted position, scale and rotation.`);
  }

  function resetAll() {
    setSession((current) => ({ ...current, transforms: { A: { ...IDENTITY_TRANSFORM }, B: { ...IDENTITY_TRANSFORM } } }));
    setViews({ A: DEFAULT_VIEW, B: DEFAULT_VIEW });
    setAlignmentNote(null);
    setAnnouncement("All transforms and zoom reset.");
  }

  function alignBToA() {
    const result = alignByLandmarks(plateState("A"), plateState("B"));
    if (!result.ok) {
      setAlignmentNote(result.reason);
      setAnnouncement(result.reason);
      return;
    }
    setSession((current) => ({ ...current, transforms: { ...current.transforms, B: result.transform } }));
    const note = `B aligned to A by base and apex: B is drawn ×${result.relativeScale.toFixed(2)} relative to A and rotated ${result.rotationChange >= 0 ? "+" : ""}${result.rotationChange.toFixed(1)}°. This normalises base–apex length; it is not a size measurement.`;
    setAlignmentNote(note);
    setAnnouncement(note);
  }

  const isSplit = session.view === "split";
  const usesSharedView = !isSplit || session.syncZoom;

  function changeView(slot: Slot, next: StageView) {
    if (usesSharedView) setViews({ A: next, B: next });
    else setViews((current) => ({ ...current, [slot]: next }));
  }

  function zoomBy(factor: number) {
    if (usesSharedView) {
      const next = zoomAt(views.A, factor);
      setViews({ A: next, B: next });
    } else {
      setViews((current) => ({ ...current, [activeSlot]: zoomAt(current[activeSlot], factor) }));
    }
  }

  function fitView() {
    setViews({ A: DEFAULT_VIEW, B: DEFAULT_VIEW });
  }

  const stagePlate = (slot: Slot): StagePlate => ({ slot, record: records[slot], transform: session.transforms[slot], landmarks: landmarksFor(slot) });
  const zoomShown = Math.round((usesSharedView ? views.A.zoom : views[activeSlot].zoom) * 100);
  const bothScalesUnknown = records.A.scaleKnown !== true || records.B.scaleKnown !== true;
  const orientationUnknown = SLOTS.filter((slot) => records[slot].orientation.baseSide === UNKNOWN);
  const landmarkReady = SLOTS.every((slot) => landmarksFor(slot).base && landmarksFor(slot).apex);

  const stageCommon = {
    mode: session.view,
    activeSlot,
    onActivate: (slot: Slot) => setActiveSlot(slot),
    tool,
    onTransform: setTransform,
    onLandmark: setLandmark,
    opacity: session.opacity,
    tint: session.tint,
    showLandmarks: session.showLandmarks,
  };

  function plateLabel(slot: Slot) {
    return <div className={`cmp-plate-label slot-${slot.toLowerCase()}`}><b>{slot}</b><span>{records[slot].family}</span>{records[slot].taxon !== UNKNOWN && <em>{records[slot].taxon}</em>}</div>;
  }

  function landmarkText(slot: Slot) {
    const landmarks = landmarksFor(slot);
    const format = (point?: Vec) => (point ? `${Math.round(point.x)}, ${Math.round(point.y)} px` : "not placed");
    return <><span>base · {format(landmarks.base)}</span><span>apex · {format(landmarks.apex)}</span></>;
  }

  return (
    <section className="compare-page" aria-labelledby="compare-title">
      <header className="compare-hero">
        <div>
          <p className="eyebrow">COMPARATIVE MORPHOLOGY · REFERENCE PLATES · v0.48 WORKBENCH</p>
          <h1 id="compare-title">Two wings.<br /><em>One visual field.</em></h1>
        </div>
        <div className="compare-hero-copy">
          <p>Place two published Diptera wing references side by side, overlay them, blink between them, or view their difference. Move, scale and rotate each plate on its own, or align them by base and apex landmarks that you place.</p>
          <span>{PLATES.length} locally preserved plates · source and licence kept with every image</span>
        </div>
      </header>

      <div className="compare-workbench">
        <div className="cmp-selectors">
          {SLOTS.map((slot, index) => <div key={slot} className={`cmp-selector slot-${slot.toLowerCase()}`} style={{ order: index * 2 }}>
            <SearchCombobox<WingReferenceRecord>
              label={<><b className={`ref-meta-slot slot-${slot.toLowerCase()}`} aria-hidden="true">{slot}</b> {slot === "A" ? "Reference A · fixed" : "Reference B · moving"}</>}
              items={PLATES}
              getKey={(record) => record.id}
              search={searchPlates}
              selectedKey={records[slot].id}
              selectedLabel={plateName(records[slot])}
              placeholder="Family, genus or plate title…"
              onSelect={(record) => choosePlate(slot, record)}
              renderOption={(record) => <span className="cmp-option"><b>{record.family}</b><span>{record.taxon !== UNKNOWN ? <i>{record.taxon}</i> : record.plateTitle}</span><small>{IMAGE_TYPE_LABEL[record.imageType]} · {record.license.name}</small></span>}
              emptyMessage={(query) => <>No local plate matches “{query}”. Families with remote-only references can be opened from the Atlas.</>}
            />
          </div>)}
          <button className="compare-swap" type="button" onClick={swapPlates} style={{ order: 1 }} aria-label="Swap plates A and B">⇄ <span>SWAP</span></button>
        </div>

        <div className="cmp-toolbar" role="toolbar" aria-label="Comparison view and tools">
          <div className="cmp-segment" role="group" aria-label="Comparison view">
            <span>VIEW</span>
            <div>{(Object.keys(VIEW_LABEL) as ViewMode[]).map((mode) => <button key={mode} type="button" className={session.view === mode ? "active" : ""} aria-pressed={session.view === mode} onClick={() => update({ view: mode })}>{VIEW_LABEL[mode]}</button>)}</div>
          </div>
          <div className="cmp-segment" role="group" aria-label="Stage tool">
            <span>TOOL</span>
            <div>{(Object.keys(TOOL_LABEL) as Tool[]).map((item) => <button key={item} type="button" className={tool === item ? "active" : ""} aria-pressed={tool === item} onClick={() => setTool(item)}><i aria-hidden="true">{TOOL_ICON[item]}</i> {TOOL_LABEL[item]}</button>)}</div>
          </div>
          {!isSplit && <div className="cmp-segment" role="group" aria-label="Plate controlled by the stage">
            <span>ACTIVE</span>
            <div>{SLOTS.map((slot) => <button key={slot} type="button" className={`slot-${slot.toLowerCase()} ${activeSlot === slot ? "active" : ""}`} aria-pressed={activeSlot === slot} onClick={() => setActiveSlot(slot)}>Plate {slot}</button>)}</div>
          </div>}
          <div className="cmp-segment cmp-zoom" role="group" aria-label="Zoom">
            <span>ZOOM</span>
            <div>
              <button type="button" onClick={() => zoomBy(.8)} aria-label="Zoom out">−</button>
              <output aria-live="off">{zoomShown}%</output>
              <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in">＋</button>
              <button type="button" onClick={fitView}>Fit</button>
            </div>
          </div>
          <label className="cmp-check"><input type="checkbox" checked={session.syncZoom} disabled={!isSplit} onChange={(event) => update({ syncZoom: event.target.checked })} /><span>Synchronised zoom{!isSplit && " · always on in single-stage views"}</span></label>
          <label className="cmp-check"><input type="checkbox" checked={session.showLandmarks} onChange={(event) => update({ showLandmarks: event.target.checked })} /><span>Show landmarks</span></label>
        </div>

        {session.view === "overlay" && <div className="cmp-mode-options">
          <label className="cmp-range"><span>Plate B opacity <b>{session.opacity}%</b></span><input type="range" min="10" max="90" value={session.opacity} onChange={(event) => update({ opacity: Number(event.target.value) })} /></label>
          <label className="cmp-check"><input type="checkbox" checked={session.tint} onChange={(event) => update({ tint: event.target.checked })} /><span>Colour-code lines (A teal · B magenta)</span></label>
        </div>}
        {session.view === "blink" && <div className="cmp-mode-options">
          <button type="button" className="cmp-play" onClick={() => setBlinkRunning((running) => !running)} aria-pressed={blinkRunning}>{blinkRunning ? "❚❚ Pause blink" : "▶ Start blink"}</button>
          <div className="cmp-segment" role="group" aria-label="Show plate"><div>{SLOTS.map((slot) => <button key={slot} type="button" className={blinkShowing === slot ? "active" : ""} aria-pressed={blinkShowing === slot} onClick={() => { setBlinkRunning(false); setBlinkShowing(slot); }}>Show {slot}</button>)}</div></div>
          <label className="cmp-range"><span>Interval <b>{session.blinkMs} ms</b></span><input type="range" min="400" max="2000" step="100" value={session.blinkMs} onChange={(event) => update({ blinkMs: Number(event.target.value) })} /></label>
          {reducedMotion && <small>Reduced motion is on: blinking starts only when you press Start, and never faster than 2.5 changes per second.</small>}
        </div>}
        {session.view === "difference" && <div className="cmp-mode-options cmp-difference-key" aria-label="Difference view key">
          <span><i className="key-a" /> only in A</span><span><i className="key-b" /> only in B</span><span><i className="key-both" /> drawn in both</span>
          <small>Each plate is inverted and coloured, then the two are added as light: lines drawn by only one plate keep its colour, lines drawn by both turn near-white. This compares rendered line art pixel by pixel — line weight, drawing style and printed labels differ between sources, so coloured pixels do not by themselves mean different venation.</small>
        </div>}

        <div className={`cmp-stage-area view-${session.view}`}>
          {isSplit ? SLOTS.map((slot) => <CompareStage key={slot} {...stageCommon} plates={[stagePlate(slot)]} view={views[slot]} onViewChange={(next) => changeView(slot, next)} label={`Plate ${slot}: ${plateName(records[slot])}`}>
            {plateLabel(slot)}
          </CompareStage>) : <CompareStage
            {...stageCommon}
            plates={session.view === "blink" ? [stagePlate(blinkShowing)] : [stagePlate("A"), stagePlate("B")]}
            view={views.A}
            onViewChange={(next) => changeView("A", next)}
            label={session.view === "blink" ? `Blink comparison, showing plate ${blinkShowing}` : `${VIEW_LABEL[session.view]} of ${plateName(records.A)} and ${plateName(records.B)}`}
          >
            <div className="cmp-stage-legend">
              {session.view === "blink" ? plateLabel(blinkShowing) : SLOTS.map((slot) => <span key={slot}>{plateLabel(slot)}</span>)}
            </div>
          </CompareStage>}
        </div>
        <p className="cmp-hint">{tool === "pan" ? "Drag to pan" : tool === "move" ? `Drag to move plate ${isSplit ? "under the pointer" : activeSlot}` : `Click on plate ${isSplit ? "(either panel)" : activeSlot} to place its ${tool}`} · Ctrl/⌘ + scroll to zoom · focus the stage for keys: arrows, + / −, 0, [ ], M{!isSplit && ", A / B"}</p>

        <div className="cmp-plate-panels">
          {SLOTS.map((slot) => {
            const transform = session.transforms[slot];
            return <div key={slot} className={`cmp-plate-panel slot-${slot.toLowerCase()} ${activeSlot === slot ? "is-active" : ""}`}>
              <div className="cmp-plate-panel-head">
                <b className={`ref-meta-slot slot-${slot.toLowerCase()}`} aria-hidden="true">{slot}</b>
                <strong>Plate {slot} · {records[slot].family}</strong>
                <button type="button" className={activeSlot === slot ? "active" : ""} aria-pressed={activeSlot === slot} onClick={() => setActiveSlot(slot)}>{activeSlot === slot ? "Active on stage" : "Make active"}</button>
              </div>
              <NumberField label="Scale" value={transform.scale} min={SCALE_LIMITS.min} max={4} step={.01} suffix="× fit" onChange={(scale) => patchTransform(slot, { scale })} />
              <NumberField label="Rotation" value={transform.rotation} min={-180} max={180} step={.5} suffix="°" onChange={(rotation) => patchTransform(slot, { rotation: normalizeDegrees(rotation) })} />
              <div className="cmp-nudge" role="group" aria-label={`Move plate ${slot}`}>
                <span>Position</span>
                <button type="button" aria-label={`Move plate ${slot} left`} onClick={() => patchTransform(slot, { x: transform.x - 5 })}>←</button>
                <button type="button" aria-label={`Move plate ${slot} up`} onClick={() => patchTransform(slot, { y: transform.y - 5 })}>↑</button>
                <button type="button" aria-label={`Move plate ${slot} down`} onClick={() => patchTransform(slot, { y: transform.y + 5 })}>↓</button>
                <button type="button" aria-label={`Move plate ${slot} right`} onClick={() => patchTransform(slot, { x: transform.x + 5 })}>→</button>
                <small>{Math.round(transform.x)}, {Math.round(transform.y)}</small>
              </div>
              <div className="cmp-plate-actions">
                <button type="button" className={transform.mirror ? "active" : ""} aria-pressed={transform.mirror} onClick={() => patchTransform(slot, { mirror: !transform.mirror })}>⇋ Mirror</button>
                <button type="button" onClick={() => resetPlate(slot)}>↺ Reset {slot}</button>
              </div>
              <div className="cmp-landmark-box">
                <span>LANDMARKS · user-placed</span>
                <div>
                  <button type="button" className={tool === "base" && activeSlot === slot ? "active" : ""} onClick={() => { setActiveSlot(slot); setTool("base"); }}>◼ Place base</button>
                  <button type="button" className={tool === "apex" && activeSlot === slot ? "active" : ""} onClick={() => { setActiveSlot(slot); setTool("apex"); }}>▲ Place apex</button>
                  <button type="button" onClick={() => clearLandmarks(slot)} disabled={!landmarksFor(slot).base && !landmarksFor(slot).apex}>Clear</button>
                </div>
                <small>{landmarkText(slot)}</small>
              </div>
            </div>;
          })}
        </div>

        <div className="cmp-findings">
          <div className="cmp-findings-actions">
            <button type="button" className="cmp-align" onClick={alignBToA} disabled={!landmarkReady}>⌖ Align B to A by landmarks</button>
            <button type="button" onClick={resetAll}>↺ Reset all transforms</button>
            {!landmarkReady && <small>Place base and apex on both plates to enable alignment.</small>}
          </div>
          <dl className="cmp-proportions">
            <div><dt>Canvas ratio A</dt><dd>{report.aspectA.toFixed(2)} : 1 <small>{records.A.asset.width} × {records.A.asset.height}</small></dd></div>
            <div><dt>Canvas ratio B</dt><dd>{report.aspectB.toFixed(2)} : 1 <small>{records.B.asset.width} × {records.B.asset.height}</small></dd></div>
            <div><dt>Ratio difference</dt><dd className={report.aspectWarning ? "warn" : ""}>{Math.round(report.aspectDifference * 100)}%</dd></div>
            <div><dt>Base–apex on screen B/A</dt><dd>{report.landmarkLengthRatio === null ? <span className="meta-unknown">needs 4 landmarks</span> : `×${report.landmarkLengthRatio.toFixed(2)}`}</dd></div>
          </dl>
          <ul className="cmp-warnings" aria-live="polite">
            {bothScalesUnknown && <li className="warn"><b>Scale unknown.</b> No scale bar or magnification is recorded for {records.A.scaleKnown !== true && records.B.scaleKnown !== true ? "either plate" : records.A.scaleKnown !== true ? "plate A" : "plate B"}. Each plate is fitted to the stage independently, so on-screen size says nothing about real wing size.</li>}
            {report.aspectWarning && <li className="warn"><b>Proportions differ by {Math.round(report.aspectDifference * 100)}%.</b> These are file-canvas ratios, which include margins and labels — not wing length/width ratios.</li>}
            {report.landmarkLengthRatio !== null && report.scaleWarning && <li>Base–apex lengths differ on screen by ×{report.landmarkLengthRatio.toFixed(2)}. Align by landmarks to compare shape at equal length.</li>}
            {!!orientationUnknown.length && <li>Orientation is not recorded for {orientationUnknown.map((slot) => `plate ${slot}`).join(" and ")}. Check which side is the wing base before mirroring or aligning.</li>}
            {SLOTS.filter((slot) => session.transforms[slot].mirror).map((slot) => <li key={`mirror-${slot}`}>Plate {slot} is mirrored. Mirroring can match left and right wings or drawing conventions; it does not change the venation.</li>)}
            {alignmentNote && <li className="note">{alignmentNote}</li>}
          </ul>
          <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
        </div>

        <div className="compare-credits-grid">
          {SLOTS.map((slot) => <ReferenceMetadataCard key={slot} slot={slot} record={records[slot]} actions={<>
            {onOpenInAtlas && <button type="button" onClick={() => onOpenInAtlas(records[slot].id)}>◎ Show in Atlas</button>}
            {onOpenInMapper && <button type="button" onClick={() => onOpenInMapper(records[slot].id)}>✎ Trace in Mapper</button>}
          </>} />)}
        </div>
      </div>

      <aside className="compare-caution">
        <span>INTERPRETATION NOTE</span>
        <p><strong>Visual alignment is exploratory.</strong> Overlap, blink and difference views compare drawings, not specimens. They do not establish vein homology, ancestral state, phylogenetic proximity, or identification. Plate scale is unknown, orientation is often unrecorded, and illustration style differs among sources. Landmark alignment equalises base–apex length by construction. Treat any correspondence you see as a hypothesis to check against reviewed terminology, specimens and primary literature.</p>
      </aside>
    </section>
  );
}
