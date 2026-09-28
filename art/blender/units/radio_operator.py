"""Radio Operator: Modern Age support (DESIGN A5.5). Bullet, 200 lu; calls in shells. ~68 lu.

Look (A11, Modern palette): a soldier in a soft olive field cap with a team band and a
headphone over his ear, a team tunic and sleeves, khaki webbing, olive trousers and khaki
puttees. On his back rides a big team-painted radio set with gunmetal dials, a signal
red-violet lamp and a tall whip antenna (two segments with follow-through and a
red-violet tip): the antenna is his silhouette cue at 56 px. At rest he talks into the
handset in his near hand while his far hand holds a short carbine low. The attack lets the
handset drop on its cord, brings the carbine up in both hands, fires (flash, squint),
kicks, and picks the handset back up. The projectile spawns at the per-frame `muzzle`
anchor; the antenna tip is exported as `antenna` (for the radio-call marker, fx.call_marker).
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_modern as M
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "radio_operator"
NAME = "Radio Operator"
HEIGHT_LU = 68
CANVAS = (272, 252)
FEET = (116, 230)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32), "muzzle": (46, 34)}

G0 = (4.0, -15.0, 26.0)     # carbine grip at rest
FORE = 10.0
LENGTH = 32.0
ANT_BASE = (-15.0, 6.0, 46.0)
ANT_MID = (-17.0, 6.0, 66.0)
ANT_TOP = (-19.0, 6.0, 86.0)
HANDSET = "#2E3237"


def build(rig):
    M.skeleton(rig)
    M.legs(rig)
    # the radio set on his back (behind the torso)
    g = Geo().blob((-13.5, 1.0, 32.0), (6.6, 10.4, 12.4), p=3.4)
    rig.part("torso", g, team=True)
    g = Geo().blob((-13.5, -9.6, 34.0), (4.8, 1.4, 7.8), p=3.2)   # face panel
    rig.part("torso", g, M.GUNMETAL, finish="metal", outline=0.6)
    g = Geo()
    for x, z in ((-15.5, 37.0), (-11.5, 37.0)):
        g.lathe([(0, 0), (1.5, 0), (1.5, 1.2), (0, 1.4)], (x, -10.6, z), (x, -12.0, z), segs=12)
    rig.part("torso", g, M.KHAKI_LT, outline=0.4)
    g = Geo().sphere((-13.5, -10.8, 31.0), 1.3, cuts=3)
    rig.part("torso", g, glow="#E0508E", outline=0.5, outline_hex=M.SIGNAL)
    g = Geo().blob((-13.5, 1.0, 45.0), (5.4, 8.4, 1.6), p=3.0)   # lid
    rig.part("torso", g, M.OLIVE, outline=0.6)
    g = Geo().capsule((2.0, -10.4, 37.0), (-8.0, -9.4, 22.0), 1.5)  # strap
    rig.part("torso", g, M.KHAKI, outline=0.6)
    # antenna: base mount, two whip segments on follow-through, red-violet tip
    g = Geo().lathe([(1.8, 0), (1.6, 3.0), (0.9, 4.0)], ANT_BASE, (ANT_BASE[0], ANT_BASE[1], ANT_BASE[2] + 4), segs=10)
    rig.part("torso", g, M.GUNMETAL, finish="metal", outline=0.5)
    rig.secondary("ant1", "torso", ANT_BASE, ANT_MID, max_deg=10, gain=0.9)
    g = Geo().capsule(ANT_BASE, ANT_MID, 0.9, 0.75)
    rig.part("ant1", g, M.STEEL, finish="metal", outline=0.5)
    rig.secondary("ant2", "ant1", ANT_MID, ANT_TOP, max_deg=16, gain=1.3)
    g = Geo().capsule(ANT_MID, ANT_TOP, 0.7, 0.55)
    rig.part("ant2", g, M.STEEL, finish="metal", outline=0.5)
    g = Geo().sphere(ANT_TOP, 1.6, cuts=3)
    rig.part("ant2", g, M.SIGNAL, outline=0.6)
    rig.track("antenna", "ant2", ANT_TOP)

    M.tunic(rig)
    M.head_ball(rig)
    M.face(rig, brow=M.HAIR, brow_angry=False, grin=True)
    g = Geo().blob((-6.0, 0, 46.0), (5.6, 9.8, 6.0), p=2.2)
    rig.part("head", g, M.HAIR, finish="hair")
    M.field_cap(rig, c=(1.0, 0, 56.5))
    # headphones: band over the cap, cup on the near ear
    g = Geo().capsule((0.0, -12.0, 50.0), (0.0, -7.0, 61.0), 1.1).capsule((0.0, -7.0, 61.0), (0.0, 7.0, 61.0), 1.1)
    rig.part("head", g, M.GUNMETAL, finish="metal", outline=0.5)
    g = Geo().blob((-4.0, -11.6, 50.0), (3.0, 1.6, 3.6), p=2.4)
    rig.part("head", g, M.OLIVE_LT, finish="gloss", outline=0.6)

    for s in ("r", "l"):
        M.arm_parts(rig, s, fist=4.3)
    M.shoulders(rig)

    # the handset in the near hand (modelled pointing up from the fist) ...
    hx, hy, hz = 0.4, M.ARM_Y["r"] - 1.8, M.HAND_Z - 0.4
    rig.joint("handset", "hand_r", (hx, hy, hz))
    g = Geo().capsule((hx, hy - 1.0, hz - 5.0), (hx, hy - 1.0, hz + 5.0), 1.9)
    g.blob((hx + 1.4, hy - 1.0, hz + 6.6), (2.9, 2.2, 2.4), p=2.4)
    g.blob((hx + 1.4, hy - 1.0, hz - 6.6), (2.9, 2.2, 2.4), p=2.4)
    rig.part("handset", g, HANDSET, finish="gloss")
    # ... and hanging from the radio by its cord while he shoots
    rig.joint("handset_hang", "torso", (-8.0, -11.0, 22.0), hidden=True)
    g = Geo()
    pts = [(-11.0, 30.0), (-9.0, 26.0), (-11.0, 23.0), (-9.0, 20.0)]
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        g.capsule((ax, -11.5, az), (bx, -11.5, bz), 0.6, segs=6, rings=2)
    rig.part("handset_hang", g, HANDSET, outline=0.4)
    g = Geo().capsule((-8.5, -12.0, 12.5), (-8.0, -12.0, 19.5), 1.6)
    g.blob((-7.0, -12.0, 11.5), (2.2, 1.8, 2.0), p=2.4).blob((-7.0, -12.0, 20.5), (2.2, 1.8, 2.0), p=2.4)
    rig.part("handset_hang", g, HANDSET, finish="gloss", outline=0.6)

    # a short carbine
    rig.joint("gun", "torso", G0)
    muzzle = M.rifle(rig, "gun", G0, length=LENGTH, k=0.9, sling=False)
    g = Geo().blob((G0[0] + FORE, G0[1] + 2.4, G0[2] - 0.4), (3.4, 2.8, 3.2), p=2.4)
    rig.part("gun", g, M.SKIN)
    rig.track("muzzle", "gun", muzzle)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))
    M.muzzle_flash(rig, "gun", muzzle, size=1.4)
    rig.joint("smoke", "gun", muzzle, hidden=True)
    g = Geo()
    for dx, dz, r in ((5.0, 1.0, 3.2), (9.0, 3.0, 2.6), (2.5, 3.6, 2.2)):
        g.sphere((muzzle[0] + dx, muzzle[1] - 2, muzzle[2] + dz), r, cuts=4)
    rig.part("smoke", g, M.SMOKE, finish="dust", outline=0.8)


# -- poses ---------------------------------------------------------------------------------
def low(gx, gz, deg):
    """Carbine held low in the far hand only (at the fore-end); the near hand is free."""
    pose = {"gun": {"x": gx - G0[0], "z": gz - G0[2], "r": deg}}
    fx_, fz = gx + FORE * math.cos(math.radians(deg)), gz + FORE * math.sin(math.radians(deg))
    a, f = M.ik2(M.SH, (fx_ - 1.0, fz - 1.0))
    pose.update(M.arm("l", a, f))
    return pose


def talk(k=0.0):
    """Near hand holds the handset up at the mouth (k nods it)."""
    a, f = M.ik2(M.SH, (13.0 + k, 38.0 + k))
    return M.arm("r", a, f, w=104.0 + 6 * k, w_rest=90.0)


LOW = (6.0, 21.0, -24.0)


def _idle(f):
    c, lag = M.idle_wave(f)
    return merge(M.idle_body(f), low(LOW[0], LOW[1] + 0.5 * lag, LOW[2] + 2 * lag), talk(0.8 * c),
                 {"head": {"r": 3.0 * c}})


def _walk(f):
    pose, p, bl = M.walk_legs(f, lean=-6.0)
    return merge(pose, low(LOW[0], LOW[1] + 0.8 * bl, LOW[2] - 4.0 * bl), talk(0.5 * bl))


ATTACK_MS = [83, 83, 125, 83, 83, 125, 83, 125]
ATTACK_IMPACT = 3


def _attack(f):
    # 0 drop the handset, raise, 1 aim, 2 aim held (squint), 3 FIRE, 4 kick,
    # 5 hold, 6 lower and grab the handset, 7 back to the ear
    if f in (6, 7):
        pose = merge(low(LOW[0], LOW[1] + pick(f, [0] * 6 + [4, 1]), LOW[2] + pick(f, [0] * 6 + [18, 4])),
                     talk(pick(f, [0] * 6 + [-6, -1])))
    else:
        gx = pick(f, [5.5, 5.0, 5.0, 5.0, 2.5, 3.5])
        gz = pick(f, [29.0, 32.0, 32.5, 32.5, 34.0, 32.0])
        deg = pick(f, [16.0, 3.0, 0.0, 0.0, 16.0, 6.0])
        pose = M.hold2("gun", G0, FORE, gx, gz, deg)
        pose["handset"] = {"hide": True}
        pose["handset_hang"] = {"show": True, "r": pick(f, [-14, 8, 4, 0, -6, 3])}
    pose = merge(pose, {
        "body": dict(squash(pick(f, [0, -0.03, -0.05, 0.03, -0.1, -0.04, -0.02, 0])),
                     x=pick(f, [0, 0.5, 1.0, 0.0, -3.0, -1.5, -0.5, 0])),
        "torso": {"r": pick(f, [-2, -3, -4, -4, 5, 1, 0, 0])},
        "head": {"r": pick(f, [-2, -6, -9, -8, 4, -1, 0, 1]), "x": pick(f, [0, 0.8, 1.2, 1.2, 0, 0.4, 0, 0])},
        "thigh_r": {"r": pick(f, [4, 10, 12, 12, 8, 6, 4, 2])},
        "thigh_l": {"r": pick(f, [-4, -10, -12, -14, -14, -10, -6, -3])},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5), "s": pick(f, [1, 1, 1, 1, 0.9, 1.25, 1, 1]),
                  "x": pick(f, [0, 0, 0, 0, 0, 3, 0, 0]), "z": pick(f, [0, 0, 0, 0, 0, 2, 0, 0])},
    })
    if f in (2, 3):
        M.squint(pose)
    return pose


def _hit(f):
    return merge(low(LOW[0], LOW[1], LOW[2] + [16, 9, 3][f]), talk([-4, -2, -1][f]), M.hit_body(f))


def _die(f):
    pose = merge(low(LOW[0], LOW[1], LOW[2] + pick(f, [40, 30, 30])), fx.die_pose(f), M.die_limbs(f),
                 M.arm("r", pick(f, [60, 30, 10]), pick(f, [100, 60, 30]), w=pick(f, [160, 120, 100]), w_rest=90.0))
    if f in (0, 1):
        M.ko(pose)
    if f == 0:
        M.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
