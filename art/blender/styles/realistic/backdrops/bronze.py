"""Bronze Age backdrop layers, realistic style (same frames and files as backdrops/stone.py):

  far  - a hazy range of bare, sun-baked limestone mountains; on a hill below them a walled city with
         a distant stepped ziggurat and cooking smoke;
  mid  - dry rolling hills with date palms and olive groves, strips of ripe barley, a mud-brick
         farmstead with a reed shade and smoke, a stone boundary wall.

Geometry is authored in lane lu (x = 0 at the left gate, z up, y depth away from the camera); the
orthographic camera matches the game's layer frame. After rendering, colours are desaturated and hazed
toward the horizon (far more than mid), keeping the low-contrast backdrop so units read in front.

  <venv>/bin/python art/blender/styles/realistic/render.py backdrop bronze [--install]
"""
import json
import math
import os
import random
import shutil

import bpy
import numpy as np
from PIL import Image

from lib import core as C
from lib import mats as M

import stone as SB

X0, WIDTH = SB.X0, SB.WIDTH
FRAMES = SB.FRAMES
SKY_BOTTOM, LIGHT = 0xF0DCC0, 0xFFF0CC
LOOK = {"far": (0.28, 0.22, 0.42), "mid": (0.14, 0.05, 0.16)}


def _arid_mat():
    """Bare limestone and scree: pale rock, warm ochre bands, darker gullies, sparse scrub low down."""
    m = bpy.data.materials.new("arid")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    rock_n = nt.nodes.new("ShaderNodeTexNoise")
    rock_n.inputs["Scale"].default_value = 0.06
    rock_n.inputs["Detail"].default_value = 10.0
    nt.links.new(geo.outputs["Position"], rock_n.inputs["Vector"])
    rr = nt.nodes.new("ShaderNodeValToRGB")
    rr.color_ramp.elements[0].color = C.col("#8a7c6a")
    rr.color_ramp.elements[1].color = C.col("#c4b49a")
    mid = rr.color_ramp.elements.new(0.5)
    mid.color = C.col("#a8967c")
    nt.links.new(rock_n.outputs["Fac"], rr.inputs[0])
    # horizontal strata
    wv = nt.nodes.new("ShaderNodeTexWave")
    wv.bands_direction = "Z"
    wv.inputs["Scale"].default_value = 0.012
    wv.inputs["Distortion"].default_value = 10.0
    nt.links.new(geo.outputs["Position"], wv.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = 0.86
    mr.inputs["To Max"].default_value = 1.06
    nt.links.new(wv.outputs["Fac"], mr.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type, mul.blend_type = "RGBA", "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(rr.outputs[0], mul.inputs[6])
    nt.links.new(mr.outputs[0], mul.inputs[7])
    # scrub on gentle slopes low down
    nsep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Normal"], nsep.inputs[0])
    slope = nt.nodes.new("ShaderNodeMapRange")
    slope.inputs["From Min"].default_value = 0.75
    slope.inputs["From Max"].default_value = 0.95
    nt.links.new(nsep.outputs["Z"], slope.inputs["Value"])
    sn = nt.nodes.new("ShaderNodeTexNoise")
    sn.inputs["Scale"].default_value = 0.2
    nt.links.new(geo.outputs["Position"], sn.inputs["Vector"])
    sm = nt.nodes.new("ShaderNodeMapRange")
    sm.inputs["From Min"].default_value = 0.5
    sm.inputs["From Max"].default_value = 0.62
    nt.links.new(sn.outputs["Fac"], sm.inputs["Value"])
    mm = nt.nodes.new("ShaderNodeMath")
    mm.operation = "MULTIPLY"
    nt.links.new(slope.outputs[0], mm.inputs[0])
    nt.links.new(sm.outputs[0], mm.inputs[1])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    nt.links.new(mm.outputs[0], mix.inputs["Factor"])
    nt.links.new(mul.outputs[2], mix.inputs[6])
    mix.inputs[7].default_value = C.col("#7a7650")
    nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.9
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.7
    nt.links.new(rock_n.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs[0], bsdf.inputs["Normal"])
    m["team"] = 0
    return m


def _city(x, y, z, mud, lime, rnd):
    """A distant walled city on a hill: a wall with towers, flat-roofed houses and a stepped ziggurat."""
    C.box("citywall", 170, 6, 18, mud, bevel=1.0, loc=(x, y - 40, z + 9))
    for k in range(7):
        C.box(f"cwtower{k}", 12, 10, 26, mud, bevel=1.0, loc=(x - 84 + k * 28, y - 40, z + 13))
    for k in range(22):
        C.box(f"house{k}", rnd.uniform(10, 18), rnd.uniform(10, 16), rnd.uniform(8, 16), lime if k % 3 else mud, bevel=0.8,
              loc=(x - 76 + rnd.uniform(0, 150), y - 20 + rnd.uniform(0, 40), z + 18 + rnd.uniform(0, 8)))
    for k, (w, h) in enumerate(((80, 22), (58, 20), (38, 18))):
        C.box(f"zig{k}", w, w * 0.7, h, mud, bevel=1.0, loc=(x + 10, y + 10, z + 20 + sum(hh for _, hh in ((80, 22), (58, 20), (38, 18))[:k]) + h / 2))
    C.box("zigshrine", 20, 14, 12, lime, bevel=0.8, loc=(x + 10, y + 10, z + 86))


def far(samples):
    f = SB._setup("far", samples)
    mm = _arid_mat()
    SB._range("back", -300, 1560, 700, -20, 280, 5, 8, mm, sharp=0.8)
    SB._range("front", -300, 1560, 260, -20, 150, 9, 11, mm, sharp=1.1)
    rnd = random.Random(4)
    mud = M.clay("#b09878", name="citymud")
    lime = M.stone("#d4cab6", "#c0b6a2", name="citylime", bump=0.3)
    hill = C.blobs("cityhill", [((860, 150, -30), (220, 90, 70))], M.stone("#a6967c", "#8e806a", name="cityhillrock", bump=0.8), res=8.0)
    C.displace(hill, 8.0, 40.0)
    _city(860, 150, 30, mud, lime, rnd)
    ambient = [{"kind": "emit", "part": "fx.p.smoke", "x": 830, "y": -118.0, "layer": "far", "rate": 0.8, "speed": 12,
                "scale": 1.8, "tint": 12565701, "alpha": 0.45},
               {"kind": "drift", "part": "bd.bird", "x": 600, "y": -380.0, "layer": "sky", "speed": 20, "scale": 1, "tint": 7963023},
               {"kind": "drift", "part": "bd.bird", "x": 640, "y": -400.0, "layer": "sky", "speed": 20, "scale": 0.8, "tint": 7963023}]
    return f, ambient


def date_palm(x, y, h, trunk, frond, seed):
    """A date palm: a ringed, slightly curved trunk and a crown of drooping pinnate fronds."""
    rnd = random.Random(seed)
    lean = rnd.uniform(-0.12, 0.12)
    pts = [(x + lean * h * u * u, y, h * u) for u in (0.0, 0.25, 0.5, 0.75, 1.0)]
    C.tube(f"palm{seed}", pts, [h * 0.045, h * 0.04, h * 0.037, h * 0.034, h * 0.03], trunk, seg=10)
    top = pts[-1]
    for k in range(13):
        a = 2 * math.pi * k / 13 + rnd.uniform(-0.2, 0.2)
        up = rnd.uniform(-0.2, 0.9)
        L = h * rnd.uniform(0.3, 0.42)
        d = (math.cos(a), math.sin(a) * 0.8)
        fp = [top, (top[0] + d[0] * L * 0.45, top[1] + d[1] * L * 0.45, top[2] + L * (0.18 + 0.2 * up)),
              (top[0] + d[0] * L * 0.8, top[1] + d[1] * L * 0.8, top[2] + L * (0.05 + 0.1 * up)),
              (top[0] + d[0] * L, top[1] + d[1] * L, top[2] - L * (0.25 - 0.1 * up))]
        C.tube(f"frond{seed}_{k}", fp, [L * 0.09, L * 0.12, L * 0.08, L * 0.01], frond, seg=6, flat=0.25)
    C.blobs(f"dates{seed}", [((top[0], top[1] - 1.0, top[2] - 3.0), (4.0, 4.0, 3.0))], M.wood("#6a4a30", "#5a3e28", name="dates"), res=1.0)


def olive(x, y, s, leaf, trunk, seed):
    """An olive tree: a gnarled split trunk and a loose, silvery canopy of clumps."""
    rnd = random.Random(seed)
    C.tube(f"otrunk{seed}", [(x, y, 0), (x + rnd.uniform(-3, 3), y, s * 0.35), (x + rnd.uniform(-6, 6), y, s * 0.6)],
           [s * 0.1, s * 0.08, s * 0.06], trunk, seg=8)
    els = []
    for k in range(9):
        a = rnd.uniform(0, 2 * math.pi)
        r = rnd.uniform(0.2, 0.55) * s
        els.append(((x + r * math.cos(a), y + r * math.sin(a) * 0.6, s * rnd.uniform(0.6, 0.9)), (s * 0.3, s * 0.26, s * 0.2)))
    o = C.blobs(f"olive{seed}", els, leaf, res=max(1.0, s * 0.06))
    C.displace(o, s * 0.08, 1.2)


def mid(samples):
    f = SB._setup("mid", samples)
    ground = C.mat("dryground", "#9a8e68", rough=1.0, noise=0.25, nscale=0.05, bump=1.0, ramp2="#877c5a", spec=0.04)
    rnd = random.Random(2)
    C.box("plain", 2400, 500, 2, ground, bevel=0, loc=(600, 150, -1))
    for i in range(14):
        x = -300 + i * 140
        o = C.blobs(f"hill{i}", [((x, 120, -26), (120, 70, 40 + rnd.uniform(0, 18)))], ground, res=6.0)
        C.displace(o, 5.0, 30.0)
    barley = M.straw("#c4b080", name="barley")
    for i in range(5):
        x = -200 + i * 380 + rnd.uniform(-40, 40)
        o = C.box(f"field{i}", rnd.uniform(140, 220), 40, 3, barley, bevel=0.5, loc=(x, 40 + rnd.uniform(-10, 10), 0.5))
        C.displace(o, 1.2, 4.0)
    frond = M.fur("#58603c", "#434a2e", name="frond", bump=1.0, noise=0.25, nscale=0.5)
    trunk = M.bark("#6a5a48", "#54483a", name="palmtrunk")
    leaf = M.fur("#6e7658", "#565e44", name="oliveleaf", bump=1.2, noise=0.3, nscale=0.4)
    otrunk = M.bark("#5a4c3e", "#463a30", name="olivetrunk")
    for i in range(24):
        x = -240 + i * 76 + rnd.uniform(-26, 26)
        if 330 < x < 420 or 1050 < x < 1130:
            continue
        if i % 3 == 0:
            olive(x, 60 + rnd.uniform(-10, 50), rnd.uniform(38, 52), leaf, otrunk, 100 + i)
        else:
            date_palm(x, 70 + rnd.uniform(-10, 60), rnd.uniform(90, 150), trunk, frond, i)
    # a mud-brick farmstead with a reed shade, and a boundary wall of fieldstones
    mud = M.clay("#a68c6c", name="farmmud")
    reed = M.straw("#a8966a", name="reed")
    ambient = []
    for fx in (370, 1090):
        C.box(f"farm{fx}", 44, 30, 26, mud, bevel=1.2, loc=(fx, 30, 13))
        C.box(f"farm2{fx}", 26, 24, 18, mud, bevel=1.2, loc=(fx + 32, 40, 9))
        C.box(f"shade{fx}", 30, 22, 2, reed, bevel=0.4, loc=(fx - 30, 22, 22))
        for dx in (-42, -18):
            C.tube(f"shadepole{fx}{dx}", [(fx + dx, 12, 0), (fx + dx, 12, 22)], [1.0, 0.9], M.wood("#5a4a3c", "#44382e", name="spole"), seg=6)
        C.box(f"door{fx}", 8, 2, 14, M.dark(), bevel=0.3, loc=(fx + 6, 14.6, 7))
        ambient.append({"kind": "emit", "part": "fx.p.smoke", "x": fx + 10, "y": -80.0, "layer": "mid", "rate": 0.7, "speed": 12,
                        "scale": 1.2, "tint": 11712417, "alpha": 0.4})
    wall = M.stone("#a39680", "#887c68", name="fieldstone", bump=1.2)
    for i in range(40):
        x = -200 + i * 44
        o = C.blobs(f"wall{i}", [((x + rnd.uniform(-4, 4), 0, 4.0), (rnd.uniform(12, 18), 5, rnd.uniform(4, 6)))], wall, res=1.4)
        C.displace(o, 1.5, 3.0)
    return f, ambient


def finish_layer(arr, layer):
    desat, haze_top, haze_foot = LOOK[layer]
    rgb, a = arr[..., :3], arr[..., 3:4]
    luma = (rgb * np.array([0.3, 0.59, 0.11], np.float32)).sum(-1, keepdims=True)
    rgb = rgb + (luma - rgb) * desat
    horizon = SB._hex01(SKY_BOTTOM) * 0.65 + SB._hex01(LIGHT) * 0.35
    h = arr.shape[0]
    f = FRAMES[layer]
    foot = (-f["yTop"]) * f["ppl"]
    rows = np.arange(h, dtype=np.float32)[:, None, None]
    t = np.clip(rows / max(1.0, foot), 0, 1)
    haze = haze_top + (haze_foot - haze_top) * t ** 2
    rgb = rgb + (horizon - rgb) * haze
    return np.concatenate([np.clip(rgb, 0, 1), a], -1)


def run(out, samples=24, install=False, repo=None):
    os.makedirs(out, exist_ok=True)
    meta = {}
    sizes = {}
    for layer, fn in (("far", far), ("mid", mid)):
        f, ambient = fn(samples)
        raw = os.path.join(out, f"bronze_{layer}_raw.png")
        bpy.context.scene.render.filepath = raw
        bpy.ops.render.render(write_still=True)
        arr = np.asarray(Image.open(raw).convert("RGBA"), np.float32) / 255.0
        arr = finish_layer(arr, layer)
        dst = os.path.join(out, f"bronze_{layer}.webp")
        im = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
        im.save(dst, "WEBP", quality=86, method=6)
        sizes[layer] = os.path.getsize(dst)
        meta[layer] = {"image": f"{layer}.webp", "x0": X0, "width": WIDTH, "yTop": f["yTop"], "height": f["height"],
                       "pxPerLu": f["ppl"], "ambient": ambient}
        print(f"[bronze.{layer}] {sizes[layer] // 1024} KB", flush=True)
    with open(os.path.join(out, "bronze_layers.json"), "w") as fh:
        json.dump(meta, fh, separators=(",", ":"))
    if install:
        dest = os.path.join(repo, "public", "art", "backdrops", "bronze")
        os.makedirs(dest, exist_ok=True)
        for layer in ("far", "mid"):
            shutil.copyfile(os.path.join(out, f"bronze_{layer}.webp"), os.path.join(dest, f"{layer}.webp"))
        shutil.copyfile(os.path.join(out, "bronze_layers.json"), os.path.join(dest, "layers.json"))
    return sizes
