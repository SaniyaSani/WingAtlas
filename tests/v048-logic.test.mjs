import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { alignByLandmarks, clampView, IDENTITY_TRANSFORM, lineTintMatrix, plateToStage, proportionReport, sanitizeTransform, stageToPlate, zoomAt, STAGE_WIDTH } from "../app/lib/compareMath.ts";
import { buildReferenceIndex, metadataCompleteness, rankFromManifest, searchReferences, UNKNOWN, validateReferenceRecord } from "../app/lib/referenceModel.ts";
import { detectNomenclature, parseTemplatePayload } from "../app/lib/templateSchema.ts";
import { entryHasContent, imageKey, readStore, sanitizeEntry, upsertEntry } from "../app/lib/mapperAutosave.ts";

const json = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const manifest = await json("../app/family-wing-references.generated.json");
const curation = await json("../app/reference-curation.json");
const records = buildReferenceIndex(manifest, curation);
const PRESETS = ["C", "Sc", "R1", "R2+3", "R4+5", "M1", "M4", "CuA", "CuP", "A1", "r-m", "m-cu", "dm-m", "sv", "h"];
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("reference model keeps every manifest entry and never invents metadata", () => {
  assert.equal(records.length, Object.keys(manifest).length);
  for (const record of records) {
    const raw = manifest[record.id];
    assert.equal(record.family, raw.family);
    assert.equal(record.source.page, raw.sourcePage);
    assert.equal(record.license.name, raw.license);
    if (!raw.taxon) assert.equal(record.taxon, UNKNOWN, `${record.id} taxon must stay unknown`);
    if (!curation.entries[record.id]?.terminologySystem) assert.equal(record.terminologySystem, UNKNOWN);
    if (!curation.entries[record.id]?.publication) assert.equal(record.publication.doi, UNKNOWN);
    assert.equal(record.scaleKnown, UNKNOWN, `${record.id}: no plate has a recorded scale`);
    assert.equal(record.orientation.baseSide, UNKNOWN);
    assert.equal(record.review.reviewer, UNKNOWN);
    assert.equal(record.review.lastChecked, UNKNOWN);
    assert.ok(metadataCompleteness(record).known <= metadataCompleteness(record).total);
  }
});

test("reference records validate without errors", () => {
  const errors = records.flatMap((record) => validateReferenceRecord(record).filter((issue) => issue.level === "error").map((issue) => `${record.id}: ${issue.field} ${issue.message}`));
  assert.deepEqual(errors, []);
});

test("curation entries reference real manifest ids and carry a written basis", () => {
  for (const [id, entry] of Object.entries(curation.entries)) {
    assert.ok(manifest[id], `curation id ${id} is not in the manifest`);
    assert.ok(typeof entry.basis === "string" && entry.basis.length > 20, `${id} needs a basis`);
  }
});

test("rule-derived fields follow the documented rules", () => {
  const byId = Object.fromEntries(records.map((record) => [record.id, record]));
  assert.equal(byId.syrphidae.referenceStatus, "user-reviewed-tracing");
  assert.equal(byId.syrphidae.imageType, "tracing");
  assert.equal(byId.muscidae.imageType, "tracing");
  assert.equal(byId["muscidae-drymeia-hamata"].imageType, UNKNOWN, "a raster figure must not be called a tracing");
  assert.equal(byId.acartophthalmidae.imageType, "illustration");
  assert.equal(rankFromManifest("species-level reference"), "species");
  assert.equal(rankFromManifest("something else"), UNKNOWN);
});

test("reference search ranks family prefixes first and folds accents", () => {
  assert.equal(searchReferences(records, "musc")[0].family, "Muscidae");
  assert.ok(searchReferences(records, "dessi").length > 40);
  assert.equal(searchReferences(records, "").length, records.length);
});

test("plate/stage transforms are exact inverses, including mirror and rotation", () => {
  const size = { width: 750, height: 420 };
  const transform = { x: 33, y: -12, scale: 1.7, rotation: 37, mirror: true };
  const point = { x: 123.4, y: 301.2 };
  const back = stageToPlate(plateToStage(point, size, transform), size, transform);
  close(back.x, point.x, 1e-9); close(back.y, point.y, 1e-9);
});

test("landmark alignment maps B base and apex exactly onto A", () => {
  const a = { size: { width: 560, height: 246 }, transform: { ...IDENTITY_TRANSFORM, rotation: 4 }, landmarks: { base: { x: 14, y: 70 }, apex: { x: 530, y: 55 } } };
  for (const mirror of [false, true]) {
    const b = { size: { width: 750, height: 420 }, transform: { ...IDENTITY_TRANSFORM, mirror }, landmarks: { base: { x: mirror ? 700 : 60, y: 210 }, apex: { x: mirror ? 70 : 690, y: 160 } } };
    const result = alignByLandmarks(a, b);
    assert.ok(result.ok);
    for (const key of ["base", "apex"]) {
      const target = plateToStage(a.landmarks[key], a.size, a.transform);
      const moved = plateToStage(b.landmarks[key], b.size, result.transform);
      close(moved.x, target.x, 1e-6); close(moved.y, target.y, 1e-6);
    }
    assert.equal(result.transform.mirror, mirror);
  }
  assert.equal(alignByLandmarks(a, { ...a, landmarks: {} }).ok, false);
});

test("proportion report flags differing canvases; transforms are sanitized", () => {
  const plate = (width, height) => ({ size: { width, height }, transform: IDENTITY_TRANSFORM, landmarks: {} });
  assert.equal(proportionReport(plate(750, 420), plate(750, 420)).aspectWarning, false);
  assert.equal(proportionReport(plate(560, 246), plate(750, 420)).aspectWarning, true);
  const clean = sanitizeTransform({ x: Number.NaN, scale: 99, rotation: 540 });
  assert.equal(clean.x, 0); assert.equal(clean.scale, 6); assert.equal(Math.abs(clean.rotation), 180);
  const view = zoomAt(clampView({ zoom: 1, cx: 500, cy: 280 }), 4, { x: 100, y: 100 });
  assert.equal(view.zoom, 4); assert.ok(view.cx >= STAGE_WIDTH / 8);
  assert.equal(lineTintMatrix([1, 1, 1]).split(" ").length, 20);
});

test("the reviewed Eristalis template imports unchanged except the documented Cu1 migration", async () => {
  const payload = await json("../app/Eristalis-reference.entowing-template.json");
  const result = parseTemplatePayload(payload, { presetIds: PRESETS, fileName: "Eristalis-reference.entowing-template.json" });
  assert.ok(result.ok);
  assert.equal(result.format, "template");
  assert.equal(result.template.paths.length, payload.paths.length);
  assert.ok(result.template.paths.some((path) => path.veinId === "m-cu"));
  assert.ok(!result.template.paths.some((path) => path.veinId === "Cu1"));
  assert.deepEqual(result.template.referenceSize, { width: 560, height: 246 });
  assert.equal(result.nomenclature.mixed, false);
});

test("template import repairs and reports damaged files", () => {
  const result = parseTemplatePayload({
    schema: "entowing-template/1.0",
    sourceImage: { width: 100, height: 50 },
    nodes: { a: { x: 1, y: 1 }, b: { x: 90, y: 40 }, c: { x: "bad", y: 2 }, d: { x: 400, y: 300 }, orphan: { x: 5, y: 5 } },
    paths: [
      { veinId: "CuA1", nodeIds: ["a", "b", "c"] },
      { veinId: "CuA1", nodeIds: ["a", "d"] },
      { veinId: "M4", nodeIds: ["a", "a", "b"] },
      { veinId: "x", nodeIds: ["c"] },
      "junk",
    ],
  }, { presetIds: PRESETS, fileName: "broken.entowing-template.json" });
  assert.ok(result.ok);
  assert.deepEqual(result.template.paths.map((path) => path.veinId), ["CuA1", "CuA1-2", "M4"]);
  assert.deepEqual(result.template.paths[2].nodeIds, ["a", "b"]);
  assert.ok(!("orphan" in result.template.nodes));
  assert.ok(result.nomenclature.mixed);
  const text = result.warnings.join(" | ");
  for (const fragment of ["non-numeric", "missing nodes", "fewer than two", "renamed", "far outside", "unused node", "mixed nomenclature"]) assert.match(text, new RegExp(fragment, "i"));
  assert.equal(parseTemplatePayload({ schema: "other/1", nodes: {}, paths: [] }, { presetIds: [], fileName: "x" }).ok, false);
  assert.equal(parseTemplatePayload([], { presetIds: [], fileName: "x" }).ok, false);
});

test("legacy entowing-wing-map/0.2 files still import", () => {
  const result = parseTemplatePayload({ schema: "entowing-wing-map/0.2", veins: [{ id: "Cu1", points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }, { id: "my-fold", label: "fold", points: [{ x: 0, y: 0 }, { x: 5, y: 5 }] }] }, { presetIds: PRESETS, fileName: "old.entowing.json" });
  assert.ok(result.ok);
  assert.equal(result.format, "legacy-map");
  assert.deepEqual(result.template.paths.map((path) => path.veinId), ["m-cu", "my-fold"]);
  assert.equal(result.template.referenceSize, undefined, "v0.47 bounding-box fit is preserved");
  assert.deepEqual(result.customVeins.map((vein) => vein.id), ["my-fold"]);
});

test("nomenclature detection ignores ambiguous terms", () => {
  assert.equal(detectNomenclature(["A1", "CuA", "R1"]).mixed, false);
  assert.equal(detectNomenclature(["CuA2", "dm-m"]).mixed, true);
  assert.equal(detectNomenclature(["CuA1·2", "M4-2"]).mixed, true);
});

test("autosave store is bounded, deduplicated and sanitized", () => {
  let store = readStore(null);
  for (let index = 0; index < 9; index += 1) {
    store = upsertEntry(store, { imageKey: imageKey({ name: `w${index}.jpg`, width: 10, height: 5 }), imageName: `w${index}.jpg`, width: 10, height: 5, savedAt: new Date().toISOString(), map: { C: [{ x: 1, y: 2 }] }, draftHypotheses: {}, customVeins: [], placedTemplate: null, templateNodes: {}, activeVeinId: "C" });
  }
  assert.equal(store.entries.length, 6);
  assert.equal(store.entries[0].imageName, "w8.jpg");
  const dirty = sanitizeEntry({ imageKey: "k", imageName: "n", map: { C: [{ x: 1, y: 1 }, { x: "no" }], R1: "bad" }, placedTemplate: { id: "t", paths: [{ veinId: "C", nodeIds: ["a", "missing"] }] }, templateNodes: { a: { x: 1, y: 1 } } });
  assert.deepEqual(dirty.map, { C: [{ x: 1, y: 1 }] });
  assert.equal(dirty.placedTemplate, null);
  assert.ok(entryHasContent(dirty));
  assert.deepEqual(readStore({ schema: "wrong", entries: [1] }).entries, []);
});

test("classifier masks declared in the manifest exist", async () => {
  for (const [id, reference] of Object.entries(manifest)) {
    if (!reference.classifierAssetPath) continue;
    await access(new URL(`../public${reference.classifierAssetPath}`, import.meta.url)).catch(() => assert.fail(`${id} mask missing`));
  }
});

test("every local plate is a readable image file of the declared type", async () => {
  for (const [id, reference] of Object.entries(manifest)) {
    if (!reference.localAsset) continue;
    const bytes = await readFile(new URL(`../public${reference.assetPath}`, import.meta.url));
    if (reference.assetPath.endsWith(".svg")) assert.match(bytes.toString("utf8", 0, 2000), /<svg[\s>]/, `${id} is not an SVG document`);
    else if (reference.assetPath.endsWith(".png")) assert.equal(bytes.subarray(1, 4).toString(), "PNG", `${id} is not a PNG`);
  }
});
