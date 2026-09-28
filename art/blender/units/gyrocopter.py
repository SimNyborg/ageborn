"""Gyrocopter: Modern Age air gunship (DESIGN A5.5). Bullet (proj.bullet), 150 lu, air mech.

Look (A11 flyer rig, Modern palette): a round, bubbly autogyro. A team-painted egg-shaped
pod with an olive belly and nose cone, an open cockpit with a windscreen and a goggled
pilot in a leather cap whose signal red-violet scarf streams behind him (follow-through),
twin gunmetal machine guns under the chin, a thin tail boom with a team fin, khaki skids,
and a two-blade rotor on a mast whose blades strobe round in four phase steps over a
faint motion disc. Flyers are authored with the origin at their lowest point (the skids);
the battle view lifts air units to their flight altitude.

Idle is a hover (bob and a gentle pitch, rotor spinning), walk is forward flight (nose
down, rotor tilted into the wind), attack is a short burst sized to the 0.3 s interval
(nose dips, both guns flash, recoil), and the death spins it nose-down with smoke. The
bullets spawn at the per-frame `muzzle` anchor.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_modern as M
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "gyrocopter"
NAME = "Gyrocopter"
HEIGHT_LU = 66
YAW_DEG = -10.0
CANVAS = (336, 300)
FEET = (166, 244)
ANCHORS = {"head": (0, 62), "hitCenter": (0, 26)}

POD = (2.0, 0.0, 24.0)
MAST = (-4.0, 0.0, 60.0)
ROTOR_R = 44.0
PHASES = 4                  # 2 blades: 180 degrees of symmetry in 4 steps of 45
MUZZLE = (33.0, -3.0, 11.0)
SCARF = "#B0306A"


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("pod", "body", POD)
    px, py, pz = POD
    # tail boom and fin (behind the pod)
    g = Geo().capsule((-14.0, 0, pz + 2.0), (-44.0, 0, pz + 6.0), 3.0, 1.8)
    rig.part("pod", g, M.OLIVE)
    g = Geo().slab([(-38, pz + 4), (-47, pz + 6), (-51, pz + 21), (-45, pz + 22), (-40, pz + 10)], 0.0, 2.2)
    rig.part("pod", g, team=True, outline=0.8)
    g = Geo().blob((-45.0, 0, pz + 6.0), (5.0, 9.0, 1.2), p=2.6)   # tailplane
    rig.part("pod", g, M.OLIVE_LT, outline=0.7)
    # skids
    g = Geo()
    for y in (-7.5, 7.5):
        g.capsule((-12.0, y, 1.6), (15.0, y, 1.6), 1.5)
        g.capsule((15.0, y, 1.6), (19.0, y, 4.0), 1.4)
        g.capsule((-6.0, y * 0.8, 2.0), (-3.0, y * 0.6, 12.0), 1.2)
        g.capsule((8.0, y * 0.8, 2.0), (6.0, y * 0.6, 12.0), 1.2)
    rig.part("pod", g, M.KHAKI, outline=0.8)
    # the pod: team egg with an olive belly and nose cone
    g = Geo().blob((px, 0, pz), (20.0, 13.0, 13.5), p=2.2, taper=(0.9, 1.0))
    g.clip((0, 0, pz - 6.0), (0, 0, -1))
    rig.part("pod", g, team=True)
    g = Geo().blob((px, 0, pz), (20.0, 13.0, 13.5), p=2.2, taper=(0.9, 1.0))
    g.clip((0, 0, pz - 6.0), (0, 0, 1))
    g.lathe([(0, 0), (7.4, 0.5), (8.0, 3.0), (6.0, 6.5), (0, 8.4)], (px + 17.0, 0, pz - 1.0),
            (px + 27.0, 0, pz - 1.0), segs=18)   # nose cone
    rig.part("pod", g, M.OLIVE)
    g = Geo().lathe([(8.2, -0.8), (8.4, 0), (8.2, 0.8)], (px + 17.0, 0, pz - 1.0), (px + 18.0, 0, pz - 1.0), segs=18)
    rig.part("pod", g, M.SIGNAL, outline=0.5)
    g = Geo().blob((px + 2.0, 0, pz + 11.8), (10.0, 9.0, 1.6), p=2.6)   # cockpit rim
    rig.part("pod", g, M.LEATHER, outline=0.6)
    g = Geo().blob((px + 11.0, 0, pz + 14.5), (1.4, 8.0, 4.4), p=3.0, rot=(0, 24, 0))   # windscreen
    rig.part("pod", g, M.GLASS, finish="gloss", outline=0.6, outline_hex="#6F8A94")
    # twin machine guns under the chin
    g = Geo()
    for y in (-3.0, 3.0):
        g.capsule((px + 14.0, y, 11.0), (MUZZLE[0] - 1.0, y, 11.0), 1.3)
        g.blob((MUZZLE[0] - 1.5, y, 11.0), (2.0, 1.6, 1.6), p=2.4)
    g.blob((px + 13.0, 0, 11.5), (4.4, 5.4, 2.6), p=2.6)
    rig.part("pod", g, M.GUNMETAL, finish="metal", outline=0.7)
    rig.track("muzzle", "pod", MUZZLE)
    M.muzzle_flash(rig, "pod", (MUZZLE[0] + 1.0, -3.0, 11.0), size=1.2, name="flash")
    M.muzzle_flash(rig, "pod", (MUZZLE[0] + 1.0, 3.0, 11.0), size=0.9, name="flash2")

    # pilot: leather cap with goggles, big grin, red-violet scarf streaming back
    rig.joint("pilot", "pod", (px, 0, pz + 14.0))
    cx, cz = px, pz + 14.0
    g = Geo().blob((cx, 0, cz + 1.5), (6.0, 6.6, 4.0), p=2.4)   # shoulders
    rig.part("pilot", g, M.LEATHER)
    g = Geo().blob((cx + 1.0, 0, cz + 10.5), (7.6, 7.2, 7.4), p=2.3)
    g.blob((cx + 8.6, -0.5, cz + 9.2), (2.4, 2.1, 2.2), p=2.0)
    rig.part("pilot", g, M.SKIN)
    g = Geo().blob((cx - 0.4, 0, cz + 14.0), (8.4, 8.0, 5.8), p=2.3)
    g.clip((cx, 0, cz + 10.8), (0, 0, -1))
    g.blob((cx - 1.0, -7.4, cz + 10.0), (3.0, 1.4, 4.0), p=2.3)
    rig.part("pilot", g, M.LEATHER)
    g = Geo()
    for y in (-3.4, 3.0):
        g.lathe([(0, 0), (2.4, 0.2), (2.5, 1.6), (0, 1.8)], (cx + 6.4, y, cz + 13.4), (cx + 8.4, y, cz + 13.8), segs=12)
    rig.part("pilot", g, M.GUNMETAL, finish="metal", outline=0.5)
    g = Geo()
    for y in (-3.4, 3.0):
        g.blob((cx + 8.3, y, cz + 13.7), (0.6, 1.8, 1.8), p=2.2)
    rig.part("pilot", g, M.GLASS, finish="gloss", outline=0)
    g = Geo().blob((cx + 7.8, -0.8, cz + 7.0), (1.4, 3.2, 1.4), p=2.4, rot=(-8, 0, 0))
    rig.part("pilot", g, M.MOUTH, outline=0, highlight=False)
    g = Geo().blob((cx + 8.8, -0.8, cz + 7.6), (0.6, 2.6, 0.6), p=3.0)
    rig.part("pilot", g, M.TOOTH, outline=0, highlight=False)
    g = Geo().blob((cx + 1.0, 0, cz + 4.4), (6.0, 7.0, 2.2), p=2.4)   # scarf knot
    rig.part("pilot", g, SCARF)
    rig.secondary("scarf", "pilot", (cx - 4.0, -2.0, cz + 4.6), (cx - 18.0, -2.0, cz + 6.0), max_deg=22, gain=1.4)
    g = Geo().blob((cx - 11.0, -2.0, cz + 5.0), (7.5, 1.4, 2.0), p=2.4, taper=(1.0, 0.8), rot=(0, -6, 0))
    g.blob((cx - 18.0, -2.0, cz + 5.8), (2.6, 1.3, 2.6), p=2.2)
    rig.part("scarf", g, SCARF, outline=0.7)

    # rotor mast, hub, blades (phase copies) and a faint motion disc
    g = Geo().capsule((px - 5.0, 0, pz + 10.0), (MAST[0], 0, MAST[2]), 1.8, 1.5)
    g.capsule((px - 12.0, 0, pz + 8.0), (MAST[0], 0, MAST[2] - 2.0), 1.1)
    rig.part("pod", g, M.GUNMETAL, finish="metal", outline=0.7)
    rig.joint("rotor", "pod", MAST)
    mx, my, mz = MAST
    g = Geo().blob((mx, 0, mz + 1.0), (3.4, 3.4, 2.2), p=2.4)
    rig.part("rotor", g, M.GUNMETAL, finish="metal", outline=0.7)
    for k in range(PHASES):
        name = f"blade{k}"
        rig.joint(name, "rotor", MAST, hidden=True)
        ang = 180.0 * k / PHASES
        g = Geo()
        for sgn in (1, -1):
            a = math.radians(ang)
            tip = (mx + sgn * ROTOR_R * math.cos(a), sgn * ROTOR_R * math.sin(a), mz + 2.0)
            g.blob(((mx + tip[0]) / 2, tip[1] / 2, mz + 2.0), (ROTOR_R / 2, 3.2, 0.9), p=2.6,
                   rot=(0, 0, ang))
        rig.part(name, g, M.KHAKI, outline=0.7)
        g = Geo()
        for sgn in (1, -1):
            a = math.radians(ang)
            g.blob((mx + sgn * (ROTOR_R - 3.0) * math.cos(a), sgn * (ROTOR_R - 3.0) * math.sin(a), mz + 2.1),
                   (3.0, 2.7, 0.8), p=2.6, rot=(0, 0, ang))
        rig.part(name, g, M.SIGNAL, outline=0.5)

    rig.joint("smoke", "pod", (px - 8.0, -6.0, pz + 8.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 6.0), (-8, 3, 5.0), (-4, 9, 4.6), (5, 6, 4.2), (-14, 1, 4.0)):
        g.sphere((px - 8.0 + dx, -6.0, pz + 8.0 + dz), r, cuts=4)
    rig.part("smoke", g, M.SMOKE_DK, finish="dust", outline=0.8)
    rig.track("_foot", "odo", (0, 0, 0))


# -- poses ---------------------------------------------------------------------------------
def _rotor(step):
    return {f"blade{step % PHASES}": {"show": True}}


def _idle(f):
    b = math.sin(2 * math.pi * f / 4)
    return merge(_rotor(f), {
        "body": {"z": 1.6 * b},
        "pod": {"r": 1.5 * math.cos(2 * math.pi * f / 4)},
        "pilot": {"r": -2.0 * b},
    })


def _walk(f):
    p = 2 * math.pi * f / 8
    return merge(_rotor(f), {
        "odo": {"x": 10.0 * math.cos(p)},     # stride 40 lu per 0.5 s = 80 lu/s (sim speed)
        "body": {"z": 1.8 * math.sin(p)},
        "pod": {"r": -9.0 + 1.5 * math.sin(p + 1.0)},
        "rotor": {"r": -6.0},
        "pilot": {"r": 3.0},
    })


ATTACK_MS = [60, 50, 60, 80]
ATTACK_IMPACT = 1


def _attack(f):
    # 0 nose dips onto the target, 1 FIRE (both guns), 2 recoil (second flash), 3 settle
    pose = merge(_rotor(f), {
        "pod": {"r": pick(f, [-8, -10, -5, -6]), "x": pick(f, [0.5, 0, -2.0, -1.0])},
        "body": squash(pick(f, [-0.02, 0.03, -0.04, 0])),
        "pilot": {"r": pick(f, [-4, -5, 3, 0])},
        "flash": {"show": f == 1},
        "flash2": {"show": f == 2},
    })
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(_rotor(f), {"body": dict(squash(-0.06 * a), x=-4.0 * a, z=2.0 * a),
                             "pod": {"r": 12 * a}, "pilot": {"r": 12 * a}})


def _die(f):
    body = [{"x": -4.0, "z": 4.0, "r": -24.0, "sz": 1.06, "sx": 0.96, "sy": 0.96},
            {"x": -6.0, "z": -2.0, "r": -40.0, "sz": 0.78, "sx": 1.1, "sy": 1.1},
            {"x": -6.0, "z": -4.0, "r": -52.0, "s": 0.85, "sz": 0.6, "sx": 1.15, "sy": 1.15}][f]
    return merge(_rotor(f), {"body": body}, {
        "rotor": {"z": pick(f, [4, 10, 14]), "r": pick(f, [20, 40, 60])},
        "pilot": {"r": pick(f, [20, -10, -10])},
        "smoke": {"show": True, "s": pick(f, [0.8, 1.1, 1.3])},
    })


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, durations=100),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 4, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
