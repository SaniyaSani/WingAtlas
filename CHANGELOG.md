# Changelog

## v0.52 · 2026-10-18 · Checked names travel, honest ID Lab, filters

- **Checked vein names now leave the review page.** On Vein review, a plate with confirmed or added names offers “Open in Wing Mapper” (plate + names as traced veins) and “Quiz me in Learn”. The Atlas family card shows a *Vein map* box (names checked / printed names to check / no names yet) with the same buttons and a link straight to that plate's review. Reviews can be published for every visitor: `node scripts/plate-vectors/publish-review.mjs <downloaded review>` writes `public/plate-reviews/`; the review page starts from a published review when the browser has none of its own. Names are always marked as a reviewer's interpretation, never as the author's.
- **Wing ID Lab: line-to-line matching + an accuracy test.** Veins are thinned to one pixel and compared with a symmetric chamfer score (70 %) next to the v0.47 features (30 %). Measured on three sets (`docs/IDLAB-BENCHMARK.md`, shown in the lab): same printed figure 36/40 first (was 23/40); other species of a library family 3/34 first, but now kept unidentified in 24/34 instead of naming a wrong family in 30/34; families without a plate 4/5 kept unidentified. Plainly stated in the lab: it finds look-alike plates, it does not identify new specimens yet.
- **4 more families** from Walker 1853 whole-fly figures (wing base hidden and cut off; quality “rough”): Coelopidae, Sciomyzidae, Dryomyzidae, Pallopteridae. Families without a plate: 40 → 36. Walker's “*Sarcophaga mortuorum*” turned out to be *Cynomya mortuorum* (a blow fly) and was filed under Calliphoridae, not Sarcophagidae.
- **Atlas filters and plate switching.** New *Source* filter next to *Plates*: Author's plate · Book tracing · Good tracing · Checked names (cards are dimmed, never removed; the search follows both filters). The family card lists all plates of a family (e.g. 3 for Calliphoridae) and shows the one you pick.
- **Clean-up:** the 4 React lint errors (state set synchronously inside effects) are fixed — the wing morph no longer resets state in an effect, saved atlas edits are restored after first paint, the auto-conversion runs in the next frame, and the vein selection falls back without an effect. Lint: 0 errors.
- Wikimedia Commons still blocks this environment (HTTP 429), so its 56 linked plates stay linked.
- Tests: review → Mapper map conversion, filter facts, published-review consistency, benchmark file; whole-fly tracings and the Calliphoridae correction.

## v0.51 · 2026-10-18 · Wings from public-domain books

- **35 new wing plates**, traced from scanned figures of three public-domain books (archive.org, NOT_IN_COPYRIGHT): Williston 1908 *Manual of North American Diptera* (21), Comstock 1918 *The Wings of Insects* (12), Walker 1853 *Insecta Britannica. Diptera* vol. 2 (2). Stored locally in `public/reference-wings/`, so Atlas, Compare and the Wing ID Lab can all use them.
- **23 families got their first plate** (no-plate families 63 → 40): Blephariceridae, Neriidae, Micropezidae, Tanypezidae, Psilidae, Sepsidae, Piophilidae, Pyrgotidae, Platystomatidae, Richardiidae, Ulidiidae, Lonchaeidae, Lauxaniidae, Sphaeroceridae, Heleomyzidae, Fanniidae, Anthomyiidae, Calliphoridae, Tachinidae, Hippoboscidae, Conopidae, Scathophagidae, Chamaemyiidae. **11 linked-only families** now also have a local plate (Dolichopodidae, Empididae, Nemestrinidae, Psychodidae, Rhagionidae, Scenopinidae, Stratiomyidae, Tabanidae, Tanyderidae, Therevidae, Tipulidae).
- Honest provenance per plate: figure number, the name **exactly as printed**, the family heading of the book, the modern family with a written basis, mirroring/rotation, and a tracing quality (`good` / `fair`) with known weak spots. No vein names were invented; the licence of the EntoWing tracings themselves is recorded as *unknown* (not chosen yet).
- Caught during research: Williston's *Rhinophora mexicana* is now *Microchaetina mexicana* (Tachinidae) and was **not** filed under Rhinophoridae.
- **Vein review** now lists plates in groups (labelled vector plates · traced from Williston · Comstock · Walker), shows the scan underneath tracings, a provenance box, and explains printed letterings (Comstock–Needham; Williston's older names) that are visible but not transcribed.
- **Atlas**: tracings are labelled “Tracing of a public-domain figure”; a new “More plates for this family” strip shows extra plates (morphotypes, book tracings).
- Pipeline: `scripts/pd-tracings/` (ridge filter + skeleton tracer, junction clean-up, provenance table, exporter). Research log: `docs/WING-SOURCES.md` (sources checked, licences, what is still missing and the best leads).
- Not added: Wikimedia Commons downloads (HTTP 429 from this environment); two clean Zenodo drawings (Helosciomyzidae, Chyromyidae) whose publisher licence could not be confirmed; photographs (not traceable automatically).
- Tests: provenance, licence, scan/SVG/graph consistency for every tracing; the reference-model test now accepts curated orientation/scale only with a curation basis.

## v0.50 · 2026-10-16 · Exact plate vectors (pilot)

- **Vein review page** (Start → “Help check the veins”, `app/PlateReview.tsx`): 7 pilot plates (Syrphidae · Episyrphus, Ceriana, Pipiza; Asilidae; Culicidae; Cylindrotomidae; Muscidae · Musca) shown as exact, clickable vein graphs over the original plate. Confirm, correct (click line pieces), reject or add names; notes; progress; review saved in the browser and downloadable as `*.entowing-plate-review.json`.
- **Extraction pipeline** (`scripts/plate-vectors/`): geometry is taken from the authors’ own vector paths (no redrawing), split at drawn junctions; names are copied exactly as printed (subscripts re-joined) and attached through the author’s leader lines, choosing at junctions the edge that continues the leader. Ambiguities are flagged, continuations are only suggestions. Older names (CuA1, dm-cu…) are kept; a possible modern name (Cumming & Wood 2017 system) is shown only as a hint.
- Data: `public/plate-vectors/*.json` (`entowing-plate-vectors/1.0`), with source, author and licence; derived graphs carry the source licence (CC BY-SA 3.0).
- **Eristalis plate smoothed**: centripetal Catmull–Rom curves pass exactly through every user-reviewed node; `Cu1` is written as `m-cu` (legacy id kept as `data-legacy-id`).
- Tipulidae could not be included: its plate is only linked remotely (Wikimedia returned HTTP 429 from this environment); Cylindrotomidae (Tipuloidea) stands in for the crane-fly group.
- Tests: 21 (vector integrity, licence carry-over, review sanitising, Eristalis nodes preserved).

## v0.49 · 2026-10-16 · Field Journal

- New default **Journal** theme (ring-bound notebook, washi tape, stickers, gouache landscape heroes, speech bubbles, handwritten headings). All artwork is original SVG in `public/journal/`; fonts Caveat and Patrick Hand (SIL OFL 1.1) are self-hosted in `public/fonts/` with their licences. The saved theme is applied before first paint.
- **Start page** (`app/StartGuide.tsx`): vein-system primer on the reviewed Eristalis tracing, six-stop learning path with visited stamps, question cards that route to the right page, glossary, “can / cannot tell you” page.
- **Journal tabs** replace the mode pills; one shared journey definition (`app/lib/journey.ts`) drives tabs, path and per-page guide notes (`app/components/ModeGuide.tsx`, collapsible, remembered).
- **Learn**: “Load the reviewed Eristalis example” fills the quiz in one click (with the usual loss guard and autosave).
- Brand button now returns to Start. Mobile: tabs in a grid, top bar no longer sticky.
- Tests: 19 (journey consistency, local artwork/font licences added).

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
