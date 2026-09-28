"""Lane mockup GIF (true in-game scale, 844x390 phone) and a one-page style sheet, built only
from the finished layers of each unit (`_frames/<slug>.layers.pkl`).

  python present.py [OUT]
"""
import math
import os
import pickle
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import pipe  # noqa: E402

OUT = sys.argv[1] if len(sys.argv) > 1 else \
    "/tmp/claude-0/-home-user-ageborn/e9e6071d-3409-58a6-a28d-0aba492052fd/scratchpad/styles/realistic"
BLUE, ORANGE = "#2F7DF6", "#F28A1E"
UNITS = ["bonker", "destrier_knight", "pulse_trooper"]
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONTB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def load(slug):
    with open(os.path.join(OUT, "_frames", f"{slug}.layers.pkl"), "rb") as f:
        d = pickle.load(f)
    return d


class Sprite:
    def __init__(self, slug):
        self.d = load(slug)
        self.slug = slug
        self.cache = {}

    def frame(self, clip, i, s, team, flip=False):
        key = (clip, i, s, team, flip)
        if key not in self.cache:
            tm, bs = self.d["frames"][f"{clip}|{i}|{s}"]
            img = pipe.composite(tm.astype(np.float32), bs.astype(np.float32), team)
            if flip:
                img = img[:, ::-1]
            self.cache[key] = img
        return self.cache[key]

    def anchor(self, s, flip=False):
        fx, fy = self.d["feet_px"]
        w = self.d["size"][0] * s / 3
        x = fx * s / 3
        return (w - x if flip else x), fy * s / 3

    def index(self, clip, t_ms):
        c = self.d["clips"][clip]
        dur = c["durations"]
        total = sum(dur)
        if c["loop"]:
            t_ms %= total
        else:
            t_ms = min(t_ms, total - 1)
        acc = 0
        for i, dd in enumerate(dur):
            acc += dd
            if t_ms < acc:
                return i
        return len(dur) - 1

    def length(self, clip):
        return sum(self.d["clips"][clip]["durations"])


def blit(canvas, img, x, y):
    """Premultiplied RGBA over an RGB canvas (float), top-left at (x, y) (rounded)."""
    x, y = int(round(x)), int(round(y))
    h, w = img.shape[:2]
    H, W = canvas.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x0 >= x1 or y0 >= y1:
        return
    sub = img[y0 - y:y1 - y, x0 - x:x1 - x]
    canvas[y0:y1, x0:x1] = sub[..., :3] + canvas[y0:y1, x0:x1] * (1 - sub[..., 3:4])


# ---------------------------------------------------------------------- backdrop
def backdrop(W, H, ground_y, scale=1):
    y = np.arange(H)[:, None, None] / H
    sky = np.array([0.53, 0.66, 0.80]) * (1 - y) + np.array([0.86, 0.85, 0.80]) * y
    img = np.broadcast_to(sky, (H, W, 3)).copy()
    xs = np.arange(W)

    def ridge(base, amp, cell, seed, col, haze):
        n = pipe.fbm(1, W, cell, seed, octaves=5)[0]
        top = (base - amp * n).astype(int)
        mask = np.arange(H)[:, None] >= top[None, :]
        c = np.array(col) * (1 - haze) + img * 0 + np.array([0.80, 0.83, 0.86]) * haze
        img[mask] = (np.array(col) * (1 - haze) + np.array([0.80, 0.83, 0.86]) * haze)
        return top

    ridge(ground_y - 70 * scale, 90 * scale, 160 * scale, 3, (0.45, 0.50, 0.58), 0.55)
    ridge(ground_y - 30 * scale, 55 * scale, 90 * scale, 5, (0.40, 0.45, 0.40), 0.35)
    top = ridge(ground_y - 8 * scale, 26 * scale, 40 * scale, 9, (0.33, 0.38, 0.28), 0.18)
    # tree clumps on the near hills
    rng = np.random.default_rng(4)
    yy, xx = np.mgrid[0:H, 0:W]
    for _ in range(26):
        cx = rng.uniform(0, W)
        cy = top[int(min(W - 1, max(0, cx)))] + 2 * scale
        r = rng.uniform(6, 13) * scale
        m = ((xx - cx) ** 2 + ((yy - cy) * 1.25) ** 2) < r * r
        shade = np.clip(0.8 + 0.4 * (cy - yy) / r, 0.6, 1.2)[..., None]
        img[m] = (np.array([0.24, 0.30, 0.20]) * shade)[m]
    # ground: earth lane with texture
    gy = int(ground_y - 6 * scale)
    g = pipe.fbm(H - gy, W, 14 * scale, 21)
    g2 = pipe.fbm(H - gy, W, 3 * scale, 22)
    t = np.linspace(0, 1, H - gy)[:, None]
    base = np.array([0.50, 0.45, 0.35]) * (1 - t[..., None]) + np.array([0.36, 0.32, 0.25]) * t[..., None]
    img[gy:] = base * (0.82 + 0.3 * g[..., None]) * (0.9 + 0.15 * g2[..., None])
    # grass fringe
    edge = (pipe.fbm(1, W, 5 * scale, 30)[0] * 7 * scale).astype(int)
    for x in range(W):
        img[gy - edge[x]:gy + 2 * scale, x] = np.array([0.36, 0.40, 0.26]) * (0.9 + 0.2 * (x % 3 == 0))
    return img


# ---------------------------------------------------------------------- lane mockup
def actors(sp):
    """Scripted 4.5 s skirmish. Each returns (clip, clip_ms, x, facing_flip, depth_dy)."""
    B, K, T = sp["bonker"], sp["destrier_knight"], sp["pulse_trooper"]

    def walker(spr, x0, x1, t0, t1, then, flip, dy, events=()):
        def f(t):
            for (te, clip) in events:
                if t >= te[0] and (te[1] is None or t < te[1]):
                    return clip, t - te[0], x1, flip, dy
            if t < t0:
                return "idle", t, x0, flip, dy
            if t < t1:
                u = (t - t0) / (t1 - t0)
                return "walk", t - t0, x0 + (x1 - x0) * u, flip, dy
            return then, t - t1, x1, flip, dy
        return f

    return [
        (K, BLUE, walker(K, -170, 150, 600, 4400, "idle", False, -7)),
        (T, BLUE, walker(T, 175, 262, 0, 1300, "attack", False, -3)),
        (B, BLUE, walker(B, 295, 378, 0, 1500, "attack", False, 0,
                         events=[((3900, 4300), "hit")])),
        (T, ORANGE, walker(T, 712, 640, 0, 1100, "attack", True, -3)),
        (B, ORANGE, walker(B, 540, 452, 0, 1550, "attack", True, 0,
                           events=[((2700, 3050), "hit"), ((3050, None), "die")])),
        (K, ORANGE, walker(K, 960, 488, 0, 3250, "attack", True, -6)),
    ]


def lane_gif(sp, W=844, H=390, s=1, frames=64, step=70, name="lane_mockup"):
    ground = int(H * 0.80)
    bg = backdrop(W, H, ground, scale=s)
    acts = actors(sp)
    ims = []
    bolts = []
    for fi in range(frames):
        t = fi * step
        c = bg.copy()
        # draw back to front (smaller dy first)
        order = sorted(acts, key=lambda a: a[2](t)[4])
        for spr, team, f in order:
            clip, ms, x, flip, dy = f(t)
            i = spr.index(clip, ms)
            img = spr.frame(clip, i, s, team, flip)
            ax, ay = spr.anchor(s, flip)
            blit(c, img, x * s - ax, ground + dy * s - ay)
            # ranged shots: spawn a plasma bolt on the fire frame
            if spr.slug == "pulse_trooper" and clip == "attack" and i == 4 and \
                    spr.index(clip, max(0, ms - step)) != 4:
                d = -1 if flip else 1
                bolts.append([x * s + d * 38 * s, ground - 44 * s, d, t, team])
        for bolt in list(bolts):
            bx, by, d, t0, team = bolt
            age = t - t0
            px = bx + d * age * 0.55 * s
            if age > 450:
                bolts.remove(bolt)
                continue
            glow(c, px, by, d, s)
        ims.append(pipe.to_rgb(c))
    pal = [im.convert("P", palette=Image.ADAPTIVE, colors=255, dither=Image.Dither.FLOYDSTEINBERG) for im in ims]
    path = os.path.join(OUT, f"{name}.gif")
    pal[0].save(path, save_all=True, append_images=pal[1:], duration=step, loop=0)
    ims[int(frames * 0.52)].save(os.path.join(OUT, f"{name}_still.png"))
    return path


def glow(c, x, y, d, s):
    H, W = c.shape[:2]
    L = 16 * s
    yy, xx = np.mgrid[max(0, int(y - 6 * s)):min(H, int(y + 6 * s)), max(0, int(x - L - 6)):min(W, int(x + L + 6))]
    if yy.size == 0:
        return
    t = np.clip((xx - (x - d * L)) * d / (2 * L), 0, 1)
    dist = np.abs(yy - y) / (1 + 2.2 * s * t)
    a = np.clip(1 - dist / 1.6, 0, 1) * t * ((xx - x) * d < 3)
    col = np.array([0.94, 0.23, 0.66])
    core = np.clip(1 - dist / 0.7, 0, 1) * t
    sub = c[yy, xx]
    c[yy, xx] = sub * (1 - a[..., None] * 0.85) + col * a[..., None] * 0.85 + core[..., None] * 0.6


# ---------------------------------------------------------------------- style sheet
def style_sheet(sp):
    W, H = 1800, 1180
    img = Image.new("RGB", (W, H), (30, 31, 34))
    d = ImageDraw.Draw(img)
    f_t = ImageFont.truetype(FONTB, 40)
    f_h = ImageFont.truetype(FONTB, 22)
    f_b = ImageFont.truetype(FONT, 17)
    f_s = ImageFont.truetype(FONT, 14)
    d.text((40, 28), "Ageborn  -  Realistic Miniatures", font=f_t, fill=(236, 232, 222))
    d.text((42, 80), "Style study: bonker (Stone), destrier_knight (Medieval), pulse_trooper (Future). "
           "Pre-rendered Cycles PBR, 3x master, shipped at 2x/1x.", font=f_b, fill=(170, 170, 168))
    # hero frames at 3x on a painted backdrop band
    band_h = 400
    bg = backdrop(W - 80, band_h, band_h - 40, scale=2)
    c = bg.copy()
    heroes = [("bonker", "idle", 0, BLUE, False, 180), ("bonker", "attack", 6, ORANGE, True, 420),
              ("destrier_knight", "idle", 0, BLUE, False, 760), ("destrier_knight", "attack", 8, ORANGE, True, 1170),
              ("pulse_trooper", "idle", 0, BLUE, False, 1370), ("pulse_trooper", "attack", 4, ORANGE, True, 1620)]
    for slug, clip, i, team, flip, x in heroes:
        s_ = sp[slug]
        im = s_.frame(clip, i, 3, team, flip)
        ax, ay = s_.anchor(3, flip)
        blit(c, im, x - ax, band_h - 40 - ay)
    img.paste(pipe.to_rgb(c), (40, 120))
    d.text((52, 128), "3x master renders (blue = you, orange = opponent, mirrored)", font=f_s, fill=(40, 40, 40))
    # key poses at 2x on neutral
    y0 = 545
    d.text((40, y0), "Key poses at 2x (DPR 2 phones)", font=f_h, fill=(236, 232, 222))
    y = y0 + 34
    for slug in UNITS:
        s_ = sp[slug]
        row = [("idle", 0), ("walk", 3), ("attack", 3), ("attack", 5), ("attack", 8 if slug != "pulse_trooper" else 4),
               ("hit", 1), ("die", 4), ("die", 7)]
        x = 40
        rowh = int(s_.d["size"][1] * 2 / 3 * 0.78)
        for clip, i in row:
            n = s_.d["clips"][clip]["n"]
            i = min(i, n - 1)
            im = s_.frame(clip, i, 2, BLUE)
            h, w = im.shape[:2]
            crop_top = h - rowh
            im = im[max(0, crop_top):]
            h, w = im.shape[:2]
            cell = np.broadcast_to(np.array([0.78, 0.77, 0.73]), (h, w, 3)).copy()
            blit(cell, im, 0, 0)
            ww = int(w * 0.62) if slug != "destrier_knight" else int(w * 0.72)
            xo = (w - ww) // 2 + (int(w * 0.06) if slug == "destrier_knight" else 0)
            tile = pipe.to_rgb(cell[:, xo:xo + ww])
            if x + tile.width > W - 40:
                break
            img.paste(tile, (x, y))
            d.text((x + 4, y + 2), f"{clip} {i}", font=f_s, fill=(60, 60, 60))
            x += tile.width + 6
        y += rowh + 8
    # in-game size row
    yi = y + 10
    d.text((40, yi), "In game (1x, ~62 px infantry on an 844x390 phone)", font=f_h, fill=(236, 232, 222))
    strip_w, strip_h = 620, 130
    c = backdrop(strip_w, strip_h, strip_h - 20, scale=1)
    xs = 60
    for slug, clip, i, team, flip in (("pulse_trooper", "attack", 4, BLUE, False), ("bonker", "attack", 6, BLUE, False),
                                      ("bonker", "attack", 3, ORANGE, True), ("destrier_knight", "walk", 3, ORANGE, True)):
        s_ = sp[slug]
        im = s_.frame(clip, i, 1, team, flip)
        ax, ay = s_.anchor(1, flip)
        blit(c, im, xs - ax, strip_h - 20 - ay)
        xs += 150 if slug != "bonker" else 100
    tile = pipe.to_rgb(c)
    img.paste(tile, (40, yi + 34))
    img.paste(tile.resize((strip_w * 2, strip_h * 2), Image.NEAREST).crop((0, 0, W - 80 - strip_w - 20, strip_h * 2)),
              (40 + strip_w + 20, yi + 34 - 60 + 60))
    # notes and palette
    xn = 40
    yn = yi + 34 + strip_h + 16
    notes = [
        "Look: tabletop-miniature realism. Adult proportions (head ~1/7.5), anatomical metaball bodies,",
        "PBR fur, hide, leather, wood, flint, steel and painted plate with procedural colour noise and bump.",
        "Light: warm key from above-front with soft shadows, two symmetric cool back rims, sky/earth ambient;",
        "no side light, so mirrored opponents are lit identically. AgX Punchy tone map. Contact shadow baked in.",
        "Readability: thin dark 1 px outline at 1x, team colour on tabards, kilts, caparisons, shields, plumes, plates",
        "(grey team layer tinted in game, as the current atlas contract). Dust is procedural 2D over the base layer.",
        "Motion: planted-foot IK walks with weight shift and hip twist, 4-beat gallop with body rock, attacks with",
        "held anticipation, motion-blurred strike, impact hold and follow-through, knockback hit, fall with bounce.",
    ]
    for ln in notes:
        d.text((xn, yn), ln, font=f_s, fill=(200, 198, 190))
        yn += 20
    sw = [("team blue", BLUE), ("team orange", ORANGE), ("skin", "#9c7862"), ("fur", "#76624f"), ("hide/leather", "#5a4a3e"),
          ("hardwood", "#6b5847"), ("steel", "#9aa0a8"), ("bay coat", "#4a3a31"), ("suit", "#3b3e45"),
          ("gunmetal", "#3c4047"), ("plasma", "#F03AA8"), ("visor", "#3AF0B4")]
    xs, ys = 1040, yi + 34 + strip_h + 16
    for i, (n, hx) in enumerate(sw):
        cx = xs + (i % 4) * 185
        cy = ys + (i // 4) * 44
        d.rectangle([cx, cy, cx + 34, cy + 34], fill=hx, outline=(15, 15, 15))
        d.text((cx + 42, cy + 2), n, font=f_s, fill=(220, 220, 214))
        d.text((cx + 42, cy + 18), hx.upper(), font=f_s, fill=(150, 150, 146))
    path = os.path.join(OUT, "style_sheet.png")
    img.save(path)
    return path


def main():
    sp = {u: Sprite(u) for u in UNITS}
    print(lane_gif(sp))
    print(lane_gif(sp, W=844 * 2, H=390 * 2, s=2, frames=64, name="lane_mockup_dpr2"))
    print(style_sheet(sp))


if __name__ == "__main__":
    main()
