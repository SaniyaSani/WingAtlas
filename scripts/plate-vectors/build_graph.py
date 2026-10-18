"""Turn raw plate geometry into an exact, labelled vein graph (entowing-plate-vectors/1.0).

Rules (nothing is guessed):
  * vein strokes  = dark, unsaturated strokes (as drawn by the plate's author)
  * leader lines  = saturated red/blue strokes connecting a printed label to a vein
  * a label's anchor is the leader end that is NOT at the label; without a leader the
    label is attached to the nearest vein within a tight distance and flagged "proximity"
  * vein strokes are split only where one stroke ends on another (a drawn junction)
  * the edge under the anchor is recorded as certain; continuing the same drawn stroke
    is only a *suggestion* for review
"""
import json, math, re, sys
from pathlib import Path

def lum(rgb):
    return (0.2126*rgb[0] + 0.7152*rgb[1] + 0.0722*rgb[2]) / 255

def parse_rgb(value):
    if not value or value == "none": return None
    m = re.match(r"rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?", value)
    if m:
        a = float(m.group(4)) if m.group(4) else 1
        return (float(m.group(1)), float(m.group(2)), float(m.group(3)), a)
    return None

def classify_stroke(s, main_width=None):
    rgb = parse_rgb(s["stroke"])
    if not rgb or rgb[3] == 0:
        fill = parse_rgb(s.get("fill"))
        return "faint" if fill and fill[3] > 0 and lum(fill[:3]) < 0.9 else "fill-only"
    r, g, b, _ = rgb
    sat = max(r, g, b) - min(r, g, b)
    if sat > 90: return "leader"
    if lum((r, g, b)) < 0.3:
        if main_width and s["strokeWidth"] < main_width * 0.75: return "faint"   # thin lines: folds, margins, spurious veins
        return "vein"
    return "faint"          # grey lines: e.g. vena spuria or folds, kept separately

def dist(a, b): return math.hypot(a[0]-b[0], a[1]-b[1])

def project(p, a, b):
    dx, dy = b[0]-a[0], b[1]-a[1]
    L = dx*dx + dy*dy
    t = 0 if L == 0 else max(0, min(1, ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / L))
    q = (a[0]+t*dx, a[1]+t*dy)
    return q, t, dist(p, q)

def nearest_on(points, p):
    best = (float("inf"), None, None)
    for i in range(len(points)-1):
        q, t, d = project(p, points[i], points[i+1])
        if d < best[0]: best = (d, i, q)
    return best

def simplify(points, eps):
    if len(points) < 3: return points
    a, b = points[0], points[-1]
    idx, dmax = 0, 0
    for i in range(1, len(points)-1):
        _, _, d = project(points[i], a, b)
        if d > dmax: idx, dmax = i, d
    if dmax <= eps: return [a, b]
    return simplify(points[:idx+1], eps)[:-1] + simplify(points[idx:], eps)

def bbox_dist(p, bb):
    dx = max(bb[0]-p[0], 0, p[0]-bb[2]); dy = max(bb[1]-p[1], 0, p[1]-bb[3])
    return math.hypot(dx, dy)

def norm_label(text):
    t = text.replace("−", "-").replace("–", "-")
    return t

CROSS = re.compile(r"^(h|[a-z]{1,3}-[a-z]{1,3})$")
VEIN = re.compile(r"^(C|Sc|Rs|R\d(\+\d)?|M\d?(\+\d)?|Cu[AP]?\d?|A\d?)$")

def label_kind(t):
    if t["text"] == "sv": return "landmark"
    if t["text"] in ("Pt",): return "other"
    if CROSS.match(t["text"]): return "crossvein"
    if t["italic"]: return "cell"
    if VEIN.match(t["text"]): return "vein"
    return "other"

SUFFIX = re.compile(r"^([0-9+]+|s|[0-9]\+[0-9])$")

def merge_subscripts(texts):
    texts = [dict(t) for t in texts]
    alive = [True] * len(texts)
    for i, t in enumerate(texts):
        if not SUFFIX.match(t["text"]): continue
        h = t["bbox"][3] - t["bbox"][1]
        best = None
        for j, m in enumerate(texts):
            if j == i or not alive[j] or SUFFIX.match(m["text"]): continue
            mh = m["bbox"][3] - m["bbox"][1]
            gap = t["bbox"][0] - m["bbox"][2]
            vcentre = (t["bbox"][1] + t["bbox"][3]) / 2
            if -mh * 0.25 <= gap <= mh * 0.6 and m["bbox"][1] <= vcentre <= m["bbox"][3] + mh * 0.35 and t["italic"] == m["italic"]:
                if best is None or gap < best[0]: best = (gap, j)
        if best:
            m = texts[best[1]]
            m["text"] = m["text"] + t["text"]
            m["bbox"] = [min(m["bbox"][0], t["bbox"][0]), min(m["bbox"][1], t["bbox"][1]), max(m["bbox"][2], t["bbox"][2]), max(m["bbox"][3], t["bbox"][3])]
            m["id"] = f"{m['id']}+{t['id']}"
            alive[i] = False
    return [t for t, keep in zip(texts, alive) if keep]

def build(raw, ref_id):
    W, H = raw["box"]["width"], raw["box"]["height"]
    diag = math.hypot(W, H)
    tol_join = diag * 0.006
    dark = sorted(s["strokeWidth"] for s in raw["strokes"] if (parse_rgb(s["stroke"]) or (0, 0, 0, 0))[3] > 0 and lum(parse_rgb(s["stroke"])[:3]) < 0.3 and max(parse_rgb(s["stroke"])[:3]) - min(parse_rgb(s["stroke"])[:3]) <= 90)
    main_width = dark[len(dark) // 2] if dark else None
    strokes = [dict(s, cls=classify_stroke(s, main_width)) for s in raw["strokes"]]
    veins = [s for s in strokes if s["cls"] == "vein"]
    leaders = [s for s in strokes if s["cls"] == "leader"]
    faint = [s for s in strokes if s["cls"] == "faint"]

    # split points: where an endpoint of one vein stroke lies on another vein stroke
    cuts = {i: [] for i in range(len(veins))}   # (segment index, point)
    for i, s in enumerate(veins):
        for end in (s["points"][0], s["points"][-1]):
            for j, o in enumerate(veins):
                if j == i: continue
                d, seg, q = nearest_on(o["points"], end)
                if d <= tol_join:
                    # ignore if it is o's own endpoint (end-to-end continuation is still a node)
                    cuts[j].append((seg, q))
    edges = []
    for j, s in enumerate(veins):
        pts = [tuple(p) for p in s["points"]]
        cut_pts = []
        for seg, q in cuts[j]:
            # position along polyline
            along = sum(dist(pts[k], pts[k+1]) for k in range(seg)) + dist(pts[seg], q)
            cut_pts.append((along, seg, q))
        total = sum(dist(pts[k], pts[k+1]) for k in range(len(pts)-1))
        cut_pts = sorted([c for c in cut_pts if tol_join < c[0] < total - tol_join])
        merged = []
        for c in cut_pts:
            if not merged or c[0] - merged[-1][0] > tol_join: merged.append(c)
        pieces, current, k_start = [], [pts[0]], 0
        ci = 0
        for k in range(len(pts)-1):
            while ci < len(merged) and merged[ci][1] == k:
                q = merged[ci][2]
                current.append(q); pieces.append(current); current = [q]; ci += 1
            current.append(pts[k+1])
        pieces.append(current)
        for piece in pieces:
            length = sum(dist(piece[k], piece[k+1]) for k in range(len(piece)-1))
            if length < tol_join * 0.8: continue
            edges.append({"stroke": j, "points": piece, "length": length, "strokeWidth": s["strokeWidth"], "sourceId": s["id"]})

    # nodes: cluster edge endpoints
    nodes = []
    def node_for(p):
        for n in nodes:
            if dist(n["p"], p) <= tol_join: return n["id"]
        nid = f"n{len(nodes)+1}"
        nodes.append({"id": nid, "p": p}); return nid
    for i, e in enumerate(edges):
        e["id"] = f"e{i+1:02d}"
        e["from"] = node_for(e["points"][0]); e["to"] = node_for(e["points"][-1])
    degree = {}
    for e in edges:
        for n in (e["from"], e["to"]): degree[n] = degree.get(n, 0) + 1

    # labels: re-join subscripts that the author set as separate <text> elements (R + 4+5 → R4+5)
    texts = merge_subscripts(raw["texts"])
    labels = []
    used_leaders = set()
    for ti, t in enumerate(texts):
        kind = label_kind(t)
        best = None
        for li, l in enumerate(leaders):
            for end, other in ((l["points"][0], l["points"][-1]), (l["points"][-1], l["points"][0])):
                d = bbox_dist(end, t["bbox"])
                if best is None or d < best[0]: best = (d, li, other)
        cx, cy = (t["bbox"][0]+t["bbox"][2])/2, (t["bbox"][1]+t["bbox"][3])/2
        label = {"id": f"l{ti+1:02d}", "text": t["text"], "kind": kind, "textBox": t["bbox"], "sourceTextId": t["id"]}
        if best and best[0] <= diag * 0.03:
            label.update(method="leader", anchor=best[2], leaderStroke=leaders[best[1]]["id"])
            used_leaders.add(best[1])
        else:
            label.update(method="none", anchor=(cx, cy))
        if kind in ("vein", "crossvein", "landmark"):
            bd, be, bq = float("inf"), None, None
            for e in edges:
                d, seg, q = nearest_on(e["points"], label["anchor"])
                if d < bd: bd, be, bq = d, e, q
            # thin lines (folds, faint veins, small crossveins drawn thinner) compete on equal terms
            for fi, f in enumerate(faint):
                d, seg, q = nearest_on(f["points"], label["anchor"])
                if d < bd: bd, be, bq = d, {"id": f"faint-{fi+1}"}, q
            # At a junction (typically where a vein meets the margin) the leader direction decides:
            # the labelled vein is the incident edge that continues the leader into the wing.
            if label["method"] == "leader" and be is not None and not str(be.get("id", "")).startswith("faint-"):
                near_nodes = [n for n in nodes if dist(n["p"], label["anchor"]) <= tol_join * 3]
                if near_nodes:
                    node = min(near_nodes, key=lambda n: dist(n["p"], label["anchor"]))
                    leader = leaders[[l["id"] for l in leaders].index(label["leaderStroke"])] if label.get("leaderStroke") in [l["id"] for l in leaders] else None
                    tb = t["bbox"]; tc = ((tb[0]+tb[2])/2, (tb[1]+tb[3])/2)
                    vx, vy = label["anchor"][0]-tc[0], label["anchor"][1]-tc[1]
                    vl = math.hypot(vx, vy) or 1
                    vx, vy = vx/vl, vy/vl
                    best_dir = None
                    for e in edges:
                        if e["from"] == node["id"]: pts = e["points"]
                        elif e["to"] == node["id"]: pts = list(reversed(e["points"]))
                        else: continue
                        k = min(len(pts)-1, 6)
                        dx, dy = pts[k][0]-pts[0][0], pts[k][1]-pts[0][1]
                        dl = math.hypot(dx, dy) or 1
                        dot = (dx*vx + dy*vy) / dl
                        if best_dir is None or dot > best_dir[0]: best_dir = (dot, e)
                    if best_dir and best_dir[0] > 0.35:
                        be, bq, bd = best_dir[1], node["p"], dist(node["p"], label["anchor"])
                        label["anchorRule"] = "junction: edge continuing the leader direction"
            limit = diag * (0.012 if label["method"] == "leader" else 0.03)
            if be is not None and bd <= limit:
                label.update(edgeIds=[be["id"]], anchorDistance=round(bd, 2), anchorOnVein=[round(bq[0], 2), round(bq[1], 2)])
                if label["method"] == "none": label["method"] = "proximity"
            else:
                label.update(edgeIds=[], anchorDistance=round(bd, 2) if bd < float("inf") else None, status_hint="no vein close to the label anchor")
        labels.append(label)

    # flag labels whose anchors fall on the same drawn edge: the author's leaders do not separate them
    share = {}
    for l in labels:
        for eid in l.get("edgeIds", []): share.setdefault(eid, []).append(l["text"])
    for l in labels:
        others = sorted({t for eid in l.get("edgeIds", []) for t in share[eid] if t != l["text"]})
        if others: l["review"] = f"shares its anchor edge with {', '.join(others)} — check which part of the line each label means"
        if l.get("anchorDistance") and l["anchorDistance"] > diag * 0.006 and l.get("edgeIds"):
            l["review"] = (l.get("review", "") + ("; " if l.get("review") else "") + f"leader ends {l['anchorDistance']} units from the line").strip()
        if l["kind"] in ("vein", "crossvein", "landmark") and not l.get("edgeIds"):
            l["review"] = "no drawn line close to the label anchor"
        if any(eid.startswith("faint-") for eid in l.get("edgeIds", [])):
            l["onThinLine"] = True

    # suggestion: follow the smoothest continuation through junctions (turn < 30°),
    # stopping at edges anchored by another label. Suggestions are for review only.
    by_id = {e["id"]: e for e in edges}
    anchored = {}
    for l in labels:
        for eid in l.get("edgeIds", []): anchored.setdefault(eid, set()).add(l["id"])
    def far_dir(e, at_node):
        pts = e["points"] if e["from"] == at_node else list(reversed(e["points"]))
        k = min(len(pts)-1, 6)
        dx, dy = pts[k][0]-pts[0][0], pts[k][1]-pts[0][1]; d = math.hypot(dx, dy) or 1
        return dx/d, dy/d
    for l in labels:
        if l["kind"] != "vein" or not l.get("edgeIds") or l["edgeIds"][0].startswith("faint-"): continue
        run = set(l["edgeIds"])
        start = by_id[l["edgeIds"][0]]
        for node0 in (start["from"], start["to"]):
            e, node = start, node0
            for _ in range(12):
                incoming = far_dir(e, node); incoming = (-incoming[0], -incoming[1])
                best = None
                for o in edges:
                    if o is e or o["id"] in run or node not in (o["from"], o["to"]): continue
                    d = far_dir(o, node)
                    turn = math.degrees(math.acos(max(-1, min(1, d[0]*incoming[0] + d[1]*incoming[1]))))
                    if best is None or turn < best[0]: best = (turn, o)
                if not best or best[0] > 30 or anchored.get(best[1]["id"], set()) - {l["id"]}: break
                e = best[1]; run.add(e["id"]); node = e["to"] if e["from"] == node else e["from"]
        l["suggestedEdgeIds"] = sorted(run - set(l["edgeIds"]))

    eps = diag * 0.0006
    out_edges = []
    for e in edges:
        pts = simplify(e["points"], eps)
        out_edges.append({
            "id": e["id"], "from": e["from"], "to": e["to"],
            "strokeWidth": round(e["strokeWidth"], 2), "sourceElementId": e["sourceId"],
            "points": [[round(p[0], 2), round(p[1], 2)] for p in pts],
        })
    return {
        "box": raw["box"],
        "edges": out_edges,
        "nodes": [{"id": n["id"], "x": round(n["p"][0], 2), "y": round(n["p"][1], 2), "degree": degree.get(n["id"], 0)} for n in nodes],
        "faintLines": [{"id": f"faint-{i+1}", "points": [[round(p[0], 2), round(p[1], 2)] for p in simplify([tuple(p) for p in f["points"]], eps)], "sourceElementId": f["id"]} for i, f in enumerate(faint)],
        "leaders": [{"points": [[round(p[0], 2), round(p[1], 2)] for p in (l["points"][0], l["points"][-1])], "sourceElementId": l["id"]} for l in leaders],
        "labels": [{k: (([round(v[0], 2), round(v[1], 2)] if k == "anchor" else v)) for k, v in l.items()} for l in labels],
        "stats": {"veinStrokes": len(veins), "edges": len(out_edges), "nodes": len(nodes), "leaders": len(leaders), "labels": len(labels), "unusedLeaders": len(leaders) - len(used_leaders)},
    }

if __name__ == "__main__":
    out = Path(sys.argv[1]); out.mkdir(exist_ok=True)
    for path in sys.argv[2:]:
        p = Path(path); name = p.name.replace(".raw.json", "")
        g = build(json.loads(p.read_text()), name)
        (out / f"{name}.graph.json").write_text(json.dumps(g))
        labs = g["labels"]
        print(name, g["stats"], "| vein/cross labels:", sum(1 for l in labs if l["kind"] in ("vein","crossvein")),
              "anchored:", sum(1 for l in labs if l.get("edgeIds")),
              "unanchored:", [l["text"] for l in labs if l["kind"] in ("vein","crossvein","landmark") and not l.get("edgeIds")],
              "proximity:", [l["text"] for l in labs if l.get("method") == "proximity"])
