"""Medieval forts, realistic style (DESIGN A16.14.4): Shield Barricade, Longbow Tower, Levy Camp, Wolf Pits.
Oak, limestone, wool and iron; team colour on the painted pavises, a wool banner, the tent's scalloped
valance and pennons.
"""
import math
import random

import bmesh

from lib import core as C
from lib import mats as M
import kit as K
import parts as P

AGE = "medieval"


def _pavise(name, c, w, h, face_mat, rim_mat, lean=12.0, facing="x"):
    """A tall pavise: a slightly convex board with a rounded top, facing the lane (+x), leaning back."""
    x, y, z0 = c
    bm = bmesh.new()
    rows = []
    for j in range(9):
        v = j / 8
        row = []
        for i in range(7):
            u = i / 6 - 0.5
            top = h if abs(u) < 0.3 else h - (abs(u) - 0.3) * h * 0.25
            dz = v * top
            bulge = 1.2 * (1 - (2 * u) ** 2)
            la = math.radians(lean)
            # rotate the board back about its foot by `lean` degrees (86+ lies it on the ground)
            lx = x - math.sin(la) * dz + math.cos(la) * bulge
            zz = z0 + math.cos(la) * dz + math.sin(la) * bulge
            row.append(bm.verts.new((lx, y + u * w, zz)))
        rows.append(row)
    for j in range(8):
        for i in range(6):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    o = C.from_bm(name, bm, face_mat)
    so = o.modifiers.new("so", "SOLIDIFY")
    so.thickness = 1.6
    return o


# ================================================================================== Shield Barricade
def _barricade(f):
    m, rnd = f.m, random.Random(21)
    oak = M.wood("#6b5847", "#4e4035", name="oak")
    iron = m["iron"]
    f.add(K.mound("mound", (0, 0, 0), (14, 40, 3.5), m["earth"]), "body")
    f.add(K.mound("mound_r", (0, 0, 0), (16, 42, 3.5), m["earth"]), "rubble")
    # the frame: posts and two rails behind the shields
    for y in (-30, -10, 10, 30):
        f.add(K.pole("post", (-4, y, -1), (-6, y, 52), oak, r=1.8), "body", 0, 3 if abs(y) < 20 else 2)
    for z in (18.0, 40.0):
        f.add(K.pole("rail", (-4.5, -33, z), (-5.5, 33, z), oak, r=1.4), "body", 0, 2 if z > 30 else 3)
    # six pavises, team-painted with a dark chevron (non-team) and an iron rim
    ws = [-28.0, -17.0, -5.6, 5.6, 17.0, 28.0]
    for i, y in enumerate(ws):
        edge = abs(y) / 30

        def make(sfx, fallen, y=y, i=i):
            if fallen:
                o = _pavise(f"pvf{i}", (22 + rnd.uniform(0, 10), y + rnd.uniform(-4, 4), 0.8), 10.2, 50, m["team"], iron, lean=-86 + rnd.uniform(-3, 3))
                return o
            return _pavise(f"pv{i}", (1.5 + (i % 2) * 1.6, y, 0.5), 12.6, 50 + rnd.uniform(-2, 2), m["team"], iron, lean=10 + rnd.uniform(-2, 2))
        st = P.stage_for(0.45, edge, rnd)
        f.add(make("", False), "body", 0, st - 1 if st < 9 else 3, team=True)
        if st < 9:
            f.add(make("_f", True), "body", st, 3, team=True)
        # an iron boss and rim strips on the standing shield
        lean = math.tan(math.radians(10))
        bx = 1.5 + (i % 2) * 1.6
        f.add(C.sphere(f"boss{i}", 2.0, iron, loc=(bx + 2.2 - lean * 26, y, 26), scale=(0.6, 1, 1)), "body", 0, st - 1 if st < 9 else 3)
        for dy in (-6.2, 6.2):
            f.add(C.tube(f"rimv{i}{dy}", [(bx + 1.0, y + dy, 0.5), (bx + 1.0 - lean * 44, y + dy, 44.5)], [0.6, 0.6], iron, seg=6), "body", 0, st - 1 if st < 9 else 3)
    # chevaux-de-frise stakes angled at the lane in front
    for k in range(7):
        y = -30 + k * 10
        f.add(K.stake(f"cdf{k}", (6, y, 0), (22, y + rnd.uniform(-2, 2), 16), 1.4, oak, point=4.0), "body", 0, 2 if k % 3 else 3)
    K.flag_pole(f, oak, iron, r=1.2)
    K.banner_cloth(f, m["team_wool"], width=11.0)
    # rubble: fallen pavises, snapped posts
    for k in range(4):
        f.add(_pavise(f"rpv{k}", (6 + k * 6, -22 + k * 14, 0.8), 10.2, 50, m["team"], iron, lean=-88 + rnd.uniform(-2, 2)), "rubble", team=True)
    for k, y in enumerate((-30, -10, 10, 30)):
        f.add(K.broken(f"rpost{k}", (-4, y, -1), (-6, y, 52), 1.8, oak, rnd.uniform(0.15, 0.3), rnd), "rubble")
    # scaffold: posts and rails only, a pile of boards
    for y in (-30, -10, 10, 30):
        f.add(K.pole("spost", (-4, y, -1), (-6, y, 52), oak, r=1.8), "scaffold")
    f.add(K.pole("srail", (-4.5, -33, 40), (-5.5, 33, 40), oak, r=1.4), "scaffold")
    for k in range(5):
        f.add(C.box(f"sboard{k}", 10, 26, 1.2, oak, bevel=0.2, loc=(-22, -14, 0.8 + k * 1.4), rot=(0, 0, k * 0.08)), "scaffold")


SHIELD_BARRICADE = K.make("shield_barricade", "Shield Barricade", AGE, "wall", _barricade, canvas=(140, 118), feet=(68, 16), yaw=-44.0,
                          height=88, hit=(4, 30), material="wood", flag=(-9.0, 1.0, 0.0, 82.0), flag_len=22.0, foot=28.0)


# ================================================================================== Longbow Tower
def _longbow(f):
    m, rnd = f.m, random.Random(23)
    lime = M.stone("#b0a794", "#958c7a", name="medlime", bump=1.2)
    lime_dk = M.stone("#9a917e", "#7e7666", name="medlime_dk", bump=1.2)
    oak = M.wood("#6b5847", "#4e4035", name="oak")
    R, H = 13.0, 52.0
    f.add(C.lathe("footing", [(R + 4, 0), (R + 3.2, 4), (R + 0.6, 6)], lime_dk, seg=24), "body")
    f.add(C.cyl("core", R - 2.2, R - 2.6, H, lime_dk, seg=20), "body")
    ch = 6.5
    n = 12
    for ci in range(int(H // ch)):
        z = 5 + ci * ch + ch / 2
        for i in range(n):
            a = 2 * math.pi * (i + (0.5 if ci % 2 else 0)) / n
            r = R - 0.2 * ci / 8
            c = (r * math.cos(a), r * math.sin(a), z)
            # only the camera and lane sides can fall (the far side is hidden anyway)
            vis = math.sin(a) < 0.3
            mat = lime if (ci + i) % 5 else lime_dk

            def make(sfx, fallen, c=c, a=a, mat=mat, ci=ci, i=i):
                if fallen:
                    return P.blockbox(f"lbf{ci}_{i}", (c[0] + rnd.uniform(8, 20), c[1] - rnd.uniform(8, 16), 2.4), (6.5, 4, 4.5), mat, rnd, bevel=0.9)
                return P.blockbox(f"lb{ci}_{i}", c, (4.2, 2 * math.pi * R / n - 0.5, ch - 0.5), mat, rnd, bevel=0.8, rot=(0, 0, a))
            if vis:
                P.breakable(f, make, (ci + 1) * ch / H, abs(math.cos(a)) * 0.5, rnd, fall_to=True, keep=0.05)
            else:
                f.add(make("", False), "body")
    # arrow slits
    for z in (22, 38):
        f.add(C.box("slit", 1.2, 1.4, 7, m["hole"], bevel=0.2, loc=(0, -R - 0.4, z)), "body", 0, 2)
    # the timber hoarding (a gallery around the top): the back half is body, the near half the front
    top = H + 5
    for fam, a0, a1 in (("body", 0.0, math.pi), ("front", math.pi, 2 * math.pi)):
        for k in range(9):
            a = a0 + (a1 - a0) * (k + 0.5) / 9
            c = ((R + 2.5) * math.cos(a), (R + 2.5) * math.sin(a), top + 5)

            def make(sfx, fallen, c=c, a=a, k=k, fam=fam):
                if fallen:
                    return C.box(f"hbf{fam}{k}", 5, 1.2, 10, oak, bevel=0.2, loc=(c[0] + rnd.uniform(10, 20), c[1] - rnd.uniform(8, 16), 1.0), rot=(math.pi / 2, 0, rnd.uniform(0, 3)))
                return C.box(f"hb{fam}{k}", 1.4, 2 * math.pi * (R + 2.5) / 9 * 0.98, 10, oak, bevel=0.2, loc=c, rot=(0, 0, a))
            P.breakable(f, make, 0.95, 0.3, rnd, fall_to=True, fam=fam)
        for k in range(5):
            a = a0 + (a1 - a0) * k / 4
            f.add(K.pole("brk", ((R - 0.5) * math.cos(a), (R - 0.5) * math.sin(a), top - 6), ((R + 3) * math.cos(a), (R + 3) * math.sin(a), top), oak, r=0.8), fam, 0, 2)
    f.add(C.cyl("deck", R + 2.6, R + 2.6, 1.6, oak, seg=24, loc=(0, 0, top - 0.8)), "body")
    # a conical shingle roof on posts at the back, open toward the lane
    f.add(C.cyl("roof", R + 5, 0.5, 14, M.wood("#5a4a3e", "#43372d", name="shingle", stripes=5.0), seg=20, loc=(0, 0, top + 11)), "body", 0, 1)
    for a in (0.5, 2.6):
        f.add(K.pole("roofpost", ((R + 1) * math.cos(a), (R + 1) * math.sin(a), top), ((R + 1) * math.cos(a), (R + 1) * math.sin(a), top + 11.5), oak, r=0.9), "body", 0, 1)
    # the wool banner hanging down the tower face
    f.add(P.cloth_panel("banner", -6, 6, 20, 48, -R - 1.2, m["team_wool"], sag=0.8, seg=(6, 10), wave=0.4), "body", 0, 1, team=True)
    f.add(K.lash("bbar", [(-7, -R - 1.4, 48.5), (7, -R - 1.4, 48.5)], oak, r=0.7), "body", 0, 1)
    f.add(P.cloth_panel("banner_t", -6, 3, 30, 48, -R - 1.2, m["team_wool"], sag=0.5, seg=(5, 8), wave=0.8, ragged=3.5, rnd=rnd), "body", 2, 2, team=True)
    K.flag_pole(f, oak, m["iron"], r=1.0)
    K.banner_cloth(f, m["team_wool"], width=8.0, pennant=True)
    P.rubble_heap(f, (4, -6, 0), (18, 14), lime, rnd, n=16, size=(3, 7))
    f.add(C.cyl("rcore", R, R - 1, 10, lime_dk, seg=18), "rubble")
    K.scaffold_frame(f, -R - 4, R + 4, -R - 4, R + 4, H + 8, oak, m["rope"], levels=2)


LONGBOW_TOWER = K.make("longbow_tower", "Longbow Tower", AGE, "tower", _longbow, canvas=(112, 140), feet=(58, 14), yaw=-12.0,
                       height=112, hit=(0, 32), material="stone", flag=(-8.0, 9.0, 57.5, 40.0), flag_len=16.0, foot=17.0,
                       crew=dict(visualId="unit.longbowman", at=(1.5, 0.0, 58.2), scale=0.6))


# ================================================================================== Levy Camp
def _levy_camp(f):
    m, rnd = f.m, random.Random(25)
    canvas = C.mat("medcanvas", "#b3a78e", rough=0.9, noise=0.14, nscale=1.2, bump=0.6, sheen=0.3, ramp2="#988c74")
    oak = M.wood("#6b5847", "#4e4035", name="oak")
    R, Hh, WH = 24.0, 50.0, 16.0
    f.add(P.bell_tent("tent", R, Hh, WH, canvas), "body", 0, 1)
    f.add(P.bell_tent("tent_s", R * 1.03, Hh * 0.82, WH * 0.9, canvas, sag=4.0, lean=(-6, 3)), "body", 2, 2)
    # team scalloped valance at the top of the wall
    for lo, hi, scale, lean in ((0, 1, 1.0, (0, 0)), (2, 2, 0.9, (-6 * 0.3, 1))):
        bm = bmesh.new()
        n = 48
        top, bot = [], []
        for i in range(n + 1):
            a = 2 * math.pi * i / n
            r = R * 1.03 * (1.0 if scale == 1.0 else 1.02) + 0.6
            zt = WH * scale + 1.6
            zb = WH * scale - 4.0 - 2.2 * abs(math.sin(a * 8))
            top.append(bm.verts.new((r * math.cos(a) + lean[0], r * math.sin(a) + lean[1], zt)))
            bot.append(bm.verts.new((r * math.cos(a) + lean[0], r * math.sin(a) + lean[1], zb)))
        for i in range(n):
            bm.faces.new((top[i], top[i + 1], bot[i + 1], bot[i]))
        o = C.from_bm("valance", bm, m["team_wool"])
        so = o.modifiers.new("so", "SOLIDIFY")
        so.thickness = 0.5
        f.add(o, "body", lo, hi, team=True)
    # vertical team stripes on the roof (every other gore)
    for k in range(8):
        a = 2 * math.pi * k / 8 + 0.2
        pts = []
        for t in (0.02, 0.35, 0.7, 0.95):
            z = WH + (Hh - WH) * t
            r = R * (1 - t * 0.98) + 0.9
            pts.append((r * math.cos(a), r * math.sin(a), z + 0.8))
        if k % 2 == 0:
            f.add(C.tube(f"stripe{k}", pts, [3.4, 2.6, 1.6, 0.5], m["team_wool"], seg=6, flat=0.2), "body", 0, 1, team=True)
    f.add(K.pole("centre", (0, 0, 0), (0, 0, Hh + 12), oak, r=0.9), "body", 0, 1)
    f.add(C.tube("pennon", [(0, 0, Hh + 11), (-5, 0, Hh + 10), (-11, 0, Hh + 9)], [2.2, 1.8, 0.4], m["team_wool"], seg=6, flat=0.2), "body", 0, 1, team=True)
    # guy ropes and pegs
    for k in range(6):
        a = 2 * math.pi * k / 6 + 0.4
        f.add(K.lash("guy", [(R * math.cos(a), R * math.sin(a), WH), ((R + 12) * math.cos(a), (R + 12) * math.sin(a), 0.5)], m["rope"], r=0.3), "body", 0, 1)
    # stage 3: down
    heap = C.blobs("heap", [((rnd.uniform(-18, 14), rnd.uniform(-14, 12), rnd.uniform(3, 9)), (rnd.uniform(7, 12), rnd.uniform(6, 10), rnd.uniform(2.5, 5))) for _ in range(11)], canvas, res=0.8)
    C.displace(heap, 2.0, 0.35)
    f.add(heap, "body", 3, 3)
    hb = C.blobs("heapband", [((4, -10, 7), (14, 7, 3.5))], m["team_wool"], res=0.8)
    C.displace(hb, 1.4, 0.5)
    f.add(hb, "body", 3, 3, team=True)
    f.add(K.pole("hpole", (-12, -4, 2), (10, 8, 30), oak, r=0.9), "body", 3, 3)
    # the door flap (facing the camera and the lane)
    da = -1.15
    for fr, w in enumerate((1.0, 0.45, 0.0)):
        if fr > 0:
            bm = bmesh.new()
            r = R + 0.4
            vs = [bm.verts.new((r * math.cos(da - 0.2), r * math.sin(da - 0.2), 0)), bm.verts.new((r * math.cos(da + 0.2), r * math.sin(da + 0.2), 0)),
                  bm.verts.new((r * math.cos(da + 0.12), r * math.sin(da + 0.12), WH + 2)), bm.verts.new((r * math.cos(da - 0.12), r * math.sin(da - 0.12), WH + 2))]
            bm.faces.new(vs)
            f.add(C.from_bm(f"doorhole{fr}", bm, m["hole"]), "door", fr, fr)
        if w > 0:
            bm = bmesh.new()
            r = R + 1.0
            a0, a1 = da - 0.21, da - 0.21 + 0.42 * w
            vs = [bm.verts.new((r * math.cos(a0), r * math.sin(a0), 0)), bm.verts.new((r * math.cos(a1), r * math.sin(a1), 0)),
                  bm.verts.new((r * math.cos(a1 - 0.06), r * math.sin(a1 - 0.06), WH + 2.4)), bm.verts.new((r * math.cos(a0 + 0.06), r * math.sin(a0 + 0.06), WH + 2.4))]
            bm.faces.new(vs)
            o = C.from_bm(f"flap{fr}", bm, canvas)
            so = o.modifiers.new("so", "SOLIDIFY")
            so.thickness = 0.5
            f.add(o, "door", fr, fr)
    # a polearm rack, a cooking tripod over the fire
    for k in range(4):
        y = 14 + k * 3.2
        f.add(C.tube(f"pole{k}", [(-38, y, 0), (-30, y + 1, 50)], [0.7, 0.6], oak, seg=6), "body", 0, 1)
        f.add(C.tube(f"head{k}", [(-30, y + 1, 50), (-29.2, y + 1.1, 56)], [1.4, 0.1], m["steel"], seg=6, flat=0.35), "body", 0, 1)
        f.add(C.tube(f"poleF{k}", [(-44, y - 10, 1.2), (-14, y - 18, 1.6)], [0.7, 0.6], oak, seg=6), "body", 2, 3)
    f.add(K.pole("rackbar", (-33, 12, 40), (-33, 26, 40), oak, r=1.0), "body", 0, 1)
    fx, fy = 34.0, -14.0
    for k in range(3):
        a = 2 * math.pi * k / 3
        f.add(K.pole("tri", (fx + 7 * math.cos(a), fy + 5 * math.sin(a), 0), (fx, fy, 20), oak, r=0.7), "body", 0, 2)
    f.add(C.lathe("pot", [(0.2, 0), (3.8, 0.8), (4.6, 3.6), (4.0, 6.0), (3.6, 6.4)], m["iron"], seg=16, loc=(fx, fy, 7)), "body", 0, 2)
    f.add(K.lash("potchain", [(fx, fy, 13.4), (fx, fy, 20)], m["iron"], r=0.3), "body", 0, 2)
    for k in range(3):
        a = 0.4 + 2.1 * k
        f.add(C.tube(f"flog{k}", [(fx - 5 * math.cos(a), fy - 4 * math.sin(a), 1.0), (fx + 1.5 * math.cos(a), fy + 1.2 * math.sin(a), 4.5)], [1.2, 1.0], m["bark"], seg=6), "body", 0, 2)
    f.add(C.blobs("fembers", [((fx, fy, 1.2), (4.4, 3.2, 1.2))], m["ember"], res=0.45), "body", 0, 2)
    f.add(C.blobs("fflame", [((fx, fy, 4.0), (2.0, 1.6, 2.6))], m["fire"], res=0.35), "body", 0, 1)
    K.flag_pole(f, oak, m["iron"], r=1.2)
    K.banner_cloth(f, m["team_wool"], width=11.0)
    # rubble
    rh = C.blobs("rheap", [((0, 0, 2.5), (24, 20, 3.5))], canvas, res=0.9)
    C.displace(rh, 1.5, 0.5)
    f.add(rh, "rubble")
    f.add(C.blobs("rband", [((6, -10, 3.5), (12, 6, 2.5))], m["team_wool"], res=0.8), "rubble", team=True)
    for k in range(4):
        a = rnd.uniform(0, 6.28)
        f.add(C.tube(f"rp{k}", [(12 * math.cos(a), 12 * math.sin(a), 1.0), (12 * math.cos(a) + 30 * math.cos(a + 1.3), 12 * math.sin(a) + 24 * math.sin(a + 1.3), 1.2)], [0.9, 0.8], oak, seg=6), "rubble")
    # scaffold: the centre pole with the canvas bundled at its foot, pegs
    f.add(K.pole("scentre", (0, 0, 0), (0, 0, Hh + 12), oak, r=0.9), "scaffold")
    for k in range(6):
        a = 2 * math.pi * k / 6 + 0.4
        f.add(K.lash("sguy", [(0, 0, Hh + 8), ((R + 10) * math.cos(a), (R + 10) * math.sin(a), 0.5)], m["rope"], r=0.3), "scaffold")
    f.add(C.tube("sroll", [(-20, -20, 4), (6, -24, 4)], [4.2, 4.2], canvas, seg=12), "scaffold")
    f.add(C.tube("sroll2", [(-16, -14, 11.5), (4, -18, 11.5)], [3.4, 3.4], m["team_wool"], seg=12), "scaffold", team=True)


LEVY_CAMP = K.make("levy_camp", "Levy Camp", AGE, "camp", _levy_camp, canvas=(140, 118), feet=(70, 16), yaw=-24.0,
                   height=86, hit=(0, 24), material="wood", flag=(-26.0, -20.0, 0.0, 74.0), flag_len=20.0, foot=30.0,
                   lights=[((34.0, -14.0, 5.0), 12, 1)], smoke=[((34.0, -14.0, 12.0), 0)], extra_meta={"flag": {"crumbleMax": 2, "z": "front"}})


# ================================================================================== Wolf Pits (trap)
def _wolf_pits(f):
    m, rnd = f.m, random.Random(35)
    oak = M.wood("#6b5847", "#4e4035", name="oak")
    iron_tip = C.mat("irontip", "#5a5856", rough=0.45, metal=1.0, noise=0.2, bump=0.3)

    def cover(f):
        # thin boards laid across the pit under a litter of leaves
        for k in range(7):
            x = -17 + k * 5.6
            f.add(C.box(f"board{k}", 4.6, 20, 0.9, oak, bevel=0.2, loc=(x, 0, 1.6), rot=(0, rnd.uniform(-0.04, 0.04), rnd.uniform(-0.06, 0.06))), "trap", 1, 1)
        leaves = C.blobs("leaves", [((rnd.uniform(-17, 17), rnd.uniform(-7, 7), 2.4), (rnd.uniform(3, 5), rnd.uniform(2, 3.4), 0.6)) for _ in range(14)],
                         C.mat("leaves", "#6e6448", rough=0.9, noise=0.3, nscale=1.6, bump=0.8, ramp2="#565038"), res=0.5)
        C.displace(leaves, 0.8, 1.6)
        f.add(leaves, "trap", 1, 1)
        for k, (x, y) in enumerate(((-9, -2), (4, 3), (12, -3))):
            f.add(K.stake(f"hint{k}", (x, y, 0.5), (x + 0.4, y, 5.2), 0.9, iron_tip, point=2.5), "trap", 1, 1)

    P.pit_patch(f, m, rnd, cover, oak, iron_tip, lambda f: P.marker_flag(f, m, oak, m["team_wool"]))


WOLF_PITS = K.make("wolf_pits", "Wolf Pits", AGE, "trap", _wolf_pits, canvas=(84, 52), feet=(42, 16), yaw=-12.0,
                   height=24, hit=(0, 6), material="wood", foot=28.0)


FORTS = [SHIELD_BARRICADE, LONGBOW_TOWER, LEVY_CAMP, WOLF_PITS]
