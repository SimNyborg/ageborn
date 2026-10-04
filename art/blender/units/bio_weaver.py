"""Bio-Weaver: Cosmic Age rare Support, heal (CONTENT_PLAN 5.8). A living-tendril healer, ~70 lu.

Look (A11, Cosmic palette): a slender star-legion healer in a flared team robe with a star-white hem and the pale
Cosmic star, a violet mantle, a star-white circlet with three star points over a dark visor band (mint eyes that
act). Living mint tendrils grow from the shoulders and the forearms and sway on follow-through; a mint seed-pod
glows at the belt.

"A viewer expects a druid of the stars: gliding softly, tendrils swaying, it flicks a tendril like a whip at
enemies and spreads its hands to heal."

Animation (ANIM_SPEC G2 brisk glide at card 65 x 1.25 = 81.25 lu/s, appendix B support):
  idle      floats in place on soft knees, the tendrils sway, it hums with the eyes closed, a blink
  walk      walk v3 brisk glide with the robe hem kicking, the tendrils trailing, a side sway
  attack    TENDRIL FLICK: draws the near arm back over the shoulder with the tendril coiled (the held extreme),
            then whips it forward, the tendril cracking out (an arc smear, the lash at the target)
  attack_b  PALM PULSE: both hands drawn in to the chest, leaning back (the held extreme), then thrust forward
            with a mint pulse ring
  hit       light: the head snaps back, the tendrils whip, eyes > <
  die       D3 dizzy sit: spins, sits down hard, spiral eyes, the tendrils droop
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

SLUG = "bio_weaver"
GAIT_NAME = "biped"
NAME = "Bio-Weaver"
HEIGHT_LU = 70
CANVAS = (300, 270)
FEET = (130, 232)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 30), "muzzle": (26, 30)}
NO_RETIME = True

HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
HL = (0.0, K.ARM_Y["l"], K.HAND_Z)
LASH_TIP = (HR[0] + 1.0, HR[1] - 1.0, HR[2] - 16.0)
TEND_DK = "#1C8A6A"


def _tendril(rig, joint, pts, r0=1.6, r1=0.7):
    g = Geo()
    n = len(pts) - 1
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        g.capsule(a, b, r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n, segs=8, rings=2)
    rig.part(joint, g, glow=CW.MINT, outline=0.9, outline_hex=TEND_DK)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KC.skeleton_v3(rig, head=(1, 0, 39))
    KC.legs_v3(rig, boot=CW.VIOLET_DK, knee=None, thigh_r=4.3, team_shin=True)
    K.arm_parts(rig, "l", sleeve=CW.VIOLET, bracer=None, glove=CW.STAR)
    CW.robe(rig, hem_z=11.0, color=CW.VIOLET_DK, front=CW.STAR)
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
    rig.part("torso", g, CW.VIOLET, finish="matte")
    g = Geo().blob((8.0, -9.0, 21.6), (2.6, 2.0, 3.0), p=2.2)
    rig.part("torso", g, glow=CW.MINT, outline=0.8, outline_hex=TEND_DK)
    # tendrils from the shoulders (follow-through)
    for i, (y, side) in enumerate(((-9.0, 1), (8.0, -1))):
        rig.secondary(f"tend{i}", "torso", (-6.0, y, 38.0), (-14.0, y, 22.0), max_deg=22, gain=1.4)
        _tendril(rig, f"tend{i}", [(-6.0, y, 38.0), (-11.0, y, 35.0), (-13.0, y, 28.0), (-11.0, y, 22.0), (-14.0, y, 18.0)])
    # an alien head: pale lilac skin, big cartoon eyes, a team circlet with three star points, two tendril locks
    head = Geo().blob((2.0, 0, 50.0), (11.4, 10.8, 12.0), p=2.2)
    KM.face2(rig, [head], CW.LILAC, 10.0, 51.5, eye_dy=(-6.8, 1.8), eye_r=(3.6, 3.4, 4.6), pupil_r=(1.6, 2.4, 2.6),
             brow=CW.LILAC_DK, brow_angry=False, mouth_w=5.2, mouth_dz=-7.0, mouth_shape="smile")
    rig.part("head", head, CW.LILAC, outline_hex=CW.LILAC_DK)
    g = Geo().lathe([(11.2, 0), (11.5, 1.6), (11.0, 3.0)], (2.0, 0, 56.0), (2.0, 0, 59.0), segs=26)
    rig.part("head", g, team=True, outline=0.6)
    for a in (-50, -10, 30):
        x = 2.0 + 11.0 * math.cos(math.radians(a))
        y = 11.0 * math.sin(math.radians(a)) * 0.95
        g = Geo().star((x, y - 0.6, 60.6), 2.4, 1.0, 1.0, points=4)
        rig.part("head", g, CW.STAR, finish="gloss", outline=0.6, outline_hex=CW.STAR_TRIM)
    for i, y in enumerate((-6.0, 5.0)):
        rig.secondary(f"lock{i}", "head", (-8.0, y, 54.0), (-14.0, y, 42.0), max_deg=20, gain=1.3)
        _tendril(rig, f"lock{i}", [(-8.0, y, 54.0), (-12.0, y, 50.0), (-12.5, y, 45.0), (-15.0, y, 41.0)], r0=1.8, r1=0.8)
    K.arm_parts(rig, "r", sleeve=CW.VIOLET, bracer=None, glove=CW.STAR)
    for s in ("r", "l"):
        y = K.ARM_Y[s]
        g = Geo().blob((0.2, y, K.HAND_Z + 3.6), (5.0, 4.8, 3.2), p=2.4, taper=(1.2, 0.9))
        rig.part(f"fore_{s}", g, team=True, outline=0.6)
        g = Geo().blob((0.4, y - 0.3 * K.SIDE_Y[s], 37.4), (6.6, 5.6, 5.2), p=2.6)
        rig.part(f"arm_{s}", g, team=True)
    # the lash tendril from the near wrist (coils on the hold, cracks out on the impact)
    rig.joint("lash", "hand_r", HR)
    _tendril(rig, "lash", [(HR[0] + 1.0, HR[1] - 1.0, HR[2] - 1.0), (HR[0] + 2.0, HR[1] - 1.0, HR[2] - 6.0),
                           (HR[0] + 0.0, HR[1] - 1.0, HR[2] - 11.0), LASH_TIP], r0=1.4, r1=0.6)
    rig.track("muzzle", "hand_r", (HR[0] + 3.0, HR[1], HR[2]))
    rig.joint("pulse", "torso", (14.0, 0, 28.0), hidden=True)
    g = Geo().lathe([(5.0, 0), (7.6, 0.1), (7.6, 1.0), (5.0, 1.1)], (16.0, -10.0, 28.0), (17.0, -10.0, 28.0), segs=24)
    rig.part("pulse", g, glow=CW.MINT_CORE, outline=0.8, outline_hex=CW.MINT)


FACE_KO = {"g_hurt": ("squeeze", "grit"), "g_wide": ("o",), "g_spiral": ("spiral", "tongue")}


def _eyes(name):
    return {"g_angry": FC.expr("grit"), "g_squint": FC.expr("squeeze"), "g_wide": FC.expr("yell"),
            "g_happy": {}, "eyes": {}}[name]


def arms(r, l):
    a, f = K.ik2(K.SH, r)
    la, lf = K.ik2(K.SH, l)
    return merge(K.arm("r", a, f), K.arm("l", la, lf))


STANCE = merge(arms((6.0, 25.0), (4.0, 24.0)), {"torso": {"r": -1.0}})


def _idle(f):
    def extra(ctx):
        return {"tend0": {"r": 6 * ctx["lag"]}, "tend1": {"r": -5 * ctx["lag"]}, "lash": {"r": 8 * ctx["c"]},
                "head": {"r": 3.0 * math.sin(4 * math.pi * f / 6)}}
    pose = M.idle_v2(f, STANCE, frames=6, bob=1.2, chest=0.035, extra=extra)
    if f == 2:
        pose = merge(pose, FC.expr("blink"))
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 81.25
LEGS = KC.legs_ik()
GAIT = KC.jog_gait(LEGS, SPEED, cycle_ms=616, stance=0.58, lift=4.6, kick=2.0, toe_off=20.0, early_lift=1.4)
GLIDE_BOB = [-2.8, -3.4, 0.0, 1.2]


def _walk(f, report=None):
    def extra(ctx):
        c = math.cos(ctx["lag_p"])
        return merge(arms((4.0 + 3.0 * c, 24.0), (2.0 - 3.0 * c, 24.0)), {
            "lash": {"r": 10 * c}, "body": {"rx": 3 * math.sin(ctx["p"])}, "head": {"rx": -3 * math.sin(ctx["p"])}})
    return M.walk_v3(RIG, f, {"torso": {"r": -1.0}}, GAIT, legs=LEGS, bob=GLIDE_BOB, sq=M.BRISK_SQ, lean=-4.0, twist=5.0,
                     nod=3.0, sway=5.0, extra=extra, report=report)


# -- attack: tendril flick (900 ms, the lash lands at 450 ms = 0.5) -------------------------------------
ATTACK_MS = [60, 80, 100, 160, 50, 100, 90, 90, 80, 90]
ATTACK_IMPACT = 5
A_R = [(6, 25), (2, 34), (-4, 42), (-6, 44), (6, 42), (15, 34), (14, 31), (11, 28), (8, 26), (6, 25)]
A_LASH = [0, 60, 130, 150, 90, 20, 10, 0, 0, 0]
A_T = [-1, 3, 6, 8, -4, -12, -10, -6, -2, -1]
A_EYES = ["eyes", "g_angry", "g_angry", "g_squint", "g_angry", "g_wide", "g_happy", "eyes", "eyes", "eyes"]


def _a_pose(f):
    pose = merge(arms(A_R[f], (4.0 + (4.0 if f in (2, 3) else 0.0), 24.0)), {
        "torso": {"r": A_T[f]}, "head": {"r": -0.5 * A_T[f]}, "lash": {"r": A_LASH[f], "sz": 1.25 if f == 5 else 1.0},
        "tend0": {"r": [0, 6, 12, 14, 0, -14, -10, -4, 0, 0][f]},
        "thigh_r": {"r": [0, -4, -8, -10, 12, 22, 20, 12, 4, 0][f]}, "shin_r": {"r": [0, -2, -4, -4, -10, -16, -14, -8, -2, 0][f]},
        "thigh_l": {"r": [0, 8, 12, 14, -8, -16, -14, -8, -2, 0][f]},
    }, M.body_about((0, 0, 24), x=[0, -0.5, -1.5, -2, 1, 3.5, 3, 1.5, 0.5, 0][f], q=[0, 0.02, 0.04, 0.05, 0, -0.08, -0.03, 0, 0, 0][f]))
    return KI.ground_feet(RIG, merge(pose, _eyes(A_EYES[f])), LEGS)


LASH_ARC = {"kind": "arc", "joint": "lash", "inner": (HR[0] + 1.0, HR[1] - 1.0, HR[2] - 6.0), "outer": LASH_TIP,
            "color": CW.MINT, "white": 0.35, "taper": 0.2, "lines": 2, "t0": 0.0, "t1": 1.0}


def _attack_clip():
    ov = {4: [dict(LASH_ARC, **{"from": 3})], 5: [dict(LASH_ARC, **{"from": 4})] +
          CW.fire_fx("lash", LASH_TIP, CW.MINT_CORE, a0=-30.0)}
    return M.clip("attack", [_a_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 3})


# -- attack B: palm pulse ------------------------------------------------------------------------------
B_R = [(6, 25), (3, 30), (1, 31), (0, 31), (8, 31), (15, 31), (14, 30), (11, 28), (8, 26), (6, 25)]
B_L = [(4, 24), (3, 30), (1, 31), (0, 31), (8, 32), (15, 33), (14, 31), (10, 27), (6, 25), (4, 24)]
B_T = [-1, 6, 12, 14, 0, -12, -10, -6, -2, -1]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    pose = merge(arms(B_R[f], B_L[f]), {
        "torso": {"r": B_T[f]}, "head": {"r": -0.4 * B_T[f]}, "pulse": {"show": f in (5, 6)},
        "tend0": {"r": [0, 8, 14, 16, 4, -12, -10, -4, 0, 0][f]}, "tend1": {"r": [0, -6, -12, -14, -2, 10, 8, 4, 0, 0][f]},
        "lash": {"r": 20 if f in (2, 3) else 0},
    }, M.body_about((0, 0, 24), x=[0, -1, -2, -2.5, 0.5, 3, 2.5, 1, 0, 0][f], z=[0, 0.5, 1.0, 1.2, 0, -1.5, -1, 0, 0, 0][f]))
    return KI.ground_feet(RIG, merge(pose, _eyes(A_EYES[f])), LEGS)


def _attack_b():
    ov = {3: CW.rings_fx("torso", (8.0, -10.0, 31.0), (5.0, 7.5), CW.MINT_CORE, -180.0, 180.0),
          5: CW.fire_fx("hand_r", (HR[0] + 3.0, HR[1], HR[2]), CW.MINT_CORE, a0=-60.0) + CW.dust_fx(16.0, 421)}
    return M.clip("attack_b", [_b_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse={0: ("attack", 0), 9: ("attack", 9)}, extra={"holdStep": 3})


def _hit(k):
    def recoil(a):
        return {"arm_r": {"r": 14 * a}, "arm_l": {"r": 18 * a}, "head": {"r": 14 * a}, "torso": {"r": 10 * a},
                "tend0": {"r": 20 * a}, "tend1": {"r": 16 * a}, "lash": {"r": 30 * a}}
    return M.hit_light(k, STANCE, recoil, face_hurt=FC.expr("squeeze", "grit"), face_back=FC.expr("o") if k == 2 else None)


def _die(k):
    def extra(k, t):
        return {"hem": {"sz": 1.0 - 0.6 * t, "sx": 1.0 + 0.15 * t, "r": -20 * t}, "tend0": {"r": -30 * t},
                "tend1": {"r": -26 * t}, "lash": {"r": -40 * t}}
    return CW.die_d3(k, STANCE, extra=extra, height=HEIGHT_LU, face=lambda g: FC.expr(*FACE_KO[g]))


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
