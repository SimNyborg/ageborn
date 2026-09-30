"""Hoplite: Bronze Age infantry (A17.9). Short spear, Shield Bash knockback, ~68 lu.

Look (A17.12): a stocky citizen-soldier in an open-faced polished-bronze helmet with cheek
guards and a tall team horsehair crest that trails back (follow-through), big eyes and an
angry brow under the rim, a curly black beard, a linen cuirass with a team band and team
pteruges, bronze greaves and laced sandals. A big round aspis with a team face, a riveted
polished rim and a sandstone lambda is carried on the near arm, so the unit reads as a
shield wall at a glance, and a short spear with a polished leaf head, a leather grip wrap
and a bronze butt spike is held in the far hand.

Animation (cartoon kit v2, `ageborn_art/moves.py`; a viewer expects a shield-and-spear man to
shove with the shield and stab over it):
  idle    taps the spear butt on the ground on the beat, weight shift, blink
  walk    march: stiff knees, a high step, the shield bobbing a frame late
  attack  SHIELD BASH, THEN OVER-THE-RIM STAB: ducks behind the shield, shoves it forward
          (dust, bash lines), rocks back with the spear cocked overhand by the ear (the held
          extreme), then drives the spear forward over the rim (streak smear, yell); impact on
          the stab, the spear overshoots and he recovers behind the shield
  hit     armoured: dips behind the shield, the helmet clanks down over his eyes
  die     D2 topple: a wobble, then he goes over backwards stiff as a plank; the helmet pops
          off, spins up and rolls away; X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "hoplite"
NAME = "Hoplite"
HEIGHT_LU = 68
CANVAS = (300, 250)
FEET = (132, 216)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand (shield)
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)   # far hand (spear), spear modelled pointing up (+Z)
FWD, BACK = 42.0, 18.0
HELM_C = (1.5, 0, 55.0)
TIP = (HL[0], HL[1] - 0.4, HL[2] + FWD)


def build(rig):
    B.skeleton(rig)
    B.sandal_legs(rig)
    # sandal laces up the calf (dark leather, reads as stripes at 3x)
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        g = Geo()
        for z in (4.4, 7.0):
            g.blob((1.0, y, z), (3.9, 3.9, 0.7), p=3.0)
        rig.part(f"shin_{s}", g, B.LEATHER_DK, outline=0.4)

    # torso: plum tunic under a linen cuirass with a team band, verdigris trim; team pteruges
    g = Geo().blob((0, 0, 20.0), (10.6, 9.8, 6.0), p=2.4)
    rig.part("torso", g, B.PLUM)
    B.cuirass(rig, B.LINEN, trim=B.VERD, z=28.5)
    rig.secondary("hem", "hips", (0.5, 0, 17.0), (0.5, 0, 9.0), max_deg=10, gain=0.9)
    B.pteruges(rig, "hem", 17.2, None, team=True, n=8, radius=(11.2, 10.4), length=8.6)
    g = Geo().blob((0.5, 0, 20.2), (11.4, 10.6, 1.6), p=3.2)          # leather belt
    rig.part("torso", g, B.LEATHER_DK, outline=0.6)
    for s, y in (("r", -12.0), ("l", 11.5)):                          # linen shoulder guards
        g = Geo().blob((0.4, y, 37.0), (6.4, 5.6, 4.8), p=2.6)
        rig.part(f"arm_{s}", g, B.LINEN)
        g = Geo().blob((0.4, y, 34.6), (6.6, 5.8, 1.0), p=3.0)
        rig.part(f"arm_{s}", g, B.VERD_DK, outline=0.4)

    # head: face kit, curly beard, helmet (own joint: it clanks down on hits and pops off)
    beard = Geo()
    for x, y, z, r in ((11.6, -3.2, 40.4, 2.7), (12.8, 0.0, 39.4, 2.9), (11.6, 3.0, 40.4, 2.5),
                       (13.8, -1.2, 42.4, 1.9), (9.6, -5.6, 42.6, 2.4)):
        beard.blob((x, y, z), (r, r, r * 0.95), p=2.1)
    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.8, 3.4, 4.5), extra=[beard], mouth_z=44.8, mouth_w=5.0)
    rig.part("head", beard, B.HAIR, finish="hair")
    rig.joint("helm", "head", HELM_C)
    B.helmet(rig, joint="helm", crest_len=22.0, crest_h=10.0)
    # the loose copy that pops off in the death (no follow-through: it tumbles as a whole)
    rig.joint("helm_loose", "root", HELM_C, hidden=True)
    B.helmet(rig, joint="helm_loose", crest_len=22.0, crest_h=10.0, crest_secondary=False)

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.1, r1=3.7)
    g = Geo().blob((0, B.ARM_Y["r"], B.HAND_Z + 3.4), (4.6, 4.6, 2.0), p=2.6)   # leather bracer
    rig.part("fore_r", g, B.LEATHER, outline=0.7)
    g = Geo().blob((0, B.ARM_Y["l"], B.HAND_Z + 3.4), (4.4, 4.4, 1.8), p=2.6)
    rig.part("fore_l", g, B.LEATHER, outline=0.7)

    # spear in the far hand, modelled pointing up from the fist, with a leather grip wrap
    rig.joint("spear", "hand_l", HL)
    tip = B.spear(rig, "spear", (HL[0], HL[1] - 0.4, HL[2]), fwd=FWD, back=BACK, r=1.25, head_len=11.0,
                  head=B.BRONZE_HI)
    g = Geo().capsule((HL[0], HL[1] - 0.4, HL[2] - 4.0), (HL[0], HL[1] - 0.4, HL[2] + 4.0), 1.75)
    rig.part("spear", g, B.LEATHER_DK, outline=0.5)
    rig.track("spearTip", "spear", tip)

    # the aspis on the near hand: a big round team shield with a riveted rim
    sx, sy, sz = HR[0] + 1.0, HR[1] - 6.0, HR[2] + 3.0
    B.aspis(rig, "hand_r", (sx, sy, sz), r=13.4, depth=2.6, rim=B.BRONZE, rim_w=1.3, rivets=12)
    rig.track("_foot", "shin_r", (3.1, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def shield(a, f, w=90.0):
    return B.arm("r", a, f, w, w_rest=90.0)


def spear(a, f, w):
    return B.arm("l", a, f, w, w_rest=90.0)


STANCE = merge(shield(-56, -18, 92), spear(-30, 50, 62), {"torso": {"r": -3}})
SPEAR_HAND_LESS = {k: v for k, v in STANCE.items() if k not in ("arm_l", "fore_l", "hand_l")}


def _idle(f):
    # the spear butt taps the ground on the beat: lifted on 1-2, dropped on 3 (a small dip)
    lift = [0.0, 0.6, 1.0, -0.5, 0.1, 0.0][f]

    def extra(ctx):
        return merge(spear(-30 + 8 * lift, 50 + 8 * lift, 62 + 3 * lift), {
            "body": {"sz": 1.0 - 0.02 * max(0.0, -lift)},
            "arm_r": {"r": -2 * ctx["lag"]}, "hand_r": {"r": 2 * ctx["lag"]},
            "helm": {"z": -0.4 * max(0.0, -lift)},
        })
    return M.idle_v2(f, SPEAR_HAND_LESS, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


def _walk(f):
    # march: stiff knee, high step; the shield bobs a frame late
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"arm_r": {"r": 3 * lag}, "hand_r": {"r": -2 * lag},
                "spear": {"r": -3 * lag}, "helm": {"z": 0.35 * lag}}
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=38.0, knee=46.0, lift_lu=7.5, bob_pct=0.06,
                     lean=-5.0, arm=10.0, fore=6.0, arms=("l",), extra=extra)


# 11 unique frames, moves.SMALL_MELEE_MS
#        read  dip  bash  HOLD smear lead  IMP  over recoil settle settle
S_A = [-12, -40, 55, 128, 80, 32, 8, 4, 22, -10, -26]
S_F = [58, 20, 125, 172, 70, 14, 0, -6, 40, 56, 52]
# spear direction in WORLD degrees (the torso lean is subtracted below)
S_WW = [50, 20, 15, 34, 10, 0, -9, -13, 5, 40, 58]
H_A = [-52, -38, -6, -36, -34, -30, -26, -26, -34, -46, -54]
H_F = [-16, -4, 10, -2, -4, -4, -2, -4, -8, -14, -18]
A_T = [-3, -8, -14, 14, 0, -12, -22, -24, -12, -6, -3]
A_H = [0, 4, 6, -6, -2, 6, 10, 10, 4, 1, 0]
A_Q = [-0.02, -0.12, -0.06, 0.1, 0.06, 0.02, -0.16, -0.12, -0.04, 0.02, 0.0]
A_X = [-0.5, -1.5, 4.0, -2.0, 3.0, 6.0, 9.0, 9.5, 6.0, 2.0, 0.5]
A_Z = [0.0, -2.6, -1.0, 1.4, 0.6, -0.6, -2.4, -2.0, -1.2, -0.3, 0.0]
A_THR = [2, 8, 24, -4, 12, 22, 30, 30, 20, 8, 2]
A_SHR = [0, -10, -22, 0, -10, -18, -24, -22, -14, -4, 0]
A_THL = [-2, -8, -18, 10, -6, -16, -24, -24, -16, -6, -2]
A_SHL = [0, -12, -6, -6, -4, -4, -4, -4, -4, -2, 0]


def _attack_pose(f):
    pose = merge(spear(S_A[f], S_F[f], S_WW[f] - A_T[f]), shield(H_A[f], H_F[f], 92), {
        "torso": {"r": A_T[f]}, "head": {"r": A_H[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (4, 5):
        pose.setdefault("spear", {})["sz"] = 1.18
    if f == 6:
        pose.setdefault("spear", {})["sz"] = 1.06
    if f in (1, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif f in (2, 4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return pose


SHIELD_FACE = (HR[0] + 1.0, HR[1] - 8.6, HR[2] + 3.0)
SPEAR_HEAD = (TIP[0], TIP[1], TIP[2] - 3.0)


def _attack_clip():
    streak = {"kind": "streak", "joint": "spear", "point": SPEAR_HEAD, "color": B.SAND_LT,
              "width_lu": 6.0, "white": 0.3}
    ov = {
        2: [{"kind": "burst", "joint": "hand_r", "point": (SHIELD_FACE[0] + 12.0, SHIELD_FACE[1], SHIELD_FACE[2]),
             "r0_lu": 4.0, "r1_lu": 10.0, "n": 4, "a0": -50.0, "arc": 100.0},
            {"kind": "dust", "ground": (9.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 3, "spread": 0.9}],
        4: [dict(streak, **{"from": 3, "t1": 0.95})],
        5: [dict(streak, **{"from": 3, "t0": 0.25, "t1": 0.95})],
        6: [dict(streak, **{"from": 4, "t0": 0.2, "t1": 0.9, "width_lu": 5.0}),
            {"kind": "burst", "joint": "spear", "point": TIP, "r0_lu": 6.0, "r1_lu": 12.0, "n": 5,
             "a0": -70.0, "arc": 140.0},
            {"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 6, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


def _hit(k):
    def recoil(a):
        return merge(shield(-56 + 18 * max(a, 0), -18 + 22 * max(a, 0), 92),
                     {"arm_l": {"r": 12 * a}, "spear": {"r": 10 * a},
                      "brow": {"z": 1.2 * max(a, 0)}})
    base = {k2: v for k2, v in STANCE.items() if k2 not in ("arm_r", "fore_r", "hand_r")}
    return B.hit_armoured(k, base, recoil, face_hurt=F.expr("squeeze", "grit"))


# D2: the helmet pops off on step 3, spins up over him and lands in front, rolling
LOOSE = [None, None, None, (-8, 16, 60), (-4, 30, 190), (2, 20, 300), (8, -6, 380), (13, -38, 440),
         (16, -41, 470), (17, -41, 480)]
SPEAR_LOOSE = [0, 20, 40, 70, 95, 90, 95, 95, 95, 95]


def _die(k):
    flail = [0.4, 0.3, 0.9, 1.0, 0.3, 0.6, 0.1, 0.0, 0.0, 0.0][k]
    stiff = min(1.0, k / 3.0)
    pose = merge(STANCE, B.die_d2(k, center_z=28.0, lie_z=10.0, height=HEIGHT_LU), {
        "torso": {"r": -4 * stiff}, "head": {"r": 10 * flail - 4},
        "arm_r": {"r": 60 * flail + 30 * stiff}, "fore_r": {"r": 20 * flail},
        "arm_l": {"r": 90 * flail + 40 * stiff}, "fore_l": {"r": 30 * flail},
        "hand_l": {"r": -SPEAR_LOOSE[k] * 0.5},
        "thigh_r": {"r": 6 * flail}, "shin_r": {"r": -4 * flail},
        "thigh_l": {"r": -6 * flail}, "shin_l": {"r": -4 * flail},
    })
    if LOOSE[k] is not None:
        x, z, r = LOOSE[k]
        pose["helm"] = dict(pose.get("helm", {}), hide=True)
        pose["helm_loose"] = {"show": True, "x": x, "z": z, "r": -r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl)
