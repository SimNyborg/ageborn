"""Shield Bearer: Bronze Age Common Guard (CONTENT_PLAN 5.2 #1). -25% from range >= 100, ~68 lu.

A viewer expects a man behind a big shield to brace it against arrows, then hack over the rim
with a short sword, and to march tucked behind the shield.

Look: a stocky thureophoros under a conical polished-bronze pilos with a verdigris band and a
short team plume tuft; a plum tunic under a linen cuirass with a team band, bronze greaves and
laced sandals. A tall oval team shield (thureos) with a sandstone spine, a polished boss and a
sandstone lambda covers him from shin to chin, so he reads as a moving wall; a forward-curved
kopis rides in the far hand.

Animation (cartoon kit v2):
  idle    peeks over the rim (the head bobs up and down behind it), taps the kopis on the rim
  walk    tucked march: knees bent, shield bobbing a frame late, head low behind the rim
  attack  BRACE AND HACK: he plants behind the shield (shove, dust), rises with the kopis
          cocked high behind his head (the held extreme, blade clear above the rim), then
          hacks down over the rim (arc smear); impact on the chop, blade past the rim
  hit     armoured: ducks behind the shield, the pilos clanks down
  die     D2 topple backwards, the shield falls flat on top of him, the pilos pops off
"""
from ageborn_art import face as F
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "shield_bearer"
NAME = "Shield Bearer"
HEIGHT_LU = 68
CANVAS = (300, 250)
FEET = (132, 216)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand (shield)
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)   # far hand (kopis), modelled pointing up (+Z)
HELM_C = (1.5, 0, 57.5)
SH_C = (HR[0] + 2.0, HR[1] - 6.5, HR[2] + 5.0)


def build(rig):
    B.skeleton(rig)
    B.sandal_legs(rig)
    K.laces(rig, zs=(4.4, 7.0))

    g = Geo().blob((0, 0, 20.0), (10.6, 9.8, 6.0), p=2.4)
    rig.part("torso", g, B.PLUM)
    B.cuirass(rig, B.LINEN, trim=B.VERD, z=28.5, bulk=1.04)
    rig.secondary("hem", "hips", (0.5, 0, 17.0), (0.5, 0, 9.0), max_deg=10, gain=0.9)
    g = Geo().blob((0.6, 0, 13.4), (11.4, 10.6, 4.8), p=2.4, taper=(1.14, 0.94))     # plum skirt
    rig.part("hem", g, B.PLUM)
    g = Geo().blob((0.6, 0, 9.4), (11.6, 10.8, 1.1), p=3.0)
    rig.part("hem", g, B.VERD_DK, outline=0.5)
    g = Geo().blob((0.5, 0, 20.2), (11.6, 10.8, 1.7), p=3.2)
    rig.part("torso", g, B.LEATHER_DK, outline=0.6)
    for s, y in (("r", -12.0), ("l", 11.5)):                          # team shoulder guards
        g = Geo().blob((0.4, y, 37.0), (6.6, 5.8, 5.0), p=2.6)
        rig.part(f"arm_{s}", g, team=True)

    # head: face kit, short beard, pilos on its own joint (clanks down, pops off)
    beard = Geo()
    for x, y, z, r in ((11.8, -2.8, 41.0, 2.6), (12.8, 0.4, 40.0, 2.7), (11.6, 3.2, 41.0, 2.4)):
        beard.blob((x, y, z), (r, r, r * 0.95), p=2.1)
    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.8, 3.4, 4.5), extra=[beard], mouth_z=44.8, mouth_w=5.0)
    rig.part("head", beard, B.HAIR, finish="hair")
    rig.joint("helm", "head", HELM_C)
    K.boeotian(rig, "helm", c=HELM_C)
    rig.joint("helm_loose", "root", HELM_C, hidden=True)
    K.boeotian(rig, "helm_loose", c=HELM_C, plume=False)

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.2, r1=3.8)
    for s in ("r", "l"):
        g = Geo().blob((0, B.ARM_Y[s], B.HAND_Z + 3.4), (4.6, 4.6, 2.0), p=2.6)
        rig.part(f"fore_{s}", g, B.LEATHER, outline=0.7)

    # kopis in the far hand
    rig.joint("kopis", "hand_l", HL)
    tip = K.kopis(rig, "kopis", HL, length=24.0, width=1.9, blade=B.BRONZE)
    rig.track("kopisTip", "kopis", tip)

    # the thureos on the near hand
    rig.joint("shield", "hand_r", HR)
    K.oval_shield(rig, "shield", SH_C, rx=11.2, rz=19.5, depth=2.8)
    rig.track("_foot", "shin_r", (3.1, -6.0, 0.5))

    # the loose shield for the death (falls flat on him)
    rig.joint("sh_loose", "root", (0, 0, 0), hidden=True)
    K.oval_shield(rig, "sh_loose", (0.0, -14.0, 0.0), rx=11.2, rz=19.5, depth=2.8)


# -- poses ---------------------------------------------------------------------------------
def shield(a, f, w=92.0):
    return B.arm("r", a, f, w, w_rest=90.0)


def blade(a, f, w):
    return B.arm("l", a, f, w, w_rest=90.0)


STANCE = merge(shield(-60, -14, 92), blade(-40, 30, 64), {"torso": {"r": -2}})
NO_BLADE = {k: v for k, v in STANCE.items() if k not in ("arm_l", "fore_l", "hand_l")}
NO_SHIELD = {k: v for k, v in STANCE.items() if k not in ("arm_r", "fore_r", "hand_r")}


def _idle(f):
    # peeks: the head bobs up over the rim on 1-2, ducks on 4; the kopis taps the rim on 3
    peek = [0.0, 0.7, 1.0, 0.2, -0.6, -0.2][f]
    tap = [0.0, 0.3, 0.8, -0.6, 0.0, 0.0][f]

    def extra(ctx):
        return merge(blade(-40 + 10 * tap, 30 + 12 * tap, 64 + 10 * tap), {
            "head": {"z": 1.0 * peek, "r": -3 * peek}, "pupils": {"x": 0.4 * peek},
            "arm_r": {"r": -2 * ctx["lag"]}, "helm": {"z": 0.3 * peek},
        })
    return M.idle_v2(f, NO_BLADE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"arm_r": {"r": 3 * lag}, "hand_r": {"r": -2 * lag}, "hips": {"z": -1.2},
                "kopis": {"r": -4 * lag}, "helm": {"z": 0.35 * lag}, "head": {"r": 6}}
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=34.0, knee=48.0, lift_lu=7.0, bob_pct=0.05,
                     lean=-3.0, arm=10.0, fore=8.0, arms=("l",), extra=extra)


# 11 unique frames, moves.SMALL_MELEE_MS
#        read  dip  brace HOLD smear lead  IMP  over recoil settle settle
K_A = [-40, -60, -20, 110, 80, 50, 12, 2, 10, -30, -38]
K_F = [30, 0, 70, 150, 90, 30, -8, -20, -5, 20, 28]
# kopis direction in WORLD degrees (the torso lean is subtracted below)
K_WW = [64, 40, 110, 165, 100, 35, -22, -38, 20, 56, 62]
H_A = [-60, -48, -30, -42, -40, -36, -34, -34, -40, -54, -58]
H_F = [-14, -6, 8, -4, -4, -6, -6, -8, -10, -12, -14]
A_T = [-2, -8, -12, 12, 2, -10, -20, -22, -10, -4, -2]
A_H = [0, 6, 4, -8, -2, 4, 10, 10, 4, 1, 0]
A_Q = [-0.02, -0.12, -0.06, 0.1, 0.05, 0.02, -0.15, -0.11, -0.04, 0.02, 0.0]
A_X = [-0.5, -1.0, 3.0, -1.5, 2.0, 4.0, 6.0, 6.5, 4.0, 1.5, 0.5]
A_Z = [0.0, -3.0, -1.6, 1.6, 0.8, -0.4, -2.6, -2.2, -1.2, -0.3, 0.0]
A_THR = [2, 10, 22, -2, 10, 18, 26, 26, 16, 6, 2]
A_SHR = [0, -14, -18, 0, -8, -14, -22, -20, -12, -4, 0]
A_THL = [-2, -10, -16, 8, -4, -12, -20, -20, -12, -4, -2]
A_SHL = [0, -14, -6, -4, -4, -4, -6, -6, -4, -2, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(blade(K_A[f] - t, K_F[f] - t, K_WW[f] - t), shield(H_A[f], H_F[f], 92), {
        "torso": {"r": A_T[f]}, "head": {"r": A_H[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (4, 5):
        pose.setdefault("kopis", {})["sz"] = 1.12
    if f in (1, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif f in (2, 4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return pose


KOPIS_TIP = (HL[0] + 2.4, HL[1] - 0.6, HL[2] + 24.0)
KOPIS_MID = (HL[0] + 1.4, HL[1] - 0.6, HL[2] + 12.0)
SHIELD_FACE = (SH_C[0], SH_C[1] - 3.0, SH_C[2])


def _attack_clip():
    arc = {"kind": "arc", "joint": "kopis", "inner": KOPIS_MID, "outer": KOPIS_TIP, "color": B.BRONZE_HI,
           "white": 0.3, "taper": 0.2, "lines": 3}
    ov = {
        2: [{"kind": "burst", "joint": "hand_r", "point": (SHIELD_FACE[0] + 12.0, SHIELD_FACE[1], SHIELD_FACE[2]),
             "r0_lu": 4.0, "r1_lu": 9.0, "n": 4, "a0": -40.0, "arc": 80.0},
            {"kind": "dust", "ground": (8.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 4, "spread": 0.9}],
        4: [dict(arc, **{"from": 3, "t1": 0.95})],
        5: [dict(arc, **{"from": 3, "t0": 0.3, "t1": 0.95})],
        6: [dict(arc, **{"from": 5, "t0": 0.1, "t1": 0.9}),
            {"kind": "burst", "joint": "kopis", "point": KOPIS_TIP, "r0_lu": 5.0, "r1_lu": 11.0, "n": 5,
             "a0": -80.0, "arc": 140.0},
            {"kind": "dust", "ground": (-6.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 7, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


def _hit(k):
    def recoil(a):
        return merge(shield(-60 + 16 * max(a, 0), -14 + 20 * max(a, 0), 92),
                     {"arm_l": {"r": 12 * a}, "kopis": {"r": 10 * a},
                      "brow": {"z": 1.2 * max(a, 0)}})
    return B.hit_armoured(k, NO_SHIELD, recoil, face_hurt=F.expr("squeeze", "grit"))


LOOSE = [None, None, None, (-8, 16, 60), (-4, 30, 190), (2, 20, 300), (8, -6, 380), (13, -38, 440),
         (16, -41, 470), (17, -41, 480)]
# the shield tips over and lands flat across his legs: (x, z, r) of the loose shield
SH_LOOSE = [None, None, None, (6, 24, -20), (2, 14, -60), (-2, 6, -86), (-4, 3, -90), (-4, 3, -90),
            (-4, 3, -90), (-4, 3, -90)]


def _die(k):
    flail = [0.4, 0.3, 0.9, 1.0, 0.3, 0.6, 0.1, 0.0, 0.0, 0.0][k]
    stiff = min(1.0, k / 3.0)
    pose = merge(STANCE, B.die_d2(k, center_z=28.0, lie_z=10.0, height=HEIGHT_LU), {
        "torso": {"r": -4 * stiff}, "head": {"r": 10 * flail - 4},
        "arm_r": {"r": 60 * flail + 30 * stiff}, "fore_r": {"r": 20 * flail},
        "arm_l": {"r": 90 * flail + 40 * stiff}, "fore_l": {"r": 30 * flail},
        "thigh_r": {"r": 6 * flail}, "shin_r": {"r": -4 * flail},
        "thigh_l": {"r": -6 * flail}, "shin_l": {"r": -4 * flail},
    })
    if LOOSE[k] is not None:
        x, z, r = LOOSE[k]
        pose["helm"] = dict(pose.get("helm", {}), hide=True)
        pose["helm_loose"] = {"show": True, "x": x, "z": z, "r": -r}
    if SH_LOOSE[k] is not None:
        x, z, r = SH_LOOSE[k]
        pose["shield"] = dict(pose.get("shield", {}), hide=True)
        pose["sh_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
