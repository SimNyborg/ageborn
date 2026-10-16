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
from world.scenes.common import Prop, Scene, box, cyl, dk, ground_band, lt, mixc, ridge, rock
from world.scenes.kit import Parts

PAL = dict(skyTop=0x2c2e50, skyBottom=0x9a7aa8, far=0x524e78, mid=0x3e3e60, near=0x2c2e46, light=0xd8f3ea)

# the sky the game paints for this classic (sky.ts paintSky), for its thumbnail
SKY = {"top": "#2C2E50", "bottom": "#9A7AA8", "horizon": "#B6B0C6", "celestial": "sun", "sunAt": [860, -560, 30], "night": True}


def far(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.3)
    ridge(st, back, -300, 1500, 0, 120, 460, 41, lumps=10, jag=0.1)
    # the ring arch
    g = Geo()
    for k in range(40):
        a0, a1 = math.pi * k / 40, math.pi * (k + 1) / 40
        g.capsule((700 + 200 * math.cos(a0), 300, 300 * math.sin(a0)), (700 + 200 * math.cos(a1), 300, 300 * math.sin(a1)), 9)
    st.part(g, lt(P["far"], 0.12), outline=0.0, finish="gloss")
    gt, gs = Geo(), Geo()
    for sx, h, w in ((60, 400, 34), (180, 300, 26), (470, 440, 40), (960, 380, 36), (1130, 470, 44), (1300, 320, 30)):
        gt.lathe([(0, 0), (w, 0), (w * 0.55, h * 0.6), (w * 0.35, h), (0, h + 40)], (sx, 160, 0), (sx, 160, h + 40), segs=6)
        gs.blob((sx, 160 - w * 0.5, h * 0.55), (2.4, 2, h * 0.4), p=4, cuts=2)
        st.amb("blink", "bd.light", (sx, 160, h + 44), "far", period=900 + (sx % 7) * 120, tint=0xF6C6E4)
    st.part(gt, P["far"], outline=0.0, finish="gloss")
    st.part(gs, None, glow="#8FD8C4")
    g = Geo()
    g.blob((620, 120, 270), (64, 20, 12), p=2.4)
    g.blob((870, 120, 336), (50, 20, 11), p=2.4)
    st.part(g, lt(P["far"], 0.15), outline=0.0, finish="gloss")
    st.amb("drift", "bd.skycar", (200, 0, 300), "sky", speed=60, tint=0xD8F3EA)
    st.amb("drift", "bd.skycar", (900, 0, 360), "sky", speed=-45, tint=0xF6D8EC, scale=0.7)


def mid(st, P):
    ground_band(st, P["mid"])
    for x, r in ((80, 70), (520, 90), (1050, 80)):
        g = Geo()
        prof = [(0, 0)] + [(r * math.cos(math.pi / 2 * k / 8), r * 0.7 * math.sin(math.pi / 2 * k / 8)) for k in range(9)]
        g.lathe(prof, (x, 60, 0), (x, 60, r * 0.7), segs=28)
        st.part(g, P["near"], outline=0.5, finish="gloss")
        g = Geo()
        cyl(g, (x, 60, r * 0.25 - 1.5), (x, 60, r * 0.25 + 1.5), r * 0.93 + 1, bevel=0.3, segs=28)
        st.part(g, None, glow="#7FD8BE")
        st.amb("blink", "bd.light", (x, 60, r * 0.7 + 4), "mid", period=1300, tint=0xD8FFF0)
    g, gl = Geo(), Geo()
    for i in range(12):
        x = -230 + i * 145
        g.capsule((x, 20, 0), (x, 20, 150), 4)
        box(g, (x, 20, 152), (18, 6, 4), p=5)
        gl.blob((x, 15, 80), (1.6, 1, 60), p=3, cuts=1)
    st.part(g, dk(P["near"], 0.1), outline=0.4, finish="metal")
    st.part(gl, None, glow="#C9A4C0")
    g = Geo()
    box(g, (600, 0, 34), (900, 6, 4), p=6)
    st.part(g, dk(P["mid"], 0.1), outline=0.3, finish="metal")


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
    "classic": Scene("future", "classic", PAL, far, mid, sky=SKY, version=1),
    "skyway_metropolis": Scene("future", "skyway_metropolis", SM_PAL, sm_far, sm_mid, back=sm_back, sky=SM_SKY, props=sm_props,
                               hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.4}, ground="earth"),
}
