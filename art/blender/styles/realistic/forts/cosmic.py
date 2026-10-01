"""Cosmic forts, realistic style (DESIGN A16.14.4): Void Rampart, Ion Spire, Warp Barracks, Void Mine.
Ceramic armour, dark alloy and small cyan / lilac cores (A11 colour rule); team colour on the rampart's
ceramic facings, the spire's pedestal band, the barracks' base panels and the mine's marker.
"""
import math
import random

import bmesh

from lib import core as C
from lib import mats as M
import kit as K
import parts as P

AGE = "cosmic"


def _crystal(name, c, r, h, mat, tilt=0.0):
    """An elongated octahedral crystal centred at c."""
    x, y, z = c
    bm = bmesh.new()
    top = bm.verts.new((x, y, z + h / 2))
    bot = bm.verts.new((x, y, z - h / 2))
    ring = [bm.verts.new((x + r * math.cos(a), y + r * math.sin(a), z + (0.08 * h if i % 2 else -0.05 * h))) for i, a in enumerate([k * 2 * math.pi / 6 for k in range(6)])]
    for i in range(6):
        bm.faces.new((ring[i], ring[(i + 1) % 6], top))
        bm.faces.new((ring[(i + 1) % 6], ring[i], bot))
    o = C.from_bm(name, bm, mat, smooth=False)
    if tilt:
        from mathutils import Euler, Matrix
        o.data.transform(Matrix.Translation(c) @ Euler((0, tilt, 0)).to_matrix().to_4x4() @ Matrix.Translation((-x, -y, -z)))
    return o


# ================================================================================== Void Rampart
def _rampart(f):
    m, rnd = f.m, random.Random(81)
    dark, cer = m["darkalloy"], m["ceramic"]
    cyan = M.glow("#7af0ff", 5.0, name="coreglow")
    f.add(C.box("plinth", 16, 70, 4, dark, bevel=1.0, loc=(0, 0, 2)), "body")
    f.add(C.box("plinth_r", 16, 70, 3, dark, bevel=1.0, loc=(0, 0, 1.5)), "rubble")
    # angular monolith slabs leaning toward the lane, each with a ceramic team facing and a cyan seam
    n = 6
    for i in range(n):
        y = -30 + i * 12
        h = 58 + (6 if i % 2 else 0) + rnd.uniform(-3, 3)
        edge = abs(i - (n - 1) / 2) / ((n - 1) / 2)
        st = P.stage_for(0.6, edge, rnd, keep=0.05)
        lean = rnd.uniform(-0.06, -0.02)
        hi = st - 1 if st < 9 else 3
        slab = C.box(f"slab{i}", 9, 11.4, h, dark, bevel=0.8, loc=(0, y, 4 + h / 2), rot=(0, lean, 0))
        for v in slab.data.vertices:
            if v.co.z > 4 + h * 0.8:
                v.co.x -= (v.co.z - 4 - h * 0.8) * 0.5 * (1 if i % 2 else -1) * 0.3
                v.co.z += (3 if v.co.y > y else -3) * (1 if i % 2 else -1)
        f.add(slab, "body", 0, hi)
        face = C.box(f"face{i}", 1.2, 9.4, h * 0.62, m["team_metal"], bevel=0.3, loc=(4.9, y, 4 + h * 0.4), rot=(0, lean, 0))
        f.add(face, "body", 0, hi, team=True)
        f.add(C.box(f"seam{i}", 1.4, 1.0, h * 0.7, cyan, bevel=0.2, loc=(5.2, y + 5.3, 4 + h * 0.42), rot=(0, lean, 0)), "body", 0, hi)
        if st < 9:
            f.add(C.box(f"stump{i}", 9, 11.4, h * 0.28, dark, bevel=0.8, loc=(0, y, 4 + h * 0.14)), "body", st, 3)
            f.add(C.box(f"slabf{i}", 9, 11.4, h * 0.6, dark, bevel=0.8, loc=(16 + rnd.uniform(0, 8), y + rnd.uniform(-4, 4), 4.5), rot=(0, math.pi / 2 - 0.05, rnd.uniform(-0.4, 0.4))), "body", st, 3)
    # crystal spikes at the foot
    for k in range(5):
        f.add(_crystal(f"spike{k}", (8, -28 + k * 14, 6), 2.0, 12, M.glow("#b8f6ff", 1.6, name="spikeglow"), tilt=0.5), "body", 0, 2)
    K.flag_pole(f, dark, cyan, r=0.9)
    K.banner_cloth(f, m["team_metal"], width=10.0)
    for k in range(7):
        f.add(C.box(f"rslab{k}", 9, 11, 16, dark, bevel=0.8, loc=(rnd.uniform(-4, 20), rnd.uniform(-28, 28), 4.5), rot=(0, math.pi / 2, rnd.uniform(-1, 1))), "rubble")
    for y in (-36, 36):
        f.add(C.box("sg", 3, 3, 76, cer, bevel=0.4, loc=(-10, y, 38)), "scaffold")
        f.add(C.box("sg2", 3, 3, 76, cer, bevel=0.4, loc=(10, y, 38)), "scaffold")
    f.add(C.box("sgb", 3, 74, 3, cer, bevel=0.4, loc=(0, 0, 76)), "scaffold")
    f.add(C.sphere("shead", 3.0, cyan, loc=(0, 4, 71)), "scaffold")


VOID_RAMPART = K.make("void_rampart", "Void Rampart", AGE, "wall", _rampart, canvas=(136, 120), feet=(68, 16), yaw=-44.0,
                      height=92, hit=(2, 34), material="energy", flag=(-11.0, 0.0, 0.0, 86.0), flag_len=20.0, foot=28.0)


# ================================================================================== Ion Spire (crewless)
def _ion(f):
    m, rnd = f.m, random.Random(83)
    dark, cer = m["darkalloy"], m["ceramic"]
    cyan = M.glow("#7af0ff", 7.0, name="ioncore")
    f.add(C.cyl("ped0", 14, 12, 6, cer, seg=6, loc=(0, 0, 0)), "body")
    f.add(C.cyl("ped1", 10, 8, 16, dark, seg=6, loc=(0, 0, 6)), "body", 0, 2)
    f.add(C.cyl("band", 10.6, 9.4, 5, m["team_metal"], seg=6, loc=(0, 0, 10)), "body", 0, 2, team=True)
    f.add(C.cyl("ped1b", 10, 8, 8, dark, seg=6, loc=(0, 0, 6)), "body", 3, 3)
    f.add(C.cyl("ped2", 6, 4, 8, cer, seg=6, loc=(0, 0, 22)), "body", 0, 1)
    # the ring (floating) and its three struts
    pts = [(15 * math.cos(a), 15 * math.sin(a), 38 + 1.5 * math.sin(a)) for a in [i * 2 * math.pi / 40 for i in range(41)]]
    f.add(C.tube("ring", pts, [1.4] * 41, dark, seg=8, caps=False), "body", 0, 1)
    pts2 = [(15 * math.cos(a), 15 * math.sin(a), 38 + 1.5 * math.sin(a)) for a in [i * 2 * math.pi / 40 for i in range(20)]]
    f.add(C.tube("ring_b", [(p[0] + 3, p[1], p[2] - 14) for p in pts2], [1.4] * 20, dark, seg=8, caps=False), "body", 2, 3)
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.5
        f.add(C.tube(f"strut{k}", [(5 * math.cos(a), 5 * math.sin(a), 29), (15 * math.cos(a), 15 * math.sin(a), 38)], [0.8, 0.6], cer, seg=6), "body", 0, 1)
    for k in range(8):
        a = 2 * math.pi * k / 8
        f.add(C.sphere(f"node{k}", 1.0, cyan, loc=(15 * math.cos(a), 15 * math.sin(a), 38 + 1.5 * math.sin(a))), "body", 0, 1)
    # the floating crystal
    f.add(_crystal("crystal", (0, 0, 50), 5.0, 26, M.glow("#b8f6ff", 2.2, name="crystalglow")), "body", 0, 2)
    f.add(_crystal("crystal_core", (0, 0, 50), 2.4, 18, cyan), "body", 0, 2)
    f.add(_crystal("crystal_d", (8, -6, 5), 5.0, 22, M.glow("#6ab6c4", 0.8, name="crystaldim"), tilt=1.3), "body", 3, 3)
    K.flag_pole(f, dark, cyan, r=0.7)
    K.banner_cloth(f, m["team_metal"], width=7.0)
    P.rubble_heap(f, (2, -4, 0), (14, 10), dark, rnd, n=8, size=(2.5, 5))
    f.add(C.cyl("rped", 14, 12, 6, cer, seg=6), "rubble")
    for y in (-12, 12):
        for x in (-14, 14):
            f.add(C.box("sg", 2, 2, 70, cer, bevel=0.3, loc=(x, y, 35)), "scaffold")
    f.add(C.box("sgb", 30, 2, 2, cer, bevel=0.3, loc=(0, -12, 70)), "scaffold")
    f.add(C.box("sgb2", 30, 2, 2, cer, bevel=0.3, loc=(0, 12, 70)), "scaffold")
    f.add(C.sphere("shead", 2.4, cyan, loc=(0, 0, 66)), "scaffold")


ION_SPIRE = K.make("ion_spire", "Ion Spire", AGE, "tower", _ion, canvas=(96, 104), feet=(48, 14), yaw=-12.0,
                   height=76, hit=(0, 32), material="energy", flag=(-9.0, 9.0, 6.0, 48.0), flag_len=12.0, foot=16.0,
                   muzzle=(0.0, 0.0, 63.0), lights=[((0.0, 0.0, 50.0), 16, 2)])


# ================================================================================== Warp Barracks
def _warp(f):
    m, rnd = f.m, random.Random(85)
    dark, cer = m["darkalloy"], m["ceramic"]
    f.add(C.box("deck", 40, 30, 4, cer, bevel=1.2, loc=(0, 0, 2)), "body")
    for k, x in enumerate((-12, 0, 12)):
        f.add(C.box(f"basepanel{k}", 10, 1.0, 3, m["team_metal"], bevel=0.3, loc=(x, -15.4, 2)), "body", 0, 2, team=True)
    # the portal: an upright ring facing the lane (it opens with every levy: the door clip)
    R = 17.0
    ring = [(R * math.cos(a), 0.0, 4 + R + R * math.sin(a)) for a in [i * 2 * math.pi / 48 for i in range(49)]]
    f.add(C.tube("portal", ring, [2.6] * 49, dark, seg=10, caps=False), "body", 0, 1)
    half = [(R * math.cos(a), 0.0, 4 + R + R * math.sin(a)) for a in [math.pi + i * math.pi / 24 for i in range(25)]]
    f.add(C.tube("portal_b", half, [2.6] * 25, dark, seg=10, caps=False), "body", 2, 3)
    for k in range(12):
        a = 2 * math.pi * k / 12
        f.add(C.box(f"plate{k}", 5.4, 3.6, 3.0, cer, bevel=0.6, loc=((R + 0.4) * math.cos(a), -0.2, 4 + R + (R + 0.4) * math.sin(a)), rot=(0, -a, 0)), "body", 0, 1 if k < 6 else 2)
    # pylons either side with cyan cores
    for y in (-24, 24):
        f.add(C.cyl(f"pyl{y}", 3.4, 2.4, 30, dark, seg=8, loc=(-2, y, 4)), "body", 0, 2 if y < 0 else 3)
        f.add(C.sphere(f"pcore{y}", 2.2, m["glow_cyan"], loc=(-2, y, 35)), "body", 0, 1)
    # the portal membrane: dim, stirring, open (door frames)
    for fr, (mat, s) in enumerate(((M.glow("#3a3452", 0.8, name="warpdim"), 1.0), (M.glow("#8a78c8", 2.2, name="warpmid"), 1.0), (M.glow("#d8e8ff", 5.0, name="warpopen"), 1.0))):
        bm = bmesh.new()
        c = bm.verts.new((0, -0.4, 4 + R))
        ringv = [bm.verts.new(((R - 1.8) * math.cos(a), -0.4, 4 + R + (R - 1.8) * math.sin(a))) for a in [i * 2 * math.pi / 32 for i in range(32)]]
        for i in range(32):
            bm.faces.new((c, ringv[i], ringv[(i + 1) % 32]))
        f.add(C.from_bm(f"membrane{fr}", bm, mat), "door", fr, fr)
        if fr == 1:
            pts = [((R - 4) * (t / 30) * math.cos(t * 0.5), -0.8, 4 + R + (R - 4) * (t / 30) * math.sin(t * 0.5)) for t in range(31)]
            f.add(C.tube("swirl", pts, [0.5] * 31, M.glow("#c8b8ff", 3.0, name="swirl"), seg=5), "door", 1, 1)
    K.flag_pole(f, dark, m["glow_cyan"], r=0.8)
    K.banner_cloth(f, m["team_metal"], width=10.0)
    for k in range(8):
        f.add(C.box(f"rplate{k}", 6, 8, 3, cer if k % 2 else dark, bevel=0.6, loc=(rnd.uniform(-18, 18), rnd.uniform(-14, 12), 5.5), rot=(rnd.uniform(-0.3, 0.3), 0, rnd.uniform(-1, 1))), "rubble")
    f.add(C.box("rdeck", 40, 30, 4, cer, bevel=1.2, loc=(0, 0, 2)), "rubble")
    f.add(C.box("rteam", 10, 1.0, 3, m["team_metal"], bevel=0.3, loc=(0, -15.4, 2)), "rubble", team=True)
    for y in (-24, 24):
        f.add(C.box("sg", 2, 2, 44, cer, bevel=0.3, loc=(-8, y, 22)), "scaffold")
        f.add(C.box("sg2", 2, 2, 44, cer, bevel=0.3, loc=(8, y, 22)), "scaffold")
    f.add(C.box("sgb", 2, 50, 2, cer, bevel=0.3, loc=(0, 0, 44)), "scaffold")
    f.add(C.sphere("shead", 2.2, m["glow_cyan"], loc=(0, 0, 40)), "scaffold")


WARP_BARRACKS = K.make("warp_barracks", "Warp Barracks", AGE, "camp", _warp, canvas=(120, 104), feet=(60, 16), yaw=-24.0,
                       height=76, hit=(0, 22), material="metal", flag=(-16.0, 16.0, 4.0, 58.0), flag_len=16.0, foot=26.0,
                       lights=[((0.0, 0.0, 21.0), 18, 1)])


# ================================================================================== Void Mine (trap)
def _void_mine(f):
    m, rnd = f.m, random.Random(87)
    fam = "trap"
    dark = m["darkalloy"]
    lil = M.glow("#c8a8ff", 4.0, name="minecore")
    lil_dim = M.glow("#8a78c8", 1.2, name="minecore_dim")
    # the orb: carried in (0), half sunk with a dim core (1), cracked open and blazing (2); the crater (3)
    orb = C.sphere("orb0", 6.0, dark, loc=(0, 0, 6.0))
    f.add(orb, fam, 0, 0)
    f.add(C.sphere("orb1", 6.0, dark, loc=(0, 0, 1.5)), fam, 1, 1)
    f.add(C.sphere("core1", 2.0, lil_dim, loc=(0, -4.6, 3.0)), fam, 1, 1)
    for k in range(6):
        a = 2 * math.pi * k / 6
        for fr, z in ((0, 6.0), (1, 1.5)):
            f.add(C.tube(f"spike{fr}{k}", [(5.5 * math.cos(a), 5.5 * math.sin(a) * 0.9, z + 1.5), (9.5 * math.cos(a), 9.5 * math.sin(a) * 0.9, z + 3.5)], [1.2, 0.1], dark, seg=6), fam, fr, fr)
    f.add(C.sphere("core2", 4.2, lil, loc=(0, 0, 3.0)), fam, 2, 2)
    for k in range(5):
        a = 2 * math.pi * k / 5
        f.add(C.box(f"shell{k}", 5, 4, 1.2, dark, bevel=0.3, loc=(8 * math.cos(a), 5 * math.sin(a), 2.0), rot=(0.8, 0, a)), fam, 2, 3)
    f.add(C.blobs("halo", [((0, 0, 0.3), (14, 6, 0.3))], lil_dim, res=0.6), fam, 1, 1)
    P.crater(f, m, rnd, R=15.0, scorch=m["ash"])
    P.marker_flag(f, m, dark, m["team_metal"], at=(-24, 10), h=16)


VOID_MINE = K.make("void_mine", "Void Mine", AGE, "trap", _void_mine, canvas=(84, 52), feet=(42, 16), yaw=-12.0,
                   height=24, hit=(0, 6), material="energy", foot=28.0)


FORTS = [VOID_RAMPART, ION_SPIRE, WARP_BARRACKS, VOID_MINE]
