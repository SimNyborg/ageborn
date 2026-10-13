"""Medieval scenes. Classic (format 1, until its round 3 re-render): green hills crowned by a castle,
round trees, cottages and a fence (moved here unchanged from backdrop.py).

"Misty Moor" (format 2, round 2; Rare, Time Capsule): heather moorland under a grey-silver sky. Back: low
rolling moor ridges. Far: a ruined abbey on a rise (a roofless nave of pointed arches the hills show
through, a broken gable with a tall window, a bell tower), a lone round tower, dry-stone walls across
the hills, sheep. Mid: heather and gorse, a stone circle with a trilithon, a crooked wall, a wind-bent
hawthorn and a shepherd's bothy. Ambient: two low fog banks drift across (`path`), crows circle the
tower, the abbey bell swings; the bothy's window and the lantern at the circle glow under night skies.

Palette (PLAN 2b): heather mauve #8A7A88, moss #6A8650 (kept above 81 degrees of hue), grey stone
#9AA0A6; gorse flowers are a small accent.
"""
import math
import random

from ageborn_art.geometry import Geo

from world.scenes import fauna, kit
from world.scenes.common import PaintedProp, Prop, Scene, box, castle, cyl, dk, ground_band, mixc, ridge, rock, round_tree, soft_blob
from world.scenes.kit import Parts

PAL = dict(skyTop=0x92b6d6, skyBottom=0xeee6d0, far=0x97a1b3, mid=0x78886c, near=0x5a6e4e, light=0xfff4dc)

# the sky the game paints for this classic (sky.ts paintSky), for its thumbnail
SKY = {"top": "#92B6D6", "bottom": "#EEE6D0", "horizon": "#F6ECD5", "celestial": "sun", "sunAt": [250, -560, 40]}


def far(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.35)
    ridge(st, back, -300, 1500, -10, 200, 420, 11, lumps=9, jag=0.12)
    ridge(st, P["far"], -300, 1500, 10, 100, 140, 12, lumps=9, jag=0.08, peaks=False)
    # castle on its hill
    g = Geo()
    rock(g, (340, 120, 30), (260, 60, 120), seed=4, jag=0.06, p=2.2)
    st.part(g, P["far"], outline=0.0)
    gb, gr = Geo(), Geo()
    castle(gb, gr, 340, 110, 140, 0.9)
    st.part(gb, dk(P["far"], 0.05), outline=0.0)
    st.part(gr, mixc(P["far"], 0x8E6070, 0.3), outline=0.0)
    gb, gr = Geo(), Geo()
    cyl(gb, (1120, 200, 60), (1120, 200, 200), 14, bevel=1, segs=14)
    gr.lathe([(0, 0), (18, 0), (0.5, 40), (0, 42)], (1120, 200, 200), (1120, 200, 242), segs=14)
    st.part(gb, back, outline=0.0)
    st.part(gr, dk(back, 0.08), outline=0.0)
    st.amb("drift", "bd.bird", (600, 0, 390), "sky", speed=22, scale=1, tint=dk(P["far"], 0.2))
    st.amb("drift", "bd.bird", (640, 0, 410), "sky", speed=22, scale=0.8, tint=dk(P["far"], 0.2))


def mid(st, P):
    ground_band(st, P["mid"])
    rnd = random.Random(4)
    ga, gb, gt = Geo(), Geo(), Geo()
    for i in range(22):
        x = -220 + i * 80 + rnd.uniform(-20, 20)
        r = rnd.uniform(30, 44)
        round_tree(ga if i % 2 else gb, x, 70, r, i)
        gt.capsule((x, 70, 0), (x, 70, r * 1.0), 3.4)
    st.part(gt, 0x5E4836, outline=0.4)
    st.part(ga, P["near"], outline=0.5)
    st.part(gb, dk(P["near"], 0.1), outline=0.5)
    for cx in (140, 760, 1230):
        g = Geo()
        box(g, (cx, 20, 22), (34, 18, 22), p=6)
        st.part(g, mixc(P["near"], P["light"], 0.45), outline=0.5)
        g = Geo().lathe([(0, 0), (44, 0), (0.5, 40), (0, 42)], (cx, 20, 44), (cx, 20, 86), segs=4, rot=(0, 0, 45),
                        squash=(1.0, 0.55))
        st.part(g, dk(P["mid"], 0.15), outline=0.5)
        g = Geo()
        box(g, (cx - 10, -0.5, 12), (6, 1, 10), p=5)
        st.part(g, dk(P["near"], 0.3), outline=0.0, highlight=False)
    g = Geo()
    for x in range(-260, 1480, 60):
        g.capsule((x, -20, 0), (x, -20, 24), 2)
    g.capsule((-260, -20, 18), (1480, -20, 18), 1.4)
    g.capsule((-260, -20, 9), (1480, -20, 9), 1.4)
    st.part(g, dk(P["mid"], 0.2), outline=0.3)


# -- Misty Moor (round 2) -------------------------------------------------------------------------------
MM_PAL = dict(skyTop=0x8E9AA6, skyBottom=0xD6D8D4, light=0xF2F0EA, far=0x8E8890, mid=0x76766A, near=0x5A5E50)
MM = dict(
    heather=0x7E6A80, heather_dk=0x66566A, heather_lt=0x988496, moor=0x7C7E5E, moor_dk=0x646A4E, moss=0x627E46, moss_dk=0x50683E,
    stone=0x9AA0A6, stone_dk=0x7E838A, stone_lt=0xB0B4B6, lichen=0xA4A68A, ivy=0x4E6448, gorse=0x4E6448, gorse_fl=0xC8AE52,
    thatch=0xA8946E, wood=0x5E4E40, dark=0x3E3A44, path=0x8E826C, wool=0xE6E2D8, bark=0x5E5048,
)
MM_SKY = {"top": "#8E9AA6", "bottom": "#D6D8D4", "horizon": "#E0E0DA", "cloudTint": "#D6D6D2", "celestial": "sun",
          "sunAt": [540, -560, 26], "clouds": 1.0}
MM_FAR_E = math.radians(8.0)
MM_MID_E = math.radians(12.0)
MM_BELL = (520.0, 330.0, 226.0)     # the bell's pivot in the abbey tower's belfry (far)
MM_FOG_FAR = -92.0
MM_FOG_MID = -70.0


def _scr(p, e):
    x, y, z = p
    return [round(x, 1), -round(z * math.cos(e) + y * math.sin(e), 1)]


def _pointed(xl, xr, zs, n=7, k=1.5):
    """The outline of a lancet arch from (xl, zs) up to its apex and down to (xr, zs): two arcs of radius
    k x the width (k = 1 is the equilateral arch; more is taller and sharper)."""
    w = xr - xl
    r = k * w
    a0 = math.acos(max(-1.0, min(1.0, (w / 2 - r) / r)))  # the apex angle on the left arc (centre xl + r)
    left = [(xl + r + r * math.cos(math.pi - (math.pi - a0) * i / n), zs + r * math.sin(math.pi - (math.pi - a0) * i / n)) for i in range(n + 1)]
    right = [(2 * (xl + w / 2) - x, z) for x, z in reversed(left[:-1])]
    return left + right


def arcade(g, x0, x1, y, z, spring, tops, depth=8.0, pier=None):
    """A wall of pointed arches open to the sky behind: piers, and a spandrel over each opening up to
    that bay's (ruined) top; a top of None leaves the bay collapsed (piers only)."""
    n = len(tops)
    bay = (x1 - x0) / n
    pw = pier or bay * 0.3
    for k in range(n + 1):
        px = x0 + k * bay
        th = max(t or spring for t in tops[max(0, k - 1):k + 1]) if 0 < k < n else (tops[min(k, n - 1)] or spring)
        box(g, (px, y, z + (th - z) / 2), (pw / 2, depth / 2, (th - z) / 2), p=6, cuts=2)
    for k, top in enumerate(tops):
        if top is None:
            continue
        xl, xr = x0 + k * bay + pw / 2, x0 + (k + 1) * bay - pw / 2
        pts = _pointed(xl, xr, spring)
        poly = pts + [(xr, top), (xl, top)]
        g.slab(poly, y, depth)


def mm_back(st, P):
    """Low rolling moor ridges, mauve and grey-green, fading into the haze."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    ridge(st, hz(MM["heather_dk"], 0.34), -300, 1500, -40, 150, 1500, 3, lumps=8, jag=0.06, peaks=False)
    ridge(st, hz(MM["moor_dk"], 0.3), -300, 1500, -40, 110, 1300, 5, lumps=10, jag=0.06, peaks=False)


def mm_far(st, P):
    pt = Parts()
    rnd = random.Random(13)
    # 1. rolling moor hills: heather and moor grass in patches
    gh, gh2, gm = pt.g(MM["heather"], outline=0.0), pt.g(MM["heather_dk"], outline=0.0), pt.g(MM["moor"], outline=0.0)
    for i in range(9):
        x = -300 + i * 210 + rnd.uniform(-30, 30)
        kit.hill(gm if i % 3 else gh2, x, 470, -10, rnd.uniform(170, 220), 90, rnd.uniform(110, 150), seed=10 + i, jag=0.05, p=2.4)
    for i in range(11):
        x = -280 + i * 170 + rnd.uniform(-30, 30)
        kit.hill(gh if i % 2 else gm, x, 330, -10, rnd.uniform(130, 170), 80, rnd.uniform(80, 104), seed=30 + i, jag=0.05, p=2.4)
    # the abbey's rise
    kit.hill(pt.g(MM["moor_dk"], outline=0.0), 470, 360, -10, 220, 80, 132, seed=51, jag=0.04, p=2.6)
    # heather tufts on the slopes
    gt1, gt2 = pt.g(MM["heather_lt"], outline=0.0), pt.g(MM["moss_dk"], outline=0.0)
    for i in range(120):
        x = rnd.uniform(-260, 1460)
        kit.round_bush(gt1 if i % 3 else gt2, x, rnd.uniform(250, 300), rnd.uniform(4, 8), seed=200 + i, z=rnd.uniform(20, 90))
    # a granite tor (stacked weathered slabs) on the hill at x 160, and heather patches on the slopes
    gto, gto2 = pt.g(MM["stone"], outline=0.4), pt.g(MM["stone_dk"], outline=0.4)
    for k, (dx, z, rx, rz) in enumerate(((0, 92, 30, 10), (-6, 110, 24, 9), (4, 126, 20, 8), (-2, 140, 14, 7), (40, 90, 18, 8), (46, 104, 13, 7))):
        rock(gto if k % 2 else gto2, (160 + dx, 330, z), (rx, 16, rz), seed=500 + k, jag=0.1, p=3.2)
    gp1, gp2 = pt.g(MM["heather_dk"], outline=0.0), pt.g(MM["moss"], outline=0.0)
    for i in range(22):
        x0, z0 = rnd.uniform(-260, 1460), rnd.uniform(36, 92)
        for k in range(5):
            kit.round_bush(gp1 if i % 2 else gp2, x0 + rnd.uniform(-26, 26), rnd.uniform(240, 262), rnd.uniform(5, 8), seed=700 + i * 5 + k,
                           z=z0 + rnd.uniform(-4, 4))
    # 2. dry-stone walls running over the hills
    gw = pt.g(MM["stone_dk"], outline=0.2)
    for (ax, az, bx, bz, yy) in ((-260, 40, 120, 96, 300), (120, 96, 300, 70, 300), (620, 60, 900, 110, 316), (900, 110, 1300, 64, 316)):
        n = int(math.hypot(bx - ax, bz - az) / 7)
        for k in range(n):
            t = k / n
            rock(gw, (ax + (bx - ax) * t, yy, az + (bz - az) * t), (4.2, 3, 3.4), seed=k + int(ax), jag=0.2, p=2.4, cuts=2)
    # sheep grazing
    gwo, gdk = pt.g(MM["wool"], outline=0.3), pt.g(MM["dark"], outline=0.0)
    for i in range(10):
        x = rnd.uniform(-200, 1400)
        if 330 < x < 620:
            continue
        z = rnd.uniform(40, 86)
        gwo.blob((x, 290, z + 4), (5.2, 3.4, 3.4), p=2.2)
        gdk.sphere((x + 5.6, 289, z + 5.4), 1.7)
    # 3. the abbey ruin on its rise: the nave's arcade, the west gable with its tall window, the bell tower
    gs, gs2 = pt.g(MM["stone"], outline=0.5), pt.g(MM["stone_dk"], outline=0.5)
    zb = 112
    arcade(gs, 360, 520, 360, zb, zb + 34, [zb + 86, zb + 80, None, zb + 70, zb + 88], depth=9, pier=10)
    arcade(gs2, 372, 512, 400, zb, zb + 34, [zb + 84, None, zb + 76, zb + 82, None], depth=8, pier=9)
    # the west gable: two buttressed piers, a tall pointed window and a gable to a broken peak
    gx0, gx1 = 322, 362
    for px in (gx0, gx1):
        box(gs, (px, 372, zb + 52), (7, 26, 52), p=6, cuts=2)
    pts = _pointed(gx0 + 7, gx1 - 7, zb + 54, n=8)
    g = pt.g(MM["stone"], outline=0.5)
    g.slab(pts + [(gx1 + 7, zb + 104), (gx0 + 30, zb + 132), (gx0 + 18, zb + 122), (gx0 - 7, zb + 104)], 360, 9)
    box(gs, ((gx0 + gx1) / 2, 360, zb + 6), (26, 5, 6), p=6, cuts=1)
    # the bell tower (east end): a square tower with an open belfry, its parapet broken
    tx = 548
    box(gs, (tx, 340, zb + 70), (20, 18, 70), p=6, cuts=2)
    box(pt.g(MM["dark"], outline=0.0, highlight=False), (tx, 321.5, MM_BELL[2] - 16), (10, 0.6, 16), p=4, cuts=1)
    for dx, h in ((-17, 12), (-6, 7), (6, 10), (17, 5)):
        box(gs2, (tx + dx, 340, zb + 140 + h / 2), (4.6, 18, h / 2), p=5, cuts=1)
    pts = _pointed(tx - 9, tx + 9, MM_BELL[2] - 12, n=6)
    pt.g(MM["stone"], outline=0.4).slab(pts + [(tx + 12, MM_BELL[2] + 8), (tx - 12, MM_BELL[2] + 8)], 320.6, 1.6)
    # rubble and ivy on the ruin
    gr = pt.g(MM["stone_dk"], outline=0.3)
    for k in range(12):
        x = rnd.uniform(330, 560)
        rock(gr, (x, rnd.uniform(345, 380), zb + 2), (rnd.uniform(4, 8), 4, rnd.uniform(3, 5)), seed=400 + k, jag=0.25)
    gi = pt.g(MM["ivy"], outline=0.2)
    for (x, z, rx, rz) in ((372, zb + 60, 9, 16), (440, zb + 30, 12, 10), (500, zb + 66, 8, 12), (556, zb + 40, 10, 22), (330, zb + 90, 6, 14)):
        gi.blob((x, 352, z), (rx, 4, rz), p=2.2)
    # 4. the lone tower on its own rise (x 760): round, ruined at the top
    kit.hill(pt.g(MM["moor"], outline=0.0), 770, 330, -10, 110, 60, 96, seed=61, jag=0.05)
    cyl(gs2, (770, 330, 80), (770, 330, 196), 16, 14, bevel=1.0, segs=18)
    for k in range(5):
        a = math.radians(k * 72)
        h = (8, 3, 11, 5, 9)[k]
        box(gs2, (770 + math.cos(a) * 11, 330 + math.sin(a) * 11, 196 + h / 2), (4, 4, h / 2), p=5, cuts=1)
    box(pt.g(MM["dark"], outline=0.0, highlight=False), (770, 313.6, 150), (2.6, 0.6, 6), p=4, cuts=1)
    # 5. a few wind-bent hawthorns on the slopes
    gc, gtr = pt.g(MM["moss_dk"], outline=0.3), pt.g(MM["bark"], outline=0.0)
    for x, z in ((80, 60), (240, 76), (680, 62), (1040, 70), (1220, 52)):
        gtr.capsule((x, 300, z), (x + 10, 300, z + 22), 1.8, 1.2)
        gc.blob((x + 16, 300, z + 26), (16, 9, 7), p=2.2, rot=(0, -12, 0))
    pt.flush(st)


def mm_mid(st, P):
    pt = Parts()
    rnd = random.Random(19)
    # the bank: moor grass
    g = pt.g(MM["moor"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g, (x, 80, 8), (96, 60, 40 + rnd.uniform(0, 10)), seed=i, jag=0.05, p=2.4)
    # heather and gorse all along
    gh, gh2, gh3 = pt.g(MM["heather"], outline=0.4), pt.g(MM["heather_dk"], outline=0.4), pt.g(MM["heather_lt"], outline=0.4)
    for i in range(70):
        x = rnd.uniform(-250, 1450)
        kit.round_bush((gh, gh2, gh3)[i % 3], x, rnd.uniform(28, 48), rnd.uniform(6, 11), seed=1000 + i, z=rnd.uniform(36, 46), flat=0.62)
    gg, gfl = pt.g(MM["gorse"], outline=0.4), pt.g(MM["gorse_fl"], outline=0.0, highlight=False)
    for i, x in enumerate((-180, -40, 150, 470, 660, 940, 1200, 1380)):
        kit.round_bush(gg, x, 54, 13, seed=1300 + i, z=40, flat=0.8)
        for k in range(7):
            a = rnd.uniform(-3.0, -0.1)
            gfl.sphere((x + math.cos(a) * 14, 54 + math.sin(a) * 8, 46 + rnd.uniform(0, 10)), 1.6, cuts=2)
    # the stone circle (x 240-420): standing stones in a ring, a trilithon at the back
    gsn, gsn2, gli = pt.g(MM["stone"], outline=0.5), pt.g(MM["stone_dk"], outline=0.5), pt.g(MM["lichen"], outline=0.0)
    cx, cy = 330, 92
    for k in range(12):
        a = 2 * math.pi * k / 12 + 0.15
        x, y = cx + math.cos(a) * 100, cy + math.sin(a) * 28
        if 0.6 < a < 1.5 or 1.9 < a < 2.6:
            continue  # the two trilithons stand there
        h = rnd.uniform(46, 66)
        lean = rnd.uniform(-7, 7)
        box(gsn if k % 2 else gsn2, (x, y, 40 + h / 2), (rnd.uniform(8.5, 11), 6, h / 2), p=3.4, cuts=2, rot=(0, lean, rnd.uniform(-20, 20)),
            taper=(1.1, 0.8))
        gli.blob((x + rnd.uniform(-3, 3), y - 6.4, 40 + h * rnd.uniform(0.4, 0.7)), (3.6, 0.6, 3), p=2.0)
    for tx, ty, h in ((cx + 40, cy + 26, 40), (cx - 30, cy + 26, 36)):
        for dx in (-16, 16):
            box(gsn, (tx + dx, ty, 40 + h), (8, 6.4, h), p=3.4, cuts=2, taper=(1.05, 0.9))
        box(gsn2, (tx, ty, 40 + 2 * h + 6), (29, 7, 6.4), p=3.6, cuts=2)
    # a fallen stone in the grass
    box(gsn2, (cx - 60, cy - 30, 44), (24, 8, 6), p=3.4, cuts=2, rot=(0, 4, 18))
    st.light((cx - 20, cy - 30, 46), 6)
    # a crooked dry-stone wall (x 520-940)
    kit.dry_wall(pt.g(MM["stone_dk"], outline=0.5), 520, 940, 62, 38, 16, seed=8, block=11)
    # a wind-bent hawthorn (x 600)
    gtr, gc = pt.g(MM["bark"], outline=0.5), pt.g(MM["moss_dk"], outline=0.5)
    gtr.capsule((600, 70, 40), (614, 70, 84), 4.2, 2.6)
    gtr.capsule((614, 70, 84), (650, 70, 100), 2.6, 1.6)
    gtr.capsule((612, 70, 80), (586, 70, 104), 2.0, 1.2)
    for (x, z, r) in ((640, 104, 22), (612, 112, 18), (588, 106, 14), (662, 96, 14)):
        gc.blob((x, 68, z), (r, r * 0.7, r * 0.6), p=2.2, rot=(0, -10, 0))
    # the shepherd's bothy (x 1080): stone walls, a thatched roof, a chimney, a lit window
    gwl, gth = pt.g(MM["stone"], outline=0.5), pt.g(MM["thatch"], outline=0.5)
    box(gwl, (1080, 90, 60), (36, 22, 20), p=6, cuts=2)
    gth.lathe([(0, 0), (54, 0), (0.6, 30), (0, 31)], (1080, 92, 78), (1080, 92, 109), segs=4, rot=(0, 0, 45), squash=(1.0, 0.5))
    box(gwl, (1108, 96, 106), (5, 5, 14), p=5, cuts=1)
    gd = pt.g(MM["dark"], outline=0.0, highlight=False)
    box(gd, (1066, 67.4, 56), (5, 0.6, 12), p=4, cuts=1)
    box(pt.g(0xE8C890, outline=0.0, highlight=False), (1094, 67.4, 64), (5, 0.6, 5), p=4, cuts=1)
    st.light((1094, 66, 64), 6)
    st.amb("emit", "fx.p.smoke", (1108, 96, 124), rate=0.45, speed=8, scale=0.9, tint=0xD8D8D2, alpha=0.32, life=2800)
    # boulders
    gb = pt.g(MM["stone_dk"], outline=0.5)
    for i in range(10):
        x = rnd.uniform(-240, 1440)
        rock(gb, (x, rnd.uniform(34, 50), 38), (rnd.uniform(7, 12), 7, rnd.uniform(5, 8)), seed=900 + i, jag=0.2)
    pt.flush(st)


def _bell(rig):
    """The abbey bell on its yoke, hanging from the pivot (frames swing it)."""
    rig.joint("b", "all", (0, 0, 0))
    rig.part("b", Geo().capsule((-5, 0, 0), (5, 0, 0), 1.2), "#5E4E40", outline=0.3)
    rig.part("b", Geo().lathe([(0.01, 0), (2.2, 0), (3.2, -2), (3.6, -7), (5.4, -11), (5.6, -12), (0.01, -12)], (0, 0, 0), (0, 0, -1),
                              segs=16), "#9A8A5E", finish="bronze", outline=0.4)


def _fog(i):
    w, h = (320, 54) if i == 0 else (420, 50)
    return soft_blob(w, h, 0xEEEEEA, alpha=0.62 if i == 0 else 0.5, lumps=6, seed=3 + i)


def mm_props():
    bell = _scr(MM_BELL, MM_FAR_E)
    crow = fauna.bird(body="#3E3A40", wing="#2E2A32", beak="#4A4448", span=12, size=1.0)
    bx = MM_BELL[0]
    ring = [[i * 2, round(bx + 80 * math.cos(math.pi * i / 3)), round(bell[1] - 46 + 16 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    plist = [
        Prop("bell", "far", _bell, [{"b": {"r": a}} for a in (0, 14, 0, -14)], (24, 4, 16), bell[1]),
        Prop("crow", "far", crow, [fauna.bird_pose(f) for f in range(5)], (40, 24, 24), ring[0][2]),
        PaintedProp("fog", "far", lambda i: _fog(0), 1, ax=0.5, ay=0.9),
        PaintedProp("mist", "mid", lambda i: _fog(1), 1, ax=0.5, ay=0.9, ppl=1.0),
    ]
    sprites = [
        {"kind": "loop", "layer": "far", "frames": ["bell_0", "bell_1", "bell_2", "bell_3"], "fps": 2.4, "at": bell},
        {"kind": "path", "layer": "far", "fps": 6, "periodS": 12, "keys": ring,
         "group": [{"frames": ["crow_4", "crow_0", "crow_1", "crow_2", "crow_3"]}, {"frames": ["crow_0", "crow_1", "crow_2", "crow_3", "crow_4"], "dx": -26, "dy": 9, "phase": 2}]},
        {"kind": "path", "layer": "far", "fps": 1, "periodS": 150, "keys": [[0, -520, MM_FOG_FAR, 0], [14, -360, MM_FOG_FAR, 1], [136, 1400, MM_FOG_FAR, 1], [150, 1560, MM_FOG_FAR, 0]],
         "face": "fixed", "group": [{"frames": ["fog_0"]}]},
        {"kind": "path", "layer": "mid", "fps": 1, "periodS": 190, "keys": [[0, -560, MM_FOG_MID, 0], [16, -380, MM_FOG_MID, 0.8], [174, 1420, MM_FOG_MID, 0.8], [190, 1600, MM_FOG_MID, 0]],
         "face": "fixed", "group": [{"frames": ["mist_0"]}]},
    ]
    return plist, sprites


SCENES = {
    "classic": Scene("medieval", "classic", PAL, far, mid, sky=SKY, version=1),
    "misty_moor": Scene("medieval", "misty_moor", MM_PAL, mm_far, mm_mid, back=mm_back, sky=MM_SKY, props=mm_props,
                        hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.6}, ground="earth",
                        # a grey day with clear air between the fog banks: a little less haze on the far moor
                        look={"far": (0.18, 0.08, 0.2)}),
}
