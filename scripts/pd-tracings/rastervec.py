"""Centre-line vectoriser for scanned wing line drawings (public-domain book figures).

  crop → background flattening → Sauvola threshold → bridge dotted lines (closing)
  → drop specks/stipple (small components) → skeleton → pixel graph → prune short
  spurs (bristles, stipple whiskers) → Douglas–Peucker → Catmull–Rom SVG.

The output is a tracing of the printed figure: geometry only, no vein names.
"""
import json, math, sys
import numpy as np
from PIL import Image
from skimage import filters, morphology, measure

def load_crop(path, box, mirror=False):
    im = Image.open(path).convert("L").crop(box)
    if mirror: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return np.asarray(im, dtype=np.float32) / 255.0

def raw_ink(g, window=31, k=0.25, erase=()):
    bg = filters.gaussian(g, sigma=25)
    flat = np.clip(g / np.maximum(bg, 1e-3), 0, 1.2)
    t = filters.threshold_sauvola(flat, window_size=window, k=k)
    ink = flat < t * 0.92
    for (x0, y0, x1, y1) in erase: ink[y0:y1, x0:x1] = False
    return ink

def binarize(g, close_r=2, min_area=60, window=31, k=0.25, erase=()):
    ink = raw_ink(g, window, k, erase)
    if close_r: ink = morphology.closing(ink, morphology.disk(close_r))
    ink = morphology.remove_small_objects(ink, max_size=min_area)
    return ink

def dotted_lines(g, solid, window=31, k=0.25, erase=(), bridge=5, min_span=70):
    """Dotted margins: chains of small dots → bridged band → keep long, thin bands only."""
    ink = raw_ink(g, window, k, erase)
    lab = measure.label(ink)
    small = np.zeros_like(ink)
    for r in measure.regionprops(lab):
        if 2 <= r.area <= 45: small[lab == r.label] = True
    band = morphology.dilation(small, morphology.disk(bridge))
    band &= ~morphology.dilation(solid, morphology.disk(2))
    out = np.zeros_like(ink)
    lb = measure.label(band)
    for r in measure.regionprops(lb):
        span = max(r.bbox[2] - r.bbox[0], r.bbox[3] - r.bbox[1])
        if span >= min_span and r.area / max(1, span) < bridge * 3.2:   # long and thin, not a stippled patch
            out[lb == r.label] = True
    return out

def pixel_graph(skel):
    H, W = skel.shape
    ys, xs = np.nonzero(skel)
    on = set(zip(ys.tolist(), xs.tolist()))
    nb = lambda p: [(p[0]+dy, p[1]+dx) for dy in (-1,0,1) for dx in (-1,0,1) if (dy or dx) and (p[0]+dy, p[1]+dx) in on]
    deg = {p: len(nb(p)) for p in on}
    nodes = {p for p, d in deg.items() if d != 2}
    seen, edges = set(), []
    for n in nodes:
        for q in nb(n):
            key = frozenset((n, q))
            if key in seen: continue
            path, prev, cur = [n], n, q
            seen.add(key)
            while True:
                path.append(cur)
                if cur in nodes: break
                nxt = [r for r in nb(cur) if r != prev and frozenset((cur, r)) not in seen]
                if not nxt: break
                seen.add(frozenset((cur, nxt[0]))); prev, cur = cur, nxt[0]
            edges.append(path)
    # isolated loops without nodes are ignored (none expected in wing drawings)
    return edges, deg

def length(path): return sum(math.hypot(a[0]-b[0], a[1]-b[1]) for a, b in zip(path, path[1:]))

def prune(edges, deg, spur):
    changed = True
    while changed:
        changed = False
        ends = {}
        for e in edges:
            for p in (e[0], e[-1]): ends[p] = ends.get(p, 0) + 1
        keep = []
        for e in edges:
            free = ends[e[0]] == 1 or ends[e[-1]] == 1
            if free and length(e) < spur and not (ends[e[0]] == 1 and ends[e[-1]] == 1 and length(e) > spur * 0.6):
                changed = True; continue
            keep.append(e)
        edges = merge_chains(keep)
    return edges

def merge_chains(edges):
    """Join edges that meet at degree-2 points (left over after pruning)."""
    while True:
        ends = {}
        for i, e in enumerate(edges):
            for p in (e[0], e[-1]): ends.setdefault(p, []).append(i)
        joint = next((p for p, ids in ends.items() if len(ids) == 2 and ids[0] != ids[1]), None)
        if joint is None: return edges
        i, j = ends[joint]
        a, b = edges[i], edges[j]
        if a[-1] != joint: a = a[::-1]
        if b[0] != joint: b = b[::-1]
        merged = a + b[1:]
        edges = [e for k, e in enumerate(edges) if k not in (i, j)] + [merged]

def rdp(pts, eps):
    if len(pts) < 3: return pts
    (y0, x0), (y1, x1) = pts[0], pts[-1]
    dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy) or 1
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * (pts[i][1] - x0) - dx * (pts[i][0] - y0)) / L
        if d > dmax: dmax, idx = d, i
    if dmax <= eps: return [pts[0], pts[-1]]
    return rdp(pts[:idx+1], eps)[:-1] + rdp(pts[idx:], eps)

def catmull(points):
    if len(points) == 2:
        (x0, y0), (x1, y1) = points; return f"M{x0:.1f} {y0:.1f}L{x1:.1f} {y1:.1f}"
    P = [points[0]] + points + [points[-1]]
    d = f"M{points[0][0]:.1f} {points[0][1]:.1f}"
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i-1], P[i], P[i+1], P[i+2]
        c1 = (p1[0] + (p2[0]-p0[0]) / 6, p1[1] + (p2[1]-p0[1]) / 6)
        c2 = (p2[0] - (p3[0]-p1[0]) / 6, p2[1] - (p3[1]-p1[1]) / 6)
        d += f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    return d

HOLE = 140
def trace(mask, spur, eps, min_edge):
    mask = morphology.remove_small_holes(mask, max_size=HOLE)   # double-ruled costa, ladder artefacts
    skel = morphology.skeletonize(mask)
    edges, deg = pixel_graph(skel)
    edges = prune(edges, deg, spur)
    ends = {}
    for e in edges:
        for p in (e[0], e[-1]): ends[p] = ends.get(p, 0) + 1
    edges = [e for e in edges if length(e) >= min_edge or (ends[e[0]] > 1 and ends[e[-1]] > 1)]
    return [[(x, y) for (y, x) in rdp(e, eps)] for e in edges]

def vectorise(path, box, mirror=False, close_r=2, min_area=60, spur=14, eps=1.7, erase=(), window=31, k=0.25, min_edge=10, dotted=True):
    g = load_crop(path, box, mirror)
    ink = binarize(g, close_r, min_area, window, k, erase)
    lines = trace(ink, spur, eps, min_edge)
    margin = trace(dotted_lines(g, ink, window, k, erase), spur * 2, eps * 1.4, 30) if dotted else []
    h, w = g.shape
    return {"width": w, "height": h, "lines": lines, "margin": margin, "ink": ink, "gray": g}

def to_svg(res, meta, stroke=2.2):
    w, h = res["width"], res["height"]
    paths = "\n".join(f'    <path data-segment="s{i+1:02d}" d="{catmull(l)}"/>' for i, l in enumerate(res["lines"]))
    margin = "\n".join(f'    <path data-segment="m{i+1:02d}" data-kind="dotted-margin" d="{catmull(l)}"/>' for i, l in enumerate(res.get("margin", [])))
    esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace('"', "&quot;")
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{esc(meta['title'])}">
  <title>{esc(meta['title'])}</title>
  <desc>{esc(meta['desc'])}</desc>
  <g fill="none" stroke="#111111" stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round">
{paths}
  </g>
  <g fill="none" stroke="#111111" stroke-width="{stroke * .5:.2f}" stroke-linecap="round" stroke-dasharray="{stroke * 1.4:.1f} {stroke * 1.6:.1f}" data-layer="dotted-margin">
{margin}
  </g>
</svg>
'''
