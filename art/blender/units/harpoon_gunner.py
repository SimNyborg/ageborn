"""Harpoon Gunner: Industrial Age anti-armor (docs/design-lane-ages.md A17.10). Harpoon
(proj.harpoon), 210 lu, ~70 lu, medium. Reel In: the first hit of each engagement pulls the target
25 lu toward the gunner.

Look (A17.12, Industrial palette): a stocky whaler-engineer with big brass goggles pushed up on
his brow, a tall slouched coal watch cap with a team cuff and a cream pompom, a team pea jacket and team
sleeves, a leather apron belt and a big coil of cream rope slung over his shoulder (its ring
faces the camera and stands out behind his back). On his near shoulder rests a heavy iron harpoon gun: a fat
riveted barrel with copper bands, a round breech drum with a crank, a pistol grip and a front
grip, and a barbed iron harpoon head sticking out of the muzzle with its rope running back to the
coil. The long gun with the barbed head is the anti-armor silhouette at 56 px. The attack braces,
aims (held), fires with a flash and a smoke puff (the harpoon leaves the tube), kicks him back,
then "reel-in yank": he heaves the gun back as if hauling the rope, and a fresh harpoon is seated
as he settles. The projectile spawns at the per-frame `muzzle` anchor.
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "harpoon_gunner"
NAME = "Harpoon Gunner"
HEIGHT_LU = 70
CANVAS = (340, 228)
FEET = (148, 204)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (40, 44)}
NO_RETIME = True

TY, TZ = -15.5, 37.0         # barrel axis: in front of the near shoulder
T0, T1 = -20.0, 24.0         # barrel ends (x)
TR = 3.9
PIVOT = (-2.0, TY, TZ)
GRIP = (5.0, TY + 1.0, TZ - 8.5)
FORE = (14.0, TY + 1.0, TZ - 6.0)
MUZZLE = (T1 + 2.0, TY, TZ)
HEAD_LEN = 14.0
REEL = (-1.0, TZ - 10.5)
CRANK_R = 5.6
APRON = "#3C3A3A"


def build(rig):
    I.skeleton(rig)
    I.legs(rig, trousers=I.DENIM, cuff=I.CREAM_DK, thigh_r=5.1)
    # a big coil of cream rope slung over the far shoulder, its ring facing the camera so it
    # stands out behind the back and above the shoulder line (drawn first, behind the jacket)
    g = Geo()
    for k, r in enumerate((11.0, 9.0)):
        g.lathe([(r - 1.8, -1.8), (r + 0.2, -2.0), (r + 1.8, 0), (r + 0.2, 2.0), (r - 1.8, 1.8)],
                (-7.5 - k * 0.6, 6.0 - k * 1.4, 32.0), (-7.2 - k * 0.6, 5.0 - k * 1.4, 32.0), segs=28)
    rig.part("torso", g, I.CREAM, finish="hair")
    g = Geo()
    for a in (0.6, 2.2, 3.8, 5.3):                               # lashings
        g.capsule((-7.5 + 9.0 * math.cos(a), 4.2, 32.0 + 9.0 * math.sin(a)),
                  (-7.5 + 12.6 * math.cos(a), 4.2, 32.0 + 12.6 * math.sin(a)), 1.0)
    rig.part("torso", g, I.LEATHER_DK, outline=0.4)
    g = Geo().capsule((7.0, -9.4, 37.0), (-6.0, -9.0, 18.0), 1.6)   # coil strap across the chest
    rig.part("torso", g, I.LEATHER, outline=0.6)
    I.jacket(rig, collar=I.COAL_LT)
    g = Geo().blob((0.4, 0, 18.8), (11.2, 10.4, 3.8), p=3.2)   # apron belt with a hook
    rig.part("torso", g, I.LEATHER_DK)
    g = Geo().capsule((9.0, -8.6, 18.0), (10.6, -9.6, 12.0), 0.9)
    rig.part("torso", g, I.IRON_LT, finish="metal", outline=0.4)
    # a black rubber apron flap over the thighs (follow-through)
    rig.secondary("apron", "hips", (8.0, 0.0, 16.0), (10.0, 0.0, 5.0), max_deg=18, gain=1.2)
    g = Geo().blob((10.0, -1.0, 10.8), (2.0, 8.6, 6.4), p=2.6, taper=(1.1, 0.9))
    rig.part("apron", g, APRON, finish="gloss", outline=0.6)

    KI.head_face(rig, brow=I.HAIR_RED, brow_angry=True, mouth_dz=-8.8)
    I.ear(rig)
    g = Geo().blob((5.0, 0, 42.0), (9.8, 10.4, 5.6), p=2.2)   # short beard along the jaw
    g.clip((4.0, 0, 0), (-1, 0, 0)).clip((0, 0, 44.4), (0, 0, 1))
    rig.part("head", g, I.HAIR_RED, finish="hair", outline=0.5)
    # knitted watch cap: a tall soft crown slouched back, a cream rolled cuff, a pompom; big
    # brass goggles pushed up on the brow (they read at 1x)
    g = Geo().blob((-1.4, 0, 58.6), (11.6, 11.2, 10.0), p=2.3, shift=(-0.22, 0), rot=(0, -8, 0))
    g.clip((0, 0, 56.0), (0, 0, -1))
    rig.part("head", g, I.COAL_LT)
    g = Geo().sphere((-8.0, 0, 67.6), 3.4, cuts=3)                     # pompom
    rig.part("head", g, I.CREAM_DK, finish="hair")
    g = Geo().lathe([(12.0, 0), (12.6, 1.4), (12.2, 3.4), (11.5, 4.0)], (0.2, 0, 54.8), (0.2, 0, 58.8), segs=24)
    rig.part("head", g, team=True, outline=0.6)
    I.goggles(rig, at=(10.4, 0, 59.6), k=1.4, dy=(-5.2, 4.6))

    for s in ("r", "l"):
        I.arm_parts(rig, s, team_sleeve=True, fist=4.6, cuff=I.COAL_LT)
    I.shoulders(rig)

    # the harpoon gun (pivot at the shoulder)
    rig.joint("tube", "torso", PIVOT)
    g = Geo().capsule((T0 + 3, TY, TZ), (T1 - 2, TY, TZ), TR, TR + 0.3, segs=20)
    rig.part("tube", g, team=True)
    g = Geo()   # flared muzzle and the breech drum
    g.lathe([(TR - 0.2, 0), (TR + 1.4, 1.6), (TR + 2.2, 4.6), (TR + 1.0, 5.2), (TR - 1.0, 5.0)],
            (T1 - 3.5, TY, TZ), (T1 + 2, TY, TZ), segs=22)
    rig.part("tube", g, I.IRON_DK, finish="metal")
    g = Geo().lathe([(0, -4.0), (6.4, -4.0), (7.0, -2.4), (7.0, 2.4), (6.4, 4.0), (0, 4.0)],
                    (T0 + 1.0, TY, TZ), (T0 + 1.0, TY - 1, TZ), segs=22)
    rig.part("tube", g, I.IRON_DK, finish="metal")
    g = Geo()
    I.rivets(g, [(T0 + 1.0 + 5.0 * math.cos(a), TY - 4.2, TZ + 5.0 * math.sin(a))
                 for a in (i * math.pi / 3 for i in range(6))], r=0.9)
    rig.part("tube", g, I.BRASS_LT, finish="metal", outline=0)
    g = Geo().capsule((T0 + 1.0, TY - 4.6, TZ), (T0 - 3.0, TY - 6.6, TZ - 5.0), 0.9)   # crank
    g.sphere((T0 - 3.0, TY - 6.8, TZ - 5.0), 1.5, cuts=2)
    rig.part("tube", g, I.WOOD_LT, outline=0.5)
    g = Geo()   # copper bands
    for x in (-6.0, 8.0):
        g.lathe([(TR + 0.5, -1.4), (TR + 0.7, 0), (TR + 0.5, 1.4)], (x, TY, TZ), (x + 1, TY, TZ), segs=20)
    rig.part("tube", g, I.COPPER, finish="metal", outline=0.5)
    g = Geo().blob((-3.0, TY + 1.0, TZ - 4.4), (6.0, 2.6, 1.8), p=3.0)   # shoulder pad
    rig.part("tube", g, I.LEATHER, outline=0.6)
    g = Geo().capsule((GRIP[0], GRIP[1], TZ - TR), (GRIP[0] - 1.5, GRIP[1], GRIP[2]), 1.5)
    g.capsule((FORE[0], FORE[1], TZ - TR), (FORE[0] + 0.5, FORE[1], FORE[2] - 1.0), 1.4)
    rig.part("tube", g, I.WOOD, outline=0.6)
    # the harpoon: a shaft and a big barbed head out of the muzzle (hidden once fired)
    rig.joint("harpoon", "tube", (T1, TY, TZ))
    hx = T1 + 1.0
    g = Geo().capsule((T1 - 4.0, TY, TZ), (hx + HEAD_LEN * 0.4, TY, TZ), 1.2)
    rig.part("harpoon", g, I.IRON_DK, finish="metal", outline=0.6)
    tip = hx + HEAD_LEN
    pts = [(hx + HEAD_LEN * 0.35, TZ + 1.2), (hx + HEAD_LEN * 0.15, TZ + 5.2), (hx + HEAD_LEN * 0.55, TZ + 2.0),
           (tip, TZ), (hx + HEAD_LEN * 0.55, TZ - 2.0), (hx + HEAD_LEN * 0.15, TZ - 5.2),
           (hx + HEAD_LEN * 0.35, TZ - 1.2)]
    g = Geo().slab(pts, TY, 2.4)
    rig.part("harpoon", g, I.IRON_LT, finish="metal", outline=0.8)
    # the reel under the barrel, just ahead of the shoulder, with a crank the near hand can reach
    rx, rz = REEL
    g = Geo().lathe([(0, -3.4), (6.0, -3.4), (6.6, -2.6), (5.2, -1.8), (5.2, 1.8), (6.6, 2.6), (6.0, 3.4), (0, 3.4)],
                    (rx, TY, rz), (rx, TY - 1, rz), segs=22)
    rig.part("tube", g, I.IRON_DK, finish="metal", outline=0.7)
    g = Geo().lathe([(5.3, -1.7), (5.7, 0), (5.3, 1.7)], (rx, TY, rz), (rx, TY - 1, rz), segs=22)
    rig.part("tube", g, I.CREAM, finish="hair", outline=0.4)
    g = Geo().capsule((rx, TY, rz + 2.0), (rx, TY, TZ - TR), 1.2)
    rig.part("tube", g, I.IRON, finish="metal", outline=0.4)
    rig.joint("crank", "tube", (rx, TY - 4.0, rz))
    g = Geo().capsule((rx, TY - 4.0, rz), (rx + CRANK_R, TY - 4.2, rz), 1.0)
    g.sphere((rx, TY - 4.0, rz), 1.6, cuts=2)
    g.capsule((rx + CRANK_R, TY - 4.2, rz), (rx + CRANK_R, TY - 7.4, rz), 1.4)
    rig.part("crank", g, I.WOOD_LT, outline=0.5)
    # the cable snaking out after the harpoon on the shot (hidden)
    rig.joint("cable", "tube", (T1 + 2.0, TY, TZ), hidden=True)
    g = Geo()
    pts = [(T1 + 2.0 + 3.0 * k, TY - 0.5, TZ + 2.6 * math.sin(k * 1.1) * min(1.0, k / 3.0)) for k in range(15)]
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 0.9)
    rig.part("cable", g, I.CREAM, finish="hair", outline=0.5)
    # the rope from the breech back to the coil
    g = Geo()
    rpts = [(T0 + 2.0, TY + 2.0, TZ - 2.0), (T0 - 2.0, TY + 6.0, TZ - 6.0), (-10.0, -2.0, 28.0)]
    for a, b in zip(rpts, rpts[1:]):
        g.capsule(a, b, 0.8)
    rig.part("tube", g, I.CREAM_DK, outline=0.4)
    rig.track("muzzle", "tube", MUZZLE)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))
    I.muzzle_flash(rig, "tube", (T1 + 3, TY, TZ), size=1.7)
    rig.joint("smoke", "root", (T1 + 14, -20, TZ + 4), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 5.2), (6, 3, 4.2), (-4, 6, 4.0), (3, 8, 3.4), (10, -1, 3.2)):
        g.sphere((T1 + 14 + dx, -20, TZ + 4 + dz), r, cuts=4)
    rig.part("smoke", g, I.SMOKE, finish="dust", outline=0.8)


def _world(p, deg, dx, dz):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    x, z = p[0] - PIVOT[0], p[1] - PIVOT[2]
    return (PIVOT[0] + dx + x * c - z * s, PIVOT[2] + dz + x * s + z * c)


def aim(deg, dx=0.0, dz=0.0, crank=None):
    """Gun pointing `deg` (pivot shifted dx, dz); the far hand on the front grip, the near hand
    on the pistol grip, or (crank = angle) on the reel crank's knob."""
    pose = {"tube": {"r": deg, "x": dx, "z": dz}}
    if crank is None:
        gx, gz = _world((GRIP[0], GRIP[2]), deg, dx, dz)
        a, f = I.ik2(I.SH, (gx - 0.4, gz + 0.8))
    else:
        rx, rz = REEL
        ang = math.radians(crank)
        kx, kz = rx + CRANK_R * math.cos(ang), rz + CRANK_R * math.sin(ang)
        gx, gz = _world((kx, kz), deg, dx, dz)
        a, f = I.ik2(I.SH, (gx - 0.4, gz + 0.4))
        pose["crank"] = {"r": crank}
        pose["arm_r_y"] = None
    pose.update(I.arm("r", a, f))
    if pose.pop("arm_r_y", 0) is None:     # bring the cranking arm in front of the barrel
        pose["arm_r"]["y"] = -7.0
    fx_, fz = _world((FORE[0], FORE[2]), deg, dx, dz)
    a, f = I.ik2(I.SH, (fx_ - 0.6, fz))
    pose.update(I.arm("l", a, f))
    return pose


STANCE = merge(aim(9.0), {"hips": {"z": -0.5}})


def _idle(f):
    # the gun rests on the shoulder; he gives the reel a lazy half turn (2-4), weight shift, blink
    turn = [0.0, 0.0, 60.0, 150.0, 210.0, 0.0][f]

    def extra(ctx):
        return {"tube": {"r": 1.5 * ctx["lag"]}}
    base = merge(aim(9.0, crank=turn if 0 < f < 5 else None), {"hips": {"z": -0.5}})
    pose = M.idle_v2(f, base, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)
    if f in (2, 3, 4):
        pose = merge(pose, {"head": {"r": -4.0}, "pupils": {"z": -0.6}})
    return pose


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"tube": {"r": -2.5 * lag, "z": 0.6 * lag}, "apron": {"r": 3 * lag}}
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=30.0, knee=58.0, lift_lu=6.5, bob_pct=0.07, lean=-6.0,
                     arms=(), bow=5.0, heavy_down=1.3, extra=extra)


# 10 unique frames in 824 ms; the shot on frame 3 at 291 ms (impactAt 0.3532, as shipped)
ATTACK_MS = [50, 70, 171, 70, 90, 70, 70, 70, 80, 83]
ATTACK_IMPACT = 3
#       brace aim HOLD FIRE kick crank crank crank seat settle
DEG = [4.0, 1.0, 0.0, 0.0, 16.0, 6.0, 6.0, 6.0, 9.0, 9.0]
DX = [0.0, 0.6, 1.0, 1.0, -3.5, -1.5, -1.0, -0.8, -0.3, 0.0]
DZ = [-0.5, 0.0, 0.0, 0.0, 1.2, -0.6, -0.6, -0.6, 0.0, 0.0]
CRANK = [None, None, None, None, None, 90.0, 270.0, 450.0, None, None]
BX = [0.0, 0.8, 1.2, 0.0, -5.0, -3.0, -2.5, -2.0, -1.0, 0.0]
BQ = [-0.05, -0.07, -0.09, 0.03, -0.12, -0.02, -0.04, -0.02, 0.0, 0.0]
HZ = [-2.0, -2.4, -3.0, -3.0, -3.4, -1.6, -1.6, -1.6, -0.8, -0.5]
TRS = [-3, -4, -6, -6, 5, 2, 3, 2, 0, 0]


def _attack_pose(f):
    pose = merge(aim(DEG[f], DX[f], DZ[f], crank=CRANK[f]), {
        "hips": {"z": HZ[f]},
        "torso": {"r": TRS[f]},
        "head": {"r": [-3, -6, -9, -9, 4, -4, -4, -4, 0, 0][f], "x": [0, 0.6, 1.2, 1.2, 0, 0, 0, 0, 0, 0][f]},
        "thigh_r": {"r": [12, 15, 18, 18, 12, 10, 10, 10, 6, 2][f]},
        "shin_r": {"r": [-10, -12, -16, -16, -12, -8, -8, -8, -4, 0][f]},
        "thigh_l": {"r": [-14, -16, -20, -20, -24, -14, -14, -14, -8, -4][f]},
        "shin_l": {"r": [-6, -8, -10, -10, -10, -8, -8, -8, -4, 0][f]},
        "flash": {"show": f == 3},
        "harpoon": {"hide": f in (3, 4, 5, 6, 7)},
        "cable": {"show": f in (3, 4), "sx": [1, 1, 1, 1.0, 1.35, 1, 1, 1, 1, 1][f]},
        "smoke": {"show": f in (3, 4, 5), "s": [1, 1, 1, 0.7, 1.0, 1.25, 1, 1, 1, 1][f],
                  "x": [0, 0, 0, 0, 3, 7, 0, 0, 0, 0][f], "z": [0, 0, 0, 0, 1, 5, 0, 0, 0, 0][f]},
        "apron": {"r": [0, 0, 0, 0, 8, 0, 0, 0, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=BX[f], q=BQ[f]))
    if f in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif f in (3, 4):
        pose = merge(pose, F.expr("yell", "squeeze"))
    elif f in (5, 6, 7):
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_clip():
    ov = {
        3: [{"kind": "burst", "joint": "tube", "point": MUZZLE, "r0_lu": 9.0, "r1_lu": 15.0, "n": 6,
             "a0": -70.0, "arc": 140.0},
            {"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 51, "spread": 0.8,
             "dir": -1.0}],
        4: [{"kind": "dust", "ground": (-18.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 52, "spread": 1.1,
             "dir": -1.0}],
        5: [{"kind": "rings", "joint": "crank", "point": (REEL[0], TY - 4.0, REEL[1]), "radii_lu": (8.0,),
             "a0": 200.0, "a1": 340.0, "color": "#FFF4D6"}],
        6: [{"kind": "arc", "joint": "crank", "inner": (REEL[0], TY - 3.6, REEL[1]),
             "outer": (REEL[0] + CRANK_R + 1.0, TY - 5.0, REEL[1]), "color": I.WOOD_LT, "white": 0.4,
             "band": 0.45, "taper": 0.3, "lines": 1, "from": 5, "t0": 0.0, "t1": 1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=ov)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 10 * a}, "tube": {"r": 10 * a},
                "thigh_r": {"r": 20 * max(a, 0)}, "shin_r": {"r": -24 * max(a, 0)},
                "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(aim([20, 40, 60, 40, -40, -80, -85, -90, -90, -90][k]), M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
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
    return M.check_contract(cl, attack_ms=824, attack_impact_at=0.3532)
