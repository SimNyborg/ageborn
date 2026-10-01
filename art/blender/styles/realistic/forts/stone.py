"""Stone Age forts, realistic style (DESIGN A16.14.4): Palisade, Sling Perch, War Camp, Spike Pit.

Materials follow the Stone palette (bark, hide, flint, bone, limestone, ochre); team colour sits on dyed
hides (the wall's stretched pelt, the tent band, the perch's screen) and on the hide banners.
"""
import math
import random

import bmesh

from lib import core as C
from lib import mats as M
import kit as K

AGE = "stone"


def _pelt(name, cx, y0, y1, z0, z1, xfn, mat, seed=3, ragged=0.06, legs=True, sag=0.8):
    """A stretched hide in the y-z plane (x from `xfn(y, z)`), with leg lobes and a ragged edge."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=40, y_segments=40, size=1.0)
    ph = [rnd.uniform(0, 6) for _ in range(3)]

    def inside(u, v):
        e = ragged * (math.sin(u * 19 + ph[0]) + 0.7 * math.sin(v * 27 + ph[1]) + 0.5 * math.sin((u + v) * 41 + ph[2]))
        f = (u / 0.62) ** 2 + (v / 0.78) ** 2 - 1.0
        if legs:
            for (cu, cv, r) in ((-0.7, 0.62, 0.22), (0.7, 0.62, 0.22), (-0.68, -0.66, 0.24), (0.68, -0.66, 0.24)):
                f = min(f, ((u - cu) ** 2 + (v - cv) ** 2) / r ** 2 - 1.0)
        return f + e < 0.0

    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not inside(v.co.x, v.co.y)], context="VERTS")
    for v in bm.verts:
        u, w = v.co.x, v.co.y
        y = (y0 + y1) / 2 + u * (y1 - y0) / 2
        z = (z0 + z1) / 2 + w * (z1 - z0) / 2
        bulge = sag * (1.0 - min(1.0, u * u / 0.45 + w * w / 0.6))
        v.co = (xfn(y, z) + bulge, y, z)
    o = C.from_bm(name, bm, mat)
    so = o.modifiers.new("so", "SOLIDIFY")
    so.thickness = 0.8
    sm = o.modifiers.new("sub", "SUBSURF")
    sm.levels = sm.render_levels = 1
    C.displace(o, 0.6, 1.6)
    return o


def _skull(f, at, s=1.0, fam="body", lo=0, hi=9):
    """A horned aurochs skull (the clan mark)."""
    x, y, z = at
    bone = f.m["bone"]
    sk = C.blobs("skull", [((x, y, z), (3.2 * s, 2.6 * s, 3.6 * s)), ((x + 1.8 * s, y, z - 3.2 * s), (2.0 * s, 1.8 * s, 2.6 * s))], bone, res=0.4)
    f.add(sk, fam, lo, hi)
    f.add(C.blobs("sockets", [((x + 2.6 * s, y - 1.4 * s, z + 0.4 * s), (0.9 * s, 0.7 * s, 0.9 * s)), ((x + 2.6 * s, y + 1.4 * s, z + 0.4 * s), (0.9 * s, 0.7 * s, 0.9 * s))], f.m["hole"], res=0.3), fam, lo, hi)
    for sgn in (-1, 1):
        h = C.tube("horn", [(x, y + sgn * 2.6 * s, z + 2 * s), (x - 1 * s, y + sgn * 7 * s, z + 3.5 * s), (x + 1.5 * s, y + sgn * 9 * s, z + 7.5 * s)],
                   [1.3 * s, 0.9 * s, 0.2 * s], M.horn("#6a5a48", name="shorn"), seg=8)
        f.add(h, fam, lo, hi)


# ================================================================================== Palisade (wall)
def _palisade(f):
    m, rnd = f.m, random.Random(4)
    ys = [-33.3 + i * 7.4 for i in range(10)]
    lean = 7.0
    H = [72, 80, 74, 70, 78, 84, 73, 79, 71, 76]
    f.add(K.mound("mound", (-2, 0, 0), (13, 40, 6.5), m["earth"]), "body")
    f.add(K.mound("mound_r", (-2, 0, 0), (15, 42, 5.5), m["earth"]), "rubble")
    tip = M.wood("#a08a6c", "#86705a", name="freshwood", stripes=2.2)
    stakes = []
    for i, y in enumerate(ys):
        b = (rnd.uniform(-0.8, 0.8), y + rnd.uniform(-0.5, 0.5), -3.0)
        t = (b[0] + lean + rnd.uniform(-1.5, 1.5), y + rnd.uniform(-1.2, 1.2), H[i])
        r = rnd.uniform(3.2, 3.8)
        stakes.append((b, t, r))
    # whole stakes: stage ranges; broken stumps from the stage they break
    breaks = {7: 1, 3: 2, 0: 3, 4: 3, 5: 3, 9: 3}
    fracs = {7: 0.55, 3: 0.45, 0: 0.3, 4: 0.34, 5: 0.28, 9: 0.4}
    leans = {6: 2, 1: 3, 8: 3}
    for i, (b, t, r) in enumerate(stakes):
        hi_whole = breaks.get(i, 4) - 1
        L = math.dist(b, t)
        k = (L - 7.0) / L
        body_top = (b[0] + (t[0] - b[0]) * k, b[1] + (t[1] - b[1]) * k, b[2] + (t[2] - b[2]) * k)
        lo_lean = leans.get(i, 9)
        for (lo, hi, rot) in ((0, min(hi_whole, lo_lean - 1), 0.0), (lo_lean, hi_whole, 16.0 + 5 * (i % 2))):
            if lo > hi:
                continue
            ca, sa = math.cos(math.radians(rot)), math.sin(math.radians(rot))

            def R(p):
                dx, dz = p[0] - b[0], p[2] - b[2]
                return (b[0] + dx * ca + dz * sa, p[1], b[2] - dx * sa + dz * ca)
            f.add(C.tube(f"stake{i}", [R(b), R(body_top)], [r, r * 0.95], m["bark"], seg=10), "body", lo, hi)
            f.add(C.tube(f"tip{i}", [R(body_top), R(t)], [r * 0.95, 0.3], tip, seg=10), "body", lo, hi)
        if i in breaks:
            f.add(K.broken(f"stump{i}", b, t, r, m["bark"], fracs[i], rnd), "body", breaks[i], 3)
            # the snapped top lying in front of the wall
            fx = 12 + rnd.uniform(0, 6)
            f.add(C.tube(f"fallen{i}", [(fx, b[1] - 8, 2.8), (fx + 20, b[1] + 6, 2.4)], [r * 0.9, 0.4], m["bark"], seg=10), "body", breaks[i], 3)
        # rubble: short stumps
        f.add(K.broken(f"rstump{i}", b, t, r, m["bark"], rnd.uniform(0.1, 0.22), rnd), "rubble")
    for k, (a, c) in enumerate((((6, -24, 3), (30, -6, 3.2)), ((-4, 10, 3.2), (24, 22, 3.0)), ((-20, -10, 3.0), (6, 4, 3.4)))):
        f.add(C.tube(f"rlog{k}", [a, c], [3.4, 3.0], m["bark"], seg=10), "rubble")
    # lashings across the front at two heights (torn at stage 3)
    for zz in (16.0, 46.0):
        pts = []
        for i, (b, t, r) in enumerate(stakes):
            x = b[0] + (t[0] - b[0]) * (zz - b[2]) / (t[2] - b[2]) + r + 0.3
            pts.append((x, b[1] + (t[1] - b[1]) * (zz - b[2]) / (t[2] - b[2]), zz + (0.8 if i % 2 else -0.6)))
        f.add(K.lash("lash", pts, m["rope"], r=0.7), "body", 0, 1 if zz > 30 else 2)
        f.add(K.lash("lashL", pts[:4], m["rope"], r=0.7), "body", 2 if zz > 30 else 3, 3 if zz < 30 else 2)
    # braces behind
    for k, y in enumerate((-24.0, 0.5, 24.0)):
        hi = 3 if k != 1 else 1
        f.add(K.pole(f"brace{k}", (-26, y, -1), (-1.5, y, 50), m["bark"], r=2.2), "body", 0, hi)
        f.add(K.lash("bl", [(-3.5, y - 2.5, 48.0), (-1.0, y + 2.5, 51.0)], m["rope"], r=0.6), "body", 0, hi)
        if hi == 1:
            f.add(K.pole("bracebroken", (-26, y, -1), (-15, y, 20), m["bark"], r=2.2), "body", 2, 3)
    # the team pelt stretched on the front face
    def xfn(y, z):
        return lean * (z + 3.0) / 80.0 + 4.3

    f.add(_pelt("pelt", 0, -19, 19, 16, 60, xfn, m["team_hide"], seed=5), "body", 0, 1, team=True)
    f.add(_pelt("pelt_t", 0, -18, 10, 16, 46, xfn, m["team_hide"], seed=8, ragged=0.12, legs=False), "body", 2, 2, team=True)
    ground = C.blobs("pelt_g", [((16, -4, 1.0), (13, 11, 1.2))], m["team_hide"], res=0.8)
    C.displace(ground, 1.2, 0.8)
    f.add(ground, "body", 3, 3, team=True)
    f.add(C.blobs("pelt_r", [((14, 6, 1.0), (12, 10, 1.1))], m["team_hide"], res=0.8), "rubble", team=True)
    for (py, pz) in ((-18, 59), (18, 59), (-18, 17), (18, 17)):
        x = xfn(py, pz)
        f.add(K.lash("pl", [(x - 1.5, py - 1.2, pz - 1), (x + 0.8, py + 1.2, pz + 1)], m["rope"], r=0.55), "body", 0, 1)
    _skull(f, (lean * 83 / 80 + 1.0, ys[5] + 0.4, 81.5), s=1.1, fam="body", lo=0, hi=2)
    # banner: a hide banner on a pole behind the middle of the wall
    K.flag_pole(f, m["wood_dk"], m["bone"], r=1.3)
    K.banner_cloth(f, m["team_hide"], width=10.0, pennant=True)
    # scaffold: two guide poles at the ends with a line between them, a ladder and a pile of fresh logs
    for y in (-33.0, 33.0):
        f.add(K.pole("guide", (2, y, -1), (4, y, 84), m["wood"], r=1.5), "scaffold")
        for zz in (20.0, 52.0):
            f.add(K.lash("gl", [(1, y - 1.8, zz), (5, y + 1.8, zz + 1)], m["rope"], r=0.7), "scaffold")
    for zz in (52.0, 76.0):
        f.add(K.lash("line", [(3, -33, zz), (3.4, 0, zz - 2.4), (3.8, 33, zz)], m["rope"], r=0.45), "scaffold")
    for s_ in (-1, 1):
        f.add(K.pole("lrail", (-24, -20 + s_ * 3.5, 0), (-2, -20 + s_ * 3.5, 60), m["wood"], r=0.9), "scaffold")
    for k in range(1, 9):
        t = k / 9
        f.add(K.pole("lrung", (-24 + 22 * t, -23.5, 60 * t), (-24 + 22 * t, -16.5, 60 * t), m["wood"], r=0.55), "scaffold")
    for k in range(6):
        y0 = 2 + k * 3.4
        f.add(C.tube(f"pile{k}", [(-34 + (k % 3) * 1.5, y0 - 18, 2.8 + (k // 3) * 5.6), (-34 + (k % 3) * 1.5, y0 + 18, 2.8 + (k // 3) * 5.6)], [3.0, 3.0], m["bark"], seg=10), "scaffold")


PALISADE = K.make("palisade", "Palisade", AGE, "wall", _palisade, canvas=(136, 128), feet=(68, 16), yaw=-44.0,
                  height=96, hit=(3, 38), material="wood", flag=(-7.0, 1.0, 0.0, 92.0), flag_len=22.0, foot=26.0)


# ================================================================================== Sling Perch (tower)
def _sling_perch(f):
    m, rnd = f.m, random.Random(9)
    PZ = 44.0
    legs = [(-10, -9), (10, -9), (-10, 9), (10, 9)]
    for i, (x, y) in enumerate(legs):
        b = (x * 1.25, y * 1.2, -2)
        t = (x, y, PZ + 1)
        whole_hi = 1 if i == 1 else 3
        f.add(C.tube(f"leg{i}", [b, t], [2.6, 2.2], m["bark"], seg=10), "body", 0, whole_hi)
        if i == 1:
            f.add(K.broken("legcrack", b, t, 2.6, m["bark"], 0.62, rnd), "body", 2, 3)
            f.add(C.tube("legprop", [(x * 1.3 + 3, y * 1.2, -1), (x + 0.5, y, PZ - 2)], [1.6, 1.4], m["wood"], seg=8), "body", 2, 3)
        rk = K.rock(f"legrock{i}", (b[0], b[1], 1.5), (4.5, 4, 3.2), m["stone"] if i % 2 else m["stone_dk"], seed=i)
        f.add(rk, "body")
    # cross braces (X) on the front and the sides; one snaps at stage 1
    for k, ((a, b2), (c, d)) in enumerate(((((-12, -10.5, 4), (10, -10.5, 38)), ((12, -10.5, 4), (-10, -10.5, 38))),
                                          (((12, -10.5, 4), (12, 10.5, 38)), ((12, 10.5, 4), (12, -10.5, 38))))):
        hi = 0 if k == 0 else 3
        f.add(K.pole(f"xa{k}", a, b2, m["wood"], r=1.3), "body", 0, hi)
        f.add(K.pole(f"xb{k}", c, d, m["wood"], r=1.3), "body", 0, 3)
    f.add(K.pole("xa_broken", (-12, -10.5, 4), (-2, -10.5, 18), m["wood"], r=1.3), "body", 1, 3)
    # platform: small logs laid across
    for k in range(8):
        x = -12 + k * 3.4
        f.add(C.tube(f"deck{k}", [(x, -12.5, PZ + 1.8), (x + rnd.uniform(-0.4, 0.4), 12.5, PZ + 1.8)], [1.75, 1.7], m["bark"] if k % 2 else m["wood"], seg=8), "body")
    for y in (-11.5, 11.5):
        f.add(C.tube("rim", [(-15, y, PZ + 0.4), (15, y, PZ + 0.4)], [1.9, 1.9], m["bark"], seg=8), "body")
        for x in (-10, 10):
            f.add(K.lash("dl", [(x - 1.5, y - 2, PZ - 0.5), (x + 1.5, y + 2, PZ + 1.5)], m["rope"], r=0.55), "body")
    # ladder at the back
    for s in (-1, 1):
        f.add(K.pole("rail", (-24, s * 3.5, 0), (-13, s * 3.5, PZ + 4), m["wood"], r=0.9), "body", 0, 2)
    for k in range(1, 8):
        t = k / 8
        x = -24 + 11 * t
        f.add(K.pole("rung", (x, -3.5, (PZ + 4) * t), (x, 3.5, (PZ + 4) * t), m["wood"], r=0.55), "body", 0, 2)
    f.add(C.tube("ladder_fallen", [(-30, -8, 2), (-8, -14, 2.5)], [0.9, 0.9], m["wood"], seg=6), "body", 3, 3)
    # the screen: wicker along the near edge of the deck with the team hide on it, facing the camera; it is
    # drawn OVER the crew (family 'front') so the slinger stands behind it
    for k in range(11):
        x = -13 + k * 2.7
        f.add(K.pole("wick", (x, -13.0, PZ + 1), (x + 0.3, -13.4, PZ + 13.5), m["wood_dk"], r=0.7), "front", 0, 2 if k < 7 else 1)
    for k in range(4):
        x = -13 + k * 2.7
        f.add(K.pole("wickL", (x, -13.0, PZ + 1), (x + 0.3, -13.4, PZ + 7 + k), m["wood_dk"], r=0.7), "front", 3, 3)

    def pelt_xz(name, x0, x1, z0, z1, seed, ragged, lo, hi):
        o = _pelt(name, 0, x0, x1, z0, z1, lambda y, z: -14.4 - (z - PZ) * 0.03, m["team_hide"], seed=seed, legs=False, ragged=ragged, sag=0.5)
        # the helper builds in the y-z plane: swap to the x-z plane (the hide faces the camera, -y)
        for v in o.data.vertices:
            v.co.x, v.co.y = v.co.y, v.co.x
        f.add(o, "front", lo, hi, team=True)

    pelt_xz("screen", -14.5, 15.5, PZ + 1.5, PZ + 14.0, 12, 0.04, 0, 1)
    pelt_xz("screen_t", -14.5, 6.0, PZ + 1.5, PZ + 11.5, 14, 0.14, 2, 2)
    pelt_xz("screen_s", -14.0, -2.0, PZ + 1.0, PZ + 8.0, 15, 0.2, 3, 3)
    for x in (-15.0, 16.0):
        f.add(C.tube("screenpost", [(x, -13.2, PZ - 1), (x + 0.4, -13.6, PZ + 16)], [1.4, 1.2], m["bark"], seg=8), "front", 0, 3 if x < 0 else 2)
    f.add(K.lash("screenrope", [(-15, -14.2, PZ + 14.5), (0, -14.6, PZ + 13.6), (16, -14.2, PZ + 14.5)], m["rope"], r=0.5), "front", 0, 1)
    _skull(f, (16.6, -13.8, PZ + 19.0), s=0.85, fam="front", lo=0, hi=1)
    # sling stones in a basket and a stone heap
    f.add(C.lathe("basket", [(0, 0), (4.4, 0.4), (5.4, 3), (5.6, 5.6), (5.0, 6.0)], M.straw("#9c8458", name="wicker"), seg=18, loc=(-9, 7, PZ + 3)), "body", 0, 2)
    f.add(C.blobs("slingstones", [((-9 + math.cos(a) * 2, 7 + math.sin(a) * 2, PZ + 8.6), (1.6, 1.6, 1.4)) for a in (0, 2.1, 4.2)], m["stone"], res=0.3), "body", 0, 2)
    # ground rocks and a stone heap for scale
    for k, (x, y, s) in enumerate(((-18, -12, 4), (20, 8, 3.2), (6, -16, 2.6))):
        f.add(K.rock(f"grock{k}", (x, y, s * 0.5), (s, s * 0.8, s * 0.6), m["stone_dk"], seed=20 + k), "body")
    # flag: a hide pennant on a pole at the back corner
    K.flag_pole(f, m["wood_dk"], m["bone"], r=1.1)
    K.banner_cloth(f, m["team_hide"], width=8.0, pennant=True)
    # rubble: legs and deck logs on the ground, the torn screen
    for k in range(6):
        a = rnd.uniform(-0.9, 0.9)
        x0, y0 = rnd.uniform(-18, 14), rnd.uniform(-10, 10)
        f.add(C.tube(f"rdeck{k}", [(x0, y0, 1.8), (x0 + 18 * math.cos(a), y0 + 18 * math.sin(a), 1.8)], [1.8, 1.6], m["bark"] if k % 2 else m["wood"], seg=8), "rubble")
    for i, (x, y) in enumerate(legs):
        f.add(K.broken(f"rleg{i}", (x * 1.25, y * 1.2, -2), (x, y, PZ), 2.6, m["bark"], rnd.uniform(0.12, 0.3), rnd), "rubble")
        f.add(K.rock(f"rrock{i}", (x * 1.25, y * 1.2, 1.5), (4.5, 4, 3.2), m["stone_dk"], seed=40 + i), "rubble")
    f.add(C.blobs("rscreen", [((14, -3, 1.0), (8, 10, 1.1))], m["team_hide"], res=0.8), "rubble", team=True)
    # scaffold: the four legs up with a lashed ring, the deck logs stacked beside
    for i, (x, y) in enumerate(legs):
        f.add(C.tube(f"sleg{i}", [(x * 1.25, y * 1.2, -2), (x, y, PZ + 6)], [2.4, 2.1], m["wood"], seg=10), "scaffold")
    for y in (-10.5, 10.5):
        f.add(K.pole("sring", (-13, y, PZ - 6), (13, y, PZ - 6), m["wood"], r=1.1), "scaffold")
    f.add(K.lash("srope", [(-10, -9, PZ + 6), (-4, -4, PZ + 16), (4, 0, PZ + 20)], m["rope"], r=0.5), "scaffold")
    for k in range(4):
        f.add(C.tube(f"spile{k}", [(-30, -8 + k * 2.6, 2.2 + (k % 2) * 2.8), (-12, -8 + k * 2.6, 2.2 + (k % 2) * 2.8)], [1.8, 1.7], m["bark"], seg=8), "scaffold")


SLING_PERCH = K.make("sling_perch", "Sling Perch", AGE, "tower", _sling_perch, canvas=(104, 118), feet=(56, 14), yaw=-12.0,
                     height=96, hit=(0, 30), material="wood", flag=(-11.0, 9.0, 44.0, 38.0), flag_len=16.0, foot=16.0,
                     crew=dict(visualId="unit.pebbler", at=(0.5, 0.0, 47.8), scale=0.6))


# ================================================================================== War Camp (camp)
def _cone_tent(name, R, Hh, mat, apex=(0, 0), sag=0.0, seg=36, rings=10, seed=1, squash=1.0):
    """A hide tipi: a cone with hide folds, a slightly irregular base and a smoke hole."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    ring_v = []
    for j in range(rings + 1):
        t = j / rings
        ring = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            fold = 1.0 + (0.05 + 0.03 * t) * math.sin(a * 12) + 0.02 * math.sin(a * 5 + 1.3) + rnd.uniform(-0.012, 0.012)
            r = R * (1 - t * 0.9) * fold
            z = Hh * t * squash - sag * math.sin(math.pi * t) * (0.5 + 0.5 * math.cos(a - 1.2))
            ring.append(bm.verts.new((r * math.cos(a) + apex[0] * t, r * math.sin(a) + apex[1] * t, max(0.0, z))))
        ring_v.append(ring)
    for j in range(rings):
        for i in range(seg):
            bm.faces.new((ring_v[j][i], ring_v[j][(i + 1) % seg], ring_v[j + 1][(i + 1) % seg], ring_v[j + 1][i]))
    o = C.from_bm(name, bm, mat)
    so = o.modifiers.new("so", "SOLIDIFY")
    so.thickness = 0.7
    C.displace(o, 0.5, 1.4)
    return o


def _war_camp(f):
    m, rnd = f.m, random.Random(21)
    R, Hh = 28.0, 60.0
    tent_hide = M.rawhide("#846a52", name="tenthide")
    # tent: natural hide cone, a team-dyed band, poles through the smoke hole
    f.add(_cone_tent("tent", R, Hh, tent_hide, seed=2), "body", 0, 1)
    f.add(_cone_tent("tent_sag", R * 1.02, Hh * 0.9, tent_hide, apex=(-4, 2), sag=4.0, seed=3), "body", 2, 2)
    # the band: a ring section of the cone, slightly proud of the tent (and of the sagging tent at stage 2)
    def band(name, Rr, Hb, apex, sag, z0, z1, lo, hi):
        bm = bmesh.new()
        seg = 48
        rings = []
        for z in (z0, (z0 + z1) / 2, z1):
            t = z / Hb
            ring = []
            for i in range(seg):
                a_ = 2 * math.pi * i / seg
                fold = 1.0 + (0.05 + 0.03 * t) * math.sin(a_ * 12) + 0.02 * math.sin(a_ * 5 + 1.3)
                r = (Rr * (1 - t * 0.9) + 1.0) * fold
                zz = z - sag * math.sin(math.pi * t) * (0.5 + 0.5 * math.cos(a_ - 1.2))
                ring.append(bm.verts.new((r * math.cos(a_) + apex[0] * t, r * math.sin(a_) + apex[1] * t, zz)))
            rings.append(ring)
        for j in range(len(rings) - 1):
            for i in range(seg):
                bm.faces.new((rings[j][i], rings[j][(i + 1) % seg], rings[j + 1][(i + 1) % seg], rings[j + 1][i]))
        bo = C.from_bm(name, bm, m["team_hide"])
        so = bo.modifiers.new("so", "SOLIDIFY")
        so.thickness = 0.6
        C.displace(bo, 0.4, 1.4)
        f.add(bo, "body", lo, hi, team=True)
        # a dark hem along both edges of the dyed band
        for z in (z0, z1):
            t = z / Hb
            pts = []
            for i in range(seg + 1):
                a_ = 2 * math.pi * i / seg
                fold = 1.0 + (0.05 + 0.03 * t) * math.sin(a_ * 12) + 0.02 * math.sin(a_ * 5 + 1.3)
                r = (Rr * (1 - t * 0.9) + 1.5) * fold
                zz = z - sag * math.sin(math.pi * t) * (0.5 + 0.5 * math.cos(a_ - 1.2))
                pts.append((r * math.cos(a_) + apex[0] * t, r * math.sin(a_) + apex[1] * t, zz))
            f.add(C.tube(name + "hem", pts, [0.7] * len(pts), m["leather"], seg=6, caps=False), "body", lo, hi)

    band("teamband", R, Hh, (0, 0), 0.0, 12.0, 34.0, 0, 1)
    band("teamband_sag", R * 1.02, Hh * 0.9, (-4, 2), 4.0, 10.0, 28.0, 2, 2)
    # vertical hide seams and lacing pins above the door
    for k in range(10):
        a_ = 2 * math.pi * k / 10 + 0.15
        pts = [((R * (1 - t * 0.9) + 0.5) * math.cos(a_), (R * (1 - t * 0.9) + 0.5) * math.sin(a_), Hh * t) for t in (0.02, 0.3, 0.6, 0.88)]
        f.add(C.tube(f"seam{k}", pts, [0.35] * 4, m["leather"], seg=5), "body", 0, 1)
    for k in range(6):
        z = 36 + k * 3.6
        r = R * (1 - (z / Hh) * 0.9) + 1.4
        a_ = -1.0
        f.add(C.tube(f"pin{k}", [(r * math.cos(a_ - 0.12), r * math.sin(a_ - 0.12), z), (r * math.cos(a_ + 0.12), r * math.sin(a_ + 0.12), z + 0.4)], [0.45, 0.45], m["bone"], seg=5), "body", 0, 1)
    # a painted ochre zigzag above the band (the clan sign)
    zz = []
    for i in range(15):
        a_ = -1.9 + i * 0.13
        z = 38 + (2.2 if i % 2 else -2.2)
        r = R * (1 - (z / Hh) * 0.9) + 1.1
        zz.append((r * math.cos(a_), r * math.sin(a_), z))
    f.add(C.tube("zigzag", zz, [0.6] * len(zz), M.ochre("#5a3226", name="markpaint"), seg=5, flat=0.4), "body", 0, 1)
    # poles through the smoke hole
    for k in range(7):
        a = 2 * math.pi * k / 7 + 0.3
        base = (R * 0.98 * math.cos(a), R * 0.98 * math.sin(a), 0)
        top = (-(R * 0.2) * math.cos(a), -(R * 0.2) * math.sin(a), Hh + 11 + rnd.uniform(-2, 3))
        hi = 1 if k in (1, 4) else 2
        f.add(C.tube(f"tpole{k}", [base, top], [1.4, 0.9], m["bark"], seg=8), "body", 0, hi)
        f.add(C.tube(f"tpole_s{k}", [base, top], [1.4, 0.9], m["bark"], seg=8), "scaffold")
    f.add(K.lash("apexrope", [(-2, -2, Hh - 1), (2, 2, Hh + 1), (-1, 2, Hh + 2)], m["rope"], r=0.8), "scaffold")
    # a snapped pole at stage 2
    f.add(C.tube("tpole_snap", [(R * 0.98 * math.cos(1.2), R * 0.98 * math.sin(1.2), 0), (8, -8, Hh - 6)], [1.4, 1.1], m["bark"], seg=8), "body", 2, 2)
    # stage 3: the tent half down (a heap of hide with poles sticking out)
    hrnd = random.Random(5)
    heap = C.blobs("heap", [((hrnd.uniform(-16, 16), hrnd.uniform(-14, 14), hrnd.uniform(3, 10)), (hrnd.uniform(6, 12), hrnd.uniform(5, 10), hrnd.uniform(2.5, 5))) for _ in range(12)]
                   + [((-4, 4, 14), (10, 8, 6))], tent_hide, res=0.8)
    C.displace(heap, 2.6, 0.35)
    f.add(heap, "body", 3, 3)
    hb = C.blobs("heap_band", [((4, -8, 8), (16, 10, 6.5))], m["team_hide"], res=0.9)
    C.displace(hb, 1.6, 0.6)
    f.add(hb, "body", 3, 3, team=True)
    for k in range(4):
        a = rnd.uniform(0, 6.28)
        f.add(C.tube(f"hpole{k}", [(10 * math.cos(a), 10 * math.sin(a), 3), (24 * math.cos(a + 0.4), 24 * math.sin(a + 0.4), 26 + k * 3)], [1.3, 0.9], m["bark"], seg=8), "body", 3, 3)
    # fire pit in front: a ring of stones, logs, embers and a flame
    fx, fy = 30.0, -12.0
    for k in range(9):
        a = 2 * math.pi * k / 9
        f.add(K.rock(f"ring{k}", (fx + 7 * math.cos(a), fy + 5.5 * math.sin(a), 1.4), (2.4, 2.0, 1.8), m["stone"] if k % 2 else m["stone_dk"], seed=60 + k, sub=2), "body")
        f.add(K.rock(f"rring{k}", (fx + 7 * math.cos(a), fy + 5.5 * math.sin(a), 1.4), (2.4, 2.0, 1.8), m["stone_dk"], seed=60 + k, sub=2), "rubble")
    for k, a in enumerate((0.3, 2.3, 4.2)):
        f.add(C.tube(f"firelog{k}", [(fx - 5 * math.cos(a), fy - 4 * math.sin(a), 1.2), (fx + 1.5 * math.cos(a), fy + 1.2 * math.sin(a), 5.5)], [1.3, 1.0], m["bark"], seg=8), "body", 0, 2)
    f.add(C.blobs("embers", [((fx, fy, 1.2), (5, 3.6, 1.4))], m["ember"], res=0.5), "body", 0, 2)
    f.add(C.blobs("flame", [((fx, fy, 5.5), (2.4, 1.8, 3.6)), ((fx + 0.8, fy, 8.5), (1.2, 1.0, 2.4))], M.glow("#ff9a3a", 5.0, name="campflame"), res=0.35), "body", 0, 1)
    f.add(C.blobs("flamecore", [((fx, fy - 0.8, 4.2), (1.1, 0.9, 1.8))], M.glow("#ffd08a", 7.0, name="campcore"), res=0.3), "body", 0, 1)
    f.add(C.blobs("ashes", [((fx, fy, 0.8), (5, 3.8, 1.0))], m["ash"], res=0.5), "body", 3, 3)
    f.add(C.blobs("rashes", [((fx, fy, 0.8), (5, 3.8, 1.0))], m["ash"], res=0.5), "rubble")
    # a spear rack behind the tent
    for k in range(3):
        y = 6 + k * 4
        f.add(C.tube(f"spear{k}", [(-34, y, 0), (-24, y + 1, 42)], [0.8, 0.6], m["wood"], seg=6), "body", 0, 1)
        f.add(C.tube(f"spearhead{k}", [(-24, y + 1, 42), (-23.2, y + 1.1, 47)], [1.2, 0.15], M.flint(), seg=6, flat=0.4), "body", 0, 1)
        f.add(C.tube(f"spearfall{k}", [(-38, y - 6, 1.2), (-12, y - 14, 1.6)], [0.8, 0.6], m["wood"], seg=6), "body", 2, 3)
    f.add(K.pole("rackbar", (-27, 3, 34), (-27, 20, 34), m["bark"], r=1.1), "body", 0, 1)
    for y in (3, 20):
        f.add(K.pole("rackpost", (-30, y, 0), (-27, y, 36), m["bark"], r=1.2), "body", 0, 1)
    # rolled hides and a basket by the door
    f.add(C.tube("roll", [(14, -24, 3.2), (26, -20, 3.2)], [3.2, 3.2], m["hide"], seg=12), "body", 0, 2)
    f.add(C.tube("roll_s", [(-30, -18, 3.2), (-16, -24, 3.2)], [3.2, 3.2], m["hide"], seg=12), "scaffold")
    f.add(C.tube("roll_s2", [(-28, -12, 9.0), (-15, -18, 9.0)], [3.0, 3.0], m["team_hide"], seg=12), "scaffold", team=True)
    # the door: the flap closed, folded half, and open on the dark inside (faces the camera and the lane)
    da = -1.0            # azimuth of the door (toward +x and the camera)
    dr = R * 0.93

    def door_pts(z):
        r = R * (1 - (z / Hh) * 0.9) + 0.6
        return r
    for fr, (w_scale, dark) in enumerate(((1.0, False), (0.55, True), (0.0, True))):
        if dark:
            bm = bmesh.new()
            vs = []
            for (u, z) in ((-1, 0), (1, 0), (0, 26)):
                r = door_pts(z) + 0.2
                a = da + u * 0.22 * (1 - z / 26)
                vs.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
            bm.faces.new(vs)
            o = C.from_bm(f"doorhole{fr}", bm, m["hole"])
            f.add(o, "door", fr, fr)
        if w_scale > 0:
            bm = bmesh.new()
            rows = []
            for z in (0.0, 8.0, 16.0, 24.0, 28.0):
                row = []
                span = 0.26 * (1 - z / 30) * w_scale
                for u in (-1.0, -0.5, 0.0, 0.5, 1.0):
                    a = da + 0.02 + (u * span if w_scale == 1.0 else (-0.26 * (1 - z / 30) + (u + 1) * span))
                    r = door_pts(z) + 1.1 + (0.8 if w_scale < 1 else 0.0) * (1 - abs(u))
                    row.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
                rows.append(row)
            for j in range(len(rows) - 1):
                for i in range(4):
                    bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
            o = C.from_bm(f"flap{fr}", bm, m["hide"])
            so = o.modifiers.new("so", "SOLIDIFY")
            so.thickness = 0.6
            f.add(o, "door", fr, fr)
            # lacing toggles on the closed flap
            if fr == 0:
                for z in (6.0, 13.0, 20.0):
                    r = door_pts(z) + 1.9
                    f.add(C.sphere("toggle", 0.8, m["bone"], loc=(r * math.cos(da), r * math.sin(da), z)), "door", 0, 0)
    # the banner: a hide banner and a skull on a tall pole beside the tent
    K.flag_pole(f, m["wood_dk"], None, r=1.3)
    x, y, z0, h = f.flag
    _skull(f, (x + 0.5, y, z0 + h + 4.5), s=1.0, fam="flag")
    K.banner_cloth(f, m["team_hide"], width=11.0)
    # rubble: the flattened hide, poles scattered
    heap = C.blobs("rheap", [((0, 0, 3), (26, 22, 4)), ((-6, 4, 5), (14, 12, 4))], m["hide"], res=1.0)
    C.displace(heap, 1.6, 0.5)
    f.add(heap, "rubble")
    f.add(C.blobs("rband", [((6, -10, 4), (14, 8, 3))], m["team_hide"], res=0.9), "rubble", team=True)
    for k in range(5):
        a = rnd.uniform(0, 6.28)
        f.add(C.tube(f"rpole{k}", [(14 * math.cos(a), 14 * math.sin(a), 1.2), (14 * math.cos(a) + 40 * math.cos(a + 1.4), 14 * math.sin(a) + 30 * math.sin(a + 1.4), 1.4)], [1.3, 0.9], m["bark"], seg=8), "rubble")


WAR_CAMP = K.make("war_camp", "War Camp", AGE, "camp", _war_camp, canvas=(132, 118), feet=(64, 16), yaw=-24.0,
                  height=86, hit=(0, 26), material="wood", flag=(-22.0, -12.0, 0.0, 76.0), flag_len=22.0, foot=30.0,
                  lights=[((30.0, -12.0, 7.0), 14, 1)], smoke=[((30.0, -12.0, 12.0), 0), ((0.0, 0.0, 58.0), 2)],
                  extra_meta={"flag": {"crumbleMax": 2, "z": "front"}})


# ================================================================================== Spike Pit (trap)
def _spike_pit(f):
    m, rnd = f.m, random.Random(31)
    fam = "trap"
    # the pit: a dark hollow (cannot go below the ground: a dark disc with a raised rim of dug earth)
    for fr in range(4):
        f.add(C.blobs(f"pitdark{fr}", [((0, 0, 0.2), (19, 8.5, 0.35))], m["hole"], res=0.5), fam, fr, fr)
    rim = C.blobs("rim", [((0, 0, 0.6), (24, 11.5, 1.6))] + [((0, 0, 0.6), (19, 8.4, 3.0), None, -1)], m["dirt"], res=0.7)
    C.displace(rim, 0.9, 0.8)
    f.add(rim, fam, 0, 3)
    # dug spoil heaps (unarmed) and the stakes waiting beside the pit
    for k, (x, y, s) in enumerate(((-28, 6, 6), (26, 8, 5), (-10, 14, 4.5))):
        f.add(K.mound(f"spoil{k}", (x, y, 0), (s * 1.6, s, s * 0.8), m["earth"], disp=0.8), fam, 0, 0)
    for k in range(4):
        y = -14 - k * 1.8
        f.add(K.stake(f"lstake{k}", (-18 + k * 5, y, 1.3), (-4 + k * 5, y - 1, 1.6), 1.3, m["wood"], point=3.5), fam, 0, 0)
    # the cover: a lattice of branches and a litter of leaves and grass (armed), a ring of marker stones
    for k in range(7):
        x = -17 + k * 5.6
        f.add(C.tube(f"branch{k}", [(x - 3, -10, 1.2), (x + 2, 0, 1.9), (x + 4, 10, 1.3)], [0.8, 0.7, 0.4], m["bark"], seg=6), fam, 1, 1)
    for k in range(4):
        y = -6 + k * 4
        f.add(C.tube(f"cbranch{k}", [(-22, y, 1.6), (0, y + 1, 2.3), (22, y - 1, 1.6)], [0.7, 0.6, 0.35], m["wood_dk"], seg=6), fam, 1, 1)
    litter = C.blobs("litter", [((rnd.uniform(-17, 17), rnd.uniform(-7, 7), 2.2), (rnd.uniform(3, 5), rnd.uniform(2, 3.4), 0.7)) for _ in range(16)],
                     M.straw("#8a7c56", name="grass"), res=0.5)
    C.displace(litter, 0.8, 1.6)
    f.add(litter, fam, 1, 1)
    # stake tips poking through the cover (the readable hint)
    for k, (x, y) in enumerate(((-9, -2), (3, 3), (12, -3))):
        f.add(K.stake(f"hint{k}", (x, y, 0.5), (x + 0.6, y, 5.2), 1.0, M.wood("#a08a6c", "#86705a", name="freshwood2"), point=2.5), fam, 1, 1)
    for k in range(8):
        a = 2 * math.pi * k / 8 + 0.2
        f.add(K.rock(f"marker{k}", (27 * math.cos(a), 13 * math.sin(a), 1.2), (2.2, 1.9, 1.6), m["stone"] if k % 2 else m["stone_dk"], seed=80 + k, sub=2), fam, 1, 3)
    # sprung: the stakes upright in the pit, cover broken into it
    for k in range(9):
        x = -15 + k * 3.8 + rnd.uniform(-0.8, 0.8)
        y = rnd.uniform(-5, 5)
        h = rnd.uniform(11, 16)
        f.add(K.stake(f"spike{k}", (x, y, 0), (x + rnd.uniform(-1.5, 1.5), y + rnd.uniform(-1, 1), h), 1.2, M.wood("#a08a6c", "#86705a", name="freshwood2"), point=3.5), fam, 2, 2)
        f.add(K.broken(f"spent{k}", (x, y, 0), (x + rnd.uniform(-2.5, 2.5), y, h), 1.2, m["wood"], rnd.uniform(0.25, 0.55), rnd), fam, 3, 3)
    for k in range(6):
        x = rnd.uniform(-18, 18)
        f.add(C.tube(f"fallenbr{k}", [(x - 5, rnd.uniform(-8, -3), 1.0), (x + 5, rnd.uniform(3, 8), 1.4)], [0.7, 0.4], m["bark"], seg=6), fam, 2, 3)
    # the owner's marker: a stick with a team-dyed rag (all states)
    f.add(K.pole("markerstick", (-26, 10, 0), (-27, 10, 20), m["wood_dk"], r=0.8), fam, 0, 3)
    rag = C.tube("rag", [(-27, 10, 19), (-31, 9.6, 18), (-34.5, 9.2, 16.8)], [2.6, 2.3, 1.2], m["team_hide"], seg=8, flat=0.25)
    for v in rag.data.vertices:
        v.co.z -= 2.0
    f.add(rag, fam, 0, 3, team=True)


SPIKE_PIT = K.make("spike_pit", "Spike Pit", AGE, "trap", _spike_pit, canvas=(84, 52), feet=(42, 16), yaw=-12.0,
                   height=24, hit=(0, 6), material="wood", foot=28.0)


FORTS = [PALISADE, SLING_PERCH, WAR_CAMP, SPIKE_PIT]
