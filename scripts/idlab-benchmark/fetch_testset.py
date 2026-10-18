"""Download and crop the 'other species' test wings (open-licence Zenodo/Plazi figures).

Writes crops/<Family>-<zenodo id>.png and positives.json. The images are test data only and
are not part of EntoWing; their licences are listed in ../../public/idlab-benchmark.json.
"""
import json, os, urllib.request
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
UA = "EntoWing benchmark (set your contact here)"
os.makedirs("pos", exist_ok=True); os.makedirs("crops", exist_ok=True)
items = []
for name, (a, b, c, d) in json.load(open("pos-list.json")):
    family, rest = name.split("-", 1); record = rest.split(".")[0]
    path = os.path.join("pos", name)
    if not os.path.exists(path):
        meta = json.load(urllib.request.urlopen(urllib.request.Request(f"https://zenodo.org/api/records/{record}", headers={"User-Agent": UA})))
        key = meta["files"][0]["key"]
        open(path, "wb").write(urllib.request.urlopen(urllib.request.Request(f"https://zenodo.org/records/{record}/files/{key}?download=1", headers={"User-Agent": UA})).read())
    im = Image.open(path).convert("L"); w, h = im.size
    crop = im.crop((int(a * w), int(b * h), int(c * w), int(d * h)))
    if max(crop.size) > 1400: crop.thumbnail((1400, 1400))
    out = os.path.join("crops", name.rsplit(".", 1)[0] + ".png"); crop.save(out)
    if family not in ("Acroceridae", "Neriidae", "Bombyliidae", "Dolichopodidae"):   # crops that cut the wing
        items.append({"file": os.path.abspath(out), "family": family})
json.dump(items, open("positives.json", "w"), indent=1)
print(len(items), "test wings")
