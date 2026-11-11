"""Drone Carrier: Future Age legendary carrier (ground, armored mech, CONTENT_PLAN 5.7). A point-defence
laser and attack drones, ~172 lu with the mast.

Look (A11, Future palette): a long, heavy hover-tread land carrier: two big charcoal tracks with white
grousers under a long white hull, big team side armour with the pale hex and mint light strips, a flat
flight deck with a launch hatch and a parked attack drone, a forward bridge with a wide dark visor and mint
robot eyes that act, a rear island tower in team colours with a tall antenna mast and a team flag, and a
twin point-defence laser turret on the foredeck with magenta muzzle rings.

"A viewer expects an aircraft carrier on treads: slow and huge, the deck hatch opens and drones lift off,
the laser turret ticks away."

Animation (ANIM_SPEC G6 tracked at card 35 x 1.25 = 43.75 lu/s: two grouser spacings per 8-step cycle;
the drones are summons the game launches on their own timer, so the idle opens the hatch now and then):
  idle      the hatch opens, the parked drone lifts a little and settles back, the mast flag waves, a blink
  walk      the long tracks scroll, the hull rocks slowly, the mast whips a beat late, exhaust and dust
  attack    LASER TICK: the turret swings to aim (the held extreme), a twin flash, the barrels recoil
  attack_b  HIGH TICK: the turret tilts up at air targets and fires, the hull leans back a little
  hit       vehicle: the hull jolts on its suspension, sparks
  die       D7 wreck: the mast snaps, the turret pops off, the hull sags and smokes, X eyes
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

SLUG = "drone_carrier"
GAIT_NAME = "tracked"
NAME = "Drone Carrier"
HEIGHT_LU = 172
YAW_DEG = -10.0
CANVAS = (620, 520)
FEET = (300, 470)
ANCHORS = {"head": (30, 120), "hitCenter": (0, 50)}
NO_RETIME = True

TR_R = 15.0
TX0, TX1 = -58.0, 58.0
TY = -24.0
TW = 12.0
PITCH = 16.0
STEP_LU = PITCH / 4              # 4 lu per step: at 43.75 lu/s a step lasts 91.4 ms
WALK_MS = [91, 92, 91, 92, 91, 92, 91, 91]
WHEELS = (-58.0, -38.0, -19.0, 0.0, 19.0, 38.0, 58.0)
DECK_Z = 52.0
TURRET = (38.0, 0.0, DECK_Z + 2.0)
MUZZLE = (TURRET[0] + 26.0, TURRET[1] - 1.0, TURRET[2] + 9.0)
ISLAND = (-38.0, 6.0, DECK_Z)
HATCH = (-2.0, 0.0, DECK_Z + 1.0)
_W = {}


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, 30.0))
    rig.joint("track_f", "body", (0, -TY, 0))
    names_f, _ = R.tread(rig, "tf", "track_f", TX0, TX1, TR_R, -TY, TW, PITCH, WHEELS, 6.4,
                         color="#1E2128", tooth="#7E8794", hub="#B8BEC8")
    _W["f"] = names_f
    # the hull: charcoal lower body, white upper hull, team side armour with the hex, a flat deck
    g = Geo().blob((0, 0, 36.0), (64.0, 24.0, 9.0), p=2.8)
    rig.part("hull", g, F.SUIT)
    g = Geo().blob((2.0, 0, 46.0), (68.0, 23.0, 7.0), p=3.0, taper=(1.0, 0.9))
    rig.part("hull", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    side = Geo().blob((0, -24.0, 38.0), (58.0, 2.6, 8.0), p=3.2)
    sf = FC.Face(rig, "hull", [side])
    g = KF.hexmark(sf, Geo(), K.scr(sf, (-16.0, -27.0, 38.0)), s=1.6, w=1.6)
    g2 = KF.hexmark(sf, Geo(), K.scr(sf, (22.0, -27.0, 38.0)), s=1.6, w=1.6)
    rig.part("hull", side, team=True)
    rig.part("hull", g, KF.HEX_PALE, highlight=False, outline=0)
    rig.part("hull", g2, KF.HEX_PALE, highlight=False, outline=0)
    g = Geo().blob((0, 24.0, 38.0), (58.0, 2.6, 8.0), p=3.2)
    rig.part("hull", g, team=True)
    KF.strip(rig, "hull", [(-50.0, -26.8, 31.0), (50.0, -26.8, 31.0)], r=1.0)
    g = Geo().blob((4.0, -21.0, 49.5), (62.0, 2.0, 2.4), p=3.4)          # a team rail along the deck edge
    rig.part("hull", g, team=True, outline=0.5)
    g = Geo().blob((0, 0, DECK_Z), (62.0, 20.0, 1.6), p=3.6)                               # flight deck
    rig.part("hull", g, F.GUNMETAL, outline=0.6)
    g = Geo()
    for x in (-24.0, 20.0):
        g.blob((x, -6.0, DECK_Z + 1.2), (6.0, 1.0, 0.4), p=3.0)
    rig.part("hull", g, F.ARMOR, outline=0)                                                # deck markings
    # the launch hatch with a parked drone
    hx, hy, hz = HATCH
    rig.joint("hatch", "hull", (hx - 8.0, hy, hz))
    g = Geo().blob((hx, hy, hz + 0.6), (9.0, 10.0, 1.2), p=3.0)
    rig.part("hatch", g, team=True, outline=0.5)
    rig.joint("pad_drone", "hull", (hx, hy, hz + 1.0), scale=1.6)
    g = Geo().blob((hx, hy, hz + 5.0), (8.0, 6.0, 4.0), p=2.3, taper=(1.15, 0.8))
    rig.part("pad_drone", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((hx - 1.0, hy, hz + 7.0), (7.0, 6.2, 2.0), p=2.4)
    rig.part("pad_drone", g, team=True)
    g = Geo().blob((hx + 7.0, hy - 1.0, hz + 5.2), (1.6, 4.0, 1.6), p=3.0)
    rig.part("pad_drone", g, F.VISOR_DARK, outline=0.5)
    # bridge with a visor face at the front
    g = Geo().blob((56.0, 0, DECK_Z + 4.0), (12.0, 18.0, 9.0), p=2.6)
    rig.part("hull", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    visor = Geo().blob((65.0, -1.0, DECK_Z + 5.0), (4.0, 14.0, 4.4), p=3.0)
    KF.visor_face(rig, "hull", [visor], (66.5, DECK_Z + 5.2), eye_dx=(0.0, 5.0), eye_rx=2.4, eye_rz=3.0, yaw_deg=YAW_DEG)
    rig.part("hull", visor, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    # the island tower (team) and the mast with a flag
    ix, iy, iz = ISLAND
    g = Geo().blob((ix, iy, iz + 22.0), (12.0, 10.0, 22.0), p=2.6, taper=(0.85, 1.0))
    rig.part("hull", g, team=True)
    g = Geo().blob((ix + 6.0, iy - 8.0, iz + 34.0), (6.0, 2.4, 4.0), p=3.0)
    rig.part("hull", g, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    g = Geo().blob((ix, iy, iz + 44.0), (13.0, 11.0, 2.4), p=3.0)
    rig.part("hull", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    rig.secondary("mast", "hull", (ix, iy, iz + 46.0), (ix - 4.0, iy, iz + 114.0), max_deg=10, gain=1.0)
    g = Geo().capsule((ix, iy, iz + 46.0), (ix - 3.0, iy, iz + 112.0), 1.6, 1.0)
    g.capsule((ix - 1.0, iy, iz + 82.0), (ix + 8.0, iy, iz + 82.0), 0.8)
    rig.part("mast", g, F.SUIT, outline=0.6)
    g = Geo().sphere((ix - 3.0, iy, iz + 114.0), 2.4, cuts=3)
    rig.part("mast", g, glow=F.MAGENTA, outline=0.8, outline_hex=F.MAGENTA)
    g = Geo().slab([(ix - 2.6, iz + 108.0), (ix - 26.0, iz + 102.0), (ix - 2.4, iz + 96.0)], iy, 2.0)
    rig.part("mast", g, team=True, outline=0.8)
    rig.joint("mast_loose", "root", (ix, iy, iz + 76.0), hidden=True)
    g = Geo().capsule((ix, iy, iz + 46.0), (ix - 3.0, iy, iz + 112.0), 1.6, 1.0)
    rig.part("mast_loose", g, F.SUIT, outline=0.6)
    # exhausts
    g = Geo().lathe([(0, 0), (3.6, 0.2), (3.4, 4.0), (0, 4.2)], (-66.0, 8.0, 44.0), (-70.0, 8.0, 48.0), segs=14)
    rig.part("hull", g, F.GUNMETAL, outline=0.6)
    F.puff(rig, "hull", (-74.0, 8.0, 52.0), size=1.4, name="exhaust", spread=1.3)
    # the point-defence turret
    tx, ty, tz = TURRET
    rig.joint("turret", "hull", TURRET, scale=1.7)
    g = Geo().blob((tx, ty, tz + 6.0), (11.0, 10.0, 7.0), p=2.4, taper=(1.0, 0.8))
    rig.part("turret", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((tx - 1.0, ty, tz + 9.0), (10.0, 10.4, 3.0), p=2.6)
    rig.part("turret", g, team=True)
    rig.joint("guns", "turret", (tx + 8.0, ty, tz + 9.0))
    g = Geo().capsule((tx + 8.0, ty - 3.0, tz + 9.0), (MUZZLE[0] - 2.0, ty - 3.0, tz + 9.0), 1.6)
    g.capsule((tx + 8.0, ty + 3.0, tz + 9.0), (MUZZLE[0] - 2.0, ty + 3.0, tz + 9.0), 1.6)
    rig.part("guns", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(1.0, 0), (3.0, 0.2), (3.0, 1.6), (1.2, 1.8)], (MUZZLE[0] - 2.5, ty - 3.0, tz + 9.0), (MUZZLE[0], ty - 3.0, tz + 9.0), segs=14)
    rig.part("guns", g, F.MAGENTA)
    rig.joint("flash", "guns", MUZZLE, hidden=True)
    mx, my, mz = MUZZLE
    g = Geo().blob((mx + 8.0, my - 1, mz), (8.0, 1.6, 3.4), p=2.0)
    g.blob((mx + 4.0, my - 1, mz + 3.0), (5.0, 1.4, 1.8), p=2.0, rot=(0, -34, 0))
    rig.part("flash", g, glow=W.MINT, outline=0)
    g = Geo().blob((mx + 5.0, my - 2, mz), (4.4, 1.2, 1.8), p=2.0)
    rig.part("flash", g, glow=F.WHITE, outline=0)
    rig.track("muzzle", "guns", MUZZLE)
    F.sparks(rig, "hull", (20.0, -26.0, 44.0), name="sparks", size=1.8, seed=13)
    F.puff(rig, "root", (0.0, -14.0, 40.0), size=4.0, name="smoke", color="#B9BEC6", spread=1.8)
    rig.joint("track", "body", (0, TY, 0))
    names, _ = R.tread(rig, "tn", "track", TX0, TX1, TR_R, TY, TW, PITCH, WHEELS, 6.4,
                       color="#2A2E37", tooth="#A9B1BD", hub=F.ARMOR)
    _W["n"] = names
    rig.track("_foot", "odo", (0, 0, 0))


def _tracks(step, moving=True):
    d = STEP_LU if moving else 0.0
    return merge(R.tread_pose("tn", _W["n"], step, d, PITCH), R.tread_pose("tf", _W["f"], step, d, PITCH))


def _idle(f):
    t = 2 * math.pi * f / 6
    lift = [0.0, 0.4, 1.0, 1.0, 0.4, 0.0][f]
    pose = merge(_tracks(0, False), {
        "hull": dict(squash(0.006 * math.cos(2 * t)), z=0.5 * math.cos(2 * t)),
        "hatch": {"r": 70.0 * lift}, "pad_drone": {"z": 7.0 * lift, "r": 4.0 * math.sin(t)},
        "turret": {"rz": 6.0 * math.sin(t)}, "mast": {"r": 0.0},
        "exhaust": {"show": f in (1, 4), "z": [0, 0, 0, 0, 3, 0][f]},
    })
    if f == 4:
        pose = merge(pose, KF.glyph("g_blink"))
    if f in (2, 3):
        pose = merge(pose, KF.glyph("g_happy"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    bump = -abs(math.sin(p))
    return merge(_tracks(f), {
        "odo": {"x": 2.0 * STEP_LU * math.cos(p)},
        "hull": dict(squash(0.012 * math.cos(2 * p)), z=2.6 * bump + 1.3, r=0.8 * math.sin(p)),
        "turret": {"r": -1.0 * math.sin(p - 0.6)}, "mast": {"r": 0.0},
        "exhaust": {"show": f % 4 in (1, 2), "x": [0, -2.0, -7.0, 0][f % 4], "z": [0, 0, 3.0, 0][f % 4]},
    })


def _walk_clip():
    ov = {f: [{"kind": "dust", "ground": (-74.0 - 5.0 * (f % 4), 0.0), "size_lu": 6.5 + 1.5 * (f % 4), "puffs": 3,
               "seed": 80 + f, "spread": 1.0, "dir": -1.0, "color": W.DUST}] for f in range(8)}
    return M.clip("walk", [_walk(f) for f in range(8)], WALK_MS, loop=True, overlays=ov)


# the sim fires every 0.5 s: a 500 ms clip, impact at 250 ms
ATTACK_MS = [40, 60, 100, 50, 60, 60, 60, 70]
ATTACK_IMPACT = 4
#        swing aim  HOLD  aim2  FIRE  kick  back  settle
A_TRZ = [4, 8, 10, 10, 10, 8, 6, 2]
A_GR = [0, 2, 3, 3, 3, 8, 4, 0]
A_GX = [0, 0, 0, 0, -2.5, -1.0, 0, 0]


def _a_pose(f):
    pose = merge(_tracks(0, False), {
        "turret": {"r": [0, 1, 1, 1, 0, -1, 0, 0][f]}, "guns": {"r": A_GR[f], "x": A_GX[f]},
        "flash": {"show": f == 4}, "hull": {"x": [0, 0, 0.3, 0.3, -1.0, -1.5, -0.5, 0][f]},
    })
    if f == 3:
        pose["turret"]["r"] += 0.4
    return merge(pose, KF.glyph(["g_angry", "g_angry", "g_squint", "g_squint", "g_wide", "g_angry", "eyes", "eyes"][f]))


B_GR = [10, 22, 30, 30, 30, 36, 24, 6]


def _b_pose(f):
    pose = merge(_tracks(0, False), {
        "guns": {"r": B_GR[f], "x": A_GX[f]}, "flash": {"show": f == 4},
        "hull": {"r": [0, 0.5, 1.0, 1.0, 1.5, 2.0, 1.0, 0.0][f]},
    })
    if f == 3:
        pose["guns"]["r"] += 1.0
    return merge(pose, KF.glyph(["g_angry", "g_wide", "g_squint", "g_squint", "g_wide", "g_angry", "eyes", "eyes"][f]))


def _ov():
    return {4: [{"kind": "burst", "joint": "guns", "point": MUZZLE, "r0_lu": 7.0, "r1_lu": 13.0, "n": 6, "a0": -60.0,
                 "arc": 120.0, "color": W.MINT_CORE}]}


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_tracks(0, False), {
        "body": {"x": -2.0 * max(a, 0)}, "hull": dict(squash([-0.03, 0.015, 0.0, -0.01, 0.0][k]), r=2.5 * a, z=1.5 * a),
        "turret": {"r": 4 * a}, "sparks": {"show": k == 0}, "mast": {"r": 0.0}})
    return merge(pose, KF.glyph("g_hurt" if k <= 1 else ("g_angry" if k == 2 else "eyes")))


def _die(k):
    t = min(1.0, k / 5.0)
    pose = merge(_tracks(0, False), {
        "hull": {"r": -3.0 * t, "z": -5.0 * t},
        "turret": {"z": [0, 6, 14, 12, 4, 0, 0, 0, 0, 0][k], "r": [0, -20, -60, -100, -130, -150, -150, -150, -150, -150][k],
                   "x": [0, 2, 6, 10, 14, 16, 16, 16, 16, 16][k]},
        "hatch": {"r": 90.0 * t}, "pad_drone": {"r": -30 * t, "z": -2.0 * t},
        "sparks": {"show": k in (0, 2, 4)}, "smoke": {"show": 2 <= k <= 11, "s": 0.6 + 0.06 * k, "z": 1.8 * k},
    })
    if k >= 2:
        pose["mast"] = {"hide": True}
        pose["mast_loose"] = {"show": True, "x": -6.0 * t, "z": -40.0 * t, "r": 75.0 * t}
    g = ["g_hurt", "g_wide", "g_spiral", "g_spiral", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x"][k]
    return merge(pose, KF.glyph(g))


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [150, 150, 150, 150, 150, 150], loop=True),
        _walk_clip(),
        M.clip("attack", [_a_pose(f) for f in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(),
               extra={"holdStep": 2}),
        M.clip("attack_b", [_b_pose(f) for f in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(),
               extra={"holdStep": 2}),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in M.HEAVY_DIE_KEEP], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True, attack_ms=500, attack_impact_at=0.5))
