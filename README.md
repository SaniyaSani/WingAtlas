# EntoWing

EntoWing is an interactive research atlas for exploring the evolution, morphology, and terminology of Diptera wings. It combines a phylogenetic family atlas, curated reference plates, specimen-aware SVG annotation, an experimental Wing ID Lab, and a comparative morphology workbench.

## Current release · v0.47

- **Atlas** — browse Diptera families in phylogenetic context and open available wing references.
- **Wing ID Lab** — compare a specimen image against the local reference set and inspect the evidence behind candidate matches.
- **Compare** — place two locally preserved plates side by side or align them as a transparent overlay, with source and license records kept visible.
- **Wing Mapper** — align reusable topology-aware templates, trace specimen-true venation, and export editable EntoWing templates.
- **Learn** — review vein terminology and test recognition against the current annotation.
- **Scientific / Nocturnal themes** — switch visual environments without changing atlas content.

EntoWing is a research interface, not an automated taxonomic authority. Image similarity and visual overlays are exploratory; identification, homology, and evolutionary interpretation require expert review and primary literature.

## Reference data

Family-level image metadata lives in `app/family-wing-references.generated.json`. Local plates are stored under `public/reference-wings/`. Every displayed comparison keeps its source page, author/credit, and license link alongside the image.

Reusable venation templates use the `.entowing-template.json` format. The reviewed Eristalis example is stored at `app/Eristalis-reference.entowing-template.json`.

## Development

Requirements:

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

Useful commands:

- `npm run install:ci` — install the locked dependency set
- `npm run dev` — run the Vite/Vinext development server
- `npm run build` — build and validate the deployable Sites artifact
- `npm test` — build, validate, and run rendered-shell and reference-integrity tests
- `npm run validate:artifact` — recheck an existing artifact
- `npm run lint` — run ESLint

The app runs on [vinext](https://github.com/cloudflare/vinext) and deploys through ChatGPT Sites. Hosting configuration is declared in `.openai/hosting.json`; generated runtime directories are disposable and ignored by Git.

## Project structure

- `app/page.tsx` — application shell, Mapper, and Learn mode
- `app/PhyloAtlas.tsx` — phylogenetic atlas and family references
- `app/WingIdentifier.tsx` — experimental specimen comparison workflow
- `app/WingCompare.tsx` — comparative reference workbench
- `app/svgWingMapper.ts` — SVG parsing and vein-map helpers
- `app/globals.css` — visual system and responsive themes
- `tests/` — rendered application and data-integrity checks
