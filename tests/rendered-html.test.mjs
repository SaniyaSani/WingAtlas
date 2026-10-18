import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("renders the EntoWing application shell", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /EntoWing/);
  assert.match(html, /Interactive Diptera Wing Atlas/);
  assert.match(html, />Compare</);
  assert.match(html, /Research atlas · v0\.52/);
  assert.doesNotMatch(html, /vinext-starter/i);
});

test("all locally declared reference plates are present and attributed", async () => {
  const manifestUrl = new URL("../app/family-wing-references.generated.json", import.meta.url);
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  const entries = Object.entries(manifest);
  const localEntries = entries.filter(([, reference]) => reference.localAsset === true);

  assert.ok(entries.length >= 90, `expected a broad family manifest, found ${entries.length}`);
  assert.ok(localEntries.length >= 40, `expected local comparison plates, found ${localEntries.length}`);

  for (const [id, reference] of localEntries) {
    assert.ok(reference.family, `${id} is missing its family name`);
    assert.ok(reference.title, `${id} is missing its plate title`);
    assert.ok(reference.sourcePage, `${id} is missing its source page`);
    assert.ok(reference.license, `${id} is missing its license`);
    if (reference.licenseUrl) assert.match(reference.licenseUrl, /^https:\/\//, `${id} has an invalid license URL`);
    assert.match(reference.assetPath, /^\/reference-wings\//, `${id} has an unexpected local path`);
    await access(new URL(`../public${reference.assetPath}`, import.meta.url));
  }
});
