"""Star Legionnaire: Cosmic Age infantry (docs/design-lane-ages.md A17.11). Energy blade, blunt,
laser damage, ~68 lu. Deflector: takes 20% less damage from ranged attacks (the disc is the cue).

Look (A17.12, Cosmic palette): a legionary of the star legions. A crested violet dome helmet
with a team brow band, a star-white chin guard and a dark visor slot whose violet robot eyes act
(angry on the wind-up, slits on the thrust, > < when hit, X on death), a tall violet crest fin
with a star-white edge and a glowing mint star at its root; a team chest plate with the pale
Cosmic star under a star-white gorget, big team shoulder pads with star-white rims, violet lorica
bands, a belt with pouches and a glowing buckle, a short team cape with a star-white hem that
trails on follow-through, violet boots with team greaves over a void undersuit. The far forearm
carries the deflector, big and turned to the camera: a mint energy disc with a hexagon rim and
three star glyphs. The near hand holds a broad violet energy gladius with a white core.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    guard behind the deflector, the disc flickers, weight shift, a blink
  walk    march: a high, stiff-kneed step, the gladius held up in guard, the cape swinging
  attack  DEFLECTOR JABS AND LUNGE: two quick jabs past the rim of the disc (tak-tak), then the
          gladius is cocked back at the shoulder behind the shoulder-forward disc (the held
          extreme), and a deep lunge drives it straight through (streak smear, impact lines,
          dust at the front foot); he pulls back behind the disc
  hit     armoured: a dip behind the flaring disc, the helmet clanks down, eyes > <
  die     D2 plank topple onto the back; the gladius powers down, the disc collapses, X eyes
"""
import math

from ageborn_art import face as FC
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_future as KF
from ageborn_art import kit_medieval as KM
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "star_legionnaire"
NAME = "Star Legionnaire"
HEIGHT_LU = 68
CANVAS = (300, 256)
FEET = (124, 222)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32)}
NO_RETIME = True

BLADE_LEN = 34.0
HILT = 7.0
HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
HL = (0.0, K.ARM_Y["l"], K.HAND_Z)
B0 = HR[2] + HILT
TIP = (HR[0], HR[1] - 1.0, B0 + BLADE_LEN + 1.0)
MID = (HR[0], HR[1] - 1.0, B0 + BLADE_LEN * 0.45)


def build(rig):
    K.skeleton(rig)
    K.legs(rig, team_shin=True)
    rig.joint("blade", "hand_r", HR)
    rig.joint("disc", "fore_l", (HL[0], HL[1], HL[2] + 4.0))

    # deflector disc on the far forearm, facing forward and turned toward the camera
    n = (math.cos(math.radians(-72)), math.sin(math.radians(-72)), 0.0)
    bx, by, bz = HL[0] + 3.0, HL[1] - 6.0, HL[2] + 5.0
    g = Geo().blob((HL[0] + 1.6, HL[1] - 1.0, HL[2] + 4.5), (3.0, 3.2, 3.6), p=3.0)
    rig.part("disc", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)

    def along(d):
        return (bx + n[0] * d, by + n[1] * d, bz)

    def on_disc(d, u, v):
        # a point on the disc plane: u along the disc's in-plane horizontal, v up
        p = along(d)
        return (p[0] - n[1] * u, p[1] + n[0] * u, p[2] + v)

    g = Geo().lathe([(0, -0.3), (17.6, -0.2), (18.6, 0.8), (17.4, 1.6), (0, 1.4)], along(0), along(1), segs=6)
    rig.part("disc", g, glow=K.MINT, outline=1.0, outline_hex=K.VOID)
    g = Geo().lathe([(0, 0), (13.6, 0.1), (13.6, 0.9), (0, 1.0)], along(1.2), along(2.2), segs=24)
    rig.part("disc", g, glow="#8AF2D2", outline=0)
    g = Geo().lathe([(0, 0), (5.0, 0.2), (4.5, 1.2), (0, 1.8)], along(2.0), along(3.6), segs=16)
    rig.part("disc", g, glow=K.MINT_CORE, outline=0)
    # three star glyphs on the disc face
    g = Geo()
    for a in (90, 210, 330):
        p = on_disc(2.6, 9.4 * math.cos(math.radians(a)), 9.4 * math.sin(math.radians(a)))
        g.star(p, 2.6, 1.0, 0.6, points=4, rot=(0, 0, 18))
    rig.part("disc", g, glow=K.WHITE, outline=0)
    # the flicker: a bright ring shown on some idle frames and when the disc takes a blow
    rig.joint("disc_hi", "disc", along(2.4), hidden=True)
    g = Geo().lathe([(15.4, 0), (18.2, 0.1), (18.2, 1.0), (15.4, 1.1)], along(2.2), along(3.4), segs=6)
    rig.part("disc_hi", g, glow=K.MINT_CORE, outline=0.8, outline_hex=K.MINT)
    K.sparks(rig, "disc", along(3.0), color=K.MINT, size=1.1, name="flare", seed=2)

    K.arm_parts(rig, "l")

    # short team cape behind the shoulders with a star-white hem (drawn first)
    rig.secondary("cape", "torso", (-8.0, 0, 38.0), (-14.0, 0, 14.0), max_deg=16, gain=1.1)
    g = Geo().blob((-11.5, 0.5, 26.5), (3.4, 12.0, 13.0), p=3.0, taper=(1.3, 0.9), shift=(0.2, 0))
    rig.part("cape", g, team=True)
    g = Geo().blob((-12.8, 0.5, 15.6), (2.4, 12.6, 1.6), p=3.0)
    rig.part("cape", g, K.STAR, outline=0.6, outline_hex=K.STAR_TRIM)

    K.torso(rig, pack=False)
    # segmented violet ab bands (the legion's lorica) under the team plate
    g = Geo()
    for z in (24.4, 27.2):
        g.blob((1.2, 0, z), (9.9, 9.9, 1.2), p=3.0)
    rig.part("torso", g, K.VIOLET, finish="gloss")
    g = Geo().blob((0.6, 0, 16.6), (10.6, 10.4, 4.2), p=2.8, taper=(1.12, 1.0))
    g.clip((0, 0, 12.8), (0, 0, -1))
    rig.part("hips", g, K.VIOLET_DK, finish="gloss")
    # star-white pteruges strips over the hips
    g = Geo()
    for y in (-7.5, -2.5, 2.5):
        g.blob((7.6, y, 13.0), (2.2, 2.0, 3.6), p=2.8)
    rig.part("hips", g, K.STAR, finish="gloss", outline=0.6, outline_hex=K.STAR_TRIM)
    # belt pouches and a star-white gorget
    g = Geo().blob((4.0, -9.4, 20.4), (2.6, 1.8, 2.6), p=3.2).blob((-4.0, -9.2, 20.6), (2.4, 1.8, 2.6), p=3.2)
    rig.part("torso", g, K.VOID_LT, outline=0.6)
    g = Geo().blob((1.0, 0, 39.2), (7.4, 7.6, 1.8), p=2.6)
    rig.part("torso", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # the Cosmic star on the team chest plate
    chest = Geo().blob((1.8, 0, 31.4), (9.8, 10.5, 8.0), p=3.0, taper=(0.88, 1.0))
    cf = FC.Face(rig, "torso", [chest])
    g = KC.starmark(cf, Geo(), KM.scr(cf, (6.2, -9.0, 31.6)), s=1.0)
    rig.part("torso", g, KC.STAR_PALE, highlight=False, outline=0)

    # helmet: a crested violet dome, a star-white chin guard, a dark visor slot with the eyes
    g = Geo().blob((2.0, 0, 51.0), (12.0, 11.4, 12.2), p=2.4, shift=(0.1, 0))
    g.blob((-5.0, 0, 44.0), (7.0, 9.6, 5.4), p=2.4)                  # neck guard
    rig.part("head", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    g = Geo().lathe([(12.3, 0), (12.6, 1.4), (12.2, 2.8)], (2.0, 0, 54.6), (2.0, 0, 57.4), segs=26)
    rig.part("head", g, team=True, outline=0.6)
    g = Geo().blob((2.0, 0, 51.0), (12.7, 12.1, 12.9), p=2.4)
    g.clip((4.0, 0, 0), (-1, 0, 0)).clip((0, 0, 48.0), (0, 0, 1)).clip((0, 0, 40.5), (0, 0, -1))
    g.blob((10.0, 0, 42.0), (5.4, 7.6, 3.2), p=2.4)                # chin guard
    rig.part("head", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    KC.visor(rig, "head", (2.0, 0, 51.0), (12.0, 11.4, 12.2), x0=5.0, z_top=54.2, z_bot=47.6,
             eye_at=(9.6, 51.0), eye_dx=(0.0, 3.6), eye_rx=2.3, eye_rz=2.8, grow=1.2)
    fin = [(6.0, 60.0), (3.0, 67.0), (-2.0, 74.0), (-6.0, 77.0), (-8.0, 73.0), (-12.0, 66.0), (-16.0, 61.0),
           (-11.0, 56.0), (0.0, 58.0)]
    g = Geo().slab(fin, 0.0, 3.2)
    rig.part("head", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    g = Geo().capsule((6.4, 0.0, 60.2), (2.6, 0.0, 68.0), 1.3).capsule((2.6, 0.0, 68.0), (-5.6, 0.0, 77.0), 1.3, 0.8)
    rig.part("head", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().star((-3.0, -2.4, 68.0), 3.6, 1.5, 1.4, points=5)
    rig.part("head", g, glow=K.MINT, outline=0.6, outline_hex=K.VOID)
    # crest tail plume (follow-through)
    rig.secondary("plume", "head", (-12.0, 0, 62.0), (-19.0, 0, 54.0), max_deg=18, gain=1.2)
    g = Geo().blob((-15.0, 0, 58.5), (4.2, 2.4, 6.2), p=2.4, rot=(0, 34, 0))
    rig.part("plume", g, team=True)

    K.arm_parts(rig, "r")
    K.shoulders(rig, r=(8.2, 7.0, 6.6))

    # the energy gladius, along +Z from the near fist: wrapped grip, pommel, a wide guard with
    # mint emitters, a broad leaf blade with a white core
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy, hz - 4.2), (hx, hy, hz + 4.6), 1.7)
    rig.part("blade", g, K.VOID_LT, outline=0.8)
    g = Geo()
    for z in (hz - 2.4, hz + 0.2, hz + 2.8):
        g.lathe([(0, -0.5), (2.1, -0.4), (2.1, 0.4), (0, 0.5)], (hx, hy, z), (hx, hy, z + 1), segs=12)
    rig.part("blade", g, K.STAR_TRIM, finish="metal", outline=0)
    g = Geo().blob((hx, hy, hz - 5.6), (2.4, 2.4, 2.0), p=2.4)
    g.blob((hx, hy, hz + 5.8), (6.6, 2.8, 2.0), p=2.6)
    rig.part("blade", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((hx + 5.2, hy - 1.0, hz + 5.8), (1.3, 1.2, 1.2), p=2.2)
    g.blob((hx - 5.2, hy - 1.0, hz + 5.8), (1.3, 1.2, 1.2), p=2.2)
    rig.part("blade", g, glow=K.MINT, outline=0)
    g = Geo().blob((hx, hy - 0.4, B0 + BLADE_LEN / 2), (5.0, 1.6, BLADE_LEN / 2 + 1.0), p=2.2,
                   taper=(0.85, 0.5))
    rig.part("blade", g, glow=K.VIOLET_GLOW, outline=1.0, outline_hex=K.VIOLET)
    g = Geo().blob((hx + 0.2, hy - 1.4, B0 + BLADE_LEN / 2 - 0.5), (2.0, 0.9, BLADE_LEN / 2 - 1.5),
                   p=2.2, taper=(0.9, 0.45))
    rig.part("blade", g, glow=K.VIOLET_CORE, outline=0)
    rig.track("bladeTip", "blade", TIP)
    rig.track("_foot", "shin_r", (3.2, -6.0, 0.5))


# -- poses -----------------------------------------------------------------------------------
def guard(sa, sf, sw, da=-62.0, df=-2.0):
    """Blade arm (upper, fore, blade directions); disc arm (upper, fore)."""
    return merge(K.arm("r", sa, sf, sw, 90.0), K.arm("l", da, df))


def reach(hand, sw, da=-62.0, df=-2.0):
    """Blade hand at `hand` (torso space x, z) with the blade pointing `sw` (torso degrees)."""
    a, f = K.ik2(K.SH, hand)
    return guard(a, f, sw, da, df)


STANCE = merge(guard(-75, -20, 40), {"torso": {"r": -2}})


def _idle(f):
    def extra(ctx):
        return {"arm_r": {"r": 2.5 * ctx["lag"]}, "hand_r": {"r": -3.5 * ctx["lag"]},
                "arm_l": {"r": 2.0 * ctx["lag"]}, "disc": {"s": 1.0 + 0.03 * ctx["c"]}}
    pose = M.idle_v2(f, STANCE, frames=6, bob=1.2, chest=0.035, extra=extra, blink=4,
                     face_blink=KF.glyph("g_blink"))
    if f in (1, 2):
        pose["disc_hi"] = {"show": True, "s": 1.0 if f == 1 else 1.03}
    return pose


def _walk(f):
    def extra(ctx):
        lag = ctx["lag_p"]
        return {"arm_r": {"r": -7 * math.cos(lag)}, "hand_r": {"r": 4 * math.cos(lag)},
                "arm_l": {"r": 5 * math.cos(lag)}}
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=34.0, knee=46.0, lift_lu=7.5, bob_pct=0.055, lean=-4.0,
                     arms=(), twist=5.0, extra=extra)


# -- attack: deflector jabs and lunge (680 ms, impact at 290 ms) ------------------------------------
#        jab1  pull  jab2  HOLD  smear lead  IMPACT over  recoil settle settle
TR = [-6, 2, -8, 14, -10, -16, -20, -20, -8, -4, -2]
# blade hand target (torso x, z) and blade direction in WORLD degrees (0 = level forward)
HAND = [(11.0, 30.0), (1.0, 25.0), (12.5, 30.5), (-10.0, 34.0), (8.0, 31.0), (12.0, 31.0), (14.2, 32.0),
        (14.6, 32.2), (8.0, 28.0), None, None]
WW = [4.0, 12.0, 2.0, 14.0, 3.0, 1.0, 0.0, -2.0, 18.0, None, None]
SA = [0, 0, 0, 0, 0, 0, 0, 0, 0, -60, -74]
SF = [0, 0, 0, 0, 0, 0, 0, 0, 0, -12, -20]
SW = [0, 0, 0, 0, 0, 0, 0, 0, 0, 36, 40]
# disc arm: pushed forward on the jabs and the hold (the shoulder leads), tucked on the lunge
DA = [-40, -55, -38, -14, -35, -50, -62, -62, -58, -60, -62]
DF = [4, 0, 6, 16, 2, -4, -8, -8, -4, -2, -2]
BX = [1.5, -1.0, 2.5, -5.0, 2.0, 6.0, 10.0, 10.5, 7.0, 3.0, 0.5]
BZ = [0.0, -1.2, 0.0, -0.8, 1.2, 0.2, -1.6, -1.2, -0.4, 0.0, 0.0]
BQ = [0.02, -0.07, 0.03, -0.08, 0.08, 0.06, -0.14, -0.08, 0.0, 0.02, 0.0]
THR = [6, -2, 8, -10, 14, 26, 36, 36, 22, 8, 2]
SHR = [-2, -2, -4, -2, -12, -18, -24, -22, -10, -4, 0]
THL = [-4, 6, -6, 14, -10, -18, -24, -22, -14, -6, -1]
SHL = [0, -6, -2, -10, -8, -6, -4, -4, -4, -2, 0]
HD = [-2, 2, -3, 3, -4, -6, -8, -6, -2, 0, 0]
EYES = ["g_angry", "g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_angry", "g_angry", "eyes",
        "eyes", "eyes"]


def _attack_pose(f):
    if HAND[f] is not None:
        arms = reach(HAND[f], WW[f] - TR[f], DA[f], DF[f])
    else:
        arms = guard(SA[f], SF[f], SW[f], DA[f], DF[f])
    pose = merge(arms, {
        "torso": {"r": TR[f]}, "head": {"r": HD[f]},
        "thigh_r": {"r": THR[f]}, "shin_r": {"r": SHR[f]},
        "thigh_l": {"r": THL[f]}, "shin_l": {"r": SHL[f]},
    }, M.body_about((0, 0, 26), x=BX[f], z=BZ[f], q=BQ[f]))
    if f in (4, 5):
        pose.setdefault("blade", {})["sz"] = 1.12
    if f in (0, 2):
        pose["disc_hi"] = {"show": True}
    return merge(pose, KF.glyph(EYES[f]))


def _attack_clip():
    jab = {"kind": "streak", "joint": "blade", "point": TIP, "color": K.VIOLET_GLOW, "width_lu": 7.0,
           "white": 0.5}
    ov = {
        0: [dict(jab, **{"pose_from": _attack_pose(1), "t0": 0.25})],
        2: [dict(jab, **{"from": 1, "t0": 0.2})],
        3: [{"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 4.0, "puffs": 3, "seed": 2, "spread": 0.7,
             "color": "#DCD6E8"}],
        4: [dict(jab, **{"from": 3, "t0": 0.05, "t1": 1.0, "width_lu": 5.5})],
        6: [{"kind": "burst", "joint": "blade", "point": TIP, "r0_lu": 5.0, "r1_lu": 11.0, "n": 5,
             "a0": -70.0, "arc": 140.0, "color": K.VIOLET_CORE},
            {"kind": "dust", "ground": (18.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 4, "spread": 0.9,
             "color": "#DCD6E8"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov)


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return merge(guard(-75 + 18 * up, -20 + 20 * up, 40 + 20 * up, -62 + 40 * up, -2 + 30 * up),
                     {"torso": {"r": 10 * a}, "head": {"r": 8 * a}})
    pose = KM.hit_armoured(k, {"torso": {"r": -2}}, recoil, face_hurt=KF.glyph("g_hurt"),
                           face_back=KF.glyph("g_angry"), helm="head", clank=1.6)
    if k in (0, 1):
        pose["disc_hi"] = {"show": True, "s": 1.04}
        pose["flare"] = {"show": k == 0}
    return pose


def _die(k):
    flail = [0.4, 0.3, 0.9, 1.0, 0.3, 0.6, 0.1, 0.0, 0.0, 0.0][k]
    stiff = min(1.0, k / 3.0)
    pose = merge(STANCE, KM.die_d2(k, toe_x=7.0, heel_x=-6.0, lie_lift=8.0, back=True), {
        "torso": {"r": -4 * stiff}, "head": {"r": 10 * flail - 4},
        "arm_r": {"r": 38 * stiff - 30 * flail}, "fore_r": {"r": 20 * flail - 10 * stiff}, "hand_r": {"r": -40 * stiff},
        "arm_l": {"r": 30 * flail + 12 * stiff}, "fore_l": {"r": 30 * flail - 20 * stiff},
        "thigh_r": {"r": 6 * flail + 24 * stiff}, "shin_r": {"r": -4 * flail - 20 * stiff},
        "thigh_l": {"r": -6 * flail - 8 * stiff}, "shin_l": {"r": -4 * flail},
        "blade": {"sz": [1.0, 1.0, 0.8, 0.55, 0.35, 0.3, 0.3, 0.3, 0.3, 0.3][k]},
        "disc": {"s": [1.0, 0.9, 0.7, 0.5, 0.3, 0.12, 0.05, 0.05, 0.05, 0.05][k]},
    })
    if k == 1:
        pose["disc_hi"] = {"show": True}
    g = "g_hurt" if k == 0 else ("g_wide" if k < 4 else "eyes_x")
    return merge(pose, KF.glyph(g))


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
