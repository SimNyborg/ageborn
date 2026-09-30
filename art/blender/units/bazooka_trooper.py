"""Bazooka Trooper: Modern Age anti-armor (DESIGN A5.5). Rocket (proj.rocket), 200 lu, ~70 lu.

Look (A11, Modern palette): a broad soldier in a round helmet with a team band and goggles pushed
up on its front, a team tunic with rolled-up team sleeves (cream chevrons on the near sleeve), khaki
webbing with rocket pouches, olive trousers and khaki puttees, and an olive backpack with a spare
rocket standing up out of it. A huge team launcher tube rests on his near shoulder (gunmetal bells,
olive bands, a pistol grip, a front grip, a sight, dark and pale hazard stripes on the rear bell)
with a gunmetal warhead with a signal band peeking out of the front: the long tube is the
anti-armor silhouette at 56 px.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    peeks through the sight (leans in, one eye squeezed), then looks up over it, blink
  walk    stomp: bow-legged, a heavy down frame, the tube rocking on his shoulder a frame late
  attack  BACK-BLAST KNOCKBACK: he hefts the tube, braces wide, squints down the sight (the held
          extreme), FIRES (a front flash and a back-blast flash, impact lines), and the kick knocks
          him back a step: a huge smoke cloud billows out behind the tube, he teeters on one foot
          with his eyes wide, wobbles back upright, pulls the spare rocket from his pack and the
          fresh warhead is back in the tube as he settles. The rocket leaves the per-frame `muzzle`
          anchor on the fire frame and is gone from the tube until the reload.
  hit     light: the head snaps back, the helmet lifts, eyes squeezed, overshoot forward
  die     D1 fling and spin: the helmet pops off and the tube flies; X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_gunpowder as KG
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_modern as KM
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "bazooka_trooper"
NAME = "Bazooka Trooper"
HEIGHT_LU = 70
CANVAS = (380, 262)
FEET = (184, 222)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (40, 44)}
NO_RETIME = True

TY, TZ = -15.5, 37.5         # tube axis: in front of the near shoulder
T0, T1 = -30.0, 30.0         # tube ends (x)
TR = 4.4                     # tube radius
PIVOT = (-2.0, TY, TZ)       # the tube rotates about the shoulder
GRIP = (6.0, TY + 1.0, TZ - 8.5)
FORE = (15.0, TY + 1.0, TZ - 6.0)
MUZZLE = (T1 + 1.0, TY, TZ)
WARHEAD = "#50565C"
HELM_C = (1.0, 0.0, 55.0)
SPARE = (-15.0, 3.0, 40.0)   # the spare rocket's base in the pack


def _tube(rig, joint):
    g = Geo().capsule((T0 + 4, TY, TZ), (T1 - 2, TY, TZ), TR, TR, segs=20)
    tube = g
    face = F.Face(rig, joint, [tube])
    rig.part(joint, tube, team=True)
    g = Geo()   # flared rear bell and front ring
    g.lathe([(TR - 0.4, 0), (TR + 1.4, 2.0), (TR + 3.6, 7.0), (TR + 2.6, 7.6), (TR - 0.5, 1.0)],
            (T0 + 7.5, TY, TZ), (T0 - 2, TY, TZ), segs=22)
    g.lathe([(TR + 0.8, 0), (TR + 1.0, 3.0), (TR - 0.2, 3.6)], (T1 - 3.5, TY, TZ), (T1 + 2, TY, TZ), segs=22)
    rig.part(joint, g, R.GUNMETAL, finish="metal")
    g = Geo()   # olive bands, a shoulder pad
    for x in (-13.0, 7.0):
        g.lathe([(TR + 0.5, -1.7), (TR + 0.7, 0), (TR + 0.5, 1.7)], (x, TY, TZ), (x + 1, TY, TZ), segs=20)
    rig.part(joint, g, R.OLIVE, finish="gloss", outline=0.6)
    g = Geo().blob((-3.0, TY + 1.0, TZ - 4.7), (6.0, 2.6, 1.8), p=3.0)
    rig.part(joint, g, R.KHAKI, outline=0.6)
    # hazard stripes on the rear section (back-blast danger) and a chevron on the tube
    g = KM.stripes(face, Geo(), (-21.5, TZ - 1.0), 11.0, 6.2, n=4, slant=0.7)
    rig.part(joint, g, KM.STRIPE_LT, highlight=False, outline=0)
    g = KM.chevron(face, Geo(), (-3.0, TZ + 1.4), s=0.7, n=1, w=1.9)
    rig.part(joint, g, KM.CREAM, highlight=False, outline=0)
    g = Geo().blob((2.0, TY - 1.0, TZ + TR + 1.8), (2.4, 1.1, 2.2), p=3.0)   # sight frame
    g.capsule((GRIP[0], GRIP[1], TZ - TR), (GRIP[0] - 1.5, GRIP[1], GRIP[2]), 1.5)       # pistol grip
    g.capsule((FORE[0], FORE[1], TZ - TR), (FORE[0] + 0.5, FORE[1], FORE[2] - 1.0), 1.4)  # front grip
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.6)
    g = Geo().capsule((-12.0, TY - TR - 0.2, TZ + 1.0), (-8.0, TY - TR - 0.4, TZ - 5.0), 0.6)   # wire
    rig.part(joint, g, R.LEATHER, outline=0)


def _rocket(rig, joint, base, axis=(1, 0, 0), L=9.0):
    """A warhead (gunmetal nose, signal band) from `base` along `axis`."""
    bx, by, bz = base
    ax, ay, az = axis
    g = Geo().lathe([(TR - 0.9, 0), (TR - 0.8, 2.0), (TR - 1.6, 5.4), (1.0, 7.6), (0, 8.0)],
                    base, (bx + ax * L, by + ay * L, bz + az * L), segs=18)
    rig.part(joint, g, WARHEAD, finish="metal")
    g = Geo().lathe([(TR - 0.7, 0), (TR - 0.6, 1.6), (TR - 0.9, 2.4)], (bx + ax * 1.4, by + ay * 1.4, bz + az * 1.4),
                    (bx + ax * 4, by + ay * 4, bz + az * 4), segs=18)
    rig.part(joint, g, R.SIGNAL, outline=0.5)


def build(rig):
    R.skeleton(rig)
    R.legs(rig, thigh_r=5.0)
    # backpack with the spare rocket (fins down in the pack, warhead up)
    g = Geo().blob((-12.4, 1.0, 29.0), (5.4, 9.0, 9.0), p=3.2)
    rig.part("torso", g, R.OLIVE)
    g = Geo().blob((-16.2, -3.6, 25.0), (2.4, 4.0, 4.0), p=3.2)
    rig.part("torso", g, R.KHAKI, outline=0.6)
    rig.joint("spare", "torso", SPARE)
    g = Geo().capsule((SPARE[0], SPARE[1], SPARE[2] - 8.0), (SPARE[0], SPARE[1], SPARE[2]), 2.4)
    rig.part("spare", g, R.GUNMETAL, finish="metal", outline=0.5)
    _rocket(rig, "spare", SPARE, axis=(0, 0, 1), L=8.0)
    R.tunic(rig)
    KM.pouches(rig, "torso", [(9.2, -6.8, 19.2), (-4.0, -10.6, 19.0)], size=(2.4, 1.8, 3.4))
    g = Geo().capsule((2.0, -10.6, 37.0), (-8.0, -9.4, 22.0), 1.5)   # pack strap
    rig.part("torso", g, R.KHAKI, outline=0.6)

    KI.head_face(rig, brow=R.HAIR, brow_angry=True, mouth_dz=-9.0, mouth_w=6.0)
    g = Geo().blob((-6.0, 0, 46.0), (5.6, 9.8, 6.0), p=2.2)
    rig.part("head", g, R.HAIR, finish="hair")
    g = Geo().blob((-2.0, -11.2, 49.0), (2.6, 1.6, 3.4), p=2.2)   # ear
    rig.part("head", g, R.SKIN)

    def helmet(j):
        R.helmet_round(rig, c=HELM_C, net=False, strap=(j == "hat"), joint=j)
        g = Geo()   # goggles pushed up on the helmet front
        for y in (-4.8, 4.4):
            g.lathe([(0, 0), (3.2, 0.2), (3.4, 2.4), (0, 2.6)], (11.4, y, 59.0), (14.0, y, 59.6), segs=14)
        rig.part(j, g, R.LEATHER, outline=0.6)
        g = Geo()
        for y in (-4.8, 4.4):
            g.blob((13.8, y, 59.5), (0.8, 2.5, 2.5), p=2.2)
        rig.part(j, g, R.GLASS, finish="gloss", outline=0)
    rig.joint("hat", "head", HELM_C)
    helmet("hat")
    KI.loose(rig, "hat_loose", HELM_C, helmet)

    for s in ("r", "l"):
        R.arm_parts(rig, s, rolled=True, fist=4.6)
    R.shoulders(rig)
    sleeve = Geo().capsule((0, R.ARM_Y["r"], R.SHOULDER_Z), (0, R.ARM_Y["r"], R.ELBOW_Z), 4.4, 4.1)
    sface = F.Face(rig, "arm_r", [sleeve])
    g = KM.chevron(sface, Geo(), (0.6, 32.8), s=0.95, n=2, w=1.7, gap=2.9)
    rig.part("arm_r", g, KM.CREAM, highlight=False, outline=0)
    # the reload: a spare warhead in the far hand (hidden until he pulls it from the pack)
    hx, hy, hz = 0.4, R.ARM_Y["l"], R.HAND_Z - 0.4
    rig.joint("reload", "hand_l", (hx, hy, hz), hidden=True)
    g = Geo().capsule((hx, hy - 2.5, hz - 5.0), (hx, hy - 2.5, hz + 1.0), 2.4)
    rig.part("reload", g, R.GUNMETAL, finish="metal", outline=0.5)
    _rocket(rig, "reload", (hx, hy - 2.5, hz + 1.0), axis=(0, 0, 1), L=8.0)

    # the launcher, on its own joint (pivot at the shoulder); hands are posed by IK
    rig.joint("tube", "torso", PIVOT)
    _tube(rig, "tube")
    rig.joint("rocket", "tube", (T1, TY, TZ))
    _rocket(rig, "rocket", (T1 - 1.0, TY, TZ))
    rig.track("muzzle", "tube", MUZZLE)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))
    R.muzzle_flash(rig, "tube", (T1 + 2, TY, TZ), size=2.0)
    R.muzzle_flash(rig, "tube", (T0 - 2, TY, TZ), size=1.7, name="blast", back=True)
    KI.loose(rig, "tube_loose", PIVOT, lambda j: (_tube(rig, j), _rocket(rig, j, (T1 - 1.0, TY, TZ))))
    # back-blast clouds (left in place: parented to the root)
    KG.smoke_cloud(rig, "root", (T0 - 12.0, -8.0, TZ - 1.0), size=1.35, name="smoke", seed=1)
    KG.smoke_cloud(rig, "root", (T0 - 30.0, -6.0, TZ + 4.0), size=1.6, name="smoke2", seed=2,
                   balls=((0, 0, 5.4), (6.4, 2.0, 4.6), (-5.0, 4.0, 4.4), (1.6, 7.4, 4.0), (-9.4, -1.0, 3.6),
                          (8.8, 6.6, 3.2)))
    KG.smoke_cloud(rig, "root", (MUZZLE[0] + 8.0, -8.0, TZ + 2.0), size=0.75, name="puff", seed=3)


# -- poses ------------------------------------------------------------------------------------------
def aim(deg, dx=0.0, dz=0.0, far=True):
    """Tube pointing `deg` (torso space; pivot shifted dx, dz); both hands on its grips by IK."""
    pose = {"tube": {"r": deg, "x": dx, "z": dz}}
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))

    def world(p):
        x, z = p[0] - PIVOT[0], p[2] - PIVOT[2]
        return (PIVOT[0] + dx + x * c - z * s, PIVOT[2] + dz + x * s + z * c)
    gx, gz = world(GRIP)
    a, f = R.ik2(R.SH, (gx - 0.4, gz + 0.8))
    pose.update(R.arm("r", a, f))
    if far:
        fx_, fz = world(FORE)
        a, f = R.ik2(R.SH, (fx_ - 0.6, fz))
        pose.update(R.arm("l", a, f))
    return pose


REST_DEG = 7.0
STANCE = merge(aim(REST_DEG), {"torso": {"r": -2.0}})


def _idle(f):
    # 0-1 looks over the tube, 2-3 leans in and peeks through the sight (one eye squeezed), 4-5 back
    peek = [0.0, 0.2, 1.0, 1.0, 0.3, 0.0][f]

    def extra(ctx):
        return merge(aim(REST_DEG - 3.0 * peek + 1.5 * ctx["lag"], dz=0.4 * ctx["lag"]),
                     {"head": {"r": -8.0 * peek, "x": 1.6 * peek, "z": -1.0 * peek},
                      "hat": {"r": 3.0 * peek}, "brow": {"z": -0.8 * peek}})
    pose = M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)
    if f in (2, 3):
        pose = merge(pose, F.expr("squeeze"))
    return pose


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(aim(REST_DEG - 3.0 * lag, dz=0.6 * lag), {"hat": {"r": -1.2 * lag},
                                                                 "spare": {"r": 4.0 * lag}})
    return M.walk_v2(f, {"torso": {"r": -2.0}}, HEIGHT_LU, thigh=30.0, knee=58.0, lift_lu=6.5, bob_pct=0.07,
                     lean=-5.0, arms=(), bow=7.0, heavy_down=1.35, twist=5.0, extra=extra)


# 10 unique frames in 790 ms; fire on frame 3 at 291 ms (impactAt 0.3684, as shipped)
ATTACK_MS = [40, 60, 191, 60, 80, 70, 70, 70, 75, 74]
ATTACK_IMPACT = 3
#       heft brace HOLD FIRE knock teeter wobble wobble reload settle
DEG = [12.0, 3.0, 0.0, 0.0, 14.0, 9.0, 3.0, 6.0, 8.0, 7.0]        # tube angle, WORLD
LEAN = [-2, -6, -8, -8, 10, 8, -4, 2, -2, -2]
BX = [0.0, 0.5, 1.0, 1.0, -7.0, -10.0, -7.0, -5.0, -3.0, -1.0]
BZ = [0.0, -1.5, -2.2, -2.2, 0.5, 1.5, -0.5, 0.0, 0.0, 0.0]
BQ = [0.02, -0.06, -0.08, 0.02, 0.06, -0.02, -0.06, 0.02, 0.0, 0.0]
BR = [0, 0, 0, 0, 6, 10, -5, 3, 0, 0]          # the whole body rocks back on its heels
TH_R = [4, 14, 16, 16, 22, 34, 10, 14, 8, 4]
SH_R = [0, -10, -14, -14, -10, -28, -4, -8, -4, 0]
TH_L = [-4, -18, -22, -22, -18, -12, -20, -14, -8, -4]
SH_L = [0, -8, -12, -12, -6, -2, -10, -4, -2, 0]


def _attack_pose(f):
    t = LEAN[f]
    pose = merge(aim(DEG[f] - t, dx=[0, 0.5, 0.8, 0.8, -2.5, -1.5, -0.5, 0, 0, 0][f], far=f not in (8,)), {
        "torso": {"r": t},
        "head": {"r": [-2, -5, -8, -8, 6, 8, -2, 2, 0, 0][f] - 0.3 * t,
                 "x": [0, 0.8, 1.4, 1.4, 0, 0, 0, 0, 0, 0][f]},
        "hat": {"r": [0, 0, 2, 2, 10, 6, -3, 1, 0, 0][f], "z": [0, 0, 0, 0, 1.5, 0.8, 0, 0, 0, 0][f]},
        "thigh_r": {"r": TH_R[f]}, "shin_r": {"r": SH_R[f]},
        "thigh_l": {"r": TH_L[f]}, "shin_l": {"r": SH_L[f]},
        "flash": {"show": f == 3},
        "blast": {"show": f == 3},
        "rocket": {"hide": 3 <= f <= 8},
        "smoke": {"show": 3 <= f <= 6, "s": [1, 1, 1, 0.75, 1.0, 1.1, 0.95, 1, 1, 1][f],
                  "x": [0, 0, 0, 3, -2, -8, -16, 0, 0, 0][f], "z": [0, 0, 0, 0, 1, 4, 9, 0, 0, 0][f]},
        "smoke2": {"show": 4 <= f <= 7, "s": [1, 1, 1, 1, 0.8, 1.05, 1.1, 0.9, 1, 1][f],
                   "x": [0, 0, 0, 0, -2, -8, -14, -20, 0, 0][f], "z": [0, 0, 0, 0, 0, 3, 7, 12, 0, 0][f]},
        "puff": {"show": f in (4, 5), "s": [1, 1, 1, 1, 0.9, 1.2, 1, 1, 1, 1][f],
                 "z": [0, 0, 0, 0, 0, 3, 0, 0, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=BX[f], z=BZ[f], q=BQ[f], r=BR[f]))
    if f == 8:   # the far hand pulls the spare rocket from the pack
        a, fo = R.ik2(R.SH, (-6.0, 41.0))
        pose = merge(pose, R.arm("l", a - 90.0 + 90.0, fo))
        pose["spare"] = {"hide": True}
        pose["reload"] = {"show": True}
        pose["hand_l"] = {"r": 150.0}
    if f in (1, 2):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -1.0}})
    elif f == 3:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif f in (4, 5):
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}, "pupils": {"s": 0.8}})
    elif f in (6, 7):
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_clip():
    ov = {
        3: [{"kind": "burst", "joint": "tube", "point": (T1 + 4.0, TY, TZ), "r0_lu": 9.0, "r1_lu": 15.0, "n": 5,
             "a0": -60.0, "arc": 120.0},
            {"kind": "dust", "ground": (-24.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 51, "spread": 1.2,
             "dir": -1.0}],
        4: [{"kind": "dust", "ground": (6.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 52, "spread": 0.8,
             "dir": 1.0},
            {"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 53, "spread": 0.8,
             "dir": -1.0}],
        5: [{"kind": "rings", "joint": "head", "point": (4.0, 0, 64.0), "radii_lu": (5.0, 8.0), "a0": 30.0,
             "a1": 150.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov)


def _hit(k):
    def recoil(a):
        return merge(aim(REST_DEG + 14 * a) if a > 0 else {},
                     {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                      "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                      "hat": {"z": 3.0 * max(a, 0), "r": 10 * a}, "brow": {"z": 1.6 * max(a, 0)}})
    base = {"torso": {"r": -2.0}} if M.HIT_AMT[k] > 0 else STANCE
    return M.hit_light(k, base, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


TUBE_PATH = [None, (6, 16, 40), (12, 32, 120), (18, 38, 220), (24, 28, 300), (28, 10, 350),
             (30, -20, 360), (31, -30, 362), (31, -30, 362), (31, -30, 362)]
HAT_PATH = KI.hat_pop(land=53.0, back=60.0)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    base = {j: v for j, v in STANCE.items() if not j.startswith(("arm_", "fore_", "hand_", "tube"))}
    pose = merge(base, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    tp = TUBE_PATH[k]
    if tp is None:
        pose = merge(pose, aim(REST_DEG + 20))
    else:
        x, z, r = tp
        pose["tube"] = {"hide": True}
        pose["tube_loose"] = {"show": True, "x": x, "z": z, "r": r}
    hp = HAT_PATH[k]
    if hp is not None:
        x, z, r = hp
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
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl, attack_ms=790, attack_impact_at=0.3684)
