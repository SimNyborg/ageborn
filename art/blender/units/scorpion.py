"""Scorpion: Bronze Age artillery (A17.9), vehicle rig. A bolt that pierces 3 targets, ~80 lu.

Look (A17.12): a wheeled torsion bolt-thrower. A plum carriage with a long trail and two
six-spoked wheels carries the weapon on a pivot: a long wooden stock, a big team-painted
torsion housing up front with aged-bronze washers and two swept bow arms, a taut string, a
heavy bolt with a polished head and sandstone fletching, and a windlass with a crank at the
back. A crewman in a leather cap and a team tunic stands behind it, hands on the crank. The
walk: he pushes it along (the wheels roll). The attack: crank, crank (the string winds back),
aim (held), release (the arms whip forward, the frame kicks and the bolt leaves at the
per-frame `muzzle`), a recoil bounce, and he cranks the next bolt into place.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_bronze as B
from ageborn_art import rigs_gunpowder as G
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "scorpion"
NAME = "Scorpion"
HEIGHT_LU = 76
YAW_DEG = -10.0
CANVAS = (440, 270)
FEET = (226, 246)
ANCHORS = {"head": (-20, 74), "hitCenter": (0, 32)}

WHEEL_R = 15.0
AXLE = (0.0, 0.0, WHEEL_R)
TRUN = (4.0, 0.0, 31.0)       # the weapon's pivot on the carriage
SZ = TRUN[2] + 4.0            # stock top (where the bolt lies)
HOUSING_X = 28.0
STRING_REST, STRING_DRAWN = 16.0, -14.0
BOLT_LEN = 40.0
WINCH = (-28.0, 0.0, TRUN[2] + 1.0)
CRANK_R = 5.0
CREW_X = -50.0
CREW_Y = 12.0
MS = 1.25                     # the machine is modelled small and scaled up about the ground
IDLE_ELEV, FIRE_ELEV = 4.0, 8.0


TIPS = {}


def _cheek(y):
    pts = [(12.0, 21.0), (12.0, 29.5), (5.0, 33.0), (-5.0, 32.0), (-40.0, 7.0), (-46.0, 3.0), (-45.0, 0.0),
           (-39.0, 0.5), (-7.0, 17.5)]
    return Geo().slab(pts, y, 3.0)


def build(rig):
    rig.joint("unit", "root", (0, 0, 0))
    rig.joint("machine", "unit", (0, 0, 0), scale=MS)
    rig.joint("cart", "machine", AXLE)
    rig.joint("frame", "cart", TRUN)
    rig.joint("wheel_l", "cart", (0.0, 12.0, WHEEL_R))
    rig.joint("wheel_r", "cart", (0.0, -12.0, WHEEL_R))
    G.wheel(rig, "wheel_l", (0.0, 12.0, WHEEL_R), WHEEL_R, 3.0, rim=B.WOOD_DK, spokes=B.WOOD, hub=B.AGED,
            team_felloe=False, n_spokes=6)

    # carriage: plum cheeks, axle, trail end, a team drape over the near cheek
    for y in (6.0, -6.0):
        rig.part("cart", _cheek(y), B.PLUM)
    g = Geo().capsule((0.0, -14.0, WHEEL_R), (0.0, 14.0, WHEEL_R), 2.0)
    g.capsule((-46.0, -7.5, 2.4), (-46.0, 7.5, 2.4), 1.8)
    rig.part("cart", g, B.WOOD_DK, finish="metal", outline=0.8)
    g = Geo().slab([(-4.0, 29.0), (-30.0, 11.0), (-30.0, 3.0), (-24.0, 6.0), (-19.0, 2.5), (-14.0, 7.0), (-9.0, 4.0),
                    (-4.0, 17.0)], -8.0, 1.4)
    rig.part("cart", g, team=True, outline=0.8)
    g = Geo().capsule((-30.5, -8.8, 11.5), (-4.0, -8.8, 29.5), 0.9)
    rig.part("cart", g, B.SAND_LT, outline=0.4)

    # the weapon on the pivot: stock, slider, torsion housing, arms, string, bolt, windlass
    tx, ty, tz = TRUN
    g = Geo().blob((0.0, 0, tz + 1.5), (36.0, 3.6, 2.6), p=4.0)       # stock
    rig.part("frame", g, B.WOOD)
    g = Geo().blob((4.0, 0, tz + 3.8), (30.0, 2.2, 0.8), p=4.0)       # slider groove
    rig.part("frame", g, B.WOOD_DK, outline=0.4)
    hx = HOUSING_X
    g = Geo().blob((hx, 0, tz + 3.0), (6.4, 13.0, 11.0), p=4.0)       # torsion housing (team)
    rig.part("frame", g, team=True)
    g = Geo()
    for y in (-8.5, 8.5):
        for z in (tz + 14.4, tz - 8.4):
            g.lathe([(0, -1.0), (3.4, -1.0), (3.6, 0.0), (3.4, 1.0), (0, 1.0)], (hx, y, z), (hx, y, z + 1.0), segs=16)
    rig.part("frame", g, B.AGED, finish="metal", outline=0.6)
    g = Geo()
    for y in (-8.5, 8.5):
        g.capsule((hx, y, tz - 7.6), (hx, y, tz + 13.6), 2.6)         # the skein bundles
    rig.part("frame", g, B.SAND_DK, finish="hair", outline=0.6)
    g = Geo().capsule((hx + 6.0, 0, tz - 4.0), (hx + 6.0, 0, tz + 10.0), 1.0)
    rig.part("frame", g, B.AGED_DK, finish="metal", outline=0.5)
    for s, y, dz in (("n", -1.0, -13.0), ("f", 1.0, 17.0)):
        rig.joint(f"bow_{s}", "frame", (hx, 8.5 * y, tz + 3.0))
        tip = (hx - 16.0, 21.0 * y, tz + 3.0 + dz)
        TIPS[s] = tip
        g = Geo().capsule((hx, 8.5 * y, tz + 3.0), tip, 2.6, 1.5)
        rig.part(f"bow_{s}", g, B.WOOD_DK)
        g = Geo().sphere(tip, 1.9, cuts=2)
        rig.part(f"bow_{s}", g, B.AGED, finish="metal", outline=0.5)
    # the string: two runs from the arm tips to the claw (the claw joint slides back)
    rig.joint("claw", "frame", (STRING_REST, 0, SZ))
    g = Geo()
    for k in ("n", "f"):
        g.capsule((STRING_REST, 0.0, SZ), TIPS[k], 0.5)
    rig.part("claw", g, B.LINEN, outline=0)
    g = Geo().blob((STRING_REST, 0, SZ), (2.2, 2.0, 1.6), p=3.0)
    rig.part("claw", g, B.AGED_DK, finish="metal", outline=0.5)
    # the bolt lies in the groove ahead of the claw (hidden when released)
    rig.joint("bolt", "claw", (STRING_REST, 0, SZ + 0.6))
    bz = SZ + 0.9
    g = Geo().capsule((STRING_REST, -0.5, bz), (STRING_REST + BOLT_LEN - 6.0, -0.5, bz), 0.9, segs=10)
    rig.part("bolt", g, B.WOOD, outline=0.5)
    g = Geo().lathe([(0, 0), (1.3, 0.6), (2.0, 2.4), (1.2, 5.0), (0, 7.0)], (STRING_REST + BOLT_LEN - 7.0, -0.5, bz),
                    (STRING_REST + BOLT_LEN, -0.5, bz), segs=10, squash=(1.0, 0.5))
    rig.part("bolt", g, B.BRONZE, finish="metal", outline=0.5)
    g = Geo().slab([(STRING_REST + 1.0, bz), (STRING_REST + 7.0, bz), (STRING_REST + 2.0, bz + 3.4)], -0.6, 0.8)
    g.slab([(STRING_REST + 1.0, bz), (STRING_REST + 7.0, bz), (STRING_REST + 2.0, bz - 3.4)], -0.6, 0.8)
    rig.part("bolt", g, B.SAND_LT, outline=0.4)
    # windlass at the back: a drum with a four-spoke crank on the near side
    wx, wy, wz = WINCH
    g = Geo().capsule((wx, -7.0, wz), (wx, 7.0, wz), 3.0)
    rig.part("frame", g, B.WOOD_DK, outline=0.6)
    rig.joint("crank", "frame", (wx, -8.5, wz))
    g = Geo()
    for i in range(4):
        a = math.pi / 2 * i
        g.capsule((wx, -8.5, wz), (wx + CRANK_R * math.cos(a), -8.5, wz + CRANK_R * math.sin(a)), 0.9)
    g.sphere((wx, -8.8, wz), 1.6, cuts=2)
    rig.part("crank", g, B.WOOD, outline=0.5)
    rig.track("muzzle", "frame", (STRING_REST + BOLT_LEN + 1.0, -0.5, bz))
    G.wheel(rig, "wheel_r", (0.0, -12.0, WHEEL_R), WHEEL_R, 3.0, rim=B.WOOD_DK, spokes=B.WOOD, hub=B.AGED,
            team_felloe=False, n_spokes=6)
    B.dust_puff(rig, "unit", (-14.0, -6.0, 2.0), size=0.9, name="dust")

    # the crewman behind the windlass
    rig.joint("crew", "unit", (0, 0, 0))
    G.skeleton(rig, parent="crew")
    B.sandal_legs(rig, greaves=False)
    g = Geo().blob((0.2, 0, 27.5), (10.2, 9.4, 11.4), p=2.4, taper=(1.1, 0.92))
    rig.part("torso", g, team=True)
    g = Geo().blob((0.6, 0, 15.0), (11.2, 10.2, 5.2), p=2.4, taper=(1.14, 0.92))
    rig.part("hips", g, team=True)
    g = Geo().blob((0.4, 0, 20.4), (11.0, 10.1, 1.8), p=3.2)
    rig.part("torso", g, B.LEATHER)
    B.head_ball(rig)
    B.face(rig, cx=12.0, cz=50.0, brow=B.HAIR, eye_r=(3.2, 3.0, 3.8))
    g = Geo().blob((11.0, 0, 41.2), (6.2, 8.6, 3.6), p=2.2)           # short beard
    g.blob((-5.6, 0, 46.4), (5.4, 9.2, 6.0), p=2.2)
    rig.part("head", g, B.HAIR, finish="hair")
    g = Geo().blob((1.2, 0, 55.4), (12.0, 11.6, 8.4), p=2.4)          # leather cap
    g.clip((0, 0, 54.0), (0, 0, -1))
    rig.part("head", g, B.LEATHER)
    g = Geo().blob((1.2, 0, 54.4), (12.6, 12.2, 1.4), p=2.8)
    rig.part("head", g, B.LEATHER_DK, outline=0.6)
    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.0, r1=3.6)
    rig.track("_foot", "shin_r", (3.1, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def gun(elev, recoil=0.0, hop=0.0, tilt=0.0, spin=0.0):
    return {"frame": {"r": elev}, "cart": {"x": -recoil, "z": hop, "r": tilt},
            "wheel_r": {"r": -spin}, "wheel_l": {"r": -spin}}


def crank_hands(ang, elev=IDLE_ELEV, crew_dx=0.0, recoil=0.0):
    """Both hands on the crank handle at angle `ang` (deg), solved from the crewman's shoulders."""
    wx, _, wz = WINCH
    e = math.radians(elev)
    # winch centre in character space (the frame pivots at TRUN)
    dx, dz = wx - TRUN[0], wz - TRUN[2]
    cx = (TRUN[0] + dx * math.cos(e) - dz * math.sin(e) - recoil) * MS
    cz = (TRUN[2] + dx * math.sin(e) + dz * math.cos(e)) * MS
    a = math.radians(ang)
    tx, tz = cx + CRANK_R * MS * math.cos(a), cz + CRANK_R * MS * math.sin(a)
    sx, sz = CREW_X + crew_dx, G.SHOULDER_Z
    tgt = (tx - sx, tz - sz + G.SHOULDER_Z)
    ar, fr = G.ik2((0.0, G.SHOULDER_Z), tgt)
    al, fl = G.ik2((0.0, G.SHOULDER_Z), (tgt[0] - 2.5, tgt[1]))
    return merge(G.arm("r", ar, fr), G.arm("l", al, fl), {"crank": {"r": -ang}})


def _crew(dx=0.0):
    return {"crew": {"x": CREW_X + dx, "y": CREW_Y}}


def _idle(f):
    c, lag = B.idle_wave(f)
    return merge(_crew(), B.idle_body(f), gun(IDLE_ELEV + 0.5 * c), crank_hands(-30.0), {"torso": {"r": -8}})


WALK_MS = 100


def _walk(f):
    pose, p, bl = B.walk_legs(f, lean=-16.0, stride=26.0)
    spin = 15.0 * f     # 6 spokes: a seamless 120 degree loop
    return merge(_crew(2.0), pose, gun(IDLE_ELEV, hop=0.4 * abs(math.sin(2 * p)), tilt=0.6 * math.sin(2 * p), spin=spin),
                 crank_hands(-60.0, crew_dx=2.0))


ATTACK_MS = [100, 100, 167, 83, 83, 100, 125, 125]
ATTACK_IMPACT = 3


def _attack(f):
    # 0-1 crank (the string winds back, squash), 2 aim (held, the frame lifts), 3 release: the
    # arms whip forward, the string snaps, the bolt leaves (projectile at `muzzle`), the frame
    # kicks; 4 recoil bounce with dust, 5-7 crank the next bolt into place
    elev = pick(f, [IDLE_ELEV + 1, IDLE_ELEV + 2, FIRE_ELEV, FIRE_ELEV + 3, FIRE_ELEV + 1, IDLE_ELEV + 2,
                    IDLE_ELEV + 1, IDLE_ELEV])
    recoil = pick(f, [0, 0, 0, 5.0, 7.0, 4.0, 1.5, 0])
    claw = pick(f, [-8.0, -18.0, -26.0, 0.0, 1.5, 0.0, -6.0, 0.0])
    ang = pick(f, [60.0, 170.0, 200.0, 200.0, 200.0, 280.0, 340.0, 330.0])
    pose = merge(_crew(pick(f, [0, 0, -1, -3, -3, -1, 0, 0])),
                 gun(elev, recoil, pick(f, [0, 0, 0, 1.5, 2.5, 0.5, 0, 0]), pick(f, [0, 0, 0, 3.0, 4.0, 1.0, 0, 0]),
                     pick(f, [0, 0, 0, -12, -24, -20, -8, 0])),
                 crank_hands(ang, elev, pick(f, [0, 0, -1, -3, -3, -1, 0, 0]), recoil), {
        "unit": dict(squash(pick(f, [-0.02, -0.04, -0.02, -0.1, 0.05, -0.02, 0, 0]))),
        "claw": {"x": claw},
        "bolt": {"hide": f in (3, 4), "s": 0.4 if f == 5 else 1.0},
        "bow_n": {"r": pick(f, [-3, -7, -10, 6, 3, 0, -3, 0])},
        "bow_f": {"r": pick(f, [3, 7, 10, -6, -3, 0, 3, 0])},
        "torso": {"r": pick(f, [-10, -14, -6, 8, 6, 0, -10, -8])},
        "head": {"r": pick(f, [0, -4, 4, 10, 8, 2, 0, 0])},
        "thigh_r": {"r": pick(f, [10, 16, 6, -6, -8, -4, 8, 4])},
        "thigh_l": {"r": pick(f, [-10, -18, -4, 8, 6, 2, -8, -4])},
        "dust": {"show": f in (4, 5), "s": pick(f, [1, 1, 1, 1, 0.8, 1.2, 1, 1])},
    })
    if f in (3, 4):
        B.yell(pose)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(_crew(-2.0 * a), B.hit_body(f), gun(IDLE_ELEV + 5 * a, recoil=3.0 * a, tilt=3.0 * a),
                 crank_hands(-30.0, crew_dx=-2.0 * a))


def _die(f):
    # the frame tips back off its pivot, the near wheel falls off, the crewman is flung
    pose = merge(_crew(), gun(IDLE_ELEV + pick(f, [16, 24, 26]), tilt=pick(f, [6, 4, 2]), spin=pick(f, [-30, -40, -40])), {
        "unit": dict(squash(pick(f, [0.05, -0.16, -0.28])), x=pick(f, [-3, -6, -7]), r=pick(f, [6, 4, 2])),
        "wheel_r": {"x": pick(f, [0, -4, -6]), "z": pick(f, [0, -3, -4]), "rx": pick(f, [0, 25, 40])},
        "crew": {"y": CREW_Y, "x": CREW_X - pick(f, [4, 10, 12]), "r": pick(f, [20, 40, 60]), "z": pick(f, [4, 2, 0])},
        "arm_r": {"r": pick(f, [120, 90, 90])}, "arm_l": {"r": pick(f, [150, 120, 120])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
        "bolt": {"hide": f >= 1},
    })
    if f == 0:
        B.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
