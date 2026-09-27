"""Lane mockups at true in-game scale, built only from the packed atlases (so they also
check that the JSON rects, trims, anchors, sequences and durations are right).

Layout follows DESIGN A2.1: 1,560 lu across the screen (0.82 px/lu at 1280 px), top bar
12%, lane band 64%, tray 24%; the player is blue on the left facing right, the opponent
orange on the right, mirrored. Writes lane_mockup_1280.png (DPR 1), lane_mockup_2560.png
(DPR 2, the sheets' native resolution), lane_mockup_zoom.png (a 3x crop of the fight) and
lane_anim.gif (the same lane animated for 3 s at DPR 1, walkers moving).
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ageborn_art.colors import hex_to_rgb  # noqa: E402
from ageborn_art.config import FX_REF_WIDTH_LU, PX_PER_LU_1X, TEAM_COLORS  # noqa: E402


class Atlas:
    def __init__(self, out_dir, file_slug):
        with open(os.path.join(out_dir, f"{file_slug}.json")) as fh:
            self.data = json.load(fh)
        self.sheet = np.asarray(Image.open(os.path.join(out_dir, self.data["meta"]["image"]))
                                .convert("RGBA"), dtype=np.float32) / 255.0
        self.scale = float(self.data["meta"]["scale"])
        self.meta = self.data["meta"]["ageborn"]
        self._cache = {}

    def frame(self, name):
        fr = self.data["frames"].get(name)
        if fr is None:
            return None, None
        r, t, s = fr["frame"], fr["spriteSourceSize"], fr["sourceSize"]
        full = np.zeros((s["h"], s["w"], 4), np.float32)
        full[t["y"]:t["y"] + t["h"], t["x"]:t["x"] + t["w"]] = \
            self.sheet[r["y"]:r["y"] + r["h"], r["x"]:r["x"] + r["w"]]
        return full, fr["anchor"]

    def step_at(self, clip, t_ms, loop=None):
        """Playback step (index into animations[clip]) at time t_ms."""
        c = self.meta["clips"][clip]
        durs = c["durationsMs"]
        total = sum(durs)
        loop = c["loop"] if loop is None else loop
        t = t_ms % total if loop else min(t_ms, total - 1)
        for i, d in enumerate(durs):
            if t < d:
                return i
            t -= d
        return len(durs) - 1

    def composed(self, clip, step, tint_hex, k):
        """The frame at playback `step` of `clip`: tinted team layer under the base frame,
        exactly as the game would draw it, resized from sheet px to screen px (factor k/scale)."""
        key = (clip, step, tint_hex, k)
        if key in self._cache:
            return self._cache[key]
        name = self.data["animations"][clip][step]
        base, anchor = self.frame(name)
        team, _ = self.frame(name + "_team")
        rgb, a = base[..., :3] * base[..., 3:4], base[..., 3:4]
        if team is not None:
            tint = np.array(hex_to_rgb(tint_hex), np.float32)
            tp = team[..., :3] * tint * team[..., 3:4]
            rgb = rgb + tp * (1 - a)
            a = a + team[..., 3:4] * (1 - a)
        out = np.where(a > 1e-6, rgb / np.maximum(a, 1e-6), 0)
        img = Image.fromarray(np.clip(np.concatenate([out, a], -1) * 255 + 0.5, 0, 255).astype(np.uint8))
        f = k / self.scale
        img = img.resize((max(1, round(img.width * f)), max(1, round(img.height * f))),
                         Image.Resampling.BOX if f < 1 else Image.Resampling.LANCZOS)
        res = (img, (anchor["x"] * img.width, anchor["y"] * img.height))
        self._cache[key] = res
        return res


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


# (slug, clip, step, world x in lu, depth y in lu, side, speed lu/s while animated)
SCENE = [
    ("pulse_trooper", "idle", 0, 150, -16, 0, 0),
    ("destrier_knight", "walk", 2, 250, 0, 0, 60),
    ("pulse_trooper", "attack", 4, 390, -8, 0, 0),
    ("bonker", "walk", 2, 468, 16, 0, 70),
    ("bonker", "attack", 4, 548, 8, 0, 0),
    ("destrier_knight", "attack", 4, 505, -16, 0, 0),
    ("bonker", "hit", 0, 612, 8, 1, 0),
    ("bonker", "die", 1, 666, -8, 1, 0),
    ("destrier_knight", "attack", 2, 712, -16, 1, 0),
    ("pulse_trooper", "attack", 3, 850, 16, 1, 0),
    ("bonker", "walk", 5, 925, 0, 1, 70),
    ("pulse_trooper", "walk", 6, 1010, -16, 1, 60),
    ("destrier_knight", "idle", 2, 1080, 8, 1, 0),
]
# shared death FX in the still mockup: (fx slug, step, unit it belongs to, x, depth, side)
FX_SCENE = [("dust_poof", 1, "bonker", 775, 20, 1), ("ko_stars", 0, "bonker", 775, 20, 1)]


def _draw(img, ground, k, sprites):
    """sprites: [(img, (ax, ay), world_x, depth, side, shadow_half_width_or_0)] in depth order."""
    W, H = img.size
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    placed = []
    for spr, (ax, ay), x, y, side, hw in sprites:
        if side == 1:
            spr = spr.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            ax = spr.width - ax
        sx = (x + 180) * PX_PER_LU_1X * k
        sy = ground + (8 + y * 0.45) * k
        if hw:
            sd.ellipse((sx - hw, sy - hw * 0.22, sx + hw, sy + hw * 0.22), fill=(30, 40, 20, 70))
        placed.append((spr, int(round(sx - ax)), int(round(sy - ay))))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(2 * k)))
    for spr, px, py in placed:
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        layer.paste(spr, (px, py), spr)
        img.alpha_composite(layer)


def _fx_sprite(atlases, fx_slug, step, unit_slug, k):
    at = atlases.get(f"fx_{fx_slug}")
    unit = atlases.get(unit_slug)
    if at is None or unit is None:
        return None
    die = unit.meta["clips"]["die"]
    spec = next(s for s in die["fx"] if s["id"] == f"fx.{fx_slug}")
    img, (ax, ay) = at.composed("play", step, "#FFFFFF", k)
    s = spec["scale"]
    img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.Resampling.LANCZOS)
    off = spec["offsetLu"][1] * PX_PER_LU_1X * k
    return img, (ax * s, ay * s + off)


def load_atlases(out_dir, units):
    atl = {s: Atlas(out_dir, s) for s in units if os.path.exists(os.path.join(out_dir, f"{s}.json"))}
    for fx in ("fx_dust_poof", "fx_ko_stars"):
        if os.path.exists(os.path.join(out_dir, f"{fx}.json")):
            atl[fx] = Atlas(out_dir, fx)
    return atl


def render(out_dir, k, units):
    W, H = 1280 * k, 720 * k
    img, ground = _backdrop(W, H, k)
    atlases = load_atlases(out_dir, units)
    items = []
    for slug, clip, step, x, y, side, _ in SCENE:
        if slug not in atlases:
            continue
        at = atlases[slug]
        tint = TEAM_COLORS["blue"] if side == 0 else TEAM_COLORS["orange"]
        spr, anchor = at.composed(clip, step, tint, k)
        hw = at.meta["heightLu"] * 0.32 * PX_PER_LU_1X * k if clip != "die" else 0
        items.append((spr, anchor, x, y, side, hw))
    for fx_slug, step, unit, x, y, side in FX_SCENE:
        fx = _fx_sprite(atlases, fx_slug, step, unit, k)
        if fx:
            items.append((fx[0], fx[1], x, y, side, 0))
    items.sort(key=lambda it: it[3])  # depth sort: back rows first
    _draw(img, ground, k, items)
    d = ImageDraw.Draw(img)
    d.text((12 * k, 10 * k), "Ageborn art spike v2 - pre-rendered 3D sprites at true in-game scale "
           f"(0.82 px/lu, DPR {k})", fill="#DDE3EE")
    return img


def animate(out_dir, units, k=1, seconds=3.0, step_ms=40):
    """Animated lane: every unit loops its clip (one-shots replay every 1.6 s), walkers move
    at their speed, and a unit dies with the shared poof and stars every 1.6 s."""
    W, H = 1280 * k, 720 * k
    back, ground = _backdrop(W, H, k)
    atlases = load_atlases(out_dir, units)
    top, bottom = int(H * 0.30), int(H * 0.76)
    frames = []
    period = 1600
    for t in range(0, int(seconds * 1000), step_ms):
        img = back.copy()
        items = []
        for slug, clip, _, x, y, side, speed in SCENE:
            if slug not in atlases:
                continue
            at = atlases[slug]
            c = at.meta["clips"][clip]
            tt = t if c["loop"] else t % period
            fx_items = []
            if clip == "die":
                for fx_slug, _, unit, _, _, _ in FX_SCENE:
                    spec = next(s for s in c["fx"] if s["id"] == f"fx.{fx_slug}")
                    ft = tt - spec["atMs"]
                    fat = atlases.get(f"fx_{fx_slug}")
                    if fat is None or ft < 0 or \
                            ft >= fat.meta["clips"]["play"]["durationMs"] * spec.get("loops", 1):
                        continue
                    fx = _fx_sprite(atlases, fx_slug, fat.step_at("play", ft, loop=True), unit, k)
                    fx_items.append((fx[0], fx[1], x, y, side, 0))
                if tt >= c.get("hideUnitAtMs", c["durationMs"]):
                    items.extend(fx_items)
                    continue
            step = at.step_at(clip, tt)
            tint = TEAM_COLORS["blue"] if side == 0 else TEAM_COLORS["orange"]
            spr, anchor = at.composed(clip, step, tint, k)
            dx = speed * t / 1000.0 * (1 if side == 0 else -1)
            hw = at.meta["heightLu"] * 0.32 * PX_PER_LU_1X * k if clip != "die" else 0
            items.append((spr, anchor, x + dx, y, side, hw))
            items.extend(fx_items)  # effects draw over their unit (stable sort keeps the order)
        items.sort(key=lambda it: it[3])
        _draw(img, ground, k, items)
        frames.append(img.crop((0, top, W, bottom)).convert("RGB"))
    pal = frames[0].quantize(255, method=Image.Quantize.MEDIANCUT)
    frames = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    frames[0].save(os.path.join(out_dir, "lane_anim.gif"), save_all=True, append_images=frames[1:],
                   duration=step_ms, loop=0, optimize=False)


def make(out_dir, units, anim=True):
    for k in (1, 2):
        img = render(out_dir, k, units)
        img.convert("RGB").save(os.path.join(out_dir, f"lane_mockup_{1280 * k}.png"))
        if k == 1:
            crop = img.crop((380, 250, 780, 500))
            crop.resize((crop.width * 3, crop.height * 3), Image.Resampling.NEAREST) \
                .convert("RGB").save(os.path.join(out_dir, "lane_mockup_zoom.png"))
        if k == 2:
            crop = img.crop((760, 500, 1560, 1000))
            crop.convert("RGB").save(os.path.join(out_dir, "lane_mockup_dpr2_crop.png"))
    if anim:
        animate(out_dir, units)


if __name__ == "__main__":
    make(sys.argv[1], sys.argv[2].split(",") if len(sys.argv) > 2 else
         ["bonker", "destrier_knight", "pulse_trooper"])
