"""Bronze Age scenes (Bronze Age: Hellas; DESIGN A17.12: stepped temples, colonnades, olive hills, a
distant volcano).

Classic "Hill Temples" (format 2, the first Blender layers for Bronze): olive hills under a clear Aegean
sky; an acropolis with a Doric temple, a round tholos and terraced walls on its hill, a white village,
and a long colonnade on the far right; olive groves, cypresses, a vineyard terrace and a small shrine
with a burning brazier in the mid-ground. Ambient: the brazier flickers, a goatherd drives his goats
along the mid-ground, the volcano smokes, gulls (the code flocks).

Palette (A17.12): sandstone #CDBE9E, verdigris #4F8F7F, dusk plum #6A5566, polished bronze #B8863B as a
small accent; olive and scrub greens kept under 40% saturation (A11 colour rule for backdrops).

Layout note: the arena ground covers everything below screen y = -40 lu, so mid-ground objects stand on
a bank whose visible top is at -50..-75 lu; their feet may hide behind the grass verge.
"""
import math
import random

from ageborn_art.geometry import Geo

from world.common import box, cyl, rock
from world.scenes import fauna, kit
from world.scenes.common import Prop, Scene, lt, mixc, ridge
from world.scenes.kit import Parts

PAL = dict(skyTop=0x7FAED0, skyBottom=0xF2E4C8, light=0xFFF0CC, far=0xA79C94, mid=0x8E8C6A, near=0x6E7650)
K = dict(
    limestone=0xD9CCB0, sand=0xC8B48E, earth=0xAE9874, hill=0xA29E76, bank=0x9C9C6C, grass=0x969C66, scrub=0x88925E, scrub_dk=0x6C7852,
    olive=0x9AA77E, olive_dk=0x82926A, cypress=0x52704E, cypress_dk=0x45603F, trunk=0x7C6A58,
    marble=0xEAE3D4, trim=0xD2C6AC, roof=0xA9836B, plum=0x6A5566, verdigris=0x5F9484, bronze=0xB8863B,
    whitewash=0xEEE8DB, stone=0xC2B49C, rock=0xAC9E8A, vine=0x7E8C58,
)
# The sun sits over the left half (with your base at the left, the strips' x 0-800 show; from about 850 the
# seam cross-fades into the other age) and well clear of the volcano: rays fanning straight down over a
# cone read as one huge mountain. The volcano also stays left of where the sky themes hang their moons
# (x 820-980), so a night sky keeps its moon.
SKY = {"top": "#7FAED0", "bottom": "#F2E4C8", "horizon": "#F5EAD4", "cloudTint": "#F8F2E6", "celestial": "sun",
       "sunAt": [380, -520, 46]}
VOLCANO_X = 620.0
MID_E = math.radians(12.0)
# the shrine's brazier (mid layer): bowl rim position and its screen point (lu, y down)
BRAZIER = (304.0, 50.0, 42.0)
BRAZIER_TOP = BRAZIER[2] + 25.5
BRAZIER_AT = [BRAZIER[0], -round(BRAZIER_TOP * math.cos(MID_E) + BRAZIER[1] * math.sin(MID_E), 1)]
HERD_Y = -57.0


def back(st, P):
    """A hazy Aegean sea on the horizon with a smoking volcanic island and two small islands."""
    haze = lambda c, t=0.45: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    # the sea's horizon at screen y -219, below where a sky theme hangs its moon (y -250): the moon stays in
    # the sky instead of showing through the sea
    sea = pt.g(haze(0x9DB0AE, 0.42), finish="gloss", outline=0.0)
    box(sea, (600, 1560, 54), (1100, 340, 4), p=6, cuts=2)
    g = pt.g(haze(0x9A9298, 0.36), outline=0.0)
    vx = VOLCANO_X
    g.lathe([(0, 0), (175, 0), (124, 30), (52, 128), (38, 142), (25, 138), (0, 135)], (vx, 1500, 50), (vx, 1500, 192),
            segs=36)
    rock(g, (300, 1650, 50), (120, 60, 40), seed=3, jag=0.08, p=2.4)
    rock(g, (1250, 1600, 50), (110, 50, 38), seed=4, jag=0.08, p=2.4)
    gd = pt.g(haze(0x887E86, 0.38), outline=0.0)
    for a in (-0.45, -0.1, 0.3):
        gd.capsule((vx + 44 * a, 1462, 182), (vx + 160 * a, 1400, 66), 4, 9)
    pt.flush(st)
    st.amb("emit", "fx.p.smoke", (vx, 1500, 196), rate=0.8, speed=8, scale=3.0, tint=lt(0xB8AEB4, 0.45), alpha=0.4,
           life=4600)


def far(st, P):
    pt = Parts()
    rnd = random.Random(11)
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    # 1. the distant ridge, pale lilac-grey (lower on the right, where the sea and the volcano show)
    ridge(st, hz(0xA09AA8, 0.36), -300, 640, -10, 175, 520, 3, lumps=7, jag=0.12, peaks=False)
    ridge(st, hz(0xA09AA8, 0.36), 560, 1500, -30, 120, 540, 13, lumps=6, jag=0.1, peaks=False)
    # 2. the main hills: the acropolis (x 420), the village knoll (x 820), the stoa terrace (x 1160)
    g = pt.g(hz(K["hill"], 0.1), outline=0.0)
    kit.hill(g, 420, 300, 0, 250, 90, 118, seed=4, jag=0.05, p=2.6)
    kit.hill(g, 820, 330, -10, 190, 90, 115, seed=5, jag=0.06)
    kit.hill(g, 1170, 300, 0, 240, 90, 125, seed=6, jag=0.05, p=2.6)
    kit.hill(g, 40, 330, -10, 230, 90, 118, seed=7, jag=0.06)
    kit.hill(g, -230, 300, -10, 120, 80, 92, seed=8)
    kit.hill(g, 1430, 320, -10, 140, 80, 98, seed=9)
    # scrub on the hill flanks (maquis)
    gs = pt.g(hz(K["scrub_dk"], 0.08), outline=0.0)
    gs2 = pt.g(hz(K["scrub"], 0.08), outline=0.0)
    for i in range(150):
        x = rnd.uniform(-260, 1460)
        kit.round_bush(gs if i % 3 else gs2, x, rnd.uniform(215, 250), rnd.uniform(5, 10), seed=100 + i, z=rnd.uniform(36, 100))
    # the acropolis: terraces (retaining walls with stairs), the temple, a tholos, cypresses
    gw = pt.g(K["stone"], outline=0.5)
    for (x0, x1, z, d) in ((300, 560, 76, 236), (330, 530, 104, 252)):
        box(gw, ((x0 + x1) / 2, d, z - 12), ((x1 - x0) / 2, 14, 14), p=6, cuts=2)
        box(pt.g(K["sand"], outline=0.0), ((x0 + x1) / 2, d + 10, z + 1.5), ((x1 - x0) / 2 - 2, 16, 1.6), p=5, cuts=1)
    kit.stairs(pt.g(K["trim"], outline=0.4), 352, 222, 52, 76, 14, 14)
    kit.stairs(pt.g(K["trim"], outline=0.4), 498, 240, 82, 104, 12, 12)
    kit.temple(pt, 430, 262, 104, 150, 64, 88, 6, yaw=-14, stone=K["marble"], roof=K["roof"], trim=K["trim"], dark=K["plum"])
    kit.tholos(pt, 548, 238, 76, 17, 64, cols=8, stone=K["marble"], roof=K["verdigris"], trim=K["trim"], dark=K["plum"])
    st.light((432, 230, 142), 6)
    st.amb("emit", "fx.p.smoke", (382, 236, 110), rate=0.5, speed=8, scale=1.1, tint=lt(0xA89E98, 0.45), alpha=0.4,
           life=3000)
    gc, gt = pt.g(hz(K["cypress"], 0.06), outline=0.4), pt.g(K["trunk"], outline=0.0)
    for x, y, z, h in ((318, 226, 76, 48), (334, 228, 76, 40), (586, 226, 76, 52), (604, 230, 74, 42),
                       (262, 210, 52, 46), (640, 214, 60, 44)):
        kit.cypress(gc, gt, x, y, h, h * 0.13, seed=int(x), z=z)
    # the white village on its knoll
    for i, (x, z, w, h) in enumerate(((730, 56, 22, 16), (756, 70, 18, 14), (782, 80, 24, 18), (806, 86, 18, 15),
                                      (832, 82, 22, 17), (858, 72, 20, 14), (884, 60, 24, 16), (770, 46, 20, 13),
                                      (842, 50, 18, 13), (812, 64, 16, 12))):
        roof = K["roof"] if i % 3 == 0 else None
        wx, wy, wz = kit.cube_house(pt, x, 300 - z * 0.4, z, w, h, 14, yaw=rnd.uniform(-16, 16), wall=K["whitewash"],
                                    roof=roof, dark=K["plum"], windows=1 + (i % 2), seed=i)
        if i % 2 == 0:
            st.light((wx, wy, wz), 4)
    for x, z, h in ((716, 52, 34), (900, 56, 38), (790, 90, 30)):
        kit.cypress(gc, gt, x, 300 - z * 0.4 + 6, h, h * 0.13, seed=int(x) + 1, z=z)
    # the stoa terrace: a long colonnade under a tiled roof, and a small temple on the knoll above it
    box(gw, (1150, 236, 94), (150, 14, 12), p=6, cuts=2)
    kit.temple(pt, 1140, 252, 104, 230, 44, 60, 11, yaw=0, stone=K["marble"], roof=K["roof"], trim=K["trim"],
               dark=K["plum"], steps_n=2, pediment=False)
    box(pt.g(K["roof"], outline=0.5), (1140, 256, 172), (122, 26, 4.2), p=5, rot=(-14, 0, 0), cuts=2)
    kit.temple(pt, 1290, 286, 124, 80, 40, 66, 4, yaw=12, stone=K["marble"], roof=K["roof"], trim=K["trim"], dark=K["plum"])
    for x, z, h in ((1030, 94, 44), (1046, 94, 36), (1360, 112, 44), (1222, 124, 40)):
        kit.cypress(gc, gt, x, 232, h, h * 0.13, seed=int(x) + 2, z=z)
    # a cyclopean wall with a gate tower winding over the left hill
    gb = pt.g(K["stone"], outline=0.4)
    pts = [(-160, 70), (-80, 96), (0, 112), (80, 118), (150, 104)]
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        n = int(math.hypot(bx - ax, bz - az) / 9)
        for k in range(n):
            t = k / n
            rock(gb, (ax + (bx - ax) * t, 250, az + (bz - az) * t), (5.6, 6, 6.4), seed=k + int(ax), jag=0.12, p=3.0, cuts=2)
    box(gb, (0, 246, 128), (14, 12, 22), p=6, cuts=2)
    box(pt.g(K["plum"], outline=0.0, highlight=False), (0, 233, 116), (4, 1, 7), p=4, cuts=1)
    # 3. the near hills along the foot, with olive dots and cypresses
    g = pt.g(hz(K["scrub"], 0.04), outline=0.0)
    for i in range(12):
        x = -300 + i * 160 + rnd.uniform(-30, 30)
        kit.hill(g, x, 140, 0, rnd.uniform(110, 150), 60, rnd.uniform(70, 100), seed=40 + i, jag=0.05)
    go, got = pt.g(K["olive"], outline=0.3), pt.g(K["trunk"], outline=0.0)
    for i in range(46):
        x = rnd.uniform(-250, 1450)
        kit.olive(go, got, x, rnd.uniform(96, 120), 0.62, seed=200 + i, z=rnd.uniform(52, 84))
    for i in range(14):
        x = rnd.uniform(-240, 1440)
        kit.cypress(gc, gt, x, 104, rnd.uniform(26, 38), 4.2, seed=300 + i, z=rnd.uniform(52, 80))
    pt.flush(st)


def mid(st, P):
    pt = Parts()
    rnd = random.Random(21)
    # the ground: a rolling bank whose top shows above the lane's grass verge
    g = pt.g(K["bank"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g, (x, 80, 8), (96, 60, 38 + rnd.uniform(0, 12)), seed=i, jag=0.05, p=2.4)
    gg = pt.g(K["grass"], finish="hair", outline=0.3)
    for i in range(70):
        x = rnd.uniform(-250, 1450)
        kit.round_bush(gg, x, rnd.uniform(26, 44), rnd.uniform(4, 7), seed=1000 + i, z=rnd.uniform(36, 46), flat=0.6)
    # vineyard terraces (x 700-1010): stone walls and rows of vines on posts
    gw, gv, gp = pt.g(K["stone"], outline=0.5), pt.g(K["vine"], outline=0.4), pt.g(K["trunk"], outline=0.0)
    for k, (z, d) in enumerate(((44, 90), (60, 112), (76, 134))):
        kit.dry_wall(gw, 690 + k * 18, 1020 - k * 14, d - 14, z - 14, 14, seed=50 + k, block=10)
        for i in range(int((330 - k * 32) / 17)):
            x = 702 + k * 18 + i * 17
            gp.capsule((x, d - 4, z), (x, d - 4, z + 13), 0.8)
            kit.round_bush(gv, x, d - 6, 6.0, seed=600 + k * 40 + i, z=z + 4, flat=0.8)
    # olive groves on the bank
    go, got = pt.g(K["olive"], outline=0.5), pt.g(K["trunk"], outline=0.4)
    go2 = pt.g(K["olive_dk"], outline=0.5)
    for i, (x, y, s) in enumerate(((-210, 66, 2.1), (-150, 82, 1.8), (-60, 70, 2.3), (40, 88, 1.9), (110, 66, 2.2),
                                   (420, 70, 2.0), (500, 86, 2.3), (580, 68, 1.9), (1080, 72, 2.2), (1160, 86, 2.0),
                                   (1240, 70, 2.3), (1320, 84, 1.9), (1410, 68, 2.1))):
        kit.olive(go if i % 3 else go2, got, x, y, s, seed=700 + i, z=30)
    # cypress groups: vertical accents
    gc, gc2, gt = pt.g(K["cypress"], outline=0.5), pt.g(K["cypress_dk"], outline=0.5), pt.g(K["trunk"], outline=0.4)
    for i, (x, h) in enumerate(((-110, 128), (-92, 104), (170, 140), (192, 112), (380, 120), (640, 136), (662, 108),
                                (1040, 124), (1210, 140), (1230, 112), (1380, 130))):
        kit.cypress(gc if i % 2 else gc2, gt, x, 58 + (i % 3) * 8, h, h * 0.12, seed=800 + i, z=26)
    # the shrine (x 255) on a knoll: a small temple front, amphorae and the bronze brazier
    rock(pt.g(K["bank"], outline=0.0), (262, 70, 14), (92, 44, 34), seed=33, jag=0.05, p=2.6)
    kit.temple(pt, 246, 76, 42, 70, 32, 80, 2, yaw=-10, stone=K["marble"], roof=K["roof"], trim=K["trim"], dark=K["plum"],
               steps_n=2)
    gb = pt.g(K["bronze"], finish="bronze", outline=0.5)
    gi = pt.g(0x5A4A3A, outline=0.4)
    bx, by, bz = BRAZIER
    for a in (0, 2.1, 4.2):
        gi.capsule((bx + math.cos(a) * 7, by + math.sin(a) * 3.8, bz), (bx + math.cos(a) * 1.8, by + math.sin(a) * 1.2, bz + 20), 1.1)
    gb.lathe([(0.2, 0), (8.0, 0.8), (10.2, 4.5), (10.8, 6.5), (0.2, 6.8)], (bx, by, bz + 18.7), (bx, by, BRAZIER_TOP), segs=16)
    st.light((bx, by, BRAZIER_TOP + 6), 9)
    st.amb("emit", "fx.p.smoke", (bx, by, BRAZIER_TOP + 14), rate=0.7, speed=10, scale=0.9, tint=0xE8E2D8, alpha=0.35,
           life=2600)
    ga = pt.g(K["roof"], outline=0.5)
    for x, y in ((196, 56), (207, 60), (218, 54)):
        ga.lathe([(0.2, 0), (2.2, 0.4), (4.4, 4), (4.6, 7), (2.4, 12), (1.6, 13.6), (2.2, 15), (0.2, 15.2)], (x, y, 42),
                 (x, y, 57.2), segs=12)
    # rocks on the bank
    gr = pt.g(K["rock"], outline=0.5)
    for i in range(14):
        x = rnd.uniform(-240, 1440)
        rock(gr, (x, rnd.uniform(30, 50), 34), (rnd.uniform(8, 14), 8, rnd.uniform(6, 10)), seed=950 + i, jag=0.18)
    pt.flush(st)


# -- props ----------------------------------------------------------------------------------------
FLAME_SHAPES = [(1.0, 0.0), (1.14, 1.4), (0.9, -1.2), (1.06, 0.6)]


def _flame_build(rig):
    """The brazier's flame: four licking shapes, one hidden joint per frame (glow, no outline)."""
    for f, (h, lean) in enumerate(FLAME_SHAPES):
        j = rig.joint(f"f{f}", "all", (0, 0, 0), hidden=True)
        g = Geo().blob((0, 0, 9.4 * h), (7.4, 4.3, 10.2 * h), p=2.0, taper=(1.0, 0.18), shift=(lean * 0.12, 0))
        rig.part(j, g, glow="#FFC77E", outline=0)
        g = Geo().blob((0, -1.9, 7.6 * h), (4.3, 2.7, 7.0 * h), p=2.0, taper=(1.0, 0.22), shift=(lean * 0.1, 0))
        rig.part(j, g, glow="#FFE7B4", outline=0)
        g = Geo().blob((0.5 * lean, -3.2, 4.8), (2.2, 1.6, 4.0), p=2.0, taper=(1.0, 0.3))
        rig.part(j, g, glow="#FFF7E2", outline=0)


def _herder(rig):
    rig.joint("legF", "all", (0, 0, 10))
    rig.joint("legB", "all", (0, 0, 10))
    rig.joint("body", "all", (0, 0, 10))
    rig.part("legB", Geo().capsule((0.6, 2, 0), (0.2, 2, 10), 1.5), "#7A5E48", outline=0.5)
    rig.part("legF", Geo().capsule((0.6, -1, 0), (0.2, -1, 10), 1.5), "#8C6C52", outline=0.5)
    rig.part("body", Geo().lathe([(0.2, 0), (6.0, 0), (4.6, 9), (3.2, 15), (0.2, 16)], (0, 0, 7), (0, 0, 23), segs=12),
             "#C9B89A", outline=0.6)
    rig.part("body", Geo().sphere((0.8, -0.4, 26.6), 3.6), "#D9A882", outline=0.6)
    rig.part("body", Geo().lathe([(0.2, 0), (7.6, 0.2), (7.6, 1.2), (3.4, 1.6), (3.0, 3.6), (0.2, 4.0)], (0.6, 0, 28.6),
                                 (0.6, 0, 32.6), segs=14), "#A88C64", outline=0.6)
    rig.part("body", Geo().capsule((6.0, -3.0, 0), (5.0, -3.0, 30), 0.8), "#6E5A48", outline=0.5)


def _herder_pose(f):
    a = [24, 0, -24, 0][f]
    bob = [0.0, 0.8, 0.0, 0.8][f]
    return {"legF": {"r": a, "z": bob}, "legB": {"r": -a, "z": bob}, "body": {"z": bob}}


def _goat(color, dark):
    def build(rig):
        for leg, (x, y) in {"lf": (5, -2), "lb": (-5, -2), "rf": (5, 2), "rb": (-5, 2)}.items():
            rig.joint(leg, "all", (x, y, 7))
            rig.part(leg, Geo().capsule((x, y, 0), (x, y, 7), 0.9), dark if y > 0 else color, outline=0.5)
        rig.joint("body", "all", (0, 0, 8))
        rig.part("body", Geo().blob((0, 0, 9.5), (8.2, 3.6, 4.4), p=2.2), color, outline=0.6)
        rig.part("body", Geo().blob((9.6, -0.4, 13.6), (3.2, 2.2, 2.6), p=2.2, rot=(0, 26, 0)), color, outline=0.6)
        g = Geo().capsule((8.6, -0.6, 15.8), (6.2, -0.6, 19.2), 0.7, 0.4)
        g.capsule((8.8, 0.8, 15.8), (6.6, 0.8, 19.0), 0.7, 0.4)
        rig.part("body", g, dark, outline=0.4)
        rig.part("body", Geo().capsule((-7.6, 0, 12), (-9.6, 0, 14.4), 0.9, 0.5), color, outline=0.4)
    return build


def _goat_pose(f):
    a = [22, 8, -22, -8][f]
    bob = [0.0, 0.6, 0.0, 0.6][f]
    return {"lf": {"r": a, "z": bob}, "rb": {"r": a, "z": bob}, "rf": {"r": -a, "z": bob}, "lb": {"r": -a, "z": bob},
            "body": {"z": bob}}


def props():
    plist = [
        Prop("flame", "mid", _flame_build, [{f"f{f}": {"show": True}} for f in range(4)], (22, 30, 2), BRAZIER_AT[1],
             outline=False),
        Prop("herder", "mid", _herder, [_herder_pose(f) for f in range(4)], (24, 38, 3), HERD_Y),
        Prop("goat", "mid", _goat("#E6DFCF", "#5E5048"), [_goat_pose(f) for f in range(4)], (30, 24, 3), HERD_Y),
        Prop("goatb", "mid", _goat("#A88B6E", "#4E4038"), [_goat_pose(f) for f in range(4)], (30, 24, 3), HERD_Y),
    ]
    sprites = [
        {"kind": "loop", "layer": "mid", "frames": [f"flame_{i}" for i in range(4)], "fps": 9, "at": BRAZIER_AT},
        {"kind": "path", "layer": "mid", "fps": 6, "periodS": 96,
         "keys": [[0, -330, HERD_Y, 1], [96, 1530, HERD_Y, 1]],
         "group": [
             {"frames": [f"goat_{i}" for i in range(4)], "dx": 0, "dy": 0},
             {"frames": [f"goatb_{i}" for i in range(4)], "dx": -24, "dy": 2, "phase": 1},
             {"frames": [f"goat_{i}" for i in range(4)], "dx": -44, "dy": -2, "phase": 2},
             {"frames": [f"herder_{i}" for i in range(4)], "dx": -70, "dy": 1, "phase": 1},
         ]},
    ]
    return plist, sprites


# -- Aegean Harbour (round 2; Rare, Time Capsule) ----------------------------------------------------
# A white island town stacked on a limestone headland over a teal-grey sea, a lighthouse with a fire on
# its islet, distant islands on a hazy horizon; in front a stone quay with moored galleys, nets, amphorae
# and cypresses. The harbour sits above the lane (a raised quay), so its water shows over the mid bank.
# Ambient: a galley sails across (`path`), moored galleys bob, the lighthouse fire flickers and smokes,
# gulls circle the lighthouse; town windows, quay lanterns and the lighthouse glow under night skies.
# Palette (PLAN 2b): whitewash #E8E2D4, sea teal #7FA3A6 (low saturation: the sea's hue sits in the
# team-blue band), terracotta toned to #A88270, limestone #C8B89C, cypress #52704E.
AH_PAL = dict(skyTop=0x84B2CE, skyBottom=0xEEF0E8, light=0xFFF6E2, far=0xA8A49A, mid=0x8E8C78, near=0x6E7458)
AH = dict(
    sea=0x7FA3A6, sea_far=0x8EAEAE, sea_hi=0xC4D6D2, harbour=0x739A9C, white=0xEDE7DA, white2=0xE2DACB, terracotta=0xA88270,
    roof_dk=0x8E6A5C, lime=0xC8B89C, lime_dk=0xA8987E, rock=0xA49680, dark=0x5E5260, door=0x6A5868, cypress=0x52704E,
    cypress_dk=0x45603F, trunk=0x7C6A58, quay=0xC2B498, quay_dk=0xA89A80, wood=0x7A6450, net=0x6E6A5E, amphora=0xA87C64,
    olive=0x9AA77E, dome=0x8E9EA6, bronze=0xB8863B, rope=0xB8A47E,
)
AH_SKY = {"top": "#84B2CE", "bottom": "#EEF0E8", "horizon": "#F4F2EA", "cloudTint": "#F8F6F0", "celestial": "sun",
          "sunAt": [300, -510, 40], "clouds": 0.8}
AH_FAR_E = math.radians(8.0)
AH_MID_E = math.radians(12.0)
AH_SEA_Z = 58.0
AH_LIGHT = (792.0, 300.0, 196.0)      # the lighthouse's fire basket (far)
AH_SAIL_Y = -104.0                    # the sailing galley's waterline (far, screen lu)
AH_MOORED = ((540.0, 150.0), (900.0, 156.0))


def _scr(p, e):
    x, y, z = p
    return [round(x, 1), -round(z * math.cos(e) + y * math.sin(e), 1)]


def ah_back(st, P):
    """Distant islands peeking over the horizon (low under the moons' place, x 820-980)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    gi = pt.g(hz(0x9C9C98, 0.3), outline=0.0)
    for x, rx, h, seed in ((-140, 170, 84, 1), (140, 120, 60, 2), (560, 150, 70, 3), (1180, 200, 96, 4), (1430, 130, 64, 5), (900, 70, 30, 6)):
        rock(gi, (x, 1500, AH_SEA_Z), (rx, 60, h), seed=seed, jag=0.08, p=2.2)
    pt.flush(st)


def _headland_z(x):
    """Top of the town's headland (far) at x: a broad bump from the sea up to z 186."""
    t = max(0.0, 1.0 - ((x - 450.0) / 260.0) ** 2)
    return AH_SEA_Z + 128.0 * t ** 0.75


def ah_far(st, P):
    pt = Parts()
    rnd = random.Random(17)
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    # 1. the sea to the horizon, with pale wave crests
    box(pt.g(AH["sea"], finish="gloss", outline=0.0), (600, 760, AH_SEA_Z - 6), (1100, 580, 6), p=6, cuts=2)
    gw = pt.g(AH["sea_hi"], outline=0.0, highlight=False)
    for i in range(52):
        x = rnd.uniform(-260, 1460)
        y = rnd.uniform(200, 1100)
        L = rnd.uniform(8, 20) * (1.0 - (y - 200) / 1800)
        gw.capsule((x - L, y, AH_SEA_Z + 0.4), (x + L, y, AH_SEA_Z + 0.4), 0.9, 0.9)
    # 2. the headland: limestone ledges stepping up from the sea, each a terrace for a row of houses
    gl, gl2 = pt.g(AH["lime"], outline=0.4), pt.g(AH["lime_dk"], outline=0.4)
    # each row: (centre x, half width, base z) - the houses of a row stand on its ledge
    rows = [(430, 250, AH_SEA_Z + 26), (420, 214, AH_SEA_Z + 52), (446, 176, AH_SEA_Z + 78), (468, 132, AH_SEA_Z + 104),
            (486, 88, AH_SEA_Z + 128)]
    for L, (cx, half, zt) in enumerate(rows):
        y = 334 + L * 14
        n = max(2, int(half / 80))
        for k in range(n):
            x = cx - half + (k + 0.5) * 2 * half / n + rnd.uniform(-8, 8)
            zb = AH_SEA_Z - 8 if L == 0 else rows[L - 1][2]
            rock(gl if (k + L) % 2 else gl2, (x, y, (zb + zt) / 2), (half / n + 22, 34, (zt - zb) / 2 + 3), seed=20 + L * 10 + k, jag=0.08, p=3.4)
    for k in range(8):
        x = 200 + k * 66
        rock(gl2, (x, 304, AH_SEA_Z + 3), (26, 18, 12), seed=40 + k, jag=0.25)
    # 3. the town: whitewashed cubes crowding the terraces, a few terracotta roofs, bougainvillea on the walls
    lights = []
    for r, (cx, half, zt) in enumerate(rows):
        y = 304 + r * 14
        n = max(3, int(half * 2 / 31))
        for i in range(n):
            x = cx - half + 14 + (i + rnd.uniform(0.3, 0.7)) * (2 * half - 28) / n
            w, h = rnd.uniform(26, 34), rnd.uniform(18, 25) + (8 if rnd.random() < 0.2 else 0)
            roof = AH["terracotta"] if rnd.random() < 0.2 else None
            p = kit.cube_house(pt, x, y, zt - 2, w, h, 16, yaw=rnd.uniform(-12, 12), wall=AH["white"] if (i + r) % 3 else AH["white2"],
                               roof=roof, dark=AH["door"], windows=1, door=rnd.random() < 0.6, seed=r * 17 + i)
            lights.append(p)
    for p in lights[::3]:
        st.light(p, 4)
    # the chapel: a white drum with a pale grey-blue dome and a bell gable, on the top
    cx, cz = 500, AH_SEA_Z + 150
    gwh = pt.g(AH["white"], outline=0.5)
    rock(gl, (cx, 392, cz - 16), (60, 30, 20), seed=29, jag=0.08, p=3.4)
    box(gwh, (cx, 382, cz + 12), (22, 15, 13), p=7, cuts=2)
    cyl(gwh, (cx + 4, 382, cz + 25), (cx + 4, 382, cz + 34), 13, bevel=0.6, segs=24)
    pt.g(AH["dome"], finish="gloss", outline=0.5).lathe([(13.6 * math.cos(math.pi / 2 * k / 8), 13.6 * math.sin(math.pi / 2 * k / 8)) for k in range(9)],
                                                        (cx + 4, 382, cz + 34), (cx + 4, 382, cz + 48), segs=24)
    pt.g(AH["white"], outline=0.4).capsule((cx + 4, 382, cz + 48), (cx + 4, 382, cz + 54), 1.0)
    box(gwh, (cx - 28, 376, cz + 24), (8, 5, 22), p=6, cuts=2)
    box(pt.g(AH["dark"], outline=0.0, highlight=False), (cx - 28, 370.5, cz + 34), (3.4, 0.6, 5.2), p=4, cuts=1)
    st.light((cx - 4, 366, cz + 10), 5)
    # cypresses and olive scrub on the headland's flanks
    gc, gt = pt.g(AH["cypress"], outline=0.4), pt.g(AH["trunk"], outline=0.0)
    for x, z in ((176, AH_SEA_Z + 20), (192, AH_SEA_Z + 24), (686, AH_SEA_Z + 30), (702, AH_SEA_Z + 24), (586, AH_SEA_Z + 130), (402, AH_SEA_Z + 128)):
        kit.cypress(gc, gt, x, 372, rnd.uniform(38, 50), 5.4, seed=int(x), z=z)
    go = pt.g(AH["olive"], outline=0.3)
    for i in range(14):
        x = rnd.uniform(200, 700)
        kit.round_bush(go, x, 352, rnd.uniform(4, 7), seed=60 + i, z=_headland_z(x) - 10)
    # 4. the lighthouse on its islet: a tapered stone tower, a gallery, the fire basket
    lx, ly, lz = AH_LIGHT
    rock(gl2, (lx, ly + 8, AH_SEA_Z + 10), (56, 34, 26), seed=81, jag=0.2)
    rock(gl, (lx - 34, ly, AH_SEA_Z + 4), (26, 20, 14), seed=82, jag=0.25)
    gt2 = pt.g(AH["white2"], outline=0.5)
    cyl(gt2, (lx, ly, AH_SEA_Z + 24), (lx, ly, lz - 18), 13, 9, bevel=1.0, segs=20)
    for t in (0.35, 0.7):
        z = AH_SEA_Z + 24 + (lz - 18 - AH_SEA_Z - 24) * t
        cyl(pt.g(AH["lime_dk"], outline=0.0), (lx, ly, z), (lx, ly, z + 3), 13 - 4 * t + 0.5, bevel=0.3, segs=20)
    cyl(pt.g(AH["lime"], outline=0.4), (lx, ly, lz - 18), (lx, ly, lz - 14), 13, bevel=0.6, segs=20)
    gb = pt.g(AH["bronze"], finish="bronze", outline=0.5)
    gb.lathe([(0.2, 0), (6.5, 0.6), (9.0, 6), (9.4, 8), (0.2, 8.2)], (lx, ly, lz - 14), (lx, ly, lz - 5.8), segs=16)
    box(pt.g(AH["dark"], outline=0.0, highlight=False), (lx, ly - 11.5, AH_SEA_Z + 40), (2.4, 0.6, 4), p=4, cuts=1)
    st.light((lx, ly, lz + 2), 12)
    st.amb("emit", "fx.p.smoke", (lx, ly, lz + 14), rate=0.6, speed=9, scale=1.0, tint=0xE8E4DA, alpha=0.35, life=2800)
    # 5. a second island on the right with a small temple and houses
    gi = pt.g(hz(AH["rock"], 0.12), outline=0.3)
    rock(gi, (1180, 420, AH_SEA_Z + 30), (190, 50, 78), seed=91, jag=0.1, p=2.2)
    rock(gi, (1380, 440, AH_SEA_Z + 16), (110, 40, 50), seed=92, jag=0.12, p=2.2)
    kit.temple(pt, 1170, 430, AH_SEA_Z + 98, 70, 30, 48, 4, yaw=8, stone=AH["white"], roof=AH["terracotta"], trim=AH["lime"], dark=AH["dark"])
    for i, x in enumerate((1080, 1104, 1250, 1276, 1300)):
        kit.cube_house(pt, x, 420, AH_SEA_Z + 64 + (i % 2) * 8, 18, 13, 12, yaw=rnd.uniform(-12, 12), wall=AH["white"], dark=AH["door"], seed=90 + i)
    pt.flush(st)


def ah_mid(st, P):
    pt = Parts()
    rnd = random.Random(29)
    # the harbour water behind the quay
    box(pt.g(AH["harbour"], finish="gloss", outline=0.0), (600, 200, 36), (920, 110, 3), p=6, cuts=2)
    gw = pt.g(AH["sea_hi"], outline=0.0, highlight=False)
    for i in range(20):
        x = rnd.uniform(-240, 1440)
        y = rnd.uniform(120, 290)
        L = rnd.uniform(10, 22)
        gw.capsule((x - L, y, 39.4), (x + L, y, 39.4), 1.0, 1.0)
    # the quay: a paved stone mole along the bank, its harbour edge in big blocks
    box(pt.g(AH["quay"], outline=0.0), (600, 70, 24), (930, 40, 24), p=6, cuts=2)
    kit.dry_wall(pt.g(AH["quay_dk"], outline=0.4), -300, 1500, 108, 34, 14, seed=5, block=16)
    # land at both ends: rocky banks with cypresses and olives
    gl = pt.g(AH["lime_dk"], outline=0.3)
    for x, rx in ((-200, 140), (1360, 160)):
        rock(gl, (x, 120, 30), (rx, 70, 44), seed=int(x) % 97, jag=0.1, p=2.4)
    gc, gc2, gt = pt.g(AH["cypress"], outline=0.5), pt.g(AH["cypress_dk"], outline=0.5), pt.g(AH["trunk"], outline=0.4)
    for i, (x, h) in enumerate(((-230, 150), (-206, 122), (-150, 136), (-96, 112), (60, 128), (1250, 140), (1280, 112), (1350, 152),
                                (1420, 124))):
        kit.cypress(gc if i % 2 else gc2, gt, x, 90 + (i % 3) * 8, h, h * 0.12, seed=800 + i, z=44)
    go, got = pt.g(AH["olive"], outline=0.5), pt.g(AH["trunk"], outline=0.4)
    for i, x in enumerate((-60, 1180, 1440)):
        kit.olive(go, got, x, 96, 2.0, seed=700 + i, z=44)
    # bollards, amphorae, crates, coiled ropes along the quay
    gbo = pt.g(AH["dark"], outline=0.4)
    for x in range(-200, 1480, 120):
        cyl(gbo, (x, 92, 46), (x, 92, 54), 3.2, 3.6, bevel=0.8, segs=12)
    ga = pt.g(AH["amphora"], outline=0.5)
    for (x, n) in ((150, 4), (720, 3), (1050, 4)):
        for k in range(n):
            ax = x + k * 9 + rnd.uniform(-1, 1)
            ga.lathe([(0.2, 0), (2.4, 0.4), (4.8, 4.6), (5.0, 8), (2.6, 13.6), (1.7, 15.2), (2.4, 16.6), (0.2, 16.8)], (ax, 70, 46), (ax, 70, 62.8),
                     segs=12)
    gcr = pt.g(AH["wood"], outline=0.4)
    for x, s in ((190, 1.0), (206, 0.8), (760, 1.0), (1000, 0.9)):
        box(gcr, (x, 76, 46 + 7 * s), (7 * s, 7 * s, 7 * s), p=5, cuts=1)
    gr = pt.g(AH["rope"], outline=0.3)
    for x in (400, 980):
        gr.lathe([(2.0, -1.6), (7.2, -1.6), (7.2, 1.6), (2.0, 1.6)], (x, 74, 47.6), (x, 74, 48.6), segs=16, squash=(1.0, 0.6))
    # fishing nets drying on poles (x 300-380)
    gp = pt.g(AH["wood"], outline=0.4)
    for x in (300, 340, 380):
        gp.capsule((x, 82, 44), (x, 82, 100), 1.4)
    gn, gn2 = pt.g(AH["net"], outline=0.3), pt.g(0x8E8672, outline=0.0, highlight=False)
    for x0, x1 in ((300, 340), (340, 380)):
        pts = [(x0 + (x1 - x0) * t, 96 - 14 * math.sin(math.pi * t)) for t in (0, 0.25, 0.5, 0.75, 1)]
        for (ax, az), (bx, bz) in zip(pts, pts[1:]):
            gn.capsule((ax, 81, az), (bx, 81, bz), 1.0)
        for k in range(5):
            nx = x0 + (x1 - x0) * (k + 0.5) / 5
            nz = 96 - 14 * math.sin(math.pi * (k + 0.5) / 5)
            gn2.capsule((nx, 80.6, nz), (nx + 1.5, 80.6, 62), 0.5)
    # two market stalls under striped awnings (x 660-740) and a bronze statue on a plinth (x 830)
    gaw, gaw2 = pt.g(0xD8CCB0, outline=0.5), pt.g(0xA88270, outline=0.0)
    for x in (670, 730):
        for dx in (-22, 22):
            gp.capsule((x + dx, 64, 46), (x + dx, 64, 82), 1.3)
        box(gcr, (x, 66, 54), (20, 6, 7), p=5, cuts=1)
        gaw.blob((x, 66, 86), (27, 12, 4.4), p=3.2, rot=(-14, 0, 0))
        for k in range(3):
            gaw2.blob((x - 16 + k * 16, 59.6, 85), (3.4, 0.6, 3.6), p=3.0, rot=(-14, 0, 0))
        for k in range(3):
            ga.lathe([(0.2, 0), (2.0, 0.4), (3.8, 3.6), (4.0, 6.4), (2.0, 10.8), (0.2, 11)], (x - 10 + k * 10, 60, 62), (x - 10 + k * 10, 60, 73),
                     segs=10)
    box(pt.g(AH["quay_dk"], outline=0.5), (830, 76, 58), (12, 10, 12), p=6, cuts=2)
    gst = pt.g(AH["bronze"], finish="bronze", outline=0.5)
    gst.capsule((826, 76, 70), (826, 76, 86), 3.0, 3.6)
    gst.capsule((834, 76, 70), (834, 76, 86), 3.0, 3.6)
    gst.blob((830, 76, 96), (7.6, 5, 11), p=2.4)
    gst.sphere((830, 75, 112), 5.2)
    gst.capsule((838, 76, 102), (850, 74, 124), 2.0, 1.6)
    gst.lathe([(0.01, 0), (2.4, 0), (0.01, 10)], (851, 74, 125), (853, 74, 135), segs=8)
    gst.capsule((822, 76, 102), (816, 74, 88), 2.0, 1.8)
    gst.lathe([(0.01, 0), (10, 1), (10.4, 2.4), (0.01, 3)], (814, 70, 88), (813, 64, 89), segs=16)
    # quay lanterns on posts (lit under night skies)
    for x in (-40, 240, 620, 980, 1300):
        gp.capsule((x, 66, 46), (x, 66, 104), 1.2)
        box(pt.g(AH["bronze"], finish="bronze", outline=0.4), (x, 65, 108), (3.6, 3.6, 4.4), p=4, cuts=1)
        st.light((x, 63, 108), 7)
    pt.flush(st)


def _fire(rig):
    """The lighthouse fire: four licking shapes, one hidden joint per frame (glow, no outline)."""
    for f, (h, lean) in enumerate([(1.0, 0.0), (1.18, 1.4), (0.92, -1.2), (1.1, 0.6)]):
        j = rig.joint(f"f{f}", "all", (0, 0, 0), hidden=True)
        rig.part(j, Geo().blob((0, 0, 7.4 * h), (6.4, 3.8, 8.4 * h), p=2.0, taper=(1.0, 0.18), shift=(lean * 0.12, 0)), glow="#FFC77E", outline=0)
        rig.part(j, Geo().blob((0, -1.6, 6.0 * h), (3.8, 2.4, 5.8 * h), p=2.0, taper=(1.0, 0.22), shift=(lean * 0.1, 0)), glow="#FFE7B4", outline=0)
        rig.part(j, Geo().blob((0.5 * lean, -2.8, 3.8), (2.0, 1.4, 3.2), p=2.0, taper=(1.0, 0.3)), glow="#FFF7E2", outline=0)


def ah_props():
    lx, ly, lz = AH_LIGHT
    fire = _scr((lx, ly, lz - 6), AH_FAR_E)
    gull = fauna.bird(body="#E8E4DA", wing="#D6D2C8", belly="#F2EFE8", beak="#C8A060", span=12, size=1.0)
    ring = [[i * 2, round(lx + 70 * math.cos(math.pi * i / 3)), round(fire[1] - 40 + 14 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    plist = [
        Prop("fire", "far", _fire, [{f"f{f}": {"show": True}} for f in range(4)], (20, 26, 2), fire[1], outline=False),
        Prop("galley", "far", fauna.galley(size=1.0, oar_frame=0), [{}], (110, 50, 8), AH_SAIL_Y),
        Prop("galleyb", "far", fauna.galley(size=1.0, oar_frame=2), [{}], (110, 50, 8), AH_SAIL_Y),
        Prop("moor", "mid", fauna.galley(size=1.6, sail_up=False, oars=False, hull="#6E5646", hull_dk="#5A4638"), [{}], (150, 76, 8), -62),
        Prop("moorb", "mid", fauna.galley(size=1.4, sail_up=False, oars=False, hull="#7A6250", hull_dk="#624E40", sail="#D8CCB4"), [{}],
             (136, 68, 8), -62),
        Prop("gull", "far", gull, [fauna.bird_pose(f) for f in range(5)], (40, 24, 24), ring[0][2]),
    ]
    m0 = _scr((AH_MOORED[0][0], AH_MOORED[0][1], 38.0), AH_MID_E)
    m1 = _scr((AH_MOORED[1][0], AH_MOORED[1][1], 38.0), AH_MID_E)
    sprites = [
        {"kind": "loop", "layer": "far", "frames": [f"fire_{i}" for i in range(4)], "fps": 9, "at": fire},
        {"kind": "path", "layer": "far", "fps": 1.2, "periodS": 70, "keys": [[0, -340, AH_SAIL_Y, 1], [70, 1560, AH_SAIL_Y, 1]],
         "group": [{"frames": ["galley_0", "galleyb_0"]}]},
        {"kind": "bob", "layer": "mid", "frames": ["moor_0"], "fps": 1, "at": m0, "amp": [0.6, 1.2], "periodS": 4.6, "tilt": 1.4},
        {"kind": "bob", "layer": "mid", "frames": ["moorb_0"], "fps": 1, "at": m1, "amp": [0.6, 1.0], "periodS": 5.4, "tilt": 1.2},
        {"kind": "path", "layer": "far", "fps": 6, "periodS": 12, "keys": ring,
         "group": [{"frames": ["gull_4", "gull_4", "gull_0", "gull_1", "gull_2", "gull_3"]}, {"frames": ["gull_4", "gull_0", "gull_1", "gull_2"], "dx": -22, "dy": 8, "phase": 2}]},
    ]
    return plist, sprites


SCENES = {
    "classic": Scene("bronze", "classic", PAL, far, mid, back=back, sky=SKY, props=props,
                     hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.45}, ground="earth"),
    "aegean_harbour": Scene("bronze", "aegean_harbour", AH_PAL, ah_far, ah_mid, back=ah_back, sky=AH_SKY, props=ah_props,
                            hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.5}, ground="earth"),
}
