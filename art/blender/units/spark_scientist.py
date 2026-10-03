"""Spark Scientist: Industrial Age epic Caster (CONTENT_PLAN 5.5). Coil gun (fx.coil_arc), chain 2, ~68 lu.

Look (A11, Industrial palette): a wiry inventor with wild white hair standing on end, round brass
goggles pushed up on his forehead, a long team lab coat (cream cog on the skirt, brass buttons, coat
tails), a cream shirt and bow tie, grey trousers, rubber boots and thick rubber gloves. He aims a
two-handed coil gun: a brass stock, a copper coil wound round the barrel, two glass insulator bulbs
and a forked emitter that crackles with small mint-white sparks (A11 colour rule: never saturated).

"A viewer expects him to aim the crackling coil gun and zap, the arc jumping to a second foe, and to
shuffle along hurriedly in his lab coat."

Animation (ANIM_SPEC G1, appendix B for a gun: aimed shot, kneeling shot):
  idle      taps a bulb, sparks crackle at the emitter, his hair twitches, blink
  walk      walk v3 bounce jog at ground speed (card 60 x 1.25 = 75 lu/s), the coil gun at port
            arms, the coat tails flapping
  attack    CHARGED ZAP: snaps the gun up and squints (the held extreme, the coils charge in a hold
            loop), ZAP (a flash and sparks at the emitter; the arc is the shared effect), the gun
            kicks up and vents, back to port arms
  attack_b  KNEELING ZAP: drops to one knee, aims, zaps, rides the kick, rises
  hit       light: the head snaps back, the hair stands up
  die       D1 fling and spin: the goggles pop off, X eyes and tongue, his hair frizzed
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "spark_scientist"
GAIT_NAME = "biped"
NAME = "Spark Scientist"
HEIGHT_LU = 68
CANVAS = (296, 236)
FEET = (108, 208)
ANCHORS = {"head": (2, 67), "hitCenter": (0, 32), "muzzle": (54, 36)}
NO_RETIME = True

G0 = (4.0, -15.0, 27.0)     # carbine grip at rest (character space)
FORE = 12.0
LENGTH = 38.0
HAT_C = (1.0, 0.0, 56.0)
WHITE = "#ECE6DA"
RUBBER = "#3E3B3C"
COPPER = "#A87A5E"
SPARK = "#E6FFF2"
GREY = "#7E7C78"


RIG = None


def _gun(rig, joint, grip, length):
    gx, gy, gz = grip
    g = Geo().blob((gx - 7.0, gy, gz - 2.0), (7.4, 2.2, 3.4), p=2.8, rot=(0, 16, 0), taper=(1.0, 0.75))
    rig.part(joint, g, I.BRASS, finish="metal", outline=0.7)               # stock
    g = Geo().capsule((gx + 2.0, gy, gz + 1.0), (gx + length - 4.0, gy, gz + 1.0), 2.0, 1.6)
    rig.part(joint, g, I.IRON_DK, finish="metal", outline=0.8)            # barrel
    g = Geo()
    for k in range(6):                                                    # the copper coil
        x = gx + 8.0 + k * 3.2
        g.lathe([(2.6, 0), (2.9, 0.8), (2.6, 1.6)], (x, gy, gz + 1.0), (x + 1.6, gy, gz + 1.0), segs=14)
    rig.part(joint, g, COPPER, finish="metal", outline=0.4)
    g = Geo()
    for x in (gx + 4.0, gx + 14.0):                                       # glass insulator bulbs
        g.sphere((x, gy - 0.4, gz + 5.0), 2.0, cuts=3)
    rig.part(joint, g, I.GLASS, finish="gloss", outline=0.5)
    g = Geo()
    for dz in (-2.2, 2.2):                                                # forked emitter
        g.capsule((gx + length - 4.0, gy, gz + 1.0 + dz * 0.5), (gx + length, gy, gz + 1.0 + dz), 0.8, 0.6)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.5)
    rig.joint("lever", joint, (gx + 1.0, gy, gz - 1.0))                    # the charge dial
    g = Geo().blob((gx + 1.0, gy - 1.6, gz - 2.4), (1.6, 1.0, 1.6), p=2.4)
    rig.part("lever", g, I.BRASS_LT, finish="metal", outline=0.4)
    return (gx + length + 1.0, gy, gz + 1.0)


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=GREY, boot=RUBBER)
    I.long_coat(rig, tail_len=6.0, long=True, hem_z=13.0, skirt_z=10.0)
    skirt = Geo().blob((0.4, 0, 12.0), (11.9, 10.9, 5.0), p=2.6)
    sface = F.Face(rig, "hips", [skirt])
    g = KI.cog(sface, Geo(), (5.0, 11.6), s=0.85)
    rig.part("hips", g, KI.CREAM, highlight=False, outline=0)
    g = Geo().lathe([(7.2, 0), (7.8, 1.6), (7.4, 3.0)], (1.2, 0, 36.2), (1.2, 0, 39.2), segs=18)
    rig.part("torso", g, I.CREAM, outline=0.6)                            # shirt collar
    g = Geo().blob((8.8, -1.6, 36.8), (1.6, 3.2, 1.6), p=2.4)
    rig.part("torso", g, I.COAL_LT, outline=0.4)                          # bow tie

    KI.head_face(rig, brow=WHITE, brow_angry=False, mouth_dz=-9.2)
    I.moustache(rig, WHITE, curl=False, big=0.9)
    rig.secondary("hair", "head", (-4.0, 0, 52.0), (-6.0, 0, 60.0), max_deg=20, gain=1.4)
    g = Geo()
    for dy, dz, rot in ((-8.0, 56.0, 30), (0.0, 59.0, 0), (8.0, 56.0, -30), (-4.0, 58.0, 15), (4.0, 58.0, -15)):
        g.blob((-5.0, dy, dz - 1.0), (2.8, 2.2, 4.0), p=2.0, rot=(rot, -30, 0))
    g.blob((-7.0, 0, 49.0), (4.6, 9.8, 5.2), p=2.2)
    rig.part("hair", g, WHITE, finish="hair")
    I.ear(rig)
    rig.joint("hat", "head", HAT_C)
    I.goggles(rig, at=(10.4, 0, HAT_C[2] + 0.4), joint="hat", rim=I.BRASS_LT)
    KI.loose(rig, "hat_loose", HAT_C, lambda j: I.goggles(rig, at=(10.4, 0, HAT_C[2] + 0.4), joint=j, rim=I.BRASS_LT))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=None, team_sleeve=True, hand=RUBBER, fist=4.6, cuff=I.CREAM, glove_finish="gloss")
    I.shoulders(rig)

    rig.joint("gun", "torso", G0)
    muzzle = _gun(rig, "gun", G0, LENGTH)
    rig.track("muzzle", "gun", muzzle)
    rig.joint("flash", "gun", muzzle, hidden=True)
    g = Geo().blob((muzzle[0] + 3.0, muzzle[1] - 1, muzzle[2]), (4.6, 1.6, 4.0), p=1.8)
    rig.part("flash", g, glow=SPARK, outline=0)
    g = Geo().blob((muzzle[0] + 2.0, muzzle[1] - 2, muzzle[2]), (2.0, 1.0, 1.8), p=1.8)
    rig.part("flash", g, glow="#FFFFFF", outline=0)
    rig.joint("smoke", "gun", muzzle, hidden=True)
    g = Geo()
    for dx, dz, r in ((4.0, 1.0, 2.6), (7.0, 3.0, 2.0), (2.0, 4.0, 1.8)):
        g.sphere((muzzle[0] + dx, muzzle[1] - 2, muzzle[2] + dz), r, cuts=3)
    rig.part("smoke", g, I.STEAM, finish="dust", outline=0.6)
    rig.joint("casing", "root", (G0[0] + 2, G0[1] - 2, G0[2] + 7), hidden=True)
    g = Geo().sphere((G0[0] + 2.0, G0[1] - 3, G0[2] + 7.0), 1.2, cuts=2)
    rig.part("casing", g, glow=SPARK, outline=0)
    I.fuse_spark(rig, "gun", (muzzle[0] - 1.0, muzzle[1] - 1.0, muzzle[2] + 2.0), size=1.4, name="crackle")
    MUZ.append(muzzle)


MUZ = []
PORT = (4.0, 27.0, 52.0)     # port arms: the carbine held diagonally across the chest


def hold(gx, gz, deg):
    return I.hold2("gun", G0, FORE, gx, gz, deg)


STANCE = merge(hold(*PORT), {"torso": {"r": -2.0}})


def _idle(f):
    # tips his hat: the far hand leaves the fore-end (1), touches the brim and dips it (2-3), back (4-5)
    tip = [0.0, 0.5, 1.0, 1.0, 0.4, 0.0][f]

    def extra(ctx):
        return {}
    pose = M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=3)
    if tip > 0:
        a, fo = I.ik2(I.SH, (9.0, 55.0))
        la, lf = pose["arm_l"]["r"] - 90.0, pose["fore_l"]["r"] + pose["arm_l"]["r"] - 90.0
        na, nf = la + (a - la) * tip, lf + (fo - lf) * tip
        pose.update(I.arm("l", na, nf))
        pose["hat"] = {"r": -9 * tip, "z": -0.8 * tip, "x": 0.8 * tip}
        pose["head"] = dict(pose.get("head", {}), r=pose.get("head", {}).get("r", 0.0) - 4 * tip)
        if f in (2, 3):
            pose = merge(pose, F.expr("blink" if f == 3 else "grit"))
    return pose


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 77 ms --------------
SPEED = 75.0
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=640)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(hold(PORT[0], PORT[1] + 0.9 * lag, PORT[2] - 4.0 * lag),
                     {"hair": {"r": -4.0 * lag}, "coattail": {"r": 6 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2.0}}, GAIT, legs=LEGS, lean=-10.0, twist=7.0, nod=3.0,
                     extra=extra, report=report)


# 11 unique frames in 765 ms; impact (fire) on frame 4 at 291 ms (impactAt 0.3804, as shipped). The
# shipped 191 ms hold is split into the hold (130) and a wobble partner (61) for the holdLoop.
ATTACK_MS = [40, 60, 130, 61, 60, 70, 60, 50, 70, 80, 84]
ATTACK_IMPACT = 4
U_OF = [0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9]     # unique frame -> row of the pose tables below
#       raise snap HOLD FIRE kick flip snap down settle settle
GX = [5.0, 5.0, 5.0, 5.0, 2.5, 3.0, 3.0, 4.0, 4.5, 4.0]
GZ = [30.0, 33.0, 33.0, 33.0, 35.0, 37.0, 38.0, 32.0, 28.0, 27.0]
DEG = [18.0, 4.0, 0.0, 0.0, 16.0, 78.0, 86.0, 46.0, 50.0, 52.0]
LEVER = [0, 0, 0, 0, 0, 62, 6, 0, 0, 0]
BX = [0.0, 0.5, 1.0, 0.0, -3.5, -2.0, -1.0, -0.5, 0.0, 0.0]
BQ = [0.0, -0.03, -0.06, 0.03, -0.10, 0.05, 0.02, -0.02, 0.0, 0.0]
BZ = [0.0, -0.5, -1.2, -1.2, -0.8, 1.2, 0.8, 0.0, 0.0, 0.0]
TR = [-2, -4, -5, -5, 5, 4, 2, 0, -1, -2]
HR = [-2, -7, -10, -9, 5, 6, 4, 0, 0, 0]
CAS = [None, None, None, None, None, (-3, 4, 60), (-9, 13, 200), (-15, 10, 330), (-19, -2, 420),
       None]


def _attack_pose(f, kneel=None):
    wob = f == 3
    f = U_OF[f]
    pose = merge(hold(GX[f], GZ[f] + (0.7 if wob else 0.0), DEG[f] + (1.8 if wob else 0.0)), {
        "torso": {"r": TR[f]},
        "head": {"r": HR[f], "x": 1.2 if f in (1, 2, 3) else 0.0},
        "hair": {"r": [0, 0, 4, 6, -10, -6, -2, 0, 0, 0][f]}, "crackle": {"show": f in (1, 2, 3)},
        "thigh_r": {"r": [4, 10, 14, 14, 10, 8, 6, 4, 2, 0][f]},
        "shin_r": {"r": [0, -4, -8, -8, -6, -2, -2, 0, 0, 0][f]},
        "thigh_l": {"r": [-4, -10, -14, -16, -16, -12, -10, -6, -4, -2][f]},
        "shin_l": {"r": [0, -2, -6, -6, -4, 0, 0, 0, 0, 0][f]},
        "lever": {"r": LEVER[f]},
        "flash": {"show": f == 3},
        "smoke": {"show": f == 4, "s": 1.1},
    }, M.body_about((0, 0, 22), x=BX[f], z=BZ[f], q=BQ[f]))
    if CAS[f] is not None:
        x, z, r = CAS[f]
        pose["casing"] = {"show": True, "x": x, "z": z, "r": r}
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0 - (0.4 if wob else 0.0)}})
    if f in (5, 6):
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_clip():
    muz = MUZ[0] if MUZ else (G0[0] + LENGTH + 1.0, G0[1], G0[2] + 2.6)
    flip = {"kind": "arc", "joint": "gun", "inner": (G0[0] + 16.0, G0[1], G0[2] + 2.4), "outer": muz,
            "color": SPARK, "white": 0.4, "taper": 0.2, "lines": 2}
    ov = {
        6: [dict(flip, **{"from": 5, "t0": 0.0, "t1": 0.9})],
        4: [{"kind": "burst", "joint": "gun", "point": muz, "r0_lu": 8.0, "r1_lu": 14.0, "n": 7,
             "a0": -80.0, "arc": 160.0, "color": SPARK}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=ov, extra={"holdStep": 2, "holdLoop": [2, 3]})


# -- attack B: kneeling aimed shot (ANIM_SPEC appendix B) ----------------------------------------
# unique frames: 0 = A raise, 1 drop, 2 HOLD (kneeling, the carbine at his shoulder, squinting),
# 3 wobble (holdLoop), 4 FIRE, 5 kick, 6 lever down (a casing flies), 7 lever home, 8 rising,
# 9 = A settle, 10 = A settle
#        drop HOLD wob  FIRE kick lever home rise
KB_DROP = [7.0, 14.0, 14.0, 14.0, 13.5, 14.0, 14.0, 7.0]
KB_GX = [5.0, 6.0, 6.0, 6.0, 3.5, 5.0, 5.0, 4.5]
KB_GZ = [31.0, 34.0, 34.6, 34.0, 35.5, 33.5, 33.5, 30.0]
KB_DEG = [10.0, 2.0, 3.6, 2.0, 20.0, 6.0, 4.0, 36.0]
KB_LEVER = [0, 0, 0, 0, 0, 64, 4, 0]
KB_TR = [-6, -8, -8, -8, 4, -4, -6, -2]
KB_HR = [-6, -10, -11, -10, 6, -2, -4, 0]
KB_BX = [0.5, 1.0, 1.0, 0.0, -3.0, -1.0, -0.5, 0.0]
KB_BQ = [-0.04, -0.06, -0.06, 0.04, -0.10, 0.02, 0.0, 0.0]
KB_CAS = [None, None, None, None, None, (-3, 3, 60), (-10, 9, 200), (-16, 0, 330)]
KB_FRONT = [8.0, 12.5, 12.5, 12.5, 12.0, 12.5, 12.5, 7.0]


def _b_pose(i):
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    pose = merge(hold(KB_GX[k], KB_GZ[k], KB_DEG[k]), {
        "torso": {"r": KB_TR[k]},
        "head": {"r": KB_HR[k], "x": 1.2 if k in (1, 2, 3) else 0.0},
        "hair": {"r": [0, 4, 6, 6, -10, -4, -1, 0][k]}, "crackle": {"show": k in (1, 2, 3)},
        "lever": {"r": KB_LEVER[k]},
        "flash": {"show": k == 3, "s": 0.8 if k == 3 else 1.0},
        "smoke": {"show": k == 4, "s": 0.9},
    }, M.body_about((0, 0, 22), x=KB_BX[k], q=KB_BQ[k]))
    if KB_CAS[k] is not None:
        x, z, r = KB_CAS[k]
        pose["casing"] = {"show": True, "x": x, "z": z - KB_DROP[k], "r": r}
    pose = KI.kneel(RIG, pose, LEGS, drop=KB_DROP[k], front=KB_FRONT[k])
    if k in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0 - (0.4 if k == 2 else 0.0)}})
    elif k in (5, 6):
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_b():
    muz = MUZ[0] if MUZ else (G0[0] + LENGTH + 1.0, G0[1], G0[2] + 2.6)
    ov = {
        4: [{"kind": "burst", "joint": "gun", "point": muz, "r0_lu": 8.0, "r1_lu": 13.0, "n": 5,
             "a0": -60.0, "arc": 120.0},
            {"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 21, "spread": 0.7,
             "dir": -1.0}],
        6: [{"kind": "arc", "joint": "lever", "inner": (G0[0] + 1.0, G0[1], G0[2] - 2.0),
             "outer": (G0[0] + 3.0, G0[1], G0[2] - 7.0), "color": I.IRON_LT, "white": 0.4, "taper": 0.3,
             "lines": 1, "from": 5, "t0": 0.0, "t1": 1.0}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 2, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return merge(hold(PORT[0], PORT[1], PORT[2] + 16 * a) if a > 0 else {},
                     {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                      "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                      "hair": {"r": 20 * max(a, 0)}, "brow": {"z": 1.6 * max(a, 0)}})
    base = {"torso": {"r": -2.0}} if M.HIT_AMT[k] > 0 else STANCE
    return M.hit_light(k, base, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


HAT_PATH = KI.hat_pop(land=55.0, back=60.0)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(hold(PORT[0], PORT[1], PORT[2] + 30 * flail), M.die_d1(k, center_z=28.0, lie_z=11.0,
                                                                         height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_l": {"r": 60 * flail}, "fore_l": {"r": 30 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
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
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=765, attack_impact_at=0.3804))
