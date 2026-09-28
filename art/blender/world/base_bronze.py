"""Bronze Age base: the Ziggurat (docs/design-lane-ages.md A17.12 Bases).

A stepped sandstone temple-mount of four receding tiers, each with buttress panels, a darker string
course and a sandstone cornice, a stairway climbing the front face, a pylon gatehouse in front with
aged-bronze doors (verdigris panels, polished studs), bronze braziers with white-hot fire on the
tier corners, long team banners on the tier faces and a small columned shrine on the summit under a
team roof. The turret mounts (common.BASE_MOUNTS) are real platforms: the gate pylon's roof, a
cornice ledge on the second tier, a corbelled balcony thrust out from the third tier, and a slab on
the summit terrace. Crumble: cracks, a toppled brazier and rubble (75%), a banner torn and a broken
balcony rail (50%), the shrine roof knocked askew and the summit flag gone (25%).
Treasury: grain sacks and amphorae (1), a domed granary (2), a trade barge with a team sail (3).
"""
import math

from ageborn_art import rigs_bronze as P
from ageborn_art.geometry import Geo

from world.common import BASE_YAW, base_module, box, chipped_cracks, cyl, flag, platform, rubble

SAND = P.SAND
SAND_LT = P.SAND_LT
SAND_DK = P.SAND_DK
SAND_DKR = "#978869"
MORTAR = "#8A7C62"
AGED = P.AGED
AGED_DK = P.AGED_DK
BRONZE = P.BRONZE
VERD = P.VERD
VERD_LT = P.VERD_LT
PLUM = P.PLUM
PLUM_DK = P.PLUM_DK
WOOD = "#8E7658"
WOOD_DK = "#5E4C3C"
LINEN = P.LINEN
SACK = "#CDB894"
CLAY = "#B98A66"
OLIVE = "#6F7F55"
CRACK = "#5A4E40"
FIRE = "#FFD08A"
FIRE_CORE = "#FFF3D6"

DEPTHS = [-40, -24, -40, -24]
CX = -98.0                    # the ziggurat's centre line
Y0, Y1 = -44.0, 56.0          # front and back faces of the lowest tier
# tiers: (half width, z bottom, z top, front-face y)
TIERS = [(90.0, 0.0, 56.0, -44.0), (72.0, 56.0, 120.0, -30.0), (56.0, 120.0, 190.0, -16.0), (40.0, 190.0, 256.0, -4.0)]
GATE = (-10.0, -46.0)         # the gate pylon (centre x, front face y)


def tier(rig, joint, hw, z0, z1, yf, k):
    """One tier: the core, buttress panels, string course and cornice on the front (-Y) face."""
    yb = Y1 - k * 8.0
    yc = (yf + yb) / 2
    hd = (yb - yf) / 2
    g = Geo()
    box(g, (CX, yc, (z0 + z1) / 2), (hw, hd, (z1 - z0) / 2), p=10)
    rig.part(joint, g, SAND_DK)
    g = Geo()
    n = 7 - k
    for i in range(n):
        x = CX - hw + (i + 0.5) * 2 * hw / n
        box(g, (x, yf - 0.8, (z0 + z1) / 2 - 2.0), (hw / n - 3.4, 1.4, (z1 - z0) / 2 - 7.0), p=6, cuts=2)
    rig.part(joint, g, SAND, outline=0.5)
    g = Geo()
    box(g, (CX, yf - 1.2, z0 + 3.0), (hw + 0.6, 1.6, 2.4), p=6, cuts=2)
    rig.part(joint, g, SAND_DKR, outline=0.5)
    g = Geo()
    box(g, (CX, yc - 1.0, z1 - 1.8), (hw + 3.2, hd + 3.2, 2.6), p=6)
    rig.part(joint, g, SAND_LT)
    g = Geo()
    box(g, (CX, yc - 1.0, z1 - 5.4), (hw + 2.0, hd + 2.2, 1.8), p=6, cuts=2)
    rig.part(joint, g, PLUM, outline=0.4)


def stairs(rig, joint):
    """A stairway up the middle of the front faces (tiers 1-3), in lighter sandstone."""
    g = Geo()
    for k, (hw, z0, z1, yf) in enumerate(TIERS[:3]):
        steps = 8
        for i in range(steps):
            z = z0 + (z1 - z0) * (i + 0.5) / steps
            y = yf - 12.0 + 11.0 * i / steps
            box(g, (CX, y, z), (13.0 - k * 1.5, 12.0 - 11.0 * i / steps, (z1 - z0) / steps / 2 + 0.2), p=8, cuts=2)
    rig.part(joint, g, SAND_LT, outline=0.5)
    g = Geo()
    for k, (hw, z0, z1, yf) in enumerate(TIERS[:3]):
        for s in (-1, 1):
            g.capsule((CX + s * (14.5 - k * 1.5), yf - 23.0, z0 + 2.0), (CX + s * (14.5 - k * 1.5), yf - 1.5, z1 + 1.0), 2.0)
    rig.part(joint, g, SAND_DKR, outline=0.5)


def brazier(rig, joint, x, y, z, name):
    g = Geo()
    cyl(g, (x, y, z), (x, y, z + 9.0), 2.2, 1.6, bevel=0.3)
    g.lathe([(0, 0), (6.2, 1.0), (7.6, 5.0), (7.0, 5.6), (0, 3.6)], (x, y, z + 8.0), (x, y, z + 14.0), segs=20)
    rig.part(joint, g, AGED, finish="metal")
    g = Geo().lathe([(7.2, 0), (7.8, 0.4), (7.8, 1.2), (7.2, 1.4)], (x, y, z + 12.6), (x, y, z + 13.6), segs=20)
    rig.part(joint, g, BRONZE, finish="metal", outline=0.4)
    rig.joint(name, joint, (x, y, z + 14.0))
    g = Geo().blob((x, y - 1, z + 20.0), (5.6, 4.4, 8.6), p=2.0, taper=(1.0, 0.25))
    rig.part(name, g, glow=FIRE, outline=0)
    g = Geo().blob((x, y - 3, z + 17.5), (2.8, 2.2, 4.4), p=2.0, taper=(1.0, 0.3))
    rig.part(name, g, glow=FIRE_CORE, outline=0)


def banner(rig, joint, x, y, z_top, h, w=16.0):
    g = Geo().slab([(x - w / 2, z_top), (x + w / 2, z_top), (x + w / 2, z_top - h + 8), (x, z_top - h),
                    (x - w / 2, z_top - h + 8)], y, 1.6)
    rig.part(joint, g, team=True)
    g = Geo().capsule((x - w / 2 - 2, y - 0.6, z_top + 1), (x + w / 2 + 2, y - 0.6, z_top + 1), 1.3)
    rig.part(joint, g, AGED_DK, finish="metal", outline=0.4)
    g = Geo()
    g.capsule((x - 4.6, y - 1.4, z_top - h * 0.62), (x, y - 1.5, z_top - h * 0.32), 1.5)
    g.capsule((x, y - 1.5, z_top - h * 0.32), (x + 4.6, y - 1.4, z_top - h * 0.62), 1.5)
    rig.part(joint, g, SAND_LT, outline=0.4)


def build(rig, M):
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    rig.joint("shrine", "body", (CX - 10, 12, 256))
    rig.joint("balrail", "body", M[2])
    rig.joint("bannerLow", "body", (CX + 40, TIERS[1][3] - 3, 70))

    for k, (hw, z0, z1, yf) in enumerate(TIERS):
        tier(rig, "body", hw, z0, z1, yf, k)
    stairs(rig, "body")

    # long team banners on the tier faces (one tears at crumble 2)
    banner(rig, "body", CX - 46, TIERS[1][3] - 3.0, 112, 44)
    banner(rig, "bannerLow", CX + 40, TIERS[1][3] - 3.0, 112, 44)
    banner(rig, "body", CX - 30, TIERS[2][3] - 3.0, 182, 48, w=14)
    banner(rig, "body", CX + 30, TIERS[2][3] - 3.0, 182, 48, w=14)

    # the summit shrine: a plinth, columns, a plum frieze and a team pitched roof
    sx, sy = CX - 10, 12.0
    g = Geo()
    box(g, (sx, sy, 262), (28, 20, 6), p=8)
    rig.part("shrine", g, SAND_LT)
    g = Geo()
    for x in (-22, -8, 6, 20):
        cyl(g, (sx + x, sy - 16, 268), (sx + x, sy - 16, 292), 2.8, 2.4, bevel=0.5)
    rig.part("shrine", g, LINEN)
    g = Geo()
    box(g, (sx, sy, 280), (22, 14, 12), p=8)
    rig.part("shrine", g, SAND_DK)
    g = Geo()
    box(g, (sx, sy - 2, 295), (30, 21, 3.4), p=6)
    rig.part("shrine", g, PLUM)
    g = Geo().slab([(sx - 33, 298), (sx + 33, 298), (sx, 318)], sy - 20, 3.0)
    g.blob((sx, sy, 306), (32, 20, 9), p=3.0, taper=(1.0, 0.1))
    rig.part("shrine", g, team=True)
    g = Geo().sphere((sx, sy - 22, 318), 2.4, cuts=3)
    rig.part("shrine", g, BRONZE, finish="metal", outline=0.5)

    # the gate pylon: a battered sandstone tower with a cavetto cornice and bronze doors
    gx, gy = GATE
    g = Geo()
    box(g, (gx - 14, gy + 20, 28), (20, 20, 28), p=8, taper=(1.0, 0.86))
    rig.part("body", g, SAND_DK)
    g = Geo()
    box(g, (gx - 14, gy + 19, 55), (23, 23, 3.4), p=6)
    rig.part("body", g, SAND_LT)
    g = Geo()
    box(g, (gx - 14, gy + 19, 50), (21.5, 21.5, 1.4), p=6, cuts=2)
    rig.part("body", g, VERD, outline=0.4)
    dx = gx - 14
    g = Geo()
    box(g, (dx, gy - 0.6, 18), (11.5, 1.6, 18), p=5)
    rig.part("body", g, AGED_DK, finish="metal")
    g = Geo()
    for s in (-1, 1):
        box(g, (dx + s * 5.4, gy - 1.8, 18), (4.6, 1.2, 15.5), p=5, cuts=2)
    rig.part("body", g, VERD_LT, finish="metal", outline=0.4)
    g = Geo()
    for s in (-1, 1):
        for z in (6, 14, 22, 30):
            g.sphere((dx + s * 5.4, gy - 3.0, z), 1.0, cuts=2)
    g.capsule((dx - 0.8, gy - 3.0, 4.0), (dx - 0.8, gy - 3.0, 32.0), 0.7)
    rig.part("body", g, BRONZE, finish="metal", outline=0.3)
    g = Geo().slab([(dx - 14, 0), (dx + 14, 0), (dx + 14, 38), (dx - 14, 38)], gy + 0.4, 2.0)
    rig.part("body", g, SAND_DKR, outline=0.4)

    # braziers on the tier corners (lights), the first one is knocked over at crumble 1
    brazier(rig, "body", CX + TIERS[0][0] - 6, TIERS[0][3] + 6, TIERS[0][2], "fire1")
    brazier(rig, "body", CX - TIERS[1][0] + 6, TIERS[1][3] + 6, TIERS[1][2], "fire2")
    brazier(rig, "body", CX + TIERS[2][0] - 8, TIERS[2][3] + 6, TIERS[2][2], "fire3")
    brazier(rig, "shrine", sx + 34, sy - 10, 256, "fire4")

    # olive shrubs at the foot (verdigris-olive, soft)
    g = Geo()
    for x, y, r in ((-182, -52, 9), (-170, -58, 7), (-60, -56, 7), (-36, -60, 6)):
        g.blob((x, y, r * 0.8), (r, r * 0.8, r * 0.9), p=2.1)
    rig.part("body", g, OLIVE, finish="hair")

    # the turret platforms
    platform(rig, "body", M[0], SAND_LT, SAND_DKR, style="stone", r=(25, 19))
    platform(rig, "body", M[1], SAND_LT, SAND_DKR, style="stone", r=(25, 19))
    platform(rig, "body", M[2], SAND_LT, SAND_DKR, style="stone", r=(26, 19))
    x, y, z = M[2]
    g = Geo()
    for yy in (y - 8, y + 14):
        g.capsule((x - 8, yy, z - 5), (TIERS[2][0] * -1 + CX + 30, yy, z - 5), 3.0)        # beams back into the tier
        g.capsule((x - 4, yy, z - 6), (x - 30, yy, z - 40), 2.4)                           # raking struts
    rig.part("body", g, WOOD_DK, outline=0.5)
    g = Geo()
    for i in range(5):
        g.capsule((x - 22 + i * 10, y - 18, z), (x - 22 + i * 10, y - 18, z + 7), 1.0)
    g.capsule((x - 24, y - 18, z + 7), (x + 20, y - 18, z + 7), 1.1)
    rig.part("balrail", g, AGED, finish="metal", outline=0.4)
    platform(rig, "body", M[3], SAND_LT, SAND_DKR, style="stone", r=(25, 19))

    # crumble details
    f = TIERS[0][3] - 1.5
    chipped_cracks(rig, "crack1", [[(CX - 60, f, 44), (CX - 54, f, 34), (CX - 60, f, 22)],
                                   [(CX + 50, TIERS[1][3] - 1.5, 108), (CX + 56, TIERS[1][3] - 1.5, 96)]], CRACK, SAND_LT)
    chipped_cracks(rig, "crack2", [[(CX + 40, f, 40), (CX + 46, f, 28), (CX + 40, f, 14)],
                                   [(CX - 30, TIERS[2][3] - 1.5, 176), (CX - 24, TIERS[2][3] - 1.5, 162),
                                    (CX - 30, TIERS[2][3] - 1.5, 148)],
                                   [(GATE[0] - 22, GATE[1] - 1, 46), (GATE[0] - 18, GATE[1] - 1, 38)]], CRACK, SAND_LT)
    chipped_cracks(rig, "crack3", [[(CX + 20, TIERS[3][3] - 1.5, 246), (CX + 26, TIERS[3][3] - 1.5, 234),
                                    (CX + 20, TIERS[3][3] - 1.5, 222)],
                                   [(CX - 70, f, 50), (CX - 64, f, 38)]], CRACK, SAND_LT)
    rubble(rig, "rubble1", [(-176, -52), (-150, -60)], SAND_DK, seed=5)
    rubble(rig, "rubble2", [(-120, -60), (10, -58), (-70, -64)], SAND_DK, seed=15)
    rubble(rig, "rubble3", [(-186, -66), (-150, -70), (-40, -68), (18, -66)], SAND_DK, seed=25, size=1.2)
    g = Geo().blob((CX + TIERS[0][0] + 4, TIERS[0][3] - 6, 4), (7, 5, 3), p=2.4)   # the fallen brazier bowl
    rig.part("rubble1", g, AGED, finish="metal")

    flag(rig, "root", "flagA", (sx - 4, sy + 4, 356), length=30, height=16, pole=316, pole_color=WOOD_DK,
         finial="#B8863B")
    flag(rig, "root", "flagB", (CX - 50, 40, 236), length=26, height=14, pole=190, pole_color=WOOD_DK,
         finial="#B8863B")

    # Treasury: sacks and amphorae (1), a domed granary (2), a trade barge (3)
    g = Geo()
    for x, y in ((-166, -60), (-156, -66), (-160, -54)):
        g.blob((x, y, 8), (6.6, 5.6, 8.4), p=2.4, taper=(1.0, 0.7))
        g.blob((x, y, 17), (2.6, 2.4, 1.5), p=2.0)
    rig.part("treasury1", g, SACK)
    g = Geo()
    for x, y in ((-144, -62), (-136, -58)):
        g.lathe([(0, 0), (2.4, 0.4), (5.4, 6.0), (5.0, 11.0), (2.0, 14.0), (2.2, 17.0), (0, 17.2)], (x, y, 0), (x, y, 17),
                segs=16)
    rig.part("treasury1", g, CLAY)
    g = Geo()
    cyl(g, (-120, -40, 0), (-120, -40, 18), 16, bevel=1.0, segs=28)
    g.blob((-120, -40, 18), (16, 16, 18), p=2.2)
    g.clip((0, 0, 18), (0, 0, -1), fill=False)
    rig.part("treasury2", g, SAND_LT)
    g = Geo()
    box(g, (-120, -56.4, 8), (5, 1.2, 8), p=5)
    rig.part("treasury2", g, team=True, outline=0.4)
    g = Geo()
    for z in (12, 24):
        cyl(g, (-120, -40, z), (-120, -40, z + 1.6), 16.6 if z < 18 else 13.0, bevel=0.3, segs=28)
    rig.part("treasury2", g, SAND_DK, outline=0.4)
    bx, by = -40.0, -76.0
    g = Geo().blob((bx, by, 7), (26, 9, 6), p=2.4, taper=(0.9, 1.0))
    g.clip((0, 0, 9), (0, 0, 1))
    g.blob((bx + 24, by, 11), (5, 5, 7), p=2.2, rot=(0, -30, 0))
    g.blob((bx - 24, by, 11), (5, 5, 7), p=2.2, rot=(0, 30, 0))
    rig.part("treasury3", g, WOOD)
    g = Geo()
    for x in (-14, -3, 8):
        g.blob((bx + x, by, 12), (5, 5, 4), p=2.6)
    rig.part("treasury3", g, SACK)
    g = Geo().capsule((bx - 2, by + 2, 8), (bx - 2, by + 2, 46), 1.2)
    g.capsule((bx - 14, by + 2, 44), (bx + 10, by + 2, 44), 0.9)
    rig.part("treasury3", g, WOOD_DK, outline=0.4)
    g = Geo().slab([(bx - 13, 43), (bx + 9, 43), (bx + 12, 20), (bx - 16, 20)], by + 1.0, 1.2)
    rig.part("treasury3", g, team=True, outline=0.5)
    g = Geo()
    for x in (-22, -10, 2, 14):
        g.sphere((bx + x, by - 8.4, 6.0), 1.2, cuts=2)
    rig.part("treasury3", g, BRONZE, finish="metal", outline=0.3)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "fire1": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True},
                     "balrail": {"r": -16.0, "z": -3.0, "x": -1.0},
                     "bannerLow": {"r": 8.0, "sz": 0.62, "z": 10.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "fire3": {"hide": True},
                     "shrine": {"r": 10.0, "x": -4.0, "z": -8.0}})
    return pose


MODULE = base_module(
    "bronze", "Ziggurat", height=330, width=190, canvas=(480, 800), feet=(366, 750),
    build=build, crumble=crumble, mount_depth=DEPTHS,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((CX + TIERS[0][0] - 6, TIERS[0][3] + 5, TIERS[0][2] + 20), 0, 22),
            ((CX - TIERS[1][0] + 6, TIERS[1][3] + 5, TIERS[1][2] + 20), 3, 22),
            ((CX + TIERS[2][0] - 8, TIERS[2][3] + 5, TIERS[2][2] + 20), 2, 22),
            ((CX + 24, 2, 276), 3, 20)],
    smoke=[((CX, 10, 300), 2), ((CX - 40, -20, 130), 3), ((-40, -40, 60), 3)],
    horn=(-100, 360), yaw=BASE_YAW,
)
