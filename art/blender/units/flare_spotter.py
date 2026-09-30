"""Flare Spotter: Industrial Age support (docs/design-lane-ages.md A17.10). Flare (proj.flare), 200 lu,
~68 lu. Every hit marks the target (+20% damage taken) for 3 s; follows the front.

Look (A17.12, Industrial palette): a lanky forward observer in an iron-grey officer's peaked cap
(a flat wide top, a glossy peak, a team band, a brass badge),
a team Norfolk jacket with a belt, iron-grey sleeves with a wide team armband on the near arm,
cream breeches with leather gaiters, a tidy moustache and a pair of big brass-rimmed binoculars
hanging on a strap across his chest. In his near hand a stubby flare pistol (fat aged-brass
barrel, wooden grip) held up by his shoulder, muzzle skyward. The idle alternates: one breath with the
binoculars raised to his eyes, one with them lowered while he scans. The attack ("flare arc")
raises the pistol high overhead (about 65 degrees), holds, fires with a white-magenta flash
around a white flare core (never red, A17.12) and a smoke puff, kicks, then he throws his far
arm out to point at the marked target and settles. The projectile spawns at the per-frame
`muzzle` anchor; `binoculars` is exported for the mark reticle effect.
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "flare_spotter"
NAME = "Flare Spotter"
HEIGHT_LU = 70
CANVAS = (272, 248)
FEET = (116, 226)
ANCHORS = {"head": (2, 69), "hitCenter": (0, 32), "muzzle": (18, 52)}
NO_RETIME = True
CAP_C = (1.0, 0, 57.2)

HR = (0.6, I.ARM_Y["r"] - 1.2, I.HAND_Z - 0.2)   # near fist
BARREL = 14.0


def build(rig):
    I.skeleton(rig)
    I.legs(rig, trousers=I.CREAM_DK, gaiter=I.LEATHER, thigh_r=4.8)
    I.jacket(rig, collar=I.COAL_LT)
    # Norfolk jacket pleats (darker team stripes are not allowed: use thin coal lines)
    g = Geo()
    for y in (-4.0, 4.0):
        g.blob((10.2, y, 28.0), (0.8, 0.9, 8.0), p=3.0)
    rig.part("torso", g, I.COAL_LT, outline=0)
    # binoculars on a strap across the chest
    g = Geo().capsule((8.0, -8.6, 36.0), (11.6, -3.0, 25.0), 0.8)
    g.capsule((8.0, 8.6, 36.0), (11.6, 3.0, 25.0), 0.8)
    rig.part("torso", g, I.LEATHER, outline=0.4)
    # binoculars in the far hand, modelled in front of the face (y near 0) so they read over it
    HL = (0.4, I.ARM_Y["l"], I.HAND_Z - 0.4)
    rig.joint("bino", "hand_l", HL)
    I.binoculars(rig, "bino", (HL[0] + 3.0, -1.0, HL[2] + 1.0), k=1.2)
    g = Geo().capsule((HL[0], HL[1] - 2.0, HL[2]), (HL[0] + 2.0, -1.0, HL[2] + 1.0), 1.6)
    rig.part("bino", g, I.SKIN, outline=0.4)
    rig.track("binoculars", "bino", (HL[0] + 3.0, -1.0, HL[2] + 1.0))

    KI.head_face(rig, brow=I.HAIR, brow_angry=False, mouth_dz=-9.0)
    I.moustache(rig, I.HAIR, curl=True, big=0.9)
    I.back_hair(rig, I.HAIR)
    I.ear(rig)
    rig.joint("hat", "head", CAP_C)
    I.peaked_cap(rig, c=CAP_C, joint="hat")
    # a brass whistle on a cord and a leather map case on the hip (secondary)
    g = Geo().capsule((9.0, 7.0, 36.0), (11.4, 0.0, 30.0), 0.5)
    rig.part("torso", g, I.CREAM_DK, outline=0.3)
    g = Geo().capsule((11.4, 0.4, 30.2), (12.6, -1.4, 27.4), 1.1)
    rig.part("torso", g, I.BRASS_LT, finish="metal", outline=0.5)
    rig.secondary("mapcase", "hips", (-2.0, -11.0, 18.0), (-3.0, -12.0, 8.0), max_deg=22, gain=1.3)
    g = Geo().blob((-2.6, -12.2, 12.0), (4.2, 1.6, 4.4), p=3.0)
    rig.part("mapcase", g, I.LEATHER, outline=0.6)
    g = Geo().blob((-2.6, -13.6, 14.0), (3.6, 0.6, 1.6), p=3.0)
    rig.part("mapcase", g, I.LEATHER_DK, outline=0.3)

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=I.IRON_LT, team_sleeve=False, fist=4.3, cuff=I.COAL_LT)
    I.shoulders(rig)
    I.armband(rig, "r")
    I.armband(rig, "l")

    # flare pistol along +X from the near fist
    rig.joint("pistol", "hand_r", HR)
    x, y, z = HR
    g = Geo().capsule((x - 1.0, y, z - 4.4), (x + 1.2, y, z + 1.0), 2.0, 2.2)   # grip
    rig.part("pistol", g, I.WOOD_LT)
    g = Geo().lathe([(0, 0), (3.2, 0.2), (3.4, BARREL - 2.4), (4.4, BARREL - 1.2), (4.4, BARREL), (0, BARREL)],
                    (x + 0.5, y, z + 2.0), (x + 0.5 + BARREL, y, z + 2.0), segs=18)
    rig.part("pistol", g, I.BRASS, finish="metal")
    g = Geo().blob((x + 0.2, y, z + 2.4), (3.2, 2.6, 3.0), p=3.2)   # breech and hammer
    g.capsule((x - 2.0, y, z + 4.0), (x - 3.6, y, z + 6.0), 0.9)
    rig.part("pistol", g, I.IRON_DK, finish="metal", outline=0.6)
    g = Geo().blob((x + 0.5 + BARREL + 0.3, y, z + 2.0), (0.4, 2.4, 2.4), p=2.2)   # the loaded flare
    rig.part("pistol", g, I.FLARE, outline=0.4)
    muz = (x + 1.0 + BARREL, y, z + 2.0)
    rig.track("muzzle", "pistol", muz)
    rig.joint("flash", "pistol", muz, hidden=True)
    g = Geo()
    for dx, dz, r in ((6.0, 0, (7.0, 2.4, 3.6)), (4.0, 2.6, (4.6, 2.0, 2.0)), (4.0, -2.6, (4.6, 2.0, 2.0))):
        g.blob((muz[0] + dx, muz[1] - 1, muz[2] + dz), r, p=2.0,
               rot=(0, (-36 if dz > 0 else 36) if dz else 0, 0))
    rig.part("flash", g, glow=I.FLARE, outline=0)
    g = Geo().sphere((muz[0] + 4.0, muz[1] - 2.4, muz[2]), 3.0, cuts=3)
    rig.part("flash", g, glow=I.FLARE_CORE, outline=0)
    I.smoke_puff(rig, "pistol", (muz[0] + 5.0, muz[1], muz[2] + 2.0), size=0.8)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))


def near(a, f, w):
    return I.arm("r", a, f, w=w, w_rest=0.0)


def far(a, f, w=0.0):
    return I.arm("l", a, f, w=w, w_rest=0.0)


IDLE_R = (-62.0, -18.0, -22.0)   # pistol held low and forward
LOOK = (10.0, 60.0)              # far arm: binoculars up at the eyes
DOWN = (-95.0, -70.0)            # far arm: binoculars lowered
STANCE = merge(near(*IDLE_R), far(*LOOK))

IDLE_MS = 150
# 8 unique idle poses in 1200 ms (as shipped) = two breaths: 0-2 binoculars at the eyes, 3
# lowering, 4-6 lowered (he scans, head turning, a blink on 5), 7 raising again
BINO = [1.0, 1.0, 1.0, 0.45, 0.0, 0.0, 0.0, 0.5]


def _idle(f):
    c, lag = I.idle_wave([0, 1, 2, 3, 3, 2, 1, 0][f])
    a, fo, w = IDLE_R
    k = BINO[f]
    la = DOWN[0] + (LOOK[0] - DOWN[0]) * k
    lf = DOWN[1] + (LOOK[1] - DOWN[1]) * k
    look = [0, 0, 0, -2, -5, 3, 6, 0][f]
    pose = merge(I.idle_body([0, 1, 2, 3, 3, 2, 1, 0][f]), near(a + 2 * lag, fo + 3 * lag, w + 3 * lag),
                 far(la + 1.5 * lag, lf + 2 * lag, -4.0 * lag), {"head": {"r": look}, "mapcase": {"r": 2 * lag}})
    if f == 5:
        pose = merge(pose, F.expr("blink"))
    if f in (4, 6):
        pose = merge(pose, {"pupils": {"x": 0.6, "z": 0.4}})
    return pose


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        sw = math.cos(ctx["lag_p"])
        a, fo, w = IDLE_R
        return merge(near(a + 16 * sw, fo + 10 * sw + 3 * lag, w + 8 * sw),
                     far(LOOK[0] + 3 * lag, LOOK[1] + 3 * lag, -3.0 * lag))
    return M.walk_v2(f, {}, HEIGHT_LU, thigh=36.0, knee=66.0, lift_lu=7.0, bob_pct=0.065, lean=-9.0,
                     arms=(), twist=6.0, extra=extra)


# 10 unique frames in 824 ms; the flare leaves on frame 3 at 291 ms (impactAt 0.3532, as shipped)
ATTACK_MS = [50, 70, 171, 70, 80, 90, 90, 70, 80, 53]
ATTACK_IMPACT = 3
#       dip raise HOLD FIRE kick point shout bounce settle settle
NA = [-50, 20, 58, 60, 72, -30, -62, -62, -60, -60]
NF = [-20, 50, 68, 70, 86, -20, -30, -26, -20, -18]
NW = [-10, 50, 66, 66, 86, 10, -30, -26, -22, -22]
LA = [-20, -70, -110, -110, -104, 6, 10, -30, -2, 8]
LF = [0, -80, -90, -90, -84, 8, 14, -20, 40, 56]
BX = [-0.5, 0.0, 0.5, 0.5, -2.0, 3.0, 3.5, 2.0, 1.0, 0.0]
BZ = [-2.2, 0.5, 1.8, 1.8, -0.6, -1.0, -0.8, 0.0, 0.0, 0.0]
BQ = [-0.08, 0.04, 0.07, 0.08, -0.08, -0.03, -0.02, 0.0, 0.0, 0.0]
TR = [2, -2, 6, 6, 9, -12, -14, -6, -2, 0]
HD = [4, 8, 14, 14, 16, -6, -8, -2, 0, 0]


def _attack_pose(f):
    pose = merge(near(NA[f], NF[f], NW[f]), far(LA[f], LF[f]), {
        "torso": {"r": TR[f]},
        "head": {"r": HD[f]},
        "hat": {"z": [0, 0, 0, 0, 1.6, 0, 0, 0, 0, 0][f], "r": [0, 0, 0, 0, 8, -3, -2, 0, 0, 0][f]},
        "thigh_r": {"r": [4, 4, 6, 6, 4, 16, 18, 12, 6, 2][f]},
        "shin_r": {"r": [-8, 0, -6, -6, -4, -6, -6, -4, -2, 0][f]},
        "thigh_l": {"r": [-4, -4, -6, -6, -8, -14, -16, -10, -6, -2][f]},
        "shin_l": {"r": [-8, 0, -8, -8, -4, -4, -4, -2, 0, 0][f]},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5), "s": [1, 1, 1, 1, 0.9, 1.3, 1, 1, 1, 1][f],
                  "z": [0, 0, 0, 0, 0, 3, 0, 0, 0, 0][f]},
        "mapcase": {"r": [0, 0, 0, 0, -10, 12, 4, -4, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=BX[f], z=BZ[f], q=BQ[f]))
    if f == 2:   # up on the toes, holding
        pose = merge(pose, {"shin_r": {"r": -10}, "shin_l": {"r": -10}})
    if f in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (3, 4):
        pose = merge(pose, F.expr("squeeze", "o"))
    elif f in (5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 1.0}})
    return pose


def _attack_clip():
    ov = {
        3: [{"kind": "burst", "joint": "pistol", "point": (HR[0] + 1.0 + BARREL, HR[1], HR[2] + 2.0),
             "r0_lu": 7.0, "r1_lu": 12.0, "n": 6, "a0": 0.0, "arc": 150.0, "color": "#FBE3F4"}],
        5: [{"kind": "rings", "joint": "head", "point": (15.0, 0.0, 42.0), "radii_lu": (7.0, 11.0),
             "a0": -40.0, "a1": 40.0}],
        6: [{"kind": "rings", "joint": "head", "point": (15.0, 0.0, 42.0), "radii_lu": (9.0, 14.0, 19.0),
             "a0": -40.0, "a1": 40.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=ov)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 14 * a}, "arm_l": {"r": 30 * a}, "fore_l": {"r": 16 * a},
                "hat": {"z": 3.0 * max(a, 0), "r": 10 * a}, "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


def _die(k):
    # D3 dizzy sit: he spins in place, sits down hard, the cap slides down over one eye, the
    # binoculars flop into his lap and the pistol droops
    t = [0, 0, 0.1, 0.3, 1.0, 0.95, 1.0, 1.0, 1.0, 1.0][k]
    pose = merge(near(-60 + 40 * t, -30 + 10 * t, -40), far(-80 + 40 * t, -60 + 20 * t),
                 M.die_d3(k, center_z=28.0, height=HEIGHT_LU), K.d3_sit(k), {
                     "hat": {"r": -18 * t, "z": -2.5 * t, "x": 1.5 * t}})
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k <= 3:
        pose = merge(pose, F.expr("spiral", "o"))
    else:
        pose = merge(pose, F.expr("spiral", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(8)], [IDLE_MS] * 8, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    by = {c.name: c for c in cl}
    assert by["idle"].total_ms() == 1200
    M.check_contract([c for c in cl if c.name != "idle"], attack_ms=824, attack_impact_at=0.3532)
    return cl
