"""Particle Cannon: Future Age epic artillery (armored mech, CONTENT_PLAN 5.7). A dish beam on treads, ~92 lu.

Look (A11, Future palette): a squat tracked artillery carrier: charcoal tracks with white grousers and
white road wheels, a low white hull with big team side skirts carrying the pale hex and a mint light
strip, a small cockpit block with a dark visor and mint robot eyes that act, and on top a raised arm
holding a big dish emitter: a white dish with a team rim, a charcoal back, three mint rings that light
inward and a magenta emitter spike in the middle. A whip antenna with a team pennant at the back.

"A viewer expects a ray gun on treads: the dish charges with glowing rings, a beam snaps out, the whole
thing hops back."

Animation (ANIM_SPEC G6 tracked at card 45 x 1.25 = 56.25 lu/s: the track scrolls two grouser spacings
per 8-step cycle, the road wheels turn the same distance; the sim's 1.75 s wind-up loops the charge):
  idle      the dish breathes and tilts, the rings flicker, the pennant waves, a blink
  walk      the tracks scroll, the hull bobs on its suspension, the dish arm lags, exhaust puffs, dust
  attack    CHARGE AND SNAP: the dish tilts to aim, the rings light up one by one and a ball of light
            swells at the spike (the held extreme, looping), the beam snaps out, the hull hops back
            and rocks
  attack_b  LOW QUICK SHOT: the dish dips low and level, a quick charge, the shot rocks the hull back
            onto its rear road wheels
  hit       vehicle: the hull bounces on its suspension, sparks
  die       D7 wreck: the dish arm snaps and the dish drops, the hull sags nose-down, smoke, X eyes
"""
import math

from ageborn_art import face as FC
from ageborn_art import kit_future as KF
from ageborn_art import kit_future_wave as W
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "particle_cannon"
GAIT_NAME = "tracked"
NAME = "Particle Cannon"
HEIGHT_LU = 92
YAW_DEG = -10.0
CANVAS = (420, 330)
FEET = (190, 300)
ANCHORS = {"head": (0, 88), "hitCenter": (0, 34)}
NO_RETIME = True

TR_R = 9.5
TX0, TX1 = -28.0, 28.0
TY = -15.0
TW = 9.0
PITCH = 12.0
STEP_LU = PITCH / 4               # 3 lu per walk step: at 56.25 lu/s a step lasts 53.3 ms
WALK_MS = [53, 54, 53, 53, 54, 53, 53, 54]
WHEELS = (-28.0, -14.0, 0.0, 14.0, 28.0)
ARM0 = (-6.0, 0.0, 34.0)          # dish arm pivot on the hull
DISH = (18.0, -1.0, 58.0)         # dish centre (rest: facing +X)
SPIKE = (DISH[0] + 9.0, DISH[1] - 1.0, DISH[2])
_W = {}


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, 20.0))
    # far track first (darker), then the hull, then the near track
    rig.joint("track_f", "body", (0, -TY, 0))
    names_f, _ = R.tread(rig, "tf", "track_f", TX0, TX1, TR_R, -TY, TW, PITCH, WHEELS, 4.4,
                         color="#1E2128", tooth="#7E8794", hub="#B8BEC8")
    _W["f"] = names_f
    g = Geo().blob((0, 0, 24.0), (34.0, 15.0, 7.0), p=2.6, taper=(1.0, 0.85))           # white hull
    g.blob((10.0, 0, 30.0), (14.0, 12.0, 5.0), p=2.6)
    rig.part("hull", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    skirt = Geo().blob((0, -15.6, 19.0), (30.0, 2.4, 6.0), p=3.0)                         # team side skirt
    sf = FC.Face(rig, "hull", [skirt])
    g = KF.hexmark(sf, Geo(), K.scr(sf, (-10.0, -18.0, 19.0)), s=1.1, w=1.4)
    rig.part("hull", skirt, team=True)
    rig.part("hull", g, KF.HEX_PALE, highlight=False, outline=0)
    KF.strip(rig, "hull", [(6.0, -17.8, 16.0), (26.0, -17.8, 16.0)], r=0.8)
    g = Geo().blob((0, 15.6, 19.0), (30.0, 2.4, 6.0), p=3.0)
    rig.part("hull", g, team=True)
    g = Geo().blob((-12.0, 0, 30.4), (14.0, 11.0, 2.0), p=3.0)          # a team deck plate
    rig.part("hull", g, team=True, outline=0.5)
    # cockpit block with a visor face (front)
    g = Geo().blob((26.0, 0, 30.0), (7.0, 10.0, 6.0), p=2.6)
    rig.part("hull", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    visor = Geo().blob((31.0, -1.0, 31.0), (3.0, 8.0, 3.2), p=3.0)
    KF.visor_face(rig, "hull", [visor], (32.0, 31.2), eye_dx=(0.0, 3.6), eye_rx=1.7, eye_rz=2.2, yaw_deg=YAW_DEG)
    rig.part("hull", visor, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    g = Geo().lathe([(0, 0), (2.6, 0.2), (2.4, 3.0), (0, 3.2)], (-33.0, 5.0, 28.0), (-36.0, 5.0, 31.0), segs=14)
    rig.part("hull", g, F.GUNMETAL, outline=0.6)
    F.puff(rig, "hull", (-38.0, 5.0, 34.0), size=0.9, name="exhaust", spread=1.2)
    # the dish arm and the dish
    rig.joint("arm", "hull", ARM0)
    ax, ay, az = ARM0
    g = Geo().blob((ax, ay, az + 2.0), (8.0, 8.0, 5.0), p=2.6)
    rig.part("arm", g, F.GUNMETAL, finish="metal", outline=0.6)
    g = Geo().capsule((ax, ay, az + 4.0), (DISH[0] - 6.0, ay, DISH[2] - 2.0), 3.0, 2.4)
    rig.part("arm", g, F.SUIT, outline=0.8)
    rig.joint("dish", "arm", DISH)
    dx, dy, dz = DISH
    g = Geo().lathe([(0, -3.0), (10.0, -1.0), (15.0, 3.0), (15.6, 4.6), (14.0, 4.6), (9.0, 1.8), (0, 0.8)],
                    (dx - 3.0, dy, dz), (dx - 2.0, dy, dz), segs=28)
    rig.part("dish", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(13.8, 3.6), (15.8, 4.0), (15.8, 5.6), (13.6, 5.4)], (dx - 3.0, dy, dz), (dx - 2.0, dy, dz), segs=28)
    rig.part("dish", g, team=True, outline=0.5)
    g = Geo().blob((dx - 5.0, dy, dz), (3.6, 7.0, 7.0), p=2.6)
    rig.part("dish", g, team=True)
    for i, r in enumerate((11.0, 7.4, 4.0)):
        g = Geo().lathe([(r - 0.8, 0), (r + 0.8, 0), (r + 0.8, 0.6), (r - 0.8, 0.6)],
                        (dx - 3.0 + 1.0 + 0.6 * (3 - i), dy - 0.4, dz), (dx - 2.0 + 1.0 + 0.6 * (3 - i), dy - 0.4, dz), segs=24)
        rig.joint(f"ring{i}", "dish", (dx, dy, dz), hidden=True)
        rig.part(f"ring{i}", g, glow=W.MINT, outline=0.6, outline_hex=W.MINT)
    g = Geo().capsule((dx - 1.0, dy - 1.0, dz), (SPIKE[0], SPIKE[1], SPIKE[2]), 1.4, 0.6)
    rig.part("dish", g, F.MAGENTA, outline=0.6)
    rig.joint("charge", "dish", SPIKE, hidden=True)
    g = Geo().sphere((SPIKE[0] + 1.0, SPIKE[1] - 1.0, SPIKE[2]), 4.2, cuts=4)
    rig.part("charge", g, glow=W.MINT_CORE, outline=1.4, outline_hex=W.MINT)
    rig.joint("flash", "dish", SPIKE, hidden=True)
    g = Geo().blob((SPIKE[0] + 8.0, SPIKE[1] - 1, SPIKE[2]), (9.0, 2.0, 4.2), p=2.0)
    rig.part("flash", g, glow=W.MINT, outline=0)
    g = Geo().blob((SPIKE[0] + 5.0, SPIKE[1] - 2, SPIKE[2]), (5.0, 1.6, 2.4), p=2.0)
    rig.part("flash", g, glow=F.WHITE, outline=0)
    rig.track("muzzle", "dish", SPIKE)
    # the antenna and pennant (follow-through)
    rig.secondary("antenna", "hull", (-26.0, 8.0, 30.0), (-30.0, 8.0, 62.0), max_deg=18, gain=1.3)
    g = Geo().capsule((-26.0, 8.0, 30.0), (-29.6, 8.0, 61.0), 0.9)
    rig.part("antenna", g, F.SUIT, outline=0.6)
    g = Geo().slab([(-29.0, 60.0), (-44.0, 56.0), (-29.0, 52.0)], 8.0, 1.6)
    rig.part("antenna", g, team=True, outline=0.8)
    F.sparks(rig, "hull", (10.0, -18.0, 30.0), name="sparks", size=1.3, seed=12)
    F.puff(rig, "root", (0.0, -10.0, 24.0), size=2.4, name="smoke", color="#B9BEC6", spread=1.6)
    # near track
    rig.joint("track", "body", (0, TY, 0))
    names, _ = R.tread(rig, "tn", "track", TX0, TX1, TR_R, TY, TW, PITCH, WHEELS, 4.4,
                       color="#2A2E37", tooth="#A9B1BD", hub=F.ARMOR)
    _W["n"] = names
    rig.track("_foot", "odo", (0, 0, 0))


def _tracks(step, moving=True):
    d = STEP_LU if moving else 0.0
    return merge(R.tread_pose("tn", _W["n"], step, d, PITCH), R.tread_pose("tf", _W["f"], step, d, PITCH))


def rings(n):
    return {f"ring{i}": {"show": i < n} for i in range(3)}


def _idle(f):
    t = 2 * math.pi * f / 6
    pose = merge(_tracks(0, False), rings([0, 1, 0, 0, 1, 0][f]), {
        "hull": dict(squash(0.01 * math.cos(2 * t)), z=0.4 * math.cos(2 * t)),
        "arm": {"r": 1.5 * math.sin(t)}, "dish": {"r": 2.5 * math.sin(t - 0.8)},
        "exhaust": {"show": f in (1, 4), "z": [0, 0, 0, 0, 2, 0][f]},
    })
    if f == 4:
        pose = merge(pose, KF.glyph("g_blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    bump = -abs(math.sin(p))
    return merge(_tracks(f), {
        "odo": {"x": 2.0 * STEP_LU * math.cos(p)},
        "hull": dict(squash(0.02 * math.cos(2 * p)), z=2.2 * bump + 1.1, r=1.5 * math.sin(p)),
        "arm": {"r": -1.6 * math.sin(p - 0.6)}, "dish": {"r": -2.4 * math.sin(p - 1.0)},
        "exhaust": {"show": f % 4 in (1, 2), "x": [0, -1.0, -5.0, 0][f % 4], "z": [0, 0, 2.5, 0][f % 4]},
    })


def _walk_clip():
    ov = {f: [{"kind": "dust", "ground": (-38.0 - 4.0 * (f % 4), 0.0), "size_lu": 4.5 + 1.2 * (f % 4), "puffs": 3,
               "seed": 70 + f, "spread": 1.0, "dir": -1.0, "color": W.DUST}] for f in range(8)}
    return M.clip("walk", [_walk(f) for f in range(8)], WALK_MS, loop=True, overlays=ov)


# 10 unique frames in 790 ms; the beam on frame 4 at 291 ms; the hold (2) loops with its partner (3)
ATTACK_MS = [40, 60, 130, 61, 80, 90, 80, 80, 90, 79]
ATTACK_IMPACT = 4
#      aim   ring  HOLD  hold2 SNAP  hop   land  rock  roll  settle
A_ARM = [4, 8, 10, 10, 10, 16, 8, 4, 2, 0]
A_DISH = [2, 4, 5, 5, 4, 10, 4, 2, 0, 0]
A_BX = [0.0, 0.5, 1.0, 1.2, -3.0, -8.0, -9.0, -6.0, -2.5, -1.0]
A_BZ = [0.0, -0.5, -1.0, -1.0, 2.0, 5.0, 0.0, 1.5, 0.0, 0.0]
A_HR = [0.0, -1.0, -1.5, -1.5, 4.0, 6.0, 0.5, 2.0, -0.5, 0.0]
A_Q = [0.0, -0.02, -0.04, -0.04, 0.04, 0.05, -0.10, 0.03, 0.0, 0.0]
A_RINGS = [1, 2, 3, 3, 0, 0, 0, 0, 0, 0]
A_CHG = [0, 0.4, 1.0, 1.2, 0, 0, 0, 0, 0, 0]
A_EYES = ["g_angry", "g_squint", "g_squint", "g_squint", "g_wide", "g_hurt", "eyes", "eyes", "g_happy", "eyes"]


def _a_pose(f):
    pose = merge(_tracks(0, False), rings(A_RINGS[f]), {
        "body": {"x": A_BX[f], "z": A_BZ[f]}, "hull": dict(squash(A_Q[f]), r=A_HR[f]),
        "arm": {"r": A_ARM[f]}, "dish": {"r": A_DISH[f], "x": -3.0 if f == 4 else 0.0},
        "charge": {"show": A_CHG[f] > 0, "s": max(A_CHG[f], 0.01)}, "flash": {"show": f == 4},
        "exhaust": {"show": f in (5, 6), "z": 2.0 * (f - 4)},
    })
    if f == 3:
        pose["body"]["x"] += 0.35
    return merge(pose, KF.glyph(A_EYES[f]))


B_ARM = [-4, -10, -14, -14, -14, -8, -6, -2, 0, 0]
B_DISH = [-2, -6, -8, -8, -8, -2, -2, 0, 0, 0]
B_HR = [0.0, -1.5, -2.5, -2.5, 6.0, 8.0, 2.0, 0.5, 0.0, 0.0]


def _b_pose(f):
    if f in (8, 9):
        return _a_pose(f)
    pose = merge(_tracks(0, False), rings([1, 2, 3, 3, 0, 0, 0, 0][f]), {
        "body": {"x": [0, 0.5, 0.8, 1.0, -2.0, -5.0, -4.0, -2.0][f], "z": [0, 0, -0.5, -0.5, 1.0, 2.5, 0.0, 0.5][f]},
        "hull": dict(squash(A_Q[f]), r=B_HR[f]),
        "arm": {"r": B_ARM[f]}, "dish": {"r": B_DISH[f], "x": -3.0 if f == 4 else 0.0},
        "charge": {"show": f in (1, 2, 3), "s": [0, 0.5, 0.9, 1.0][f] if f < 4 else 0.01}, "flash": {"show": f == 4},
    })
    if f == 3:
        pose["body"]["x"] += 0.3
    return merge(pose, KF.glyph(A_EYES[f]))


def _ov():
    return {2: [{"kind": "rings", "joint": "dish", "point": SPIKE, "radii_lu": (6.0, 10.0), "a0": -80.0, "a1": 80.0,
                 "color": W.MINT_CORE}],
            4: [{"kind": "burst", "joint": "dish", "point": SPIKE, "r0_lu": 8.0, "r1_lu": 16.0, "n": 7, "a0": -60.0,
                 "arc": 120.0, "color": W.MINT_CORE},
                {"kind": "dust", "ground": (-30.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 211, "spread": 1.2,
                 "dir": -1.0, "color": W.DUST}]}


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_tracks(0, False), {
        "body": {"x": -3.0 * max(a, 0)}, "hull": dict(squash([-0.06, 0.03, 0.0, -0.02, 0.0][k]), r=5.0 * a, z=1.5 * a),
        "arm": {"r": 6 * a}, "dish": {"r": 8 * a}, "sparks": {"show": k == 0}})
    return merge(pose, KF.glyph("g_hurt" if k <= 1 else ("g_angry" if k == 2 else "eyes")))


def _die(k):
    t = min(1.0, k / 4.0)
    pose = merge(_tracks(0, False), {
        "hull": {"r": -5.0 * t, "z": -3.0 * t}, "arm": {"r": -40.0 * t}, "dish": {"r": -50.0 * t, "z": -6.0 * t},
        "sparks": {"show": k in (0, 2, 4)}, "smoke": {"show": 2 <= k <= 9, "s": 0.6 + 0.06 * k, "z": 1.5 * k},
        "antenna": {"r": [0, 20, -16, 10, -6, 0, 0, 0, 0, 0][k]},
    })
    g = ["g_hurt", "g_wide", "g_spiral", "g_spiral", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x"][k]
    return merge(pose, KF.glyph(g))


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        _walk_clip(),
        M.clip("attack", [_a_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(),
               extra={"holdStep": 2, "holdLoop": [2, 3]}),
        M.clip("attack_b", [_b_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(),
               reuse={8: ("attack", 8), 9: ("attack", 9)}, extra={"holdStep": 2, "holdLoop": [2, 3]}),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=790, attack_impact_at=0.3684))
