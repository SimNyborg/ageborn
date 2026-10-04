"""Star Fighter: Cosmic Age epic air gunship (CONTENT_PLAN 5.8). A small legion starfighter, ~46 lu.

Look (A11, Cosmic palette): a sleek star-white fuselage with a violet nose and belly, a bubble canopy over a dark
pilot silhouette whose light violet visor glyphs act, swept team wings with star-white tips and the pale Cosmic
star, a team tail fin, twin violet laser cannons on the wing roots with mint muzzle rings, and a mint engine
flame that pulses.

"A viewer expects a space dogfighter: it swoops low, banks, rattles off twin laser bolts and barrel-rolls back
into position."

Animation (ANIM_SPEC G8 fly, the odometer at 85 x 1.25 = 106.25 lu/s; the hover bob is code motion):
  idle      hovering on its engine: a small bob and roll, the flame pulses, the fin twitches, a blink
  walk      flight: nose down 8 degrees, the flame long and pulsing on a 2-frame beat, a gentle roll
  attack    DIVE BURST: dips its nose at the target (the held extreme), one twin laser flash, kicks back up
  attack_b  BARREL ROLL SHOT: rolls over (a full roll in the wind-up), comes level and fires, sliding back
  hit       flyer: a tilt and a 4 lu drop, a wobble back up
  die       D8 spiral down, sparks, the engine sputters out, a bounce, X eyes
"""
import math

from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_cosmic_wave as CW
from ageborn_art import kit_future as KF
from ageborn_art import kit_medieval as KM
from ageborn_art import face as FC
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as F
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "star_fighter"
GAIT_NAME = "fly"
NAME = "Star Fighter"
HEIGHT_LU = 46
YAW_DEG = -18.0
CANVAS = (300, 220)
FEET = (140, 176)
ANCHORS = {"head": (0, 44), "hitCenter": (0, 22), "muzzle": (30, 18)}
NO_RETIME = True

C = (0.0, 0.0, 22.0)
R = (22.0, 7.0, 6.0)
WING_Y = 16.0
GUN = (8.0, -8.0, 19.0)
MUZZLE = (GUN[0] + 16.0, GUN[1] - 1.0, GUN[2])


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hull", "body", C)
    cx, cy, cz = C
    # swept wings (team, star-white tips, the pale star on the near wing)
    for s, y in (("l", WING_Y), ("r", -WING_Y)):
        sg = 1 if s == "l" else -1
        g = Geo().slab([(cx + 6.0, cz), (cx - 10.0, cz + 1.0), (cx - 16.0, cz + 2.0), (cx - 6.0, cz + 1.0)], 0.0, 1.0)
        g = Geo().blob((cx - 4.0, y * 0.75, cz - 0.6), (10.0, 9.0, 1.4), p=2.4, rot=(0, 0, -22 * sg))
        rig.part("hull", g, team=True)
        g = Geo().blob((cx - 9.0, y * 1.25, cz - 0.6), (3.4, 2.4, 1.8), p=2.6, rot=(0, 0, -22 * sg))
        rig.part("hull", g, F.STAR, finish="gloss", outline_hex=F.STAR_TRIM)
    # the fuselage: star-white, a violet nose and belly, a team tail fin
    g = Geo().blob(C, R, p=2.3, taper=(1.25, 0.7))
    rig.part("hull", g, F.STAR, finish="gloss", outline_hex=F.STAR_TRIM)
    g = Geo().blob((cx + 15.0, cy, cz - 0.6), (8.0, 5.0, 4.2), p=2.4, taper=(0.7, 1.0))
    rig.part("hull", g, F.VIOLET, finish="gloss", outline_hex=F.VIOLET_DK)
    g = Geo().blob((cx, cy, cz - 3.4), (R[0] - 2.0, R[1] - 1.0, 2.4), p=2.6)
    rig.part("hull", g, F.VIOLET_DK, finish="gloss")
    g = Geo().blob((cx - 2.0, cy - 2.0, cz + 0.6), (15.0, 5.6, 2.0), p=2.6)              # team side stripe
    rig.part("hull", g, team=True, outline=0.5)
    rig.secondary("fin", "hull", (cx - 15.0, 0, cz + 4.0), (cx - 20.0, 0, cz + 13.0), max_deg=14, gain=1.0)
    g = Geo().slab([(cx - 9.0, cz + 4.0), (cx - 17.0, cz + 15.0), (cx - 22.0, cz + 16.0), (cx - 20.0, cz + 4.0)], 0.0, 2.2)
    rig.part("fin", g, team=True)
    g = Geo().star((cx - 17.0, -1.6, cz + 9.0), 2.2, 0.9, 0.8, points=5)
    rig.part("fin", g, KC.STAR_PALE, outline=0)
    # the canopy: a light glass bubble with a dark pilot silhouette and glyph eyes on it
    canopy = Geo().blob((cx + 3.0, cy, cz + 5.4), (7.0, 4.6, 4.4), p=2.2)
    rig.part("hull", canopy, "#CFC6EA", finish="gloss", outline_hex=F.STAR_TRIM)
    pilot = Geo().blob((cx + 3.4, cy - 3.6, cz + 6.0), (3.0, 1.2, 3.0), p=2.2)
    KF.visor_face(rig, "hull", [pilot], (cx + 5.0, cz + 6.4), eye_dx=(0.0, 2.6), eye_rx=1.2, eye_rz=1.6,
                  color=KC.VIO_EYE, core=F.VIOLET_CORE, yaw_deg=YAW_DEG)
    rig.part("hull", pilot, F.VOID, outline=0.4)
    # the engine and its flame
    g = Geo().lathe([(0, 0), (4.0, 0.2), (4.2, 3.0), (3.4, 4.0)], (cx - 19.0, cy, cz), (cx - 23.0, cy, cz), segs=16)
    rig.part("hull", g, F.VIOLET_DK, finish="gloss")
    for s in ("r", "l"):
        rig.joint(f"jet_{s}", "hull", (cx - 23.0, (-1.4 if s == "r" else 1.4), cz))
        y = -1.4 if s == "r" else 1.4
        g = Geo().lathe([(3.0, 0), (2.6, 4.0), (1.4, 8.0), (0, 11.0)], (cx - 23.0, y, cz), (cx - 24.0, y, cz), segs=12)
        rig.part(f"jet_{s}", g, glow=F.MINT, outline=1.0, outline_hex="#1C8A6A")
        g = Geo().lathe([(1.4, 0), (1.2, 3.0), (0, 5.4)], (cx - 23.2, y - 0.6, cz), (cx - 24.2, y - 0.6, cz), segs=10)
        rig.part(f"jet_{s}", g, glow=F.MINT_CORE, outline=0)
    # twin laser cannons at the near wing root
    gx, gy, gz = GUN
    rig.joint("gun", "hull", GUN)
    g = Geo().blob((gx + 1.0, gy, gz + 1.2), (4.0, 2.6, 2.2), p=2.8)
    rig.part("gun", g, F.VOID_LT)
    g = Geo().capsule((gx + 2.0, gy - 1.4, gz + 0.6), (MUZZLE[0] - 1.0, gy - 1.4, gz + 0.6), 1.0)
    g.capsule((gx + 2.0, gy + 1.4, gz + 2.0), (MUZZLE[0] - 1.0, gy + 1.4, gz + 2.0), 1.0)
    rig.part("gun", g, F.VIOLET, finish="gloss", outline_hex=F.VIOLET_DK)
    g = Geo().lathe([(0.8, 0), (2.2, 0.2), (2.2, 1.0), (1.0, 1.2)], (MUZZLE[0] - 1.6, gy - 1.4, gz + 0.6), (MUZZLE[0], gy - 1.4, gz + 0.6), segs=12)
    rig.part("gun", g, glow=F.MINT, outline=0.6, outline_hex=F.VOID)
    rig.joint("flash", "gun", MUZZLE, hidden=True)
    mx, my, mz = MUZZLE
    g = Geo().blob((mx + 5.0, my - 1, mz), (5.4, 1.2, 2.2), p=2.0)
    g.blob((mx + 5.0, my + 2.0, mz + 1.4), (4.6, 1.2, 1.8), p=2.0)
    rig.part("flash", g, glow=F.MINT, outline=0)
    g = Geo().blob((mx + 3.0, my - 2, mz), (3.0, 1.0, 1.2), p=2.0)
    rig.part("flash", g, glow=F.WHITE, outline=0)
    rig.track("muzzle", "gun", MUZZLE)
    F.sparks(rig, "hull", (cx + 2.0, -8.0, cz + 4.0), color=F.MINT, size=1.0, name="sparks", seed=4)
    rig.joint("odo", "root", (0, 0, 0))
    rig.track("_foot", "odo", (0.0, 0.0, 0.0))


TILT = {"hull": {"rx": -18.0}}


def jets(f, k=1.0, sweep=0.0):
    return {"jet_r": {"sz": [1.0, 0.82, 1.12, 0.9, 1.06, 0.86][f % 6] * k, "r": sweep},
            "jet_l": {"sz": [0.9, 1.1, 0.84, 1.05, 0.88, 1.12][f % 6] * k, "r": sweep}}


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    pose = merge(jets(f, 1.05), {"body": {"z": 1.8 * c}, "hull": {"r": 2.5 * lag, "rx": 3.0 * math.sin(2 * math.pi * f / 6)}})
    if f == 4:
        return merge(TILT, pose, KF.glyph("g_blink"))
    return merge(TILT, pose, KF.glyph("eyes"))


SPEED = 106.25
PULSE = [1.3, 0.85, 1.22, 0.9, 1.3, 0.85, 1.22, 0.9]


def _walk(f):
    p = 2 * math.pi * f / 8
    odo, _, _ = F.walker_cycle(f, 8, SPEED * 0.25, 0.0)
    return merge(TILT, {"jet_r": {"sz": 1.2 * PULSE[f], "r": 10.0}, "jet_l": {"sz": 1.2 * PULSE[(f + 1) % 8], "r": 10.0},
                  "odo": {"x": odo}, "body": {"z": 1.0 * math.sin(p)},
                  "hull": {"r": -8.0 + 1.5 * math.cos(p), "rx": 4.0 * math.sin(p)}}, KF.glyph("g_angry"))


# the sim fires every 0.5 s: a 500 ms clip, impact at 250 ms
ATTACK_MS = [50, 60, 90, 50, 80, 90, 80]
ATTACK_IMPACT = 4
#      tilt  dip   HOLD  aim2  FIRE  kick  settle
A_R = [-6, -16, -22, -22, -20, -4, -2]
A_X = [0.5, 1.0, 1.5, 1.5, 0.0, -2.5, -0.5]
A_Z = [0.0, -0.8, -1.4, -1.4, -1.0, 1.2, 0.2]
A_Q = [0.0, -0.03, -0.05, -0.05, 0.05, -0.04, 0.0]


def _a_pose(f):
    pose = merge(jets(f, [1, 1.1, 1.2, 1.2, 1.3, 1.15, 1.0][f]), {
        "body": dict(squash(A_Q[f]), x=A_X[f], z=A_Z[f]), "hull": {"r": A_R[f]}, "flash": {"show": f == 4}})
    return merge(TILT, pose, KF.glyph(["g_angry", "g_angry", "g_squint", "g_squint", "g_wide", "g_angry", "g_angry"][f]))


B_RX = [-60, -150, -250, -330, -360, -360, -360]
B_X = [0.0, -0.5, -1.0, -1.0, -3.0, -4.0, -1.0]


def _b_pose(f):
    pose = merge(jets(f, [1, 1.1, 1.2, 1.2, 1.3, 1.15, 1.0][f], sweep=-10.0), {
        "body": dict(squash(A_Q[f]), x=B_X[f], z=0.6 * f if f < 4 else 2.0 - 0.4 * (f - 4)),
        "hull": {"r": -4.0, "rx": B_RX[f] % 360}, "flash": {"show": f == 4}})
    return merge(TILT, pose, KF.glyph(["g_angry", "g_squint", "g_squint", "g_squint", "g_wide", "g_angry", "g_angry"][f]))


def _ov(seed):
    return {4: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 4.0, "r1_lu": 8.0, "n": 5, "a0": -60.0,
                 "arc": 120.0, "color": F.MINT_CORE}]}


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(jets(k), {
        "body": dict(squash([-0.08, 0.04, 0.0, -0.02, 0.0][k]), x=-4.0 * max(a, 0), z=-4.0 * max(a, 0) + 1.5 * min(a, 0)),
        "hull": {"r": 18 * a, "rx": [6, 12, -8, 4, 0][k]}, "sparks": {"show": k == 0}})
    return merge(TILT, pose, KF.glyph("g_hurt" if k <= 1 else ("g_angry" if k == 2 else "eyes")))


D8 = [dict(x=-2, z=0, r=-10, rx=0, q=-0.06), dict(x=-3, z=-3, r=-24, rx=18, q=0.04),
      dict(x=-2, z=-6, r=-38, rx=-14, q=0.02), dict(x=0, z=-10, r=-52, rx=20, q=0.0),
      dict(x=2, z=-13, r=-64, rx=-6, q=-0.18), dict(x=3, z=-11, r=-58, rx=0, q=0.08),
      dict(x=4, z=-13, r=-62, rx=0, q=-0.06), dict(x=4, z=-13, r=-62, rx=0, q=-0.04),
      dict(x=4, z=-13, r=-62, rx=0, q=-0.06, s=0.96), dict(x=4, z=-13, r=-62, rx=0, q=-0.1, s=0.9)]


def _die(k):
    d = D8[k]
    pose = merge(M.body_about((0, 0, 22), x=d["x"], z=d["z"], r=d["r"], rx=d["rx"], q=d["q"], s=d.get("s", 1.0)), {
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
    return M.check_variants(M.check_contract(cl, attack_ms=500, attack_impact_at=0.5))
