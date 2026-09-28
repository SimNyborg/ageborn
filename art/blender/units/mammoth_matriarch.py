"""Mammoth Matriarch: Stone Age Legendary siege heavy (DESIGN A5.2), quadruped rig (A11). ~196 lu.

Look (A11): a towering woolly mammoth with a high domed head and shoulder hump, a shaggy
fringe of long dark hair along the belly and legs, pillar legs with pale toenails, a long
trunk and two huge sweeping ivory tusks. She wears a big team caparison over her back
with a bone-bead hem and carries a wooden howdah with a team rim; two small cave-kid riders
(team tunics) sit in it, the front one hefting a rock (the riders' rocks leave from the
exported per-frame `muzzle` anchor, A14.2), and a tall team banner flies from the back of
the howdah (A11: heavies and ground Legendaries carry a pennant). The tail and banner
follow through. The attack is a stomp: rock back, rear up with the trunk raised (held,
trumpeting), a smeared crash down, a held impact with a big squash, and recovery; the
riders bounce and the front one throws.
"""
from ageborn_art import fx
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import Quad, walk4

SLUG = "mammoth_matriarch"
NAME = "Mammoth Matriarch"
HEIGHT_LU = 196
YAW_DEG = -10.0
CANVAS = (476, 444)
FEET = (220, 390)
ANCHORS = {"head": (0, 190), "hitCenter": (0, 90)}

FUR = "#7E6858"
FUR_DK = "#5F4F43"
SHAG = "#4A3D34"
SKIN_DK = "#6A5A4E"
NAIL = "#D9CDB2"
IVORY = "#EFE7D0"
WOOD = "#8A7560"
WOOD_DK = "#6A5846"
BONE = "#EDE3C8"
KID = "#E3C3A5"
KID_HAIR = "#4A3A30"
ROCK = "#9A948A"
EYE = "#F4EEDC"
PUPIL = "#221C19"
MOUTH = "#5A2E2E"

TUSK_TIP = (88.0, -14.0, 104.0)


def _leg(rig, name, p0, p1, front):
    x0, y, z0 = p0
    x1, _, z1 = p1
    col = FUR if y < 0 else FUR_DK
    g = Geo().capsule(p0, p1, 14.0 if front else 15.0, 11.5)
    rig.part(f"leg_{name}", g, col)
    g = Geo().capsule(p1, (x1 + 0.5, y, 8.0), 11.5, 11.0)
    g.lathe([(12.6, 0), (12.2, 2.5), (11.2, 7.0), (0, 8.0)], (x1 + 0.8, y, 0.2), (x1 + 0.8, y, 8.2), segs=18)
    rig.part(f"leg_{name}2", g, SKIN_DK if y < 0 else FUR_DK)
    # shaggy cuff over the foot
    g = Geo()
    for a in (-60, -20, 20, 60, 100, 150, 200, 250):
        import math
        dx, dy = 11.5 * math.cos(math.radians(a)), 11.5 * math.sin(math.radians(a))
        g.lathe([(3.2, 0), (0, -9.5)], (x1 + dx, y + dy, 22.0), segs=8)
    rig.part(f"leg_{name}2", g, SHAG, finish="hair", outline=0.8)
    if y < 0:
        g = Geo()
        for dx in (-5.0, 0.0, 5.0):
            g.blob((x1 + 6.5 + dx * 0.5, y - 10.8 + abs(dx) * 0.35, 3.0), (2.6, 1.4, 2.4), p=2.2)
        rig.part(f"leg_{name}2", g, NAIL, outline=0.6)


def _kid(rig, name, parent, x, z, throw=False):
    """A small cave-kid rider sitting in the howdah (waist up): team tunic, big head, arms."""
    rig.joint(name, parent, (x, 0, z))
    g = Geo().blob((x, 0, z + 9.0), (7.6, 7.0, 9.0), p=2.3, taper=(1.05, 0.9))
    rig.part(name, g, team=True)
    rig.joint(f"{name}_head", name, (x + 1, 0, z + 17.0))
    g = Geo().blob((x + 1.5, 0, z + 25.0), (8.0, 7.6, 8.0), p=2.25)
    g.blob((x + 9.2, -0.4, z + 24.0), (2.0, 1.8, 1.8), p=2.0)
    rig.part(f"{name}_head", g, KID)
    g = Geo().blob((x - 0.5, 0, z + 29.5), (8.2, 8.0, 5.2), p=2.2)
    g.blob((x - 5.8, 0, z + 25.0), (3.8, 7.2, 6.4), p=2.2)
    for (x0, z0), (x1, z1) in (((x - 1, z + 32), (x - 3, z + 38)), ((x + 3, z + 32), (x + 5, z + 37)),
                               ((x - 5, z + 31), (x - 10, z + 35))):
        g.capsule((x0, 0, z0), (x1, -1, z1), 2.6, 1.0)
    rig.part(f"{name}_head", g, KID_HAIR, finish="hair")
    for y in (-3.2, 2.8):
        g = Geo().blob((x + 7.6, y, z + 26.0), (2.2, 2.2, 2.8))
        rig.part(f"{name}_head", g, EYE, highlight=False)
        g = Geo().blob((x + 9.3, y - 0.3, z + 25.8), (0.9, 1.3, 1.5))
        rig.part(f"{name}_head", g, PUPIL, outline=0)
    g = Geo().blob((x + 8.8, -0.4, z + 21.2), (1.0, 2.6, 1.2), p=2.2)
    rig.part(f"{name}_head", g, MOUTH, outline=0, highlight=False)
    # near arm (throws for the front kid), far arm grips the rim
    rig.joint(f"{name}_arm", name, (x + 0.5, -7.5, z + 14.5))
    g = Geo().capsule((x + 0.5, -7.5, z + 14.5), (x + 6.0, -8.0, z + 7.5), 2.8, 2.4)
    g.blob((x + 7.0, -8.0, z + 6.3), (3.0, 2.8, 2.8), p=2.2)
    rig.part(f"{name}_arm", g, KID)
    if throw:
        rig.joint("rock", f"{name}_arm", (x + 7.5, -9.5, z + 7.5))
        g = Geo().blob((x + 8.0, -10.5, z + 9.0), (3.6, 3.2, 3.2), p=2.1)
        rig.part("rock", g, ROCK)
        rig.track("muzzle", f"{name}_arm", (x + 8.0, -10.5, z + 9.0))


def build(rig):
    global SMEAR
    q = Quad(rig, trunk=(0, 76), front_x=28.0, back_x=-28.0, leg_y=13.0, shoulder_z=76.0,
             hip_z=72.0, knee_z=36.0, hock_z=36.0, knee_dx=1.0, hock_dx=-1.0, far_dx=-5.0)
    for name in ("fl", "bl", "fr", "br"):
        p0, p1, _ = q.legs[name]
        _leg(rig, name, p0, p1, name[0] == "f")

    # body: barrel, shoulder hump, sloping haunch
    g = Geo().blob((0, 0, 84), (40, 25, 29), p=2.3)
    g.blob((18, 0, 104), (24, 22, 20), p=2.2)
    g.blob((-26, 0, 84), (18, 23, 24), p=2.2)
    rig.part("trunk", g, FUR)
    # shaggy fringe along the belly
    g = Geo()
    import math
    for i in range(11):
        x = -40 + 8 * i
        for y in (-22.0, -8.0, 8.0, 22.0):
            zb = 60 + 3 * math.cos(i)
            g.lathe([(4.2, 0), (0, -12.0 - 3 * ((i + int(y)) % 3))], (x, y * 0.95, zb + 4), segs=8)
    rig.part("trunk", g, SHAG, finish="hair")
    # team caparison over the back, a bone-bead hem
    g = Geo().blob((-3, 0, 96), (38, 26.6, 24), p=3.0, taper=(1.02, 0.95))
    g.clip((0, 0, 72.0), (0, 0, -1))
    g.clip((30.0, 0, 0), (1, 0, 0))
    g.clip((-38.0, 0, 0), (-1, 0, 0))
    for x in range(-34, 30, 8):
        g.lathe([(3.4, 0), (0, -6.0)], (x, -26.0, 72.2), segs=8)
    rig.part("trunk", g, team=True)
    g = Geo()
    for x in range(-34, 30, 8):
        g.sphere((x + 4, -26.6, 71.4), 1.8, cuts=2)
    rig.part("trunk", g, BONE, outline=0.6)
    # howdah: wooden platform with a team rim and corner posts
    g = Geo().blob((-8, 0, 122), (26, 21, 5), p=3.4)
    rig.part("trunk", g, WOOD)
    g = Geo().lathe([(22.0, 0), (24.0, 0.4), (24.0, 7.0), (22.0, 7.4)], (-8, 0, 125.5), (-8, 0, 133.0),
                    segs=28, squash=(1.2, 0.95))
    rig.part("trunk", g, team=True)
    g = Geo()
    for x, y in ((18.0, -19.0), (-34.0, -19.0), (18.0, 19.0), (-34.0, 19.0)):
        g.capsule((x, y, 121), (x, y, 138), 2.0, 1.8).sphere((x, y, 139), 2.6, cuts=2)
    rig.part("trunk", g, WOOD_DK)
    # riders (sitting in the howdah)
    _kid(rig, "kid_b", "trunk", -22.0, 122.0)
    _kid(rig, "kid_f", "trunk", 4.0, 124.0, throw=True)
    # banner at the back of the howdah, streaming back
    g = Geo().capsule((-36, 8, 120), (-40, 8, 196), 2.2, 1.8).sphere((-40.2, 8, 197.5), 3.2, cuts=3)
    rig.part("trunk", g, WOOD)
    rig.secondary("banner", "trunk", (-39.6, 8, 192), (-70, 8, 180), max_deg=12, gain=1.2)
    pts = [(-39.6, 193.0), (-73.0, 188.0), (-61.0, 178.0), (-72.0, 166.0), (-39.4, 165.0)]
    g = Geo().slab(pts, 8.0, 2.0)
    rig.part("banner", g, team=True, outline=1.0)

    # neck, domed head, small ears, eye
    rig.joint("neck", "trunk", (34, 0, 98))
    rig.joint("head", "neck", (44, 0, 104))
    g = Geo().blob((38, 0, 100), (16, 21, 22), p=2.2)
    rig.part("neck", g, FUR)
    g = Geo().blob((50, 0, 112), (17, 17, 21), p=2.25, taper=(1.05, 0.9))
    g.blob((60, 0, 98), (10, 12, 12), p=2.2)
    rig.part("head", g, FUR)
    g = Geo()
    for i in range(6):                                    # hair tuft on the dome
        a = math.radians(40 + 18 * i)
        base = (48 + 10 * math.cos(a) - 4, 0, 118 + 12 * math.sin(a))
        g.capsule(base, (base[0] - 6, (i - 2.5) * 1.5, base[2] + 9), 3.0, 1.0)
    rig.part("head", g, SHAG, finish="hair")
    g = Geo().blob((40, -14, 106), (6.5, 3.4, 10), p=2.2, rot=(10, 10, 0))  # ear
    rig.part("head", g, FUR_DK, finish="hair")
    g = Geo().capsule((56.0, -14.2, 116.5), (63.0, -10.4, 113.0), 2.2, 1.7)
    rig.part("head", g, SHAG, finish="hair", outline=0.8)
    g = Geo().blob((58.4, -13.0, 110.4), (3.0, 1.8, 3.0))
    rig.part("head", g, EYE, highlight=False)
    g = Geo().blob((60.2, -13.8, 110.2), (1.3, 1.0, 1.9))
    rig.part("head", g, PUPIL, outline=0)
    # mouth (opens when trumpeting)
    rig.joint("mouth", "head", (58, 0, 88), hidden=True)
    g = Geo().blob((58.5, -3.0, 88.0), (5.0, 7.0, 3.6), p=2.2)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    # tusks: huge, sweeping forward, down, then up
    g = Geo()
    for y in (-1, 1):
        a = (58.0, 10.0 * y, 92.0)
        b = (70.0, 13.5 * y, 78.0)
        c = (84.0, 14.5 * y, 84.0)
        d = (TUSK_TIP[0], 13.0 * y, TUSK_TIP[2])
        g.capsule(a, b, 5.0, 4.4).capsule(b, c, 4.4, 3.4).capsule(c, d, 3.4, 0.8)
    rig.part("head", g, IVORY, finish="gloss")
    rig.track("tuskTip", "head", TUSK_TIP)
    SMEAR = {"joint": "head", "inner": (84.0, -14.5, 84.0), "outer": (TUSK_TIP[0] + 2, -14.0, TUSK_TIP[2] + 4),
             "color": IVORY, "taper": 0.35, "start": 0.2, "behind": 6.0}
    # trunk: three segments, curling forward at the tip
    rig.joint("trunk1", "head", (64, 0, 96))
    rig.joint("trunk2", "trunk1", (68, 0, 72))
    rig.joint("trunk3", "trunk2", (68, 0, 50))
    g = Geo().capsule((64, 0, 96), (68, 0, 72), 8.5, 7.0)
    rig.part("trunk1", g, FUR)
    g = Geo().capsule((68, 0, 72), (68, 0, 50), 7.0, 5.4)
    rig.part("trunk2", g, FUR)
    g = Geo().capsule((68, 0, 50), (71, 0, 38), 5.4, 4.4).capsule((71, 0, 38), (78, 0, 34), 4.4, 3.8)
    rig.part("trunk3", g, FUR)
    g = Geo()
    for z in (90, 82, 74, 66, 58):   # wrinkle rings
        x = 64 + (4 if z < 72 else 4 * (96 - z) / 24)
        g.lathe([(0, 0), (8.2 - (90 - z) * 0.06, 0.2), (8.2 - (90 - z) * 0.06, 1.0), (0, 1.2)],
                (x, 0, z), (x + 0.2, 0, z + 1), segs=16)
    rig.part("trunk1", g, FUR_DK, outline=0)

    # tail with a hair tuft
    rig.secondary("tail", "trunk", (-42, 0, 96), (-50, 0, 72), max_deg=14, gain=1.1)
    g = Geo().capsule((-42, 0, 96), (-48, 0, 78), 3.0, 2.2)
    g.lathe([(3.6, 0), (4.2, -4), (0, -12)], (-48.5, 0, 80), segs=10)
    rig.part("tail", g, SHAG, finish="hair")
    rig.track("_foot", "leg_fr2", (30.0, -13.0, 0.5))


SMEAR = None


# -- poses ---------------------------------------------------------------------------------
def _riders(lag, throw=None):
    """Rider bob one beat behind the body; `throw` = 0..1 winds the front kid's throw."""
    p = {"kid_b": {"z": 1.4 * lag}, "kid_f": {"z": 1.4 * lag},
         "kid_b_head": {"r": -3 * lag}, "kid_f_head": {"r": -3 * lag}}
    if throw is not None:
        p["kid_f_arm"] = {"r": throw}
    return p


def _idle(f):
    c = [-1.0, -0.45, 0.45, 1.0][f]
    lag = [-1.0, -1.0, -0.45, 0.45][f]
    return merge({
        "trunk": {"z": 1.6 * c},
        "body": squash(0.02 * c),
        "neck": {"r": -2.0 * lag}, "head": {"r": 2.0 * lag},
        "trunk1": {"r": 4 * lag}, "trunk2": {"r": 6 * lag}, "trunk3": {"r": 10 * lag},
    }, _riders(lag, throw=pick(f, [0, 20, 60, 90])))


def _walk(f):
    import math
    p = 2 * math.pi * f / 8
    lag = math.cos(4 * p - 1.2)
    return merge(walk4(f, fr=11.0, br=10.0, knee=36.0, hock=24.0, bob=2.2, nod=3.0, roll=1.2), {
        "trunk1": {"r": 6 * math.sin(2 * p)}, "trunk2": {"r": 8 * math.sin(2 * p - 0.6)},
        "trunk3": {"r": 12 * math.sin(2 * p - 1.2)},
    }, _riders(lag))


ATTACK_MS = [100, 125, 250, 42, 167, 125, 125, 125]


def _attack(f):
    # 0 rock back, 1 rear up, 2 held extreme: reared, trunk raised and trumpeting, riders
    # hold on and the front kid cocks his rock; 3 smear: crash down; 4 held impact: front
    # feet slam, big squash 0.85/1.15, head down, riders bounce, the kid throws; 5-7 settle.
    sq = pick(f, [-0.04, 0.03, 0.07, 0.03, -0.15, -0.07, -0.02, 0.0])
    pose = {
        "body": dict(squash(sq), x=pick(f, [-3.0, -5.0, -6.0, 2.0, 6.0, 5.0, 2.0, 0.0])),
        "trunk": {"r": pick(f, [4, 12, 18, 2, -5, -2, 0, 0]),
                  "z": pick(f, [-1.5, 2.0, 5.0, 0.0, -4.0, -2.0, -0.8, 0])},
        "neck": {"r": pick(f, [4, 8, 10, -4, -10, -6, -2, 0])},
        "head": {"r": pick(f, [2, 6, 8, -6, -10, -6, -2, 0])},
        "trunk1": {"r": pick(f, [10, 40, 70, 10, -10, -6, 0, 0])},
        "trunk2": {"r": pick(f, [10, 40, 60, 10, -8, -4, 0, 0])},
        "trunk3": {"r": pick(f, [10, 30, 40, 10, 20, 10, 4, 0])},
        "mouth": {"show": f in (1, 2, 3)},
        "leg_fr": {"r": pick(f, [-4, 20, 34, 10, -6, -2, 0, 0])},
        "leg_fr2": {"r": pick(f, [0, -30, -50, -20, 0, 0, 0, 0])},
        "leg_fl": {"r": pick(f, [-4, 16, 28, 8, -4, -2, 0, 0])},
        "leg_fl2": {"r": pick(f, [0, -26, -44, -16, 0, 0, 0, 0])},
        "leg_br": {"r": pick(f, [6, -10, -16, -4, 4, 2, 0, 0])},
        "leg_bl": {"r": pick(f, [6, -8, -14, -4, 4, 2, 0, 0])},
    }
    lag = pick(f, [0, -1, -1.5, 1.0, 3.0, -1.0, 0.5, 0])
    throw = pick(f, [0, 60, 110, 60, -40, -30, -10, 0])
    pose = merge(pose, _riders(lag, throw))
    pose["rock"] = {"hide": f in (4, 5)}
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge({
        "body": dict(squash(-0.06 * a), x=-4.0 * a),
        "trunk": {"r": 3 * a},
        "neck": {"r": 6 * a}, "head": {"r": 5 * a},
        "trunk1": {"r": 14 * a}, "trunk2": {"r": 10 * a},
    }, _riders(-a))


def _die(f):
    return merge(fx.die_pose(f), {
        "body": {"r": pick(f, [-12, -6, -2])},   # a 196 lu beast topples less than a man
        "trunk": {"r": pick(f, [8, 4, 2])},
        "neck": {"r": pick(f, [14, 8, 8])}, "head": {"r": pick(f, [8, -4, -4])},
        "trunk1": {"r": pick(f, [50, 30, 30])}, "trunk2": {"r": pick(f, [30, 20, 20])},
        "mouth": {"show": f == 0},
        "leg_fr": {"r": pick(f, [30, 14, 14])}, "leg_fl": {"r": pick(f, [24, 12, 12])},
        "leg_br": {"r": pick(f, [-16, -8, -8])}, "leg_bl": {"r": pick(f, [-12, -6, -6])},
        # the riders jump off (they become two summoned Pebblers, A5.2)
        "kid_f": {"z": pick(f, [16, 30, 30]), "x": pick(f, [10, 24, 24]), "hide": f == 2},
        "kid_b": {"z": pick(f, [14, 26, 26]), "x": pick(f, [-6, -20, -20]), "hide": f == 2},
    })


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=170),
        Clip("attack", 8, _attack, impact=4, smear=3, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
