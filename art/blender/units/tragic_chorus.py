"""Tragic Chorus: Bronze Age Rare Support, Dread aura (CONTENT_PLAN 5.2 #9, X0 M4). Enemies within 130 move
20% slower, ~70 lu.

A viewer expects a figure from the tragic stage to throw up its arms and wail, its grief rolling
out in waves, and to walk in a slow, swaying procession.

Look: a chorus singer behind a big white tragic mask (sad up-swept brows, a gaping down-turned
mouth) under a tall dark onkos wig, a long dusk-plum robe to the ankles with a team himation
draped over one shoulder and a team hem band, bare feet in soft sandals.

Animation (cartoon kit v2):
  idle    wrings its hands, the head droops and lifts, blink
  walk    walk v3 slow procession at ground speed (ANIM_SPEC G2, card 60 x 1.25 = 75 lu/s): a brisk
          sway, the robe (shortened to the knee) kicking with the knees, the back of one hand to the
          mask's brow in grief, the other arm hanging and swaying
  attack_b  BEAT THE BREAST: hunches forward, head bowed, both fists pressed to the chest (held
          extreme), then flings the arms wide and wails straight ahead
  attack  THE LAMENT: draws in, then flings both arms up to the sky with the head thrown back
          (held extreme), then bends forward and wails, arms reaching out (sound rings roll out
          of the mask's mouth on the impact frame)
          A and B hold the gathered breath with a shudder while the sim wind-up lasts (holdLoop)
  hit     light: recoils with a hand to the mask
  die     a theatrical swoon: the back of a hand to the brow, a wobble, then a stiff topple
          backwards (D2), X eyes on the mask
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "tragic_chorus"
GAIT_NAME = "biped"
NAME = "Tragic Chorus"
HEIGHT_LU = 70
CANVAS = (290, 256)
FEET = (134, 220)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 33)}
NO_RETIME = True

MASK = "#F1EBDD"
MASK_DK = "#CFC6B2"
WIG = "#463A33"


def build(rig):
    global RIG
    RIG = rig
    B.skeleton_v3(rig)           # walk v3: longer legs, planted feet (ANIM_SPEC 2.0 rule 5)
    B.sandal_legs_v3(rig, greaves=False, skin=B.LINEN, wraps=B.PLUM_DK)
    # plum robe, shortened to the knee for walk v3 (the hem 11 lu above the soles, ANIM_SPEC G2), a team
    # himation over the near shoulder, a team hem band; the skirt kicks with the knees
    g = Geo().blob((0.3, 0, 28.0), (10.4, 9.6, 11.6), p=2.4, taper=(1.1, 0.92))
    rig.part("torso", g, B.PLUM)
    rig.secondary("hem", "hips", (0.5, 0, 16.5), (0.5, 0, 8.0), max_deg=14, gain=1.2)
    rig.rest_offset["hem"] = (0, 0, B.V3_LIFT)
    g = Geo().blob((0.6, 0, 14.0), (12.4, 11.4, 5.4), p=2.4, taper=(1.3, 0.94))
    rig.part("hem", g, B.PLUM)
    g = Geo().blob((0.6, 0, 10.0), (13.4, 12.3, 2.2), p=3.0)
    rig.part("hem", g, team=True, outline=0.6)
    g = Geo().slab([(-10.0, 40.0), (6.0, 40.0), (12.0, 22.0), (10.0, 10.0), (2.0, 8.0), (-4.0, 22.0)], -9.6, 2.4)
    rig.part("torso", g, team=True, outline=0.8)
    rig.secondary("drape", "torso", (-8.0, 2.0, 38.0), (-14.0, 4.0, 14.0), max_deg=16, gain=1.2)
    g = Geo().slab([(-6.0, 40.0), (-11.0, 39.0), (-15.0, 14.0), (-10.0, 12.0), (-7.0, 24.0)], 6.0, 2.2)
    rig.part("drape", g, team=True, outline=0.8)
    g = Geo().blob((0.4, 0, 21.0), (11.0, 10.1, 1.6), p=3.2)
    rig.part("torso", g, B.SAND, outline=0.5)

    # the mask is the face: white, sad brows swept up, a gaping down-turned mouth
    B.face_kit(rig, cx=13.6, cz=50.5, skin=MASK, brow=WIG, eye_r=(3.9, 3.5, 4.4), brow_tilt=-3.2,
               mouth_z=42.6, mouth_w=6.0, r=(11.6, 11.0, 12.0))
    g = Geo().blob((12.4, -0.4, 42.4), (2.6, 4.4, 2.8), p=2.2, rot=(0, 0, 0))
    g.blob((11.8, -0.4, 44.2), (2.2, 5.0, 1.0), p=2.2)
    rig.part("head", g, "#3C2626", outline=0.4)                    # the gaping mouth hole
    g = Geo().lathe([(0, 0), (12.4, 0.2), (12.8, 1.2), (12.4, 2.0), (0, 2.2)], (2.0, 0, 37.0), (2.4, 0, 39.2), segs=24)
    rig.part("head", g, MASK_DK, outline=0.5)                     # chin edge of the mask
    # the tall onkos wig: a tower of curls with long side locks
    g = Geo()
    for x, y, z, r in ((-1.0, 0.0, 58.5, 9.6), (-4.0, -6.0, 57.0, 6.0), (-4.0, 6.0, 57.0, 6.0),
                       (-2.0, 0.0, 65.0, 7.4), (-3.5, -4.5, 63.5, 5.0), (-3.5, 4.5, 63.5, 5.0),
                       (-2.0, 0.0, 71.0, 5.2), (2.5, -5.0, 60.0, 4.4), (2.5, 5.0, 60.0, 4.4), (-8.0, 0.0, 54.0, 5.6)):
        g.blob((x, y, z), (r, r, r * 0.92), p=2.1)
    for y in (-10.4, 10.4):
        for k in range(3):
            g.sphere((-3.0 + 0.6 * k, y * (1 + 0.02 * k), 49.0 - 5.0 * k), 3.2 - 0.3 * k, cuts=3)
    rig.part("head", g, WIG, finish="hair")
    g = Geo().blob((0.4, 0, 54.2), (11.8, 11.6, 1.5), p=2.8, rot=(0, -8, 0))
    rig.part("head", g, B.SAND_LT, outline=0.5)                  # a sandstone fillet

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.LINEN, hand=B.SKIN, r0=4.2, r1=3.8)
    rig.track("muzzle", "head", (16.0, -2.0, 43.0))


# -- poses ---------------------------------------------------------------------------------
def arms(ra, rf, la, lf):
    return merge(B.arm("r", ra, rf), B.arm("l", la, lf))


CLASP = arms(-40, 60, -36, 70)
STANCE = merge(CLASP, {"torso": {"r": 2}, "head": {"r": -4}})


def _idle(f):
    w = [0.0, 1.0, 0.0, -1.0, 0.0, 0.5][f]
    droop = [0.0, 0.3, 0.8, 1.0, 0.5, 0.1][f]

    def extra(ctx):
        return merge(arms(-40 + 4 * w, 60 + 6 * w, -36 - 4 * w, 70 - 6 * w),
                     {"head": {"r": -8 * droop}, "torso": {"r": 3 * droop}})
    return M.idle_v2(f, {"torso": {"r": 2}, "head": {"r": -4}}, frames=6, extra=extra,
                     face_blink=F.expr("blink"), blink=3)


# -- walk v3: G2 slow procession at ground speed (card 60 x 1.25 = 75 lu/s), 8 x 80 ms ---------------
RIG = None
SPEED = 75.0
LEGS = B.walk_legs_v3()
GAIT = B.jog_gait(SPEED, LEGS, cycle_ms=640, stance=0.46, lift=5.5, kick=1.5, toe_off=18.0, early_lift=1.2)
SWAY_BOB = [-2.6, -3.2, 0.0, 1.0]


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        c = math.cos(ctx["lag_p"])
        # the back of the near hand to the mask's brow; the far arm hangs and sways
        return merge(arms(60, 150 + 4 * lag, -96 + 22 * c, -80 + 26 * c),
                     {"head": {"r": 6 + 2 * lag}, "drape": {"r": 3 * lag}, "hem": {"r": 5 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": 2}}, GAIT, legs=LEGS, bob=SWAY_BOB, sq=M.BRISK_SQ, lean=3.0,
                     twist=4.0, nod=2.0, sway=6.0, extra=extra, report=report)


def _feet(pose, fr, fl, lr=0.0, ll=0.0, ar=0.0, al=0.0):
    return B.plant(RIG, pose, LEGS, r=(fr, lr, ar), l=(fl, ll, al))


# 12 steps: read, draw, rise, HOLD, shudder (holdLoop partner), fall, lead | WAIL, over, recover,
# settle, settle. Pre-impact 290 of 680 ms (impactAt 0.4265); the hold is 35% of the pre-impact time.
ATK_MS = [30, 40, 40, 102, 30, 30, 18, 120, 60, 50, 70, 90]
ATK_IMPACT = 7
#        read  draw  rise HOLD shud  fall  lead  WAIL  over recov settle settle
R_A = [-40, -60, 60, 130, 126, 90, 40, 10, 4, -20, -36, -40]
R_F = [60, 40, 110, 150, 146, 100, 30, 0, -6, 30, 56, 60]
L_A = [-36, -56, 70, 140, 136, 100, 50, 18, 12, -16, -32, -36]
L_F = [70, 50, 120, 160, 156, 110, 40, 10, 4, 40, 66, 70]
A_T = [2, 8, -4, -16, -14, -6, 4, 18, 20, 10, 4, 2]
A_H = [-4, 4, -10, -22, -19, -8, 4, 12, 14, 4, -2, -4]
A_Q = [0.0, -0.06, 0.06, 0.1, 0.07, 0.04, -0.02, -0.1, -0.08, -0.02, 0.0, 0.0]
A_X = [0.0, -0.5, -1.5, -2.0, -1.8, 0.0, 1.5, 3.0, 3.5, 1.5, 0.5, 0.0]
A_Z = [0.0, -1.4, 1.2, 2.0, 1.4, 0.6, -0.4, -1.2, -1.0, -0.4, 0.0, 0.0]
A_FR = [2.0, 2.0, 1.0, 0.0, 0.0, 2.0, 4.0, 7.0, 7.5, 5.0, 3.0, 2.0]
A_FL = [-2.0, -3.0, -3.0, -3.0, -3.0, -3.0, -3.0, -2.0, -2.0, -2.0, -2.0, -2.0]


def _attack_pose(f):
    t = A_T[f]
    # A_T is the WORLD lean (+ forward); the rig torso r is + back, so it is negated
    pose = merge(arms(R_A[f] + t, R_F[f] + t, L_A[f] + t, L_F[f] + t), {
        "torso": {"r": -t}, "head": {"r": A_H[f]},
    }, M.body_about((0, 0, 24), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    pose = _feet(pose, A_FR[f], A_FL[f])
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze"))
    elif f in (6, 7, 8):
        pose = merge(pose, F.expr("o"))
    return pose


MOUTH = (16.0, -2.0, 43.0)


def _attack_clip():
    ov = {
        7: [{"kind": "rings", "joint": "head", "point": MOUTH, "radii_lu": (6.0, 11.0, 16.0, 21.0),
             "a0": -45.0, "a1": 45.0, "color": "#EDE6F2"}],
        8: [{"kind": "rings", "joint": "head", "point": MOUTH, "radii_lu": (14.0, 20.0, 26.0),
             "a0": -40.0, "a1": 40.0, "color": "#EDE6F2"}],
        3: [{"kind": "rings", "joint": "head", "point": (6.0, 0.0, 68.0), "radii_lu": (5.0, 9.0),
             "a0": 30.0, "a1": 150.0, "color": "#EDE6F2"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(12)], ATK_MS, impact=ATK_IMPACT, overlays=ov,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: beat the breast, then fling the arms wide and wail ahead -------------------------------
# 0-1 = A read and draw, 2 hunch, 3 HOLD (bent forward, head bowed, both fists pressed to the chest),
# 4 shudder, 5 unfold, 6 lead, 7 WAIL (upright, arms flung wide and back, the mask thrown forward),
# 8-11 = A's
#      hunch HOLD shud unfold lead WAIL
B_RA = [-30, -20, -22, 20, 150, 175]          # near arm, forearm (world deg; + the torso lean)
B_RF = [80, 100, 98, 60, 170, 190]
B_LA = [-26, -16, -18, 30, 160, 182]
B_LF = [90, 110, 108, 70, 175, 195]
B_T = [14, 26, 25, 10, -4, -8]                # world lean, + forward
B_H = [-8, -16, -15, -4, 6, 10]
B_Q = [-0.06, -0.12, -0.10, 0.0, 0.06, -0.04]
B_X = [0.5, 1.0, 1.0, 1.5, 2.0, 2.5]
B_Z = [-2.0, -4.5, -4.8, -1.0, 0.8, 0.4]
B_FR = [3.0, 4.0, 4.0, 5.0, 6.0, 7.0]
B_FL = [-3.0, -4.0, -4.0, -3.0, -3.0, -2.0]


def _b_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    k = i - 2
    t = B_T[k]
    pose = merge(arms(B_RA[k] + t, B_RF[k] + t, B_LA[k] + t, B_LF[k] + t), {
        "torso": {"r": -t}, "head": {"r": B_H[k]},
    }, M.body_about((0, 0, 24), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    pose = _feet(pose, B_FR[k], B_FL[k])
    pose = merge(pose, F.expr("squeeze") if i in (2, 3, 4) else F.expr("o"))
    return pose


def _attack_b():
    ov = {
        3: [{"kind": "burst", "joint": "torso", "point": (12.0, 0.0, 30.0), "r0_lu": 3.0, "r1_lu": 7.0,
             "n": 3, "a0": -30.0, "arc": 60.0}],
        7: [{"kind": "rings", "joint": "head", "point": MOUTH, "radii_lu": (6.0, 11.0, 16.0, 21.0),
             "a0": -35.0, "a1": 35.0, "color": "#EDE6F2"}],
        8: [{"kind": "rings", "joint": "head", "point": MOUTH, "radii_lu": (14.0, 20.0, 26.0),
             "a0": -30.0, "a1": 30.0, "color": "#EDE6F2"}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10),
             11: ("attack", 11)}
    return M.clip("attack_b", [_b_pose(i) for i in range(12)], ATK_MS, impact=ATK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    def recoil(a):
        return merge(arms(-40 + 80 * max(a, 0), 60 + 80 * max(a, 0), -36, 70),
                     {"head": {"r": 14 * a}, "torso": {"r": 10 * a},
                      "thigh_r": {"r": 16 * max(a, 0)}, "shin_r": {"r": -20 * max(a, 0)},
                      "brow": {"z": 1.4 * max(a, 0)}})
    base = {k2: v for k2, v in STANCE.items() if k2 not in ("arm_r", "fore_r", "arm_l", "fore_l")}
    return M.hit_light(k, base, recoil, face_hurt=F.expr("squeeze", "o"))


def _die(k):
    swoon = [0.6, 1.0, 1.0, 1.0, 0.8, 0.6, 0.6, 0.6, 0.6, 0.6][k]
    stiff = min(1.0, k / 3.0)
    pose = merge(B.die_d2(k, center_z=30.0, lie_z=10.0, height=HEIGHT_LU),
                 arms(70 + 40 * swoon, 160 + 10 * swoon, -60 + 120 * stiff, -20 + 100 * stiff), {
                     "head": {"r": -10 * swoon}, "torso": {"r": -4 * stiff},
                 })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 4:
        pose = merge(pose, F.expr("spiral", "o"))
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
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
