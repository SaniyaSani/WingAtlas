# EntoWing

**An interactive Diptera wing-venation atlas and SVG annotation workspace.**

EntoWing is an early research prototype for exploring how wing venation changes across Diptera. It combines an editable phylogenetic flowchart, an interactive labelled wing plate, and a specimen-oriented SVG mapper in one browser application.

**Live prototype:** [entowing-atlas.ssagutdinova.chatgpt.site](https://entowing-atlas.ssagutdinova.chatgpt.site)

Current public prototype: **v0.34** · August 2026

## What is in the prototype

- An editable phylogenetic board containing 50 Diptera families
- Clickable family cards with literature links, confidence labels, and working evolutionary interpretations
- A hand-reviewed *Eristalis* SVG topology with 47 nodes and 13 selectable structures
- Labels and explanatory cards for `C`, `Sc`, `R1`, `R2+3`, `R4+5`, `M1`, `M4`, `CuA`, `A1`, `r-m`, `sv`, `m-cu`, and `h`
- Click, touch, and keyboard selection of wing structures
- Smooth SVG morphing when moving between branches and families
- A Wing Mapper for loading a specimen photograph, fitting the shared topology, editing nodes and curves, adding crossveins, and exporting SVG/JSON
- Two visual modes: the default **Scientific** atlas and the optional **Nocturnal** constellation theme
- Device-local saving for atlas edits, templates, and the selected visual theme

## Prototype status

This repository is suitable for demonstrating the concept and interaction design. It is **not yet a finished identification key or a validated comparative morphology dataset**.

Every family currently starts from an independent editable copy of the same hand-reviewed *Eristalis* topology. These copies are intended to be fitted to representative specimens and reviewed family by family. The supplied family notes and inferred character changes are teaching and research hypotheses with explicit confidence levels.

Please read [SCIENTIFIC-NOTES.md](SCIENTIFIC-NOTES.md) before interpreting or reusing the anatomical data.

## Run locally

### Requirements

- Node.js 22.13 or newer
- npm

### Start the development version

```bash
npm install
npm run dev
```

Open the local address shown in the terminal.

### Build the production version

```bash
npm run build
```

The current configuration produces a Cloudflare-compatible Vinext worker build.

## Main project files

```text
app/page.tsx                                  Main application and Wing Mapper
app/PhyloAtlas.tsx                            Phylogeny board and family inspector
app/globals.css                               Scientific and Nocturnal visual systems
app/Eristalis-reference.entowing-template.json  Reviewed SVG wing topology
public/favicon.svg                            Project mark
```

## Data and image notes

The repository includes the editable vector geometry in `Eristalis-reference.entowing-template.json`. The original specimen photograph used while reviewing that geometry is **not bundled**. Users can upload their own wing photographs locally in the browser.

The application contains links to external publications and reference pages. Those resources remain subject to their respective terms and licences.

## Privacy

Uploaded specimen images and working edits remain in the browser. The prototype does not upload specimen photographs to an application database. Device-local project data can be cleared through the browser or the relevant reset controls.

## Contributing

Corrections to nomenclature, topology, literature citations, accessibility, and interaction design are welcome. Please describe the taxon, the structure concerned, the nomenclatural system used, and the supporting source when proposing a scientific correction. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

No open-source licence has been selected for this prototype yet. The code, project-specific text, and original vector annotation remain all rights reserved unless a file explicitly states otherwise. Please contact the project owner before redistributing or incorporating them into another project.

## Citation

Until a formal software release or DOI exists, cite the project as:

> Sagutdinova, S. (2026). *EntoWing: Interactive Diptera Wing Atlas* (prototype v0.34). https://entowing-atlas.ssagutdinova.chatgpt.site
