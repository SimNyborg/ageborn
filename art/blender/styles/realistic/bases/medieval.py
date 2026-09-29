"""Medieval Age base, realistic style: the Keep. heightLu 330, widthLu 180.

A square Norman keep of weathered limestone ashlar (coursed blocks with recessed mortar, a battered
plinth, pilaster buttresses, arrow slits and two warm-lit windows) with a crenellated fighting top
and a slate-roofed stair turret at the back corner. A round gate tower stands in front of it, joined
by a short curtain wall; in front of the tower a low forebuilding holds the gate (an iron-studded
oak door under a portcullis, torches either side). The four turret mounts (`lib/world.BASE_MOUNTS`)
are real platforms whose top centre lands exactly on the mount point: the forebuilding roof (0), the
curtain wall-walk (1), the gate tower's fighting top (2) and a corbelled bartizan on the keep's
front corner (3). Team colour: two long heraldic banners with a fringe hang down the keep's face,
and the two flag clips fly team pennons from the keep top (front) and the stair turret (back).
Crumble: cracks and a lost merlon (1), a torn banner, a broken hoarding, rubble and a dark window
(2), a breach in the keep wall, the stair-turret roof knocked askew, more rubble (3).
Treasury: sacks and a barrel (1), an iron-bound chest of coin (2), a cart of gold plate (3).
"""
import math
import random
from types import SimpleNamespace

import bmesh
import bpy

from lib import core as C
from lib import mats as M
from lib import medieval as MD
from lib import world as W

AGE = "medieval"
YAW = -12.0
DEPTHS = [-18.0, -8.0, -18.0, -8.0]


def P(sx, sy, depth=0.0):
    """Character-space point that projects to screen (sx, sy) lu at world depth `depth`."""
    return C.place(sx, sy, depth, YAW)


# ------------------------------------------------------------------------------ materials
def ashlar(name, c1, c2, mortar, brick=(8.6, 4.6), bump=1.0, grime="#6e675c"):
    """Coursed limestone ashlar on UVs (u along the wall, v up): brick texture blocks in two tones,
    recessed mortar joints, a weathering noise and grime toward the foot of the wall."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], out.inputs["Surface"])
    uv = nt.nodes.new("ShaderNodeUVMap")
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset = 0.5
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.22
    br.inputs["Mortar Smooth"].default_value = 0.2
    br.inputs["Bias"].default_value = 0.0
    br.inputs["Brick Width"].default_value = brick[0]
    br.inputs["Row Height"].default_value = brick[1]
    br.inputs["Color1"].default_value = C.col(c1)
    br.inputs["Color2"].default_value = C.col(c2)
    br.inputs["Mortar"].default_value = C.col(mortar)
    nt.links.new(uv.outputs["UV"], br.inputs["Vector"])
    # weathering: large noise darkens / lightens blocks; small noise speckles the stone
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 0.035
    nz.inputs["Detail"].default_value = 5.0
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = 0.8
    mr.inputs["To Max"].default_value = 1.12
    nt.links.new(nz.outputs["Fac"], mr.inputs["Value"])
    nz2 = nt.nodes.new("ShaderNodeTexNoise")
    nz2.inputs["Scale"].default_value = 0.9
    nz2.inputs["Detail"].default_value = 6.0
    nt.links.new(tc.outputs["Object"], nz2.inputs["Vector"])
    mr2 = nt.nodes.new("ShaderNodeMapRange")
    mr2.inputs["To Min"].default_value = 0.88
    mr2.inputs["To Max"].default_value = 1.08
    nt.links.new(nz2.outputs["Fac"], mr2.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    nt.links.new(mr.outputs[0], mul.inputs[0])
    nt.links.new(mr2.outputs[0], mul.inputs[1])
    # rain streaks: noise stretched vertically darkens the stone in long runs
    stv = nt.nodes.new("ShaderNodeMapping")
    stv.inputs["Scale"].default_value = (0.35, 0.35, 0.02)
    nt.links.new(tc.outputs["Object"], stv.inputs["Vector"])
    stn = nt.nodes.new("ShaderNodeTexNoise")
    stn.inputs["Scale"].default_value = 1.0
    stn.inputs["Detail"].default_value = 3.0
    nt.links.new(stv.outputs[0], stn.inputs["Vector"])
    stm = nt.nodes.new("ShaderNodeMapRange")
    stm.inputs["From Min"].default_value = 0.45
    stm.inputs["From Max"].default_value = 0.7
    stm.inputs["To Min"].default_value = 1.0
    stm.inputs["To Max"].default_value = 0.8
    nt.links.new(stn.outputs["Fac"], stm.inputs["Value"])
    mul2 = nt.nodes.new("ShaderNodeMath")
    mul2.operation = "MULTIPLY"
    nt.links.new(mul.outputs[0], mul2.inputs[0])
    nt.links.new(stm.outputs[0], mul2.inputs[1])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    nt.links.new(br.outputs["Color"], mix.inputs[6])
    nt.links.new(mul2.outputs[0], mix.inputs[7])
    # grime toward the ground (object z)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    gz = nt.nodes.new("ShaderNodeMapRange")
    gz.inputs["From Min"].default_value = 0.0
    gz.inputs["From Max"].default_value = 40.0
    gz.inputs["To Min"].default_value = 0.55
    gz.inputs["To Max"].default_value = 0.0
    nt.links.new(sep.outputs["Z"], gz.inputs["Value"])
    gm = nt.nodes.new("ShaderNodeMix")
    gm.data_type = "RGBA"
    nt.links.new(gz.outputs[0], gm.inputs["Factor"])
    nt.links.new(mix.outputs[2], gm.inputs[6])
    gm.inputs[7].default_value = C.col(grime)
    nt.links.new(gm.outputs[2], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.88
    bsdf.inputs["Specular IOR Level"].default_value = 0.4
    # bump: recessed mortar + stone grain
    bn = nt.nodes.new("ShaderNodeBump")
    bn.inputs["Strength"].default_value = bump
    bn.inputs["Distance"].default_value = 0.6
    inv = nt.nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    nt.links.new(br.outputs["Fac"], inv.inputs[1])
    nz3 = nt.nodes.new("ShaderNodeTexNoise")
    nz3.inputs["Scale"].default_value = 1.6
    nz3.inputs["Detail"].default_value = 4.0
    nt.links.new(tc.outputs["Object"], nz3.inputs["Vector"])
    sm = nt.nodes.new("ShaderNodeMath")
    sm.operation = "MULTIPLY_ADD"
    nt.links.new(nz3.outputs["Fac"], sm.inputs[0])
    sm.inputs[1].default_value = 0.25
    nt.links.new(inv.outputs[0], sm.inputs[2])
    nt.links.new(sm.outputs[0], bn.inputs["Height"])
    nt.links.new(bn.outputs[0], bsdf.inputs["Normal"])
    m["team"] = 0
    return m


def uv_planar(o, cyl=None):
    """UVs for ashlar: u runs along the wall, v up. Box faces use their facing axis; with
    `cyl=(cx, cy)` the mesh is unrolled around a vertical axis (round towers)."""
    me = o.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    uvl = me.uv_layers.active.data
    for poly in me.polygons:
        n = poly.normal
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            if cyl is not None and abs(n.z) < 0.7:
                r = math.hypot(v.x - cyl[0], v.y - cyl[1])
                a = math.atan2(v.y - cyl[1], v.x - cyl[0])
                uvl[li].uv = (a * max(r, 1.0), v.z)
            elif abs(n.z) > 0.7:
                uvl[li].uv = (v.x, v.y)
            elif abs(n.x) > abs(n.y):
                uvl[li].uv = (v.y, v.z)
            else:
                uvl[li].uv = (v.x, v.z)
    return o


# ------------------------------------------------------------------------------ geometry helpers
def cbox(name, c, size, mat, bevel=0.6, rot_z=0.0):
    """A box centred at c (character space) with full sizes; UV-mapped for ashlar."""
    o = C.box(name, size[0], size[1], size[2], mat, bevel=bevel, loc=c, rot=(0, 0, rot_z))
    return uv_planar(o)


def merlons(name, x0, x1, y, z, mat, w=6.0, gap=4.0, h=7.0, d=4.0, along="x", skip=()):
    out = []
    n = int((x1 - x0 + gap) // (w + gap))
    start = x0 + ((x1 - x0) - (n * w + (n - 1) * gap)) / 2
    for i in range(n):
        if i in skip:
            continue
        c = start + i * (w + gap) + w / 2
        if along == "x":
            out.append(cbox(f"{name}{i}", (c, y, z + h / 2), (w, d, h), mat, bevel=0.5))
        else:
            out.append(cbox(f"{name}{i}", (y, c, z + h / 2), (d, w, h), mat, bevel=0.5))
    return out


def banner_mesh(name, top, width, length, mat, sway=0.0):
    """A long heraldic banner hanging from a pole: pleated wool with a swallow-tailed foot."""
    bm = bmesh.new()
    nu, nv = 10, 22
    vv = {}
    x0, y0, z0 = top
    for j in range(nv + 1):
        for i in range(nu + 1):
            u, v = i / nu, j / nv
            x = x0 - width / 2 + width * u
            z = z0 - length * v
            if v > 0.86:
                z = z0 - length * (0.86 + (v - 0.86) * (1.0 - 0.85 * max(0.0, 1 - abs(u - 0.5) / 0.3)))
            y = y0 - 0.9 * math.sin(u * 9.0 + v * 1.5) * (0.4 + 0.8 * v) - sway * v * v
            vv[(i, j)] = bm.verts.new((x, y, z))
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((vv[(i, j)], vv[(i + 1, j)], vv[(i + 1, j + 1)], vv[(i, j + 1)]))
    o = C.from_bm(name, bm, mat)
    so = o.modifiers.new("so", "SOLIDIFY")
    so.thickness = 0.8
    C.apply_mods(o)
    o.data.shade_smooth()
    return o


# ------------------------------------------------------------------------------ build
KX0, KX1, KY0, KY1, KH = -170.0, -60.0, -8.0, 80.0, 244.0     # keep (character space)
TR = 20.0                                                        # gate tower radius (the crown corbels out to 24.5)


def build():
    rig = C.Rig("keep_rig", BONES, yaw_deg=YAW)
    ctx = dict(rig=rig)
    stone = ashlar("ashlar", "#b5ac9a", "#9f9684", "#7e766a")
    stone2 = ashlar("ashlar2", "#a89f8c", "#978e7c", "#746c62", brick=(7.4, 4.2))
    trim = M.stone("#bdb4a2", "#9c9382", name="trim", bump=0.8)
    dark = M.dark("#141110", name="void")
    slate = C.mat("slate", "#4f5358", rough=0.6, noise=0.2, nscale=0.6, bump=0.8, stripes=2.2, ramp2="#43464b")
    oak = M.wood("#6b5847", "#4e4035", name="oak", stripes=1.2)
    oak_dk = M.wood("#4e4035", "#3c3129", name="oak_dk", stripes=1.2)
    iron = MD.iron()
    brass = MD.brass()
    team = MD.team_wool(name="bteam")
    charge = MD.linen("#d6cbb0", name="bcharge")
    fringe = MD.brass(name="bfringe")
    glow = M.glow("#ffb45a", 5.0, name="windowglow")
    fire = M.glow("#ffb45a", 8.0, name="fire")
    fire_core = M.glow("#fff0c8", 14.0, name="firecore")
    crack = M.dark("#2c2723", name="crack")
    moss = M.moss("#5d6a3a")

    def add(o, g, bone="body"):
        rig.rigid(W.grp(o, g), bone)
        return o

    # ---------------- the keep: a battered plinth, the wall block, pilasters, string course, parapet
    kx, ky = (KX0 + KX1) / 2, (KY0 + KY1) / 2
    kw, kd = KX1 - KX0, KY1 - KY0
    add(cbox("keep", (kx, ky, KH / 2), (kw, kd, KH), stone, bevel=0.8), "keep")
    # battered plinth (sloping foot)
    bmp = bmesh.new()
    lo = [(KX0 - 7, KY0 - 7), (KX1 + 7, KY0 - 7), (KX1 + 7, KY1 + 7), (KX0 - 7, KY1 + 7)]
    hi = [(KX0 - 0.5, KY0 - 0.5), (KX1 + 0.5, KY0 - 0.5), (KX1 + 0.5, KY1 + 0.5), (KX0 - 0.5, KY1 + 0.5)]
    vl = [bmp.verts.new((x, y, 0.0)) for x, y in lo]
    vh = [bmp.verts.new((x, y, 26.0)) for x, y in hi]
    for i in range(4):
        bmp.faces.new((vl[i], vl[(i + 1) % 4], vh[(i + 1) % 4], vh[i]))
    bmp.faces.new(vh)
    bmesh.ops.recalc_face_normals(bmp, faces=bmp.faces)
    plo = C.from_bm("plinth", bmp, stone2, sharp_deg=30)
    add(uv_planar(plo), "keep")
    for x in (KX0 + 1.5, (KX0 + KX1) / 2, KX1 - 1.5):
        add(cbox("pilaster", (x, KY0 - 1.8, KH / 2 + 12), (9.0, 4.0, KH - 24), stone, bevel=0.6), "keep")
    for z in (96.0, 176.0):
        add(cbox("string", (kx, ky, z), (kw + 5.0, kd + 5.0, 2.6), trim, bevel=0.6), "keep")
    add(cbox("corbelband", (kx, ky, KH - 3.0), (kw + 7.0, kd + 7.0, 5.0), trim, bevel=0.8), "keep")
    # parapet merlons on the front and the lane side (one front merlon falls at crumble 1)
    for i, o in enumerate(merlons("merlon", KX0 - 2, KX1 + 2, KY0 - 2.5, KH - 0.5, stone2, w=8.0, gap=5.0, h=10.0, d=4.0)):
        add(o, "merlon-0" if i == 2 else "keep")
    for o in merlons("merlonR", KY0, KY1, KX1 + 2.5, KH - 0.5, stone2, w=8.0, gap=5.0, h=10.0, d=4.0, along="y"):
        add(o, "keep")
    for o in merlons("merlonB", KX0 - 2, KX1 + 2, KY1 + 2.5, KH - 0.5, stone2, w=8.0, gap=5.0, h=10.0, d=4.0):
        add(o, "keep")
    # arrow slits and two lit windows on the front face; a dark window replaces one lit one at crumble 2
    for x, z in ((-156, 60), (-132, 200), (-84, 62), (-132, 150), (-72, 130), (-72, 200)):
        add(C.box("slit", 1.6, 1.4, 11.0, dark, bevel=0.2, loc=(x, KY0 - 0.2, z)), "keep")
        add(cbox("slitframe", (x, KY0 - 0.3, z), (4.2, 1.0, 14.0), trim, bevel=0.4), "keep")
    for i, (x, z) in enumerate(((-150, 112), (-110, 112))):
        add(cbox("winframe", (x, KY0 - 0.6, z), (9.0, 1.4, 16.0), trim, bevel=0.5), "keep")
        add(C.lathe("winarch", [(0.0, -0.8), (4.8, -0.8), (4.8, 0.8), (0.0, 0.8)], trim, seg=20, loc=(x, KY0 - 0.7, z + 7.6),
                    rot=(math.pi / 2, 0, 0)), "keep")
        add(C.box("winglow", 5.0, 1.0, 10.0, glow, bevel=0.2, loc=(x, KY0 - 0.9, z)), "win-1" if i == 1 else "keep")
        add(C.sphere("winglowtop", 2.5, glow, loc=(x, KY0 - 0.9, z + 5.0), scale=(1, 0.4, 1)), "win-1" if i == 1 else "keep")
        if i == 1:
            add(C.box("windark", 5.0, 1.0, 10.0, dark, bevel=0.2, loc=(x, KY0 - 0.95, z)), "win+2")
            add(C.sphere("windarktop", 2.5, dark, loc=(x, KY0 - 0.95, z + 5.0), scale=(1, 0.4, 1)), "win+2")

    # ---------------- the stair turret at the back corner, slate cone roof (knocked askew at crumble 3)
    sx, sy = KX0 + 10, KY1 - 8
    st_t = C.cyl("stairturret", 13.0, 13.0, KH + 36, stone, seg=28, loc=(sx, sy, 0))
    add(uv_planar(st_t, cyl=(sx, sy)), "keep")
    add(C.lathe("stairband", [(13.0, 0.0), (15.0, 1.2), (15.0, 4.0), (13.0, 5.0)], trim, seg=28, loc=(sx, sy, KH + 30)), "keep")
    for g, tilt in (("roof-2", 0.0), ("roof+3", 24.0)):
        rf = C.lathe("stairroof", [(0.0, 0.0), (16.5, 0.0), (15.8, 1.6), (0.0, 34.0)], slate, seg=28, loc=(sx, sy, KH + 35))
        ball = C.lathe("roofball", [(0.0, 0.0), (1.4, 1.0), (1.2, 3.0), (0.0, 4.0)], brass, seg=12, loc=(sx, sy, KH + 69))
        for o in (rf, ball):
            if tilt:
                MD.rot_about(o, (sx - 16.0, sy, KH + 35), -tilt, "Y")
                o.data.transform(__import__("mathutils").Matrix.Translation((-2.0, 0.0, -9.0)))
            add(o, g)

    # ---------------- the gatehouse (forebuilding) with the gate; its roof is mount 0
    m0 = P(*W.BASE_MOUNTS[0], DEPTHS[0])
    fx0, fx1 = m0[0] - 28.0, m0[0] + 24.0
    fy0, fy1 = m0[1] - 17.0, 16.0
    fh = m0[2]
    add(cbox("fore", ((fx0 + fx1) / 2, (fy0 + fy1) / 2, (fh - 2.5) / 2), (fx1 - fx0, fy1 - fy0, fh - 2.5), stone, bevel=0.6), "fore")
    add(cbox("forecorbel", ((fx0 + fx1) / 2, (fy0 + fy1) / 2, fh - 4.6), (fx1 - fx0 + 3.0, fy1 - fy0 + 3.0, 2.4), trim, bevel=0.5), "fore")
    add(cbox("foredeck", ((fx0 + fx1) / 2, (fy0 + fy1) / 2, fh - 1.6), (fx1 - fx0 + 4.0, fy1 - fy0 + 4.0, 3.2), trim, bevel=0.5), "fore")
    for o in merlons("fmerlonR", fy0 + 2, fy1, fx1 + 1.2, fh, stone2, w=6.0, gap=4.0, h=6.5, d=3.2, along="y"):
        add(o, "fore")
    gx = (fx0 + fx1) / 2 - 4.0
    add(C.box("gatevoid", 15.0, 1.4, 24.0, dark, bevel=0.2, loc=(gx, fy0 - 0.3, 12.0)), "fore")
    add(C.lathe("gatearch", [(0.0, -1.4), (7.5, -1.4), (7.5, 1.4), (0.0, 1.4)], dark, seg=24, loc=(gx, fy0 - 0.3, 24.0),
                rot=(math.pi / 2, 0, 0), scale=(1.0, 1.0, 1.4)), "fore")
    add(C.lathe("gatetrim", [(7.6, -1.6), (10.0, -1.6), (10.0, 1.6), (7.6, 1.6)], trim, seg=24, loc=(gx, fy0 - 0.8, 24.0),
                rot=(math.pi / 2, 0, 0), scale=(1.0, 1.0, 1.4)), "fore")
    for sxs in (-1, 1):
        add(cbox("jamb", (gx + sxs * 8.8, fy0 - 0.8, 12.0), (2.6, 3.0, 24.0), trim, bevel=0.4), "fore")
    add(C.box("door", 13.6, 1.4, 26.0, oak, bevel=0.3, loc=(gx, fy0 + 0.4, 13.0)), "fore")
    for z in (5.0, 13.0, 21.0):
        add(C.box("strap", 13.8, 1.6, 1.2, iron, bevel=0.2, loc=(gx, fy0 + 0.2, z)), "fore")
    for i in range(6):
        add(C.box("portcullis", 1.0, 1.0, 9.0, iron, bevel=0.2, loc=(gx - 6.0 + 2.4 * i, fy0 - 1.2, 28.0)), "fore")
    add(C.box("portcullisbar", 15.0, 1.0, 1.0, iron, bevel=0.2, loc=(gx, fy0 - 1.2, 25.0)), "fore")
    for x, z in ((fx0 + 7.0, 32.0), (fx1 - 6.0, 32.0)):
        add(C.box("fslit", 1.6, 1.4, 9.0, dark, bevel=0.2, loc=(x, fy0 - 0.2, z)), "fore")
    ctx["torches"] = []
    for sxs in (-1, 1):
        tx, ty, tz = gx + sxs * 16.0, fy0 - 2.6, 30.0
        add(C.tube("sconce", [(tx, fy0 - 0.4, tz - 6.0), (tx, ty, tz - 3.0), (tx, ty, tz)], [0.5, 0.5, 0.5], iron, seg=6), "fore")
        add(C.lathe("torchhead", [(0.1, 0.0), (1.8, 1.0), (1.6, 3.6), (0.1, 4.0)], M.rope("#8c7a5c", name="torchrag"), seg=10,
                    loc=(tx, ty, tz)), "fore")
        add(C.blobs("flame", [((tx, ty - 0.3, tz + 7.0), (2.2, 1.8, 4.6))], fire, res=0.5), "torch-2" if sxs < 0 else "fore")
        add(C.blobs("flamecore", [((tx, ty - 1.0, tz + 5.8), (1.1, 0.9, 2.4))], fire_core, res=0.35), "torch-2" if sxs < 0 else "fore")
        ctx["torches"].append((tx, ty, tz + 7.0))

    # ---------------- the round gate tower rising behind the gatehouse, a corbelled crown (mount 2)
    m2 = P(*W.BASE_MOUNTS[2], DEPTHS[2])
    tcx, tcy = m2[0], 2.0
    top2 = m2[2]
    tw = C.cyl("tower", TR, TR, top2 - 12.0, stone, seg=40, loc=(tcx, tcy, 0))
    add(uv_planar(tw, cyl=(tcx, tcy)), "tower")
    add(C.lathe("towerstring", [(TR, 0.0), (TR + 2.0, 1.0), (TR + 2.0, 3.2), (TR, 4.0)], trim, seg=40, loc=(tcx, tcy, 118.0)), "tower")
    for i in range(16):                        # machicolation corbels carrying the crown
        a = 2 * math.pi * i / 16
        if math.sin(a) > 0.6:
            continue
        add(C.box("mcorbel", 2.6, 5.5, 9.0, trim, bevel=0.4, loc=(tcx + (TR + 2.2) * math.cos(a), tcy + (TR + 2.2) * math.sin(a), top2 - 16.0),
                  rot=(0, 0, a - math.pi / 2)), "tower")
    crown = C.cyl("towercrown", TR + 4.5, TR + 4.5, 10.0, stone2, seg=40, loc=(tcx, tcy, top2 - 13.0))
    add(uv_planar(crown, cyl=(tcx, tcy)), "tower")
    add(C.cyl("towerdeck", TR + 5.0, TR + 5.0, 3.2, trim, seg=40, loc=(tcx, tcy, top2 - 3.2)), "tower")
    for i in range(16):
        a = 2 * math.pi * i / 16
        if math.sin(a) < 0.25:                # merlons at the back of the ring only: the turret reads in front
            continue
        add(cbox(f"tmerlon{i}", (tcx + (TR + 3.4) * math.cos(a), tcy + (TR + 3.4) * math.sin(a), top2 + 4.0), (6.0, 3.4, 8.0),
                 stone2, bevel=0.4, rot_z=a + math.pi / 2), "tower")
    for z, a in ((78.0, -0.35), (148.0, -0.1)):
        x = tcx + (TR - 0.2) * math.cos(-math.pi / 2 + a)
        y = tcy + (TR - 0.2) * math.sin(-math.pi / 2 + a)
        add(C.box("tslit", 1.6, 1.4, 11.0, dark, bevel=0.2, loc=(x, y, z), rot=(0, 0, a)), "tower")

    # ---------------- the curtain wall between keep and tower; a corbelled wall-walk at mount 1
    m1 = P(*W.BASE_MOUNTS[1], DEPTHS[1])
    wx0, wx1 = KX1 - 1.0, tcx - TR + 3.0
    wall_y0, wall_y1 = -12.0, 8.0
    wtop = m1[2]
    add(cbox("curtain", ((wx0 + wx1) / 2, (wall_y0 + wall_y1) / 2, (wtop - 2.0) / 2), (wx1 - wx0, wall_y1 - wall_y0, wtop - 2.0), stone2,
             bevel=0.6), "wall")
    for i in range(5):
        x = wx0 + 5.0 + i * (wx1 - wx0 - 10.0) / 4
        add(C.box("wcorbel", 3.0, 12.0, 7.0, trim, bevel=0.4, loc=(x, m1[1] - 1.0, wtop - 8.5)), "wall")
    add(cbox("walk", ((wx0 + wx1) / 2, (m1[1] - 10.0 + wall_y1) / 2, wtop - 1.6), (wx1 - wx0 + 2, wall_y1 - m1[1] + 10.0, 3.2), trim,
             bevel=0.5), "wall")
    for o in merlons("wmerlon", wx0, wx1, wall_y1 - 1.6, wtop, stone2, w=7.0, gap=4.5, h=8.0, d=3.4):
        add(o, "wall")
    # a timber hoarding hangs below the wall-walk (its rail breaks at crumble 2)
    for i, x in enumerate(range(int(wx0) + 5, int(wx1) - 2, 8)):
        add(C.tube("strut", [(x, wall_y0 - 0.5, wtop - 24.0), (x, m1[1] - 8.0, wtop - 13.0)], [0.9, 0.9], oak, seg=6), "wall")
    add(cbox("hoardrail", ((wx0 + wx1) / 2, m1[1] - 10.8, wtop - 12.5), (wx1 - wx0 - 2, 1.2, 1.6), oak_dk, bevel=0.3), "hoard-1")
    add(cbox("hoardrail_b", ((wx0 + wx1) / 2 - 4, m1[1] - 11.4, wtop - 17.0), (wx1 - wx0 - 10, 1.2, 1.6), oak_dk, bevel=0.3,
             rot_z=0.08), "hoard+2")

    # ---------------- the corbelled bartizan on the keep's front corner (mount 3)
    m3 = P(*W.BASE_MOUNTS[3], DEPTHS[3])
    bx, by, bz = m3
    add(C.cyl("bartizan", 12.0, 12.0, 18.0, stone2, seg=28, loc=(bx, by, bz - 20.4)), "keep")
    for i in range(4):
        r = 12.0 - 2.4 * i
        add(C.cyl("corbel", r, r, 3.4, trim, seg=28, loc=(bx, by, bz - 20.4 - 3.4 * (i + 1))), "keep")
    add(C.cyl("bartdeck", 13.6, 13.6, 2.4, trim, seg=28, loc=(bx, by, bz - 2.4)), "keep")
    for i in range(10):
        a = 2 * math.pi * i / 10
        if math.sin(a) < 0.2:
            continue
        add(cbox(f"bmerlon{i}", (bx + 12.6 * math.cos(a), by + 12.6 * math.sin(a), bz + 3.5), (5.0, 3.0, 7.0), stone2, bevel=0.35,
                 rot_z=a + math.pi / 2), "keep")

    # ---------------- team heraldry: two long banners down the keep face, with fringe and a pale charge
    for i, x in enumerate((-160.0, -104.0)):
        top = (x, KY0 - 3.4, KH - 8.0)
        bn = banner_mesh(f"kbanner{i}", top, 22.0, 96.0, team, sway=0.6)
        C.team(bn)
        add(bn, "banner-1" if i == 0 else "keep")
        add(C.tube("kbpole", [(x - 13.5, KY0 - 3.2, KH - 7.0), (x + 13.5, KY0 - 3.2, KH - 7.0)], [0.9, 0.9], oak_dk, seg=8), "keep")
        for sxs in (-1, 1):
            add(C.tube("kbrope", [(x + sxs * 12.5, KY0 - 3.0, KH - 7.0), (x + sxs * 12.5, KY0 - 1.0, KH - 1.5)], [0.4, 0.4],
                       M.rope("#8c7a5c", name="brope"), seg=5), "keep")
        for k in range(10):
            fx_ = x - 10.0 + 2.2 * k
            add(C.tube("kbfringe", [(fx_, KY0 - 3.6, KH - 8.0 - 81.5), (fx_, KY0 - 3.8, KH - 8.0 - 84.8)], [0.5, 0.35], fringe, seg=5),
                "banner-1" if i == 0 else "keep")
        ch = C.blobs("kbcharge", [((x, KY0 - 4.6, KH - 44.0), (2.4, 0.6, 16.0)), ((x, KY0 - 4.6, KH - 36.0), (8.4, 0.6, 2.4))],
                     charge, res=0.45)
        add(ch, "banner-1" if i == 0 else "keep")
        if i == 0:
            torn = banner_mesh("kbanner_torn", top, 22.0, 52.0, team, sway=1.2)
            C.team(torn)
            add(torn, "banner+2")
            add(C.blobs("kbcharge_t", [((x, KY0 - 4.6, KH - 38.0), (2.4, 0.6, 10.0)), ((x, KY0 - 4.6, KH - 36.0), (8.4, 0.6, 2.4))],
                        charge, res=0.45), "banner+2")

    # ---------------- moss, ivy-dark streaks at the foot
    for i, (x, y, z, r) in enumerate(((-168, KY0 - 6, 3, 8), (-120, KY0 - 6, 2, 6), (tcx - 18, tcy - 20, 2, 6))):
        mo = C.blobs(f"moss{i}", [((x, y, z), (r, 2.4, 2.4))], moss, res=0.5)
        C.displace(mo, 0.6, 0.8)
        add(mo, "keep")

    # ---------------- crumble details: cracks, a breach, rubble
    for i, (pts, g) in enumerate((([(-140, 238), (-136, 222), (-142, 206), (-138, 190)], "crack+1"),
                                  ([(-96, 172), (-90, 158), (-95, 142)], "crack+2"),
                                  ([(-22, 150), (-16, 136), (-20, 120)], "crack+2"),
                                  ([(-176, 120), (-170, 104), (-174, 90)], "crack+3"))):
        jag = []
        for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
            for k in range(3):
                u = k / 3
                jag.append((xa + (xb - xa) * u + (1.6 if k % 2 else -1.2), ya + (yb - ya) * u))
        jag.append(pts[-1])
        cr = C.tube(f"crack{i}", [P(x, y, -70) for x, y in jag], [0.9] * len(jag), crack, seg=5, flat=0.5)
        add(cr, g)
    breach = C.blobs("breach", [((-132, KY0 - 0.5, 112), (14, 2.5, 18)), ((-124, KY0 - 0.5, 100), (9, 2.5, 10))], dark, res=0.8)
    C.displace(breach, 2.0, 0.2)
    add(breach, "breach+3")
    for i, (sxx, sy_, sz) in enumerate(((-150, 104, 10), (-116, 96, 8), (-128, 126, 9))):
        o = C.blobs(f"breachstone{i}", [((sxx, KY0 - 3.0, sy_), (sz, 4.0, sz * 0.7))], stone2, res=0.8)
        C.displace(o, 1.4, 0.3)
        add(o, "breach+3")
    rnd = random.Random(9)
    for stage, n in ((1, 3), (2, 4), (3, 5)):
        for i in range(n):
            sxx = rnd.uniform(-180, -20)
            d = rnd.uniform(-60, -30)
            r = rnd.uniform(4.0, 8.0)
            o = C.blobs(f"rubble{stage}_{i}", [(P(sxx, r * 0.5, d), (r * 1.2, r, r * 0.7))], stone2 if i % 2 else trim, res=0.7)
            C.displace(o, 1.0, 0.35)
            add(o, f"rubble+{stage}")

    # ---------------- flags: team pennons on poles, one on the keep top (front), one on the stair turret
    for name, base, h in FLAG_POLES:
        add(C.tube(name + "pole", [base, (base[0], base[1], base[2] + h + 2)], [1.2, 1.0], oak_dk, seg=8), name)
        cl = C.tube(name + "cloth", [(base[0] - 1 - 7.5 * i, base[1], base[2] + h - 5 - 0.25 * i * i) for i in range(5)],
                    [7.0, 6.8, 6.2, 5.2, 3.6], team, seg=12, flat=0.14)
        C.team(cl)
        rig.skin(W.grp(cl, name), [name + "0", name + "1", name + "2"], soft=4.0)
        add(C.lathe(name + "fin", [(0.0, 0.0), (1.4, 0.6), (1.1, 2.8), (0.0, 5.2)], brass, seg=10,
                    loc=(base[0], base[1], base[2] + h + 2)), name)

    # ---------------- treasury: 1 sacks and a barrel, 2 an iron-bound chest of coin, 3 a cart of gold plate
    sack = M.burlap("#a8966e", name="sack")
    for i, (sxx, d) in enumerate(((-66, -64), (-58, -70), (-72, -72))):
        o = C.blobs(f"sack{i}", [(P(sxx, 6, d), (6.0, 5.0, 6.5)), (P(sxx, 12.5, d), (2.2, 2.0, 1.6))], sack, res=0.5)
        C.displace(o, 0.5, 0.8)
        add(o, "treasury1")
    bc = P(-82, 0, -62)
    add(C.lathe("barrel", [(0.0, 0.0), (6.0, 0.0), (7.0, 7.0), (6.0, 14.0), (0.0, 14.0)], M.wood("#7a6450", "#5a4a3c", name="barrel",
                stripes=0.2), seg=20, loc=bc), "treasury1")
    for z in (2.5, 11.5):
        add(C.lathe("hoop", [(6.3 + 0.35 * math.sin(z / 14 * math.pi), -0.6), (6.8 + 0.35 * math.sin(z / 14 * math.pi), 0.0),
                             (6.3 + 0.35 * math.sin(z / 14 * math.pi), 0.6)], iron, seg=20, loc=(bc[0], bc[1], bc[2] + z)), "treasury1")
    cc = P(-118, 0, -64)
    add(C.box("chest", 20.0, 12.0, 11.0, oak, bevel=0.6, loc=(cc[0], cc[1], cc[2] + 5.5)), "treasury2")
    add(C.cyl("chestlid", 6.2, 6.2, 20.0, oak, seg=16, loc=(cc[0] - 10.0, cc[1] - 1.0, cc[2] + 12.0), rot=(0, math.pi / 2, 0),
              scale=(1, 1, 1)), "treasury2")
    for x in (-7.0, 0.0, 7.0):
        add(C.box("chestband", 1.4, 12.6, 11.6, iron, bevel=0.2, loc=(cc[0] + x, cc[1], cc[2] + 5.8)), "treasury2")
    gold = MD.brass(name="gold", color="#b89a58")
    coins = C.blobs("coins", [((cc[0] + dx, cc[1] - 7.0 + dy, cc[2] + 0.8), (3.0, 2.4, 1.0)) for dx, dy in ((-8, 0), (-3, -2), (3, 0), (8, -2))],
                    gold, res=0.4)
    add(coins, "treasury2")
    kc = P(-158, 0, -60)
    add(C.box("cartbed", 30.0, 16.0, 3.0, oak, bevel=0.5, loc=(kc[0], kc[1], kc[2] + 10.0)), "treasury3")
    for sxs in (-1, 1):
        for sw in (-1, 1):
            add(C.cyl("cartwheel", 6.0, 6.0, 2.0, oak_dk, seg=16, loc=(kc[0] + sxs * 9.0, kc[1] + sw * 9.0, kc[2] + 6.0),
                      rot=(math.pi / 2, 0, 0)), "treasury3")
    for i, (dx, dz) in enumerate(((-8, 13.5), (-2, 14.0), (5, 13.8), (10, 13.2), (0, 17.0), (-5, 16.4))):
        add(C.cyl("plate", 3.4, 3.4, 0.8, gold, seg=16, loc=(kc[0] + dx, kc[1] - 2.0, kc[2] + dz), rot=(math.radians(60 + 12 * i), 0, 0)),
            "treasury3")
    add(C.lathe("goblet", [(0.0, 0.0), (2.2, 0.0), (0.5, 1.0), (0.5, 4.0), (2.4, 6.0), (2.6, 8.4), (0.0, 7.4)], gold, seg=16,
                loc=(kc[0] + 3.0, kc[1] - 3.0, kc[2] + 11.5)), "treasury3")
    return ctx


FLAG_POLES = [("flagA", (-104.0, -2.0, KH + 2.0), 42), ("flagB", (KX0 + 10.0, KY1 - 8.0, KH + 72.0), 30)]
BONES = {"root": ((0, 0, 0), (0, 0, 10), None), "body": ((0, 0, 0), (0, 0, 10), "root")}
for _n, _b, _h in FLAG_POLES:
    _prev = "body"
    for _i in range(3):
        _p0 = (_b[0] - 1 - 9 * _i, _b[1], _b[2] + _h - 5)
        _p1 = (_b[0] - 1 - 9 * (_i + 1), _b[1], _b[2] + _h - 5)
        BONES[f"{_n}{_i}"] = (_p0, _p1, _prev)
        _prev = f"{_n}{_i}"


def pose(ctx, clip, t):
    rig = ctx["rig"]
    rig.rest()
    i = W.frame_of(CLIPS[clip], t)
    W.base_visibility(ctx, clip, i)
    g = bpy.data.objects.get("ground")
    if g is not None:
        g.hide_render = clip.startswith("flag")          # a flag frame has no shadow on the ground
    if clip.startswith("flag"):
        ph = 2 * math.pi * i / 4 + (1.7 if clip == "flagB" else 0.0)
        for k in range(3):
            a = ph - k * 1.25
            rig.set(f"{clip}{k}", r=math.radians(-6 * math.cos(a) - 4), rz=math.radians(16 * math.sin(a) * (0.6 if k == 0 else 1.0)))


def clips():
    return W.base_clips()


CLIPS = {c.name: c for c in W.base_clips()}


def _lights():
    out = []
    m0 = C.place(*W.BASE_MOUNTS[0], DEPTHS[0], YAW)
    gx = (m0[0] - 28.0 + m0[0] + 24.0) / 2 - 4.0
    fy0 = m0[1] - 17.0
    for sxs, cm in ((-1, 2), (1, 3)):
        out.append(dict(zip(("x", "y"), W.pivot_lu((gx + sxs * 16.0, fy0 - 2.6, 37.0), YAW)), crumbleMax=cm, r=20))
    out.append(dict(zip(("x", "y"), W.pivot_lu((-150.0, KY0 - 0.9, 112.0), YAW)), crumbleMax=3, r=34))
    out.append(dict(zip(("x", "y"), W.pivot_lu((-110.0, KY0 - 0.9, 112.0), YAW)), crumbleMax=1, r=34))
    return out


MODULE = SimpleNamespace(
    SLUG="medieval", FILE="medieval", NAME="Keep", AGE=AGE, KIND="base", VISUAL_ID="base.medieval", HEIGHT_LU=330,
    PX1=1.025, SCALE1=1.25, CANVAS=(300, 384), FEET=(252, 20), YAW=YAW,
    ANCHORS={"head": (-90.0, 330), "hitCenter": (-72.0, 148.5)},
    TRACKERS={f"mount{i}": ("body", C.place(mx, my, d, YAW)) for i, ((mx, my), d) in enumerate(zip(W.BASE_MOUNTS, DEPTHS))},
    EXTRA_META={"kind": "base", "age": AGE, "widthLu": 180, "mountsLu": [list(m) for m in W.BASE_MOUNTS],
                "flags": [{"clip": "flagA", "crumbleMax": 2, "z": "front"}, {"clip": "flagB", "crumbleMax": 3, "z": "back"}],
                "lightsLu": _lights(),
                "smokeLu": [{"x": -112.0, "y": 252.0, "crumbleMin": 2}, {"x": -20.0, "y": 186.0, "crumbleMin": 3},
                            {"x": -132.0, "y": 118.0, "crumbleMin": 3}],
                "hornLu": [-100, 360]},
    build=build, pose=pose, clips=clips, LREF=None)
