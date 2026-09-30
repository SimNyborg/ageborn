"""Photon Knight: Future Age infantry (DESIGN A5.6). Energy sword, laser damage, ~70 lu.
Innate shield 90 that regenerates (the game draws fx.shield_bubble; the buckler is the cue).

Look (A11, Future palette): a stocky knight in glossy white armour over a charcoal suit. A rounded
great-helm with a dark visor band whose mint robot eyes act (angry on the wind-up, slits on the
cut, > < when hit, X on death), a team crest fin with a tail that follows through, a team chest
plate with the pale Future hex, big team shoulder pads with mint light strips, a team tabard with a
white hem that swings with the walk, a belt with a glowing buckle and two pouches, and a round team
buckler with a magenta emitter on the far arm. The oversized photon sword (a white-core mint blade
with a pointed tip, a white guard with magenta emitters, a wrapped grip) is the brightest shape on
the unit, so the role reads at 56 px.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    guard stance, the blade hums (a flicker shell), weight shift, a blink
  walk    march: a high, stiff-kneed step, the blade held up in guard, the tabard swinging
  attack  SPIN-DASH CLEAVE: dips, coils with the chest to the camera and the blade trailing back
          (the held extreme), hops into a full pirouette (two ring-smear frames in mint) and lands
          in a deep lunge with the blade level at the target (impact lines, dust), then settles
          back behind the buckler
  hit     armoured: a dip behind the raised buckler, the helm clanks down, eyes > <
  die     D2 plank topple onto the back (timber); the photon blade powers down to the hilt, X eyes
"""
import math

from ageborn_art import face as FC
from ageborn_art import kit_future as KF
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "photon_knight"
NAME = "Photon Knight"
HEIGHT_LU = 70
CANVAS = (300, 256)
FEET = (130, 222)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32)}
NO_RETIME = True

BLADE_LEN = 44.0
HILT = 7.0
HR = (0.0, F.ARM_Y["r"], F.HAND_Z)        # near hand joint (sword)
HL = (0.0, F.ARM_Y["l"], F.HAND_Z)        # far hand joint (buckler)
B0 = HR[2] + HILT                          # blade root (z, along the sword's rest axis)
TIP = (HR[0], HR[1] - 1.0, B0 + BLADE_LEN)
MID = (HR[0], HR[1] - 1.0, B0 + BLADE_LEN * 0.4)


def build(rig):
    F.skeleton(rig)
    F.legs(rig)
    for side in ("r", "l"):          # team greaves
        y = F.LEG_Y * F.SIDE_Y[side]
        g = Geo().blob((2.2, y, 11.0), (4.4, 4.9, 5.6), p=2.6)
        rig.part(f"shin_{side}", g, team=True, outline=0.6)
    rig.joint("sword", "hand_r", HR)
    rig.joint("blade", "sword", (HR[0], HR[1], B0))
    rig.joint("buckler", "hand_l", HL)

    # buckler first (far side): a white rim, a team face with a pale hex, a magenta emitter
    bx, by, bz = HL[0] + 4.0, HL[1] - 5.0, HL[2] + 1.0
    n = (math.cos(math.radians(-42)), math.sin(math.radians(-42)), 0.0)

    def along(d):
        return (bx + n[0] * d, by + n[1] * d, bz)
    g = Geo().lathe([(0, -0.4), (9.8, -0.2), (10.8, 1.2), (10.2, 2.6), (0, 2.4)], along(0), along(3.2), segs=24)
    rig.part("buckler", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(0, -0.3), (8.4, -0.2), (8.2, 1.0), (0, 1.6)], along(2.4), along(3.6), segs=24)
    rig.part("buckler", g, team=True, outline=0.6)
    g = Geo()
    for a in range(0, 360, 45):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        p = along(3.4)
        g.sphere((p[0] - n[1] * 9.3 * ca, p[1] + n[0] * 9.3 * ca, p[2] + 9.3 * sa), 0.8, cuts=2)
    rig.part("buckler", g, F.TRIM, finish="metal", outline=0)
    g = Geo().lathe([(0, 0), (3.2, 0.2), (2.8, 1.4), (0, 2.2)], along(3.4), along(5.6), segs=16)
    rig.part("buckler", g, glow=F.MAGENTA, outline=1.0, outline_hex=F.SUIT)
    rig.joint("shield_glow", "buckler", along(5.0), hidden=True)
    g = Geo().lathe([(0, 0), (11.2, 0.3), (11.6, 0.9), (0, 1.0)], along(4.6), along(5.4), segs=28)
    rig.part("shield_glow", g, glow=F.MAGENTA_CORE, outline=1.0, outline_hex=F.MAGENTA)

    F.arm_parts(rig, "l")

    # tabard behind the belt: a team panel with a white hem band (follow-through)
    rig.secondary("tabard", "hips", (7.0, 0, 20.0), (8.5, 0, 6.0), max_deg=16, gain=1.0)
    g = Geo().blob((8.2, -0.5, 13.5), (2.4, 6.8, 7.8), p=3.2, taper=(1.12, 0.9))
    rig.part("tabard", g, team=True)
    g = Geo().blob((8.6, -0.5, 6.4), (2.6, 7.2, 1.4), p=3.0)
    rig.part("tabard", g, F.ARMOR, outline=0.6)
    F.torso_armor(rig, pack=True)
    # a team stripe on the backpack (team reads from behind during the spin)
    g = Geo().blob((-11.4, 0, 33.5), (4.6, 8.6, 2.4), p=3.4)
    rig.part("torso", g, team=True, outline=0.6)
    # white breastplate rim (gorget) and hip faulds
    g = Geo().blob((1.0, 0, 39.2), (7.4, 7.6, 1.8), p=2.6)
    rig.part("torso", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((0.6, 0, 16.8), (10.6, 10.4, 4.4), p=2.8, taper=(1.12, 1.0))
    g.clip((0, 0, 12.8), (0, 0, -1))
    rig.part("hips", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    # belt pouches and a glowing buckle
    g = Geo().blob((4.0, -9.6, 20.4), (2.6, 1.8, 2.6), p=3.2).blob((-4.0, -9.4, 20.6), (2.4, 1.8, 2.6), p=3.2)
    rig.part("torso", g, F.GUNMETAL, outline=0.6)
    g = Geo().blob((10.2, -2.6, 21.8), (1.3, 2.6, 1.8), p=3.0)
    rig.part("torso", g, glow=F.MINT_CORE, outline=0.8, outline_hex=F.SUIT)
    # the Future hex on the team chest plate
    chest = Geo().blob((1.8, 0, 32.0), (9.8, 10.6, 7.6), p=3.0, taper=(0.9, 1.0))
    cf = FC.Face(rig, "torso", [chest])
    g = KF.hexmark(cf, Geo(), K.scr(cf, (6.0, -9.0, 32.5)), s=0.95, w=1.3)
    rig.part("torso", g, KF.HEX_PALE, highlight=False, outline=0)

    # great-helm: white dome and chin guard, a team crest fin with a tail, a dark visor band
    g = Geo().blob((2.0, 0, 50.5), (12.2, 11.6, 12.4), p=2.5)
    g.blob((4.5, 0, 42.0), (9.0, 9.2, 3.6), p=2.4)
    rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((0.0, 0, 63.0), (13.0, 3.0, 6.8), p=2.4, rot=(0, -8, 0))
    rig.part("head", g, team=True)
    g = Geo().blob((0.5, -2.4, 63.6), (10.0, 0.8, 1.2), p=2.6, rot=(0, -8, 0))
    rig.part("head", g, glow=F.MINT, outline=0)
    rig.secondary("crest_tail", "head", (-8.0, 0, 60.0), (-15.0, 0, 51.0), max_deg=18, gain=1.2)
    g = Geo().blob((-10.5, 0, 56.0), (4.6, 2.8, 7.4), p=2.4, rot=(0, 26, 0))
    rig.part("crest_tail", g, team=True)
    visor = Geo().blob((2.0, 0, 50.5), (13.0, 12.4, 13.2), p=2.5)
    visor.clip((6.5, 0, 0), (-1, 0, 0)).clip((0, 0, 54.6), (0, 0, 1)).clip((0, 0, 45.6), (0, 0, -1))
    KF.visor_face(rig, "head", [visor], (10.6, 50.2), eye_dx=(0.0, 3.9), eye_rx=1.7, eye_rz=2.5)
    rig.part("head", visor, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    g = Geo().blob((13.6, -0.6, 44.6), (2.4, 2.0, 3.8), p=3.0)         # nasal bar
    rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(0, 0), (3.6, 0.1), (3.4, 1.6), (0, 2.0)], (-3.0, -10.6, 49.0), (-3.0, -12.6, 49.0), segs=16)
    rig.part("head", g, F.TRIM, finish="metal", outline=0.6)            # ear disc
    g = Geo().sphere((-3.0, -12.8, 49.0), 1.4, cuts=2)
    rig.part("head", g, glow=F.MINT, outline=0)
    KF.rivets(rig, "head", [(x, -11.2, 43.8 + 0.1 * x) for x in (-4.0, 0.0, 4.0)], r=0.9)

    F.arm_parts(rig, "r")
    F.shoulders(rig, r=(7.2, 6.0, 5.8))
    KF.strip(rig, "arm_r", [(-4.0, -18.4, 38.2), (0.8, -18.8, 39.6), (5.6, -18.2, 38.2)], r=0.8)

    # the photon sword: a wrapped grip, pommel, a white guard with magenta emitters, a big blade
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy, hz - 4.2), (hx, hy, hz + 4.6), 1.7)
    rig.part("sword", g, F.SUIT, outline=0.8)
    g = Geo()
    for z in (hz - 2.4, hz + 0.2, hz + 2.8):
        g.lathe([(0, -0.5), (2.1, -0.4), (2.1, 0.4), (0, 0.5)], (hx, hy, z), (hx, hy, z + 1), segs=12)
    rig.part("sword", g, F.TRIM, finish="metal", outline=0)
    g = Geo().blob((hx, hy, hz - 5.6), (2.4, 2.4, 2.0), p=2.4)
    g.blob((hx, hy, hz + 5.8), (7.2, 2.8, 2.0), p=2.6)
    rig.part("sword", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((hx + 6.0, hy - 0.8, hz + 5.8), (1.4, 1.3, 1.3), p=2.2)
    g.blob((hx - 6.0, hy - 0.8, hz + 5.8), (1.4, 1.3, 1.3), p=2.2)
    rig.part("sword", g, glow=F.MAGENTA, outline=0)
    g = Geo().blob((hx, hy - 0.4, B0 + BLADE_LEN / 2), (3.8, 1.6, BLADE_LEN / 2 + 0.5), p=2.3,
                   taper=(1.0, 0.45))
    rig.part("blade", g, glow=F.MINT, outline=1.0, outline_hex=F.MINT)
    g = Geo().blob((hx + 0.2, hy - 1.4, B0 + BLADE_LEN / 2 - 1.0), (1.6, 0.9, BLADE_LEN / 2 - 2.0),
                   p=2.3, taper=(1.0, 0.35))
    rig.part("blade", g, glow=F.MINT_CORE, outline=0)
    # hum: a faint outer shell that flickers on some idle frames
    rig.joint("hum", "blade", (hx, hy, B0), hidden=True)
    g = Geo().blob((hx, hy + 0.2, B0 + BLADE_LEN / 2), (5.2, 1.2, BLADE_LEN / 2 + 1.6), p=2.2,
                   taper=(1.0, 0.5))
    rig.part("hum", g, glow=F.MINT_CORE, outline=0.8, outline_hex=F.MINT)
    rig.track("bladeTip", "sword", TIP)
    rig.track("_foot", "shin_r", (3.2, -6.0, 0.5))


# -- poses -----------------------------------------------------------------------------------
def guard(sa, sf, sw, ba=-40.0, bf=5.0, bw=90.0):
    """Sword arm (upper, fore, blade directions) and buckler arm (torso space)."""
    return merge(F.arm("r", sa, sf, sw, 90.0), F.arm("l", ba, bf, bw, 90.0))


STANCE = merge(guard(-75, -20, 38), {"torso": {"r": -2}})


def _idle(f):
    def extra(ctx):
        return {"arm_r": {"r": 2.5 * ctx["lag"]}, "hand_r": {"r": -3.5 * ctx["lag"]},
                "arm_l": {"r": 2.0 * ctx["lag"]}, "blade": {"sz": 1.0 + 0.025 * ctx["c"]},
                "crest_tail": {"r": 0.0}}
    pose = M.idle_v2(f, STANCE, frames=6, bob=1.2, chest=0.035, extra=extra, blink=4,
                     face_blink=KF.glyph("g_blink"))
    if f in (1, 4):
        pose["hum"] = {"show": True}
    return pose


def _walk(f):
    def extra(ctx):
        p, lag = ctx["p"], ctx["lag_p"]
        return {"arm_r": {"r": -7 * math.cos(lag)}, "hand_r": {"r": 3 * math.cos(lag)},
                "arm_l": {"r": 9 * math.cos(lag)}, "fore_l": {"r": 4 * max(0.0, math.cos(lag))}}
    # march: a stiff knee (less shin bend), a high thigh lift, upright
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=34.0, knee=46.0, lift_lu=7.5, bob_pct=0.055, lean=-4.0,
                     arms=(), twist=5.0, extra=extra)


# -- attack: spin-dash cleave -------------------------------------------------------------------
#          read  dip  wind  HOLD  spin1 spin2 IMPACT over recoil settle settle
RZ = [0, -8, -20, -30, 118, 238, 360, 372, 366, 362, 360]
BX = [0, -2.0, -3.5, -4.5, 1.0, 5.0, 9.0, 9.5, 7.5, 4.0, 1.5]
BZ = [0, -1.8, -0.6, -1.2, 4.5, 3.5, -1.5, -0.6, 0.0, 0.0, 0.0]
BQ = [0, -0.09, 0.02, -0.06, 0.12, 0.08, -0.15, -0.06, 0.02, 0.0, 0.0]
# sword hand target (torso space x, z) and blade direction, or None = explicit (upper, fore)
HAND = [None, None, (-2.0, 28.0), (-7.0, 30.0), None, None, None, None, None, None, None]
SA = [-70, -75, 0, 0, -12, -12, -8, -2, -30, -55, -72]
SF = [-18, -35, 0, 0, -4, -4, -2, 4, -10, -16, -20]
SW = [45, 22, 138, 164, 12, 10, 6, 14, 30, 38, 38]
LA = [-40, -35, -20, -8, -60, -60, -70, -62, -52, -44, -40]
LF = [5, 10, 20, 26, -20, -20, -10, -5, 0, 4, 5]
TR = [-2, 4, 6, 9, -10, -12, -20, -18, -10, -5, -2]
HD = [0, 2, 0, -3, 4, 4, 8, 6, 3, 1, 0]
THR = [0, -6, -10, -14, 10, 24, 38, 34, 24, 10, 2]
SHR = [0, -4, -6, -8, -24, -20, -18, -14, -8, -2, 0]
THL = [0, 8, 10, 14, -6, -16, -26, -24, -18, -8, -2]
SHL = [0, -10, -12, -14, -30, -16, -6, -6, -4, -2, 0]
EYES = ["eyes", "g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_angry", "g_angry", "eyes",
        "eyes", "eyes"]


def _attack_pose(f, rz=None):
    if HAND[f] is not None:
        a, fo = F.ik2(F.SH, HAND[f])
    else:
        a, fo = SA[f], SF[f]
    pose = merge(guard(a, fo, SW[f], LA[f], LF[f]), {
        "torso": {"r": TR[f]}, "head": {"r": HD[f]},
        "thigh_r": {"r": THR[f]}, "shin_r": {"r": SHR[f]},
        "thigh_l": {"r": THL[f]}, "shin_l": {"r": SHL[f]},
    }, M.body_about((0, 0, 28), x=BX[f], z=BZ[f], q=BQ[f], rz=RZ[f] if rz is None else rz))
    if f in (4, 5):
        pose.setdefault("blade", {})["sz"] = 1.18
    if f in (6, 7):
        pose["hum"] = {"show": True}
    return merge(pose, KF.glyph(EYES[f]))


def _attack_clip():
    ring = {"kind": "arc", "joint": "sword", "inner": MID, "outer": TIP, "color": F.MINT, "white": 0.35,
            "taper": 0.15, "band": 0.85, "lines": 2}
    ov = {
        4: [dict(ring, **{"pose_from": _attack_pose(4, rz=-10.0), "t0": 0.0, "t1": 1.0, "samples": 20})],
        5: [dict(ring, **{"pose_from": _attack_pose(5, rz=100.0), "t0": 0.0, "t1": 1.0, "samples": 20})],
        6: [dict(ring, **{"pose_from": _attack_pose(6, rz=250.0), "t0": 0.3, "t1": 1.0, "samples": 16,
                          "lines": 3}),
            {"kind": "burst", "joint": "sword", "point": TIP, "r0_lu": 5.0, "r1_lu": 11.0, "n": 5,
             "a0": -70.0, "arc": 140.0, "color": F.MINT_CORE},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 4, "spread": 0.9,
             "color": "#DDE3E8"}],
        3: [{"kind": "dust", "ground": (-9.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 2, "spread": 0.7,
             "color": "#DDE3E8"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov)


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return merge(guard(-75 + 20 * up, -20 + 20 * up, 38 + 20 * up, -40 + 50 * up, 5 + 50 * up),
                     {"torso": {"r": 10 * a}, "head": {"r": 8 * a}})
    base = {"torso": {"r": -2}}
    return K.hit_armoured(k, base, recoil, face_hurt=KF.glyph("g_hurt"), face_back=KF.glyph("g_angry"),
                          helm="head", clank=1.6)


def _die(k):
    flail = [0.4, 0.3, 0.9, 1.0, 0.3, 0.6, 0.1, 0.0, 0.0, 0.0][k]
    stiff = min(1.0, k / 3.0)
    pose = merge(STANCE, K.die_d2(k, toe_x=7.0, heel_x=-6.0, lie_lift=8.0, back=True), {
        "torso": {"r": -4 * stiff}, "head": {"r": 10 * flail - 4},
        "arm_r": {"r": 38 * stiff - 30 * flail}, "fore_r": {"r": 20 * flail - 10 * stiff}, "hand_r": {"r": -40 * stiff},
        "arm_l": {"r": 30 * flail + 12 * stiff}, "fore_l": {"r": 30 * flail - 20 * stiff},
        "thigh_r": {"r": 6 * flail + 24 * stiff}, "shin_r": {"r": -4 * flail - 20 * stiff},
        "thigh_l": {"r": -6 * flail - 8 * stiff}, "shin_l": {"r": -4 * flail},
        "blade": {"sz": [1.0, 0.95, 0.7, 0.45, 0.22, 0.08, 0.04, 0.04, 0.04, 0.04][k],
                  "sx": [1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.5, 0.5, 0.5][k]},
    })
    if k == 2:
        pose["hum"] = {"show": True}
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
