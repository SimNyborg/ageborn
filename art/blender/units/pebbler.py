"""Pebbler: Stone Age ranged (DESIGN A5.2). Sling, rock projectile (proj.rock), 64 lu.

Look (A11): a lean young slinger, lighter and slimmer than the Bonker, with a big red-brown
topknot held by a bone pin, a team headband with a feather and two tails that stream behind
(follow-through), freckles and a tooth gap, a team one-shoulder pelt tunic with a ragged
skirt and a bone hand-print emblem, a bulging leather pebble pouch on the hip, and a thick
sling cord with a leather cup holding a fat grey rock. In idle he tosses a spare pebble.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    tosses a pebble up and catches it, weight shift, blink
  walk    jog: forward lean, arms pumping, the sling swinging a frame late
  attack  SLING WINDMILL: dips, whirls the sling over his head (a held ring-smear frame of a
          full turn, then half a turn more coming down behind him), steps in and releases
          side-arm at hip height (the rock leaves the cup on the impact frame; the
          projectile spawns at the per-frame `muzzle`), the empty cup flaps up, then he
          reaches into the hip pouch and loads a new rock
  hit     light;  die  D1 fling and spin (the pebble flies off), X eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import CaveBody

SLUG = "pebbler"
NAME = "Pebbler"
HEIGHT_LU = 64
CANVAS = (240, 216)
FEET = (104, 192)
ANCHORS = {"head": (2, 62), "hitCenter": (0, 30)}
NO_RETIME = True

SKIN = "#E8C9AD"
FRECKLE = "#C99B7E"
HAIR = "#6B5445"
FUR = "#7A6B5E"
LEATHER = "#8C7058"
LEATHER_DK = "#6A5242"
CORD = "#6E5A48"
ROCK = "#9A948A"
BONE = "#EDE3C8"
FEATHER = "#E9DFC9"
FEATHER_TIP = "#5B4A3E"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
TOOTH = "#F4EEDC"

SLING_LEN = 13.5


def build(rig):
    body = CaveBody(rig, SKIN, FUR, hip_z=16.0, knee_z=9.0, ankle_z=4.0, waist_z=17.0,
                    shoulder_z=35.0, neck_z=37.0, hip_y=5.2, shoulder_y=10.8,
                    elbow=(1.5, 28.0), wrist=(3.5, 21.5), leg_r=(4.2, 3.6, 3.3),
                    arm_r=(3.9, 3.4, 3.3), fist_r=4.1, torso=((0, 28.5), (9.6, 8.6, 9.8)),
                    torso_taper=(1.02, 0.96), foot_len=6.4)
    fr, fl = body.fist["r"], body.fist["l"]

    # team one-shoulder pelt tunic with a bone hand-print; the skirt swings on its own joint
    pelt = Geo().blob((0.4, 0, 26.2), (10.9, 9.9, 7.4), p=2.5, taper=(1.05, 0.95))
    pelt.capsule((8.4, -5.2, 27.5), (2.5, 8.0, 36.0), 2.9, 2.9)
    deco = F.Face(rig, "torso", [pelt])
    rig.part("torso", pelt, team=True)
    g = Geo()
    c = deco.hit(3.5, 25.0)
    deco.decal(g, c, F.ellipse(0, -0.6, 2.2, 1.9, 12), 0.4)
    for a, L in ((55, 2.8), (80, 3.2), (105, 3.0), (130, 2.5), (8, 2.4)):
        r = math.radians(a)
        deco.stroke(g, c, [(math.cos(r) * 1.5, -0.6 + math.sin(r) * 1.5),
                           (math.cos(r) * (1.5 + L), -0.6 + math.sin(r) * (1.5 + L))], 1.2, 0.4)
    rig.part("torso", g, BONE, highlight=False, outline=0)
    g = Geo()
    for x, y in ((8.5, -4.5), (3.0, -8.8), (-4.0, -8.8)):   # fur tufts on the top edge
        g.lathe([(2.0, 0), (0, 3.2)], (x, y, 32.0), (x - 0.5, y - 0.4, 35.0), segs=8)
    rig.part("torso", g, FUR, finish="hair")
    rig.secondary("skirt", "hips", (0.5, 0, 22.0), (-1.0, 0, 13.5), max_deg=10, gain=1.0)
    g = Geo().blob((0.6, 0, 21.2), (11.2, 10.0, 4.4), p=2.6, taper=(1.08, 0.98))
    for x, y in ((8.0, -5.5), (2.5, -9.5), (-4.5, -9.0), (9.5, 2.5), (-9.5, -2.5)):
        g.lathe([(3.0, 0), (0, -3.4)], (x, y, 18.2), segs=10)
    rig.part("skirt", g, team=True)
    g = Geo().capsule((0.8, -7.2, 24.2), (0.8, 7.2, 24.2), 1.9)
    rig.part("torso", g, LEATHER)
    # bulging pebble pouch on the near hip with a drawstring, two pebbles peeking out
    g = Geo().blob((-5.8, -9.2, 19.6), (5.0, 3.9, 5.6), p=2.2, taper=(1.12, 0.78))
    rig.part("hips", g, LEATHER)
    g = Geo().lathe([(3.2, 0), (3.5, 0.4), (3.5, 1.6), (3.1, 2.0)], (-5.8, -9.2, 23.2), segs=14)
    rig.part("hips", g, LEATHER_DK, outline=0.6)
    g = Geo().sphere((-5.0, -10.2, 25.8), 2.3, cuts=3).sphere((-7.8, -9.0, 25.4), 2.0, cuts=3)
    rig.part("hips", g, ROCK, outline=0.8)

    # head: round, youthful, big eyes, small nose, freckles, a tooth-gap grin; topknot with a pin
    head = Geo().blob((2, 0, 47.5), (10.4, 10.0, 10.4), p=2.25)
    head.blob((5.5, 0, 42.4), (7.2, 8.2, 5.2), p=2.2)
    head.blob((12.8, -0.5, 46.6), (2.8, 2.5, 2.5), p=2.0)  # nose
    hair = Geo().blob((-2.6, 0, 54.4), (9.6, 10.6, 5.6), p=2.2)
    hair.blob((-8.2, 0, 48.2), (4.6, 9.4, 7.6), p=2.2)
    eyes = Geo()
    for y in (-4.6, 3.8):
        eyes.blob((10.6, y, 48.6), (4.0, 3.9, 4.9))
    pup = Geo()
    for y in (-4.6, 3.8):
        pup.blob((13.7, y - 0.4, 48.2), (1.5, 2.4, 2.6))
    band = Geo().lathe([(10.0, 0), (10.9, 0.4), (10.9, 3.0), (9.6, 3.4)], (1.6, 0, 52.4),
                       (0.2, 0, 55.6), segs=22)
    face = F.Face(rig, "head", [head, hair, eyes, pup, band])
    rig.part("head", head, SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    rig.part("head", eyes, EYE, highlight=False)
    rig.joint("pupils", "head", (13.7, 0, 48.2))
    rig.part("pupils", pup, PUPIL, outline=0)
    rig.part("head", band, team=True, outline=0.8)
    g = Geo()
    c = face.hit(9.5, 43.8)
    for u, v in ((-1.6, 0.8), (0.4, -0.2), (2.0, 0.9)):
        face.decal(g, c, F.ellipse(u, v, 0.75, 0.75, 8), 0.3)
    rig.part("head", g, FRECKLE, highlight=False, outline=0)
    # brows (lift on the hit, knit on the throw)
    rig.joint("brow", "head", (11.0, 0, 53.4))
    g = Geo().capsule((9.0, -8.0, 53.2), (12.8, -3.4, 52.8), 1.5, 1.3)
    rig.part("brow", g, HAIR, finish="hair", outline=0.6)
    rig.secondary("knot", "head", (-2.0, 0, 57.0), (-5.5, 0, 66.0), max_deg=14, gain=1.2)
    g = Geo().blob((-2.4, 0, 59.4), (3.6, 3.6, 3.4), p=2.2)
    for (x1, y1, z1), r in (((-1.0, -1.0, 68.5), 2.3), ((-7.5, 0.5, 66.5), 2.2),
                            ((3.5, 1.0, 66.0), 1.9), ((-9.5, -1.5, 61.5), 1.8)):
        g.capsule((-2.4, 0, 60.5), (x1, y1, z1), r, 0.7)
    rig.part("knot", g, HAIR, finish="hair")
    g = Geo().lathe([(3.4, 0), (3.9, 0.3), (3.9, 2.1), (3.2, 2.4)], (-2.4, 0, 60.4),
                    (-2.4, 0, 63.0), segs=16)
    rig.part("knot", g, BONE, outline=0.8)
    # a feather tucked in the headband (second follow-through part on the head)
    rig.secondary("feather", "head", (-6.0, -8.0, 54.0), (-12.0, -8.5, 64.0), max_deg=16, gain=1.3)
    g = Geo().blob((-9.2, -8.4, 59.5), (2.4, 1.0, 6.4), p=2.2, rot=(0, -32, 0))
    rig.part("feather", g, FEATHER, outline=0.7)
    g = Geo().blob((-11.6, -8.6, 63.6), (1.9, 1.1, 2.4), p=2.2, rot=(0, -32, 0))
    rig.part("feather", g, FEATHER_TIP, outline=0.5)
    rig.secondary("tails", "head", (-9.6, 0, 51.5), (-19.5, 0, 46.0), max_deg=18, gain=1.3)
    g = Geo().slab([(-9.0, 53.0), (-19.0, 49.5), (-20.5, 46.5), (-9.5, 50.0)], -3.0, 1.2)
    g.slab([(-9.5, 52.0), (-16.5, 45.0), (-18.8, 44.0), (-10.0, 49.4)], 2.5, 1.2)
    rig.part("tails", g, team=True, outline=0.8)
    # default mouth: a cheeky grin with a tooth gap (decals, so it reads at game size)
    rig.joint("mouth", "head", (12.2, 0, 42.8))
    c = face.hit(12.4, 42.6)
    g = Geo()
    face.decal(g, c, [(-2.2, 0.9), (0.0, 0.2), (2.2, 1.2), (1.6, -0.7), (-1.6, -0.7)], 0.4)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    g = Geo()
    face.decal(g, c - face.view * 0.25, [(-1.4, 0.5), (-0.3, 0.2), (-0.3, -0.4), (-1.2, -0.3)], 0.4)
    face.decal(g, c - face.view * 0.25, [(0.4, 0.3), (1.5, 0.7), (1.3, -0.3), (0.4, -0.4)], 0.4)
    rig.part("mouth", g, TOOTH, outline=0, highlight=False)
    face.eye_marks([(13.4, 48.6)], 4.0, SKIN)
    face.mouths((12.3, 42.4), 5.6)

    # team leg wraps below the knee (they show in the walk)
    for side, y in (("r", -5.2), ("l", 5.2)):
        g = Geo().capsule((0.7, y, 8.2), (0.95, y, 5.4), 4.0, 3.8)
        rig.part(f"shin_{side}", g, team=True, outline=0.7)
    # team wrist wraps, a fur pad on the far shoulder
    g = Geo().capsule((2.6, -11.3, 23.8), (3.2, -11.3, 21.0), 4.0, 4.0)
    rig.part("fore_r", g, team=True, outline=0.8)
    g = Geo().blob((0.4, 11.0, 36.6), (5.8, 5.0, 4.4), p=2.4)
    rig.part("torso", g, FUR, finish="hair")
    g = Geo().capsule((2.6, 11.3, 23.8), (3.2, 11.3, 21.0), 4.0, 4.0)
    rig.part("fore_l", g, team=True, outline=0.8)

    # the sling: a thick cord from the near fist to a leather cup holding a fat rock
    tip = (fr[0], fr[1] - 0.5, fr[2] - SLING_LEN)
    rig.secondary("sling", "fore_r", fr, tip, max_deg=16, gain=0.9)
    g = Geo().capsule(fr, (tip[0], tip[1], tip[2] + 2.0), 1.05)
    g.capsule((fr[0], fr[1] - 0.2, fr[2] + 1.0), (fr[0] - 1.2, fr[1] - 0.4, fr[2] - 3.0), 1.1, 0.6)  # loop
    rig.part("sling", g, CORD, outline=0.7)
    g = Geo().blob((tip[0], tip[1], tip[2] - 0.5), (4.2, 3.4, 2.5), p=2.2, taper=(0.8, 1.15))
    rig.part("sling", g, LEATHER, outline=0.8)
    rig.joint("rock", "sling", tip)
    g = Geo().blob((tip[0] + 0.2, tip[1] - 0.8, tip[2] + 1.2), (4.2, 3.8, 3.9), p=2.1)
    rig.part("rock", g, ROCK)
    g = Geo().blob((tip[0] + 1.6, tip[1] - 3.9, tip[2] + 2.4), (1.2, 0.6, 1.0), p=2.2)
    rig.part("rock", g, "#C4BFB6", outline=0, highlight=False)
    rig.track("muzzle", "sling", (tip[0], tip[1], tip[2] + 0.5))

    # far hand: a spare pebble to toss in idle
    rig.joint("pebble", "fore_l", fl)
    g = Geo().blob((fl[0] + 2.6, fl[1] - 1.5, fl[2] + 3.6), (2.7, 2.5, 2.5), p=2.1)
    rig.part("pebble", g, ROCK, outline=0.8)
    # a loose rock for the reload (in the near hand, from the hip pouch)
    rig.joint("reload", "fore_r", fr, hidden=True)
    g = Geo().blob((fr[0] + 1.8, fr[1] - 2.2, fr[2] - 1.0), (3.0, 2.8, 2.8), p=2.1)
    rig.part("reload", g, ROCK, outline=0.8)
    rig.track("_foot", "shin_r", (2.9, -5.2, 0.5))
    global ARM_R, ARM_L, TIP, FR
    TIP, FR = tip, fr
    ARM_R = body.arm("r", "sling", tip)
    ARM_L = body.arm("l")


# -- poses ---------------------------------------------------------------------------------
ARM_R = ARM_L = TIP = FR = None


def sling_arm(a, b, c):
    return ARM_R.pose(a, b, c)


def off_arm(a, b):
    return ARM_L.pose(a, b)


def stance():
    # sling arm low and a little forward, sling hanging; far hand up at the chest with a pebble
    return merge(sling_arm(-30, -8, -92), off_arm(-55, 5), {"torso": {"r": -2}})


def _idle(f):
    toss = [0.0, 0.25, 0.75, 1.0, 0.8, 0.35, 0.0, 0.0][f]

    def extra(ctx):
        return {"arm_r": {"r": 3 * ctx["lag"]}, "sling": {"r": 8 * ctx["lag"]},
                "fore_l": {"r": [-4, 6, 2, 0, 0, 0, -8, -2][f]},
                "pebble": {"z": 13.0 * toss, "x": 1.0 * toss, "r": 130 * f},
                "head": {"r": 5 * toss}, "pupils": {"z": 0.8 * toss}}
    return M.idle_v2(f, stance(), extra=extra, face_blink=F.expr("blink"), blink=7)


def _walk(f):
    def extra(ctx):
        return {"sling": {"r": 18 * math.cos(ctx["lag_p"])}, "pebble": {"z": 0.6 * ctx["bob_lag"]}}
    return M.walk_v2(f, stance(), HEIGHT_LU, thigh=36.0, knee=70.0, lift_lu=7.0, bob_pct=0.06,
                     lean=-11.0, arm=34.0, fore=24.0, extra=extra)


# 11 unique frames, moves.SMALL_MELEE_MS; sling angle c keeps turning (no wrap) so the
# ring smear between frames follows the real whirl
#         read  dip  wind  HOLD  smear  lead  IMP  flap  pouch  load  settle
A_A = [-34, -62, 112, 118, -40, -64, -45, 18, -112, -42, -30]
A_B = [-10, -34, 122, 108, -70, -44, -5, 42, -82, -12, -8]
A_C = [-95, -128, 40, 400, 560, 655, 752, 820, 620, 626, 628]
A_Q = [-0.03, -0.12, 0.06, 0.10, 0.03, -0.04, -0.16, 0.04, -0.05, 0.01, 0.0]
A_X = [-0.5, -1.5, -2.5, -3.0, 1.0, 5.0, 8.0, 7.0, 4.5, 2.0, 0.5]
A_Z = [0.0, -2.4, 0.6, 1.8, 0.5, -0.5, -2.6, -0.8, -1.2, -0.4, 0.0]
A_T = [-2, 8, 12, 16, -2, -12, -22, -16, -8, -4, -2]
A_H = [0, -2, -8, -10, 0, 6, 10, 6, 14, 4, 0]
A_THR = [0, -8, -4, -6, 14, 24, 30, 22, 14, 6, 2]
A_SHR = [0, 6, 0, 0, -28, -14, -12, -6, -4, -2, 0]
A_THL = [0, 8, 4, 10, -6, -14, -24, -18, -12, -4, -1]
A_SHL = [0, -10, -4, -14, -10, -6, -4, -4, -2, 0, 0]
A_OA = [-55, -30, 20, 30, -20, -60, -95, -80, -60, -55, -55]
A_OF = [5, 30, 60, 70, 20, -20, -50, -30, 0, 5, 5]


def _attack_pose(f):
    pose = merge(sling_arm(A_A[f], A_B[f], A_C[f]), off_arm(A_OA[f], A_OF[f]), {
        "torso": {"r": A_T[f]}, "head": {"r": A_H[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "rock": {"hide": f in (6, 7, 8)},
        "reload": {"show": f == 8},
        "pebble": {"hide": False},
    }, M.body_about((0, 0, 20), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f == 6:
        pose["sling"]["sz"] = 1.18   # the cord snaps straight on the release
    if f == 7:
        pose["sling"]["sz"] = 0.9
    if f in (2, 3, 4, 5):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8, "r": -6}})
    elif f in (6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    elif f == 8:
        pose = merge(pose, {"pupils": {"z": -1.2, "x": -0.4}})
    return pose


def _attack_clip():
    cup_in = (FR[0], FR[1], FR[2] - 2.0)
    cup_out = (TIP[0], TIP[1], TIP[2] - 3.5)
    ring = {"kind": "arc", "joint": "sling", "inner": cup_in, "outer": cup_out, "color": ROCK,
            "taper": 0.35, "white": 0.6, "lines": 2, "line_gap_lu": 2.4, "band": 0.38}
    ov = {
        3: [dict(ring, t0=0.06, t1=0.9, samples=28)],
        4: [dict(ring, t0=0.05, t1=0.85, samples=16)],
        5: [dict(ring, t0=0.0, t1=0.85, samples=10, lines=3)],
        6: [{"kind": "dust", "ground": (13.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 4, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 16 * a}, "sling": {"r": 30 * a},
                "arm_l": {"r": 36 * a}, "fore_l": {"r": 20 * a},
                "brow": {"z": 1.4 * max(a, 0)}, "knot": {"r": 12 * a}, "tails": {"r": 10 * a}}
    return M.hit_light(k, stance(), recoil, face_hurt=F.expr("squeeze", "grit"))


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(stance(), M.die_d1(k, center_z=27.0, lie_z=10.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 80 * flail + 30}, "sling": {"r": 50 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
        "pebble": {"z": [4, 12, 20, 22, 18, 10, 4, 0, 0, 0][k], "x": [0, 2, 4, 6, 8, 10, 11, 12, 12, 12][k],
                   "r": 90 * k, "hide": k >= 7},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.8}})
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
