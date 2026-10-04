"""Gravity Sage: Cosmic Age epic Caster (CONTENT_PLAN 5.8). A levitating elder of the star legions, ~72 lu.

Look (A11, Cosmic palette): an old alien sage floating cross-legged above the ground: a bald pale lilac head with
big kind eyes, bushy star-white brows and a long star-white beard that sways; a team robe pooled over the
crossed legs with a star-white hem and specks, a violet mantle with a star-white clasp, wide team cuffs. Three
small gravity orbs (violet with white cores) circle his head on a faint ring. Under him a soft mint lift glow.

"A viewer expects a meditating wizard: he drifts along cross-legged, flings little orbs, and when he presses his
palms together the stars around him crumple inward."

Animation (ANIM_SPEC G8 hover drift, the odometer at 60 x 1.25 = 75 lu/s; the hover bob is code motion):
  idle      floats cross-legged, breathing, the orbs circling, the beard swaying, eyes closed and calm, a blink
  walk      levitating drift: leaning 6 degrees into the motion, the robe and beard trailing, the orbs circling
  attack    ORB FLING: draws the near hand back with an orb gathering in it (the held extreme), then flings it
            forward (an arc smear, the orb leaves the hand)
  attack_b  PALMS TOGETHER: spreads both arms wide (the held extreme), then claps the palms together in front, a
            ring of crushed stars, the orb shoots from between the hands
  hit       a tilt and a drop on his lift glow, the head snaps back, eyes squeezed
  die       D3 dizzy: spins, drops out of the air and sits down hard, spiral eyes, the orbs fall
"""
import math

from ageborn_art import face as FC
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_cosmic_wave as CW
from ageborn_art import kit_medieval as KM
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "gravity_sage"
GAIT_NAME = "hover"
NAME = "Gravity Sage"
HEIGHT_LU = 76
CANVAS = (300, 280)
FEET = (130, 244)
ANCHORS = {"head": (2, 78), "hitCenter": (0, 40), "muzzle": (20, 40)}
NO_RETIME = True

HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
HL = (0.0, K.ARM_Y["l"], K.HAND_Z)
LIFT = 13.0
ORB = (HR[0] + 2.0, HR[1] - 2.0, HR[2] + 1.0)


def _orb(rig, joint, c, r):
    x, y, z = c
    g = Geo().sphere(c, r, cuts=3)
    rig.part(joint, g, glow=CW.GLOW, outline=0.9, outline_hex=CW.VIOLET_DK)
    g = Geo().sphere((x - r * 0.3, y - r * 0.6, z + r * 0.3), r * 0.45, cuts=2)
    rig.part(joint, g, glow=CW.GLOW_CORE, outline=0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KC.skeleton_v3(rig, head=(1, 0, 39))
    KC.legs_v3(rig, boot=CW.VIOLET_DK, knee=None, thigh_r=4.4, team_shin=False)
    rig.trackers.pop("_foot", None)
    rig.trackers.pop("_foot_l", None)
    K.arm_parts(rig, "l", sleeve=CW.VIOLET, bracer=None, glove=CW.LILAC)
    # the robe pooled over the crossed legs (a team lap cloth on the hips), the star-white hem
    g = Geo().blob((5.0, 0, 15.0), (15.0, 13.0, 6.0), p=2.6, taper=(1.15, 0.9))
    rig.part("hips", g, team=True)
    g = Geo().blob((5.0, 0, 10.4), (16.4, 14.0, 1.6), p=2.8)
    rig.part("hips", g, CW.STAR, finish="gloss", outline_hex=CW.STAR_TRIM)
    KC.specks(rig, "hips", [(10.0, 15.0, 1.0), (14.0, 12.4, 0.9), (2.0, 13.0, 0.9)], -13.4)
    # the mint lift glow under him
    rig.joint("lift", "hips", (4.0, 0, 6.0))
    g = Geo().lathe([(0, 0), (11.0, 0.2), (10.0, 1.4), (0, 1.6)], (4.0, 0, 6.6), (4.0, 0, 5.2), segs=24)
    rig.part("lift", g, glow=CW.MINT, outline=0.6, outline_hex="#1C8A6A")
    g = Geo().lathe([(8.0, 0), (6.0, 2.0), (2.0, 4.0), (0, 4.6)], (4.0, 0, 5.2), (4.0, 0, 4.0), segs=18)
    rig.part("lift", g, glow=CW.MINT_CORE, outline=0)
    # torso: team robe top with the star, a violet mantle with a clasp
    g = Geo().blob((0, 0, 28), (9.8, 9.6, 11.2), p=2.4, taper=(0.95, 1.05))
    cf = FC.Face(rig, "torso", [g])
    star = KC.starmark(cf, Geo(), KM.scr(cf, (6.0, -8.0, 27.4)), s=0.95)
    rig.part("torso", star, KC.STAR_PALE, highlight=False, outline=0)
    rig.part("torso", g, team=True)
    g = Geo().blob((0.4, 0, 21.4), (10.4, 10.2, 2.2), p=3.4)
    rig.part("torso", g, CW.STAR, finish="gloss", outline_hex=CW.STAR_TRIM)
    g = Geo().blob((-1.0, 0, 36.0), (11.4, 12.6, 5.6), p=2.4, taper=(1.2, 0.8))
    rig.part("torso", g, CW.VIOLET, finish="matte")
    g = Geo().blob((9.6, -1.5, 35.0), (2.2, 2.8, 2.8), p=2.4)
    rig.part("torso", g, CW.STAR, finish="gloss", outline_hex=CW.STAR_TRIM)
    # the head: bald lilac, kind eyes, bushy star-white brows, the beard
    head = Geo().blob((2.0, 0, 50.0), (11.2, 10.6, 12.0), p=2.2)
    KM.face2(rig, [head], CW.LILAC, 10.2, 52.0, eye_dy=(-6.6, 1.8), eye_r=(3.4, 3.2, 4.2), pupil_r=(1.5, 2.2, 2.4),
             brow=CW.STAR, brow_angry=False, brow_w=1.3, mouth_w=4.6, mouth_dz=-6.4)
    rig.part("head", head, CW.LILAC, outline_hex=CW.LILAC_DK)
    rig.secondary("beard", "head", (11.0, -5.0, 44.0), (13.0, -5.0, 30.0), max_deg=16, gain=1.2)
    g = Geo().blob((12.0, -5.0, 38.5), (4.2, 6.4, 8.0), p=2.2, taper=(0.5, 1.0), rot=(0, 8, 0))
    rig.part("beard", g, CW.STAR, outline_hex=CW.STAR_TRIM)
    g = Geo().blob((-2.0, -11.0, 50.0), (2.6, 1.6, 3.6), p=2.4)                  # ear
    rig.part("head", g, CW.LILAC, outline_hex=CW.LILAC_DK)
    # the orbiting orbs on a ring
    rig.joint("halo", "head", (0.0, 0.0, 69.0))
    g = Geo()
    for i in range(24):
        a0, a1 = 2 * math.pi * i / 24, 2 * math.pi * (i + 1) / 24
        g.capsule((15.0 * math.cos(a0), 15.0 * math.sin(a0) * 0.6, 69.0 + 3.0 * math.sin(a0)),
                  (15.0 * math.cos(a1), 15.0 * math.sin(a1) * 0.6, 69.0 + 3.0 * math.sin(a1)), 0.6, segs=6, rings=2)
    rig.part("halo", g, glow=CW.GLOW, outline=0)
    for a in (0, 120, 240):
        _orb(rig, "halo", (15.0 * math.cos(math.radians(a + 30)), 15.0 * math.sin(math.radians(a + 30)) * 0.6,
                           69.0 + 3.0 * math.sin(math.radians(a + 30))), 2.8)
    K.arm_parts(rig, "r", sleeve=CW.VIOLET, bracer=None, glove=CW.LILAC)
    for s in ("r", "l"):
        y = K.ARM_Y[s]
        g = Geo().blob((0.2, y, K.HAND_Z + 3.6), (5.2, 5.0, 3.4), p=2.4, taper=(1.2, 0.9))
        rig.part(f"fore_{s}", g, team=True, outline=0.6)
        g = Geo().blob((0.4, y - 0.3 * K.SIDE_Y[s], 37.4), (6.4, 5.6, 5.0), p=2.6)
        rig.part(f"arm_{s}", g, team=True)
    # the orb in the near hand (gathers on the hold, gone on the release)
    rig.joint("orb", "hand_r", ORB, hidden=True)
    _orb(rig, "orb", ORB, 3.6)
    rig.track("muzzle", "hand_r", ORB)
    K.star_burst(rig, "hand_r", (ORB[0] + 2.0, ORB[1], ORB[2]), size=1.0, name="flash", color=CW.GLOW, core=CW.GLOW_CORE)
    rig.joint("odo", "root", (0, 0, 0))
    rig.track("_foot", "odo", (0, 0, 0))


SIT = {"hips": {"z": LIFT}, "thigh_r": {"r": 84}, "shin_r": {"r": -160}, "foot_r": {"r": 60},
       "thigh_l": {"r": 76}, "shin_l": {"r": -150}, "foot_l": {"r": 60}}


def arms(r, l):
    a, f = K.ik2(K.SH, r)
    la, lf = K.ik2(K.SH, l)
    return merge(K.arm("r", a, f), K.arm("l", la, lf))


STANCE = merge(SIT, arms((8.0, 24.0), (8.0, 25.0)), {"torso": {"r": -2.0}})


def _halo(f, n=6, step=None):
    return {"halo": {"rz": (step or 60) * f}}


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    pose = merge(STANCE, _halo(f), {"hips": {"z": LIFT + 1.0 * c}, "torso": {"r": -2.0 + 1.4 * c}, "head": {"r": -2 * lag},
                                    "lift": {"s": 1.0 + 0.08 * c}, "beard": {"r": 2 * lag}})
    e = ("blink",) if f in (1, 2) else ()
    return merge(pose, FC.expr(*e)) if e else pose


SPEED = 60.0
GROUND = SPEED * 1.25


def _walk(f):
    p = 2 * math.pi * f / 8
    a = GROUND * 0.5 / 4.0
    return merge(SIT, arms((6.0, 25.0), (5.0, 25.0)), _halo(f, step=45), {
        "odo": {"x": a * math.cos(p)}, "hips": {"z": LIFT + 0.6 * math.sin(2 * p)},
        "body": {"r": -6.0}, "torso": {"r": -4.0 + 1.0 * math.sin(p)}, "head": {"r": 4.0},
        "lift": {"s": 0.9 + 0.12 * math.sin(2 * p), "x": -2.0}, "beard": {"r": 0.0}})


# -- attack: orb fling (900 ms, the orb leaves at 450 ms = 0.5) -----------------------------------------
ATTACK_MS = [60, 80, 100, 160, 50, 100, 90, 90, 80, 90]
ATTACK_IMPACT = 5
A_R = [(8, 24), (2, 30), (-5, 36), (-7, 38), (4, 40), (15, 36), (14, 33), (11, 29), (9, 26), (8, 24)]
A_T = [-2, 4, 8, 10, -2, -14, -12, -6, -3, -2]
A_EXPR = [(), ("grit",), ("grit",), ("grit",), ("yell",), ("yell",), ("o",), (), (), ()]


def _a_pose(f):
    pose = merge(SIT, arms(A_R[f], (8.0, 25.0 + (3.0 if f in (2, 3) else 0.0))), _halo(f, step=30), {
        "torso": {"r": A_T[f]}, "head": {"r": -0.5 * A_T[f]}, "orb": {"show": f in (1, 2, 3, 4), "s": [1, 0.6, 0.9, 1.15, 1.1, 1, 1, 1, 1, 1][f]},
        "flash": {"show": f == 5}, "body": {"r": [0, 2, 4, 5, 0, -6, -5, -2, 0, 0][f]},
    })
    return merge(pose, FC.expr(*A_EXPR[f])) if A_EXPR[f] else pose


def _arc(frm):
    return {"kind": "arc", "joint": "orb", "inner": (ORB[0] - 4.0, ORB[1], ORB[2]), "outer": ORB, "color": CW.GLOW,
            "white": 0.35, "taper": 0.3, "lines": 2, "from": frm, "t0": 0.0, "t1": 1.0}


def _attack_clip():
    ov = {3: CW.rings_fx("orb", ORB, (5.0, 8.0), CW.GLOW_CORE, -180.0, 180.0), 4: [_arc(3)],
          5: CW.fire_fx("hand_r", (ORB[0] + 2.0, ORB[1], ORB[2]), CW.GLOW_CORE, a0=-40.0)}
    return M.clip("attack", [_a_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 3})


# -- attack B: palms together ---------------------------------------------------------------------------
B_R = [(8, 24), (2, 34), (-6, 40), (-8, 41), (6, 38), (13, 33), (13, 32), (11, 29), (9, 26), (8, 24)]
B_L = [(8, 25), (6, 36), (4, 44), (3, 46), (10, 40), (13, 34), (13, 33), (11, 29), (9, 26), (8, 25)]
B_T = [-2, 6, 12, 14, 2, -10, -10, -6, -3, -2]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    pose = merge(SIT, arms(B_R[f], B_L[f]), _halo(f, step=45), {
        "torso": {"r": B_T[f]}, "head": {"r": -0.4 * B_T[f]}, "hips": {"z": LIFT + [0, 1, 3, 4, 2, -1, -1, 0, 0, 0][f]},
        "flash": {"show": f == 5}, "halo": {"s": [1, 1.05, 1.15, 1.2, 1.0, 0.7, 0.8, 0.9, 1.0, 1.0][f], "rz": 45 * f},
    })
    return merge(pose, FC.expr(*A_EXPR[f])) if A_EXPR[f] else pose


def _crush():
    return [{"kind": "rings", "joint": "hand_r", "point": (ORB[0] + 1.0, ORB[1], ORB[2]), "radii_lu": (6.0, 12.0),
             "a0": -180.0, "a1": 180.0, "color": CW.GLOW_CORE},
            {"kind": "burst", "joint": "hand_r", "point": (ORB[0] + 1.0, ORB[1], ORB[2]), "r0_lu": 13.0, "r1_lu": 8.0,
             "n": 8, "a0": 0.0, "arc": 360.0, "color": CW.GLOW_CORE}]


def _attack_b():
    ov = {3: CW.rings_fx("torso", (2.0, -10.0, 44.0), (10.0, 15.0), CW.GLOW_CORE, -180.0, 180.0), 5: _crush()}
    return M.clip("attack_b", [_b_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse={0: ("attack", 0), 9: ("attack", 9)}, extra={"holdStep": 3})


def _hit(k):
    pose = merge(STANCE, KC.hit_flyer(k, (0, 0, 30)), {"head": {"r": 14 * M.HIT_AMT[k]}, "torso": {"r": 8 * M.HIT_AMT[k]},
                                                        "beard": {"r": 10 * M.HIT_AMT[k]}})
    return merge(pose, FC.expr("squeeze", "grit") if k <= 1 else FC.expr("o") if k == 2 else {})


def _die(k):
    t = [0, 0, 0.1, 0.3, 1.0, 0.95, 1.0, 1.0, 1.0, 1.0][k]
    pose = merge(STANCE, M.die_d3(k, center_z=34.0, height=HEIGHT_LU), {
        "hips": {"z": LIFT * (1.0 - t)}, "torso": {"r": 24 * t}, "head": {"r": -10 * t, "rx": 14 * t},
        "arm_r": {"r": 40 * t}, "arm_l": {"r": -36 * t}, "lift": {"s": max(0.05, 1.0 - 1.2 * t)},
        "halo": {"z": -40 * t, "s": max(0.3, 1.0 - 0.6 * t), "rz": 60 * k}})
    e = ("squeeze", "grit") if k == 0 else (("o",) if k < 3 else ("spiral", "tongue"))
    return merge(pose, FC.expr(*e))


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=900, attack_impact_at=0.5))
