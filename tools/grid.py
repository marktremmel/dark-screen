import sys
from PIL import Image
fs = sys.argv[2:]; out = sys.argv[1]
ims = [Image.open(f).convert('RGB').resize((640, 360)) for f in fs]
cols = 2; rows = (len(ims) + 1) // 2
g = Image.new('RGB', (640 * cols, 360 * rows))
for i, im in enumerate(ims): g.paste(im, ((i % cols) * 640, (i // cols) * 360))
g.save(out, quality=85)
