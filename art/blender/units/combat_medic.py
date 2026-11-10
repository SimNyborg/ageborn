"""Combat Medic: Modern Age rare Support, heal (CONTENT_PLAN 5.6). Sidearm (proj.bullet), 150 lu, ~68 lu.

Look (A11, Modern palette): a kind, round-faced medic in an olive round helmet with a plain cream disc on
the side (never a red cross, a protected emblem), a team tunic with team sleeves, a white armband with a
plain cream disc on his near arm, a big khaki medical satchel with a cream disc on his far hip and a roll of
bandage on his belt, olive trousers and puttees. He carries a small service pistol.

"A viewer expects him to pop off a sidearm shot while keeping low, and to jog crouched behind the line."

Animation (ANIM_SPEC G1 crouched jog at card 65 x 1.25 = 81.25 lu/s, appendix B guns):
  idle      he rummages in the satchel and checks a bandage roll, glances to the front, blink
  walk      walk v3 crouched jog, the pistol held up by his shoulder, the satchel bouncing a frame late
  attack    AIMED POP: he stands and extends the pistol one-handed, squinting (the held extreme), a pop
            and a small flash, the wrist flicks up
  attack_b  CROUCHED SNAP SHOT: he ducks low with both hands on the pistol close to his chest (the held
            extreme) and snaps off a shot from the crouch
  hit       light: the head snaps back, the helmet lifts, eyes squeezed
  die       D1 fling and spin: the helmet pops off and the pistol flies; X eyes and tongue

Art round W3 (the detail standard): both shots aimed up about 45 and 70 degrees at flyers (item 44) and damage
spots measured in posed frames (item 40).
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_modern as KM
from ageborn_art import kit_modern_wave as W
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import modern_w3 as MW

SLUG = "combat_medic"
GAIT_NAME = "biped"
NAME = "Combat Medic"
HEIGHT_LU = 68
CANVAS = (300, 272)
FEET = (120, 240)
ANCHORS = {"head": (2, 67), "hitCenter": (0, 32), "muzzle": (30, 34)}
NO_RETIME = True

HR = (0.4, R.ARM_Y["r"] - 0.6, R.HAND_Z - 0.4)
MUZ = (HR[0] + 1.0, HR[1], HR[2] + 9.6)      # the pistol points along the hand axis (modelled up)
WHITE = "#EEEAE0"
TROUSERS = "#767B5A"     # kit_modern.legs_v3's olive trousers

# the detail standard (art round W3, ageborn_art/look.py): the lifts and the model detail of audit 5.1 / 5.2.
# What a player sees of a Combat Medic is the olive helmet with its cream disc, the tunic with the white armband and
# the satchel strap, the satchel and the pistol: worn chips on the helmet, the tunic's team-dark hem, pocket flap
# and cuffs with a side seam (the satchel strap is his webbing), a buckle on the strap, lighter boots.
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = MW.HIGHLIGHT_SOLDIER
LOOK_SHADE = MW.SHADE_SOLDIER
MATERIAL_KINDS = MW.kinds({R.SKIN: "skin", R.HAIR: "fur", R.KHAKI: "cloth", R.KHAKI_LT: "cloth", KM.CREAM: "cloth",
                           WHITE: "cloth", TROUSERS: "cloth", R.OLIVE: "iron", MW.CHIP: "iron", MW.BOOT: "leather",
                           "#2B2A2E": "leather", R.LEATHER: "leather", R.GUNMETAL: "iron", R.STEEL: "iron",
                           KM.BRASS: "bronze", "team": "cloth"})
# worn chips on the olive helmet's dome above its team band
HELM_CHIPS = [((-6.4, 62.6), MW.CHIP_A), ((4.6, 64.4), MW.CHIP_B), ((-1.6, 66.2), MW.CHIP_C)]


def _pistol(rig, joint, at=HR):
    x, y, z = at
    g = Geo().blob((x - 0.4, y, z - 1.0), (1.6, 1.2, 2.8), p=2.6, rot=(0, -14, 0))     # grip
    rig.part(joint, g, R.LEATHER, outline=0.5)
    g = Geo().blob((x + 0.6, y, z + 4.6), (1.8, 1.2, 4.8), p=3.0)                         # slide and barrel
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.6)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    face = W.trooper(rig, hat="round", team_cover=False, brow_angry=False, mouth_shape="smile", mouth_w=5.0,
                     boot=MW.BOOT)
    del face
    MW.tunic_w3(rig, brace=None, pocket=KM.BRASS)   # W3: the tunic's team-dark hem and pocket flap, a side seam
    MW.cuffs(rig)
    MW.decals(rig, "hat", [Geo().blob((1.0, 0.0, 58.9), (12.6, 12.2, 10.4), p=2.3)], HELM_CHIPS, MW.CHIP)
    # the plain cream disc on the helmet side (no cross)
    rig.part("hat", Geo().blob((1.0, -12.4, 60.6), (3.6, 0.8, 3.6), p=2.2), KM.CREAM, outline=0.4)
    # white armband with a cream disc on the near upper arm
    g = Geo().lathe([(4.6, -1.6), (4.8, 0), (4.6, 1.6)], (0, R.ARM_Y["r"], 31.0), (0, R.ARM_Y["r"], 34.0), segs=16)
    rig.part("arm_r", g, WHITE, outline=0.4)
    rig.part("arm_r", Geo().blob((0.4, R.ARM_Y["r"] - 4.6, 32.6), (1.4, 0.5, 1.4), p=2.2), KM.CREAM, outline=0.3)
    # the medical satchel on the far hip, strap, bandage roll on the belt
    g = Geo().blob((-1.0, 12.0, 16.0), (7.4, 3.4, 6.2), p=3.0)
    rig.part("torso", g, R.KHAKI, outline=0.6)
    rig.part("torso", Geo().blob((-1.0, 15.4, 16.4), (2.4, 0.6, 2.4), p=2.2), KM.CREAM, outline=0.4)
    g = Geo().capsule((5.0, 9.0, 21.0), (4.0, -9.0, 36.0), 1.3)
    rig.part("torso", g, R.KHAKI, outline=0.5)
    g = Geo().blob((4.3, -10.2, 31.6), (1.5, 1.0, 1.8), p=3.0)       # W3: a steel buckle on the strap
    rig.part("torso", g, R.STEEL, finish="metal", outline=0.4)
    g = Geo().lathe([(2.2, -1.6), (2.4, 0), (2.2, 1.6)], (8.0, -10.8, 19.2), (8.0, -12.6, 19.2), segs=14)
    rig.part("torso", g, WHITE, outline=0.4)
    rig.joint("pistol", "hand_r", HR)
    _pistol(rig, "pistol")
    rig.track("muzzle", "pistol", MUZ)
    R.muzzle_flash(rig, "pistol", MUZ, size=0.9)
    KI.loose(rig, "pistol_loose", HR, lambda j: _pistol(rig, j))
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry (COMMON C1)
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40; art/blender/README.md), measured in posed frames: never on the face or skin."""
    rig.damage_spot_at("back", "torso", -6.0, 22.0, 8.0, "cloth", team=True)      # 100% (at (-7, 27): 65%)
    rig.damage_spot_at("skirt", "hips", 5.0, 12.0, 7.0, "cloth", team=True)
    rig.damage_spot_at("helmet", "hat", -4.0, 64.0, 6.0, "metal", fill=R.OLIVE)
    rig.damage_spot_at("hem", "hips", -8.0, 12.0, 7.0, "cloth", kind="strip", team=True)


def gun_arm(a, f, w):
    return R.arm("r", a, f, w, w_rest=90.0)


STANCE = merge(gun_arm(-60, 30, 60), R.arm("l", -80, -30), {"torso": {"r": -5.0}})


def _idle(f):
    rummage = [0.0, 0.6, 1.0, 1.0, 0.5, 0.0][f]
    look = [0.0, 0.0, 0.0, 0.3, 1.0, 0.4][f]

    def extra(ctx):
        a, fo = R.ik2(R.SH, (-2.0 - 2.0 * rummage, 22.0 - 2.0 * rummage))
        return merge(R.arm("l", a, fo), {"head": {"r": -10 * rummage + 6 * look, "rz": -8 * rummage},
                                         "pupils": {"z": -0.8 * rummage}, "arm_r": {"r": 2 * ctx["lag"]}})
    pose = M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)
    return KM.ground_feet(RIG, pose, LEGS)


SPEED = 81.25
LEGS = KM.legs_ik()
GAIT = KM.jog_gait(LEGS, SPEED, cycle_ms=616)
CARRY = merge(gun_arm(-20, 100, 95), {"torso": {"r": -6.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"arm_r": {"r": 3 * lag}, "hand_r": {"r": 6 * lag}, "hat": {"r": -1.5 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, bob=[-4.6, -5.4, -1.8, 0.4], lean=-14.0, twist=6.0, nod=3.0,
                     arms={"l": KI.ArmChain("l")}, arm=34.0, extra=extra, report=report)


# aimed shots (queue item 44, ageborn_art/aimed.py): a turn of `turn` degrees up raises the pistol about the
# shoulder (A: the upper arm takes 85% of it, the forearm and the pistol all of it; B: both hands swing up round the
# shoulder by 70% of it and the pistol takes all of it), he leans back a little and looks up along it.
AIM_LEAN, AIM_HEAD, AIM_UPPER, AIM_SWING = 0.14, 0.28, 0.85, 0.70
AIM_W = [0.0, 0.5, 0.95, 1.0, 1.0, 0.8, 0.4, 0.0]     # per unique frame (A and B: fire on 3)

# 8 unique frames in 560 ms; the shot on frame 3 at 260 ms (impactAt 0.4643)
ATTACK_MS = [40, 60, 160, 50, 60, 60, 60, 70]
ATTACK_IMPACT = 3
#        raise extend HOLD FIRE  flick back  lower settle      (A: aimed pop, standing, one arm out)
A_A = [-40, -10, 0, 0, 6, 0, -30, -55]
A_F = [10, -4, 0, 0, 10, 4, 10, 25]
A_W = [20, 0, 0, 0, 22, 8, 30, 55]
A_T = [-5, -2, 0, 0, 4, 1, -2, -4]


def _a_pose(f, turn=0.0):
    t = A_T[f] + AIM_LEAN * turn
    pose = merge(gun_arm(A_A[f] + AIM_UPPER * turn - t, A_F[f] + turn - t, A_W[f] + turn - t), R.arm("l", -80, -30), {
        "torso": {"r": t, "rz": [0, -6, -10, -10, -8, -6, -2, 0][f]},
        "head": {"r": [0, -2, -3, -3, 4, 2, 0, 0][f] + AIM_HEAD * turn, "x": 1.0 if f in (2, 3) else 0.0},
        "hat": {"r": [0, 0, 0, 0, 4, 1, 0, 0][f]}, "flash": {"show": f == 3},
        "thigh_r": {"r": [4, 10, 14, 14, 12, 10, 6, 4][f]}, "thigh_l": {"r": [-4, -10, -14, -14, -14, -10, -6, -4][f]},
    }, M.body_about((0, 0, 22), x=[0, 0.5, 1, 1, -0.8, -0.4, 0, 0][f], q=[0, 0, -0.02, 0.03, -0.04, 0, 0, 0][f]))
    if f in (2, 3):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -0.8}})
    return KM.ground_feet(RIG, pose, LEGS)


#        duck  HOLD  FIRE  kick  stay  rise      (B: crouched two-handed snap shot; 0 and 7 = A's)
B_HX = [8.0, 9.5, 9.5, 8.5, 9.0, 7.0]
B_HZ = [26.0, 26.0, 26.0, 27.5, 26.5, 24.0]
B_W = [10.0, 4.0, 4.0, 18.0, 8.0, 30.0]
B_DROP = [8.0, 12.0, 12.0, 11.5, 11.0, 6.0]
B_T = [-14, -18, -18, -12, -14, -8]


def _b_pose(i, turn=0.0):
    if i in (0, 7):
        return _a_pose(i)
    k = i - 1
    t0 = B_T[k]
    t = t0 + AIM_LEAN * turn
    # both hands swing up round the shoulder with the aim
    c, s = math.cos(math.radians(AIM_SWING * turn)), math.sin(math.radians(AIM_SWING * turn))
    dx, dz = B_HX[k] - R.SH[0], B_HZ[k] - R.SH[1]
    hx, hz = R.SH[0] + dx * c - dz * s, R.SH[1] + dx * s + dz * c
    a, fo = R.ik2(R.SH, (hx, hz))
    pose = merge(gun_arm(a, fo, B_W[k] + turn - t), {
        "torso": {"r": t}, "head": {"r": -0.6 * t0 + [0, -2, -2, 5, 0, 0][k] + AIM_HEAD * turn},
        "hat": {"r": [0, 0, 0, 5, 1, 0][k]}, "flash": {"show": k == 2},
    })
    la, lf = R.ik2(R.SH, (hx - 1.2, hz - 1.6))
    pose = merge(pose, R.arm("l", la, lf), M.body_about((0, 0, 22), x=[0.5, 1, 1, -1, 0, 0][k],
                                                         q=[-0.04, -0.06, 0.03, -0.06, -0.02, 0][k]))
    pose = KM.kneel(RIG, pose, LEGS, drop=B_DROP[k], front=11.0)
    if k in (1, 2):
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


def _burst():
    return [{"kind": "burst", "joint": "pistol", "point": MUZ, "r0_lu": 4.0, "r1_lu": 8.0, "n": 5, "a0": -50.0,
             "arc": 100.0}]


def _hit(k):
    base = {"torso": {"r": -5.0}} if M.HIT_AMT[k] > 0 else STANCE
    return W.hit_pose(k, base, lambda a: gun_arm(-60 + 20 * a, 30 + 30 * a, 60 + 30 * a) if a > 0 else {})


def _die(k):
    return W.die_d1_pose(k, STANCE, HEIGHT_LU, prop="pistol", prop_path=W.PROP_PATH)


def clips():
    attack = M.clip("attack", [_a_pose(f) for f in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays={3: _burst()},
                    extra={"holdStep": 2})
    attack_b = M.clip("attack_b", [_b_pose(i) for i in range(8)], ATTACK_MS, impact=ATTACK_IMPACT,
                      overlays={3: _burst()}, reuse={0: ("attack", 0), 7: ("attack", 7)}, extra={"holdStep": 2})
    # aimed up about 45 and 70 degrees at flyers (both shots; the extras sheet)
    aimed_a = AIMED.variants(RIG, attack, lambda u, t: _a_pose(u, turn=t), AIM_W, aims=("up45", "up70"))
    aimed_b = AIMED.variants(RIG, attack_b, lambda u, t: _b_pose(u, turn=t), AIM_W, aims=("up45", "up70"))
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        attack,
        attack_b,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ] + aimed_a + aimed_b
    for v in aimed_a:
        AIMED.check_timing(attack, v)
    for v in aimed_b:
        AIMED.check_timing(attack_b, v)
    return M.check_variants(M.check_contract(cl, attack_ms=560, attack_impact_at=0.4643))
