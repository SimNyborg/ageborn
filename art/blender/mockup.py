"""Lane mockup at true in-game scale, built only from the packed atlases (so it also
checks that the JSON rects, trims and anchors are right).

Layout follows DESIGN A2.1: 1,560 lu across the screen (0.82 px/lu at 1280 px), top bar
12%, lane band 64%, tray 24%; the player is blue on the left facing right, the opponent
orange on the right, mirrored. Writes lane_mockup_1280.png (DPR 1), lane_mockup_2560.png
(DPR 2, the sheets' native resolution) and lane_mockup_zoom.png (a 3x crop of the fight).
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ageborn_art.colors import hex_to_rgb, mix  # noqa: E402
from ageborn_art.config import PX_PER_LU_1X, TEAM_COLORS  # noqa: E402


class Atlas:
    def __init__(self, out_dir, slug):
        with open(os.path.join(out_dir, f"{slug}.json")) as fh:
            self.data = json.load(fh)
        self.sheet = np.asarray(Image.open(os.path.join(out_dir, f"{slug}.png")).convert("RGBA"),
                                dtype=np.float32) / 255.0
        self.scale = float(self.data["meta"]["scale"])

    def frame(self, name):
        fr = self.data["frames"][name]
        r, t, s = fr["frame"], fr["spriteSourceSize"], fr["sourceSize"]
        full = np.zeros((s["h"], s["w"], 4), np.float32)
        full[t["y"]:t["y"] + t["h"], t["x"]:t["x"] + t["w"]] = \
            self.sheet[r["y"]:r["y"] + r["h"], r["x"]:r["x"] + r["w"]]
        return full, fr["anchor"]

    def composed(self, clip, idx, tint_hex):
        """Tinted team layer under the base frame, exactly as the game would draw it."""
        slug = self.data["meta"]["ageborn"]["visualId"].split(".", 1)[1]
        base, anchor = self.frame(f"{slug}_{clip}_{idx:02d}")
        team, _ = self.frame(f"{slug}_{clip}_{idx:02d}_team")
        tint = np.array(hex_to_rgb(tint_hex), np.float32)
        tp = team[..., :3] * tint * team[..., 3:4]
        bp = base[..., :3] * base[..., 3:4]
        a = base[..., 3:4] + team[..., 3:4] * (1 - base[..., 3:4])
        p = bp + tp * (1 - base[..., 3:4])
        rgb = np.where(a > 1e-6, p / np.maximum(a, 1e-6), 0)
        img = Image.fromarray(np.clip(np.concatenate([rgb, a], -1) * 255 + 0.5, 0, 255).astype(np.uint8))
        return img, (anchor["x"] * img.width, anchor["y"] * img.height)


def _gradient(draw, box, top, bottom):
    x0, y0, x1, y1 = box
    a, b = hex_to_rgb(top), hex_to_rgb(bottom)
    for y in range(y0, y1):
        t = (y - y0) / max(1, y1 - y0 - 1)
        draw.line([(x0, y), (x1, y)], fill=tuple(int(255 * (p + (q - p) * t)) for p, q in zip(a, b)))


def _backdrop(W, H, k):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    d = ImageDraw.Draw(img)
    top_bar, lane_bottom = int(H * 0.12), int(H * 0.76)
    ground = int(H * 0.655)
    _gradient(d, (0, top_bar, W, ground), "#9CC3DA", "#DCE8E6")
    rng = np.random.default_rng(7)
    for layer, (col, base_y, amp) in enumerate((("#B7CAD0", 0.50, 0.07), ("#A3B8A4", 0.58, 0.05))):
        pts = [(0, H)]
        for x in range(0, W + 40 * k, 40 * k):
            pts.append((x, int(H * base_y + amp * H * np.sin(x / (170.0 * k) + layer * 2) +
                               rng.integers(-6, 6) * k)))
        pts.append((W, H))
        d.polygon(pts, fill=col)
    _gradient(d, (0, ground, W, lane_bottom), "#8FA06A", "#6F7F55")
    d.rectangle((0, ground, W, ground + 3 * k), fill="#A9B782")
    # bases: simple blocks behind each gate
    gate_l = int((0 + 180) * PX_PER_LU_1X * k)
    gate_r = int((1200 + 180) * PX_PER_LU_1X * k)
    d.rounded_rectangle((gate_l - int(115 * k), ground - int(150 * k), gate_l, ground + 6 * k),
                        radius=10 * k, fill="#7E8793", outline="#4E555E", width=3 * k)
    d.rounded_rectangle((gate_r, ground - int(150 * k), gate_r + int(115 * k), ground + 6 * k),
                        radius=10 * k, fill="#7E8793", outline="#4E555E", width=3 * k)
    d.rectangle((0, 0, W, top_bar), fill="#1E2430")
    d.rectangle((0, lane_bottom, W, H), fill="#1E2430")
    for i in range(6):  # card tray placeholders
        x = int((W - 6 * 110 * k) / 2 + i * 110 * k)
        d.rounded_rectangle((x + 6 * k, lane_bottom + 18 * k, x + 100 * k, H - 18 * k),
                            radius=10 * k, fill="#2C3444", outline="#465068", width=2 * k)
    return img, ground


# (slug, clip, frame, world x in lu, depth y in lu, side)
SCENE = [
    ("pulse_trooper", "idle", 0, 150, -16, 0),
    ("destrier_knight", "walk", 3, 250, 0, 0),
    ("pulse_trooper", "attack", 4, 390, -8, 0),
    ("bonker", "walk", 2, 470, 16, 0),
    ("bonker", "attack", 5, 548, 8, 0),
    ("destrier_knight", "attack", 5, 505, -16, 0),
    ("bonker", "hit", 1, 606, 8, 1),
    ("bonker", "die", 4, 650, -8, 1),
    ("destrier_knight", "attack", 3, 700, -16, 1),
    ("pulse_trooper", "attack", 2, 815, 16, 1),
    ("bonker", "walk", 5, 900, 0, 1),
    ("pulse_trooper", "walk", 6, 1010, -16, 1),
    ("destrier_knight", "idle", 2, 1080, 8, 1),
]


def render(out_dir, k, units):
    W, H = 1280 * k, 720 * k
    img, ground = _backdrop(W, H, k)
    atlases = {s: Atlas(out_dir, s) for s in units}
    items = [it for it in SCENE if it[0] in atlases]
    items.sort(key=lambda it: it[4])  # depth sort: back rows first
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sprites = []
    for slug, clip, idx, x, y, side in items:
        at = atlases[slug]
        tint = TEAM_COLORS["blue"] if side == 0 else TEAM_COLORS["orange"]
        spr, (ax, ay) = at.composed(clip, idx, tint)
        f = k / at.scale  # sheet px -> screen px
        spr = spr.resize((max(1, round(spr.width * f)), max(1, round(spr.height * f))),
                         Image.Resampling.BOX if f < 1 else Image.Resampling.LANCZOS)
        ax, ay = ax * f, ay * f
        if side == 1:
            spr = spr.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            ax = spr.width - ax
        sx = (x + 180) * PX_PER_LU_1X * k
        sy = ground + (8 + y * 0.45) * k
        hw = at.data["meta"]["ageborn"]["heightLu"] * 0.32 * PX_PER_LU_1X * k
        if clip != "die":
            sd.ellipse((sx - hw, sy - hw * 0.22, sx + hw, sy + hw * 0.22), fill=(30, 40, 20, 70))
        sprites.append((spr, int(round(sx - ax)), int(round(sy - ay))))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(2 * k)))
    for spr, px, py in sprites:
        img.alpha_composite(spr, (px, py)) if px >= 0 and py >= 0 else img.paste(spr, (px, py), spr)
    d = ImageDraw.Draw(img)
    d.text((12 * k, 10 * k), "Ageborn art spike - pre-rendered 3D sprites at true in-game scale "
           f"(0.82 px/lu, DPR {k})", fill="#DDE3EE")
    return img


def make(out_dir, units):
    for k in (1, 2):
        img = render(out_dir, k, units)
        img.convert("RGB").save(os.path.join(out_dir, f"lane_mockup_{1280 * k}.png"))
        if k == 1:
            crop = img.crop((380, 250, 780, 500))
            crop.resize((crop.width * 3, crop.height * 3), Image.Resampling.NEAREST) \
                .convert("RGB").save(os.path.join(out_dir, "lane_mockup_zoom.png"))


if __name__ == "__main__":
    make(sys.argv[1], sys.argv[2].split(",") if len(sys.argv) > 2 else
         ["bonker", "destrier_knight", "pulse_trooper"])
