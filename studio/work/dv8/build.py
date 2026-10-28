# Builds DV8's step clips (1080x1920, 30 fps) from the Ursa Paladin's real sprite frames.
import json, os, subprocess, sys
sys.path.insert(0, '/tmp/soc/studio/tools')
os.environ['AGEBORN_REPO'] = '/tmp/game-capture'
import cutout as C
from PIL import Image, ImageDraw

TEAM = 'f2862a'
OUT = '/tmp/soc/studio/public/clips/dv8'
TMP = '/tmp/soc/studio/work/dv8/frames'
os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1920
meta = json.load(open('/tmp/game-capture/public/art/units/medieval/ursa_paladin.hd.json'))
anims = meta['animations']
cache = {}
def fr(clip, i):
    k = (clip, i)
    if k not in cache:
        cache[k] = C.cutout('ursa_paladin', clip, i, TEAM, flip=True, trim=False)
    return cache[k]

# one shared box over all frames so nothing jumps between frames
boxes = [fr(c, i).getbbox() for c in ['idle', 'walk', 'attack', 'hit', 'die'] for i in range(len(anims[c]))]
bx = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
def placed(img, scale, cx, base_y):
    im = img.crop(bx)
    im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    return im, (int(cx - im.width / 2), int(base_y - im.height))

def bg(kind):
    im = Image.new('RGB', (W, H), (128, 128, 128) if kind == 'flat' else (28, 23, 18))
    if kind != 'flat':
        d = ImageDraw.Draw(im)
        for y in range(H):
            t = abs(y - 1000) / 1000
            c = int(52 - 30 * t)
            d.line([(0, y), (W, y)], fill=(c + 8, c + 2, c - 6))
        d.ellipse([270, 1222, 810, 1282], fill=(18, 14, 10))
    return im

def write(name, frames):
    d = f'{TMP}/{name}'
    os.makedirs(d, exist_ok=True)
    for i, f in enumerate(frames):
        f.save(f'{d}/{i:05d}.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-i', f'{d}/%05d.png', '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', f'{OUT}/{name}.mp4'], check=True)
    json.dump({'file': f'{name}.mp4', 'fps': 30, 'width': W, 'height': H, 'frames': len(frames), 'seconds': len(frames) / 30,
               'markers': [], 'steps': [], 'plan': [], 'sounds': [], 'events': [], 'states': [{} for _ in frames]}, open(f'{OUT}/{name}.json', 'w'))
    print(name, len(frames))

# step 0: one frozen picture on a flat grey card, no shadow, no motion (3.5 s)
im, pos = placed(fr('attack', 0), 1.25, W / 2, 1330)
f0 = bg('flat'); f0.paste(im, pos, im)
write('step0', [f0] * 105)

# step 1: the attack's 12 frames laid out one by one (1.6 s), then the swing playing at 12 fps (3 loops)
att = anims['attack']
cells = []
for i in range(len(att)):
    im, _ = placed(fr('attack', i), 0.42, 0, 0)
    cells.append(im)
cw, ch = cells[0].size
frames = []
for t in range(48):
    f = bg('dark')
    shown = min(len(att), 1 + t // 4)
    for i in range(shown):
        x = 70 + (i % 4) * ((W - 140) // 4) + ((W - 140) // 4 - cw) // 2
        y = 520 + (i // 4) * (ch + 40)
        f.paste(cells[i], (x, y), cells[i])
    frames.append(f)
for loop in range(3):
    for i in range(len(att)):
        im, pos = placed(fr('attack', i), 1.25, W / 2, 1330)
        f = bg('dark'); f.paste(im, pos, im)
        frames += [f, f.copy()][:2 if i % 2 == 0 else 3]
write('step1', frames)

# step 2: the other clips in a row, each played twice at 12 fps: idle, walk, hit, die
frames = []
labels = []
for clip in ['idle', 'walk', 'hit', 'die']:
    start = len(frames)
    n = len(anims[clip])
    for rep in range(2 if clip != 'die' else 1):
        for i in range(n):
            im, pos = placed(fr(clip, i), 1.25, W / 2, 1330)
            f = bg('dark'); f.paste(im, pos, im)
            frames += [f] * (2 if i % 2 == 0 else 3)
    if clip == 'die':
        frames += [frames[-1]] * 20
    labels.append((clip, start, len(frames)))
write('step2', frames)
json.dump(labels, open('/tmp/soc/studio/work/dv8/step2-labels.json', 'w'))
