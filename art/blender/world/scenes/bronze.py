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

from world.common import box, rock
from world.scenes import kit
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


SCENES = {
    "classic": Scene("bronze", "classic", PAL, far, mid, back=back, sky=SKY, props=props,
                     hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.45}, ground="earth"),
}
