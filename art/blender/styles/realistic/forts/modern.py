"""Modern forts, realistic style (DESIGN A16.14.4): Sandbag Bunker, Pillbox, Forward Base, Minefield.
Sand-coloured bags, concrete, corrugated iron, olive canvas, gunmetal; team colour on the tarp over the
bunker roof, the pillbox's painted band, the base's emblem panel and the minefield's marker tape.
"""
import math
import random

import bmesh

from lib import core as C
from lib import mats as M
import kit as K
import parts as P

AGE = "modern"


def _mats(m):
    return dict(bag=m["sand"], timber=M.wood("#6a5a48", "#4c4034", name="timber"),
                corr=C.mat("corrugated_m", "#6e706a", rough=0.55, metal=0.8, noise=0.2, nscale=0.9, bump=0.4, ramp2="#5e5a50", stripes=5.0),
                net=C.mat("camonet", "#5a5c46", rough=0.95, noise=0.35, nscale=1.4, bump=1.0, ramp2="#46483a"))


# ================================================================================== Sandbag Bunker
def _bunker(f):
    m, rnd = f.m, random.Random(61)
    g = _mats(m)
    f.add(K.mound("mound", (0, 0, 0), (18, 42, 3.5), m["earth"]), "body")
    f.add(K.mound("mound_r", (0, 0, 0), (20, 44, 3.5), m["earth"]), "rubble")
    arc = [(2 + 7 * math.cos(math.radians(a)), 36 * math.sin(math.radians(a)), ) for a in range(-90, 91, 15)]
    P.sandbag_wall(f, arc, 6, g["bag"], rnd, length=10.0, keep=0.05)
    # the firing gap roof: timber posts, corrugated sheet, bags on top, the team tarp over it
    for y in (-12, 12):
        f.add(K.pole("post", (-2, y, 0), (-2, y, 34), g["timber"], r=1.2), "body", 0, 2)
    f.add(C.box("roofsheet", 16, 30, 1.0, g["corr"], bevel=0.2, loc=(-2, 0, 34.5), rot=(0, 0.08, 0)), "body", 0, 1)
    f.add(C.box("roofsheet_b", 14, 18, 1.0, g["corr"], bevel=0.2, loc=(-2, -6, 30), rot=(0.3, 0.25, 0)), "body", 2, 2)
    for k in range(3):
        f.add(P.sandbag(f"rb{k}", (-2, -10 + k * 10, 37.2), g["bag"], 10.0, 1.57), "body", 0, 1)
    tarp = P.cloth_panel("tarp", -14, 14, 22, 38, 7.0, m["cloth"], sag=0.6, facing="x", seg=(10, 6), wave=0.7)
    f.add(tarp, "body", 0, 1, team=True)
    f.add(P.cloth_panel("tarp_t", -12, 4, 20, 34, 7.5, m["cloth"], sag=0.6, facing="x", seg=(8, 5), wave=1.0, ragged=2.5, rnd=rnd), "body", 2, 2, team=True)
    f.add(C.blobs("tarp_g", [((20, -6, 1.0), (8, 10, 1.0))], m["cloth"], res=0.8), "body", 3, 3, team=True)
    # a camouflage net draped over one end
    net = P.cloth_panel("net", 12, 36, 8, 30, 8.5, g["net"], sag=1.5, facing="x", seg=(8, 6), wave=1.5, ragged=2.0, rnd=rnd)
    f.add(net, "body", 0, 1)
    K.flag_pole(f, m["iron"], m["gunmetal"], r=0.9)
    K.banner_cloth(f, m["cloth"], width=11.0)
    for k in range(16):
        f.add(P.sandbag(f"rbag{k}", (rnd.uniform(-8, 22), rnd.uniform(-34, 34), 2.4), g["bag"], 10.0, rnd.uniform(0, 3)), "rubble")
    for y in (-12, 12):
        f.add(K.pole("spost", (-2, y, 0), (-2, y, 34), g["timber"], r=1.2), "scaffold")
    for k in range(8):
        f.add(C.box(f"ssack{k}", 9, 5.5, 1.1, g["bag"], bevel=0.5, loc=(-26, -14 + k * 0.4, 0.7 + k * 1.2), rot=(0, 0, k * 0.2)), "scaffold")
    f.add(C.box("spallet", 16, 14, 2, g["timber"], bevel=0.2, loc=(-26, 16, 1)), "scaffold")


SANDBAG_BUNKER = K.make("sandbag_bunker", "Sandbag Bunker", AGE, "wall", _bunker, canvas=(144, 104), feet=(72, 16), yaw=-44.0,
                        height=78, hit=(3, 20), material="stone", flag=(-12.0, 0.0, 0.0, 72.0), flag_len=22.0, foot=28.0)


# ================================================================================== Pillbox (crewless)
def _pillbox(f):
    m, rnd = f.m, random.Random(63)
    g = _mats(m)
    conc = m["concrete"]
    R, H = 17.0, 24.0
    f.add(K.mound("bank", (0, 0, 0), (24, 22, 5), m["earth"]), "body")
    f.add(C.cyl("core", R - 2.4, R - 2.4, H, M.dark("#221c18", name="inside"), seg=6, loc=(0, 0, 0), rot=(0, 0, math.pi / 6)), "body")
    # six wall panels in two lifts; lane- and camera-facing panels break
    for side in range(6):
        a = 2 * math.pi * side / 6 + math.pi / 6 + math.pi / 6
        cx, cy = (R - 1.2) * math.cos(a), (R - 1.2) * math.sin(a)
        w = 2 * R * math.sin(math.pi / 6) + 0.3
        for lift, (z, h) in enumerate(((6.0, 12.0), (18.0, 12.0))):
            if lift == 1 and abs(math.atan2(math.sin(a), math.cos(a))) < 0.4:
                continue  # the slit face: its upper lift is the gun slit
            vis = math.sin(a) < 0.2

            def make(sfx, fallen, cx=cx, cy=cy, a=a, z=z, h=h, side=side, lift=lift):
                if fallen:
                    return P.blockbox(f"pwf{side}{lift}", (cx + rnd.uniform(10, 22), cy - rnd.uniform(6, 14), 2.6), (w * 0.6, 4, h * 0.45), conc, rnd, bevel=0.6, jitter=0.2)
                return P.blockbox(f"pw{side}{lift}", (cx, cy, z), (4.0, w, h), conc, rnd, bevel=0.5, jitter=0.04, rot=(0, 0, a))
            if vis:
                P.breakable(f, make, 0.5 + lift * 0.3, 0.3, rnd, fall_to=True, keep=0.1)
            else:
                f.add(make("", False), "body")
    # the slit face: a low lintel and a sill with the dark slit between
    a = math.pi / 6 + math.pi / 6 - math.pi / 3 * 1
    for side in range(6):
        a = 2 * math.pi * side / 6 + math.pi / 3
        if abs(math.atan2(math.sin(a), math.cos(a))) < 0.4:
            cx, cy = (R - 1.2) * math.cos(a), (R - 1.2) * math.sin(a)
            w = 2 * R * math.sin(math.pi / 6) + 0.3
            f.add(P.blockbox("sill", (cx, cy, 14.5), (4.0, w, 5.0), conc, rnd, bevel=0.5, jitter=0.03, rot=(0, 0, a)), "body")
            f.add(C.box("slit", 1.0, w - 3, 4.0, m["hole"], bevel=0.2, loc=(cx + 1.2 * math.cos(a), cy + 1.2 * math.sin(a), 19.0), rot=(0, 0, a)), "body")
            f.add(P.blockbox("lintel", (cx, cy, 23.0), (4.4, w, 3.0), conc, rnd, bevel=0.5, jitter=0.03, rot=(0, 0, a)), "body", 0, 2)
    # roof slab (breaks in half at stage 2)
    f.add(C.cyl("roof", R + 1.6, R + 1.2, 3.4, conc, seg=6, loc=(0, 0, H + 0.6), rot=(0, 0, math.pi / 6)), "body", 0, 1)
    f.add(C.cyl("roof_b", R + 1.6, R + 1.2, 3.4, conc, seg=6, loc=(-4, 3, H - 1.0), rot=(0.12, -0.1, math.pi / 6)), "body", 2, 3)
    # the painted team band round the drum and a periscope
    f.add(C.cyl("band", R + 1.3, R + 1.3, 4.2, m["team"], seg=6, loc=(0, 0, 8.0), rot=(0, 0, math.pi / 6)), "body", 0, 2, team=True)
    f.add(C.cyl("peri", 0.9, 0.9, 6, m["gunmetal"], seg=8, loc=(-5, 4, H + 2)), "body", 0, 1)
    f.add(C.box("perihead", 2.6, 1.6, 1.6, m["gunmetal"], bevel=0.2, loc=(-4.4, 4, H + 8)), "body", 0, 1)
    # sandbags round the foot
    arc = [(R * 1.25 * math.cos(math.radians(t)), R * 1.25 * math.sin(math.radians(t))) for t in range(-150, -30, 20)]
    P.sandbag_wall(f, arc, 2, g["bag"], rnd, length=8.0, keep=0.2)
    K.flag_pole(f, m["iron"], m["gunmetal"], r=0.8)
    K.banner_cloth(f, m["cloth"], width=9.0)
    P.rubble_heap(f, (2, -4, 0), (18, 14), conc, rnd, n=16, size=(3, 6))
    f.add(C.cyl("rbase", R, R - 1, 7, conc, seg=6, rot=(0, 0, math.pi / 6)), "rubble")
    K.scaffold_frame(f, -R - 3, R + 3, -R - 3, R + 3, H + 6, g["timber"], m["rope"], levels=2)


PILLBOX = K.make("pillbox", "Pillbox", AGE, "tower", _pillbox, canvas=(104, 90), feet=(52, 14), yaw=-12.0,
                 height=48, hit=(0, 16), material="stone", flag=(-8.0, 8.0, 26.0, 30.0), flag_len=14.0, foot=18.0,
                 muzzle=(18.5, 0.0, 19.0))


# ================================================================================== Forward Base
def _forward(f):
    m, rnd = f.m, random.Random(65)
    g = _mats(m)
    L, R = 44.0, 15.0
    # a Quonset hut: corrugated ribs in segments (the camera side breaks)
    n = 8
    for i in range(n):
        x = -L / 2 + (i + 0.5) * L / n
        for half in range(2):
            a0, a1 = (0.0, math.pi / 2) if half == 0 else (math.pi / 2, math.pi)
            pts = [(x, R * math.cos(a0 + (a1 - a0) * t / 6) * -1, R * math.sin(a0 + (a1 - a0) * t / 6)) for t in range(7)]

            def make(sfx, fallen, x=x, half=half, i=i, pts=pts):
                if fallen:
                    return C.box(f"hutf{i}{half}", L / n, 10, 0.8, g["corr"], bevel=0.1, loc=(x + rnd.uniform(6, 16), -R - rnd.uniform(4, 12), 0.8), rot=(0, 0, rnd.uniform(-0.6, 0.6)))
                o = C.tube(f"hut{i}{half}", pts, [0.1] * 7, g["corr"], seg=4, flat=1.0)
                import bpy
                bpy.data.objects.remove(o)
                bm = bmesh.new()
                rows = []
                for (px, py, pz) in pts:
                    rows.append((bm.verts.new((x - L / n / 2 - 0.1, py, pz)), bm.verts.new((x + L / n / 2 + 0.1, py, pz))))
                for j in range(len(rows) - 1):
                    bm.faces.new((rows[j][0], rows[j][1], rows[j + 1][1], rows[j + 1][0]))
                ob = C.from_bm(f"hut{i}{half}", bm, g["corr"])
                so = ob.modifiers.new("so", "SOLIDIFY")
                so.thickness = 0.8
                return ob
            if half == 0:
                P.breakable(f, make, 0.55, abs(i - (n - 1) / 2) / ((n - 1) / 2), rnd, fall_to=True, keep=0.1)
            else:
                f.add(make("", False), "body")
    f.add(C.cyl("inside", R - 1.2, R - 1.2, L - 1, M.dark("#221c18", name="inside"), seg=16, loc=(-L / 2 + 0.5, 0, 0), rot=(0, math.pi / 2, 0)), "body")
    # end walls (plywood) with the door on the lane end
    for x in (-L / 2, L / 2):
        bm = bmesh.new()
        vs = [bm.verts.new((x, R * math.cos(math.pi * t / 12), R * math.sin(math.pi * t / 12))) for t in range(13)]
        bm.faces.new(vs)
        ob = C.from_bm("endwall", bm, g["timber"])
        so = ob.modifiers.new("so", "SOLIDIFY")
        so.thickness = 1.0
        f.add(ob, "body", 0, 2)
    for fr, ang in enumerate((0.0, 0.8, 1.5)):
        if fr > 0:
            f.add(C.box(f"doorhole{fr}", 1.0, 9, 13, m["hole"], bevel=0.1, loc=(L / 2 + 1.0, -1, 6.5)), "door", fr, fr)
        leaf = C.box(f"leaf{fr}", 1.0, 9, 13, m["olive"], bevel=0.2, loc=(0, 4.5, 6.5))
        from mathutils import Euler, Matrix
        leaf.data.transform(Matrix.Translation((L / 2 + 1.4, -5.5, 0)) @ Euler((0, 0, ang)).to_matrix().to_4x4())
        f.add(leaf, "door", fr, fr)
    # the team emblem panel on the side, an antenna mast, crates and jerry cans, sandbags
    f.add(C.box("emblem", 14, 1.0, 9, m["team_metal"], bevel=0.3, loc=(-6, -R + 1.2, 8.5), rot=(-0.35, 0, 0)), "body", 0, 1, team=True)
    f.add(C.box("emblem_t", 9, 1.0, 7, m["team_metal"], bevel=0.3, loc=(-8, -R - 2, 1.2), rot=(-1.4, 0, 0.4)), "body", 2, 3, team=True)
    f.add(K.pole("mast", (-L / 2 + 6, 6, 0), (-L / 2 + 6, 6, 58), m["gunmetal"], r=0.6), "body", 0, 1)
    for s in (-1, 1):
        f.add(K.lash("guy", [(-L / 2 + 6, 6, 50), (-L / 2 + 6 + s * 14, 6 + 10, 0)], m["iron"], r=0.2), "body", 0, 1)
    f.add(K.pole("mastbent", (-L / 2 + 6, 6, 0), (-L / 2 + 16, 2, 30), m["gunmetal"], r=0.6), "body", 2, 3)
    for k in range(3):
        f.add(C.box(f"crate{k}", 8, 6, 5, m["olive"], bevel=0.3, loc=(L / 2 + 8, -12 + k * 7, 2.5 + (5 if k == 1 else 0))), "body", 0, 2)
    for k in range(3):
        f.add(C.box(f"can{k}", 3, 5, 7, m["olive"], bevel=0.4, loc=(-L / 2 - 4, -8 + k * 4, 3.5)), "body", 0, 3)
    P.sandbag_wall(f, [(-L / 2 + 2, -R - 5), (L / 2 - 2, -R - 5)], 2, g["bag"], rnd, length=9.0, keep=0.25)
    K.flag_pole(f, m["iron"], m["gunmetal"], r=1.0)
    K.banner_cloth(f, m["cloth"], width=10.0)
    for k in range(10):
        a = rnd.uniform(-0.8, 0.8)
        f.add(C.box(f"rsheet{k}", 12, 7, 0.8, g["corr"], bevel=0.1, loc=(rnd.uniform(-20, 20), rnd.uniform(-12, 10), 0.8 + k * 0.3), rot=(rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), a)), "rubble")
    f.add(C.box("rpanel", 12, 8, 1.0, m["team_metal"], bevel=0.3, loc=(10, -12, 1.2), rot=(0, 0, 0.5)), "rubble", team=True)
    # scaffold: the bare ribs
    for i in range(5):
        x = -L / 2 + i * L / 4
        pts = [(x, R * math.cos(math.pi * t / 10), R * math.sin(math.pi * t / 10)) for t in range(11)]
        f.add(C.tube(f"rib{i}", pts, [0.7] * 11, m["gunmetal"], seg=5), "scaffold")
    f.add(K.pole("spine", (-L / 2, 0, R), (L / 2, 0, R), m["gunmetal"], r=0.6), "scaffold")
    for k in range(6):
        f.add(C.box(f"sstack{k}", 12, 7, 0.8, g["corr"], bevel=0.1, loc=(-30, -18, 0.6 + k * 0.9), rot=(0, 0, k * 0.05)), "scaffold")


FORWARD_BASE = K.make("forward_base", "Forward Base", AGE, "camp", _forward, canvas=(140, 110), feet=(70, 16), yaw=-24.0,
                      height=80, hit=(0, 14), material="metal", flag=(24.0, 18.0, 0.0, 60.0), flag_len=18.0, foot=30.0)


# ================================================================================== Minefield (trap)
def _minefield(f):
    m, rnd = f.m, random.Random(67)
    fam = "trap"
    spots = [(-14, -4), (-4, 5), (6, -5), (15, 3), (-20, 7)]
    mine = C.mat("mine", "#4e5040", rough=0.5, metal=0.6, noise=0.15, bump=0.2)
    # 0: a crate of mines and a spade by the patch
    f.add(C.box("minecrate", 10, 7, 5, m["olive"], bevel=0.3, loc=(-8, 8, 2.5)), fam, 0, 0)
    for k in range(3):
        f.add(C.cyl(f"stack{k}", 3.4, 3.4, 1.8, mine, seg=16, loc=(4 + k * 0.3, 6, k * 1.9)), fam, 0, 0)
    f.add(K.pole("spade", (14, 8, 0), (18, 10, 16), m["timber"] if "timber" in m else m["wood"], r=0.5), fam, 0, 0)
    # 1: buried discs, just their pressure plates showing, and dug soil
    for k, (x, y) in enumerate(spots):
        f.add(C.blobs(f"soil{k}", [((x, y, 0.4), (5.4, 3.6, 0.9))], m["dirt"], res=0.5), fam, 1, 2)
        f.add(C.cyl(f"plate{k}", 1.4, 1.2, 1.4, mine, seg=12, loc=(x, y, 0.5)), fam, 1, 1)
    # the warning sign and the owner's tape on pegs round the patch
    f.add(K.pole("signpost", (-26, 8, 0), (-26, 8, 18), m["wood"], r=0.6), fam, 0, 3)
    tri = bmesh.new()
    vs = [tri.verts.new((-26, 7.2, 13)), tri.verts.new((-26 + 0.1, 7.2 - 5.0, 21.5)), tri.verts.new((-26, 7.2 + 5.0, 21.5))]
    tri.faces.new(vs)
    sign = C.from_bm("sign", tri, M.bone("#d8d0bc", name="signpaint"))
    so = sign.modifiers.new("so", "SOLIDIFY")
    so.thickness = 0.5
    f.add(sign, fam, 0, 3)
    for k in range(6):
        a = 2 * math.pi * k / 6 + 0.3
        f.add(K.pole(f"peg{k}", (27 * math.cos(a), 12 * math.sin(a), 0), (27 * math.cos(a), 12 * math.sin(a), 6), m["wood"], r=0.35), fam, 1, 3)
    pts = [(27 * math.cos(2 * math.pi * k / 6 + 0.3), 12 * math.sin(2 * math.pi * k / 6 + 0.3), 5.4) for k in range(7)]
    f.add(C.tube("tape", pts, [0.8] * 7, m["cloth"], seg=4, flat=0.25), fam, 1, 3, team=True)
    # 2: a blast crater at one mine; 3: three
    for k, (x, y) in enumerate(spots[:3]):
        lo = 2 if k == 0 else 3
        f.add(C.blobs(f"cr{k}", [((x, y, 0.25), (6, 3, 0.4))], m["ash"], res=0.5), fam, lo, 3)
        ring = C.blobs(f"crr{k}", [((x, y, 0.5), (7.5, 4, 1.2)), ((x, y, 0.5), (5.2, 2.6, 2.0), None, -1)], m["dirt"], res=0.5)
        f.add(ring, fam, lo, 3)
    P.marker_flag(f, m, m["iron"], m["cloth"], at=(26, 12), h=16)


MINEFIELD = K.make("minefield", "Minefield", AGE, "trap", _minefield, canvas=(84, 52), feet=(42, 16), yaw=-12.0,
                   height=24, hit=(0, 6), material="metal", foot=28.0)


FORTS = [SANDBAG_BUNKER, PILLBOX, FORWARD_BASE, MINEFIELD]
