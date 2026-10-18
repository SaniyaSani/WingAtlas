import json, os, sys, numpy as np
from PIL import Image
from skimage import measure
from rastervec import vectorise, load_crop, raw_ink, to_svg, trace, dotted_lines
from ridge import ridge_ink
DATA = os.environ.get("ENTOWING_PD_DATA", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"))
BOOK = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] in ('williston', 'comstock') else 'williston'
B = json.load(open(f'boxes-{BOOK}.json')); picks = json.load(open('picks.json' if BOOK == 'williston' else 'picks-comstock.json'))
ROOT = {'williston': os.path.join(DATA, 'williston/hi'), 'comstock': os.path.join(DATA, 'comstock/hi')}[BOOK]
MIRROR = {"Nerius":0,"Micropeza":0,"Rivellia":0,"Euxesta":0,"Lauxania":0,"Homalomyia":0,"Ornithomyia":0}
import math
def clean_groups(lines, w, h):
    key = lambda p: (round(p[0]), round(p[1]))
    parent = list(range(len(lines)))
    def find(i):
        while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
        return i
    owner = {}
    for i, l in enumerate(lines):
        for p in (l[0], l[-1]):
            k = key(p)
            for dx in (-2,-1,0,1,2):
                for dy in (-2,-1,0,1,2):
                    j = owner.get((k[0]+dx, k[1]+dy))
                    if j is not None: parent[find(i)] = find(j)
            owner[k] = i
    L = lambda l: sum(math.hypot(a[0]-b[0], a[1]-b[1]) for a, b in zip(l, l[1:]))
    groups = {}
    for i, l in enumerate(lines): groups.setdefault(find(i), []).append(i)
    tot = {g: sum(L(lines[i]) for i in m) for g, m in groups.items()}
    main = max(tot.values())
    keep = []
    for g, m in groups.items():
        pts = [p for i in m for p in lines[i]]
        border = any(x < 5 or y < 5 or x > w - 5 or y > h - 5 for x, y in pts)
        if tot[g] < 30 or (border and tot[g] < 0.08 * main): continue
        keep += m
    return [lines[i] for i in sorted(keep)]
over = json.load(open('overrides.json' if BOOK == 'williston' else 'overrides-c.json'))
only = [a for a in sys.argv[1:] if a not in ('williston', 'comstock')]
for p, i, fig, genus, fam in picks:
    if only and genus not in only: continue
    o = over.get(genus, {})
    src = f'{ROOT}/{p}-{p[1:]}.png'
    W, H = Image.open(src).size
    x0, y0, x1, y1 = o.get('box', B[p][i] if isinstance(i, int) else i); pad = o.get('pad', 22)
    box = (max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad))
    mirror = (MIRROR.get(genus, 1) == 1) if BOOK == 'williston' else bool(o.get('mirror', 0))
    g = load_crop(src, box, mirror)
    ink = raw_ink(g); lab = measure.label(ink); h, w = g.shape
    erase = []
    big = max(measure.regionprops(lab), key=lambda r: r.area).label
    for r in measure.regionprops(lab):
        a, b, c, d = r.bbox
        if r.label != big and (c - a) <= 46 and (d - b) <= 50 and (c - a) >= 12 and r.area >= 40 and a < 75 and (c - a) >= 16:
            near_edge = b < 110 or d > w - 110
            if near_edge: erase.append((b - 3, a - 3, d + 3, c + 3))
    if BOOK == 'comstock':   # lettering (Comstock–Needham vein labels) sits inside cells: erase isolated glyph-sized components
        erase = []
        for r in measure.regionprops(lab):
            a, b, c, d = r.bbox; hh, ww = c - a, d - b
            if r.label != big and hh <= 52 and ww <= 95 and max(hh, ww) >= 13 and r.area >= 25 and max(hh, ww) / max(1, min(hh, ww)) < 6:
                erase.append((b - 2, a - 2, d + 2, c + 2))
    erase += [tuple(e) for e in o.get('erase', [])]
    import rastervec; rastervec.HOLE = o.get('hole', 140)
    kw = {k: v for k, v in o.items() if k in ('close_r', 'min_area', 'spur', 'eps', 'k', 'window', 'min_edge', 'dotted')}
    if o.get('mode', 'ridge') == 'ridge':
        ink = ridge_ink(g, lo=o.get('lo', .06), hi=o.get('hi', .18), dot_max=o.get('dot_max', 45), erase=erase)
        spur = o.get('spur', 24)
        lines = trace(ink, spur, o.get('eps', 1.7), o.get('min_edge', 12))
        margin = trace(dotted_lines(g, ink, erase=erase), spur * 2, 2.4, 30) if o.get('dotted', True) else []
        lines = clean_groups(lines, w, h)
        res = {'width': w, 'height': h, 'lines': lines, 'margin': margin, 'gray': g}
    else:
        res = vectorise(src, box, mirror, erase=erase, **kw)
    slug = f'{fam.lower()}-{BOOK}-{genus.lower().replace(" ", "-")}'
    Image.fromarray((res['gray'] * 255).clip(0, 255).astype('uint8')).save(f'batch/{slug}.png')
    META = {'williston': ("Williston 1908", "Williston S.W. (1908) Manual of North American Diptera, 3rd ed., Fig. {fig} ('{genus}', as named in the source), archive.org manualofnorthame00willuoft, scan page {page}"),
            'comstock': ("Comstock 1918", "Comstock J.H. (1918) The Wings of Insects, Fig. {fig} ('{genus}', as named in the source), archive.org wingsofinsectsex00coms, scan page {page}. The printed figure carries Comstock–Needham vein lettering, which is not reproduced here")}
    short, longd = META[BOOK]
    meta = {"title": f"{fam}: {genus} wing ({short}, Fig. {fig}) — vector tracing",
            "desc": "Centre-line tracing of " + longd.format(fig=fig, genus=genus, page=p[1:]) + ". Source public domain. Geometry only; no vein names assigned. " + ("Mirrored so the wing base is on the left. " if mirror else "")}
    open(f'batch/{slug}.svg', 'w').write(to_svg(res, meta, stroke=o.get('stroke', round(max(2.2, w / 270), 2))))
    json.dump({'width': w, 'height': h, 'box': list(box), 'mirror': mirror, 'stroke': round(max(2.2, w / 270), 2), 'lines': [[[round(x, 2), round(y, 2)] for x, y in l] for l in res['lines']], 'margin': [[[round(x, 2), round(y, 2)] for x, y in l] for l in res['margin']]}, open(f'batch/{slug}.json', 'w'))
    print(slug, len(res['lines']), len(res['margin']), 'erase', len(erase), 'mirror', mirror)
