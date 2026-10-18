import numpy as np
from skimage import filters, morphology, measure
def flatten(g):
    bg = filters.gaussian(g, sigma=25)
    return np.clip(g / np.maximum(bg, 1e-3), 0, 1.2)
def ridge_ink(g, sigmas=(1, 1.5, 2.2), lo=0.06, hi=0.18, min_area=80, dot_max=45, erase=(), window=31, k=0.25):
    flat = flatten(g)
    t = filters.threshold_sauvola(flat, window_size=window, k=k)
    raw = flat < t * 0.92
    lab = measure.label(raw)
    dots = np.zeros_like(raw)
    for r in measure.regionprops(lab):
        if r.area <= dot_max:
            dots[lab == r.label] = True
    dots = morphology.dilation(dots, morphology.disk(1))
    hole = dots.copy()
    for (x0, y0, x1, y1) in erase: hole[max(0, y0):y1, max(0, x0):x1] = True
    # fill removed glyphs/dots from the surrounding paper (normalised convolution), so no artificial edges remain
    paper = ~(hole | raw)
    num = filters.gaussian(np.where(paper, flat, 0), sigma=6); den = filters.gaussian(paper.astype(float), sigma=6)
    fill = np.where(den > 1e-3, num / np.maximum(den, 1e-3), 1.0)
    clean = np.where(hole, fill, flat)
    r = filters.sato(clean, sigmas=sigmas, black_ridges=True)
    r = r / (np.percentile(r, 99.7) + 1e-6)
    ink = filters.apply_hysteresis_threshold(r, lo, hi)
    solid = raw & ~dots
    for (x0, y0, x1, y1) in erase: solid[y0:y1, x0:x1] = False
    ink |= morphology.remove_small_objects(solid, max_size=min_area)
    ink = morphology.closing(ink, morphology.disk(1))
    ink = morphology.remove_small_objects(ink, max_size=min_area)
    return ink
