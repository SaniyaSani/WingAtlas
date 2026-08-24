# EntoWing v0.46

Interactive Diptera wing atlas with editable, individually selectable veins and
prepared-wing identification references.

## Included

- atlas of 157 Diptera family-level entries
- interactive wing editor and SVG export
- user-reviewed *Eristalis* geometry
- multiple Bombyliidae and Syrphidae classifier morphotypes
- *Musca domestica*, *Coenosia pudorosa* and *Drymeia hamata* references
- neutral classifier masks kept separate from the coloured atlas geometry

## Run locally

Requirements: Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm run build
npm start
```

## Project structure

- `app/` — interface, editor, atlas and identifier
- `public/reference-wings/` — local SVG and image references
- `scripts/import-commons-wings.py` — reference-import helper

The source package is standalone and contains no account, hosting-platform or
workspace-authentication configuration.
