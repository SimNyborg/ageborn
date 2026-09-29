"""Bronze Age base, realistic style: the Ziggurat. heightLu 330, widthLu 190.

A Sumerian temple-mount: three receding tiers of baked brick laid in bitumen over a mud-brick core,
their battered faces broken by buttress panels, a darker string course and a coping at every terrace,
long team banners hanging between the buttresses, and on the summit a whitewashed shrine under a team
awning. The tiers step back in depth as well as in height, so their terraces are real platforms. In
front stands a square gate tower (a corbelled timber balcony at the top) with a gatehouse at its
foot behind cedar doors studded with bronze, bronze tripod braziers burning on the terrace corners.
The four turret mounts (`lib/world.BASE_MOUNTS`, exported as `anchorsLu.mount0..3`): the gatehouse
roof, the first terrace, the tower balcony and the third terrace, each top exactly on its mount.
Crumble: cracks and fallen bricks (1), the balcony rail and a banner torn away, a brazier knocked over
and rubble (2), the shrine awning torn and the summit broken, more rubble (3).
Treasury: amphorae and grain sacks (1), oxhide copper ingots and bronze vessels (2), ivory tusks and
a cauldron on a tripod (3).
"""
import math
import random
from types import SimpleNamespace

import bpy

from lib import bronze as BZ
from lib import core as C
from lib import mats as M
from lib import world as W

AGE = "bronze"
YAW = -12.0
DEPTHS = [-44.0, -30.0, -14.0, 8.0]


def P(sx, sy, depth=0.0):
    """Character-space point that projects to screen (sx, sy) lu at world depth `depth`."""
    return C.place(sx, sy, depth, YAW)


def _brick(name, base, dark, mortar="#6e5e4c", scale=(0.125, 0.16), weather=0.08):
    """Baked brick facing: a brick texture (object coordinates) laid in dark bitumen mortar, colour
    and roughness variation, rain streaks down the faces."""
    m = C.mat(name, base, rough=0.88, noise=0.2, nscale=0.18, bump=0.8, ramp2=dark)
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    # the brick texture is 2D (x, y): lay it on the walls as (x + y, z), so the courses run horizontally
    # on the front and the side faces alike
    sp = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sp.inputs[0])
    ad = nt.nodes.new("ShaderNodeMath")
    ad.operation = "ADD"
    nt.links.new(sp.outputs["X"], ad.inputs[0])
    nt.links.new(sp.outputs["Y"], ad.inputs[1])
    cb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(ad.outputs[0], cb.inputs["X"])
    nt.links.new(sp.outputs["Z"], cb.inputs["Y"])
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale[0], scale[1], 1.0)
    nt.links.new(cb.outputs[0], mp.inputs["Vector"])
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.03
    br.inputs["Bias"].default_value = 0.0
    br.inputs["Brick Width"].default_value = 0.5
    br.inputs["Row Height"].default_value = 0.25
    br.inputs["Color1"].default_value = (1.0, 1.0, 1.0, 1.0)
    br.inputs["Color2"].default_value = (0.84, 0.84, 0.84, 1.0)
    br.inputs["Mortar"].default_value = C.col(mortar)
    nt.links.new(mp.outputs[0], br.inputs["Vector"])
    src = bsdf.inputs["Base Color"].links[0].from_socket
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type, mul.blend_type = "RGBA", "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(src, mul.inputs[6])
    nt.links.new(br.outputs["Color"], mul.inputs[7])
    # vertical rain streaks: a noise stretched along Z darkens the faces a little
    sm = nt.nodes.new("ShaderNodeMapping")
    sm.inputs["Scale"].default_value = (0.35, 0.35, 0.02)
    nt.links.new(tc.outputs["Object"], sm.inputs["Vector"])
    sn = nt.nodes.new("ShaderNodeTexNoise")
    sn.inputs["Scale"].default_value = 1.0
    sn.inputs["Detail"].default_value = 4.0
    nt.links.new(sm.outputs[0], sn.inputs["Vector"])
    sr = nt.nodes.new("ShaderNodeMapRange")
    sr.inputs["To Min"].default_value = 1.0 - weather
    sr.inputs["To Max"].default_value = 1.03
    nt.links.new(sn.outputs["Fac"], sr.inputs["Value"])
    mul2 = nt.nodes.new("ShaderNodeMix")
    mul2.data_type, mul2.blend_type = "RGBA", "MULTIPLY"
    mul2.inputs["Factor"].default_value = 1.0
    nt.links.new(mul.outputs[2], mul2.inputs[6])
    nt.links.new(sr.outputs[0], mul2.inputs[7])
    nt.links.new(mul2.outputs[2], bsdf.inputs["Base Color"])
    bn = nt.nodes.new("ShaderNodeBump")
    bn.inputs["Strength"].default_value = 0.5
    bn.inputs["Distance"].default_value = 0.4
    nt.links.new(br.outputs["Fac"], bn.inputs["Height"])
    old = bsdf.inputs["Normal"].links[0].from_socket
    nt.links.new(old, bn.inputs["Normal"])
    nt.links.new(bn.outputs[0], bsdf.inputs["Normal"])
    return m


def frustum(name, x0, x1, y0, y1, z0, z1, batter, mat):
    """A battered block (sloped faces): the base rectangle x0..x1, y0..y1 at z0, the top inset by
    `batter` at z1 (char space)."""
    import bmesh
    bm = bmesh.new()
    b = [bm.verts.new(v) for v in ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0))]
    t = [bm.verts.new(v) for v in ((x0 + batter, y0 + batter, z1), (x1 - batter, y0 + batter, z1), (x1 - batter, y1 - batter, z1),
                                   (x0 + batter, y1 - batter, z1))]
    bm.faces.new(list(reversed(b)))
    bm.faces.new(t)
    for i in range(4):
        bm.faces.new((b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=0.8, segments=2, affect="EDGES", profile=0.5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return C.from_bm(name, bm, mat, sharp_deg=40)


def shear_box(name, x0, x1, y0, y1, z0, z1, dx, dy, mat):
    """A box whose top face is shifted by (dx, dy): a buttress that follows a battered wall."""
    import bmesh
    bm = bmesh.new()
    b = [bm.verts.new(v) for v in ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0))]
    t = [bm.verts.new((v.co.x + dx, v.co.y + dy, z1)) for v in b]
    bm.faces.new(list(reversed(b)))
    bm.faces.new(t)
    for i in range(4):
        bm.faces.new((b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=0.5, segments=2, affect="EDGES", profile=0.5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return C.from_bm(name, bm, mat, sharp_deg=40)


def build():
    rig = C.Rig("base_rig", BONES, yaw_deg=YAW)
    ctx = dict(rig=rig)
    brick = _brick("bakedbrick", "#b79f7e", "#a48c6c")
    brick_dk = _brick("bakedbrick_dk", "#a48b6c", "#8f7a5e")
    mud = _brick("mudbrick", "#bba585", "#a89274", scale=(0.1, 0.13))
    coping = M.stone("#b8a888", "#9c8e74", name="coping", bump=0.5)
    plaster = M.stone("#d8d0bf", "#c4bba8", name="whitewash", bump=0.35)
    bitumen = M.dark("#2c2622", name="bitumen")
    cedar = M.wood("#6b4e36", "#54402e", name="cedar", stripes=1.4)
    dark = M.dark("#16110e", name="doorway")
    m = BZ.kit()
    cloth = M.team_cloth(name="bbanner")
    flagc = M.team_cloth(name="bflag")
    paint = m["team_paint"]
    fire = M.glow("#ffb45a", 8.0, name="fire")
    fire_core = M.glow("#fff0c8", 14.0, name="firecore")
    crack = M.dark("#2a231e", name="crack")
    rnd = random.Random(7)

    def add(o, g, bone="body"):
        rig.rigid(W.grp(o, g), bone)
        return o

    def S(sx, sy, d):
        return P(sx, sy, d)

    def cbox(name, x0, x1, y0, y1, z0, z1, mat, g="body", batter=0.0, bevel=0.8):
        """A block in character space (axis-aligned, so the rig's yaw shows its lane-side face)."""
        if batter:
            o = frustum(name, x0, x1, y0, y1, z0, z1, batter, mat)
        else:
            o = C.box(name, x1 - x0, y1 - y0, z1 - z0, mat, bevel=bevel, loc=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
        return add(o, g)

    # ---- the ziggurat: three tiers stepping back in height and depth (character space)
    TIERS = [(-204, -24, -52, 62, 0, 120), (-180, -40, -26, 56, 120, 186), (-150, -47, -12, 50, 186, 249)]
    BATTER = (9.0, 6.0, 4.0)
    ctx["tiers"] = TIERS
    for i, (x0, x1, y0, y1, z0, z1) in enumerate(TIERS):
        cbox(f"tier{i}", x0, x1, y0, y1, z0 - (1 if i else 0), z1, brick if i != 1 else brick_dk, batter=BATTER[i])
        bt = BATTER[i]
        cbox(f"coping{i}", x0 + bt - 0.6, x1 - bt + 0.6, y0 + bt - 0.6, y1 - bt + 0.6, z1 - 1.2, z1 + 1.6, coping, bevel=0.5)
        ci = bt * (1 - 13.8 / (z1 - z0))
        cbox(f"course{i}", x0 + ci - 0.5, x1 - ci + 0.5, y0 + ci - 0.5, y1 - ci + 0.5, z1 - 15, z1 - 12.6, bitumen, bevel=0.2)
        # buttresses: shallow pilasters across the front face and the lane-side face
        n = int((x1 - x0) / 24)
        f = (z1 - 4.0 - z0) / max(1.0, z1 - z0)
        for j in range(n):
            bx = x0 + 14 + j * (x1 - x0 - 28) / max(1, n - 1)
            add(shear_box(f"butt{i}_{j}", bx - 3.6, bx + 3.6, y0 - 1.2, y0 + 6, z0, z1 - 4.0, 0.0, bt * f, brick if i != 1 else brick_dk), "body")
        m_ = int((y1 - y0) / 26)
        for j in range(m_):
            by = y0 + 14 + j * (y1 - y0 - 28) / max(1, m_ - 1)
            add(shear_box(f"buttS{i}_{j}", x1 - 6, x1 + 1.2, by - 3.6, by + 3.6, z0, z1 - 4.0, -bt * f, 0.0, brick if i != 1 else brick_dk), "body")
    # the stair: a monumental flight climbing the first tier's face toward the lane gate
    for st in range(22):
        xs = -64 - 2.7 * st
        cbox(f"step{st}", xs - 26, xs, -66, -51, 0, 5.4 * (st + 1), coping if st % 2 else mud, bevel=0.3)
    cbox("stairwall", -128, -60, -67.5, -65.5, 0, 12, brick_dk, bevel=0.4)

    # ---- the summit shrine: whitewashed, a cedar door, a team awning on poles
    cbox("shrine", -152, -92, 6, 44, 248, 292, plaster, g="shrine-2", bevel=1.0)
    cbox("shrinedoor", -128, -114, 4.6, 8, 249, 274, dark, g="shrine-2", bevel=0.4)
    cbox("shrinecap", -155, -89, 4, 46, 291, 295, coping, g="shrine-2", bevel=0.5)
    cbox("shrine_b", -152, -108, 6, 44, 248, 280, plaster, g="shrine+3", bevel=1.0)
    for k, (x, z) in enumerate(((-140, 252), (-118, 254), (-100, 251))):
        add(C.blobs(f"shrinerubble{k}", [((x, -2, z), (6, 5, 4))], plaster, res=0.8), "shrine+3")
    aw = BZ.ribbon("awning", [(-158, -8, 302), (-121, -8, 306), (-84, -8, 302)], [34.0, 34.0, 34.0], paint, thick=0.6,
                   up=(0, 1, 0.12), center=0.0)
    C.displace(aw, 0.6, 0.9)
    C.team(aw)
    add(aw, "shrine-2")
    for x in (-158, -84):
        add(C.tube("awpole", [(x, -8, 249), (x, -8, 304)], [0.9, 0.8], cedar, seg=8), "shrine-2")
    awf = BZ.ribbon("awningfringe", [(-158, -8.6, 302), (-121, -8.6, 306), (-84, -8.6, 302)], [3.0, 3.0, 3.0], m["leather"], thick=0.4,
                    up=(0, 0, 1), center=1.0)
    add(awf, "shrine-2")
    torn = BZ.ribbon("awningtorn", [(-158, -8, 302), (-130, -8, 298), (-114, -6, 288)], [30.0, 22.0, 10.0], paint, thick=0.6,
                     up=(0, 1, 0.3), center=0.0)
    C.displace(torn, 1.2, 0.6)
    C.team(torn)
    add(torn, "shrine+3")

    # ---- the gate tower (front right) with a corbelled balcony (mount2) and the gatehouse (mount0)
    mpts = [P(mx, my, d) for (mx, my), d in zip(W.BASE_MOUNTS, DEPTHS)]
    ctx["mounts"] = mpts
    m2 = mpts[2]
    cbox("tower", -26, 8, -24, 18, 0, m2[2] - 4.0, brick, batter=1.6)
    cbox("towercourse", -25.2, 7.2, -23.4, 17.4, m2[2] - 26, m2[2] - 23.6, bitumen, bevel=0.2)
    for z in (70, 120):
        cbox(f"slit{z}", -12, -9, -25, -22, z, z + 12, dark, bevel=0.3)
    # mount2: the balcony floor (cedar planks on projecting corbel beams) exactly at the mount height
    cbox("balcony", m2[0] - 18, m2[0] + 16, m2[1] - 12, m2[1] + 20, m2[2] - 2.4, m2[2], cedar, bevel=0.3)
    for k in range(4):
        cbox(f"corbel{k}", m2[0] - 20, m2[0] + 17, m2[1] - 9 + k * 8, m2[1] - 6.6 + k * 8, m2[2] - 5.6, m2[2] - 2.4, cedar, bevel=0.3)
    for k in range(3):
        add(C.tube(f"strut{k}", [(m2[0] - 2, m2[1] - 8 + k * 8, m2[2] - 24), (m2[0] + 13, m2[1] - 8 + k * 8, m2[2] - 5)], [1.1, 1.0], cedar,
                   seg=8), "body")
    for k in range(6):
        add(C.tube(f"railpost{k}", [(m2[0] + 15, m2[1] - 10 + k * 5.6, m2[2]), (m2[0] + 15, m2[1] - 10 + k * 5.6, m2[2] + 8)], [0.6, 0.55],
                   m["dark_bronze"], seg=6), "rail-1")
    add(C.tube("railtop", [(m2[0] + 15, m2[1] - 11, m2[2] + 8), (m2[0] + 15, m2[1] + 19, m2[2] + 8)], [0.7, 0.7], m["dark_bronze"], seg=6),
        "rail-1")
    add(C.tube("railbroken", [(m2[0] + 15, m2[1] - 10, m2[2]), (m2[0] + 17, m2[1] - 11, m2[2] + 5)], [0.6, 0.5], m["dark_bronze"], seg=6),
        "rail+2")
    # mount0: the gatehouse in front of the tower, a flat roof exactly at the mount
    m0 = mpts[0]
    cbox("gatehouse", m0[0] - 17, m0[0] + 16, m0[1] - 10, -22, 0, m0[2] - 2.2, brick_dk, bevel=0.8)
    cbox("gateroof", m0[0] - 19, m0[0] + 18, m0[1] - 12, -20, m0[2] - 2.2, m0[2], coping, bevel=0.4)
    cbox("gatedoor", m0[0] - 7, m0[0] + 7, m0[1] - 10.8, m0[1] - 9.6, 0, 27, cedar, bevel=0.3)
    for i in range(12):
        add(C.sphere("doorstud", 0.6, m["polished"], seg=8, ring=6, loc=(m0[0] - 5 + (i % 4) * 3.4, m0[1] - 11.1, 5 + (i // 4) * 8)), "body")
    cbox("gatelintel", m0[0] - 9, m0[0] + 9, m0[1] - 11.4, m0[1] - 9.4, 27, 30, coping, bevel=0.3)
    # mount1 and mount3 are on the terraces (tiers 1 and 3); a paving slab marks each spot
    for i in (1, 3):
        mp = mpts[i]
        cbox(f"slab{i}", mp[0] - 12, mp[0] + 12, mp[1] - 8, mp[1] + 12, mp[2] - 1.6, mp[2], coping, bevel=0.4)
        cbox(f"slabfill{i}", mp[0] - 11, mp[0] + 11, mp[1] - 7, mp[1] + 11, mp[2] - 12, mp[2] - 1.0, brick_dk, bevel=0.4)

    # ---- long team banners hanging between the buttresses, leather hems, bronze bars, pale rosettes
    ctx["banners"] = []
    def face_y(tier, z, off=-1.0):
        x0, x1, y0, y1, z0, z1 = TIERS[tier]
        return y0 + BATTER[tier] * (z - z0) / (z1 - z0) + off

    for i, (bx, tier, top, h, g) in enumerate(((-177.3, 0, 103, 62, "body"), (-126.7, 0, 103, 62, "banner-1"), (-76.0, 0, 103, 62, "body"),
                                                (-152.0, 1, 169, 40, "body"), (-96.0, 1, 169, 40, "body"))):
        by = face_y(tier, top)
        pts = [(bx, face_y(tier, top - h * u), top - h * u) for u in (0.0, 0.33, 0.66, 1.0)]
        bn = BZ.ribbon(f"banner{i}", pts, [17.0, 17.0, 16.6, 16.2], cloth, thick=0.5, up=(1, 0, 0), center=0.5)
        C.displace(bn, 0.45, 1.2)
        C.team(bn)
        add(bn, g)
        add(C.tube(f"bannerbar{i}", [(bx - 10.5, by - 0.4, top + 1.0), (bx + 10.5, by - 0.4, top + 1.0)], [0.8, 0.8], m["dark_bronze"], seg=8), g)
        hem = BZ.ribbon(f"bannerhem{i}", [(x, y + 0.3, z) for x, y, z in pts], [18.2, 18.2, 17.8, 17.4], m["leather"], thick=0.3,
                        up=(1, 0, 0), center=0.5)
        add(hem, g)
        ro = C.cyl(f"rosette{i}", 3.6, 3.6, 0.4, m["blazon"], seg=16, loc=(bx, face_y(tier, top - h * 0.3) - 0.5, top - h * 0.3),
                   rot=(math.pi / 2 - math.atan(BATTER[tier] / (TIERS[tier][5] - TIERS[tier][4])), 0, 0))
        add(ro, g)
        for tsl in range(5):
            fx = bx - 7.0 + tsl * 3.5
            add(C.tube(f"tassel{i}{tsl}", [(fx, pts[-1][1], pts[-1][2]), (fx, pts[-1][1], pts[-1][2] - 3.4)], [0.35, 0.25], m["leather"], seg=5), g)
    tornb = BZ.ribbon("bannertorn", [(-126.7, face_y(0, 103), 103), (-126.1, face_y(0, 88), 88), (-128.1, face_y(0, 77), 77)], [17.0, 12.6, 5.6],
                      cloth, thick=0.5,
                      up=(1, 0, 0), center=0.5)
    C.displace(tornb, 0.8, 0.8)
    C.team(tornb)
    add(tornb, "banner+2")

    # ---- braziers: bronze tripods with fire on the terrace corners (lights)
    ctx["lights"] = []
    for k, (b, g) in enumerate((((-196, -44, 121.6), "body"), ((-32, -44, 121.6), "brazier-1"), ((-44, -20, 187.6), "body"),
                                 ((-166, -6, 250.6), "body"))):
        for a in (0, 2.1, 4.2):
            add(C.tube(f"trileg{k}", [(b[0] + 3.2 * math.cos(a), b[1] + 3.2 * math.sin(a), b[2]), (b[0], b[1], b[2] + 9)], [0.5, 0.5],
                       m["dark_bronze"], seg=6), g)
        add(C.lathe(f"bowl{k}", [(0.0, 8.0), (4.6, 9.0), (5.2, 12.0), (4.8, 12.4)], m["bronze"], seg=16, loc=b), g)
        fl = C.blobs(f"flame{k}", [((b[0], b[1] - 0.5, b[2] + 14.0), (3.6, 2.8, 3.4)), ((b[0] + 0.4, b[1] - 0.5, b[2] + 18.0), (2.4, 2.0, 3.4)),
                                   ((b[0] + 0.9, b[1] - 0.5, b[2] + 22.0), (1.2, 1.1, 2.6))], fire, res=0.5)
        C.displace(fl, 0.8, 0.8)
        add(fl, g)
        add(C.blobs(f"flamecore{k}", [((b[0], b[1] - 1.5, b[2] + 14.5), (1.6, 1.2, 3.2))], fire_core, res=0.4), g)
    add(C.lathe("fallenbowl", [(0.0, 0.0), (4.6, 1.0), (5.2, 4.0), (4.8, 4.4)], m["bronze"], seg=16, loc=(-44, -76, 4.0), rot=(0, 1.3, 0)),
        "brazier+2")
    for a in (0.3, 1.9):
        add(C.tube("fallenleg", [(-50 + 8 * math.cos(a), -80, 1.0), (-44, -76, 3.0)], [0.5, 0.5], m["dark_bronze"], seg=6), "brazier+2")

    # ---- crumble: cracks, fallen bricks, the broken summit
    for i, (y, pts) in enumerate(((-53.4, [(-60, 96), (-68, 80), (-62, 64), (-72, 48)]), (-27.4, [(-150, 170), (-142, 156), (-148, 140)]),
                                  (-13.4, [(-100, 240), (-94, 226), (-100, 210)]), (-25.0, [(-12, 160), (-4, 140), (-10, 122)]))):
        cr = C.tube(f"crack{i}", [(x, y, z) for x, z in pts], [1.8] * len(pts), crack, seg=6, flat=0.5)
        add(cr, "crack+1" if i < 2 else "crack+2")
    for i, (x, y, r) in enumerate(((-40, -84, 7), (-86, -82, 6), (-176, -70, 8), (4, -70, 6), (-116, -84, 5))):
        g = "rubble+1" if i < 2 else "rubble+2"
        rb = C.box(f"rubble{i}", r * 1.6, r, r * 0.8, brick_dk if i % 2 else brick, bevel=0.6)
        C.xform(rb, rot=(0.2 * i, 0.1, rnd.uniform(0, 3)), loc=(x, y, r * 0.4))
        add(rb, g)
    for i, (x, y, r) in enumerate(((-64, -92, 9), (-140, -86, 7), (-18, -90, 8))):
        rb = C.blobs(f"rubble3_{i}", [((x, y, r * 0.5), (r, r * 0.8, r * 0.6))], brick_dk, res=0.8)
        C.displace(rb, 1.4, 0.3)
        add(rb, "rubble+3")

    # ---- flags: team banners on tall poles, one on the summit (front), one on the back shoulder
    for name, base, h in FLAGS:
        add(C.tube(name + "pole", [base, (base[0], base[1], base[2] + h + 2)], [1.2, 1.0], cedar, seg=8), name)
        add(C.lathe(name + "fin", [(0.0, 0.0), (1.6, 0.8), (1.2, 2.4), (0.0, 4.4)], m["polished"], seg=10, loc=(base[0], base[1], base[2] + h + 2)),
            name)
        pts = [(base[0] - 0.8 - 7.0 * i, base[1], base[2] + h - 5.5 - 0.3 * i * i) for i in range(5)]
        cl = BZ.ribbon(name + "cloth", pts, [11.0, 10.6, 10.0, 9.0, 7.6], flagc, thick=0.5, up=(0, 0, 1), center=0.5)
        C.displace(cl, 0.5, 1.2)
        C.team(cl)
        rig.skin(W.grp(cl, name), [name + "0", name + "1", name + "2"], soft=4.0)
        fr = BZ.ribbon(name + "fringe", [(p[0], p[1], p[2] - 5.4) for p in pts], [1.6] * 5, m["leather"], thick=0.3, up=(0, 0, 1), center=0.5)
        rig.skin(W.grp(fr, name), [name + "0", name + "1", name + "2"], soft=4.0)

    # ---- treasury: 1 amphorae and grain sacks, 2 oxhide ingots and bronze vessels, 3 tusks and a cauldron
    clay = M.clay("#a0785c", name="amphora")
    for i in range(3):
        c = (-196 + i * 9, -72 - (i % 2) * 4, 0)
        add(C.lathe(f"amph{i}", [(0.0, 0.0), (1.2, 0.2), (4.2, 5.0), (4.6, 9.0), (3.4, 13.0), (1.2, 15.0), (1.4, 17.4), (0.0, 17.4)], clay, seg=18,
                    loc=c), "treasury1")
    for i in range(3):
        sk = C.blobs(f"sack{i}", [((-168 + i * 8, -74, 4.6), (5.0, 4.4, 5.4))], M.burlap("#a8966e", name="sack"), res=0.5)
        C.displace(sk, 0.6, 0.6)
        add(sk, "treasury1")
    copper = BZ.bronze("copper", "#7e6450", "#5f7a68", rough=0.5, amount=0.35)
    for i in range(6):
        add(C.box(f"ingot{i}", 10, 7, 1.6, copper, bevel=0.5, loc=(-146 + (i % 3) * 11, -80, 0.8 + (i // 3) * 1.8)), "treasury2")
    for i in range(2):
        add(C.lathe(f"vessel{i}", [(0.0, 0.0), (3.0, 0.2), (5.0, 3.0), (5.0, 6.0), (3.6, 8.0), (4.2, 9.0)], m["bronze"], seg=18,
                    loc=(-108 + i * 12, -80, 0)), "treasury2")
    ivory = M.ivory("#ddd0b2")
    for sg in (-1, 1):
        t0 = (-86 + sg * 6, -86, 0.5)
        tk = C.tube("ttusk", [t0, (t0[0] + 14, t0[1] - 4 * sg, t0[2] + 8), (t0[0] + 24, t0[1] - 6 * sg, t0[2] + 22)], [3.2, 2.5, 0.5], ivory, seg=12)
        add(tk, "treasury3")
    c = (-62, -80, 0)
    for a in (0, 2.1, 4.2):
        add(C.tube("cleg", [(c[0] + 6 * math.cos(a), c[1] + 6 * math.sin(a), c[2]), (c[0], c[1], c[2] + 14)], [0.7, 0.7], m["dark_bronze"], seg=6),
            "treasury3")
    add(C.lathe("cauldron", [(0.0, 10.0), (5.0, 10.6), (8.0, 14.0), (8.2, 18.0), (7.4, 19.2), (8.2, 19.6)], m["bronze"], seg=24, loc=c), "treasury3")
    return ctx


FLAGS = (("flagA", (-80.0, 2.0, 249.0), 58), ("flagB", (-180.0, 40.0, 186.0), 70))
BRAZIERS = [((-196, -44, 121.6), 3), ((-32, -44, 121.6), 0), ((-44, -20, 187.6), 3), ((-166, -6, 250.6), 3)]
BONES = {"root": ((0, 0, 0), (0, 0, 10), None), "body": ((0, 0, 0), (0, 0, 10), "root")}
for _n, _b, _h in FLAGS:
    _prev = "body"
    for _i in range(3):
        _p0 = (_b[0] - 0.8 - 9.3 * _i, _b[1], _b[2] + _h - 5.5)
        _p1 = (_b[0] - 0.8 - 9.3 * (_i + 1), _b[1], _b[2] + _h - 5.5)
        BONES[f"{_n}{_i}"] = (_p0, _p1, _prev)
        _prev = f"{_n}{_i}"


def pose(ctx, clip, t):
    rig = ctx["rig"]
    rig.rest()
    i = W.frame_of(CLIPS[clip], t)
    W.base_visibility(ctx, clip, i)
    if clip.startswith("flag"):
        ph = 2 * math.pi * i / 4 + (1.7 if clip == "flagB" else 0.0)
        for k in range(3):
            a = ph - k * 1.25
            rig.set(f"{clip}{k}", r=math.radians(-6 * math.cos(a) - 4), rz=math.radians(16 * math.sin(a) * (0.6 if k == 0 else 1.0)))


def clips():
    return W.base_clips()


CLIPS = {c.name: c for c in W.base_clips()}


def _lights():
    return [dict(zip(("x", "y"), W.pivot_lu((b[0], b[1], b[2] + 16.0), YAW)), crumbleMax=cm, r=22) for b, cm in BRAZIERS]


MODULE = SimpleNamespace(
    SLUG="bronze", FILE="bronze", NAME="Ziggurat", AGE=AGE, KIND="base", VISUAL_ID="base.bronze", HEIGHT_LU=330,
    PX1=1.025, SCALE1=1.25, CANVAS=(300, 362), FEET=(250, 20), YAW=YAW,
    ANCHORS={"head": (-95.0, 330), "hitCenter": (-76.0, 148.5)},
    TRACKERS={f"mount{i}": ("body", C.place(mx, my, d, YAW)) for i, ((mx, my), d) in enumerate(zip(W.BASE_MOUNTS, DEPTHS))},
    EXTRA_META={"kind": "base", "age": AGE, "widthLu": 190, "mountsLu": [list(m) for m in W.BASE_MOUNTS],
                "flags": [{"clip": "flagA", "crumbleMax": 2, "z": "front"}, {"clip": "flagB", "crumbleMax": 3, "z": "back"}],
                "lightsLu": _lights(),
                "smokeLu": [{"x": -93.78, "y": 296.69, "crumbleMin": 2}, {"x": -139.14, "y": 127.48, "crumbleMin": 3},
                            {"x": -47.44, "y": 49.18, "crumbleMin": 3}],
                "hornLu": [-100, 360]},
    build=build, pose=pose, clips=clips, LREF=None)
