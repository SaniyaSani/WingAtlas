import json
pos = json.load(open('final-pos.json')); scan = json.load(open('final-scan.json'))['rows']; ab = json.load(open('final-abs.json'))
old_pos = json.load(open('pos-old.json')); old_scan = json.load(open('base-all.json'))['rows']; old_ab = json.load(open('absent-old.json'))
z = json.load(open('zpos.json'))
meta = {}
for fam, hits in z.items():
    for h in hits: meta[str(h['id'])] = h
def top1(r): return sum(x['top'][0][0] == x['family'] for x in r)
def top3(r): return sum(any(f == x['family'] for f, _ in x['top']) for x in r)
def cw(r): return sum((not x['noMatch']) and x['top'][0][0] != x['family'] for x in r)
sources = []
for x in pos:
    fid = x['file'].rsplit('-', 1)[1].split('.')[0]
    h = meta.get(fid, {})
    sources.append({"family": x['family'], "zenodo": f"https://zenodo.org/records/{fid}", "doi": h.get('doi'), "licence": h.get('lic'), "title": h.get('title', '')[:160]})
fams = sorted({x['family'] for x in pos})
bench = {
  "schema": "entowing-idlab-benchmark/1.0",
  "date": "2026-10-18",
  "classifier": "v0.52 (thinned-line chamfer matching + v0.47 hybrid features)",
  "previous": "v0.51 (v0.47 hybrid features only)",
  "sets": [
    {"id": "same-figure", "title": "Same printed figure", "what": f"Scan of a book figure, with EntoWing's tracing of that figure in the library ({len(scan)} wings).",
     "n": len(scan), "now": {"top1": top1(scan), "top3": top3(scan)}, "before": {"top1": top1(old_scan), "top3": top3(old_scan)}},
    {"id": "other-specimens", "title": "Other species, same family", "what": f"Open-licence wing photographs and drawings from recent papers (Zenodo / Plazi) of {len(fams)} families that are in the library, but showing other species than the library plates.",
     "n": len(pos), "now": {"top1": top1(pos), "top3": top3(pos), "keptUnidentified": sum(x['noMatch'] for x in pos), "confidentlyWrong": cw(pos)},
     "before": {"top1": top1(old_pos), "top3": top3(old_pos), "keptUnidentified": sum(x['noMatch'] for x in old_pos), "confidentlyWrong": cw(old_pos)}},
    {"id": "absent-families", "title": "Families not in the library", "what": f"Wing photographs of {len(ab)} families that EntoWing has no plate for; the right answer is “no reliable match”.",
     "n": len(ab), "now": {"keptUnidentified": sum(x['noMatch'] for x in ab)}, "before": {"keptUnidentified": sum(x['noMatch'] for x in old_ab)}},
  ],
  "reading": "The lab reliably finds a drawing that is already in its library. It does not yet identify the family of a new specimen: with one drawing per family, other species of the same family usually look too different. It now says so (no reliable match) much more often instead of naming a wrong family.",
  "otherSpecimenSources": sources,
}
json.dump(bench, open('../../public/idlab-benchmark.json', 'w'), indent=1, ensure_ascii=False)
for s in bench['sets']: print(s['id'], s['n'], s['now'], s['before'])
