#!/usr/bin/env node
/*
 * Publish a reviewer's downloaded review so every visitor sees the checked names.
 *
 *   node scripts/plate-vectors/publish-review.mjs path/to/<id>.entowing-plate-review.json
 *
 * Writes public/plate-reviews/<id>.json (entowing-plate-review/1.0, cleaned against the plate)
 * and updates public/plate-reviews/index.json. Unknown line ids and malformed entries are dropped.
 */
import { readFile, writeFile } from "node:fs/promises";
import { sanitizeReview, reviewedNames } from "../../app/lib/plateVectors.ts";

const file = process.argv[2];
if (!file) { console.error("usage: publish-review.mjs <review.json>"); process.exit(1); }
const root = new URL("../../public/", import.meta.url);
const raw = JSON.parse(await readFile(file, "utf8"));
const referenceId = raw.referenceId ?? raw.plate?.referenceId;
if (!/^[a-z0-9-]+$/.test(referenceId ?? "")) { console.error("review has no valid referenceId"); process.exit(1); }
const plate = JSON.parse(await readFile(new URL(`plate-vectors/${referenceId}.json`, root), "utf8"));
// the downloaded file stores labels as a list with a nested review; the page's storage format is a map
const labels = Array.isArray(raw.labels) ? Object.fromEntries(raw.labels.filter((entry) => entry?.id && entry.review).map((entry) => [entry.id, entry.review])) : raw.labels;
const review = sanitizeReview({ ...raw, labels }, plate);
const names = reviewedNames(plate, review).length;
if (!names) { console.error("this review has no confirmed, corrected or own names with lines — nothing to publish"); process.exit(1); }
await writeFile(new URL(`plate-reviews/${referenceId}.json`, root), JSON.stringify(review, null, 1) + "\n");
const indexUrl = new URL("plate-reviews/index.json", root);
const index = JSON.parse(await readFile(indexUrl, "utf8"));
index.reviews = [...index.reviews.filter((entry) => entry.referenceId !== referenceId), { referenceId, reviewer: review.reviewer || "unknown", updatedAt: review.updatedAt, names }]
  .sort((a, b) => a.referenceId.localeCompare(b.referenceId));
await writeFile(indexUrl, JSON.stringify(index, null, 1) + "\n");
console.log(`published ${referenceId}: ${names} checked names by ${review.reviewer || "unknown"}`);
