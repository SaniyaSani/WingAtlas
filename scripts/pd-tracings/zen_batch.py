"""Trace prepared single-wing crops (Walker 1853 plates).

Usage: PICKS=picks-walker.json python3 zen_batch.py   (and picks-walker2.json for the whole-fly figures)
"""
import json, os, sys
import numpy as np
from PIL import Image
from skimage import measure, morphology
from rastervec import trace, dotted_lines
from ridge import ridge_ink
import rastervec
ZEN = os.environ.get("ENTOWING_ZEN_DATA", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "walker", "prep"))
PICKS = json.load(open(os.environ.get("PICKS", "picks-walker.json")))
only = sys.argv[1:]
for pk in PICKS:
    slug = pk["slug"]
    if only and slug not in only: continue
    im = Image.open(os.path.join(ZEN, pk["file"])).convert("L").crop(tuple(pk["box"]))
    s = pk.get("scale", 1.0)
    if s != 1.0: im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    if pk.get("mirror"): im = im.transpose(Image.FLIP_LEFT_RIGHT)
    g = np.asarray(im, dtype=np.float32) / 255.0
    h, w = g.shape
    erase = [tuple(e) for e in pk.get("erase", [])]
    # isolated glyphs (printed labels) and figure letters
    from ridge import flatten
    from skimage import filters
    flat = flatten(g); raw = flat < filters.threshold_sauvola(flat, window_size=31, k=0.25) * 0.92
    lab = measure.label(raw); regs = measure.regionprops(lab)
    big = max(regs, key=lambda r: r.area).label
    gmax = pk.get("glyph", 60)
    for r in regs:
        a, b, c, d = r.bbox; hh, ww = c - a, d - b
        if r.label != big and hh <= gmax and ww <= gmax * 1.9 and max(hh, ww) >= 8 and r.area >= 20 and max(hh, ww) / max(1, min(hh, ww)) < 6:
            erase.append((b - 2, a - 2, d + 2, c + 2))
    ink = ridge_ink(g, lo=pk.get("lo", .06), hi=pk.get("hi", .18), dot_max=pk.get("dot_max", 45), erase=erase)
    if pk.get("close"): ink = morphology.closing(ink, morphology.disk(pk["close"]))
    rastervec.HOLE = pk.get("hole", 140)
    lines = trace(ink, pk.get("spur", 24), pk.get("eps", 1.7), 12)
    margin = trace(dotted_lines(g, ink, erase=erase), 48, 2.4, 30) if pk.get("dotted", False) else []
    from batch_helpers import clean_groups
    if pk.get("clip_left"):
        # the wing base is hidden by the thorax and legs in a whole-fly figure: keep only the free part of the wing
        cut = pk["clip_left"] * w
        clipped = []
        for l in lines:
            run = []
            for p in l:
                if p[0] >= cut: run.append(p)
                else:
                    if len(run) >= 2: clipped.append(run)
                    run = []
            if len(run) >= 2: clipped.append(run)
        lines = clipped
    lines = clean_groups(lines, w, h)
    if pk.get("leaders"):
        # leader lines drawn by the author from a printed label to a vein or cell; listed by hand (scaled coordinates)
        import math
        def dseg(p, s):
            (x1, y1, x2, y2) = s; vx, vy = x2 - x1, y2 - y1; t = max(0, min(1, ((p[0]-x1)*vx + (p[1]-y1)*vy) / max(vx*vx + vy*vy, 1e-9)))
            return math.hypot(p[0] - (x1 + t*vx), p[1] - (y1 + t*vy))
        before = len(lines)
        lines = [l for l in lines if sum(min(dseg(p, s) for s in pk["leaders"]) <= 6 for p in l) < 0.8 * len(l)]
        print("  leader edges removed:", before - len(lines))
    if pk.get("drop_leaders"):
        # leader lines run straight from a printed label to the wing: free end next to an erased glyph
        import math
        ends = {}
        for l in lines:
            for p in (tuple(map(round, l[0])), tuple(map(round, l[-1]))): ends[p] = ends.get(p, 0) + 1
        def near_glyph(p, pad=18):
            return any(x0 - pad <= p[0] <= x1 + pad and y0 - pad <= p[1] <= y1 + pad for (x0, y0, x1, y1) in erase)
        kept = []
        for l in lines:
            a, b = tuple(map(round, l[0])), tuple(map(round, l[-1]))
            chord = math.hypot(l[0][0] - l[-1][0], l[0][1] - l[-1][1]); length = sum(math.hypot(p[0]-q[0], p[1]-q[1]) for p, q in zip(l, l[1:]))
            free = [p for p, e in ((l[0], a), (l[-1], b)) if ends[e] == 1]
            if free and chord / max(length, 1e-6) > 0.97 and any(near_glyph(p) for p in free): continue
            kept.append(l)
        print("  leaders dropped:", len(lines) - len(kept)); lines = kept
    os.makedirs("batch", exist_ok=True)
    Image.fromarray((g * 255).astype("uint8")).save(f"batch/{slug}.png")
    stroke = round(max(2.2, w / 270), 2)
    json.dump({"width": w, "height": h, "box": pk["box"], "scale": s, "mirror": bool(pk.get("mirror")), "stroke": stroke,
               "lines": [[[round(x, 2), round(y, 2)] for x, y in l] for l in lines],
               "margin": [[[round(x, 2), round(y, 2)] for x, y in l] for l in margin]}, open(f"batch/{slug}.json", "w"))
    from rastervec import to_svg
    open(f"batch/{slug}.svg", "w").write(to_svg({"width": w, "height": h, "lines": lines, "margin": margin}, {"title": slug, "desc": slug}, stroke=stroke))
    print(slug, w, h, len(lines), len(margin), "erase", len(erase))
