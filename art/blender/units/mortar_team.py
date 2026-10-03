"""Mortar Team: Modern Age rare Long range (CONTENT_PLAN 5.6, DESIGN H6). A two-man bipod mortar, ~68 lu.

Look (A11, Modern palette): two mortar men with a light bipod mortar (a long gunmetal tube with a team band,
a bipod and a square baseplate). The gunner (the full figure) wears a team-covered round helmet, a team tunic
with team sleeves and cream chevrons, khaki webbing with shell pouches, olive trousers and puttees; the mate
behind him (a smaller, simpler figure) wears a team helmet and a team tunic and carries a spare bomb.

"A viewer expects the mortar to be set on its bipod, a bomb dropped down the tube, both men ducking with their
hands over their ears (thoomp), and the two to jog with the tube carried between them."

Animation (ANIM_SPEC G1 jog for both men, appendix B artillery: aimed shot, quick shot):
  idle      the mortar rests on its baseplate; the gunner squints at the range, the mate weighs the bomb
  walk      walk v3 bounce jog at ground speed (card 60 x 1.25 = 75 lu/s), both men's feet planted by IK on
            one gait (the mate half a step behind), the tube swinging between them
  attack    DROP THE BOMB: the gunner kneels by the tube and holds the bomb over its mouth (the held extreme,
            a hold loop), lets go, THOOMP (a flash and a puff from the mouth, the baseplate hops), both duck
            with hands over their ears, then he takes a fresh bomb from the mate
  attack_b  QUICK DROP: the mate drops the bomb in at arm's length while the gunner stands turned away with
            his hands over his ears (a tall silhouette against A's kneel)
  hit       light: the gunner's head snaps back, the mate flinches
  die       a stiff fall: the gunner topples back, his helmet pops off; the mate tumbles beside him
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as GT
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import kit_modern as KM
from ageborn_art import kit_modern_wave as W
from ageborn_art import moves as M
from ageborn_art import rigs_modern as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "mortar_team"
GAIT_NAME = "biped"
NAME = "Mortar Team"
HEIGHT_LU = 68
CANVAS = (460, 300)
FEET = (280, 262)
ANCHORS = {"head": (2, 66), "hitCenter": (-8, 30), "muzzle": (30, 27)}
NO_RETIME = True

SHOE = B.BOOT
MORTAR = B.GUNMETAL
BED = "#4E5238"
CREAM = "#E8DFC8"
MATE_X = -30.0                       # the mate's hips (character space)
MORT = (20.0, -4.0, 18.0)           # the mortar sits in front of the gunner, clear of his body
AX = 62.0                            # tube elevation (deg)
TUBE = 24.0
MOUTH = (MORT[0] + TUBE * math.cos(math.radians(AX)) - 4.0, MORT[1], MORT[2] + TUBE * math.sin(math.radians(AX)) - 2.0)
HAT_C = (1.0, 0.0, 57.0)


RIG = None


def _mate(rig):
    """The mate: a simpler second figure (hips, torso, head with dot eyes, arms, IK legs)."""
    mx = MATE_X
    rig.joint("m_hips", "body", (mx, 0, 15.0))
    rig.joint("m_torso", "m_hips", (mx, 0, 17.0))
    for s, y in (("r", -4.6), ("l", 4.6)):
        k = 1.0 if s == "r" else 0.8
        rig.joint(f"m_thigh_{s}", "m_hips", (mx, y, K.V3_THIGH_Z - 1.0))
        rig.joint(f"m_shin_{s}", f"m_thigh_{s}", (mx + 0.5, y, K.V3_KNEE_Z - 0.6))
        rig.joint(f"m_foot_{s}", f"m_shin_{s}", (mx + 1.0, y, K.V3_ANKLE_Z))
        from ageborn_art import colors as C
        g = Geo().capsule((mx, y, K.V3_THIGH_Z - 1.0), (mx + 0.5, y, K.V3_KNEE_Z - 0.6), 4.0, 3.6)
        rig.part(f"m_thigh_{s}", g, C.scale(B.OLIVE_LT, k))
        g = Geo().capsule((mx + 0.5, y, K.V3_KNEE_Z - 0.6), (mx + 1.0, y, K.V3_ANKLE_Z + 0.4), 3.4, 3.2)
        rig.part(f"m_shin_{s}", g, C.scale(B.KHAKI, k))
        g = Geo().blob((mx + 2.5, y, 2.3), (3.8, 3.8, 2.3), p=2.8, taper=(1.02, 0.86))
        rig.part(f"m_foot_{s}", g, C.scale(SHOE, k), finish="gloss")
    g = Geo().blob((mx, 0, 26.0), (8.8, 8.2, 9.0), p=2.4, taper=(1.05, 0.95))
    rig.part("m_torso", g, team=True)                                # team waistcoat
    g = Geo().blob((mx + 0.4, 0, 18.4), (8.6, 8.0, 3.6), p=2.6)
    rig.part("m_torso", g, B.KHAKI)
    rig.joint("m_head", "m_torso", (mx + 1.0, 0, 34.0))
    hd = Geo().blob((mx + 1.4, 0, 41.0), (8.6, 8.2, 8.4), p=2.3)
    hd.blob((mx + 10.2, -0.4, 40.0), (2.6, 2.4, 2.6), p=2.0)
    rig.part("m_head", hd, B.SKIN)
    g = Geo()
    for y in (-3.4, 3.2):
        g.blob((mx + 8.6, y, 42.6), (1.4, 1.2, 1.9), p=2.2)
    rig.part("m_head", g, B.PUPIL, outline=0, highlight=False)       # dot eyes
    g = Geo().blob((mx + 0.6, 0, 46.0), (9.6, 9.4, 6.6), p=2.3)
    g.clip((0, 0, 44.0), (0, 0, -1))
    rig.part("m_head", g, team=True)                                 # team helmet cover
    g = Geo().lathe([(9.6, 0), (10.6, -0.6), (10.6, -1.6), (9.4, -1.8)], (mx + 0.6, 0, 44.6), (mx + 0.6, 0, 42.8), segs=22)
    rig.part("m_head", g, B.OLIVE, finish="gloss")
    # arms holding the poles / the linstock
    for s, y in (("r", -9.4), ("l", 9.0)):
        rig.joint(f"m_arm_{s}", "m_torso", (mx, y, 31.0))
        rig.joint(f"m_fore_{s}", f"m_arm_{s}", (mx, y, 24.0))
        g = Geo().capsule((mx, y, 31.0), (mx, y, 24.0), 3.4, 3.0)
        rig.part(f"m_arm_{s}", g, team=True)
        g = Geo().capsule((mx, y, 24.0), (mx, y, 18.6), 3.0, 2.8)
        g.blob((mx + 0.3, y, 17.6), (3.4, 3.2, 3.4), p=2.3)
        rig.part(f"m_fore_{s}", g, B.SKIN)
    rig.joint("linstock", "m_fore_r", (mx, -10.0, 18.0))            # the spare bomb in the mate's hand
    _bomb(rig, "linstock", (mx + 0.6, -11.0, 21.0))


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, hat="round", brow_angry=False, mouth_w=5.4)
    KM.pouches(rig, "torso", [(9.4, -6.6, 19.4), (5.2, -10.2, 19.2), (0.2, -11.4, 19.2)], size=(2.3, 1.7, 2.8))
    rig.joint("bomb", "hand_r", (0.4, B.ARM_Y["r"] - 0.6, B.HAND_Z - 0.4), hidden=True)
    _bomb(rig, "bomb", (1.0, B.ARM_Y["r"] - 1.0, B.HAND_Z + 2.0))

    _mate(rig)

    # the mortar: a long tube on a bipod and a square baseplate
    rig.joint("mortar", "body", MORT)
    rig.rest_scale["mortar"] = 1.2
    mx, my, mz = MORT
    g = Geo().blob((mx - 3.0, my, mz - 3.4), (6.4, 6.4, 1.2), p=4.0)                 # baseplate
    rig.part("mortar", g, BED, finish="metal", outline=0.6)
    ax = (math.cos(math.radians(AX)), 0, math.sin(math.radians(AX)))
    p0 = (mx - 3.0, my, mz - 2.4)
    p1 = (p0[0] + ax[0] * TUBE, my, p0[2] + ax[2] * TUBE)
    g = Geo().capsule(p0, p1, 2.2, 2.0)
    rig.part("mortar", g, MORTAR, finish="metal", outline=0.8)
    g = Geo().lathe([(2.6, -0.8), (2.8, 0), (2.6, 0.8)], (p1[0] - ax[0] * 2.4, my, p1[2] - ax[2] * 2.4),
                    (p1[0] - ax[0] * 1.0, my, p1[2] - ax[2] * 1.0), segs=16)
    rig.part("mortar", g, "#2B2A2E", outline=0.4)                                      # muzzle ring
    g = Geo().lathe([(2.5, -1.4), (2.7, 0), (2.5, 1.4)], (p0[0] + ax[0] * 9.0, my, p0[2] + ax[2] * 9.0),
                    (p0[0] + ax[0] * 12.0, my, p0[2] + ax[2] * 12.0), segs=16)
    rig.part("mortar", g, team=True, outline=0.4)                                      # team band
    knee = (p0[0] + ax[0] * 14.0, my, p0[2] + ax[2] * 14.0)
    g = Geo()
    for dy in (-3.0, 3.0):
        g.capsule(knee, (mx + 10.0, my + dy, mz - 3.0), 0.8)                          # bipod
    g.capsule((mx + 9.0, my - 3.0, mz + 1.0), (mx + 9.0, my + 3.0, mz + 1.0), 0.6)
    rig.part("mortar", g, MORTAR, finish="metal", outline=0.5)
    mouth = (p1[0], my, p1[2])
    rig.track("muzzle", "mortar", mouth)
    rig.joint("flash", "mortar", mouth, hidden=True)
    g = Geo().blob((mouth[0] + ax[0] * 5.0, my - 1, mouth[2] + ax[2] * 5.0), (3.6, 2.0, 6.0), p=2.0, rot=(0, -28, 0))
    rig.part("flash", g, glow=B.FIRE, outline=0)
    g = Geo().blob((mouth[0] + ax[0] * 3.0, my - 2, mouth[2] + ax[2] * 3.0), (2.2, 1.6, 3.4), p=2.0, rot=(0, -28, 0))
    rig.part("flash", g, glow=B.FLASH_CORE, outline=0)
    G.smoke_cloud(rig, "root", (mouth[0] + 6.0, -14.0, mouth[2] + 10.0), size=1.0)


def _bomb(rig, joint, at):
    x, y, z = at
    g = Geo().blob((x, y, z), (1.8, 1.8, 3.2), p=2.2)
    rig.part(joint, g, B.OLIVE, finish="gloss", outline=0.5)
    g = Geo().capsule((x, y, z - 3.0), (x, y, z - 5.6), 0.7)
    for dy in (-1.4, 1.4):
        g.blob((x, y + dy, z - 5.4), (0.4, 1.0, 1.2), p=2.2)
    rig.part(joint, g, B.GUNMETAL, finish="metal", outline=0.4)
    g = Geo().lathe([(1.85, -0.4), (1.9, 0), (1.85, 0.4)], (x, y, z + 0.6), (x, y, z + 1.4), segs=12)
    rig.part(joint, g, CREAM, outline=0.3)


# -- poses ---------------------------------------------------------------------------------
LEGS = KM.legs_ik()
M_LEGS = {s: GT.Leg(f"m_thigh_{s}", f"m_shin_{s}", (MATE_X + 1.0, y, K.V3_ANKLE_Z), foot=f"m_foot_{s}",
                    toe=(MATE_X + K.V3_TOE, y, 0.3), heel=(MATE_X + K.V3_HEEL, y, 0.3))
          for s, y in (("r", -4.6), ("l", 4.6))}
# both men hold the poles behind / in front of them
CARRY_MAIN = merge(B.arm("r", -112, -100), B.arm("l", -110, -96), {"torso": {"r": -4}})


def _mate_arms(ra=-70, rf=-50, la=-64, lf=-46, mz=0.0, lean=0.0, link=0.0):
    pose = {"m_arm_r": {"r": ra + 90}, "m_fore_r": {"r": rf - ra}, "m_arm_l": {"r": la + 90},
            "m_fore_l": {"r": lf - la}, "m_hips": {"z": mz}, "m_torso": {"r": lean}, "linstock": {"r": link}}
    return pose


STANCE = merge(CARRY_MAIN, _mate_arms(), {"mortar": {"z": -14.0}})


def _idle(f):
    peer = [0.0, 0.3, 1.0, 1.0, 0.5, 0.0][f]
    blow = [0.0, 0.0, 0.0, 0.6, 1.0, 0.4][f]

    def extra(ctx):
        return merge(_mate_arms(ra=-30 + 30 * blow, rf=60 + 40 * blow, link=-20 * blow, mz=0.6 * ctx["lag"]),
                     {"head": {"r": -4 * peer}, "pupils": {"x": 0.8 * peer}, "arm_l": {"r": 60 * peer},
                      "fore_l": {"r": 70 * peer}, "m_head": {"r": -8 * blow}, "mortar": {"z": -14.0}})
    return M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


SPEED = 75.0
GAIT = KM.jog_gait(LEGS, SPEED, cycle_ms=656, stance=0.36)
# the mate's feet on the same gait, a quarter cycle behind
GAIT.feet["mr"] = (M_LEGS["r"], 0.25 - 0.03, MATE_X + 1.6, M_LEGS["r"].end.z)
GAIT.feet["ml"] = (M_LEGS["l"], 0.75 - 0.03, MATE_X + 1.6, M_LEGS["l"].end.z)


def _walk(f, report=None):
    p = 2 * math.pi * f / 8

    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        mb = -2.0 + 2.0 * math.cos(2 * (p - math.pi / 4))   # the mate bobs on his own beat
        return merge(_mate_arms(ra=-40, rf=-20, la=-36, lf=-18, mz=mb, lean=-6 + 2 * math.cos(2 * p)),
                     {"mortar": {"z": 0.6 * lag, "r": 4 * math.sin(p)}, "m_head": {"r": 3 * math.sin(p - 1.0)}})
    return M.walk_v3(RIG, f, CARRY_MAIN, GAIT, legs=LEGS, lean=-6.0, twist=5.0, nod=3.0, extra=extra, report=report)


# attack A: aimed shot (moves.SMALL_MELEE_MS, impact 6, hold step 3 looping with 2: the fuse fizz)
#        read  set   kneel HOLD  fizz  touch THUMP duck  rise  load  settle
A_KN = [0.0, 0.4, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.6, 0.2, 0.0]
A_MR = [(-70, -50), (-40, 0), (-10, 20), (-4, 24), (-2, 26), (0, 28), (60, 120), (70, 130), (20, 60), (-40, -20), (-70, -50)]
A_ML = [(-64, -46), (-60, -30), (-50, -20), (-50, -20), (-50, -20), (-50, -20), (66, 126), (72, 132), (0, 30), (-50, -30), (-64, -46)]
A_MAIN = [(-112, -100), (-60, -20), (-18, 6), (-10, 12), (-9, 14), (-10, 12), (70, 125), (74, 130), (-30, 10), (-10, 50), (-112, -100)]
A_LEAN = [0, 6, 10, 12, 12, 12, 18, 20, 8, 4, 0]
A_MORZ = [-14, -14, -14, -14, -14, -14, -12.5, -14, -14, -14, -14]


def _kneel(k):
    return merge({
        "thigh_r": {"r": 88 * k}, "shin_r": {"r": -92 * k}, "foot_r": {"r": 4 * k},
        "thigh_l": {"r": -4 * k}, "shin_l": {"r": -96 * k}, "foot_l": {"r": -30 * k},
    }, M.body_about((0, 0, 22), z=-10.5 * k))


def _a_pose(f):
    ma, mf = A_MAIN[f]
    ra, rf = A_MR[f]
    la, lf = A_ML[f]
    pose = merge(B.arm("r", ma, mf), B.arm("l", ma + 4, mf + 4), _kneel(A_KN[f]),
                 _mate_arms(ra=ra, rf=rf, la=la, lf=lf, lean=A_LEAN[f], link=-40 if 2 <= f <= 5 else 0,
                            mz=[0, 0, -1, -2, -2, -2, -4, -4, -2, 0, 0][f]), {
        "torso": {"r": [-4, -6, -8, -10, -10, -10, 14, 16, 4, -6, -4][f]},
        "head": {"r": [0, 2, 4, 6, 6, 6, 10, 12, 0, -4, 0][f]},
        "mortar": {"z": A_MORZ[f], "r": [0, 0, 2, 3, 3, 3, -4, 2, 0, 0, 0][f]},
        "flash": {"show": f == 6}, "bomb": {"show": 1 <= f <= 5 or f == 9},
        "smoke": {"show": f in (7, 8), "z": [0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0][f]},
        "m_head": {"r": [0, 0, 6, 8, 8, 8, 20, 22, 6, 0, 0][f]},
    })
    if f in (6, 7):
        pose = merge(pose, F.expr("squeeze", "o"))
    elif f in (3, 4, 5):
        pose = merge(pose, F.expr("grit"))
    return pose


def _ov_a():
    return {6: [{"kind": "burst", "joint": "mortar", "point": MOUTH, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6,
                 "a0": 20.0, "arc": 100.0, "color": "#FFF4D6"},
                {"kind": "dust", "ground": (MORT[0], 0.0), "size_lu": 7.0, "puffs": 4, "seed": 151, "spread": 1.2}],
            4: [{"kind": "burst", "joint": "mortar", "point": (MORT[0] - 3.0, 0, MORT[2] + 3.0), "r0_lu": 1.5,
                 "r1_lu": 4.0, "n": 4, "a0": 60.0, "arc": 120.0, "color": "#FFE3B0"}]}


def _attack_clip():
    return M.clip("attack", [_a_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=_ov_a(), extra={"holdStep": 3, "holdLoop": [2, 3]})


# attack B: quick shot: the gunner stands and turns away covering his ears, the mate at arm's length
def _b_pose(f):
    if f in (0, 1, 8, 9, 10):
        return _a_pose(f)
    ra, rf = [(0, 0), (0, 0), (10, 10), (14, 12), (14, 12), (16, 14), (60, 120), (70, 130)][f]
    pose = merge(B.arm("r", 80, 150), B.arm("l", 80, 150),
                 _mate_arms(ra=ra, rf=rf, la=70, lf=130, lean=-4 if f < 6 else 16, link=-30 if 2 <= f <= 5 else 0), {
        "torso": {"r": 10, "rz": 30}, "head": {"r": 8, "rz": 40},
        "mortar": {"z": -14.0 if f != 6 else -12.0},
        "flash": {"show": f == 6}, "smoke": {"show": f == 7},
        "m_head": {"r": 10 if f >= 6 else -4},
    })
    pose = G.plant(RIG, pose, LEGS, r=(5.0, 0, 0), l=(-5.0, 0, 0), max_drop=2.0)
    return merge(pose, F.expr("squeeze", "o" if f >= 6 else "grit"))


def _attack_b():
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=_ov_a(), reuse=reuse, extra={"holdStep": 3, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "hat": {"z": 3.0 * max(a, 0), "r": 8 * a}, "brow": {"z": 1.6 * max(a, 0)},
                "m_torso": {"r": 10 * a}, "m_head": {"r": 12 * a}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


HAT_PATH = {1: (3.0, 7.0, 30.0), 2: (8.0, 14.0, 110.0), 3: (14.0, 17.0, 200.0), 4: (20.0, 12.0, 280.0),
            5: (25.0, 0.0, 330.0), 6: (29.0, -24.0, 355.0), 7: (32.0, -50.0, 372.0), 8: (33.0, -53.0, 366.0),
            9: (33.0, -53.0, 366.0)}


def _die(k):
    fl = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    # The crew shares one "body" root with the mortar and the mate, so the gunner topples
    # about his own hips (a stiff cartoon timber-fall) instead of the whole-rig D1 flip.
    pose = merge(STANCE, {
        "hips": {"r": [0, 8, 22, 50, 78, 94, 88, 91, 90, 90][k], "x": [0, -1, -2, -4, -6, -7, -7, -7, -7, -7][k],
                 "z": [0, 4, 5, 2, -3, -9, -8, -10, -10, -10][k]},
        "torso": {"r": 10 * fl}, "head": {"r": 14 * fl - 6},
        "arm_r": {"r": 70 * fl + 30}, "arm_l": {"r": 110 * fl + 30},
        "thigh_r": {"r": 40 * fl + 20}, "thigh_l": {"r": -20 * fl + 10},
        "m_hips": {"r": [0, 10, 30, 60, 80, 88, 90, 90, 90, 90][k], "z": [0, 2, 3, 0, -4, -8, -10, -10, -10, -10][k]},
        "mortar": {"z": -14.0, "r": [0, 6, 12, 20, 24, 24, 24, 24, 24, 24][k]},
    })
    if k in HAT_PATH:
        x, z, r = HAT_PATH[k]
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 4, 5, 6, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 2, 3, 4, 5, 5, 6, 6], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
