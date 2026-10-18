# Public-domain book tracings (v0.51–v0.52)

Centre-line tracings of wing figures printed in three public-domain books:

| book | archive.org id | status on archive.org |
| --- | --- | --- |
| Williston S. W. (1908) *Manual of North American Diptera*, 3rd ed. | `manualofnorthame00willuoft` | NOT_IN_COPYRIGHT |
| Comstock J. H. (1918) *The Wings of Insects* | `wingsofinsectsex00coms` | NOT_IN_COPYRIGHT |
| Walker F. (1853) *Insecta Britannica. Diptera*, vol. 2 | `insectabritannic02walkuoft` | NOT_IN_COPYRIGHT |

Nothing here is redrawn by hand and no vein names are assigned. Every plate keeps
the figure number, the name exactly as printed, the family heading of the book and
a written basis for the modern family (`plates_meta.py`).

## Steps

```bash
# 0. data: put the PDFs in data/<book>/ and render the needed pages at 300 dpi (grey)
mkdir -p data/williston/hi data/comstock/hi
pdftoppm -f 288 -l 288 -r 300 -gray -png data/williston/williston1908.pdf data/williston/hi/p288
#    page numbers used: see picks.json / picks-comstock.json (first field = PDF page)

# 1. find wing figures on a page (writes out/boxes.json and out/det-pNNN.png for checking)
python3 detect.py data/williston/hi/p288-288.png

# 2. trace (writes batch/<slug>.svg|png|json); run from a working folder that holds
#    picks*.json, overrides*.json and boxes-<book>.json
python3 batch.py williston
python3 batch.py comstock

# 2b. Walker plates: the separate wing figures are small and tilted, so they are cut out,
#     mirrored/rotated first, then traced
python3 prep_walker.py
PICKS=picks-walker.json python3 zen_batch.py
PICKS=picks-walker2.json python3 zen_batch.py   # whole-fly figures, wing base clipped (quality "rough")

# 3. export into the app: SVG plate, scan crop, review graph, manifest + curation entries
python3 export_app.py            # prints a size report; writes export-out.json
```

`export-out.json` holds the manifest, curation and review-index entries that were
merged into `app/family-wing-references.generated.json`, `app/reference-curation.json`
and `public/plate-vectors/index.json`.

## How the tracing works

1. crop the figure box (+ padding), mirror if the book shows the wing base on the right;
2. flatten the paper background, remove isolated dots/stipple and figure numbers
   (Comstock's lettering is removed as isolated glyph-sized components), fill the holes
   from the surrounding paper;
3. ridge filter (Sato) + hysteresis threshold → line mask; dark solid lines are kept;
4. skeleton → pixel graph → prune spurs → Douglas–Peucker (1.7 px) → Catmull–Rom;
5. `graphfix.simplify`: contract junction clusters, drop short costal ticks, merge
   chains, so that each review edge is one vein segment between junctions;
6. dotted wing margins are traced separately and shown as a dashed layer.

Quality is recorded per plate (`good` / `fair`); stippled or banded wings, double-ruled
veins and very faint posterior veins are the known weak spots.

## Not used, on purpose

* Williston fig. 149.32 *Rhinophora mexicana* — the species is now *Microchaetina
  mexicana* (Tachinidae), so it would have been wrong under Rhinophoridae.
* Williston fig. 114.8 *Lauxania* — dense stipple; *Sapromyza* (fig. 114.5) is used instead.
* Habitus drawings (whole flies), photographs and wings smaller than ~250 px in the scan.
