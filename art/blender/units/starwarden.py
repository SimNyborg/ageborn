"""Starwarden: Cosmic Age support Rare (docs/design-lane-ages.md A17.11). Ion bolt (proj.ion, range
150) and the Shield Beacon (every 8 s, the nearest 4 allies get a 200 shield; the game draws
fx.beacon_ring); follows the front. ~70 lu with the staff.

Look (A17.12, Cosmic palette): a robed star-priest. A long team robe that flares to the ankles
with a star-white hem band and a violet front panel, a violet mantle over the shoulders with a
star-white clasp, and a deep violet hood whose shadowed opening shows a dark faceplate with a
mint visor slit. The near hand holds a tall star-white staff topped by an open crescent fork; a
mint beacon orb floats in the fork inside a star-white halo ring (it bobs and turns on its
own). The attack raises the staff forward, the beacon swells and the halo spins, then the bolt
leaves the beacon (exported per-frame `muzzle` anchor) with a star flash and the beacon recoils.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "starwarden"
NAME = "Starwarden"
HEIGHT_LU = 70
CANVAS = (272, 272)
FEET = (116, 240)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 30)}

HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
STAFF_UP = 34.0                    # staff top above the fist
STAFF_DN = 18.0                    # staff foot below the fist
BEACON = (HR[0], HR[1] - 1.0, HR[2] + STAFF_UP + 8.0)


def build(rig):
    K.skeleton(rig, head=(1, 0, 39))
    # legs: only the boots show under the robe
    for s in ("r", "l"):
        y = K.LEG_Y * K.SIDE_Y[s]
        g = Geo().capsule((0.5, y, K.KNEE_Z), (1.0, y, 4.6), 3.2, 3.4)
        rig.part(f"shin_{s}", g, K.VOID)
        g = Geo().blob((2.8, y, 2.8), (6.4, 4.4, 3.0), p=3.0, taper=(1.05, 0.85))
        rig.part(f"shin_{s}", g, K.VIOLET_DK, finish="gloss")
    rig.joint("staff", "hand_r", HR)
    K.arm_parts(rig, "l", sleeve=K.VIOLET, bracer=None, glove=K.STAR)

    # robe: a flared team skirt on the hips with a hem that swings, a violet front panel
    rig.secondary("hem", "hips", (0, 0, 14.0), (2.0, 0, 1.0), max_deg=10, gain=0.8)
    g = Geo().blob((0.5, 0, 9.0), (12.4, 11.2, 9.6), p=2.6, taper=(1.25, 0.9))
    g.clip((0, 0, 1.6), (0, 0, -1))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.5, 0, 3.0), (15.6, 14.0, 1.6), p=2.8)
    rig.part("hem", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((0, 0, 20.0), (11.0, 10.6, 7.4), p=2.6, taper=(1.12, 0.95))
    rig.part("hips", g, team=True)
    g = Geo().blob((10.6, -1.0, 12.0), (1.8, 4.2, 10.4), p=3.0, taper=(1.3, 0.8))
    rig.part("hem", g, K.VIOLET, finish="matte", outline=0.8)

    # torso: team robe top, star-white sash, violet mantle with a clasp
    g = Geo().blob((0, 0, 28), (9.8, 9.6, 11.2), p=2.4, taper=(0.95, 1.05))
    rig.part("torso", g, team=True)
    g = Geo().blob((0.4, 0, 22.2), (10.4, 10.2, 2.2), p=3.4)
    rig.part("torso", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((10.5, -2.0, 22.2), (1.4, 2.2, 1.6), p=2.4)
    rig.part("torso", g, glow=K.MINT, outline=1.0, outline_hex=K.VOID)
    g = Geo().blob((-1.0, 0, 36.0), (11.4, 12.6, 5.6), p=2.4, taper=(1.2, 0.8))
    rig.part("torso", g, K.VIOLET, finish="matte")
    g = Geo().blob((9.6, -1.5, 35.0), (2.2, 2.8, 2.8), p=2.4)
    rig.part("torso", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # the back of the mantle hangs as a short cape
    rig.secondary("cape", "torso", (-8.0, 0, 38.0), (-13.0, 0, 18.0), max_deg=14, gain=1.0)
    g = Geo().blob((-10.6, 0.5, 29.0), (2.8, 11.4, 10.4), p=3.0, taper=(1.2, 0.9))
    rig.part("cape", g, K.VIOLET_DK)

    # hood: deep violet, a shadowed opening with a dark faceplate and a mint slit
    g = Geo().blob((0.5, 0, 50.0), (12.4, 11.6, 12.6), p=2.4, shift=(-0.15, 0))
    g.blob((-6.0, 0, 58.0), (6.0, 6.0, 7.0), p=2.2, rot=(0, 30, 0))       # hood point
    g.clip((8.4, 0, 49.0), (1, 0, 0.25))
    rig.part("head", g, K.VIOLET, finish="matte", outline_hex=K.VIOLET_DK)
    g = Geo().blob((3.0, 0, 49.0), (9.6, 9.0, 9.6), p=2.4)
    rig.part("head", g, K.VISOR, finish="gloss", outline_hex=K.VOID)
    g = Geo().lathe([(8.6, -1.2), (10.6, -1.0), (10.8, 0.8), (8.6, 1.0)], (9.0, 0, 49.4), (10.0, 0, 49.6),
                    segs=22, squash=(1.2, 0.95))
    rig.part("head", g, team=True, outline=0.6)                                # team hood rim
    rig.joint("eyes", "head", (13.0, 0, 50.0))
    g = Geo().blob((12.9, -1.8, 50.2), (1.0, 5.6, 1.4), p=3.4)
    rig.part("eyes", g, glow=K.MINT, outline=0)
    rig.joint("eyes_x", "head", (12.0, 0, 50.0), hidden=True)
    g = Geo()
    for y in (-4.4, 1.6):
        g.capsule((13.2, y - 1.6, 51.6), (13.2, y + 1.6, 48.4), 0.7)
        g.capsule((13.2, y - 1.6, 48.4), (13.2, y + 1.6, 51.6), 0.7)
    rig.part("eyes_x", g, glow=K.MINT, outline=0)

    K.arm_parts(rig, "r", sleeve=K.VIOLET, bracer=None, glove=K.STAR)
    # wide team sleeve cuffs
    for s in ("r", "l"):
        y = K.ARM_Y[s]
        g = Geo().blob((0.2, y, K.HAND_Z + 3.6), (5.2, 5.0, 3.4), p=2.4, taper=(1.2, 0.9))
        rig.part(f"fore_{s}", g, team=True, outline=0.6)

    # staff with a crescent fork and the floating beacon
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy, hz - STAFF_DN), (hx, hy, hz + STAFF_UP), 1.4)
    rig.part("staff", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo()
    for z in (hz + 8, hz + STAFF_UP - 2):
        g.lathe([(0, -1.2), (2.3, -1.0), (2.3, 1.0), (0, 1.2)], (hx, hy, z), (hx, hy, z + 1), segs=12)
    rig.part("staff", g, K.VIOLET, finish="gloss")
    g = Geo()
    top = hz + STAFF_UP
    for s in (1, -1):
        pts = [(hx, top)]
        for k in range(1, 7):
            a = math.radians(-90 + 30 * k)
            pts.append((hx + s * 8.0 * math.cos(a) * (1.0 if k < 6 else 0.7), top + 8.0 + 8.0 * math.sin(a)))
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule((p0[0], hy, p0[1]), (p1[0], hy, p1[1]), 1.3, 1.0)
    rig.part("staff", g, K.STAR_TRIM, finish="metal", outline=0.8)
    rig.joint("beacon", "staff", BEACON)
    K.orb(rig, "beacon", BEACON, 4.6, color=K.MINT, core=K.MINT_CORE, line="#1C8A6A")
    bx, by, bz = BEACON
    rig.joint("halo", "beacon", BEACON)
    g = Geo()
    for i in range(20):
        a0, a1 = 2 * math.pi * i / 20, 2 * math.pi * (i + 1) / 20
        g.capsule((bx + 6.6 * math.cos(a0), by - 1.0 + 2.0 * math.sin(a0), bz + 6.6 * math.sin(a0) * 0.45),
                  (bx + 6.6 * math.cos(a1), by - 1.0 + 2.0 * math.sin(a1), bz + 6.6 * math.sin(a1) * 0.45),
                  0.8, segs=6, rings=2)
    rig.part("halo", g, glow=K.MINT, outline=0.6, outline_hex="#1C8A6A")
    rig.track("muzzle", "beacon", (bx + 5.0, by, bz))
    rig.track("_foot", "shin_r", (2.8, -6.0, 0.5))
    K.star_burst(rig, "beacon", (bx + 4.0, by, bz), size=1.1, name="flash")


# -- poses ---------------------------------------------------------------------------------
def staff_arm(a, f, w=90.0):
    return K.arm("r", a, f, w, 90.0)


STANCE = merge(staff_arm(-28, 18, 72), K.arm("l", -80, -40), {"torso": {"r": -1}})


def _idle(f):
    c, lag = K.idle_wave(f)
    return merge(STANCE, K.idle_body(f, bob=1.0, sq=0.035), {
        "arm_r": {"r": 1.5 * lag}, "hand_r": {"r": -1.5 * lag},
        "beacon": {"z": 1.6 * c}, "halo": {"rz": 30 * f, "r": 6 * lag},
    })


def _walk(f):
    pose, p, bl = K.walk_legs(f, stride=24, lift=46, lean=-5)
    return merge(STANCE, pose, {
        "arm_r": {"r": -4 * math.cos(p)}, "hand_r": {"r": 3 * bl},
        "arm_l": {"r": 6 * math.cos(p)},
        "beacon": {"z": -1.2 * bl}, "halo": {"rz": 20 * f},
    })


ATTACK_MS = [83, 83, 125, 125, 83, 83, 125, 125]
ATTACK_IMPACT = 4


def _attack(f):
    # 0-1 raise the staff forward, 2-3 beacon swells, halo spins (held), 4 fire: flash,
    # 5 beacon recoils, 6-7 settle
    pose = merge(staff_arm(pick(f, [-25, -5, 5, 8, 12, 5, -15, -30]), pick(f, [20, 40, 50, 52, 45, 40, 25, 15]),
                           pick(f, [70, 60, 55, 52, 45, 56, 64, 70])),
                 K.arm("l", pick(f, [-70, -55, -45, -45, -60, -65, -75, -80]), pick(f, [-20, 0, 10, 12, -10, -20, -35, -40])), {
        "body": dict(squash(pick(f, [0, -0.03, 0.03, 0.05, -0.08, -0.04, 0, 0])),
                     x=pick(f, [0, 1.0, 1.5, 1.5, 2.5, 0, -0.5, 0])),
        "torso": {"r": pick(f, [0, -3, -5, -6, -8, -2, 0, -1])},
        "head": {"r": pick(f, [0, -2, -4, -4, -2, 2, 1, 0])},
        "beacon": {"s": pick(f, [1, 1.05, 1.25, 1.4, 0.85, 0.9, 1.0, 1]),
                   "x": pick(f, [0, 0, 0, 0, 0, -2.5, -1, 0])},
        "halo": {"rz": pick(f, [0, 30, 70, 110, 150, 170, 180, 180]), "s": pick(f, [1, 1, 1.1, 1.2, 1.3, 1.1, 1, 1])},
        "flash": {"show": f == 4},
    })
    if f == 4:
        pose["eyes"] = {"sz": 0.45}
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, K.hit_body(f), {"arm_r": {"r": 12 * a}, "hand_r": {"r": 8 * a},
                                         "arm_l": {"r": 20 * a}, "beacon": {"z": 3 * a}})


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), K.die_limbs(f), {
        "arm_r": {"r": pick(f, [50, 60, 60])}, "hand_r": {"r": pick(f, [30, 20, 20])},
        "arm_l": {"r": pick(f, [80, 70, 70])},
        "beacon": {"s": pick(f, [0.8, 0.5, 0.3])},
    })
    if f in (0, 1):
        K.ko(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
