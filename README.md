# EntoWing

**An interactive Diptera wing-venation atlas and SVG annotation workspace.**

EntoWing is an early research prototype for exploring how wing venation changes across Diptera. It combines an editable phylogenetic flowchart, an interactive labelled wing plate, and a specimen-oriented SVG mapper in one browser application.

**Direct website:** [saniyasani.github.io/EntoWing](https://saniyasani.github.io/EntoWing/)

Current public prototype: **v0.35** · August 2026

## What is in the prototype

- An editable phylogenetic board containing 50 Diptera families
- Clickable family cards with literature links, confidence labels, and working evolutionary interpretations
- A hand-reviewed *Eristalis* SVG topology with 47 nodes plus literature-grounded Bombyliidae and Syrphidae morphotypes
- Labels and explanatory cards for `C`, `Sc`, `R1`, `R2+3`, `R4+5`, `M1`, `M4`, `CuA`, `A1`, `r-m`, `sv`, `m-cu`, and `h`
- Click, touch, and keyboard selection of wing structures
- Smooth SVG morphing when moving between branches and families
- A Wing Mapper for loading a specimen photograph, fitting the shared topology, editing nodes and curves, adding crossveins, and exporting SVG/JSON
- Two visual modes: the default **Scientific** atlas and the optional **Nocturnal** constellation theme
- Device-local saving for atlas edits, templates, and the selected visual theme

## Prototype status

This repository is suitable for demonstrating the concept and interaction design. It is **not yet a finished identification key or a validated comparative morphology dataset**.

Syrphidae and Bombyliidae now have multiple explicit morphotypes instead of being forced through one *Eristalis* geometry. Other families still start from an independent editable copy of the hand-reviewed *Eristalis* topology and must be fitted to representative specimens and reviewed family by family. The supplied family notes and inferred character changes are teaching and research hypotheses with explicit confidence levels.

Please read [SCIENTIFIC-NOTES.md](SCIENTIFIC-NOTES.md) before interpreting or reusing the anatomical data. Changes in this morphology pass are summarized in [CHANGELOG-v0.35.md](CHANGELOG-v0.35.md), with source links in [MORPHOTYPE-SOURCES.md](MORPHOTYPE-SOURCES.md).

## Run locally

### Requirements

- Node.js 22.13 or newer
- npm

### Start the GitHub Pages version

```bash
npm install
npm run dev:github
```

Open the local address shown in the terminal.

### Build the GitHub Pages website

```bash
npm run build:github
```

The static website is written to `docs/`. It uses relative asset paths, so it works inside a GitHub project URL such as `https://saniyasani.github.io/EntoWing/`.

The included v0.35 `docs/` fallback is already usable on GitHub Pages and loads React from `esm.sh`; see [BUILD-NOTE-v0.35.md](BUILD-NOTE-v0.35.md). Running `npm run build:github` on a normal machine will regenerate the usual bundled static build.

## Publish directly with GitHub Pages

1. Create a public repository named `EntoWing` under the `SaniyaSani` account.
2. Upload the complete contents of this repository, including the prebuilt `docs/` folder.
3. Open **Settings → Pages** in the GitHub repository.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch **main**, folder **/docs**, and press **Save**.
6. After GitHub finishes publishing, the direct website address is:

   `https://saniyasani.github.io/EntoWing/`

Visitors should receive the GitHub Pages address above, not the GitHub repository URL. It opens EntoWing itself immediately.

The existing `npm run build` command remains available for the Cloudflare-compatible Vinext worker build.

## Main project files

```text
app/page.tsx                                  Main application and Wing Mapper
app/PhyloAtlas.tsx                            Phylogeny board and family inspector
app/globals.css                               Scientific and Nocturnal visual systems
app/Eristalis-reference.entowing-template.json  Reviewed SVG wing topology
github-pages/                                  Static GitHub Pages entry point
docs/                                          Ready-to-publish website
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

> Sagutdinova, S. (2026). *EntoWing: Interactive Diptera Wing Atlas* (prototype v0.35). https://saniyasani.github.io/EntoWing/
