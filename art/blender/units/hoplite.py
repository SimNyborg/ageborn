"""Hoplite: Bronze Age infantry (A17.9). Short spear, Shield Bash knockback, ~68 lu.

Look (A17.12): a stocky citizen-soldier in an open-faced aged-bronze helmet with cheek guards
and a tall team horsehair crest that trails back (follow-through), a curly black beard, a
linen cuirass with a team band and team pteruges, bronze greaves and sandals. A big round
aspis with a team face and a sandstone lambda is carried on the near arm, so the unit reads
as a shield wall at a glance, and a short spear with a polished leaf head rests on the far
shoulder. The attack is an overhand thrust over the shield rim with a shield shove on impact
(the Shield Bash knockback reads from the shove).
"""
from ageborn_art import fx
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "hoplite"
NAME = "Hoplite"
HEIGHT_LU = 68
CANVAS = (280, 240)
FEET = (112, 212)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand (shield)
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)   # far hand (spear), spear modelled pointing up (+Z)
FWD, BACK = 42.0, 18.0
SMEAR = {"joint": "spear", "inner": (HL[0], HL[1], HL[2] + FWD - 16), "outer": (HL[0], HL[1], HL[2] + FWD),
         "color": B.BRONZE_HI, "taper": 0.35, "start": 0.2, "behind": 4.0}


def build(rig):
    B.skeleton(rig)
    B.sandal_legs(rig)

    # torso: plum tunic under a linen cuirass with a team band, polished trim; team pteruges
    g = Geo().blob((0, 0, 20.0), (10.6, 9.8, 6.0), p=2.4)
    rig.part("torso", g, B.PLUM)
    B.cuirass(rig, B.LINEN, trim=B.VERD, z=28.5)
    rig.secondary("hem", "hips", (0.5, 0, 17.0), (0.5, 0, 9.0), max_deg=8, gain=0.7)
    B.pteruges(rig, "hem", 17.2, None, team=True, n=8, radius=(11.2, 10.4), length=8.6)
    for s, y in (("r", -12.0), ("l", 11.5)):                       # linen shoulder guards
        g = Geo().blob((0.4, y, 37.0), (6.4, 5.6, 4.8), p=2.6)
        rig.part(f"arm_{s}", g, B.LINEN)

    # head: face, big eyes, curly beard, helmet with a team crest
    B.head_ball(rig)
    B.face(rig, cx=12.0, cz=50.0, brow=B.HAIR, eye_r=(3.2, 3.0, 3.8))
    g = Geo()
    for x, y, z, r in ((11.6, -3.2, 40.4, 2.6), (12.8, 0.0, 39.6, 2.8), (11.6, 3.0, 40.4, 2.4), (13.6, -1.0, 42.4, 1.8)):
        g.blob((x, y, z), (r, r, r * 0.95), p=2.1)
    rig.part("head", g, B.HAIR, finish="hair")
    B.helmet(rig, crest_len=22.0, crest_h=9.0)

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.1, r1=3.7)
    g = Geo().blob((0, B.ARM_Y["r"], B.HAND_Z + 3.4), (4.6, 4.6, 2.0), p=2.6)   # leather bracer
    rig.part("fore_r", g, B.LEATHER, outline=0.7)

    # spear in the far hand, modelled pointing up from the fist
    rig.joint("spear", "hand_l", HL)
    tip = B.spear(rig, "spear", (HL[0], HL[1] - 0.4, HL[2]), fwd=FWD, back=BACK, r=1.15, head_len=10.0)
    rig.track("spearTip", "spear", tip)

    # the aspis on the near hand: a big round team shield
    sx, sy, sz = HR[0] + 1.0, HR[1] - 6.0, HR[2] + 3.0
    B.aspis(rig, "hand_r", (sx, sy, sz), r=13.2, depth=2.6, rim=B.BRONZE, rim_w=1.4)
    B.dust_puff(rig, "root", (22.0, -4.0, 2.0), size=0.8, name="dust")
    rig.track("_foot", "shin_r", (3.1, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def shield(a, f, w=90.0):
    return B.arm("r", a, f, w, w_rest=90.0)


def spear(a, f, w):
    return B.arm("l", a, f, w, w_rest=90.0)


STANCE = merge(shield(-56, -18, 92), spear(-30, 50, 62), {"torso": {"r": -3}})


def _idle(f):
    c, lag = B.idle_wave(f)
    return merge(STANCE, B.idle_body(f), {
        "arm_l": {"r": 3 * lag}, "hand_l": {"r": -3 * lag},
        "arm_r": {"r": -2 * lag},
    })


def _walk(f):
    import math
    pose, p, bl = B.walk_legs(f, stride=38.0, lift=64.0)
    return merge(STANCE, pose, {
        "arm_r": {"r": 4 * math.cos(p)},
        "arm_l": {"r": -8 * math.cos(p)}, "hand_l": {"r": 5 * bl},
    })


def _attack(f):
    # 0-1 raise the spear overhand (squash), 2 held extreme (spear cocked back by the ear),
    # 3 smear (the thrust), 4 held impact: arm fully out, spear level, shield shoved forward
    # (the bash), squash 0.85/1.15, yell; 5-7 recovery (fx.MELEE_MS)
    a = pick(f, [60, 130, 150, 60, 8, 12, 20, -10])
    fo = pick(f, [80, 100, 140, 25, 2, 8, 30, 45])
    w = pick(f, [20, -4, 4, -6, -10, -8, 10, 50])
    sq = pick(f, [-0.05, -0.10, 0.07, 0.05, -0.15, -0.08, -0.02, 0.0])
    pose = merge(spear(a, fo, w), shield(pick(f, [-54, -50, -46, -40, -14, -20, -36, -50]),
                                         pick(f, [-16, -12, -10, -4, 6, 2, -8, -14]), 90), {
        "body": dict(squash(sq), x=pick(f, [-1, -2.5, -3.5, 2, 7, 6, 3, 0.5])),
        "hips": {"z": pick(f, [0, -0.8, 0.6, 0, -2.6, -1.8, -0.6, 0])},
        "torso": {"r": pick(f, [4, 8, 12, -6, -18, -15, -8, -3])},
        "head": {"r": pick(f, [2, 4, 6, -3, -6, -5, -2, 0])},
        "thigh_r": {"r": pick(f, [0, -6, -8, 12, 26, 22, 10, 2])},
        "shin_r": {"r": pick(f, [0, 0, 0, -10, -20, -16, -6, 0])},
        "thigh_l": {"r": pick(f, [0, 6, 8, -6, -16, -12, -6, 0])},
        "shin_l": {"r": pick(f, [0, -4, -6, -4, -8, -6, -2, 0])},
        "dust": {"show": f in (4, 5), "s": pick(f, [1, 1, 1, 1, 0.8, 1.15, 1, 1])},
    })
    if f == 3:
        pose["spear"] = {"sz": 1.18}   # smear frame: the spear stretches along the thrust
    if f in (3, 4):
        B.yell(pose)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, B.hit_body(f), {"arm_r": {"r": 12 * a}, "arm_l": {"r": 18 * a},
                                         "hand_l": {"r": 10 * a}})


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), {
        "torso": {"r": pick(f, [16, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "arm_l": {"r": pick(f, [60, 50, 50])}, "hand_l": {"r": pick(f, [30, 20, 20])},
        "arm_r": {"r": pick(f, [30, 20, 20])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
    })
    if f == 0:
        B.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR,
             durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
