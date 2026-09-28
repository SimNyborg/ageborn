"""Gunpowder Age base: the Star Fort (DESIGN A11 Bases).

Three tiers of battered sandstone bastions with cannon embrasures, a round signal tower under a
team-painted dome, a green gate and stone gun platforms stepping up the front for the turret
mounts. Team colour: the dome, a long banner and the flags. Crumble: cracks and a lost merlon
(75%), a broken gun platform rail and rubble (50%), the dome knocked askew and the top flag gone
(25%). Treasury: powder kegs (1), crates and a cannonball pyramid (2), a gold chest (3).
"""
import math

from ageborn_art.geometry import Geo

from world.common import BASE_YAW, base_module, box, cracks, cyl, flag, rubble, torch, window

SAND = "#B8A88A"
SAND_LT = "#CABB9C"
SAND_DK = "#9A8C72"
GREEN = "#2E5E4E"
WOOD = "#4A3B2E"
WOOD_LT = "#7A6652"
BRASS = "#C9A227"
IRON = "#3C3F45"
CREAM = "#EFE6CF"

CRACK = "#6E6250"
MOUNTS = [(-12, -46), (-16, -90), (-26, -134), (-44, -178)]
TW = (-102.0, 28.0)      # tower centre


def build(rig, M):
    for j, pos in (("dome", (TW[0], TW[1], 206)), ("merlon", (-60, -30, 146))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)

    # bastion tiers (battered walls), each with a cordon moulding
    tiers = [((-78, 14, 27), (84, 52, 27)), ((-86, 18, 76), (66, 44, 22)), ((-94, 22, 120), (50, 36, 22))]
    for (c, r) in tiers:
        g = Geo()
        box(g, c, r, p=9, taper=(1.0, 0.9))
        rig.part("body", g, SAND)
        g = Geo()
        box(g, (c[0], c[1], c[2] + r[2] - 1), (r[0] * 0.92 + 2, r[1] * 0.92 + 2, 3.2), p=6)
        rig.part("body", g, SAND_LT)
    # parapet merlons on each tier
    g = Geo()
    for (c, r) in tiers:
        top = c[2] + r[2] + 2
        for k in range(5):
            x = c[0] - r[0] * 0.8 + k * r[0] * 0.4
            if (c[2], k) == (120, 3):
                continue
            box(g, (x, c[1] - r[1] * 0.9, top + 4), (5.5, 4, 5), p=5)
    rig.part("body", g, SAND_LT)
    g = Geo()
    box(g, (-60, -12.5, 150), (5.5, 4, 5), p=5)
    rig.part("merlon", g, SAND_LT)
    # stone courses
    g = Geo()
    for z in (14, 32):
        box(g, (-78, -37, z), (80, 1.0, 0.9), p=4, cuts=2)
    rig.part("body", g, SAND_DK, outline=0)
    # embrasures with cannon muzzles
    for x, y, z in ((-120, -37, 30), (-80, -37, 30), (-108, -26, 78), (-128, -14, 120)):
        g = Geo()
        box(g, (x, y - 0.5, z), (7, 2, 5.5), p=4, cuts=2)
        rig.part("body", g, "#2A2622", outline=0, highlight=False)
        g = Geo()
        cyl(g, (x, y + 4, z - 0.5), (x, y - 5, z - 0.5), 3.4, bevel=0.6)
        rig.part("body", g, IRON, finish="metal", outline=0.5)
    # gate
    gx = -40
    g = Geo().slab([(gx - 13, 0), (gx + 13, 0), (gx + 13, 22)] + [(gx + 13 * math.cos(a), 22 + 13 * math.sin(a)) for a in
                                                               [math.pi * k / 8 for k in range(1, 8)]] + [(gx - 13, 22)],
                   -37.5, 3.0)
    rig.part("body", g, GREEN)
    g = Geo()
    for a in [math.pi * k / 10 for k in range(0, 11)]:
        box(g, (gx + 16 * math.cos(a), -38.5, 22 + 16 * math.sin(a)), (2.6, 1.4, 2.6), p=4, cuts=2)
    rig.part("body", g, SAND_DK, outline=0.5)
    g = Geo()
    box(g, (gx, -40, 20), (0.8, 0.6, 18), p=4, cuts=2)
    rig.part("body", g, WOOD, outline=0.3)
    # long team banner on the second tier
    g = Geo().slab([(-146, 94), (-126, 94), (-126, 40), (-136, 32), (-146, 40)], -37.8, 1.6)
    rig.part("body", g, team=True)
    g = Geo().capsule((-148, -38.5, 95), (-124, -38.5, 95), 1.3)
    rig.part("body", g, BRASS, finish="metal", outline=0.5)
    g = Geo().star((-136, -39.5, 70), 5.5, 2.4, 1.0)
    rig.part("body", g, CREAM, outline=0.5)

    # the round signal tower and its dome (team)
    g = Geo()
    cyl(g, (TW[0], TW[1], 136), (TW[0], TW[1], 206), 22, 20, bevel=1.0, segs=26)
    rig.part("body", g, SAND_LT)
    g = Geo()
    cyl(g, (TW[0], TW[1], 203), (TW[0], TW[1], 210), 24, bevel=0.8, segs=26)
    rig.part("body", g, SAND_DK)
    window(rig, "body", TW[0] + 2, TW[1] - 21.5, 180, 7, 14, frame=WOOD)
    prof = [(0, 0)] + [(22 * math.cos(a), 22 * math.sin(a) * 0.9) for a in [math.pi / 2 * (1 - k / 8) for k in range(8, -1, -1)]]
    prof = [(0, 0), (22, 0)] + [(22 * math.cos(math.pi / 2 * k / 8), 20 * math.sin(math.pi / 2 * k / 8)) for k in range(1, 9)]
    g = Geo().lathe(prof, (TW[0], TW[1], 208), (TW[0], TW[1], 230), segs=26)
    rig.part("dome", g, team=True)
    g = Geo()
    cyl(g, (TW[0], TW[1], 226), (TW[0], TW[1], 234), 3.4, 2.2, bevel=0.6)
    rig.part("dome", g, BRASS, finish="metal", outline=0.5)

    # gun platforms at the mounts
    for i, (x, y, z) in enumerate(M):
        g = Geo()
        box(g, (x - 2, y + 6, z - 3), (17, 15, 3), p=6)
        rig.part("body", g, SAND_LT)
        g = Geo()
        box(g, (x - 4, y + 8, z - 13), (12, 12, 8), p=5, taper=(0.75, 1.0))
        rig.part("body", g, SAND_DK)
        rig.joint(f"rail{i}", "body", (x - 16, y - 8, z))
        g = Geo()
        g.capsule((x - 17, y - 8, z + 5), (x + 13, y - 8, z + 5), 0.9)
        for dx in (-16, -1, 12):
            g.capsule((x + dx, y - 8, z), (x + dx, y - 8, z + 5.5), 0.8)
        rig.part(f"rail{i}", g, IRON, finish="metal", outline=0.4)

    for x, z in ((-58, 34), (-22, 34)):
        g = Geo()
        box(g, (x, -41, z), (3.2, 3.2, 4.2), p=4, cuts=2)
        rig.part("body", g, IRON, finish="metal", outline=0.5)
        g = Geo().blob((x, -45, z), (2.4, 1.2, 3.2), p=2.0)
        rig.part("body", g, glow="#FFE0A8", outline=0)

    cracks(rig, "crack1", [(-110, -37, 22, 20, 12), (-70, -26, 70, -15, 12)], CRACK)
    cracks(rig, "crack2", [(-140, -37, 30, -25, 14), (-100, -14, 118, 15, 12), (-60, -37, 18, 30, 12)], CRACK)
    cracks(rig, "crack3", [(TW[0] + 4, TW[1] - 21, 160, 5, 14), (-40, -26, 76, -30, 14), (-130, -26, 80, 10, 14)], CRACK)
    rubble(rig, "rubble1", [(-156, -52), (-126, -60)], SAND_DK, seed=3)
    rubble(rig, "rubble2", [(-86, -62), (8, -50), (-56, -64)], SAND_DK, seed=13)
    rubble(rig, "rubble3", [(-146, -66), (-110, -68), (-24, -66), (14, -60)], SAND_DK, seed=23, size=1.2)

    flag(rig, "root", "flagA", (TW[0], TW[1], 272), length=30, height=17, pole=226)
    flag(rig, "root", "flagB", (-150, 30, 176), length=24, height=14, pole=140)

    # Treasury: powder kegs, crates and shot, a gold chest
    for k, (x, y) in enumerate(((-156, -62), (-144, -66))):
        g = Geo().lathe([(0, 0), (6.4, 0), (7.4, 7), (6.4, 14), (0, 14)], (x, y, 0), (x, y, 14), segs=16)
        rig.part("treasury1", g, WOOD_LT)
        g = Geo()
        for z in (2.5, 11.5):
            cyl(g, (x, y, z - 1), (x, y, z + 1), 7.0 - abs(z - 7) * 0.1, bevel=0.3)
        rig.part("treasury1", g, IRON, finish="metal", outline=0.4)
    g = Geo()
    box(g, (-126, -64, 8), (9, 8, 8), p=6)
    box(g, (-126, -62, 22), (7, 6, 6), p=6)
    rig.part("treasury2", g, WOOD_LT)
    g = Geo()
    for (dx, dy, dz) in ((-6, 0, 3.2), (0, 0, 3.2), (6, 0, 3.2), (-3, 0, 8.8), (3, 0, 8.8), (0, 0, 14.4)):
        g.sphere((-104 + dx, -68 + dy, dz), 3.2, cuts=3)
    rig.part("treasury2", g, IRON, finish="metal", outline=0.5)
    g = Geo()
    box(g, (-82, -66, 7), (10, 7, 7), p=5)
    rig.part("treasury3", g, GREEN)
    g = Geo()
    for dx, dz in ((-4, 16), (3, 17), (0, 19), (6, 15), (-7, 15)):
        g.blob((-82 + dx, -66, dz), (3.2, 3.2, 1.4), p=2.0)
    for dx in (-8, 8):
        box(g, (-82 + dx, -73.2, 8), (1.2, 0.6, 7), p=4, cuts=2)
    rig.part("treasury3", g, BRASS, finish="metal", outline=0.5)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "merlon": {"hide": True}, "rubble1": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "rail2": {"r": -20.0, "z": -2.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "rail1": {"r": 16.0},
                     "dome": {"r": 16.0, "x": -4.0, "z": -8.0}})
    return pose


MODULE = base_module(
    "gunpowder", "Star Fort", height=240, width=160, canvas=(420, 560), feet=(310, 520), mounts=MOUNTS,
    build=build, crumble=crumble,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-58, -46, 34), 3, 16), ((-22, -46, 34), 3, 16), ((TW[0] + 2, TW[1] - 23, 180), 2, 18)],
    smoke=[((TW[0], TW[1], 214), 2), ((-110, -20, 110), 3), ((-60, -30, 60), 3)],
    horn=(-85, 262), yaw=BASE_YAW,
)
