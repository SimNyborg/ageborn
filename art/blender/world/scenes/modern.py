"""Modern scenes. Classic (format 1, until its round 3 re-render): a city skyline with a radio mast,
broken blocks and telegraph poles (moved here unchanged from backdrop.py).

"Desert Airbase" (format 2, round 2; Rare, Time Capsule; a set with Desert Bunker): a desert airfield
under a hot, pale sky. Back: flat-topped mesas. Far: an airfield on a rise: the runway with its lights,
quonset hangars (one with a plane at its door), a control tower with a glazed cab and a beacon, a
radar dish on a lattice mast, fuel tanks and parked planes, mesas behind. Mid: sand and scrub, a sandbag
emplacement, a fuel truck and a jeep, oil drums and crates, a radio shack, a windsock. Ambient: the
radar dish turns, the windsock flutters, a transport taxis and takes off every 45 s, vultures circle,
dust drifts; the runway lights, the tower's cab and the hangar lamps glow under night skies.

Palette (PLAN 2b): sand #CDB88A, khaki #B8A67A, gunmetal #3A3F45; planes and vehicles stay muted olive
and grey (no team colours).
"""
import math
import random

from ageborn_art.geometry import Geo

from world.scenes import fauna, kit
from world.scenes.common import Prop, Scene, box, cyl, dk, ground_band, lt, mixc, ridge, rock
from world.scenes.kit import Parts

PAL = dict(skyTop=0x98a8b6, skyBottom=0xe6dcc4, far=0x8a8f9a, mid=0x6c7264, near=0x565c4a, light=0xf2ead2)

# the sky the game paints for this classic (sky.ts paintSky), for its thumbnail
SKY = {"top": "#98A8B6", "bottom": "#E6DCC4", "horizon": "#EBE2CA", "celestial": "sun", "sunAt": [420, -600, 38]}


def far(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.35)
    ridge(st, back, -300, 1500, 0, 130, 460, 31, lumps=10, jag=0.1)
    rnd = random.Random(5)
    x = -280
    i = 0
    gb, gb2, gw = Geo(), Geo(), Geo()
    while x < 1480:
        w = rnd.uniform(40, 80)
        h = rnd.uniform(90, 290)
        d = rnd.uniform(60, 220)
        (gb if i % 2 else gb2).blob((x + w / 2, d, h / 2), (w / 2 - 2, 22, h / 2), p=8, cuts=2)
        # lit window rows: thin slabs, a few per building
        for wz in range(int(20), int(h - 14), 22):
            if rnd.random() < 0.55:
                gw.blob((x + w / 2, d - 23, wz), (w / 2 - 8, 1, 2.2), p=6, cuts=1)
        if i % 5 == 2:
            cyl(gb, (x + w / 2, d, h), (x + w / 2, d, h + 50), 5, 4, bevel=0.5, segs=10)
            st.amb("emit", "fx.p.smoke", (x + w / 2, d, h + 54), "far", rate=0.9, speed=12, scale=2.2, tint=lt(P["far"], 0.4), alpha=0.5)
        if i % 7 == 4:
            gb.capsule((x + 10, d, h), (x + 10, d, h + 120), 2.4)
            gb.capsule((x + 10, d, h + 118), (x + 90, d, h + 118), 2.0)
            st.amb("blink", "bd.light", (x + 10, d, h + 124), "far", period=1400, tint=0xF2D6D6)
        x += w + rnd.uniform(-6, 10)
        i += 1
    st.part(gb2, P["far"], outline=0.0)
    st.part(gb, dk(P["far"], 0.07), outline=0.0)
    st.part(gw, lt(P["far"], 0.28), outline=0.0, highlight=False)


def mid(st, P):
    ground_band(st, P["mid"])
    rnd = random.Random(8)
    ga, gb, gw = Geo(), Geo(), Geo()
    for i in range(9):
        x = -180 + i * 200
        h = rnd.uniform(90, 130)
        g = ga if i % 2 else gb
        g.blob((x + 48, 40, h / 2), (46, 20, h / 2), p=6, cuts=2)
        # broken top
        rock(g, (x + 70, 40, h), (22, 18, 16), seed=i, jag=0.3, p=2.0)
        for k in range(3):
            gw.blob((x + 18 + k * 28, 19, h * 0.55), (7, 1, 8), p=5, cuts=1)
    ruin = mixc(P["near"], 0x9A968C, 0.55)
    st.part(ga, ruin, outline=0.5)
    st.part(gb, dk(ruin, 0.08), outline=0.5)
    st.part(gw, dk(ruin, 0.4), outline=0.0, highlight=False)
    g, gwire = Geo(), Geo()
    poles = list(range(-220, 1480, 170))
    for x in poles:
        g.capsule((x, -10, 0), (x, -10, 150), 2.6)
        g.capsule((x - 14, -10, 140), (x + 14, -10, 140), 1.8)
    for a, b in zip(poles, poles[1:]):
        pts = [(a + (b - a) * t / 8, -10, 140 - 24 * math.sin(math.pi * t / 8)) for t in range(9)]
        for p, q in zip(pts, pts[1:]):
            gwire.capsule(p, q, 0.7)
    st.part(g, dk(P["mid"], 0.25), outline=0.3)
    st.part(gwire, dk(P["mid"], 0.35), outline=0.0, highlight=False)
    g = Geo()
    for i in range(30):
        g.blob((-250 + i * 60, -20, 5), (13, 7, 5), p=2.6)
    st.part(g, mixc(P["near"], P["light"], 0.3), outline=0.4, finish="hair")


# -- Desert Airbase (round 2) ------------------------------------------------------------------------
DA_PAL = dict(skyTop=0x9CB8C8, skyBottom=0xF2E6CC, light=0xFFF4DC, far=0xB0A48C, mid=0x9A8E70, near=0x7A7058)
DA = dict(
    sand=0xCDB88A, sand_dk=0xB8A276, sand_lt=0xDCCAA0, mesa=0xAE8C6E, mesa_dk=0x8E7058, khaki=0xB8A67A, khaki_dk=0x9C8C64,
    gun=0x3A3F45, metal=0x9A9886, metal_dk=0x7E7C6E, concrete=0xB4AE9C, concrete_dk=0x9C9684, mark=0xE6E0D0, white=0xDCD6C6,
    glass=0x5A6A6E, olive=0x7E8064, olive_dk=0x686C54, scrub=0x8A8A68, scrub_dk=0x707256, wood=0x7A6450, drum=0x6E6A52,
    red=0xA05E50, tank=0xC8C2B0,
)
DA_SKY = {"top": "#9CB8C8", "bottom": "#F2E6CC", "horizon": "#F6ECD6", "cloudTint": "#FAF4E8", "celestial": "sun",
          "sunAt": [260, -540, 44], "clouds": 0.45, "smog": 0.12}
DA_FAR_E = math.radians(8.0)
DA_MID_E = math.radians(12.0)
DA_FIELD_Z = 56.0
DA_RUNWAY_Y = 270.0
DA_RUNWAY_SCR = -round((DA_FIELD_Z + 1.5) * math.cos(DA_FAR_E) + DA_RUNWAY_Y * math.sin(DA_FAR_E), 1)
DA_DISH = (150.0, 380.0, DA_FIELD_Z + 118.0)
DA_SOCK = (612.0, 60.0, 128.0)


def _scr(p, e):
    x, y, z = p
    return [round(x, 1), -round(z * math.cos(e) + y * math.sin(e), 1)]


def mesa(g_body, g_band, x, y, z, rx, h, seed=0, squash=0.6, top=0.62, g_talus=None):
    """A flat-topped butte (review 2: fluted walls read as drapes): stacked rock strata, each a little
    narrower and shifted, thin darker bands between them, a dark cap rock, and a wide talus apron
    flaring round its foot."""
    rnd = random.Random(seed)
    w = rx * top
    d = w * squash
    z0 = z
    for (f, band, s) in ((0.3, False, 1.0), (0.06, True, 0.985), (0.27, False, 0.965), (0.05, True, 0.95), (0.22, False, 0.935),
                         (0.1, True, 0.925)):
        hh = h * f
        box(g_band if band else g_body, (x + rnd.uniform(-0.025, 0.025) * w, y + rnd.uniform(-3, 3), z0 + hh / 2),
            (w * s * rnd.uniform(0.97, 1.0), d * s, hh / 2 + 0.8), p=5.0, cuts=2)
        z0 += hh
    rock(g_talus or g_body, (x, y + 4, z), (rx * 1.1, rx * squash, h * 0.3), seed=seed + 7, jag=0.12, p=2.2, cuts=4)


def da_back(st, P):
    """Mesas on the horizon (low under the moons' place, x 820-980)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    gm, gb, gt = pt.g(hz(DA["mesa"], 0.3), outline=0.0), pt.g(hz(DA["mesa_dk"], 0.3), outline=0.0), pt.g(hz(DA["sand_dk"], 0.3), outline=0.0)
    for x, rx, h, seed in ((-180, 190, 150, 1), (80, 140, 110, 2), (380, 220, 170, 3), (640, 130, 100, 4), (900, 100, 40, 5), (1150, 210, 160, 6),
                           (1420, 160, 120, 7)):
        mesa(gm, gb, x, 1500, -60, rx, h + 60, seed=seed, top=0.7, g_talus=gt)
    pt.flush(st)


def da_far(st, P):
    pt = Parts()
    rnd = random.Random(61)
    fz = DA_FIELD_Z
    # 1. mesas behind the field and the rise it stands on
    gm, gb, gt = pt.g(DA["mesa"], outline=0.3), pt.g(DA["mesa_dk"], outline=0.3), pt.g(DA["sand_dk"], outline=0.0)
    for x, rx, h, seed in ((-120, 190, 200, 11), (330, 160, 150, 12), (1080, 210, 210, 13), (1360, 150, 160, 14)):
        mesa(gm, gb, x, 640, -20, rx, h, seed=seed, squash=0.55, top=0.7, g_talus=gt)
    # low dunes behind the field, up over the back strip's foot (review 2: the far mesas floated over a
    # band of sky where the back strip ends)
    gdn = pt.g(mixc(DA["sand_dk"], P["skyBottom"], 0.25), outline=0.0)
    for i in range(12):
        x = -300 + i * 160 + rnd.uniform(-20, 20)
        kit.hill(gdn, x, 700, -10, rnd.uniform(140, 180), 90, rnd.uniform(102, 112), seed=40 + i, jag=0.03, p=2.6)
    gs = pt.g(DA["sand"], outline=0.0)
    for i in range(12):
        x = -300 + i * 160 + rnd.uniform(-20, 20)
        kit.hill(gs, x, 360, -10, rnd.uniform(130, 170), 120, fz + 10 + rnd.uniform(-2, 2), seed=20 + i, jag=0.02, p=3.0)
    # 2. the runway: concrete with a dashed centre line, edge lights
    gc = pt.g(DA["concrete"], outline=0.0)
    box(gc, (600, DA_RUNWAY_Y, fz), (1000, 26, 1.6), p=6, cuts=2)
    gmk = pt.g(DA["mark"], outline=0.0, highlight=False)
    for x in range(-380, 1600, 60):
        box(gmk, (x, DA_RUNWAY_Y, fz + 1.7), (14, 1.4, 0.3), p=4, cuts=1)
    for x in range(-340, 1560, 80):
        st.light((x, DA_RUNWAY_Y - 26, fz + 3), 3.4)
    # 3. quonset hangars: corrugated half-barrels with dark open doors
    gmet, gmet2, gd = pt.g(DA["metal"], finish="metal", outline=0.5), pt.g(DA["metal_dk"], outline=0.0), pt.g(DA["gun"], outline=0.0, highlight=False)
    for (x, r, L) in ((300, 46, 90), (430, 40, 80), (800, 44, 88)):
        tmp = Geo()
        cyl(tmp, (x, 350 + L / 2, fz), (x, 350 - L / 2, fz), r, bevel=1.4, segs=28)
        tmp.clip((x, 350, fz), (0, 0, -1))
        kit._merge(gmet, tmp)
        for k in range(5):
            yy = 350 - L / 2 + (k + 0.5) * L / 5
            ring = Geo()
            cyl(ring, (x, yy - 0.8, fz), (x, yy + 0.8, fz), r + 0.5, bevel=0.2, segs=28)
            ring.clip((x, yy, fz), (0, 0, -1))
            kit._merge(gmet2, ring)
        door = [(x + r * 0.8 * math.cos(math.pi * k / 12), fz + r * 0.8 * math.sin(math.pi * k / 12)) for k in range(13)]
        gd.slab(door, 350 - L / 2 - 0.8, 1.2)
        st.light((x, 350 - L / 2 - 2, fz + r * 0.9), 5)
    # 4. the control tower: a block base, a tall shaft, a glazed cab with a gallery, a mast with a beacon
    tx = 600.0
    gw = pt.g(DA["white"], outline=0.5)
    box(pt.g(DA["concrete_dk"], outline=0.4), (tx, 382, fz + 4), (24, 20, 4), p=5, cuts=1)
    box(gw, (tx, 382, fz + 62), (16, 15, 58), p=6, cuts=2, taper=(1.12, 0.94))
    box(pt.g(DA["concrete_dk"], outline=0.4), (tx, 382, fz + 122), (24, 21, 2.4), p=5, cuts=1)
    pt.g(DA["glass"], finish="gloss", outline=0.5).blob((tx, 382, fz + 134), (20, 17, 10), p=4.0, taper=(0.86, 1.0))
    box(gw, (tx, 382, fz + 146), (22, 19, 2.4), p=5, cuts=1)
    pt.g(DA["gun"], outline=0.3).capsule((tx + 8, 382, fz + 148), (tx + 8, 382, fz + 176), 0.8)
    st.amb("blink", "bd.light", _scr_far3((tx + 8, 382, fz + 180)), period=1400, tint=0xF2D8C8)
    gwin = pt.g(DA["gun"], outline=0.0, highlight=False)
    for k in range(5):
        box(gwin, (tx, 366.4, fz + 24 + k * 18), (4, 0.6, 4), p=4, cuts=1)
    for k in range(3):
        st.light((tx - 10 + k * 10, 364, fz + 134), 4)
    # 5. the radar dish's lattice mast (the dish turns as a prop), fuel tanks, parked planes
    dx, dy, dz = DA_DISH
    gi = pt.g(DA["gun"], outline=0.3)
    for sx in (-10, 10):
        gi.capsule((dx + sx, dy, fz), (dx + sx * 0.3, dy, dz - 6), 1.6)
    for k in range(5):
        z0 = fz + k * (dz - 6 - fz) / 5
        gi.capsule((dx - 10 + k * 1.4, dy, z0), (dx + 10 - (k + 1) * 1.4, dy, z0 + (dz - 6 - fz) / 5), 0.9)
    gt = pt.g(DA["tank"], finish="metal", outline=0.5)
    for (x, r) in ((930, 22), (980, 18)):
        cyl(gt, (x, 380, fz), (x, 380, fz + r * 1.2), r, bevel=1.2, segs=24)
        gt.lathe([(0, 0), (r, 0), (0.4, r * 0.3), (0, r * 0.32)], (x, 380, fz + r * 1.2), (x, 380, fz + r * 1.5), segs=24)
    gpl, gpl2 = pt.g(DA["olive"], outline=0.5), pt.g(DA["olive_dk"], outline=0.4)
    for (x, s_) in ((1110, 1.0), (1240, 0.9), (60, 0.9)):
        gpl.blob((x, 330, fz + 12 * s_), (28 * s_, 4 * s_, 4 * s_), p=2.4, taper=(1.0, 0.9))
        gpl2.blob((x + 2, 324, fz + 15 * s_), (6 * s_, 14 * s_, 1.0), p=3.0)
        gpl2.slab([(x - 33 * s_, fz + 14 * s_), (x - 25 * s_, fz + 14 * s_), (x - 30 * s_, fz + 26 * s_), (x - 35 * s_, fz + 26 * s_)], 330, 1.2)
    # scrub on the sand
    gsc = pt.g(DA["scrub"], outline=0.0)
    for i in range(40):
        x = rnd.uniform(-260, 1460)
        kit.round_bush(gsc, x, rnd.uniform(296, 330), rnd.uniform(3, 6), seed=300 + i, z=fz - 2)
    pt.flush(st)


def _scr_far3(p):
    """A 3D point unchanged (the stage projects ambient specs itself)."""
    return p


def da_mid(st, P):
    pt = Parts()
    rnd = random.Random(67)
    # the sand bank with low dunes and scrub
    g, g2 = pt.g(DA["sand"], outline=0.0), pt.g(DA["sand_lt"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g if i % 2 else g2, (x, 80, 6), (100, 54, 40 + rnd.uniform(0, 10)), seed=i, jag=0.04, p=2.6)
    gsc, gsc2 = pt.g(DA["scrub"], outline=0.4), pt.g(DA["scrub_dk"], outline=0.4)
    for i in range(22):
        x = rnd.uniform(-250, 1450)
        kit.round_bush(gsc if i % 2 else gsc2, x, rnd.uniform(50, 86), rnd.uniform(6, 11), seed=1000 + i, z=40, flat=0.6)
    # the sandbag emplacement (x 140-330): stacked sacks with a gap, a sign post
    gb, gb2 = pt.g(DA["khaki"], outline=0.4), pt.g(DA["khaki_dk"], outline=0.4)
    for row in range(3):
        for k in range(12):
            x = 120 + k * 20 + (row % 2) * 10
            if 216 < x < 262:
                continue
            (gb if (k + row) % 2 else gb2).blob((x, 70, 45 + row * 10.4), (10.6, 8.0, 5.8), p=2.6)
    # a transport parked on the sand (x 470) and the fuel truck beside it (x 650)
    gwh = pt.g(DA["gun"], outline=0.4)
    fauna.prop_plane(body="#8A8C7A", wing="#7A7C6C", size=1.9)(kit.StaticRig(pt, (470, 80, 37)))
    fauna.truck(size=1.7)(kit.StaticRig(pt, (650, 60, 38), flip=True))
    # oil drums and crates
    gdr = pt.g(DA["drum"], finish="metal", outline=0.4)
    for (x, z) in ((330, 40), (343, 40), (336, 56)):
        cyl(gdr, (x, 70, z), (x, 70, z + 15), 6.2, bevel=0.8, segs=14)
    gcr = pt.g(DA["wood"], outline=0.4)
    for (x, z, s_) in ((744, 40, 1.0), (764, 40, 0.8), (752, 60, 0.7)):
        box(gcr, (x, 72, z + 10 * s_), (10 * s_, 10 * s_, 10 * s_), p=5, cuts=1)
    # the radio shack (x 860) with an antenna, a lamp
    gw = pt.g(DA["white"], outline=0.5)
    box(gw, (860, 84, 56), (28, 18, 16), p=6, cuts=2)
    box(pt.g(DA["khaki_dk"], outline=0.4), (860, 84, 74), (31, 21, 2.4), p=5, cuts=1)
    gwin = pt.g(DA["gun"], outline=0.0, highlight=False)
    box(gwin, (848, 65.4, 54), (5, 0.6, 9), p=4, cuts=1)
    box(gwin, (872, 65.4, 60), (6, 0.6, 4.4), p=4, cuts=1)
    st.light((872, 64, 60), 6)
    gwh.capsule((880, 90, 76), (880, 90, 150), 0.8)
    gwh.capsule((870, 90, 140), (890, 90, 140), 0.5)
    st.amb("blink", "bd.light", (880, 90, 152), period=1600, tint=0xF2D8C8)
    # the windsock's pole (the sock is a prop)
    sx, sy, sz = DA_SOCK
    gwh.capsule((sx, sy, 40), (sx, sy, sz + 2), 1.1)
    # rocks
    gr = pt.g(DA["mesa_dk"], outline=0.5)
    for i in range(10):
        rock(gr, (rnd.uniform(-240, 1440), rnd.uniform(34, 50), 38), (rnd.uniform(7, 12), 7, rnd.uniform(5, 8)), seed=900 + i, jag=0.2)
    st.amb("emit", "fx.p.smoke", (300, 40, 46), rate=0.35, speed=4, scale=2.2, tint=0xE6D8B8, alpha=0.22, life=4200)
    st.amb("emit", "fx.p.smoke", (1000, 40, 46), rate=0.35, speed=4, scale=2.2, tint=0xE6D8B8, alpha=0.22, life=4200)
    pt.flush(st)


def _dish(rig):
    rig.joint("d", "all", (0, 0, 0))
    g = Geo().lathe([(0.01, 0), (14, 2.6), (16, 6.4), (15, 6.8), (0.01, 3.2)], (0, 0, 0), (-0.6, -1, 0.2), segs=22)
    rig.part("d", g, "#D8D2C2", finish="gloss", outline=0.4)
    rig.part("d", Geo().capsule((0, -1, 0.5), (0, -10, 1.2), 0.8), "#3A3F45", outline=0.2)
    rig.part("d", Geo().capsule((0, 3, -2), (0, 3, -9), 1.4), "#3A3F45", outline=0.3)


def _sock(rig):
    """The windsock: a striped cone on a ring, its tail joint flutters (frames)."""
    rig.joint("s", "all", (0, 0, 0))
    rig.part("s", Geo().lathe([(3.4, 0), (3.6, 0), (3.6, 1.0), (3.4, 1.0)], (0, 0, 0), (1, 0, 0), segs=14), "#5E5C54", outline=0.3)
    for k in range(4):
        j = f"t{k}"
        rig.joint(j, "s" if k == 0 else f"t{k - 1}", (1 + k * 6, 0, 0))
        r0, r1 = 3.4 - k * 0.6, 3.4 - (k + 1) * 0.6
        rig.part(j, Geo().lathe([(r0, 0), (r1, 6.2), (r1 - 0.3, 6.2), (r0 - 0.3, 0)], (1 + k * 6, 0, 0), (7 + k * 6, 0, 0), segs=14),
                 "#C8A890" if k % 2 == 0 else "#E6E0D0", outline=0.4)


def _sock_pose(f):
    a = [(-6, -4, -2, 0), (-4, 2, 6, 8), (-6, -2, 4, 2), (-8, -8, -4, -6)][f]
    return {"s": {"r": -10}, **{f"t{k}": {"r": a[k]} for k in range(4)}}


def da_props():
    dish = _scr(DA_DISH, DA_FAR_E)
    sock = _scr(DA_SOCK, DA_MID_E)
    vulture = fauna.bird(body="#4E4440", wing="#3E3632", belly="#6E625A", beak="#C8B090", span=17, size=1.1)
    ring = [[i * 3, round(860 + 90 * math.cos(math.pi * i / 3)), round(-262 + 16 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    y = DA_RUNWAY_SCR
    plist = [
        Prop("dish", "far", _dish, [{"d": {"rz": a}} for a in (-40, -14, 14, 40)], (40, 22, 18), dish[1]),
        Prop("sock", "mid", _sock, [_sock_pose(f) for f in range(4)], (40, 10, 14), sock[1]),
        Prop("plane", "far", fauna.prop_plane(size=1.0, prop_frame=0), [{}], (100, 34, 4), y),
        Prop("planeb", "far", fauna.prop_plane(size=1.0, prop_frame=1), [{}], (100, 34, 4), y),
        Prop("planeu", "far", fauna.prop_plane(size=1.0, prop_frame=1, gear=False), [{}], (100, 34, 4), y),
        Prop("vulture", "far", vulture, [fauna.bird_pose(f) for f in range(5)], (50, 26, 26), ring[0][2]),
    ]
    sprites = [
        {"kind": "loop", "layer": "far", "frames": [f"dish_{k}" for k in range(4)], "fps": 1.5, "pingpong": True, "at": dish},
        {"kind": "loop", "layer": "mid", "frames": [f"sock_{k}" for k in range(4)], "fps": 4, "at": sock},
        {"kind": "path", "layer": "far", "fps": 12, "periodS": 45,
         "keys": [[0, 1560, y, 0, 0], [0.6, 1500, y, 1, 0], [10, 900, y, 1, 0], [15, 420, y, 1, 0], [17.4, 120, y - 22, 1, 0], [20, -200, y - 90, 1, 0],
                  [21.2, -360, y - 120, 0, 0]],
         "group": [{"frames": ["plane_0", "planeb_0"]}]},
        {"kind": "path", "layer": "far", "fps": 7, "periodS": 18, "keys": ring,
         "group": [{"frames": ["vulture_4", "vulture_4", "vulture_4", "vulture_0", "vulture_1", "vulture_2", "vulture_3"]},
                   {"frames": ["vulture_4", "vulture_4", "vulture_0", "vulture_1", "vulture_2", "vulture_3", "vulture_4"], "dx": -30, "dy": 10, "phase": 3}]},
    ]
    return plist, sprites


SCENES = {
    "classic": Scene("modern", "classic", PAL, far, mid, sky=SKY, version=1),
    "desert_airbase": Scene("modern", "desert_airbase", DA_PAL, da_far, da_mid, back=da_back, sky=DA_SKY, props=da_props,
                            hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.5}, ground="earth"),
}
