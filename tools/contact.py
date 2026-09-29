#!/usr/bin/env python3
"""Contact sheets for review.

  python3 tools/contact.py OUT.jpg 'review/raw/shed_*.png' [--cols 4] [--width 480] [--refs]

Tiles the matching images in time order with their filenames as labels.
With --refs, the three style references are appended at the end for a side
by side comparison.
"""
import glob, sys, os
from PIL import Image, ImageDraw

args = sys.argv[1:]
out = args[0]
pattern = args[1]
cols = int(args[args.index('--cols') + 1]) if '--cols' in args else 4
width = int(args[args.index('--width') + 1]) if '--width' in args else 480
files = sorted(glob.glob(pattern))
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
if '--refs' in args:
    files += [os.path.join(root, 'refs', f'{i}.webp') for i in (1, 2, 3)]
if not files:
    sys.exit('no files')
tiles = []
for f in files:
    im = Image.open(f).convert('RGB')
    h = int(im.height * width / im.width)
    if 'refs' in f:
        h = int(width * 9 / 16)
        im = im.resize((h, h), Image.LANCZOS)
        canvas = Image.new('RGB', (width, h), (0, 0, 0))
        canvas.paste(im, ((width - h) // 2, 0))
        im = canvas
    else:
        im = im.resize((width, h), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    label = os.path.basename(f)
    d.rectangle([0, 0, 7 * len(label) + 6, 14], fill=(0, 0, 0))
    d.text((3, 1), label, fill=(230, 200, 140))
    tiles.append(im)
rows = (len(tiles) + cols - 1) // cols
th = max(t.height for t in tiles)
sheet = Image.new('RGB', (cols * width + (cols - 1) * 4, rows * th + (rows - 1) * 4), (40, 40, 40))
for k, t in enumerate(tiles):
    sheet.paste(t, ((k % cols) * (width + 4), (k // cols) * (th + 4)))
sheet.save(out, quality=90)
print(out, sheet.size)
