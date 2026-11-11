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

W4 (the detail standard): the robe's pleats (team-dark), the void mantle's and the ribbons' folds, the hood's folds,
the pads' ridges, the legs' creases and seams; energy damage spots (a torn robe and hood, motes off the orb). No
aimed clips: `aimdata` gives its ripples as an omni emitter, as W2's Mesmerist.
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
from units import futcos_w4 as FW

SLUG = "void_whisperer"
GAIT_NAME = "biped"
NAME = "Void Whisperer"
HEIGHT_LU = 72
CANVAS = (300, 270)
FEET = (130, 232)
ANCHORS = {"head": (2, 72), "hitCenter": (0, 30), "muzzle": (22, 44)}
NO_RETIME = True

# W4 detail standard (look.py)
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 0.5
# (r37) a clearer light-to-shadow gradient and the team robe as cloth (its folds' breakup; polymer's 0.03 left the robe
# flat): r28 sat at flat 0.219 / 0.208, micro 3.91 / 3.96
LOOK_SHADE = dict(FW.SHADE_SOLDIER, gradient=2.7, cavity=0.78)
LOOK_RIM = dict(FW.RIM_SOLDIER, lift=0.42)
MATERIAL_KINDS = FW.kinds_cosmic({"team": "cloth"})
FACE_LINE = "#3A2E58"       # (r37) the faceplate's seams, a step over the visor black (the Starwarden's)

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
    _detail(rig)
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _detail(rig):
    """W4: the robe's team-dark pleats (hem, hips, robe top), the void mantle's folds, a fold down each ribbon, the
    hood's folds, the near pad's ridge, the legs' creases, team shin rims and boot seams (char space; decals cast)."""
    hem = FC.Face(rig, "hem", [Geo().blob((0.5, 0, 15.0), (12.4, 11.2, 6.2), p=2.6, taper=(1.25, 0.9))])
    FW.folds(rig, "hem", hem, [[FW.sc(hem, x, 19.0, -10.0), FW.sc(hem, x - 0.6, 14.6, -11.8), FW.sc(hem, x - 1.2, 11.4, -12.6)]
                               for x in (-6.0, -3.0, 0.0, 2.6, 5.0)], w=0.8, team=True)     # (r37: five, not three)
    hips = FC.Face(rig, "hips", [Geo().blob((0, 0, 20.0), (11.0, 10.6, 7.4), p=2.6, taper=(1.12, 0.95))])
    FW.folds(rig, "hips", hips, [[FW.sc(hips, x, 25.0, -9.0), FW.sc(hips, x - 0.4, 19.0, -10.6)] for x in (-5.0, 2.0)],
             w=0.8, team=True)
    top = FC.Face(rig, "torso", [Geo().blob((0, 0, 28), (9.6, 9.4, 11.0), p=2.4, taper=(0.95, 1.05))])
    FW.folds(rig, "torso", top, [[FW.sc(top, -4.6, 31.0, -8.4), FW.sc(top, -5.4, 27.0, -9.0), FW.sc(top, -4.8, 24.2, -8.8)]],
             w=0.8, team=True)
    man = FC.Face(rig, "torso", [Geo().blob((-1.0, 0, 36.0), (11.0, 12.2, 5.4), p=2.4, taper=(1.2, 0.8))])
    FW.panel_lines(rig, "torso", man, [[FW.sc(man, x, 39.4, -10.0), FW.sc(man, x + 1.0, 33.2, -12.2)] for x in (-6.0, 1.0)],
                   fill=FW.FOLD_ON_VOID, w=0.75)
    rib = FC.Face(rig, "tend0", [Geo().slab([(-5.0, 39.0), (-12.0, 34.0), (-17.0, 26.0), (-21.0, 19.0), (-18.0, 18.0),
                                             (-14.0, 25.0), (-9.0, 32.0), (-4.0, 36.0)], -9.0, 1.4)])
    FW.panel_lines(rig, "tend0", rib, [[FW.sc(rib, -6.4, 36.6, -9.8), FW.sc(rib, -12.4, 30.6, -9.8),
                                        FW.sc(rib, -17.6, 22.4, -9.8)]], fill=FW.LINE_ON_VIOLET, w=0.7)
    FW.cosmic_helmet(rig, "hood")
    # (r37) the dark faceplate in the hood: a brow seam over the eyes, a cheek seam under them and one down the front
    # (the face was one flat dark field in every frame), and more of the hood's folds: over its crown, down its back
    # and across the trailing tip (the Starwarden's r34/r34b)
    fp = FC.Face(rig, "head", [Geo().blob((3.0, 0, 49.0), (9.6, 9.0, 9.6), p=2.4)])
    pc, pr = (3.0, 0, 49.0), (9.6, 9.0, 9.6)
    FW.panel_lines(rig, "head", fp, [[FW.on_blob(fp, pc, pr, x, z, p=2.4) for x, z in pts] for pts in (
        ((6.0, 54.4), (9.0, 55.0), (11.6, 54.0)), ((6.4, 46.0), (9.0, 44.6), (11.4, 45.4)),
        ((11.2, 53.0), (11.8, 49.6), (11.0, 46.6)))], fill=FACE_LINE, w=0.8)
    hc, hr = (0.5, 0, 50.0), (12.4, 11.6, 12.6)
    hf = FC.Face(rig, "head", [Geo().blob(hc, hr, p=2.4, shift=(-0.15, 0))])
    FW.folds(rig, "head", hf, [[FW.on_blob(hf, hc, hr, x, z, p=2.4) for x, z in pts] for pts in (
        ((2.0, 60.6), (-2.4, 59.4), (-6.0, 56.6)), ((-1.6, 56.0), (-3.6, 50.0), (-2.8, 43.6)),
        ((-8.6, 58.0), (-10.4, 51.6)))], w=0.8, team=False, fill=FW.LINE_ON_VIOLET)
    tf = FC.Face(rig, "hood_tip", [Geo().blob((-6.0, 0, 58.0), (6.0, 6.0, 7.0), p=2.2, rot=(0, 30, 0))])
    FW.folds(rig, "hood_tip", tf, [[FW.sc(tf, -3.0, 61.4, -5.2), FW.sc(tf, -7.6, 59.0, -5.4), FW.sc(tf, -10.4, 55.6, -4.8)]],
             w=0.8, team=False, fill=FW.LINE_ON_VIOLET)
    y = K.ARM_Y["r"]
    c = (0.4, y - 0.3 * K.SIDE_Y["r"], 37.4)
    pf = FC.Face(rig, "arm_r", [Geo().blob(c, (6.6, 5.6, 5.2), p=2.6)])
    FW.folds(rig, "arm_r", pf, [[FW.sc(pf, -4.0, 39.6, c[1] - 4.8), FW.sc(pf, 0.4, 41.2, c[1] - 5.2),
                                 FW.sc(pf, 4.8, 39.6, c[1] - 4.8)]], w=0.75, team=True)
    FW.cosmic_legs(rig, team_shin=True)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, energy: a flicker, motes drifting off; the cloth tears): the hood, the
    robe's hem (a strip), the near team pad, the near team greave; motes off the orb. (r37: no mantle mark: the near
    pad, the hood and the near ribbon hide the void mantle, seen 0% in every clip.)"""
    rig.damage_spot_at("hood", "head", -6.0, 50.0, 5.0, "cloth", fill=CW.VIOLET)
    rig.damage_spot("robe", "hem", (-2.0, -12.2, 13.6), 5.0, "cloth", kind="strip", team=True, normal=(0, -1, 0))
    rig.damage_spot("pauldron", "arm_r", (0.4, K.ARM_Y["r"] + 0.3 - 5.4, 37.6), 5.0, "metal", team=True,
                    normal=(0, -1, 0.2))
    rig.damage_spot("greave", "shin_r", (1.9, -K.LEG_Y - 4.2, 8.8), 5.0, "metal", team=True, normal=(0, -1, 0))
    rig.damage_spot("motes", "orb", (13.0, -6.0, 31.0), 4.0, "motes", kind="emit", normal=(0, 0, 1))


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
