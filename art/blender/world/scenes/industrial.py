"""Industrial scenes (DESIGN A17.12: chimneys, gas holders, rail viaducts, smoke plumes).

Classic "Iron Valley" (format 2, the first Blender layers for Industrial): a smoky works valley under a
hazy cream sky. Far: a many-arched brick viaduct across the valley, tall banded chimneys, two lattice gas
holders, saw-tooth sheds, a pithead winding tower and a chapel spire on the hill. Mid: rows of terraced
houses with chimney pots, a brick works with a bottle kiln, a canal with a lock and a narrowboat, a gantry
crane, lamp posts and telegraph wires. Ambient: chimney and kiln smoke, a steam train crossing the viaduct
every 26 s, the crane swings, the winding wheel turns, the narrowboat bobs, lit windows under night skies.

Palette (A17.12): iron #5B6168, coal #2B2A2E, smoke cream #DCD6C8, muted brick #8A6A63; copper #B06A3B
only as a small accent (A11 colour rule).

Layout note: the arena ground covers everything below screen y = -40 lu, so mid-ground objects stand on
a bank whose visible top is at -50..-75 lu.
"""
import math
import random

from ageborn_art.geometry import Geo

from world.common import box, cyl, rock
from world.scenes import kit
from world.scenes.common import Prop, Scene, dk, lt, mixc, ridge
from world.scenes.kit import Parts

PAL = dict(skyTop=0x96A2AA, skyBottom=0xE2D8C4, light=0xF4E8D0, far=0x8A8682, mid=0x6E6A64, near=0x54504C)
K = dict(
    brick=0x8C6C64, brick_dk=0x765A54, brick_lt=0xA0827A, slate=0x5F6570, slate_dk=0x50555F, iron=0x5B6168,
    iron_dk=0x45494F, coal=0x2E2D31, soot=0x48464C, smoke=0xDCD6C8, copper=0xB06A3B, verdigris=0x6E9A8A,
    hill=0x8C8C74, hill_dk=0x76786A, grass=0x7E8862, grass_dk=0x6A7454, stone=0xA8A296, water=0x7E9294,
    wood=0x6A5444, window=0x3C3B42, cream=0xD8D0BE,
)
SKY = {"top": "#96A2AA", "bottom": "#E2D8C4", "horizon": "#E8DECA", "cloudTint": "#D4CEC2", "celestial": "sun",
       "sunAt": [380, -520, 40], "smog": 0.3}
FAR_E = math.radians(8.0)
MID_E = math.radians(12.0)
# the viaduct deck (far layer): the train runs on it
DECK = {"y": 300.0, "z": 140.0, "x0": -60.0, "x1": 1250.0}
DECK_SCREEN_Y = -round((DECK["z"] + 4) * math.cos(FAR_E) + DECK["y"] * math.sin(FAR_E), 1)
# the winding wheel (far) and the crane (mid). The moving props stay where your half shows them with your
# base at the left (far x < 800, mid x < 680 on a phone); from about 850 the seam cross-fades.
WHEEL = (330.0, 236.0, 156.0)
CRANE = (560.0, 64.0, 44.0)
BOAT = (630.0, 40.0, 42.0)


def scr(p, e):
    x, y, z = p
    return [round(x, 1), -round(z * math.cos(e) + y * math.sin(e), 1)]


def chimney(P, x, y, z, h, r, seed=0):
    """A tall tapering brick chimney with dark bands and a cap."""
    gb = P.g(K["brick_dk"], outline=0.5)
    gd = P.g(K["coal"], outline=0.0, highlight=False)
    cyl(gb, (x, y, z), (x, y, z + h), r, r * 0.68, bevel=0.8, segs=14)
    for t in (0.42, 0.78):
        cyl(gd, (x, y, z + h * t), (x, y, z + h * t + 3.2), r * (1 - 0.32 * t) + 0.5, bevel=0.3, segs=14)
    cyl(gd, (x, y, z + h - 1), (x, y, z + h + 5), r * 0.78, bevel=0.6, segs=14)
    return (x, y, z + h + 6)


def viaduct(P, x0, x1, y, z_deck, n, foot=-30.0, depth=16.0):
    """A many-arched brick viaduct: battered piers, open arches (the valley shows through), a stone
    cornice and a parapet along the deck."""
    gb = P.g(K["brick"], outline=0.5)
    gl = P.g(K["stone"], outline=0.4)
    span = (x1 - x0) / n
    pier = span * 0.22
    r = (span - pier) / 2
    spring = z_deck - r - 12
    for i in range(n + 1):
        px = x0 + i * span
        box(gb, (px, y, (foot + spring) / 2 + 1), (pier / 2, depth / 2, (spring - foot) / 2 + 1), p=6, taper=(1.25, 1.0), cuts=2)
        box(gl, (px, y - 0.6, spring + 1.2), (pier / 2 + 1.2, depth / 2 + 0.6, 1.4), p=5, cuts=1)
    for i in range(n):
        cx = x0 + (i + 0.5) * span
        pts = [(cx - span / 2, z_deck), (cx + span / 2, z_deck), (cx + span / 2, spring), (cx + r, spring)]
        pts += [(cx + r * math.cos(math.pi * k / 14), spring + r * math.sin(math.pi * k / 14)) for k in range(1, 14)]
        pts += [(cx - r, spring), (cx - span / 2, spring)]
        gb.slab(pts, y, depth)
        # voussoirs: a lighter ring round the arch
        ring = [(cx + (r + 2.4) * math.cos(math.pi * k / 14), spring + (r + 2.4) * math.sin(math.pi * k / 14)) for k in range(15)]
        ring += [(cx + r * math.cos(math.pi * k / 14), spring + r * math.sin(math.pi * k / 14)) for k in range(14, -1, -1)]
        gl.slab(ring, y - depth / 2 - 0.4, 0.8)
    box(gl, ((x0 + x1) / 2, y - 0.6, z_deck + 2.0), ((x1 - x0) / 2 + 4, depth / 2 + 1.4, 2.2), p=6, cuts=1)
    box(gb, ((x0 + x1) / 2, y + 3, z_deck + 7.5), ((x1 - x0) / 2 + 2, 2.6, 3.6), p=6, cuts=1)


def gas_holder(P, x, y, z, r, h, fill=0.7):
    """A lattice gas holder: columns and girder rings round a drum with a shallow domed top."""
    gi = P.g(K["iron_dk"], outline=0.3)
    gdr = P.g(K["iron"], finish="metal", outline=0.5)
    cyl(gdr, (x, y, z), (x, y, z + h * fill), r * 0.94, bevel=1.0, segs=28)
    gdr.lathe([(0, 0), (r * 0.94, 0), (r * 0.6, r * 0.12), (0, r * 0.16)], (x, y, z + h * fill), (x, y, z + h * fill + r * 0.16),
              segs=28)
    for k in range(10):
        a = math.pi * 2 * k / 10 + 0.2
        px, py = x + math.cos(a) * r, y + math.sin(a) * r * 0.9
        if py > y + r * 0.45:
            continue
        gi.capsule((px, py, z), (px, py, z + h), 1.5)
    for t in (0.33, 0.66, 1.0):
        gi.lathe([(r - 1.2, -1.2), (r + 0.4, -1.2), (r + 0.4, 1.2), (r - 1.2, 1.2)], (x, y, z + h * t - 1), (x, y, z + h * t + 1),
                 segs=32)


def shed_row(P, x0, n, y, z, w, h, d, roof=None):
    """Saw-tooth roofed works sheds: brick walls with tall dark windows, glazed north lights on top."""
    gb = P.g(K["brick_dk"], outline=0.5)
    gr = P.g(roof or K["slate"], outline=0.5)
    gw = P.g(K["window"], outline=0.0, highlight=False)
    box(gb, (x0 + n * w / 2, y, z + h / 2), (n * w / 2, d / 2, h / 2), p=8, cuts=2)
    for i in range(n):
        cx = x0 + i * w
        gr.slab([(cx, z + h), (cx + w, z + h), (cx + w * 0.18, z + h + w * 0.45)], y, d + 2)
        for k in range(2):
            box(gw, (cx + w * (0.3 + 0.4 * k), y - d / 2 - 0.3, z + h * 0.5), (w * 0.08, 0.6, h * 0.28), p=5, cuts=1)


def terrace_row(P, st, x0, n, y, z, w=26.0, h=26.0, d=20.0, step=0.0, lights=True, seed=0, smoke=0):
    """A row of two-storey terraced houses: brick fronts, slate roofs, chimney pots, doors and windows."""
    rnd = random.Random(seed)
    gb, gb2 = P.g(K["brick"], outline=0.5), P.g(K["brick_dk"], outline=0.5)
    gr = P.g(K["slate"], outline=0.5)
    gc = P.g(K["brick_dk"], outline=0.4)
    gp = P.g(K["copper"], outline=0.3)
    gw = P.g(K["window"], outline=0.0, highlight=False)
    gs = P.g(K["cream"], outline=0.0)
    lit = []
    for i in range(n):
        cx = x0 + i * w
        zz = z + i * step
        (gb if i % 2 else gb2).blob((cx, y, zz + h / 2), (w / 2 - 0.4, d / 2, h / 2), p=8, cuts=2)
        gr.lathe([(0, 0), (w * 0.74, 0), (0.4, h * 0.4), (0, h * 0.42)], (cx, y + 2, zz + h), (cx, y + 2, zz + h * 1.42), segs=4,
                 rot=(0, 0, 45), squash=(1.0, d / w * 0.9))
        if i % 2 == 0:
            box(gc, (cx + w * 0.3, y + 4, zz + h * 1.3), (3.0, 3.0, 6), p=6, cuts=1)
            for k in (-1, 1):
                cyl(gp, (cx + w * 0.3 + k * 1.4, y + 2.6, zz + h * 1.3 + 6), (cx + w * 0.3 + k * 1.4, y + 2.6, zz + h * 1.3 + 9), 0.9,
                    bevel=0.2, segs=8)
        fy = y - d / 2 - 0.3
        box(gw, (cx - w * 0.22, fy, zz + h * 0.22), (w * 0.09, 0.6, h * 0.2), p=5, cuts=1)
        box(gs, (cx - w * 0.22, fy, zz + h * 0.44), (w * 0.12, 0.7, 1.0), p=4, cuts=1)
        for k, wx in enumerate((cx + w * 0.16, cx - w * 0.16)):
            wz = zz + h * (0.28 if k == 0 else 0.72)
            box(gw, (wx, fy, wz), (w * 0.1, 0.6, h * 0.12), p=5, cuts=1)
            box(gs, (wx, fy - 0.2, wz - h * 0.13), (w * 0.12, 0.8, 0.8), p=4, cuts=1)
            if lights and rnd.random() < 0.45:
                lit.append((wx, fy, wz))
    for p in lit:
        st.light(p, 4.5)
    for i in range(smoke):
        cx = x0 + (1 + i * 3) * w
        st.amb("emit", "fx.p.smoke", (cx + w * 0.3, y + 4, z + (1 + i * 3) * step + h * 1.3 + 12), rate=0.45, speed=10, scale=1.0,
               tint=lt(K["smoke"], 0.2), alpha=0.4, life=2600)


def back(st, P):
    """Distant smoky valley ridges with a faint row of chimneys."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    # low enough that a sky theme's moon (y -250) hangs above the ridge, not behind it
    ridge(st, hz(0x8A8A8E, 0.42), -300, 1500, -60, 160, 1400, 61, lumps=8, jag=0.08, peaks=False)
    g = pt.g(hz(0x7E7A80, 0.4), outline=0.0)
    for x, h in ((120, 110), (180, 140), (640, 120), (1180, 150), (1250, 110)):
        cyl(g, (x, 1300, 20), (x, 1300, 20 + h), 9, 6, bevel=0.5, segs=10)
    pt.flush(st)
    for x, h in ((180, 140), (1180, 150)):
        st.amb("emit", "fx.p.smoke", (x, 1300, 26 + h), rate=0.5, speed=7, scale=2.6, tint=hz(0xBCB6AC, 0.3), alpha=0.35, life=4400)


def far(st, P):
    pt = Parts()
    rnd = random.Random(31)
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    # the valley sides: hills left and right, the valley floor between
    ridge(st, hz(0x8E8C90, 0.32), -300, 1500, -20, 150, 560, 5, lumps=9, jag=0.08, peaks=False)
    g = pt.g(hz(K["hill"], 0.08), outline=0.0)
    kit.hill(g, -120, 330, -10, 300, 90, 170, seed=2, jag=0.05, p=2.4)
    kit.hill(g, 1380, 330, -10, 300, 90, 160, seed=3, jag=0.05, p=2.4)
    kit.hill(g, 620, 380, -20, 520, 90, 80, seed=4, jag=0.04, p=2.2)
    gd = pt.g(hz(K["hill_dk"], 0.06), outline=0.0)
    for i in range(70):
        x = rnd.uniform(-260, 1460)
        kit.round_bush(gd, x, rnd.uniform(240, 280), rnd.uniform(5, 9), seed=100 + i, z=rnd.uniform(30, 100))
    # the chapel on the left hill and terraces climbing its flank
    gs = pt.g(K["stone"], outline=0.4)
    box(gs, (-40, 250, 150), (16, 10, 14), p=7, cuts=2)
    cyl(gs, (-58, 250, 140), (-58, 250, 196), 6, 5, bevel=0.4, segs=10)
    pt.g(K["slate"], outline=0.4).lathe([(0, 0), (7, 0), (0.4, 30), (0, 31)], (-58, 250, 196), (-58, 250, 227), segs=8)
    pt.g(K["slate"], outline=0.4).lathe([(0, 0), (22, 0), (0.4, 12), (0, 13)], (-36, 250, 164), (-36, 250, 177), segs=4,
                                       rot=(0, 0, 45), squash=(1.0, 0.5))
    terrace_row(pt, st, -230, 6, 270, 70, w=20, h=18, d=14, step=9, lights=True, seed=1)
    terrace_row(pt, st, 1180, 6, 270, 110, w=20, h=18, d=14, step=-7, lights=True, seed=2)
    # saw-tooth works sheds on the valley floor (below the viaduct's deck)
    shed_row(pt, 210, 8, 196, 10, 28, 34, 24)
    shed_row(pt, 760, 6, 192, 14, 30, 30, 24)
    # the viaduct across the valley
    viaduct(pt, DECK["x0"], DECK["x1"], DECK["y"], DECK["z"], 13, foot=-10)
    # the embankments where the viaduct meets the valley sides
    ge = pt.g(hz(K["hill"], 0.04), outline=0.0)
    for x, seed in ((-150, 21), (1340, 22)):
        rock(ge, (x, 290, 40), (120, 26, 104), seed=seed, jag=0.04, p=2.4)
    # chimneys with their smoke
    for x, y, z, h, r in ((150, 330, 20, 230, 11.0), (470, 340, 10, 270, 13.0), (518, 350, 10, 210, 10.5), (1010, 336, 20, 250, 12.0),
                          (1290, 300, 80, 170, 9.0)):
        top = chimney(pt, x, y, z, h, r)
        st.amb("emit", "fx.p.smoke", top, rate=0.9, speed=12, scale=2.6, tint=lt(K["smoke"], 0.1), alpha=0.5, life=3600)
    # gas holders
    gas_holder(pt, 660, 360, 10, 54, 108, fill=0.62)
    gas_holder(pt, 1180, 352, 30, 44, 90, fill=0.82)
    # the pithead winding tower (the wheel turns as a prop)
    gi = pt.g(K["iron_dk"], outline=0.4)
    wx, wy, wz = WHEEL
    for dx in (-18, 18):
        gi.capsule((wx + dx, wy, 20), (wx + dx * 0.25, wy, wz - 6), 2.2)
    gi.capsule((wx - 18, wy + 10, 20), (wx, wy, wz - 6), 1.8)
    for t in (0.35, 0.65):
        gi.capsule((wx - 18 * (1 - t * 0.75), wy, 20 + (wz - 26) * t), (wx + 18 * (1 - t * 0.75), wy, 20 + (wz - 26) * t), 1.2)
    box(pt.g(K["brick_dk"], outline=0.5), (wx + 30, wy - 4, 34), (22, 14, 16), p=7, cuts=2)
    st.light((wx + 30, wy - 18, 34), 5)
    # windows of the sheds light up at night
    for x in (300, 420, 560, 820, 920):
        st.light((x, 186, 36), 5)
    pt.flush(st)


def mid(st, P):
    pt = Parts()
    rnd = random.Random(41)
    # the ground: a sooty grass bank
    g = pt.g(K["grass"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g, (x, 80, 8), (96, 60, 38 + rnd.uniform(0, 10)), seed=i, jag=0.05, p=2.4)
    gg = pt.g(K["grass_dk"], finish="hair", outline=0.3)
    for i in range(60):
        kit.round_bush(gg, rnd.uniform(-250, 1450), rnd.uniform(26, 44), rnd.uniform(4, 7), seed=1000 + i, z=rnd.uniform(36, 46),
                       flat=0.6)
    # terraced rows on the bank, left and right
    terrace_row(pt, st, -240, 9, 76, 38, w=30, h=30, d=22, step=1.6, seed=3, smoke=2)
    terrace_row(pt, st, 1000, 8, 76, 40, w=30, h=30, d=22, step=-1.2, seed=4, smoke=1)
    # the brick works with a bottle kiln (x 280-500)
    gb = pt.g(K["brick_dk"], outline=0.5)
    gr = pt.g(K["slate_dk"], outline=0.5)
    gw = pt.g(K["window"], outline=0.0, highlight=False)
    box(gb, (360, 84, 64), (78, 18, 26), p=8, cuts=2)
    gr.lathe([(0, 0), (112, 0), (0.4, 22), (0, 23)], (360, 86, 90), (360, 86, 113), segs=4, rot=(0, 0, 45), squash=(1.0, 0.24))
    for k in range(6):
        x = 302 + k * 23
        pts = [(x - 5, 52), (x + 5, 52), (x + 5, 70)]
        for j in range(1, 6):
            a = math.pi * j / 6
            pts.append((x + 5 * math.cos(a), 70 + 5 * math.sin(a)))
        pts.append((x - 5, 70))
        gw.slab(pts, 65.4, 1.0)
        if k % 2 == 0:
            st.light((x, 64, 62), 5)
    kiln = pt.g(K["brick"], outline=0.5)
    kiln.lathe([(0.2, 0), (26, 0), (27, 18), (22, 40), (10, 60), (7, 74), (8, 78), (0.2, 78)], (470, 90, 38), (470, 90, 116), segs=24)
    cyl(pt.g(K["soot"], outline=0.0, highlight=False), (470, 90, 112), (470, 90, 118), 8.4, bevel=0.4, segs=16)
    st.amb("emit", "fx.p.smoke", (470, 90, 124), rate=0.8, speed=11, scale=1.6, tint=lt(K["smoke"], 0.12), alpha=0.45, life=3000)
    # the canal on the bank top (x 430-770) with a lock gate; the narrowboat bobs as a prop
    gwt = pt.g(K["water"], finish="gloss", outline=0.0)
    box(gwt, (600, 46, 41), (170, 12, 1.2), p=6, cuts=2)
    gst = pt.g(K["stone"], outline=0.4)
    box(gst, (600, 60, 40), (176, 3.2, 3.2), p=6, cuts=1)
    gwd = pt.g(K["wood"], outline=0.4)
    for x in (726, 746):
        box(gwd, (x, 46, 46), (2.2, 12, 6), p=5, cuts=1)
        gwd.capsule((x, 36, 52), (x + 18, 30, 54), 1.1)
    # the gantry crane (static tower; the jib swings as a prop)
    gi = pt.g(K["iron_dk"], outline=0.4)
    cx, cy, cz = CRANE
    for dx in (-9, 9):
        gi.capsule((cx + dx, cy, cz - 4), (cx + dx * 0.6, cy, cz + 86), 1.6)
    for k in range(6):
        z0 = cz + k * 14
        gi.capsule((cx - 9 + k * 0.6, cy, z0), (cx + 9 - (k + 1) * 0.6, cy, z0 + 14), 0.9)
    box(pt.g(K["iron"], finish="metal", outline=0.4), (cx, cy - 2, cz + 92), (8, 7, 6), p=6, cuts=2)
    # coal heaps and barrels
    gcoal = pt.g(K["coal"], outline=0.4)
    for x, s in ((508, 1.0), (534, 0.7), (960, 0.9)):
        rock(gcoal, (x, 34, 38), (22 * s, 12, 12 * s), seed=int(x), jag=0.2, p=2.0)
    gbar = pt.g(K["iron"], finish="metal", outline=0.4)
    for x in (226, 234, 242, 980):
        cyl(gbar, (x, 30, 36), (x, 30, 46), 3.4, bevel=0.6, segs=12)
    # lamp posts (lit under night skies)
    gp = pt.g(K["iron_dk"], outline=0.3)
    for x in (-130, 120, 320, 690, 940, 1240):
        gp.capsule((x, 24, 34), (x, 24, 96), 1.2)
        gp.capsule((x, 24, 96), (x + 6, 24, 98), 0.9)
        box(pt.g(K["cream"], outline=0.3), (x + 7, 23, 95), (2.6, 2.2, 3.2), p=4, cuts=1)
        st.light((x + 7, 22, 95), 7)
    pt.flush(st)


# -- props ----------------------------------------------------------------------------------------
def _loco(rig):
    """A small tank engine facing right (+x): boiler, chimney, cab, buffers; the wheels' rods move."""
    rig.joint("body", "all", (0, 0, 0))
    rig.part("body", Geo().blob((4, 0, 9), (12, 5, 4.6), p=3.0), "#3E3F45", finish="metal", outline=0.5)
    rig.part("body", Geo().capsule((-6, 0, 10), (14, 0, 10), 4.4), "#2E3034", finish="metal", outline=0.5)
    rig.part("body", Geo().blob((-9, 0, 13), (5, 5, 6), p=4.0), "#4A2F2C", outline=0.5)
    rig.part("body", Geo().blob((-9, 0, 19.6), (6, 5.6, 1.2), p=4.0), "#2E3034", outline=0.4)
    rig.part("body", Geo().capsule((13, 0, 13), (13, 0, 19), 1.6, 2.0), "#2E3034", outline=0.4)
    rig.part("body", Geo().sphere((5, 0, 14.6), 2.0), "#B06A3B", finish="metal", outline=0.3)
    for k in range(2):
        rig.joint(f"rod{k}", "all", (0, 0, 0), hidden=True)
        g = Geo().capsule((-4, -5.4, 3.6 + k * 1.6), (10, -5.4, 3.6 + (1 - k) * 1.6), 0.6)
        rig.part(f"rod{k}", g, "#8C8E92", finish="metal", outline=0.0)
    gw = Geo()
    for x in (-4, 3, 10):
        gw.lathe([(0, -0.8), (3.2, -0.8), (3.2, 0.8), (0, 0.8)], (x, -5, 3.2), (x, -6, 3.2), segs=14)
    rig.part("body", gw, "#2A2A2E", outline=0.4)


def _wagon(rig):
    rig.part("all", Geo().blob((0, 0, 8), (10, 5, 4.4), p=4.0), "#6A5444", outline=0.5)
    rig.part("all", Geo().blob((0, 0, 12.4), (9.4, 4.6, 1.6), p=3.0), "#2E2D31", outline=0.4)
    gw = Geo()
    for x in (-6, 6):
        gw.lathe([(0, -0.8), (3.0, -0.8), (3.0, 0.8), (0, 0.8)], (x, -5, 3.0), (x, -6, 3.0), segs=14)
    rig.part("all", gw, "#2A2A2E", outline=0.4)


def _wheel_build(rig):
    rig.joint("w", "all", (0, 0, 0))
    g = Geo().lathe([(13.0, -1.2), (14.6, -1.2), (14.6, 1.2), (13.0, 1.2)], (0, 0, 0), (0, -1, 0), segs=28)
    rig.part("w", g, "#3E4248", finish="metal", outline=0.3)
    gs = Geo()
    for k in range(4):
        a = math.pi * k / 4
        gs.capsule((-13.4 * math.cos(a), 0, -13.4 * math.sin(a)), (13.4 * math.cos(a), 0, 13.4 * math.sin(a)), 0.9)
    gs.sphere((0, -0.6, 0), 2.4)
    rig.part("w", gs, "#2E3238", outline=0.2)


def _jib_build(rig):
    """The crane's jib and hook, about the tower top (rotates in depth for the swing)."""
    rig.joint("jib", "all", (0, 0, 0))
    g = Geo()
    g.capsule((-14, 0, 0), (52, 0, 4), 1.4)
    g.capsule((-14, 0, 6), (52, 0, 6), 1.0)
    for k in range(9):
        x = -14 + k * 8
        g.capsule((x, 0, 0.5 + k * 0.45), (x + 8, 0, 6), 0.6)
    g.capsule((0, 0, 6), (0, 0, 16), 1.0)
    rig.part("jib", g, "#45494F", outline=0.3)
    rig.part("jib", Geo().blob((-12, 0, 3), (5, 4, 4), p=4.0), "#5B6168", finish="metal", outline=0.4)
    g = Geo().capsule((44, 0, 4), (44, 0, -22), 0.35)
    g.blob((44, 0, -24), (2.2, 1.2, 2.6), p=3.0)
    rig.part("jib", g, "#2E2D31", outline=0.2)


def _boat_build(rig):
    rig.part("all", Geo().blob((0, 0, 4), (26, 4.4, 3.6), p=3.6, taper=(0.9, 1.0)), "#3E5A4E", outline=0.5)
    rig.part("all", Geo().blob((-4, 0, 9.6), (16, 3.8, 3.2), p=4.0), "#7A3E3A", outline=0.5)
    rig.part("all", Geo().blob((-4, 0, 13.2), (16.6, 4.0, 0.8), p=4.0), "#D8D0BE", outline=0.3)
    rig.part("all", Geo().capsule((8, 0, 13), (8, 0, 18), 0.9), "#2E2D31", outline=0.2)


def props():
    wx, wy, wz = WHEEL
    cx, cy, cz = CRANE
    plist = [
        Prop("loco", "far", _loco, [{"rod0": {"show": True}}, {"rod1": {"show": True}}], (36, 26, 2), DECK_SCREEN_Y),
        Prop("wagon", "far", _wagon, [{}], (26, 18, 2), DECK_SCREEN_Y),
        Prop("wheel", "far", _wheel_build, [{"w": {"r": 22.5 * k}} for k in range(4)], (34, 17, 17), scr(WHEEL, FAR_E)[1]),
        Prop("jib", "mid", _jib_build, [{}], (140, 40, 40), scr((cx, cy, cz + 98), MID_E)[1]),
        Prop("boat", "mid", _boat_build, [{}], (60, 22, 4), scr(BOAT, MID_E)[1]),
    ]
    sprites = [
        {"kind": "path", "layer": "far", "fps": 8, "periodS": 26, "keys": [[0, -330, DECK_SCREEN_Y, 1], [13, 1540, DECK_SCREEN_Y, 1]],
         "group": [{"frames": ["loco_0", "loco_1"], "dx": 0, "dy": 0}, {"frames": ["wagon_0"], "dx": -27, "dy": 0},
                   {"frames": ["wagon_0"], "dx": -50, "dy": 0}, {"frames": ["wagon_0"], "dx": -73, "dy": 0}],
         "trail": {"part": "fx.p.smoke", "rate": 3.2, "dx": 13, "dy": -19, "speed": 9, "scale": 1.1, "tint": 0xE8E2D6, "alpha": 0.55,
                   "life": 2200}},
        {"kind": "loop", "layer": "far", "frames": [f"wheel_{k}" for k in range(4)], "fps": 6, "at": scr(WHEEL, FAR_E)},
        {"kind": "bob", "layer": "mid", "frames": ["jib_0"], "fps": 1, "at": scr((cx, cy, cz + 98), MID_E), "amp": [0, 0],
         "periodS": 9, "tilt": 8},
        {"kind": "bob", "layer": "mid", "frames": ["boat_0"], "fps": 1, "at": scr(BOAT, MID_E), "amp": [1.2, 0.8], "periodS": 5,
         "tilt": 1.5},
    ]
    return plist, sprites


SCENES = {
    "classic": Scene("industrial", "classic", PAL, far, mid, back=back, sky=SKY, props=props,
                     hints={"celestial": "keep", "weather": "ground"}, ground="earth"),
}
