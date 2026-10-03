"""Herald: Medieval Age rare support, shield beacon (CONTENT_PLAN 5.3). Trumpet (proj.note), ~66 lu.

Look (A11, PLAN.md): a proud, rosy-cheeked herald with a pointed chin and a neat fringe, in a plumed
team beret, a team tabard quartered with parchment (a parchment bear paw on the team quarter), a
puffed parchment collar, slate hose and pointed shoes. He holds a long straight brass-coloured (low
saturation) trumpet in the near hand with a square team banner hanging from it (its own joint, it
flutters), and a rolled parchment proclamation in the far hand.

"A viewer expects him to raise a trumpet and blast a fanfare, and to march proudly."

Animation (ANIM_SPEC G1 march, appendix B for a horn: level blast, raised fanfare):
  idle      unrolls the proclamation and clears his throat, the banner sways, blink
  walk      walk v3 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), a proud high-knee
            march: the trumpet held upright at his chest, the banner swinging a frame late
  attack    LEVEL BLAST: lifts the trumpet to his lips, leans back and fills his cheeks (the held
            extreme; a hold loop with a cheek wobble while the sim wind-up lasts), then leans in and
            blasts a note straight ahead (rings at the bell; the note leaves `muzzle`)
  attack_b  RAISED FANFARE: tips the trumpet high toward the sky on his toes and blasts a fanfare
  hit       light: the head snaps back, the plume flops
  die       D3 dizzy sit: the trumpet in his lap, spiral eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "herald"
GAIT_NAME = "biped"
NAME = "Herald"
HEIGHT_LU = 66
CANVAS = (300, 256)
FEET = (112, 224)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 31), "muzzle": (40, 42)}
NO_RETIME = True

SKIN = "#EBC4A0"
CHEEK = "#E2AE9E"
HAIR = "#8A6E58"
HOSE = "#626A74"
SHOE = "#4E4035"
BRASS = "#C9B78E"
BRASS_DK = "#8F8064"
PARCH = "#E8DFC8"
PARCH_DK = "#C9BDA0"

SH = (0.0, B.SHOULDER_Z)
MP = (13.6, -5.0, 41.6)               # the trumpet mouthpiece at the lips (rest, character space)
TLEN = 30.0
GRIP_D = 12.0                         # the near hand holds the tube this far from the mouthpiece
BELL = (MP[0] + TLEN + 2.0, MP[1], MP[2])


def _beret(rig, joint):
    g = Geo().blob((0.0, 0.0, 57.6), (13.4, 13.0, 5.4), p=2.2, rot=(0, 10, 0))
    rig.part(joint, g, team=True)
    g = Geo().lathe([(11.2, -0.8), (11.8, 0.0), (11.2, 0.8)], (1.0, 0.0, 55.2), segs=24)
    rig.part(joint, g, PARCH_DK, outline=0.5)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    # pointed shoes on the v3 legs
    K.legs_v3(rig, HOSE, SHOE, cuff=PARCH_DK)
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        g = Geo().lathe([(2.0, 0), (0, 4.0)], (6.6, y, 1.8), (10.0, y, 3.2), segs=8)
        rig.part(f"foot_{s}", g, SHOE if s == "r" else "#3E332B", outline=0.5)

    # torso: a quartered tabard (team front, parchment quarters), a parchment collar, a belt
    g = Geo().blob((0, 0, 27.4), (10.6, 9.8, 11.6), p=2.3, taper=(1.1, 0.95))
    tface = F.Face(rig, "torso", [g])
    rig.part("torso", g, team=True)
    g2 = Geo()
    c = tface.hit(9.0, 23.0)
    tface.decal(g2, c, [(-4.0, -6.0), (2.6, -6.0), (2.6, 0.0), (-4.0, 0.0)], 0.4)
    rig.part("torso", g2, PARCH, highlight=False, outline=0)
    g = K.paw(tface, Geo(), (3.0, 30.0), s=1.0)
    rig.part("torso", g, PARCH, highlight=False, outline=0)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=12, gain=1.0)
    rig.rest_offset["hem"] = (0, 0, K.V3_LIFT + 0.6)
    g = Geo().blob((0.6, 0, 14.8), (11.6, 10.6, 4.8), p=2.7, taper=(1.12, 1.0))
    for x, y in ((9.0, -7.0), (1.0, -11.0), (-7.0, -9.0)):
        g.lathe([(2.2, 0), (0, -3.4)], (x, y, 11.6), segs=8)
    rig.part("hem", g, team=True)
    g = Geo().blob((0.4, 0, 20.6), (11.4, 10.4, 1.6), p=3.2)
    rig.part("torso", g, SHOE)
    g = Geo()
    for k in range(8):   # puffed collar
        t = math.radians(-160 + 40 * k)
        g.blob((1.0 + 9.6 * math.cos(t), 10.0 * math.sin(t), 37.4), (3.4, 3.4, 2.6), p=2.0)
    rig.part("torso", g, PARCH)

    # head: rosy cheeks, a pointed chin, a neat fringe, a plumed team beret
    head = Geo().blob((2, 0, 48.0), (11.0, 10.4, 11.0), p=2.3)
    head.blob((13.4, -0.6, 45.8), (2.8, 2.6, 2.8), p=2.0)
    head.blob((9.0, 0, 39.4), (4.0, 4.6, 3.6), p=2.2)   # pointed chin
    hair = Geo().blob((-3.0, 0, 51.0), (9.6, 10.6, 5.4), p=2.2)
    K.face2(rig, [head, hair], SKIN, cx=11.8, cz=48.8, eye_r=(3.6, 3.3, 4.2), brow=HAIR, brow_angry=False,
            brow_w=0.85, mouth_dz=-7.2, mouth_x=12.4, eye_at=(13.6, 49.0), mark_r=3.9, mouth_shape="smile")
    rig.part("head", head, SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    for y in (-6.6, 6.2):
        g = Geo().blob((10.6, y, 44.2), (2.6, 2.6, 2.1), p=2.0)
        rig.part("head", g, CHEEK, highlight=False, outline=0)
    rig.joint("cheeks", "head", (11.0, 0, 43.6), hidden=True)     # puffed cheeks for the blast
    g = Geo()
    for y in (-5.8, 5.4):
        g.blob((11.4, y, 43.2), (4.4, 3.8, 3.6), p=2.0)
    rig.part("cheeks", g, CHEEK, outline=0.4)
    rig.joint("beret", "head", (1.0, 0, 56.0))
    _beret(rig, "beret")
    rig.secondary("plume", "beret", (-6.0, -6.0, 59.0), (-20.0, -6.0, 64.0), max_deg=16, gain=1.2)
    g = Geo().blob((-13.0, -6.6, 60.4), (9.0, 1.0, 1.8), p=2.0, rot=(0, 8, 0))
    rig.part("plume", g, PARCH_DK, outline=0.8)

    for s in ("r", "l"):
        B.arm_parts(rig, s, None, hand=SKIN, team_sleeve=True, cuff=PARCH)
    # the proclamation scroll in the far hand
    lx, ly, lz = 0.0, B.ARM_Y["l"], B.HAND_Z
    g = Geo().capsule((lx + 2.0, ly - 3.0, lz - 4.0), (lx + 2.0, ly - 3.0, lz + 7.0), 2.0)
    rig.part("hand_l", g, PARCH, outline=0.6)
    g = Geo().capsule((lx + 2.0, ly - 3.0, lz + 6.4), (lx + 2.0, ly - 3.0, lz + 8.4), 2.4)
    rig.part("hand_l", g, PARCH_DK, outline=0.5)

    # the trumpet on its own joint (modelled at the lips along +x) with its hanging team banner
    rig.joint("trumpet", "torso", MP)
    mx, my, mz = MP
    g = Geo().capsule((mx, my, mz), (mx + TLEN - 6.0, my, mz), 0.9)
    rig.part("trumpet", g, BRASS, finish="gloss")
    g = Geo().lathe([(1.0, 0), (1.6, TLEN * 0.4), (3.0, TLEN * 0.75), (5.4, TLEN * 0.95), (5.8, TLEN * 1.02)],
                    (mx + TLEN - 8.0, my, mz), (mx + TLEN + 2.0, my, mz), segs=18)
    rig.part("trumpet", g, BRASS, finish="gloss")
    g = Geo().lathe([(1.4, 0), (1.4, 1.2)], (mx - 0.6, my, mz), (mx + 0.8, my, mz), segs=10)
    g.sphere((mx + 9.0, my, mz), 1.6, cuts=2).sphere((mx + 18.0, my, mz), 1.6, cuts=2)
    rig.part("trumpet", g, BRASS_DK, finish="gloss", outline=0.5)
    rig.secondary("banner", "trumpet", (mx + 9.0, my - 0.6, mz - 0.6), (mx + 13.0, my - 0.6, mz - 14.0),
                  max_deg=12, gain=1.2)
    bn = Geo().slab([(mx + 8.0, mz - 1.0), (mx + 21.0, mz - 1.0), (mx + 21.0, mz - 13.0), (mx + 14.5, mz - 16.0),
                     (mx + 8.0, mz - 13.0)], my - 1.0, 1.0)
    bface = F.Face(rig, "banner", [bn])
    rig.part("banner", bn, team=True, outline=0.6)
    g = K.paw(bface, Geo(), K.scr(bface, (mx + 14.5, my - 1.6, mz - 7.0)), s=0.95)
    rig.part("banner", g, PARCH, highlight=False, outline=0)
    rig.track("muzzle", "trumpet", BELL)


# -- poses ---------------------------------------------------------------------------------
def tpt(px, pz, deg):
    """The trumpet's mouthpiece at (px, pz) in torso space pointing `deg`; the near hand on the tube."""
    pose = {"trumpet": {"x": px - MP[0], "z": pz - MP[2], "r": deg}}
    gx = px + GRIP_D * math.cos(math.radians(deg))
    gz = pz + GRIP_D * math.sin(math.radians(deg))
    a, f = B.ik2(SH, (gx, gz - 1.0))
    pose.update(B.arm("r", a, f))
    return pose


LIPS = (MP[0], MP[2])
LOW = (6.0, 22.0, 70.0)                     # at rest: held upright at his hip, the bell up
STANCE = merge(tpt(*LOW), B.arm("l", -70, 0), {"torso": {"r": -1}})


def _idle(f):
    rd = [0.2, 0.7, 1.0, 1.0, 0.6, 0.2][f]

    def extra(ctx):
        return merge(tpt(LOW[0] + 0.3 * ctx["lag"], LOW[1] + 0.5 * ctx["lag"], LOW[2] + 2 * ctx["lag"]),
                     B.arm("l", -70 + 40 * rd, 0 + 50 * rd),
                     {"head": {"r": -5 * rd}, "banner": {"r": 4 * ctx["lag"]}, "plume": {"r": 3 * ctx["lag"]}})
    return M.idle_v2(f, {"torso": {"r": -1}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


SPEED = 81.25
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, lift=7.5)
CARRY = (8.0, 26.0, 84.0)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(tpt(CARRY[0], CARRY[1] + 0.6 * lag, CARRY[2] + 4 * lag),
                     {"banner": {"r": 8 * lag}, "plume": {"r": 6 * lag}, "hem": {"r": 4 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2}}, GAIT, legs=LEGS, lean=-4.0, twist=5.0, nod=3.0,
                     arms={"l": K.ArmChain("l")}, arm=30.0, elbow=(40.0, 70.0), extra=extra, report=report)


# attack: moves.SMALL_MELEE_MS (680 ms, impact 290); the hold (step 3) loops with the wobble (step 2)
#         read  lift  raise HOLD wobble lead BLAST over  lower settle settle
A_T = [(6, 22, 70), (10, 32, 40), (13.0, 41.6, 10), (13.0, 41.6, 14), (13.0, 41.6, 8), (13.0, 41.6, 2),
       (13.0, 41.6, -2), (13.0, 41.6, 0), (10, 32, 40), (7, 24, 62), (6, 22, 70)]
A_LEAN = [-1, 2, 6, 10, 8, -4, -10, -8, -2, 0, -1]
A_X = [0.0, -0.5, -1.5, -2.5, -2.0, 1.0, 3.0, 3.0, 1.5, 0.5, 0.0]
A_Q = [0.0, 0.0, -0.02, -0.05, -0.04, 0.04, 0.08, 0.02, -0.02, 0.0, 0.0]
A_THR = [0, 2, 4, 6, 6, 12, 18, 16, 8, 2, 0]
A_THL = [0, -2, -4, -6, -6, -10, -14, -12, -6, -2, 0]


def _attack_pose(f, up=0.0):
    px, pz, deg = A_T[f]
    playing = 2 <= f <= 7
    if playing:
        deg += up
    pose = merge(tpt(px, pz, deg), B.arm("l", -60, 10), {
        "torso": {"r": A_LEAN[f] + (6.0 * up / 50.0 if playing else 0)},
        "head": {"r": (0.6 * up if playing else 0) + [0, 2, 4, 6, 5, -2, -4, -3, 0, 0, 0][f]},
        "thigh_r": {"r": A_THR[f]}, "thigh_l": {"r": A_THL[f]},
        "cheeks": {"show": f in (3, 4, 5)},
        "banner": {"r": [0, 4, 6, 8, 6, -6, -14, -8, 2, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], q=A_Q[f]))
    if up and playing:
        pose = merge(pose, {"foot_r": {"r": -14}, "foot_l": {"r": -16}}, M.body_about((0, 0, 22), z=1.5))
    if f in (3, 4):
        pose = merge(pose, F.expr("squeeze"))
    elif f in (6, 7):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -0.8}})
    return pose


def _ov(up=0.0):
    return {
        6: [{"kind": "rings", "joint": "trumpet", "point": BELL, "radii_lu": (6.0, 10.0, 14.0), "a0": -60.0,
             "a1": 60.0, "color": "#FFF4D6"}],
        7: [{"kind": "rings", "joint": "trumpet", "point": BELL, "radii_lu": (12.0, 17.0), "a0": -50.0,
             "a1": 50.0, "color": "#FFF4D6"}],
    }


def _attack_clip():
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=_ov(), extra={"holdStep": 3, "holdLoop": [2, 3]})


def _attack_b():
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_attack_pose(f, up=52.0) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=_ov(52.0), reuse=reuse,
                  extra={"holdStep": 3, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 10 * a},
                "thigh_r": {"r": 18 * max(a, 0)}, "shin_r": {"r": -20 * max(a, 0)},
                "trumpet": {"r": 14 * a}, "arm_l": {"r": 20 * a},
                "plume": {"r": -12 * a}, "brow": {"z": 1.4 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "o"),
                       face_back=F.expr("o") if k == 2 else None)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.7, 0.2, 0.4, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d3(k, center_z=24.0, height=HEIGHT_LU), K.d3_sit(k), {
        "trumpet": {"r": -40 * flail}, "arm_l": {"r": 60 * flail}, "hem": {"sz": 0.9},
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
