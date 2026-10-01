"""Gunpowder forts, realistic style (DESIGN A16.14.4): Gabion Wall, Musket Redoubt, Militia Muster, Powder
Keg. Wicker, earth, walnut timber, canvas, brass and iron; team colour on the painted boards, drum, canvas
valances, the tarp and the colours.
"""
import math
import random

import bmesh

from lib import core as C
from lib import mats as M
import kit as K
import parts as P

AGE = "gunpowder"


def _mats(m):
    return dict(wicker=M.straw("#6e6048", name="wicker"), walnut=M.wood("#5a4030", "#43302a", name="walnut"),
                fascine=M.bark("#6a5a46", "#4c4034", name="fascine"))


# ================================================================================== Gabion Wall
def _gabion_wall(f):
    m, rnd = f.m, random.Random(41)
    g = _mats(m)
    f.add(K.mound("mound", (0, 0, 0), (16, 42, 3.5), m["earth"]), "body")
    f.add(K.mound("mound_r", (0, 0, 0), (18, 44, 3.5), m["earth"]), "rubble")
    rows = [(0.0, 6, 0.0, 7.4, 17.0), (-2.0, 5, 18.6, 6.8, 15.0), (-4.0, 3, 35.0, 6.2, 13.0)]
    for ri, (x, n, z, r, h) in enumerate(rows):
        for i in range(n):
            y = -((n - 1) * 13.4) / 2 + i * 13.4
            edge = abs(y) / 36

            def make(sfx, fallen, x=x, y=y, z=z, r=r, h=h, ri=ri, i=i):
                if fallen:
                    objs = P.gabion(f"gbf{ri}{i}", (0, 0, 0), r, h, g["wicker"], m["earth"])
                    from mathutils import Euler, Matrix
                    M_ = Matrix.Translation((22 + rnd.uniform(0, 12), y + rnd.uniform(-5, 5), r)) @ Euler((math.pi / 2, 0, rnd.uniform(0, 3))).to_matrix().to_4x4() @ Matrix.Translation((0, 0, -h / 2))
                    for o in objs:
                        o.data.transform(M_)
                    return C.join(f"gbfj{ri}{i}", objs)
                return C.join(f"gbj{ri}{i}", P.gabion(f"gb{ri}{i}", (x, y, z), r, h, g["wicker"], m["earth"]))
            P.breakable(f, make, (ri + 1) / 3.2, edge, rnd, fall_to=True, keep=0.2 if ri == 0 else 0.0)
    # fascines (bundled brushwood) along the top, the team tarp over part of them
    for k, (y0, y1) in enumerate(((-36, -20), (18, 36))):
        for j in range(3):
            f.add(C.tube(f"fas{k}{j}", [(-4 + j * 2.4, y0, 36.5 + (j % 2) * 2.2), (-4 + j * 2.4, y1, 36.5 + (j % 2) * 2.2)], [2.4, 2.4], g["fascine"], seg=10), "body", 0, 1 if k == 0 else 2)
            f.add(K.lash(f"fb{k}{j}", [(-4 + j * 2.4 - 2.5, (y0 + y1) / 2, 36.5), (-4 + j * 2.4 + 2.5, (y0 + y1) / 2, 39)], m["rope"], r=0.5), "body", 0, 1 if k == 0 else 2)
    tarp = P.cloth_panel("tarp", -2, 26, 18, 40, 7.8, m["cloth"], sag=0.5, facing="x", seg=(10, 8), wave=0.6)
    f.add(tarp, "body", 0, 1, team=True)
    f.add(P.cloth_panel("tarp_t", 4, 22, 22, 36, 8.2, m["cloth"], sag=0.5, facing="x", seg=(8, 6), wave=0.9, ragged=2.5, rnd=rnd), "body", 2, 2, team=True)
    f.add(C.blobs("tarp_g", [((22, 10, 1.0), (8, 10, 1.0))], m["cloth"], res=0.8), "body", 3, 3, team=True)
    # planks and shovels leaning behind
    for k in range(3):
        f.add(C.box(f"plank{k}", 2.2, 9, 30, g["walnut"], bevel=0.2, loc=(-14, -20 + k * 18, 13), rot=(0, -0.35, 0)), "body", 0, 2)
    K.flag_pole(f, g["walnut"], m["brass"], r=1.1)
    K.banner_cloth(f, m["cloth"], width=12.0)
    for k in range(5):
        objs = P.gabion(f"rgb{k}", (0, 0, 0), 7, 15, g["wicker"], m["earth"])
        from mathutils import Euler, Matrix
        M_ = Matrix.Translation((rnd.uniform(-6, 24), -30 + k * 15, 7)) @ Euler((math.pi / 2, 0, rnd.uniform(0, 3))).to_matrix().to_4x4() @ Matrix.Translation((0, 0, -7.5))
        for o in objs:
            o.data.transform(M_)
        f.add(C.join(f"rgbj{k}", objs), "rubble")
    # scaffold: empty gabion frames (stakes in a ring) and a pile of brushwood
    for i in range(5):
        y = -26 + i * 13
        for k in range(8):
            a = 2 * math.pi * k / 8
            f.add(K.pole("gstake", (7 * math.cos(a), y + 7 * math.sin(a), 0), (7 * math.cos(a), y + 7 * math.sin(a), 18), g["walnut"], r=0.45), "scaffold")
    for j in range(4):
        f.add(C.tube(f"sfas{j}", [(-24 + j * 1.5, -20, 2.4 + (j % 2) * 4), (-24 + j * 1.5, 12, 2.4 + (j % 2) * 4)], [2.4, 2.4], g["fascine"], seg=10), "scaffold")


GABION_WALL = K.make("gabion_wall", "Gabion Wall", AGE, "wall", _gabion_wall, canvas=(140, 110), feet=(70, 16), yaw=-44.0,
                     height=86, hit=(3, 28), material="stone", flag=(-9.0, 0.0, 0.0, 84.0), flag_len=24.0, foot=28.0)


# ================================================================================== Musket Redoubt
def _redoubt(f):
    m, rnd = f.m, random.Random(43)
    g = _mats(m)
    W, D, H = 30.0, 26.0, 32.0
    f.add(K.mound("bank", (0, 0, 0), (26, 22, 6), m["earth"]), "body")
    # plank walls (vertical boards) on four faces
    for face in ("-y", "+y", "-x", "+x"):
        L = W if face in ("-y", "+y") else D
        n = int(L // 3.2)
        for i in range(n):
            off = -L / 2 + (i + 0.5) * L / n
            hh = H + rnd.uniform(-0.8, 0.8)
            if face == "-y":
                c, size = (off, -D / 2, 4 + hh / 2), (L / n - 0.3, 2.0, hh)
            elif face == "+y":
                c, size = (off, D / 2, 4 + hh / 2), (L / n - 0.3, 2.0, hh)
            elif face == "-x":
                c, size = (-W / 2, off, 4 + hh / 2), (2.0, L / n - 0.3, hh)
            else:
                c, size = (W / 2, off, 4 + hh / 2), (2.0, L / n - 0.3, hh)
            edge = abs(off) / (L / 2)

            def make(sfx, fallen, c=c, size=size, i=i, face=face):
                if fallen:
                    return C.box(f"rdf{face}{i}", size[0] if size[0] > 2 else size[1], 2.0, size[2] * 0.7, g["walnut"], bevel=0.2,
                                 loc=(c[0] + rnd.uniform(10, 22), c[1] - rnd.uniform(8, 16), 1.2), rot=(math.pi / 2, 0, rnd.uniform(0, 3)))
                return C.box(f"rd{face}{i}", size[0], size[1], size[2], g["walnut"], bevel=0.25, loc=c)
            P.breakable(f, make, 0.55 + 0.1 * rnd.random(), edge * 0.6, rnd, fall_to=face in ("-y", "+x"), keep=0.1)
    f.add(C.box("core", W - 3, D - 3, H, M.dark("#221c18", name="inside"), bevel=0.2, loc=(0, 0, 4 + H / 2)), "body")
    # horizontal walers and loopholes
    for z in (12.0, 28.0):
        f.add(C.box("waler", W + 1.4, 1.6, 2.2, g["walnut"], bevel=0.3, loc=(0, -D / 2 - 1.3, z)), "body", 0, 2)
    for x in (-8, 0, 8):
        f.add(C.box("loop", 2.2, 1.2, 4, m["hole"], bevel=0.2, loc=(x, -D / 2 - 1.2, 20)), "body", 0, 2)
    # the team band: a painted board across the front
    f.add(C.box("band", W - 2, 1.2, 5.0, m["team"], bevel=0.3, loc=(0, -D / 2 - 1.6, 34)), "body", 0, 1, team=True)
    f.add(C.box("band_t", (W - 2) * 0.55, 1.2, 5.0, m["team"], bevel=0.3, loc=(-W * 0.2, -D / 2 - 1.6, 34), rot=(0, 0.08, 0)), "body", 2, 2, team=True)
    # the roof deck and the gabion parapet (near side: front family)
    top = 4 + H + 0.8
    f.add(C.box("deck", W + 2, D + 2, 1.6, g["walnut"], bevel=0.3, loc=(0, 0, top)), "body")
    for fam, y in (("body", D / 2 - 3), ("front", -D / 2 + 3)):
        for i in range(3):
            x = -W / 2 + 5 + i * (W - 10) / 2

            def make(sfx, fallen, x=x, y=y, i=i, fam=fam):
                if fallen:
                    objs = P.gabion(f"pgf{fam}{i}", (0, 0, 0), 4.2, 9, g["wicker"], m["earth"])
                    from mathutils import Euler, Matrix
                    M_ = Matrix.Translation((x + rnd.uniform(14, 24), -D / 2 - rnd.uniform(8, 16), 4.2)) @ Euler((math.pi / 2, 0, rnd.uniform(0, 3))).to_matrix().to_4x4() @ Matrix.Translation((0, 0, -4.5))
                    for o in objs:
                        o.data.transform(M_)
                    return C.join(f"pgfj{fam}{i}", objs)
                return C.join(f"pgj{fam}{i}", P.gabion(f"pg{fam}{i}", (x, y, top + 0.8), 4.2, 9, g["wicker"], m["earth"]))
            P.breakable(f, make, 0.9, abs(i - 1), rnd, fall_to=True, fam=fam)
    f.add(C.cyl("lantern", 1.4, 1.2, 3.4, m["brass"], seg=10, loc=(W / 2 - 3, D / 2 - 3, top + 0.8)), "body", 0, 2)
    f.add(C.sphere("lamp", 0.9, m["glow_warm"], loc=(W / 2 - 3, D / 2 - 3, top + 2.4)), "body", 0, 2)
    K.flag_pole(f, g["walnut"], m["brass"], r=0.9)
    K.banner_cloth(f, m["cloth"], width=9.0)
    P.rubble_heap(f, (4, -4, 0), (18, 14), m["earth"], rnd, n=10, size=(3, 6))
    for k in range(8):
        a = rnd.uniform(-0.8, 0.8)
        x0, y0 = rnd.uniform(-16, 14), rnd.uniform(-12, 10)
        f.add(C.box(f"rplank{k}", 3, 20, 1.6, g["walnut"], bevel=0.2, loc=(x0, y0, 1.0 + k * 0.3), rot=(0, 0, a)), "rubble")
    K.scaffold_frame(f, -W / 2 - 4, W / 2 + 4, -D / 2 - 4, D / 2 + 4, H + 8, g["walnut"], m["rope"], levels=2)


MUSKET_REDOUBT = K.make("musket_redoubt", "Musket Redoubt", AGE, "tower", _redoubt, canvas=(116, 118), feet=(58, 16), yaw=-12.0,
                        height=96, hit=(0, 22), material="wood", flag=(-11.0, 9.0, 37.6, 34.0), flag_len=16.0, foot=18.0,
                        crew=dict(visualId="unit.fusilier", at=(1.0, 0.0, 38.4), scale=0.6), lights=[((12.0, 10.0, 39.0), 7, 2)])


# ================================================================================== Militia Muster
def _muster(f):
    m, rnd = f.m, random.Random(45)
    g = _mats(m)
    canvas = m["canvas"]
    f.add(P.a_tent("tent", -24, 14, 15, 34, canvas, y=-2), "body", 0, 1)
    f.add(P.a_tent("tent_s", -22, 12, 16, 26, canvas, y=-2, sag=5.0, skew=6.0), "body", 2, 2)
    f.add(P.a_tent("tent2", -44, -18, 12, 26, canvas, y=22), "body", 0, 2)
    P.a_tent_valance(f, "val", -24, 14, 15, 34, -2, 0.8, 0.0, 0.6, 0.85, 0, 1, m["cloth"], m["leather"])
    P.a_tent_valance(f, "val_s", -22, 12, 16, 26, -2, 5.0, 6.0, 0.6, 0.85, 2, 2, m["cloth"], m["leather"])
    f.add(K.pole("ridge", (-26, -2, 34.5), (16, -2, 34.5), g["walnut"], r=0.9), "body", 0, 1)
    for x in (-24, 14):
        f.add(K.pole("upright", (x, -2, 0), (x, -2, 36), g["walnut"], r=0.9), "body", 0, 1)
    heap = C.blobs("heap", [((rnd.uniform(-20, 12), rnd.uniform(-12, 10), rnd.uniform(3, 8)), (rnd.uniform(7, 12), rnd.uniform(6, 10), rnd.uniform(2.5, 4.5))) for _ in range(10)], canvas, res=0.8)
    C.displace(heap, 2.2, 0.35)
    f.add(heap, "body", 3, 3)
    hb = C.blobs("heapband", [((0, -8, 7), (14, 8, 3.5))], m["cloth"], res=0.8)
    f.add(hb, "body", 3, 3, team=True)
    # door (lane end)
    x1 = 14.2
    for fr, w in enumerate((1.0, 0.5, 0.0)):
        if fr > 0:
            bm = bmesh.new()
            vs = [bm.verts.new((x1 + 0.4, -2 - 8, 0)), bm.verts.new((x1 + 0.4, -2 + 8, 0)), bm.verts.new((x1 + 0.4, -2, 24))]
            bm.faces.new(vs)
            f.add(C.from_bm(f"doorhole{fr}", bm, m["hole"]), "door", fr, fr)
        if w > 0:
            bm = bmesh.new()
            y0 = -2 - 8.5
            y1 = y0 + 17 * w
            vs = [bm.verts.new((x1 + 0.9, y0, 0)), bm.verts.new((x1 + 0.9, y1, 0)), bm.verts.new((x1 + 0.9, -2 if w == 1.0 else y0 + 2, 25))]
            bm.faces.new(vs)
            o = C.from_bm(f"flap{fr}", bm, canvas)
            so = o.modifiers.new("so", "SOLIDIFY")
            so.thickness = 0.5
            f.add(o, "door", fr, fr)
    # a stand of muskets, a team drum, powder barrels, a crate
    P.spear_stack(f, (28, 8), 3, g["walnut"], m["iron"], rnd, hi=1, h=34)
    f.add(C.cyl("drum", 5.0, 5.0, 7.0, m["team"], seg=20, loc=(24, -18, 0)), "body", 0, 2, team=True)
    for z in (0.4, 6.6):
        f.add(C.tube("drumhoop", [(24 + 5.3 * math.cos(a), -18 + 5.3 * math.sin(a), z) for a in [i * 2 * math.pi / 24 for i in range(25)]], [0.55] * 25, m["brass"], seg=5, caps=False), "body", 0, 2)
    f.add(C.cyl("drumhead", 4.8, 4.8, 0.4, m["linen"], seg=20, loc=(24, -18, 7.0)), "body", 0, 2)
    for k, (x, y) in enumerate(((-34, -14), (-28, -18))):
        for o in P.barrel(f"keg{k}", (x, y, 0), 3.6, 9, g["walnut"], m["iron"]):
            f.add(o, "body", 0, 2)
    f.add(C.box("crate", 9, 7, 6, M.wood("#7a6a52", "#5e5040", name="crate"), bevel=0.3, loc=(30, 18, 3)), "body", 0, 3)
    K.flag_pole(f, g["walnut"], m["brass"], r=1.1)
    K.banner_cloth(f, m["cloth"], width=11.0)
    rh = C.blobs("rheap", [((0, 0, 2.5), (24, 16, 3.5)), ((-30, 20, 2.5), (14, 10, 3))], canvas, res=0.9)
    C.displace(rh, 1.5, 0.5)
    f.add(rh, "rubble")
    f.add(C.blobs("rband", [((6, -8, 3.5), (12, 6, 2.5))], m["cloth"], res=0.8), "rubble", team=True)
    for x in (-24, 14):
        f.add(K.pole("supright", (x, -2, 0), (x, -2, 36), g["walnut"], r=0.9), "scaffold")
    f.add(K.pole("sridge", (-26, -2, 34.5), (16, -2, 34.5), g["walnut"], r=0.9), "scaffold")
    f.add(C.tube("sroll", [(-34, -20, 4), (-8, -24, 4)], [4, 4], canvas, seg=12), "scaffold")
    f.add(C.tube("sroll2", [(-30, -14, 11), (-8, -18, 11)], [3.4, 3.4], m["cloth"], seg=12), "scaffold", team=True)


MILITIA_MUSTER = K.make("militia_muster", "Militia Muster", AGE, "camp", _muster, canvas=(144, 104), feet=(74, 16), yaw=-24.0,
                        height=76, hit=(0, 20), material="wood", flag=(-30.0, -18.0, 0.0, 66.0), flag_len=22.0, foot=30.0,
                        extra_meta={"flag": {"crumbleMax": 2, "z": "front"}})


# ================================================================================== Powder Keg (trap)
def _powder_keg(f):
    m, rnd = f.m, random.Random(47)
    g = _mats(m)
    fam = "trap"
    # 0: kegs set down beside a shallow scrape; 1: dug in under straw with the fuse laid; 2: sprung (the
    # blast is the game's effect: splinters and a ring of scorched straw); 3: the crater
    for k, (x, y) in enumerate(((-6, -2), (2, 3), (9, -3))):
        for o in P.barrel(f"keg{k}", (x, y, 0), 3.8, 9.5, g["walnut"], m["iron"]):
            f.add(o, fam, 0, 0)
    for k, (x, y) in enumerate(((-6, -2), (2, 3), (9, -3))):
        for o in P.barrel(f"kegd{k}", (x, y, -4.5), 3.8, 9.5, g["walnut"], m["iron"]):
            f.add(o, fam, 1, 1)
    straw = C.blobs("straw", [((rnd.uniform(-12, 14), rnd.uniform(-6, 6), 1.6), (rnd.uniform(3, 5), rnd.uniform(2, 3.2), 0.9)) for _ in range(12)], m["straw"], res=0.5)
    C.displace(straw, 0.8, 1.6)
    f.add(straw, fam, 1, 1)
    f.add(C.blobs("scrape", [((2, 0, 0.3), (17, 8, 0.6))], m["dirt"], res=0.6), fam, 0, 1)
    fuse = [(12, -3, 3.0), (16, -6, 0.6), (21, -4, 0.5), (25, -8, 0.5), (29, -6, 0.5)]
    f.add(C.tube("fuse", fuse, [0.45] * len(fuse), M.rope("#4a4034", name="fuse"), seg=5), fam, 1, 1)
    f.add(C.sphere("spark", 0.9, m["glow_warm"], loc=(29, -6, 0.9)), fam, 1, 1)
    for k in range(4):
        f.add(C.box(f"sack{k}", 6, 4, 3, m["canvas"], bevel=1.0, loc=(-20 + k * 4, 9 - k, 1.5), rot=(0, 0, k * 0.4)), fam, 0, 0)
    # sprung / spent: splinters and hoops thrown out, the crater
    for k in range(10):
        a = rnd.uniform(0, 6.28)
        d = rnd.uniform(6, 20)
        f.add(C.box(f"stave{k}", 1.4, 7, 0.6, g["walnut"], bevel=0.1, loc=(d * math.cos(a), d * 0.5 * math.sin(a), 0.5), rot=(0, 0, rnd.uniform(0, 3))), fam, 2, 3)
    f.add(C.blobs("scorch", [((0, 0, 0.25), (18, 8, 0.4))], m["ash"], res=0.6), fam, 2, 2)
    P.crater(f, m, rnd, R=16.0)
    P.marker_flag(f, m, g["walnut"], m["cloth"], at=(-24, 10))


POWDER_KEG = K.make("powder_keg", "Powder Keg", AGE, "trap", _powder_keg, canvas=(84, 52), feet=(42, 16), yaw=-12.0,
                    height=24, hit=(0, 6), material="wood", foot=28.0)


FORTS = [GABION_WALL, MUSKET_REDOUBT, MILITIA_MUSTER, POWDER_KEG]
