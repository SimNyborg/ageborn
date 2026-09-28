"""Shared props: the stone-age club, dust clouds for deaths and impacts."""
import math
import random

import bmesh
import bpy
from mathutils import Vector

from . import core as C


def club(k, wood, flint, leather):
    """Knotted hardwood club along +X from the grip (origin). Returns objects."""
    L = 36.0 * k
    pts = [(-4.5 * k, 0, 0), (0, 0, 0), (L * 0.35, 0, 0.3 * k), (L * 0.6, 0, 0.1 * k),
           (L * 0.8, 0, -0.4 * k), (L * 0.95, 0, 0)]
    shaft = C.tube("club_shaft", pts, [1.5 * k, 1.35 * k, 1.7 * k, 2.3 * k, 3.0 * k, 3.1 * k], wood,
                   seg=14, sharp=None)
    C.displace(shaft, 0.35 * k, 0.6)
    rnd = random.Random(7)
    els = [((L * 0.86, 0, 0), (5.2 * k, 3.4 * k, 3.6 * k))]
    for _ in range(9):
        a = rnd.uniform(0, 2 * math.pi)
        x = rnd.uniform(0.7, 1.0) * L
        els.append(((x, 2.4 * k * math.cos(a), 2.6 * k * math.sin(a)),
                    (rnd.uniform(1.4, 2.2) * k,) * 3))
    head = C.blobs("club_head", els, wood, res=0.45)
    C.displace(head, 0.6 * k, 0.4)
    objs = [shaft, head]
    # flint teeth set into the head
    for i in range(6):
        a = math.radians(-60 + i * 40 + rnd.uniform(-8, 8))
        x = L * (0.8 + 0.035 * (i % 3))
        base = Vector((x, 3.0 * k * math.sin(a) * 0.7, 3.2 * k * math.cos(a)))
        tip = base + Vector((rnd.uniform(-0.6, 0.6) * k, math.sin(a) * 2.2 * k, math.cos(a) * 3.6 * k))
        t = C.tube("flint", [base, tip], [1.2 * k, 0.12 * k], flint, seg=5, sharp=20, flat=0.45)
        objs.append(t)
    grip = C.tube("club_grip", [(-3.6 * k, 0, 0), (3.2 * k, 0, 0)], [1.75 * k, 1.75 * k], leather, seg=12)
    C.displace(grip, 0.2 * k, 0.25)
    objs.append(grip)
    return objs


def dust_cloud(name, k, n=16, seed=3, parent=None, spread=(22, 7), color="#b5a68d"):
    m = dust_material(color)
    rnd = random.Random(seed)
    objs = []
    for i in range(n):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        o = C.from_bm(f"{name}_{i}", bm, m)
        o["base"] = (rnd.uniform(-1, 1) * spread[0] * k, rnd.uniform(-1, 1) * spread[1] * k,
                     rnd.uniform(1.5, 5) * k)
        o["r"] = rnd.uniform(5.0, 9.0) * k
        o["dir"] = (rnd.uniform(-1, 1), rnd.uniform(-0.5, 0.5), rnd.uniform(0.3, 1.0))
        o["delay"] = rnd.uniform(0, 0.15)
        o.hide_render = True
        o["is_fx"] = 1
        objs.append(o)
    return objs


def dust_material(color, density=0.45):
    """Volumetric dust: noisy density that fades to zero toward the puff's edge."""
    if "dust_vol" in C._MATS:
        return C._MATS["dust_vol"]
    m = bpy.data.materials.new("dust_vol")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    vol = nt.nodes.new("ShaderNodeVolumePrincipled")
    vol.inputs["Color"].default_value = C.col(color)
    vol.inputs["Anisotropy"].default_value = 0.2
    tc = nt.nodes.new("ShaderNodeTexCoord")
    ln = nt.nodes.new("ShaderNodeVectorMath")
    ln.operation = "LENGTH"
    nt.links.new(tc.outputs["Object"], ln.inputs[0])
    fall = nt.nodes.new("ShaderNodeMapRange")
    fall.inputs["From Min"].default_value = 0.35
    fall.inputs["From Max"].default_value = 1.0
    fall.inputs["To Min"].default_value = 1.0
    fall.inputs["To Max"].default_value = 0.0
    nt.links.new(ln.outputs["Value"], fall.inputs["Value"])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 2.2
    nz.inputs["Detail"].default_value = 5.0
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    nm = nt.nodes.new("ShaderNodeMapRange")
    nm.inputs["From Min"].default_value = 0.35
    nm.inputs["From Max"].default_value = 0.7
    nt.links.new(nz.outputs["Fac"], nm.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    nt.links.new(fall.outputs[0], mul.inputs[0])
    nt.links.new(nm.outputs[0], mul.inputs[1])
    mul2 = nt.nodes.new("ShaderNodeMath")
    mul2.operation = "MULTIPLY"
    mul2.inputs[1].default_value = density
    nt.links.new(mul.outputs[0], mul2.inputs[0])
    nt.links.new(mul2.outputs[0], vol.inputs["Density"])
    nt.links.new(vol.outputs[0], out.inputs["Volume"])
    m["team"] = 0
    C._MATS["dust_vol"] = m
    return m


def dust_state(objs, s, origin=(0, 0, 0), rig=None):
    """s in [0, 1]: burst, billow and rise, then shrink away. None hides the cloud."""
    for o in objs:
        if s is None:
            o.hide_render = True
            continue
        if rig is not None and o.parent is None:
            o.parent = rig
        u = max(0.0, (s - o["delay"]) / (1 - o["delay"]))
        if u <= 0:
            o.hide_render = True
            continue
        o.hide_render = False
        grow = 1 - (1 - min(1.0, u / 0.3)) ** 3
        shrink = 1.0 if u < 0.45 else max(0.0, 1 - (u - 0.45) / 0.55) ** 1.4
        sc = o["r"] * (0.35 + 0.9 * grow) * shrink
        if sc < 0.05:
            o.hide_render = True
            continue
        b, d = o["base"], o["dir"]
        spread = 1 + 0.9 * grow + 0.4 * u
        o.location = (origin[0] + b[0] * spread + d[0] * 5 * u, origin[1] + b[1] * spread,
                      origin[2] + b[2] + d[2] * 7 * u + 2 * u)
        o.scale = (sc, sc, sc * 0.85)
