"""Trench Raider: Modern Age infantry (DESIGN A5.5). Melee, slash, ~68 lu.

Look (A11, Modern palette): a stocky, stubbled raider under a wide olive Brodie "soup bowl" helmet
(team band, khaki netting, rim rivets), a team scarf whose tail flutters behind him, a team tunic
with breast pockets and team sleeves (cream rank chevrons on the near sleeve break up the team
slab), a khaki webbing belt with pouches, two round grenades and a canteen, olive trousers, khaki
puttees and muddy boots. He carries an oversized sharpened entrenching spade (a wood handle with a
leather wrap and a D-grip, a big mud-caked steel blade with rivets).

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    the spade bounces on his shoulder on the beat, he peeks left and right under the brim,
          weight shift, blink
  walk    sneak: low and crouched, long strides, the spade held low in both hands, the scarf and
          the grenades lagging
  attack  SCOOP, FLICK AND WHACK: he stabs the spade into the dirt (dust), flicks a spray of dirt
          at the enemy, cocks the spade high over his back shoulder (the held extreme), then
          lunges and whacks it down through the target at chest height (smear, CLANG lines, yell)
  hit     light: the head snaps back, the helmet lifts, eyes squeezed, overshoot forward
  die     D1 fling and spin: the helmet pops off and the spade flies; X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_modern as KM
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "trench_raider"
NAME = "Trench Raider"
HEIGHT_LU = 68
CANVAS = (300, 272)
FEET = (132, 244)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

FIST = (0.4, R.ARM_Y["r"] - 1.2, R.HAND_Z - 0.4)
HANDLE = 26.0          # handle length from the fist to the blade socket
BLADE = 19.0           # blade length (1.3x: the weapon reads at 1x)
BLADE_W = 8.2          # half width
HELM_C = (1.5, 0.0, 59.6)
BLADE_C = (FIST[0], FIST[1], FIST[2] + HANDLE + BLADE * 0.55)
TIP = (FIST[0], FIST[1], FIST[2] + HANDLE + BLADE + 1.0)


def _spade(rig, joint):
    cx, cy, cz = FIST
    g = Geo().capsule((cx, cy, cz - 5.0), (cx, cy, cz + HANDLE), 1.8, 2.0)
    rig.part(joint, g, R.WOOD)
    g = Geo()   # grain strokes and a leather grip wrap
    g.capsule((cx + 0.2, cy - 1.7, cz + 6.0), (cx + 0.2, cy - 1.7, cz + 12.0), 0.35)
    g.capsule((cx - 0.3, cy - 1.7, cz + 15.0), (cx - 0.3, cy - 1.7, cz + 19.0), 0.35)
    rig.part(joint, g, "#6A5240", outline=0, highlight=False)
    g = Geo()
    for z in (cz + 2.4, cz + 4.4):
        g.blob((cx, cy, z), (2.4, 2.4, 0.9), p=2.4)
    rig.part(joint, g, R.LEATHER, outline=0.4)
    g = Geo()   # D-grip below the fist
    g.capsule((cx - 3.4, cy, cz - 5.0), (cx + 3.4, cy, cz - 5.0), 1.3)
    g.capsule((cx - 3.4, cy, cz - 5.0), (cx - 1.4, cy, cz - 9.8), 1.2)
    g.capsule((cx + 3.4, cy, cz - 5.0), (cx + 1.4, cy, cz - 9.8), 1.2)
    g.capsule((cx - 1.4, cy, cz - 9.8), (cx + 1.4, cy, cz - 9.8), 1.2)
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.7)
    g = Geo().lathe([(2.4, 0), (2.7, 3.0), (3.8, 5.2), (0, 5.4)], (cx, cy, cz + HANDLE - 3.5),
                    (cx, cy, cz + HANDLE + 2.0), segs=12)   # socket
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.8)
    bz = cz + HANDLE + BLADE / 2 + 1.0
    blade = Geo().blob((cx, cy, bz), (BLADE_W, 1.6, BLADE / 2), p=2.3, taper=(1.0, 0.42))
    face = F.Face(rig, joint, [blade])
    rig.part(joint, blade, R.STEEL, finish="metal")
    g = Geo().blob((cx, cy - 1.0, bz + 2.2), (BLADE_W * 0.5, 1.0, BLADE * 0.26), p=2.2, taper=(1.0, 0.5))
    rig.part(joint, g, "#BCC3C9", finish="metal", outline=0)   # sharpened bright edge
    g = Geo()   # rivets on the socket strap
    for dx in (-2.6, 2.6):
        g.sphere((cx + dx, cy - 1.5, cz + HANDLE + 3.0), 0.9, cuts=2)
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0)
    g = KM.mud(face, Geo(), [((cx - 3.0, cz + HANDLE + BLADE * 0.62), 3.2, 3.6),
                             ((cx + 3.6, cz + HANDLE + BLADE * 0.35), 2.4, 2.0)])
    rig.part(joint, g, KM.MUD, highlight=False, outline=0)


def build(rig):
    R.skeleton(rig)
    R.legs(rig, trousers="#767B5A")
    # muddy boot toes
    for s in ("r", "l"):
        y = R.LEG_Y * R.SIDE_Y[s]
        g = Geo().blob((5.8, y - 0.6 * R.SIDE_Y[s], 2.4), (3.4, 4.4, 2.0), p=2.6)
        rig.part(f"shin_{s}", g, KM.MUD, outline=0.4)
    R.tunic(rig)
    # webbing: grenades at the front of the belt, pouches, a canteen at the back hip
    KM.grenade(rig, "torso", (9.6, -8.4, 17.4), r=2.4)
    KM.grenade(rig, "torso", (4.6, -11.0, 17.0), r=2.3)
    KM.canteen(rig, "torso", (-8.4, -9.8, 16.4), r=3.2)
    # a team scarf round the neck with a fluttering tail
    g = Geo().lathe([(8.0, 0), (8.7, 1.8), (8.2, 3.6)], (1.0, 0, 35.6), (1.0, 0, 39.4), segs=18)
    g.blob((7.6, -4.4, 36.8), (2.6, 2.6, 2.4), p=2.4)
    rig.part("torso", g, team=True, outline=0.6)
    rig.secondary("scarf", "torso", (-4.0, -6.0, 38.0), (-14.0, -6.5, 33.0), max_deg=28, gain=1.6)
    g = Geo().blob((-9.0, -6.5, 35.6), (5.6, 1.2, 2.2), p=2.4, taper=(1.0, 0.7), rot=(0, 18, 0))
    g.blob((-14.0, -6.5, 33.2), (2.2, 1.1, 2.0), p=2.2)
    rig.part("scarf", g, team=True, outline=0.6)

    # head: stubble, angry brow, the face kit; the helmet on its own joint (it pops off)
    stub = Geo().blob((7.0, 0, 41.2), (8.2, 9.6, 4.4), p=2.2)
    stub.clip((3.0, 0, 0), (-1, 0, 0))
    KI.head_face(rig, brow=R.HAIR, brow_angry=True, mouth_dz=-9.2, mouth_w=6.2, extra_geos=[stub])
    rig.part("head", stub, "#C9A88E", outline=0.5)
    g = Geo().blob((-6.4, 0, 47.5), (6.0, 10.0, 7.0), p=2.2)
    rig.part("head", g, R.HAIR, finish="hair")
    g = Geo().blob((-2.0, -11.2, 50.0), (2.6, 1.6, 3.4), p=2.2)   # ear
    rig.part("head", g, R.SKIN)
    rig.joint("hat", "head", HELM_C)
    KM.brodie(rig, "hat", c=HELM_C)
    g = Geo().capsule((6.0, -9.8, 57.5), (9.5, -8.0, 40.5), 0.7)   # chin strap
    rig.part("hat", g, R.LEATHER, outline=0.4)
    KI.loose(rig, "hat_loose", HELM_C, lambda j: KM.brodie(rig, j, c=HELM_C))

    for s in ("r", "l"):
        R.arm_parts(rig, s, rolled=True, fist=4.6)
        y = R.ARM_Y[s]
        g = Geo().blob((2.6, y - 1.5 * (1 if s == "r" else -1), R.HAND_Z + 0.6), (1.7, 1.6, 2.3), p=2.2)
        rig.part(f"hand_{s}", g, R.SKIN)                     # thumb
    R.shoulders(rig)
    # rank chevrons on the near sleeve (cream, the Modern emblem)
    sleeve = Geo().capsule((0, R.ARM_Y["r"], R.SHOULDER_Z), (0, R.ARM_Y["r"], R.ELBOW_Z), 4.4, 4.1)
    sface = F.Face(rig, "arm_r", [sleeve])
    g = KM.chevron(sface, Geo(), (0.6, 32.6), s=0.95, n=2, w=1.7, gap=2.9)
    rig.part("arm_r", g, KM.CREAM, highlight=False, outline=0)

    rig.joint("spade", "hand_r", FIST)
    _spade(rig, "spade")
    KI.loose(rig, "spade_loose", FIST, lambda j: _spade(rig, j))
    rig.track("spadeTip", "spade", TIP)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))


# -- poses (WORLD angles; KM.two_hand subtracts the torso lean) ------------------------------------
GRIP_D = 13.0     # the far hand grips the handle this far above the near fist


def grip(a, f, w, lean=0.0, far=True, d=GRIP_D):
    return KM.two_hand(a, f, w, d, lean=lean, far=far)


CARRY = (-52.0, 14.0, 58.0)      # the spade up and forward in both hands (port)
STANCE = merge(grip(*CARRY, lean=-3.0), {"torso": {"r": -3.0}})


def _idle(f):
    # the spade bounces on the beat (2) and again softly (5); he peeks left (1-2) and right (4)
    lift = [0.0, 0.7, -0.4, 0.2, 0.6, -0.3][f]
    peek = [0.0, -14.0, -16.0, 0.0, 12.0, 6.0][f]

    def extra(ctx):
        a, fo, w = CARRY
        return merge(grip(a + 5 * lift, fo + 8 * lift, w + 6 * lift, lean=-3.0),
                     {"head": {"rz": peek}, "hat": {"r": -0.6 * lift},
                      "brow": {"z": 0.5 * max(0.0, -lift)}, "pupils": {"x": 0.03 * peek}})
    base = {k: v for k, v in STANCE.items() if not k.startswith(("arm_", "fore_", "hand_"))}
    return M.idle_v2(f, base, frames=6, extra=extra, face_blink=F.expr("blink"), blink=3)


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        p = ctx["p"]
        return merge(grip(-58.0 + 3 * math.cos(p), 4.0 + 4 * lag, 30.0 - 6 * lag, lean=-13.0),
                     {"hat": {"r": -1.2 * lag}, "hips": {"z": -2.2}})
    base = {"torso": {"r": -13.0}}
    return M.walk_v2(f, base, HEIGHT_LU, thigh=40.0, knee=66.0, lift_lu=6.5, bob_pct=0.05, lean=-13.0,
                     arms=(), twist=6.0, extra=extra)


# 11 unique frames, moves.SMALL_MELEE_MS (impact on 6 at 290 of 680 ms). World angles.
#        read  scoop flick HOLD smear smear IMP  over recoil settle settle
A_A = [-52, -38, 20, 100, 55, 22, -14, -24, -14, -34, -48]
A_F = [14, -48, 70, 138, 36, 8, -20, -34, -12, 2, 12]
A_W = [58, -62, 78, 126, 48, 14, -26, -46, -14, 30, 52]
A_T = [-3, -24, -2, 12, -6, -16, -22, -18, -12, -6, -4]
A_Q = [0.0, -0.08, 0.06, -0.10, 0.06, 0.08, 0.10, 0.03, -0.05, 0.0, 0.0]
A_X = [0.0, 2.0, 0.5, -3.0, 1.5, 5.0, 8.0, 8.0, 6.0, 3.0, 1.0]
A_Z = [0.0, -3.0, 0.5, -2.5, -0.5, 0.0, -1.0, -1.5, -1.0, -0.5, 0.0]
A_HEAD = [0, 10, -4, -6, -2, 4, 8, 4, 2, 0, 0]
A_TH_R = [2, 22, 8, 4, 18, 26, 30, 28, 22, 12, 4]
A_SH_R = [0, -20, -4, -8, -12, -8, -4, -6, -8, -4, 0]
A_TH_L = [-2, -18, -8, -22, -26, -30, -32, -30, -24, -14, -4]
A_SH_L = [0, -18, -4, -16, -12, -6, 0, 0, -4, -2, 0]
FAR = [True, True, True, True, True, True, False, False, True, True, True]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(grip(A_A[f], A_F[f], A_W[f], lean=t, far=FAR[f]), {
        "torso": {"r": t},
        "head": {"r": A_HEAD[f] - 0.4 * t},
        "thigh_r": {"r": A_TH_R[f]}, "shin_r": {"r": A_SH_R[f]},
        "thigh_l": {"r": A_TH_L[f]}, "shin_l": {"r": A_SH_L[f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if not FAR[f]:   # one-handed follow-through: the far arm flings back for balance
        pose = merge(pose, R.arm("l", -150 - t, -170 - t))
    if f in (4, 5):
        pose["spade"] = {"sz": 1.16}
    if f == 3:
        pose["hat"] = {"r": 4.0, "z": 0.8}
    if f in (1, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif f in (2,):
        pose = merge(pose, F.expr("o"))
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return pose


SWING = {"kind": "arc", "joint": "spade", "inner": (FIST[0], FIST[1], FIST[2] + HANDLE * 0.6),
         "outer": (FIST[0], FIST[1], FIST[2] + HANDLE + BLADE * 0.85), "color": R.STEEL, "white": 0.35,
         "taper": 0.15, "lines": 3, "band": 0.55}


def _attack_clip():
    fw = (FIST[0] + 9.0, FIST[1], FIST[2] + HANDLE + BLADE * 0.6)     # just in front of the blade
    ov = {
        1: [{"kind": "dust", "joint": "spade", "point": TIP, "ground_snap": True, "size_lu": 7.0, "puffs": 4,
             "seed": 41, "spread": 1.0, "color": "#CDBB9C"}],
        2: [{"kind": "dust", "joint": "spade", "point": (fw[0] + 6.0, fw[1], fw[2] + 4.0), "size_lu": 5.5,
             "puffs": 3, "seed": 42, "spread": 1.2, "color": "#A48C70"},
            {"kind": "dust", "joint": "spade", "point": (fw[0] + 17.0, fw[1], fw[2] - 2.0), "size_lu": 3.4,
             "puffs": 3, "seed": 43, "spread": 1.6, "color": "#957E66"},
            {"kind": "dust", "joint": "spade", "point": TIP, "size_lu": 4.4, "puffs": 2, "seed": 44,
             "spread": 0.8, "color": "#A48C70"}],
        4: [dict(SWING, **{"from": 3, "t0": 0.05, "t1": 0.95})],
        5: [dict(SWING, **{"from": 3, "t0": 0.45, "t1": 1.0, "lines": 2})],
        6: [{"kind": "burst", "joint": "spade", "point": BLADE_C, "r0_lu": 10.0, "r1_lu": 17.0, "n": 6,
             "a0": -70.0, "arc": 150.0},
            {"kind": "dust", "ground": (18.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 45, "spread": 0.8},
            {"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 46, "spread": 0.7,
             "dir": -1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


def _hit(k):
    def recoil(a):
        return merge(grip(CARRY[0] + 18 * a, CARRY[1] + 20 * a, CARRY[2] + 14 * a, lean=-3.0) if a > 0 else {},
                     {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                      "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                      "hat": {"z": 3.0 * max(a, 0), "r": 10 * a}, "brow": {"z": 1.6 * max(a, 0)}})
    base = {"torso": {"r": -3.0}} if M.HIT_AMT[k] > 0 else STANCE
    return M.hit_light(k, base, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


SPADE_PATH = [None, (6, 20, 70), (10, 38, 190), (14, 42, 320), (18, 32, 440), (22, 14, 540),
              (24, 0, 600), (25, -6, 624), (25, -6, 624), (25, -6, 624)]
HAT_PATH = KI.hat_pop(land=57.0, back=58.0)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    hp = HAT_PATH[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    sp = SPADE_PATH[k]
    if sp is not None:
        x, z, r = sp
        pose["spade"] = {"hide": True}
        pose["spade_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
    return M.check_contract(cl)
