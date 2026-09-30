"""Medieval Age base: the Keep (DESIGN A11 Bases).

A square stone keep with a crenellated fighting top and a roofed corner turret, and a round gate
tower in front under a team-painted cone. Both are built of bevelled stone courses in alternating
block tones. The turret mounts (common.BASE_MOUNTS) are real platforms: a timber hoarding by the
gate, a corbelled balcony on the keep's corner, a hoarding at the gate tower's top and a corbelled
bartizan in a notch of the keep's parapet. Team colour: the roofs, a long banner on the keep and the
pennants, with a parchment bear paw on the banner. Crumble (cartoon kit v2, clearly readable at a
glance): 75% cracks, a lost keep merlon and two lost gate-tower merlons, rubble; 50% more cracks,
the hoarding rail broken, a darkened window, the banner torn loose at one corner, the timber
hoarding on fire with soot scorch marks; 25% a ragged breach in the keep wall, the turret roof
and the gate-tower cone knocked askew, the roof burning, the banner hanging by one corner and the
top pennant gone.
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
FIRE = "#FFC47A"
FIRE_CORE = "#FFF0CC"
FIRE_OUT = "#EE9A5C"
SOOT = "#66605A"


def flames(rig, joint, spots):
    """Cartoon fire: teardrop tongues that lean and curl (outer, body, hot core), not cones."""
    o, g, c = Geo(), Geo(), Geo()
    for x, y, z, k in spots:
        for dx, lean, r, h in ((0.0, 0.25, 6.6, 20.0), (-6.0, -0.35, 4.4, 13.0), (6.0, 0.45, 4.0, 11.0),
                               (2.5, -0.2, 3.0, 8.0)):
            cx, cz = x + dx * k, z + h * 0.42 * k
            o.blob((cx, y + 2, cz), (r * 1.3 * k, r * 0.9 * k, h * 0.62 * k), p=2.0, taper=(1.0, 0.08),
                   shift=(lean * 1.2, 0.0))
            g.blob((cx, y, cz - 0.6 * k), (r * k, r * 0.7 * k, h * 0.5 * k), p=2.0, taper=(1.0, 0.1),
                   shift=(lean, 0.0))
            c.blob((cx, y - 2.5, cz - 2.4 * k), (r * 0.5 * k, r * 0.4 * k, h * 0.28 * k), p=2.0,
                   taper=(1.0, 0.2), shift=(lean * 0.6, 0.0))
    rig.part(joint, o, glow=FIRE_OUT, outline=0)
    rig.part(joint, g, glow=FIRE, outline=0)
    rig.part(joint, c, glow=FIRE_CORE, outline=0)

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
    for j, pos in (("keepRoof", (KX - 38, KY + 26, KH)), ("merlon", (KX - 10, KY - KD, KH)),
                   ("tmerlon", (TX, TY, TH + 4)), ("cone", (TX - 2, TY + 6, TH + 6)),
                   ("banner", (KX - 48, KY - KD - 3.0, 212))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "dark", "fire1", "fire2",
              "scorch", "breach", "tear"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    # damage: fires on the gate hoarding (50%) and on the keep's roofed turret (25%), soot
    flames(rig, "fire1", [(M[0][0] - 10, M[0][1] - 14, M[0][2] - 4, 1.0), (M[0][0] + 12, M[0][1] - 12, M[0][2] - 6, 0.75),
                          (M[2][0] + 4, M[2][1] - 16, M[2][2] - 2, 0.8)])
    flames(rig, "fire2", [(KX - 38, KY + 8, KH + 36, 1.3), (KX - 20, KY - KD - 4, KH + 4, 0.9),
                          (KX + 34, KY - KD - 4, 96, 0.8)])
    g = Geo()
    for x, z, rx, rz in ((KX + 30, 200, 14, 12), (TX + 2, 142, 10, 12), (KX - 6, 238, 18, 8), (M[0][0] - 2, M[0][2] - 12, 18, 7)):
        g.blob((x, -40 if x > -60 else KY - KD - 3.4, z), (rx, 2.6, rz), p=2.2, taper=(1.0, 0.6))
    rig.part("scorch", g, SOOT, outline=0, highlight=False)
    # a ragged breach in the keep wall with broken timber inside (25%)
    bx0, bz0 = KX + 14, 70
    pts = [(bx0 - 16, bz0 - 12), (bx0 - 6, bz0 - 18), (bx0 + 8, bz0 - 14), (bx0 + 18, bz0 - 4), (bx0 + 14, bz0 + 10),
           (bx0 + 4, bz0 + 18), (bx0 - 10, bz0 + 14), (bx0 - 18, bz0 + 2)]
    g = Geo().slab(pts, KY - KD - 2.4, 1.2)
    rig.part("breach", g, "#2A2622", outline=0, highlight=False)
    g = Geo().capsule((bx0 - 12, KY - KD - 3.4, bz0 - 6), (bx0 + 10, KY - KD - 3.4, bz0 + 8), 1.6)
    g.capsule((bx0 - 8, KY - KD - 3.4, bz0 + 10), (bx0 + 12, KY - KD - 3.4, bz0 - 4), 1.4)
    rig.part("breach", g, WOOD_DK, outline=0.4)
    g = Geo()
    for x, z, r in ((bx0 - 18, bz0 - 12, 4.0), (bx0 + 16, bz0 - 12, 3.4), (bx0 + 18, bz0 + 8, 3.0), (bx0 - 16, bz0 + 12, 3.2)):
        g.blob((x, KY - KD - 3.0, z), (r, 2.6, r * 0.8), p=2.6)
    rig.part("breach", g, STONE_LT, outline=0.5)

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
    ban = Geo().slab([(bx - 12, 212), (bx + 12, 212), (bx + 12, 124), (bx, 114), (bx - 12, 124)], KY - KD - 3.0, 1.6)
    from ageborn_art import face as F
    from ageborn_art import kit_medieval as K
    bf = F.Face(rig, "banner", [ban])
    rig.part("banner", ban, team=True)
    g = Geo().capsule((bx - 14, KY - KD - 3.6, 213), (bx + 14, KY - KD - 3.6, 213), 1.4)
    rig.part("body", g, GOLD, finish="metal", outline=0.5)
    g = Geo()
    c = bf.hit(*K.scr(bf, (bx, KY - KD - 4.0, 132.0)))
    bf.stroke(g, c, [(-11.0, 4.0), (0.0, -2.0), (11.0, 4.0)], 1.8, 0.4)   # a parchment chevron trim
    rig.part("banner", g, PARCH, highlight=False, outline=0)
    g = K.paw(bf, Geo(), K.scr(bf, (bx, KY - KD - 4.0, 176.0)), s=2.6)
    rig.part("banner", g, PARCH, highlight=False, outline=0)
    g = Geo().slab([(bx + 12, 180), (bx + 5, 168), (bx + 12, 158)], KY - KD - 4.4, 1.0)   # a rip (50%)
    rig.part("tear", g, STONE_DK, outline=0, highlight=False)

    # round gate tower with its crenellated top and a team cone
    g = Geo()
    cyl(g, (TX, TY, 0), (TX, TY, TH), TR, TR - 2, bevel=1.0, segs=32)
    rig.part("body", g, STONE_DK)
    tower_blocks(rig, "body")
    g = Geo()
    cyl(g, (TX, TY, 0), (TX, TY, 12), TR + 3, TR + 1.5, bevel=1.0, segs=32)
    cyl(g, (TX, TY, TH - 8), (TX, TY, TH + 4), TR + 3, bevel=1.0, segs=32)
    rig.part("body", g, STONE_DKR)
    g, gm = Geo(), Geo()
    for i in range(10):
        a = math.pi * 2 * i / 10
        box(gm if i in (6, 7) else g, (TX + (TR + 1.5) * math.cos(a), TY + (TR + 1.5) * math.sin(a), TH + 9),
            (4, 4, 5), p=5)
    rig.part("body", g, STONE_LT)
    rig.part("tmerlon", gm, STONE_LT)
    g = Geo().lathe([(0, 0), (TR - 2, 0), (TR - 4, 3), (0.6, 52), (0, 54)], (TX - 2, TY + 6, TH + 6),
                    (TX - 2, TY + 6, TH + 60), segs=24)
    rig.part("cone", g, team=True)
    g = Geo().lathe([(TR - 1.6, -1.2), (TR - 1.0, 0), (TR - 1.6, 1.2)], (TX - 2, TY + 6, TH + 7.5),
                    (TX - 2, TY + 6, TH + 8.5), segs=24)
    rig.part("cone", g, GOLD, finish="metal", outline=0.5)
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
    rubble(rig, "rubble1", [(-156, -40), (-136, -50)], STONE_DK, seed=3)
    rubble(rig, "rubble2", [(-96, -52), (18, -46), (-66, -58)], STONE_DK, seed=13)
    rubble(rig, "rubble3", [(-154, -60), (-124, -64), (-44, -62), (22, -56)], STONE_DK, seed=23, size=1.2)

    flag(rig, "root", "flagA", (TX - 2, TY + 6, TH + 88), length=30, height=16, pole=TH + 56)
    flag(rig, "root", "flagB", (cx, cy, KH + 104), length=26, height=14, pole=KH + 78)

    # Treasury
    g = Geo()
    for k, (x, y) in enumerate(((-156, -52), (-146, -58), (-152, -46))):
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
        pose.update({"crack1": {"show": True}, "merlon": {"hide": True}, "rubble1": {"show": True},
                     "tmerlon": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "rail": {"r": -18.0, "z": -3.0},
                     "dark": {"show": True}, "win": {"hide": True}, "fire1": {"show": True},
                     "scorch": {"show": True}, "tear": {"show": True}, "banner": {"r": 5.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "fire2": {"show": True},
                     "breach": {"show": True},
                     "keepRoof": {"r": 16.0, "x": -6.0, "z": -12.0},
                     "cone": {"r": -14.0, "x": 4.0, "z": -6.0},
                     "banner": {"r": 28.0, "x": 1.0, "z": -2.0}})
    return pose


MODULE = base_module(
    "medieval", "Keep", height=330, width=180, canvas=(460, 820), feet=(350, 770),
    build=build, crumble=crumble, mount_depth=DEPTHS,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((TX - 26, TY - TR - 6, 51), 3, 20), ((TX + 14, TY - TR - 4, 51), 3, 20), ((KX, KY - KD - 2, 150), 2, 40)],
    smoke=[((KX, 0, KH + 6), 2), ((TX, TY, TH + 10), 3), ((KX - 30, -20, 120), 3)],
    horn=(-100, 360), yaw=BASE_YAW,
)
