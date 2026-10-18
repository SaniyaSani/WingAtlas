import { chromium } from "playwright";   // install separately: npm i -D playwright (not a project dependency)
import { writeFile } from "node:fs/promises";
const [,, out = "result.json", mode = "all"] = process.argv;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") console.error("console:", m.text()); });
await page.route("http://127.0.0.1:5174/__bench.html", (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html><title>b</title>" }));
await page.goto("http://127.0.0.1:5174/__bench.html");
const res = await page.evaluate(async (mode) => {
  const mod = await import("/app/wingIdentification.ts?t=" + Date.now());
  const manifest = (await import("/app/family-wing-references.generated.json")).default;
  const index = await (await fetch("/plate-vectors/index.json")).json();
  const tests = index.plates.filter((p) => p.kind === "raster-tracing");
  const refs = Object.entries(manifest);
  const load = (src) => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
  const rows = [];
  for (const t of tests) {
    const img = await load(`/plate-vectors/scans/${t.referenceId}.png`);
    const pool = mode === "loo" ? refs.filter(([id]) => id !== t.referenceId) : refs;
    const r = await mod.identifyWing(img, pool, 58, { rotation: 0, mirrored: false }, true);
    rows.push({ id: t.referenceId, family: t.family, top: r.candidates.map((c) => [c.family, Math.round(c.similarity * 1000) / 1000]), noMatch: r.noReliableMatch, orient: `${r.orientation.rotation}${r.orientation.mirrored ? "m" : ""}` });
  }
  return rows;
}, mode);
const top1 = res.filter((r) => r.top[0]?.[0] === r.family).length;
const top3 = res.filter((r) => r.top.some(([f]) => f === r.family)).length;
await writeFile(out, JSON.stringify({ mode, n: res.length, top1, top3, rows: res }, null, 1));
console.log(mode, "n", res.length, "top1", top1, "top3", top3);
for (const r of res) if (r.top[0]?.[0] !== r.family) console.log(" miss", r.family, "→", r.top.map((t) => t.join(":")).join(", "), r.orient);
await browser.close();
