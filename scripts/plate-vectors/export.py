import json, sys, datetime
from pathlib import Path
SRC = Path(__file__).resolve().parents[2]
manifest = json.loads((SRC / "app/family-wing-references.generated.json").read_text())
ASSET_TO_ID = {v["assetPath"].split("/")[-1].replace(".svg", ""): k for k, v in manifest.items() if v.get("localAsset")}
out = SRC / "public/plate-vectors"; out.mkdir(exist_ok=True)
index = []
for name in sys.argv[1:]:
    g = json.loads(Path(f"graphs/{name}.graph.json").read_text())
    rid = ASSET_TO_ID[name]; m = manifest[rid]
    labels = []
    for l in g["labels"]:
        labels.append({k: l[k] for k in ("id", "text", "kind", "method", "anchor", "textBox", "edgeIds", "suggestedEdgeIds", "anchorDistance", "anchorOnVein", "anchorRule", "review", "onThinLine", "sourceTextId", "leaderStroke") if k in l})
    doc = {
        "schema": "entowing-plate-vectors/1.0",
        "referenceId": rid,
        "family": m["family"],
        "plateTitle": m["title"],
        "source": {"page": m["sourcePage"], "author": m["author"], "credit": m["credit"], "license": m["license"], "licenseUrl": m["licenseUrl"], "file": m["assetPath"]},
        "derivative": {
            "note": "Geometry extracted from the plate's own vector paths (no redrawing); labels transferred exactly as printed on the plate and attached through the author's leader lines.",
            "license": m["license"] if m["license"].startswith("CC BY-SA") else "same terms as the source",
            "attribution": f"{m['author']} — {m['title']} ({m['license']}); vein graph by EntoWing",
            "generatedOn": datetime.date.today().isoformat(),
            "precision": "edges are densely sampled source curves simplified to within 0.06 % of the plate diagonal",
        },
        "terminology": "as printed on the plate (system not stated on the plate)",
        **{k: g[k] for k in ("box", "edges", "nodes", "faintLines", "leaders", "stats")},
        "labels": labels,
        "reviewStatus": "unreviewed",
    }
    (out / f"{rid}.json").write_text(json.dumps(doc, separators=(",", ":")))
    flagged = sum(1 for l in labels if l.get("review"))
    index.append({"referenceId": rid, "family": m["family"], "plateTitle": m["title"].replace(".svg", ""), "labels": len(labels), "veinLabels": sum(1 for l in labels if l["kind"] in ("vein", "crossvein", "landmark")), "flagged": flagged, "edges": len(g["edges"])})
    print(rid, len(labels), "labels,", flagged, "flagged")
(out / "index.json").write_text(json.dumps({"schema": "entowing-plate-vectors-index/1.0", "pilot": True, "plates": index}, indent=1))
