import { chromium } from "playwright";   // install separately: npm i -D playwright (not a project dependency)
import { readFile, writeFile } from "node:fs/promises";
const [,, listPath, out] = process.argv;
const list = JSON.parse(await readFile(listPath, "utf8"));
for (const item of list) item.data = "data:image/" + (item.file.endsWith(".png") ? "png" : "jpeg") + ";base64," + (await readFile(item.file)).toString("base64");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
await page.route("http://127.0.0.1:5174/__bench.html", (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html><title>b</title>" }));
await page.goto("http://127.0.0.1:5174/__bench.html");
const rows = await page.evaluate(async (list) => {
  const mod = await import("/app/wingIdentification.ts?t=" + Date.now());
  const manifest = (await import("/app/family-wing-references.generated.json")).default;
  const refs = Object.entries(manifest);
  const load = (src) => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
  const rows = [];
  for (const t of list) {
    const img = await load(t.data);
    const pool = t.exclude ? refs.filter(([id]) => !t.exclude.includes(id)) : refs;
    const r = await mod.identifyWing(img, pool, 58, { rotation: 0, mirrored: false }, true);
    rows.push({ file: t.file.split("/").pop(), family: t.family, top: r.candidates.map((c) => [c.family, Math.round(c.similarity * 1000) / 1000]), noMatch: r.noReliableMatch, unknown: Math.round(r.unknownProbability * 100), orient: `${r.orientation.rotation}${r.orientation.mirrored ? "m" : ""}` });
  }
  return rows;
}, list);
await writeFile(out, JSON.stringify(rows, null, 1));
for (const r of rows) console.log(r.family ?? "(absent)", r.noMatch ? "NO-MATCH" : "match", r.unknown + "%", "→", r.top.map((t) => t.join(":")).join(", "), r.orient, r.file);
await browser.close();
