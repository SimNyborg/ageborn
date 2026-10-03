"""Drummer Boy: Gunpowder Age rare support, attack-speed aura (CONTENT_PLAN 5.4). Drum, a boom ring, ~62 lu.

Look (A11, Gunpowder palette): a small, earnest drummer boy with round cheeks, a team shako with a
cream cord and a little team pompom, a team coatee with cream lace bars ("drummer's lace") across
the chest, cream breeches, black gaiters and buckled shoes. A big team side drum with cream hoops and
a zigzag of cream cords hangs at his near hip on a cream sling; he holds a drumstick in each fist.

"A viewer expects him to rattle a drumroll and boom the drum at the foe, and to march drumming."

Animation (ANIM_SPEC G1 march, appendix B for a drum: roll and boom, cross-stick flourish):
  idle      taps a soft paradiddle, chin up, blink
  walk      walk v3 march at ground speed (card 65 x 1.25 = 81.25 lu/s), high knees, both sticks
            beating the drum on the contact frames, the pompom bobbing
  attack    DRUMROLL BOOM: a fast roll (both sticks low over the head of the drum), then both
            sticks up high over his shoulders (the held extreme, a loop of the roll while the wind-up
            lasts), then BOOM: both sticks smash down and a ring blasts from the drum
  attack_b  CROSS-STICK FLOURISH: crosses the sticks high over his head and twirls them (the held
            extreme, a tall X silhouette), then a single big beat on the rim
  hit       light: head snaps back, the shako tips, eyes squeezed
  die       D3 dizzy sit: the drum in his lap, the sticks fly, spiral eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "drummer_boy"
GAIT_NAME = "biped"
NAME = "Drummer Boy"
HEIGHT_LU = 64
CANVAS = (300, 280)
FEET = (130, 240)
ANCHORS = {"head": (2, 62), "hitCenter": (0, 30), "muzzle": (20, 22)}
NO_RETIME = True

SKIN = "#EDC6A2"
HAIR = "#5E4D40"
SHOE = "#2E2A2A"
STICK = "#D9C9A8"
DRUM_C = (9.0, -14.0, 20.0)          # drum centre (torso space, at the near hip)
DRUM_R, DRUM_H = 8.0, 9.0
HAT_C = (1.0, 0.0, 56.0)
SL = 13.0                            # stick length


def _shako(rig, joint):
    x, y, z = HAT_C
    g = Geo().lathe([(0, 0), (8.6, 0), (9.6, 5.6), (10.0, 11.0), (0, 11.2)], (x, y, z - 1.0),
                    (x, y, z + 10.2), segs=24, squash=(1.0, 0.94))
    rig.part(joint, g, team=True)
    g = Geo().lathe([(0, 9.4), (10.05, 9.4), (10.05, 11.4), (0, 11.6)], (x, y, z - 1.0), (x, y, z + 10.2),
                    segs=24, squash=(1.0, 0.94))
    rig.part(joint, g, B.BLACK, finish="gloss", outline=0.4)
    g = Geo().blob((x + 7.4, y, z - 0.6), (5.6, 8.6, 1.0), p=2.6)
    g.clip((x + 1.0, 0, 0), (-1, 0, 0))
    rig.part(joint, g, B.BLACK, finish="gloss", outline=0.6)
    g = Geo()
    for a, b in (((x + 8.6, -5.0, z + 2.0), (x + 3.4, -9.4, z + 0.6)), ((x + 3.4, -9.4, z + 0.6), (x - 3.0, -9.2, z + 2.6))):
        g.capsule(a, b, 0.75)
    rig.part(joint, g, B.CREAM, outline=0.4)
    g = Geo().sphere((x + 6.0, y, z + 13.4), 3.2, cuts=4)
    rig.part(joint, g, team=True, outline=0.8)


def _drum(rig, joint):
    x, y, z = DRUM_C
    # the drum hangs tilted (skin facing up and forward), axis in the side plane
    ax = (math.sin(math.radians(20)), 0.0, math.cos(math.radians(20)))
    p0 = (x - ax[0] * DRUM_H / 2, y, z - ax[2] * DRUM_H / 2)
    p1 = (x + ax[0] * DRUM_H / 2, y, z + ax[2] * DRUM_H / 2)
    g = Geo().lathe([(DRUM_R, 0), (DRUM_R + 0.2, DRUM_H * 0.5), (DRUM_R, DRUM_H)], p0, p1, segs=24)
    df = F.Face(rig, joint, [g])
    rig.part(joint, g, team=True)
    g = Geo()
    for t in (0.0, 1.0):
        c = (p0[0] + (p1[0] - p0[0]) * t, y, p0[2] + (p1[2] - p0[2]) * t)
        g.lathe([(DRUM_R + 0.4, -0.9), (DRUM_R + 0.9, 0), (DRUM_R + 0.4, 0.9)],
                (c[0] - ax[0] * 0.9, y, c[2] - ax[2] * 0.9), (c[0] + ax[0] * 0.9, y, c[2] + ax[2] * 0.9), segs=24)
    rig.part(joint, g, B.CREAM, outline=0.5)                         # cream hoops
    g = Geo().lathe([(0, 0), (DRUM_R - 0.3, 0), (DRUM_R - 0.3, 0.4), (0, 0.4)], p1,
                    (p1[0] + ax[0] * 0.4, y, p1[2] + ax[2] * 0.4), segs=24)
    rig.part(joint, g, "#EFE9DA", finish="matte", outline=0.4)      # the skin
    # zigzag cords on the shell (decal)
    pts = []
    for i in range(7):
        u = -6.4 + i * 2.1
        pts.append((u, 3.0 if i % 2 == 0 else -3.0))
    c = df.hit(*K.scr(df, (x, y - DRUM_R, z)))
    df.stroke(g2 := Geo(), c, pts, 0.8, 0.4)
    rig.part(joint, g2, B.CREAM, outline=0, highlight=False)
    # the sling up to the far shoulder
    g = Geo().capsule((x - 2.0, y + 2.0, z + 4.0), (-2.0, 10.0, 37.0), 1.1)
    rig.part(joint, g, B.CREAM, outline=0.5)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig, head=(1, 0, 36))
    G.legs_v3(rig, B.CREAM, SHOE, stocking=B.BLACK, gaiter_buttons=B.BRASS, thigh_r=4.4)

    coat = Geo().blob((0, 0, 27.6), (10.2, 9.4, 10.6), p=2.4, taper=(1.06, 0.95))
    coat.blob((0, 0, 18.6), (9.8, 9.0, 4.4), p=2.6)
    cf = F.Face(rig, "torso", [coat])
    rig.part("torso", coat, team=True)
    g = G.stripes(cf, Geo(), (32.0, 28.6, 25.2, 21.8), 5.0, 12.4, 1.4)
    rig.part("torso", g, B.CREAM, highlight=False, outline=0)        # drummer's lace bars
    g = Geo().blob((0.4, 0, 19.6), (10.6, 9.8, 1.6), p=3.0)
    rig.part("torso", g, B.CREAM)
    g = Geo().blob((2.6, 0, 35.4), (6.6, 7.6, 2.4), p=2.4)
    rig.part("torso", g, B.CREAM)
    # short coat tails
    rig.secondary("tails", "hips", (-4.0, 0, 18.0), (-7.0, 0, 9.0), max_deg=14, gain=1.1)
    rig.rest_offset["tails"] = (0, 0, K.V3_LIFT + 4.0)
    g = Geo().blob((-5.0, 0, 13.4), (4.6, 9.4, 5.6), p=2.6, taper=(0.7, 1.0), rot=(0, 10, 0))
    rig.part("tails", g, team=True)

    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, cuff=B.CREAM, hand=SKIN, r0=4.0, r1=3.5, fist=4.0)
        g = Geo().blob((0, B.ARM_Y[s], 37.0), (5.4, 4.8, 4.2), p=2.4)
        rig.part(f"arm_{s}", g, team=True)
        # a drumstick from each fist (modelled pointing up, w_rest 90)
        hx, hy, hz = 0.0, B.ARM_Y[s], B.HAND_Z
        g = Geo().capsule((hx + 0.4, hy - 0.4, hz - 2.0), (hx + 0.6, hy - 0.4, hz + SL), 0.9, 0.7)
        g.sphere((hx + 0.6, hy - 0.4, hz + SL + 0.6), 1.5, cuts=3)
        rig.part(f"hand_{s}", g, STICK, finish="matte", outline=0.6)
        rig.track(f"stick_{s}", f"hand_{s}", (hx + 0.6, hy, hz + SL))

    head = G.head_geos(center=(2, 0, 46.6), r=(12.0, 11.4, 11.8), nose=(14.2, -0.6, 45.0),
                       nose_r=(2.8, 2.6, 2.6))
    hair = Geo().blob((-6.0, 0, 46.0), (6.2, 11.0, 7.2), p=2.2)
    K.face2(rig, [head, hair], SKIN, cx=12.4, cz=48.0, eye_dy=(-4.8, 4.6),
            eye_r=(4.1, 3.8, 4.8), pupil_r=(1.7, 2.6, 2.9), brow=HAIR, brow_angry=False,
            mouth_dz=-7.4, mouth_x=13.6, mouth_shape="smile", eye_at=(14.2, 48.2), mark_r=4.4)
    rig.part("head", head, SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    g = Geo().blob((11.0, -7.0, 43.6), (2.2, 1.0, 1.8), p=2.2)
    rig.part("head", g, "#E8A99A", outline=0, highlight=False)       # round cheek
    rig.joint("hat", "head", HAT_C)
    _shako(rig, "hat")

    rig.joint("drum", "torso", DRUM_C)
    _drum(rig, "drum")
    rig.track("muzzle", "drum", (DRUM_C[0] + 6.0, DRUM_C[1], DRUM_C[2] + 4.0))


# -- poses ---------------------------------------------------------------------------------
def sticks(ra, rf, rw, la, lf, lw):
    return merge(B.arm("r", ra, rf, rw, w_rest=90.0), B.arm("l", la, lf, lw, w_rest=90.0))


# beating position: both sticks over the drum skin (the drum sits at the near hip, forward)
REST = (-70, -10, -10, -64, -4, -20)
STANCE = merge(sticks(*REST), {"torso": {"r": -2}})


def _idle(f):
    tap = [0.0, 1.0, 0.0, 1.0, 0.0, 0.5][f]
    tapl = [1.0, 0.0, 1.0, 0.0, 0.6, 0.0][f]

    def extra(ctx):
        return merge(sticks(REST[0] + 10 * tap, REST[1] + 18 * tap, REST[2] + 30 * tap,
                            REST[3] + 10 * tapl, REST[4] + 18 * tapl, REST[5] + 30 * tapl),
                     {"head": {"r": -4 + 2 * ctx["lag"]}, "drum": {"r": 1.5 * ctx["lag"]}})
    return M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


SPEED = 81.25
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, cycle_ms=640, stance=0.36, lift=7.5)


def _walk(f, report=None):
    # a beat on each contact frame (0 right stick, 4 left stick)
    br = [1.0, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0, 0.5][f]
    bl = [0.0, 0.0, 0.0, 0.5, 1.0, 0.2, 0.0, 0.0][f]

    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        up_r, up_l = 1.0 - br, 1.0 - bl
        return merge(sticks(REST[0] + 14 * up_r, REST[1] + 26 * up_r, REST[2] + 50 * up_r,
                            REST[3] + 14 * up_l, REST[4] + 26 * up_l, REST[5] + 50 * up_l),
                     {"drum": {"r": 3 * lag}, "tails": {"r": 5 * lag}, "hat": {"r": 2 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2}}, GAIT, legs=LEGS, lean=-3.0, twist=4.0, nod=3.0, extra=extra,
                     report=report)


# attack A: drumroll boom. moves.SMALL_MELEE_MS (680 ms, impact 6 at 290 ms); hold on step 3 looping with 2.
#        read   roll1  roll2  HOLD   lift   smash  BOOM   rebound lower  settle settle
A_R = [REST, (-60, 0, 10, -72, -14, -30), (-72, -14, -30, -60, 0, 10), (60, 100, 115, 66, 106, 125),
       (66, 108, 122, 72, 114, 132), (-10, 40, 60, -4, 46, 66), (-74, -24, -40, -68, -18, -46),
       (-66, -6, 6, -60, 0, 0), (-64, 0, 0, -60, 4, -10), (-70, -8, -8, -64, -2, -18), REST]
A_LEAN = [-2, -4, -4, 8, 10, 0, -10, -8, -4, -2, -2]
A_X = [0.0, 0.0, 0.0, -1.5, -2.0, 0.5, 2.0, 2.0, 1.0, 0.0, 0.0]
A_Z = [0.0, -0.5, -0.5, 0.5, 1.0, -0.5, -2.5, -2.0, -1.0, 0.0, 0.0]
A_Q = [0.0, -0.02, -0.02, 0.04, 0.05, -0.02, -0.1, -0.04, 0.0, 0.0, 0.0]


def _a_pose(f):
    pose = merge(sticks(*A_R[f]), {
        "torso": {"r": A_LEAN[f]}, "head": {"r": -0.5 * A_LEAN[f]},
        "drum": {"r": [0, 2, -2, 0, 0, 0, -6, 3, 0, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    pose = G.plant(RIG, pose, LEGS, r=(3.0, 0, 0), l=(-3.0, 0, 0), max_drop=3.0)
    if f in (1, 2):
        pose = merge(pose, F.expr("grit"))
    elif f in (3, 4):
        pose = merge(pose, F.expr("squeeze", "o"))
    elif f in (6, 7):
        pose = merge(pose, F.expr("yell"))
    return pose


RING_PT = (DRUM_C[0] + 8.0, DRUM_C[1], DRUM_C[2] + 4.0)


def _ov():
    return {
        6: [{"kind": "rings", "joint": "drum", "point": RING_PT, "radii_lu": (7.0, 12.0, 17.0), "a0": -70.0,
             "a1": 70.0, "color": "#FFF4D6"},
            {"kind": "burst", "joint": "drum", "point": (DRUM_C[0] + 2.0, DRUM_C[1], DRUM_C[2] + 6.0),
             "r0_lu": 4.0, "r1_lu": 9.0, "n": 5, "a0": 30.0, "arc": 120.0, "color": "#FFF4D6"}],
        7: [{"kind": "rings", "joint": "drum", "point": RING_PT, "radii_lu": (14.0, 20.0), "a0": -60.0,
             "a1": 60.0, "color": "#FFF4D6"}],
    }


def _attack_clip():
    return M.clip("attack", [_a_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=_ov(), extra={"holdStep": 3, "holdLoop": [2, 3]})


# attack B: cross-stick flourish: the sticks crossed high over his head in an X (hold), twirled, then a
# single big beat on the rim (frames 0, 1, 8, 9, 10 are A's)
B_R = {2: (60, 100, 60, 66, 106, 120), 3: (70, 112, 50, 76, 118, 130), 4: (72, 116, 40, 78, 120, 140),
       5: (0, 50, 30, 6, 56, 40), 6: (-76, -26, -34, -60, 0, 20), 7: (-68, -8, 0, -60, 2, 10)}


def _b_pose(f):
    if f not in B_R:
        return _a_pose(f)
    pose = merge(sticks(*B_R[f]), {
        "torso": {"r": [0, 0, 6, 8, 8, 0, -10, -8][f]}, "head": {"r": [0, 0, -6, -8, -8, 0, 4, 2][f]},
        "drum": {"r": [0, 0, 0, 0, 0, 0, -6, 3][f]},
    }, M.body_about((0, 0, 22), x=[0, 0, -1, -1.5, -1.5, 0.5, 2, 2][f], z=[0, 0, 1.5, 2.0, 2.0, 0, -2.5, -2][f],
                    q=[0, 0, 0.04, 0.05, 0.05, -0.02, -0.1, -0.04][f]))
    feet = ((3.0, 0, -14), (-3.0, 0, -14)) if f in (3, 4) else ((3.0, 0, 0), (-3.0, 0, 0))   # up on his toes
    pose = G.plant(RIG, pose, LEGS, r=feet[0], l=feet[1], max_drop=3.0)
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze", "grit"))
    else:
        pose = merge(pose, F.expr("yell"))
    return pose


def _attack_b():
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=_ov(), reuse=reuse, extra={"holdStep": 3, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 10 * a},
                "thigh_r": {"r": 18 * max(a, 0)}, "shin_r": {"r": -20 * max(a, 0)},
                "arm_r": {"r": 20 * a}, "arm_l": {"r": 20 * a}, "drum": {"r": 8 * a},
                "hat": {"r": 10 * a, "z": 2.0 * max(a, 0)}, "brow": {"z": 1.4 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "o"),
                       face_back=F.expr("o") if k == 2 else None)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.7, 0.2, 0.4, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d3(k, center_z=24.0, height=HEIGHT_LU), K.d3_sit(k), {
        "arm_r": {"r": 70 * flail + 20}, "arm_l": {"r": 60 * flail + 20},
        "hand_r": {"r": 80 * flail}, "hand_l": {"r": -60 * flail}, "drum": {"r": -10 * flail},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.6}})
    else:
        pose = merge(pose, F.expr("spiral", "tongue"))
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
