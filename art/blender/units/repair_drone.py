"""Repair Drone: Future Age air support (DESIGN A5.6). Heal beam (fx.heal_beam) to the two
lowest-HP allies; air mech, small. Flyer rig (A11): body, rotors/jets.

Look (A11, Future palette): a friendly round hover drone. A glossy white orb with a team
upper dome, a big dark visor ring with one mint "eye" lens, a mint heal plus on the near side,
two team thruster pods with mint jet flames that pulse, a whip antenna with a magenta tip
(follow-through), and a small two-segment manipulator arm under the belly ending in a white
emitter nozzle with a mint core. Flyers are authored with the origin at their lowest point
(the jet tips); the battle view lifts air units to their flight altitude.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`): the one big lens eye acts
(wide on the charge, ^ happy while healing, > < when hit, X on death).
  idle    a hover: bob and a gentle roll, the jets pulse, the antenna bobbles, a blink
  walk    forward flight: nose down, the jets swept back
  attack  WRENCH SPIN AND BEAM: tilts in, reaches the arm out and spins its little wrench (a ring
          smear), charges the emitter (a growing ball, the eye wide, the held extreme), then the
          mint flare (the game draws the heal beam from the per-frame `beam` anchor) with a
          happy eye, retracts and wobbles
  hit     flyer: a tilt and a 4 lu drop, a wobble back up
  die     D8 spiral down: sparks, nose-down wobble, the jets sputter out, a crash bounce, X eye
"""
import math

from ageborn_art import kit_future as KF
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "repair_drone"
NAME = "Repair Drone"
HEIGHT_LU = 54
YAW_DEG = -18.0
CANVAS = (240, 224)
FEET = (104, 178)
ANCHORS = {"head": (0, 52), "hitCenter": (0, 28), "muzzle": (18, 15)}
NO_RETIME = True

C = (0.0, 0.0, 30.0)                 # orb centre
R = (14.5, 13.5, 13.0)
POD_Y = 15.0
SHOULDER = (3.0, -3.0, 18.0)
ELBOW = (3.0, -3.0, 10.0)
WRIST = (3.0, -3.0, 3.0)
BEAM = (WRIST[0], WRIST[1] - 1.0, WRIST[2] - 7.0)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("orb", "body", C)
    cx, cy, cz = C

    # thruster pods (far one first) with pulsing jet flames
    for s, y in (("l", POD_Y), ("r", -POD_Y)):
        rig.joint(f"pod_{s}", "orb", (cx - 2.0, y, cz - 4.0))
        g = Geo().capsule((cx - 2.0, y * 0.6, cz - 2.0), (cx - 2.0, y, cz - 4.0), 2.4)
        rig.part(f"pod_{s}", g, F.SUIT, outline=0.8)
        g = Geo().lathe([(0, 5.0), (4.2, 4.6), (5.2, 1.0), (4.6, -3.2), (3.4, -4.4), (0, -4.6)],
                        (cx - 2.0, y, cz - 4.0), (cx - 2.0, y, cz - 3.0), segs=20)
        rig.part(f"pod_{s}", g, team=True)
        g = Geo().lathe([(3.6, 0), (3.8, 1.2), (2.4, 1.6)], (cx - 2.0, y, cz - 9.2), (cx - 2.0, y, cz - 8.0), segs=18)
        rig.part(f"pod_{s}", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
        rig.joint(f"jet_{s}", f"pod_{s}", (cx - 2.0, y, cz - 9.0))
        g = Geo().lathe([(2.8, 0), (2.6, 3.0), (1.6, 7.0), (0, 10.0)], (cx - 2.0, y, cz - 9.0),
                        (cx - 2.0, y, cz - 10.0), segs=14)
        rig.part(f"jet_{s}", g, glow=F.MINT, outline=1.0, outline_hex=F.MINT)
        g = Geo().lathe([(1.4, 0), (1.2, 2.5), (0, 5.0)], (cx - 2.0, y - 0.8, cz - 9.2),
                        (cx - 2.0, y - 0.8, cz - 10.2), segs=12)
        rig.part(f"jet_{s}", g, glow=F.MINT_CORE, outline=0)

    # antenna (behind), follow-through
    rig.secondary("antenna", "orb", (-6.0, 4.0, cz + 11.0), (-11.0, 5.0, cz + 26.0), max_deg=20, gain=1.3)
    g = Geo().capsule((-6.0, 4.0, cz + 11.0), (-10.6, 5.0, cz + 24.5), 0.9)
    rig.part("antenna", g, F.SUIT, outline=0.8)
    g = Geo().sphere((-11.0, 5.0, cz + 25.5), 1.7, cuts=3)
    rig.part("antenna", g, glow=F.MAGENTA, outline=1.0, outline_hex=F.MAGENTA)

    # the orb: white shell, team dome, charcoal belly ring
    g = Geo().blob(C, R, p=2.2)
    rig.part("orb", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((cx, cy, cz + 0.4), (R[0] + 0.5, R[1] + 0.5, R[2] + 0.5), p=2.2)
    g.clip((0, 0, cz + 5.0), (0, 0, -1))
    g.clip((cx + 7.0, 0, cz + 3.0), (1, 0, -0.9))     # leave the brow white over the eye
    rig.part("orb", g, team=True)
    g = Geo().lathe([(R[0] - 1.0, -1.5), (R[0] + 0.8, -0.8), (R[0] + 0.8, 0.8), (R[0] - 1.0, 1.5)],
                    (cx, cy, cz - 6.0), (cx, cy, cz - 5.0), segs=28, squash=(1.0, R[1] / R[0]))
    rig.part("orb", g, F.SUIT, finish="gloss")
    # visor ring with a big mint eye lens
    g = Geo().lathe([(0, 0), (7.4, 0.2), (7.8, 2.6), (6.6, 3.4), (0, 3.4)], (cx + 11.0, -3.5, cz - 0.5),
                    (cx + 14.5, -4.6, cz - 0.5), segs=22)
    rig.part("orb", g, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    lens = Geo().lathe([(0, 0), (6.6, 0.1), (6.6, 1.2), (0, 1.6)], (cx + 13.6, -4.3, cz - 0.5),
                       (cx + 15.2, -4.9, cz - 0.5), segs=24)
    KF.visor_face(rig, "orb", [lens], (cx + 12.6, cz - 0.3), eye_dx=(0.0,), eye_rx=2.6, eye_rz=3.4,
                  yaw_deg=YAW_DEG)
    rig.part("orb", lens, F.VISOR_DARK, finish="gloss", outline=0)
    # panel lines and a team toolbox under the belly
    KF.rivets(rig, "orb", [(cx - 10.0 + 4.0 * i, -12.4 + 0.6 * abs(i - 1.5), cz + 3.0) for i in range(4)], r=0.8)
    g = Geo().blob((cx - 2.0, 0, cz - 12.4), (6.4, 6.0, 3.0), p=3.4)
    rig.part("orb", g, team=True, outline=0.7)
    g = Geo().blob((cx - 2.0, -6.0, cz - 12.2), (2.4, 0.6, 1.0), p=3.0)
    rig.part("orb", g, F.TRIM, finish="metal", outline=0)
    # a mint heal plus on the near side
    g = Geo().blob((cx - 1.0, -R[1] + 1.2, cz + 12.2), (1.3, 3.8, 0.8), p=3.4)
    g.blob((cx - 1.0, -R[1] + 1.2, cz + 12.2), (3.8, 1.3, 0.8), p=3.4)
    rig.part("orb", g, glow=F.MINT, outline=0.8, outline_hex=F.SUIT)

    # manipulator arm under the belly, emitter nozzle at the wrist
    rig.joint("arm", "orb", SHOULDER)
    rig.joint("fore", "arm", ELBOW)
    rig.joint("tool", "fore", WRIST)
    g = Geo().sphere(SHOULDER, 2.8, cuts=3)
    g.capsule(SHOULDER, ELBOW, 1.6)
    rig.part("arm", g, F.GUNMETAL, finish="metal", outline=0.8)
    g = Geo().sphere(ELBOW, 2.2, cuts=3)
    g.capsule(ELBOW, WRIST, 1.5)
    rig.part("fore", g, F.GUNMETAL, finish="metal", outline=0.8)
    wx, wy, wz = WRIST
    g = Geo().lathe([(2.6, 1.0), (3.0, -1.0), (3.8, -4.0), (4.2, -6.0), (2.8, -6.6)], (wx, wy, wz),
                    (wx, wy, wz - 1.0), segs=16)
    rig.part("tool", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().sphere((wx, wy - 0.8, wz - 6.2), 2.0, cuts=3)
    rig.part("tool", g, glow=F.MINT, outline=0)
    rig.track("beam", "tool", BEAM)
    # a little spinning wrench beside the nozzle
    rig.joint("wrench", "tool", (wx + 3.6, wy - 1.8, wz - 3.0))
    g = Geo().capsule((wx + 3.6, wy - 1.8, wz - 3.0), (wx + 9.6, wy - 1.8, wz - 3.0), 0.9)
    g.blob((wx + 10.6, wy - 1.8, wz - 1.8), (1.6, 1.0, 1.1), p=2.6)
    g.blob((wx + 10.6, wy - 1.8, wz - 4.2), (1.6, 1.0, 1.1), p=2.6)
    rig.part("wrench", g, F.TRIM, finish="metal", outline=0.6)
    # emitter charge and flare
    rig.joint("charge", "tool", BEAM, hidden=True)
    g = Geo().sphere((BEAM[0], BEAM[1] - 1.0, BEAM[2]), 3.2, cuts=4)
    rig.part("charge", g, glow=F.MINT_CORE, outline=1.4, outline_hex=F.MINT)
    rig.joint("flare", "tool", BEAM, hidden=True)
    g = Geo()
    for a in range(0, 360, 45):
        r0, r1 = 3.4, (9.0 if a % 90 == 0 else 6.0)
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.capsule((BEAM[0] + r0 * ca, BEAM[1] - 2.0, BEAM[2] + r0 * sa),
                  (BEAM[0] + r1 * ca, BEAM[1] - 2.0, BEAM[2] + r1 * sa), 1.1, 0.4, segs=8, rings=2)
    rig.part("flare", g, glow=F.MINT, outline=0)
    g = Geo().sphere((BEAM[0], BEAM[1] - 2.4, BEAM[2]), 3.6, cuts=4)
    rig.part("flare", g, glow=F.WHITE, outline=0)
    F.sparks(rig, "orb", (cx + 4.0, -8.0, cz + 6.0), color=F.MINT, size=1.3, name="sparks", seed=3)
    # a virtual ground contact that slides back at flight speed, so the walk clip exports a
    # natural speed (70 lu/s, the sim speed) like the walkers do
    rig.joint("odo", "root", (0, 0, 0))
    rig.track("_foot", "odo", (0.0, 0.0, 0.0))


# -- poses -----------------------------------------------------------------------------------
REST = {"arm": {"r": 30}, "fore": {"r": 40}, "tool": {"r": 20}}   # tool tucked forward


def jets(f, k=1.0, sweep=0.0):
    s = [1.0, 0.82, 1.12, 0.9, 1.06, 0.86][f % 6] * k
    return {"jet_r": {"sz": s, "r": sweep}, "jet_l": {"sz": [0.9, 1.1, 0.84, 1.05, 0.88, 1.12][f % 6] * k, "r": sweep}}


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    pose = merge(REST, jets(f), {
        "body": {"z": 2.4 * c},
        "orb": {"r": 3.0 * lag, "rx": 2.0 * math.sin(2 * math.pi * f / 6)},
        "arm": {"r": -6.0 * lag}, "fore": {"r": -5.0 * lag}, "wrench": {"r": 10.0 * lag},
    })
    if f == 4:
        pose = merge(pose, KF.glyph("g_blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    odo, _, _ = F.walker_cycle(f, 8, 17.5, 0.0)
    return merge(REST, jets(f, 1.25, 22.0), {
        "odo": {"x": odo},
        "body": {"z": 1.8 * math.sin(p)},
        "orb": {"r": -12.0 + 2.0 * math.cos(p), "rx": 3.0 * math.sin(p)},
        "arm": {"r": 10 + 4 * math.sin(p - 0.8)}, "fore": {"r": 6 + 4 * math.sin(p - 1.2)},
        "wrench": {"r": 8 * math.sin(p - 1.6)},
    })


# attack: 832 ms, the beam starts at 291 ms (impactAt 0.3498, as shipped)
ATTACK_MS = [50, 60, 60, 121, 140, 100, 90, 110, 101]
ATTACK_IMPACT = 4
#        tilt  reach spin  HOLD  FLARE hold  retract wobble settle
ORB_R = [-6, -10, -12, -14, -2, -5, -8, 3, 0]
ARM = [45, 72, 78, 80, 84, 80, 60, 40, 30]
FORE = [38, 22, 14, 10, 6, 8, 25, 36, 40]
TOOL = [18, 8, 4, 2, 0, 2, 10, 18, 20]
WR = [0, 60, 200, 320, 360, 360, 360, 370, 360]
BZ = [0.5, 1.0, 1.2, 0.8, 2.4, 1.6, 0.6, -0.8, 0.0]
BX = [0.5, 1.5, 2.0, 2.5, -2.5, -1.5, -0.5, 0.4, 0.0]
BQ = [0.0, -0.04, -0.05, -0.08, 0.10, 0.03, 0.0, -0.03, 0.0]
EYES = ["eyes", "eyes", "g_wide", "g_wide", "g_happy", "g_happy", "eyes", "g_blink", "eyes"]


def _attack_pose(f):
    pose = merge(jets(f, [1, 1.1, 1.15, 1.25, 1.35, 1.2, 1.05, 1.0, 1.0][f]), {
        "body": dict(squash(BQ[f]), z=BZ[f], x=BX[f]),
        "orb": {"r": ORB_R[f]},
        "arm": {"r": ARM[f]}, "fore": {"r": FORE[f]}, "tool": {"r": TOOL[f]},
        "wrench": {"r": WR[f]},
        "charge": {"show": f in (2, 3), "s": [0, 0, 0.6, 1.2, 0, 0, 0, 0, 0][f] or 0.01},
        "flare": {"show": f in (4, 5), "s": 1.2 if f == 4 else 0.85},
    })
    return merge(pose, KF.glyph(EYES[f]))


def _attack_clip():
    spin = {"kind": "arc", "joint": "wrench", "inner": (3.0 + 3.6 + 2.0, -3.0 - 1.8, 3.0 - 3.0),
            "outer": (3.0 + 10.6, -3.0 - 1.8, 3.0 - 3.0), "color": F.TRIM, "white": 0.35, "taper": 0.2,
            "band": 0.45, "lines": 1}
    ov = {
        2: [dict(spin, **{"from": 1})],
        3: [dict(spin, **{"from": 2}),
            {"kind": "rings", "joint": "tool", "point": BEAM, "radii_lu": (5.5, 8.5), "a0": -150.0, "a1": 150.0,
             "color": F.MINT_CORE}],
        4: [{"kind": "burst", "joint": "tool", "point": BEAM, "r0_lu": 7.0, "r1_lu": 12.0, "n": 8,
             "a0": 0.0, "arc": 360.0, "color": F.MINT_CORE}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov)


def _hit(k):
    # flyer: a tilt and a drop of 4 lu, then a wobble back up
    a = M.HIT_AMT[k]
    pose = merge(REST, jets(k), {
        "body": dict(squash([-0.08, 0.04, 0.0, -0.02, 0.0][k]), x=-4.0 * max(a, 0), z=-4.0 * max(a, 0) + 1.5 * min(a, 0)),
        "orb": {"r": 18 * a, "rx": [6, 12, -8, 4, 0][k]},
        "arm": {"r": 22 * a}, "fore": {"r": 16 * a},
        "sparks": {"show": k == 0},
    })
    return merge(pose, KF.glyph("g_hurt" if k <= 1 else ("g_wide" if k == 2 else "eyes")))


# D8 spiral down (no full turn, the crown would face the camera): sparks, nose-down wobble, the
# jets sputter out, a crash bounce, lying tilted with X eyes
D8 = [dict(x=-2, z=0, r=-10, rx=0, q=-0.06), dict(x=-3, z=-3, r=-24, rx=18, q=0.04),
      dict(x=-2, z=-8, r=-38, rx=-14, q=0.02), dict(x=0, z=-14, r=-52, rx=20, q=0.0),
      dict(x=2, z=-19, r=-64, rx=-6, q=-0.18), dict(x=3, z=-16, r=-58, rx=0, q=0.08),
      dict(x=4, z=-19, r=-62, rx=0, q=-0.06), dict(x=4, z=-19, r=-62, rx=0, q=-0.04),
      dict(x=4, z=-19, r=-62, rx=0, q=-0.06, s=0.96), dict(x=4, z=-19, r=-62, rx=0, q=-0.1, s=0.9)]


def _die(k):
    d = D8[k]
    pose = merge(REST, M.body_about((0, 0, 30), x=d["x"], z=d["z"], r=d["r"], rx=d["rx"], q=d["q"],
                                    s=d.get("s", 1.0)), {
        "arm": {"r": [50, 70, 40, 80, 60, 60, 55, 55, 55, 55][k]}, "fore": {"r": [-20, -40, 10, -30, -10, -20, -15, -15, -15, -15][k]},
        "jet_r": {"s": [0.6, 0.3, 0.5, 0.15, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01][k]},
        "jet_l": {"s": [0.5, 0.4, 0.2, 0.25, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01][k]},
        "sparks": {"show": k in (0, 2, 4)},
        "antenna": {"r": [10, -20, 25, -15, 30, -10, 5, 0, 0, 0][k]},
    })
    g = ["g_hurt", "g_wide", "g_spiral", "g_spiral", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x"][k]
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
    return M.check_contract(cl, attack_ms=832, attack_impact_at=0.3498)
