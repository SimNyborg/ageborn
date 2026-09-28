"""EMP Saboteur: Future Age Epic anti-mech melee (DESIGN A5.6). Shock baton (laser damage),
fast (speed 85), medium; EMP pulse ability (the game draws fx.emp_ring).

Look (A11, Future palette): a lean, low infiltrator, so the silhouette reads "fast and sneaky"
against the upright troopers. A pointed team hood with a tip that flicks behind (follow-
through), a white face mask with a single wide magenta goggle band, a long team scarf that
streams back, a charcoal stealth suit with a team chest harness and shoulder, and on the
back a tall EMP generator ring (white with a magenta core and fins) that flares when he
strikes. In the near hand an oversized shock baton with mint coils and a white tip. The run
is a forward-leaning sprint; the attack is a coiled lunge-jab with a mint smear and an
electric spark burst on the held impact while the back ring flashes.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_future as F
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "emp_saboteur"
NAME = "EMP Saboteur"
HEIGHT_LU = 70
CANVAS = (300, 250)
FEET = (130, 222)
ANCHORS = {"head": (6, 64), "hitCenter": (2, 30)}

HR = (0.0, F.ARM_Y["r"], F.HAND_Z)
BATON = 30.0
TIP = (HR[0], HR[1] - 1.0, HR[2] + 4.0 + BATON)
SMEAR = {"joint": "baton", "inner": (HR[0], HR[1] - 1.0, HR[2] + 4.0 + BATON * 0.45),
         "outer": TIP, "color": F.MINT, "taper": 0.4, "start": 0.35}
RING = (-19.0, 6.0, 47.0)


def build(rig):
    F.skeleton(rig, head=(2, 0, 37))
    F.legs(rig, thigh_r=4.3, knee_pad=False)
    rig.joint("baton", "hand_r", HR)

    # EMP generator ring on the back (behind everything): a white ring in the side plane
    rx, ry, rz = RING
    rig.joint("ring", "torso", RING)
    g = Geo().lathe([(9.5, -1.6), (12.5, -1.4), (13.2, 0), (12.5, 1.4), (9.5, 1.6), (8.8, 0)],
                    (rx, ry, rz), (rx, ry + 1, rz), segs=28)
    rig.part("ring", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(0, -1.0), (8.8, -0.9), (8.8, 0.9), (0, 1.0)], (rx, ry + 0.8, rz), (rx, ry + 1.8, rz), segs=28)
    rig.part("ring", g, F.SUIT)
    g = Geo().lathe([(0, -1.6), (4.6, -1.4), (4.6, 1.4), (0, 1.6)], (rx, ry - 0.2, rz), (rx, ry + 0.8, rz), segs=20)
    rig.part("ring", g, glow=F.MAGENTA, outline=1.0, outline_hex=F.SUIT)
    g = Geo()
    for a in (30, 150, 270):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.blob((rx + 14.8 * ca, ry, rz + 14.8 * sa), (2.6, 2.0, 2.6), p=2.6)
    rig.part("ring", g, team=True, outline=0.7)
    rig.joint("ring_flash", "ring", RING, hidden=True)
    g = Geo().lathe([(13.5, -0.5), (17.0, 0), (13.5, 0.5), (12.6, 0)], (rx, ry - 2.5, rz), (rx, ry - 3.5, rz), segs=30)
    rig.part("ring_flash", g, glow=F.MAGENTA_CORE, outline=1.2, outline_hex=F.MAGENTA)
    g = Geo().capsule((-8.0, 2.0, 32.0), (rx + 2.0, ry, rz - 6.0), 2.2)
    rig.part("torso", g, F.GUNMETAL, outline=0.6)

    # scarf streaming back from the neck (follow-through)
    rig.secondary("scarf", "torso", (-4.0, -2.0, 38.0), (-24.0, -2.0, 36.0), max_deg=18, gain=1.3)
    g = Geo().blob((-11.0, -2.0, 37.0), (8.0, 1.8, 2.4), p=2.4, rot=(0, 6, 0))
    g.blob((-19.5, -2.0, 35.8), (4.2, 1.5, 2.0), p=2.4, rot=(0, 14, 0))
    rig.part("scarf", g, F.MAGENTA)

    F.arm_parts(rig, "l", glove=F.SUIT_LT, bracer=True, r0=3.8, r1=3.4, fist=3.9)
    # torso: slim charcoal suit, team chest harness
    g = Geo().blob((0, 0, 28), (8.8, 8.8, 10.6), p=2.4, taper=(0.92, 1.05))
    g.blob((0, 0, 18.0), (8.2, 8.6, 4.0), p=2.6)
    rig.part("torso", g, F.SUIT)
    g = Geo().blob((1.5, 0, 31.5), (8.6, 9.4, 6.2), p=3.0, taper=(0.9, 1.0))
    rig.part("torso", g, team=True)
    g = Geo().capsule((9.0, -8.0, 36.0), (8.4, 7.5, 22.0), 1.6)
    rig.part("torso", g, F.GUNMETAL, outline=0.6)
    g = Geo().blob((0.4, 0, 21.4), (9.2, 9.4, 2.2), p=3.4)
    rig.part("torso", g, F.TRIM)
    g = Geo().blob((7.0, -7.4, 19.6), (2.8, 2.2, 3.0), p=3.2).blob((-2.0, -9.0, 19.8), (3.0, 2.0, 3.0), p=3.2)
    rig.part("torso", g, F.GUNMETAL, outline=0.6)
    g = Geo().blob((9.6, -2.0, 21.4), (1.2, 2.0, 1.2), p=2.4)
    rig.part("torso", g, glow=F.MAGENTA, outline=0)

    # head: white mask, magenta goggle band, team hood with a pointed tip
    g = Geo().blob((3.0, 0, 48.0), (10.2, 9.8, 10.6), p=2.4)
    g.blob((8.0, 0, 42.0), (6.6, 7.4, 4.4), p=2.4)
    rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((1.5, 0, 50.0), (11.4, 11.0, 12.0), p=2.3)
    g.clip((2.5, 0, 50.0), (1, 0, -0.35))          # open face: the hood covers crown and back
    g.clip((0, 0, 39.0), (0, 0, -1))
    rig.part("head", g, team=True)
    rig.secondary("hood_tip", "head", (-8.0, 0, 57.0), (-18.0, 0, 60.0), max_deg=16, gain=1.1)
    g = Geo().lathe([(6.0, 0), (4.6, 4.0), (2.4, 8.0), (0, 11.0)], (-7.0, 0, 56.0), (-18.0, 0, 60.5), segs=16)
    rig.part("hood_tip", g, team=True)
    g = Geo().blob((11.8, -0.4, 48.8), (2.8, 8.8, 2.9), p=3.6)
    rig.part("head", g, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    rig.joint("eyes", "head", (13.8, 0, 48.8))
    g = Geo().blob((14.0, -1.4, 48.8), (0.9, 6.4, 1.3), p=3.2)
    rig.part("eyes", g, glow=F.MAGENTA, outline=0)
    rig.joint("eyes_x", "head", (13.8, 0, 48.8), hidden=True)
    g = Geo()
    for y in (-4.6, 1.8):
        g.capsule((14.4, y - 1.7, 50.5), (14.4, y + 1.7, 47.1), 0.8)
        g.capsule((14.4, y - 1.7, 47.1), (14.4, y + 1.7, 50.5), 0.8)
    rig.part("eyes_x", g, glow=F.MAGENTA, outline=0)

    F.arm_parts(rig, "r", glove=F.SUIT_LT, r0=3.9, r1=3.5, fist=4.1)
    g = Geo().blob((0.4, -12.9, 37.4), (6.4, 5.4, 5.0), p=2.6)
    rig.part("arm_r", g, team=True)

    # the shock baton along +Z from the near fist
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy - 0.4, hz - 4.0), (hx, hy - 0.4, hz + BATON + 2.0), 1.8, 1.6)
    rig.part("baton", g, F.SUIT, finish="gloss", outline=0.8)
    g = Geo().blob((hx, hy - 0.4, hz + 4.6), (2.8, 2.8, 1.3), p=2.6)
    g.lathe([(2.6, 0), (3.0, 3.0), (2.4, 6.0), (0, 7.4)], (hx, hy - 0.4, hz + BATON - 3.0),
            (hx, hy - 0.4, hz + BATON + 4.4), segs=14)
    rig.part("baton", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo()
    for z in (hz + 10.0, hz + 14.5, hz + 19.0, hz + 23.5):
        g.lathe([(0, -0.6), (2.9, -0.5), (2.9, 0.5), (0, 0.6)], (hx, hy - 0.4, z), (hx, hy - 0.4, z + 1), segs=14)
    rig.part("baton", g, glow=F.MINT, outline=1.0, outline_hex=F.SUIT)
    rig.track("batonTip", "baton", TIP)
    rig.track("_foot", "shin_r", (3.2, -6.0, 0.5))
    # crackle round the baton head (idle flicker and strike), and the impact burst
    rig.joint("crackle", "baton", TIP, hidden=True)
    g = Geo()
    tx, ty, tz = TIP
    for a0 in (20, 140, 250):
        pts = []
        for i in range(4):
            a = math.radians(a0 + i * 22)
            r = 4.5 + (1.8 if i % 2 else 0)
            pts.append((tx + r * math.cos(a), ty - 2.0, tz - 2.0 + r * math.sin(a)))
        for p, q in zip(pts, pts[1:]):
            g.capsule(p, q, 0.55, segs=6, rings=2)
    rig.part("crackle", g, glow=F.MINT_CORE, outline=1.0, outline_hex=F.MINT)
    F.sparks(rig, "baton", (tx, ty - 1.0, tz + 2.0), size=1.4, name="sparks", rays=8, seed=2)


# -- poses ---------------------------------------------------------------------------------
def grip(sa, sf, sw, fa=-50.0, ff=-5.0):
    """Baton arm (upper, fore, baton directions) and the free far arm."""
    return merge(F.arm("r", sa, sf, sw, 90.0), F.arm("l", fa, ff))


# crouched, leaning in, baton held low and forward
STANCE = merge(grip(-70, -15, 38, -40, 10), {
    "hips": {"z": -1.6}, "torso": {"r": -12}, "head": {"r": 8},
    "thigh_r": {"r": 18}, "shin_r": {"r": -26}, "thigh_l": {"r": -8}, "shin_l": {"r": -18},
})


def _idle(f):
    c, lag = F.idle_wave(f)
    pose = merge(STANCE, F.idle_body(f, bob=1.0, sq=0.035, lean=1.2), {
        "arm_r": {"r": 3 * lag}, "hand_r": {"r": -4 * lag},
        "arm_l": {"r": -3 * lag}, "ring": {"r": 0.0},
    })
    pose["crackle"] = {"show": f in (1, 3), "r": 40 * f}
    return pose


def _walk(f):
    # a sprint: longer stride, higher knee lift, a deeper lean, arms pumping
    pose, p, bl = F.walk_legs(f, stride=38, lift=76, bob=3.0, lean=-16, sway=7)
    return merge(grip(-70, -15, 38, -40, 10), pose, {
        "head": {"r": 12},
        "arm_r": {"r": -18 * math.cos(p)}, "fore_r": {"r": 8 * math.sin(p)},
        "hand_r": {"r": 6 * bl},
        "arm_l": {"r": 26 * math.cos(p)}, "fore_l": {"r": 18 * max(0.0, math.cos(p))},
    })


def _attack(f):
    # 0-1 coil back (squash), 2 held extreme (baton drawn back high), 3 smear,
    # 4 held impact: lunge-jab, sparks, the back ring flashes; 5-7 recovery
    sa = pick(f, [-40, 10, 40, 0, -20, -25, -45, -62])
    sf = pick(f, [20, 70, 100, 20, -8, -10, -12, -14])
    sw = pick(f, [80, 120, 140, 40, -8, -4, 16, 32])
    pose = merge(grip(sa, sf, sw, pick(f, [-40, -55, -70, -30, 10, 0, -20, -35]),
                      pick(f, [10, -5, -20, 20, 30, 25, 15, 10])), {
        "body": dict(squash(pick(f, [-0.05, -0.10, 0.06, 0.05, -0.14, -0.08, -0.03, 0.0])),
                     x=pick(f, [-1, -3, -4, 3, 9, 8, 4, 1])),
        "hips": {"z": pick(f, [-2, -3.2, -2.2, -1.6, -3.2, -2.8, -2.0, -1.6])},
        "torso": {"r": pick(f, [-8, -2, 6, -18, -28, -24, -16, -12])},
        "head": {"r": pick(f, [8, 6, 4, 10, 14, 12, 9, 8])},
        "thigh_r": {"r": pick(f, [18, 10, 6, 30, 40, 36, 26, 18])},
        "shin_r": {"r": pick(f, [-26, -30, -30, -30, -34, -32, -28, -26])},
        "thigh_l": {"r": pick(f, [-8, 0, 4, -18, -30, -26, -16, -8])},
        "shin_l": {"r": pick(f, [-18, -24, -28, -14, -8, -10, -14, -18])},
        "sparks": {"show": f == 4},
        "crackle": {"show": f in (1, 2, 5), "r": 50 * f},
        "ring_flash": {"show": f in (4, 5), "s": pick(f, [1, 1, 1, 1, 1.0, 1.25, 1, 1])},
    })
    if f == 3:
        pose.setdefault("baton", {})["sz"] = 1.25
    if f in (3, 4):
        F.squint(pose, 0.55)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, F.hit_body(f), {"arm_r": {"r": 16 * a}, "hand_r": {"r": 12 * a},
                                         "arm_l": {"r": 26 * a}})


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), F.die_limbs(f), {
        "arm_r": {"r": pick(f, [50, 60, 60])}, "hand_r": {"r": pick(f, [50, 30, 30])},
        "arm_l": {"r": pick(f, [110, 80, 80])},
    })
    if f in (0, 1):
        F.ko(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR,
             durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
