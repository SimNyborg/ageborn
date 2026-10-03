"""Attack Drone: the Drone Carrier's summon (CONTENT_PLAN 5.7, X0 M3, a flying summon). Twin guns, ~40 lu
(the game draws summons at 0.8 scale with a summon ring).

Look (A11, Future palette): a small, mean flying gun drone: a squashed white shell with a team top
plate and a team tail fin, one dark visor slit with angry mint robot eyes, two short swept wings with
team thruster pods and mint jet flames, and a twin plasma gun under the chin with magenta muzzle rings.

"A viewer expects a wasp-like gun drone: darts in, dips its nose and rattles off shots."

Animation (ANIM_SPEC G8 fly, the odometer at 90 x 1.25 = 112.5 lu/s; the hover bob is code motion):
  idle      hovering: a small bob and roll, the jets pulse, the fin twitches, a blink
  walk      flight: nose down 8 degrees, the jets swept back and pulsing on a 2-frame beat
  attack    NOSE-DIP BURST: dips its nose at the target (the held extreme), one twin flash, kicks up
  attack_b  STRAFE SHOT: banks toward the camera and fires level, sliding back from the recoil
  hit       flyer: a tilt and a 4 lu drop, a wobble back up
  die       D8 spiral down, sparks, the jets sputter out, a bounce, X eyes
"""
import math

from ageborn_art import kit_future as KF
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "attack_drone"
GAIT_NAME = "fly"
NAME = "Attack Drone"
HEIGHT_LU = 40
YAW_DEG = -18.0
CANVAS = (220, 190)
FEET = (100, 150)
ANCHORS = {"head": (0, 38), "hitCenter": (0, 20), "muzzle": (20, 10)}
NO_RETIME = True

C = (0.0, 0.0, 20.0)
R = (13.0, 9.0, 8.0)
POD_Y = 12.0
GUN = (8.0, -1.0, 10.5)
MUZZLE = (GUN[0] + 12.0, GUN[1] - 1.0, GUN[2])


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hull", "body", C)
    cx, cy, cz = C
    for s, y in (("l", POD_Y), ("r", -POD_Y)):
        g = Geo().blob((cx - 3.0, y * 0.6, cz + 1.0), (6.0, 6.0, 1.4), p=2.6, rot=(0, 0, -10 if s == "r" else 10))
        rig.part("hull", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)         # swept wing
        rig.joint(f"pod_{s}", "hull", (cx - 6.0, y, cz))
        g = Geo().capsule((cx - 10.0, y, cz), (cx - 2.0, y, cz), 3.2)
        rig.part(f"pod_{s}", g, team=True)
        g = Geo().lathe([(3.0, 0), (3.2, 1.2), (2.0, 1.6)], (cx - 11.0, y, cz), (cx - 12.0, y, cz), segs=16)
        rig.part(f"pod_{s}", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
        rig.joint(f"jet_{s}", f"pod_{s}", (cx - 12.0, y, cz))
        g = Geo().lathe([(2.4, 0), (2.2, 3.0), (1.2, 6.0), (0, 8.5)], (cx - 12.0, y, cz), (cx - 13.0, y, cz), segs=12)
        rig.part(f"jet_{s}", g, glow=F.MINT, outline=1.0, outline_hex=F.MINT)
        g = Geo().lathe([(1.2, 0), (1.0, 2.5), (0, 4.5)], (cx - 12.2, y - 0.6, cz), (cx - 13.2, y - 0.6, cz), segs=10)
        rig.part(f"jet_{s}", g, glow=F.MINT_CORE, outline=0)
    # the shell, a team top plate and tail fin
    g = Geo().blob(C, R, p=2.3, taper=(1.15, 0.8))
    rig.part("hull", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((cx - 1.0, cy, cz + 2.0), (R[0] - 1.0, R[1] + 0.4, R[2] - 1.0), p=2.3)
    g.clip((0, 0, cz + 3.5), (0, 0, -1))
    rig.part("hull", g, team=True)
    rig.secondary("fin", "hull", (cx - 9.0, 0, cz + 6.0), (cx - 14.0, 0, cz + 13.0), max_deg=14, gain=1.0)
    g = Geo().blob((cx - 11.0, 0, cz + 9.0), (4.6, 1.4, 5.0), p=2.4, rot=(0, 30, 0))
    rig.part("fin", g, team=True)
    g = Geo().blob((cx, cy, cz - 3.5), (R[0] - 1.6, R[1] - 1.2, 2.4), p=2.6)
    rig.part("hull", g, F.SUIT, finish="gloss")
    # visor slit with angry eyes
    visor = Geo().blob((cx + 10.4, cy - 1.0, cz + 0.6), (3.0, 7.0, 3.0), p=3.0)
    KF.visor_face(rig, "hull", [visor], (cx + 11.0, cz + 0.8), eye_dx=(0.0, 3.0), eye_rx=1.4, eye_rz=1.8,
                  yaw_deg=YAW_DEG)
    rig.part("hull", visor, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    # the twin gun under the chin
    gx, gy, gz = GUN
    rig.joint("gun", "hull", GUN)
    g = Geo().blob((gx + 1.0, gy, gz + 1.2), (4.0, 3.2, 2.4), p=2.8)
    rig.part("gun", g, F.SUIT)
    g = Geo().capsule((gx + 2.0, gy - 1.6, gz), (MUZZLE[0] - 1.0, gy - 1.6, gz), 1.0)
    g.capsule((gx + 2.0, gy + 1.6, gz), (MUZZLE[0] - 1.0, gy + 1.6, gz), 1.0)
    rig.part("gun", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(0.8, 0), (2.4, 0.2), (2.4, 1.0), (1.0, 1.2)], (MUZZLE[0] - 1.6, gy - 1.6, gz), (MUZZLE[0], gy - 1.6, gz), segs=12)
    rig.part("gun", g, F.MAGENTA)
    rig.joint("flash", "gun", MUZZLE, hidden=True)
    mx, my, mz = MUZZLE
    g = Geo().blob((mx + 5.0, my - 1, mz), (5.4, 1.2, 2.2), p=2.0)
    g.blob((mx + 2.6, my - 1, mz + 2.0), (3.4, 1.1, 1.3), p=2.0, rot=(0, -34, 0))
    rig.part("flash", g, glow=F.MINT, outline=0)
    g = Geo().blob((mx + 3.0, my - 2, mz), (3.0, 1.0, 1.2), p=2.0)
    rig.part("flash", g, glow=F.WHITE, outline=0)
    rig.track("muzzle", "gun", MUZZLE)
    F.sparks(rig, "hull", (cx + 2.0, -8.0, cz + 4.0), color=F.MINT, size=1.0, name="sparks", seed=4)
    rig.joint("odo", "root", (0, 0, 0))
    rig.track("_foot", "odo", (0.0, 0.0, 0.0))


def jets(f, k=1.0, sweep=0.0):
    return {"jet_r": {"sz": [1.0, 0.82, 1.12, 0.9, 1.06, 0.86][f % 6] * k, "r": sweep},
            "jet_l": {"sz": [0.9, 1.1, 0.84, 1.05, 0.88, 1.12][f % 6] * k, "r": sweep}}


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    pose = merge(jets(f, 1.05), {"body": {"z": 1.8 * c}, "hull": {"r": 2.5 * lag, "rx": 3.0 * math.sin(2 * math.pi * f / 6)}})
    if f == 4:
        pose = merge(pose, KF.glyph("g_blink"))
    return merge(pose, KF.glyph("g_angry")) if f != 4 else pose


SPEED = 112.5
PULSE = [1.3, 0.85, 1.22, 0.9, 1.3, 0.85, 1.22, 0.9]


def _walk(f):
    p = 2 * math.pi * f / 8
    odo, _, _ = F.walker_cycle(f, 8, SPEED * 0.25, 0.0)
    return merge({"jet_r": {"sz": 1.2 * PULSE[f], "r": 10.0}, "jet_l": {"sz": 1.2 * PULSE[(f + 1) % 8], "r": 10.0},
                  "odo": {"x": odo}, "body": {"z": 1.0 * math.sin(p)},
                  "hull": {"r": -8.0 + 1.5 * math.cos(p), "rx": 4.0 * math.sin(p)}}, KF.glyph("g_angry"))


# the sim fires every 0.3 s: a 300 ms clip, impact at 150 ms
ATTACK_MS = [30, 40, 50, 30, 50, 50, 50]
ATTACK_IMPACT = 4
#      tilt  dip   HOLD  aim2  FIRE  kick  settle
A_R = [-6, -14, -18, -18, -16, -4, -2]
A_X = [0.5, 1.0, 1.5, 1.5, 0.0, -2.5, -0.5]
A_Z = [0.0, -0.8, -1.4, -1.4, -1.0, 1.2, 0.2]
A_Q = [0.0, -0.03, -0.05, -0.05, 0.05, -0.04, 0.0]


def _a_pose(f):
    pose = merge(jets(f, [1, 1.1, 1.2, 1.2, 1.3, 1.15, 1.0][f]), {
        "body": dict(squash(A_Q[f]), x=A_X[f], z=A_Z[f]), "hull": {"r": A_R[f]}, "flash": {"show": f == 4}})
    return merge(pose, KF.glyph(["g_angry", "g_angry", "g_squint", "g_squint", "g_wide", "g_angry", "g_angry"][f]))


B_RX = [-8, -16, -22, -22, -20, -10, -2]
B_X = [0.0, -0.5, -1.0, -1.0, -3.0, -4.0, -1.0]


def _b_pose(f):
    pose = merge(jets(f, [1, 1.1, 1.2, 1.2, 1.3, 1.15, 1.0][f], sweep=-10.0), {
        "body": dict(squash(A_Q[f]), x=B_X[f], z=0.6 * f if f < 4 else 2.0 - 0.4 * (f - 4)),
        "hull": {"r": -4.0, "rx": B_RX[f]}, "flash": {"show": f == 4}})
    return merge(pose, KF.glyph(["g_angry", "g_squint", "g_squint", "g_squint", "g_wide", "g_angry", "g_angry"][f]))


def _ov(seed):
    return {4: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 4.0, "r1_lu": 8.0, "n": 5, "a0": -60.0,
                 "arc": 120.0, "color": F.MINT_CORE}]}


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(jets(k), {
        "body": dict(squash([-0.08, 0.04, 0.0, -0.02, 0.0][k]), x=-4.0 * max(a, 0), z=-4.0 * max(a, 0) + 1.5 * min(a, 0)),
        "hull": {"r": 18 * a, "rx": [6, 12, -8, 4, 0][k]}, "sparks": {"show": k == 0}})
    return merge(pose, KF.glyph("g_hurt" if k <= 1 else ("g_angry" if k == 2 else "eyes")))


D8 = [dict(x=-2, z=0, r=-10, rx=0, q=-0.06), dict(x=-3, z=-3, r=-24, rx=18, q=0.04),
      dict(x=-2, z=-6, r=-38, rx=-14, q=0.02), dict(x=0, z=-10, r=-52, rx=20, q=0.0),
      dict(x=2, z=-13, r=-64, rx=-6, q=-0.18), dict(x=3, z=-11, r=-58, rx=0, q=0.08),
      dict(x=4, z=-13, r=-62, rx=0, q=-0.06), dict(x=4, z=-13, r=-62, rx=0, q=-0.04),
      dict(x=4, z=-13, r=-62, rx=0, q=-0.06, s=0.96), dict(x=4, z=-13, r=-62, rx=0, q=-0.1, s=0.9)]


def _die(k):
    d = D8[k]
    pose = merge(M.body_about((0, 0, 20), x=d["x"], z=d["z"], r=d["r"], rx=d["rx"], q=d["q"], s=d.get("s", 1.0)), {
        "jet_r": {"s": [0.6, 0.3, 0.5, 0.15, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01][k]},
        "jet_l": {"s": [0.5, 0.4, 0.2, 0.25, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01][k]},
        "sparks": {"show": k in (0, 2, 4)}, "fin": {"r": [10, -20, 25, -15, 30, -10, 5, 0, 0, 0][k]}})
    g = ["g_hurt", "g_wide", "g_spiral", "g_spiral", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x"][k]
    return merge(pose, KF.glyph(g))


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        M.clip("attack", [_a_pose(f) for f in range(7)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(1),
               extra={"holdStep": 2}),
        M.clip("attack_b", [_b_pose(f) for f in range(7)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(2),
               extra={"holdStep": 2}),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=300, attack_impact_at=0.5))
