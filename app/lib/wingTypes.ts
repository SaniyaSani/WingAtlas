/* Shared Wing Mapper data types (previously local to app/page.tsx). */

export type Point = { x: number; y: number };
export type CurveNodeMode = "smooth" | "corner" | "bezier";
export type CurveHandle = { dx: number; dy: number };
export type CurveControl = { mode: CurveNodeMode; in?: CurveHandle; out?: CurveHandle };
export type TemplatePath = { veinId: string; nodeIds: string[]; curve?: Record<string, CurveControl> };

export type WingTemplate = {
  id: string;
  name: string;
  taxon: string;
  note: string;
  referenceSize?: { width: number; height: number };
  nodes: Record<string, Point>;
  paths: TemplatePath[];
};

export type VeinDefinition = {
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
