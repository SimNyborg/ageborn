"""Stone Age scenes.

Classic "Smoke Mountain" (format 2, round 3; the free default every new player sees in the first battles):
an alpine valley in high summer under a smoking stratovolcano, pale blue sky with cumulus. Back: a far
range of snow peaks (low in the middle, where the volcano and the sky themes' moons stand). Far: the
volcano, rock below and ash grey above, dark lava ribs down its face from a jagged crater whose broken
near rim shows the glow of the lava lake, snow in its high gullies and a forest belt round its foot;
snowy alpine peaks on both sides, forested foothills and a meadow shelf where a herd of aurochs grazes
its way along, a small hunters' camp on a far knoll. Mid: a flowered meadow bank with mixed pines and
birches, the hide-tent camp (three tents, a drying rack, the fire in its ring of stones, firewood, a post
crowned with antlers), a cliff with a waterfall into a pool and its stream, and a row of standing stones
with a dolmen. Ambient: the volcano's plume, camp smoke, the fire, the waterfall's shimmer, crows round
the cliff, the aurochs; the fire, the tents, the far camp and the crater glow under night skies.

Palette (PLAN 2b): stone brown #8C7B68, moss greens kept muted (A11), bone #EDE3C8, ochre #C98A3D as a
small accent; water is a pale grey-teal (its hue is in the team-blue band, so its saturation stays low),
and the crater glow is a small accent.

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
from world.scenes.common import PaintedProp, Prop, Scene, box, mixc, rgb01, rock
from world.scenes.kit import Parts

# -- Smoke Mountain (the classic, round 3) -------------------------------------------------------------
SM_PAL = dict(skyTop=0x8AB4D2, skyBottom=0xEEE8D6, light=0xFFF4DE, far=0x9A9C92, mid=0x7E8A62, near=0x5E7048)
SM = dict(
    rock=0x8C7B68, rock_dk=0x6E6256, rib=0x6A5C50, ash=0x7C726A, snow=0xEEF0EE, glow=0xF0A060, glow_hi=0xFFD8A0,
    peak=0x8E8E98, peak_far=0x9A9CA8, forest=0x4C6447, forest_dk=0x405640, forest_far=0x5E7258, trunk=0x5A4A3E,
    meadow=0x8E9A68, meadow_dk=0x76875A, meadow_lt=0xA2AC7C, bank=0x8A9864, grass=0x7A8A56, grass_dk=0x687A4C,
    pine=0x4A6446, pine_dk=0x3E5640, birch=0xA4AC6C, birch_dk=0x8A9658, bark=0xE6E0D2, bark_mark=0x4E4842,
    stone=0x9C968A, stone_dk=0x7E786E, lichen=0xAAAC8C, cliff=0x8E8478, cliff_dk=0x6C655C, moss=0x6E7E50,
    hide=0xA88A6A, hide_dk=0x8E7058, hide_lt=0xBCA284, wood=0x6E5A48, bone=0xE6DCC6, ember=0x5A4038,
    water=0xBCCED2, water_hi=0xDCE8EA, foam=0xEEF2F2, pool=0x9AB2B8, ochre=0xC98A3D, flower=0xEDE3C8,
    smoke=0xD6D0C8, smoke_dk=0xB0A8A0,
)
SM_SKY = {"top": "#8AB4D2", "bottom": "#EEE8D6", "horizon": "#F4EEDC", "cloudTint": "#F8F5EE", "celestial": "sun",
          "sunAt": [150, -540, 44], "clouds": 0.9}
SM_FAR_E = math.radians(8.0)
SM_MID_E = math.radians(12.0)
SM_VOLCANO = (470.0, 390.0, -20.0, 290.0, 194.0)   # x, depth, base z, base radius, height (far)
SM_FIRE = (318.0, 54.0, 40.0)                      # the camp fire (mid)
SM_FALLS = (660.0, 70.0, 186.0, 44.0, 30.0)        # x, depth, top z, foot z, width (mid)
SM_HERD_Y = -104.0                                 # the aurochs' shelf (far, screen lu)
SM_CROWS = (640.0, -246.0)                         # the crows' ring (mid, screen lu)
SM_WALK_Y = -50.0                                  # the hunters' path along the bank (mid, screen lu)


def _scr(p, e):
    x, y, z = p
    return [round(x, 1), -round(z * math.cos(e) + y * math.sin(e), 1)]


def sm_back(st, P):
    """A far range of snow peaks, high at both ends and low in the middle (behind the volcano and under
    the place where the sky themes hang their moons, x 820-980), hazed into the sky."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    gr, gs = pt.g(hz(SM["peak_far"], 0.34), outline=0.0), pt.g(hz(SM["snow"], 0.16), outline=0.0)
    rnd = random.Random(3)
    for i, (x, h) in enumerate(((-250, 170), (-130, 205), (-10, 175), (110, 210), (240, 160), (360, 130), (480, 110), (600, 90),
                                (720, 76), (850, 62), (980, 76), (1100, 130), (1220, 190), (1330, 214), (1440, 180))):
        kit.peak(gr, gs, x + rnd.uniform(-20, 20), 1500 + rnd.uniform(-40, 40), -60, rnd.uniform(100, 140) * (0.75 + h / 520), h,
                 seed=30 + i, snow=rnd.uniform(0.56, 0.66), jag=0.14, squash=0.55)
    pt.flush(st)


def _knoll_camp(pt, st, x, y, z):
    """A tiny far camp on a knoll: three tents and a fire light."""
    for k, (dx, r, h, c) in enumerate(((-10, 6.0, 15.0, SM["hide"]), (6, 5.0, 12.0, SM["hide_dk"]), (18, 4.2, 10.0, SM["hide_lt"]))):
        kit.hide_tent(pt, x + dx, y + k * 2, z, r, h, hide=c, seed=40 + k)
    st.light((x + 2, y - 6, z + 3), 6)
    st.amb("emit", "bd.puff", (x + 2, y - 4, z + 14), rate=0.25, speed=6, scale=0.6, tint=0xE2DED8, alpha=0.32, life=3000)


def _plume(pt, top, rnd):
    """The plume's lasting column, painted into the far strip so stills, thumbnails and reduced motion
    show the smoke too (the emitters add the rising puffs over it): billows leaning right with the wind,
    darker and narrow over the crater, widening and paling as they climb, then a flat ash cloud trailing
    off downwind."""
    x0, y0, z0 = top
    dk, lt = pt.g(SM["smoke_dk"], outline=0.0), pt.g(SM["smoke"], outline=0.0)
    n = 13
    for k in range(n):
        t = k / (n - 1)
        x = x0 + 3 + 78 * t ** 1.8
        z = z0 - 4 + 116 * t ** 0.9
        r = 12 + 20 * t
        for j in range(2):
            dx, dz = rnd.uniform(-0.3, 0.3) * r, rnd.uniform(-0.15, 0.15) * r
            g = dk if (t < 0.34 and j == 0) else lt
            g.blob((x + dx, y0 + 4 + j * 3, z + dz), (r * rnd.uniform(0.86, 1.0), r * 0.6, r * rnd.uniform(0.72, 0.86)), p=2.0, cuts=3)
    # the head: billows spreading downwind into a flat ash cloud
    for k, (dx, dz, r) in enumerate(((70, 118, 30), (98, 128, 28), (124, 124, 26), (150, 130, 22), (176, 124, 18), (200, 128, 13), (110, 108, 22))):
        lt.blob((x0 + dx + rnd.uniform(-4, 4), y0 + 8 + k, z0 + dz + rnd.uniform(-3, 3)), (r * 1.25, r * 0.6, r * 0.62), p=2.0, cuts=3)


def sm_far(st, P):
    pt = Parts()
    rnd = random.Random(17)
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    # 1. the rear forested ridge, grey-green in the haze
    g = pt.g(hz(SM["forest_far"], 0.3), outline=0.0)
    for i in range(10):
        x = -300 + i * 190 + rnd.uniform(-30, 30)
        h = rnd.uniform(110, 150) if not (760 <= x <= 1020) else rnd.uniform(70, 90)
        kit.hill(g, x, 660, -20, rnd.uniform(150, 200), 90, h, seed=10 + i, jag=0.07, p=2.3)
    # 2. alpine peaks left and right of the volcano, snow on their shoulders
    gp, gs = pt.g(hz(SM["peak"], 0.16), outline=0.0), pt.g(SM["snow"], outline=0.0)
    for i, (x, y, h, rx) in enumerate(((-170, 560, 250, 150), (-20, 540, 190, 120), (1110, 560, 230, 140), (1290, 560, 260, 150),
                                       (1440, 540, 200, 120))):
        kit.peak(gp, gs, x, y, -20, rx, h, seed=50 + i, snow=rnd.uniform(0.5, 0.6), jag=0.2, squash=0.55)
    # 3. the volcano (the signature): ribs, snow gullies, the crater glow, a forest belt
    vx, vy, vz, R, H = SM_VOLCANO
    top = kit.volcano(pt, vx, vy, vz, R, H, seed=5, body=SM["rock"], ash=SM["ash"], rib=SM["rib"], snow=SM["snow"], foot=SM["meadow_dk"],
                      forest=(SM["forest"], SM["forest_dk"], SM["trunk"]), glow=SM["glow"], glow_hi=SM["glow_hi"], trees=120, streaks=0, ribs=0)
    # a parasitic cone on its right flank
    gc = pt.g(SM["rock_dk"], outline=0.0)
    gc.lathe([(70, 0), (56, 20), (32, 52), (17, 70), (14, 72), (10, 68), (0.01, 66)], (vx + 240, vy - 60, -16), None, segs=24, squash=(1.0, 0.62))
    st.light((top[0], top[1] - 20, top[2] - 4), 12)
    _plume(pt, top, random.Random(23))
    # the plume's motion: a slow heavy column leaning with the wind, and a quicker wisp
    st.amb("emit", "bd.puff", (top[0], top[1], top[2] + 6), rate=1.5, speed=7, scale=3.4, tint=0xD6D0C8, alpha=0.55, life=8000, drift=9)
    st.amb("emit", "bd.puff", (top[0] + 4, top[1], top[2] + 4), rate=1.0, speed=11, scale=2.0, tint=0xDED8D0, alpha=0.45, life=5000, drift=6)
    # 4. forested foothills, a meadow shelf (the herd's path) in front of them
    gh, gh2 = pt.g(SM["meadow_dk"], outline=0.0), pt.g(SM["meadow"], outline=0.0)
    for i in range(12):
        x = -300 + i * 160 + rnd.uniform(-25, 25)
        # low in front of the volcano (its foot shows) and under the moons' place
        h = rnd.uniform(36, 46) if 150 <= x <= 800 else rnd.uniform(60, 72) if 790 <= x <= 1010 else rnd.uniform(80, 110)
        kit.hill(gh if i % 2 else gh2, x, 330, -10, rnd.uniform(120, 160), 70, h, seed=70 + i, jag=0.05, p=2.4)
    gm = pt.g(SM["meadow_lt"], outline=0.0)
    for k in range(16):
        x = -300 + k * 120 + rnd.uniform(-20, 20)
        rock(gm, (x, 292, 50), (rnd.uniform(80, 110), 26, rnd.uniform(8, 11)), seed=900 + k, jag=0.04, p=2.6)
    # an alpine lake at the volcano's left foot (grey-teal, low saturation), reeds at its edge
    pt.g(SM["pool"], finish="gloss", outline=0.0).blob((214, 300, 63.2), (120, 22, 1.2), p=2.6, cuts=3)
    pt.g(SM["water_hi"], outline=0.0, highlight=False).blob((190, 286, 64.2), (64, 3, 0.4), p=2.6, cuts=2)
    # a dense forested ridge on the left and grey crags on the foothills
    gfr, gfr2, gtr = pt.g(SM["forest"], outline=0.3), pt.g(SM["forest_dk"], outline=0.3), pt.g(SM["trunk"], outline=0.0)
    for k in range(46):
        x = rnd.uniform(-260, 110)
        h = rnd.uniform(24, 36)
        kit.spruce(gfr if k % 3 else gfr2, None, gtr, x, rnd.uniform(372, 400), h, h * 0.3, seed=1400 + k, z=88 - abs(x + 70) * 0.18 + rnd.uniform(-4, 6),
                   tiers=3, snow=False)
    gcr, gcr2 = pt.g(SM["stone"], outline=0.3), pt.g(SM["stone_dk"], outline=0.3)
    for k, (x, z, rx, rz) in enumerate(((-120, 60, 26, 30), (-80, 52, 16, 20), (40, 56, 22, 24), (860, 52, 20, 22), (1180, 70, 30, 34), (1230, 62, 18, 20))):
        rock(gcr if k % 2 else gcr2, (x, 318, z), (rx, 14, rz), seed=1500 + k, jag=0.18, p=2.6)
    gf, gf2, gt = pt.g(SM["forest"], outline=0.3), pt.g(SM["forest_dk"], outline=0.3), pt.g(SM["trunk"], outline=0.0)
    # forest clusters on the foothills (clearings between them)
    for c in range(16):
        cx = -250 + c * 112 + rnd.uniform(-30, 30)
        n = rnd.randint(6, 11)
        for k in range(n):
            x = cx + rnd.uniform(-34, 34)
            z = rnd.uniform(30, 40) if 150 <= x <= 800 else rnd.uniform(44, 56) if x <= 1010 else rnd.uniform(52, 94)
            h = rnd.uniform(16, 28)
            kit.spruce(gf if k % 3 else gf2, None, gt, x, rnd.uniform(318, 346), h, h * 0.3, seed=300 + c * 20 + k, z=z, tiers=3, snow=False)
    # boulders and a few birches on the shelf
    gb = pt.g(SM["stone"], outline=0.3)
    for k in range(10):
        rock(gb, (rnd.uniform(-240, 1440), 284, 62), (rnd.uniform(4, 7), 4, rnd.uniform(3, 5)), seed=500 + k, jag=0.2)
    gbl, gbl2, gbt, gbm = pt.g(SM["birch"], outline=0.3), pt.g(SM["birch_dk"], outline=0.3), pt.g(SM["bark"], outline=0.0), pt.g(SM["bark_mark"], outline=0.0)
    for k in range(9):
        x = rnd.uniform(-240, 1440)
        kit.birch(gbl, gbl2, gbt, gbm, x, 300, rnd.uniform(26, 34), rnd.uniform(9, 12), seed=600 + k, z=60)
    # 5. a small hunters' camp on a knoll (far), lit at night
    _knoll_camp(pt, st, 690, 296, 64)
    pt.flush(st)


def sm_mid(st, P):
    pt = Parts()
    rnd = random.Random(29)
    # the meadow bank
    g = pt.g(SM["bank"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g, (x, 80, 8), (96, 60, 40 + rnd.uniform(0, 12)), seed=i, jag=0.05, p=2.4)
    # grass tufts and a few flowers (bone white, ochre: small accents)
    gg, gg2 = pt.g(SM["grass"], finish="hair", outline=0.3), pt.g(SM["grass_dk"], finish="hair", outline=0.3)
    for i in range(80):
        x = rnd.uniform(-250, 1450)
        kit.round_bush(gg if i % 2 else gg2, x, rnd.uniform(26, 46), rnd.uniform(4, 7), seed=1000 + i, z=rnd.uniform(36, 46), flat=0.6)
    gfl, gfo = pt.g(SM["flower"], outline=0.0, highlight=False), pt.g(SM["ochre"], outline=0.0, highlight=False)
    for i in range(70):
        x = rnd.uniform(-250, 1450)
        (gfl if i % 3 else gfo).sphere((x, rnd.uniform(24, 40), rnd.uniform(44, 48)), rnd.uniform(1.1, 1.6), cuts=2)
    # mixed pines and birches in groups (clearings for the camp, the cliff and the stones)
    gp, gp2, gt = pt.g(SM["pine"], outline=0.5), pt.g(SM["pine_dk"], outline=0.5), pt.g(SM["trunk"], outline=0.4)
    gbl, gbl2, gbt, gbm = pt.g(SM["birch"], outline=0.5), pt.g(SM["birch_dk"], outline=0.5), pt.g(SM["bark"], outline=0.4), \
        pt.g(SM["bark_mark"], outline=0.0, highlight=False)
    # (nothing tall at x 220-480: the volcano stands behind the camp there, at the game's camera)
    pines = ((-230, 62, 150), (-196, 74, 118), (-150, 66, 170), (60, 70, 140), (96, 82, 112), (140, 64, 128), (744, 96, 150), (792, 70, 160),
             (832, 82, 128), (884, 70, 146), (1040, 64, 170), (1080, 78, 132), (1180, 70, 150), (1330, 64, 166), (1372, 80, 124), (1420, 70, 150))
    for i, (x, y, h) in enumerate(pines):
        kit.spruce(gp if i % 2 else gp2, None, gt, x, y, h, h * 0.24, seed=700 + i, z=28, tiers=4, snow=False)
    birches = ((-112, 70, 116, -0.04), (-80, 84, 96, 0.05), (18, 76, 108, 0.03), (172, 90, 92, -0.05), (552, 88, 98, -0.04), (590, 96, 88, 0.04),
               (930, 80, 98, -0.03), (968, 92, 114, 0.05), (1130, 86, 100, -0.04), (1260, 76, 118, 0.03), (1300, 90, 94, -0.05))
    for i, (x, y, h, lean) in enumerate(birches):
        kit.birch(gbl, gbl2, gbt, gbm, x, y, h, h * 0.3, seed=800 + i, z=30, lean=lean)
    # the hide-tent camp (x 180-400)
    for (x, y, r, h, s, c) in ((210, 74, 30, 76, 1, SM["hide"]), (292, 88, 25, 62, 2, SM["hide_dk"]), (378, 70, 21, 54, 3, SM["hide_lt"])):
        door = kit.hide_tent(pt, x, y, 34, r, h, hide=c, seed=s, yaw=s * 17)
        st.light(door, 5)
    kit.drying_rack(pt, 252, 96, 34, 44, 50, wood=SM["wood"], hide=SM["hide_lt"], hide2=SM["hide_dk"])
    fx_, fy, fz = SM_FIRE
    gst = pt.g(SM["stone_dk"], outline=0.4)
    for k in range(9):
        a = 2 * math.pi * k / 9
        rock(gst, (fx_ + math.cos(a) * 11, fy + math.sin(a) * 5, fz + 1), (3.8, 3.0, 2.8), seed=80 + k, jag=0.15)
    gl = pt.g(SM["ember"], outline=0.3)
    gl.capsule((fx_ - 8, fy - 1, fz + 2), (fx_ + 8, fy + 1, fz + 4), 1.8)
    gl.capsule((fx_ - 7, fy + 2, fz + 4), (fx_ + 7, fy - 2, fz + 2), 1.8)
    kit.firewood(pt.g(SM["wood"], outline=0.4), 346, 66, 36, n=5, L=16, r=1.7, seed=3)
    kit.antler_post(pt.g(SM["wood"], outline=0.4), pt.g(SM["bone"], outline=0.4), 168, 62, 34, 44)
    st.light((fx_, fy, fz + 8), 10)
    st.amb("emit", "bd.puff", (fx_, fy, fz + 30), rate=0.6, speed=10, scale=1.0, tint=0xE2DED8, alpha=0.4, life=2800)
    # the cliff and its waterfall (x 600-730): stacked weathered rock, moss on the ledges, a pine on top
    gcl, gcl2, gmo = pt.g(SM["cliff"], outline=0.5), pt.g(SM["cliff_dk"], outline=0.5), pt.g(SM["moss"], outline=0.4)
    rock(gcl, (666, 116, 64), (80, 40, 66), seed=61, jag=0.12, p=2.8)
    rock(gcl2, (612, 110, 54), (40, 34, 50), seed=62, jag=0.16, p=2.6)
    rock(gcl, (716, 112, 72), (42, 34, 64), seed=63, jag=0.16, p=2.6)
    rock(gcl2, (658, 120, 140), (56, 32, 48), seed=64, jag=0.14, p=2.8)
    rock(gcl, (672, 118, 184), (40, 28, 24), seed=65, jag=0.18, p=2.6)
    for (x, z, rx) in ((626, 108, 18), (698, 132, 22), (644, 192, 16), (688, 200, 14)):
        gmo.blob((x, 92, z), (rx, 10, 5), p=2.2)
    kit.spruce(gp, None, gt, 696, 120, 72, 17, seed=990, z=196, tiers=4, snow=False)
    wx, wy, wt, wb, ww = SM_FALLS
    kit.waterfall(pt, wx, wy, wt, wb, ww, water=SM["water"], water_hi=SM["water_hi"], foam=SM["foam"], pool=SM["pool"], seed=5)
    # the stream from the pool across the bank, to the right
    gwa = pt.g(SM["pool"], finish="gloss", outline=0.3)
    for k, (x, y) in enumerate(((684, 50), (716, 44), (752, 40), (790, 38), (828, 40))):
        gwa.blob((x, y, 41.6), (22, 6, 1.4), p=2.2, cuts=2, rot=(0, 0, -8 + k * 4))
    # standing stones and a dolmen (x 410-500), low in front of the volcano
    gsn, gsn2, gli = pt.g(SM["stone"], outline=0.5), pt.g(SM["stone_dk"], outline=0.5), pt.g(SM["lichen"], outline=0.0)
    for k, (x, y, h, w, lean) in enumerate(((418, 70, 52, 17, -3), (446, 84, 40, 15, 4), (500, 74, 58, 18, -2), (528, 88, 36, 14, 5))):
        kit.menhir(gsn if k % 2 else gsn2, x, y, 36, h, w, seed=120 + k, lean=lean, yaw=rnd.uniform(-15, 15))
        gli.blob((x + rnd.uniform(-3, 3), y - 6.4, 36 + h * rnd.uniform(0.4, 0.7)), (3.4, 0.6, 2.8), p=2.0)
    kit.dolmen(gsn2, gsn, 474, 104, 36, 50, 38, seed=130)
    # boulders on the bank
    gbo = pt.g(SM["stone_dk"], outline=0.5)
    for i in range(12):
        x = rnd.uniform(-240, 1440)
        if 180 < x < 540 or 600 < x < 730:
            continue
        rock(gbo, (x, rnd.uniform(34, 52), 38), (rnd.uniform(7, 13), 7, rnd.uniform(5, 9)), seed=900 + i, jag=0.2)
    # a fallen log and a hunter's lean-to in the right half
    pt.g(SM["wood"], outline=0.4).capsule((1000, 56, 42), (1060, 62, 44), 4.4, 3.8)
    glw = pt.g(SM["wood"], outline=0.4)
    for k in range(6):
        glw.capsule((1210 + k * 7, 74, 34), (1222 + k * 7, 90, 74), 1.2)
    pt.g(SM["hide_dk"], outline=0.4).slab([(1206, 36), (1260, 36), (1262, 70), (1220, 76)], 80, 2.0)
    pt.flush(st)


def _flame(rig):
    """A camp fire: four licking shapes, one hidden joint per frame (glow, no outline)."""
    for f, (h, lean) in enumerate([(1.0, 0.0), (1.16, 1.4), (0.9, -1.2), (1.08, 0.6)]):
        j = rig.joint(f"f{f}", "all", (0, 0, 0), hidden=True)
        rig.part(j, Geo().blob((0, 0, 9.4 * h), (7.4, 4.3, 10.2 * h), p=2.0, taper=(1.0, 0.18), shift=(lean * 0.12, 0)), glow="#FFC77E", outline=0)
        rig.part(j, Geo().blob((0, -1.9, 7.6 * h), (4.3, 2.7, 7.0 * h), p=2.0, taper=(1.0, 0.22), shift=(lean * 0.1, 0)), glow="#FFE7B4", outline=0)
        rig.part(j, Geo().blob((0.5 * lean, -3.2, 4.8), (2.2, 1.6, 4.0), p=2.0, taper=(1.0, 0.3)), glow="#FFF7E2", outline=0)


def _falls_shimmer(i):
    """The waterfall's moving streaks (painted): pale bands sliding down the sheet, four frames of one
    cycle; transparent between the bands so the rendered sheet shows."""
    import numpy as np
    ppl = 1.2
    w, h = int(SM_FALLS[4] * 1.04 * ppl), int((SM_FALLS[2] - SM_FALLS[3]) * math.cos(SM_MID_E) * ppl)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u = xx / max(1, w - 1)
    out = np.zeros((h, w, 4), np.float32)
    out[..., :3] = rgb01(0xF2F6F6)
    a = np.zeros((h, w), np.float32)
    for k in range(4):
        cx = (k + 0.5) / 4
        band = np.clip(1 - np.abs(u - cx) / 0.07, 0, 1)
        phase = (yy / h * 3.0 - i / 4.0 + k * 0.37) % 1.0
        a = np.maximum(a, band * np.clip(1 - np.abs(phase - 0.5) / 0.22, 0, 1))
    # narrower at the top (the sheet widens as it falls)
    edge = np.clip((0.5 - np.abs(u - 0.5)) / (0.04 + 0.08 * yy / h), 0, 1)
    out[..., 3] = a * edge * 0.55
    return out


def sm_props():
    fire = _scr((SM_FIRE[0], SM_FIRE[1], SM_FIRE[2] + 3), SM_MID_E)
    wx, wy, wt, wb, ww = SM_FALLS
    falls = _scr((wx, wy - 2.0, wt), SM_MID_E)
    crow = fauna.bird(body="#433C3A", wing="#342E2C", beak="#5A4E44", span=12, size=0.85)
    cx, cy = SM_CROWS
    ring = [[i * 2, round(cx + 84 * math.cos(math.pi * i / 3)), round(cy + 18 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    plist = [
        Prop("flame", "mid", _flame, [{f"f{f}": {"show": True}} for f in range(4)], (22, 30, 2), fire[1], outline=False),
        PaintedProp("falls", "mid", _falls_shimmer, 4, ax=0.5, ay=0.0, ppl=1.2),
        Prop("crow", "mid", crow, [fauna.bird_pose(f) for f in range(5)], (40, 24, 24), ring[0][2]),
        Prop("hunt", "mid", fauna.hunter(size=1.0), [fauna.walker_pose(f) for f in range(4)], (34, 34, 3), SM_WALK_Y),
        Prop("aur", "far", fauna.aurochs(size=0.95), [fauna.walk4_pose(f, swing=16, bob=0.6, head=2.0) for f in range(4)], (76, 42, 3), SM_HERD_Y),
        Prop("calf", "far", fauna.aurochs(size=0.62, hide="#7A6250", horn="#D8CCB4"), [fauna.walk4_pose(f, swing=18, bob=0.6) for f in range(4)], (54, 30, 3),
             SM_HERD_Y),
    ]
    sprites = [
        {"kind": "loop", "layer": "mid", "frames": [f"flame_{i}" for i in range(4)], "fps": 9, "at": fire},
        {"kind": "loop", "layer": "mid", "frames": [f"falls_{i}" for i in range(4)], "fps": 7, "at": falls},
        {"kind": "path", "layer": "far", "fps": 3, "periodS": 150, "keys": [[0, -360, SM_HERD_Y, 1], [150, 1580, SM_HERD_Y, 1]],
         "group": [{"frames": [f"aur_{i}" for i in range(4)]},
                   {"frames": [f"aur_{i}" for i in range(4)], "dx": -44, "dy": 1, "phase": 2},
                   {"frames": [f"calf_{i}" for i in range(4)], "dx": -74, "dy": 0, "phase": 1}]},
        {"kind": "path", "layer": "mid", "fps": 5, "periodS": 70,
         "keys": [[0, 360, SM_WALK_Y, 0], [1.5, 372, SM_WALK_Y, 1], [44, 920, SM_WALK_Y, 1], [46, 944, SM_WALK_Y, 0], [70, 944, SM_WALK_Y, 0]],
         "group": [{"frames": [f"hunt_{i}" for i in range(4)]}, {"frames": [f"hunt_{i}" for i in range(4)], "dx": -26, "dy": -1, "phase": 2}]},
        {"kind": "path", "layer": "mid", "fps": 6, "periodS": 14, "keys": ring,
         "group": [{"frames": ["crow_4", "crow_0", "crow_1", "crow_2", "crow_3"]},
                   {"frames": ["crow_0", "crow_1", "crow_2", "crow_3", "crow_4"], "dx": -28, "dy": 10, "phase": 2}]},
    ]
    return plist, sprites


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
GV_HERD_Y = -106.0
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
    # 2. the glacier (round 3 rework, review 2: the old tongue narrowed toward the saddle and bulged, so it
    #    read as a dome): a band of ice that flows from a broad snowfield basin between the twin peaks down
    #    the valley toward the camera, narrowing to its snout. Its surface tilts toward the camera, so the
    #    whole flow shows: transverse crevasses in arcs that bow downstream (convex toward the snout, as a
    #    glacier's do), a dark medial moraine down its middle where two ice streams join, lateral moraines
    #    along its edges, rock walls either side, and a broken serac snout with a meltwater cave.
    rows = [(404, 336, 96, 96, 5), (406, 384, 106, 100, 6), (409, 440, 118, 106, 6), (413, 500, 131, 116, 6), (417, 560, 145, 132, 5),
            (421, 615, 158, 156, 4), (424, 655, 166, 186, 3)]
    kit.loft(pt.g(GV["ice"], finish="gloss", outline=0.5), rows, nu=18, thick=14)
    nr = len(rows) - 1
    # snow lying on the upper basin (the accumulation zone), fading out down the tongue
    gsn = pt.g(GV["snow"], outline=0.0)
    for k in range(40):
        t = rnd.uniform(nr - 1.8, nr - 0.05)
        u = rnd.uniform(-0.85, 0.85)
        p_ = kit.loft_point(rows, t, u)
        gsn.blob((p_[0], p_[1] - 0.6, p_[2] + 0.8), (rnd.uniform(10, 22), 6, 1.2), p=2.2, cuts=2)
    # transverse crevasses: short dark cracks in arcs bowing downstream, more and wider where the ice
    # speeds up over the steeper middle reach
    gc, gc2 = pt.g(GV["crevasse"], outline=0.0, highlight=False), pt.g(GV["serac_dk"], outline=0.0, highlight=False)
    for j, t0 in enumerate((0.55, 1.05, 1.5, 1.95, 2.45, 2.95, 3.5, 4.1)):
        n = 3 + (j % 2)
        for k in range(n):
            u0 = -0.86 + (k + 0.1) * 1.72 / n + rnd.uniform(-0.05, 0.05)
            u1 = u0 + 1.72 / n * rnd.uniform(0.5, 0.8)
            pts = []
            for q in range(5):
                u = u0 + (u1 - u0) * q / 4
                t = t0 - 0.22 * (1 - u * u)
                p_ = kit.loft_point(rows, max(0.02, t), u)
                pts.append((p_[0], p_[1] - 0.8, p_[2] + 0.9))
            w = 1.5 + 0.6 * (1 - abs(j - 3.5) / 4)
            for p0, p1 in zip(pts, pts[1:]):
                (gc if (j + k) % 3 else gc2).capsule(p0, p1, w, w * 0.8)
    # the medial moraine: a dark rubble stripe down the middle, from the basin to the snout
    gm, gm2 = pt.g(GV["rock_dk"], outline=0.3), pt.g(GV["rock"], outline=0.3)
    for k in range(34):
        t = 0.1 + k * (nr - 0.6) / 34
        u = 0.06 + 0.05 * math.sin(k * 0.7)
        p_ = kit.loft_point(rows, t, u)
        (gm if k % 3 else gm2).blob((p_[0] + rnd.uniform(-1.5, 1.5), p_[1] - 0.8, p_[2] + 1.2), (rnd.uniform(3.2, 4.6), 2.4, 1.6), p=2.2, cuts=2)
    # lateral moraines: rubble banks along both edges
    for u in (-0.95, 0.95):
        pts = [kit.loft_point(rows, t * 0.25, u) for t in range(0, nr * 4 + 1)]
        for k, (p0, p1) in enumerate(zip(pts, pts[1:])):
            gm.capsule((p0[0], p0[1], p0[2] + 1.6), (p1[0], p1[1], p1[2] + 1.6), 3.6 - k * 0.06, 3.5 - k * 0.06)
    # the snout: a broken ice cliff at the tongue's front (blocks of uneven width, height and lean), the
    # meltwater cave in its middle and its stream running out toward the camera, fallen blocks
    gse, gse2 = pt.g(GV["serac"], outline=0.5), pt.g(GV["serac_dk"], outline=0.5)
    gd = pt.g(GV["cave"], outline=0.0, highlight=False)
    x = 404 - 96.0
    k = 0
    while x < 404 + 96:
        w = rnd.uniform(14, 28)
        cx = x + w / 2
        if abs(cx - 404) < 16:
            x += 32
            continue
        top = 96 + 6 * (1 - ((cx - 404) / 96) ** 2) - rnd.uniform(0, 7)
        hh = top - 62
        box(gse if k % 3 else gse2, (cx, 332, 62 + hh / 2), (w * 0.5, 10, hh / 2 + 2), p=2.6, cuts=2,
            rot=(0, rnd.uniform(-7, 7), rnd.uniform(-16, 16)))
        x += w * rnd.uniform(0.82, 0.96)
        k += 1
    arch = [(404 - 13, 62), (404 + 13, 62)] + [(404 + 13 * math.cos(math.pi * q / 10), 76 + 12 * math.sin(math.pi * q / 10)) for q in range(11)]
    gd.slab(arch, 321.6, 2.0)
    rock(gse2, (404, 328, 92), (24, 10, 8), seed=32, jag=0.1, p=2.4)
    gwa = pt.g(0xA8C2CC, finish="gloss", outline=0.3)
    for k in range(6):
        gwa.blob((404 + math.sin(k * 0.9) * 10 + k * 6, 318 - k * 14, 60.6 - k * 1.2), (14 - k * 0.6, 7, 0.8), p=2.4, cuts=2)
    for k in range(6):
        bx = 316 + k * 34 + rnd.uniform(-8, 8)
        if abs(bx - 404) < 20:
            continue
        rock(gse if k % 2 else gse2, (bx, 318, 64), (rnd.uniform(6, 10), 6, rnd.uniform(5, 8)), seed=380 + k, jag=0.22, p=2.2)
    for t, u in ((0.9, -0.4), (2.2, 0.3), (3.6, -0.1), (1.5, 0.6)):
        p_ = kit.loft_point(rows, t, u)
        st.amb("blink", "fx.p.star", (p_[0], p_[1], p_[2] + 4), period=2900, tint=0xF6FAFF, scale=0.6)
    # 3. the valley's rock walls either side of the ice, stepping up toward the basin, and the outer
    # shoulders (the glacier runs between them like a river of ice)
    gr2, gs2 = pt.g(GV["rock"], outline=0.4), pt.g(GV["snow"], outline=0.4)
    grd = pt.g(GV["rock_dk"], outline=0.4)
    for side in (-1, 1):
        for k, t in enumerate((0.3, 1.4, 2.6, 3.8, 4.9)):
            p_ = kit.loft_point(rows, t, side * 1.0)
            rx = 40 + k * 4
            kit.peak(grd if k % 2 else gr2, gs2, p_[0] + side * (rx * 0.55), p_[1] + 6, p_[2] - 46, rx, 70 + k * 8, seed=150 + k + (side > 0) * 10,
                     snow=0.7, jag=0.22, squash=0.5)
    kit.peak(gr2, gs2, 214, 360, 40, 120, 190, seed=11, snow=0.62, jag=0.2, squash=0.5)
    kit.peak(gr2, gs2, 612, 366, 40, 118, 176, seed=12, snow=0.6, jag=0.2, squash=0.5)
    kit.peak(gr2, gs2, 1200, 420, 40, 210, 250, seed=13, snow=0.58, jag=0.2, squash=0.55)
    kit.peak(gr2, gs2, -200, 410, 40, 170, 230, seed=14, snow=0.6, jag=0.2, squash=0.55)
    # 4. the snowy valley floor the herd walks (its top at about z 66, below the snout, so the ice cliff and
    # its cave stand clear behind it), spruces along its back
    gh = pt.g(GV["snow_bank"], outline=0.0)
    for i in range(12):
        x = -300 + i * 160 + rnd.uniform(-20, 20)
        kit.hill(gh, x, 240, -10, rnd.uniform(130, 170), 80, rnd.uniform(72, 78), seed=60 + i, jag=0.03, p=2.8)
    # the terminal moraine in front of the snout: rubble banks either side of the meltwater stream
    gmo = pt.g(GV["rock"], outline=0.4)
    for k in range(9):
        x = 290 + k * 30 + rnd.uniform(-6, 6)
        if abs(x - 410) < 18:
            continue
        rock(gmo, (x, 300, 60), (rnd.uniform(12, 18), 12, rnd.uniform(7, 10)), seed=360 + k, jag=0.2)
    gsp, gsn, gtr = pt.g(GV["spruce"], outline=0.3), pt.g(GV["snow"], outline=0.0), pt.g(GV["trunk"], outline=0.0)
    for i in range(64):
        x = rnd.uniform(-260, 1460)
        if 270 < x < 560:
            continue
        kit.spruce(gsp, gsn, gtr, x, rnd.uniform(276, 300), rnd.uniform(26, 44), rnd.uniform(7.5, 11), seed=500 + i, z=rnd.uniform(60, 68),
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


# -- Sabre Savanna (round 3; Epic, Wardrobe Crate) ---------------------------------------------------
SS_PAL = dict(skyTop=0xA8B8C4, skyBottom=0xF0E2C4, light=0xFFF2D8, far=0xB4A07E, mid=0xA89466, near=0x8A7A52)
SS = dict(
    grass=0xC9B37A, grass_dk=0xAE9A62, grass_lt=0xD8C690, straw=0xC2AC72, sand=0xD2C29C, sandstone=0xA8826A, sandstone_dk=0x8E6C58,
    sandstone_lt=0xBC9A80, rock=0x9A8670, rock_dk=0x7E6C5A, acacia=0x6E8A44, acacia_dk=0x5A7438, bark=0x6A5646, termite=0xB0906C,
    termite_dk=0x96785A, water=0x9AB0AC, water_hi=0xC8D6D2, mud=0x8E7A5E, hide=0xA88A6A, bone=0xE6DCC6, ember=0x5A4038,
)
SS_SKY = {"top": "#A8B8C4", "bottom": "#F0E2C4", "horizon": "#F6E8CC", "cloudTint": "#FAF2E2", "celestial": "sun",
          "sunAt": [300, -520, 44], "clouds": 0.5, "smog": 0.14}
SS_FAR_E = math.radians(8.0)
SS_MID_E = math.radians(12.0)
SS_ARCH = (470.0, 420.0, 36.0)       # the arch's mesa (far): x, y, foot z
SS_POND = (340.0, 84.0, 41.0, 118.0, 30.0)   # the watering hole (mid): x, y, z, rx, ry
SS_CAT = (700.0, 92.0, 84.0)         # the sabre-tooth's rock top (mid)
SS_DEVIL_Y = -96.0                   # the dust devil's foot on the plain (far, screen lu)
SS_DEER_Y = -46.0                    # the giant deer's walk along the bank (mid, screen lu)


def ss_back(st, P):
    """A long table plateau along the horizon with a broken escarpment, hazed warm (lowest under the
    moons' place)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    g, g2, gt = pt.g(hz(SS["sandstone"], 0.42), outline=0.0), pt.g(hz(SS["sandstone_dk"], 0.4), outline=0.0), pt.g(hz(SS["grass_dk"], 0.4), outline=0.0)
    for k, (x, rx, h) in enumerate(((-200, 200, 110), (160, 180, 90), (560, 170, 70), (900, 120, 40), (1200, 210, 104), (1450, 160, 90))):
        kit.butte(g if k % 2 else g2, [g2 if k % 2 else g], gt, x, 1500, -40, rx, 60, h, seed=80 + k, bands=((0.45, 0.55),))
    pt.flush(st)


def _arch(pt, x, y, z):
    """The natural arch on its mesa: a stepped sandstone base, two weathered legs and a thick span with
    a jagged top, strata bands across it, a few tufts on the top. Returns the span's top point."""
    gs, gs2, gs3 = pt.g(SS["sandstone"], outline=0.4), pt.g(SS["sandstone_dk"], outline=0.4), pt.g(SS["sandstone_lt"], outline=0.0)
    kit.butte(gs, [gs2, gs3], pt.g(SS["sand"], outline=0.0), x, y + 10, z, 150, 70, 64, seed=21, bands=((0.3, 0.4), (0.62, 0.7)))
    zt = z + 62
    # the legs and the span: blobs along an arc, thicker at the feet
    for k in range(17):
        a = math.pi * k / 16
        ax, az = x - 64 * math.cos(a), zt + 76 * math.sin(a)
        r = 18 - 8 * math.sin(a)
        rock(gs if k % 2 else gs2, (ax, y - 6, az), (r * 1.15, 18, r), seed=200 + k, jag=0.18, p=2.4, cuts=3)
    for k in range(6):
        a = math.pi * (k + 0.5) / 6
        rock(gs, (x - 64 * math.cos(a), y - 6, zt + 90 * math.sin(a) + 6), (14, 16, 8), seed=230 + k, jag=0.24, p=2.2, cuts=2)
    gb = pt.g(SS["sandstone_lt"], outline=0.0, highlight=False)
    for k in range(12):
        a = math.pi * (k + 0.5) / 12
        gb.blob((x - 64 * math.cos(a), y - 22, zt + 76 * math.sin(a) + 2), (6, 1.0, 1.6), p=2.2, rot=(0, -math.degrees(a) + 90, 0), cuts=2)
    gtu = pt.g(SS["grass_dk"], outline=0.3)
    for k in range(5):
        kit.round_bush(gtu, x - 30 + k * 15, y - 4, 4.6, seed=260 + k, z=zt + 96, flat=0.7)
    return (x, y, zt + 100)


def ss_far(st, P):
    pt = Parts()
    rnd = random.Random(83)
    # 1. the plain: golden grass in long low swells, darker swathes
    g, g2 = pt.g(SS["grass"], outline=0.0), pt.g(SS["grass_dk"], outline=0.0)
    for i in range(12):
        x = -300 + i * 160 + rnd.uniform(-20, 20)
        kit.hill(g if i % 2 else g2, x, 560, -10, rnd.uniform(140, 190), 90, rnd.uniform(56, 70), seed=10 + i, jag=0.03, p=2.6)
    for i in range(14):
        x = -300 + i * 130 + rnd.uniform(-20, 20)
        kit.hill(g2 if i % 2 else g, x, 360, -10, rnd.uniform(110, 150), 80, rnd.uniform(42, 50), seed=40 + i, jag=0.03, p=2.8)
    # 2. the arch (the signature) on its mesa
    ax, ay, az = SS_ARCH
    _arch(pt, ax, ay, az)
    # 3. termite mounds: tall lumpy spires of baked earth
    gt, gt2 = pt.g(SS["termite"], outline=0.3), pt.g(SS["termite_dk"], outline=0.3)
    for k, (x, y, h) in enumerate(((180, 380, 40), (214, 392, 26), (720, 372, 46), (760, 384, 30), (1050, 390, 38), (1300, 376, 44), (-120, 386, 34))):
        z = 34
        (gt if k % 2 else gt2).lathe([(0.01, 0), (h * 0.32, 0), (h * 0.24, h * 0.3), (h * 0.18, h * 0.62), (h * 0.08, h * 0.92), (0.01, h)], (x, y, z), (x, y, z + h), segs=12)
        for j in range(3):
            rock(gt2, (x + rnd.uniform(-4, 4), y - 2, z + h * rnd.uniform(0.3, 0.7)), (h * 0.12, h * 0.1, h * 0.12), seed=300 + k * 3 + j, jag=0.3, p=2.0, cuts=2)
    # 4. flat-topped acacias across the plain, a few far grazers
    ga, ga2, gb = pt.g(SS["acacia"], outline=0.3), pt.g(SS["acacia_dk"], outline=0.3), pt.g(SS["bark"], outline=0.0)
    for k in range(16):
        x = rnd.uniform(-250, 1450)
        if 330 < x < 620:
            continue
        y = rnd.uniform(380, 520)
        h = rnd.uniform(22, 34)
        z = 34 if y < 450 else 50
        gb.capsule((x, y, z), (x + rnd.uniform(-2, 2), y, z + h * 0.7), 1.0, 0.7)
        gb.capsule((x, y, z + h * 0.5), (x - h * 0.2, y, z + h * 0.8), 0.6)
        gb.capsule((x, y, z + h * 0.5), (x + h * 0.22, y, z + h * 0.82), 0.6)
        (ga if k % 2 else ga2).blob((x, y, z + h * 0.88), (h * 0.62, h * 0.3, h * 0.13), p=2.2, cuts=3)
    gd = pt.g(SS["hide"], outline=0.0)
    for k in range(12):
        x = rnd.uniform(-200, 1400)
        if 360 < x < 600:
            continue
        gd.blob((x, 420, 46), (4.2, 2.0, 2.6), p=2.2)
    # 5. a hunters' camp at the arch's foot: two hide tents and a fire (lit at night)
    for k, (dx, r, h) in enumerate(((-110, 9.0, 20.0), (-90, 7.0, 16.0))):
        kit.hide_tent(pt, ax + dx, 352, 34, r, h, hide=SS["hide"], seed=50 + k)
    st.light((ax - 100, 344, 38), 5)
    st.amb("emit", "bd.puff", (ax - 100, 344, 50), rate=0.3, speed=6, scale=0.7, tint=0xE8E2D6, alpha=0.3, life=3200, drift=5)
    pt.flush(st)


def ss_mid(st, P):
    pt = Parts()
    rnd = random.Random(89)
    px, py, pz, prx, pry = SS_POND
    # the bank: golden grass, lower where the watering hole lies
    g, g2 = pt.g(SS["grass"], outline=0.0), pt.g(SS["grass_lt"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        low = abs(x - px) < prx + 30
        rock(g if i % 2 else g2, (x, 80, 8), (96, 60, (30 if low else 40) + rnd.uniform(0, 10)), seed=i, jag=0.05, p=2.4)
    # tall grass clumps all along (two of them sway: props)
    gg, gg2 = pt.g(SS["straw"], finish="hair", outline=0.4), pt.g(SS["grass_dk"], finish="hair", outline=0.4)
    for i in range(46):
        x = rnd.uniform(-250, 1450)
        if abs(x - px) < prx - 10:
            continue
        cx, cz = x, rnd.uniform(38, 46)
        for j in range(5):
            a = -0.5 + j * 0.25 + rnd.uniform(-0.08, 0.08)
            L = rnd.uniform(16, 26)
            (gg if (i + j) % 2 else gg2).capsule((cx, rnd.uniform(30, 50), cz), (cx + math.sin(a) * L, rnd.uniform(30, 50), cz + math.cos(a) * L), 0.9, 0.3)
    # 1. the watering hole (x 220-460, low: the arch stands behind it at the game's camera): grey-teal
    # water in a muddy rim, reeds, bones at the edge
    pt.g(SS["mud"], outline=0.3).blob((px, py, pz - 0.6), (prx + 10, pry + 6, 1.6), p=2.4, cuts=3)
    pt.g(SS["water"], finish="gloss", outline=0.3).blob((px, py, pz), (prx, pry, 1.6), p=2.6, cuts=3)
    gwh = pt.g(SS["water_hi"], outline=0.0, highlight=False)
    for k in range(5):
        gwh.blob((px + rnd.uniform(-0.7, 0.7) * prx, py - pry * rnd.uniform(0.1, 0.6), pz + 1.7), (rnd.uniform(10, 20), 1.2, 0.3), p=2.4, cuts=2)
    gbo = pt.g(SS["bone"], outline=0.3)
    gbo.capsule((px + prx * 0.7, py - pry * 0.9, pz + 1), (px + prx * 0.7 + 12, py - pry * 0.9 - 2, pz + 2), 1.2)
    gbo.sphere((px + prx * 0.7 + 14, py - pry * 0.9 - 2, pz + 3), 2.6)
    # 2. flat-topped acacias, big (the lane's frame) and one fallen trunk
    ga, ga2, gb = pt.g(SS["acacia"], outline=0.5), pt.g(SS["acacia_dk"], outline=0.5), pt.g(SS["bark"], outline=0.4)
    for k, (x, y, h) in enumerate(((-180, 110, 140), (90, 120, 120), (560, 124, 130), (980, 116, 150), (1300, 120, 126))):
        z = 34
        gb.capsule((x, y, z), (x + 4, y, z + h * 0.6), 4.6, 3.2)
        for side in (-1, 1):
            gb.capsule((x + 4, y, z + h * 0.6), (x + side * h * 0.32, y, z + h * 0.86), 2.4, 1.4)
            gb.capsule((x + side * h * 0.12, y, z + h * 0.72), (x + side * h * 0.18, y + 4, z + h * 0.9), 1.6, 1.0)
        for j, (dx, w) in enumerate(((-0.3, 0.42), (0.28, 0.4), (0.0, 0.5))):
            (ga if (k + j) % 2 else ga2).blob((x + dx * h, y, z + h * (0.92 if j < 2 else 0.98)), (h * w, h * 0.2, h * 0.09), p=2.2, cuts=3)
    gb.capsule((1100, 60, 40), (1160, 66, 43), 4.0, 3.2)
    # 3. the sabre-tooth's rock (x 700) (the cat itself is a prop: its tail flicks)
    cx, cy, cz = SS_CAT
    grk, grk2 = pt.g(SS["rock"], outline=0.5), pt.g(SS["rock_dk"], outline=0.5)
    rock(grk, (cx, cy, 40 + (cz - 40) / 2), (36, 22, (cz - 40) / 2 + 2), seed=91, jag=0.12, p=3.0)
    rock(grk2, (cx - 30, cy - 6, 50), (18, 14, 12), seed=92, jag=0.18, p=2.4)
    rock(grk2, (cx + 32, cy - 4, 46), (14, 12, 8), seed=93, jag=0.18, p=2.4)
    st.light((cx - 14.6 * 1.6, cy - 6, cz + 14.4 * 1.6), 1.6)
    # a boulder and dry bushes elsewhere
    gbu = pt.g(SS["grass_dk"], outline=0.5)
    for i in range(12):
        x = rnd.uniform(-240, 1440)
        if 200 < x < 480:
            continue
        kit.round_bush(gbu, x, rnd.uniform(40, 70), rnd.uniform(6, 10), seed=1200 + i, z=40, flat=0.6)
    pt.flush(st)


def _grass_sway(f):
    return {"g": {"r": (-6, -2, 6, 2)[f]}}


def _grass_clump(rig):
    """A tall grass clump bending in the wind on its joint."""
    rig.joint("g", "all", (0, 0, 0))
    rnd = random.Random(5)
    g, g2 = Geo(), Geo()
    for j in range(9):
        a = -0.6 + j * 0.15 + rnd.uniform(-0.06, 0.06)
        L = rnd.uniform(22, 34)
        (g if j % 2 else g2).capsule((rnd.uniform(-3, 3), rnd.uniform(-2, 2), 0), (math.sin(a) * L, rnd.uniform(-2, 2), math.cos(a) * L), 1.0, 0.3)
    rig.part("g", g, "#C2AC72", finish="hair", outline=0.4)
    rig.part("g", g2, "#AE9A62", finish="hair", outline=0.4)


def ss_props():
    cx, cy, cz = SS_CAT
    cat = _scr((cx - 4, cy - 4, cz - 2), SS_MID_E)
    vulture = fauna.bird(body="#4E4440", wing="#3E3632", belly="#6E625A", beak="#C8B090", span=17, size=1.1)
    ring = [[i * 3, round(700 + 100 * math.cos(math.pi * i / 3)), round(-252 + 16 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    g1 = _scr((150, 44, 40), SS_MID_E)
    g2 = _scr((860, 50, 40), SS_MID_E)
    plist = [
        Prop("cat", "mid", fauna.sabretooth(size=1.6), [{"tail": {"r": a}} for a in (0, 14, 26, 10)], (70, 40, 4), cat[1]),
        Prop("grass", "mid", _grass_clump, [_grass_sway(f) for f in range(4)], (60, 40, 3), g1[1]),
        Prop("deer", "mid", fauna.giant_deer(size=1.4), [fauna.walk4_pose(f, swing=14, bob=0.5, head=2.0) for f in range(4)], (80, 64, 3), SS_DEER_Y),
        Prop("vulture", "far", vulture, [fauna.bird_pose(f) for f in range(5)], (50, 26, 26), ring[0][2]),
        PaintedProp("devil", "far", lambda i: fauna.dust_devil(i), 4, ax=0.5, ay=1.0, ppl=0.9),
    ]
    sprites = [
        {"kind": "loop", "layer": "mid", "frames": ["cat_0", "cat_0", "cat_1", "cat_2", "cat_3", "cat_1", "cat_0", "cat_0"], "fps": 4, "at": cat},
        {"kind": "loop", "layer": "mid", "frames": [f"grass_{i}" for i in range(4)], "fps": 3, "pingpong": True, "at": g1},
        {"kind": "loop", "layer": "mid", "frames": [f"grass_{i}" for i in (2, 3, 0, 1)], "fps": 3, "pingpong": True, "at": g2},
        {"kind": "path", "layer": "mid", "fps": 3, "periodS": 120,
         "keys": [[0, 1560, SS_DEER_Y, 0], [4, 1520, SS_DEER_Y, 1], [100, 820, SS_DEER_Y, 1], [104, 790, SS_DEER_Y, 0], [120, 790, SS_DEER_Y, 0]],
         "group": [{"frames": [f"deer_{i}" for i in range(4)]}]},
        {"kind": "path", "layer": "far", "fps": 7, "periodS": 20, "keys": ring,
         "group": [{"frames": ["vulture_4", "vulture_4", "vulture_4", "vulture_0", "vulture_1", "vulture_2", "vulture_3"]},
                   {"frames": ["vulture_4", "vulture_4", "vulture_0", "vulture_1", "vulture_2", "vulture_3", "vulture_4"], "dx": -30, "dy": 10, "phase": 3}]},
        # the signature: a dust devil crosses the plain every 40 s
        {"kind": "path", "layer": "far", "fps": 8, "periodS": 40, "face": "fixed",
         "keys": [[0, 1480, SS_DEVIL_Y, 0], [3, 1400, SS_DEVIL_Y, 1], [20, 760, SS_DEVIL_Y, 1], [23, 680, SS_DEVIL_Y, 0], [40, 680, SS_DEVIL_Y, 0]],
         "group": [{"frames": [f"devil_{i}" for i in range(4)]}]},
    ]
    return plist, sprites


SCENES = {
    "classic": Scene("stone", "classic", SM_PAL, sm_far, sm_mid, back=sm_back, sky=SM_SKY, props=sm_props,
                     hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.45}, ground="earth",
                     # clear summer air: a little less haze on the far layer, so the volcano has presence
                     look={"far": (0.2, 0.1, 0.22)}),
    "glacier_valley": Scene("stone", "glacier_valley", GV_PAL, gv_far, gv_mid, back=gv_back, sky=GV_SKY, props=gv_props,
                            hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.5}, ground="earth"),
    "sabre_savanna": Scene("stone", "sabre_savanna", SS_PAL, ss_far, ss_mid, back=ss_back, sky=SS_SKY, props=ss_props,
                           hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.45}, ground="earth",
                           look={"far": (0.2, 0.1, 0.22)}),
}
