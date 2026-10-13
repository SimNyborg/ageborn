"""Base skin thumbnails (PLAN 2c "Thumbnails"): every skin model's resting frame standing on a strip of
its age's classic scene, in one WebP atlas of 128 px cells for the Customize tiles and the capsule and
crate summary (`public/art/bases/skins/thumbs.{webp,json}`, read lazily by
src/visuals/cosmetics/baseSkins.ts `baseSkinThumbUrl`).

Pure PIL, no Blender: it reads the installed skin sheets and the classic scenes' thumbnails, so it runs
after any skin install (`render_world.py --thumbs`, or this file directly).

- **The base** is drawn the way the menus' portraits draw it (src/visuals/adapters/worldPortrait.ts):
  the back flag, the body at crumble 0 and the front flag, each over its grey `_team` twin multiplied by
  side 0's blue (the lane's "tint-underlay" rule).
- **The composition** matches the tiles' stand-in (src/ui/components/cosmeticArt.tsx `BaseThumb`: the
  scene thumbnail as `object-fit: cover` at 30% 100%, the base portrait fitted 8% in from the sides, 6%
  from the top and 4% from the bottom), so a tile does not jump when its thumbnail arrives. A soft
  contact shadow grounds the base, and a Legendary model (`meta.ageborn.aura`) stands in its white aura
  as it does in the lane.
- **Budget**: the atlas holds all 24 models in at most 70 KB (about 3 KB a cell).

Usage: python3 art/blender/world/base_thumbs.py [--out <scratch dir for a 2x preview>]
"""
import argparse
import io
import json
import math
import os

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SKINS_DIR = os.path.join(REPO, "public", "art", "bases", "skins")
BACKDROPS = os.path.join(REPO, "public", "art", "backdrops")
AGES = ["stone", "bronze", "medieval", "gunpowder", "industrial", "modern", "future", "cosmic"]
CELL = 128
SS = 3
COLS = 6
TEAM = (0x2F, 0x7D, 0xF6)
INK = (27, 19, 48)
BUDGET = 70 * 1024


def scene_thumb(age):
    """The age's classic scene thumbnail (320 x 180: sky, strips and a ground band; format 1 or 2)."""
    for p in (os.path.join(BACKDROPS, age, "thumb.webp"), os.path.join(BACKDROPS, age, "classic", "thumb.webp")):
        if os.path.exists(p):
            return Image.open(p).convert("RGB")
    raise FileNotFoundError(f"no classic scene thumbnail for {age}")


def cover(img, size, px=0.3, py=1.0):
    """`object-fit: cover` into a square, positioned like CSS `object-position: px py`."""
    w, h = img.size
    k = max(size / w, size / h)
    nw, nh = max(size, round(w * k)), max(size, round(h * k))
    im = img.resize((nw, nh), Image.LANCZOS)
    x, y = round((nw - size) * px), round((nh - size) * py)
    return im.crop((x, y, x + size, y + size))


def frame_image(sheet, f):
    r = f["frame"]
    if f.get("rotated"):
        # stored 90 degrees clockwise in the atlas: turn it back
        return sheet.crop((r["x"], r["y"], r["x"] + r["h"], r["y"] + r["w"])).rotate(90, expand=True)
    return sheet.crop((r["x"], r["y"], r["x"] + r["w"], r["y"] + r["h"]))


def multiply(img, color):
    """The frame times a colour (the grey team layer in the side's colour), alpha kept."""
    r, g, b, a = img.split()
    r = r.point(lambda v: v * color[0] // 255)
    g = g.point(lambda v: v * color[1] // 255)
    b = b.point(lambda v: v * color[2] // 255)
    return Image.merge("RGBA", (r, g, b, a))


def base_layer(skin):
    """The skin's resting frame (back flag, body, front flag over their team twins), trimmed, and its meta."""
    with open(os.path.join(SKINS_DIR, f"{skin}.json")) as fh:
        data = json.load(fh)
    sheet = Image.open(os.path.join(SKINS_DIR, data["meta"]["image"])).convert("RGBA")
    meta = data["meta"]["ageborn"]
    anims, frames = data["animations"], data["frames"]
    flags = meta.get("flags", [])
    names = [anims[f["clip"]][0] for f in flags if f.get("z") == "back" and anims.get(f["clip"])]
    names.append(anims["body"][0])
    names += [anims[f["clip"]][0] for f in flags if f.get("z") != "back" and anims.get(f["clip"])]
    src = frames[names[0]]["sourceSize"]
    canvas = Image.new("RGBA", (src["w"], src["h"]), (0, 0, 0, 0))
    x0 = y0 = math.inf
    x1 = y1 = -math.inf
    for n in names:
        f = frames.get(n)
        if not f:
            continue
        s = f["spriteSourceSize"]
        x0, y0 = min(x0, s["x"]), min(y0, s["y"])
        x1, y1 = max(x1, s["x"] + s["w"]), max(y1, s["y"] + s["h"])
        t = frames.get(f"{n}_team")
        if t:
            ts = t["spriteSourceSize"]
            canvas.alpha_composite(multiply(frame_image(sheet, t), TEAM), (ts["x"], ts["y"]))
        canvas.alpha_composite(frame_image(sheet, f), (s["x"], s["y"]))
    return canvas.crop((int(x0), int(y0), int(x1), int(y1))), meta


def resize_rgba(img, size):
    """Resize in premultiplied alpha, so outlines do not pick up dark fringes."""
    return img.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")


def soft_ellipse(size, box, color, alpha, blur):
    layer = Image.new("RGBA", size, color + (0,))
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).ellipse(box, fill=alpha)
    layer.putalpha(mask.filter(ImageFilter.GaussianBlur(blur)))
    return layer


def aura(size, cx, cy, rx, ry, peak):
    """A white radial glow (the Legendary aura), alpha falling off smoothly."""
    w, h = size
    mask = Image.new("L", size, 0)
    px = mask.load()
    for y in range(max(0, int(cy - ry)), min(h, int(cy + ry) + 1)):
        for x in range(max(0, int(cx - rx)), min(w, int(cx + rx) + 1)):
            d = math.hypot((x - cx) / rx, (y - cy) / ry)
            if d < 1:
                px[x, y] = int(peak * (1 - d) ** 1.6)
    layer = Image.new("RGBA", size, (255, 252, 255, 0))
    layer.putalpha(mask)
    return layer


def cell(skin):
    layer, meta = base_layer(skin)
    S = CELL * SS
    out = cover(scene_thumb(meta["age"]), S).convert("RGBA")
    # the stand-in's box: 8% in from the sides, 6% from the top, 4% from the bottom; the portrait is the
    # largest square in it (bottom-centred), the base fitted to 96% of it and standing 2% above its bottom
    port = min(S * 0.84, S * 0.90)
    inner = port * 0.96
    w, h = layer.size
    k = min(inner / w, inner / h)
    bw, bh = max(1, round(w * k)), max(1, round(h * k))
    feet = S * 0.96 - port * 0.02
    x, y = round(S / 2 - bw / 2), round(feet - bh)
    if meta.get("aura") == "legendary":
        out.alpha_composite(aura((S, S), S / 2, y + bh * 0.48, bw * 0.8, bh * 0.66, 150))
    out.alpha_composite(soft_ellipse((S, S), (S / 2 - bw * 0.56, feet - S * 0.035, S / 2 + bw * 0.56, feet + S * 0.03), INK, 110, S * 0.012))
    base = resize_rgba(layer, (bw, bh))
    # the tiles' sticker shadow (drop-shadow 0 2px 0 at tile size), faint
    sil = Image.new("RGBA", base.size, INK + (0,))
    sil.putalpha(base.getchannel("A").point(lambda v: v * 70 // 255))
    out.alpha_composite(sil, (x, y + round(S * 0.022)))
    out.alpha_composite(base, (x, y))
    return out.convert("RGB").resize((CELL, CELL), Image.LANCZOS)


def skins():
    """Every installed skin model, by age then id."""
    found = []
    for name in sorted(os.listdir(SKINS_DIR)):
        if not name.endswith(".json") or name.endswith(".collapse.json") or name == "thumbs.json":
            continue
        with open(os.path.join(SKINS_DIR, name)) as fh:
            age = json.load(fh)["meta"]["ageborn"]["age"]
        found.append((AGES.index(age), name[:-5]))
    return [s for _, s in sorted(found)]


def build(out_dir=None):
    ids = skins()
    rows = max(1, math.ceil(len(ids) / COLS))
    atlas = Image.new("RGB", (COLS * CELL, rows * CELL), (0, 0, 0))
    cells = {}
    for i, sid in enumerate(ids):
        c, r = i % COLS, i // COLS
        atlas.paste(cell(sid), (c * CELL, r * CELL))
        cells[sid] = [c, r]
    q = 84
    while True:
        buf = io.BytesIO()
        atlas.save(buf, "WEBP", quality=q, method=6)
        # the budget is for all 24 models: keep this many cells' share of it
        if buf.tell() <= BUDGET * max(len(ids), 1) / 24 + 4096 or q <= 60:
            break
        q -= 4
    with open(os.path.join(SKINS_DIR, "thumbs.webp"), "wb") as fh:
        fh.write(buf.getvalue())
    with open(os.path.join(SKINS_DIR, "thumbs.json"), "w") as fh:
        json.dump({"image": "thumbs.webp", "cell": CELL, "cells": cells}, fh, separators=(",", ":"))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
        atlas.resize((atlas.width * 2, atlas.height * 2), Image.LANCZOS).save(os.path.join(out_dir, "thumbs-2x.png"))
    print(f"thumbs: {len(ids)} cells, {len(buf.getvalue())} B (quality {q}) -> {SKINS_DIR}/thumbs.webp")
    return len(buf.getvalue())


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="")
    build(ap.parse_args().out or None)
