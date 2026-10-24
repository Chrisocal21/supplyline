"""Flat previews of the three made maps for the website: python tools/maps/preview.py  ->  public/site/map-1.jpg, map-2.jpg, map-3.jpg"""
import json, os
from PIL import Image, ImageDraw

SEA = 96
COL = {'~': (52, 108, 160), '.': (118, 158, 84), 'f': (52, 104, 60), '^': (140, 128, 116), '*': (232, 238, 242)}
SPEC = {'coffee': (120, 70, 40), 'mango': (250, 160, 40), 'oil': (20, 20, 24)}
root = os.path.join(os.path.dirname(__file__), '..', '..')

for n, scale in ((1, 4), (2, 4), (3, 2)):
    m = json.load(open(os.path.join(root, 'src', 'maps', f'map{n}.json')))
    W, H = m['width'], m['height']
    img = Image.new('RGB', (W * scale, H * scale))
    px = img.load()
    desert = m.get('desert')
    for y in range(H):
        for x in range(W):
            t = m['terrain'][y][x]
            e = int(m['elev'][y][x * 2:x * 2 + 2], 16)
            col = (214, 186, 122) if desert and desert[y][x] == 'd' and t not in '^~' else COL.get(t, COL['.'])
            shade = 0.6 + (e / SEA) * 0.4 if t == '~' else 0.8 + ((e - SEA) / (255 - SEA)) * 0.5
            c = tuple(min(255, int(v * shade)) for v in col)
            for dy in range(scale):
                for dx in range(scale):
                    px[x * scale + dx, y * scale + dy] = c
    d = ImageDraw.Draw(img)
    for p in m['places']:
        r = p['radius']
        big = r >= 5
        col = (250, 200, 60) if big else (255, 255, 255)
        s = max(2, scale * (2.2 if big else 1.6))
        cx, cy = (p['x'] + 0.5) * scale, (p['y'] + 0.5) * scale
        d.rectangle([cx - s, cy - s, cx + s, cy + s], fill=col, outline=(30, 30, 30))
    for q in m.get('specials') or []:
        cx, cy = (q['x'] + 0.5) * scale, (q['y'] + 0.5) * scale
        d.ellipse([cx - scale * 1.5, cy - scale * 1.5, cx + scale * 1.5, cy + scale * 1.5], fill=SPEC.get(q['kind'], (200, 50, 50)), outline=(255, 255, 255))
    out = os.path.join(root, 'public', 'site', f'map-{n}.jpg')
    img.save(out, quality=84, optimize=True)
    print(out, img.size, os.path.getsize(out))
