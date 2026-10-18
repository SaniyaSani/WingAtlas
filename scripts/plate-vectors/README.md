# Plate vectors (pilot)

Converts locally stored reference plates into exact, labelled vein graphs (`public/plate-vectors/*.json`, schema `entowing-plate-vectors/1.0`).

1. `node scripts/plate-vectors/extract.mjs raw <plate-stem> …` — renders each plate in Chromium and records every stroke (densely sampled with the real SVG transforms) and every text label. Needs Playwright (`CHROMIUM_PATH` optional).
2. `python3 scripts/plate-vectors/build_graph.py graphs raw/*.raw.json` — splits strokes at drawn junctions, separates veins / thin lines / leader lines, re-joins subscripts (R + 4+5 → R4+5), and attaches each printed name where the author's leader touches the wing. At junctions the edge that continues the leader direction is chosen. Ambiguous cases get a `review` flag; continuations are only `suggestedEdgeIds`.
3. `python3 scripts/plate-vectors/export.py <plate-stem> …` — writes the app files with source, author, licence and derivative notes.

Nothing is redrawn and no name is invented: names are kept exactly as printed (older systems included). The in-app **Vein review** page (Start → “Help check the veins”) is where a person confirms, corrects or rejects every name. Derived graphs carry the licence of their source plate (CC BY-SA where applicable).
