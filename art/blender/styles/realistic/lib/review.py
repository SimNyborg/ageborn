"""Review sheets built from the packed game sheets only (PNG + JSON), so they also check the atlas:
an age contact sheet with every unit's key poses in both team colours, the turrets and the base.

  <venv>/bin/python art/blender/styles/realistic/render.py contact stone --out <dir>
"""
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont

TEAMS = ("#2F7DF6", "#F28A1E")


class Sheet:
    def __init__(self, json_path):
        with open(json_path) as f:
            self.js = json.load(f)
        self.img = Image.open(os.path.join(os.path.dirname(json_path), self.js["meta"]["image"])).convert("RGBA")
        self.meta = self.js["meta"]["ageborn"]

    def frame(self, name):
        """(RGBA image in the frame's source canvas, anchor px)."""
        fr = self.js["frames"][name]
        f, s, src = fr["frame"], fr["spriteSourceSize"], fr["sourceSize"]
        canvas = Image.new("RGBA", (src["w"], src["h"]), (0, 0, 0, 0))
        canvas.paste(self.img.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"])), (s["x"], s["y"]))
        return canvas, (fr["anchor"]["x"] * src["w"], fr["anchor"]["y"] * src["h"])

    def composite(self, clip, idx, tint):
        """Base over the tinted team layer, like the game draws it."""
        names = self.js["animations"][clip]
        base, anc = self.frame(names[idx])
        team, _ = self.frame(self.js["animations"][clip + "_team"][idx])
        t = np.asarray(team, float) / 255.0
        col = np.array([int(tint[i:i + 2], 16) / 255 for i in (1, 3, 5)])
        t[..., :3] *= col
        b = np.asarray(base, float) / 255.0
        a = b[..., 3:4] + t[..., 3:4] * (1 - b[..., 3:4])
        rgb = (b[..., :3] * b[..., 3:4] + t[..., :3] * t[..., 3:4] * (1 - b[..., 3:4])) / np.maximum(a, 1e-4)
        out = Image.fromarray((np.dstack([rgb, a]) * 255 + 0.5).clip(0, 255).astype(np.uint8), "RGBA")
        return out, anc


def _bg(w, h, ground):
    y = np.arange(h)[:, None] / max(h - 1, 1)
    sky = np.array([0.66, 0.73, 0.80]) * (1 - y[..., None]) + np.array([0.84, 0.82, 0.76]) * y[..., None]
    img = np.broadcast_to(sky, (h, w, 3)).copy()
    if ground < h:
        g = np.linspace(0, 1, h - ground)[:, None, None]
        img[ground:] = np.array([0.50, 0.46, 0.36]) * (1 - g) + np.array([0.38, 0.35, 0.28]) * g
    return Image.fromarray((img * 255).astype(np.uint8), "RGB")


def _font(size):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def _pick(sheet, clip, which):
    n = len(sheet.js["animations"][clip])
    m = sheet.meta["clips"].get(clip, {})
    if which == "impact":
        imp = m.get("impactFrame", n // 2)
        seq = m.get("sequence", list(range(n)))
        return seq.index(imp) if imp in seq else 0
    if which == "last":
        return n - 1
    return min(which, n - 1)


def age_contact(age, out, repo):
    units_dir = os.path.join(repo, "public", "art", "units", age)
    rows = []
    font, small = _font(22), _font(15)
    picks = [("idle", 0), ("walk", 2), ("attack", 2), ("attack", "impact"), ("hit", 1), ("die", 4), ("die", "last")]
    for f in sorted(os.listdir(units_dir)):
        if not f.endswith(".hd.json"):
            continue
        sh = Sheet(os.path.join(units_dir, f))
        tiles = []
        for tint in TEAMS:
            for clip, w in picks:
                im, anc = sh.composite(clip, _pick(sh, clip, w), tint)
                tiles.append((im, anc, f"{clip} {w}"))
        rows.append((sh.meta.get("name", f), tiles))
    tdir = os.path.join(repo, "public", "art", "turrets", age)
    tur = []
    for f in sorted(os.listdir(tdir)) if os.path.isdir(tdir) else []:
        if f.endswith(".json"):
            sh = Sheet(os.path.join(tdir, f))
            for clip, w, tint in (("build", "last", TEAMS[0]), ("fire", 1, TEAMS[0]), ("destroyed", "last", TEAMS[1])):
                if clip == "fire":
                    m, am = sh.composite("mount", 0, tint)
                    h, ah = sh.composite("fire", 1, tint)
                    m.alpha_composite(h, (int(am[0] - ah[0]), int(am[1] - ah[1])))
                    im, anc = m, am
                else:
                    im, anc = sh.composite(clip, _pick(sh, clip, w), tint)
                im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
                tur.append((im, (anc[0] * 2, anc[1] * 2), f"{sh.meta['name']} {clip}"))
    bpath = os.path.join(repo, "public", "art", "bases", age + ".json")
    base = []
    if os.path.exists(bpath):
        sh = Sheet(bpath)
        for i in range(4):
            im, anc = sh.composite("body", i, TEAMS[i % 2])
            for fl in ("flagA", "flagB"):
                cm = next(x["crumbleMax"] for x in sh.meta["flags"] if x["clip"] == fl)
                if i <= cm:
                    f_im, f_anc = sh.composite(fl, 0, TEAMS[i % 2])
                    im.alpha_composite(f_im, (int(anc[0] - f_anc[0]), int(anc[1] - f_anc[1])))
            if i == 3:
                t_im, t_anc = sh.composite("treasury", 2, TEAMS[1])
                im.alpha_composite(t_im, (int(anc[0] - t_anc[0]), int(anc[1] - t_anc[1])))
            im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
            base.append((im, (anc[0] * 2, anc[1] * 2), f"crumble {i}" + (" + treasury 3" if i == 3 else "")))

    def strip(tiles, pad=10):
        above = max(int(a[1]) for _, a, _ in tiles) + 26
        below = max(int(im.height - a[1]) for im, a, _ in tiles) + 8
        widths = [im.width for im, _, _ in tiles]
        W = sum(widths) + pad * (len(tiles) + 1)
        H = above + below
        img = _bg(W, H, above)
        d = ImageDraw.Draw(img)
        x = pad
        for im, a, lab in tiles:
            img.paste(im, (int(x), int(above - a[1])), im)
            d.text((x + 4, 4), lab, fill=(40, 40, 44), font=small)
            x += im.width + pad
        return img

    blocks = [("Units (2x sheets, blue and orange)", None)]
    for name, tiles in rows:
        blocks.append((name, strip(tiles)))
    if tur:
        blocks.append(("Turrets (1x sheets shown at 2x): built, firing, destroyed", strip(tur)))
    if base:
        blocks.append(("Base (1x sheet shown at 2x): crumble stages, flags, Treasury", strip(base)))
    W = max(b.width for _, b in blocks if b is not None) + 40
    H = sum((b.height if b is not None else 0) + 44 for _, b in blocks) + 90
    sheet = Image.new("RGB", (W, H), (28, 29, 32))
    d = ImageDraw.Draw(sheet)
    d.text((20, 20), f"Ageborn - {age} age, realistic restyle", fill=(236, 230, 214), font=_font(34))
    y = 80
    for title, b in blocks:
        d.text((20, y), title, fill=(236, 230, 214), font=font)
        y += 34
        if b is not None:
            sheet.paste(b, (20, y))
            y += b.height + 10
    path = os.path.join(out, f"{age}_contact.png")
    sheet.save(path)
    print("wrote", path, sheet.size)
    return path
