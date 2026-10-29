# Pans a 1200-px window along the bot viewer lane, following the coloured unit squares (smoothed), into a 1080x1920 clip.
import glob, os, subprocess
from PIL import Image
src = sorted(glob.glob('/tmp/soc/studio/work/dv9/bv/f*.png'))
out = '/tmp/soc/studio/work/dv9/pan'; os.makedirs(out, exist_ok=True)
xs = []
for f in src:
    im = Image.open(f).convert('RGB').resize((550, 90))
    px = im.load(); hits = []
    for x in range(30, 520):
        for y in range(20, 75):
            r, g, b = px[x, y]
            if (b > 180 and r < 120) or (r > 200 and 90 < g < 170 and b < 90):
                hits.append(x)
    xs.append(sum(hits) / len(hits) * 4 if hits else None)
last = 1100
cx = []
for x in xs:
    last = x if x is not None and last is None else (last if x is None else last * 0.9 + x * 0.1)
    cx.append(last)
for i, f in enumerate(src):
    im = Image.open(f).convert('RGB')
    x0 = int(min(max(cx[i] - 600, 0), 2200 - 1200))
    strip = im.crop((x0, 0, x0 + 1200, 360)).resize((1080, 324), Image.LANCZOS)
    canvas = Image.new('RGB', (1080, 1920), (27, 26, 46))
    canvas.paste(strip, (0, 800))
    canvas.save(f'{out}/{i:05d}.png')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-i', f'{out}/%05d.png', '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '/tmp/soc/studio/public/clips/dv9/squares.mp4'], check=True)
print('ok', len(src))
