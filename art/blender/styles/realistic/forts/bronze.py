"""Bronze Age forts, realistic style (DESIGN A16.14.4): Cyclopean Wall, Pyrgos Tower, Muster Tents, Hidden
Stakes. Limestone and whitewash, cedar, linen, reed and bronze with a green patina; team colour on painted
shields, linen banners and dyed tent panels.
"""
import math
import random

from lib import core as C
from lib import mats as M
import kit as K
import parts as P

AGE = "bronze"


def _shield(f, c, r, face_axis, m, fam="body", lo=0, hi=9):
    """A round aspis: a team-painted dish with a bronze rim and boss, facing -y ('y') or +x ('x')."""
    x, y, z = c

    def P3(u, v, w=0.0):
        # u, v in the shield plane, w out of it (toward the viewer or the lane)
        return (x + u, y - w, z + v) if face_axis == "y" else (x + w, y + u, z + v)
    import bmesh
    bm = bmesh.new()
    rings = []
    for j, (rr, ww) in enumerate(((0.0, 1.6), (r * 0.35, 1.3), (r * 0.7, 0.8), (r, 0.0))):
        ring = []
        for i in range(28):
            a = 2 * math.pi * i / 28
            ring.append(bm.verts.new(P3(rr * math.cos(a), rr * math.sin(a), ww)))
        rings.append(ring)
    for j in range(3):
        for i in range(28):
            q = (rings[j][i], rings[j][(i + 1) % 28], rings[j + 1][(i + 1) % 28], rings[j + 1][i])
            bm.faces.new(q)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.05)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    face = C.from_bm("aspis", bm, m["team"])
    so = face.modifiers.new("so", "SOLIDIFY")
    so.thickness = 0.8
    f.add(face, fam, lo, hi, team=True)
    pts = [P3(r * math.cos(a), r * math.sin(a), 0.2) for a in [i * 2 * math.pi / 32 for i in range(33)]]
    f.add(C.tube("rim", pts, [0.95] * 33, m["bronze"], seg=6, caps=False), fam, lo, hi)
    f.add(C.sphere("boss", r * 0.18, m["bronze"], loc=P3(0, 0, 1.6)), fam, lo, hi)


# ================================================================================== Cyclopean Wall
def _cyclopean(f):
    m, rnd = f.m, random.Random(12)
    lime = M.stone("#b0a48e", "#8e8470", name="cyclo", bump=1.6)
    lime_dk = M.stone("#9a8f7c", "#7a7062", name="cyclo_dk", bump=1.5)
    f.add(K.mound("mound", (0, 0, 0), (15, 40, 4), m["earth"]), "body")
    f.add(K.mound("mound_r", (0, 0, 0), (17, 42, 4), m["earth"]), "rubble")
    courses = [(7.0, 6, 14.0, 17.0), (21.5, 5, 14.0, 15.5), (35.5, 6, 13.0, 14.0), (49.0, 5, 12.5, 13.0), (61.0, 6, 10.0, 12.0)]
    span = 70.0
    for ci, (z, n, hgt, thick) in enumerate(courses):
        ys = [-span / 2]
        for i in range(n):
            ys.append(ys[-1] + span / n * rnd.uniform(0.8, 1.2))
        k = span / (ys[-1] - ys[0])
        ys = [-span / 2 + (y + span / 2) * k for y in ys]
        for i in range(n):
            y0, y1 = ys[i], ys[i + 1]
            y = (y0 + y1) / 2 + (1.5 if ci % 2 else -1.5)
            size = (thick * rnd.uniform(0.92, 1.05), (y1 - y0) - 0.8, hgt * rnd.uniform(0.95, 1.08))
            edge = abs(y) / (span / 2)
            mat = lime if (i + ci) % 3 else lime_dk
            rot = (rnd.uniform(-0.06, 0.06), rnd.uniform(-0.1, 0.1), rnd.uniform(-0.05, 0.05))

            def make(sfx, fallen, y=y, z=z, size=size, mat=mat, ci=ci, i=i, rot=rot):
                if fallen:
                    return P.blockbox(f"cyf{ci}_{i}", (20 + rnd.uniform(0, 14), y + rnd.uniform(-6, 6), size[2] * 0.42), (size[0] * 0.8, size[1] * 0.75, size[2] * 0.8), mat, rnd,
                                      bevel=2.2, jitter=0.2, rot=(rnd.uniform(-0.4, 0.4), rnd.uniform(-0.3, 0.3), rnd.uniform(-0.8, 0.8)))
                return P.blockbox(f"cy{ci}_{i}", (rnd.uniform(-0.8, 0.8) - ci * 0.6, y, z), size, mat, rnd, bevel=2.4, jitter=0.18, rot=rot)
            P.breakable(f, make, (ci + 1) / len(courses), edge, rnd, fall_to=True, keep=0.15 if ci == 0 else 0.0)
    # the team: a linen banner hung down the lane face from a cedar beam, and two painted shields
    cedar = M.wood("#6b4e36", "#4e3a2a", name="cedar")
    f.add(K.pole("beam", (8, -22, 70), (8, 22, 70), cedar, r=1.6), "body", 0, 1)
    for y0 in (-16.0, 6.0):
        f.add(P.cloth_panel(f"banner{y0}", y0, y0 + 11, 36, 69, 10.5, m["cloth"], sag=0.6, facing="x", seg=(6, 10), wave=0.5), "body", 0, 1, team=True)
        f.add(K.lash("hem", [(10.8, y0, 36), (10.8, y0 + 11, 36)], m["leather"], r=0.6), "body", 0, 1)
        f.add(C.blobs("banner_g", [((20, -6, 1.0), (8, 10, 1.0))], m["cloth"], res=0.8), "body", 2, 3, team=True)
    _shield(f, (9.5, -26, 22), 7.0, "x", m, lo=0, hi=2)
    _shield(f, (9.5, 25, 20), 7.0, "x", m, lo=0, hi=1)
    K.flag_pole(f, cedar, m["bronze"], r=1.3)
    K.banner_cloth(f, m["cloth"], width=10.0)
    P.rubble_heap(f, (6, 0, 0), (20, 26), lime, rnd, n=14, size=(4, 9))
    # scaffold: a timber ramp with a sledge and a block, poles and ropes
    for y in (-30.0, 30.0):
        f.add(K.pole("sp", (1, y, -1), (3, y, 72), cedar, r=1.4), "scaffold")
    f.add(K.lash("sline", [(2, -30, 70), (2.5, 0, 66), (3, 30, 70)], m["rope"], r=0.5), "scaffold")
    for s in (-1, 1):
        f.add(K.pole("ramp", (-40, s * 6, 0), (-6, s * 6, 36), cedar, r=1.4), "scaffold")
    for k in range(6):
        t = k / 6
        f.add(K.pole("rrung", (-40 + 34 * t, -6, 36 * t), (-40 + 34 * t, 6, 36 * t), cedar, r=0.7), "scaffold")
    f.add(K.rock("sblock", (-24, 0, 23), (9, 8, 6), lime, seed=5, sub=3), "scaffold")
    f.add(K.lash("haul", [(-24, 0, 26), (-10, 0, 40), (2, 0, 66)], m["rope"], r=0.5), "scaffold")


CYCLOPEAN = K.make("cyclopean_wall", "Cyclopean Wall", AGE, "wall", _cyclopean, canvas=(140, 124), feet=(70, 16), yaw=-44.0,
                   height=92, hit=(4, 36), material="stone", flag=(-8.0, 2.0, 0.0, 88.0), flag_len=22.0, foot=28.0)


# ================================================================================== Pyrgos Tower
def _pyrgos(f):
    m, rnd = f.m, random.Random(14)
    white = M.stone("#d2c8b4", "#b8ad98", name="whitewash", bump=0.9)
    white_dk = M.stone("#bdb29d", "#a09580", name="whitewash_dk", bump=0.9)
    cedar = M.wood("#6b4e36", "#4e3a2a", name="cedar")
    W, D, H = 26.0, 22.0, 56.0
    f.add(K.rock("plinth", (0, 0, 2.0), (18, 15, 3.4), m["stone_dk"], seed=3, sub=3, flat_top=3.2), "body")
    # coursed blocks on the four faces
    ch = 7.0
    for ci in range(int(H // ch)):
        z = 3.5 + ci * ch + ch / 2
        for face in ("-y", "+y", "-x", "+x"):
            L = W if face in ("-y", "+y") else D
            n = 4 if face in ("-y", "+y") else 3
            for i in range(n):
                off = (i + 0.5 + (0.25 if ci % 2 else -0.25)) * L / n - L / 2
                if abs(off) > L / 2 - 1:
                    continue
                if face == "-y":
                    c = (off, -D / 2, z)
                    size = (L / n - 0.4, 3.2, ch - 0.4)
                elif face == "+y":
                    c = (off, D / 2, z)
                    size = (L / n - 0.4, 3.2, ch - 0.4)
                elif face == "-x":
                    c = (-W / 2, off, z)
                    size = (3.2, L / n - 0.4, ch - 0.4)
                else:
                    c = (W / 2, off, z)
                    size = (3.2, L / n - 0.4, ch - 0.4)
                mat = white if (ci + i) % 4 else white_dk
                edge = abs(off) / (L / 2)

                def make(sfx, fallen, c=c, size=size, mat=mat, ci=ci, i=i, face=face):
                    if fallen:
                        return P.blockbox(f"pf{ci}{face}{i}", (c[0] + rnd.uniform(8, 22), c[1] - rnd.uniform(4, 12), size[2] * 0.4), (size[0] * 0.8, 3.0, size[2] * 0.8), mat, rnd, bevel=0.8)
                    return P.blockbox(f"pb{ci}{face}{i}", c, size, mat, rnd, bevel=0.7)
                P.breakable(f, make, (ci + 1) * ch / H, edge * 0.6, rnd, fall_to=face in ("-y", "+x"), keep=0.08)
    # the core (so broken faces never show the sky through the tower)
    f.add(C.box("core", W - 4, D - 4, H - 1, white_dk, bevel=0.5, loc=(0, 0, 3.5 + (H - 1) / 2)), "body")
    # door, string course, deck
    f.add(C.box("door", 8, 1.2, 14, m["hole"], bevel=0.3, loc=(-4, -D / 2 - 1.2, 10.5)), "body")
    f.add(C.box("lintel", 11, 3.6, 2.4, white_dk, bevel=0.5, loc=(-4, -D / 2 - 1.0, 18.5)), "body")
    f.add(C.box("string", W + 3, D + 3, 2.0, cedar, bevel=0.4, loc=(0, 0, H + 3.5)), "body")
    for k in range(7):
        f.add(C.tube(f"joist{k}", [(-W / 2 - 2.5, -D / 2 + 2 + k * 3.1, H + 3.2), (W / 2 + 2.5, -D / 2 + 2 + k * 3.1, H + 3.2)], [0.9, 0.9], cedar, seg=6), "body")
    # merlons: back and sides are body, the near (-y) row is the front (drawn over the crew)
    top = H + 4.5
    for i in range(4):
        x = -W / 2 + 3.2 + i * (W - 6.4) / 3
        for fam, y in (("body", D / 2 - 1.8), ("front", -D / 2 + 1.8)):
            def make(sfx, fallen, x=x, y=y, i=i, fam=fam):
                if fallen:
                    return P.blockbox(f"mf{fam}{i}", (x + rnd.uniform(10, 20), -D / 2 - rnd.uniform(6, 14), 2.4), (5, 3.2, 4.5), white, rnd)
                return P.blockbox(f"m{fam}{i}", (x, y, top + 3.5), (5.4, 3.6, 7.0), white, rnd, bevel=0.6)
            P.breakable(f, make, 0.9, abs(i - 1.5) / 1.5, rnd, fall_to=True, fam=fam)
    for fam, x in (("body", -W / 2 + 1.8), ("body", W / 2 - 1.8)):
        for j in range(2):
            f.add(P.blockbox(f"ms{x}{j}", (x, -D / 2 + 6 + j * (D - 12), top + 3.5), (3.6, 5.0, 7.0), white, rnd, bevel=0.6), fam, 0, 2)
    # the painted shield on the tower face, and a smaller one on the lane side
    _shield(f, (3.5, -D / 2 - 2.2, 32), 7.5, "y", m, lo=0, hi=2)
    _shield(f, (W / 2 + 2.0, 0, 38), 5.5, "x", m, lo=0, hi=1)
    # a linen awning over the door (team)
    f.add(P.cloth_panel("awning", -10, 2, 20, 24, -D / 2 - 3, m["cloth"], sag=1.0, seg=(8, 3), wave=0.2), "body", 0, 1, team=True)
    K.flag_pole(f, cedar, m["bronze"], r=1.0)
    K.banner_cloth(f, m["cloth"], width=8.0)
    P.rubble_heap(f, (4, -4, 0), (18, 14), white, rnd, n=16, size=(3, 7))
    f.add(C.box("rcore", W - 6, D - 6, 12, white_dk, bevel=0.6, loc=(0, 0, 7)), "rubble")
    # scaffold: cedar poles lashed around the rising tower, a ladder
    K.scaffold_frame(f, -W / 2 - 4, W / 2 + 4, -D / 2 - 4, D / 2 + 4, H + 6, cedar, m["rope"], levels=2)


PYRGOS = K.make("pyrgos_tower", "Pyrgos Tower", AGE, "tower", _pyrgos, canvas=(112, 136), feet=(58, 14), yaw=-12.0,
                height=110, hit=(0, 34), material="stone", flag=(-10.0, 8.0, 60.5, 36.0), flag_len=16.0, foot=18.0,
                crew=dict(visualId="unit.javelineer", at=(1.0, 0.0, 61.0), scale=0.6))


# ================================================================================== Muster Tents
def _muster(f):
    m, rnd = f.m, random.Random(16)
    cedar = M.wood("#6b4e36", "#4e3a2a", name="cedar")
    linen = C.mat("tentlinen", "#b8aa8c", rough=0.9, noise=0.14, nscale=1.2, bump=0.6, sheen=0.3, ramp2="#9c9076")
    # the main tent (along x, its door end toward the lane), a small one behind
    f.add(P.a_tent("tent", -26, 16, 17, 38, linen, y=-2), "body", 0, 1)
    f.add(P.a_tent("tent_s", -24, 14, 18, 30, linen, y=-2, sag=5.0, skew=6.0), "body", 2, 2)
    f.add(P.a_tent("tent2", -44, -14, 13, 28, m["canvas"], y=22), "body", 0, 2)
    # dyed team valances: a band along both roof slopes, just proud of the linen, with a dark hem
    import bmesh

    def valance(name, x0, x1, half_w, h, y, sag, skew, v0, v1, lo, hi):
        bm = bmesh.new()
        for sgn in (-1, 1):
            rows = []
            for v in (v0, (v0 + v1) / 2, v1):
                row = []
                for i in range(13):
                    u = i / 12
                    x = x0 + (x1 - x0) * u + skew * (1 - v)
                    sv = sag * math.sin(math.pi * u) * math.sin(math.pi * v)
                    row.append(bm.verts.new((x, y + sgn * (half_w * v + 0.9), h * (1 - v) - sv + 0.5)))
                rows.append(row)
            for j in range(2):
                for i in range(12):
                    q = (rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i])
                    bm.faces.new(q if sgn < 0 else tuple(reversed(q)))
            f.add(K.lash(name + "hem", [(x0 + skew * (1 - v1), y + sgn * (half_w * v1 + 1.1), h * (1 - v1) + 0.4), (x1 + skew * (1 - v1), y + sgn * (half_w * v1 + 1.1), h * (1 - v1) + 0.4)], m["leather"], r=0.45), "body", lo, hi)
        o = C.from_bm(name, bm, m["cloth"])
        so = o.modifiers.new("so", "SOLIDIFY")
        so.thickness = 0.5
        f.add(o, "body", lo, hi, team=True)

    valance("val", -26, 16, 17, 38, -2, 0.8, 0.0, 0.5, 0.78, 0, 1)
    valance("val_s", -24, 14, 18, 30, -2, 5.0, 6.0, 0.5, 0.78, 2, 2)
    # ridge pole and guy ropes
    f.add(K.pole("ridge", (-28, -2, 38.5), (18, -2, 38.5), cedar, r=1.0), "body", 0, 1)
    for x in (-26, 16):
        f.add(K.pole("upright", (x, -2, 0), (x, -2, 40), cedar, r=1.0), "body", 0, 1)
        for s in (-1, 1):
            f.add(K.lash("guy", [(x, -2, 38), (x + 6 * (1 if x > 0 else -1), -2 + s * 26, 0)], m["rope"], r=0.35), "body", 0, 1)
    # stage 3: the tent down, a heap of linen with poles
    heap = C.blobs("heap", [((rnd.uniform(-20, 12), rnd.uniform(-12, 10), rnd.uniform(3, 8)), (rnd.uniform(7, 12), rnd.uniform(6, 10), rnd.uniform(2.5, 4.5))) for _ in range(10)], linen, res=0.8)
    C.displace(heap, 2.2, 0.35)
    f.add(heap, "body", 3, 3)
    hb = C.blobs("heapband", [((0, -8, 7), (14, 8, 4))], m["cloth"], res=0.8)
    C.displace(hb, 1.4, 0.5)
    f.add(hb, "body", 3, 3, team=True)
    f.add(K.pole("hpole", (-20, -6, 2), (4, 10, 28), cedar, r=1.0), "body", 3, 3)
    # the door (the lane end): closed flap, folded, open
    x1 = 16.2
    import bmesh
    for fr, w in enumerate((1.0, 0.5, 0.0)):
        if fr > 0:
            bm = bmesh.new()
            vs = [bm.verts.new((x1 + 0.4, -2 - 9, 0)), bm.verts.new((x1 + 0.4, -2 + 9, 0)), bm.verts.new((x1 + 0.4, -2, 26))]
            bm.faces.new(vs)
            f.add(C.from_bm(f"doorhole{fr}", bm, m["hole"]), "door", fr, fr)
        if w > 0:
            bm = bmesh.new()
            y0 = -2 - 9.5
            y1 = -2 - 9.5 + 19 * w
            vs = [bm.verts.new((x1 + 0.9, y0, 0)), bm.verts.new((x1 + 0.9, y1, 0)), bm.verts.new((x1 + 0.9, -2 + (y1 - (-2)) * 0.1 if w < 1 else -2, 27))]
            bm.faces.new(vs)
            o = C.from_bm(f"flap{fr}", bm, m["cloth"])
            so = o.modifiers.new("so", "SOLIDIFY")
            so.thickness = 0.6
            f.add(o, "door", fr, fr, team=True)
    # bronze-rimmed shields leaned on the tent, spears stacked, a brazier
    _shield(f, (22, -16, 7), 6.5, "x", m, lo=0, hi=1)
    _shield(f, (-8, -20.5, 7), 6.5, "y", m, lo=0, hi=2)
    P.spear_stack(f, (30, 10), 4, m["wood"], m["bronze"], rnd, hi=1, h=36)
    for k in range(3):
        f.add(C.tube(f"sfall{k}", [(22, 4 + k * 3, 1.0), (46, -2 + k * 4, 1.3)], [0.7, 0.55], m["wood"], seg=6), "body", 2, 3)
    P.brazier(f, (32, -14, 12), m["bronze"], m["fire"], m["fire_core"], m["ember"], hi=1)
    K.flag_pole(f, cedar, m["bronze"], r=1.2)
    K.banner_cloth(f, m["cloth"], width=11.0)
    # rubble: flattened linen, poles
    rh = C.blobs("rheap", [((0, 0, 2.5), (26, 18, 3.5)), ((-30, 20, 2.5), (14, 10, 3))], linen, res=0.9)
    C.displace(rh, 1.5, 0.5)
    f.add(rh, "rubble")
    f.add(C.blobs("rband", [((6, -8, 3.5), (12, 7, 2.5))], m["cloth"], res=0.8), "rubble", team=True)
    for k in range(4):
        a = rnd.uniform(-0.5, 0.5)
        f.add(C.tube(f"rp{k}", [(-24 + k * 10, -14, 1.2), (-24 + k * 10 + 30 * math.cos(a), -14 + 30 * math.sin(a) + 10, 1.4)], [1.0, 0.8], cedar, seg=6), "rubble")
    # scaffold: the bare uprights and ridge, rolled linen, a pile of pegs
    for x in (-26, 16):
        f.add(K.pole("supright", (x, -2, 0), (x, -2, 40), cedar, r=1.0), "scaffold")
    f.add(K.pole("sridge", (-28, -2, 38.5), (18, -2, 38.5), cedar, r=1.0), "scaffold")
    f.add(C.tube("sroll", [(-36, -20, 4), (-10, -24, 4)], [4, 4], linen, seg=12), "scaffold")
    f.add(C.tube("sroll2", [(-32, -14, 11), (-8, -18, 11)], [3.6, 3.6], m["cloth"], seg=12), "scaffold", team=True)


MUSTER = K.make("muster_tents", "Muster Tents", AGE, "camp", _muster, canvas=(150, 110), feet=(76, 16), yaw=-24.0,
                height=80, hit=(0, 22), material="wood", flag=(-30.0, -18.0, 0.0, 70.0), flag_len=20.0, foot=32.0,
                lights=[((32.0, -14.0, 18.0), 12, 1)], smoke=[((32.0, -14.0, 20.0), 0)], extra_meta={"flag": {"crumbleMax": 2, "z": "front"}})


# ================================================================================== Hidden Stakes (trap)
def _stakes(f):
    m, rnd = f.m, random.Random(33)
    reed = M.straw("#a8966c", name="reed")
    tips = C.mat("bronzetip", "#8a6a3e", rough=0.35, metal=1.0, noise=0.2, nscale=1.6, bump=0.3, ramp2="#5f7a62")

    def cover(f):
        # a woven reed mat strewn with sand and dry grass
        for k in range(9):
            x = -19 + k * 4.8
            f.add(C.tube(f"reedv{k}", [(x - 2, -9, 1.3), (x + 1, 0, 1.9), (x + 2, 9, 1.3)], [0.6, 0.6, 0.4], reed, seg=5), "trap", 1, 1)
        for k in range(5):
            y = -7 + k * 3.5
            f.add(C.tube(f"reedh{k}", [(-22, y, 1.5), (0, y + 0.5, 2.1), (22, y - 0.5, 1.5)], [0.55, 0.55, 0.35], reed, seg=5), "trap", 1, 1)
        sand = C.blobs("sand", [((rnd.uniform(-16, 16), rnd.uniform(-6, 6), 2.0), (rnd.uniform(3, 6), rnd.uniform(2, 3.5), 0.6)) for _ in range(12)], m["dirt"], res=0.5)
        C.displace(sand, 0.6, 1.2)
        f.add(sand, "trap", 1, 1)
        for k, (x, y) in enumerate(((-8, -1), (5, 3), (13, -3))):
            f.add(K.stake(f"hint{k}", (x, y, 0.5), (x + 0.4, y, 5.0), 0.9, tips, point=2.5), "trap", 1, 1)

    P.pit_patch(f, m, rnd, cover, m["wood"], tips, lambda f: P.marker_flag(f, m, m["wood_dk"], m["cloth"]), stone_mat=M.stone("#b0a48e", "#8e8470", name="cyclo_m"))


HIDDEN_STAKES = K.make("hidden_stakes", "Hidden Stakes", AGE, "trap", _stakes, canvas=(84, 52), feet=(42, 16), yaw=-12.0,
                       height=24, hit=(0, 6), material="wood", foot=28.0)


FORTS = [CYCLOPEAN, PYRGOS, MUSTER, HIDDEN_STAKES]
