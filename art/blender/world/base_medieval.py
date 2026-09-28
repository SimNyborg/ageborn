"""Medieval Age base: the Keep (DESIGN A11 Bases).

A square stone keep with crenellations and a tall round gate tower in front, both under
team-painted conical roofs, a wooden gate with iron studs, and four timber hoardings stepping up
the round tower for the turret mounts. Team colour: roofs, a long banner on the keep wall and the
waving pennants. Crumble: cracks and a lost merlon (75%), a broken hoarding rail, rubble and
a darkened window (50%), the keep roof knocked askew and the top pennant gone (25%).
Treasury: sacks of grain (1), a treasure chest (2), a cart of gold (3).
"""
import math

from ageborn_art.geometry import Geo

from world.common import BASE_YAW, SHADOW_DARK, base_module, box, cracks, crenels, cyl, flag, rock, rubble, torch, window

STONE = "#9A9C98"
STONE_LT = "#AEB0AA"
STONE_DK = "#7C7F80"
SLATE = "#6B7682"
WOOD = "#7A5E44"
WOOD_DK = "#5A4634"
IRON = "#4A4E56"
GOLD = "#D4A437"
PARCH = "#E8DFC8"
WINE = "#8E2A4A"
SACK = "#C8B48C"

CRACK = "#5A5E64"
MOUNTS = [(-12, -62), (-12, -106), (-12, -150), (-20, -202)]
TX, TY = -30.0, -6.0     # round tower centre
TR = 25.0


def build(rig, M):
    for j, pos in (("keepRoof", (-100, 20, 212)), ("merlon", (-70, -24, 214))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "dark"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)

    # the keep: a stone block with a plinth, string course and crenellations
    g = Geo()
    box(g, (-100, 20, 106), (52, 44, 106), p=8)
    rig.part("body", g, STONE)
    g = Geo()
    box(g, (-100, 18, 10), (57, 48, 10), p=6)
    box(g, (-100, 18, 150), (55, 47, 3.5), p=6)
    box(g, (-100, 18, 206), (57, 49, 5), p=6)
    rig.part("body", g, STONE_DK)
    g = Geo()
    crenels(g, -154, -46, -28, 210, 9, 10, 12, 8)
    crenels(g, -154, -46, 66, 210, 9, 10, 12, 8)
    rig.part("body", g, STONE_LT)
    g = Geo()
    box(g, (-70, -24, 220), (5, 4, 6), p=5)
    rig.part("merlon", g, STONE_LT)
    # stone courses (subtle lines) on the keep face
    g = Geo()
    for z in (40, 72, 104, 128, 176):
        box(g, (-100, -25, z), (50, 1.0, 0.9), p=4, cuts=2)
    rig.part("body", g, STONE_DK, outline=0)
    # keep roof (team)
    g = Geo().lathe([(0, 0), (64, 0), (61, 4), (0.8, 58), (0, 60)], (-100, 20, 216), (-100, 20, 280), segs=4, rot=(0, 0, 45))
    rig.part("keepRoof", g, team=True)
    g = Geo().capsule((-100, 20, 268), (-100, 20, 282), 1.4)
    rig.part("keepRoof", g, GOLD, finish="metal", outline=0.6)
    # windows on the keep
    for x, z in ((-130, 120), (-100, 120), (-70, 120), (-130, 175), (-100, 175)):
        window(rig, "body", x, -24.5, z, 9, 16)
    window(rig, "dark", -70, -25.5, 175, 9.5, 16.5, glow_hex="#2A2622")
    rig.joint("win", "body", (0, 0, 0))
    window(rig, "win", -70, -24.5, 175, 9, 16)

    # the long team banner on the keep wall
    g = Geo().slab([(-146, 196), (-122, 196), (-122, 110), (-134, 100), (-146, 110)], -26.5, 1.6)
    rig.part("body", g, team=True)
    g = Geo().capsule((-148, -27, 197), (-120, -27, 197), 1.4)
    rig.part("body", g, GOLD, finish="metal", outline=0.5)
    g = Geo().blob((-134, -28, 160), (6, 0.8, 8), p=2.0)
    rig.part("body", g, PARCH, outline=0.5)

    # round gate tower
    g = Geo()
    cyl(g, (TX, TY, 0), (TX, TY, 236), TR, TR - 3, bevel=1.0, segs=28)
    rig.part("body", g, STONE_LT)
    g = Geo()
    for z in (10, 100, 180):
        cyl(g, (TX, TY, z - 3), (TX, TY, z + 3), TR + 2.2 - z * 0.012, bevel=0.8, segs=28)
    cyl(g, (TX, TY, 230), (TX, TY, 244), TR + 3, bevel=1.0, segs=28)
    rig.part("body", g, STONE_DK)
    g = Geo()
    for i in range(8):
        a = math.pi * 2 * i / 8
        box(g, (TX + (TR + 1) * math.cos(a), TY + (TR + 1) * math.sin(a), 249), (4, 4, 5), p=5)
    rig.part("body", g, STONE_LT)
    g = Geo().lathe([(0, 0), (TR + 5, 0), (TR + 3, 3), (0.6, 64), (0, 66)], (TX, TY, 244), (TX, TY, 312), segs=24)
    rig.part("body", g, team=True)
    window(rig, "body", TX + 2, TY - TR + 1.5, 212, 7, 14)
    window(rig, "body", TX + 6, TY - TR + 2.5, 124, 5, 12)

    # gate: an arched wooden door with iron bands on the tower foot
    g = Geo().slab([(TX - 14, 0), (TX + 14, 0), (TX + 14, 26)] + [(TX + 14 * math.cos(a), 26 + 14 * math.sin(a)) for a in
                                                               [math.pi * k / 8 for k in range(1, 8)]] + [(TX - 14, 26)],
                   TY - TR + 0.8, 3.0)
    rig.part("body", g, WOOD)
    g = Geo()
    for z in (8, 20, 32):
        box(g, (TX, TY - TR - 1.2, z), (13.5, 0.8, 1.4), p=4, cuts=2)
    rig.part("body", g, IRON, finish="metal", outline=0.4)
    g = Geo()
    for a in [math.pi * k / 10 for k in range(0, 11)]:
        box(g, (TX + 17 * math.cos(a), TY - TR - 0.2, 26 + 17 * math.sin(a)), (2.6, 1.6, 2.6), p=4, cuts=2)
    rig.part("body", g, STONE_DK, outline=0.5)

    # timber hoardings at the mounts (tops exactly at the mount points)
    for i, (x, y, z) in enumerate(M):
        rig.joint(f"hoard{i}", "body", (x, y, z))
        if i == 1:
            rig.joint("rail", "body", (x - 18, y - 8, z + 5))
        g = Geo()
        box(g, (x - 2, y + 4, z - 2.5), (17, 13, 2.5), p=6)
        rig.part(f"hoard{i}", g, WOOD)
        g = Geo()
        for dx in (-14, 10):
            g.capsule((x + dx, y - 6, z - 4), (x + dx - 6, y + 12, z - 22), 1.8)
        rig.part(f"hoard{i}", g, WOOD_DK, outline=0.6)
        g = Geo()
        g.capsule((x - 18, y - 8, z + 5), (x + 14, y - 8, z + 5), 1.1)
        for dx in (-17, -6, 5, 13):
            g.capsule((x + dx, y - 8, z - 1), (x + dx, y - 8, z + 5.5), 0.9)
        rig.part("rail" if i == 1 else f"hoard{i}", g, WOOD_DK, outline=0.5)

    torch(rig, "body", TX - 22, TY - TR - 4, 40)
    torch(rig, "body", TX + 20, TY - TR + 2, 40)

    cracks(rig, "crack1", [(-120, -25, 90, 20, 16), (TX - 8, TY - TR - 0.5, 150, -15, 12)], CRACK)
    cracks(rig, "crack2", [(-80, -25, 60, -25, 18), (-140, -25, 160, 15, 14), (TX + 6, TY - TR, 70, 30, 14)], CRACK)
    cracks(rig, "crack3", [(-100, -25, 190, 5, 16), (-60, -25, 140, -30, 16), (TX - 4, TY - TR, 200, 10, 16)], CRACK)
    rubble(rig, "rubble1", [(-150, -40), (-120, -48)], STONE_DK, seed=3)
    rubble(rig, "rubble2", [(-80, -50), (6, -48), (-50, -56)], STONE_DK, seed=13)
    rubble(rig, "rubble3", [(-140, -60), (-104, -62), (-20, -62), (16, -56)], STONE_DK, seed=23, size=1.2)

    flag(rig, "root", "flagA", (TX, TY, 334), length=30, height=16, pole=306)
    flag(rig, "root", "flagB", (-100, 20, 300), length=26, height=14, pole=276)

    # Treasury
    g = Geo()
    for k, (x, y) in enumerate(((-150, -52), (-138, -58), (-144, -46))):
        g.blob((x, y, 9), (7, 6, 9), p=2.4, taper=(1.0, 0.7))
        g.blob((x, y, 18.5), (2.8, 2.6, 1.6), p=2.0)
    rig.part("treasury1", g, SACK)
    g = Geo()
    box(g, (-116, -60, 7), (11, 7, 7), p=5)
    rig.part("treasury2", g, WOOD)
    g = Geo()
    g.blob((-116, -60, 14), (11, 7, 4.5), p=3.0)
    g.clip((0, 0, 14), (0, 0, -1))
    rig.part("treasury2", g, WINE)
    g = Geo()
    box(g, (-116, -67.5, 8), (2.4, 0.8, 3), p=4, cuts=2)
    for dx in (-9, 9):
        box(g, (dx - 116, -67.3, 9), (1.2, 0.6, 7), p=4, cuts=2)
    rig.part("treasury2", g, GOLD, finish="metal", outline=0.4)
    g = Geo()
    for dx, dz in ((-4, 18), (3, 19), (0, 21), (6, 17), (-7, 17)):
        g.blob((-116 + dx, -60, dz), (3.2, 3.2, 1.4), p=2.0)
    rig.part("treasury2", g, GOLD, finish="metal", outline=0.5)
    g = Geo()
    box(g, (-86, -64, 13), (16, 9, 5), p=6)
    rig.part("treasury3", g, WOOD)
    for dx in (-10, 10):
        g = Geo().lathe([(0, -1.2), (7, -1.2), (7, 1.2), (0, 1.2)], (-86 + dx, -74, 7), (-86 + dx, -75, 7), segs=16)
        rig.part("treasury3", g, WOOD_DK)
    g = Geo()
    for dx, dz in ((-8, 20), (-2, 22), (4, 21), (10, 19), (0, 25), (-5, 18), (7, 17)):
        g.blob((-86 + dx, -64, dz), (4.0, 4.0, 1.6), p=2.0)
    rig.part("treasury3", g, GOLD, finish="metal", outline=0.5)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "merlon": {"hide": True}, "rubble1": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "rail": {"r": -18.0, "z": -3.0},
                     "dark": {"show": True}, "win": {"hide": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True},
                     "keepRoof": {"r": 14.0, "x": -6.0, "z": -14.0}})
    return pose


MODULE = base_module(
    "medieval", "Keep", height=318, width=158, canvas=(400, 660), feet=(300, 615), mounts=MOUNTS,
    build=build, crumble=crumble,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((TX - 22, TY - TR - 5, 51), 3, 20), ((TX + 20, TY - TR + 1, 51), 3, 20), ((-100, -26, 150), 2, 40)],
    smoke=[((-100, 0, 214), 2), ((TX, TY, 250), 3), ((-130, -20, 120), 3)],
    horn=(-90, 236), yaw=BASE_YAW,
)
