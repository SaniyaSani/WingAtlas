# EntoWing

EntoWing is an interactive research atlas for exploring the evolution, morphology, and terminology of Diptera wings. It combines a phylogenetic family atlas, curated reference plates, specimen-aware SVG annotation, an experimental Wing ID Lab, and a comparative morphology workbench.

## Current release · v0.48

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
