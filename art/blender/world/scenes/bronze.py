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

"Siege of the Bronze City" (format 2, round 3; Epic, Trophy Road 2,300): a walled city under siege on a
dusty plain. Back: a far ridge and low hills. Far: the city on its terraced tell: a battered mud-brick
wall with towers and merlons, the great gate with its lion relief and bronze-studded doors ajar, houses
packed on the terraces, the citadel with its columned palace, smoke columns from the burning quarters, a
scaling ladder; the giant wooden horse on its wheeled platform before the walls (the signature); the
besiegers' far tents. Mid: the siege camp: ridge and cone tents, the command pavilion with its striped
valance and standard, shield racks, spear stacks, amphorae, a parked chariot, camp fires. Ambient:
banners on the gate towers, a war chariot races along the bank every 45 s, crows, smoke; the gate,
towers, windows and camp fires glow under night skies.

Palette (PLAN 2b): mud brick #B89C78, canvas #DCD2BC, bronze #A88A5A as a small accent (the PLAN's
#B8863B desaturated).
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


# -- Siege of the Bronze City (round 3; Epic, Trophy Road 2,300) -------------------------------------
SB_PAL = dict(skyTop=0xA8B0B0, skyBottom=0xEEDDBC, light=0xFFEFCC, far=0xB0A084, mid=0x9C8E6A, near=0x7E7254)
SB = dict(
    brick=0xB89C78, brick_dk=0x9C8262, brick_lt=0xCCB492, stone=0xB4A68C, stone_dk=0x968A72, plain=0xC2B080, plain_dk=0xA8966A,
    dust=0xD2C29A, canvas=0xDCD2BC, canvas_dk=0xC0B49A, wood=0x8A7258, wood_dk=0x6E5A46, bronze=0xA88A5A, shield=0xB4A27E,
    dark=0x3E3630, roof=0x9A7E62, scrub=0x8E8E62, scrub_dk=0x76784E, olive=0x8E9870, red=0x8A5048, ember=0x5A4038, bone=0xE6DCC6,
    white=0xE2D8C2, brick_deep=0x866C50, cypress=0x5E6A4A, smoke=0x7E766E, smoke_lt=0x9A928A, smoke_dk=0x6A625C, char=0x4E4640,
    fire=0xC88A4A, hide=0xA89070,
)
SB_SKY = {"top": "#A8B0B0", "bottom": "#EEDDBC", "horizon": "#F2E4C8", "cloudTint": "#F6EEDC", "celestial": "sun",
          "sunAt": [240, -520, 44], "clouds": 0.5, "smog": 0.16}
SB_FAR_E = math.radians(8.0)
SB_MID_E = math.radians(12.0)
SB_GROUND = 40.0                       # the plain's level (far)
SB_WALL = (330.0, 790.0, 470.0, 58.0)  # the city's front wall: x0, x1, y, height (far)
SB_GATE = 540.0                        # the gate's centre (far)
SB_HORSE = (200.0, 432.0)              # the wooden horse (far): x, y (it stands taller than the walls)
SB_CHARIOT_Y = -48.0                   # the chariot's track along the bank (mid, screen lu)


def sb_back(st, P):
    """A dusty plain to low brown hills and a far blue ridge (lowest under the moons' place)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    ridge(st, hz(SB["stone_dk"], 0.5), -300, 1500, -40, 150, 1500, 13, lumps=9, jag=0.08, peaks=True)
    ridge(st, hz(SB["plain_dk"], 0.42), -300, 1500, -40, 100, 1320, 17, lumps=12, jag=0.05, peaks=False)


def _sb_tower(pt, g, gtop, x, y, z, w, d, h, yaw=0.0):
    """A battered mud-brick tower with a parapet of merlons and a dark window slit. Returns its top centre."""
    box(g, (x, y, z + h / 2), (w / 2, d / 2, h / 2), p=8, cuts=2, rot=(0, 0, yaw), taper=(1.0, 0.86))
    box(gtop, (x, y, z + h + 1.2), (w * 0.47, d * 0.47, 1.6), p=8, cuts=1, rot=(0, 0, yaw))
    for k in range(4):
        t = (k + 0.5) / 4
        box(gtop, (x - w * 0.43 + w * 0.86 * t, y - d * 0.42, z + h + 4.4), (w * 0.07, 1.6, 2.2), p=8, cuts=1, rot=(0, 0, yaw))
    pt.g(SB["dark"], outline=0.0, highlight=False).slab([(x - 1.4, z + h * 0.62), (x + 1.4, z + h * 0.62), (x + 1.4, z + h * 0.78), (x - 1.4, z + h * 0.78)],
                                                          y - d * 0.43 - 0.4, 0.8)
    return (x, y, z + h + 6)


def _smoke_plume(pt, x, y, z, H, lean, seed=0):
    """A smoke column painted into the strip: puffs that widen and lighten as they rise and lean with the
    wind (the moving smoke is an emitter at its foot)."""
    rnd = random.Random(seed)
    gs = [pt.g(SB["smoke_dk"], outline=0.15), pt.g(SB["smoke"], outline=0.12), pt.g(SB["smoke_lt"], outline=0.1)]
    n = 18
    for k in range(n):
        t = k / (n - 1)
        r = 4.5 + 16.0 * t ** 1.1
        cx = x + lean * H * t ** 1.6
        cz = z + H * t
        g = gs[min(2, int(t * 3))]
        for j in range(3):
            a = rnd.uniform(0, 2 * math.pi)
            g.blob((cx + math.cos(a) * r * 0.55, y + j * 2.5, cz + math.sin(a) * r * 0.35), (r * rnd.uniform(0.55, 0.85), r * 0.5, r * rnd.uniform(0.5, 0.7)),
                   p=2.0, cuts=3)


def _siege_tower(pt, x, y, z, h):
    """A siege tower on six wheels: a tapering timber frame clad in hides, a fighting platform with a parapet,
    its drawbridge half lowered toward the wall."""
    gw, gw2 = pt.g(SB["wood_dk"], outline=0.5), pt.g(SB["wood"], outline=0.4)
    gh, gh2 = pt.g(SB["hide"], outline=0.4), pt.g(SB["canvas_dk"], outline=0.3)
    box(gw, (x, y, z + h * 0.48), (15, 13, h * 0.48), p=8, cuts=2, taper=(1.0, 0.8))
    for k in range(4):
        zz = z + 10 + k * h * 0.21
        (gh if k % 2 else gh2).slab([(x - 14 + k * 0.7, zz), (x + 14 - k * 0.7, zz), (x + 13.4 - k * 0.7, zz + h * 0.18), (x - 13.4 + k * 0.7, zz + h * 0.18)],
                                    y - 13.6 + k * 0.6, 1.0)
        gw2.capsule((x - 14 + k * 0.7, y - 14.4 + k * 0.6, zz), (x + 14 - k * 0.7, y - 14.4 + k * 0.6, zz), 0.8)
    for sx in (-1, 1):
        gw2.capsule((x + sx * 15, y - 13.5, z), (x + sx * 12, y - 11.5, z + h * 0.96), 1.1)
    box(gw2, (x, y, z + h * 0.97), (14, 12, 1.4), p=8, cuts=1)
    for k in range(5):
        box(gw, (x - 11 + k * 5.5, y - 10.5, z + h + 2.6), (1.6, 1.0, 2.4), p=8, cuts=1)
    gw2.slab([(x - 9, z + h * 0.9), (x + 9, z + h * 0.9), (x + 9, z + h * 0.9 + 26), (x - 9, z + h * 0.9 + 26)], y + 14, 1.4, rot=(-34, 0, 0),
             origin=(x, y + 13, z + h * 0.9))
    gdk = pt.g(SB["dark"], outline=0.3)
    for sx in (-10, 0, 10):
        cyl(gdk, (x + sx, y - 14, z + 4.4), (x + sx, y - 16, z + 4.4), 4.4, bevel=0.5, segs=12)


def sb_far(st, P):
    pt = Parts()
    rnd = random.Random(97)
    zg = SB_GROUND
    # 1. the dusty plain (golden swells) and the low tell the city stands on
    g, g2 = pt.g(SB["plain"], outline=0.0), pt.g(SB["plain_dk"], outline=0.0)
    for i in range(12):
        x = -300 + i * 160 + rnd.uniform(-20, 20)
        kit.hill(g if i % 2 else g2, x, 620, -10, rnd.uniform(150, 190), 90, rnd.uniform(58, 68), seed=10 + i, jag=0.03, p=2.6)
    for i in range(14):
        x = -300 + i * 130 + rnd.uniform(-20, 20)
        kit.hill(g2 if i % 2 else g, x, 360, -10, rnd.uniform(110, 150), 80, zg + 6 + rnd.uniform(-2, 2), seed=40 + i, jag=0.03, p=2.8)
    # the tell: three terraces of packed earth and retaining walls stepping up behind the front wall
    gt, gt2 = pt.g(SB["brick_dk"], outline=0.3), pt.g(SB["plain_dk"], outline=0.2)
    terraces = ((480, 640, 250, 70, 40, 90), (530, 650, 200, 60, 90, 112), (590, 652, 140, 46, 112, 128))   # y0, y1, half width, -, z0, z1
    for (y0, y1, hw, _, z0, z1) in terraces:
        box(gt, (560, (y0 + y1) / 2, (z0 + z1) / 2), (hw, (y1 - y0) / 2, (z1 - z0) / 2), p=8, cuts=2, taper=(1.0, 0.97))
        box(gt2, (560, (y0 + y1) / 2, z1 + 0.6), (hw - 2, (y1 - y0) / 2 - 2, 0.8), p=8, cuts=1)
    # 2. the city inside: flat-roofed mud-brick houses packed on the terraces, the citadel and its palace on top
    gh, gh2, gh3 = pt.g(SB["brick"], outline=0.4), pt.g(SB["white"], outline=0.4), pt.g(SB["brick_deep"], outline=0.4)
    gh4 = pt.g(SB["brick_lt"], outline=0.4)
    gd = pt.g(SB["dark"], outline=0.0, highlight=False)
    gaw, gpar = pt.g(SB["canvas_dk"], outline=0.3), pt.g(SB["brick_dk"], outline=0.3)
    wins = []
    k = 0
    for (y0, y1, hw, _, z0, z1) in terraces[:2]:
        for row in range(2):
            yy = y0 + 10 + row * (y1 - y0 - 30) / 1.5
            x = 560 - hw + 12
            while x < 560 + hw - 12:
                w, d, h = rnd.uniform(14, 24), rnd.uniform(12, 16), rnd.uniform(12, 20)
                if abs(x - 560) > 70 or row == 0 or z0 > 70:
                    hx_ = x + w / 2
                    box((gh2, gh, gh3, gh2, gh4)[k % 5], (hx_, yy, z1 + h / 2), (w / 2, d / 2, h / 2), p=8, cuts=1, rot=(0, 0, rnd.uniform(-4, 4)))
                    # a dark door or window pair on the camera face, a roof parapet, now and then an awning
                    fy = yy - d / 2 - 0.5
                    if k % 2 == 0:
                        gd.slab([(hx_ - 1.6, z1), (hx_ + 1.6, z1), (hx_ + 1.6, z1 + h * 0.5), (hx_ - 1.6, z1 + h * 0.5)], fy, 0.8)
                    for wx in ((-w * 0.25, w * 0.25) if w > 18 else (0.0,)):
                        gd.slab([(hx_ + wx - 1.2, z1 + h * 0.62), (hx_ + wx + 1.2, z1 + h * 0.62), (hx_ + wx + 1.2, z1 + h * 0.8), (hx_ + wx - 1.2, z1 + h * 0.8)],
                                fy, 0.8)
                    box(gpar, (hx_, yy, z1 + h + 0.8), (w / 2 + 0.4, d / 2 + 0.4, 0.9), p=8, cuts=1)
                    if k % 5 == 2:
                        gaw.slab([(hx_ - w * 0.3, z1 + h * 0.58), (hx_ + w * 0.3, z1 + h * 0.58), (hx_ + w * 0.34, z1 + h * 0.46), (hx_ - w * 0.34, z1 + h * 0.46)],
                                 fy - 2.4, 4.0)
                    if k % 8 == 0:
                        wins.append((hx_, yy - d / 2 - 2, z1 + h * 0.55))
                    k += 1
                x += w + rnd.uniform(1, 4)
    gcy, gtk = pt.g(SB["cypress"], outline=0.3), pt.g(SB["wood_dk"], outline=0.0)
    for (x, y, z, h) in ((372, 520, 90, 30), (388, 526, 90, 24), (476, 560, 112, 28), (664, 556, 112, 30), (742, 518, 90, 26), (756, 524, 90, 32)):
        kit.cypress(gcy, gtk, x, y, h, h * 0.17, seed=int(x), z=z)
    cx, cy, cz = 560.0, 640.0, 128.0
    gs, gs2 = pt.g(SB["stone"], outline=0.5), pt.g(SB["stone_dk"], outline=0.4)
    box(gs2, (cx, cy, cz + 6), (86, 30, 8), p=8, cuts=2, taper=(1.0, 0.95))
    box(gs, (cx, cy + 6, cz + 30), (44, 18, 18), p=8, cuts=2)
    gr = pt.g(SB["roof"], outline=0.4)
    gr.slab([(cx - 50, cz + 47), (cx + 50, cz + 47), (cx, cz + 62)], cy + 6, 40)
    gcol = pt.g(SB["brick_lt"], outline=0.3)
    for k in range(6):
        cyl(gcol, (cx - 30 + k * 12, cy - 16, cz + 12), (cx - 30 + k * 12, cy - 16, cz + 46), 2.2, 2.6, bevel=0.4, segs=10)
    box(gs, (cx, cy - 16, cz + 47.5), (40, 4, 2.0), p=8, cuts=1)
    wins.append((cx, cy - 20, cz + 30))
    box(gs2, (cx + 90, cy + 4, cz + 26), (12, 12, 26), p=8, cuts=2, taper=(1.0, 0.9))
    for k in range(3):
        box(gs, (cx + 84 + k * 6, cy - 7, cz + 55), (2.0, 1.6, 2.4), p=8, cuts=1)
    # smoke columns rising from the burning quarters (the siege): charred houses with a small fire glow, a
    # painted plume leaning with the wind, and the moving smoke at its foot
    gch, gfi = pt.g(SB["char"], outline=0.3), pt.g(SB["fire"], glow=True)
    for (x, y, z, H, lean) in ((452, 548, 112, 150, 0.42), (704, 540, 112, 128, 0.5)):
        for dx in (-9, 8):
            box(gch, (x + dx, y, z + 7), (7, 6, 7), p=8, cuts=1, rot=(0, 0, dx))
        gfi.blob((x, y - 6.4, z + 9), (4.6, 0.8, 2.6), p=2.4, cuts=2)
        st.light((x, y - 8, z + 10), 4)
        _smoke_plume(pt, x, y + 4, z + 12, H, lean, seed=int(x))
        st.amb("emit", "fx.p.smoke", (x, y - 4, z + 16), rate=0.9, speed=14, scale=1.8, tint=0x5E5650, alpha=0.6, life=4200)
    # 3. the front wall (battered mud brick on a stone footing) with its towers and the great gate
    x0, x1, wy, wh = SB_WALL
    gw, gw2, gtp = pt.g(SB["brick"], outline=0.6), pt.g(SB["stone"], outline=0.5), pt.g(SB["brick_lt"], outline=0.4)
    gcs = pt.g(SB["brick_dk"], outline=0.0, highlight=False)
    for (ax, bx) in ((x0, SB_GATE - 30), (SB_GATE + 30, x1)):
        L = bx - ax
        box(gw, ((ax + bx) / 2, wy, zg + wh / 2), (L / 2, 8, wh / 2), p=8, cuts=2, taper=(1.0, 0.9))
        box(gw2, ((ax + bx) / 2, wy, zg + 6), (L / 2 + 1, 9.5, 6), p=8, cuts=1)
        for zz in (zg + 22, zg + 40):
            box(gcs, ((ax + bx) / 2, wy - 7.6 + (zz - zg) * 0.05, zz), (L / 2 - 1, 0.6, 0.7), p=6, cuts=1)
        n = int(L / 8)
        for k in range(n):
            box(gtp, (ax + 4 + k * L / n, wy - 6, zg + wh + 2.4), (2.4, 1.6, 2.6), p=8, cuts=1)
        for k in range(int(L / 26)):
            sx_ = ax + 13 + k * 26
            gd.slab([(sx_ - 0.9, zg + wh - 12), (sx_ + 0.9, zg + wh - 12), (sx_ + 0.9, zg + wh - 5), (sx_ - 0.9, zg + wh - 5)], wy - 8.4, 0.6)
    tops = []
    for x in (x0, 420, 650, 730, x1):
        tops.append(_sb_tower(pt, gw, gtp, x, wy - 2, zg, 28, 24, wh + 18))
    gate_tops = [_sb_tower(pt, gw, gtp, SB_GATE + sx, wy - 4, zg, 34, 28, wh + 30) for sx in (-30, 30)]
    # the gateway: a dark opening under a great lintel with the lion relief above it, bronze-studded doors ajar
    gd.slab([(SB_GATE - 14, zg), (SB_GATE + 14, zg), (SB_GATE + 12, zg + 40), (SB_GATE - 12, zg + 40)], wy - 9, 1.0)
    box(gw2, (SB_GATE, wy - 9, zg + 43), (18, 2.4, 3.2), p=8, cuts=1)
    pt.g(SB["brick_lt"], outline=0.3).slab([(SB_GATE - 12, zg + 46.5), (SB_GATE + 12, zg + 46.5), (SB_GATE, zg + 60)], wy - 9.4, 1.2)
    gdoor = pt.g(SB["wood_dk"], outline=0.3)
    gdoor.slab([(SB_GATE - 12, zg), (SB_GATE - 4, zg), (SB_GATE - 5, zg + 38), (SB_GATE - 12, zg + 38)], wy - 10.6, 1.2, rot=(0, 0, -24),
               origin=(SB_GATE - 12, wy - 10, 0))
    gbz = pt.g(SB["bronze"], outline=0.0, highlight=False)
    for k in range(4):
        gbz.sphere((SB_GATE - 9.6, wy - 13.2, zg + 8 + k * 8), 0.9)
    st.light((SB_GATE, wy - 14, zg + 20), 6)
    for t in gate_tops:
        st.light((t[0], t[1] - 12, t[2] - 4), 3)
    for w in wins[:4]:
        st.light(w, 3)
    # side walls receding to the back corners
    for (ax, bx, by) in ((x0, 270, 630), (x1, 850, 630)):
        L = math.hypot(bx - ax, by - wy)
        ang = math.degrees(math.atan2(by - wy, bx - ax))
        box(gw, ((ax + bx) / 2, (wy + by) / 2, zg + wh / 2 + 6), (L / 2, 7, wh / 2 + 6), p=8, cuts=2, rot=(0, 0, ang), taper=(1.0, 0.9))
        _sb_tower(pt, gw, gtp, bx, by, zg + 8, 24, 22, wh + 12)
    # a scaling ladder against the wall and a siege tower rolled up to it (the siege)
    gl = pt.g(SB["wood"], outline=0.3)
    for sx in (-4, 4):
        gl.capsule((380 + sx, wy - 30, zg), (380 + sx, wy - 10, zg + wh + 2), 0.9)
    for k in range(9):
        z = zg + 6 + k * 6
        t = (z - zg) / (wh + 2)
        gl.capsule((376, wy - 30 + 20 * t, z), (384, wy - 30 + 20 * t, z), 0.6)
    _siege_tower(pt, 690.0, wy - 34, zg, 104.0)
    # 4. the wooden horse (the signature) on the plain before the gate, and the besiegers' far tents
    hx, hy = SB_HORSE
    fauna.wooden_horse(size=1.5)(kit.StaticRig(pt, (hx, hy, zg)))
    gc, gc2 = pt.g(SB["canvas"], outline=0.3), pt.g(SB["canvas_dk"], outline=0.2)
    for k in range(18):
        x = rnd.choice((rnd.uniform(-260, 160), rnd.uniform(900, 1460)))
        y = rnd.uniform(400, 440)
        w = rnd.uniform(9, 14)
        (gc if k % 2 else gc2).slab([(x - w, zg), (x + w, zg), (x, zg + w * 0.9)], y, w * 1.4)
    # olive groves in rows on the plain either side of the city
    golv, gtk2 = pt.g(mixc(SB["olive"], SB["cypress"], 0.35), outline=0.3), pt.g(SB["wood_dk"], outline=0.0)
    for (gx0, gx1, gy) in ((-250, 120, 500), (-230, 140, 540), (880, 1300, 500), (900, 1320, 540)):
        for k in range(int((gx1 - gx0) / 22)):
            ox = gx0 + k * 22 + rnd.uniform(-3, 3)
            kit.round_bush(golv, ox, gy + rnd.uniform(-3, 3), rnd.uniform(6, 8), seed=900 + k + int(gx0), z=zg + 3, flat=0.8)
            gtk2.capsule((ox, gy, zg - 1), (ox, gy, zg + 4), 0.9)
    # olive and scrub on the plain
    gsc, gol = pt.g(SB["scrub"], outline=0.0), pt.g(SB["olive"], outline=0.3)
    for i in range(30):
        kit.round_bush(gsc, rnd.uniform(-260, 1460), rnd.uniform(380, 460), rnd.uniform(3, 6), seed=300 + i, z=zg - 2)
    for i in range(10):
        x = rnd.choice((rnd.uniform(-240, 200), rnd.uniform(880, 1440)))
        kit.round_bush(gol, x, rnd.uniform(440, 520), rnd.uniform(8, 12), seed=360 + i, z=zg + 4)
    pt.flush(st)
    return gate_tops


def _ridge_tent(g, gdark, gpole, x, y, z, w, d, h, yaw):
    """A ridge tent seen three-quarter: a canvas prism turned `yaw` degrees, so one sloped side and the gable
    end with its dark door flap face the camera; poles stand above both ends of the ridge. Returns the door
    point (for a night light)."""
    kit.gable_roof(g, x, y, z, w, d, h, oh=0.0, yaw=yaw, along_x=False)
    gdark.slab([(x - w * 0.15, z), (x + w * 0.15, z), (x, z + h * 0.62)], y - d / 2 - 0.4, 0.6, rot=(0, 0, yaw), origin=(x, y, 0))
    s, c = math.sin(math.radians(yaw)), math.cos(math.radians(yaw))
    for e in (-1, 1):
        px, py = x - e * d / 2 * s, y + e * d / 2 * c
        gpole.capsule((px, py, z + h - 2), (px, py, z + h + 6), 0.8)
    return (x + d / 2 * s, y - d / 2 * c - 2, z + h * 0.25)


def _shield_rack(pt, x, y, z, n=4):
    """A wooden rack of round shields (pale hide faces with a small bronze boss) and a few leaning spears."""
    gw, gs, gb = pt.g(SB["wood_dk"], outline=0.4), pt.g(SB["shield"], outline=0.5), pt.g(SB["bronze"], outline=0.2)
    gw.capsule((x - n * 7, y, z + 10), (x + n * 7, y, z + 10), 0.9)
    for sx in (-n * 7, n * 7):
        gw.capsule((x + sx, y, z), (x + sx, y, z + 12), 0.9)
    for k in range(n):
        sx = x - (n - 1) * 7 + k * 14
        gs.lathe([(0.01, 0), (6.2, 0), (6.4, 1.0), (0.01, 1.6)], (sx, y - 1.5, z + 9), (sx, y - 3.1, z + 9), segs=18)
        gb.sphere((sx, y - 3.4, z + 9), 1.2)
    for k in range(3):
        gw.capsule((x + n * 7 + 3 + k * 2.4, y + 2, z), (x + n * 7 + 1 + k * 2.4, y + 2, z + 30), 0.4)


def sb_mid(st, P):
    pt = Parts()
    rnd = random.Random(101)
    # the bank: dusty grass with trampled earth
    g, g2 = pt.g(SB["plain"], outline=0.0), pt.g(SB["dust"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g if i % 2 else g2, (x, 80, 8), (96, 60, 40 + rnd.uniform(0, 10)), seed=i, jag=0.05, p=2.4)
    # the siege camp: ridge tents seen three-quarter in loose rows (canvas, hide), the command pavilion
    gc, gc2, gcd = pt.g(SB["canvas"], outline=0.5), pt.g(SB["canvas_dk"], outline=0.5), pt.g(SB["dark"], outline=0.0, highlight=False)
    gch = pt.g(SB["hide"], outline=0.5)
    lights = []
    for k, (x, y, w, d, h, yaw) in enumerate(((-170, 112, 40, 64, 40, 32), (-70, 126, 34, 56, 34, -28), (60, 116, 42, 66, 42, 30), (170, 96, 30, 46, 30, -34),
                                             (250, 128, 36, 58, 36, 26), (420, 110, 40, 64, 40, -30), (540, 96, 30, 48, 30, 34), (630, 120, 36, 58, 36, 28),
                                             (790, 126, 34, 56, 34, -26), (880, 98, 30, 46, 30, 30), (1140, 112, 40, 64, 40, -30), (1240, 96, 30, 46, 30, 32),
                                             (1310, 124, 36, 58, 36, -28))):
        g = (gc, gc2, gch)[k % 3]
        door = _ridge_tent(g, gcd, pt.g(SB["wood_dk"], outline=0.3), x, y, 40, w, d, h, yaw)
        if k % 4 == 0:
            lights.append(door)
    # the command pavilion (x 990): canvas walls under a big gable, a striped valance, its standard on a tall pole
    tx, ty = 990.0, 110.0
    box(gc2, (tx, ty, 40 + 20), (52, 34, 20), p=8, cuts=2)
    kit.gable_roof(gc, tx, ty, 80, 112, 76, 40, oh=3.0, along_x=False)
    gst = pt.g(SB["red"], outline=0.3)
    for k in range(11):
        gst.slab([(tx - 54 + k * 10, 80), (tx - 49 + k * 10, 80), (tx - 49 + k * 10, 73), (tx - 54 + k * 10, 73)], ty - 41.4, 0.6)
    gcd.slab([(tx - 11, 40), (tx + 11, 40), (tx + 8, 70), (tx - 8, 70)], ty - 34.8, 0.8)
    lights.append((tx, ty - 38, 56))
    pt.g(SB["wood_dk"], outline=0.3).capsule((tx + 64, ty - 14, 40), (tx + 64, ty - 14, 170), 1.2)
    # a battering ram in its shed (x 340): six wheels, a hide-covered gable roof, the bronze-capped ram log
    rx_, ry_, yaw_ = 340.0, 100.0, -32.0
    sn, cs = math.sin(math.radians(yaw_)), math.cos(math.radians(yaw_))
    at = lambda lx, ly, z: (rx_ + lx * cs - ly * sn, ry_ + lx * sn + ly * cs, z)  # noqa: E731
    gwr, gdk = pt.g(SB["wood_dk"], outline=0.5), pt.g(SB["dark"], outline=0.4)
    for ly in (-22, 0, 22):
        for lx in (-15, 15):
            a_, b_ = at(lx, ly, 45), at(lx * 1.13, ly, 45)
            cyl(gdk, a_, b_, 5.0, bevel=0.5, segs=12)
    box(gwr, (rx_, ry_, 52), (14, 30, 2.4), p=6, cuts=1, rot=(0, 0, yaw_))
    for ly in (-26, 26):
        for lx in (-12, 12):
            gwr.capsule(at(lx, ly, 52), at(lx, ly, 70), 1.1)
    kit.gable_roof(pt.g(SB["hide"], outline=0.5), rx_, ry_, 70, 34, 60, 20, oh=2.0, yaw=yaw_, along_x=False)
    gwr.capsule(at(0, -40, 61), at(0, 28, 61), 3.4)
    pt.g(SB["bronze"], outline=0.4).lathe([(0.01, 0), (4.6, 0), (4.0, 5), (0.01, 7)], at(0, -40, 61), at(0, -47, 61), segs=12)
    # shield racks, spear stacks, amphorae, a parked chariot
    for (x, y) in ((-20, 70), (616, 74), (700, 72), (1380, 70)):
        _shield_rack(pt, x, y, 40)
    gw = pt.g(SB["wood"], outline=0.3)
    for (x, y) in ((200, 66), (560, 62), (1060, 64)):
        for k in range(6):
            a = 2 * math.pi * k / 6
            gw.capsule((x + math.cos(a) * 6, y + math.sin(a) * 3, 40), (x, y, 78), 0.45)
    gam = pt.g(SB["brick_lt"], outline=0.4)
    for (x, y) in ((300, 60), (312, 64), (306, 52), (860, 58), (872, 62)):
        gam.lathe([(0.01, 0), (2.6, 0.6), (4.6, 5), (4.0, 11), (1.6, 14), (1.8, 17), (0.01, 17.4)], (x, y, 40), (x, y, 57.4), segs=12)
    fauna.chariot(size=1.6)(kit.StaticRig(pt, (480, 70, 38), flip=True))
    # camp fires in stone rings (lit at night), their smoke
    gst2, gem = pt.g(SB["stone_dk"], outline=0.4), pt.g(SB["ember"], outline=0.3)
    for (x, y) in ((110, 58), (760, 60), (1180, 56)):
        for k in range(8):
            a = 2 * math.pi * k / 8
            rock(gst2, (x + math.cos(a) * 9, y + math.sin(a) * 4, 41), (3.2, 2.6, 2.4), seed=int(x) + k, jag=0.15)
        gem.capsule((x - 6, y, 42), (x + 6, y + 1, 43), 1.5)
        st.light((x, y, 48), 8)
        st.amb("emit", "bd.puff", (x, y, 62), rate=0.5, speed=8, scale=0.9, tint=0xE6DED0, alpha=0.32, life=2800, drift=5)
    for l in lights[:3]:
        st.light(l, 4)
    # scrub and stones
    gsc = pt.g(SB["scrub_dk"], outline=0.5)
    for i in range(14):
        kit.round_bush(gsc, rnd.uniform(-240, 1440), rnd.uniform(40, 70), rnd.uniform(6, 10), seed=1300 + i, z=40, flat=0.6)
    pt.flush(st)


def sb_props():
    gate = SB_GATE
    tops = [(gate - 30, SB_WALL[2] - 4, SB_GROUND + SB_WALL[3] + 36), (gate + 30, SB_WALL[2] - 4, SB_GROUND + SB_WALL[3] + 36)]
    fa = _scr(tops[0], SB_FAR_E)
    fb = _scr(tops[1], SB_FAR_E)
    crow = fauna.bird(body="#3E3834", wing="#2E2A28", beak="#8A7A6A", span=12, size=0.9)
    ring = [[i * 2, round(560 + 110 * math.cos(math.pi * i / 3)), round(-232 + 14 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    plist = [
        Prop("ban", "far", fauna.flag_frames(colour="#8A5048", stripe="#D8CCB2", length=16, width=10, pole=22, tail=True),
             [{f"f{f}": {"show": True}} for f in range(4)], (24, 36, 2), fa[1]),
        Prop("char", "mid", fauna.chariot(size=1.5), [dict(fauna.walk4_pose(f, swing=30, bob=1.2, head=3.0), wh={"r": -30 * f}) for f in range(4)],
             (80, 60, 3), SB_CHARIOT_Y),
        Prop("crow", "far", crow, [fauna.bird_pose(f) for f in range(5)], (36, 20, 20), ring[0][2]),
    ]
    sprites = [
        {"kind": "loop", "layer": "far", "frames": [f"ban_{i}" for i in range(4)], "fps": 5, "at": fa},
        {"kind": "loop", "layer": "far", "frames": [f"ban_{i}" for i in (2, 3, 0, 1)], "fps": 5, "at": fb},
        # the signature: a chariot races along the bank every 45 s
        {"kind": "path", "layer": "mid", "fps": 10, "periodS": 45,
         "keys": [[0, -360, SB_CHARIOT_Y, 0], [1, -320, SB_CHARIOT_Y, 1], [13, 1500, SB_CHARIOT_Y, 1], [14, 1560, SB_CHARIOT_Y, 0], [45, 1560, SB_CHARIOT_Y, 0]],
         "group": [{"frames": [f"char_{i}" for i in range(4)]}]},
        {"kind": "path", "layer": "far", "fps": 6, "periodS": 14, "keys": ring,
         "group": [{"frames": ["crow_4", "crow_4", "crow_0", "crow_1", "crow_2", "crow_3"]}, {"frames": ["crow_4", "crow_0", "crow_1", "crow_2"], "dx": -24, "dy": 8, "phase": 2}]},
    ]
    return plist, sprites


SCENES = {
    "classic": Scene("bronze", "classic", PAL, far, mid, back=back, sky=SKY, props=props,
                     hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.45}, ground="earth"),
    "aegean_harbour": Scene("bronze", "aegean_harbour", AH_PAL, ah_far, ah_mid, back=ah_back, sky=AH_SKY, props=ah_props,
                            hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.5}, ground="earth"),
    "bronze_city_siege": Scene("bronze", "bronze_city_siege", SB_PAL, sb_far, sb_mid, back=sb_back, sky=SB_SKY, props=sb_props,
                               hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.45}, ground="earth",
                               look={"far": (0.2, 0.1, 0.22)}),
}
