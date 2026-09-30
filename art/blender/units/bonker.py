"""Bonker: Stone Age infantry (DESIGN A5.2). Club, blunt, 68 lu.

Look (A11): chunky caveman with a big head (a third of his height), an angry V unibrow,
big eyes, a beard, messy hair, a team-dyed pelt tunic (stitched seams, fur tufts on the
edges, a bone hand-print emblem), a bone-tooth necklace, leather arm wraps, fur toe wraps
and an oversized cracked club with a lashed flint, held up and forward so it reads clear
of his head. The tunic is short so the legs show in the walk. Skin and wood stay under 40%
saturation (A11 rule).

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    bounces the club on the beat (it lifts and drops with a dip), weight shift, blink
  walk    stomp: bow-legged, a heavy down frame, the club bobbing a frame behind
  attack  HOP-UP OVERHEAD SMASH: dips, rises on his toes with the club hanging behind at his
          heels, hops in with the club whipping over the top (two smear frames), smashes it
          into the ground (dust, impact lines, yell), the club BOUNCES back up and settles
  hit     light: head snaps back, front foot up, eyes squeezed, then an overshoot forward
  die     D1 fling and spin: the club flies up out of his hand, he spins 1.25 turns, lands
          on his back with X eyes and his tongue out
"""
import math

from ageborn_art import face as F
from ageborn_art import moves as M
from ageborn_art.anim import merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "bonker"
NAME = "Bonker"
HEIGHT_LU = 68
CANVAS = (256, 224)
FEET = (112, 198)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

SKIN = "#EBC4A0"
HAIR = "#3B2D25"
WOOD = "#C2A27E"
WOOD_DK = "#8E7258"
STUD = "#5E5A57"
FLINT = "#7C8088"
FUR = "#75685B"
LEATHER = "#7A5E48"
BONE = "#F0E6CC"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
TOOTH = "#F4EEDC"

# club geometry along +Z from the fist; the head is centred CLUB_HEAD lu up the club
FIST = (4.0, -13.0, 21.0)
CLUB_HEAD = 36.0
CLUB_R = 10.0


def _club(rig, joint, base, axis_sign=1.0):
    """The cracked club, lathed along +Z from `base`, with stone studs, a lashed flint
    blade, grip wraps and a crack. Returns nothing; parts go on `joint`."""
    cx, cy, cz = base
    h = CLUB_HEAD
    g = Geo().lathe([(0, -4.5), (2.6, -4.2), (2.7, -1), (3.0, 14), (4.4, h - 10), (8.0, h - 5.5),
                     (CLUB_R, h), (CLUB_R * 0.96, h + 4.2), (7.2, h + 8.2), (0, h + 9.8)],
                    (cx, cy, cz), segs=18)
    rig.part(joint, g, WOOD)
    # grip wraps and a knob pommel
    g = Geo()
    for z in (-2.0, 2.2, 6.4):
        g.lathe([(3.25, 0), (3.5, 0.8), (3.5, 2.6), (3.2, 3.2)], (cx, cy, cz + z), segs=14)
    g.sphere((cx, cy, cz - 5.5), 3.6, cuts=3)
    rig.part(joint, g, LEATHER, outline=0.8)
    # dark stone studs
    g = Geo()
    for d, z in (((-1, 0, 0.3), h - 1), ((0.25, -1, 0.1), h - 3.0),
                 ((-0.4, -1, 0.5), h + 4.5), ((0.1, 0, 1), h + 10.0)):
        b = (cx + d[0] * CLUB_R * 0.8, cy + d[1] * CLUB_R * 0.8, cz + z)
        tip = (b[0] + d[0] * 4.4, b[1] + d[1] * 4.4, b[2] + d[2] * 4.4)
        g.lathe([(2.8, 0), (2.2, 2.6), (0, 4.8)], b, tip, segs=10)
    rig.part(joint, g, STUD)
    # a big flint blade lashed to the front of the head (its signature shape)
    g2 = Geo()
    fx, fz = cx + CLUB_R * 0.72, cz + h + 1.0
    g2.slab([(fx, fz - 6.5), (fx + 9.5, fz - 2.5), (fx + 13.0, fz + 1.0), (fx + 8.5, fz + 5.0),
             (fx, fz + 6.0)], cy - 1.0, 3.2)
    rig.part(joint, g2, FLINT, finish="gloss")
    # lashing: cream cord wraps over the blade root
    g = Geo()
    for dz in (-3.2, 0.2, 3.6):
        g.capsule((fx - 2.0, cy - 3.2, fz + dz), (fx + 1.6, cy - 3.2, fz + dz - 0.8), 1.3)
    rig.part(joint, g, BONE, outline=0.6)
    # the crack: a dark zig-zag groove on the near face of the head
    g = Geo()
    pts = [(cx - 2.5, cz + h + 7.0), (cx - 0.8, cz + h + 3.5), (cx - 3.4, cz + h + 0.5),
           (cx - 1.4, cz + h - 3.5)]
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        g.capsule((x0, cy - CLUB_R * 0.93, z0), (x1, cy - CLUB_R * 0.93, z1), 0.9)
    rig.part(joint, g, WOOD_DK, outline=0, highlight=False)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, 15))
    rig.joint("torso", "hips", (0, 0, 16))
    rig.joint("head", "torso", (1, 0, 38))
    for side, y in (("r", -6.0), ("l", 6.0)):
        rig.joint(f"thigh_{side}", "hips", (0, y, 15))
        rig.joint(f"shin_{side}", f"thigh_{side}", (0.5, y, 8.5))
    for side, y in (("r", -12.5), ("l", 12.0)):
        rig.joint(f"arm_{side}", "torso", (0, y, 36))
        rig.joint(f"fore_{side}", f"arm_{side}", (1.5, y - 0.5 * (1 if y < 0 else -1), 28.5))
    rig.joint("club", "fore_r", FIST)

    # legs: short and stocky, fur toe wraps with a leather tie
    for side, y in (("r", -6.0), ("l", 6.0)):
        g = Geo().capsule((0, y, 15), (0.5, y, 8.5), 4.8, 4.2)
        rig.part(f"thigh_{side}", g, SKIN)
        g = Geo().capsule((0.5, y, 8.5), (1.0, y, 3.8), 4.2, 3.8)
        rig.part(f"shin_{side}", g, SKIN)
        g = Geo().blob((3.4, y, 2.9), (7.0, 4.8, 3.2), p=2.6, taper=(1.0, 0.85))
        g.blob((0.8, y, 6.0), (4.6, 4.5, 2.6), p=2.4)
        for dx in (6.2, 8.4):   # fur tufts at the toe
            g.lathe([(1.6, 0), (0, 2.6)], (dx, y - 2.8, 5.0), (dx + 1.2, y - 3.2, 7.2), segs=8)
        rig.part(f"shin_{side}", g, FUR, finish="hair")
        g = Geo().lathe([(4.9, 0), (5.1, 0.6), (5.1, 2.0), (4.8, 2.6)], (0.8, y, 5.4), segs=16)
        rig.part(f"shin_{side}", g, LEATHER, outline=0.7)

    # torso: bare chest, team pelt top with a shoulder strap; a short skirt (the legs show)
    g = Geo().blob((0, 0, 29), (11.5, 9.8, 11.5), p=2.2, taper=(1.08, 0.92))
    rig.part("torso", g, SKIN)
    pelt = Geo().blob((0.6, 0, 25.0), (13.2, 11.4, 6.2), p=2.5, taper=(1.06, 0.94))
    pelt.capsule((9.8, 6.0, 26.5), (3.5, -9.0, 38.5), 3.4, 3.4)
    stitch_face = F.Face(rig, "torso", [pelt])
    rig.part("torso", pelt, team=True)
    # fur tufts along the pelt's top edge (triangle notches, non-team fur)
    g = Geo()
    for x, y in ((10.5, -4.5), (5.0, -10.0), (-3.0, -10.5), (-9.5, -6.0)):
        g.lathe([(2.3, 0), (0, 3.6)], (x, y, 30.0), (x - 0.6, y - 0.5, 33.4), segs=8)
    rig.part("torso", g, FUR, finish="hair")
    # stitched seam and the bone hand-print emblem (decals on the pelt's near face)
    g = Geo()
    c = stitch_face.hit(-1.5, 25.5)
    for k in range(4):
        u = -3.6 + k * 2.6
        stitch_face.stroke(g, c, [(u - 0.8, 1.9), (u + 0.8, -1.9)], 1.1, 0.4)
    rig.part("torso", g, BONE, highlight=False, outline=0)
    g = Geo()
    c = stitch_face.hit(7.0, 24.5)
    stitch_face.decal(g, c, F.ellipse(0, -0.6, 2.4, 2.0, 12), 0.4)
    for a, L in ((60, 3.2), (85, 3.6), (110, 3.4), (135, 2.8), (10, 2.8)):
        r = math.radians(a)
        stitch_face.stroke(g, c, [(0.0 + math.cos(r) * 1.6, -0.6 + math.sin(r) * 1.6),
                                  (math.cos(r) * (1.6 + L), -0.6 + math.sin(r) * (1.6 + L))], 1.3, 0.4)
    rig.part("torso", g, BONE, highlight=False, outline=0)

    rig.secondary("cape", "torso", (-6.5, 0, 37.5), (-12.5, 0, 22.0), max_deg=16, gain=1.2)
    g = Geo().blob((-9.6, 0, 30.5), (3.4, 11.0, 8.6), p=2.4, taper=(1.25, 0.85))
    for y in (-8.0, -3.0, 2.5, 7.5):
        g.lathe([(2.4, 0), (0, -3.4)], (-11.0, y, 22.8), segs=8)
    rig.part("cape", g, team=True)
    rig.secondary("skirt", "hips", (0.6, 0, 22.0), (-1.0, 0, 13.0), max_deg=10, gain=0.9)
    g = Geo().blob((0.8, 0, 21.2), (13.8, 11.9, 4.4), p=2.6, taper=(1.08, 0.98))
    for x, y in ((9.5, -6), (3, -11.5), (-5, -10.5), (11.5, 3), (-11, -3)):  # ragged hem
        g.lathe([(3.4, 0), (0, -3.6)], (x, y, 18.4), segs=10)
    rig.part("skirt", g, team=True)
    g = Geo().capsule((1.0, -8.0, 24.4), (1.0, 8.0, 24.4), 2.2).capsule((11.2, -1, 25), (12.5, -1, 22.5), 1.7)
    rig.part("torso", g, LEATHER)  # belt and knot
    # bone-tooth necklace
    g = Geo()
    for k, (x, y, z) in enumerate(((9.6, -5.5, 37.4), (11.0, -1.0, 36.6), (9.8, 4.0, 37.2))):
        g.lathe([(1.7, 0), (1.3, 2.0), (0, 4.4)], (x, y - 1.2, z + 0.8), (x + 0.8, y - 1.6, z - 3.8), segs=8)
    rig.part("torso", g, BONE, outline=0.6)
    g = Geo().lathe([(9.2, 0), (9.8, 0.3), (9.8, 1.4), (9.2, 1.7)], (1.2, 0, 37.0), (2.6, 0, 38.4), segs=22)
    rig.part("torso", g, LEATHER, outline=0.5)

    # head: big, jaw forward, beard, messy hair
    head = Geo().blob((2, 0, 50), (12, 11.5, 12), p=2.3)
    head.blob((6, 0, 44), (8.8, 9.6, 6.4), p=2.2)
    head.blob((14.0, -0.6, 49.0), (3.8, 3.4, 3.2), p=2.0)  # nose
    beard = Geo().blob((6.8, 0, 41.0), (8.4, 10.0, 5.2), p=2.3)   # beard
    beard.blob((-1.5, 0, 57.2), (12.6, 12.4, 7.6), p=2.2)       # hair cap
    beard.blob((-9.5, 0, 50.5), (6.0, 11.0, 9.0), p=2.2)        # back of the hair
    eyes = Geo()
    for y in (-4.8, 4.4):
        eyes.blob((11.4, y, 51.6), (4.3, 4.1, 5.3))
    pup = Geo()
    for y in (-4.8, 4.4):
        pup.blob((14.8, y - 0.5, 51.2), (1.5, 2.5, 2.6))
    face = F.Face(rig, "head", [head, beard, eyes, pup])
    rig.part("head", head, SKIN)
    rig.part("head", beard, HAIR, finish="hair")
    rig.part("head", eyes, EYE, highlight=False)
    rig.joint("pupils", "head", (14.8, 0, 51.2))
    rig.part("pupils", pup, PUPIL, outline=0)
    rig.secondary("hair", "head", (-1.0, 0, 60.0), (-6.0, 0, 68.0), max_deg=12, gain=1.1)
    g = Geo()
    for (x0, z0), (x1, z1), r in (((-2, 60), (-4, 69), 3.6), ((4, 60), (5, 67.5), 3.2),
                                  ((-8, 58), (-14, 63.5), 3.4), ((8, 57), (12.5, 61.5), 2.8)):
        g.capsule((x0, 0, z0), (x1, -1, z1), r, 1.2)
    rig.part("hair", g, HAIR, finish="hair")
    # angry V unibrow on its own joint (it lifts when he is hit)
    rig.joint("brow", "head", (12.5, 0, 56.0))
    g = Geo().capsule((11.0, -9.0, 58.4), (14.0, -0.4, 55.0), 3.2, 2.7)
    g.capsule((14.0, -0.4, 55.0), (11.2, 7.6, 58.2), 2.7, 3.1)
    rig.part("brow", g, HAIR, finish="hair")
    # default mouth: grimace with two teeth (a decal, so it reads at game size)
    rig.joint("mouth", "head", (13.5, 0, 44.8))
    g = Geo()
    c = face.hit(13.8, 44.6)
    face.decal(g, c, [(-2.6, 0.6), (2.4, 1.0), (2.6, -0.4), (-2.4, -0.8)], 0.4)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    g = Geo()
    face.decal(g, c - face.view * 0.25, [(-0.6, 0.9), (0.6, 1.0), (0.6, -0.1), (-0.6, -0.2)], 0.4)
    face.decal(g, c - face.view * 0.25, [(1.2, 1.0), (2.2, 1.1), (2.2, 0.1), (1.2, 0.0)], 0.4)
    rig.part("mouth", g, TOOTH, outline=0, highlight=False)
    face.eye_marks([(14.2, 51.6)], 4.2, SKIN)
    face.mouths((13.6, 44.2), 6.4)

    # arms, fists, leather forearm wraps and a team pelt pauldron on the club arm
    for side, y in (("r", -12.5), ("l", 12.0)):
        yd = -0.5 if y < 0 else 0.5
        g = Geo().capsule((0, y, 36), (1.5, y + yd, 28.5), 4.6, 4.0)
        rig.part(f"arm_{side}", g, SKIN)
        g = Geo().capsule((1.5, y + yd, 28.5), (4.0, y + yd, 22.0), 4.0, 3.9)
        g.blob((4.3, y + yd, 20.4), (4.7, 4.5, 4.5), p=2.3)
        g.blob((6.6, y + yd - 1.6, 21.6), (1.9, 1.8, 2.3), p=2.2)   # thumb
        rig.part(f"fore_{side}", g, SKIN)
        g = Geo().capsule((2.9, y + yd, 25.4), (3.6, y + yd, 23.4), 4.5, 4.5)
        rig.part(f"fore_{side}", g, LEATHER, outline=0.7)
    g = Geo().blob((0.5, -12.6, 37.6), (7.4, 6.4, 5.6), p=2.4)
    rig.part("arm_r", g, team=True)
    g = Geo()
    for x, z in ((-5.5, 35.0), (-1.0, 32.5), (4.5, 33.5)):
        g.lathe([(2.0, 0), (0, 3.0)], (x, -13.5, z + 1.5), (x - 0.4, -14.0, z - 1.5), segs=8)
    rig.part("arm_r", g, FUR, finish="hair")

    # the club in his hand, and a loose copy that flies away when he is knocked out
    _club(rig, "club", FIST)
    rig.secondary("strap", "club", (FIST[0], FIST[1], FIST[2] - 5.5), (FIST[0] - 1.5, FIST[1], FIST[2] - 13.5),
                  max_deg=35, gain=1.4)
    g = Geo().capsule((FIST[0], FIST[1] - 0.6, FIST[2] - 5.5), (FIST[0] - 1.5, FIST[1] - 0.6, FIST[2] - 12.5), 1.2, 1.4)
    g.blob((FIST[0] - 1.6, FIST[1] - 0.6, FIST[2] - 13.4), (1.8, 1.4, 2.2), p=2.2)
    rig.part("strap", g, LEATHER, outline=0.6)
    rig.joint("club_loose", "root", (0, 0, 0), hidden=True)
    _club(rig, "club_loose", (0.0, 0.0, -CLUB_HEAD * 0.6))
    rig.track("clubHead", "club", (FIST[0], FIST[1], FIST[2] + CLUB_HEAD))
    rig.track("_foot", "shin_r", (3.2, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
ARM_REST, FORE_REST, CLUB_REST = -78.7, -71.6, 90.0


def club_arm(arm, fore, club):
    ra = arm - ARM_REST
    rf = fore - FORE_REST - ra
    return {"arm_r": {"r": ra}, "fore_r": {"r": rf}, "club": {"r": club - CLUB_REST - ra - rf}}


def off_arm(arm, fore):
    ra = arm - ARM_REST
    return {"arm_l": {"r": ra}, "fore_l": {"r": fore - FORE_REST - ra}}


# club held up and forward, about 40 degrees from vertical, clear of the head
STANCE = merge(club_arm(-15, 25, 48), off_arm(-70, -30), {"torso": {"r": -3}, "club": {"rx": -14}})


def _idle(f):
    # the club bounces on the beat: up on 1-2, dropped on 3 (dip), a second small beat on 6
    lift = [0.0, 0.5, 1.0, -0.6, -0.2, 0.3, -0.35, -0.1][f]

    def extra(ctx):
        return merge(club_arm(-15 + 6 * lift, 25 + 10 * lift, 48 + 10 * lift), {
            "club": {"rx": -14},
            "body": squash(-0.03 * max(0.0, -lift)),
            "hips": {"z": 1.2 * min(0.0, lift)},
            "arm_l": {"r": -4 * ctx["lag"]}, "fore_l": {"r": 5 * max(0.0, -lift)},
        })
    base = merge({k: v for k, v in STANCE.items() if k not in ("arm_r", "fore_r", "club")})
    return M.idle_v2(f, base, extra=extra, face_blink=F.expr("blink"), blink=5)


def _walk(f):
    # stomp: bow-legged, heavy down frame, the club bobbing a frame late
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"club": {"r": -5 * lag}, "arm_r": {"r": 3 * lag},
                "brow": {"z": 0.3 * lag}}
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=30.0, knee=62.0, lift_lu=7.0, bob_pct=0.07,
                     lean=-8.0, arm=28.0, arms=("l",), bow=6.0, heavy_down=1.3, extra=extra)


# 11 unique frames, moves.SMALL_MELEE_MS
#          read  dip  wind  HOLD smear smear IMP  bounce recoil settle settle
A_ARM = [-8, -40, -110, 126, 80, 12, -10, 0, -8, -18, -14]
A_FORE = [34, -10, -150, 176, 70, -8, -20, 5, -12, 5, 22]
A_CLUB = [58, -30, 175, 211, 82, 18, 5, 30, 6, 22, 44]
A_Q = [-0.03, -0.12, 0.06, 0.12, 0.10, 0.02, -0.18, 0.05, -0.07, 0.02, 0.0]
A_X = [-0.5, -2.0, -3.0, -3.5, 3.0, 7.0, 8.0, 7.5, 7.0, 4.0, 1.0]
A_Z = [0.0, -2.8, 0.8, 2.6, 8.0, 4.5, -2.4, -0.8, -1.8, -0.5, 0.0]
A_TORSO = [0, 6, 14, 24, 2, -18, -30, -20, -24, -10, -4]
A_HEAD = [0, 2, -6, -14, -4, 8, 12, 6, 8, 2, 0]
A_THIGH_R = [0, -10, -4, -8, 18, 26, 24, 18, 20, 8, 2]
A_SHIN_R = [0, 8, 0, 0, -30, -20, -18, -10, -14, -4, 0]
A_THIGH_L = [0, 8, 2, 12, -8, -18, -24, -18, -20, -8, -2]
A_SHIN_L = [0, -12, -2, -6, -26, -10, -6, -4, -6, -2, 0]
A_OFF_A = [-65, -30, 20, 40, -60, -110, -125, -100, -110, -90, -75]
A_OFF_F = [-25, 10, 60, 80, -30, -90, -100, -70, -85, -50, -35]


def _attack_pose(f):
    pose = merge(club_arm(A_ARM[f], A_FORE[f], A_CLUB[f]), off_arm(A_OFF_A[f], A_OFF_F[f]), {
        "club": {"rx": -14},
        "hips": {"z": 0.0},
        "torso": {"r": A_TORSO[f]},
        "head": {"r": A_HEAD[f]},
        "thigh_r": {"r": A_THIGH_R[f]}, "shin_r": {"r": A_SHIN_R[f]},
        "thigh_l": {"r": A_THIGH_L[f]}, "shin_l": {"r": A_SHIN_L[f]},
    }, M.body_about((0, 0, 20), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f == 3:   # on his toes: the feet point down
        pose = merge(pose, {"shin_r": {"r": -14}, "shin_l": {"r": -14}})
    if f in (4, 5):
        pose["club"]["sx"] = 1.25
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return pose


CLUB_SMEAR = {"kind": "arc", "joint": "club",
              "inner": (FIST[0], FIST[1], FIST[2] + CLUB_HEAD - 9),
              "outer": (FIST[0], FIST[1], FIST[2] + CLUB_HEAD + 10), "color": WOOD, "taper": 0.1,
              "t0": 0.0, "t1": 0.88, "lines": 3}
CLUB_TIP = (FIST[0], FIST[1], FIST[2] + CLUB_HEAD + 2)


def _attack_clip():
    ov = {
        4: [dict(CLUB_SMEAR)],
        5: [dict(CLUB_SMEAR, t1=0.8)],
        6: [{"kind": "dust", "joint": "club", "point": (FIST[0], FIST[1], FIST[2] + CLUB_HEAD),
             "ground_snap": True, "size_lu": 10.0, "puffs": 5, "seed": 2},
            {"kind": "dust", "ground": (-6.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 5, "spread": 0.8},
            {"kind": "burst", "joint": "club", "point": CLUB_TIP, "r0_lu": 13.0, "r1_lu": 19.0, "n": 5,
             "a0": 20.0, "arc": 140.0}],
        7: [{"kind": "dust", "joint": "club", "point": (FIST[0], FIST[1], FIST[2] + CLUB_HEAD),
             "ground_snap": True, "size_lu": 8.0, "puffs": 4, "seed": 7, "spread": 1.4}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, extra={}, overlays=ov)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 12 * a}, "club": {"r": 14 * a},
                "arm_l": {"r": 40 * a}, "fore_l": {"r": 20 * a},
                "brow": {"z": 1.6 * max(a, 0)}, "hair": {"r": 10 * a}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


# die D1: fling and spin; the club leaves the hand on step 1 and tumbles up and away
LOOSE = [None, (8, 0, 72, 60), (-2, 0, 90, 190), (-14, 0, 88, 330), (-24, 0, 70, 470),
         (-32, 0, 44, 600), (-38, 0, 18, 700), (-42, 0, 6, 720), (-43, 0, 4, 720), (-43, 0, 4, 720)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 70 * flail + 30}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    if LOOSE[k] is not None:
        x, y, z, r = LOOSE[k]
        pose["club"] = dict(pose.get("club", {}), hide=True)
        pose["club_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES)], [M.IDLE_MS] * M.IDLE_FRAMES, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl)
