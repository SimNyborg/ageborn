"""Medieval Age backdrop layers, realistic style (same frames and files as art/blender/world/backdrop.py):

  far  - a hazy blue range of mountains over rolling green downs; a stone castle with round towers
         on a hill at the left, a walled town with a church spire at the right;
  mid  - farmland: hedgerows of oaks and beeches, strips of ripe wheat, two timber-framed cottages
         with thatched roofs and smoking chimneys, a post windmill, wattle fences.

Geometry is authored in lane lu (x = 0 at the left gate, z up, y depth away from the camera) and shares
the camera, framing and the colour finish (desaturation and horizon haze) of backdrops/stone.py.

  <venv>/bin/python art/blender/styles/realistic/render.py backdrop medieval [--install]
"""
import json
import math
import os
import random
import shutil

import bpy
import numpy as np
from PIL import Image

import stone as ST
from lib import core as C
from lib import mats as M

X0, WIDTH = ST.X0, ST.WIDTH
FRAMES = ST.FRAMES


def _hills(name, x0, x1, depth, base, height, seed, n, mat, width=1.6):
    """Rolling downs: wide, low, soft mounds."""
    rnd = random.Random(seed)
    out = []
    for i in range(n):
        x = x0 + (x1 - x0) * (i + rnd.uniform(0.2, 0.8)) / n
        h = height * rnd.uniform(0.6, 1.1)
        rx = (x1 - x0) / n * rnd.uniform(1.1, width)
        o = C.blobs(f"{name}{i}", [((x, depth + rnd.uniform(-30, 30), base), (rx, rx * 0.4, h))], mat, res=max(4.0, rx * 0.05))
        C.displace(o, h * 0.08, 50.0)
        out.append(o)
    return out


def _grass(name, color, dark):
    return C.mat(name, color, rough=1.0, noise=0.22, nscale=0.04, bump=0.8, ramp2=dark, spec=0.04)


def _castle(x, y, z, s, stone, roof):
    """A distant castle: a square keep, round corner towers with conical roofs, curtain walls."""
    C.box("ckeep", 34 * s, 30 * s, 70 * s, stone, bevel=1.0, loc=(x, y + 10 * s, z + 35 * s))
    for dx in (-10, 0, 10):
        C.box("ckm", 5 * s, 30 * s, 5 * s, stone, bevel=0.4, loc=(x + dx * s, y + 10 * s, z + 72 * s))
    C.box("cwall", 100 * s, 60 * s, 30 * s, stone, bevel=1.0, loc=(x, y + 20 * s, z + 15 * s))
    for dx, dy, h in ((-50, -10, 44), (50, -10, 48), (-50, 50, 40), (50, 50, 40)):
        C.cyl("ctower", 9 * s, 9 * s, h * s, stone, seg=16, loc=(x + dx * s, y + dy * s, z))
        C.lathe("croof", [(0, 0), (11 * s, 0), (0, 20 * s)], roof, seg=16, loc=(x + dx * s, y + dy * s, z + h * s))
    for dx in range(-44, 46, 8):
        C.box("cmerlon", 4 * s, 3 * s, 4 * s, stone, bevel=0.3, loc=(x + dx * s, y - 10 * s, z + 32 * s))


def _town(x, y, z, stone, roof, plaster, rnd):
    """A walled market town: houses with steep roofs around a church with a tall spire."""
    for i in range(16):
        hx = x + rnd.uniform(-90, 90)
        hy = y + rnd.uniform(-10, 40)
        w, d, h = rnd.uniform(12, 20), rnd.uniform(10, 14), rnd.uniform(12, 18)
        C.box("house", w, d, h, plaster, bevel=0.4, loc=(hx, hy, z + h / 2))
        r = C.cyl("hroof", w * 0.62, 0.1, h * 0.6, roof, seg=4, loc=(hx, hy, z + h), rot=(0, 0, math.pi / 4), scale=(1.0, 0.8, 1.0))
    C.box("nave", 50, 18, 26, stone, bevel=0.6, loc=(x + 10, y + 8, z + 13))
    C.cyl("naveroof", 20, 0.1, 14, roof, seg=4, loc=(x + 10, y + 8, z + 26), rot=(0, 0, math.pi / 4), scale=(1.8, 0.7, 1.0))
    C.box("tower", 14, 14, 50, stone, bevel=0.6, loc=(x - 20, y + 8, z + 25))
    C.lathe("spire", [(0, 0), (9.5, 0), (0, 48)], roof, seg=8, loc=(x - 20, y + 8, z + 50))
    C.box("townwall", 210, 4, 16, stone, bevel=0.6, loc=(x, y - 16, z + 8))
    for dx in (-104, -40, 40, 104):
        C.cyl("wtower", 7, 7, 26, stone, seg=12, loc=(x + dx, y - 16, z))


def far(samples):
    f = ST._setup("far", samples)
    mm = ST._mountain_mat()
    ST._range("back", -300, 1560, 760, -20, 250, 11, 10, mm, sharp=1.1)
    downs = _grass("downs", "#6f7a52", "#5c6644")
    downs2 = _grass("downs2", "#7a8358", "#646c48")
    _hills("down", -300, 1560, 360, -40, 120, 5, 9, downs, width=1.8)
    _hills("downf", -300, 1560, 240, -50, 80, 8, 11, downs2, width=1.6)
    stone = M.stone("#9c968a", "#827c72", name="cstone", bump=0.6)
    roof = C.mat("croof", "#5a5a62", rough=0.7, noise=0.15, nscale=0.1, bump=0.3)
    tile = C.mat("tile", "#7a5a4a", rough=0.8, noise=0.2, nscale=0.1, bump=0.3)
    plaster = C.mat("plaster", "#c8bea8", rough=0.9, noise=0.1, nscale=0.1, bump=0.2)
    # the castle on its hill (left), the town (right)
    o = C.blobs("castlehill", [((330, 250, -30), (170, 80, 105))], downs, res=5.0)
    C.displace(o, 6.0, 40.0)
    _castle(330, 250, 62, 1.25, stone, roof)
    _town(1120, 260, 18, stone, tile, plaster, random.Random(4))
    ambient = [{"kind": "drift", "part": "bd.bird", "x": 600, "y": -386.2, "layer": "sky", "speed": 22, "scale": 1, "tint": 7963023},
               {"kind": "drift", "part": "bd.bird", "x": 640, "y": -406.0, "layer": "sky", "speed": 22, "scale": 0.8, "tint": 7963023},
               {"kind": "emit", "part": "fx.p.smoke", "x": 1090, "y": -84.0, "layer": "far", "rate": 0.6, "speed": 10,
                "scale": 1.6, "tint": 12565701, "alpha": 0.35}]
    return f, ambient


def _oak(x, y, h, r, leaf, trunk, seed):
    """A broad deciduous tree: a short trunk, forked limbs and a rounded, lumpy canopy."""
    rnd = random.Random(seed)
    C.cyl(f"otrunk{seed}", r * 0.12, r * 0.08, h * 0.55, trunk, seg=8, loc=(x, y, 0))
    for k in range(3):
        a = rnd.uniform(0, 2 * math.pi)
        C.tube(f"olimb{seed}{k}", [(x, y, h * 0.4), (x + r * 0.4 * math.cos(a), y + r * 0.3 * math.sin(a), h * 0.66)],
               [r * 0.07, r * 0.04], trunk, seg=6)
    els = []
    for k in range(16):
        a = rnd.uniform(0, 2 * math.pi)
        rr = r * rnd.uniform(0.2, 0.7)
        els.append(((x + rr * math.cos(a), y + rr * 0.6 * math.sin(a), h * rnd.uniform(0.6, 0.95)),
                    (r * rnd.uniform(0.35, 0.5), r * rnd.uniform(0.3, 0.45), r * rnd.uniform(0.28, 0.4))))
    o = C.blobs(f"canopy{seed}", els, leaf, res=max(1.4, r * 0.08))
    C.displace(o, r * 0.12, 1.8)


def _cottage(x, y, plaster, beam, thatch, stone):
    """A cruck-framed cottage: whitewashed wattle-and-daub between dark oak beams, a deep thatch."""
    w, d, h = 44.0, 24.0, 20.0
    C.box(f"cot{x}", w, d, h, plaster, bevel=0.5, loc=(x, y, h / 2))
    for dx in (-w / 2 + 1, -w / 6, w / 6, w / 2 - 1):
        C.box(f"post{x}{dx}", 1.8, 1.2, h, beam, bevel=0.2, loc=(x + dx, y - d / 2 - 0.2, h / 2))
    for z in (1.0, h * 0.5, h - 0.8):
        C.box(f"rail{x}{z}", w, 1.2, 1.6, beam, bevel=0.2, loc=(x, y - d / 2 - 0.2, z))
    C.tube(f"brace{x}", [(x - w / 2 + 1, y - d / 2 - 0.3, h * 0.5), (x - w / 6, y - d / 2 - 0.3, h - 1)], [0.8, 0.8], beam, seg=6)
    C.box(f"door{x}", 7.0, 1.0, 12.0, beam, bevel=0.2, loc=(x + 4, y - d / 2 - 0.6, 6.0))
    C.box(f"win{x}", 6.0, 1.0, 5.0, M.dark("#2a2420", name="cotwin"), bevel=0.2, loc=(x - 10, y - d / 2 - 0.6, 12.0))
    import bmesh
    bm = bmesh.new()
    ov = 4.0
    pts = [(-w / 2 - ov, -d / 2 - ov, h - 2), (w / 2 + ov, -d / 2 - ov, h - 2), (w / 2 + ov, d / 2 + ov, h - 2),
           (-w / 2 - ov, d / 2 + ov, h - 2), (-w / 2 + 6, 0, h + 24), (w / 2 - 6, 0, h + 24)]
    v = [bm.verts.new((x + a, y + b, c)) for a, b, c in pts]
    for f in ((0, 1, 5, 4), (2, 3, 4, 5), (1, 2, 5), (3, 0, 4)):
        bm.faces.new([v[i] for i in f])
    o = C.from_bm(f"thatch{x}", bm, thatch, sharp_deg=60)
    sub = o.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 2
    C.displace(o, 1.2, 3.0)
    C.box(f"chimney{x}", 5.0, 5.0, 40.0, stone, bevel=0.4, loc=(x + w / 2 - 10, y + 2, 22.0))


def _windmill(x, y, wood, cloth, stone):
    """A post mill: the timber body on a trestle post, a tail pole and four lattice sails."""
    C.box("millbase", 20, 20, 4, stone, bevel=0.6, loc=(x, y, 2))
    for dx, dy in ((-8, -8), (8, -8), (-8, 8), (8, 8)):
        C.tube("quarter", [(x + dx, y + dy, 3), (x, y, 22)], [1.2, 1.0], wood, seg=6)
    C.cyl("millpost", 2.2, 2.2, 36, wood, seg=10, loc=(x, y, 2))
    C.box("millbody", 20, 18, 30, wood, bevel=0.6, loc=(x, y, 50))
    C.cyl("millroof", 13.0, 13.0, 18.0, wood, seg=16, loc=(x - 9, y, 65), rot=(0, math.pi / 2, 0), scale=(0.7, 1.0, 1.0))
    C.tube("tailpole", [(x - 10, y, 36), (x - 34, y, 6)], [1.4, 1.2], wood, seg=6)
    hx, hy, hz = x + 11, y - 3, 60
    for k in range(4):
        a = math.radians(20 + 90 * k)
        ca, sa = math.cos(a), math.sin(a)
        C.tube(f"whip{k}", [(hx, hy, hz), (hx + 42 * ca, hy, hz + 42 * sa)], [1.0, 0.7], wood, seg=6)
        C.box(f"sail{k}", 30.0, 0.4, 7.0, cloth, bevel=0.1, loc=(hx + 25 * ca - 3.8 * sa, hy - 0.6, hz + 25 * sa + 3.8 * ca),
              rot=(0, -a, 0))
    C.sphere("millhub", 2.4, wood, loc=(hx, hy - 0.5, hz))


def mid(samples):
    f = ST._setup("mid", samples)
    grass = _grass("grass", "#6a7446", "#566038")
    rnd = random.Random(2)
    C.box("meadow", 2400, 500, 2, grass, bevel=0, loc=(600, 150, -1))
    for i in range(14):
        x = -300 + i * 140
        o = C.blobs(f"hill{i}", [((x, 120, -26), (120, 70, 40 + rnd.uniform(0, 16)))], grass, res=6.0)
        C.displace(o, 5.0, 30.0)
    wheat = C.mat("wheat", "#b0a070", rough=1.0, noise=0.2, nscale=0.3, bump=1.0, stripes=0.6, spec=0.04)
    stubble = C.mat("stubble", "#8e8a5a", rough=1.0, noise=0.2, nscale=0.3, bump=0.8, spec=0.04)
    for i, (x0, x1, y, m) in enumerate(((-260, 120, 150, wheat), (420, 820, 170, stubble), (1060, 1480, 150, wheat))):
        o = C.box(f"field{i}", x1 - x0, 60, 8, m, bevel=2.0, loc=((x0 + x1) / 2, y, 2))
        C.displace(o, 1.5, 4.0)
    leaf = M.fur("#4d5a34", "#3c4628", name="leaf", bump=1.2, noise=0.25, nscale=0.35)
    leaf2 = M.fur("#5a6438", "#46502c", name="leaf2", bump=1.2, noise=0.25, nscale=0.35)
    trunk = M.bark("#4a3c30", "#342a22", name="trunk")
    for i in range(26):
        x = -240 + i * 68 + rnd.uniform(-24, 24)
        if 130 < x < 260 or 860 < x < 1020:
            continue
        _oak(x, 90 + rnd.uniform(-10, 50), rnd.uniform(80, 120), rnd.uniform(34, 48), leaf if i % 3 else leaf2, trunk, i)
    plaster = C.mat("daub", "#cbc2ab", rough=0.9, noise=0.12, nscale=0.2, bump=0.5)
    beam = M.wood("#3e3228", "#2e2620", name="beam")
    thatch = M.straw("#9a8660", name="thatch")
    stone = M.stone("#8a8274", "#6c665c", name="mstone", bump=1.0)
    _cottage(190, 40, plaster, beam, thatch, stone)
    _cottage(940, 50, plaster, beam, thatch, stone)
    _windmill(620, 120, M.wood("#6a5846", "#4e4035", name="millwood"), M.burlap("#c8bca0", name="sailcloth"), stone)
    wattle = M.wood("#5a4a3c", "#44382e", name="wattle", stripes=4.0)
    for x0 in (-240, 300, 1080):
        for k in range(12):
            C.cyl("stake", 0.9, 0.8, 12.0, wattle, seg=6, loc=(x0 + k * 11.0, 10, 0))
        C.box("hurdle", 132.0, 1.4, 7.0, wattle, bevel=0.3, loc=(x0 + 60.0, 10, 5.5))
    ambient = []
    for tx in (190 + 22 - 10, 940 + 22 - 10):
        ambient.append({"kind": "emit", "part": "fx.p.smoke", "x": tx, "y": -76.0, "layer": "mid", "rate": 0.8, "speed": 14,
                        "scale": 1.2, "tint": 11712417, "alpha": 0.45})
    return f, ambient


def run(out, samples=24, install=False, repo=None):
    os.makedirs(out, exist_ok=True)
    meta, sizes = {}, {}
    for layer, fn in (("far", far), ("mid", mid)):
        f, ambient = fn(samples)
        raw = os.path.join(out, f"medieval_{layer}_raw.png")
        bpy.context.scene.render.filepath = raw
        bpy.ops.render.render(write_still=True)
        arr = np.asarray(Image.open(raw).convert("RGBA"), np.float32) / 255.0
        arr = ST.finish_layer(arr, layer)
        dst = os.path.join(out, f"medieval_{layer}.webp")
        Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA").save(dst, "WEBP", quality=86, method=6)
        sizes[layer] = os.path.getsize(dst)
        meta[layer] = {"image": f"{layer}.webp", "x0": X0, "width": WIDTH, "yTop": f["yTop"], "height": f["height"],
                       "pxPerLu": f["ppl"], "ambient": ambient}
        print(f"[medieval.{layer}] {sizes[layer] // 1024} KB", flush=True)
    with open(os.path.join(out, "medieval_layers.json"), "w") as fh:
        json.dump(meta, fh, separators=(",", ":"))
    if install:
        dest = os.path.join(repo, "public", "art", "backdrops", "medieval")
        for layer in ("far", "mid"):
            shutil.copyfile(os.path.join(out, f"medieval_{layer}.webp"), os.path.join(dest, f"{layer}.webp"))
        shutil.copyfile(os.path.join(out, "medieval_layers.json"), os.path.join(dest, "layers.json"))
    return sizes
