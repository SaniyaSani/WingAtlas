# Changelog

## v0.48 · 2026-10-16

### Compare
- Four views: Split, Overlay (colour-coded A teal / B magenta, adjustable opacity), Blink A/B (0.4–2 s, paused by default under reduced motion) and Difference (inverted, colour-coded, additive: shared lines turn near-white).
- Independent move, scale (0.2–4× fit), rotation (±180°) and mirror per plate; per-plate and global reset.
- Stage tools: pan, move plate, place base, place apex. Keyboard: arrows, + / −, 0, [ ], M, A / B.
- Landmark alignment of B onto A (similarity transform; the size normalisation is stated explicitly).
- Synchronised zoom in Split view; Ctrl/⌘ + scroll zoom.
- Canvas-ratio comparison, base–apex length ratio, and warnings for unknown scale, differing proportions, unrecorded orientation and mirroring.
- Searchable plate pickers; readable attribution; full scientific record per plate with unknown fields shown as *unknown*; links to Atlas and Mapper.
- Session (plates, transforms, landmarks per plate, options) is saved in the browser.

### Atlas
- Family search (combobox), plate filter with counts, A/B Compare tray, card badges, legend, lineage highlight, breadcrumbs, layer key, “missing data ≠ absent character” wording.
- The selected family persists across mode switches; Compare → “Show in Atlas” focuses the family.
- Family search and filters moved out of the horizontally scrolling toolbar so their lists are never clipped.

### Data model
- New `entowing-reference/1.0` normalized record with per-field provenance; `reference-curation.json` overlay (3 curated entries, each with a written basis). Manifest unchanged.

### Wing Mapper
- Undo/redo for annotation (points, drags, traces, auto pieces, template transfer, magnetic fit, clear) and for template edits; Ctrl/Cmd + Z, Ctrl/Cmd + Shift + Z, Ctrl/Cmd + Y.
- Autosave of geometry and labels (never the photo), per image, last six images; restore / delete / dismiss banner.
- Confirmation before loading another photo, the reference plate, a Wing ID photo, an Atlas family or a Compare plate replaces annotated work.
- Validated import (`templateSchema.ts`) with an import report: skipped nodes and paths, dangling references, duplicate ids, out-of-bounds nodes, unused nodes, Cu1 → m-cu migration. Legacy maps keep the v0.47 fit.
- Mixed-nomenclature warning (older-system-only vs modern-system-only terms).
- Observed geometry vs interpreted identification readout; JSON export adds `observation` and `identification` per vein (schema string unchanged for compatibility); SVG + JSON export, the SVG embeds the JSON in `<metadata>`.

### Robustness and accessibility
- Reference SVGs are sanitised (scripts, foreign content, event handlers, external links removed) before they are measured in the page.
- Visible focus outlines in both themes; aria labels, `aria-pressed`, `aria-current`, live regions; keyboard selection of Atlas cards; reduced-motion rule; minimum 10 px labels in new UI; no horizontal overflow at 390 px.
- All localStorage access goes through `safeStorage.ts` and never throws.

### Tests
- 15 new logic tests (`tests/v048-logic.test.mjs`): reference model, curation, search, transforms, landmark alignment, import repair, legacy import, nomenclature detection, autosave store, plate file integrity, classifier masks.
