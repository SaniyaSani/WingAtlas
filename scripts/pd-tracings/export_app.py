"""Export public-domain book tracings into EntoWing (v0.51).

Writes, per plate: public/reference-wings/<id>.svg, public/plate-vectors/scans/<id>.png,
public/plate-vectors/<id>.json; and returns manifest + curation entries (printed as JSON).
"""
import json, math, sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from plates_meta import P, PD
from rastervec import load_crop
from graphfix import simplify

APP = os.environ.get("ENTOWING_APP", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
DATA = os.environ.get("ENTOWING_PD_DATA", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"))
ROOT = {"williston": os.path.join(DATA, "williston/hi"), "comstock": os.path.join(DATA, "comstock/hi")}
TODAY = "2026-10-18"
esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

def bez(points):
    """Catmull–Rom (as in the SVG) sampled into a polyline."""
    if len(points) == 2: return [list(map(lambda v: round(v, 2), p)) for p in points]
    P_ = [points[0]] + points + [points[-1]]; out = [points[0]]
    for i in range(1, len(P_) - 2):
        p0, p1, p2, p3 = P_[i-1], P_[i], P_[i+1], P_[i+2]
        c1 = (p1[0] + (p2[0]-p0[0]) / 6, p1[1] + (p2[1]-p0[1]) / 6)
        c2 = (p2[0] - (p3[0]-p1[0]) / 6, p2[1] - (p3[1]-p1[1]) / 6)
        n = max(2, min(8, int(math.hypot(p2[0]-p1[0], p2[1]-p1[1]) / 6)))
        for k in range(1, n + 1):
            t = k / n; a = (1-t)**3; b = 3*(1-t)**2*t; c = 3*(1-t)*t**2; d = t**3
            out.append((a*p1[0]+b*c1[0]+c*c2[0]+d*p2[0], a*p1[1]+b*c1[1]+c*c2[1]+d*p2[1]))
    return [[round(x, 2), round(y, 2)] for x, y in out]

def path_d(points):
    if len(points) == 2:
        (x0, y0), (x1, y1) = points; return f"M{x0:.1f} {y0:.1f}L{x1:.1f} {y1:.1f}"
    P_ = [points[0]] + points + [points[-1]]; d = f"M{points[0][0]:.1f} {points[0][1]:.1f}"
    for i in range(1, len(P_) - 2):
        p0, p1, p2, p3 = P_[i-1], P_[i], P_[i+1], P_[i+2]
        c1 = (p1[0] + (p2[0]-p0[0]) / 6, p1[1] + (p2[1]-p0[1]) / 6)
        c2 = (p2[0] - (p3[0]-p1[0]) / 6, p2[1] - (p3[1]-p1[1]) / 6)
        d += f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    return d

manifest, curation, index = {}, {}, []
for (rid, src, slug, page, fig, genus, hist, family, basis, quality, notes) in P:
    g = json.load(open(f"batch/{slug}.json"))
    w, h, stroke = g["width"], g["height"], g["stroke"]
    g["lines"] = simplify(g["lines"], tol=4.0, tick=9.0 if src["book"] == "williston" else 12.0)
    leaf = f"https://archive.org/details/{src['archive']}/page/n{page - 1}/mode/1up"
    pdf = f"https://archive.org/download/{src['archive']}/{src['archive']}.pdf"
    figlabel = fig if fig.startswith("pl.") else f"fig. {fig}"
    credit = f"After {src['short']}, {src['work'].split(' (')[0]}, {figlabel} (scan leaf n{page - 1})"
    mirrored = g["mirror"]
    title = f"{genus} wing ({src['short']}, {figlabel})"
    pdnote = {"williston": PD, "comstock": "NOT_IN_COPYRIGHT, published 1918, USA", "walker": "NOT_IN_COPYRIGHT, published 1853, London"}[src["book"]]
    desc = (f"EntoWing centre-line tracing of {src['author']}, {src['work']}, {figlabel}: '{genus}' as printed in the source. "
            f"Source scan: {leaf}. Public domain source ({pdnote}). "
            f"Geometry only — no vein names are assigned. {'Mirrored so that the wing base is on the left. ' if mirrored else ''}"
            + ("Dashed lines reproduce the dotted wing margin of the print. " if g["margin"] else "")
            + f"Quality: {quality}.")
    desc = desc.replace("archive.org lists the scan as ", "")
    # --- SVG
    segs = "\n".join(f'    <path data-segment="s{i+1:02d}" d="{path_d(l)}"/>' for i, l in enumerate(g["lines"]))
    marg = "\n".join(f'    <path data-segment="m{i+1:02d}" data-kind="dotted-margin" d="{path_d(l)}"/>' for i, l in enumerate(g["margin"]))
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{esc(family)}: {esc(title)} — tracing">
  <title>{esc(family)}: {esc(title)} — EntoWing tracing</title>
  <desc>{esc(desc)}</desc>
  <g fill="none" stroke="#111111" stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round" data-layer="traced-lines">
{segs}
  </g>
  <g fill="none" stroke="#111111" stroke-width="{stroke * .5:.2f}" stroke-linecap="round" stroke-dasharray="{stroke * 1.4:.1f} {stroke * 1.6:.1f}" data-layer="dotted-margin">
{marg}
  </g>
</svg>
'''
    open(f"{APP}/public/reference-wings/{rid}.svg", "w").write(svg)
    # --- scan crop (same crop + mirror as the tracing)
    if src["book"] in ROOT:
        crop = load_crop(f"{ROOT[src['book']]}/p{page}-{page}.png", tuple(g["box"]), mirrored)
        im = Image.fromarray((np.clip(crop, 0, 1) * 255).astype("uint8"))
    else:   # prepared crop (mirrored/rotated/scaled before tracing), saved by zen_batch.py
        im = Image.open(f"batch/{slug}.png").convert("L")
    im = im.quantize(16) if False else im
    os.makedirs(f"{APP}/public/plate-vectors/scans", exist_ok=True)
    im.save(f"{APP}/public/plate-vectors/scans/{rid}.png", optimize=True)
    # --- graph: nodes by endpoint clustering
    nodes, edges = [], []
    def node_for(p):
        for n in nodes:
            if math.hypot(n["x"] - p[0], n["y"] - p[1]) <= 3.5: n["degree"] += 1; return n["id"]
        nodes.append({"id": f"n{len(nodes)+1}", "x": round(p[0], 2), "y": round(p[1], 2), "degree": 1}); return nodes[-1]["id"]
    for i, l in enumerate(g["lines"]):
        edges.append({"id": f"e{i+1:02d}", "from": node_for(l[0]), "to": node_for(l[-1]), "strokeWidth": stroke, "sourceElementId": f"s{i+1:02d}", "points": bez(l)})
    plate = {
        "schema": "entowing-plate-vectors/1.0", "referenceId": rid, "family": family, "plateTitle": title,
        "kind": "raster-tracing",
        "printedLettering": src["book"] == "comstock",
        "source": {"page": leaf, "author": src["author"], "credit": credit, "license": "Public domain source",
                   "licenseUrl": "https://creativecommons.org/publicdomain/mark/1.0/", "file": f"/plate-vectors/scans/{rid}.png"},
        "derivative": {"note": f"Centre-line tracing of a scanned printed figure (archive.org {src['archive']}, PDF page {page}); "
                               "lines were found automatically (ridge filter, skeleton, smoothing) and are not redrawn by hand. No names are assigned."
                               + (" The print carries Comstock–Needham vein lettering; it is visible in the scan underneath but is not transcribed." if src["book"] == "comstock" else ""),
                       "license": "unknown (source is public domain; the licence of the EntoWing tracing has not been set)",
                       "attribution": f"{src['author']} ({src['short'].split()[-1]}), {figlabel}; tracing by EntoWing",
                       "generatedOn": TODAY, "precision": "Douglas–Peucker 1.7 px on a 300 dpi scan, then Catmull–Rom smoothing; check against the scan"},
        "terminology": "none assigned (geometry only)",
        "provenance": {"genusAsPrinted": genus, "familyAsPrinted": hist, "modernFamily": family, "familyBasis": basis,
                       "figure": fig, "pdfPage": page,
                       "letteringSystem": (None if src["book"] != "comstock" else ("Williston's older vein and cell names (figure after Williston)" if "After Williston" in " ".join(notes) else "Comstock–Needham (1918)")), "archiveId": src["archive"], "pdf": pdf, "mirrored": mirrored, "quality": quality, "notes": notes},
        "box": {"x": 0, "y": 0, "width": w, "height": h},
        "edges": edges, "nodes": nodes,
        "faintLines": [{"id": f"margin-{i+1}", "points": bez(l)} for i, l in enumerate(g["margin"])],
        "leaders": [], "labels": [], "reviewStatus": "unreviewed",
    }
    json.dump(plate, open(f"{APP}/public/plate-vectors/{rid}.json", "w"), indent=1)
    index.append({"referenceId": rid, "family": family, "plateTitle": title, "labels": 0, "veinLabels": 0, "flagged": 0, "edges": len(edges),
                  "kind": "raster-tracing", "source": src["short"], "quality": quality, "printedLettering": src["book"] == "comstock"})
    taxon = None if genus.startswith("unnamed") else genus.split(" (")[0]
    entry = {"family": family, "title": f"{title}.svg"}
    if taxon:
        entry["taxon"] = taxon
        entry["rank"] = ("species" if len(taxon.split()) > 1 else "genus") + "-level reference · name as printed in " + src["short"]
    entry.update({"assetPath": f"/reference-wings/{rid}.svg", "sourcePage": leaf, "originalUrl": pdf,
                  "author": f"{src['author']} · EntoWing vector trace", "credit": credit,
                  "license": "Public domain source", "licenseUrl": "https://creativecommons.org/publicdomain/mark/1.0/",
                  "width": float(w), "height": float(h), "localAsset": True, "referenceOnly": True})
    manifest[rid] = entry
    curation[rid] = {
        "referenceStatus": "derived-tracing", "imageType": "tracing",
        "orientation": {"baseSide": "left", "anteriorEdge": "top"},
        "scaleKnown": False,
        "publication": {"url": leaf},
        "notes": [f"Name as printed: {genus}. Family in the source: {hist}.", f"Family assignment: {basis}"] + notes
                 + ([f"Mirrored from the print (base on the right in {src['short']})."] if mirrored else [])
                 + [f"Tracing quality: {quality}. Automatic centre-line tracing; compare with the scan in Vein review before using details."],
        "basis": f"Figure number, name and family heading transcribed from the printed caption ({src['short']}, scan leaf n{page - 1}); orientation set during tracing; the figure carries no scale bar.",
    }
    print(rid, len(edges), len(nodes), os.path.getsize(f"{APP}/public/plate-vectors/scans/{rid}.png") // 1024, "KB", os.path.getsize(f"{APP}/public/reference-wings/{rid}.svg") // 1024, "KB")
json.dump({"manifest": manifest, "curation": curation, "index": index}, open("export-out.json", "w"), indent=1)
