"""Nova Thrower: Cosmic Age common ranged, Thrower (CONTENT_PLAN 5.8). A lobbed nova orb, splash r30, ~68 lu.

Look (A11, Cosmic palette): a light legion trooper in the void undersuit and violet armour, the legion dome
helmet (team brow band and crest, a dark visor with light violet eyes that act), a team chest plate with the
pale star, team shoulder pads and team greaves. A star-white bandolier across the chest carries three small
nova orbs in cups, a violet canister on the back holds more. In the near hand he cups a nova orb: a violet
glow ball with a white-hot core and a ring of tiny sparks.

"A viewer expects a grenadier of the stars: he cups a glowing orb, the glow builds, and he lobs it in a high
underhand arc; or he winds up and bowls it overhand."

Animation (ANIM_SPEC G1 jog at card 65 x 1.25 = 81.25 lu/s, appendix B throwers; the sim fires every 1.25 s):
  idle      tosses the orb up a hand's breadth and catches it, the visor glances, a blink
  walk      walk v3 jog with the orb tucked at the hip in the near hand, the free arm pumping
  attack    UNDERHAND LOB: a deep crouch with the orb cupped low behind the hip, the glow building (rings, the
            held extreme), a big swing forward and up, the orb leaves the hand high (a star flash)
  attack_b  OVERHAND BOWL: the orb cocked high behind the helmet, leaning back on the rear leg (the held
            extreme), a step and an overhand whip, the release in front of the face
  hit       light: the head snaps back, the orb flares, eyes > <
  die       D1 fling and spin, the orb pops in a puff, X eyes
"""
import math

from ageborn_art import kit_cosmic_wave as CW
from ageborn_art import kit_future as KF
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "nova_thrower"
GAIT_NAME = "biped"
NAME = "Nova Thrower"
HEIGHT_LU = 68
CANVAS = (300, 256)
FEET = (130, 222)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (14, 50)}
NO_RETIME = True

HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
ORB = (HR[0] + 1.6, HR[1] - 2.4, HR[2] + 2.0)


def _orb(rig, joint, c, r=4.4, glow=True):
    x, y, z = c
    g = Geo().sphere(c, r, cuts=4)
    rig.part(joint, g, glow=CW.MINT, outline=1.0, outline_hex="#1C8A6A")
    g = Geo().sphere((x - 0.6, y - r * 0.6, z + 0.6), r * 0.55, cuts=3)
    rig.part(joint, g, glow=CW.MINT_CORE, outline=0)
    if glow:
        g = Geo()
        for a in (30, 150, 270):
            px, pz = x + (r + 1.6) * math.cos(math.radians(a)), z + (r + 1.6) * math.sin(math.radians(a))
            g.star((px, y - 1.0, pz), 1.4, 0.55, 0.6, points=4)
        rig.part(joint, g, glow=CW.MINT_CORE, outline=0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    CW.trooper(rig, helmet_kind="dome", team_shin=True, pack=False)
    # the bandolier across the chest with three cupped orbs, a canister on the back
    g = Geo()
    for i in range(7):
        t0, t1 = i / 7, (i + 1) / 7
        p0 = (9.0 - 14.0 * t0, -9.8 + 0.8 * t0, 38.0 - 16.0 * t0)
        p1 = (9.0 - 14.0 * t1, -9.8 + 0.8 * t1, 38.0 - 16.0 * t1)
        g.capsule(p0, p1, 1.5, segs=8, rings=2)
    rig.part("torso", g, CW.STAR, finish="gloss", outline=0.6, outline_hex=CW.STAR_TRIM)
    for t in (0.22, 0.5, 0.78):
        p = (9.0 - 14.0 * t + 0.8, -11.0, 38.0 - 16.0 * t)
        g = Geo().blob(p, (1.8, 1.0, 1.8), p=2.4)
        rig.part("torso", g, CW.VOID_LT, outline=0.5)
        _orb(rig, "torso", (p[0] + 0.4, p[1] - 0.8, p[2] + 0.8), r=1.5, glow=False)
    g = Geo().blob((-11.4, 0, 30.0), (4.0, 6.6, 7.6), p=3.4)
    rig.part("torso", g, CW.VIOLET_DK, finish="gloss")
    g = Geo().blob((-11.8, 0, 36.8), (3.8, 6.0, 1.6), p=3.0)
    rig.part("torso", g, team=True, outline=0.6)
    g = Geo().sphere((-14.8, -2.6, 30.0), 2.0, cuts=3)
    rig.part("torso", g, glow=CW.MINT, outline=0.8, outline_hex="#1C8A6A")
    # the orb in the near hand (hidden on the release frame) and its building glow
    rig.joint("orb", "hand_r", ORB)
    _orb(rig, "orb", ORB)
    rig.joint("charge", "orb", ORB, hidden=True)
    g = Geo().sphere((ORB[0], ORB[1] - 1.0, ORB[2]), 6.0, cuts=4)
    rig.part("charge", g, glow=CW.MINT_CORE, outline=1.2, outline_hex=CW.MINT)
    rig.track("muzzle", "orb", ORB)
    K.star_burst(rig, "hand_r", (ORB[0] + 2.0, ORB[1], ORB[2]), size=1.0, name="flash", color=CW.MINT, core=CW.MINT_CORE)
    rig.joint("pop", "root", (0, 0, 30), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 4.0), (4.0, 2.0, 3.0), (-3.0, 3.0, 2.8)):
        g.sphere((dx, -14.0, 30.0 + dz), r, cuts=3)
    rig.part("pop", g, glow=CW.MINT_CORE, outline=1.0, outline_hex=CW.MINT)


def arms(hand, far=(-4.0, 22.0)):
    a, f = K.ik2(K.SH, hand)
    la, lf = K.ik2(K.SH, far)
    return merge(K.arm("r", a, f), K.arm("l", la, lf))


REST = (5.0, 24.0)
STANCE = merge(arms(REST, (-3.0, 23.0)), {"torso": {"r": -2.0}})


def _idle(f):
    toss = [0.0, 0.0, 0.5, 1.0, 0.4, 0.0][f]
    pose = M.idle_v2(f, STANCE, frames=6, blink=5, face_blink=KF.glyph("g_blink"))
    pose = merge(pose, arms((REST[0] + 0.5 * toss, REST[1] + 1.0 * toss), (-3.0, 23.0)),
                 {"orb": {"z": 6.0 * math.sin(math.pi * toss / 1.0) if toss else 0.0}, "head": {"r": [0, 2, 6, 8, 4, 0][f]}})
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 81.25
LEGS = CW.KC.legs_ik()
GAIT = CW.KC.jog_gait(LEGS, SPEED, cycle_ms=640, stance=0.52, lift=5.0)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        a, fo = K.ik2(K.SH, (2.0, 22.5 + 0.8 * lag))
        return merge(K.arm("r", a, fo), {"orb": {"z": -0.8 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -3.0}}, GAIT, legs=LEGS, lean=-9.0, twist=6.0, nod=3.0,
                     arms={"l": CW.KC.ArmChain("l")}, extra=extra, report=report)


# -- attack: underhand lob (900 ms, the orb leaves at 540 ms) ------------------------------------------
ATTACK_MS = [60, 80, 100, 210, 50, 40, 110, 80, 80, 90]
ATTACK_IMPACT = 6
A_H = [(5, 24), (-2, 24), (-8, 25), (-11, 27), (-4, 23), (7, 25), (12, 34), (11, 33), (8, 28), (5, 24)]
A_T = [-2, -8, -12, -14, -8, 2, 10, 8, 2, -2]
A_BX = [0.0, -1.0, -2.0, -2.6, -0.5, 1.5, 3.0, 3.0, 1.0, 0.0]
A_BZ = [0.0, -3.0, -6.0, -7.5, -5.0, -2.0, 1.0, 0.5, 0.0, 0.0]
A_BQ = [0.0, -0.04, -0.08, -0.10, -0.02, 0.04, 0.06, 0.02, 0.0, 0.0]
A_FAR = [(-3, 23), (6, 26), (9, 28), (10, 30), (6, 28), (-2, 25), (-6, 22), (-6, 22), (-4, 22), (-3, 23)]
A_EYES = ["eyes", "g_angry", "g_angry", "g_squint", "g_angry", "g_wide", "g_happy", "g_happy", "eyes", "eyes"]


def _a_pose(f):
    pose = merge(arms(A_H[f], A_FAR[f]), {
        "torso": {"r": A_T[f]}, "head": {"r": -0.6 * A_T[f]},
        "charge": {"show": f in (2, 3, 4)}, "orb": {"show": f not in (6, 7), "s": [1, 1, 1.1, 1.2, 1.15, 1.1, 1, 1, 0.7, 1][f]},
        "flash": {"show": f == 6},
        "thigh_r": {"r": [2, 14, 24, 28, 22, 10, 0, 0, 2, 2][f]}, "shin_r": {"r": [0, -10, -20, -24, -18, -6, 0, 0, 0, 0][f]},
        "thigh_l": {"r": [-2, -10, -16, -18, -14, -10, -8, -6, -4, -2][f]}, "shin_l": {"r": [0, -10, -18, -22, -18, -8, 0, 0, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_BX[f], z=A_BZ[f], q=A_BQ[f]))
    return KI.ground_feet(RIG, merge(pose, KF.glyph(A_EYES[f])), LEGS)


def _swing(frm):
    return {"kind": "arc", "joint": "orb", "inner": (ORB[0] - 4.0, ORB[1], ORB[2]), "outer": ORB, "color": CW.MINT,
            "white": 0.35, "taper": 0.3, "lines": 2, "from": frm, "t0": 0.0, "t1": 1.0}


def _attack_clip():
    ov = {2: CW.rings_fx("orb", ORB, (6.0, 9.0), CW.MINT_CORE, -180.0, 180.0),
          3: CW.rings_fx("orb", ORB, (7.0, 10.5), CW.MINT_CORE, -180.0, 180.0),
          4: [_swing(3)], 5: [_swing(4)],
          6: CW.fire_fx("hand_r", (ORB[0] + 2.0, ORB[1], ORB[2]), CW.MINT_CORE, a0=-30.0) + CW.dust_fx(14.0, 361)}
    return M.clip("attack", [_a_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 3})


# -- attack B: overhand bowl -----------------------------------------------------------------------
B_H = [(5, 24), (0, 34), (-6, 42), (-8, 44), (2, 47), (10, 44), (14, 37), (13, 35), (8, 28), (5, 24)]
B_T = [-2, 4, 10, 14, 4, -8, -16, -14, -6, -2]
B_BX = [0.0, -1.0, -2.0, -2.6, 0.0, 2.5, 4.5, 4.5, 2.0, 0.0]
B_BZ = [0.0, 0.5, 1.0, 1.4, 0.0, -1.5, -3.0, -2.5, -1.0, 0.0]
B_FAR = [(-3, 23), (8, 30), (12, 33), (13, 34), (8, 30), (0, 24), (-7, 21), (-7, 21), (-4, 22), (-3, 23)]
B_THR = [2, -6, -12, -14, 4, 20, 30, 28, 12, 2]
B_SHR = [0, -4, -6, -8, -10, -18, -22, -20, -8, 0]
B_THL = [-2, 8, 14, 16, 4, -12, -20, -18, -8, -2]
B_SHL = [0, -10, -16, -18, -12, -8, -6, -6, -2, 0]
B_EYES = ["eyes", "g_angry", "g_angry", "g_squint", "g_angry", "g_wide", "g_happy", "g_happy", "eyes", "eyes"]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    pose = merge(arms(B_H[f], B_FAR[f]), {
        "torso": {"r": B_T[f]}, "head": {"r": -0.5 * B_T[f]},
        "charge": {"show": f in (2, 3)}, "orb": {"show": f not in (6, 7), "s": 1.15 if f in (2, 3, 4) else 1.0},
        "flash": {"show": f == 6},
        "thigh_r": {"r": B_THR[f]}, "shin_r": {"r": B_SHR[f]}, "thigh_l": {"r": B_THL[f]}, "shin_l": {"r": B_SHL[f]},
    }, M.body_about((0, 0, 22), x=B_BX[f], z=B_BZ[f]))
    return KI.ground_feet(RIG, merge(pose, KF.glyph(B_EYES[f])), LEGS)


def _attack_b():
    ov = {3: CW.rings_fx("orb", ORB, (7.0, 10.5), CW.MINT_CORE, -180.0, 180.0),
          4: [_swing(3)], 5: [_swing(4)],
          6: CW.fire_fx("hand_r", (ORB[0] + 2.0, ORB[1], ORB[2]), CW.MINT_CORE, a0=-50.0) + CW.dust_fx(18.0, 362)}
    return M.clip("attack_b", [_b_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse={0: ("attack", 0), 9: ("attack", 9)}, extra={"holdStep": 3})


def _hit(k):
    return CW.hit_pose(k, {"torso": {"r": -2.0}},
                       lambda a: merge(arms((REST[0] - 2 * max(a, 0), REST[1] + 4 * max(a, 0)), (-6.0, 24.0 + 4 * max(a, 0))),
                                       {"orb": {"s": 1.0 + 0.3 * max(a, 0)}}))


def _die(k):
    pose = CW.die_d1(k, STANCE, HEIGHT_LU)
    pose["orb"] = {"show": k == 0}
    pose["pop"] = {"show": k in (1, 2)}
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
    return M.check_variants(M.check_contract(cl, attack_ms=900, attack_impact_at=0.6))
