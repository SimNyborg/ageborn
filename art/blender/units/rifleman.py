"""Rifleman: Modern Age ranged (DESIGN A5.5). Bullet (proj.bullet), 260 lu, ~68 lu.

Look (A11, Modern palette): a round steel helmet under a team helmet cover with khaki netting and a chin strap;
a team tunic with team sleeves (cream rank chevrons on the near sleeve) and khaki webbing (a belt
with three ammo pouches and a canteen); olive trousers, khaki puttees; a team pack with a khaki
bedroll on top (a hump that sets his silhouette apart from the Trench Raider). He carries a long
bolt-action rifle with a wooden stock, a leather sling and a short bayonet.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    rifle at port arms, he glances down at the bolt and back up (the helmet slides), blink
  walk    march: a high knee and a stiff straight leg, the rifle bobbing a frame late
  attack  LEAN-OUT AIM AND BOLT CYCLE: he snaps the rifle to his shoulder and leans into it, cheek
          on the stock, one eye squeezed (the held extreme), fires (one flash, impact lines, a
          puff), the kick rocks him back, then the near hand works the bolt (up, back: a brass
          casing flips out, home, down) and he brings the rifle back to port arms. The bullet
          leaves the per-frame `muzzle` anchor on the fire frame.
  hit     light: the head snaps back, the helmet lifts, eyes squeezed, overshoot forward
  die     D2 topple: the rifle flies out of his hands, he teeters, stiffens and falls forward like a
          plank, arms out; the helmet rolls off

Animation standard (ANIM_SPEC 2026-10-02):
  walk      walk v3 bounce jog at ground speed (G1, 65 x 1.25 = 81.25 lu/s): the rifle at port arms
            across his chest bobbing a frame late, the bedroll pack and helmet lagging, planted feet
  attack    A as above (lean-out aim and bolt cycle), feet planted on the longer legs
  attack_b  KNEELING SHOT: he drops to one knee, the rifle to his shoulder, aims (the held extreme),
            fires, rides the kick, works the bolt on one knee (a casing flies) and rises
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as K
from ageborn_art import kit_modern as KM
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "rifleman"
GAIT_NAME = "biped"
NAME = "Rifleman"
HEIGHT_LU = 68
CANVAS = (320, 262)
FEET = (116, 214)
ANCHORS = {"head": (2, 67), "hitCenter": (0, 32), "muzzle": (60, 36)}
NO_RETIME = True

G0 = (4.0, -15.0, 27.0)     # rifle grip at rest (character space)
FORE = 13.0                 # far hand: this far along the rifle from the grip
LENGTH = 48.0
HELM_C = (1.0, 0.0, 57.4)
BRASS = "#C8B27A"
MUZ = []


def _rifle(rig, joint, grip, length, bayonet=0.0, k=1.0):
    """rigs_modern.rifle without its fixed bolt (the bolt is its own joint here)."""
    gx, gy, gz = grip
    g = Geo()
    g.blob((gx - 8.0 * k, gy, gz - 2.2 * k), (8.0 * k, 2.2 * k, 3.6 * k), p=2.8, rot=(0, 16, 0),
           taper=(1.0, 0.75))
    g.capsule((gx - 1.0, gy, gz), (gx + length * 0.70, gy, gz + 0.6), 2.0 * k, 1.6 * k)
    rig.part(joint, g, R.WOOD)
    g = Geo()   # grain strokes on the stock
    g.capsule((gx - 12.0, gy - 2.1, gz - 1.6), (gx - 5.0, gy - 2.1, gz - 0.6), 0.35)
    g.capsule((gx + 8.0, gy - 1.9, gz + 0.1), (gx + 16.0, gy - 1.9, gz + 0.3), 0.35)
    rig.part(joint, g, "#6A5240", outline=0, highlight=False)
    g = Geo().capsule((gx + 2.0, gy, gz + 1.8 * k), (gx + length, gy, gz + 1.8 * k), 1.3 * k, 1.15 * k)
    g.blob((gx + 3.5, gy, gz + 2.6 * k), (5.0 * k, 1.8 * k, 1.8 * k), p=3.0)
    g.blob((gx + length - 1.2, gy, gz + 3.4 * k), (0.9, 0.8, 1.2), p=2.4)
    for x in (gx + 12.0, gx + length * 0.62):        # barrel bands
        g.lathe([(2.3, -0.7), (2.4, 0), (2.3, 0.7)], (x, gy, gz + 0.8), (x + 1, gy, gz + 0.8), segs=12)
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.9)
    g = Geo()
    pts = [(gx - 10.0 * k, gz - 2.5 * k), (gx + 4.0, gz - 6.0 * k), (gx + 18.0, gz - 5.2 * k),
           (gx + length * 0.55, gz - 1.0)]
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        g.capsule((ax, gy - 1.6, az), (bx, gy - 1.6, bz), 0.8 * k, segs=8, rings=2)
    rig.part(joint, g, R.LEATHER, outline=0.5)
    if bayonet > 0:
        g = Geo().lathe([(0.9, 0), (0.8, bayonet * 0.4), (0.5, bayonet * 0.85), (0, bayonet)],
                        (gx + length - 1.0, gy + 0.6, gz + 0.2), (gx + length + bayonet, gy + 0.6, gz + 0.2),
                        segs=8, squash=(1.0, 0.6))
        rig.part(joint, g, R.STEEL, finish="metal", outline=0.7)
    return (gx + length + 1.0, gy, gz + 1.8 * k)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KM.skeleton_v3(rig)
    KM.legs_v3(rig)
    # team pack with a khaki bedroll and a leather strap (behind the torso; drawn before the tunic)
    g = Geo().blob((-12.0, 0, 29.0), (5.8, 9.6, 9.6), p=3.2)
    rig.part("torso", g, team=True)
    g = Geo().blob((-16.0, -3.0, 25.4), (2.8, 4.4, 4.2), p=3.2)   # side pocket
    rig.part("torso", g, R.KHAKI, outline=0.6)
    g = Geo().capsule((-12.5, -10.2, 41.0), (-12.5, 10.2, 41.0), 4.4)
    rig.part("torso", g, R.KHAKI)
    g = Geo()
    for yy in (-5.0, 4.0):
        g.lathe([(4.6, 0), (4.7, 1.4), (4.6, 2.2)], (-12.5, yy, 41.0), (-12.5, yy + 2.6, 41.0), segs=14)
    rig.part("torso", g, R.LEATHER, outline=0.5)
    R.tunic(rig, hem_z=13.0)
    KM.pouches(rig, "torso", [(9.4, -6.6, 19.4), (5.2, -10.2, 19.2), (0.2, -11.4, 19.2)], size=(2.3, 1.7, 2.8))
    KM.canteen(rig, "torso", (-8.0, -9.6, 16.4), r=3.1)
    g = Geo().capsule((2.0, -10.6, 37.0), (-8.0, -9.4, 22.0), 1.5)   # pack strap
    rig.part("torso", g, R.KHAKI, outline=0.6)

    KI.head_face(rig, brow=R.HAIR, brow_angry=False, mouth_dz=-9.0, mouth_w=5.4)
    g = Geo().blob((-6.0, 0, 46.0), (5.6, 9.8, 6.0), p=2.2)
    rig.part("head", g, R.HAIR, finish="hair")
    g = Geo().blob((-2.0, -11.2, 49.0), (2.6, 1.6, 3.4), p=2.2)   # ear
    rig.part("head", g, R.SKIN)
    rig.joint("hat", "head", HELM_C)
    KM.round_helmet(rig, "hat", c=HELM_C, team_cover=True)
    KI.loose(rig, "hat_loose", HELM_C, lambda j: KM.round_helmet(rig, j, c=HELM_C, strap=False, team_cover=True))

    for s in ("r", "l"):
        R.arm_parts(rig, s, fist=4.3)
        y = R.ARM_Y[s]
        g = Geo().blob((2.4, y - 1.4 * (1 if s == "r" else -1), R.HAND_Z + 0.6), (1.6, 1.5, 2.2), p=2.2)
        rig.part(f"hand_{s}", g, R.SKIN)                     # thumb
    R.shoulders(rig)
    sleeve = Geo().capsule((0, R.ARM_Y["r"], R.SHOULDER_Z), (0, R.ARM_Y["r"], R.ELBOW_Z), 4.4, 4.1)
    sface = F.Face(rig, "arm_r", [sleeve])
    g = KM.chevron(sface, Geo(), (0.6, 32.6), s=0.95, n=2, w=1.7, gap=2.9)
    rig.part("arm_r", g, KM.CREAM, highlight=False, outline=0)

    rig.joint("gun", "torso", G0)
    muzzle = _rifle(rig, "gun", G0, length=LENGTH, bayonet=7.0)
    # the bolt handle on its own joint (it lifts and slides back in the reload)
    rig.joint("bolt", "gun", (G0[0] + 2.5, G0[1] - 1.6, G0[2] + 3.4))
    g = Geo().capsule((G0[0] + 2.5, G0[1] - 1.6, G0[2] + 3.4), (G0[0] + 2.0, G0[1] - 4.8, G0[2] + 2.4), 0.9)
    g.sphere((G0[0] + 2.0, G0[1] - 5.0, G0[2] + 2.3), 1.5, cuts=3)
    rig.part("bolt", g, R.GUNMETAL, finish="metal", outline=0.5)
    g = Geo().blob((G0[0] + FORE, G0[1] + 2.4, G0[2] - 0.4), (3.6, 3.0, 3.4), p=2.4)
    rig.part("gun", g, R.SKIN)
    rig.track("muzzle", "gun", muzzle)
    KI.loose(rig, "gun_loose", G0, lambda j: _rifle(rig, j, G0, length=LENGTH, bayonet=7.0))
    R.muzzle_flash(rig, "gun", muzzle, size=1.8)
    rig.joint("smoke", "gun", muzzle, hidden=True)
    g = Geo()
    for dx, dz, r in ((6.0, 1.0, 3.8), (10.5, 3.0, 3.1), (3.0, 4.4, 2.8), (8.0, 6.2, 2.4)):
        g.sphere((muzzle[0] + dx, muzzle[1] - 2, muzzle[2] + dz), r, cuts=4)
    rig.part("smoke", g, R.SMOKE, finish="dust", outline=0.8)
    # the ejected casing (root level so it arcs free of the rifle)
    rig.joint("casing", "root", (G0[0] + 2, G0[1] - 3, G0[2] + 9), hidden=True)
    g = Geo().capsule((G0[0] + 0.5, G0[1] - 3.5, G0[2] + 9.0), (G0[0] + 4.0, G0[1] - 3.5, G0[2] + 10.6), 1.2)
    rig.part("casing", g, BRASS, finish="metal", outline=0.5)
    MUZ.append(muzzle)


# -- poses ------------------------------------------------------------------------------------------
PORT = (5.0, 26.0, 36.0)   # grip x, z, rifle angle (torso space): carried up across the chest


def hold(gx, gz, deg):
    return R.hold2("gun", G0, FORE, gx, gz, deg)


STANCE = merge(hold(*PORT), {"torso": {"r": -2.0}})


def _idle(f):
    look = [0.0, 0.4, 1.0, 1.0, 0.4, 0.0][f]

    def extra(ctx):
        return merge(hold(PORT[0], PORT[1] + 0.5 * ctx["lag"], PORT[2] + 2.0 * ctx["lag"] - 3.0 * look),
                     {"head": {"r": -9.0 * look}, "hat": {"x": 0.6 * look, "z": -0.6 * look, "r": -3 * look},
                      "pupils": {"z": -0.8 * look}, "bolt": {"rx": 30.0 * max(0.0, look - 0.5)}})
    base = {"torso": {"r": -2.0}}
    pose = M.idle_v2(f, base, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)
    return KM.ground_feet(RIG, pose, LEGS)


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 77 ms --------------
SPEED = 81.25
LEGS = KM.legs_ik()
GAIT = KM.jog_gait(LEGS, SPEED, cycle_ms=616)
WALK_PORT = (5.0, 27.0, 48.0)     # carried higher and steeper across the chest than the idle guard


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(hold(WALK_PORT[0], WALK_PORT[1] + 0.9 * lag, WALK_PORT[2] - 4.0 * lag),
                     {"hat": {"r": -1.5 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2.0}}, GAIT, legs=LEGS, lean=-9.0, twist=7.0, nod=3.0,
                     extra=extra, report=report)


# 10 unique frames in 748 ms; fire on frame 3 at 291 ms (impactAt 0.389, as shipped)
ATTACK_MS = [40, 60, 191, 60, 70, 60, 70, 60, 67, 70]
ATTACK_IMPACT = 3
#     raise shoulder HOLD FIRE kick boltUp boltBack boltHome lower settle
LEAN = [-2, -10, -13, -13, -3, -6, -6, -6, -3, -2]
GX = [5.0, 6.0, 6.5, 6.5, 3.5, 5.0, 5.0, 5.0, 5.0, 5.0]
GZ = [30.0, 33.5, 33.5, 33.5, 35.0, 32.5, 32.5, 32.5, 29.0, 26.5]
WDEG = [14.0, 1.0, 0.0, 0.0, 14.0, 6.0, 6.0, 4.0, 22.0, 34.0]   # rifle angle in WORLD degrees
BX = [0.0, 1.0, 2.0, 2.0, -2.5, -1.0, -1.0, -0.5, 0.0, 0.0]
BQ = [0.0, -0.03, -0.05, 0.03, -0.10, -0.02, -0.02, 0.0, 0.0, 0.0]
BOLT = [None, None, None, None, None, (0, 0, 70), (-3.8, 0, 70), (0, 0, 70), None, None]
CAS = [None, None, None, None, None, None, (-4, 5, 70), (-10, 12, 200), (-15, 6, 320), None]


def _attack_pose(f):
    t = LEAN[f]
    pose = merge(hold(GX[f], GZ[f], WDEG[f] - t), {
        "torso": {"r": t},
        "head": {"r": [-2, -4, -6, -6, 6, 0, 0, 0, 0, 0][f] - 0.3 * t, "x": 1.4 if f in (1, 2, 3) else 0.0,
                 "z": -1.2 if f in (1, 2, 3) else 0.0},
        "hat": {"r": [0, 0, 0, 0, 7, 2, 0, 0, 0, 0][f], "z": [0, 0, 0, 0, 1.0, 0.3, 0, 0, 0, 0][f]},
        "thigh_r": {"r": [4, 14, 18, 18, 12, 10, 10, 8, 4, 2][f]},
        "shin_r": {"r": [0, -8, -12, -12, -8, -4, -4, -2, 0, 0][f]},
        "thigh_l": {"r": [-4, -14, -18, -20, -18, -14, -14, -10, -6, -3][f]},
        "shin_l": {"r": [0, -2, -4, -4, -4, -2, -2, 0, 0, 0][f]},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5), "s": [1, 1, 1, 1, 1.0, 1.3, 1, 1, 1, 1][f],
                  "x": [0, 0, 0, 0, 0, 3, 0, 0, 0, 0][f], "z": [0, 0, 0, 0, 0, 2.5, 0, 0, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=BX[f], q=BQ[f]))
    if BOLT[f] is not None:   # the near hand leaves the wrist of the stock and works the bolt
        bx, bz, brx = BOLT[f]
        pose["bolt"] = {"x": bx, "z": bz, "rx": brx}
        deg = WDEG[f] - t
        rad = math.radians(deg)
        kx = GX[f] + (2.0 + bx) * math.cos(rad) - 3.4 * math.sin(rad)
        kz = GZ[f] + (2.0 + bx) * math.sin(rad) + 4.0 * math.cos(rad)
        a, fo = R.ik2(R.SH, (kx - 1.0, kz))
        pose.update(R.arm("r", a, fo))
    if CAS[f] is not None:
        x, z, r = CAS[f]
        pose["casing"] = {"show": True, "x": x, "z": z, "r": r}
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.0}})
    if f == 4:
        pose = merge(pose, F.expr("grit"))
    return KM.ground_feet(RIG, pose, LEGS)


def _attack_clip():
    muz = MUZ[0] if MUZ else (G0[0] + LENGTH + 1.0, G0[1], G0[2] + 1.8)
    ov = {3: [{"kind": "burst", "joint": "gun", "point": muz, "r0_lu": 8.0, "r1_lu": 13.0, "n": 5, "a0": -60.0,
               "arc": 120.0}]}
    return M.clip("attack", [_attack_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov)


# -- attack B: kneeling shot (ANIM_SPEC appendix B) ---------------------------------------------
# unique frames: 0 = A raise, 1 drop, 2 HOLD (on one knee, the rifle at his shoulder, squinting),
# 3 FIRE, 4 kick, 5 bolt up, 6 bolt back (a casing flies), 7 bolt home and rising, 8 = A lower,
# 9 = A settle. Same steps as A (the fire on step 3).
#        drop HOLD FIRE kick boltUp boltBack home
KB_DROP = [8.0, 14.0, 14.0, 13.5, 14.0, 14.0, 8.0]
KB_LEAN = [-6, -8, -8, 2, -4, -4, -3]
KB_GX = [5.5, 6.5, 6.5, 4.0, 5.5, 5.5, 5.0]
KB_GZ = [31.0, 34.0, 34.0, 35.5, 33.0, 33.0, 31.0]
KB_WDEG = [8.0, 4.0, 4.0, 20.0, 8.0, 8.0, 16.0]
KB_BX = [0.5, 1.0, 1.0, -2.5, -1.0, -1.0, -0.5]
KB_BQ = [-0.04, -0.06, 0.03, -0.10, -0.02, -0.02, 0.0]
KB_BOLT = [None, None, None, None, (0, 0, 70), (-3.8, 0, 70), (0, 0, 70)]
KB_CAS = [None, None, None, None, None, (-4, 5, 70), (-10, 10, 200)]
KB_FRONT = [8.0, 12.5, 12.5, 13.0, 12.5, 12.5, 8.0]


def _b_pose(i):
    if i in (0, 8, 9):
        return _attack_pose(i)
    k = i - 1
    t = KB_LEAN[k]
    gx, gz, deg = KB_GX[k], KB_GZ[k], KB_WDEG[k] - t
    pose = merge(hold(gx, gz, deg), {
        "torso": {"r": t},
        "head": {"r": [-4, -6, -6, 6, 0, 0, 0][k] - 0.3 * t, "x": 1.4 if k in (1, 2) else 0.0,
                 "z": -1.2 if k in (1, 2) else 0.0},
        "hat": {"r": [0, 0, 0, 8, 2, 0, 0][k], "z": [0, 0, 0, 1.0, 0.3, 0, 0][k]},
        "flash": {"show": k == 2},
        "smoke": {"show": k in (3, 4), "s": [1, 1, 1, 1.0, 1.3, 1, 1][k], "x": [0, 0, 0, 0, 3, 0, 0][k],
                  "z": [0, 0, 0, 0, 2.5, 0, 0][k]},
    }, M.body_about((0, 0, 22), x=KB_BX[k], q=KB_BQ[k]))
    if KB_BOLT[k] is not None:
        bx, bz, brx = KB_BOLT[k]
        pose["bolt"] = {"x": bx, "z": bz, "rx": brx}
        rad = math.radians(deg)
        kx = gx + (2.0 + bx) * math.cos(rad) - 3.4 * math.sin(rad)
        kz = gz + (2.0 + bx) * math.sin(rad) + 4.0 * math.cos(rad)
        a, fo = R.ik2(R.SH, (kx - 1.0, kz))
        pose.update(R.arm("r", a, fo))
    if KB_CAS[k] is not None:
        x, z, r = KB_CAS[k]
        pose["casing"] = {"show": True, "x": x, "z": z - KB_DROP[k], "r": r}
    pose = KM.kneel(RIG, pose, LEGS, drop=KB_DROP[k], front=KB_FRONT[k])
    if k in (1, 2):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.0}})
    elif k == 3:
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_b():
    muz = MUZ[0] if MUZ else (G0[0] + LENGTH + 1.0, G0[1], G0[2] + 1.8)
    ov = {3: [{"kind": "burst", "joint": "gun", "point": muz, "r0_lu": 8.0, "r1_lu": 13.0, "n": 5, "a0": -60.0,
               "arc": 120.0},
              {"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 23, "spread": 0.7,
               "dir": -1.0}]}
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse=reuse)


def _hit(k):
    def recoil(a):
        return merge(hold(PORT[0], PORT[1], PORT[2] + 16 * a) if a > 0 else {},
                     {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                      "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                      "hat": {"z": 3.5 * max(a, 0), "r": 12 * a}, "brow": {"z": 1.6 * max(a, 0)}})
    base = {"torso": {"r": -2.0}} if M.HIT_AMT[k] > 0 else STANCE
    return M.hit_light(k, base, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


# D2: the rifle flies out of his hands backwards on the hit and lands flat behind him; the helmet
# leaves on the slam (step 5) and rolls forward along the ground
GUN_PATH = [(-2, 8, 40), (-6, 22, 140), (-12, 28, 250), (-18, 20, 350), (-22, 4, 440), (-22, -14, 510),
            (-20, -25, 540), (-20, -25, 540), (-20, -25, 540), (-20, -25, 540)]
HELM_ROLL = [None, None, None, None, None, (54, -44, -40), (63, -50, -130), (70, -55, -190),
             (72, -55, -200), (72, -55, -200)]
#          struck  teeter stiff  tip   tip   SLAM  bounce lie   lie   lie
ARM_R_A = [60, 90, -95, -98, -60, 80, 85, 84, 84, 84]
ARM_R_F = [110, 120, -92, -95, -40, 88, 90, 88, 88, 88]
ARM_L_A = [80, 110, -92, -95, -50, 95, 100, 98, 98, 98]
ARM_L_F = [130, 140, -90, -92, -30, 100, 104, 102, 102, 102]


def _die(k):
    stiff = [0.2, 0.6, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][k]
    base = {j: v for j, v in STANCE.items() if not j.startswith(("arm_", "fore_", "hand_", "gun"))}
    pose = merge(base, K.die_d2(k, toe_x=7.0, heel_x=-4.0, lie_lift=6.0), {
        "torso": {"r": 4 * stiff}, "head": {"r": [8, 10, 0, 0, 0, -8, -4, -6, -6, -6][k]},
        "thigh_r": {"r": -2 * stiff}, "thigh_l": {"r": 2 * stiff},
    }, R.arm("r", ARM_R_A[k], ARM_R_F[k]), R.arm("l", ARM_L_A[k], ARM_L_F[k]))
    x, z, r = GUN_PATH[k]
    pose["gun"] = {"hide": True}
    pose["gun_loose"] = {"show": True, "x": x, "z": z, "r": r}
    hp = HELM_ROLL[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    elif k >= 1:
        pose["hat"] = {"r": 6 * stiff, "z": 1.2 * stiff}
    if k < 2:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 5:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.8}})
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
    return M.check_variants(M.check_contract(cl, attack_ms=748, attack_impact_at=0.389))
