"""Industrial forts, realistic style (DESIGN A16.14.4): Trench Parapet, Sniper Nest, Recruiting Depot,
Tripwire Charge. Riveted iron, soot, brick, khaki canvas, timber and rubber; team colour on painted
sheets, a steel shield plate, the depot's poster board and the colours.
"""
import math
import random

import bmesh

from lib import core as C
from lib import mats as M
import kit as K
import parts as P

AGE = "industrial"


def _mats(m):
    return dict(khaki=C.mat("khaki", "#8a8466", rough=0.9, noise=0.14, nscale=1.2, bump=0.7, sheen=0.3, ramp2="#76705a"),
                timber=M.wood("#6a5a48", "#4c4034", name="timber"),
                corr=C.mat("corrugated", "#6a6a66", rough=0.55, metal=0.8, noise=0.25, nscale=0.9, bump=0.4, ramp2="#5a4a3e", stripes=4.0),
                wire=C.mat("wire", "#3a3836", rough=0.5, metal=1.0, noise=0.05, bump=0.0),
                brick=C.mat("ibrick", "#8a5a48", rough=0.9, noise=0.2, nscale=0.9, bump=1.0, ramp2="#6e4a3c"),
                slate=C.mat("slate", "#3e3e42", rough=0.7, noise=0.15, nscale=1.0, bump=0.5, stripes=5.0),
                soot=C.mat("soot", "#2e2c2a", rough=0.9, noise=0.1, bump=0.3))


def _barbed(f, pts, wire, fam="body", lo=0, hi=9):
    """A coil of barbed wire along a polyline (a helix)."""
    out = []
    for (a, b) in zip(pts[:-1], pts[1:]):
        L = math.dist(a, b)
        n = int(L / 1.2)
        for i in range(n + 1):
            t = i / n
            ang = t * L / 3.0 * 2 * math.pi
            out.append((a[0] + (b[0] - a[0]) * t + 2.6 * math.cos(ang), a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t + 2.6 * math.sin(ang)))
    f.add(C.tube("barbed", out, [0.22] * len(out), wire, seg=4, caps=False), fam, lo, hi)


# ================================================================================== Trench Parapet
def _parapet(f):
    m, rnd = f.m, random.Random(51)
    g = _mats(m)
    f.add(K.mound("spoil", (-4, 0, 0), (18, 42, 7), m["earth"]), "body")
    f.add(K.mound("spoil_r", (-4, 0, 0), (20, 44, 6), m["earth"]), "rubble")
    # a timber revetment (upright planks) with sandbags on top and in front
    for i in range(12):
        y = -33 + i * 6
        edge = abs(y) / 33

        def make(sfx, fallen, y=y, i=i):
            if fallen:
                return C.box(f"revf{i}", 5.6, 2.0, 26, g["timber"], bevel=0.2, loc=(22 + rnd.uniform(0, 10), y + rnd.uniform(-4, 4), 1.2), rot=(0, math.pi / 2, rnd.uniform(-0.5, 0.5)))
            return C.box(f"rev{i}", 1.8, 5.6, 28, g["timber"], bevel=0.25, loc=(0, y, 13), rot=(0, -0.08, rnd.uniform(-0.03, 0.03)))
        P.breakable(f, make, 0.5, edge, rnd, fall_to=True, keep=0.15)
    for y in (-34, -12, 12, 34):
        f.add(K.pole("picket", (-1.5, y, -1), (-3, y, 32), g["timber"], r=1.2), "body", 0, 3)
    # corrugated iron sheets over part of it, one painted in the team colour
    f.add(C.box("corr1", 1.2, 16, 24, g["corr"], bevel=0.2, loc=(2.2, -22, 13), rot=(0, -0.08, 0.02)), "body", 0, 2)
    f.add(C.box("corrT", 1.2, 18, 24, m["team_metal"], bevel=0.2, loc=(2.2, 6, 13), rot=(0, -0.08, -0.02)), "body", 0, 1, team=True)
    f.add(C.box("corrT2", 1.2, 12, 16, m["team_metal"], bevel=0.2, loc=(2.2, 2, 9), rot=(0, -0.2, 0.25)), "body", 2, 2, team=True)
    f.add(C.box("corrTg", 18, 12, 1.2, m["team_metal"], bevel=0.2, loc=(22, 4, 0.8), rot=(0, 0, 0.4)), "body", 3, 3, team=True)
    # sandbags: two courses on top of the revetment, one in front
    P.sandbag_wall(f, [(-3, -36), (-3, 36)], 3, g["khaki"], rnd, length=10.0, keep=0.0, z0=26.5)
    P.sandbag_wall(f, [(6, -34), (6, 34)], 2, g["khaki"], rnd, length=10.0, keep=0.3)
    # barbed wire on angle pickets in front
    for y in (-30, -10, 10, 30):
        f.add(K.pole("bwp", (22, y, 0), (22, y, 12), m["iron"], r=0.5), "body", 0, 2)
    _barbed(f, [(22, -34, 7), (22, 34, 7)], g["wire"], lo=0, hi=2)
    K.flag_pole(f, g["timber"], m["iron"], r=1.0)
    K.banner_cloth(f, m["cloth"], width=11.0)
    for k in range(12):
        f.add(P.sandbag(f"rbag{k}", (rnd.uniform(-8, 22), rnd.uniform(-34, 34), 2.4), g["khaki"], 9.0, rnd.uniform(0, 3)), "rubble")
    for k in range(5):
        f.add(C.box(f"rplank{k}", 5.6, 26, 1.6, g["timber"], bevel=0.2, loc=(rnd.uniform(-4, 18), rnd.uniform(-26, 26), 1.0 + k * 0.4), rot=(0, 0, rnd.uniform(-1, 1))), "rubble")
    # scaffold: the pickets, empty sacks and a spade
    for y in (-34, -12, 12, 34):
        f.add(K.pole("spicket", (-1.5, y, -1), (-3, y, 32), g["timber"], r=1.2), "scaffold")
    for k in range(6):
        f.add(C.box(f"ssack{k}", 8, 5, 1.2, g["khaki"], bevel=0.5, loc=(-26, -12 + k * 0.6, 0.8 + k * 1.3), rot=(0, 0, k * 0.2)), "scaffold")
    f.add(K.pole("spade", (-16, 10, 0), (-20, 12, 26), g["timber"], r=0.6), "scaffold")


TRENCH_PARAPET = K.make("trench_parapet", "Trench Parapet", AGE, "wall", _parapet, canvas=(144, 108), feet=(72, 16), yaw=-44.0,
                        height=80, hit=(3, 26), material="wood", flag=(-8.0, 0.0, 0.0, 76.0), flag_len=22.0, foot=28.0)


# ================================================================================== Sniper Nest
def _sniper(f):
    m, rnd = f.m, random.Random(53)
    g = _mats(m)
    iron = m["iron"]
    PZ = 46.0
    legs = [(-10, -9), (10, -9), (-10, 9), (10, 9)]
    for i, (x, y) in enumerate(legs):
        b = (x * 1.35, y * 1.35, 0)
        t = (x, y, PZ)
        hi = 1 if i == 1 else 3
        f.add(C.tube(f"legt{i}", [b, t], [1.3, 1.1], iron, seg=6), "body", 0, hi)
        if i == 1:
            f.add(C.tube("legbent", [b, (x * 1.2 + 4, y * 1.2, PZ * 0.5), (x + 2, y, PZ)], [1.3, 1.2, 1.1], iron, seg=6), "body", 2, 3)
        f.add(C.cyl(f"footing{i}", 3.2, 3.2, 3, m["concrete"], seg=12, loc=(b[0], b[1], 0)), "body")
    # lattice braces and rivet plates
    for z0, z1 in ((4, 24), (24, 44)):
        for (a, b) in (((-12, -11.5), (12, -11.5)), ((12, -11.5), (12, 11.5))):
            f.add(K.pole("brace", (a[0] * (1.2 - z0 / 200), a[1], z0), (b[0] * (1.2 - z1 / 200), b[1], z1), iron, r=0.6), "body", 0, 2 if z0 > 10 else 3)
            f.add(K.pole("brace2", (b[0] * (1.2 - z0 / 200), b[1] if a[1] == b[1] else -b[1], z0), (a[0] * (1.2 - z1 / 200), a[1] if a[1] == b[1] else -a[1], z1), iron, r=0.6), "body", 0, 3)
    # deck, ladder, steel shield plates (the near plate is the front, drawn over the crew)
    f.add(C.box("deck", 30, 26, 1.8, g["timber"], bevel=0.3, loc=(0, 0, PZ + 0.9)), "body")
    for k in range(9):
        f.add(C.cyl(f"rivet{k}", 0.5, 0.5, 0.6, iron, seg=6, loc=(-13 + k * 3.2, -13.2, PZ + 0.6), rot=(math.pi / 2, 0, 0)), "body")
    for s in (-1, 1):
        f.add(K.pole("rail", (-26, s * 3.5, 0), (-15, s * 3.5, PZ + 2), iron, r=0.5), "body", 0, 2)
    for k in range(1, 10):
        t = k / 10
        f.add(K.pole("rung", (-26 + 11 * t, -3.5, (PZ + 2) * t), (-26 + 11 * t, 3.5, (PZ + 2) * t), iron, r=0.35), "body", 0, 2)
    plate = C.box("shield", 26, 1.6, 12, m["team_metal"], bevel=0.4, loc=(0, -12.4, PZ + 7.5))
    f.add(plate, "front", 0, 1, team=True)
    f.add(C.box("shield_t", 16, 1.6, 10, m["team_metal"], bevel=0.4, loc=(-4, -12.4, PZ + 6.5), rot=(0.1, 0.1, 0)), "front", 2, 2, team=True)
    f.add(C.box("slot", 6, 2.0, 1.4, m["hole"], bevel=0.1, loc=(4, -12.8, PZ + 10.5)), "front", 0, 1)
    for k in range(6):
        f.add(C.cyl(f"srivet{k}", 0.45, 0.45, 0.5, iron, seg=6, loc=(-11 + k * 4.4, -13.4, PZ + 12.4), rot=(math.pi / 2, 0, 0)), "front", 0, 1)
    f.add(C.box("sideplate", 1.6, 22, 10, iron, bevel=0.4, loc=(14.2, 0, PZ + 6.5)), "body", 0, 2)
    # sandbags on the deck corners, a lamp
    for k, (x, y) in enumerate(((-11, 9), (11, 9))):
        f.add(P.sandbag(f"dbag{k}", (x, y, PZ + 3.5), g["khaki"], 8.0, 0.2), "body", 0, 2)
    K.flag_pole(f, iron, m["brass"], r=0.8)
    K.banner_cloth(f, m["cloth"], width=8.0)
    P.rubble_heap(f, (0, -4, 0), (18, 14), m["concrete"], rnd, n=6, size=(2, 4))
    for k in range(6):
        a = rnd.uniform(-0.9, 0.9)
        x0, y0 = rnd.uniform(-16, 14), rnd.uniform(-10, 10)
        f.add(C.tube(f"rbeam{k}", [(x0, y0, 1.2), (x0 + 30 * math.cos(a), y0 + 30 * math.sin(a), 1.2)], [1.2, 1.2], iron, seg=6), "rubble")
    f.add(C.box("rplate", 22, 12, 1.4, m["team_metal"], bevel=0.3, loc=(12, -8, 1.0), rot=(0, 0, 0.3)), "rubble", team=True)
    K.scaffold_frame(f, -16, 16, -14, 14, PZ + 6, g["timber"], m["rope"], levels=2)


SNIPER_NEST = K.make("sniper_nest", "Sniper Nest", AGE, "tower", _sniper, canvas=(112, 120), feet=(58, 14), yaw=-12.0,
                     height=100, hit=(0, 30), material="metal", flag=(-12.0, 10.0, 47.8, 32.0), flag_len=14.0, foot=18.0,
                     crew=dict(visualId="unit.carbineer", at=(2.0, 0.0, 47.8), scale=0.6))


# ================================================================================== Recruiting Depot
def _depot(f):
    m, rnd = f.m, random.Random(55)
    g = _mats(m)
    W, D, H = 44.0, 26.0, 22.0
    # brick walls in courses (the lane and camera sides break away)
    ch = 3.2
    for ci in range(int(H // ch)):
        z = ci * ch + ch / 2
        for face in ("-y", "+x", "+y", "-x"):
            L = W if face in ("-y", "+y") else D
            n = int(L // 6.2)
            for i in range(n):
                off = -L / 2 + (i + 0.5 + (0.5 if ci % 2 else 0)) * L / n
                if abs(off) > L / 2 - 0.5:
                    continue
                if face == "-y" and -9 < off < 1 and z < 15:
                    continue  # the door
                c = (off, -D / 2, z) if face == "-y" else (off, D / 2, z) if face == "+y" else (-W / 2, off, z) if face == "-x" else (W / 2, off, z)
                size = (L / n - 0.4, 2.4, ch - 0.35) if face in ("-y", "+y") else (2.4, L / n - 0.4, ch - 0.35)
                vis = face in ("-y", "+x")

                def make(sfx, fallen, c=c, size=size, ci=ci, i=i, face=face):
                    if fallen:
                        return P.blockbox(f"brf{ci}{face}{i}", (c[0] + rnd.uniform(6, 20), c[1] - rnd.uniform(6, 16), 1.2), (4, 2.4, 2.2), g["brick"], rnd, bevel=0.3, jitter=0.1)
                    return P.blockbox(f"br{ci}{face}{i}", c, size, g["brick"], rnd, bevel=0.3, jitter=0.05)
                if vis:
                    P.breakable(f, make, (ci + 1) * ch / (H + 10), abs(off) / (L / 2) * 0.6, rnd, fall_to=True, keep=0.05)
                else:
                    f.add(make("", False), "body")
    f.add(C.box("core", W - 4, D - 4, H, M.dark("#221c18", name="inside"), bevel=0.2, loc=(0, 0, H / 2)), "body")
    # slate roof (two slopes) and a chimney
    for s in (-1, 1):
        roof = C.box(f"roof{s}", W + 4, D / 2 + 3, 1.6, g["slate"], bevel=0.3, loc=(0, s * (D / 4 + 0.6), H + 5.2), rot=(s * 0.55, 0, 0))
        f.add(roof, "body", 0, 1 if s < 0 else 2)
    f.add(C.box("roof_b", W * 0.6, D / 2 + 3, 1.6, g["slate"], bevel=0.3, loc=(W * 0.2, -(D / 4 + 0.6), H + 5.0), rot=(-0.55, 0.12, 0)), "body", 2, 2)
    f.add(C.box("chimney", 5, 5, 16, g["brick"], bevel=0.3, loc=(-W / 2 + 8, 4, H + 8)), "body", 0, 2)
    # door frame and the door leaf (door clip)
    f.add(C.box("doorframe", 12, 2.8, 16.4, g["timber"], bevel=0.3, loc=(-4, -D / 2 - 0.2, 8.2)), "body", 0, 2)
    for fr, ang in enumerate((0.0, 0.7, 1.4)):
        if fr > 0:
            f.add(C.box(f"doorhole{fr}", 8.4, 1.0, 14, m["hole"], bevel=0.1, loc=(-4, -D / 2 - 1.8, 7.2)), "door", fr, fr)
        leaf = C.box(f"leaf{fr}", 8.2, 1.0, 14, g["timber"], bevel=0.2, loc=(4.1, 0, 7.2))
        from mathutils import Euler, Matrix
        leaf.data.transform(Matrix.Translation((-8.1, -D / 2 - 2.0, 0)) @ Euler((0, 0, -ang)).to_matrix().to_4x4())
        f.add(leaf, "door", fr, fr)
    # the recruiting poster board (team colour) and a gas lamp
    f.add(C.box("board", 12, 1.2, 14, g["timber"], bevel=0.3, loc=(12, -D / 2 - 2.2, 12)), "body", 0, 1)
    f.add(C.box("poster", 10, 0.6, 12, m["team"], bevel=0.1, loc=(12, -D / 2 - 3.0, 12)), "body", 0, 1, team=True)
    f.add(C.box("posterstar", 3, 0.6, 3, M.bone("#e8e0cc", name="posterwhite"), bevel=0.1, loc=(12, -D / 2 - 3.4, 14)), "body", 0, 1)
    f.add(C.box("poster_t", 7, 0.6, 7, m["team"], bevel=0.1, loc=(10, -D / 2 - 3.0, 10), rot=(0, 0.3, 0)), "body", 2, 2, team=True)
    f.add(K.pole("lamppost", (22, -18, 0), (22, -18, 28), m["iron"], r=0.6), "body", 0, 2)
    f.add(C.sphere("lamp", 1.6, m["glow_warm"], loc=(22, -18, 29)), "body", 0, 2)
    # bunting in the team colour along the eaves
    for k in range(7):
        x = -W / 2 + 3 + k * (W - 6) / 6
        tri = bmesh.new()
        vs = [tri.verts.new((x - 2.4, -D / 2 - 2.6, H + 1.6)), tri.verts.new((x + 2.4, -D / 2 - 2.6, H + 1.6)), tri.verts.new((x, -D / 2 - 2.6, H - 3.4))]
        tri.faces.new(vs)
        o = C.from_bm(f"flag{k}", tri, m["cloth"])
        so = o.modifiers.new("so", "SOLIDIFY")
        so.thickness = 0.4
        f.add(o, "body", 0, 1, team=True)
    f.add(K.lash("bunting", [(-W / 2 + 1, -D / 2 - 2.6, H + 1.8), (0, -D / 2 - 2.6, H + 0.6), (W / 2 - 1, -D / 2 - 2.6, H + 1.8)], m["rope"], r=0.3), "body", 0, 1)
    K.flag_pole(f, m["iron"], m["brass"], r=1.0)
    K.banner_cloth(f, m["cloth"], width=10.0)
    P.rubble_heap(f, (0, -2, 0), (24, 14), g["brick"], rnd, n=16, size=(2.5, 5))
    f.add(C.box("rwall", W - 8, D - 6, 6, g["brick"], bevel=0.4, loc=(0, 0, 3)), "rubble")
    K.scaffold_frame(f, -W / 2 - 3, W / 2 + 3, -D / 2 - 3, D / 2 + 3, H + 6, g["timber"], m["rope"], levels=2)


RECRUITING_DEPOT = K.make("recruiting_depot", "Recruiting Depot", AGE, "camp", _depot, canvas=(132, 104), feet=(66, 16), yaw=-24.0,
                          height=76, hit=(0, 16), material="stone", flag=(20.0, 12.0, 0.0, 64.0), flag_len=18.0, foot=28.0,
                          lights=[((22.0, -18.0, 29.0), 10, 2)], smoke=[((-14.0, 4.0, 40.0), 0)])


# ================================================================================== Tripwire Charge (trap)
def _tripwire(f):
    m, rnd = f.m, random.Random(57)
    g = _mats(m)
    fam = "trap"
    # the charge box half dug in, the wire across the lane between two pickets
    f.add(C.box("box0", 10, 7, 6, M.wood("#6a5e48", "#4e4436", name="ammobox"), bevel=0.4, loc=(-2, 4, 3)), fam, 0, 0)
    f.add(C.box("box1", 10, 7, 6, M.wood("#6a5e48", "#4e4436", name="ammobox"), bevel=0.4, loc=(-2, 4, 0.6)), fam, 1, 1)
    f.add(C.box("boxband", 10.4, 7.4, 1.6, m["team_metal"], bevel=0.2, loc=(-2, 4, 3.0)), fam, 1, 1, team=True)
    f.add(C.blobs("scrape", [((0, 2, 0.3), (14, 8, 0.6))], m["dirt"], res=0.6), fam, 0, 1)
    for y, lo, hi in ((-12, 0, 2), (12, 0, 2)):
        f.add(K.pole("picket", (14, y, 0), (14, y, 7), m["iron"], r=0.45), fam, lo, hi)
    f.add(K.lash("wire", [(14, -12, 5.5), (14, 0, 5.2), (14, 12, 5.5)], g["wire"], r=0.18), fam, 1, 1)
    f.add(K.lash("wire2", [(14, 0, 5.2), (6, 2, 3.0), (-2, 4, 3.8)], g["wire"], r=0.15), fam, 1, 1)
    f.add(K.lash("wirecoil", [(-12, -8, 0.6), (-8, -10, 1.2), (-4, -8, 0.6), (-8, -6, 1.2), (-12, -8, 0.6)], g["wire"], r=0.3), fam, 0, 0)
    for k in range(3):
        f.add(P.sandbag(f"tbag{k}", (-10 + k * 5, 12, 2.2), g["khaki"], 7.0, 0.1), fam, 0, 1)
    for k in range(8):
        a = rnd.uniform(0, 6.28)
        d = rnd.uniform(6, 18)
        f.add(C.box(f"shard{k}", 2.4, 1.6, 0.5, M.wood("#6a5e48", "#4e4436", name="ammobox"), bevel=0.1, loc=(d * math.cos(a), d * 0.5 * math.sin(a), 0.4), rot=(0, 0, rnd.uniform(0, 3))), fam, 2, 3)
    f.add(C.blobs("scorch", [((0, 0, 0.25), (16, 7, 0.4))], m["ash"], res=0.6), fam, 2, 2)
    P.crater(f, m, rnd, R=14.0)
    P.marker_flag(f, m, m["iron"], m["cloth"], at=(-24, 10))


TRIPWIRE_CHARGE = K.make("tripwire_charge", "Tripwire Charge", AGE, "trap", _tripwire, canvas=(84, 52), feet=(42, 16), yaw=-12.0,
                         height=24, hit=(0, 6), material="metal", foot=28.0)


FORTS = [TRENCH_PARAPET, SNIPER_NEST, RECRUITING_DEPOT, TRIPWIRE_CHARGE]
