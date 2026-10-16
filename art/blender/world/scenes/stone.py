"""Stone Age scenes. Classic (format 1, until its round 3 re-render): an alpine valley under a smoking
volcano, pines and hide tents (the strips the game ships today, moved here unchanged from backdrop.py).

"Glacier Valley" (format 2, round 2; Rare, Time Capsule): a glacier between twin peaks in deep winter,
under a cold pale sky with thin cirrus. Back: the twin peaks and a far range. Far: the glacier tongue
with blue-grey crevasses ending in ice cliffs, moraines, a frozen waterfall on a cliff, snowy spruce
slopes; a mammoth herd walks the valley floor. Mid: a snow bank with snow-laden spruces, ice boulders,
a bone-and-hide hunters' camp (tents, a drying rack, a mammoth-tusk arch, a fire) and an ice-cave
mouth. Ambient: 3 mammoths walking (`path`, 90 s), an eagle circling, ice glints, camp smoke and the
fire; the camp's fire and tents glow under night skies.

Palette (PLAN 2b): ice #BCD3DC (desaturated), snow #EEF1F1, cold rock #8A8C96, hide #A88A6A. Ice blues
sit in the team-blue band (182-254 degrees), so they stay under 40% saturation (A11 colour rule); the
fire is a small accent.
"""
import math
import random

from ageborn_art.geometry import Geo

from world.scenes import fauna, kit
from world.scenes.common import Prop, Scene, box, dk, ground_band, lt, mixc, pine, ridge, rock
from world.scenes.kit import Parts

PAL = dict(skyTop=0x8db3cf, skyBottom=0xf0e2c4, far=0x9c98a6, mid=0x7f8762, near=0x5f7247, light=0xfff0cc)

# the sky the game paints for this classic (sky.ts paintSky), for its thumbnail
SKY = {"top": "#8DB3CF", "bottom": "#F0E2C4", "horizon": "#F7E8C8", "celestial": "sun", "sunAt": [980, -520, 46]}


def far(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.35)
    ridge(st, back, -300, 1500, -10, 230, 420, 3, lumps=10)
    # volcano with a crater and a lava glow
    g = Geo().lathe([(0, 0), (240, 0), (170, 60), (64, 260), (46, 286), (30, 280), (0, 274)], (900, 200, -20),
                    (900, 200, 266), segs=32)
    st.part(g, mixc(P["far"], 0x7A6A62, 0.35), outline=0.0)
    g = Geo()
    for a in range(0, 360, 40):
        r = math.radians(a)
        g.capsule((900 + 56 * math.cos(r), 150, 200), (900 + 40 * math.cos(r) * 0.8, 150, 250), 6, 3)
    st.part(g, dk(P["far"], 0.12), outline=0.0)
    st.amb("emit", "fx.p.smoke", (900, 200, 270), "far", rate=1.2, speed=16, scale=3.2, tint=lt(P["far"], 0.35), alpha=0.55)
    ridge(st, dk(P["far"], 0.08), -300, 1500, -10, 130, 140, 7, lumps=13)


def mid(st, P):
    ground_band(st, P["mid"])
    rnd = random.Random(3)
    ga, gb = Geo(), Geo()
    for i in range(26):
        x = -240 + i * 67 + rnd.uniform(-20, 20)
        pine(ga if i % 3 else gb, x, 60 + rnd.uniform(-20, 40), rnd.uniform(90, 150), rnd.uniform(24, 32))
    g = Geo()
    for i in range(26):
        x = -240 + i * 67
        g.capsule((x, 60, 0), (x, 60, 30), 3)
    st.part(g, 0x5E4836, outline=0.4)
    st.part(ga, P["near"], outline=0.5)
    st.part(gb, dk(P["near"], 0.1), outline=0.5)
    for tx in (260, 980):
        g = Geo().lathe([(0, 0), (30, 0), (1, 70), (0, 72)], (tx, 20, 0), (tx, 20, 72), segs=9)
        st.part(g, mixc(P["near"], P["light"], 0.3), outline=0.5)
        g = Geo().blob((tx, -9, 12), (6, 2, 12), p=2.0, taper=(1.0, 0.4))
        st.part(g, 0x3A302A, outline=0.0, highlight=False)
        st.amb("emit", "fx.p.smoke", (tx, 20, 76), "mid", rate=0.8, speed=14, scale=1.3, tint=lt(P["mid"], 0.4), alpha=0.45)
    g = Geo()
    for i in range(10):
        rock(g, (-200 + i * 180, 0, 6), (22, 14, 14), seed=40 + i, jag=0.2)
    st.part(g, dk(P["mid"], 0.1), outline=0.5)


# -- Glacier Valley (round 2) ---------------------------------------------------------------------
GV_PAL = dict(skyTop=0x9AB6CA, skyBottom=0xE4EAEC, light=0xF6F8F8, far=0x8E96A2, mid=0x7A8288, near=0x5E6670)
GV = dict(
    snow=0xEEF1F1, snow_bank=0xDFE6E9, ice=0xBCD5E0, ice_deep=0x88A8B8, crevasse=0x6A8698, serac=0x9EC0CF, serac_dk=0x86A9BA,
    rock=0x7E808C, rock_dk=0x64666F, rock_far=0x8A8E9A, spruce=0x36584A, spruce_dk=0x2C4A3E, trunk=0x5A4A40,
    hide=0xA88A6A, hide_dk=0x8E7058, hide_lt=0xBCA284, wood=0x6E5A48, bone=0xE6DCC6, ember=0x5A4038, stone=0x7E7A76, cave=0x3E4C5A,
)
GV_SKY = {"top": "#80A4C2", "bottom": "#E4EAEC", "horizon": "#EEF2F2", "cloudTint": "#F2F5F7", "celestial": "sun",
          "sunAt": [140, -520, 30], "clouds": 0.7}
GV_FAR_E = math.radians(8.0)
GV_MID_E = math.radians(12.0)
GV_FIRE = (404.0, 50.0, 40.0)
GV_HERD_Y = -126.0
GV_EAGLE = (420.0, -250.0)
# the glacier's surface: a slab sloping from its snout (y 252, top z 74) up to the basin between the peaks
GV_SLOPE = math.radians(24.0)


def _scr(p, e):
    x, y, z = p
    return [round(x, 1), -round(z * math.cos(e) + y * math.sin(e), 1)]


def _on_slab(c, r, rot_x, lx, ly, lift=0.6):
    """A point on the top of a slab blob (centre c, radii r, turned rot_x about x): local (lx, ly) on its top."""
    rx, ry, rz = r
    q = max(0.0, 1.0 - (lx / rx) ** 2 - (ly / ry) ** 2)
    lz = rz * q ** 0.42 + lift
    a = rot_x
    return (c[0] + lx, c[1] + ly * math.cos(a) - lz * math.sin(a), c[2] + ly * math.sin(a) + lz * math.cos(a))


def gv_back(st, P):
    """The twin peaks with the glacier's snowfield between them (left of where the sky themes hang their
    moons, x 820-980) and a low far range."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    gr, gs = pt.g(hz(GV["rock_far"], 0.22), outline=0.0), pt.g(hz(GV["snow"], 0.08), outline=0.0)
    rnd = random.Random(7)
    for i, x in enumerate((-250, -110, 760, 880, 1010, 1150, 1290, 1430)):
        h = rnd.uniform(150, 210) if not (720 <= x <= 1000) else rnd.uniform(70, 96)
        kit.peak(gr, gs, x, 1500 + rnd.uniform(-40, 40), -60, rnd.uniform(110, 150), h, seed=70 + i, snow=0.52, jag=0.12)
    # the twin peaks: two horns of nearly the same height, rock below a high snowline, a snow saddle between
    kit.peak(gr, gs, 240, 1320, -60, 175, 380, seed=3, snow=0.44, jag=0.16, segs=14)
    kit.peak(gr, gs, 580, 1340, -60, 170, 370, seed=8, snow=0.46, jag=0.16, segs=14)
    rock(gs, (410, 1360, 130), (150, 60, 70), seed=9, jag=0.08, p=2.2)
    pt.flush(st)


def gv_far(st, P):
    pt = Parts()
    rnd = random.Random(23)
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    gr, gs = pt.g(hz(GV["rock_far"], 0.14), outline=0.0), pt.g(GV["snow"], outline=0.0)
    # 1. the valley walls behind: snowy peaks with dark rock below (kept low under the moons' place)
    for i, x in enumerate(range(-300, 1560, 150)):
        if 300 <= x <= 520:
            continue
        h = rnd.uniform(190, 270) if not (760 <= x <= 980) else rnd.uniform(110, 140)
        kit.peak(gr, gs, x + rnd.uniform(-40, 40), 720 + rnd.uniform(-30, 30), -20, rnd.uniform(120, 170), h, seed=100 + i,
                 snow=rnd.uniform(0.48, 0.66), jag=0.2, squash=rnd.uniform(0.45, 0.65))
    # 2. the glacier: a tongue of ice lofted from the saddle between the twin peaks down to its snout,
    #    bulging across, with crevasses arcing across it and dark moraines along its edges
    rows = [(404, 316, 128, 150, 10), (412, 390, 150, 124, 12), (400, 460, 172, 104, 11), (414, 530, 192, 84, 9),
            (406, 600, 208, 68, 7), (418, 670, 220, 48, 5), (420, 720, 228, 26, 2)]
    kit.loft(pt.g(GV["ice"], finish="gloss", outline=0.5), rows, nu=16, thick=14)
    gc = pt.g(GV["crevasse"], outline=0.0, highlight=False)
    for j, t in enumerate((0.45, 1.15, 1.95, 2.9, 3.85)):
        n = 2 if j % 2 else 3
        for k in range(n):
            u0 = -0.78 + (k + 0.12) * 1.56 / n + rnd.uniform(-0.1, 0.1)
            u1 = u0 + 1.56 / n * rnd.uniform(0.35, 0.75)
            t = t + rnd.uniform(-0.12, 0.12)
            pts = []
            for q in range(4):
                u = u0 + (u1 - u0) * q / 3
                p_ = kit.loft_point(rows, t + 0.16 * (1 - u * u), u)
                pts.append((p_[0], p_[1] - 1.0, p_[2] + 1.2))
            for p0, p1 in zip(pts, pts[1:]):
                gc.capsule(p0, p1, 2.2 - 0.15 * j, 1.6 - 0.12 * j)
    # lateral moraines: dark rubble bands along both edges
    gm = pt.g(GV["rock_dk"], outline=0.3)
    for u in (-0.94, 0.94):
        pts = [kit.loft_point(rows, t * 0.25, u) for t in range(0, 24)]
        for k, (p0, p1) in enumerate(zip(pts, pts[1:])):
            gm.capsule((p0[0], p0[1], p0[2] + 1.5), (p1[0], p1[1], p1[2] + 1.5), 3.4 - k * 0.08, 3.3 - k * 0.08)
    # the snout: a low, broken ice cliff under the ice's front edge (blocks of uneven width, height and
    # lean, review 2: an even row read as a fringe), a dark meltwater cave in its middle, fallen blocks
    gse, gse2, gst = pt.g(GV["serac"], outline=0.5), pt.g(GV["serac_dk"], outline=0.5), pt.g(GV["snow"], outline=0.4)
    gd = pt.g(GV["ice_deep"], outline=0.0, highlight=False)
    x = 258.0
    k = 0
    while x < 548:
        w = rnd.uniform(16, 34)
        cx = x + w / 2
        if abs(cx - 404) < 22:
            x += 44
            continue
        top = 128 + 8 * (1 - ((cx - 404) / 150) ** 2) - rnd.uniform(0, 10)
        hh = top - 90
        box(gse if k % 3 else gse2, (cx, 312, 90 + hh / 2), (w * 0.5, 11, hh / 2 + 2), p=2.6, cuts=2,
            rot=(0, rnd.uniform(-7, 7), rnd.uniform(-18, 18)))
        x += w * rnd.uniform(0.82, 0.96)
        k += 1
    rock(gd, (404, 306, 104), (20, 4, 15), seed=31, jag=0.05, p=2.0)
    rock(gse2, (404, 309, 126), (26, 10, 8), seed=32, jag=0.1, p=2.4)
    for k in range(6):
        bx = 262 + k * 52 + rnd.uniform(-10, 10)
        rock(gse if k % 2 else gse2, (bx, 296, 92), (rnd.uniform(7, 12), 7, rnd.uniform(6, 10)), seed=380 + k, jag=0.22, p=2.2)
    for t, u, z in ((0.9, -0.4, 0), (2.2, 0.3, 0), (3.6, -0.1, 0), (1.5, 0.6, 0)):
        p_ = kit.loft_point(rows, t, u)
        st.amb("blink", "fx.p.star", (p_[0], p_[1], p_[2] + 4), period=2900, tint=0xF6FAFF, scale=0.6)
    # 3. the valley's rock shoulders, in front of the ice's edges (the glacier runs between them)
    gr2, gs2 = pt.g(GV["rock"], outline=0.4), pt.g(GV["snow"], outline=0.4)
    kit.peak(gr2, gs2, 214, 330, 60, 130, 230, seed=11, snow=0.62, jag=0.2, squash=0.5)
    kit.peak(gr2, gs2, 612, 336, 60, 128, 212, seed=12, snow=0.6, jag=0.2, squash=0.5)
    # the valley's inner spurs: dark rock walls over both edges of the ice, stepping up toward the saddle,
    # so the glacier shows as a band of ice between rock walls, not as a free-standing dome (review 2)
    grd = pt.g(GV["rock_dk"], outline=0.4)
    for (x, y, z, rx, h, seed) in ((292, 452, 90, 74, 150, 15), (336, 566, 130, 58, 150, 16), (370, 664, 160, 40, 124, 17),
                                   (520, 452, 90, 74, 146, 18), (480, 566, 130, 58, 146, 19), (448, 664, 160, 40, 120, 20)):
        kit.peak(grd, gs2, x, y, z, rx, h, seed=seed, snow=0.72, jag=0.22, squash=0.5)
    kit.peak(gr2, gs2, 1200, 420, 40, 210, 250, seed=13, snow=0.58, jag=0.2, squash=0.55)
    kit.peak(gr2, gs2, -200, 410, 40, 170, 230, seed=14, snow=0.6, jag=0.2, squash=0.55)
    # 4. the snowy plateau the herd walks (its top at about z 92), spruces along its back
    gh = pt.g(GV["snow_bank"], outline=0.0)
    for i in range(12):
        x = -300 + i * 160 + rnd.uniform(-20, 20)
        kit.hill(gh, x, 240, -10, rnd.uniform(130, 170), 80, rnd.uniform(96, 104), seed=60 + i, jag=0.03, p=2.8)
    # the terminal moraine in front of the snout: rubble and snow
    gmo = pt.g(GV["rock"], outline=0.4)
    for k in range(9):
        x = 270 + k * 34 + rnd.uniform(-8, 8)
        rock(gmo, (x, 290, 84), (rnd.uniform(14, 20), 14, rnd.uniform(9, 13)), seed=360 + k, jag=0.2)
    gsp, gsn, gtr = pt.g(GV["spruce"], outline=0.3), pt.g(GV["snow"], outline=0.0), pt.g(GV["trunk"], outline=0.0)
    for i in range(64):
        x = rnd.uniform(-260, 1460)
        if 250 < x < 580:
            continue
        kit.spruce(gsp, gsn, gtr, x, rnd.uniform(276, 300), rnd.uniform(26, 44), rnd.uniform(7.5, 11), seed=500 + i, z=rnd.uniform(86, 96),
                   tiers=3)
    # 5. the frozen waterfall (x 830): a dark cliff with a bulging cascade of ice and icicle fringes
    gcl = pt.g(GV["rock_dk"], outline=0.5)
    rock(gcl, (830, 330, 160), (62, 34, 120), seed=41, jag=0.12, p=3.0)
    rock(gcl, (780, 320, 120), (34, 28, 70), seed=42, jag=0.16)
    rock(gcl, (884, 326, 124), (38, 28, 76), seed=43, jag=0.16)
    kit.snow_cap(gs, (830, 330, 160), (62, 34, 120), seed=41, jag=0.12, p=3.0, cut=262)
    kit.snow_cap(gs, (780, 320, 120), (34, 28, 70), seed=42, jag=0.16, cut=170)
    kit.snow_cap(gs, (884, 326, 124), (38, 28, 76), seed=43, jag=0.16, cut=180)
    gfw, gfw2 = pt.g(0xDCE8EE, finish="gloss", outline=0.5), pt.g(0xC4D8E2, finish="gloss", outline=0.4)
    for k in range(5):
        x = 814 + k * 8
        L = 178 - abs(k - 2) * 20
        prof = [(0.01, 0)] + [(5.2 + 1.8 * math.sin(t * 7 + k), t * L) for t in (0.04, 0.2, 0.36, 0.52, 0.68, 0.84)] + [(1.6, L), (0.01, L + 2)]
        (gfw if k % 2 == 0 else gfw2).lathe(prof, (x, 292, 282), (x, 292, 282 - L - 2), segs=9)
    kit.icicles(gfw2, 790, 812, 294, 276, 56, seed=7)
    kit.icicles(gfw2, 850, 872, 294, 272, 50, seed=8)
    gfw.lathe([(0.01, 0), (44, 0), (44, 3.4), (0.01, 4.4)], (830, 282, 94), (830, 282, 98.4), segs=24, squash=(1.0, 0.36))
    st.amb("blink", "fx.p.star", (830, 290, 200), period=2900, tint=0xF6FAFF, scale=0.6)
    pt.flush(st)


def gv_mid(st, P):
    pt = Parts()
    rnd = random.Random(31)
    # the snow bank
    g = pt.g(GV["snow_bank"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g, (x, 80, 8), (96, 60, 40 + rnd.uniform(0, 12)), seed=i, jag=0.05, p=2.4)
    # rocks showing through the snow
    gr = pt.g(GV["rock_dk"], outline=0.5)
    for i in range(14):
        x = rnd.uniform(-240, 1440)
        rock(gr, (x, rnd.uniform(34, 52), 36), (rnd.uniform(7, 13), 7, rnd.uniform(5, 9)), seed=900 + i, jag=0.2)
    # ice boulders
    gi = pt.g(GV["ice"], finish="gloss", outline=0.5)
    for i, (x, s) in enumerate(((150, 1.0), (590, 0.9), (1000, 1.0), (1240, 1.2))):
        rock(gi, (x, 46, 40), (15 * s, 11 * s, 13 * s), seed=950 + i, jag=0.12, p=2.0)
        st.amb("blink", "fx.p.star", (x - 4, 40, 40 + 20 * s), period=3400, tint=0xF6FAFF, scale=0.5)
    # snow-laden spruces in clusters, a clearing for the camp
    gsp, gsp2, gsn, gtr = pt.g(GV["spruce"], outline=0.5), pt.g(GV["spruce_dk"], outline=0.5), pt.g(GV["snow"], outline=0.4), \
        pt.g(GV["trunk"], outline=0.4)
    for i, (x, h) in enumerate(((-220, 150), (-180, 120), (-128, 168), (-84, 116), (50, 150), (92, 118), (640, 136), (678, 168),
                                (720, 124), (930, 156), (970, 122), (1080, 142), (1122, 170), (1168, 118), (1340, 160), (1384, 126),
                                (1430, 146))):
        kit.spruce(gsp if i % 2 else gsp2, gsn, gtr, x, 62 + (i % 3) * 8, h, h * 0.22, seed=700 + i, z=26, tiers=4)
    # the hunters' camp (x 230-520): a mammoth-tusk arch, a drying rack, three hide tents, the fire
    for (x, y, r, h, s, c) in ((268, 70, 30, 74, 1, GV["hide"]), (470, 78, 26, 64, 2, GV["hide_dk"]), (520, 62, 20, 50, 3, GV["hide_lt"])):
        door = kit.hide_tent(pt, x, y, 34, r, h, hide=c, seed=s, yaw=s * 17)
        st.light(door, 5)
    kit.drying_rack(pt, 350, 76, 34, 50, 54)
    gb = pt.g(GV["bone"], outline=0.5)
    for side in (-1, 1):
        pts = [(196 + side * 30, 34), (196 + side * 34, 66), (196 + side * 25, 96), (196 + side * 7, 110)]
        for (ax, az), (bx, bz) in zip(pts, pts[1:]):
            gb.capsule((ax, 48, az), (bx, 48, bz), 6.2 - (az - 34) * 0.045, 5.4 - (bz - 34) * 0.045)
    rock(pt.g(GV["bone"], outline=0.5), (196, 50, 40), (9, 7, 8), seed=66, jag=0.1)
    fx_, fy, fz = GV_FIRE
    gst = pt.g(GV["stone"], outline=0.4)
    for k in range(9):
        a = 2 * math.pi * k / 9
        rock(gst, (fx_ + math.cos(a) * 11, fy + math.sin(a) * 5, fz + 1), (3.8, 3.0, 2.8), seed=80 + k, jag=0.15)
    gl = pt.g(GV["ember"], outline=0.3)
    gl.capsule((fx_ - 8, fy - 1, fz + 2), (fx_ + 8, fy + 1, fz + 4), 1.8)
    gl.capsule((fx_ - 7, fy + 2, fz + 4), (fx_ + 7, fy - 2, fz + 2), 1.8)
    gw = pt.g(GV["wood"], outline=0.4)
    for k in range(4):
        gw.capsule((fx_ + 22 + k * 1.5, fy - 4, fz + 1 + k * 2.6), (fx_ + 38 - k * 1.5, fy - 4, fz + 1 + k * 2.6), 1.5)
    st.light((fx_, fy, fz + 8), 10)
    st.amb("emit", "fx.p.smoke", (fx_, fy, fz + 30), rate=0.7, speed=10, scale=1.0, tint=0xE8EAEC, alpha=0.38, life=2800)
    st.amb("emit", "fx.p.smoke", (268, 70, 34 + 80), rate=0.35, speed=8, scale=0.8, tint=0xE8EAEC, alpha=0.3, life=2600)
    # the ice-cave mouth (x 820): a lumpy ice mound under a snow cap, a dark mouth fringed with icicles
    gm = pt.g(GV["ice"], finish="gloss", outline=0.5)
    rock(gm, (826, 96, 44), (80, 44, 62), seed=61, jag=0.1, p=2.2)
    rock(gm, (770, 86, 40), (38, 32, 38), seed=62, jag=0.12, p=2.2)
    rock(pt.g(GV["serac"], outline=0.5), (880, 84, 38), (30, 28, 30), seed=63, jag=0.14, p=2.2)
    kit.snow_cap(pt.g(GV["snow"], outline=0.4), (826, 96, 44), (80, 44, 62), seed=61, jag=0.1, p=2.2, cut=84)
    kit.snow_cap(pt.g(GV["snow"], outline=0.4), (770, 86, 40), (38, 32, 38), seed=62, jag=0.12, p=2.2, cut=62)
    gcv = pt.g(GV["cave"], outline=0.0, highlight=False)
    gcv.slab([(790, 38), (862, 38), (862, 52)] + [(826 + 36 * math.cos(math.pi * k / 12), 52 + 30 * math.sin(math.pi * k / 12)) for k in range(1, 12)]
             + [(790, 52)], 50, 1.2)
    kit.icicles(pt.g(0xDCE8EE, finish="gloss", outline=0.3), 794, 858, 48, 84, 16, seed=5)
    st.light((826, 46, 58), 7)
    pt.flush(st)


def _flame(rig):
    """The camp fire: four licking shapes, one hidden joint per frame (glow, no outline)."""
    for f, (h, lean) in enumerate([(1.0, 0.0), (1.16, 1.4), (0.9, -1.2), (1.08, 0.6)]):
        j = rig.joint(f"f{f}", "all", (0, 0, 0), hidden=True)
        rig.part(j, Geo().blob((0, 0, 9.4 * h), (7.4, 4.3, 10.2 * h), p=2.0, taper=(1.0, 0.18), shift=(lean * 0.12, 0)), glow="#FFC77E", outline=0)
        rig.part(j, Geo().blob((0, -1.9, 7.6 * h), (4.3, 2.7, 7.0 * h), p=2.0, taper=(1.0, 0.22), shift=(lean * 0.1, 0)), glow="#FFE7B4", outline=0)
        rig.part(j, Geo().blob((0.5 * lean, -3.2, 4.8), (2.2, 1.6, 4.0), p=2.0, taper=(1.0, 0.3)), glow="#FFF7E2", outline=0)


def gv_props():
    fire = _scr((GV_FIRE[0], GV_FIRE[1], GV_FIRE[2] + 3), GV_MID_E)
    eagle = fauna.bird(body="#5E4E44", wing="#4E4038", belly="#7A6658", beak="#D8B060", span=16, size=1.3)
    cx, cy = GV_EAGLE
    ring = [[i * 3, round(cx + 96 * math.cos(math.pi * i / 3)), round(cy + 20 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    plist = [
        Prop("mam", "far", fauna.mammoth(size=1.25), [fauna.walk4_pose(f) for f in range(4)], (100, 52, 3), GV_HERD_Y),
        Prop("calf", "far", fauna.mammoth(size=0.85, fur="#7A6050"), [fauna.walk4_pose(f) for f in range(4)], (72, 38, 3), GV_HERD_Y),
        Prop("eagle", "far", eagle, [fauna.bird_pose(f) for f in range(5)], (60, 30, 30), GV_EAGLE[1]),
        Prop("flame", "mid", _flame, [{f"f{f}": {"show": True}} for f in range(4)], (22, 30, 2), fire[1], outline=False),
    ]
    sprites = [
        {"kind": "path", "layer": "far", "fps": 4, "periodS": 90, "keys": [[0, -340, GV_HERD_Y, 1], [90, 1560, GV_HERD_Y, 1]],
         "group": [{"frames": [f"mam_{i}" for i in range(4)], "dx": 0, "dy": 0},
                   {"frames": [f"calf_{i}" for i in range(4)], "dx": -50, "dy": 1, "phase": 1},
                   {"frames": [f"mam_{i}" for i in range(4)], "dx": -104, "dy": -1, "phase": 2}]},
        {"kind": "path", "layer": "far", "fps": 6, "periodS": 18, "keys": ring,
         "group": [{"frames": ["eagle_4", "eagle_4", "eagle_4", "eagle_4", "eagle_0", "eagle_1", "eagle_2", "eagle_3"]}]},
        {"kind": "loop", "layer": "mid", "frames": [f"flame_{i}" for i in range(4)], "fps": 9, "at": fire},
    ]
    return plist, sprites


SCENES = {
    "classic": Scene("stone", "classic", PAL, far, mid, sky=SKY, version=1),
    "glacier_valley": Scene("stone", "glacier_valley", GV_PAL, gv_far, gv_mid, back=gv_back, sky=GV_SKY, props=gv_props,
                            hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.5}, ground="earth"),
}
