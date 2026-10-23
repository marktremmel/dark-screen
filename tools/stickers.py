"""Cut Mark's sticker sheets (stickers on a flat grey background) into single PNGs with transparency.
Usage: python3 tools/stickers.py  -> assets_src/stickers/<sheet>_<n>.png (reading order) and build/stickers_check.png"""
import os, glob
import numpy as np
from PIL import Image
from scipy import ndimage
os.chdir('/home/claude/sotet')
OUT = 'assets_src/stickers'; os.makedirs(OUT, exist_ok=True)
SHORT = {'cozy_urban_sticker_collection': 'cozy', 'playful_cartoon_sticker_sheet': 'cartoon', 'retro_city_life_sticker_sheet': 'retro'}
made = []
for f in sorted(glob.glob('assets_src/sheets/*.png')):
    name = SHORT.get(os.path.basename(f)[:-4], os.path.basename(f)[:-4])
    im = np.array(Image.open(f).convert('RGB')).astype(int)
    h, w, _ = im.shape
    corners = np.concatenate([im[:8, :8].reshape(-1, 3), im[:8, -8:].reshape(-1, 3), im[-8:, :8].reshape(-1, 3), im[-8:, -8:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    dist = np.abs(im - bg).sum(axis=2)
    fg = dist > 40
    fg = ndimage.binary_fill_holes(ndimage.binary_closing(fg, iterations=2))
    core = ndimage.binary_erosion(fg, iterations=26)          # pull touching stickers apart, then give each its pixels back
    lab0, n = ndimage.label(core)
    _, (iy, ix) = ndimage.distance_transform_edt(lab0 == 0, return_indices=True)
    lab = np.where(fg, lab0[iy, ix], 0)
    objs = ndimage.find_objects(lab)
    parts = []
    for i, sl in enumerate(objs):
        area = (lab[sl] == i + 1).sum()
        if area < (w * h) * 0.002: continue
        parts.append((sl, i + 1))
    # reading order: rows by centre y, then x
    parts.sort(key=lambda p: ((p[0][0].start + p[0][0].stop) / 2 // (h / 4), p[0][1].start))   # the sheets are 6 x 4
    src = Image.open(f).convert('RGBA')
    for k, (sl, idx) in enumerate(parts):
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        mask = (lab[y0:y1, x0:x1] == idx).astype(np.uint8) * 255
        mask = ndimage.binary_erosion(mask > 0, iterations=1).astype(np.uint8) * 255
        crop = src.crop((x0, y0, x1, y1)); crop.putalpha(Image.fromarray(mask))
        crop.thumbnail((256, 256), Image.LANCZOS)
        p = f'{OUT}/{name}_{k + 1:02d}.png'; crop.save(p); made.append(p)
    print(name, len(parts))
# a check sheet
cell = 110; cols = 12; rows = (len(made) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cell, rows * cell), (60, 90, 60))
for i, p in enumerate(made):
    t = Image.open(p); t.thumbnail((cell - 6, cell - 6)); sheet.paste(t, ((i % cols) * cell + 3, (i // cols) * cell + 3), t)
sheet.save('build/stickers_check.png')
