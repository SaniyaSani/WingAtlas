import os
import sys, json, glob, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from skimage import filters, morphology, measure
sys.path.insert(0, os.path.dirname(__file__))
from rastervec import raw_ink
DATA = os.environ.get("ENTOWING_PD_DATA", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"))
out = {}
for path in sys.argv[1:]:
    g = np.asarray(Image.open(path).convert("L"), dtype=np.float32) / 255
    ink = raw_ink(g)
    big = morphology.dilation(ink, morphology.disk(7))
    lab = measure.label(big)
    boxes = []
    for r in measure.regionprops(lab):
        y0, x0, y1, x1 = r.bbox
        w, h = x1 - x0, y1 - y0
        if w > 220 and 60 < h < 520 and 1.35 < w / h < 4.6 and r.area > 9000:
            boxes.append([int(x0), int(y0), int(x1), int(y1)])
    boxes.sort(key=lambda b: (round(b[1] / 120), b[0]))
    name = os.path.basename(path).split("-")[0]
    out[name] = boxes
    im = Image.open(path).convert("RGB"); d = ImageDraw.Draw(im)
    font = ImageFont.load_default(size=44)
    for i, (x0, y0, x1, y1) in enumerate(boxes):
        d.rectangle((x0, y0, x1, y1), outline=(220, 0, 80), width=5)
        d.text((x0 + 8, y0 + 4), str(i), fill=(220, 0, 80), font=font)
    im.resize((im.width // 2, im.height // 2)).save(os.path.join(os.path.dirname(__file__), "out", f"det-{name}.png"))
json.dump(out, open(os.path.join(os.path.dirname(__file__), "out", "boxes.json"), "w"), indent=1)
print({k: len(v) for k, v in out.items()})
