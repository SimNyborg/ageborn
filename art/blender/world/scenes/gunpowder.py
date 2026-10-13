"""Gunpowder scenes. Classic (format 1, until its round 3 re-render): a coast with sailing ships,
windmills and a cottage (moved here unchanged from backdrop.py).

"Treasure Cove" (format 2, round 2; Rare, Time Capsule): a palm cove under a tropical haze. Back: green
volcanic islands on the horizon. Far: a turquoise sea, a ruined jungle fort on a green headland (bastion
walls with embrasures and corner sentry turrets, vines and palms), a sloop at anchor, rocks and green
islands. Mid: a sand bank with palms and ferns, a beached rowboat, barrels and crates, an open treasure
chest, a campfire, and a rope bridge between two rock stacks over a creek; the lagoon behind it.
Ambient: two palm crowns sway (`loop`), waves lap the shore (`loop`), the sloop bobs, parrots fly round
the fort; the campfire, the bridge lantern and the sloop's stern lamp glow under night skies.

Palette (PLAN 2b): jungle #4F7A4A, sand #D8C8A0, wood #6A4E3A. The sea is a turquoise at about hue 170
degrees, outside the team-hue bands, so it may be clearer than the Aegean's teal-grey; gold coins and
parrots are small accents.
"""
import math
import random

from ageborn_art.geometry import Geo

from world.scenes import fauna, kit
from world.scenes.common import Prop, Scene, box, cyl, dk, ground_band, lt, mixc, ridge, rock, round_tree
from world.scenes.kit import Parts

PAL = dict(skyTop=0x8cb6c6, skyBottom=0xf2e2c0, far=0x8ea3a6, mid=0x6c8874, near=0x546c56, light=0xfff0d0)

# the sky the game paints for this classic (sky.ts paintSky), for its thumbnail
SKY = {"top": "#8CB6C6", "bottom": "#F2E2C0", "horizon": "#F8E8C7", "celestial": "sun", "sunAt": [1060, -470, 44]}


def far(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.35)
    ridge(st, back, -300, 900, -10, 180, 420, 21, lumps=8, jag=0.12)
    # the sea on the right with three ships
    g = Geo()
    box(g, (1200, 200, 0), (330, 200, 2), p=6)
    st.part(g, mixc(P["skyBottom"], P["far"], 0.45), outline=0.0, finish="gloss")
    for sx, s in ((1010, 1.0), (1210, 0.8), (1350, 0.65)):
        gh, gs = Geo(), Geo()
        gh.blob((sx, 180, 18 * s + 6), (62 * s, 16 * s, 16 * s), p=3.0)
        for dx, h in ((-20, 150), (20, 120)):
            gh.capsule((sx + dx * s, 180, 20 * s), (sx + dx * s, 180, h * s + 20), 2.4 * s)
            gs.blob((sx + dx * s + 3, 176, h * s * 0.72 + 10), (16 * s, 3, h * s * 0.3), p=2.4)
        st.part(gh, dk(P["far"], 0.05), outline=0.0)
        st.part(gs, lt(P["far"], 0.4), outline=0.0)
    ridge(st, P["far"], -300, 860, 10, 90, 140, 22, lumps=8, jag=0.08, peaks=False)
    # windmills: towers here, sails turn as code ambient
    for wx in (120, 420, 690):
        g = Geo()
        cyl(g, (wx, 60, 50), (wx, 60, 140), 18, 11, bevel=1, segs=12)
        g.lathe([(0, 0), (14, 0), (0.5, 20), (0, 21)], (wx, 60, 140), (wx, 60, 161), segs=12)
        st.part(g, dk(P["far"], 0.06), outline=0.0)
        st.amb("rotate", "bd.windmill.sails", (wx, 40, 146), "far", speed=40, tint=lt(P["far"], 0.2))


def mid(st, P):
    ground_band(st, P["mid"])
    rnd = random.Random(12)
    ga, gt = Geo(), Geo()
    for i in range(9):
        x = -200 + i * 190 + rnd.uniform(-30, 30)
        if 520 < x < 720:
            continue
        r = rnd.uniform(28, 38)
        round_tree(ga, x, 90, r, 100 + i)
        gt.capsule((x, 90, 0), (x, 90, r), 3.4)
    st.part(gt, 0x5E4836, outline=0.4)
    st.part(ga, P["near"], outline=0.5)
    g = Geo()
    for i in range(12):
        x = -200 + i * 150
        rock(g, (x, 40, 20), (52, 26, 30), seed=60 + i, jag=0.1, p=2.4)
    st.part(g, dk(P["near"], 0.06), outline=0.5)
    g = Geo()
    for hx_ in (320, 900):
        g.lathe([(0, 0), (22, 0), (22, 18), (12, 38), (0, 44)], (hx_, 0, 0), (hx_, 0, 44), segs=14)
        g.lathe([(0, 0), (16, 0), (16, 12), (8, 28), (0, 32)], (hx_ + 40, 10, 0), (hx_ + 40, 10, 32), segs=14)
    st.part(g, mixc(P["light"], P["mid"], 0.35), outline=0.5, finish="hair")
    g = Geo()
    box(g, (615, 40, 37), (55, 26, 37), p=6)
    st.part(g, mixc(P["light"], P["near"], 0.4), outline=0.5)
    g = Geo().lathe([(0, 0), (70, 0), (0.5, 50), (0, 52)], (615, 40, 74), (615, 40, 126), segs=4, rot=(0, 0, 45),
                    squash=(1.0, 0.5))
    st.part(g, dk(P["mid"], 0.2), outline=0.5)
    g = Geo()
    cyl(g, (650, 50, 100), (650, 50, 140), 6, bevel=0.5, segs=10)
    st.part(g, dk(P["near"], 0.1), outline=0.4)
    g = Geo()
    for k in range(3):
        box(g, (585 + k * 30, 13, 40), (7, 1, 8), p=5)
    st.part(g, dk(P["near"], 0.3), outline=0.0, highlight=False)
    st.amb("emit", "fx.p.smoke", (650, 50, 144), "mid", rate=0.7, speed=14, scale=1.2, tint=lt(P["mid"], 0.4), alpha=0.45)


# -- Treasure Cove (round 2) ---------------------------------------------------------------------------
TC_PAL = dict(skyTop=0x7CB4C8, skyBottom=0xF2EAD2, light=0xFFF4DC, far=0x8EA898, mid=0x7E8C66, near=0x5E7050)
TC = dict(
    sea=0x5FA89E, sea_far=0x7AB4AA, lagoon=0x6CB0A2, foam=0xE8F0E6, sand=0xD8C8A0, sand_dk=0xC2B086, jungle=0x4F7A4A, jungle_dk=0x40663E,
    jungle_lt=0x6A9460, frond=0x5A8A50, frond_dk=0x48744A, trunk=0x8A7258, fort=0xA8987C, fort_dk=0x8C7E66, vine=0x4A6E44,
    rock=0x8E8676, rock_dk=0x6E685C, wood=0x6A4E3A, wood_lt=0x8A6A4C, dark=0x3E3830, gold=0xD4AC48, iron=0x4A4844, rope=0xB4A07A,
    canvas=0xD8CCB0,
)
TC_SKY = {"top": "#7CB4C8", "bottom": "#F2EAD2", "horizon": "#F6EED8", "cloudTint": "#FBF6EA", "celestial": "sun",
          "sunAt": [250, -520, 42], "clouds": 0.9}
TC_FAR_E = math.radians(8.0)
TC_MID_E = math.radians(12.0)
TC_SEA_Z = 58.0
TC_SLOOP = (820.0, 360.0)            # the sloop at anchor (far): x, depth
TC_PALMS = ((180.0, 70.0, 150.0, 0.22, 3), (700.0, 76.0, 160.0, -0.2, 7))   # the two palms whose crowns sway (mid): x, y, h, lean, seed
TC_WAVES = ((260.0, 112.0), (900.0, 118.0))


def _scr(p, e):
    x, y, z = p
    return [round(x, 1), -round(z * math.cos(e) + y * math.sin(e), 1)]


def tc_back(st, P):
    """Green volcanic islands on the horizon (low under the moons' place, x 820-980)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    gi = pt.g(hz(TC["jungle"], 0.34), outline=0.0)
    for x, rx, h, seed in ((-160, 160, 150, 1), (90, 110, 80, 2), (1120, 170, 170, 3), (1380, 120, 90, 4), (600, 90, 46, 5), (900, 60, 26, 6)):
        kit.peak(gi, None, x, 1500, TC_SEA_Z - 6, rx, h, seed=seed, snow=1.0, jag=0.08, squash=0.5)
    pt.flush(st)


def _fort_z(x):
    """Top of the fort's headland (far) at x."""
    t = max(0.0, 1.0 - ((x - 520.0) / 230.0) ** 2)
    return TC_SEA_Z + 92.0 * t ** 0.6


def tc_far(st, P):
    pt = Parts()
    rnd = random.Random(41)
    # 1. the sea to the horizon, pale crests
    box(pt.g(TC["sea"], finish="gloss", outline=0.0), (600, 760, TC_SEA_Z - 6), (1100, 580, 6), p=6, cuts=2)
    gw = pt.g(TC["foam"], outline=0.0, highlight=False)
    for i in range(44):
        x = rnd.uniform(-260, 1460)
        y = rnd.uniform(200, 1100)
        L = rnd.uniform(8, 18) * (1.0 - (y - 200) / 1800)
        gw.capsule((x - L, y, TC_SEA_Z + 0.4), (x + L, y, TC_SEA_Z + 0.4), 0.9, 0.9)
    # 2. green islands left and right, peaked like old volcanoes, jungle to the water
    gj, gj2 = pt.g(TC["jungle"], outline=0.3), pt.g(TC["jungle_dk"], outline=0.3)
    kit.peak(gj, None, -120, 520, TC_SEA_Z - 8, 180, 190, seed=11, snow=1.0, jag=0.12, squash=0.5)
    kit.peak(gj2, None, 60, 470, TC_SEA_Z - 8, 120, 110, seed=12, snow=1.0, jag=0.12, squash=0.5)
    kit.peak(gj, None, 1180, 540, TC_SEA_Z - 8, 200, 210, seed=13, snow=1.0, jag=0.12, squash=0.5)
    kit.peak(gj2, None, 1400, 480, TC_SEA_Z - 8, 130, 120, seed=14, snow=1.0, jag=0.12, squash=0.5)
    gb = pt.g(mixc(TC["jungle"], TC["jungle_lt"], 0.45), outline=0.0)
    for i in range(60):
        x = rnd.uniform(-260, 1460)
        if 260 < x < 780:
            continue
        kit.round_bush(gb, x, rnd.uniform(400, 440), rnd.uniform(6, 11), seed=100 + i, z=TC_SEA_Z + rnd.uniform(0, 60))
    # 3. the fort's headland: rock cliffs to the sea, jungle on top
    gr, gr2 = pt.g(TC["rock"], outline=0.4), pt.g(TC["rock_dk"], outline=0.4)
    for L, (zc, rz, half) in enumerate(((TC_SEA_Z + 16, 22, 240), (TC_SEA_Z + 46, 20, 200), (TC_SEA_Z + 72, 16, 160))):
        n = max(2, int(half / 70))
        for k in range(n):
            x = 520 - half + (k + 0.5) * 2 * half / n + rnd.uniform(-10, 10)
            rock(gr if (k + L) % 2 else gr2, (x, 344 + L * 8, zc), (half / n + 24, 38, rz), seed=20 + L * 10 + k, jag=0.2, p=2.8)
    gjl = pt.g(TC["jungle"], outline=0.3)
    for L, (zt, half) in enumerate(((TC_SEA_Z + 36, 230), (TC_SEA_Z + 64, 190))):
        for k in range(9 - L * 2):
            x = 520 - half + rnd.uniform(0, 2 * half)
            kit.round_bush(gjl, x, 312 + L * 8, rnd.uniform(7, 12), seed=600 + L * 20 + k, z=zt - 4, flat=0.7)
    gjt = pt.g(TC["jungle_dk"], outline=0.4)
    for k in range(18):
        x = rnd.uniform(300, 740)
        kit.round_bush(gjt, x, rnd.uniform(352, 376), rnd.uniform(9, 14), seed=200 + k, z=_fort_z(x) - 6)
    # 4. the fort: bastion walls with embrasures, corner sentry turrets, a broken watchtower, vines
    gf, gf2 = pt.g(TC["fort"], outline=0.5), pt.g(TC["fort_dk"], outline=0.5)
    gd = pt.g(TC["dark"], outline=0.0, highlight=False)
    fz = TC_SEA_Z + 84
    box(gf, (520, 332, fz + 24), (130, 14, 30), p=5, cuts=2, taper=(1.08, 1.0))
    box(gf2, (520, 316.8, fz + 50), (126, 1.6, 3), p=4, cuts=1)
    box(gf2, (520, 316.6, fz + 2), (128, 1.6, 4), p=4, cuts=1)
    pts = [(506, fz - 4), (534, fz - 4), (534, fz + 14)] + [(520 + 14 * math.cos(math.pi * k / 8), fz + 14 + 12 * math.sin(math.pi * k / 8)) for k in range(1, 8)] + [(506, fz + 14)]
    gd.slab(pts, 317.6, 1.0)
    for k in range(8):
        box(gd, (424 + k * 28, 317.4, fz + 30), (5.4, 0.6, 6.4), p=4, cuts=1)
    for x in (386, 654):
        box(gf2, (x, 322, fz + 26), (24, 26, 34), p=5, cuts=2, rot=(0, 0, 45), taper=(1.1, 1.0))
        cyl(gf, (x, 300, fz + 58), (x, 300, fz + 76), 7.6, bevel=0.6, segs=14)
        gf.lathe([(0.01, 0), (9.4, 0), (0.01, 10)], (x, 300, fz + 76), (x, 300, fz + 86), segs=14)
        box(gd, (x, 292, fz + 66), (2.0, 0.6, 4.2), p=4, cuts=1)
    # the watchtower, its top broken
    box(gf, (548, 352, fz + 66), (22, 18, 46), p=5, cuts=2)
    for dx, h in ((-16, 11), (-4, 5), (9, 14), (17, 7)):
        box(gf2, (548 + dx, 352, fz + 112 + h / 2), (5, 18, h / 2), p=5, cuts=1)
    box(gd, (548, 333.4, fz + 74), (5, 0.6, 9), p=4, cuts=1)
    gv = pt.g(TC["vine"], outline=0.3)
    for (x, z, rx, rz) in ((460, fz + 30, 16, 14), (520, fz + 44, 12, 9), (610, fz + 20, 18, 12), (548, fz + 96, 10, 16), (390, fz + 44, 9, 16),
                           (660, fz + 50, 8, 12)):
        gv.blob((x, 316, z), (rx, 4, rz), p=2.2)
    gc = pt.g(TC["iron"], outline=0.3)
    for x in (452, 536, 592):
        gc.capsule((x, 316, fz + 30), (x, 304, fz + 31), 2.4)
    # palms round the fort
    gpf, gpf2, gpt = pt.g(TC["frond"], outline=0.3), pt.g(TC["frond_dk"], outline=0.3), pt.g(TC["trunk"], outline=0.3)
    for i, x in enumerate((322, 352, 704, 730, 762)):
        kit.palm(gpf, gpf2, gpt, x, 352, rnd.uniform(56, 70), lean=rnd.uniform(-0.3, 0.3), seed=300 + i, z=_fort_z(x) - 4, r=0.6)
    # rocks in the sea
    for i, (x, s_) in enumerate(((240, 1.0), (790, 0.7), (980, 1.1))):
        rock(gr2, (x, 300, TC_SEA_Z), (18 * s_, 12, 12 * s_), seed=60 + i, jag=0.25)
    st.light((548, 333, fz + 60), 5)
    pt.flush(st)


def tc_mid(st, P):
    pt = Parts()
    rnd = random.Random(43)
    # the lagoon behind the sand bank
    box(pt.g(TC["lagoon"], finish="gloss", outline=0.0), (600, 200, 36), (920, 110, 3), p=6, cuts=2)
    # the sand bank
    g = pt.g(TC["sand"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g, (x, 80, 6), (96, 50, 40 + rnd.uniform(0, 8)), seed=i, jag=0.04, p=2.6)
    gsd = pt.g(TC["sand_dk"], outline=0.0)
    for i in range(30):
        x = rnd.uniform(-250, 1450)
        gsd.blob((x, rnd.uniform(40, 70), 43), (rnd.uniform(6, 14), 4, 1.4), p=2.0)
    # ferns and tropical bushes
    gfe, gfe2 = pt.g(TC["jungle"], outline=0.4), pt.g(TC["jungle_lt"], outline=0.4)
    for i in range(26):
        x = rnd.uniform(-250, 1450)
        if 820 < x < 1060:
            continue
        kit.round_bush(gfe if i % 2 else gfe2, x, rnd.uniform(66, 96), rnd.uniform(9, 15), seed=1000 + i, z=40, flat=0.7)
    # palms (two crowns sway as props; their trunks are here)
    gpf, gpf2, gpt = pt.g(TC["frond"], outline=0.5), pt.g(TC["frond_dk"], outline=0.5), pt.g(TC["trunk"], outline=0.5)
    for i, (x, h, lean) in enumerate(((-220, 160, 0.3), (-150, 130, -0.25), (60, 120, 0.3), (1000, 150, -0.28), (1100, 132, 0.24),
                                       (1330, 166, -0.2), (1420, 128, 0.3))):
        kit.palm(gpf, gpf2, gpt, x, 84, h, lean=lean, seed=400 + i, z=40)
    for (x, y, h, lean, seed) in TC_PALMS:
        pts = [(x + lean * h * t * t, y, 40 + h * t) for t in (0, 0.2, 0.4, 0.6, 0.8, 1.0)]
        for (ax, ay, az), (bx, by, bz) in zip(pts, pts[1:]):
            gpt.capsule((ax, ay, az), (bx, by, bz), 2.6 - (az - 40) / h * 0.7, 2.6 - (bz - 40) / h * 0.7)
    # the beached rowboat, barrels and crates, the open treasure chest
    gwd, gwl = pt.g(TC["wood"], outline=0.5), pt.g(TC["wood_lt"], outline=0.5)
    gwd.blob((270, 60, 50), (36, 13, 9.6), p=2.8, taper=(0.7, 1.0), rot=(0, -6, 8))
    pt.g(TC["dark"], outline=0.0).blob((270, 60, 57), (32, 10.4, 3.2), p=3.0, rot=(0, -6, 8))
    gwl.capsule((244, 55, 61), (306, 63, 56), 1.4)
    for x, z in ((384, 44), (406, 44), (395, 66)):
        cyl(gwl, (x, 64, z), (x, 64, z + 21), 9.0, bevel=1.6, segs=14)
        cyl(pt.g(TC["iron"], outline=0.0), (x, 64, z + 4), (x, 64, z + 6), 9.2, bevel=0.4, segs=14)
        cyl(pt.g(TC["iron"], outline=0.0), (x, 64, z + 15), (x, 64, z + 17), 9.2, bevel=0.4, segs=14)
    box(gwd, (436, 70, 55), (12, 11, 11), p=5, cuts=1)
    box(gwd, (446, 72, 72), (8, 8, 7), p=5, cuts=1)
    box(gwd, (494, 60, 53), (18, 11, 9.6), p=4.4, cuts=2)
    gwd.blob((494, 70, 69), (18, 3.2, 12), p=3.0, rot=(-62, 0, 0))
    gg = pt.g(TC["gold"], finish="bronze", outline=0.3)
    gg.blob((494, 60, 62), (15, 9, 3.6), p=2.0)
    for k in range(6):
        gg.lathe([(0.01, 0), (2.8, 0), (2.8, 0.8), (0.01, 0.8)], (470 + k * 8, 50 - k % 2 * 4, 44), (470 + k * 8, 50 - k % 2 * 4, 44.8), segs=10,
                 squash=(1.0, 0.6))
    # the campfire
    gst = pt.g(TC["rock_dk"], outline=0.4)
    for k in range(7):
        a = 2 * math.pi * k / 7
        rock(gst, (560 + math.cos(a) * 9, 60 + math.sin(a) * 4, 45), (3.2, 2.6, 2.4), seed=70 + k, jag=0.15)
    pt.g(TC["dark"], outline=0.3).capsule((553, 60, 47), (567, 60, 49), 1.6)
    st.light((560, 60, 54), 8)
    st.amb("emit", "fx.p.smoke", (560, 60, 70), rate=0.6, speed=10, scale=0.9, tint=0xEEE8DC, alpha=0.34, life=2600)
    # the rope bridge between two rock stacks over a creek (x 860-1020)
    gro, gro2 = pt.g(TC["rock"], outline=0.5), pt.g(TC["rock_dk"], outline=0.5)
    for x, h in ((860, 96), (1020, 86)):
        rock(gro, (x, 98, 40 + h / 2), (26, 22, h / 2 + 6), seed=int(x), jag=0.16, p=2.6)
        rock(gro2, (x + 14, 92, 40 + h * 0.3), (16, 16, h * 0.3), seed=int(x) + 1, jag=0.2)
        kit.round_bush(pt.g(TC["jungle_dk"], outline=0.4), x, 100, 16, seed=int(x) + 2, z=40 + h - 4)
    gr = pt.g(TC["rope"], outline=0.3)
    bz0, bz1 = 40 + 96 - 8, 40 + 86 - 8
    pts = [(860 + 160 * t, 96, bz0 + (bz1 - bz0) * t - 22 * math.sin(math.pi * t)) for t in [k / 10 for k in range(11)]]
    for (ax, ay, az), (bx, by, bz) in zip(pts, pts[1:]):
        gr.capsule((ax, ay, az + 12), (bx, by, bz + 12), 0.7)
        gr.capsule((ax, ay - 4, az + 12), (bx, by - 4, bz + 12), 0.7)
    for (ax, ay, az) in pts[1:-1]:
        box(gwl, (ax, ay - 2, az), (3.2, 5, 1.0), p=4, cuts=1)
        gr.capsule((ax, ay - 4, az), (ax, ay - 4, az + 12), 0.4)
    box(pt.g(TC["gold"], outline=0.3), (868, 92, bz0 + 22), (2.6, 2.6, 3.4), p=4, cuts=1)
    st.light((868, 90, bz0 + 22), 6)
    pt.flush(st)


def _crown(lean, seed):
    """A palm crown alone (its trunk is in the strip): fronds about the trunk top, frames sway it."""
    def build(rig):
        rig.joint("c", "all", (0, 0, 0))
        from world.scenes.fauna import Into
        r = Into(rig, "c")
        rnd = random.Random(seed)
        gf, gf2, gt = Geo(), Geo(), Geo()
        top = (0.0, 0.0, 0.0)
        for k in range(8):
            a = 2 * math.pi * k / 8 + rnd.uniform(-0.2, 0.2)
            L = rnd.uniform(62, 76)
            kit.frond(gf if k % 2 else gf2, top, a, L, L * 0.13)
        for k in range(3):
            a = k * 2.1
            gt.sphere((math.cos(a) * 3.2, -1 + math.sin(a) * 2, -3.6), 2.4, cuts=2)
        r.part("all", gf, "#5A8A50", outline=0.5)
        r.part("all", gf2, "#48744A", outline=0.5)
        r.part("all", gt, "#7A6448", outline=0.4)
    return build


def _foam(rig):
    """A line of foam along the shore: frames 0-3 draw it at four places of its lap."""
    for f in range(4):
        j = rig.joint(f"w{f}", "all", (0, 0, 0), hidden=True)
        g = Geo()
        rnd = random.Random(f + 5)
        off = [0, -3, -5, -2][f]
        for k in range(9):
            x = -130 + k * 32 + rnd.uniform(-6, 6)
            L = rnd.uniform(10, 16)
            g.capsule((x - L, off, 0.5), (x + L, off, 0.5), 1.4, 1.4)
        rig.part(j, g, "#EEF4EC", outline=0)


def tc_props():
    parrot = fauna.bird(body="#5E9A5A", wing="#4A7C50", belly="#C8B060", beak="#E0C070", span=11, size=1.0)
    sx, sy = TC_SLOOP
    sloop_at = _scr((sx, sy, TC_SEA_Z - 2), TC_FAR_E)
    fx = 520.0
    ring = [[i * 2, round(fx + 110 * math.cos(math.pi * i / 4)), round(-230 + 18 * math.sin(math.pi * i / 4)), 1] for i in range(9)]
    plist = [Prop("sloop", "far", fauna.sloop(size=1.3), [{}], (100, 70, 8), sloop_at[1]),
             Prop("parrot", "far", parrot, [fauna.bird_pose(f) for f in range(5)], (36, 22, 22), ring[0][2])]
    sprites = [
        {"kind": "bob", "layer": "far", "frames": ["sloop_0"], "fps": 1, "at": sloop_at, "amp": [0.6, 1.0], "periodS": 5.2, "tilt": 2.0},
        {"kind": "path", "layer": "far", "fps": 7, "periodS": 16, "keys": ring,
         "group": [{"frames": ["parrot_0", "parrot_1", "parrot_2", "parrot_3"]}, {"frames": ["parrot_4", "parrot_0", "parrot_1", "parrot_2"], "dx": -24, "dy": 10, "phase": 1}]},
    ]
    plist.append(Prop("crown", "mid", _crown(0.0, 7), [{"c": {"r": a}} for a in (-3.5, 0, 3.5)], (170, 30, 62),
                      _scr((0, TC_PALMS[0][1], 40 + TC_PALMS[0][2]), TC_MID_E)[1]))
    for k, (x, y, h, lean, seed) in enumerate(TC_PALMS):
        top = _scr((x + lean * h, y, 40 + h), TC_MID_E)
        sprites.append({"kind": "loop", "layer": "mid", "frames": [f"crown_{i}" for i in range(3)], "fps": 1.2 + 0.3 * k, "pingpong": True, "at": top})
    plist.append(Prop("foam", "mid", _foam, [{f"w{f}": {"show": True}} for f in range(4)], (300, 8, 8), _scr((0, TC_WAVES[0][1], 39.0), TC_MID_E)[1],
                      outline=False))
    for (x, y) in TC_WAVES:
        sprites.append({"kind": "loop", "layer": "mid", "frames": [f"foam_{i}" for i in range(4)], "fps": 2, "pingpong": True,
                        "at": _scr((x, y, 39.0), TC_MID_E)})
    return plist, sprites


SCENES = {
    "classic": Scene("gunpowder", "classic", PAL, far, mid, sky=SKY, version=1),
    "treasure_cove": Scene("gunpowder", "treasure_cove", TC_PAL, tc_far, tc_mid, back=tc_back, sky=TC_SKY, props=tc_props,
                           hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.55}, ground="earth"),
}
