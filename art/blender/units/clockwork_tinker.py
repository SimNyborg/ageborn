"""Clockwork Tinker: Industrial Age rare Summoner (CONTENT_PLAN 5.5, X0 M3). Big wind-up key, ~64 lu.

Look (A11, Industrial palette): a small, round old inventor with a white walrus moustache and wild
white hair, round brass spectacles, a team waistcoat with a cream cog over a cream shirt, a leather
apron with pockets, iron-blue trousers and boots, and a backpack of brass gears and springs. He
carries an oversized brass wind-up key (a butterfly bow, a long stem, a leather grip).

"A viewer expects him to bonk foes with the big key, and to hurry along in a waddle, the gears on his
back ticking round." (His summon, the Clockwork Soldier, appears with a puff; no clip.)

Animation (ANIM_SPEC G2 hurried waddle, appendix B for a club: tap-tap-BONK, jab, low hook):
  idle      winds the key in the air and listens, the gears tick, blink
  walk      walk v3 brisk waddle at ground speed (card 65 x 1.25 = 81.25 lu/s): the key on the
            shoulder bobbing a frame late, the far fist pumping, the gear pack bouncing
  attack    TAP-TAP-BONK: two little taps with the key, then he rears it high over his head (the held
            extreme) and bonks it down on the target (a crescent smear, a ring of stars)
  attack_b  WIND-UP JAB: jabs the key's bow forward like winding a clock and twists it (a turning ring)
  attack_c  LOW HOOK: crouches with the key trailing behind his knee, then hooks it up into the legs
  hit       light: the head snaps back, the spectacles bounce
  die       D1 fling and spin: the key flies, springs pop out of the pack, X eyes and tongue
"""
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "clockwork_tinker"
GAIT_NAME = "biped"
NAME = "Clockwork Tinker"
HEIGHT_LU = 64
CANVAS = (296, 272)
FEET = (128, 244)
ANCHORS = {"head": (2, 62), "hitCenter": (0, 30)}
NO_RETIME = True

FIST = (0.4, I.ARM_Y["r"] - 1.4, I.HAND_Z - 0.4)
HAFT = 24.0
HEAD_Z = FIST[2] + HAFT - 1.0
TIP = (FIST[0] + 6.0, FIST[1], HEAD_Z + 2.0)        # the key bow (the bonking end)
CAP_C = (1.0, 0.0, 57.4)
SHIRT = "#9C9A94"          # grey work shirt
SHIRT_DK = "#85837D"
WHITE = "#ECE6DA"
APRON = "#6B5444"
HAFT_C = "#C9AE84"


def _pick(rig, joint, fist):
    """The big brass wind-up key along +Z from the fist; returns the bow centre."""
    cx, cy, cz = fist
    g = Geo().capsule((cx, cy, cz - 4.0), (cx, cy, cz + 3.0), 1.9, 1.8)
    rig.part(joint, g, I.LEATHER, outline=0.5)
    g = Geo().capsule((cx, cy, cz + 3.0), (cx, cy, cz + HAFT - 6.0), 1.5, 1.5)
    g.blob((cx, cy, cz - 5.0), (2.6, 1.6, 1.8), p=2.6)                  # the bit
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.6)
    hz = cz + HAFT - 1.0
    g = Geo()
    for sx in (-1, 1):                                                   # butterfly bow
        g.blob((cx + sx * 5.6, cy, hz + 1.0), (5.0, 1.6, 4.4), p=2.4)
    g.blob((cx, cy, hz - 3.0), (2.6, 1.8, 2.6), p=2.6)
    rig.part(joint, g, I.BRASS, finish="metal", outline=0.8)
    g = Geo()
    for sx in (-1, 1):
        g.blob((cx + sx * 5.6, cy - 1.0, hz + 1.0), (2.0, 1.0, 1.6), p=2.4)
    rig.part(joint, g, I.COAL_LT, outline=0, highlight=False)           # holes in the bow
    return (cx, cy, hz + 1.0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=I.DENIM)
    g = Geo().blob((0, 0, 27.6), (11.2, 10.6, 11.4), p=2.4, taper=(1.12, 0.9))   # round belly
    rig.part("torso", g, I.CREAM)
    vest = Geo().blob((0.4, 0, 27.0), (11.8, 11.0, 10.6), p=2.6, taper=(1.08, 0.9))
    vest.clip((0, 0, 35.0), (0, 0, 1))
    vface = F.Face(rig, "torso", [Geo().blob((0.4, 0, 27.0), (11.8, 11.0, 10.6), p=2.6, taper=(1.08, 0.9))])
    rig.part("torso", vest, team=True)
    g = KI.cog(vface, Geo(), (10.4, 28.4), s=0.9)
    rig.part("torso", g, KI.CREAM, highlight=False, outline=0)
    g = Geo().blob((0.5, 0, 15.6), (11.4, 10.6, 4.4), p=2.6, taper=(1.08, 1.0))
    g.clip((0, 0, 13.0), (0, 0, -1))
    rig.part("hips", g, team=True)
    rig.secondary("apron", "hips", (9.0, 0, 20.0), (10.0, 0, 12.0), max_deg=18, gain=1.2)
    g = Geo().blob((11.0, 0, 17.0), (1.8, 8.0, 6.0), p=2.6)
    rig.part("apron", g, APRON, outline=0.6)
    g = Geo().blob((12.6, -2.6, 16.2), (0.8, 2.6, 2.0), p=2.6)
    rig.part("apron", g, I.LEATHER_DK, outline=0.4)
    # the gear pack: a brass frame with cogs that tick round on their own joint
    rig.joint("pack", "torso", (-11.0, 0, 29.0))
    g = Geo().blob((-12.0, 0, 28.0), (4.0, 8.4, 8.6), p=3.0)
    rig.part("pack", g, team=True, outline=0.7)
    rig.joint("gears", "pack", (-14.0, -3.0, 31.0))
    g = Geo().star((-14.0, -6.0, 32.0), 5.2, 4.0, 1.6, points=9)
    g.star((-15.0, -5.6, 23.4), 3.6, 2.7, 1.4, points=7)
    rig.part("gears", g, I.BRASS_LT, finish="metal", outline=0.6)
    g = Geo().sphere((-14.0, -7.2, 32.0), 1.4, cuts=2)
    rig.part("gears", g, I.IRON_DK, finish="metal", outline=0.3)
    rig.secondary("spring", "pack", (-11.0, 0, 37.0), (-12.0, 0, 44.0), max_deg=28, gain=1.6)
    g = Geo()
    for k in range(4):
        g.lathe([(1.6, 0), (1.8, 0.6), (1.6, 1.2)], (-11.5, 0, 37.5 + k * 1.6), (-11.5, 0, 38.7 + k * 1.6), segs=12)
    rig.part("spring", g, I.IRON_LT, finish="metal", outline=0.3)

    face = KI.head_face(rig, brow=WHITE, brow_angry=False, mouth_dz=-9.2, mouth_w=5.6)
    del face
    I.moustache(rig, WHITE, curl=True, big=1.2)
    g = Geo().blob((-6.0, 0, 50.0), (6.0, 11.4, 6.4), p=2.0)            # wild white hair (a fringe at the back)
    g.blob((-1.0, -10.8, 53.0), (3.6, 2.6, 3.6), p=2.0)
    g.blob((-1.0, 10.8, 53.0), (3.6, 2.6, 3.6), p=2.0)
    rig.part("head", g, WHITE, finish="hair")
    I.ear(rig)
    rig.joint("hat", "head", CAP_C)
    _cap(rig, "hat")
    KI.loose(rig, "hat_loose", CAP_C, lambda j: _cap(rig, j))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=None, team_sleeve=True, fist=4.4, cuff=I.CREAM_DK)
        y = I.ARM_Y[s]
        g = Geo().blob((2.6, y - 1.5 * (1 if s == "r" else -1), I.HAND_Z + 0.6), (1.7, 1.6, 2.3), p=2.2)
        rig.part(f"hand_{s}", g, I.SKIN)

    rig.joint("key", "hand_r", FIST)
    rig.rest_scale["key"] = 1.15
    tip = _pick(rig, "key", FIST)
    KI.loose(rig, "key_loose", FIST, lambda j: _pick(rig, j, FIST))
    rig.track("keyBow", "key", tip)
    I.fuse_spark(rig, "key", (tip[0] + 1.0, tip[1] - 2.0, tip[2] - 1.0), size=2.0, name="clink", hidden=True)


def _cap(rig, joint):
    """Round brass spectacles (they bounce on hits and pop off in the death)."""
    x, y, z = CAP_C
    g = Geo()
    for yy in (-4.6, 4.2):
        g.lathe([(3.0, 0), (3.4, 0.4), (3.0, 0.8)], (x + 11.6, yy, z - 7.0), (x + 12.4, yy, z - 7.0), segs=16)
    g.capsule((x + 12.2, -1.6, z - 7.0), (x + 12.2, 1.2, z - 7.0), 0.5)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.5)
    g = Geo()
    for yy in (-4.6, 4.2):
        g.blob((x + 12.3, yy, z - 7.0), (0.4, 2.8, 2.8), p=2.2)
    rig.part(joint, g, I.GLASS, finish="gloss", outline=0)


# -- poses ---------------------------------------------------------------------------------
def grip(a, f, w, la=-80.0, lf=-50.0, lean=0.0):
    """World angles: near arm (a, f) with the pick pointing w; far arm (la, lf)."""
    return merge(KI.aim_arm("r", a, f, lean, w), KI.aim_arm("l", la, lf, lean))


REST = (-60.0, 18.0, 132.0)     # the key sloped back on the shoulder
STANCE = merge(grip(-70.0, 10.0, 96.0, -70.0, -20.0, lean=-2.0), {"torso": {"r": -2.0}})


def _idle(f):
    wind = [0.0, 0.5, 1.0, 0.5, 0.0, -0.5][f]

    def extra(ctx):
        return merge(grip(-70.0, 10.0, 96.0 + 20 * wind, -50.0 + 30 * abs(wind), 30.0 + 40 * abs(wind), lean=-2.0),
                     {"head": {"r": -4, "rz": 10 * abs(wind)}, "gears": {"r": 40 * f}, "spring": {"r": 3 * ctx["lag"]}})
    return M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


SPEED = 81.25
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=560, stance=0.44)
CARRY = merge(grip(*REST, lean=-8.0), {"torso": {"r": -3.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": -8 * lag}, "arm_r": {"r": 4 * lag}, "fore_r": {"r": -3 * lag},
                "hat": {"r": -2.0 * lag}, "gears": {"r": 8 * lag}}
    return M.walk_v3(RIG, f, merge(CARRY, {"gears": {"r": 45 * f}}), GAIT, legs=LEGS, bob=M.BRISK_BOB, sq=M.BRISK_SQ,
                     lean=-6.0, twist=9.0, nod=3.0,
                     arms={"l": KI.ArmChain("l")}, arm=36.0, extra=extra, report=report)


# -- attack A: tap-tap-BONK. Unique frames: 0 read, 1 raise, 2 tap, 3 HOLD (key high over his head),
# 4 smear, 5 IMPACT (bonk, squash), 6 recoil, 7 settle, 8 settle. Steps: read, raise, tap, raise, HOLD,
# smear | IMPACT, recoil, settle, settle (pre-impact 290 of 680 ms, as SMALL_MELEE).
A_SEQ = [0, 1, 2, 1, 3, 4, 5, 6, 7, 8]
A_MS = [30, 35, 30, 35, 125, 35, 120, 100, 90, 80]
#       read raise tap HOLD smear IMP recoil settle settle
A_A = [-60, -20, -40, 90, 50, -16, -30, -50, -58]
A_F = [18, 40, 0, 130, 60, -26, -10, 6, 14]
A_W = [132, 110, 30, 176, 70, -34, 0, 90, 126]
A_LA = [-70, -60, -60, -120, -90, -50, -60, -66, -70]
A_LF = [-20, -10, -10, -150, -100, -40, -30, -24, -20]
A_T = [-2, 0, -4, 8, -6, -18, -10, -5, -3]
A_X = [0.0, 0.0, 1.0, -1.5, 2.0, 6.0, 4.0, 1.5, 0.5]
A_Z = [0.0, 0.0, 0.0, 2.0, 1.0, -4.0, -1.4, -0.4, 0.0]
A_Q = [0.0, 0.0, -0.03, 0.10, 0.06, -0.16, -0.05, 0.0, 0.0]
A_THR = [2, 4, 8, -6, 14, 28, 14, 6, 2]
A_SHR = [0, -2, -6, -12, -14, -32, -10, -4, 0]
A_THL = [-2, -4, -6, 10, -10, -24, -12, -6, -2]
A_SHL = [0, 0, -4, -12, -8, -20, -6, -2, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(grip(A_A[f], A_F[f], A_W[f], A_LA[f], A_LF[f], lean=t), {
        "torso": {"r": t}, "head": {"r": -0.5 * t},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "clink": {"show": f == 5},
        "gears": {"r": 30 * f}, "spring": {"r": [0, 0, 4, -8, 4, 12, 6, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f == 3:
        pose = merge(pose, {"foot_r": {"r": -14}, "foot_l": {"r": -16}})
    if f == 4:
        pose["key"] = {"sz": 1.16}
    if f in (1, 2):
        pose = merge(pose, F.expr("grit"))
    elif f in (3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return KI.ground_feet(RIG, pose, LEGS, toes={"r": -14, "l": -16} if f == 3 else None)


ARC = {"kind": "arc", "joint": "key", "inner": (FIST[0], FIST[1], FIST[2] + HAFT * 0.5),
       "outer": TIP, "color": I.BRASS_LT, "white": 0.35, "taper": 0.15, "lines": 3}


def _bonk(seed):
    return [{"kind": "burst", "joint": "key", "point": TIP, "r0_lu": 7.0, "r1_lu": 14.0, "n": 7,
             "a0": 20.0, "arc": 160.0, "color": "#FFF4D6"},
            {"kind": "rings", "joint": "key", "point": TIP, "radii_lu": (5.0, 8.0), "a0": 0.0, "a1": 180.0,
             "color": "#FFF4D6"},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": seed, "spread": 0.8}]


def _attack_clip():
    ov = {
        2: [{"kind": "burst", "joint": "key", "point": TIP, "r0_lu": 3.0, "r1_lu": 6.0, "n": 4, "a0": 0.0, "arc": 120.0}],
        4: [dict(ARC, **{"from": 3, "t0": 0.0, "t1": 0.95})],
        5: [dict(ARC, **{"from": 4, "t0": 0.3, "t1": 1.0, "lines": 2})] + _bonk(71),
    }
    return M.clip("attack", [_attack_pose(f) for f in range(9)], A_MS, impact=5, smear=4, sequence=A_SEQ,
                  overlays=ov, extra={"holdStep": 4})


# -- attack B: wind-up jab: the key drawn back level at his chest, bow forward, then jabbed straight
# ahead and twisted like winding a clock. Unique frames: 0 = A read, 1 tuck, 2 HOLD, 3 smear,
# 4 IMPACT, 5 twist, 6 recoil, 7 = A settle, 8 = A settle; steps keep A's pre-impact 290 and 680 total.
B_SEQ = [0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8]
B_MS = [30, 35, 30, 70, 90, 35, 120, 60, 40, 80, 90]
#        tuck HOLD smear IMP twist recoil
B_A = [-100, -150, -90, -20, -18, -40]
B_F = [-20, -50, -20, -12, -6, 10]
B_W = [10, 4, 2, 0, 20, 40]
B_T = [-2, 4, -8, -18, -16, -10]
B_TZ = [14, 28, 10, -16, -18, -8]
B_X = [-1.0, -3.0, 2.0, 10.0, 10.5, 6.0]


def _b_pose(i):
    if i in (0, 7, 8):
        return _attack_pose(i)
    k = i - 1
    t = B_T[k]
    pose = merge(grip(B_A[k], B_F[k], B_W[k], -60 + 10 * k, -20, lean=t), {
        "torso": {"r": t, "rz": B_TZ[k]}, "head": {"r": -0.3 * t, "rz": -0.5 * B_TZ[k]},
        "thigh_r": {"r": [10, 22, 26, 36, 34, 22][k]}, "shin_r": {"r": [-14, -36, -30, -28, -24, -14][k]},
        "thigh_l": {"r": [-10, -22, -26, -38, -34, -20][k]}, "shin_l": {"r": [-10, -20, -12, -4, -4, -4][k]},
        "key": {"r": [0, 0, 0, 0, 0, 0][k]},
    }, M.body_about((0, 0, 22), x=B_X[k], z=-2.0, q=[-0.06, -0.10, 0.06, -0.12, 0.03, -0.04][k]))
    if k == 2:
        pose["key"] = dict(pose.get("key", {}), sz=1.14)
    pose = merge(pose, F.expr("yell" if k in (2, 3, 4) else "grit"))
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_b():
    jab = {"kind": "streak", "joint": "key", "point": TIP, "color": I.BRASS_LT, "width_lu": 8.0, "white": 0.35}
    ov = {
        3: [dict(jab, **{"from": 2, "t0": 0.0, "t1": 1.0})],
        4: [dict(jab, **{"from": 3, "t0": 0.4, "t1": 1.0, "width_lu": 6.0})] + _bonk(73),
        5: [{"kind": "rings", "joint": "key", "point": TIP, "radii_lu": (6.0, 9.0), "a0": -60.0, "a1": 220.0,
             "color": "#FFF4D6"}],
    }
    reuse = {0: ("attack", 0), 7: ("attack", 7), 8: ("attack", 8)}
    return M.clip("attack_b", [_b_pose(i) for i in range(9)], B_MS, impact=4, smear=3, sequence=B_SEQ,
                  overlays=ov, reuse=reuse, extra={"holdStep": 4})


# -- attack C: low hook: crouches with the key trailing behind his knee, then hooks it up and across.
# Unique frames: 0 = A read, 1 drop, 2 HOLD, 3 smear, 4 IMPACT, 5 bounce, 6 recoil, 7-8 = A settle.
C_SEQ = [0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8]
C_MS = [30, 35, 30, 70, 90, 35, 120, 60, 40, 80, 90]
#        drop HOLD smear IMP bounce recoil
C_A = [-110, -150, -60, -12, -10, -30]
C_F = [-130, -170, -40, -8, -6, -20]
C_W = [190, 200, 40, -6, -8, 20]
C_T = [-4, 4, -16, -20, -18, -10]
C_TZ = [12, 22, -10, -16, -14, -6]
C_DROP = [4.0, 7.0, 6.0, 5.0, 5.0, 3.0]


def _c_pose(i):
    if i in (0, 7, 8):
        return _attack_pose(i)
    k = i - 1
    t = C_T[k]
    pose = merge(grip(C_A[k], C_F[k], C_W[k], -60, -40, lean=t), {
        "torso": {"r": t, "rz": C_TZ[k]}, "head": {"r": -0.4 * t, "rz": -0.5 * C_TZ[k]},
        "clink": {"show": k == 3},
    }, M.body_about((0, 0, 22), x=[0.0, -1.0, 3.0, 5.0, 5.0, 2.0][k], z=-C_DROP[k],
                    q=[0.0, -0.06, 0.06, -0.12, 0.03, 0.0][k]))
    pose = merge(pose, F.expr("yell" if k in (2, 3, 4) else "grit"))
    return KI.ground_feet(RIG, pose, LEGS, max_drop=8.0)


def _attack_c():
    hook = dict(ARC, t0=0.0, t1=0.95, lines=3)
    ov = {
        3: [dict(hook, **{"from": 2})],
        4: [dict(hook, **{"from": 3, "t0": 0.3, "t1": 1.0, "lines": 2})] + _bonk(77),
    }
    reuse = {0: ("attack", 0), 7: ("attack", 7), 8: ("attack", 8)}
    return M.clip("attack_c", [_c_pose(i) for i in range(9)], C_MS, impact=4, smear=3, sequence=C_SEQ,
                  overlays=ov, reuse=reuse, extra={"holdStep": 4})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 14 * a}, "hand_r": {"r": 12 * a},
                "arm_l": {"r": 40 * a}, "fore_l": {"r": 20 * a},
                "hat": {"z": 3.0 * max(a, 0), "r": 10 * a}, "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, CARRY, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


KEY_PATH = [None, (6, 20, 60), (10, 36, 170), (14, 40, 300), (18, 30, 420), (21, 14, 520),
             (23, 0, 590), (24, -6, 612), (24, -6, 612), (24, -6, 612)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(CARRY, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    hp = KI.HAT_POP[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    wp = KEY_PATH[k]
    if wp is not None:
        x, z, r = wp
        pose["key"] = {"hide": True}
        pose["key_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
