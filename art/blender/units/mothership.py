"""Mothership: Cosmic Age Legendary air gunship (docs/design-lane-ages.md A17.11), flyer rig (A11).
Void beam (fx.beam_void, range 180, hits ground and air), Drone Strike every 6 s, crashes on
death. ~172 lu with the pennant. Rendered at the Legendary scale (2.05 px/lu HD).

Look (A17.12, Cosmic palette): a huge disc ship. A wide void and violet saucer whose rim is a
broad team band (the hull stripes), with a ring of mint running lights that turn around the rim,
three dark launch bays with mint glow on the near side, a star-white upper deck stepped up to a
violet superstructure with a team stripe, a glowing violet bridge dome in a star-white frame and
a slim spire with antennas; a mast at the stern flies a big team pennant (follow-through). Under
the hull hangs the tractor ring (a mint glow ring on struts around a void emitter cone), and at
the front of the belly sits the beam emitter. Origin (the feet anchor) is the lowest point; the
battle view lifts air units to flight altitude.

Clips: idle hovers (bob, lights turning, the tractor ring pulsing), walk is the flight loop
(nose-down pitch, lights turning faster), attack charges a violet ball at the belly emitter,
holds, fires (flare and a short beam stub; the game draws fx.beam_void from the per-frame
`muzzle` anchor) and the hull kicks back; hit rocks the saucer; die tilts it nose-down with
sparks and smoke as it drops (the sim does the crash splash).
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "mothership"
NAME = "Mothership"
HEIGHT_LU = 172
YAW_DEG = -10.0
CANVAS = (440, 400)
FEET = (214, 370)
ANCHORS = {"head": (-8, 170), "hitCenter": (0, 70), "muzzle": (44, 22)}
SCALE = 1.2              # the whole ship: a Legendary towers over the heavies

R = 54.0                  # saucer radius
KR = R / 64.0             # radial scale of the authored saucer details
DZ = 40.0                 # saucer mid height
EMIT = (34.0, -2.0, DZ - 13.0)   # beam emitter at the front of the belly
N_LIGHTS = 12
IDLE_N = 6
WALK_N = 8


def _disc_profile():
    # (radius, z) bottom to top: belly, rim, upper deck
    return [(r * KR, z) for r, z in [(0.0, DZ - 16.0), (20.0, DZ - 15.0), (44.0, DZ - 11.0), (60.0, DZ - 5.0),
                                     (64.0, DZ - 1.0),
            (64.0, DZ + 3.0), (58.0, DZ + 8.0), (40.0, DZ + 13.0), (22.0, DZ + 15.5), (0.0, DZ + 16.0)]]


def build(rig):
    rig.joint("body", "root", (0, 0, 0), scale=SCALE)
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, DZ))
    rig.joint("lights", "hull", (0, 0, DZ))
    rig.joint("tractor", "hull", (0, 0, 14.0))


    # tractor ring under the belly: struts, a mint ring, a void emitter cone with a bright lens
    g = Geo()
    for a in (30, 150, 270):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.capsule((14 * c, 14 * s * 0.8, DZ - 14), (17.5 * c, 17.5 * s * 0.8, 12.0), 1.5, 1.1)
    rig.part("tractor", g, K.STAR_TRIM, finish="metal", outline=0.7)
    g = Geo()
    for i in range(32):
        a0, a1 = 2 * math.pi * i / 32, 2 * math.pi * (i + 1) / 32
        g.capsule((17.5 * math.cos(a0), 17.5 * math.sin(a0) * 0.8, 12.5),
                  (17.5 * math.cos(a1), 17.5 * math.sin(a1) * 0.8, 12.5), 2.0, segs=8, rings=2)
    rig.part("tractor", g, glow=K.MINT, outline=1.0, outline_hex="#1C8A6A")
    g = Geo().lathe([(11.0, 0), (7.6, 12.0), (4.2, 20.0), (0, 22.0)], (0, 0, DZ - 14.0), (0, 0, DZ - 15.0),
                    segs=28, squash=(1.0, 0.85))
    rig.part("hull", g, K.VOID_LT, finish="gloss")
    g = Geo().sphere((0, -1.0, 3.6), 4.2, cuts=4)
    rig.part("tractor", g, glow=K.MINT_CORE, outline=1.0, outline_hex=K.MINT)

    # the saucer: violet belly, a broad team rim band, star-white upper deck
    prof = _disc_profile()
    g = Geo().lathe(prof, segs=48, squash=(1.0, 1.0))
    rig.part("hull", g, K.VIOLET_DK, finish="gloss")
    g = Geo().lathe([(r * 1.012, z) for r, z in prof], segs=48, squash=(1.0, 1.0))
    g.clip((0, 0, DZ + 6.0), (0, 0, 1)).clip((0, 0, DZ - 7.5), (0, 0, -1))
    rig.part("hull", g, team=True)
    g = Geo().lathe([(r * 1.004, z) for r, z in prof], segs=48, squash=(1.0, 1.0))
    g.clip((0, 0, DZ + 6.0), (0, 0, -1))
    rig.part("hull", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # deck panel rings and hatches
    g = Geo()
    for r0, z in ((50.0 * KR, DZ + 10.4), (41.0 * KR, DZ + 13.2)):
        g.lathe([(r0 - 2.2, -0.6), (r0, -0.6), (r0, 0.6), (r0 - 2.2, 0.6)], (0, 0, z), (0, 0, z + 1), segs=48)
    rig.part("hull", g, K.VIOLET_LT, finish="gloss", outline=0)
    g = Geo()
    for a in (-150, -110, -70, -30, 20, 160):
        c, s_ = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.blob((45.5 * KR * c, 45.5 * KR * s_, DZ + 12.4), (3.2, 2.0, 0.8), p=3.0, rot=(0, 0, a + 90))
    rig.part("hull", g, glow=K.MINT, outline=0.6, outline_hex=K.VOID)
    # belly panel ring
    g = Geo().lathe([(30.0, -0.8), (40.0, -0.8), (40.0, 0.8), (30.0, 0.8)], (0, 0, DZ - 12.6), (0, 0, DZ - 11.6),
                    segs=40, squash=(1.0, 1.0))
    rig.part("hull", g, K.VOID, outline=0)
    # running lights on a turning joint
    g = Geo()
    for i in range(N_LIGHTS):
        a = 2 * math.pi * i / N_LIGHTS
        g.sphere((R * 1.02 * math.cos(a), R * 1.02 * math.sin(a), DZ + 1.0), 1.9, cuts=3)
    rig.part("lights", g, glow=K.MINT_CORE, outline=0.8, outline_hex=K.MINT)
    # launch bays on the near rim (dark mouths with a mint glow inside)
    for k, a in enumerate((-120, -90, -60)):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        x, y = (R + 0.4) * c, (R + 0.4) * s
        g = Geo().blob((x, y, DZ - 3.6), (5.2, 1.6, 2.6), p=3.4, rot=(0, 0, a + 90))
        rig.part("hull", g, K.VISOR, finish="gloss", outline=0.6, outline_hex=K.VOID)
        g = Geo().blob((x * 1.006, y * 1.006 - 0.6, DZ - 3.8), (3.6, 1.0, 1.2), p=3.0, rot=(0, 0, a + 90))
        rig.part("hull", g, glow=K.MINT, outline=0)

    # superstructure: stepped violet tiers with a team stripe, bridge dome, spire
    g = Geo()
    g.lathe([(r * KR, z) for r, z in ((0, DZ + 14.0), (36.0, DZ + 14.0), (34.0, DZ + 22.0), (26.0, DZ + 26.0),
                                      (0, DZ + 26.5))], segs=36,
            squash=(1.0, 1.0))
    rig.part("hull", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    g = Geo().lathe([(r * KR, z) for r, z in ((35.4, -2.0), (35.8, -1.0), (35.0, 2.0), (34.4, 2.4))], (0, 0, DZ + 18.0), (0, 0, DZ + 19.0),
                    segs=36, squash=(1.0, 1.0))
    rig.part("hull", g, team=True, outline=0.6)
    g = Geo().lathe([(r * KR, z) for r, z in ((0, DZ + 26.0), (22.0, DZ + 26.0), (21.0, DZ + 32.0), (16.0, DZ + 35.0),
                                                (0, DZ + 35.5))],
                    segs=32, squash=(1.0, 1.0))
    rig.part("hull", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # bridge dome with a star-white frame
    g = Geo().blob((5.0, 0, DZ + 36.0), (13.0, 11.0, 10.4), p=2.2)
    g.clip((0, 0, DZ + 34.0), (0, 0, -1))
    rig.part("hull", g, glow="#9B63D9", outline=1.0, outline_hex=K.VIOLET_DK)
    g = Geo().blob((8.6, -5.4, DZ + 41.0), (3.6, 2.4, 2.6), p=2.2)
    rig.part("hull", g, glow=K.VIOLET_CORE, outline=0)
    g = Geo()
    for a in (-60, 0, 60):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.capsule((5 + 13.2 * c * 0.98, 11.2 * s, DZ + 34.0), (5 + 5 * c, 4.4 * s, DZ + 46.2), 1.0, 0.8, segs=8)
    rig.part("hull", g, K.STAR, finish="gloss", outline=0.6, outline_hex=K.STAR_TRIM)
    # spire with antenna rings and the team pennant (the Legendary's team cue) near the top
    sx, sy = -8.0, 4.0
    g = Geo().lathe([(7.0, 0), (5.6, 10.0), (2.6, 34.0), (1.5, 60.0), (0, 63.0)], (sx, sy, DZ + 34.0),
                    (sx, sy, DZ + 97.0), segs=16)
    rig.part("hull", g, K.STAR_TRIM, finish="metal", outline_hex=K.VOID_LT)
    g = Geo()
    for z, r in ((DZ + 52.0, 7.0), (DZ + 66.0, 5.2)):
        g.lathe([(0, -0.9), (r, -0.8), (r, 0.8), (0, 0.9)], (sx, sy, z), (sx, sy, z + 1), segs=20)
    rig.part("hull", g, glow=K.MINT, outline=0.8, outline_hex=K.VOID)
    g = Geo().capsule((sx, sy, DZ + 58.0), (sx + 9.0, sy, DZ + 62.0), 0.8)
    g.capsule((sx, sy, DZ + 72.0), (sx - 7.0, sy, DZ + 75.0), 0.7)
    rig.part("hull", g, K.STAR_TRIM, finish="metal", outline=0.5)
    g = Geo().sphere((sx, sy, DZ + 98.0), 2.4, cuts=3)
    rig.part("hull", g, glow=K.MINT, outline=0.8, outline_hex=K.VOID)
    top = (sx - 1.0, sy, DZ + 93.0)
    rig.secondary("pennant", "hull", top, (top[0] - 26.0, sy, top[2] - 4.0), max_deg=14, gain=1.1, rot_gain=0.6)
    pts = [(0.0, 0.0), (-28.0, -1.5), (-20.0, -7.0), (-28.0, -12.5), (0.0, -14.0)]
    g = Geo().slab([(top[0] + a, top[2] + b) for a, b in pts], sy, 1.4)
    rig.part("pennant", g, team=True, outline=0.8)

    # beam emitter at the front of the belly
    ex, ey, ez = EMIT
    g = Geo().lathe([(0, 0), (6.0, 0.2), (6.4, 3.0), (4.6, 5.0), (0, 5.2)], (ex - 3.0, ey, ez + 4.0),
                    (ex + 1.0, ey, ez - 1.0), segs=18)
    rig.part("hull", g, K.VOID_LT, finish="gloss")
    g = Geo().sphere((ex + 1.0, ey - 0.5, ez - 1.0), 3.0, cuts=3)
    rig.part("hull", g, glow=K.VIOLET_GLOW, outline=0.8, outline_hex=K.VIOLET)
    K.orb(rig, "hull", (ex + 3.0, ey - 1.0, ez - 3.0), 4.4, color=K.VIOLET_GLOW, core=K.VIOLET_CORE,
          name="charge", hidden=True, line=K.VIOLET)
    rig.joint("flash", "hull", (ex + 3.0, ey, ez - 3.0), hidden=True)
    g = Geo().star((ex + 5.0, ey - 5, ez - 4.0), 14.0, 5.0, 1.4, points=6)
    rig.part("flash", g, glow=K.VIOLET_GLOW, outline=0)
    g = Geo().blob((ex + 22.0, ey - 4, ez - 12.0), (18.0, 2.0, 3.6), p=2.0, rot=(0, 28, 0))
    rig.part("flash", g, glow=K.VIOLET_GLOW, outline=0)
    g = Geo().blob((ex + 20.0, ey - 5.5, ez - 11.0), (15.0, 1.6, 1.6), p=2.0, rot=(0, 28, 0))
    g.sphere((ex + 4.0, ey - 7, ez - 3.0), 5.2, cuts=3)
    rig.part("flash", g, glow=K.VIOLET_CORE, outline=0)
    rig.track("muzzle", "hull", (ex + 3.0, ey, ez - 3.0))
    rig.track("_foot", "odo", (0, 0, 0))

    # damage: sparks on the deck and smoke (death)
    K.sparks(rig, "hull", (20.0, -30.0, DZ + 10.0), color=K.MINT, size=2.0, name="sparks")
    rig.joint("smoke", "hull", (-10.0, -30.0, DZ + 30.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 9.0), (10, 6, 7.4), (-8, 9, 7.0), (4, 16, 6.2), (-14, 2, 6.0)):
        g.sphere((-10.0 + dx, -30.0, DZ + 30.0 + dz), r, cuts=4)
    rig.part("smoke", g, "#8C869A", finish="dust", outline=0.8)


# -- poses ---------------------------------------------------------------------------------
def _lights(k):
    return {"lights": {"rz": k}}


def _idle(f):
    ph = 2 * math.pi * f / IDLE_N
    return merge(_lights(360.0 / N_LIGHTS * f / IDLE_N), {
        "body": {"z": 2.4 * math.sin(ph)},
        "hull": {"r": 0.8 * math.sin(ph - 0.9)},
        "tractor": dict(squash(0.05 * math.sin(ph + 1.0)), s=1.0 + 0.04 * math.sin(ph)),
    })


WALK_MS = 100


def _walk(f):
    p = 2 * math.pi * f / WALK_N
    a = 40.0 * (WALK_N * WALK_MS / 1000.0) / 4.0     # odo: sim speed 40 lu/s
    return merge(_lights(2 * 360.0 / N_LIGHTS * f / WALK_N), {
        "odo": {"x": a * math.cos(p)},
        "body": {"z": 2.0 * math.sin(p)},
        "hull": {"r": -3.5 + 0.8 * math.sin(p - 0.8)},
        "tractor": {"r": 3.0 * math.sin(p - 1.6)},
    })


ATTACK_MS = [83, 83, 125, 125, 83, 83, 125, 125]
ATTACK_IMPACT = 4


def _attack(f):
    # 0 dip the nose, 1-3 charge the emitter (held), 4 fire: flare and beam stub,
    # 5 kick back, 6-7 settle
    return merge(_lights(pick(f, [0, 3, 6, 9, 12, 15, 18, 21])), {
        "body": {"z": pick(f, [0, -1.0, -1.5, -1.5, 1.5, 2.5, 1.0, 0]),
                 "x": pick(f, [0, 0.5, 1.0, 1.0, -2.0, -4.0, -2.0, -0.5])},
        "hull": dict(squash(pick(f, [0, -0.01, -0.02, -0.02, 0.03, -0.02, 0.01, 0])),
                     r=pick(f, [-2.0, -3.0, -3.5, -3.5, 1.5, 3.0, 1.0, -0.5])),
        "charge": {"show": f in (1, 2, 3), "s": pick(f, [0, 0.5, 0.9, 1.25, 0, 0, 0, 0])},
        "flash": {"show": f == 4},
    })


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return {"body": {"x": -4.0 * a, "z": -1.5 * a}, "hull": dict(squash(-0.04 * a), r=6.0 * a),
            "tractor": {"r": 10 * a}, "sparks": {"show": f == 0, "s": 0.7}}


def _die(f):
    # nose-down tilt and drop with sparks and smoke
    return {
        "body": {"x": pick(f, [-4.0, -8.0, -10.0]), "z": pick(f, [2.0, -6.0, -14.0]),
                 "s": pick(f, [1.0, 0.96, 0.9])},
        "hull": dict(squash(pick(f, [0.02, -0.04, -0.10])), r=pick(f, [-8.0, -16.0, -22.0])),
        "tractor": {"r": pick(f, [14, 26, 34])},
        "sparks": {"show": f in (0, 1), "s": pick(f, [1.0, 1.3, 1.0])},
        "smoke": {"show": True, "s": pick(f, [0.7, 1.0, 1.25])},
        "lights": {"hide": f >= 1},
    }


def clips():
    return [
        Clip("idle", IDLE_N, _idle, loop=True, durations=150),
        Clip("walk", WALK_N, _walk, loop=True, durations=WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
