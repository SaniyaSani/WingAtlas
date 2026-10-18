"""Prepare single-wing crops from Walker (1853) plates: crop, mirror, rotate so that the
wing base is on the left and the costa on top. Plate pages are rendered at 300 dpi:

    pdftoppm -f 319 -l 319 -r 300 -gray -png insectabritannic02walkuoft.pdf data/walker/hi/p319
    pdftoppm -f 327 -l 327 -r 300 -gray -png insectabritannic02walkuoft.pdf data/walker/hi/p327
    (also pages 315 and 323 for the whole-fly figures)
"""
import os
import numpy as np
from PIL import Image, ImageOps
DATA = os.environ.get("ENTOWING_PD_DATA", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"))

def prep(src, box, angle, mirror, out):
    a = Image.open(os.path.join(DATA, "walker", "hi", src)).convert("L").crop(box)
    paper = int(np.median(np.asarray(a)))          # fill rotated corners with paper tone, not white
    if mirror: a = ImageOps.mirror(a)
    if angle: a = a.rotate(angle, resample=Image.BICUBIC, expand=True, fillcolor=paper)
    os.makedirs(os.path.join(DATA, "walker", "prep"), exist_ok=True)
    a.save(os.path.join(DATA, "walker", "prep", out))

prep("p319-319.png", (180, 840, 540, 1050), -24.5, True, "scat-rot.png")    # pl. XIII 3c Scatophaga stercoraria
prep("p327-327.png", (800, 480, 1080, 840), -56, False, "ochth-rot.png")    # pl. XV 2c Ochthiphila aridella

# whole-fly figures (v0.52): one free wing per fly; base hidden by the thorax (clipped in picks-walker2.json)
prep("p315-315.png", (752, 400, 942, 498), 0, True, "sarco.png")         # pl. XII 4  "Sarcophaga" mortuorum = Cynomya mortuorum (Calliphoridae)
prep("p319-319.png", (472, 1380, 708, 1490), 0, False, "coelopa.png")     # pl. XIII 4 Coelopa frigida
prep("p323-323.png", (742, 392, 982, 510), 0, True, "tetanocera.png")     # pl. XIV 2  Tetanocera ferruginea
prep("p323-323.png", (104, 376, 384, 528), 0, True, "dryomyza.png")       # pl. XIV 1  Dryomyza flaveola
prep("p327-327.png", (782, 356, 1018, 484), 0, False, "palloptera.png")   # pl. XV 1   Palloptera decem-punctata
