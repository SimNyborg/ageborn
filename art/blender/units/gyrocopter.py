"""Gyrocopter: Modern Age air gunship (DESIGN A5.5). Bullet (proj.bullet), 150 lu, air mech.

Look (A11 flyer rig, Modern palette): a round, bubbly autogyro. A team-painted egg-shaped pod (a
cream chevron, a rivet row) with an olive belly and nose cone, a signal nose band, an open cockpit
with a windscreen and a goggled pilot (a round face with the face kit, a leather cap with ear flaps)
whose signal scarf streams behind him (follow-through), twin gunmetal machine guns under the chin
with an ammo box, a thin tail boom with a team fin and a tailplane, khaki skids on struts, and a
two-blade rotor on a mast whose blades strobe round in four phase steps. Flyers are authored with the origin at their lowest point
(the skids); the battle view lifts air units to their flight altitude.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    hover: a bob and a gentle pitch, the rotor spinning, the scarf and the pilot's head
          lagging, a blink
  walk    forward flight: nose down, the rotor tilted into the wind, a porpoising bob
  attack  STRAFING DIP: the nose dips onto the target (the pilot squints), both guns fire together
          (one flash per gun on the shot frame, impact lines), the recoil bumps the pod back, two
          brass casings tumble out under the guns and it bounces back level. The bullets leave
          the per-frame `muzzle` anchor on the fire frame; the clip repeats for the rapid fire.
  hit     flyer: a tilt and a 4 lu drop, the pilot's eyes squeezed, then a wobble back up
  die     D8 spiral down: smoke pours out, the rotor slows and tilts, the gyrocopter noses over and
          spins down with the pilot's spiral eyes, a crash bounce
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_modern as KM
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "gyrocopter"
NAME = "Gyrocopter"
HEIGHT_LU = 66
YAW_DEG = -10.0
CANVAS = (340, 320)
FEET = (170, 250)
ANCHORS = {"head": (0, 62), "hitCenter": (0, 26)}
NO_RETIME = True

POD = (2.0, 0.0, 24.0)
MAST = (-4.0, 0.0, 60.0)
ROTOR_R = 44.0
PHASES = 4                  # 2 blades: 180 degrees of symmetry in 4 steps of 45
MUZZLE = (33.0, -3.0, 11.0)
SCARF = "#B0306A"
BRASS = "#C8B27A"


def _blade(g, ang, mx, mz, w=3.2, t=0.9, r0=0.0, r1=ROTOR_R):
    for sgn in (1, -1):
        a = math.radians(ang)
        c = (r0 + r1) / 2
        g.blob((mx + sgn * c * math.cos(a), sgn * c * math.sin(a), mz + 2.0), ((r1 - r0) / 2, w, t), p=2.6,
               rot=(0, 0, ang))


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("pod", "body", POD)
    px, py, pz = POD
    # tail boom and fin (behind the pod)
    g = Geo().capsule((-14.0, 0, pz + 2.0), (-44.0, 0, pz + 6.0), 3.0, 1.8)
    rig.part("pod", g, R.OLIVE)
    g = Geo().slab([(-38, pz + 4), (-47, pz + 6), (-51, pz + 21), (-45, pz + 22), (-40, pz + 10)], 0.0, 2.2)
    rig.part("pod", g, team=True, outline=0.8)
    g = Geo().blob((-45.0, 0, pz + 6.0), (5.0, 9.0, 1.2), p=2.6)   # tailplane
    rig.part("pod", g, R.OLIVE_LT, outline=0.7)
    g = Geo()
    for x in (-22.0, -30.0, -38.0):
        g.lathe([(3.0 - 0.02 * (-x), -0.5), (3.1 - 0.02 * (-x), 0), (3.0 - 0.02 * (-x), 0.5)],
                (x, 0, pz + 2.0 + (x + 14.0) / -30.0 * 4.0), (x - 1.0, 0, pz + 2.0 + (x + 13.0) / -30.0 * 4.0),
                segs=12)
    rig.part("pod", g, R.GUNMETAL, finish="metal", outline=0)
    # skids and struts
    g = Geo()
    for y in (-7.5, 7.5):
        g.capsule((-12.0, y, 1.6), (15.0, y, 1.6), 1.6)
        g.capsule((15.0, y, 1.6), (19.0, y, 4.2), 1.5)
        g.capsule((-6.0, y * 0.8, 2.0), (-3.0, y * 0.6, 12.0), 1.2)
        g.capsule((8.0, y * 0.8, 2.0), (6.0, y * 0.6, 12.0), 1.2)
    rig.part("pod", g, R.KHAKI, outline=0.8)
    # the pod: team egg with an olive belly and nose cone
    egg = Geo().blob((px, 0, pz), (20.0, 13.0, 13.5), p=2.2, taper=(0.9, 1.0))
    egg.clip((0, 0, pz - 6.0), (0, 0, -1))
    eface = F.Face(rig, "pod", [egg])
    rig.part("pod", egg, team=True)
    g = KM.chevron(eface, Geo(), (px - 6.0, pz + 2.0), s=1.0, n=2, w=1.8, gap=2.8)
    rig.part("pod", g, KM.CREAM, highlight=False, outline=0)
    g = Geo()
    for a in range(-150, -20, 18):
        t = math.radians(a)
        g.sphere((px + 18.6 * math.cos(t) * 0.98, 12.2 * math.sin(t) * 0.98, pz - 4.0), 0.8, cuts=2)
    rig.part("pod", g, R.OLIVE_LT, finish="metal", outline=0)
    g = Geo().blob((px, 0, pz), (20.0, 13.0, 13.5), p=2.2, taper=(0.9, 1.0))
    g.clip((0, 0, pz - 6.0), (0, 0, 1))
    g.lathe([(0, 0), (7.4, 0.5), (8.0, 3.0), (6.0, 6.5), (0, 8.4)], (px + 17.0, 0, pz - 1.0),
            (px + 27.0, 0, pz - 1.0), segs=18)   # nose cone
    rig.part("pod", g, R.OLIVE)
    g = Geo().lathe([(8.2, -0.9), (8.4, 0), (8.2, 0.9)], (px + 17.0, 0, pz - 1.0), (px + 18.0, 0, pz - 1.0), segs=18)
    rig.part("pod", g, R.SIGNAL, outline=0.5)
    g = Geo().blob((px + 2.0, 0, pz + 11.8), (10.0, 9.0, 1.6), p=2.6)   # cockpit rim
    rig.part("pod", g, R.LEATHER, outline=0.6)
    g = Geo().blob((px + 11.0, 0, pz + 14.5), (1.4, 8.0, 4.6), p=3.0, rot=(0, 24, 0))   # windscreen
    rig.part("pod", g, R.GLASS, finish="gloss", outline=0.6, outline_hex="#6F8A94")
    # twin machine guns under the chin and an ammo box
    g = Geo()
    for y in (-3.0, 3.0):
        g.capsule((px + 14.0, y, 11.0), (MUZZLE[0] - 1.0, y, 11.0), 1.4)
        g.blob((MUZZLE[0] - 1.5, y, 11.0), (2.2, 1.7, 1.7), p=2.4)
    g.blob((px + 13.0, 0, 11.5), (4.6, 5.6, 2.8), p=2.6)
    rig.part("pod", g, R.GUNMETAL, finish="metal", outline=0.7)
    g = Geo().blob((px + 6.0, -9.0, 10.4), (3.6, 1.6, 2.6), p=3.2)
    rig.part("pod", g, R.KHAKI, outline=0.5)
    rig.track("muzzle", "pod", MUZZLE)
    R.muzzle_flash(rig, "pod", (MUZZLE[0] + 1.0, -3.0, 11.0), size=1.3, name="flash")
    R.muzzle_flash(rig, "pod", (MUZZLE[0] + 1.0, 3.0, 11.0), size=1.0, name="flash2")
    # two brass casings (they tumble out under the guns after the shot)
    for i, dx in enumerate((0.0, 3.0)):
        rig.joint(f"casing{i}", "pod", (px + 12.0 + dx, -4.0, 9.0), hidden=True)
        g = Geo().capsule((px + 11.4 + dx, -4.0 - i, 9.0), (px + 13.0 + dx, -4.0 - i, 9.6), 0.9)
        rig.part(f"casing{i}", g, BRASS, finish="metal", outline=0.4)

    # pilot: a round face with the face kit, a leather cap with goggles, a streaming scarf
    rig.joint("pilot", "pod", (px, 0, pz + 14.0))
    cx, cz = px, pz + 14.0
    g = Geo().blob((cx, 0, cz + 1.5), (6.0, 6.6, 4.0), p=2.4)   # shoulders
    rig.part("pilot", g, R.LEATHER)
    hc = (cx + 1.0, 0.0, cz + 10.5)
    KM.crew_head(rig, "p_head", "pilot", hc, k=1.0, brow=R.HAIR, brow_angry=False)
    g = Geo().blob((hc[0] - 0.4, 0, hc[2] + 3.5), (8.4, 8.0, 5.8), p=2.3)
    g.clip((hc[0], 0, hc[2] + 0.3), (0, 0, -1))
    g.blob((hc[0] - 2.0, -7.4, hc[2] - 0.5), (3.0, 1.4, 4.2), p=2.3)
    g.blob((hc[0] - 2.0, 7.4, hc[2] - 0.5), (3.0, 1.4, 4.2), p=2.3)
    rig.part("p_head", g, R.LEATHER)
    g = Geo()
    for y in (-3.4, 3.0):
        g.lathe([(0, 0), (2.4, 0.2), (2.5, 1.6), (0, 1.8)], (hc[0] + 5.4, y, hc[2] + 4.9), (hc[0] + 7.4, y, hc[2] + 5.5),
                segs=12)
    rig.part("p_head", g, R.GUNMETAL, finish="metal", outline=0.5)
    g = Geo()
    for y in (-3.4, 3.0):
        g.blob((hc[0] + 7.3, y, hc[2] + 5.4), (0.6, 1.8, 1.8), p=2.2)
    rig.part("p_head", g, R.GLASS, finish="gloss", outline=0)
    g = Geo().blob((cx + 1.0, 0, cz + 4.4), (6.2, 7.0, 2.3), p=2.4)   # scarf knot
    rig.part("pilot", g, SCARF)
    rig.secondary("scarf", "pilot", (cx - 4.0, -2.0, cz + 4.6), (cx - 19.0, -2.0, cz + 6.0), max_deg=24, gain=1.5)
    g = Geo().blob((cx - 11.0, -2.0, cz + 5.0), (7.8, 1.4, 2.2), p=2.4, taper=(1.0, 0.8), rot=(0, -6, 0))
    g.blob((cx - 18.5, -2.0, cz + 5.8), (2.8, 1.3, 2.8), p=2.2)
    rig.part("scarf", g, SCARF, outline=0.7)

    # rotor mast, hub, blades (phase copies)
    g = Geo().capsule((px - 5.0, 0, pz + 10.0), (MAST[0], 0, MAST[2]), 1.9, 1.6)
    g.capsule((px - 12.0, 0, pz + 8.0), (MAST[0], 0, MAST[2] - 2.0), 1.2)
    rig.part("pod", g, R.GUNMETAL, finish="metal", outline=0.7)
    rig.joint("rotor", "pod", MAST)
    mx, my, mz = MAST
    g = Geo().blob((mx, 0, mz + 1.0), (3.6, 3.6, 2.4), p=2.4)
    rig.part("rotor", g, R.GUNMETAL, finish="metal", outline=0.7)
    for k in range(PHASES):
        name = f"blade{k}"
        rig.joint(name, "rotor", MAST, hidden=True)
        ang = 180.0 * k / PHASES
        g = Geo()
        _blade(g, ang, mx, mz)
        rig.part(name, g, R.KHAKI, outline=0.7)
        g = Geo()
        for sgn in (1, -1):
            a = math.radians(ang)
            g.blob((mx + sgn * (ROTOR_R - 3.0) * math.cos(a), sgn * (ROTOR_R - 3.0) * math.sin(a), mz + 2.1),
                   (3.0, 2.8, 0.9), p=2.6, rot=(0, 0, ang))
        rig.part(name, g, R.SIGNAL, outline=0.5)

    rig.joint("smoke", "pod", (px - 8.0, -6.0, pz + 8.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 6.0), (-8, 3, 5.0), (-4, 9, 4.6), (5, 6, 4.2), (-14, 1, 4.0), (-20, 6, 3.4)):
        g.sphere((px - 8.0 + dx, -6.0, pz + 8.0 + dz), r, cuts=4)
    rig.part("smoke", g, R.SMOKE_DK, finish="dust", outline=0.8)
    rig.track("_foot", "odo", (0, 0, 0))


# -- poses ------------------------------------------------------------------------------------------
def _rotor(step, slow=1):
    return {f"blade{(step // slow) % PHASES}": {"show": True}}


def _idle(f):
    b = math.sin(2 * math.pi * f / 4)
    c = math.cos(2 * math.pi * f / 4)
    pose = merge(_rotor(f), {
        "body": {"z": 2.0 * b},
        "pod": {"r": 1.8 * c},
        "pilot": {"r": -2.5 * b},
        "p_head": {"r": 3.0 * math.sin(2 * math.pi * (f - 1) / 4)},
    })
    if f == 2:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    return merge(_rotor(f), {
        "odo": {"x": 10.0 * math.cos(p)},     # stride 40 lu per 0.5 s = 80 lu/s (sim speed)
        "body": {"z": 2.2 * math.sin(p)},
        "pod": {"r": -10.0 + 2.0 * math.sin(p + 1.0)},
        "rotor": {"r": -7.0},
        "pilot": {"r": 4.0},
        "p_head": {"r": 2.0 * math.sin(p - 1.0)},
    })


# 5 unique frames in 250 ms; fire on frame 1 at 60 ms (impactAt 0.24, as shipped)
ATTACK_MS = [60, 50, 40, 50, 50]
ATTACK_IMPACT = 1


def _attack(f):
    pose = merge(_rotor(f), {
        "pod": {"r": [-11, -13, -6, -3, -5][f], "x": [1.0, 0.5, -2.5, -1.5, 0.0][f]},
        "body": dict(squash([-0.03, 0.03, -0.05, 0.02, 0.0][f]), z=[-1.5, -2.0, 0.5, 1.5, 0.0][f]),
        "pilot": {"r": [-5, -6, 4, 2, 0][f]},
        "flash": {"show": f == 1},
        "flash2": {"show": f == 1},
        "casing0": {"show": f in (2, 3), "x": [0, 0, -1, -3, 0][f], "z": [0, 0, -3, -8, 0][f],
                    "r": [0, 0, 80, 220, 0][f]},
        "casing1": {"show": f in (2, 3), "x": [0, 0, 1, 0, 0][f], "z": [0, 0, -2, -6, 0][f],
                    "r": [0, 0, -60, -200, 0][f]},
    })
    if f in (0, 1):
        pose = merge(pose, F.expr("squeeze", "grit"))
    elif f == 2:
        pose = merge(pose, F.expr("yell"))
    return pose


def _attack_clip():
    ov = {1: [{"kind": "burst", "joint": "pod", "point": (MUZZLE[0] + 3.0, -3.0, 11.0), "r0_lu": 6.0,
               "r1_lu": 10.5, "n": 5, "a0": -60.0, "arc": 120.0}]}
    return M.clip("attack", [_attack(f) for f in range(5)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov)


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_rotor(k), {"body": dict(squash([-0.08, -0.04, 0.02, -0.01, 0][k]), x=-3.0 * max(a, 0),
                                          z=-4.0 * max(a, 0) + 1.5 * min(a, 0)),
                             "pod": {"r": 12 * a}, "pilot": {"r": 10 * a}, "p_head": {"r": 8 * a}})
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


# D8 spiral down: the nose drops, it wobbles and rolls as it falls, crashes nose first with a
# squash and the rotor flies off
D_R = [-8, -18, -30, -42, -55, -64, -58, -62, -62, -62]
D_RZ = [0, 10, -12, 14, -10, 6, 0, 0, 0, 0]
D_RX = [0, 8, -6, 10, -4, 4, 0, 0, 0, 0]
D_Z = [2, 0, -4, -10, -16, -22, -19, -22, -22, -22]
D_X = [-2, -4, -5, -6, -7, -8, -8, -8, -8, -8]
D_Q = [0.04, 0, 0, 0, 0, -0.14, 0.05, -0.06, -0.04, -0.08]
ROTOR_OFF = [None, None, None, None, None, (4, 8, 40), (10, 16, 90), (16, 18, 140), (22, 14, 190),
             (26, 8, 240)]


def _die(k):
    pose = merge(_rotor(k, slow=2 if k > 3 else 1), {
        "body": dict(M.body_about((0, 0, 24), x=D_X[k], z=D_Z[k], r=D_R[k], rz=D_RZ[k], rx=D_RX[k],
                                  q=D_Q[k])["body"]),
        "pilot": {"r": [10, 16, -8, 12, -10, 14, 8, 10, 10, 10][k]},
        "smoke": {"show": True, "s": [0.7, 0.85, 0.95, 1.0, 1.05, 1.1, 1.1, 1.15, 1.15, 1.2][k],
                  "x": [0, -1, -2, -3, -4, -5, -6, -7, -8, -9][k]},
    })
    ro = ROTOR_OFF[k]
    if ro is None:
        pose["rotor"] = {"r": [0, 6, 10, 14, 18][k]}
    else:
        x, z, r = ro
        pose["rotor"] = {"x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 5:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 1.4}})
    else:
        pose = merge(pose, F.expr("spiral", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(4)], [100, 100, 100, 100], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    by = {c.name: c for c in cl}
    assert by["idle"].total_ms() == 400 and by["hit"].total_ms() == 310 and by["die"].total_ms() == 695
    return M.check_contract([by["attack"]], attack_ms=250, attack_impact_at=0.24) and cl
