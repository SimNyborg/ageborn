"""Gunpowder Age base: the Star Fort (DESIGN A11 Bases).

Cartoon kit v2 (art director plan 2026-09-30): the crumble stages now read at a glance. 75%: cracks,
a merlon and a corner block of the upper tier knocked off (a jagged dark bite), rubble. 50%: a
breach blasted in the lower tier (a dark jagged hole with loose blocks), fire and soot on the upper
tier, the windows go dark, the gun rail bent, the banner torn and tilted. 25%: the cavalier's
parapet sheared off and tipped, the dome knocked askew, a second big fire, the banner hanging by
one corner. Ambient detail: warm lit windows with sills, lanterns by the gate, a cream anchor on the
team banner, gun barrels in the embrasures.

Two tiers of battered sandstone bastions with cannon embrasures, a round bastion tower at the lane
edge, a tall cavalier tower in the middle and a small signal tower behind it under a team-painted
dome. The turret mounts (common.BASE_MOUNTS) are gun platforms on bastion corners: on the lower
tier by the gate, on the upper tier, on top of the round bastion tower and on the cavalier.
Team colour: the dome, a long banner and the flags. Crumble: cracks and a lost merlon (75%), a
broken gun rail and rubble (50%), the dome knocked askew and the top flag gone (25%).
Treasury: powder kegs (1), crates and a cannonball pyramid (2), a gold chest (3).
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_gunpowder as KG
from ageborn_art import kit_medieval as K
from ageborn_art.geometry import Geo

from world.common import BASE_YAW, base_module, box, chipped_cracks, cyl, flag, platform, rubble, window

FIRE = "#FFD08A"
FIRE_OUT = "#EE9A5C"
FIRE_CORE = "#FFF3D6"
SOOT = "#5E574E"
HOLE = "#2A2622"


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

SAND = "#B8A88A"
SAND_LT = "#CABB9C"
SAND_DK = "#9A8C72"
SAND_DKR = "#857860"
GREEN = "#2E5E4E"
WOOD = "#4A3B2E"
WOOD_LT = "#7A6652"
BRASS = "#C9A227"
IRON = "#3C3F45"
CREAM = "#EFE6CF"
CRACK = "#5A4F40"

DEPTHS = [-40, -24, -40, -24]
BT = (-10.0, -24.0, 18.0, 182.0)      # round bastion tower: x, y, radius, height
CV = (-70.0, 4.0, 30.0, 250.0)       # cavalier tower
SG = (-128.0, 36.0)                  # signal tower (dome)


def courses(g, x0, x1, y, z0, z1, step=9.0):
    z = z0 + step
    while z < z1 - 2:
        box(g, ((x0 + x1) / 2, y, z), ((x1 - x0) / 2, 0.9, 0.8), p=4, cuts=2)
        z += step


def build(rig, M):
    for j, pos in (("dome", (SG[0], SG[1], 250)), ("merlon", (-60, -30, 60))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "notch", "breach", "fire1",
              "fire2", "scorch", "windark", "stumps"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    for j in ("corner", "win"):
        rig.joint(j, "body", (0, 0, 0))
    rig.joint("cavtop", "body", (CV[0] + 30, CV[1], CV[3] - 6))
    rig.joint("banner", "body", (-138, -21.5, 104))

    # bastion tiers (battered walls), each with a cordon moulding and merlons
    tiers = [((-82, 14, 25), (80, 52, 25)), ((-96, 22, 80), (58, 42, 30))]
    for c, r in tiers:
        g = Geo()
        box(g, c, r, p=9, taper=(1.0, 0.86))
        rig.part("body", g, SAND)
        g = Geo()
        box(g, (c[0], c[1], c[2] + r[2] - 1), (r[0] * 0.88 + 2, r[1] * 0.88 + 2, 3.4), p=6)
        rig.part("body", g, SAND_LT)
        g = Geo()
        courses(g, c[0] - r[0] * 0.9, c[0] + r[0] * 0.9, c[1] - r[1] * 0.93, c[2] - r[2], c[2] + r[2] - 4)
        rig.part("body", g, SAND_DK, outline=0)
    g = Geo()
    for c, r in tiers:
        top = c[2] + r[2] + 2
        for k in range(5):
            x = c[0] - r[0] * 0.8 + k * r[0] * 0.3
            box(g, (x, c[1] - r[1] * 0.86, top + 4), (5.5, 4, 5), p=5)
    rig.part("body", g, SAND_LT)
    g = Geo()
    box(g, (-60, -30, 56), (5.5, 4, 5), p=5)
    rig.part("merlon", g, SAND_LT)

    # the cavalier tower in the middle (carries the top mount)
    cx, cy, cr, ch = CV
    g = Geo()
    box(g, (cx, cy, (110 + ch) / 2), (cr, cr, (ch - 110) / 2), p=8, taper=(1.0, 0.9))
    rig.part("body", g, SAND_LT)
    g = Geo()
    courses(g, cx - cr * 0.9, cx + cr * 0.9, cy - cr * 0.97, 110, ch - 6, 10)
    rig.part("body", g, SAND_DK)
    g = Geo()
    box(g, (cx, cy, ch - 3), (cr + 2, cr + 2, 4), p=6)
    rig.part("cavtop", g, SAND_DK)
    g = Geo()
    for k in range(4):                                     # parapet merlons on the cavalier
        box(g, (cx - cr + 6 + k * (2 * cr - 12) / 3, cy - cr - 0.5, ch + 5), (4.2, 3.2, 4.4), p=5)
    rig.part("cavtop", g, SAND_LT)
    g = Geo()                                              # the jagged stumps left when it shears off
    for k, dz in enumerate((5, 9, 3, 11, 6, 8, 4)):
        box(g, (cx - cr + 4 + k * (2 * cr - 8) / 6, cy - cr + 2, ch - 8 + dz * 0.5), (3.4, 3.0, dz * 0.6 + 2), p=3,
            rot=(0, 12 * (k % 3 - 1), 0))
    rig.part("stumps", g, SAND_DKR, outline=0.6)
    for wx, wz in ((cx - 10, 200), (cx + 12, 170)):
        window(rig, "win", wx, cy - cr - 0.5, wz, 7, 14, frame=WOOD)
        window(rig, "windark", wx, cy - cr - 0.7, wz, 7, 14, glow_hex=HOLE, frame=WOOD)
        g = Geo()
        box(g, (wx, cy - cr - 1.6, wz - 8.2), (5.4, 1.6, 1.0), p=4, cuts=2)   # sill
        rig.part("body", g, SAND_LT, outline=0.5)

    # the signal tower behind, under the team dome
    g = Geo()
    cyl(g, (SG[0], SG[1], 110), (SG[0], SG[1], 250), 20, 18, bevel=1.0, segs=26)
    rig.part("body", g, SAND)
    g = Geo()
    cyl(g, (SG[0], SG[1], 246), (SG[0], SG[1], 254), 22, bevel=0.8, segs=26)
    rig.part("body", g, SAND_DK)
    prof = [(0, 0), (21, 0)] + [(21 * math.cos(math.pi / 2 * k / 8), 20 * math.sin(math.pi / 2 * k / 8)) for k in range(1, 9)]
    g = Geo().lathe(prof, (SG[0], SG[1], 252), (SG[0], SG[1], 274), segs=26)
    rig.part("dome", g, team=True)
    g = Geo()
    cyl(g, (SG[0], SG[1], 270), (SG[0], SG[1], 278), 3.4, 2.2, bevel=0.6)
    rig.part("dome", g, BRASS, finish="metal", outline=0.5)

    # the round bastion tower at the lane edge (carries the third mount)
    bx, by, br, bh = BT
    g = Geo()
    cyl(g, (bx, by, 0), (bx, by, bh), br + 4, br, bevel=1.0, segs=28)
    rig.part("body", g, SAND_LT)
    g = Geo()
    for z in (48, 120):
        cyl(g, (bx, by, z - 2.5), (bx, by, z + 2.5), br + 4.4 - z * 0.022, bevel=0.8, segs=28)
    cyl(g, (bx, by, bh - 6), (bx, by, bh), br + 2.2, bevel=0.8, segs=28)
    rig.part("body", g, SAND_DK)
    for z in (84, 150):
        g = Geo()
        box(g, (bx + 4, by - br - 1.5, z), (2.2, 2, 6), p=4, cuts=2)
        rig.part("body", g, "#2A2622", outline=0, highlight=False)

    # embrasures with cannon muzzles
    for x, y, z in ((-130, -39, 28), (-96, -39, 28), (-114, -21, 84)):
        g = Geo()
        box(g, (x, y - 0.5, z), (7, 2, 5.5), p=4, cuts=2)
        rig.part("body", g, "#2A2622", outline=0, highlight=False)
        g = Geo()
        cyl(g, (x, y + 4, z - 0.5), (x, y - 6, z - 0.5), 3.4, bevel=0.6)
        rig.part("body", g, IRON, finish="metal", outline=0.5)
    # gate
    gx = -50
    g = Geo().slab([(gx - 13, 0), (gx + 13, 0), (gx + 13, 22)] + [(gx + 13 * math.cos(a), 22 + 13 * math.sin(a)) for a in
                                                               [math.pi * k / 8 for k in range(1, 8)]] + [(gx - 13, 22)],
                   -39.5, 3.0)
    rig.part("body", g, GREEN)
    g = Geo()
    for a in [math.pi * k / 10 for k in range(0, 11)]:
        box(g, (gx + 16 * math.cos(a), -40.5, 22 + 16 * math.sin(a)), (2.6, 1.4, 2.6), p=4, cuts=2)
    rig.part("body", g, SAND_DK, outline=0.5)
    g = Geo()
    box(g, (gx, -42, 20), (0.8, 0.6, 18), p=4, cuts=2)
    rig.part("body", g, WOOD, outline=0.3)
    # long team banner on the upper tier
    ban = Geo().slab([(-148, 104), (-128, 104), (-128, 58), (-138, 50), (-148, 58)], -21.5, 1.6)
    bf = F.Face(rig, "banner", [ban])
    rig.part("banner", ban, team=True)
    g = Geo().slab([(-148, 62), (-128, 62), (-128, 58), (-138, 50), (-148, 58)], -22.6, 0.6)
    rig.part("banner", g, CREAM, outline=0.4)          # cream hem
    g = Geo().capsule((-150, -22.2, 105), (-126, -22.2, 105), 1.3)
    rig.part("body", g, BRASS, finish="metal", outline=0.5)
    g = KG.anchor(bf, Geo(), K.scr(bf, (-138, -23.0, 82)), s=1.9, w=1.7)
    rig.part("banner", g, CREAM, highlight=False, outline=0)

    # the gun platforms
    platform(rig, "body", M[0], SAND_LT, SAND_DK, style="bastion", r=(26, 19))
    platform(rig, "body", M[1], SAND_LT, SAND_DK, style="bastion", r=(26, 19))
    platform(rig, "body", M[2], SAND_LT, SAND_DKR, style="stone", r=(25, 20))
    platform(rig, "body", M[3], SAND_LT, SAND_DKR, style="stone", r=(25, 19))
    for i in (1, 3):
        x, y, z = M[i]
        rig.joint(f"rail{i}", "body", (x - 26, y - 8, z))
        g = Geo()
        g.capsule((x - 27, y - 12, z + 5), (x - 27, y + 16, z + 5), 0.9)
        for dy in (-11, 2, 15):
            g.capsule((x - 27, y + dy, z), (x - 27, y + dy, z + 5.5), 0.8)
        rig.part(f"rail{i}", g, IRON, finish="metal", outline=0.4)

    for x, z in ((-70, 34), (-30, 34)):
        g = Geo()
        box(g, (x, -43, z), (3.2, 3.2, 4.2), p=4, cuts=2)
        rig.part("body", g, IRON, finish="metal", outline=0.5)
        g = Geo().blob((x, -47, z), (2.4, 1.2, 3.2), p=2.0)
        rig.part("body", g, glow="#FFE0A8", outline=0)

    chipped_cracks(rig, "crack1", [[(-120, -41, 36), (-114, -41, 26), (-120, -41, 14)],
                                   [(cx - 12, cy - cr - 1, 160), (cx - 7, cy - cr - 1, 150), (cx - 12, cy - cr - 1, 140)]],
                   CRACK, SAND_LT)
    chipped_cracks(rig, "crack2", [[(-150, -41, 36), (-144, -41, 26), (-150, -41, 16)],
                                   [(-110, -23, 96), (-104, -23, 86), (-110, -23, 74)],
                                   [(bx, by - br - 3, 100), (bx + 5, by - br - 3, 90), (bx, by - br - 3, 78)]], CRACK, SAND_LT)
    chipped_cracks(rig, "crack3", [[(cx + 8, cy - cr - 1, 230), (cx + 13, cy - cr - 1, 220), (cx + 8, cy - cr - 1, 208)],
                                   [(-80, -41, 40), (-74, -41, 30), (-80, -41, 18)],
                                   [(bx - 4, by - br - 3, 160), (bx + 1, by - br - 3, 150)]], CRACK, SAND_LT)
    rubble(rig, "rubble1", [(-156, -52), (-132, -60)], SAND_DK, seed=3)
    rubble(rig, "rubble2", [(-106, -62), (20, -54), (-76, -64)], SAND_DK, seed=13)
    rubble(rig, "rubble3", [(-152, -66), (-120, -68), (-34, -66), (24, -62)], SAND_DK, seed=23, size=1.2)

    # stage 1: a corner block of the upper tier knocked off (a jagged dark bite behind it)
    g = Geo()
    box(g, (-104, -19.5, 104), (9, 4.5, 7.0), p=5)
    rig.part("corner", g, SAND_LT)
    g = Geo()
    for dx, dz, r in ((0, 1, 7.0), (-6, -2, 4.8), (5, -3, 4.4), (-2, -6, 3.8)):
        g.blob((-104 + dx, -21.4, 104 + dz), (r, 2.0, r * 0.8), p=1.8, rot=(0, 25 * dx, 0))
    rig.part("notch", g, HOLE, outline=0, highlight=False)
    g = Geo()
    for dx, dz, rot in ((-10, 4, 20), (9, 3, -30), (0, -9, 10)):
        box(g, (-104 + dx, -22.6, 104 + dz), (2.8, 1.6, 2.2), p=3, rot=(0, rot, 0))
    rig.part("notch", g, SAND_DK, outline=0.5)
    # stage 2: a breach blasted in the lower tier wall, loose blocks round it
    g = Geo()
    for dx, dz, r in ((0, 0, 9.5), (-7, -4, 6.0), (7, -3, 6.5), (-4, 6, 5.5), (5, 6, 5.0), (0, -7, 5.0)):
        g.blob((-112 + dx, -40.2, 30 + dz), (r, 2.2, r * 0.85), p=1.8, rot=(0, 30 * dx, 0))
    rig.part("breach", g, HOLE, outline=0, highlight=False)
    g = Geo()
    for dx, dz, rot in ((-12, 8, 20), (11, 9, -25), (-13, -6, 40), (12, -8, -10), (0, 12, 5)):
        box(g, (-112 + dx, -41.6, 30 + dz), (3.6, 1.8, 2.6), p=3, rot=(0, rot, 0))
    rig.part("breach", g, SAND_DK, outline=0.6)
    g = Geo()
    for x, z, w, h in ((-96, 124, 18, 16), (cx - 10, 214, 10, 14), (-112, 44, 16, 14)):
        g.blob((x, -44 if z < 60 else (-23 if z < 150 else cy - cr - 1.4), z), (w, 1.4, h), p=2.0)
    rig.part("scorch", g, SOOT, outline=0, highlight=False)
    flames(rig, "fire1", [(-100, -24, 108, 1.25), (-82, -23, 110, 0.8)])
    flames(rig, "fire2", [(cx - 6, cy - 6, 246, 1.35), (-112, -44, 22, 0.8), (-150, -24, 110, 0.8)])
    flag(rig, "root", "flagA", (SG[0], SG[1], 318), length=30, height=17, pole=272)
    flag(rig, "root", "flagB", (cx - 22, cy + 10, 300), length=24, height=14, pole=250)

    # Treasury: powder kegs, crates and shot, a gold chest
    for k, (x, y) in enumerate(((-156, -62), (-144, -66))):
        g = Geo().lathe([(0, 0), (6.4, 0), (7.4, 7), (6.4, 14), (0, 14)], (x, y, 0), (x, y, 14), segs=16)
        rig.part("treasury1", g, WOOD_LT)
        g = Geo()
        for z in (2.5, 11.5):
            cyl(g, (x, y, z - 1), (x, y, z + 1), 7.0 - abs(z - 7) * 0.1, bevel=0.3)
        rig.part("treasury1", g, IRON, finish="metal", outline=0.4)
    g = Geo()
    box(g, (-128, -64, 8), (9, 8, 8), p=6)
    box(g, (-128, -62, 22), (7, 6, 6), p=6)
    rig.part("treasury2", g, WOOD_LT)
    g = Geo()
    for (dx, dy, dz) in ((-6, 0, 3.2), (0, 0, 3.2), (6, 0, 3.2), (-3, 0, 8.8), (3, 0, 8.8), (0, 0, 14.4)):
        g.sphere((-110 + dx, -68 + dy, dz), 3.2, cuts=3)
    rig.part("treasury2", g, IRON, finish="metal", outline=0.5)
    g = Geo()
    box(g, (-100, -66, 7), (10, 7, 7), p=5)
    rig.part("treasury3", g, GREEN)
    g = Geo()
    for dx, dz in ((-4, 16), (3, 17), (0, 19), (6, 15), (-7, 15)):
        g.blob((-100 + dx, -66, dz), (3.2, 3.2, 1.4), p=2.0)
    for dx in (-8, 8):
        box(g, (-100 + dx, -73.2, 8), (1.2, 0.6, 7), p=4, cuts=2)
    rig.part("treasury3", g, BRASS, finish="metal", outline=0.5)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "merlon": {"hide": True}, "rubble1": {"show": True},
                     "corner": {"hide": True}, "notch": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "rail1": {"r": -20.0, "z": -2.0},
                     "breach": {"show": True}, "fire1": {"show": True}, "scorch": {"show": True},
                     "win": {"hide": True}, "windark": {"show": True},
                     "banner": {"r": 7.0, "x": 1.0, "z": -1.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "rail3": {"r": 16.0},
                     "dome": {"r": 22.0, "x": -6.0, "z": -12.0}, "fire2": {"show": True},
                     "cavtop": {"r": -24.0, "x": 6.0, "z": -14.0}, "stumps": {"show": True},
                     "banner": {"r": 30.0, "x": 4.0, "z": -4.0}})
    return pose


MODULE = base_module(
    "gunpowder", "Star Fort", height=320, width=190, canvas=(470, 700), feet=(360, 650),
    build=build, crumble=crumble, mount_depth=DEPTHS,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-70, -48, 34), 3, 16), ((-30, -48, 34), 3, 16), ((CV[0] - 10, CV[1] - CV[2] - 2, 200), 2, 18)],
    smoke=[((CV[0], CV[1], 256), 2), ((-120, -20, 110), 3), ((-60, -30, 60), 3)],
    horn=(-100, 350), yaw=BASE_YAW,
)
