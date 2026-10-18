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
