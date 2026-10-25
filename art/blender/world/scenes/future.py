"""Future scenes. Classic (format 1, until its round 3 re-render): spires, a sky arch and domes in a
lilac dusk (moved here unchanged from backdrop.py).

"Skyway Metropolis" (format 2, round 2; Rare, Time Capsule; a set with Midnight Neon): arcologies with
flying traffic lanes under a clear sky with high clouds, white where Spire City is dusk. Back: terraced
arcologies in the haze. Far: tall white towers with window bands, roof gardens and sign panels (no
text), glazed skyways between them. Mid: a plaza terrace with planters and trees, holo kiosks, lamps
and an elevated maglev guideway on pylons. Ambient: two streams of flying cars cross in opposite
directions (`path`), a maglev glides along its guideway, a kiosk's holo flickers; windows, sign panels,
kiosks and lamps light up under night skies.

Palette (PLAN 2b): white #E8EAF0, charcoal #23262E, mint accents (hue 160, outside the team bands);
glass stays a pale grey-teal; magenta and mint sign panels are small accents.
"""
import math
import random

from ageborn_art.geometry import Geo

from world.scenes import fauna, kit
from world.scenes.common import Prop, Scene, box, cyl, mixc, rock
from world.scenes.kit import Parts

# -- Spire City (the classic, round 3) ---------------------------------------------------------------
SC_PAL = dict(skyTop=0x5C5E8E, skyBottom=0xC9B6CF, light=0xF2ECF4, far=0x8A84A0, mid=0x6E6A86, near=0x4E4C64)
SC = dict(
    white=0xE4E6EE, white2=0xCDD0DA, white3=0xB8BCC8, char=0x23262E, char2=0x3A3E48, char3=0x4E5260, glass=0x8A9CA4, glass_dk=0x5E6E78,
    mint=0x3AF0B4, magenta=0xF03AA8, lilac=0x9A8AB0, lilac_dk=0x7A6E94, plaza=0xA8A4B4, plaza_dk=0x8A8698, tree=0x5E7A66, tree_dk=0x4C6656,
    trunk=0x5A5260, water=0x9AAAB4, glass_lt=0xAEC2CA,
)
SC_SKY = {"top": "#5C5E8E", "bottom": "#C9B6CF", "horizon": "#E2D2DC", "cloudTint": "#E8DCE8", "celestial": "sun",
          "sunAt": [240, -520, 34], "clouds": 0.6}
SC_FAR_E = math.radians(8.0)
SC_MID_E = math.radians(12.0)
SC_ARCH = (400.0, 880.0, 520.0, 30.0, 178.0)   # x0, x1, y, foot z, apex z (far)
SC_DISCS = ((230.0, 430.0, 118.0, 18.0), (980.0, 470.0, 104.0, 15.0))   # the two moving hover platforms (far): x, y, z, r
SC_RAIL = (90.0, 64.0)                         # the monorail beam: top z, depth (mid)


def sc_back(st, P):
    """A giant arcology in the haze: a stepped, terraced megastructure on the right, low towers elsewhere
    (lowest under the moons' place)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    ga, ga2 = pt.g(hz(SC["lilac_dk"], 0.4), outline=0.0), pt.g(hz(SC["lilac"], 0.36), outline=0.0)
    for k in range(6):
        w = 330 - k * 48
        box(ga if k % 2 else ga2, (1230, 1500, 20 + k * 30 + 15), (w, 60, 15), p=5, cuts=2, taper=(1.0, 0.94))
    pt.g(hz(SC["white3"], 0.4), outline=0.0).lathe([(0.01, 0), (16, 0), (6, 60), (0.01, 90)], (1230, 1500, 200), (1230, 1500, 290), segs=12)
    for x, w, h in ((-200, 60, 120), (-80, 46, 160), (60, 70, 90), (300, 50, 130), (560, 60, 100), (700, 40, 70), (940, 50, 54)):
        box(ga2, (x, 1500, h / 2), (w / 2, 40, h / 2), p=5, cuts=2, taper=(1.0, 0.8))
    pt.flush(st)


def sc_far(st, P):
    pt = Parts()
    rnd = random.Random(71)
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    # 1. the city floor: a terrace of lilac-grey decks, a calm canal with a glowing edge
    box(pt.g(SC["plaza_dk"], outline=0.0), (600, 600, 12), (1100, 260, 12), p=6, cuts=2)
    box(pt.g(SC["water"], finish="gloss", outline=0.0), (600, 360, 18), (1100, 22, 2), p=6, cuts=2)
    box(pt.g(SC["mint"], glow=True), (600, 337.6, 20.6), (1100, 0.5, 0.4), p=4, cuts=1)
    # 2. rows of lower towers and domes behind and between the spires
    lights = []
    for row, (y, haze) in enumerate(((760, 0.3), (640, 0.16), (520, 0.06))):
        x = -250.0
        while x < 1460:
            w = rnd.uniform(30, 54)
            h = rnd.uniform(30, 70) * (1.2 if row == 0 else 1.0)
            if 830 < x < 990:
                h *= 0.6
            dark = rnd.random() < 0.35
            c = SC["char2"] if dark else rnd.choice((SC["white2"], SC["white3"], SC["lilac"]))
            g = pt.g(hz(c, haze), finish="gloss" if dark else "matte", outline=0.3)
            yaw = rnd.choice((-10, 0, 10))
            box(g, (x + w / 2, y, 24 + h / 2), (w / 2, 16, h / 2), p=9, cuts=2, rot=(0, 0, yaw))
            if rnd.random() < 0.6:
                box(g, (x + w / 2, y, 24 + h + h * 0.15), (w * 0.34, 11, h * 0.15), p=9, cuts=2, rot=(0, 0, yaw))
            gl = pt.g(hz(SC["mint"] if rnd.random() < 0.6 else SC["magenta"], haze * 0.6), glow=True)
            for k in range(int(h / 18)):
                fx, fy = kit._at(x + w / 2, y, 0, -16.4, yaw)
                box(gl, (fx, fy, 30 + k * 18), (w * 0.34, 0.4, 0.45), p=4, cuts=1, rot=(0, 0, yaw))
            if row == 2 and rnd.random() < 0.4:
                lights.append((x + w / 2, y - 17, 24 + h * 0.6))
            if rnd.random() < 0.25:
                pt.g(hz(SC["white"], haze), finish="gloss", outline=0.3).lathe(
                    [(0.01, 0), (w * 0.4, 0), (w * 0.36, w * 0.16), (w * 0.2, w * 0.3), (0.01, w * 0.34)], (x + w / 2, y, 24 + h), (x + w / 2, y, 24 + h + w * 0.34), segs=16)
            x += w + rnd.uniform(4, 16)
    # 3. the sky arch (the signature) over the heart of the city
    ax0, ax1, ay, az0, aapex = SC_ARCH
    top = kit.sky_arch(pt, ax0, ax1, ay, az0, aapex, thick=6.5, white=SC["white"], glow=SC["mint"])
    st.amb("blink", "bd.light", (top[0], top[1], top[2] + 8), "far", period=2200, tint=0xF6C6E4)
    # 4. the spires, tallest in the middle; beacons blink on their tips
    for k, (x, y, h, r) in enumerate(((60, 470, 150, 15), (180, 500, 186, 18), (330, 440, 140, 14), (560, 480, 170, 17), (740, 460, 150, 15), (1080, 470, 176, 17),
                                      (1220, 500, 134, 13), (1360, 470, 160, 16))):
        tip = kit.spire(pt, x, y, 24, h, r, white=SC["white"], white2=SC["white2"], dark=SC["char2"], glow=SC["mint"] if k % 3 else SC["magenta"], seed=10 + k)
        st.amb("blink", "bd.light", (tip[0], tip[1], tip[2] + 3), "far", period=900 + k * 170, tint=0xF6C6E4 if k % 2 else 0xD8FFF0)
        lights.append((x, y - r * 0.9, 24 + h * 0.3))
    # sky bridges between neighbouring spires
    gb = pt.g(SC["white2"], finish="gloss", outline=0.3)
    gbl = pt.g(SC["mint"], glow=True)
    for (xa, xb, z) in ((60, 180, 120), (180, 330, 96), (1080, 1220, 110), (1220, 1360, 90)):
        gb.capsule((xa, 470, z), (xb, 470, z), 3.4)
        gbl.capsule((xa, 466.4, z - 0.6), (xb, 466.4, z - 0.6), 0.5)
    # 5. still hover platforms over the canal (two more move: props)
    for (x, y, z, r) in ((660, 420, 70, 12), (1290, 430, 90, 11), (-120, 440, 96, 12)):
        kit.hover_disc(pt, x, y, z, r, white=SC["white"], dark=SC["char2"], glow=SC["mint"])
    for p_ in lights[:9]:
        st.light(p_, 3)
    pt.flush(st)


def sc_mid(st, P):
    pt = Parts()
    rnd = random.Random(73)
    # the plaza deck: pale lilac stone, a dark edge with a light strip, planters
    g = pt.g(SC["plaza"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g, (x, 80, 8), (96, 60, 40 + rnd.uniform(0, 6)), seed=i, jag=0.03, p=3.0)
    box(pt.g(SC["char2"], outline=0.3), (600, 112, 46), (900, 6, 3), p=6, cuts=1)
    box(pt.g(SC["mint"], glow=True), (600, 105.6, 46.4), (900, 0.4, 0.5), p=4, cuts=1)
    gt, gt2, gtr = pt.g(SC["tree"], outline=0.5), pt.g(SC["tree_dk"], outline=0.5), pt.g(SC["trunk"], outline=0.4)
    gpl = pt.g(SC["white3"], outline=0.5)
    for k, x in enumerate((-200, 40, 520, 980, 1230)):
        cyl(gpl, (x, 70, 38), (x, 70, 50), 12, 10, bevel=0.6, segs=16)
        kit.broadleaf(gt if k % 2 else gt2, gtr, x, 70, 64, 20, seed=500 + k, z=48)
    # 1. the monorail beam on its pylons (white Y-pylons with light strips)
    rz, ry = SC_RAIL
    gw, gw2 = pt.g(SC["white"], finish="gloss", outline=0.5), pt.g(SC["white2"], outline=0.5)
    box(gw, (600, ry, rz - 2.6), (900, 3.6, 2.6), p=6, cuts=2)
    box(pt.g(SC["mint"], glow=True), (600, ry - 3.8, rz - 3.6), (900, 0.4, 0.45), p=4, cuts=1)
    for x in range(-240, 1460, 170):
        gw2.capsule((x, ry, 40), (x, ry, rz - 14), 3.8, 2.8)
        gw2.capsule((x, ry, rz - 14), (x - 8, ry, rz - 5), 2.0)
        gw2.capsule((x, ry, rz - 14), (x + 8, ry, rz - 5), 2.0)
        box(pt.g(SC["magenta"] if (x // 170) % 3 == 0 else SC["mint"], glow=True), (x, ry - 3.6, rz - 30), (0.5, 0.4, 10), p=4, cuts=1)
    # 2. glass domes with glowing rings (x 220-480 kept low: the arch stands behind at the game's camera)
    for k, (x, r) in enumerate(((300, 46), (430, 34), (860, 52))):
        gd = pt.g(SC["glass_lt"], finish="gloss", outline=0.5)
        gd.lathe([(0.01, 0), (r, 0)] + [(r * math.cos(math.pi / 2 * j / 8), r * 0.72 * math.sin(math.pi / 2 * j / 8)) for j in range(1, 9)], (x, 84, 40), (x, 84, 40 + r * 0.72),
                 segs=28)
        cyl(pt.g(SC["white2"], outline=0.4), (x, 84, 39), (x, 84, 44), r + 1.6, bevel=0.4, segs=28)
        cyl(pt.g(SC["mint"], glow=True), (x, 84, 44), (x, 84, 45), r + 1.2, bevel=0.1, segs=28)
        gd2 = pt.g(SC["white"], outline=0.0)
        for j in range(7):
            a = math.pi * (j + 0.5) / 7
            pts = [(x + math.cos(a) * r * math.cos(math.pi / 2 * t / 6), 84 - math.sin(a) * r * math.cos(math.pi / 2 * t / 6) - 0.6,
                    40 + r * 0.72 * math.sin(math.pi / 2 * t / 6) + 0.4) for t in range(7)]
            for p0, p1 in zip(pts, pts[1:]):
                gd2.capsule(p0, p1, 0.7)
        st.light((x, 84 - r * 0.9, 40 + r * 0.3), 5)
    # 3. the transit station (x 620-760): a curved canopy on slim columns, a platform, glowing panels
    box(pt.g(SC["char2"], outline=0.5), (690, 92, 40 + 3), (70, 18, 3), p=6, cuts=1)
    for x in (630, 670, 710, 750):
        gw2.capsule((x, 80, 46), (x, 80, 92), 1.6)
    vault = Geo()
    vault.capsule((628, 88, 70), (752, 88, 70), 22, 22)
    vault.clip((690, 88, 70), (0, 0, -1))
    kit._merge(pt.g(SC["glass_lt"], finish="gloss", outline=0.5), vault)
    grb = pt.g(SC["white"], outline=0.3)
    for x in range(632, 752, 15):
        for t in range(8):
            a0, a1 = math.pi * t / 8, math.pi * (t + 1) / 8
            grb.capsule((x, 88 - 22.4 * math.cos(a0), 70 + 22.4 * math.sin(a0)), (x, 88 - 22.4 * math.cos(a1), 70 + 22.4 * math.sin(a1)), 0.8)
    for k, x in enumerate((644, 692, 736)):
        box(pt.g(SC["magenta"] if k == 1 else SC["mint"], glow=True), (x, 76.6, 70), (7, 0.4, 4.4), p=4, cuts=1)
    st.light((692, 74, 70), 5)
    # 4. a slim tower block and lamps on the right; holo pillars on the left
    box(pt.g(SC["char3"], finish="gloss", outline=0.5), (1120, 104, 40 + 50), (26, 14, 50), p=5, cuts=2, taper=(1.0, 0.86))
    for k in range(5):
        box(pt.g(SC["mint"], glow=True), (1120, 89.4, 52 + k * 18), (18, 0.4, 0.6), p=4, cuts=1)
    st.light((1120, 88, 80), 4)
    gl = pt.g(SC["char2"], outline=0.4)
    for k, x in enumerate((-120, 120, 940, 1340)):
        gl.capsule((x, 50, 40), (x, 50, 84), 1.0)
        pt.g(SC["mint"] if k % 2 else SC["magenta"], glow=True).sphere((x, 49, 86), 2.2)
    pt.flush(st)


def sc_props():
    rz, ry = SC_RAIL
    rail = _scr((0, ry - 2, rz + 0.5), SC_MID_E)[1]
    discs = [_scr((x, y, z), SC_FAR_E) for (x, y, z, r) in SC_DISCS]
    ax0, ax1, ay, az0, aapex = SC_ARCH

    def disc(r):
        def build(rig):
            rig.part("all", Geo().lathe([(0.01, 0), (r * 0.5, 0), (r, r * 0.12), (r * 1.02, r * 0.2), (r * 0.9, r * 0.26), (0.01, r * 0.26)], (0, 0, 0), (0, 0, r * 0.26), segs=24),
                     "#E4E6EE", finish="gloss", outline=0.4)
            rig.part("all", Geo().lathe([(0.01, 0), (r * 0.36, 0), (r * 0.3, r * 0.14), (0.01, r * 0.2)], (0, 0, r * 0.26), (0, 0, r * 0.46), segs=16), "#3A3E48",
                     outline=0.3)
            rig.part("all", Geo().blob((0, 0, 0.4), (r * 0.42, r * 0.36, 0.8), p=2.0, cuts=2), glow="#9CF0D4", outline=0)
        return build
    plist = [
        Prop("disc", "far", disc(SC_DISCS[0][3]), [{}], (2 * SC_DISCS[0][3] + 6, 12, 3), discs[0][1]),
        Prop("disc2", "far", disc(SC_DISCS[1][3]), [{}], (2 * SC_DISCS[1][3] + 6, 10, 3), discs[1][1]),
        Prop("mono", "mid", fauna.monorail_car(size=1.0, length=34), [{}], (40, 16, 3), rail),
        Prop("monoc", "mid", fauna.monorail_car(size=1.0, length=30, nose=False), [{}], (36, 16, 3), rail),
    ]
    sprites = [
        {"kind": "bob", "layer": "far", "frames": ["disc_0"], "at": discs[0], "amp": [3.0, 2.6], "periodS": 7, "tilt": 1.2},
        {"kind": "bob", "layer": "far", "frames": ["disc2_0"], "at": discs[1], "amp": [2.0, 2.2], "periodS": 9, "tilt": 1.0},
        {"kind": "path", "layer": "mid", "fps": 1, "periodS": 40,
         "keys": [[0, -380, rail, 1], [18, 1600, rail, 1], [40, 1600, rail, 1]],
         "group": [{"frames": ["mono_0"]}, {"frames": ["monoc_0"], "dx": -34}, {"frames": ["monoc_0"], "dx": -66}]},
    ]
    del ax0, ax1, ay, az0, aapex
    return plist, sprites


# -- Skyway Metropolis (round 2) -----------------------------------------------------------------------
SM_PAL = dict(skyTop=0x86AECF, skyBottom=0xEEF0F2, light=0xFAFBFC, far=0xB8BCC6, mid=0x9EA2AC, near=0x7E828C)
SM = dict(
    white=0xE8EAF0, white2=0xD8DBE4, white3=0xC6CAD4, char=0x23262E, char2=0x3A3E48, glass=0xA8C0C0, glass_dk=0x7E9696, mint=0x3AF0B4,
    mint_lt=0x9CF0D4, mint_dk=0x5E9A8C, dark=0x464C58, magenta=0xD866B0, leaf=0x6E9A6A, leaf_dk=0x5A8458, soil=0x7A6E62, plaza=0xC8CCD4, plaza_dk=0xAEB2BC, metal=0x9A9EA8,
    arco=0xC4C8D0, arco_g=0x9EB4A0,
)
SM_SKY = {"top": "#86AECF", "bottom": "#EEF0F2", "horizon": "#F2F4F4", "cloudTint": "#FAFBFC", "celestial": "sun",
          "sunAt": [340, -560, 34], "clouds": 0.8}
SM_FAR_E = math.radians(8.0)
SM_MID_E = math.radians(12.0)
SM_LANES = (-150.0, -196.0)           # the two flying lanes (far, screen lu)
SM_RAIL = (128.0, 70.0)               # the maglev guideway: top z, depth (mid)
SM_HOLO = (560.0, 52.0, 44.0)         # the holo kiosk (mid)


def _scr(p, e):
    x, y, z = p
    return [round(x, 1), -round(z * math.cos(e) + y * math.sin(e), 1)]


def tower(P, st, x, y, w, h, d=None, seed=0, z=0.0, signs=(), lights=True, top="garden", dark=False, greens=0):
    """A tower: a rounded slab that tapers a little (white, or dark glass with mint lines), window bands,
    a crown (a roof garden with trees, an antenna or a ring), green ledges, and sign panels (mint or
    magenta, no text)."""
    rnd = random.Random(seed)
    d = d or w * 0.8
    gw = P.g(SM["dark"] if dark else (SM["white"] if seed % 3 else SM["white2"]), finish="gloss" if dark else "matte", outline=0.5)
    box(gw, (x, y, z + h / 2), (w / 2, d / 2, h / 2), p=5.0, cuts=3, taper=(1.0, 0.9))
    gb = P.g(SM["mint_dk"], outline=0.0, highlight=False) if dark else P.g(SM["glass_dk"], outline=0.0, highlight=False)
    for k in range(greens):
        zz = z + h * (0.3 + 0.22 * k)
        tw = w / 2 * (1.0 - 0.1 * (zz - z) / h)
        box(P.g(SM["white3"], outline=0.3), (x, y - d / 2 * (1.0 - 0.1 * (zz - z) / h) - 2, zz), (tw + 2, 4, 1.6), p=4, cuts=1)
        for j in range(4):
            kit.round_bush(P.g(SM["leaf"], outline=0.3), x - tw * 0.75 + j * tw * 0.5, y - d / 2 - 3, 5.4, seed=seed * 31 + k * 5 + j, z=zz + 1, flat=0.8)
    n = int(h / 16)
    lit = []
    for k in range(1, n):
        zz = z + k * 16
        tw = w / 2 * (1.0 - 0.1 * (zz - z) / h) - 2
        box(gb, (x, y - d / 2 * (1.0 - 0.1 * (zz - z) / h) - 0.2, zz), (tw, 0.6, 2.4), p=4, cuts=1)
        if lights and k % 3 == 1:
            lit.append((x + rnd.uniform(-tw * 0.6, tw * 0.6), y - d / 2, zz))
    for p in lit[:3]:
        st.light(p, 4)
    zt = z + h
    if top == "garden":
        box(P.g(SM["white3"], outline=0.4), (x, y, zt + 2), (w / 2 * 0.92, d / 2 * 0.92, 2.4), p=5, cuts=1)
        for k in range(3):
            kit.round_bush(P.g(SM["leaf"], outline=0.3), x - w * 0.3 + k * w * 0.3, y, w * 0.12, seed=seed * 7 + k, z=zt + 3, flat=0.9)
    elif top == "antenna":
        P.g(SM["char2"], outline=0.3).capsule((x, y, zt), (x, y, zt + h * 0.24), 1.0)
        st.amb("blink", "bd.light", (x, y, zt + h * 0.24 + 3), period=1400, tint=0xF6D8EC)
    elif top == "ring":
        cyl(P.g(SM["white3"], outline=0.4), (x, y, zt), (x, y, zt + 10), w * 0.36, bevel=1.0, segs=24)
        cyl(P.g(SM["mint"], glow=True), (x, y, zt + 4), (x, y, zt + 6), w * 0.37, bevel=0.2, segs=24)
    for (sz, color) in signs:
        g = P.g(color, glow=True)
        box(g, (x + w * 0.18, y - d / 2 - 1.4, z + sz), (w * 0.22, 0.6, 9), p=4, cuts=1)
        st.light((x + w * 0.18, y - d / 2 - 3, z + sz), 6)


def sm_back(st, P):
    """Terraced arcologies in the haze: stepped pyramids with green ledges (low under the moons' place)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    ga, gg = pt.g(hz(SM["arco"], 0.3), outline=0.0), pt.g(hz(SM["arco_g"], 0.3), outline=0.0)
    for (x, w, h, steps) in ((-120, 260, 300, 6), (330, 300, 360, 7), (1180, 320, 340, 7), (900, 120, 80, 2)):
        for k in range(steps):
            ww = w * (1 - k / (steps + 1))
            box(ga, (x, 1500, -60 + k * h / steps + h / steps / 2), (ww / 2, ww / 3, h / steps / 2), p=6, cuts=2)
            box(gg, (x, 1500 - ww / 3 + 2, -60 + (k + 1) * h / steps), (ww / 2 * 0.96, 3, 2.6), p=4, cuts=1)
    pt.flush(st)


def sm_far(st, P):
    pt = Parts()
    rnd = random.Random(71)
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    # 1. a pale distant row of towers
    gd = pt.g(hz(SM["white3"], 0.22), outline=0.0)
    for i in range(16):
        x = -280 + i * 116 + rnd.uniform(-20, 20)
        h = rnd.uniform(140, 260) if not (760 <= x <= 1000) else rnd.uniform(70, 100)
        box(gd, (x, 700, h / 2 - 10), (rnd.uniform(22, 36), 22, h / 2), p=5, cuts=2, taper=(1.0, 0.86))
    # 2. the main towers, with signs and skyways between neighbours
    specs = [(-170, 64, 250, "antenna", ((90, SM["mint"]),), False, 0), (-40, 56, 190, "garden", (), True, 0),
             (110, 72, 300, "ring", ((150, SM["magenta"]), (220, SM["mint"])), False, 2), (250, 52, 210, "garden", (), False, 1),
             (390, 68, 270, "antenna", ((120, SM["mint"]),), True, 0), (540, 58, 230, "garden", ((170, SM["magenta"]),), False, 2),
             (680, 74, 286, "ring", (), False, 1), (830, 50, 150, "garden", (), True, 0), (980, 66, 260, "antenna", ((110, SM["magenta"]),), False, 2),
             (1120, 58, 210, "garden", (), True, 0), (1260, 70, 300, "ring", ((160, SM["mint"]),), False, 1), (1400, 54, 200, "garden", (), True, 0)]
    tops = {}
    for k, (x, w, h, top, signs, dark, greens) in enumerate(specs):
        y = 400 + (k % 3) * 26
        tower(pt, st, x, y, w, h, seed=k + 1, signs=signs, top=top, dark=dark, greens=greens)
        tops[k] = (x, y, w, h)
    gsk, gskg = pt.g(SM["white2"], outline=0.4), pt.g(SM["glass"], finish="gloss", outline=0.3)
    for k in range(len(specs) - 1):
        if k % 2:
            continue
        x0, y0, w0, h0 = tops[k]
        x1, y1, w1, h1 = tops[k + 1]
        zz = min(h0, h1) * rnd.uniform(0.5, 0.7)
        ya = (y0 + y1) / 2
        gsk.capsule((x0 + w0 / 2 - 4, ya, zz), (x1 - w1 / 2 + 4, ya, zz), 6.0)
        gskg.capsule((x0 + w0 / 2 - 4, ya - 1.6, zz + 1.6), (x1 - w1 / 2 + 4, ya - 1.6, zz + 1.6), 4.0)
    # 3. low podiums and green terraces at the foot
    gp, gl = pt.g(SM["plaza_dk"], outline=0.3), pt.g(SM["leaf"], outline=0.3)
    for i in range(14):
        x = -280 + i * 128
        box(gp, (x, 330, 14), (56, 26, 16), p=5, cuts=2)
        for k in range(3):
            kit.round_bush(gl, x - 30 + k * 30, 312, 7, seed=400 + i * 3 + k, z=30, flat=0.8)
    pt.flush(st)


def sm_mid(st, P):
    pt = Parts()
    rnd = random.Random(73)
    # the plaza terrace with a parapet
    box(pt.g(SM["plaza"], outline=0.0), (600, 80, 22), (930, 46, 22), p=6, cuts=2)
    box(pt.g(SM["white"], outline=0.4), (600, 36, 47), (930, 1.6, 3.4), p=4, cuts=1)
    gl = pt.g(SM["plaza_dk"], outline=0.0)
    for x in range(-280, 1480, 40):
        box(gl, (x, 80, 44.2), (0.6, 40, 0.3), p=4, cuts=1)
    # planters with trees
    gpl, gs = pt.g(SM["white2"], outline=0.5), pt.g(SM["soil"], outline=0.0)
    gtr, gtr2, gtk = pt.g(SM["leaf"], outline=0.5), pt.g(SM["leaf_dk"], outline=0.5), pt.g(SM["char2"], outline=0.4)
    for i, x in enumerate((-200, -40, 140, 330, 760, 940, 1100, 1300)):
        box(gpl, (x, 84, 52), (22, 12, 8), p=5, cuts=2)
        box(gs, (x, 84, 60.2), (19, 10, 1.0), p=4, cuts=1)
        kit.broadleaf(gtr if i % 2 else gtr2, gtk, x, 84, rnd.uniform(64, 84), rnd.uniform(18, 24), seed=500 + i, z=60)
    # the maglev guideway on T-pylons
    rz, ry = SM_RAIL
    gw, gc = pt.g(SM["white"], outline=0.5), pt.g(SM["char2"], outline=0.4)
    box(gw, (600, ry, rz - 6), (930, 7, 6), p=5, cuts=2)
    box(pt.g(SM["mint"], glow=True), (600, ry - 7.4, rz - 7), (930, 0.4, 1.0), p=4, cuts=1)
    for x in range(-240, 1500, 170):
        box(gw, (x, ry, (44 + rz - 12) / 2), (6, 6, (rz - 12 - 44) / 2), p=5, cuts=2, taper=(1.2, 1.0))
        box(gc, (x, ry, rz - 13), (14, 8, 2.4), p=4, cuts=1)
    # holo kiosks: round pavilions with a dome and a mint ring
    for i, x in enumerate((SM_HOLO[0], 1180)):
        cyl(pt.g(SM["white2"], outline=0.5), (x, 60, 44), (x, 60, 62), 16, bevel=1.4, segs=24)
        pt.g(SM["glass"], finish="gloss", outline=0.5).lathe([(17 * math.cos(math.pi / 2 * k / 8), 12 * math.sin(math.pi / 2 * k / 8)) for k in range(9)],
                                                             (x, 60, 62), (x, 60, 74), segs=24)
        cyl(pt.g(SM["mint"], glow=True), (x, 60, 56), (x, 60, 58), 16.4, bevel=0.2, segs=24)
        st.light((x, 42, 54), 7)
    # lamp posts
    for x in (40, 240, 440, 860, 1040, 1380):
        gc.capsule((x, 50, 44), (x, 50, 104), 1.2)
        gc.capsule((x, 50, 104), (x + 8, 50, 106), 0.9)
        box(pt.g(SM["mint_lt"], glow=True), (x + 9, 49, 104), (3.4, 2.4, 1.4), p=4, cuts=1)
        st.light((x + 9, 47, 102), 7)
    pt.flush(st)


def _holo(rig):
    """A holo emblem over the kiosk: a hexagon frame and a star, two flicker frames (glow)."""
    for f in range(3):
        j = rig.joint(f"h{f}", "all", (0, 0, 0), hidden=True)
        a = [1.0, 0.86, 0.94][f]
        g = Geo()
        for k in range(6):
            a0, a1 = math.pi / 3 * k, math.pi / 3 * (k + 1)
            g.capsule((9 * math.cos(a0), 0, 9 * math.sin(a0) * a), (9 * math.cos(a1), 0, 9 * math.sin(a1) * a), 0.9)
        g.star((0, -0.4, 0), 5.2 * a, 2.2 * a, 1.0)
        rig.part(j, g, glow="#9CF0D4" if f != 1 else "#C4F6E2", outline=0)


def _maglev(rig):
    rig.part("all", Geo().blob((0, 0, 7), (26, 6, 6), p=2.6, taper=(1.0, 0.8)), "#E8EAF0", finish="gloss", outline=0.5)
    rig.part("all", Geo().lathe([(0.01, 0), (6.2, 0), (0.01, 12)], (24, 0, 7), (36, 0, 6), segs=14), "#E8EAF0", finish="gloss", outline=0.5)
    rig.part("all", Geo().blob((4, -0.6, 9), (22, 5.6, 2.2), p=3.0), "#3A3E48", finish="gloss", outline=0.3)
    rig.part("all", Geo().blob((0, 0, 1.2), (24, 4.6, 0.8), p=3.0), glow="#9CF0D4", outline=0)


def sm_props():
    car = [fauna.flying_car(size=1.7), fauna.flying_car(body="#D8DBE4", trim="#4A4E58", size=1.55),
           fauna.flying_car(body="#E8E2D8", trim="#3A3E48", light="#F6C6E4", size=1.8)]
    rz, ry = SM_RAIL
    rail = -round((rz + 1) * math.cos(SM_MID_E) + ry * math.sin(SM_MID_E), 1)
    holo = _scr((SM_HOLO[0], SM_HOLO[1], 92), SM_MID_E)
    plist = [Prop(f"car{k}", "far", c, [{}], (50, 24, 8), SM_LANES[0]) for k, c in enumerate(car)]
    plist += [Prop("maglev", "mid", _maglev, [{}], (80, 20, 4), rail), Prop("holo", "mid", _holo, [{f"h{f}": {"show": True}} for f in range(3)],
                                                                             (24, 12, 12), holo[1], outline=False)]
    lane0 = [{"frames": ["car0_0"]}, {"frames": ["car1_0"], "dx": -90, "dy": 3}, {"frames": ["car2_0"], "dx": -170, "dy": -2},
             {"frames": ["car0_0"], "dx": -260, "dy": 2}]
    lane1 = [{"frames": ["car2_0"]}, {"frames": ["car0_0"], "dx": -120, "dy": -3}, {"frames": ["car1_0"], "dx": -210, "dy": 2}]
    sprites = [
        {"kind": "path", "layer": "far", "fps": 1, "periodS": 22, "keys": [[0, -360, SM_LANES[0], 1], [22, 1820, SM_LANES[0], 1]], "group": lane0},
        {"kind": "path", "layer": "far", "fps": 1, "periodS": 28, "keys": [[0, 1820, SM_LANES[1], 1], [28, -360, SM_LANES[1], 1]], "group": lane1},
        {"kind": "path", "layer": "mid", "fps": 1, "periodS": 18, "keys": [[0, -380, rail, 1], [7, 1600, rail, 1], [7.1, 1600, rail, 0], [18, 1600, rail, 0]],
         "group": [{"frames": ["maglev_0"]}, {"frames": ["maglev_0"], "dx": -62}]},
        {"kind": "loop", "layer": "mid", "frames": ["holo_0", "holo_1", "holo_0", "holo_2"], "fps": 5, "at": holo},
    ]
    return plist, sprites


SCENES = {
    "classic": Scene("future", "classic", SC_PAL, sc_far, sc_mid, back=sc_back, sky=SC_SKY, props=sc_props,
                     hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.5}, ground="deck",
                     look={"far": (0.18, 0.09, 0.2)}),
    "skyway_metropolis": Scene("future", "skyway_metropolis", SM_PAL, sm_far, sm_mid, back=sm_back, sky=SM_SKY, props=sm_props,
                               hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.4}, ground="earth"),
}
