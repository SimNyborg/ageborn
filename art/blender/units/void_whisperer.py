"""Void Whisperer: Cosmic Age rare Support, Dread aura (CONTENT_PLAN 5.8, X0 M4). A hooded void mystic, ~72 lu.

Look (A11, Cosmic palette): a tall hooded figure in a flared team robe with a star-white hem and star specks, a
dark void mantle, a deep violet hood with a team rim over a dark faceplate whose light violet eye glyphs glow.
Two long violet ribbons drift from the shoulders, and a small void orb (a dark sphere ringed in violet light)
floats at its chest. Enemies near it are slowed (the game draws the faint dread ring).

"A viewer expects a creepy space monk: it drifts forward in a slow procession and whispers a ripple of void at
its foes."

Animation (ANIM_SPEC G2 slow procession at card 60 x 1.25 = 75 lu/s, appendix B support):
  idle      hovers on soft knees, the ribbons drift, the orb circles, the eyes narrow and widen
  walk      walk v3 brisk procession with a sway, the hem kicking, the ribbons trailing
  attack    WHISPER: cups both hands at the faceplate and leans in (the held extreme), then leans forward and a
            violet ripple rolls out of the hands (a ring smear)
  attack_b  VOID PUSH: arms flung wide and high, rising on the toes (the held extreme), then both palms drive
            down and forward with a ripple
  hit       light: the head snaps back, the ribbons whip, eyes > <
  die       D3 dizzy sit: spins, sits down hard, spiral eyes, the orb fades
"""
import math

from ageborn_art import face as FC
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_cosmic_wave as CW
from ageborn_art import kit_future as KF
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as KM
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "void_whisperer"
GAIT_NAME = "biped"
NAME = "Void Whisperer"
HEIGHT_LU = 72
CANVAS = (300, 270)
FEET = (130, 232)
ANCHORS = {"head": (2, 72), "hitCenter": (0, 30), "muzzle": (22, 44)}
NO_RETIME = True

HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
HL = (0.0, K.ARM_Y["l"], K.HAND_Z)
LASH_TIP = (HR[0] + 1.0, HR[1] - 1.0, HR[2] - 16.0)
TEND_DK = "#6B3399"


def _tendril(rig, joint, pts, r0=1.6, r1=0.7):
    g = Geo()
    n = len(pts) - 1
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        g.capsule(a, b, r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n, segs=8, rings=2)
    rig.part(joint, g, CW.VIOLET, finish="matte", outline=0.9, outline_hex=TEND_DK)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KC.skeleton_v3(rig, head=(1, 0, 39))
    KC.legs_v3(rig, boot=CW.VIOLET_DK, knee=None, thigh_r=4.3, team_shin=True)
    K.arm_parts(rig, "l", sleeve=CW.VIOLET, bracer=None, glove=CW.STAR)
    CW.robe(rig, hem_z=11.0, front=CW.VOID_LT)
    g = Geo().blob((0, 0, 20.0), (11.0, 10.6, 7.4), p=2.6, taper=(1.12, 0.95))
    rig.part("hips", g, team=True)
    # torso: team robe top with the star, a star-white sash, a violet mantle; the seed pod at the belt
    g = Geo().blob((0, 0, 28), (9.6, 9.4, 11.0), p=2.4, taper=(0.95, 1.05))
    cf = FC.Face(rig, "torso", [g])
    star = KC.starmark(cf, Geo(), KM.scr(cf, (6.0, -8.0, 28.4)), s=0.95)
    rig.part("torso", star, KC.STAR_PALE, highlight=False, outline=0)
    rig.part("torso", g, team=True)
    g = Geo().blob((0.4, 0, 22.2), (10.2, 10.0, 2.2), p=3.4)
    rig.part("torso", g, CW.STAR, finish="gloss", outline_hex=CW.STAR_TRIM)
    g = Geo().blob((-1.0, 0, 36.0), (11.0, 12.2, 5.4), p=2.4, taper=(1.2, 0.8))
    rig.part("torso", g, CW.VOID_LT, finish="matte")
    rig.joint("orb", "torso", (13.0, -6.0, 28.0))
    g = Geo().sphere((13.0, -6.0, 28.0), 3.0, cuts=3)
    rig.part("orb", g, CW.VOID_DK, outline=0.6, outline_hex=CW.VIOLET)
    g = Geo().lathe([(3.6, 0), (4.8, 0.1), (4.8, 0.8), (3.6, 0.9)], (13.0, -6.0, 28.0), (13.0, -6.4, 28.4), segs=20)
    rig.part("orb", g, glow=CW.GLOW, outline=0)
    # tendrils from the shoulders (follow-through)
    for i, y in enumerate((-9.0, 8.0)):
        rig.secondary(f"tend{i}", "torso", (-6.0, y, 38.0), (-16.0, y, 24.0), max_deg=22, gain=1.4)
        g = Geo().slab([(-5.0, 39.0), (-12.0, 34.0), (-17.0, 26.0), (-21.0, 19.0), (-18.0, 18.0), (-14.0, 25.0),
                        (-9.0, 32.0), (-4.0, 36.0)], y, 1.4)
        rig.part(f"tend{i}", g, CW.VIOLET, finish="matte", outline=0.8, outline_hex=TEND_DK)
    CW.hood(rig, eye_color=CW.KC.VIO_EYE, eye_core=K.VIOLET_CORE)
    K.arm_parts(rig, "r", sleeve=CW.VIOLET, bracer=None, glove=CW.STAR)
    for s in ("r", "l"):
        y = K.ARM_Y[s]
        g = Geo().blob((0.2, y, K.HAND_Z + 3.6), (5.0, 4.8, 3.2), p=2.4, taper=(1.2, 0.9))
        rig.part(f"fore_{s}", g, team=True, outline=0.6)
        g = Geo().blob((0.4, y - 0.3 * K.SIDE_Y[s], 37.4), (6.6, 5.6, 5.2), p=2.6)
        rig.part(f"arm_{s}", g, team=True)
    rig.track("muzzle", "hand_r", (HR[0] + 3.0, HR[1], HR[2]))
    rig.joint("pulse", "torso", (14.0, 0, 28.0), hidden=True)
    g = Geo().lathe([(5.0, 0), (7.6, 0.1), (7.6, 1.0), (5.0, 1.1)], (16.0, -10.0, 28.0), (17.0, -10.0, 28.0), segs=24)
    rig.part("pulse", g, glow=CW.GLOW_CORE, outline=0.8, outline_hex=CW.GLOW)


def arms(r, l):
    a, f = K.ik2(K.SH, r)
    la, lf = K.ik2(K.SH, l)
    return merge(K.arm("r", a, f), K.arm("l", la, lf))


STANCE = merge(arms((6.0, 25.0), (4.0, 24.0)), {"torso": {"r": -1.0}})


def _idle(f):
    def extra(ctx):
        return {"tend0": {"r": 6 * ctx["lag"]}, "tend1": {"r": -5 * ctx["lag"]}, "orb": {"z": 1.2 * ctx["c"], "x": 1.0 * ctx["lag"]},
                "head": {"r": 3.0 * math.sin(4 * math.pi * f / 6)}}
    pose = M.idle_v2(f, STANCE, frames=6, bob=1.2, chest=0.035, extra=extra)
    pose = merge(pose, KF.glyph(["eyes", "g_squint", "g_blink", "g_wide", "eyes", "eyes"][f]))
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 75.0
LEGS = KC.legs_ik()
GAIT = KC.jog_gait(LEGS, SPEED, cycle_ms=616, stance=0.58, lift=4.6, kick=2.0, toe_off=20.0, early_lift=1.4)
GLIDE_BOB = [-2.8, -3.4, 0.0, 1.2]


def _walk(f, report=None):
    def extra(ctx):
        c = math.cos(ctx["lag_p"])
        return merge(arms((4.0 + 3.0 * c, 24.0), (2.0 - 3.0 * c, 24.0)), {
            "body": {"rx": 3 * math.sin(ctx["p"])}, "head": {"rx": -3 * math.sin(ctx["p"])}})
    return M.walk_v3(RIG, f, {"torso": {"r": -1.0}}, GAIT, legs=LEGS, bob=GLIDE_BOB, sq=M.BRISK_SQ, lean=-4.0, twist=5.0,
                     nod=3.0, sway=5.0, extra=extra, report=report)


# -- attack: whisper (900 ms, the ripple leaves at 450 ms = 0.5) ----------------------------------------
ATTACK_MS = [60, 80, 100, 160, 50, 100, 90, 90, 80, 90]
ATTACK_IMPACT = 5
A_R = [(6, 25), (6, 34), (8, 41), (8, 43), (12, 42), (16, 40), (15, 37), (11, 31), (8, 27), (6, 25)]
A_L = [(4, 24), (5, 34), (7, 41), (7, 43), (11, 42), (15, 41), (14, 37), (10, 30), (6, 26), (4, 24)]
A_T = [-1, 2, 4, 6, -6, -16, -14, -8, -3, -1]
A_EYES = ["eyes", "g_squint", "g_squint", "g_squint", "g_angry", "g_wide", "g_angry", "eyes", "eyes", "eyes"]


def _a_pose(f):
    pose = merge(arms(A_R[f], A_L[f]), {
        "torso": {"r": A_T[f]}, "head": {"r": -0.4 * A_T[f] + (6 if f in (2, 3) else 0)}, "pulse": {"show": f in (5, 6)},
        "tend0": {"r": [0, 4, 8, 10, 0, -14, -10, -4, 0, 0][f]}, "tend1": {"r": [0, -4, -6, -8, 2, 12, 8, 4, 0, 0][f]},
        "orb": {"s": [1, 1.1, 1.2, 1.3, 1.2, 0.8, 0.9, 1, 1, 1][f]},
        "thigh_r": {"r": [0, -2, -4, -4, 10, 18, 16, 10, 4, 0][f]}, "shin_r": {"r": [0, 0, -2, -2, -8, -14, -12, -6, -2, 0][f]},
        "thigh_l": {"r": [0, 4, 6, 6, -6, -12, -10, -6, -2, 0][f]},
    }, M.body_about((0, 0, 24), x=[0, -0.5, -1.0, -1.5, 1, 3.5, 3, 1.5, 0.5, 0][f], q=[0, 0.02, 0.04, 0.05, 0, -0.06, -0.03, 0, 0, 0][f]))
    return KI.ground_feet(RIG, merge(pose, KF.glyph(A_EYES[f])), LEGS)


def _ripple(radii, a0=-60.0, a1=60.0):
    return [{"kind": "rings", "joint": "hand_r", "point": (HR[0] + 6.0, HR[1], HR[2]), "radii_lu": radii,
             "a0": a0, "a1": a1, "color": CW.GLOW_CORE}]


def _attack_clip():
    ov = {3: _ripple((4.0, 6.0), -180.0, 180.0), 4: _ripple((7.0, 10.0)), 5: _ripple((10.0, 15.0)) + _ripple((17.0, 21.0))}
    return M.clip("attack", [_a_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 3})


# -- attack B: void push --------------------------------------------------------------------------------
B_R = [(6, 25), (2, 40), (-2, 46), (-3, 47), (6, 44), (14, 32), (15, 28), (11, 27), (8, 26), (6, 25)]
B_L = [(4, 24), (6, 42), (8, 47), (8, 48), (12, 44), (15, 34), (15, 30), (10, 27), (6, 25), (4, 24)]
B_T = [-1, 6, 12, 14, 0, -14, -16, -8, -2, -1]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    pose = merge(arms(B_R[f], B_L[f]), {
        "torso": {"r": B_T[f]}, "head": {"r": -0.4 * B_T[f]}, "pulse": {"show": f in (5, 6)},
        "tend0": {"r": [0, 8, 14, 16, 4, -12, -10, -4, 0, 0][f]}, "tend1": {"r": [0, -6, -12, -14, -2, 10, 8, 4, 0, 0][f]},
        "orb": {"z": [0, 4, 7, 8, 4, -2, -2, 0, 0, 0][f]},
    }, M.body_about((0, 0, 24), x=[0, -1, -2, -2.5, 0.5, 3, 3.5, 1, 0, 0][f], z=[0, 1.0, 2.0, 2.4, 0.5, -2.0, -2.5, -1, 0, 0][f]))
    return KI.ground_feet(RIG, merge(pose, KF.glyph(A_EYES[f])), LEGS)


def _attack_b():
    ov = {3: [{"kind": "rings", "joint": "torso", "point": (4.0, -8.0, 48.0), "radii_lu": (8.0, 12.0), "a0": -180.0,
               "a1": 180.0, "color": CW.GLOW_CORE}],
          5: _ripple((9.0, 14.0), -90.0, 30.0) + CW.dust_fx(16.0, 431)}
    return M.clip("attack_b", [_b_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse={0: ("attack", 0), 9: ("attack", 9)}, extra={"holdStep": 3})


def _hit(k):
    def recoil(a):
        return {"arm_r": {"r": 14 * a}, "arm_l": {"r": 18 * a}, "head": {"r": 14 * a}, "torso": {"r": 10 * a},
                "tend0": {"r": 20 * a}, "tend1": {"r": 16 * a}, "orb": {"x": -3 * a}}
    return M.hit_light(k, STANCE, recoil, face_hurt=KF.glyph("g_hurt"), face_back=KF.glyph("g_angry") if k == 2 else None)


def _die(k):
    def extra(k, t):
        return {"hem": {"sz": 1.0 - 0.6 * t, "sx": 1.0 + 0.15 * t, "r": -20 * t}, "tend0": {"r": -30 * t},
                "tend1": {"r": -26 * t}, "orb": {"s": max(0.05, 1.0 - t), "z": -6 * t}}
    return CW.die_d3(k, STANCE, extra=extra, height=HEIGHT_LU)


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
    return M.check_variants(M.check_contract(cl, attack_ms=900, attack_impact_at=0.5))
