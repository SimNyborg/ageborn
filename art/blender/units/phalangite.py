"""Phalangite: Bronze Age anti-armor (A17.9). Sarissa, reach 65, priority armored, ~72 lu.

Look (A17.12): a phalanx pikeman in a tall polished-bronze helmet (a high dome, cheek
guards, a team crest standing tall), big eyes and a stern brow under the rim, a linen
linothorax with shoulder panels and an aged-bronze trim over a team chiton with team sleeves
and linen pteruges, greaves and laced sandals, and a small round team shield slung on the
near shoulder so both hands stay on the weapon. The sarissa is very long (about 1.4x his
height, A11: polearm = reach), held low and level in both hands with a polished leaf head,
a bronze joint sleeve, a team pennon and a bronze butt spike. He stands braced, feet wide.

Animation (cartoon kit v2; a viewer expects a pike to be thrust straight and hard):
  idle    resets his grip (the front hand slides and re-grips), weight shift, blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1): the sarissa carried at the port,
          sloped up and forward in both hands, bobbing a frame late; planted feet
  attack_b  OVERHEAD DRIVE: both hands raise the sarissa over his head (an overhand grip), then
          drive it down and forward
  attack_c  BRACE AND SHOVE: drops into a deep crouch with the butt low and the point angled up,
          then shoves up and forward as he rises
  attack  FEINT AND DRIVE: a short feint jab, a pull back into a deep coil (the held extreme:
          sarissa drawn far back, weight on the back leg), then the full braced drive
          (two streak frames), impact with the arms locked out, the pennon whipping
  hit     armoured: dips behind the pelte, the helmet clanks down over his eyes
  die     D2 topple: he goes over backwards stiff as a plank, the sarissa drops and the
          helmet pops off; X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "phalangite"
GAIT_NAME = "biped"
NAME = "Phalangite"
HEIGHT_LU = 72
CANVAS = (452, 266)
FEET = (112, 228)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 33)}
NO_RETIME = True

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # rear (near) hand holds the sarissa
BUTT, TIP = -28.0, 98.0
PY = HR[1] - 1.5
SHOULDER = (0.0, B.SHOULDER_Z)
DEPTH_SHIFT = 24.0 * 0.18
HELM_C = (1.5, 0, 55.0)


def build(rig):
    global RIG
    RIG = rig
    B.skeleton_v3(rig)           # walk v3: longer legs, planted feet (ANIM_SPEC 2.0 rule 5)
    B.sandal_legs_v3(rig, thigh_r=4.7)

    # team chiton, linen cuirass, team pteruges
    g = Geo().blob((0, 0, 27.0), (10.6, 9.8, 12.0), p=2.3, taper=(1.1, 0.92))
    rig.part("torso", g, team=True)
    g = Geo().blob((1.0, 0, 29.0), (10.9, 10.1, 9.2), p=2.6, taper=(0.98, 1.0))
    g.clip((0, 0, 21.0), (0, 0, -1)).clip((0, 0, 37.0), (0, 0, 1))
    rig.part("torso", g, B.LINEN)
    g = Geo().blob((1.0, 0, 21.4), (11.4, 10.6, 1.4), p=3.2)
    g.blob((1.0, 0, 36.2), (10.4, 9.6, 1.1), p=3.2)
    rig.part("torso", g, B.AGED, finish="metal", outline=0.6)
    # linothorax shoulder panels (linen flaps tied down on the chest) and a panel seam
    for y in (-9.0, 9.0):
        g = Geo().blob((1.5, y, 37.4), (7.4, 3.6, 2.6), p=2.6, rot=(0, -8, 0))
        rig.part("torso", g, B.LINEN, outline=0.7)
    g = Geo().capsule((9.6, -6.0, 36.4), (10.4, -6.2, 30.0), 0.9).capsule((9.6, 6.0, 36.4), (10.4, 6.2, 30.0), 0.9)
    g.capsule((4.0, -10.6, 34.0), (4.0, -10.6, 22.0), 0.8)
    rig.part("torso", g, B.LEATHER_DK, outline=0.4)
    rig.secondary("hem", "hips", (0.5, 0, 17.0), (0.5, 0, 9.0), max_deg=8, gain=0.7)
    rig.rest_offset["hem"] = (0, 0, B.V3_LIFT + 0.6)        # hem >= 9 lu above the soles
    B.pteruges(rig, "hem", 17.6, B.LINEN, n=8, radius=(11.4, 10.6), length=7.0)
    g = Geo().blob((0.6, 0, 16.0), (11.0, 10.2, 3.6), p=2.6)
    rig.part("hem", g, team=True)

    # head: short beard, tall helmet with a standing team crest
    beard = Geo()
    for x, y, z, r in ((11.6, -3.0, 40.6, 2.6), (12.8, 0.0, 39.8, 2.8), (11.6, 3.0, 40.6, 2.4)):
        beard.blob((x, y, z), (r, r, r * 0.95), p=2.1)
    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.8, 3.4, 4.5), extra=[beard], mouth_z=44.8, mouth_w=4.8,
               brow_tilt=3.0)
    rig.part("head", beard, B.HAIR, finish="hair")
    rig.joint("helm", "head", HELM_C)
    B.helmet(rig, joint="helm", tall=6.0, crest_len=18.0, crest_h=11.0)
    rig.joint("helm_loose", "root", HELM_C, hidden=True)
    B.helmet(rig, joint="helm_loose", tall=6.0, crest_len=18.0, crest_h=11.0, crest_secondary=False)

    # arms: team sleeves, bare forearms, leather bracers
    for s in ("r", "l"):
        y = B.ARM_Y[s]
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.1, r1=3.7)
        g = Geo().blob((0.3, y * 1.02, 33.4), (5.8, 5.4, 5.6), p=2.3)
        rig.part(f"arm_{s}", g, team=True)
        g = Geo().blob((0, y, B.HAND_Z + 3.4), (4.5, 4.5, 1.8), p=2.6)
        rig.part(f"fore_{s}", g, B.LEATHER, outline=0.7)

    # small round shield slung on the near shoulder
    rig.joint("pelte", "torso", (2.0, -14.0, 32.0))
    B.aspis(rig, "pelte", (3.0, -17.5, 29.0), r=9.4, depth=1.8, rim=B.BRONZE, rim_w=1.4, rivets=8)

    # the sarissa on the rear hand, modelled along +X (rest direction 0)
    hx, hy, hz = HR
    g = Geo().lathe([(0, BUTT - 0.5), (1.6, BUTT), (1.5, 0), (1.3, TIP - 13), (0, TIP - 12)],
                    (hx, PY, hz), (hx + 1, PY, hz), segs=10)
    rig.part("hand_r", g, B.WOOD)
    g = Geo().lathe([(0, TIP - 14.5), (1.6, TIP - 14), (2.8, TIP - 9.5), (1.8, TIP - 4.0), (0, TIP)],
                    (hx, PY, hz), (hx + 1, PY, hz), segs=12, squash=(1.0, 0.5))
    rig.part("hand_r", g, B.BRONZE, finish=B.POLISH)
    g = Geo().lathe([(1.7, BUTT + 0.5), (1.6, BUTT - 2.5), (0, BUTT - 6.0)], (hx, PY, hz), (hx + 1, PY, hz), segs=10)
    g.lathe([(0, 34.0), (1.9, 34.2), (1.9, 36.6), (0, 36.8)], (hx, PY, hz), (hx + 1, PY, hz), segs=10)  # joint sleeve
    rig.part("hand_r", g, B.AGED_DK, finish="metal", outline=0.6)
    g = Geo().lathe([(0, -3.5), (2.0, -3.4), (2.0, 3.4), (0, 3.5)], (hx, PY, hz), (hx + 1, PY, hz), segs=10)
    rig.part("hand_r", g, B.LEATHER_DK, outline=0.4)
    # team ribbon tied under the head (follow-through)
    px0 = hx + TIP - 16.0
    rig.secondary("pennon", "hand_r", (px0, PY, hz - 0.8), (px0 - 12, PY, hz - 6.0), max_deg=14,
                  gain=1.2, rot_gain=0.4)
    pts = [(0.0, 0.0), (-12.0, -2.0), (-9.0, -4.6), (-12.5, -7.4), (0.0, -6.8)]
    g = Geo().slab([(px0 + x, hz - 0.8 + z) for x, z in pts], PY, 1.2)
    rig.part("pennon", g, team=True, outline=0.8)
    rig.track("sarissaTip", "hand_r", (hx + TIP, PY, hz))


# -- poses ---------------------------------------------------------------------------------
def _dir(deg):
    return math.cos(math.radians(deg)), math.sin(math.radians(deg))


def sarissa(a, f, w, grip=24.0):
    """Rear hand (a, f), sarissa pointing w degrees; the far hand grips as far forward as it
    can reach (at most `grip` lu ahead of the rear hand)."""
    hx, hz = B.fk_hand(SHOULDER, a, f)
    dx, dz = _dir(w)
    g = grip
    while g > 2.0:
        tx, tz = hx + dx * g - DEPTH_SHIFT, hz + dz * g
        if math.hypot(tx - SHOULDER[0], tz - SHOULDER[1]) < B.UPPER + B.LOWER - 1.2:
            break
        g -= 1.0
    la, lf = B.ik2(SHOULDER, (tx, tz))
    return merge(B.arm("r", a, f, w, w_rest=0.0), B.arm("l", la, lf))


def _pennon(pose, w):
    pose.setdefault("pennon", {})["r"] = pose.get("pennon", {}).get("r", 0.0) - 0.6 * w
    return pose


BRACE = {"thigh_r": {"r": 14}, "shin_r": {"r": -8}, "thigh_l": {"r": -14}, "shin_l": {"r": -4},
         "hips": {"z": -1.2}}
STANCE = (-86, -30, 14)       # held low and nearly level: the reach reads at a glance


NO_ARMS = {}


def _idle(f):
    # resets the grip: the front hand slides back on 2-3 and re-grips forward on 4
    grip = [24.0, 22.0, 17.0, 16.0, 23.0, 24.0][f]

    def extra(ctx):
        w = STANCE[2] + 1.5 * ctx["lag"]
        return _pennon(merge(sarissa(STANCE[0] + 2 * ctx["lag"], STANCE[1], w, grip=grip), BRACE,
                             {"torso": {"r": -3}}), w)
    return M.idle_v2(f, NO_ARMS, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


# -- walk v3: G1 bounce jog at ground speed (card 70 x 1.25 = 87.5 lu/s), 8 x 77 ms --------------
RIG = None
SPEED = 87.5
LEGS = B.walk_legs_v3()
GAIT = B.jog_gait(SPEED, LEGS)


def _walk(f, report=None):
    # carry: the sarissa at the port, sloped up and forward (the guard holds it level), both hands
    # on it, bobbing a frame late; the pennon trails
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        w = 40 + 3.0 * lag
        return _pennon(merge(sarissa(-70 + 3 * lag, -12, w), {"helm": {"z": 0.3 * lag}}), w)
    return M.walk_v3(RIG, f, {}, GAIT, legs=LEGS, lean=-10.0, twist=5.0, nod=3.0, extra=extra,
                     report=report)


def _feet(pose, fr, fl, lr=0.0, ll=0.0, ar=0.0, al=0.0):
    return B.plant(RIG, pose, LEGS, r=(fr, lr, ar), l=(fl, ll, al))


# 11 unique frames, moves.SMALL_MELEE_MS
#         read  feint pull  HOLD  smear lead  IMP  over recoil settle settle
S_A = [-92, -70, -122, -142, -62, -40, -26, -24, -52, -78, -86]
S_F = [-32, -16, -112, -140, -28, -12, -4, -2, -20, -28, -30]
S_WW = [12, 6, 6, 4, 0, -1, -2, -4, 4, 10, 14]          # sarissa direction, world
A_T = [-2, -6, 6, 12, -8, -12, -16, -17, -8, -4, -3]
A_H = [0, -2, 3, 6, -3, -4, -5, -5, -2, -1, 0]
A_Q = [-0.02, 0.02, -0.04, -0.1, 0.06, 0.03, -0.14, -0.1, -0.04, 0.0, 0.0]
A_X = [-0.5, 3.0, -2.0, -6.0, 4.0, 8.0, 12.0, 13.0, 7.0, 3.0, 1.0]
A_Z = [-1.2, -1.2, -2.0, -3.4, -1.0, -1.6, -4.0, -3.6, -2.4, -1.6, -1.2]
# planted feet: braced wide, the far foot holds, the near foot steps in with the drive
A_FR = [7.0, 10.0, 6.0, 4.0, 12.0, 16.0, 20.0, 20.0, 14.0, 9.0, 7.0]
A_FL = [-8.0, -6.0, -9.0, -12.0, -9.0, -7.0, -5.0, -5.0, -7.0, -8.0, -8.0]
A_LR = [0, 1.5, 0, 0, 2.5, 1.5, 0, 0, 0, 0, 0]


def _attack_pose(f):
    w = S_WW[f] - A_T[f]
    pose = merge(sarissa(S_A[f], S_F[f], w), {
        "hips": {"z": A_Z[f]},
        "torso": {"r": A_T[f]}, "head": {"r": A_H[f]},
    }, M.body_about((0, 0, 22), x=A_X[f], q=A_Q[f]))
    pose = _feet(pose, A_FR[f], A_FL[f], lr=A_LR[f])
    if f in (4, 5):
        pose["hand_r"]["sx"] = 1.08
    if f in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif f in (1, 4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return _pennon(pose, w)


HEAD_PT = (HR[0] + TIP - 8.0, PY, HR[2])
TIP_PT = (HR[0] + TIP, PY, HR[2])
STREAK = {"kind": "streak", "joint": "hand_r", "point": HEAD_PT, "color": B.SAND_LT, "white": 0.3,
          "width_lu": 5.5}


def _attack_clip():
    ov = {
        1: [{"kind": "burst", "joint": "hand_r", "point": TIP_PT, "r0_lu": 3.0, "r1_lu": 6.5, "n": 3,
             "a0": -40.0, "arc": 80.0}],
        4: [dict(STREAK, **{"from": 3, "t1": 0.95})],
        5: [dict(STREAK, **{"from": 3, "t0": 0.35, "t1": 0.98}),
            dict(STREAK, **{"from": 3, "t0": 0.1, "t1": 0.55, "width_lu": 3.5})],
        6: [{"kind": "burst", "joint": "hand_r", "point": TIP_PT, "r0_lu": 6.0, "r1_lu": 13.0, "n": 5,
             "a0": -70.0, "arc": 140.0},
            {"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 4, "spread": 0.9},
            {"kind": "dust", "ground": (20.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 9, "spread": 0.7}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


def _variant(k, tab):
    """One new frame of a variant from its table (torso-space arm, world sarissa angle)."""
    t = tab["T"][k]
    w = tab["W"][k] - t
    pose = merge(sarissa(tab["A"][k], tab["F"][k], w, grip=tab.get("G", [24.0] * 6)[k]), {
        "torso": {"r": t}, "head": {"r": tab["H"][k]},
    }, M.body_about((0, 0, 22), x=tab["X"][k], z=tab["Z"][k], q=tab["Q"][k]))
    pose = _feet(pose, tab["FR"][k], tab["FL"][k], lr=tab["LR"][k], ar=tab.get("AR", [0] * 6)[k],
                 al=tab.get("AL", [0] * 6)[k])
    return _pennon(pose, w)


# -- attack B: overhead two-handed downward drive (ANIM_SPEC appendix B) -------------------------
# 0 = A read, 1 = A feint, 2 the sarissa swung up, 3 HOLD (both hands over his head, an overhand
# grip, the point dipped toward the target, up on the toes), 4 smear, 5 lead, 6 IMPACT (driven down
# and forward, a long lunge), 7 overshoot, 8-10 = A recoil and settle
B_TAB = {
    #     lift  HOLD  smear lead  IMP   over
    "A": [30, 64, 40, 12, -6, -8],
    "F": [70, 104, 50, 10, -14, -16],
    "W": [-2, -8, -11, -14, -16, -17],
    "T": [6, 10, -4, -12, -18, -19],
    "H": [-4, -8, 0, 4, 6, 6],
    "X": [-2.0, -4.0, 2.0, 6.0, 10.0, 10.5],
    "Z": [1.0, 2.5, 0.0, -1.5, -3.0, -2.8],
    "Q": [0.04, 0.10, 0.06, 0.0, -0.14, -0.10],
    "FR": [6.0, 4.0, 10.0, 14.0, 18.0, 18.0],
    "FL": [-8.0, -10.0, -9.0, -7.0, -5.0, -5.0],
    "LR": [0.0, 0.0, 2.5, 1.0, 0.0, 0.0],
    "AR": [0, -14, 0, 0, 0, 0],
    "AL": [0, -18, 0, 0, 0, 0],
}


def _b_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    pose = _variant(i - 2, B_TAB)
    if i in (4, 5):
        pose["hand_r"]["sx"] = 1.08
    return merge(pose, F.expr("grit") if i in (2, 3) else F.expr("yell"),
                 {"brow": {"z": -1.0 if i in (2, 3) else -1.2}})


def _attack_b():
    ov = {
        4: [dict(STREAK, **{"from": 3, "t1": 0.95})],
        5: [dict(STREAK, **{"from": 3, "t0": 0.35, "t1": 0.98})],
        6: [{"kind": "burst", "joint": "hand_r", "point": TIP_PT, "r0_lu": 6.0, "r1_lu": 13.0, "n": 5,
             "a0": -110.0, "arc": 140.0},
            {"kind": "dust", "ground": (24.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 13, "spread": 0.8},
            {"kind": "dust", "ground": (-6.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 14, "spread": 0.7}],
    }
    # the overshoot holds the impact pose (atlas budget: the sarissa makes every frame wide)
    reuse = {0: ("attack", 0), 1: ("attack", 1), 7: ("attack", 8), 8: ("attack", 9), 9: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i if i < 7 else i + 1) for i in range(10)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 8, 9], overlays=ov, reuse=reuse)


# -- attack C: brace and shove from a deep crouch ------------------------------------------------
# 0 = A read, 1 = A feint, 2 dropping, 3 HOLD (a deep crouch, the butt low behind, the point angled
# up), 4 smear, 5 lead, 6 IMPACT (shoved up and forward as he rises), 7 overshoot, 8-10 = A's
C_TAB = {
    #      drop  HOLD  smear lead  IMP   over
    "A": [-120, -132, -90, -66, -50, -48],
    "F": [-80, -100, -40, -20, -8, -6],
    "W": [18, 30, 28, 24, 20, 18],
    "T": [-14, -22, -12, -6, -4, -4],
    "H": [8, 12, 4, 0, -2, -2],
    "X": [-1.0, -2.0, 3.0, 7.0, 10.0, 10.5],
    "Z": [-5.0, -9.0, -5.0, -2.0, -1.0, -1.2],
    "Q": [-0.10, -0.14, 0.06, 0.08, -0.12, -0.08],
    "FR": [9.0, 11.0, 13.0, 16.0, 18.0, 18.0],
    "FL": [-9.0, -12.0, -10.0, -8.0, -6.0, -6.0],
    "LR": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    "AL": [-20, -50, -30, -10, 0, 0],
}


def _c_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    pose = _variant(i - 2, C_TAB)
    if i in (4, 5):
        pose["hand_r"]["sx"] = 1.08
    return merge(pose, F.expr("grit") if i in (2, 3) else F.expr("yell"),
                 {"brow": {"z": -1.0 if i in (2, 3) else -1.2}})


def _attack_c():
    ov = {
        4: [dict(STREAK, **{"from": 3, "t1": 0.95})],
        5: [dict(STREAK, **{"from": 3, "t0": 0.35, "t1": 0.98})],
        6: [{"kind": "burst", "joint": "hand_r", "point": TIP_PT, "r0_lu": 6.0, "r1_lu": 13.0, "n": 5,
             "a0": -40.0, "arc": 140.0},
            {"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 6.0, "puffs": 4, "seed": 23, "spread": 1.0},
            {"kind": "dust", "ground": (18.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 24, "spread": 0.7}],
    }
    # the overshoot holds the impact pose (atlas budget: the sarissa makes every frame wide)
    reuse = {0: ("attack", 0), 1: ("attack", 1), 7: ("attack", 8), 8: ("attack", 9), 9: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i if i < 7 else i + 1) for i in range(10)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 8, 9], overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a):
        w = STANCE[2] + 14 * max(a, 0)
        return _pennon(merge(sarissa(STANCE[0] + 10 * a, STANCE[1] + 10 * a, w), BRACE,
                             {"pelte": {"r": 8 * a}, "brow": {"z": 1.2 * max(a, 0)}}), w)
    return B.hit_armoured(k, {}, recoil, face_hurt=F.expr("squeeze", "grit"))


LOOSE = [None, None, None, (-8, 16, 60), (-4, 30, 190), (2, 20, 300), (8, -6, 380), (13, -38, 440),
         (16, -41, 470), (17, -41, 480)]


def _die(k):
    flail = [0.4, 0.3, 0.9, 1.0, 0.3, 0.6, 0.1, 0.0, 0.0, 0.0][k]
    stiff = min(1.0, k / 3.0)
    # the sarissa tips forward out of his hands and lies on the ground ahead (torso-space angle)
    w = [20, 14, -10, -48, -86, -83, -86, -86, -86, -86][k]
    pose = merge(sarissa(-60 - 30 * stiff, -20 - 66 * stiff, w, grip=8.0),
                 B.die_d2(k, center_z=29.0, lie_z=10.0, height=HEIGHT_LU), {
        "torso": {"r": -4 * stiff}, "head": {"r": 10 * flail - 4},
        "thigh_r": {"r": 8 * flail}, "shin_r": {"r": -4 * flail},
        "thigh_l": {"r": -8 * flail}, "shin_l": {"r": -4 * flail},
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
    return _pennon(pose, w)


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
