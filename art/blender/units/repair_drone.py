"""Repair Drone: Future Age air support (DESIGN A5.6). Heal beam (fx.heal_beam) to the two
lowest-HP allies; air mech, small. Flyer rig (A11): body, rotors/jets.

Look (A11, Future palette): a friendly round hover drone. A glossy white orb with a team
upper dome, a big dark visor ring with one mint "eye" lens, a mint heal plus on the near side,
two team thruster pods with mint jet flames that pulse, a whip antenna with a magenta tip
(follow-through), and a small two-segment manipulator arm under the belly ending in a white
emitter nozzle with a mint core. Flyers are authored with the origin at their lowest point
(the jet tips); the battle view lifts air units to their flight altitude.

Idle is a hover (bob, a gentle pitch, jets pulsing); walk is forward flight (nose down, jets
swept back); attack reaches the arm forward, charges the emitter and holds a bright mint
flare while the eye widens (the game draws the beam from the per-frame `beam` anchor); hit
wobbles; the death sparks, pitches nose-down and hands off to the shared poof.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_future as F
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "repair_drone"
NAME = "Repair Drone"
HEIGHT_LU = 54
YAW_DEG = -18.0
CANVAS = (236, 196)
FEET = (104, 178)
ANCHORS = {"head": (0, 52), "hitCenter": (0, 28)}

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
    rig.joint("eyes", "orb", (cx + 14.5, -4.6, cz - 0.5))
    g = Geo().lathe([(0, 0), (4.4, 0.1), (4.2, 1.0), (0, 1.4)], (cx + 14.2, -4.5, cz - 0.5),
                    (cx + 15.6, -5.0, cz - 0.5), segs=20)
    rig.part("eyes", g, glow=F.MINT, outline=0)
    g = Geo().blob((cx + 15.6, -6.8, cz + 1.6), (0.6, 1.3, 1.3), p=2.2)
    rig.part("eyes", g, glow=F.WHITE, outline=0)
    rig.joint("eyes_x", "orb", (cx + 14.5, -4.6, cz - 0.5), hidden=True)
    g = Geo()
    g.capsule((cx + 15.4, -7.6, cz + 2.6), (cx + 15.4, -1.6, cz - 3.4), 0.9)
    g.capsule((cx + 15.4, -7.6, cz - 3.4), (cx + 15.4, -1.6, cz + 2.6), 0.9)
    rig.part("eyes_x", g, glow=F.MINT, outline=0)
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
    rig.track("_foot", "body", (0.0, 0.0, 0.0))


# -- poses ---------------------------------------------------------------------------------
REST = {"arm": {"r": 30}, "fore": {"r": 40}, "tool": {"r": 20}}   # tool tucked forward


def jets(f, k=1.0, sweep=0.0):
    s = [1.0, 0.82, 1.12, 0.9][f % 4] * k
    return {"jet_r": {"sz": s, "r": sweep}, "jet_l": {"sz": [0.9, 1.1, 0.84, 1.05][f % 4] * k, "r": sweep}}


def _idle(f):
    c, lag = F.idle_wave(f)
    return merge(REST, jets(f), {
        "body": {"z": 2.2 * c},
        "orb": {"r": 3.0 * lag},
        "arm": {"r": -6.0 * lag}, "fore": {"r": -5.0 * lag},
    })


def _walk(f):
    p = 2 * math.pi * f / 8
    return merge(REST, jets(f, 1.25, 22.0), {
        "body": {"z": 1.6 * math.sin(p)},
        "orb": {"r": -12.0 + 2.0 * math.cos(p)},
        "arm": {"r": 10 + 4 * math.sin(p - 0.8)}, "fore": {"r": 6 + 4 * math.sin(p - 1.2)},
    })


ATTACK_MS = [83, 83, 125, 167, 125, 83, 83, 83]
ATTACK_IMPACT = 3


def _attack(f):
    # 0 lean in, 1 reach the arm forward, 2 charge (held), 3 FLARE (beam starts, eye wide,
    # squash back), 4 hold the flare smaller, 5-7 retract
    pose = merge(jets(f, pick(f, [1, 1.1, 1.1, 1.3, 1.2, 1.05, 1, 1])), {
        "body": dict(squash(pick(f, [0, -0.04, -0.06, 0.08, 0.02, -0.03, 0, 0])),
                     z=pick(f, [0, 0.5, 0.5, 1.5, 1.0, 0.5, 0, 0]),
                     x=pick(f, [0, 0.5, 0.5, -2.0, -1.0, -0.5, 0, 0])),
        "orb": {"r": pick(f, [-4, -8, -9, -2, -4, -6, -3, 0])},
        "arm": {"r": pick(f, [45, 70, 75, 80, 78, 60, 40, 30])},
        "fore": {"r": pick(f, [40, 25, 18, 10, 12, 25, 36, 40])},
        "tool": {"r": pick(f, [20, 10, 6, 0, 2, 10, 18, 20])},
        "charge": {"show": f in (1, 2), "s": pick(f, [0, 0.6, 1.1, 0, 0, 0, 0, 0])},
        "flare": {"show": f in (3, 4), "s": pick(f, [1, 1, 1, 1.15, 0.8, 1, 1, 1])},
        "eyes": {"s": pick(f, [1, 1, 1.1, 1.25, 1.15, 1, 1, 1])},
    })
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(REST, jets(f), {
        "body": dict(squash(-0.1 * a), x=-4.0 * a, z=-1.5 * a),
        "orb": {"r": 16 * a, "rx": 8 * a},
        "arm": {"r": 20 * a}, "fore": {"r": 14 * a},
    })


def _die(f):
    pose = merge(REST, fx.die_pose(f), {
        "orb": {"r": pick(f, [-24, -36, -40])},
        "arm": {"r": pick(f, [60, 80, 80])}, "fore": {"r": pick(f, [-20, -30, -30])},
        "jet_r": {"s": pick(f, [0.5, 0.01, 0.01])}, "jet_l": {"s": pick(f, [0.5, 0.01, 0.01])},
        "sparks": {"show": f == 0},
    })
    if f in (0, 1):
        pose.update({"eyes": {"hide": True}, "eyes_x": {"show": True}})
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
