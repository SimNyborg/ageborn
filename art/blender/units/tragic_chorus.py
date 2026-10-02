"""Tragic Chorus: Bronze Age Rare Support, Dread aura (CONTENT_PLAN 5.2 #9, X0 M4). Enemies within 130 move
20% slower, ~70 lu.

A viewer expects a figure from the tragic stage to throw up its arms and wail, its grief rolling
out in waves, and to walk in a slow, swaying procession.

Look: a chorus singer behind a big white tragic mask (sad up-swept brows, a gaping down-turned
mouth) under a tall dark onkos wig, a long dusk-plum robe to the ankles with a team himation
draped over one shoulder and a team hem band, bare feet in soft sandals.

Animation (cartoon kit v2):
  idle    wrings its hands, the head droops and lifts, blink
  walk    slow procession: small gliding steps, the robe swaying, hands clasped at the chest
  attack  THE LAMENT: draws in, then flings both arms up to the sky with the head thrown back
          (held extreme), then bends forward and wails, arms reaching out (sound rings roll out
          of the mask's mouth on the impact frame)
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
NAME = "Tragic Chorus"
HEIGHT_LU = 70
CANVAS = (290, 256)
FEET = (134, 220)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 33)}
NO_RETIME = True

MASK = "#F1EBDD"
MASK_DK = "#CFC6B2"
WIG = "#4A382C"


def build(rig):
    B.skeleton(rig)
    B.sandal_legs(rig, greaves=False)
    # long plum robe to the ankles, a team himation over the near shoulder, a team hem band
    g = Geo().blob((0.3, 0, 28.0), (10.4, 9.6, 11.6), p=2.4, taper=(1.1, 0.92))
    rig.part("torso", g, B.PLUM)
    rig.secondary("hem", "hips", (0.5, 0, 16.5), (0.5, 0, 4.0), max_deg=14, gain=1.2)
    g = Geo().blob((0.6, 0, 9.6), (12.4, 11.4, 9.4), p=2.4, taper=(1.3, 0.94))
    rig.part("hem", g, B.PLUM)
    g = Geo().blob((0.6, 0, 3.4), (13.4, 12.3, 2.8), p=3.0)
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
    rig.track("_foot", "shin_r", (3.1, -6.0, 0.5))


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


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"head": {"r": 2 * lag}, "drape": {"r": 3 * lag}}
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=22.0, knee=30.0, lift_lu=3.5, bob_pct=0.03,
                     lean=3.0, arm=0.0, fore=0.0, arms=(), sway=6.0, extra=extra)


#        read  draw  rise HOLD  fall  lead  WAIL  over recov settle settle
R_A = [-40, -60, 60, 130, 90, 40, 10, 4, -20, -36, -40]
R_F = [60, 40, 110, 150, 100, 30, 0, -6, 30, 56, 60]
L_A = [-36, -56, 70, 140, 100, 50, 18, 12, -16, -32, -36]
L_F = [70, 50, 120, 160, 110, 40, 10, 4, 40, 66, 70]
A_T = [2, 8, -4, -16, -6, 4, 18, 20, 10, 4, 2]
A_H = [-4, 4, -10, -22, -8, 4, 12, 14, 4, -2, -4]
A_Q = [0.0, -0.06, 0.06, 0.1, 0.04, -0.02, -0.1, -0.08, -0.02, 0.0, 0.0]
A_X = [0.0, -0.5, -1.5, -2.0, 0.0, 1.5, 3.0, 3.5, 1.5, 0.5, 0.0]
A_Z = [0.0, -1.4, 1.2, 2.0, 0.6, -0.4, -1.2, -1.0, -0.4, 0.0, 0.0]


def _attack_pose(f):
    t = A_T[f]
    # A_T is the WORLD lean (+ forward); the rig torso r is + back, so it is negated
    pose = merge(arms(R_A[f] + t, R_F[f] + t, L_A[f] + t, L_F[f] + t), {
        "torso": {"r": -t}, "head": {"r": A_H[f]},
    }, M.body_about((0, 0, 24), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (2, 3):
        pose = merge(pose, F.expr("squeeze"))
    elif f in (5, 6, 7):
        pose = merge(pose, F.expr("o"))
    return pose


def _attack_clip():
    mouth = (16.0, -2.0, 43.0)
    ov = {
        6: [{"kind": "rings", "joint": "head", "point": mouth, "radii_lu": (6.0, 11.0, 16.0, 21.0),
             "a0": -45.0, "a1": 45.0, "color": "#EDE6F2"}],
        7: [{"kind": "rings", "joint": "head", "point": mouth, "radii_lu": (14.0, 20.0, 26.0),
             "a0": -40.0, "a1": 40.0, "color": "#EDE6F2"}],
        3: [{"kind": "rings", "joint": "head", "point": (6.0, 0.0, 68.0), "radii_lu": (5.0, 9.0),
             "a0": 30.0, "a1": 150.0, "color": "#EDE6F2"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov)


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
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl)
