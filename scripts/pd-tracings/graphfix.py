import math
def L(l): return sum(math.hypot(a[0]-b[0], a[1]-b[1]) for a, b in zip(l, l[1:]))

def simplify(lines, tol=4.0, tick=9.0):
    lines = [list(map(tuple, l)) for l in lines if len(l) >= 2]
    # 1. endpoint clusters
    pts = []
    for l in lines: pts += [l[0], l[-1]]
    parent = list(range(len(pts)))
    def find(i):
        while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
        return i
    def union(a, b): parent[find(a)] = find(b)
    for i in range(len(pts)):
        for j in range(i + 1, len(pts)):
            if abs(pts[i][0] - pts[j][0]) <= tol and abs(pts[i][1] - pts[j][1]) <= tol and math.hypot(pts[i][0]-pts[j][0], pts[i][1]-pts[j][1]) <= tol:
                union(i, j)
    for k, l in enumerate(lines):
        if L(l) < tol: union(2 * k, 2 * k + 1)
    groups = {}
    for i, p in enumerate(pts): groups.setdefault(find(i), []).append(p)
    cen = {g: (sum(p[0] for p in m) / len(m), sum(p[1] for p in m) / len(m)) for g, m in groups.items()}
    edges = []
    for k, l in enumerate(lines):
        a, b = find(2 * k), find(2 * k + 1)
        if a == b and L(l) < 3 * tol: continue          # contracted edge or tiny loop
        if L(l) < tol: continue
        pl = [cen[a]] + l[1:-1] + [cen[b]]
        edges.append([a, b, pl])
    # 2. drop short free spurs (costal ticks), iterate
    while True:
        deg = {}
        for a, b, _ in edges: deg[a] = deg.get(a, 0) + 1; deg[b] = deg.get(b, 0) + 1
        keep = [e for e in edges if not ((deg[e[0]] == 1) != (deg[e[1]] == 1) and L(e[2]) < tick)]
        if len(keep) == len(edges): break
        edges = keep
    # 3. merge chains through degree-2 nodes
    changed = True
    while changed:
        changed = False
        deg = {}
        for a, b, _ in edges: deg[a] = deg.get(a, 0) + 1; deg[b] = deg.get(b, 0) + 1
        for n, d in deg.items():
            if d != 2: continue
            inc = [i for i, e in enumerate(edges) if e[0] == n or e[1] == n]
            if len(inc) != 2 or inc[0] == inc[1]: continue
            i, j = inc; e1, e2 = edges[i], edges[j]
            if e1 is e2 or (e1[0] == n and e1[1] == n): continue
            p1 = e1[2] if e1[1] == n else e1[2][::-1]; s1 = e1[0] if e1[1] == n else e1[1]
            p2 = e2[2] if e2[0] == n else e2[2][::-1]; s2 = e2[1] if e2[0] == n else e2[0]
            merged = [s1, s2, p1 + p2[1:]]
            edges = [e for k, e in enumerate(edges) if k not in (i, j)] + [merged]
            changed = True
            break
    return [[[round(x, 2), round(y, 2)] for x, y in e[2]] for e in edges]
