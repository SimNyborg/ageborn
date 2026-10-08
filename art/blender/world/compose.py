"""Review sheets for the world art, built from the packed atlases only (checks the JSON too).

  python art/blender/world/compose.py <dir with <age>/*.json> <out.png> [--zoom 2]
  # base skin models (PLAN 2c): <src>/<age>/<skin>.json or <src>/<skin>.json, turrets from --turrets
  python art/blender/world/compose.py <src> <out.png> --skins rose_keep:medieval --turrets public/art/turrets \
      [--standard public/art/bases]

For each base found: the four crumble stages with Treasury 0..3 and the flags, tinted blue,
with the age's turrets standing on the four mounts (mount anchors checked visually), and one
orange (mirrored) copy. A skin sheet adds a second row: crumble 0 in both team colours and the two
colourblind presets (Blue/Yellow, High contrast; the opponent's copies mirrored), and with `--standard`
the age's standard base at crumble 0 for comparison. Needs only Pillow and numpy.
"""
import argparse
import glob
import json
import os

import numpy as np
from PIL import Image, ImageDraw

AGES = ["stone", "medieval", "gunpowder", "modern", "future"]
BLUE, ORANGE = (0x2F, 0x7D, 0xF6), (0xF2, 0x8A, 0x1E)
# colourblind presets (DESIGN A11): Blue/Yellow and High contrast
CB_YELLOW, HC_BLUE, HC_ORANGE = (0xF2, 0xC2, 0x1E), (0x1F, 0x5F, 0xD6), (0xFF, 0x6A, 0x00)


class Sheet:
    def __init__(self, path):
        self.data = json.load(open(path))
        self.img = Image.open(os.path.join(os.path.dirname(path), self.data["meta"]["image"])).convert("RGBA")
        self.meta = self.data["meta"]["ageborn"]
        self.px_per_lu = self.meta["pxPerLu"]

    def frame(self, name):
        """(full-size RGBA image of the source canvas, anchor px)."""
        f = self.data["frames"][name]
        r = f["frame"]
        ss = f["spriteSourceSize"]
        src = f["sourceSize"]
        canvas = Image.new("RGBA", (src["w"], src["h"]), (0, 0, 0, 0))
        crop = self.img.crop((r["x"], r["y"], r["x"] + r["w"], r["y"] + r["h"]))
        canvas.paste(crop, (ss["x"], ss["y"]))
        return canvas, (f["anchor"]["x"] * src["w"], f["anchor"]["y"] * src["h"])

    def anim(self, clip, i=0):
        names = self.data["animations"].get(clip)
        return names[min(i, len(names) - 1)] if names else None


def tint(img, rgb):
    a = np.asarray(img).astype(np.float32)
    a[..., 0] *= rgb[0] / 255
    a[..., 1] *= rgb[1] / 255
    a[..., 2] *= rgb[2] / 255
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


def draw(dst, sheet, clip, i, at_px, color, mirror=False, scale=1.0):
    """Draws <clip>[i] (team layer tinted underneath) with its anchor at at_px."""
    for suffix in ("_team", ""):
        name = sheet.anim(clip + suffix, i)
        if not name:
            continue
        img, (ax, ay) = sheet.frame(name)
        if suffix:
            img = tint(img, color)
        if mirror:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
            ax = img.size[0] - ax
        if scale != 1.0:
            img = img.resize((max(1, round(img.size[0] * scale)), max(1, round(img.size[1] * scale))), Image.LANCZOS)
            ax, ay = ax * scale, ay * scale
        dst.alpha_composite(img, (round(at_px[0] - ax), round(at_px[1] - ay)))


def base_cell(base, turrets, stage, treasury, color, mirror, frame=0):
    ppl = base.px_per_lu
    W, H = int(260 * ppl), int(430 * ppl)
    cell = Image.new("RGBA", (W, H), (201, 220, 230, 255))
    d = ImageDraw.Draw(cell)
    gx, gy = (W - int(40 * ppl), H - int(30 * ppl)) if not mirror else (int(40 * ppl), H - int(30 * ppl))
    d.rectangle((0, gy, W, H), fill=(150, 132, 104, 255))
    flags = base.meta.get("flags", [])
    back = [f for f in flags if f.get("z") == "back" and stage <= f.get("crumbleMax", 3)]
    front = [f for f in flags if f.get("z") != "back" and stage <= f.get("crumbleMax", 3)]
    for f in back:
        draw(cell, base, f["clip"], frame, (gx, gy), color, mirror)
    draw(cell, base, "body", stage, (gx, gy), color, mirror)
    if treasury > 0:
        draw(cell, base, "treasury", treasury - 1, (gx, gy), color, mirror)
    for f in front:
        draw(cell, base, f["clip"], frame, (gx, gy), color, mirror)
    sx = -1 if mirror else 1
    for i, (mx, my) in enumerate(base.meta["mountsLu"]):
        p = (gx + sx * mx * ppl, gy - my * ppl)
        t = turrets[i % len(turrets)] if turrets else None
        if t:
            tp = t.px_per_lu / ppl
            draw(cell, t, "mount", 0, p, color, mirror, 1 / tp if tp != 1 else 1.0)
            draw(cell, t, "idle", 0, p, color, mirror, 1 / tp if tp != 1 else 1.0)
        d.ellipse((p[0] - 2, p[1] - 2, p[0] + 2, p[1] + 2), outline=(255, 0, 0, 255))
    return cell


def hstack(cells):
    w = sum(c.size[0] for c in cells)
    row = Image.new("RGBA", (w, max(c.size[1] for c in cells)))
    x = 0
    for c in cells:
        row.paste(c, (x, 0))
        x += c.size[0]
    return row


def turret_sheets(root, age):
    if not root:
        return []
    return [Sheet(p) for p in sorted(glob.glob(os.path.join(root, age, "*.json")))
            if json.load(open(p)).get("meta", {}).get("ageborn", {}).get("kind") == "turret"]


def skin_rows(src, spec, turret_root, standard_root):
    """Rows for one base skin model `<skin>:<age>`: crumble 0-3 (Treasury 0-3, flags, turrets) in blue
    plus a mirrored orange copy; then crumble 0 in both teams and both colourblind presets, beside the
    age's standard base."""
    skin, _, age = spec.partition(":")
    path = next((p for p in (os.path.join(src, age, f"{skin}.json"), os.path.join(src, f"{skin}.json"),
                             os.path.join(src, "skins", f"{skin}.json")) if os.path.exists(p)), None)
    if not path:
        raise SystemExit(f"no sheet for {skin}")
    base = Sheet(path)
    age = age or base.meta.get("age")
    turrets = turret_sheets(turret_root, age)
    cells = [base_cell(base, turrets, s, s, BLUE, False, s) for s in range(4)]
    cells.append(base_cell(base, turrets, 0, 3, ORANGE, True, 2))
    rows = [hstack(cells)]
    cells = [base_cell(base, [], 0, 0, c, m, i) for i, (c, m) in
             enumerate(((BLUE, False), (ORANGE, True), (CB_YELLOW, True), (HC_BLUE, False), (HC_ORANGE, True)))]
    std = os.path.join(standard_root, f"{age}.json") if standard_root else None
    if std and os.path.exists(std):
        cells.insert(0, base_cell(Sheet(std), [], 0, 0, BLUE, False, 0))
    rows.append(hstack(cells))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--zoom", type=float, default=1.0)
    ap.add_argument("--ages", default=",".join(AGES))
    ap.add_argument("--skins", default="", help="base skin models <skin>:<age>, comma separated")
    ap.add_argument("--turrets", default="", help="turret sheets <dir>/<age>/*.json for the skin rows")
    ap.add_argument("--standard", default="", help="standard base sheets <dir>/<age>.json beside the skin rows")
    args = ap.parse_args()
    rows = []
    if args.skins:
        for spec in [s for s in args.skins.split(",") if s]:
            rows += skin_rows(args.src, spec, args.turrets, args.standard)
        args.ages = ""
    for age in [a for a in args.ages.split(",") if a]:
        bp = os.path.join(args.src, age, f"{age}.json")
        if not os.path.exists(bp):
            bp = os.path.join(args.src, f"{age}.json")
        if not os.path.exists(bp):
            continue
        base = Sheet(bp)
        turrets = [Sheet(p) for p in sorted(glob.glob(os.path.join(args.src, age, "*.json")))
                   if json.load(open(p)).get("meta", {}).get("ageborn", {}).get("kind") == "turret"]
        cells = [base_cell(base, turrets, s, s, BLUE, False, s) for s in range(4)]
        cells.append(base_cell(base, turrets, 0, 3, ORANGE, True, 2))
        w = sum(c.size[0] for c in cells)
        row = Image.new("RGBA", (w, max(c.size[1] for c in cells)))
        x = 0
        for c in cells:
            row.paste(c, (x, 0))
            x += c.size[0]
        rows.append(row)
    if not rows:
        raise SystemExit("no bases found")
    out = Image.new("RGBA", (max(r.size[0] for r in rows), sum(r.size[1] for r in rows)))
    y = 0
    for r in rows:
        out.paste(r, (0, y))
        y += r.size[1]
    if args.zoom != 1.0:
        out = out.resize((round(out.size[0] * args.zoom), round(out.size[1] * args.zoom)), Image.LANCZOS)
    out.save(args.out)
    print(args.out, out.size)


if __name__ == "__main__":
    main()
