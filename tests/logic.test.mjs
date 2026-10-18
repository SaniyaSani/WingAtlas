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
    const curated = curation.entries[record.id];
    if (typeof curated?.scaleKnown === "boolean") assert.equal(record.basis.scaleKnown, "curation");
    else assert.equal(record.scaleKnown, UNKNOWN, `${record.id}: no recorded scale without a curated basis`);
    if (curated?.orientation) assert.equal(record.basis.orientation, "curation");
    else assert.equal(record.orientation.baseSide, UNKNOWN);
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

test("journal journey: six pages, consistent links, safe visited list", async () => {
  const { JOURNEY, sanitizeVisited, journeyStep } = await import("../app/lib/journey.ts");
  assert.equal(JOURNEY.length, 6);
  assert.deepEqual(JOURNEY.map((step) => step.page), [1, 2, 3, 4, 5, 6]);
  const modes = new Set(JOURNEY.map((step) => step.mode));
  for (const step of JOURNEY) {
    assert.ok(modes.has(step.next), `${step.mode} points to unknown next page`);
    assert.equal(step.canDo.length, 3);
  }
  assert.deepEqual(sanitizeVisited(["learn", "bogus", "start", "learn"]), ["start", "learn"]);
  assert.equal(journeyStep("nope").mode, "start");
});

test("journal artwork and fonts are local files with licences", async () => {
  for (const file of ["journal/landscape.svg", "journal/sticker-flower.svg", "journal/sticker-star.svg", "journal/sticker-dragonfly.svg", "fonts/caveat-latin-500-normal.woff2", "fonts/caveat-latin-700-normal.woff2", "fonts/patrick-hand-latin-400-normal.woff2", "fonts/Caveat-OFL.txt", "fonts/PatrickHand-OFL.txt"]) {
    await access(new URL(`../public/${file}`, import.meta.url));
  }
  const ofl = await readFile(new URL("../public/fonts/Caveat-OFL.txt", import.meta.url), "utf8");
  assert.match(ofl, /SIL Open Font License/);
});

test("pilot plate vectors are internally consistent and keep source licences", async () => {
  const { sanitizeReview, effectiveEdges, reviewProgress, plateUsesOlderNames, modernHint } = await import("../app/lib/plateVectors.ts");
  const index = await json("../public/plate-vectors/index.json");
  assert.ok(index.plates.length >= 6);
  for (const entry of index.plates) {
    const plate = await json(`../public/plate-vectors/${entry.referenceId}.json`);
    const source = manifest[entry.referenceId];
    assert.ok(source?.localAsset, `${entry.referenceId} must be a local plate`);
    assert.equal(plate.source.license, source.license);
    if (plate.kind === "raster-tracing") {
      assert.ok(source.author.startsWith(plate.source.author), `${entry.referenceId} author mismatch`);
      assert.match(plate.source.file, /^\/plate-vectors\/scans\/[a-z0-9-]+\.png$/);
    } else {
      assert.equal(plate.source.author, source.author);
      assert.equal(plate.source.file, source.assetPath);
    }
    const edgeIds = new Set(plate.edges.map((edge) => edge.id));
    const nodeIds = new Set(plate.nodes.map((node) => node.id));
    for (const edge of plate.edges) {
      assert.ok(nodeIds.has(edge.from) && nodeIds.has(edge.to), `${entry.referenceId} ${edge.id} has unknown nodes`);
      assert.ok(edge.points.length >= 2);
      for (const [x, y] of edge.points) assert.ok(Number.isFinite(x) && Number.isFinite(y));
    }
    const thin = new Set(plate.faintLines.map((line) => line.id));
    for (const label of plate.labels) {
      for (const id of [...(label.edgeIds ?? []), ...(label.suggestedEdgeIds ?? [])]) assert.ok(edgeIds.has(id) || thin.has(id), `${entry.referenceId} ${label.text} → missing ${id}`);
      assert.ok(label.text.length > 0 && label.text.length < 12);
    }
    // a review that references unknown ids is cleaned, not trusted
    const dirty = sanitizeReview({ labels: { [plate.labels[0]?.id ?? "x"]: { status: "corrected", edgeIds: ["nope", plate.edges[0].id], note: 5 } }, userLabels: [{ text: "  X  ", edgeIds: ["nope"] }] }, plate);
    if (plate.labels[0]) {
      assert.deepEqual(dirty.labels[plate.labels[0].id].edgeIds, [plate.edges[0].id]);
      assert.deepEqual(effectiveEdges(plate.labels[0], dirty.labels[plate.labels[0].id]), [plate.edges[0].id]);
    }
    assert.equal(dirty.userLabels[0].text, "X");
    assert.equal(reviewProgress(plate, sanitizeReview(null, plate)).done, 0);
  }
  const asilidae = await json("../public/plate-vectors/asilidae.json");
  const culicidae = await json("../public/plate-vectors/culicidae.json");
  assert.equal(plateUsesOlderNames(asilidae.labels), false);
  assert.equal(plateUsesOlderNames(culicidae.labels), true);
  assert.equal(modernHint("CuA1", true), "M4");
  assert.equal(modernHint("CuA1", false), null);
  // names exactly as printed: the Asilidae plate prints these vein names
  const printed = new Set(asilidae.labels.map((label) => label.text));
  for (const name of ["C", "Sc", "Rs", "R1", "R2+3", "R4", "R5", "M1", "M2", "M3", "M4", "CuA", "A1", "h", "r-m", "m-cu", "m-m"]) assert.ok(printed.has(name), `Asilidae is missing ${name}`);
});

test("smoothed Eristalis plate still passes through every reviewed node", async () => {
  const svg = await readFile(new URL("../public/reference-wings/syrphidae-eristalis-reviewed.svg", import.meta.url), "utf8");
  const template = await json("../app/Eristalis-reference.entowing-template.json");
  for (const path of template.paths) {
    const id = path.veinId === "Cu1" ? "m-cu" : path.veinId;
    const match = svg.match(new RegExp(`data-vein="${id.replace("+", "\\+")}"[^>]*d="([^"]+)"`));
    assert.ok(match, `${id} missing in plate`);
    const numbers = match[1].match(/-?\d+(\.\d+)?/g).map(Number);
    for (const nodeId of path.nodeIds) {
      const { x, y } = template.nodes[nodeId];
      let found = false;
      for (let i = 0; i + 1 < numbers.length; i += 2) if (Math.abs(numbers[i] - x) < .01 && Math.abs(numbers[i + 1] - y) < .01) found = true;
      assert.ok(found, `${id} does not pass through ${nodeId}`);
    }
  }
});

test("public-domain book tracings carry full provenance and stay unnamed", async () => {
  const index = await json("../public/plate-vectors/index.json");
  const traced = index.plates.filter((entry) => entry.kind === "raster-tracing");
  assert.ok(traced.length >= 40, "Williston 1908, Comstock 1918 and Walker 1853 tracings are listed");
  const families = new Set();
  for (const entry of traced) {
    const plate = await json(`../public/plate-vectors/${entry.referenceId}.json`);
    const raw = manifest[entry.referenceId];
    const record = records.find((item) => item.id === entry.referenceId);
    families.add(raw.family);
    assert.equal(plate.kind, "raster-tracing");
    assert.equal(plate.labels.length, 0, "no vein names are invented for tracings");
    assert.equal(raw.license, "Public domain source");
    assert.match(raw.sourcePage, /^https:\/\/archive\.org\/details\/(manualofnorthame00willuoft|wingsofinsectsex00coms|insectabritannic02walkuoft)\/page\/n\d+\/mode\/1up$/);
    assert.match(raw.author, /· EntoWing vector trace$/);
    assert.equal(plate.provenance.modernFamily, raw.family);
    for (const field of ["genusAsPrinted", "familyAsPrinted", "familyBasis", "figure", "archiveId", "quality"]) assert.ok(String(plate.provenance[field]).trim().length > 0, `${entry.referenceId} ${field}`);
    assert.match(plate.derivative.license, /^unknown/, "licence of the tracing itself is not invented");
    assert.equal(record.referenceStatus, "derived-tracing");
    assert.equal(record.imageType, "tracing");
    assert.deepEqual(record.orientation, { baseSide: "left", anteriorEdge: "top" });
    assert.ok(curation.entries[entry.referenceId].basis.length > 20);
    assert.deepEqual(validateReferenceRecord(record).filter((issue) => issue.level === "error"), []);
    // scan crop exists, is a PNG and has the same size as the traced box
    const png = await readFile(new URL(`../public${plate.source.file}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), plate.box.width);
    assert.equal(png.readUInt32BE(20), plate.box.height);
    const svg = await readFile(new URL(`../public${raw.assetPath}`, import.meta.url), "utf8");
    assert.match(svg, new RegExp(`viewBox="0 0 ${plate.box.width} ${plate.box.height}"`));
    assert.match(svg, /<desc>[^<]*(fig\. [0-9.]+|pl\. [IVXL]+, \d+[a-z]?)[^<]*archive\.org/);
    assert.equal((svg.match(/data-segment="s\d+"/g) ?? []).length, plate.edges.length, `${entry.referenceId}: SVG and review graph have the same segments`);
  }
  for (const family of ["Conopidae", "Neriidae", "Micropezidae", "Tanypezidae", "Psilidae", "Sepsidae", "Piophilidae", "Pyrgotidae", "Platystomatidae", "Richardiidae", "Ulidiidae", "Lonchaeidae", "Lauxaniidae", "Sphaeroceridae", "Heleomyzidae", "Fanniidae", "Anthomyiidae", "Calliphoridae", "Tachinidae", "Hippoboscidae", "Blephariceridae", "Scathophagidae", "Chamaemyiidae", "Coelopidae", "Sciomyzidae", "Dryomyzidae", "Pallopteridae"]) {
    assert.ok(families.has(family), `${family} has a traced plate`);
    assert.ok(manifest[family.toLowerCase()]?.localAsset, `${family} is reachable from the Atlas by its family id`);
  }
  // Rhinophora mexicana is a tachinid (Microchaetina mexicana): it must not be filed under Rhinophoridae
  assert.ok(!Object.values(manifest).some((reference) => reference.family === "Rhinophoridae"));
  // Walker's "Sarcophaga mortuorum" is Musca mortuorum L. = Cynomya mortuorum (a blow fly), so it is filed under Calliphoridae
  assert.equal(manifest["calliphoridae-walker-mortuorum"].family, "Calliphoridae");
  assert.ok(!Object.values(manifest).some((reference) => reference.family === "Sarcophagidae"));
});

test("reviewed names become a Wing Mapper map and drive the Atlas filter", async () => {
  const { chainEdges, reviewToVeinMap, reviewedNames, sanitizeReview } = await import("../app/lib/plateVectors.ts");
  const { familyPlateFacts, matchesSourceFilter, storedReviewHasNames, isTracingAuthor } = await import("../app/lib/atlasFilters.ts");
  // two pieces sharing a node join into one chain, in order
  const edges = [
    { id: "a", from: "n1", to: "n2", points: [[0, 0], [5, 0], [10, 0]] },
    { id: "b", from: "n3", to: "n2", points: [[20, 0], [15, 0], [10, 0]] },
    { id: "c", from: "n8", to: "n9", points: [[0, 50], [10, 50]] },
  ];
  const chains = chainEdges(edges);
  assert.equal(chains.length, 2);
  assert.deepEqual(chains[0][0], [0, 0]);
  assert.deepEqual(chains[0].at(-1), [20, 0]);
  const asilidae = await json("../public/plate-vectors/asilidae.json");
  const r45 = asilidae.labels.find((label) => label.text === "R4");
  const review = sanitizeReview({ labels: { [r45.id]: { status: "confirmed", edgeIds: r45.edgeIds } }, userLabels: [{ id: "u1", text: "my vein", edgeIds: [asilidae.edges[0].id] }, { id: "u2", text: "empty", edgeIds: [] }] }, asilidae);
  assert.deepEqual(reviewedNames(asilidae, review).map((name) => name.text), ["R4", "my vein"]);
  const map = reviewToVeinMap(asilidae, review);
  assert.ok(map.R4.length >= 2 && map.R4.length <= 14);
  assert.ok(map["my vein"].length >= 2);
  assert.equal(map.empty, undefined, "names without lines are not exported");
  for (const points of Object.values(map)) for (const { x, y } of points) assert.ok(x >= 0 && y >= 0 && x <= asilidae.box.width && y <= asilidae.box.height);
  // an unreviewed plate gives nothing
  assert.deepEqual(reviewToVeinMap(asilidae, sanitizeReview(null, asilidae)), {});
  // stored review detection matches what the review page saves
  assert.equal(storedReviewHasNames(review), true);
  assert.equal(storedReviewHasNames({ labels: { x: { status: "rejected", edgeIds: [] } } }), false);
  assert.equal(storedReviewHasNames("junk"), false);
  // filter facts
  const index = await json("../public/plate-vectors/index.json");
  const facts = familyPlateFacts(records.map((record) => ({ id: record.id, family: record.family, author: record.author })), index.plates, new Set(["asilidae"]));
  assert.equal(isTracingAuthor("John Henry Comstock · EntoWing vector trace"), true);
  assert.equal(matchesSourceFilter(facts.get("asilidae"), "published"), true);
  assert.equal(matchesSourceFilter(facts.get("asilidae"), "named"), true);
  assert.equal(matchesSourceFilter(facts.get("conopidae"), "tracing"), true);
  assert.equal(matchesSourceFilter(facts.get("conopidae"), "good"), true);
  assert.equal(matchesSourceFilter(facts.get("conopidae"), "published"), false);
  assert.equal(matchesSourceFilter(facts.get("coelopidae"), "good"), false, "rough whole-fly tracings are not 'good'");
  assert.equal(matchesSourceFilter(undefined, "any"), true);
  assert.equal(matchesSourceFilter(undefined, "tracing"), false);
});

test("published plate reviews (if any) are consistent and the ID Lab benchmark is well formed", async () => {
  const published = await json("../public/plate-reviews/index.json");
  assert.ok(Array.isArray(published.reviews));
  const { sanitizeReview, reviewedNames } = await import("../app/lib/plateVectors.ts");
  for (const entry of published.reviews) {
    const plate = await json(`../public/plate-vectors/${entry.referenceId}.json`);
    const review = sanitizeReview(await json(`../public/plate-reviews/${entry.referenceId}.json`), plate);
    assert.equal(reviewedNames(plate, review).length, entry.names);
  }
  const bench = await json("../public/idlab-benchmark.json");
  assert.equal(bench.sets.length, 3);
  for (const set of bench.sets) for (const value of Object.values(set.now)) assert.ok(Number.isInteger(value) && value >= 0 && value <= set.n);
  for (const source of bench.otherSpecimenSources) assert.match(source.licence, /^cc/);
});
