"""Bonker, Gritty Epic: Stone Age club brute, 68 lu.

A hunched, heavy-shouldered brute with semi-realistic proportions (head about 1/6 of his
height), a weathered hide, a dark beard and dreadlocks, leather-wrapped shins, and a gnarled
club with a lashed stone head and bone spikes. Team colour: the wolf-pelt mantle and the hide
cape on his back (a 3-segment chain that bends), the loincloth flaps and the club's rag.
"""
import math

from ageborn_art.anim import Clip, key
from ageborn_art.geometry import Geo

import kin

SLUG = "bonker"
NAME = "Bonker"
HEIGHT_LU = 68
CANVAS = (390, 288)            # px at 3x in-game size (2.735 px/lu)
FEET = (174, 270)
YAW_DEG = -16.0

SKIN = "#A27A5E"
SKIN_D = "#7C5E4B"
HAIR = "#2A211C"
LEATHER = "#4E3B2C"
WOOD = "#5E4834"
STONE = "#77736C"
BONE = "#CFC3A6"
ROPE = "#7A6448"
EYE = "#EDE2C4"
DUST = "#9A8E7E"
FLASH_C = "#FFF2D0"

FIST = (7.8, -12.5, 21.5)
CLUB_HEAD = 27.0

RIG = None
SMEARS = {}
FLASH_FRAMES = {"hit": {0: 0.42}, "die": {0: 0.35}}
FLASH = FLASH_FRAMES  # read by the pipeline


def _club_geo(g, cx, cy, cz):
    h = CLUB_HEAD
    # gnarled haft
    g.lathe([(0, -6.0), (2.3, -5.6), (2.1, -2), (2.4, 3), (2.0, 8), (2.6, 12), (2.2, 16),
             (2.8, 20), (3.2, h - 6), (0, h - 4)], (cx, cy, cz), segs=12)
    for z, dx in ((5, 1.6), (13, -1.7), (18, 1.5)):
        g.blob((cx + dx, cy, cz + z), (1.6, 1.8, 1.4))
    return g


def _club_head_geo(cx, cy, cz):
    h = CLUB_HEAD
    stone = Geo().blob((cx + 0.6, cy, cz + h), (5.6, 5.2, 7.6), p=2.0, rot=(0, 12, 0))
    stone.blob((cx + 2.8, cy - 1.0, cz + h + 3.0), (3.8, 3.8, 3.6))
    stone.blob((cx - 2.6, cy + 0.5, cz + h - 2.5), (3.4, 3.8, 3.8))
    rope = Geo()
    for z in (h - 5.2, h - 3.4):
        rope.lathe([(0, -0.9), (4.3, -0.8), (4.6, 0), (4.3, 0.8), (0, 0.9)], (cx, cy, cz + z), segs=12)
    bone = Geo()
    for d, z in (((1, 0, 0.2), h + 1.5), ((-1, 0, 0.35), h - 0.5), ((0.3, -1, 0.3), h + 2.5)):
        base = (cx + d[0] * 4.6, cy + d[1] * 4.2, cz + z)
        tip = (base[0] + d[0] * 5.0, base[1] + d[1] * 5.0, base[2] + d[2] * 5.0)
        bone.lathe([(1.5, 0), (1.0, 2.8), (0, 5.2)], base, tip, segs=8)
    return stone, rope, bone


def build(rig):
    global RIG
    RIG = rig
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, 31))
    rig.joint("spine", "hips", (0, 0, 35))
    rig.joint("chest", "spine", (1, 0, 42))
    rig.joint("head", "chest", (5.5, 0, 55))
    for s, y in (("r", -6.0), ("l", 6.0)):
        rig.joint(f"thigh_{s}", "hips", (1, y, 31))
        rig.joint(f"shin_{s}", f"thigh_{s}", (2.5, y, 17))
        rig.joint(f"foot_{s}", f"shin_{s}", (0.5, y, 4))
    for s, y in (("r", -11.5), ("l", 11.0)):
        rig.joint(f"arm_{s}", "chest", (2, y, 50))
        rig.joint(f"fore_{s}", f"arm_{s}", (5, y - 0.5 if y < 0 else y + 0.5, 36))
        rig.joint(f"hand_{s}", f"fore_{s}", (7, y - 0.8 if y < 0 else y + 0.8, 24))
    rig.joint("club", "hand_r", FIST)

    # legs: heavy thighs, leather-wrapped shins, bare wrapped feet
    for s, y in (("r", -6.0), ("l", 6.0)):
        g = Geo().capsule((1, y, 31), (2.5, y, 17), 5.4, 4.1)
        g.blob((3.2, y, 25.5), (4.2, 4.4, 5.5))  # quad
        rig.part(f"thigh_{s}", g, SKIN, finish="skin")
        g = Geo().capsule((2.5, y, 17), (0.5, y, 4), 4.0, 2.7)
        g.blob((0.8, y, 13.5), (3.9, 3.9, 4.8))  # calf
        rig.part(f"shin_{s}", g, SKIN, finish="skin")
        g = Geo().capsule((1.9, y, 13.5), (0.6, y, 5.0), 4.3, 3.3)
        rig.part(f"shin_{s}", g, LEATHER, finish="leather")
        g = Geo().blob((3.2, y, 1.9), (5.2, 3.3, 2.0), p=2.4, taper=(1.0, 0.8))
        g.blob((0.3, y, 3.2), (3.0, 3.0, 2.4))
        rig.part(f"foot_{s}", g, SKIN_D, finish="skin")
        g = Geo().capsule((-0.5, y, 3.2), (3.0, y, 2.8), 2.9, 2.6)
        rig.part(f"foot_{s}", g, LEATHER, finish="leather", outline=0.5)

    # hips: belt, team hide skirt and two loincloth flaps that swing
    g = Geo().blob((0.8, 0, 32.0), (8.6, 10.6, 2.4), p=2.6)
    rig.part("hips", g, LEATHER, finish="leather")
    g = Geo().blob((0.4, 0, 28.8), (9.0, 11.0, 4.4), p=2.4, taper=(1.1, 0.95))
    rig.part("hips", g, team=True)
    rig.secondary("flap_f", "hips", (7.0, 0, 30), (8.5, 0, 19), max_deg=18, gain=1.0)
    g = Geo().slab([(5.0, 30.5), (9.5, 30.5), (10.4, 21.5), (8.5, 18.5), (7.2, 20.5), (5.2, 19.0)],
                   -1.5, 7.0)
    rig.part("flap_f", g, team=True, outline=0.6)
    rig.secondary("flap_b", "hips", (-6.5, 0, 30), (-8.5, 0, 20), max_deg=18, gain=1.0)
    g = Geo().slab([(-4.0, 30.5), (-9.5, 30.5), (-10.8, 21.0), (-8.4, 18.0), (-6.8, 20.8), (-4.6, 19.5)],
                   0.0, 10.0)
    rig.part("flap_b", g, team=True, outline=0.6)

    # torso: belly on the spine, barrel chest and traps on the chest
    g = Geo().blob((1.8, 0, 38.0), (8.6, 9.8, 7.0), p=2.2)
    rig.part("spine", g, SKIN, finish="skin")
    g = Geo().blob((2.5, 0, 45.5), (9.6, 12.2, 8.8), p=2.3, taper=(0.9, 1.08))
    g.blob((7.4, -4.5, 46.0), (4.2, 5.2, 5.2)).blob((7.4, 4.5, 46.0), (4.2, 5.2, 5.2))  # pecs
    g.blob((1.0, 0, 52.0), (6.5, 9.0, 4.0))  # traps
    rig.part("chest", g, SKIN, finish="skin")
    # bone and hide pauldron with spikes on the club shoulder
    rig.joint("paul", "arm_r", (2.5, -12.5, 50))
    g = Geo().blob((2.5, -13.5, 50.5), (6.0, 5.2, 4.2), p=2.4, rot=(12, 0, 0))
    rig.part("paul", g, LEATHER, finish="leather")
    g = Geo()
    for x, z, dx, dz in ((5.5, 52.5, 3.5, 5.5), (1.0, 54.0, 0.5, 6.5), (-3.0, 52.8, -3.0, 5.2)):
        g.lathe([(1.4, 0), (1.0, 2.6), (0, 5.2)], (x, -14.5, z), (x + dx, -15.5, z + dz), segs=8)
    rig.part("paul", g, BONE, finish="stone", outline=0.5)
    # ash war paint stripes across the belly
    g = Geo()
    for z in (37.5, 40.5):
        g.blob((9.4, -2.0, z), (1.2, 5.2, 0.8), rot=(0, -20, 0))
    rig.part("spine", g, "#3A2E28", outline=0)
    # bone necklace
    g = Geo()
    for i in range(7):
        a = -1.2 + i * 0.4
        g.lathe([(0.8, 0), (0.6, 1.4), (0, 2.6)], (8.6 + math.cos(a) * 0.8, math.sin(a) * 7.5, 49.8 - abs(a) * 1.2),
                (8.9 + math.cos(a) * 1.2, math.sin(a) * 7.8, 46.4 - abs(a) * 1.2), segs=6)
    rig.part("chest", g, BONE, finish="stone", outline=0.4)
    # team wolf-pelt mantle over the shoulders, ragged fur along its edge
    g = Geo().blob((-0.2, 0, 51.5), (9.5, 14.2, 5.2), p=2.2, taper=(1.05, 0.85))
    for x, y, z in ((6.5, -11, 47.5), (7.5, -5, 48.2), (4.5, -13.5, 46), (-3, -14, 46.5), (-7.5, -8, 47),
                    (6.5, 11, 47.5), (-3, 14, 46.5), (-8, 7, 47)):
        g.lathe([(2.4, 0), (0, -4.2)], (x, y, z + 1.2), segs=8)
    rig.part("chest", g, team=True)
    # hide cape: three segments that bend (follow-through chain)
    rig.secondary("cape1", "chest", (-6.5, 0, 52), (-9.0, 0, 42), max_deg=14, gain=0.6)
    rig.secondary("cape2", "cape1", (-9.0, 0, 42), (-10.0, 0, 32), max_deg=16, gain=0.7)
    rig.secondary("cape3", "cape2", (-10.0, 0, 32), (-10.5, 0, 22), max_deg=18, gain=0.8)
    for name, (x0, z0), (x1, z1), w0, w1 in (("cape1", (-6.5, 53), (-9.4, 41), 12.0, 12.5),
                                             ("cape2", (-9.0, 43), (-10.2, 31), 12.5, 12.0),
                                             ("cape3", (-10.0, 33), (-10.6, 23), 12.0, 11.0)):
        g = Geo().blob(((x0 + x1) / 2, 2.0, (z0 + z1) / 2), (1.9, (w0 + w1) / 2, (z0 - z1) / 2 + 1.5),
                       p=2.6, taper=(w1 / w0, 1.0))
        if name == "cape3":
            for yy in (-8, -3, 2, 7, 11):
                g.lathe([(2.4, 0), (0, -4.5 - (yy % 3))], (x1, yy + 2.0, z1 + 1.0), segs=8)
        rig.part(name, g, team=True, outline=0)

    # head: small skull, heavy brow, jaw, beard, dreadlocks
    g = Geo().blob((8.0, 0, 60.4), (5.7, 5.3, 6.2), p=2.2)
    g.blob((10.2, 0, 56.8), (4.4, 4.6, 3.4))                    # jaw
    g.blob((13.3, -0.4, 59.4), (1.6, 1.3, 1.7))                 # nose
    rig.part("head", g, SKIN, finish="skin")
    g = Geo().capsule((12.0, -4.0, 62.0), (12.8, 0, 61.6), 1.7, 1.5).capsule((12.8, 0, 61.6), (12.0, 4.0, 62.0), 1.5, 1.7)
    rig.part("head", g, SKIN_D, finish="skin", outline=0.5)
    g = Geo().blob((12.6, -2.6, 60.4), (0.8, 1.0, 0.8)).blob((12.6, 2.2, 60.4), (0.8, 1.0, 0.8))
    rig.part("head", g, glow=EYE, outline=0)
    g = Geo().blob((10.8, 0, 55.2), (4.4, 5.4, 4.2), p=2.2)
    g.lathe([(3.8, 0), (2.4, -3), (0, -6.5)], (11.2, 0, 54.0), (12.8, 0, 47.5), segs=10)
    g.blob((2.8, 0, 59.5), (4.0, 5.6, 5.4))                     # back of the hair
    rig.part("head", g, HAIR, finish="hair")
    # beast-skull helm: cranium over the head, a snout jutting over the brow, dark sockets,
    # and two heavy horns sweeping back and up (the brute's silhouette mark)
    g = Geo().blob((7.0, 0, 64.2), (6.8, 6.4, 4.4), p=2.3, taper=(1.1, 0.85))
    g.blob((12.8, 0, 64.0), (4.2, 3.9, 2.4), p=2.4, rot=(0, 10, 0))    # snout
    for y in (-2.6, 2.6):
        g.lathe([(0.9, 0), (0.6, 1.4), (0, 2.6)], (15.2, y * 0.8, 63.6), (16.0, y, 60.8), segs=6)  # fangs
    rig.part("head", g, BONE, finish="stone")
    g = Geo().blob((11.4, -3.4, 64.6), (1.5, 1.2, 1.2)).blob((11.4, 3.4, 64.6), (1.5, 1.2, 1.2))
    rig.part("head", g, "#1B1512", outline=0)
    for side in (-1, 1):
        g = Geo()
        pts = [(6.5, 5.2 * side, 66.0), (3.0, 8.0 * side, 69.5), (-1.5, 9.0 * side, 72.5), (-6.0, 8.6 * side, 73.2),
               (-9.5, 8.0 * side, 71.0)]
        rads = [2.6, 2.3, 1.9, 1.4, 0.9, 0.3]
        for (a, b), r0, r1 in zip(zip(pts, pts[1:]), rads, rads[1:]):
            g.capsule(a, b, r0, r1)
        rig.part("head", g, "#D8CCB0", finish="stone", outline=0.6)
    rig.secondary("dreads", "head", (2.5, 0, 62.5), (-5.0, 0, 52.0), max_deg=22, gain=1.2)
    g = Geo()
    for y, z, l in ((-3.5, 63, 11.0), (0, 64, 12.5), (3.5, 63, 11.0), (-1.8, 60.5, 9.0), (2.0, 60.5, 9.0)):
        g.capsule((2.5, y, z), (-3.5, y * 1.2, z - l), 1.7, 1.1)
    rig.part("dreads", g, HAIR, finish="hair")

    # arms: heavy, bracers, fists
    for s, y in (("r", -11.5), ("l", 11.0)):
        yd = -0.5 if y < 0 else 0.5
        g = Geo().capsule((2, y, 50), (5, y + yd, 36), 4.9, 3.8)
        g.blob((3.2, y, 48.0), (4.8, 4.6, 5.2))  # deltoid
        g.blob((5.6, y + yd, 42.0), (3.6, 3.8, 4.6))  # biceps
        rig.part(f"arm_{s}", g, SKIN, finish="skin")
        g = Geo().capsule((5, y + yd, 36), (7, y + 2 * yd, 24), 3.9, 3.1)
        g.blob((5.9, y + yd, 32.0), (3.8, 3.9, 4.4))
        rig.part(f"fore_{s}", g, SKIN, finish="skin")
        g = Geo().capsule((6.2, y + yd, 30.0), (7.0, y + 2 * yd, 25.0), 3.9, 3.5)
        rig.part(f"fore_{s}", g, LEATHER, finish="leather")
        g = Geo().blob((7.8, y + 2 * yd, 21.6), (3.5, 3.3, 3.4), p=2.4)
        rig.part(f"hand_{s}", g, SKIN, finish="skin")

    # the club
    cx, cy, cz = FIST
    rig.part("club", _club_geo(Geo(), cx, cy, cz), WOOD, finish="wood")
    stone, rope, bone = _club_head_geo(cx, cy, cz)
    rig.part("club", stone, STONE, finish="stone")
    rig.part("club", rope, ROPE, finish="leather", outline=0.5)
    rig.part("club", bone, BONE, finish="stone", outline=0.5)
    rig.track("clubHead", "club", (cx, cy, cz + CLUB_HEAD))
    rig.track("_foot", "foot_r", (3.0, -6.0, 0.5))

    # the dropped club for the death (flies off, lands)
    rig.joint("club_drop", "root", FIST, hidden=True)
    rig.part("club_drop", _club_geo(Geo(), cx, cy, cz), WOOD, finish="wood")
    stone, rope, bone = _club_head_geo(cx, cy, cz)
    rig.part("club_drop", stone, STONE, finish="stone")
    rig.part("club_drop", rope, ROPE, finish="leather", outline=0.5)
    rig.part("club_drop", bone, BONE, finish="stone", outline=0.5)

    # impact FX baked into the attack: flash, dust burst and rock chips at the club's landing
    IX = 44.0
    rig.joint("fx_imp", "root", (IX, -4, 2), hidden=True)
    g = Geo().star((IX, -10, 9), 12.0, 3.2, 1.0, points=6)
    rig.joint("fx_flash", "fx_imp", (IX, -10, 6), hidden=True)
    rig.part("fx_flash", g, glow=FLASH_C, outline=0)
    rig.joint("fx_dust", "fx_imp", (IX, -4, 2), hidden=True)
    g = Geo()
    for x, z, r in ((-9, 4, 5.5), (-3, 7, 7.0), (4, 6, 6.5), (10, 4, 5.0), (0, 2.5, 6.0), (15, 2.5, 3.8),
                    (-14, 2.5, 3.8)):
        g.blob((IX + x, -6, z), (r, r * 0.8, r * 0.85))
    rig.part("fx_dust", g, DUST, finish="cloth", outline=0.6)
    rig.joint("fx_rocks", "fx_imp", (IX, -4, 2), hidden=True)
    g = Geo()
    for x, z, r in ((-8, 13, 1.8), (6, 16, 2.2), (13, 10, 1.6), (-2, 19, 1.5), (-13, 8, 1.4)):
        g.blob((IX + x, -12, z), (r, r, r * 0.8), p=3.0, rot=(0, x * 7, 0))
    rig.part("fx_rocks", g, STONE, finish="stone", outline=0.5)

    # death poof: a dark dust burst with a flash core
    PX = -20.0
    rig.joint("poof", "root", (PX, -8, 10), hidden=True)
    g = Geo()
    for x, z, r in ((0, 10, 13), (-13, 6, 9), (13, 6, 10), (-6, 20, 9), (8, 19, 9), (-19, 1, 6),
                    (20, 1, 6.5), (0, 0, 9)):
        g.blob((PX + x, -8, z), (r, r * 0.8, r * 0.9))
    rig.part("poof", g, DUST, finish="cloth", outline=0.6)
    rig.joint("poof_core", "poof", (PX, -8, 10), hidden=True)
    g = Geo().star((PX, -22, 11), 16.0, 5.0, 1.0, points=7)
    rig.part("poof_core", g, glow=FLASH_C, outline=0)
    rig.joint("poof_bits", "poof", (PX, -8, 10), hidden=True)
    g = Geo()
    for x, z, r in ((-20, 24, 2.0), (18, 28, 2.4), (-26, 12, 1.7), (27, 15, 1.9), (3, 33, 2.0)):
        g.blob((PX + x, -14, z), (r, r, r))
    rig.part("poof_bits", g, BONE, finish="stone", outline=0.5)


# -- posing helpers --------------------------------------------------------------------------------
REST = {
    "arm": kin.ang((2, 50), (5, 36)), "fore": kin.ang((5, 36), (7, 24)),
    "hand": kin.ang((7, 24), (7.8, 21.5)), "club": 90.0,
}


def club_arm(p, up, fore, hand, club):
    """World-space side angles for the club arm (converted to the chest's space)."""
    base = kin.angle_sum(RIG, p, "chest")
    kin.aim(RIG, p, [("arm_r", REST["arm"]), ("fore_r", REST["fore"]), ("hand_r", REST["hand"]),
                     ("club", REST["club"])], [up - base, fore - base, hand - base, club - base])


def off_arm(p, up, fore):
    base = kin.angle_sum(RIG, p, "chest")
    kin.aim(RIG, p, [("arm_l", REST["arm"]), ("fore_l", REST["fore"]), ("hand_l", REST["hand"])],
            [up - base, fore - base, fore - base + 5])


def legs(p, rx, rz, lx, lz, ra=0.0, la=0.0):
    """Planted feet: ankle targets (x, z) in character space and foot angles."""
    kin.ik(RIG, p, "thigh_r", "shin_r", (0.5, 4.0), (rx, rz + 4.0), bend=1, end_joint="foot_r", end_angle=ra)
    kin.ik(RIG, p, "thigh_l", "shin_l", (0.5, 4.0), (lx, lz + 4.0), bend=1, end_joint="foot_l", end_angle=la)


def base(bx=0.0, bz=0.0, hz=-2.0, hips=0.0, spine=-6.0, chest=-8.0, head=10.0, body_r=0.0):
    return {"body": {"x": bx, "z": bz, "r": body_r}, "hips": {"z": hz, "r": hips},
            "spine": {"r": spine}, "chest": {"r": chest}, "head": {"r": head}}


STANCE_ARM = (-72, 12, 25, 52)
STANCE_OFF = (-100, -60)


def _idle(f):
    c = math.cos(2 * math.pi * f / 8)          # 1 at exhale bottom... breathing
    lag = math.cos(2 * math.pi * (f - 1) / 8)
    p = base(hz=-2.2 - 0.9 * c, spine=-6 - 1.2 * c, chest=-8 + 2.2 * c, head=10 - 2.5 * lag)
    p["chest"]["sz"] = 1.0 + 0.015 * c
    club_arm(p, STANCE_ARM[0] + 2 * lag, STANCE_ARM[1] + 3 * lag, STANCE_ARM[2] + 3 * lag, STANCE_ARM[3] + 4 * lag)
    off_arm(p, STANCE_OFF[0] + 4 * lag, STANCE_OFF[1] + 6 * lag)
    legs(p, 10.0, 0, -8.5, 0)
    return p


STRIDE = 17.0
LIFT = 6.0


def _foot(ph):
    ph %= 1.0
    if ph < 0.5:
        return STRIDE / 2 - STRIDE * (ph / 0.5), 0.0, 0.0
    u = (ph - 0.5) / 0.5
    e = u * u * (3 - 2 * u)
    x = -STRIDE / 2 + STRIDE * e
    z = LIFT * math.sin(math.pi * u) ** 1.2
    a = -25 * math.sin(math.pi * min(1, u * 1.6)) if u < 0.6 else 12 * math.sin(math.pi * (u - 0.6) / 0.4)
    return x, z, a


def _walk(f):
    n = 8
    ph = f / n
    s = math.sin(2 * math.pi * ph)
    bob = -math.cos(4 * math.pi * ph)            # -1 at contacts (0, 4), +1 at passing (2, 6)
    lagbob = -math.cos(4 * math.pi * (ph - 1 / n))
    p = base(hz=-3.2 + 1.5 * bob, hips=3 * s, spine=-10 - 1.5 * bob, chest=-7 - 2 * s,
             head=12 + 2.0 * lagbob)
    p["chest"]["rz"] = 5 * s
    p["body"]["x"] = 1.0 * bob
    rx, rz, ra = _foot(ph)
    lx, lz, la = _foot(ph + 0.5)
    legs(p, rx + 1.5, rz, lx - 1.5, lz, ra, la)
    sw = math.cos(2 * math.pi * (ph - 1 / n))
    club_arm(p, STANCE_ARM[0] - 6 * sw, STANCE_ARM[1] - 4 * sw + 3 * lagbob, STANCE_ARM[2] + 4 * lagbob,
             STANCE_ARM[3] + 6 * lagbob - 5 * sw)
    off_arm(p, -95 - 28 * s, -75 - 22 * s + 10)
    return p


# attack: 14 frames. 0-3 wind-up (club swings back over the head), 4 held extreme (on the toes),
# 5 smear (the club whips down), 6-7 held impact (squash, flash, dust), 8-9 follow-through
# (the club bounces, the body sinks further), 10-13 recovery to the stance.
ATT_MS = [80, 70, 70, 80, 190, 45, 120, 110, 90, 90, 80, 80, 80, 90]


def _attack(f):
    t = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6), (7, 7), (8, 8), (9, 9), (10, 10),
         (11, 11), (12, 12), (13, 13)]
    T = lambda vals: vals[f]
    up = T([-60, -20, 40, 92, 105, 40, -50, -51, -53, -52, -54, -64, -70, -72])
    fore = T([30, 60, 100, 128, 136, 60, -38, -39, -42, -36, -22, -8, 5, 12])
    hand = T([45, 80, 120, 142, 150, 70, -34, -35, -38, -30, -12, 5, 18, 25])
    club = T([70, 105, 140, 155, 163, 75, -26, -27, -30, -18, 5, 28, 42, 52])
    p = base(bx=T([0, -1, -2.5, -4, -5, 0, 6, 6, 5.5, 5, 3.5, 2, 1, 0]),
             hz=T([-2.5, -3.5, -2, 0, 1.2, -3, -8, -8.6, -8.2, -7, -5, -3.5, -2.6, -2.2]),
             spine=T([-4, 0, 6, 10, 12, -8, -20, -21, -22, -19, -14, -10, -7, -6]),
             chest=T([-6, 2, 10, 16, 19, -10, -30, -31, -32, -28, -20, -14, -10, -8]),
             head=T([8, 2, -6, -10, -12, 8, 28, 30, 30, 26, 20, 15, 12, 10]))
    if f == 4:
        p["chest"].update(sz=1.05, sx=0.97)
    if f in (6, 7):
        p["chest"].update(sz=0.93, sx=1.05)
        p["spine"].update(sz=0.94, sx=1.04)
    club_arm(p, up, fore, hand, club)
    if f == 5:
        p["club"]["sz"] = 1.25
    off_arm(p, T([-110, -90, -50, -25, -15, -120, -150, -152, -150, -140, -125, -110, -104, -100]),
            T([-70, -40, -10, 0, 5, -140, -170, -172, -165, -150, -110, -80, -66, -60]))
    # the near foot stomps forward on the smash
    rx = T([8, 8, 7, 5, 4, 12, 16, 16, 16, 15, 13, 11, 9, 8])
    rz = T([0, 0, 0, 1.5, 2.5, 3, 0, 0, 0, 0, 0, 0, 0, 0])
    legs(p, rx, rz, T([-6.5, -7, -8, -8.5, -8.5, -8, -9, -9, -9, -8.5, -8, -7.5, -7, -6.5]), 0,
         ra=T([0, 0, 0, 10, 15, -5, 0, 0, 0, 0, 0, 0, 0, 0]), la=T([0, 0, 0, 12, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0]))
    if f in (6, 7, 8, 9):
        p["fx_imp"] = {"show": True}
        k = f - 6
        if k == 0:
            p["fx_flash"] = {"show": True, "s": 1.0}
            p["fx_dust"] = {"show": True, "s": 0.55, "sz": 0.8}
            p["fx_rocks"] = {"show": True, "s": 0.7, "z": -4}
        else:
            p["fx_dust"] = {"show": True, "s": [1.0, 1.2, 1.3][k - 1], "sz": [1.0, 1.05, 0.8][k - 1],
                            "z": [1, 2.5, 3][k - 1]}
            if k < 3:
                p["fx_rocks"] = {"show": True, "s": 1.0, "z": [4, 6][k - 1], "x": [0, 1][k - 1]}
            if k == 3:
                p["fx_dust"]["s"] = 1.15
                p["fx_dust"]["sz"] = 0.6
    return p


SMEARS[("attack", 5)] = {"joint": "club", "inner": (FIST[0], FIST[1], FIST[2] + 20),
                         "outer": (FIST[0], FIST[1], FIST[2] + CLUB_HEAD + 7), "color": "#A89C88",
                         "taper": 0.15, "start": 0.35, "behind": 2.0}
SMEARS[("attack", 6)] = {"joint": "club", "inner": (FIST[0], FIST[1], FIST[2] + 23),
                         "outer": (FIST[0], FIST[1], FIST[2] + CLUB_HEAD + 6), "color": "#A89C88",
                         "taper": 0.1, "start": 0.6, "behind": 2.0}

HIT_MS = [60, 90, 80, 80, 80, 90]


def _hit(f):
    a = [1.0, 1.05, 0.75, 0.45, 0.2, 0.06][f]
    lag = [0.6, 1.0, 1.0, 0.7, 0.35, 0.1][f]
    p = base(bx=-7 * a, hz=-2.2 - 2.5 * a, spine=-6 + 10 * a, chest=-8 + 16 * a, head=10 + 18 * lag - 6 * a)
    p["chest"].update(sx=1.0 + 0.04 * a, sz=1.0 - 0.05 * a)
    club_arm(p, STANCE_ARM[0] + 25 * lag, STANCE_ARM[1] + 30 * lag, STANCE_ARM[2] + 30 * lag,
             STANCE_ARM[3] + 38 * lag)
    off_arm(p, STANCE_OFF[0] + 70 * lag, STANCE_OFF[1] + 50 * lag)
    legs(p, 8.0 - 5 * a, 0, -6.5 - 6 * a, 0, la=-6 * a)
    return p


DIE_MS = [60, 70, 70, 70, 60, 80, 90, 60, 70, 80, 90, 100]


def _die(f):
    T = lambda vals: vals[f]
    # 0 jolt (flash), 1-3 flung back and up, spinning, 4 slam into the ground, 5 bounce,
    # 6 slump, 7 pop (flash core, body hidden), 8-11 the dust burst grows and settles
    rot = T([10, 30, 52, 72, 88, 82, 88, 88, 88, 88, 88, 88])
    bx = T([-4, -9, -14, -18, -20, -21, -22, -22, -22, -22, -22, -22])
    bz = T([0, 7, 10, 8, 0, 3, 0, 0, 0, 0, 0, 0])
    p = base(bx=bx + 6 * math.sin(math.radians(rot)) * 0, bz=bz, hz=T([-3, -1, 0, 0, -2, -1, -3, -3, -3, -3, -3, -3]),
             spine=T([6, 10, 6, 0, -8, -2, -4, -4, -4, -4, -4, -4]),
             chest=T([14, 18, 10, 2, -8, 0, -4, -4, -4, -4, -4, -4]),
             head=T([28, 34, 18, 0, 30, 10, 18, 18, 18, 18, 18, 18]), body_r=rot)
    p["body"]["x"] = bx
    if f in (4, 6):
        p["body"].update(sz=0.93, sx=1.05)
    club_arm(p, T([-20, 60, 120, 150, 160, 150, 155, 155, 155, 155, 155, 155]) + rot,
             T([20, 90, 150, 170, 175, 165, 170, 170, 170, 170, 170, 170]) + rot,
             T([30, 100, 160, 180, 180, 170, 175, 175, 175, 175, 175, 175]) + rot, 60 + rot)
    off_arm(p, T([-40, 60, 140, 160, 170, 160, 165, 165, 165, 165, 165, 165]) + rot,
            T([-10, 90, 160, 180, 190, 175, 180, 180, 180, 180, 180, 180]) + rot)
    thr = T([25, 50, 70, 60, 20, 30, 15, 15, 15, 15, 15, 15])
    p["thigh_r"] = {"r": thr}
    p["shin_r"] = {"r": -T([30, 60, 70, 50, 10, 30, 20, 20, 20, 20, 20, 20])}
    p["thigh_l"] = {"r": thr * 0.4}
    p["shin_l"] = {"r": -T([20, 40, 50, 40, 10, 20, 10, 10, 10, 10, 10, 10])}
    if f >= 1:
        p["club"] = {"hide": True}
        # the club flies off up and back, then lands and bounces
        p["club_drop"] = {"show": True, "x": T([0, -4, -10, -16, -24, -30, -33, -34, -34, -34, -34, -34]),
                          "z": T([0, 14, 22, 20, 10, -6, -15, -17, -17, -17, -17, -17]),
                          "r": T([0, 110, 220, 330, 420, 480, 520, 540, 540, 540, 540, 540]) + 30}
    if f >= 7:
        p["body"]["hide"] = True
        p["poof"] = {"show": True, "s": T([0] * 7 + [0.75, 1.05, 1.2, 1.25, 1.15]),
                     "sz": T([1] * 7 + [0.9, 1.0, 1.0, 0.9, 0.75])}
        if f == 7:
            p["poof_core"] = {"show": True}
        if f in (8, 9, 10):
            p["poof_bits"] = {"show": True, "z": T([0] * 8 + [0, 4, 6, 0]), "s": 1.0}
    return p


def clips():
    return [
        Clip("idle", 8, _idle, loop=True, durations=120),
        Clip("walk", 8, _walk, loop=True, durations=85),
        Clip("attack", 14, _attack, impact=6, smear=5, durations=ATT_MS),
        Clip("hit", 6, _hit, durations=HIT_MS),
        Clip("die", 12, _die, durations=DIE_MS),
    ]
