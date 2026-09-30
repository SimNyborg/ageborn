"""Graviton Halberdier: Cosmic Age anti-armor Rare (docs/design-lane-ages.md A17.11). Reach 70,
melee anti-armour, laser damage, Brace, ~72 lu.

Look (A17.12, Cosmic palette): a heavy guard in star-white armour over a void suit. A tall
winged helm: a star-white shell over a violet cap, a star-white chin guard and a dark visor slot
whose violet robot eyes act (angry on the wind-up, slits on the chop, > < when hit, X on death),
swept team wings on both sides and a violet crest ridge. Big team shoulder pads with star-white
rivets, a team chest plate with the pale Cosmic star, a belt with pouches, a long team tabard
with a star-white hem and a short violet cape (both follow through). The halberd is the reach
cue: a long void shaft with star-white fittings, a broad violet crescent blade with a glowing
edge, a back spike and, between two forked prongs, a floating violet gravity orb in a mint ring.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    braced, the gravity orb bobs and pulses in its prongs, weight shift, a blink
  walk    march: a high stiff-kneed step, the halberd sloped on the shoulder side, the tabard
          and cape swinging
  attack  HEAVE AND DIAGONAL CHOP: braces low with the head of the halberd down, heaves it up in
          a big arc in front of him (smear), holds it high behind the helm while the gravity orb
          flares with rings (the held extreme), then chops down diagonally in front (violet
          crescent smear); the crescent bites (impact lines, dust at the front foot) and the orb
          bursts
  hit     armoured: a dip behind the shaft, the helm clanks down, eyes > <
  die     D2 plank topple onto the back, the halberd falls away, the orb fizzles, X eyes
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

SLUG = "graviton_halberdier"
NAME = "Graviton Halberdier"
HEIGHT_LU = 72
CANVAS = (400, 300)
FEET = (150, 256)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 33)}
NO_RETIME = True

G0 = (6.0, -13.0, 24.0)       # grip (pole joint), character space; the halberd points +X
BACK = 16.0                   # shaft behind the grip
FORE = 18.0                   # far hand this far along
SHAFT = 64.0                  # grip to the head's socket
HEAD_X = G0[0] + SHAFT
ORB = (HEAD_X + 11.0, G0[1] - 1.0, G0[2] + 1.0)
TIP = (HEAD_X + 20.0, G0[1], G0[2])
EDGE = (HEAD_X + 13.0, G0[1], G0[2] - 15.0)    # the crescent's belly (it bites first)
EDGE_IN = (HEAD_X + 3.0, G0[1], G0[2] - 6.0)


def build(rig):
    K.skeleton(rig, head=(1, 0, 39))
    K.legs(rig, boot=K.VIOLET, knee=K.STAR)
    rig.joint("pole", "torso", G0)
    K.arm_parts(rig, "l", bracer=K.STAR)

    # short violet cape (behind) and the long team tabard (both follow through)
    rig.secondary("cape", "torso", (-8.0, 0, 38.0), (-13.0, 0, 16.0), max_deg=16, gain=1.1)
    g = Geo().blob((-11.0, 0.5, 27.0), (3.2, 11.6, 12.4), p=3.0, taper=(1.28, 0.9))
    rig.part("cape", g, team=True)
    g = Geo().blob((-12.2, 0.5, 16.6), (2.2, 12.0, 1.4), p=3.0)
    rig.part("cape", g, K.STAR, outline=0.6, outline_hex=K.STAR_TRIM)
    rig.secondary("tabard", "hips", (7.0, 0, 20.0), (8.5, 0, 4.0), max_deg=14, gain=1.0)
    g = Geo().blob((8.4, -0.5, 12.0), (2.6, 8.0, 9.6), p=3.2, taper=(1.16, 0.9))
    rig.part("tabard", g, team=True)
    g = Geo().blob((9.6, -0.5, 4.2), (1.6, 8.0, 1.5), p=3.0)
    rig.part("tabard", g, K.STAR, outline=0.6, outline_hex=K.STAR_TRIM)
    K.torso(rig, pack=False, bulk=1.08, collar=K.STAR)
    g = Geo().blob((0.6, 0, 16.8), (11.0, 10.8, 4.4), p=2.8, taper=(1.12, 1.0))
    g.clip((0, 0, 12.8), (0, 0, -1))
    rig.part("hips", g, K.VIOLET, finish="gloss")
    g = Geo().blob((4.2, -10.2, 20.4), (2.6, 1.8, 2.6), p=3.2).blob((-4.2, -10.0, 20.6), (2.4, 1.8, 2.6), p=3.2)
    rig.part("torso", g, K.VOID_LT, outline=0.6)
    chest = Geo().blob((1.8, 0, 31.4), (10.6, 11.3, 8.0), p=3.0, taper=(0.88, 1.0))
    cf = FC.Face(rig, "torso", [chest])
    g = KC.starmark(cf, Geo(), KM.scr(cf, (6.6, -9.8, 31.6)), s=1.0)
    rig.part("torso", g, KC.STAR_PALE, highlight=False, outline=0)

    # winged helm: a violet cap under a star-white shell, a star-white chin guard, the visor
    g = Geo().blob((2.0, 0, 51.0), (11.8, 11.2, 13.4), p=2.6, taper=(1.05, 0.9))
    g.blob((4.5, 0, 42.2), (9.0, 9.2, 3.6), p=2.4)
    rig.part("head", g, K.VIOLET_DK, finish="gloss", outline_hex=K.VOID)
    g = Geo().blob((2.0, 0, 51.4), (12.2, 11.6, 13.6), p=2.6, taper=(1.05, 0.9))
    g.clip((0, 0, 53.0), (0, 0, -1))
    rig.part("head", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((2.0, 0, 51.0), (12.4, 11.8, 14.0), p=2.6, taper=(1.05, 0.9))
    g.clip((4.5, 0, 0), (-1, 0, 0)).clip((0, 0, 47.0), (0, 0, 1)).clip((0, 0, 40.0), (0, 0, -1))
    g.blob((10.4, 0, 42.4), (5.0, 7.4, 3.0), p=2.4)
    rig.part("head", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    KC.visor(rig, "head", (2.0, 0, 51.0), (11.8, 11.2, 13.4), x0=5.0, z_top=53.4, z_bot=46.8,
             eye_at=(9.6, 50.2), eye_dx=(0.0, 3.6), eye_rx=2.3, eye_rz=2.7, grow=1.3)
    g = Geo().blob((-1.0, 0, 64.6), (11.0, 2.6, 4.4), p=2.4, rot=(0, -10, 0))
    rig.part("head", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    g = Geo().star((3.0, -2.8, 64.2), 2.6, 1.1, 1.2, points=5)
    rig.part("head", g, glow=K.MINT, outline=0.6, outline_hex=K.VOID)
    K.wings(rig, "head", (-1.0, 0, 55.0), span=17.0, h=13.0, y_off=11.4, team=True)

    K.arm_parts(rig, "r", bracer=K.STAR)
    K.shoulders(rig, r=(7.6, 6.4, 6.0))
    g = Geo()
    for a in (-50, 0, 50):
        c, s_ = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.sphere((0.5 + 5.2 * s_, K.ARM_Y["r"] - 6.2, 38.4 + 3.0 * c), 0.95, cuts=2)
    rig.part("arm_r", g, K.STAR, finish="metal", outline=0)

    # the halberd along +X from the grip
    gx, gy, gz = G0
    g = Geo().capsule((gx - BACK, gy, gz), (HEAD_X, gy, gz), 1.6)
    rig.part("pole", g, K.VOID_LT, finish="gloss", outline=0.8)
    g = Geo()
    for x in (gx - BACK, gx + FORE + 5, HEAD_X - 2.0):
        g.lathe([(0, -1.6), (2.5, -1.4), (2.5, 1.4), (0, 1.6)], (x, gy, gz), (x + 1, gy, gz), segs=12)
    rig.part("pole", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo()
    for x in (gx - 4.0, gx - 1.5, gx + 1.0):          # grip wrap
        g.lathe([(0, -0.6), (2.1, -0.5), (2.1, 0.5), (0, 0.6)], (x, gy, gz), (x + 1, gy, gz), segs=10)
    rig.part("pole", g, K.VIOLET, outline=0)
    # crescent blade under the head (points down-forward), and a back spike on top
    blade = [(HEAD_X - 4, gz - 1.5), (HEAD_X + 8, gz - 1.5), (HEAD_X + 15, gz - 6), (HEAD_X + 16.5, gz - 14),
             (HEAD_X + 12, gz - 21), (HEAD_X + 7.5, gz - 14), (HEAD_X + 2, gz - 9.5), (HEAD_X - 4, gz - 6)]
    g = Geo().slab(blade, gy, 2.6)
    rig.part("pole", g, K.VIOLET, finish="metal", outline_hex=K.VIOLET_DK)
    edge = [(HEAD_X + 14.2, gz - 6.4), (HEAD_X + 17.2, gz - 14.0), (HEAD_X + 12.4, gz - 22.0),
            (HEAD_X + 13.6, gz - 14.2)]
    g = Geo().slab(edge, gy - 0.4, 3.0)
    rig.part("pole", g, glow=K.VIOLET_CORE, outline=0)
    g = Geo().slab([(HEAD_X - 2, gz + 1.5), (HEAD_X + 4, gz + 1.5), (HEAD_X + 1, gz + 12)], gy, 2.4)
    rig.part("pole", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # the prongs and the floating gravity orb with a mint ring
    g = Geo()
    for dz in (4.2, -4.2):
        g.capsule((HEAD_X, gy, gz), (HEAD_X + 6, gy, gz + dz * 2.0), 1.2)
        g.capsule((HEAD_X + 6, gy, gz + dz * 2.0), (HEAD_X + 20, gy, gz + dz * 0.6), 1.2, 0.5)
    rig.part("pole", g, K.STAR_TRIM, finish="metal", outline=0.7)
    K.orb(rig, "pole", ORB, 5.6, color=K.VIOLET_GLOW, core=K.VIOLET_CORE, name="orb", line=K.VIOLET)
    g = Geo()
    ox, oy, oz = ORB
    for i in range(16):
        a0, a1 = 2 * math.pi * i / 16, 2 * math.pi * (i + 1) / 16
        g.capsule((ox + 8.6 * math.cos(a0), oy - 0.6 + 3.0 * math.sin(a0), oz + 2.2 * math.sin(a0)),
                  (ox + 8.6 * math.cos(a1), oy - 0.6 + 3.0 * math.sin(a1), oz + 2.2 * math.sin(a1)), 0.8, segs=6, rings=2)
    rig.part("orb", g, glow=K.MINT, outline=0)
    # the flare: a bright shell around the orb (charge) and a burst (impact)
    rig.joint("orb_hot", "orb", ORB, hidden=True)
    g = Geo().sphere((ox, oy - 0.6, oz), 7.6, cuts=4)
    rig.part("orb_hot", g, glow=K.VIOLET_CORE, outline=1.2, outline_hex=K.VIOLET_GLOW)
    # hands on the shaft
    g = Geo().blob((gx + 0.4, gy - 1.0, gz), (3.6, 3.2, 3.6), p=2.4)
    g.blob((gx + FORE, gy + 3.0, gz), (3.4, 3.0, 3.4), p=2.4)
    rig.part("pole", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # a team streamer tied under the head (follow-through; keeps the team share on the big swings)
    sx0 = HEAD_X - 5.0
    rig.secondary("streamer", "pole", (sx0, gy - 1.0, gz), (sx0 - 14.0, gy - 1.0, gz - 6.0), max_deg=20,
                  gain=1.3, rot_gain=0.7)
    pts = [(sx0, gz + 2.0), (sx0 - 15.0, gz - 1.0), (sx0 - 11.0, gz - 4.5), (sx0 - 16.0, gz - 8.0), (sx0 - 1.0, gz - 3.0)]
    g = Geo().slab(pts, gy - 1.6, 1.4)
    rig.part("streamer", g, team=True, outline=0.8)
    rig.track("bladeTip", "pole", TIP)
    rig.track("_foot", "shin_r", (3.2, -6.0, 0.5))
    K.sparks(rig, "pole", (ox, oy - 1, oz), color=K.VIOLET_GLOW, size=1.6, name="sparks")


# -- poses -----------------------------------------------------------------------------------
def hold(gx, gz, deg):
    """Grip at (gx, gz) torso space, the halberd pointing `deg` degrees."""
    return K.hold2("pole", G0, FORE, gx, gz, deg, near_off=(-0.4, 0.2), far_off=(-0.6, -0.4))


STANCE = merge(hold(5.0, 25.0, 28.0), {"torso": {"r": -2}})


def _idle(f):
    def extra(ctx):
        return {"pole": {"r": 1.2 * ctx["lag"]}, "orb": {"z": 1.3 * ctx["c"], "s": 1.0 + 0.05 * ctx["lag"]}}
    pose = M.idle_v2(f, STANCE, frames=6, bob=1.1, chest=0.035, extra=extra, blink=4,
                     face_blink=KF.glyph("g_blink"))
    if f == 1:
        pose["orb_hot"] = {"show": True, "s": 0.85}
    return pose


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(hold(4.0, 26.0 + 0.8 * lag, 40.0 + 3.0 * lag), {"orb": {"z": -1.0 * lag}})
    return M.walk_v2(f, {"torso": {"r": -2}}, HEIGHT_LU, thigh=34.0, knee=46.0, lift_lu=7.5, bob_pct=0.05,
                     lean=-4.0, arms=(), twist=5.0, extra=extra)


# -- attack: twirl and diagonal chop (680 ms, impact at 290 ms) ------------------------------------
#        read  dip   twirl HOLD  smear lead  IMPACT over recoil settle settle
GX = [4.0, 2.0, 4.0, -6.5, 3.0, 8.0, 11.0, 11.5, 9.0, 7.0, 5.0]
GZ = [23.0, 20.0, 36.0, 38.5, 38.0, 32.0, 24.0, 23.0, 24.0, 24.5, 25.0]
DEG = [22.0, 12.0, 98.0, 126.0, 66.0, 18.0, -8.0, -12.0, 0.0, 12.0, 24.0]    # WORLD degrees
BX = [0.0, -1.5, -1.0, -3.0, 1.0, 4.0, 7.0, 7.5, 5.0, 2.0, 0.5]
BZ = [-0.6, -2.4, 1.6, 1.0, 0.4, -0.4, -2.8, -2.2, -0.8, 0.0, 0.0]
BQ = [-0.04, -0.10, 0.08, 0.05, 0.06, 0.02, -0.15, -0.09, -0.02, 0.01, 0.0]
TR = [0, 4, -2, 10, -4, -12, -20, -20, -12, -6, -2]
HD = [0, 2, -2, 6, -2, -6, -8, -6, -3, -1, 0]
THR = [6, 10, 2, -8, 10, 20, 30, 30, 20, 8, 2]
SHR = [-4, -12, 0, 0, -8, -14, -20, -18, -8, -2, 0]
THL = [-6, 12, -4, 10, -8, -14, -22, -20, -14, -6, -1]
SHL = [-2, -14, -2, -8, -6, -6, -8, -6, -4, -2, 0]
ORB_S = [1.0, 1.0, 1.1, 1.25, 1.15, 1.1, 1.35, 1.2, 1.05, 1.0, 1.0]
EYES = ["eyes", "g_angry", "g_squint", "g_angry", "g_squint", "g_squint", "g_angry", "g_angry", "eyes",
        "eyes", "eyes"]


def _attack_pose(f, deg=None):
    pose = merge(hold(GX[f], GZ[f], (DEG[f] if deg is None else deg) - TR[f]), {
        "torso": {"r": TR[f]}, "head": {"r": HD[f]},
        "thigh_r": {"r": THR[f]}, "shin_r": {"r": SHR[f]},
        "thigh_l": {"r": THL[f]}, "shin_l": {"r": SHL[f]},
        "orb": {"s": ORB_S[f]},
        # the hot shell only on the held charge: on the impact frame it covered the crescent blade
        # with a pale disc (read as a frying pan at game size); sparks and the burst carry the hit
        "orb_hot": {"show": f == 3},
        "sparks": {"show": f == 6},
    }, M.body_about((0, 0, 26), x=BX[f], z=BZ[f], q=BQ[f]))
    return merge(pose, KF.glyph(EYES[f]))


def _attack_clip():
    chop = {"kind": "arc", "joint": "pole", "inner": EDGE_IN, "outer": EDGE, "color": K.VIOLET_GLOW,
            "white": 0.35, "taper": 0.3, "lines": 3}
    ov = {
        2: [dict(chop, **{"from": 1, "t0": 0.35, "t1": 1.0, "inner": (HEAD_X - 6.0, G0[1], G0[2]), "outer": ORB,
                          "lines": 2})],
        3: [{"kind": "rings", "joint": "pole", "point": ORB, "radii_lu": (8.5, 12.0), "a0": -180.0, "a1": 180.0,
             "color": K.VIOLET_CORE}],
        4: [dict(chop, **{"from": 3, "t0": 0.0, "t1": 1.0})],
        5: [dict(chop, **{"from": 3, "t0": 0.4, "t1": 1.0})],
        6: [{"kind": "burst", "joint": "pole", "point": EDGE, "r0_lu": 5.0, "r1_lu": 11.0, "n": 5,
             "a0": 200.0, "arc": 140.0, "color": K.VIOLET_CORE},
            {"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 4, "spread": 0.9,
             "color": "#DCD6E8"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov)


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return merge(hold(5.0 - 3.0 * up, 25.0 + 7.0 * up, 28.0 + 30.0 * up),
                     {"torso": {"r": 10 * a}, "head": {"r": 8 * a}})
    return KM.hit_armoured(k, {"torso": {"r": -2}}, recoil, face_hurt=KF.glyph("g_hurt"),
                           face_back=KF.glyph("g_angry"), helm="head", clank=1.6)


def _die(k):
    flail = [0.4, 0.3, 0.9, 1.0, 0.3, 0.6, 0.1, 0.0, 0.0, 0.0][k]
    stiff = min(1.0, k / 3.0)
    pose = merge(STANCE, KM.die_d2(k, toe_x=7.0, heel_x=-6.0, lie_lift=8.0, back=True), {
        "pole": {"r": 40.0 * flail + 20.0 * stiff, "x": 4.0 * stiff, "z": -6.0 * stiff},
        "torso": {"r": -4 * stiff}, "head": {"r": 10 * flail - 4},
        "arm_r": {"r": 50 * stiff - 20 * flail}, "fore_r": {"r": 20 * flail},
        "arm_l": {"r": 30 * flail + 20 * stiff}, "fore_l": {"r": 30 * flail - 10 * stiff},
        "thigh_r": {"r": 6 * flail + 24 * stiff}, "shin_r": {"r": -4 * flail - 20 * stiff},
        "thigh_l": {"r": -6 * flail - 8 * stiff}, "shin_l": {"r": -4 * flail},
        "orb": {"s": [1.0, 1.2, 0.9, 0.7, 0.5, 0.4, 0.35, 0.3, 0.3, 0.3][k]},
    })
    if k == 1:
        pose["orb_hot"] = {"show": True}
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
