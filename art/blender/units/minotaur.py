"""Minotaur: Bronze Age Epic Brawler, armored (CONTENT_PLAN 5.2 #12). First hit x2 and 40 lu knockback;
frenzy below 50% HP. ~94 lu.

A viewer expects a bull-man to lower his horns and charge, then bring a huge double axe down
overhead, and to stomp forward on hooves with his head low, snorting.

Look: a hulking bull-headed giant (the medieval biped at 1.38x): a brown-furred bull head with a
pale muzzle, a polished bronze nose ring, big ivory horns, small angry eyes; a bare furry chest
crossed by a team strap, a team Minoan kilt with a sandstone hem and a bronze belt, bronze
bracers, furry legs ending in dark cloven hooves, a tufted tail. He swings a labrys: a long haft
with two crescent bronze blades.

Animation (cartoon kit v2, heavy timing):
  idle    snorts (steam puffs from the nostrils), shifts his weight, the axe on his shoulder
  walk    walk v3 heavy stomp at ground speed (ANIM_SPEC G3, card 60 x 1.25 = 75 lu/s, 10 frames in
          1100 ms): hard hoof contact, a deep DOWN, the head low and the horns forward, the labrys
          sloped back over the shoulder, the cape and tail a frame late
  attack_b  GORE TOSS: drops into a low crouch with the head down and the horns levelled, the labrys
          trailing low behind (held extreme), then drives forward and tosses the head up, horns
          hooking through the target
  attack_c  FLAT SWEEP: turns away with the labrys drawn back level at chest height, then sweeps it
          round flat at waist height
  attack  HORNS DOWN, LABRYS OVERHEAD: he drops his head and lunges a half step (horns
          forward), then rears up with the labrys raised high behind his head in both hands
          (held extreme, snorting), and chops it down overhead into the target (a wide arc
          smear, impact lines, a crack of dust), the head still low behind the blow
  hit     armoured: a grunt and a shake of the horns
  die     D2 heavy topple backwards, the labrys spins away, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "minotaur"
GAIT_NAME = "heavy"
NAME = "Minotaur"
HEIGHT_LU = 94
CANVAS = (420, 360)
FEET = (190, 316)
ANCHORS = {"head": (6, 92), "hitCenter": (0, 44)}
NO_RETIME = True
SCALE = 1.38

FUR = "#7A6656"
FUR_DK = "#5E4E42"
MUZZLE = "#B59E8A"
HORN = "#EFE7D0"
HOOF = "#3A3330"
HR = (0.0, B.ARM_Y["r"], B.HAND_Z)


def _labrys(rig, joint, grip, haft=34.0, back=8.0):
    gx, gy, gz = grip
    y = gy - 1.2
    g = Geo().capsule((gx, y, gz - back), (gx, y, gz + haft), 1.25, 1.15)
    rig.part(joint, g, B.WOOD_DK, outline=0.6)
    g = Geo()
    for z in (gz - 3.0, gz + 2.0, gz + 7.0):
        g.blob((gx, y, z), (1.7, 1.7, 0.6), p=3.0)
    rig.part(joint, g, B.LEATHER, outline=0.3)
    hz = gz + haft - 4.0
    for sgn in (1, -1):                                    # the two crescent blades
        pts = []
        for i in range(9):
            a = math.radians(-70 + 140 * i / 8)
            pts.append((gx + sgn * (3.0 + 10.0 * math.cos(a) * 0.95), hz + 11.0 * math.sin(a)))
        inner = []
        for i in range(8, -1, -1):
            a = math.radians(-50 + 100 * i / 8)
            inner.append((gx + sgn * (2.0 + 4.0 * math.cos(a)), hz + 5.2 * math.sin(a)))
        g = Geo().slab(pts + inner, y - 0.4, 1.4)
        rig.part(joint, g, B.AGED, finish="metal", outline=0.7)
        edge = Geo()
        for p0, p1 in zip(pts, pts[1:]):
            edge.capsule((p0[0] - sgn * 0.6, y - 1.3, p0[1]), (p1[0] - sgn * 0.6, y - 1.3, p1[1]), 0.5)
        rig.part(joint, edge, "#F4ECD6", outline=0)
    g = Geo().blob((gx, y - 0.6, hz), (2.6, 2.4, 3.6), p=2.6)
    rig.part(joint, g, B.AGED_DK, finish="metal", outline=0.5)
    return (gx + 12.5, y, hz)


def build(rig):
    global RIG
    RIG = rig
    B.skeleton_v3(rig)           # walk v3: longer legs, planted hooves (ANIM_SPEC 2.0 rule 5)
    rig.rest_scale["body"] = SCALE
    # furry legs on the v3 joints with cloven hooves on the foot joints; the far leg 20% darker
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        col = FUR if s == "r" else FUR_DK
        hoof = HOOF if s == "r" else "#2C2725"
        g = Geo().capsule((0, y, B.V3_THIGH_Z), (0.5, y, B.V3_KNEE_Z), 5.4, 4.6)
        rig.part(f"thigh_{s}", g, col, finish="hair")
        g = Geo().capsule((0.5, y, B.V3_KNEE_Z), (1.0, y, B.V3_ANKLE_Z + 0.6), 4.6, 3.2)
        rig.part(f"shin_{s}", g, col, finish="hair")
        g = Geo().blob((2.4, y, 1.8), (3.4, 3.6, 2.0), p=2.8, taper=(1.05, 0.8))
        rig.part(f"foot_{s}", g, hoof, finish="gloss")
        g = Geo().capsule((5.4, y + 3.6 * B.SIDE_Y[s], 2.6), (5.6, y + 3.6 * B.SIDE_Y[s], 0.4), 0.5)
        rig.part(f"foot_{s}", g, "#1E1A18", outline=0, highlight=False)
        g = Geo()
        for a in (0, 70, 140, 210, 280):                   # fur fetlock tufts
            r = math.radians(a)
            g.lathe([(1.6, 0), (0, -3.2)], (1.0 + 3.4 * math.cos(r), y + 3.4 * math.sin(r), 7.2), segs=6)
        rig.part(f"shin_{s}", g, FUR_DK if s == "r" else "#4C4036", finish="hair", outline=0.5)
    # torso: furry chest and belly, a team strap, a team kilt with a sandstone hem, bronze belt
    g = Geo().blob((0.6, 0, 28.0), (11.6, 10.6, 12.6), p=2.3, taper=(0.92, 1.16))
    rig.part("torso", g, FUR, finish="hair")
    g = Geo().blob((6.4, -1.0, 29.0), (6.6, 8.6, 8.0), p=2.4)
    rig.part("torso", g, MUZZLE, finish="hair", outline=0.6)
    g = Geo().capsule((9.5, -9.5, 37.0), (-9.0, 9.5, 20.0), 3.8)
    rig.part("torso", g, team=True, outline=0.7)
    # a big team cape over the shoulders (follow-through) and a team pauldron on the near arm
    rig.secondary("cape", "torso", (-6.0, 0.0, 40.0), (-20.0, 0.0, 10.0), max_deg=16, gain=1.2)
    g = Geo().blob((-9.0, 0, 26.0), (5.0, 13.4, 16.0), p=2.6, taper=(1.25, 0.85))
    g.clip((-6.0, 0, 0), (1, 0, 0))
    rig.part("cape", g, team=True)
    g = Geo().blob((-1.0, 0, 40.0), (11.0, 12.6, 3.6), p=2.6)
    rig.part("torso", g, team=True, outline=0.7)
    g = Geo().sphere((9.0, -10.4, 35.4), 2.4, cuts=3)
    rig.part("torso", g, B.BRONZE, finish=B.POLISH, outline=0.5)
    rig.secondary("hem", "hips", (0.5, 0, 17.0), (0.5, 0, 8.0), max_deg=12, gain=1.0)
    rig.rest_offset["hem"] = (0, 0, B.V3_LIFT)              # the kilt hem >= 9 lu above the hooves
    g = Geo().blob((0.8, 0, 13.6), (12.8, 11.6, 5.6), p=2.4, taper=(1.2, 0.94))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.8, 0, 8.6), (13.2, 12.0, 1.4), p=3.0)
    rig.part("hem", g, B.SAND_LT, outline=0.5)
    g = Geo().blob((0.6, 0, 18.6), (12.4, 11.2, 2.2), p=3.2)
    rig.part("torso", g, B.LEATHER, outline=0.6)
    K.lambda_mark(rig, "hem", (8.0, -11.6, 13.0), size=1.2)
    rig.secondary("tail", "hips", (-11.0, 0, 18.0), (-17.0, 0, 9.0), max_deg=18, gain=1.3)
    g = Geo().capsule((-11.0, 0, 18.0), (-16.0, 0, 10.5), 1.4, 1.0)
    g.blob((-16.8, 0, 9.4), (2.6, 2.4, 3.0), p=2.2)
    rig.part("tail", g, FUR_DK, finish="hair")

    # bull head: face kit on a furry head with a long muzzle, horns, ears, nose ring
    B.face_kit(rig, cx=12.4, cz=52.0, skin=FUR, brow=FUR_DK, eye_r=(3.2, 3.0, 3.6), eye_dy=(-5.6, 5.4),
               center=(2, 0, 50.0), r=(11.6, 11.0, 11.2), nose=(14.6, -0.4, 44.6), nose_r=(6.6, 7.4, 5.8),
               mouth_z=40.2, mouth_w=6.0, brow_tilt=3.4)
    g = Geo().blob((16.6, -0.4, 43.6), (5.6, 7.2, 5.0), p=2.3)
    rig.part("head", g, MUZZLE)
    g = Geo()
    for y in (-2.8, 2.6):
        g.blob((21.4, y - 0.4, 44.6), (0.9, 1.3, 1.4), p=2.0)
    rig.part("head", g, "#2E2420", outline=0)
    g = Geo().lathe([(0, 0), (2.6, 0.2), (2.6, 0.9), (0, 1.1)], (21.6, -0.4, 40.4), (21.6, -0.4, 41.5), segs=18)
    g.clip((21.6, -0.4, 43.0), (0, 0, 1))
    rig.part("head", g, B.BRONZE_HI, finish=B.POLISH, outline=0.4)
    g = Geo()
    for y in (-1, 1):                                     # horns sweep out, forward and up
        a, b, c = (2.0, 9.0 * y, 59.0), (6.0, 15.0 * y, 63.0), (12.0, 15.6 * y, 70.0)
        g.capsule(a, b, 3.4, 2.8).capsule(b, c, 2.8, 0.9)
    rig.part("head", g, HORN, finish="gloss")
    g = Geo()
    for y in (-1, 1):
        g.blob((-3.0, 11.6 * y, 53.0), (4.4, 2.4, 2.4), p=2.2, rot=(0, -20, 0))
    rig.part("head", g, FUR_DK, finish="hair", outline=0.6)
    rig.joint("steam", "head", (22.0, 0, 44.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((3.0, 0.0, 2.6), (6.4, 1.4, 2.0), (8.8, 3.0, 1.6)):
        g.sphere((22.0 + dx, -2.0, 44.0 + dz), r, cuts=3)
    rig.part("steam", g, "#F2EEE6", finish="dust", outline=0.5)

    for s in ("r", "l"):
        B.arm_parts(rig, s, FUR, hand=FUR_DK, r0=5.0, r1=4.4)
        g = Geo().blob((0.2, B.ARM_Y[s] * 1.05, 37.0), (6.6, 5.8, 5.2), p=2.5)
        rig.part(f"arm_{s}", g, team=True, outline=0.7)
        g = Geo().blob((0, B.ARM_Y[s], B.HAND_Z + 3.4), (5.0, 5.0, 2.4), p=2.6)
        rig.part(f"fore_{s}", g, B.LEATHER_DK, outline=0.6)
    rig.joint("axe", "hand_r", HR)
    tip = _labrys(rig, "axe", HR)
    rig.track("axeTip", "axe", tip)
    rig.joint("axe_loose", "root", (0, 0, 0), hidden=True)
    _labrys(rig, "axe_loose", (0.0, -18.0, -14.0))


# -- poses ---------------------------------------------------------------------------------
def wield(a, f, w, lean=0.0, d=9.0):
    return K.two_hand(a, f, w, d, lean=lean)


STANCE = merge(wield(-40, 40, 120, lean=6), {"torso": {"r": -6}, "head": {"r": -10}})


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    snort = [0.0, 0.0, 1.0, 0.6, 0.0, 0.0][f]

    def extra(ctx):
        return {"head": {"r": 4 * snort}, "steam": {"show": snort > 0.5, "s": 0.8 + 0.4 * snort}}
    return M.idle_v2(f, STANCE, frames=n, extra=extra, face_blink=F.expr("blink"), blink=4, bob=1.6)


# -- walk v3: G3 heavy stomp at ground speed (card 60 x 1.25 = 75 lu/s), 10 x 110 ms ----------------
RIG = None
SPEED = 75.0
LEGS = B.walk_legs_v3()
GAIT = G.Gait(10, 1100, SPEED, G.biped_feet(LEGS["l"], LEGS["r"], x_mid=2.0 * SCALE,
                                           ground=B.V3_ANKLE_Z * SCALE), 0.56,
              lift=10.0, kick=2.0, reach=3.0, toe_off=14.0, heel_strike=8.0, lift_peak=0.45, early_lift=2.0)
HEAVY_BOB = [-3.0, -6.0, -1.5, 1.2]           # CONTACT (hard), DOWN (deep), PASSING, UP (short)
HEAVY_SQ = [-0.02, -0.06, 0.0, 0.03]
# walk carry: the labrys sloped back over the shoulder (not the guard), head low, horns forward


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(wield(-58 + 3 * lag, 62 + 3 * lag, 152 + 4 * lag, lean=12),
                     {"head": {"r": -8 + 3 * lag}, "cape": {"r": 4 * lag}, "tail": {"r": 6 * lag}})
    base = {k: v for k, v in STANCE.items() if not k.startswith(("arm_", "fore_", "hand_"))}
    return M.walk_v3(RIG, f, base, GAIT, legs=LEGS, bob=HEAVY_BOB, sq=HEAVY_SQ, tbob=None, lean=-12.0,
                     twist=5.0, nod=3.0, sway=3.0, extra=extra, report=report)


def _feet(pose, fr, fl, lr=0.0, ll=0.0, ar=0.0, al=0.0):
    return B.plant(RIG, pose, LEGS, r=(fr, lr, ar), l=(fl, ll, al))


ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#        shift horns rear HOLD  chop1 chop2 IMPACT shock follow settle
W_A = [-40, -50, 70, 110, 80, 30, -10, -20, -30, -38]
W_F = [40, 20, 120, 150, 90, 20, -20, -30, 0, 36]
W_W = [120, 70, 160, 175, 110, 30, -20, -34, 30, 110]
A_T = [-6, -20, 8, 14, 2, -14, -24, -24, -12, -6]
A_H = [-10, -26, 0, 6, -6, -18, -24, -22, -14, -10]
A_Q = [-0.02, -0.08, 0.06, 0.08, 0.02, -0.04, -0.12, -0.06, -0.02, 0.0]
A_X = [0.0, 4.0, 0.0, -2.0, 0.0, 3.0, 6.0, 6.0, 3.0, 0.5]
A_Z = [0.0, -2.0, 1.4, 2.0, 0.8, -0.6, -2.4, -2.0, -0.8, 0.0]
# planted hooves (ankle x, character space before the 1.38 scale): the lunge, the rear back, the chop
A_FR = [2.0, 8.0, 4.0, 2.0, 5.0, 8.0, 11.0, 11.0, 7.0, 2.5]
A_FL = [-2.0, -4.0, -5.0, -6.0, -5.0, -4.0, -3.0, -3.0, -2.5, -2.0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(wield(W_A[f], W_F[f], W_W[f], lean=t), {
        "torso": {"r": t}, "head": {"r": A_H[f]},
        "steam": {"show": f in (1, 3, 6), "s": 1.2},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    pose = _feet(pose, A_FR[f], A_FL[f])
    if f in (4, 5):
        pose.setdefault("axe", {})["sz"] = 1.1
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


AXE_TIP = (HR[0] + 12.5, HR[1] - 1.2, HR[2] + 30.0)
AXE_IN = (HR[0] + 3.0, HR[1] - 1.2, HR[2] + 26.0)


def _attack_clip():
    arc = {"kind": "arc", "joint": "axe", "inner": AXE_IN, "outer": AXE_TIP, "color": B.SAND_LT,
           "white": 0.3, "taper": 0.2, "lines": 3, "outline_lu": 1.4}
    ov = {
        1: [{"kind": "dust", "ground": (6.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 4, "spread": 0.9}],
        4: [dict(arc, **{"from": 3, "t1": 0.95})],
        5: [dict(arc, **{"from": 4, "t0": 0.1, "t1": 0.95})],
        6: [{"kind": "burst", "joint": "axe", "point": AXE_TIP, "r0_lu": 8.0, "r1_lu": 16.0, "n": 6,
             "a0": -70.0, "arc": 160.0},
            {"kind": "dust", "ground": (22.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 7, "spread": 1.2},
            {"kind": "dust", "ground": (-6.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 8, "spread": 1.0,
             "dir": -1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov)


# -- attack B: gore toss, horns first (ANIM_SPEC 2.2 horns: head-down ram, gore toss) ---------------
# 0 = A shift, 1 crouch, 2 coil, 3 HOLD (a low crouch, head down, horns levelled at the target, the
# labrys trailing low behind him), 4-5 the drive forward (smear), 6 IMPACT (head tossed up, horns
# hooking up through the target, steam), 7 shock, 8-9 = A follow and settle
#      crouch coil HOLD drive drive IMP  shock
B_WA = [-80, -100, -110, -100, -80, -60, -60]
B_WF = [-60, -90, -100, -80, -60, -40, -40]
B_WW = [-120, -150, -160, -140, -110, -80, -80]
B_T = [-18, -26, -30, -30, -26, -6, -4]
B_H = [-28, -36, -40, -36, -24, 18, 16]
B_Q = [-0.06, -0.10, -0.12, -0.06, 0.0, 0.06, 0.02]
B_X = [1.0, 0.0, -1.0, 3.0, 6.0, 8.0, 8.0]
B_Z = [-3.0, -4.5, -5.0, -4.0, -3.0, 0.5, 0.0]
B_FR = [4.0, 5.0, 5.0, 8.0, 11.0, 13.0, 13.0]
B_FL = [-4.0, -6.0, -7.0, -6.0, -5.0, -4.0, -4.0]


def _b_pose(i):
    if i == 0 or i >= 8:
        return _attack_pose(i)
    k = i - 1
    t = B_T[k]
    pose = merge(wield(B_WA[k], B_WF[k], B_WW[k], lean=t), {
        "torso": {"r": t}, "head": {"r": B_H[k]}, "steam": {"show": i in (3, 6), "s": 1.2},
    }, M.body_about((0, 0, 22), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    pose = _feet(pose, B_FR[k], B_FL[k])
    pose = merge(pose, F.expr("grit") if i in (1, 2, 3) else F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


HORN_TIP = (12.0, -15.6, 70.0)


def _attack_b():
    ov = {
        4: [{"kind": "streak", "joint": "head", "point": HORN_TIP, "color": B.SAND_LT, "width_lu": 7.0,
             "white": 0.3, "from": 3, "t1": 0.95}],
        5: [{"kind": "streak", "joint": "head", "point": HORN_TIP, "color": B.SAND_LT, "width_lu": 7.0,
             "white": 0.3, "from": 4, "t0": 0.2, "t1": 0.95}],
        6: [{"kind": "burst", "joint": "head", "point": HORN_TIP, "r0_lu": 8.0, "r1_lu": 16.0, "n": 6,
             "a0": -10.0, "arc": 140.0},
            {"kind": "dust", "ground": (20.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 17, "spread": 1.2}],
    }
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=ov, reuse=reuse)


# -- attack C: flat labrys sweep at waist height --------------------------------------------------
# 0 = A shift, 1 turn, 2 draw, 3 HOLD (standing tall, turned away, the labrys drawn back low behind the hip,
# head down and back), 4-5 the sweep (smear), 6 IMPACT (flat across the front at waist height), 7 shock, 8-9 = A's
#      turn draw HOLD sweep sweep IMP  shock
C_WA = [-120, -150, -158, -110, -55, -20, -16]
C_WF = [-140, -175, -185, -100, -30, 0, 4]
C_WW = [170, 200, 214, 140, 60, 0, -6]
C_T = [4, 10, 14, 6, -6, -14, -14]
C_RZ = [-14, -26, -34, -8, 14, 26, 26]
C_H = [-12, -10, -8, -10, -14, -16, -16]
C_X = [-1.0, -2.0, -3.0, 0.0, 4.0, 7.0, 7.0]
C_Z = [0.4, 0.8, 1.2, 0.0, -1.2, -2.0, -1.8]
C_Q = [0.02, 0.04, 0.06, 0.02, -0.04, -0.10, -0.06]
C_FR = [2.0, 1.0, 0.0, 4.0, 8.0, 11.0, 11.0]
C_FL = [-4.0, -5.0, -6.0, -5.0, -4.0, -3.0, -3.0]


def _c_pose(i):
    if i == 0 or i >= 8:
        return _attack_pose(i)
    k = i - 1
    t = C_T[k]
    pose = merge(wield(C_WA[k], C_WF[k], C_WW[k], lean=t), {
        "torso": {"r": t, "rz": C_RZ[k]}, "head": {"r": C_H[k]}, "steam": {"show": i == 3, "s": 1.2},
    }, M.body_about((0, 0, 22), x=C_X[k], z=C_Z[k], q=C_Q[k]))
    pose = _feet(pose, C_FR[k], C_FL[k])
    pose = merge(pose, F.expr("grit") if i in (1, 2, 3) else F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _attack_c():
    arc = {"kind": "arc", "joint": "axe", "inner": AXE_IN, "outer": AXE_TIP, "color": B.SAND_LT,
           "white": 0.3, "taper": 0.2, "lines": 3, "outline_lu": 1.4}
    ov = {
        4: [dict(arc, **{"from": 3, "t1": 0.95})],
        5: [dict(arc, **{"from": 4, "t0": 0.1, "t1": 0.95})],
        6: [{"kind": "burst", "joint": "axe", "point": AXE_TIP, "r0_lu": 8.0, "r1_lu": 16.0, "n": 6,
             "a0": -50.0, "arc": 120.0},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 18, "spread": 1.1}],
    }
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_c", [_c_pose(i) for i in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a):
        return merge(wield(-40 + 10 * a, 40 + 16 * a, 120 + 10 * a, lean=6 + 10 * a),
                     {"head": {"r": 10 * a, "rx": 10 * [0, 1, -0.8, 0.4, 0][k]},
                      "brow": {"z": 1.2 * max(a, 0)}})
    base = {k2: v for k2, v in STANCE.items() if not k2.startswith(("arm_", "fore_", "hand_"))}
    return B.hit_armoured(k, base, recoil, face_hurt=F.expr("squeeze", "grit"), helm=None)


DIE_KEEP = [0, 1, 2, 3, 4, 5, 7, 9]
LOOSE = [None, (6, 10, 30), (12, 30, 120), (18, 40, 230), (24, 30, 330), (28, 10, 420), (30, -6, 470),
         (30, -6, 470), (30, -6, 470), (30, -6, 470)]


def _die(k):
    flail = [0.4, 0.3, 0.9, 1.0, 0.3, 0.6, 0.1, 0.0, 0.0, 0.0][k]
    stiff = min(1.0, k / 3.0)
    pose = merge(STANCE, B.die_d2(k, center_z=28.0, lie_z=11.0, height=68.0), {
        "torso": {"r": -4 * stiff}, "head": {"r": 10 * flail},
        "arm_r": {"r": 60 * flail + 40 * stiff}, "fore_r": {"r": 20 * flail},
        "arm_l": {"r": 90 * flail + 40 * stiff}, "fore_l": {"r": 30 * flail},
        "thigh_r": {"r": 10 * flail}, "thigh_l": {"r": -10 * flail},
    })
    if LOOSE[k] is not None:
        x, z, r = LOOSE[k]
        pose["axe"] = dict(pose.get("axe", {}), hide=True)
        pose["axe_loose"] = {"show": True, "x": x, "z": z, "r": -r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "heavy"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(DIE_KEEP[i]) for i in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
