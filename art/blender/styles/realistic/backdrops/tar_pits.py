"""The Tar Pits arena ground (the first arena, where Stone Age battles are fought), realistic style.

Same frame and file as art/blender/world/backdrop.py (`public/art/ground/tar_pits.webp`, 2236x377,
opaque): a grassy verge at the back, the packed-dirt lane with wheel-less ruts, pebbles and grass
tufts on its edges, a raised lip, and the soil under the HUD with glossy tar pools in stony rims,
old bones and rocks, darkening toward the bottom.

  <venv>/bin/python art/blender/styles/realistic/render.py ground tar_pits [--install]
"""
import math
import os
import random
import shutil

import bmesh
import bpy
import numpy as np
from PIL import Image

from lib import core as C
from lib import mats as M

X0, WIDTH = -260.0, 1720.0
F = {"yTop": -40.0, "height": 290.0, "ppl": 1.3, "elev": 16.0}


def dpt(sy):
    """World depth of a ground point that shows at screen y `sy` (lu, down)."""
    return -sy / math.sin(math.radians(F["elev"]))


def _ground_mat():
    m = bpy.data.materials.new("groundmat")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 0.03
    nz.inputs["Detail"].default_value = 8.0
    nt.links.new(geo.outputs["Position"], nz.inputs["Vector"])
    # noisy depth: y + noise
    yn = nt.nodes.new("ShaderNodeMath")
    yn.operation = "MULTIPLY_ADD"
    nt.links.new(nz.outputs["Fac"], yn.inputs[0])
    yn.inputs[1].default_value = 30.0
    nt.links.new(sep.outputs["Y"], yn.inputs[2])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "LINEAR"
    # depth (world y) -> colour: front soil, lip, lane, rut bands, verge grass
    stops = [(-1000, "#3e3228"), (-300, "#4a3c30"), (-125, "#55463a"), (-100, "#7d6c58"), (-60, "#8a7862"),
             (-45, "#6f604e"), (-36, "#8a7862"), (40, "#8a7862"), (52, "#6f604e"), (62, "#8a7862"), (92, "#7d6c58"),
             (102, "#6c6e46"), (400, "#5e6440")]
    lo, hi = stops[0][0], stops[-1][0]
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.0, C.col(stops[0][1])
    els[1].position, els[1].color = 1.0, C.col(stops[-1][1])
    for yv, hx in stops[1:-1]:
        e = els.new((yv - lo) / (hi - lo))
        e.color = C.col(hx)
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = lo
    mr.inputs["From Max"].default_value = hi
    nt.links.new(yn.outputs[0], mr.inputs["Value"])
    nt.links.new(mr.outputs[0], ramp.inputs[0])
    fine = nt.nodes.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 0.35
    fine.inputs["Detail"].default_value = 10.0
    nt.links.new(geo.outputs["Position"], fine.inputs["Vector"])
    fm = nt.nodes.new("ShaderNodeMapRange")
    fm.inputs["To Min"].default_value = 0.8
    fm.inputs["To Max"].default_value = 1.15
    nt.links.new(fine.outputs["Fac"], fm.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(ramp.outputs[0], mul.inputs[6])
    nt.links.new(fm.outputs[0], mul.inputs[7])
    nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.95
    bsdf.inputs["Specular IOR Level"].default_value = 0.1
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.8
    nt.links.new(fine.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs[0], bsdf.inputs["Normal"])
    m["team"] = 0
    return m


def _rock(name, loc, size, mat, sub=2):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
    o = C.from_bm(name, bm, mat, sharp_deg=35)
    C.xform(o, loc=loc, scale=size)
    C.displace(o, max(size) * 0.3, max(size) * 0.6)
    return o


def build(samples):
    C.ELEV_DEG = F["elev"]
    C.reset(samples)
    g = bpy.data.objects.get("ground")
    if g:
        bpy.data.objects.remove(g)
    C.camera(WIDTH, F["height"], (-X0, F["height"] + F["yTop"]), mult=1, px1=F["ppl"])
    cam = bpy.context.scene.camera
    e = math.radians(F["elev"])
    from mathutils import Vector
    cam.location = cam.location - Vector((0.0, math.cos(e), -math.sin(e))) * 3000.0
    cam.data.clip_end = 12000.0
    sc = bpy.context.scene
    sc.render.resolution_x = int(round(WIDTH * F["ppl"]))
    sc.render.resolution_y = int(round(F["height"] * F["ppl"]))
    rnd = random.Random(7)
    xa, xb = X0 - 160, X0 + WIDTH + 160
    # the ground: a displaced grid over the whole depth range
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=400, y_segments=160, size=1.0)
    gr = C.from_bm("terrain", bm, _ground_mat(), smooth=True)
    C.xform(gr, loc=((xa + xb) / 2, (dpt(-60) + dpt(270)) / 2, 0), scale=((xb - xa) / 2, (dpt(-60) - dpt(270)) / 2, 1))
    C.displace(gr, 1.6, 14.0)
    # the lip at the front edge of the lane
    lip = C.tube("lip", [(xa, dpt(29.5), -1.2), (xb, dpt(29.5), -1.2)], [4.0, 4.0], M.stone("#6c5c4a", "#5a4c3e", name="lipsoil"),
                 seg=10, flat=0.5)
    C.displace(lip, 1.4, 5.0)
    # pebbles on the lane and the soil
    peb = M.stone("#9a8e7c", "#7a6e5e", name="pebble", bump=0.8)
    for i in range(170):
        sy = rnd.uniform(-24, 26) if i < 110 else rnd.uniform(40, 240)
        s = rnd.uniform(1.2, 3.6) * (1 + max(0.0, sy - 30) / 160)
        _rock(f"peb{i}", (rnd.uniform(xa, xb), dpt(sy), s * 0.25), (s * 1.3, s * 1.1, s * 0.75), peb)
    # grass tufts on the verge and the lane edges
    grass = C.mat("blades", "#6e7244", rough=0.8, noise=0.3, nscale=0.4, bump=0.2, ramp2="#8a8656")
    for sy, n in ((-30, 160), (-26, 90), (28, 80)):
        for i in range(n):
            x = rnd.uniform(xa, xb)
            y = dpt(sy + rnd.uniform(-2, 2))
            for k in range(4):
                a = rnd.uniform(-0.6, 0.6)
                h = rnd.uniform(5, 11)
                C.tube(f"blade{sy}_{i}_{k}", [(x + k * 1.2, y, 0), (x + k * 1.2 + math.sin(a) * h * 0.5, y, h)], [0.7, 0.08], grass,
                       seg=4)
    # tar pools in stony rims, glossy, with a bubble or two
    tar = C.mat("tar", "#15110f", rough=0.12, noise=0.05, bump=0.05, spec=0.9, coat=1.0)
    rim = M.stone("#56483a", "#44382e", name="rim", bump=1.6)
    sheen = C.emit_mat("sheen", "#9aa3ae", 0.55)
    glint = C.emit_mat("glint", "#e8e4dc", 1.2)
    x = xa + 80
    while x < xb - 60:
        sy = rnd.uniform(70, 190)
        rx = rnd.uniform(40, 80) * (0.8 + (sy - 60) / 200)
        y = dpt(sy)
        rz = rx * 0.9
        ring = C.lathe(f"rim{x:.0f}", [(rx * 0.92, 0.2), (rx * 1.02, 2.4), (rx * 1.22, 1.2), (rx * 1.34, -0.5)], rim, seg=48,
                       loc=(x, y, 0), scale=(1.0, 0.9, 1.0))
        C.displace(ring, 3.2, 7.0)
        C.cyl(f"tar{x:.0f}", rx, rx, 1.0, tar, seg=48, loc=(x, y, 0.2), scale=(1.0, 0.9, 1.0))
        # the sky's reflection on the far half of the pool, and a glint
        C.cyl(f"sheen{x:.0f}", rx * 0.62, rx * 0.62, 0.1, sheen, seg=40, loc=(x - rx * 0.1, y + rz * 0.42, 1.25),
              scale=(1.0, 0.32, 1.0))
        C.sphere(f"glint{x:.0f}", rx * 0.06, glint, loc=(x + rx * 0.35, y + rz * 0.25, 1.3), scale=(1.8, 0.6, 0.2))
        for b in range(rnd.randint(1, 3)):
            br = rnd.uniform(1.5, 4.0)
            C.sphere(f"bub{x:.0f}{b}", br, tar, loc=(x + rnd.uniform(-0.5, 0.5) * rx, y + rnd.uniform(-0.4, 0.3) * rz, 0.6),
                     scale=(1, 1, 0.55))
        x += rx * 2 + rnd.uniform(80, 240)
    # old bones
    bone = M.bone("#d8cdb2")
    for i in range(8):
        bx = xa + 120 + i * (xb - xa) / 8 + rnd.uniform(0, 80)
        by = dpt(rnd.uniform(60, 220))
        a = rnd.uniform(-0.5, 0.5)
        dx, dy = math.cos(a) * 16, math.sin(a) * 16
        C.tube(f"bone{i}", [(bx - dx, by - dy, 1.4), (bx + dx, by + dy, 1.4)], [1.9, 1.9], bone, seg=10)
        for s in (-1, 1):
            for o in (-2.2, 2.2):
                C.sphere(f"knob{i}{s}{o}", 2.6, bone, loc=(bx + s * dx, by + s * dy + o, 1.8))
    # rocks on the soil
    soil = M.stone("#6e5e4c", "#584a3c", name="soilrock", bump=1.2)
    for i in range(46):
        sy = rnd.uniform(44, 240)
        s = rnd.uniform(2, 6) * (1 + (sy - 30) / 180)
        _rock(f"srock{i}", (rnd.uniform(xa, xb), dpt(sy), s * 0.2), (s * 1.3, s * 1.1, s * 0.8), soil)


def finish(arr):
    rgb = arr[..., :3]
    h = arr.shape[0]
    rows = (np.arange(h, dtype=np.float32) / F["ppl"] + F["yTop"])[:, None, None]
    shade = np.clip((rows - 40) / 210, 0, 1) ** 1.3 * 0.36
    return np.clip(rgb * (1 - shade), 0, 1)


def run(out, samples=24, install=False, repo=None):
    os.makedirs(out, exist_ok=True)
    build(samples)
    raw = os.path.join(out, "tar_pits_raw.png")
    bpy.context.scene.render.film_transparent = False
    bpy.context.scene.render.filepath = raw
    bpy.ops.render.render(write_still=True)
    arr = np.asarray(Image.open(raw).convert("RGB"), np.float32) / 255.0
    arr = finish(arr)
    dst = os.path.join(out, "tar_pits.webp")
    Image.fromarray((arr * 255 + 0.5).astype(np.uint8), "RGB").save(dst, "WEBP", quality=84, method=6)
    print(f"[ground.tar_pits] {os.path.getsize(dst) // 1024} KB", flush=True)
    if install:
        shutil.copyfile(dst, os.path.join(repo, "public", "art", "ground", "tar_pits.webp"))
