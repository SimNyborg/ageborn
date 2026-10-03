"""Jetpack Trooper: Future Age epic air gunship (CONTENT_PLAN 5.7). Beam rifle and a jetpack, ~70 lu.

Look (A11, Future palette): a trooper in glossy white armour over a charcoal suit, the Pulse Trooper
helmet with a team cap and crest over a dark visor (mint eyes that act), a team chest plate with the hex,
team shoulder pads and shin guards, and a big white jetpack with two team thruster pods and long
white-mint exhaust flames. He carries a sleek beam rifle with a magenta muzzle ring. Flyers are authored
with the origin at their lowest point (the boot tips); the battle view lifts air units to their altitude.

"A viewer expects a rocketeer: hovers with legs dangling, braces in the air and fires, the recoil pushing
him back; flames pulse."

Animation (ANIM_SPEC G8 fly, the odometer at 80 x 1.25 = 100 lu/s; the hover bob is code motion):
  idle      hovering upright, legs dangling and kicking a little, the flames pulse, a blink
  walk      flight: leaning 20 degrees forward, legs trailing back, the flames swept back and pulsing
  attack    BRACED AIR SHOT: tucks his knees, shoulders the rifle (the held extreme), one beam, the
            recoil drifts him back with the legs swinging forward
  attack_b  DIVE STRAFE: pitches nose-down 25 degrees with the rifle low at the hip (the held extreme),
            fires down the lane, the flames flare
  hit       flyer: a tilt and a drop, the legs flail
  die       D8 spiral down, the jetpack sputters smoke, a bounce, X eyes
"""
import math

from ageborn_art import kit_future as KF
from ageborn_art import kit_future_wave as W
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "jetpack_trooper"
GAIT_NAME = "fly"
NAME = "Jetpack Trooper"
HEIGHT_LU = 70
CANVAS = (320, 290)
FEET = (150, 236)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 34), "muzzle": (50, 32)}
NO_RETIME = True

G0 = (4.0, -15.0, 27.0)
FORE = 15.0
MUZZLE = (G0[0] + 48.0, G0[1], G0[2] + 3.6)
PACK = (-13.0, 0.0, 32.0)


def _rifle(rig, j):
    gx, gy, gz = G0
    g = Geo().blob((gx + 12, gy + 1, gz + 3.5), (13.0, 3.0, 3.6), p=3.6)
    g.blob((gx - 6, gy + 1, gz + 2.5), (5.6, 2.4, 3.6), p=3.4, rot=(0, 10, 0))
    g.blob((gx + 0.5, gy + 1, gz - 1.5), (2.2, 2.0, 4.0), p=2.8, rot=(0, -12, 0))
    g.blob((gx + 15, gy + 2, gz - 1.0), (2.0, 1.8, 3.2), p=2.8, rot=(0, -8, 0))
    rig.part(j, g, F.SUIT)
    g = Geo().blob((gx + 18, gy + 1, gz + 6.8), (14.0, 2.6, 2.0), p=3.4)
    g.lathe([(2.6, 0), (2.8, 4), (2.2, 14.0), (0, 14.2)], (gx + 28, gy + 1, gz + 3.5), (gx + 44, gy + 1, gz + 3.5), segs=14)
    rig.part(j, g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((gx + 12, gy - 2.0, gz + 3.8), (5.0, 0.8, 1.6), p=3.2)
    rig.part(j, g, team=True, outline=0.5)
    g = Geo().lathe([(2.0, 0), (4.2, 0.2), (4.2, 1.6), (2.2, 1.8)], (gx + 44, gy + 1, gz + 3.5), (gx + 47.5, gy + 1, gz + 3.5), segs=16)
    rig.part(j, g, F.MAGENTA)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, helmet_kind="dome", team_greave=True, pack=False)
    # the jetpack: a white body, two team thruster pods, nozzles and flames
    px, py, pz = PACK
    g = Geo().blob((px, py, pz), (5.6, 9.0, 10.0), p=3.2)
    rig.part("torso", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    for s, y in (("l", 7.5), ("r", -7.5)):
        g = Geo().capsule((px - 3.0, y, pz + 8.0), (px - 3.0, y, pz - 8.0), 3.6)
        rig.part("torso", g, team=True)
        g = Geo().lathe([(3.4, 0), (4.0, 2.2), (2.6, 2.8)], (px - 3.0, y, pz - 9.0), (px - 3.0, y, pz - 11.0), segs=16)
        rig.part("torso", g, F.GUNMETAL, outline=0.6)
        rig.joint(f"jet_{s}", "torso", (px - 3.0, y, pz - 11.0))
        g = Geo().lathe([(3.0, 0), (2.8, 4.0), (1.8, 10.0), (0, 16.0)], (px - 3.0, y, pz - 11.0), (px - 3.0, y, pz - 12.0), segs=14)
        rig.part(f"jet_{s}", g, glow=W.MINT, outline=1.0, outline_hex=W.MINT)
        g = Geo().lathe([(1.6, 0), (1.4, 4.0), (0, 9.0)], (px - 3.0, y - 0.8, pz - 11.2), (px - 3.0, y - 0.8, pz - 12.2), segs=12)
        rig.part(f"jet_{s}", g, glow=W.FROST, outline=0)
    F.puff(rig, "torso", (px - 3.0, -4.0, pz - 16.0), size=1.0, name="smoke", spread=1.2, color="#8A8D96")
    rig.joint("gun", "torso", G0)
    _rifle(rig, "gun")
    rig.track("muzzle", "gun", MUZZLE)
    mx, my, mz = MUZZLE
    rig.joint("flash", "gun", MUZZLE, hidden=True)
    g = Geo().blob((mx + 8.0, my - 1, mz), (8.4, 1.6, 3.2), p=2.0)
    g.blob((mx + 4.0, my - 1, mz + 2.6), (5.6, 1.4, 1.8), p=2.0, rot=(0, -34, 0))
    g.blob((mx + 4.0, my - 1, mz - 2.6), (5.6, 1.4, 1.8), p=2.0, rot=(0, 34, 0))
    rig.part("flash", g, glow=W.MINT, outline=0)
    g = Geo().blob((mx + 5.0, my - 2, mz), (5.0, 1.2, 1.8), p=2.0)
    rig.part("flash", g, glow=F.WHITE, outline=0)
    F.sparks(rig, "torso", (px - 2.0, -9.0, pz + 2.0), color=W.MINT, size=1.0, name="sparks", seed=6)
    # a flyer: the walk speed comes from a sliding odometer, not the soles
    rig.trackers.pop("_foot_l", None)
    rig.joint("odo", "root", (0, 0, 0))
    rig.track("_foot", "odo", (0.0, 0.0, 0.0))


def hold(gx, gz, deg):
    return F.hold2("gun", G0, FORE, gx, gz, deg)


def legs(th_r, sh_r, th_l, sh_l, foot=-30.0):
    """Dangling legs (the feet point down: a flyer's boots hang)."""
    return {"thigh_r": {"r": th_r}, "shin_r": {"r": sh_r}, "foot_r": {"r": foot},
            "thigh_l": {"r": th_l}, "shin_l": {"r": sh_l}, "foot_l": {"r": foot - 6}}


def jets(f, k=1.0, sweep=0.0):
    return {"jet_r": {"sz": [1.0, 0.82, 1.12, 0.9, 1.06, 0.86][f % 6] * k, "r": sweep},
            "jet_l": {"sz": [0.9, 1.1, 0.84, 1.05, 0.88, 1.12][f % 6] * k, "r": sweep}}


LOW = (6.0, 25.0, -10.0)
STANCE = merge(hold(*LOW), legs(14, -22, -6, -16), {"body": {"z": 4.0}})


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    pose = merge(STANCE, jets(f, 1.05), legs(14 + 6 * lag, -22 - 8 * lag, -6 - 6 * lag, -16 + 6 * lag),
                 {"body": {"z": 4.0 + 1.2 * c}, "torso": {"r": 1.5 * lag}})
    if f == 4:
        pose = merge(pose, KF.glyph("g_blink"))
    return pose


SPEED = 100.0
PULSE = [1.3, 0.85, 1.22, 0.9, 1.3, 0.85, 1.22, 0.9]


def _walk(f):
    p = 2 * math.pi * f / 8
    odo, _, _ = F.walker_cycle(f, 8, SPEED * 0.25, 0.0)
    pose = merge(hold(1.0, 24.0, 28.0), legs(-22 + 6 * math.sin(p), -30 - 8 * math.sin(p - 0.8),
                                             -34 + 6 * math.sin(p + 1.2), -24 - 6 * math.sin(p + 0.4), foot=-20),
                 {"jet_r": {"sz": 1.25 * PULSE[f], "r": 24.0}, "jet_l": {"sz": 1.25 * PULSE[(f + 1) % 8], "r": 24.0},
                  "odo": {"x": odo}}, M.body_about((0, 0, 30), r=-20.0, z=6.0 + 1.0 * math.sin(p)))
    return pose


# the sim fires every 0.6 s: a 600 ms clip, impact at 300 ms
ATTACK_MS = [50, 70, 130, 50, 70, 80, 70, 80]
ATTACK_IMPACT = 4
#     tuck  aim   HOLD  hold2 FIRE  drift drift2 settle
A_G = [(7, 30, -4), (7.5, 34, 0), (7.5, 34, 0), (7.5, 34, 0), (7.5, 34.5, 0), (4, 37, 20), (5, 32, 8), (6, 26, -8)]
A_BX = [0.0, 0.5, 0.8, 0.8, 0.0, -5.0, -3.0, -1.0]
A_R = [2, 4, 6, 6, 4, 10, 6, 2]
A_LEG = [(30, -50, 10, -40), (44, -70, 24, -60), (50, -80, 30, -70), (50, -80, 30, -70), (48, -78, 28, -68),
         (36, -40, 20, -30), (24, -30, 6, -20), (16, -22, -4, -16)]
A_EYES = ["g_angry", "g_angry", "g_squint", "g_squint", "g_wide", "g_hurt", "eyes", "eyes"]


def _a_pose(f):
    pose = merge(hold(*A_G[f]), legs(*A_LEG[f]), jets(f, [1.1, 1.2, 1.3, 1.3, 1.4, 1.5, 1.2, 1.0][f], sweep=-10.0),
                 {"flash": {"show": f == 4}}, M.body_about((0, 0, 30), x=A_BX[f], z=4.0, r=A_R[f]))
    if f == 3:
        pose["body"]["x"] += 0.35
    return merge(pose, KF.glyph(A_EYES[f]))


B_G = [(5, 26, -6), (3, 22, 6), (2, 21, 8), (2, 21, 8), (2.5, 21, 6), (1, 23, 24), (4, 25, 10), (6, 26, -8)]
B_R = [-8, -18, -25, -25, -24, -16, -8, -2]
B_LEG = [(-10, -30, -24, -20), (-24, -34, -36, -24), (-30, -36, -40, -28), (-30, -36, -40, -28), (-28, -34, -38, -26),
         (-12, -30, -28, -24), (0, -24, -14, -18), (12, -22, -4, -16)]


def _b_pose(f):
    pose = merge(hold(*B_G[f]), legs(*B_LEG[f], foot=-20), jets(f, [1.2, 1.3, 1.4, 1.4, 1.5, 1.6, 1.3, 1.0][f], sweep=26.0),
                 {"flash": {"show": f == 4}}, M.body_about((0, 0, 30), x=[0, 1, 2, 2, 1, -2, -1, 0][f], z=5.0, r=B_R[f]))
    if f == 3:
        pose["body"]["x"] += 0.35
    return merge(pose, KF.glyph(A_EYES[f]))


def _ov():
    return {4: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5,
                 "a0": -60.0, "arc": 120.0, "color": W.MINT_CORE}]}


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(STANCE, jets(k), legs(14 + 30 * a, -22 - 30 * a, -6 + 20 * a, -16 - 20 * a),
                 {"head": {"r": 14 * a}, "sparks": {"show": k == 0}},
                 M.body_about((0, 0, 30), x=-4.0 * max(a, 0), z=4.0 - 4.0 * max(a, 0), r=16 * a))
    return merge(pose, KF.glyph("g_hurt" if k <= 1 else ("g_angry" if k == 2 else "eyes")))


D8 = [dict(x=-2, z=4, r=10), dict(x=-4, z=0, r=40), dict(x=-4, z=-4, r=80), dict(x=-2, z=-8, r=110),
      dict(x=0, z=-10, r=150), dict(x=2, z=-8, r=170), dict(x=3, z=-12, r=176), dict(x=3, z=-12, r=178),
      dict(x=3, z=-12, r=180), dict(x=3, z=-12, r=180)]


def _die(k):
    d = D8[k]
    flail = [0.3, 1.0, 1.0, 0.8, 0.4, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, legs(20 + 40 * flail, -30 * flail - 10, -10 - 30 * flail, -20), {
        "jet_r": {"s": [0.7, 0.4, 0.5, 0.2, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01][k]},
        "jet_l": {"s": [0.6, 0.5, 0.3, 0.25, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01][k]},
        "smoke": {"show": 1 <= k <= 6, "z": 2.0 * k}, "sparks": {"show": k in (0, 2)},
        "arm_r": {"r": 60 * flail + 20}, "arm_l": {"r": 100 * flail + 30},
    }, M.body_about((0, 0, 30), x=d["x"], z=d["z"], r=d["r"]))
    g = ["g_hurt", "g_wide", "g_spiral", "g_spiral", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x"][k]
    return merge(pose, KF.glyph(g))


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        M.clip("attack", [_a_pose(f) for f in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(),
               extra={"holdStep": 2}),
        M.clip("attack_b", [_b_pose(f) for f in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(),
               extra={"holdStep": 2}),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=600, attack_impact_at=0.5))
