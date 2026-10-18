/*
 * Where a plate's review comes from: the reviewer's own work in this browser, or a
 * published review shipped with EntoWing (public/plate-reviews/). Browser-only module.
 */
import { PUBLISHED_REVIEW_INDEX, REVIEW_STORAGE_PREFIX, reviewedNames, sanitizeReview, type PlateReview, type PlateVectors, type PublishedReviewEntry } from "./plateVectors";
import { readStoredJson } from "./safeStorage";

let publishedIndex: Promise<PublishedReviewEntry[]> | null = null;

export function publishedReviews() {
  publishedIndex ??= fetch(PUBLISHED_REVIEW_INDEX)
    .then((response) => (response.ok ? response.json() : { reviews: [] }))
    .then((data) => (Array.isArray(data?.reviews) ? (data.reviews as PublishedReviewEntry[]) : []))
    .catch(() => []);
  return publishedIndex;
}

export async function publishedReviewFor(plate: Pick<PlateVectors, "referenceId" | "edges" | "labels">): Promise<PlateReview | null> {
  const entry = (await publishedReviews()).find((item) => item.referenceId === plate.referenceId);
  if (!entry) return null;
  try {
    const data = await (await fetch(`/plate-reviews/${plate.referenceId}.json`)).json();
    return sanitizeReview(data, plate);
  } catch {
    return null;
  }
}

export function localReviewFor(plate: Pick<PlateVectors, "referenceId" | "edges" | "labels">) {
  return sanitizeReview(readStoredJson(REVIEW_STORAGE_PREFIX + plate.referenceId), plate);
}

/** The reviewer's own names win when they exist; otherwise a published review; otherwise an empty one. */
export async function loadReviewFor(plate: PlateVectors): Promise<{ review: PlateReview; origin: "local" | "published" | "none" }> {
  const local = localReviewFor(plate);
  if (reviewedNames(plate, local).length) return { review: local, origin: "local" };
  const published = await publishedReviewFor(plate);
  if (published && reviewedNames(plate, published).length) return { review: published, origin: "published" };
  return { review: local, origin: "none" };
}
