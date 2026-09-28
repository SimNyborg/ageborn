"""Medieval Age base: the Keep (DESIGN A11 Bases).

A square stone keep with a crenellated fighting top and a roofed corner turret, and a round gate
tower in front under a team-painted cone. Both are built of bevelled stone courses in alternating
block tones. The turret mounts (common.BASE_MOUNTS) are real platforms: a timber hoarding by the
gate, a corbelled balcony on the keep's corner, a hoarding at the gate tower's top and a corbelled
bartizan in a notch of the keep's parapet. Team colour: the roofs, a long banner on the keep and the
pennants. Crumble: cracks and a lost merlon (75%), a broken hoarding rail, rubble and a darkened
window (50%), the turret roof knocked askew and the top pennant gone (25%).
Treasury: sacks of grain (1), a treasure chest (2), a cart of gold (3).
"""
import math

from ageborn_art.geometry import Geo

from world.common import (BASE_YAW, base_module, box, chipped_cracks, crenels, cyl, flag, platform, rubble, torch,
                          window)

STONE = "#9A9C98"
STONE_LT = "#AEB0AA"
STONE_DK = "#7C7F80"
STONE_DKR = "#6A6D70"
MORTAR = "#5E6166"
WOOD = "#7A5E44"
WOOD_DK = "#5A4634"
IRON = "#4A4E56"
GOLD = "#D4A437"
PARCH = "#E8DFC8"
WINE = "#8E2A4A"
SACK = "#C8B48C"
CRACK = "#44474C"

DEPTHS = [-40, -24, -40, -24]
KX, KY, KW, KD, KH = -110.0, 22.0, 52.0, 46.0, 250.0   # keep centre, half width, half depth, height
TX, TY, TR, TH = -22.0, -2.0, 22.0, 190.0             # gate tower centre, radius, height


def keep_blocks(rig, joint):
    """Ashlar blocks on the keep's front face: staggered rows, alternating tones, bevelled."""
    ga, gb = Geo(), Geo()
    y = KY - KD - 0.6
    row = 0
    z = 14.0
    while z < KH - 12:
        h = 11.0
        x = KX - KW + (0 if row % 2 == 0 else 9)
        k = row
        while x < KX + KW - 4:
            w = 16.0 + (k * 7 % 5)
            x1 = min(KX + KW - 2, x + w)
            (ga if (k + row) % 3 else gb).blob(((x + x1) / 2, y, z + h / 2), ((x1 - x) / 2 - 0.9, 1.4, h / 2 - 0.9),
                                              p=5.0, cuts=2)
            x = x1 + 0.2
            k += 1
        z += h + 0.4
        row += 1
    rig.part(joint, ga, STONE, outline=0.5)
    rig.part(joint, gb, STONE_LT, outline=0.5)


def tower_blocks(rig, joint):
    """Ashlar blocks around the visible half of the round tower (alternating tones, staggered)."""
    ga, gb = Geo(), Geo()
    row = 0
    z = 10.0
    while z < TH - 10:
        h = 13.0
        n = 9
        off = 0.5 if row % 2 else 0.0
        for i in range(n):
            a0 = math.pi * (1.02 + (i + off) / n * 0.98)
            a1 = math.pi * (1.02 + (i + off + 0.92) / n * 0.98)
            if a1 > math.pi * 2.0:
                continue
            am = (a0 + a1) / 2
            r = TR + 0.4
            c = (TX + r * math.cos(am), TY + r * math.sin(am), z + h / 2)
            half = r * (a1 - a0) / 2
            (ga if (i + row) % 3 else gb).blob(c, (half - 0.6, 1.3, h / 2 - 0.8), p=5.0, cuts=2,
                                              rot=(0, 0, math.degrees(am) + 90))
        z += h + 0.4
        row += 1
    rig.part(joint, ga, STONE_LT, outline=0.5)
    rig.part(joint, gb, STONE, outline=0.5)


def build(rig, M):
    for j, pos in (("keepRoof", (KX - 38, KY + 26, KH)), ("merlon", (KX - 10, KY - KD, KH))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "dark"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)

    # the keep: core, plinth, string courses and a crenellated fighting top
    g = Geo()
    box(g, (KX, KY, KH / 2), (KW, KD, KH / 2), p=10)
    rig.part("body", g, STONE_DK)
    keep_blocks(rig, "body")
    g = Geo()
    box(g, (KX, KY - 2, 9), (KW + 5, KD + 4, 9), p=6, taper=(1.0, 0.96))
    box(g, (KX, KY - 1, 150), (KW + 2.5, KD + 2.5, 3.2), p=6)
    box(g, (KX, KY - 1, KH - 3), (KW + 4.5, KD + 4.5, 5), p=6)
    rig.part("body", g, STONE_DKR)
    g = Geo()
    crenels(g, KX - KW, KX + KW - 18, KY - KD - 2, KH + 2, 9, 10, 12, 8)
    crenels(g, KX - KW, KX + KW, KY + KD, KH + 2, 9, 10, 12, 8)
    rig.part("body", g, STONE_LT)
    g = Geo()
    box(g, (KX - 10, KY - KD - 2, KH + 8), (5, 4, 6), p=5)
    rig.part("merlon", g, STONE_LT)
    # the roofed corner turret on the keep's back-left corner (team roof)
    cx, cy = KX - 38, KY + 26
    g = Geo()
    cyl(g, (cx, cy, KH - 10), (cx, cy, KH + 32), 16, bevel=0.8, segs=22)
    rig.part("keepRoof", g, STONE)
    g = Geo()
    cyl(g, (cx, cy, KH + 28), (cx, cy, KH + 34), 18, bevel=0.8, segs=22)
    rig.part("keepRoof", g, STONE_DKR)
    g = Geo().lathe([(0, 0), (22, 0), (20, 3), (0.6, 46), (0, 48)], (cx, cy, KH + 33), (cx, cy, KH + 81), segs=22)
    rig.part("keepRoof", g, team=True)
    window(rig, "keepRoof", cx + 4, cy - 16, KH + 16, 6, 12)
    # windows on the keep
    for x, z in ((KX - 30, 118), (KX, 118), (KX + 30, 118), (KX - 30, 186), (KX, 186)):
        window(rig, "body", x, KY - KD - 1.6, z, 9, 16)
    window(rig, "dark", KX + 30, KY - KD - 2.6, 186, 9.5, 16.5, glow_hex="#2A2622")
    rig.joint("win", "body", (0, 0, 0))
    window(rig, "win", KX + 30, KY - KD - 1.6, 186, 9, 16)
    # the long team banner on the keep wall
    bx = KX - 36
    g = Geo().slab([(bx - 12, 212), (bx + 12, 212), (bx + 12, 124), (bx, 114), (bx - 12, 124)], KY - KD - 3.0, 1.6)
    rig.part("body", g, team=True)
    g = Geo().capsule((bx - 14, KY - KD - 3.6, 213), (bx + 14, KY - KD - 3.6, 213), 1.4)
    rig.part("body", g, GOLD, finish="metal", outline=0.5)
    g = Geo().blob((bx, KY - KD - 4.6, 170), (6, 0.8, 8), p=2.0)
    rig.part("body", g, PARCH, outline=0.5)

    # round gate tower with its crenellated top and a team cone
    g = Geo()
    cyl(g, (TX, TY, 0), (TX, TY, TH), TR, TR - 2, bevel=1.0, segs=32)
    rig.part("body", g, STONE_DK)
    tower_blocks(rig, "body")
    g = Geo()
    cyl(g, (TX, TY, 0), (TX, TY, 12), TR + 3, TR + 1.5, bevel=1.0, segs=32)
    cyl(g, (TX, TY, TH - 8), (TX, TY, TH + 4), TR + 3, bevel=1.0, segs=32)
    rig.part("body", g, STONE_DKR)
    g = Geo()
    for i in range(10):
        a = math.pi * 2 * i / 10
        box(g, (TX + (TR + 1.5) * math.cos(a), TY + (TR + 1.5) * math.sin(a), TH + 9), (4, 4, 5), p=5)
    rig.part("body", g, STONE_LT)
    g = Geo().lathe([(0, 0), (TR - 2, 0), (TR - 4, 3), (0.6, 52), (0, 54)], (TX - 2, TY + 6, TH + 6),
                    (TX - 2, TY + 6, TH + 60), segs=24)
    rig.part("body", g, team=True)
    window(rig, "body", TX + 2, TY - TR + 0.6, 130, 6, 13)

    # gate: an arched wooden door with iron bands on the tower foot
    gx = TX - 6
    g = Geo().slab([(gx - 12, 0), (gx + 12, 0), (gx + 12, 24)] + [(gx + 12 * math.cos(a), 24 + 12 * math.sin(a)) for a in
                                                               [math.pi * k / 8 for k in range(1, 8)]] + [(gx - 12, 24)],
                   TY - TR - 0.6, 3.0)
    rig.part("body", g, WOOD)
    g = Geo()
    for z in (8, 20, 30):
        box(g, (gx, TY - TR - 2.6, z), (11.5, 0.8, 1.4), p=4, cuts=2)
    rig.part("body", g, IRON, finish="metal", outline=0.4)
    g = Geo()
    for a in [math.pi * k / 10 for k in range(0, 11)]:
        box(g, (gx + 15 * math.cos(a), TY - TR - 1.6, 24 + 15 * math.sin(a)), (2.6, 1.6, 2.6), p=4, cuts=2)
    rig.part("body", g, STONE_DKR, outline=0.5)

    # the turret platforms
    platform(rig, "body", M[0], WOOD, WOOD_DK, style="wood", r=(25, 16))
    rig.joint("rail", "body", (M[0][0], M[0][1], M[0][2]))
    g = Geo()
    x, y, z = M[0]
    g.capsule((x - 26, y - 13, z - 4), (x - 26, y + 10, z - 4), 1.2)
    rig.part("rail", g, WOOD_DK, outline=0.5)
    platform(rig, "body", M[1], STONE_LT, STONE_DKR, style="stone", r=(25, 19))
    platform(rig, "body", M[2], WOOD, WOOD_DK, style="wood", r=(26, 18))
    platform(rig, "body", M[3], STONE_LT, STONE_DKR, style="stone", r=(25, 19))

    torch(rig, "body", gx - 20, TY - TR - 5, 40)
    torch(rig, "body", gx + 20, TY - TR - 3, 40)

    chipped_cracks(rig, "crack1", [[(KX - 20, KY - KD - 2, 100), (KX - 14, KY - KD - 2, 88), (KX - 20, KY - KD - 2, 76)],
                                   [(TX - 8, TY - TR - 1, 160), (TX - 3, TY - TR - 1, 150), (TX - 7, TY - TR - 1, 140)]],
                   CRACK, STONE_LT)
    chipped_cracks(rig, "crack2", [[(KX + 20, KY - KD - 2, 70), (KX + 26, KY - KD - 2, 58), (KX + 20, KY - KD - 2, 46)],
                                   [(KX - 40, KY - KD - 2, 170), (KX - 34, KY - KD - 2, 160), (KX - 40, KY - KD - 2, 148)],
                                   [(TX + 6, TY - TR - 1, 80), (TX + 10, TY - TR - 1, 70), (TX + 6, TY - TR - 1, 60)]],
                   CRACK, STONE_LT)
    chipped_cracks(rig, "crack3", [[(KX, KY - KD - 2, 230), (KX + 6, KY - KD - 2, 220), (KX, KY - KD - 2, 208)],
                                   [(KX + 30, KY - KD - 2, 150), (KX + 36, KY - KD - 2, 140), (KX + 30, KY - KD - 2, 130)],
                                   [(TX - 4, TY - TR - 1, 110), (TX + 1, TY - TR - 1, 100)]], CRACK, STONE_LT)
    rubble(rig, "rubble1", [(-168, -40), (-140, -50)], STONE_DK, seed=3)
    rubble(rig, "rubble2", [(-96, -52), (18, -46), (-66, -58)], STONE_DK, seed=13)
    rubble(rig, "rubble3", [(-160, -60), (-124, -64), (-44, -62), (22, -56)], STONE_DK, seed=23, size=1.2)

    flag(rig, "root", "flagA", (TX - 2, TY + 6, TH + 88), length=30, height=16, pole=TH + 56)
    flag(rig, "root", "flagB", (cx, cy, KH + 104), length=26, height=14, pole=KH + 78)

    # Treasury
    g = Geo()
    for k, (x, y) in enumerate(((-170, -52), (-158, -58), (-164, -46))):
        g.blob((x, y, 9), (7, 6, 9), p=2.4, taper=(1.0, 0.7))
        g.blob((x, y, 18.5), (2.8, 2.6, 1.6), p=2.0)
    rig.part("treasury1", g, SACK)
    g = Geo()
    box(g, (-136, -60, 7), (11, 7, 7), p=5)
    rig.part("treasury2", g, WOOD)
    g = Geo()
    g.blob((-136, -60, 14), (11, 7, 4.5), p=3.0)
    g.clip((0, 0, 14), (0, 0, -1))
    rig.part("treasury2", g, WINE)
    g = Geo()
    box(g, (-136, -67.5, 8), (2.4, 0.8, 3), p=4, cuts=2)
    for dx in (-9, 9):
        box(g, (dx - 136, -67.3, 9), (1.2, 0.6, 7), p=4, cuts=2)
    rig.part("treasury2", g, GOLD, finish="metal", outline=0.4)
    g = Geo()
    for dx, dz in ((-4, 18), (3, 19), (0, 21), (6, 17), (-7, 17)):
        g.blob((-136 + dx, -60, dz), (3.2, 3.2, 1.4), p=2.0)
    rig.part("treasury2", g, GOLD, finish="metal", outline=0.5)
    g = Geo()
    box(g, (-100, -66, 13), (16, 9, 5), p=6)
    rig.part("treasury3", g, WOOD)
    for dx in (-10, 10):
        g = Geo().lathe([(0, -1.2), (7, -1.2), (7, 1.2), (0, 1.2)], (-100 + dx, -76, 7), (-100 + dx, -77, 7), segs=16)
        rig.part("treasury3", g, WOOD_DK)
    g = Geo()
    for dx, dz in ((-8, 20), (-2, 22), (4, 21), (10, 19), (0, 25), (-5, 18), (7, 17)):
        g.blob((-100 + dx, -66, dz), (4.0, 4.0, 1.6), p=2.0)
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
                     "keepRoof": {"r": 12.0, "x": -4.0, "z": -10.0}})
    return pose


MODULE = base_module(
    "medieval", "Keep", height=330, width=180, canvas=(460, 740), feet=(350, 690),
    build=build, crumble=crumble, mount_depth=DEPTHS,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((TX - 26, TY - TR - 6, 51), 3, 20), ((TX + 14, TY - TR - 4, 51), 3, 20), ((KX, KY - KD - 2, 150), 2, 40)],
    smoke=[((KX, 0, KH + 6), 2), ((TX, TY, TH + 10), 3), ((KX - 30, -20, 120), 3)],
    horn=(-100, 360), yaw=BASE_YAW,
)
