# EntoWing

EntoWing is an interactive research atlas for exploring the evolution, morphology, and terminology of Diptera wings. It combines a phylogenetic family atlas, curated reference plates, specimen-aware SVG annotation, an experimental Wing ID Lab, and a comparative morphology workbench.

## Current release · v0.52 · Checked names travel, honest ID Lab, filters

- Names checked on the Vein review page can be used directly in Wing Mapper and the Learn quiz, from the review page or the Atlas card; reviews can be published for all visitors (`scripts/plate-vectors/publish-review.mjs`).
- Wing ID Lab compares thinned vein lines and shows a measured accuracy test (`docs/IDLAB-BENCHMARK.md`): it reliably finds a drawing in its library, but does not yet identify new specimens — and now says so instead of guessing.
- 4 more families (Walker 1853 whole-fly figures); Atlas *Source* filter and a plate chooser per family; lint errors fixed.

### v0.51 · Wings from public-domain books

- **35 new local wing plates** traced from Williston 1908, Comstock 1918 and Walker 1853 (all public domain). 23 families now have their first plate; 11 families that were only linked now have a local plate. Every plate keeps the figure number, the name exactly as printed and a written basis for its modern family; no vein names are invented. Tracings can be named on the Vein review page with the scan underneath. Research log and remaining gaps: `docs/WING-SOURCES.md`; pipeline: `scripts/pd-tracings/`.

### v0.50 · Exact plate vectors (pilot)

- **Vein review** — seven published plates converted into exact, clickable vein maps (lines taken from the authors’ drawings, names copied exactly as printed and attached via the authors’ leader lines). A review page lets a person confirm, correct or reject every name and export the result. Pipeline: `scripts/plate-vectors/`.
- **Smoother Eristalis** — the user-reviewed tracing is now drawn as curves through exactly the same reviewed nodes.

### v0.49 · Field Journal

- **Journal theme (new default)** — EntoWing now looks like a ring-bound field journal: washi tape, stickers, gouache landscapes, speech-bubble notes and handwritten headings (Caveat and Patrick Hand, SIL OFL, stored locally in `public/fonts`). Scientific and Nocturnal remain one click away.
- **Easy, educational navigation** — six numbered journal tabs (Start · Atlas · Compare · Wing ID Lab · Wing Mapper · Learn), a Start page with an interactive “Meet the wing” vein primer, a board-game style learning path with “visited” stamps, “What do you want to find out?” question cards, a glossary and an honest “can / cannot” page. Every page opens with a “You are on page N of 6” note: three things to do there, the next step, and quick dots to jump anywhere.
- **Learn works immediately** — one click loads the user-reviewed Eristalis tracing as a quiz example.

### v0.48

- **Atlas** — browse Diptera families in phylogenetic context. New: family search, plate filter (local / any / none — dimmed, never deleted), lineage highlight, breadcrumbs, a legend, card badges (LOCAL PLATE · LINKED PLATE · SCAFFOLD), a layer key (reference · morphotype · reconstruction · your markup) and an A/B tray that sends two families straight to Compare. The selected family is remembered between modes.
- **Wing ID Lab** — compare a specimen image against the local reference set and inspect the evidence behind candidate matches.
- **Compare** — Split, Overlay, Blink A/B and Difference views; independent move/scale/rotate/mirror per plate; user-placed base and apex landmarks with landmark alignment; synchronised zoom; canvas-proportion and unknown-scale warnings; searchable plate pickers; full metadata cards that show unknown fields as *unknown*.
- **Wing Mapper** — topology-aware templates and specimen-true tracing. New: undo/redo for annotation and template edits, browser autosave (geometry only) with restore, confirmation before a wing is replaced, validated template import with an import report, a mixed-nomenclature warning, an observed-vs-interpreted readout, and SVG + JSON export with provenance fields.
- **Learn** — review vein terminology and test recognition against the current annotation.
- **Scientific / Nocturnal themes** — unchanged visual identity; keyboard focus is now visible in both.

EntoWing is a research interface, not an automated taxonomic authority. Image similarity and visual overlays are exploratory; identification, homology, and evolutionary interpretation require expert review and primary literature.

## Reference data

Family-level image metadata lives in `app/family-wing-references.generated.json`. Local plates are stored under `public/reference-wings/`. Every displayed comparison keeps its source page, author/credit, and license link alongside the image.

`app/lib/referenceModel.ts` derives a stricter `entowing-reference/1.0` record from each manifest entry (family, taxon, rank, morphotype, specimen, reference status, image type, source, author, licence, terminology, orientation, scale, review status, reviewer, DOI/URL, last check, notes). The manifest itself is unchanged and stays backwards compatible. Each field records its basis: *manifest*, *rule* (documented derivation, e.g. an SVG plate is an illustration), *curation* (`app/reference-curation.json`, every entry with a written basis) or *unknown*. Unknown values are never guessed.

Reusable venation templates use the `.entowing-template.json` format. The reviewed Eristalis example is stored at `app/Eristalis-reference.entowing-template.json`.

## Development

Requirements:

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

Useful commands:

- `npm run install:ci` — install the locked dependency set
- `npm run dev` — run the Vite/Vinext development server
- `npm run build` — build and validate the deployable Sites artifact
- `npm test` — build, validate, and run rendered-shell, reference-integrity and logic tests
- `npm run test:logic` — run only the pure-logic tests (Node ≥ 22.18 strips TypeScript natively)
- `npm run validate:artifact` — recheck an existing artifact
- `npm run lint` — run ESLint

The app runs on [vinext](https://github.com/cloudflare/vinext) and deploys through ChatGPT Sites. Hosting configuration is declared in `.openai/hosting.json`; generated runtime directories are disposable and ignored by Git.

## Project structure

- `app/page.tsx` — application shell, Mapper, and Learn mode
- `app/PhyloAtlas.tsx` — phylogenetic atlas and family references
- `app/WingIdentifier.tsx` — experimental specimen comparison workflow
- `app/WingCompare.tsx` — comparative reference workbench
- `app/components/` — `SearchCombobox`, `ReferenceMetadataCard`
- `app/lib/` — pure, unit-tested modules: `referenceModel`, `referenceIndex`, `compareMath`, `templateSchema`, `mapperAutosave`, `safeStorage`, `wingTypes`
- `app/svgWingMapper.ts` — SVG parsing and vein-map helpers
- `app/globals.css` — visual system and responsive themes
- `tests/` — rendered application, data-integrity and logic checks
- `docs/ARCHITECTURE.md` — staged plan for splitting `page.tsx` and `PhyloAtlas.tsx`
- `CHANGELOG.md` — release notes
