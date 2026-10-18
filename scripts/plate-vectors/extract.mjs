// Extract raw geometry and text from reference plates in a real browser (exact SVG transforms).
// Dev-only tool: needs Playwright + Chromium (not a project dependency). Run from the project root:
//   node scripts/plate-vectors/extract.mjs <outDir> <plate-file-stem> …
import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
const [,, outDir, ...names] = process.argv;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
for (const name of names) {
  const svg = await readFile(`${process.cwd()}/public/reference-wings/${name}.svg`, "utf8");
  await page.setContent(`<html><body style="margin:0">${svg.replace(/<\?xml[^>]*>/, "")}</body></html>`);
  const data = await page.evaluate(() => {
    const root = document.querySelector("svg");
    const vb = root.viewBox.baseVal;
    const box = vb && vb.width ? { x: vb.x, y: vb.y, width: vb.width, height: vb.height } : { x: 0, y: 0, width: parseFloat(root.getAttribute("width")), height: parseFloat(root.getAttribute("height")) };
    const toRoot = (el) => {
      // matrix from element user space to root user space
      const m = el.getCTM(); const r = root.getCTM();
      return r.inverse().multiply(m);
    };
    const apply = (m, x, y) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
    const strokes = [];
    for (const el of root.querySelectorAll("path, line, polyline, polygon, ellipse, circle, rect")) {
      if (el.closest("defs, clipPath, mask, pattern, marker, metadata")) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      let len = 0; try { len = el.getTotalLength(); } catch { continue; }
      if (!(len > 0.5)) continue;
      const m = toRoot(el);
      const scale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
      const n = Math.max(2, Math.ceil(len * scale / 0.75));
      const pts = [];
      for (let i = 0; i <= n; i += 1) { const p = el.getPointAtLength(len * i / n); pts.push(apply(m, p.x, p.y)); }
      strokes.push({ id: el.id || null, tag: el.tagName, stroke: cs.stroke, fill: cs.fill, strokeWidth: parseFloat(cs.strokeWidth) * scale, opacity: parseFloat(cs.opacity) * parseFloat(cs.strokeOpacity || "1"), dash: cs.strokeDasharray, points: pts.map((p) => [+p.x.toFixed(3), +p.y.toFixed(3)]) });
    }
    const texts = [];
    for (const el of root.querySelectorAll("text")) {
      const parts = [...el.querySelectorAll("tspan")].filter((t) => !t.querySelector("tspan"));
      const raw = (parts.length ? parts.map((t) => t.textContent) : [el.textContent]).join("");
      const text = raw.replace(/\s+/g, "");
      if (!text) continue;
      const b = el.getBBox(); const m = toRoot(el);
      const corners = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => apply(m, x, y));
      const xs = corners.map((c) => c.x), ys = corners.map((c) => c.y);
      const styleEl = parts[0] ?? el; const cs = getComputedStyle(styleEl);
      texts.push({ id: el.id || null, text, raw, italic: cs.fontStyle === "italic", fill: cs.fill, bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map((v) => +v.toFixed(2)) });
    }
    return { box, strokes, texts };
  });
  await writeFile(`${outDir}/${name}.raw.json`, JSON.stringify(data));
  console.log(name, data.box, "strokes", data.strokes.length, "texts", data.texts.length, data.texts.map((t) => t.text).join(" "));
}
await browser.close();
