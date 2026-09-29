"""Stone Age backdrop layers, realistic style (same frames and files as art/blender/world/backdrop.py):

  far  - a hazy range of snow-capped limestone mountains with a smoking volcano;
  mid  - rolling steppe hills with spruce stands, boulders and two hide tents with smoke.

Geometry is authored in lane lu (x = 0 at the left gate, z up, y depth away from the camera); the
orthographic camera matches the game's layer frame (x0, width, yTop, height, pxPerLu, elevation).
After rendering, colours are desaturated and hazed toward the horizon colour (far more than mid),
keeping DESIGN A11's low-contrast backdrop so units read in front.

  <venv>/bin/python art/blender/styles/realistic/render.py backdrop stone [--install]
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

X0, WIDTH = -260.0, 1720.0
FRAMES = {"far": {"yTop": -560.0, "height": 580.0, "ppl": 0.9, "elev": 8.0},
          "mid": {"yTop": -300.0, "height": 320.0, "ppl": 1.2, "elev": 12.0}}
SKY_BOTTOM, LIGHT = 0xF0E2C4, 0xFFF0CC
LOOK = {"far": (0.25, 0.22, 0.40), "mid": (0.12, 0.05, 0.16)}


def _setup(layer, samples):
    f = FRAMES[layer]
    C.ELEV_DEG = f["elev"]
    C.reset(samples)
    g = bpy.data.objects.get("ground")
    if g:
        bpy.data.objects.remove(g)
    feet = (-X0, f["height"] + f["yTop"])
    C.camera(WIDTH, f["height"], feet, mult=1, px1=f["ppl"])
    cam = bpy.context.scene.camera
    e = math.radians(f["elev"])
    from mathutils import Vector
    cam.location = cam.location - Vector((0.0, math.cos(e), -math.sin(e))) * 3000.0
    cam.data.clip_end = 12000.0
    sc = bpy.context.scene
    sc.render.resolution_x = int(round(WIDTH * f["ppl"]))
    sc.render.resolution_y = int(round(f["height"] * f["ppl"]))
    return f


def _mountain_mat():
    """Rock with snow above a noisy snow line and on upward-facing slopes."""
    m = bpy.data.materials.new("mountain")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    nsep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Normal"], nsep.inputs[0])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 0.02
    nz.inputs["Detail"].default_value = 8.0
    nt.links.new(geo.outputs["Position"], nz.inputs["Vector"])
    h = nt.nodes.new("ShaderNodeMath")
    h.operation = "MULTIPLY_ADD"
    nt.links.new(nz.outputs["Fac"], h.inputs[0])
    h.inputs[1].default_value = 90.0
    nt.links.new(sep.outputs["Z"], h.inputs[2])
    snow_h = nt.nodes.new("ShaderNodeMapRange")
    snow_h.inputs["From Min"].default_value = 250.0
    snow_h.inputs["From Max"].default_value = 275.0
    nt.links.new(h.outputs[0], snow_h.inputs["Value"])
    slope = nt.nodes.new("ShaderNodeMapRange")
    slope.inputs["From Min"].default_value = 0.55
    slope.inputs["From Max"].default_value = 0.8
    nt.links.new(nsep.outputs["Z"], slope.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    nt.links.new(snow_h.outputs[0], mul.inputs[0])
    nt.links.new(slope.outputs[0], mul.inputs[1])
    rock_n = nt.nodes.new("ShaderNodeTexNoise")
    rock_n.inputs["Scale"].default_value = 0.08
    rock_n.inputs["Detail"].default_value = 10.0
    nt.links.new(geo.outputs["Position"], rock_n.inputs["Vector"])
    rr = nt.nodes.new("ShaderNodeValToRGB")
    rr.color_ramp.elements[0].color = C.col("#6f6a68")
    rr.color_ramp.elements[1].color = C.col("#a29a92")
    nt.links.new(rock_n.outputs["Fac"], rr.inputs[0])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    nt.links.new(mul.outputs[0], mix.inputs["Factor"])
    nt.links.new(rr.outputs[0], mix.inputs[6])
    mix.inputs[7].default_value = C.col("#eef0f2")
    nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.85
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.6
    nt.links.new(rock_n.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs[0], bsdf.inputs["Normal"])
    m["team"] = 0
    return m


def _range(name, x0, x1, depth, base, height, seed, n, mat, sharp=1.0):
    """A mountain range: overlapping displaced cones with ridges."""
    rnd = random.Random(seed)
    objs = []
    for i in range(n):
        x = x0 + (x1 - x0) * (i + rnd.uniform(0.15, 0.85)) / n
        h = height * rnd.uniform(0.6, 1.1)
        rx = (x1 - x0) / n * rnd.uniform(1.0, 1.6)
        prof = [(0, 0), (rx, 0), (rx * 0.6, h * 0.4), (rx * 0.22 * sharp, h * 0.88), (rx * 0.05, h), (0, h * 1.01)]
        o = C.lathe(f"{name}{i}", prof, mat, seg=40, loc=(x, depth + rnd.uniform(-40, 40), base), scale=(1.0, 0.55, 1.0))
        sub = o.modifiers.new("sub", "SUBSURF")
        sub.levels = sub.render_levels = 3
        C.displace(o, h * 0.2, 60.0, tex="CLOUDS")
        d2 = o.modifiers.new("d2", "DISPLACE")
        t2 = bpy.data.textures.new(o.name + "_d2", "DISTORTED_NOISE")
        t2.noise_scale = 22.0
        t2.distortion = 2.0
        d2.texture = t2
        d2.strength = h * 0.045
        d3 = o.modifiers.new("d3", "DISPLACE")
        t3 = bpy.data.textures.new(o.name + "_d3", "VORONOI")
        t3.noise_scale = 9.0
        d3.texture = t3
        d3.strength = h * 0.02
        objs.append(o)
    return objs


def spruce(x, y, h, r, mat, trunk, seed):
    """A ragged spruce: many drooping needle clumps along a trunk, narrowing to a spire."""
    rnd = random.Random(seed)
    objs = [C.cyl(f"trunk{seed}", r * 0.08, r * 0.03, h * 0.95, trunk, seg=8, loc=(x, y, 0))]
    els = []
    n = 26
    for i in range(n):
        u = i / (n - 1)
        z = h * (0.12 + 0.86 * u)
        rr = r * (1.0 - 0.9 * u) * rnd.uniform(0.8, 1.15)
        for k in range(3 if u < 0.8 else 2):
            a = rnd.uniform(0, 2 * math.pi)
            els.append(((x + rr * 0.5 * math.cos(a), y + rr * 0.5 * math.sin(a), z - rr * 0.25 + rnd.uniform(-2, 2)),
                        (rr * 0.55, rr * 0.55, max(3.0, rr * 0.4))))
    o = C.blobs(f"spruce{seed}", els, mat, res=max(1.2, r * 0.07))
    C.displace(o, r * 0.16, 1.4)
    objs.append(o)
    return objs


def far(samples):
    f = _setup("far", samples)
    mm = _mountain_mat()
    _range("back", -300, 1560, 700, -20, 300, 3, 9, mm, sharp=0.9)
    volc = M.stone("#6e6260", "#5a4e4c", name="volcano", bump=1.2)
    o = C.lathe("volcano", [(0, 0), (250, 0), (180, 70), (70, 262), (52, 290), (34, 282), (0, 276)], volc, seg=48,
                loc=(900, 380, -20), scale=(1.0, 0.6, 1.0))
    s = o.modifiers.new("sub", "SUBSURF")
    s.levels = s.render_levels = 2
    C.displace(o, 14.0, 50.0)
    _range("front", -300, 1560, 260, -20, 170, 7, 12, M.stone("#77736c", "#5e5a54", name="foothill", bump=1.2), sharp=1.3)
    ambient = [{"kind": "emit", "part": "fx.p.smoke", "x": 900, "y": -295.2, "layer": "far", "rate": 1.2, "speed": 16,
                "scale": 3.2, "tint": 12565701, "alpha": 0.55}]
    return f, ambient


def mid(samples):
    f = _setup("mid", samples)
    grass = C.mat("grass", "#6a7044", rough=1.0, noise=0.25, nscale=0.05, bump=1.0, ramp2="#565c36", spec=0.04)
    rnd = random.Random(1)
    gp = C.box("meadow", 2400, 500, 2, grass, bevel=0, loc=(600, 150, -1))
    for i in range(14):
        x = -300 + i * 140
        o = C.blobs(f"hill{i}", [((x, 110, -24), (110, 70, 44 + rnd.uniform(0, 16)))], grass, res=6.0)
        C.displace(o, 5.0, 30.0)
    needles = M.fur("#3d4a30", "#2c3624", name="needles", bump=1.2, noise=0.25, nscale=0.4)
    needles2 = M.fur("#48553a", "#343f2a", name="needles2", bump=1.2, noise=0.25, nscale=0.4)
    trunk = M.bark("#4a3c30", "#342a22", name="trunk")
    for i in range(30):
        x = -240 + i * 60 + rnd.uniform(-22, 22)
        if 230 < x < 300 or 950 < x < 1020:
            continue
        spruce(x, 70 + rnd.uniform(-10, 60), rnd.uniform(95, 160), rnd.uniform(22, 30), needles if i % 3 else needles2, trunk, i)
    rockm = M.stone("#8a8274", "#6c665c", name="boulder", bump=1.2)
    for i in range(7):
        sz = rnd.uniform(10, 24)
        o = C.blobs(f"boulder{i}", [((-200 + i * 250 + rnd.uniform(-60, 60), rnd.uniform(0, 30), sz * 0.3), (sz, sz * 0.7, sz * 0.6))],
                    rockm, res=2.0)
        C.displace(o, sz * 0.25, 6.0)
    hide = M.rawhide("#9a8466", name="tenthide")
    poles = M.wood("#5a4a3c", "#44382e", name="tentpole")
    ambient = []
    for tx in (260, 980):
        C.lathe(f"tent{tx}", [(0, 0), (32, 0), (22, 30), (4, 66), (0, 68)], hide, seg=24, loc=(tx, 20, 0))
        for k in range(5):
            a = 2 * math.pi * k / 5
            C.tube(f"pole{tx}{k}", [(tx + 3 * math.cos(a), 20 + 3 * math.sin(a), 62), (tx + 7 * math.cos(a), 20 + 7 * math.sin(a), 84)],
                   [1.2, 0.9], poles, seg=6)
        C.blobs(f"door{tx}", [((tx + 4, 20 - 28, 12), (7, 3, 12))], M.dark(), res=1.0)
        ambient.append({"kind": "emit", "part": "fx.p.smoke", "x": tx, "y": -78.5, "layer": "mid", "rate": 0.8, "speed": 14,
                        "scale": 1.3, "tint": 11712417, "alpha": 0.45})
    return f, ambient


def _hex01(v):
    return np.array([(v >> 16) & 255, (v >> 8) & 255, v & 255], np.float32) / 255.0


def finish_layer(arr, layer):
    desat, haze_top, haze_foot = LOOK[layer]
    rgb, a = arr[..., :3], arr[..., 3:4]
    luma = (rgb * np.array([0.3, 0.59, 0.11], np.float32)).sum(-1, keepdims=True)
    rgb = rgb + (luma - rgb) * desat
    horizon = _hex01(SKY_BOTTOM) * 0.65 + _hex01(LIGHT) * 0.35
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
        raw = os.path.join(out, f"stone_{layer}_raw.png")
        bpy.context.scene.render.filepath = raw
        bpy.ops.render.render(write_still=True)
        arr = np.asarray(Image.open(raw).convert("RGBA"), np.float32) / 255.0
        arr = finish_layer(arr, layer)
        dst = os.path.join(out, f"stone_{layer}.webp")
        im = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
        im.save(dst, "WEBP", quality=86, method=6)
        sizes[layer] = os.path.getsize(dst)
        meta[layer] = {"image": f"{layer}.webp", "x0": X0, "width": WIDTH, "yTop": f["yTop"], "height": f["height"],
                       "pxPerLu": f["ppl"], "ambient": ambient}
        print(f"[stone.{layer}] {sizes[layer] // 1024} KB", flush=True)
    with open(os.path.join(out, "stone_layers.json"), "w") as fh:
        json.dump(meta, fh, separators=(",", ":"))
    if install:
        dest = os.path.join(repo, "public", "art", "backdrops", "stone")
        for layer in ("far", "mid"):
            shutil.copyfile(os.path.join(out, f"stone_{layer}.webp"), os.path.join(dest, f"{layer}.webp"))
        shutil.copyfile(os.path.join(out, "stone_layers.json"), os.path.join(dest, "layers.json"))
    return sizes
