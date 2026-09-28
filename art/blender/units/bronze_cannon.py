"""Bronze Cannon: Gunpowder Age artillery (DESIGN A5.4), vehicle rig (A11). Arcing
cannonball (proj.cannonball), splash, ~74 lu.

Look (A11, Gunpowder palette): a fat bronze field gun with reinforcing rings, a muzzle swell
and a cascabel knob, on a team-painted carriage (cheeks and wheel felloes) with iron
fittings and big spoked wheels. A gunner in a team coat and black tricorne stands behind
the breech with a linstock (a forked pole with a glowing match). He pushes the gun along
on the walk (the wheels roll with the distance), and the attack is the recoil clip: lower
the match, the vent fizzes (held), BOOM with a big flash and a burst of smoke, the whole gun
kicks back and bounces while the gunner covers his ear, then it rolls back into place. The
cannonball spawns at the exported per-frame `muzzle` anchor on the fire frame.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "bronze_cannon"
NAME = "Bronze Cannon"
HEIGHT_LU = 74
YAW_DEG = -10.0
CANVAS = (364, 212)
FEET = (150, 190)
ANCHORS = {"head": (-30, 72), "hitCenter": (0, 30), "muzzle": (46, 48)}

BRONZE = "#B09A76"
BRONZE_DK = "#8C7A5E"
BORE = "#1E1C1C"
HAIR = "#5A4B40"
MATCH = "#FFB870"

CREW_X = -44.0                 # the gunner stands this far behind the axle
WHEEL_R = 17.0
AXLE = (0.0, 0.0, WHEEL_R)
TRUN = (2.0, 0.0, 33.0)        # trunnions: the barrel's pivot
MUZ = (TRUN[0] + 44.0, 0.0, TRUN[2] + 0.5)
IDLE_ELEV, FIRE_ELEV = 10.0, 22.0
HR = (0.0, B.ARM_Y["r"], B.HAND_Z)


def _cheek(y):
    pts = [(9.0, 25.0), (9.5, 33.0), (4.0, 37.0), (-5.0, 36.0), (-40.0, 8.5), (-47.0, 3.0),
           (-46.0, 0.0), (-40.0, 0.5), (-8.0, 22.0)]
    return Geo().slab(pts, y, 3.2)


def build(rig):
    rig.joint("unit", "root", (0, 0, 0))
    rig.joint("cart", "unit", AXLE)
    rig.joint("barrel", "cart", TRUN)
    rig.joint("wheel_l", "cart", (0.0, 13.0, WHEEL_R))
    rig.joint("wheel_r", "cart", (0.0, -13.0, WHEEL_R))

    # far wheel first, then the carriage, the barrel and the near wheel
    B.wheel(rig, "wheel_l", (0.0, 13.0, WHEEL_R), WHEEL_R, 3.4)
    for y in (6.5, -6.5):
        rig.part("cart", _cheek(y), team=True)
    g = Geo().capsule((0.0, -15.0, WHEEL_R), (0.0, 15.0, WHEEL_R), 2.2)     # axle
    g.capsule((-6.0, -8.0, 27.0), (-6.0, 8.0, 27.0), 1.6)                  # transom
    g.capsule((-44.0, -8.0, 2.4), (-44.0, 8.0, 2.4), 1.8)                  # trail end
    rig.part("cart", g, B.IRON, finish="metal", outline=0.8)
    g = Geo().capsule((-42.0, -8.2, 4.4), (-28.0, -8.2, 14.0), 0.9)
    g.capsule((6.0, -8.2, 34.5), (-2.0, -8.2, 34.5), 1.1)
    rig.part("cart", g, B.IRON, finish="metal", outline=0.6)
    g = Geo().blob((-12.0, 0, 27.0), (5.0, 5.4, 2.2), p=2.6)              # quoin (elevation wedge)
    rig.part("cart", g, B.WOOD)
    # the barrel along +X from the trunnions: cascabel, breech rings, chase, muzzle swell
    tx, ty, tz = TRUN
    prof = [(0, -21.0), (2.4, -20.4), (2.6, -18.4), (1.6, -17.0), (6.6, -16.4), (8.6, -15.0),
            (8.8, -10.0), (8.2, -2.0), (7.4, 6.0), (6.4, 20.0), (5.8, 32.0), (6.0, 36.5),
            (7.4, 40.0), (7.6, 43.0), (6.8, 44.0), (4.0, 44.0), (0, 44.0)]
    prof = [(r * 1.15, z) for r, z in prof]
    g = Geo().lathe(prof, (tx, ty, tz), (tx + 1.0, ty, tz), segs=22)
    rig.part("barrel", g, BRONZE, finish="metal", outline_hex=BRONZE_DK)
    g = Geo()
    for x0, r in ((-12.5, 10.7), (-1.0, 10.0), (19.0, 8.1), (33.5, 7.6)):
        g.lathe([(r - 1.2, -1.0), (r, -0.6), (r, 0.6), (r - 1.2, 1.0)], (tx + x0, ty, tz),
                (tx + x0 + 1.0, ty, tz), segs=22)
    rig.part("barrel", g, BRONZE_DK, finish="metal", outline=0.6)
    g = Geo().lathe([(0, -0.2), (4.8, -0.2), (4.8, 0.4), (0, 0.4)], (tx + 44.1, ty, tz),
                    (tx + 45.0, ty, tz), segs=18)
    rig.part("barrel", g, BORE, outline=0)
    g = Geo().capsule((tx, -9.6, tz), (tx, 9.6, tz), 2.4)                    # trunnions
    g.blob((tx - 1.0, ty, tz + 8.2), (3.2, 1.6, 1.6), p=2.4)                  # dolphin handle
    rig.part("barrel", g, BRONZE_DK, finish="metal", outline=0.6)
    rig.track("muzzle", "barrel", MUZ)
    B.wheel(rig, "wheel_r", (0.0, -13.0, WHEEL_R), WHEEL_R, 3.4)

    # vent spark, muzzle flash (big) and the smoke cloud
    rig.joint("vent", "barrel", (tx - 13.0, ty, tz + 9.0), hidden=True)
    g = Geo().star((tx - 13.0, ty - 2.0, tz + 10.5), 4.2, 1.6, 1.2, points=6)
    rig.part("vent", g, glow=B.FIRE, outline=0)
    g = Geo().sphere((tx - 13.0, ty - 3.0, tz + 10.5), 1.8, cuts=3)
    rig.part("vent", g, glow="#FFFFFF", outline=0)
    B.muzzle_flash(rig, "barrel", MUZ, size=2.6)
    rig.joint("smoke", "barrel", MUZ, hidden=True)
    mx, my, mz = MUZ
    g = Geo()
    for dx, dz, r in ((6, 0, 9.0), (16, 3, 7.6), (0, 8, 6.8), (10, 10, 6.4), (24, -1, 5.6),
                      (-4, -2, 5.4), (19, 9, 5.0)):
        g.sphere((mx + dx, my - 4, mz + dz), r, cuts=4)
    rig.part("smoke", g, B.SMOKE, finish="dust", outline=0.8)

    # the gunner: a biped behind the breech
    rig.joint("crew", "unit", (0, 0, 0))
    B.skeleton(rig, parent="crew")
    B.legs(rig, B.CREAM, B.BLACK, stocking=B.BLACK)
    g = Geo().blob((0, 0, 28.0), (10.6, 9.8, 11.8), p=2.4, taper=(1.08, 0.94))
    g.blob((0, 0, 18.0), (10.2, 9.6, 4.6), p=2.6)
    rig.part("torso", g, team=True)
    g = Geo().blob((0.5, 0, 15.5), (11.4, 10.6, 7.0), p=2.6, taper=(1.12, 1.0))
    g.clip((0, 0, 9.6), (0, 0, -1))
    rig.part("hips", g, team=True)
    g = Geo().capsule((1.0, -10.2, 37.0), (10.4, 0.0, 22.0), 1.7).capsule((10.4, 0.0, 22.0), (2.0, 9.6, 18.5), 1.7)
    rig.part("torso", g, B.CREAM, outline=0.8)
    g = Geo().blob((1.2, 0, 37.2), (6.8, 7.2, 2.4), p=2.4)
    rig.part("torso", g, B.BLACK)
    B.head_ball(rig, center=(2, 0, 48.5), nose=(13.8, -0.6, 47.2), nose_r=(3.6, 3.2, 3.4))
    B.face(rig, cx=12.4, cz=49.8, brow=HAIR, eye_r=(3.3, 3.1, 4.0))
    B.moustache(rig, HAIR, cx=13.2, z=44.2, curl=False)
    g = Geo().blob((-6.2, 0, 47.5), (5.8, 10.0, 7.0), p=2.2)
    rig.part("head", g, HAIR, finish="hair")
    B.tricorn(rig, c=(1.0, 0, 58.5), team_cockade=True, scale=1.1)
    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, cuff=B.CREAM)
    # linstock in the near hand, modelled pointing up; the glowing match at the fork
    hx, hy, hz = HR
    g = Geo().capsule((hx + 0.4, hy - 0.6, hz - 12.0), (hx + 0.4, hy - 0.6, hz + 26.0), 1.1, 0.9)
    rig.part("hand_r", g, B.GUNWOOD, outline=0.8)
    g = Geo().capsule((hx + 0.4, hy - 0.6, hz + 26.0), (hx + 3.0, hy - 0.6, hz + 30.0), 0.8)
    g.capsule((hx + 0.4, hy - 0.6, hz + 26.0), (hx - 2.2, hy - 0.6, hz + 30.0), 0.8)
    rig.part("hand_r", g, B.IRON, finish="metal", outline=0.5)
    rig.joint("match", "hand_r", (hx + 3.0, hy - 0.6, hz + 30.5))
    g = Geo().sphere((hx + 3.0, hy - 1.2, hz + 30.8), 1.8, cuts=3)
    rig.part("match", g, glow=MATCH, outline=0.6, outline_hex=B.FIRE)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
CREW = {"crew": {"x": CREW_X}}


def gun(elev, recoil=0.0, hop=0.0, tilt=0.0, spin=0.0):
    """Barrel elevation, carriage recoil (lu back along x), hop (lu up), carriage tilt and a
    wheel spin (deg, clockwise = rolling forward)."""
    return {"barrel": {"r": elev}, "cart": {"x": -recoil, "z": hop, "r": tilt},
            "wheel_r": {"r": -spin}, "wheel_l": {"r": -spin}}


def linstock(a, f, w=90.0):
    return B.arm("r", a, f, w, w_rest=90.0)


STANCE = merge(CREW, linstock(-60, -10, 88), B.arm("l", -80, -40), {"torso": {"r": -2}})


def _idle(f):
    c, lag = B.idle_wave(f)
    return merge(STANCE, B.idle_body(f), gun(IDLE_ELEV + 0.6 * c), {
        "arm_r": {"r": 2 * lag}, "hand_r": {"r": -2 * lag},
        "match": {"s": [1.0, 0.8, 1.2, 0.9][f]},
    })


WALK_MS = 100


def _walk(f):
    # the gunner walks bent over, pushing the trail with both hands; the wheels roll
    pose, p, bl = B.walk_legs(f, lean=-16.0, stride=26.0)
    # distance per frame at the natural speed (strideLu 28.2 per 0.8 s cycle) -> deg per frame
    spin = math.degrees(28.2 / 8 / WHEEL_R) * f
    return merge(CREW, pose, gun(IDLE_ELEV, hop=0.5 * abs(math.sin(2 * p)), tilt=0.8 * math.sin(2 * p),
                                 spin=spin), linstock(-45, -30, 115), B.arm("l", -45, -30), {
        "match": {"s": [1.0, 0.8, 1.2, 0.9][f % 4]},
    })


ATTACK_MS = [83, 83, 167, 125, 83, 83, 125, 125]
ATTACK_IMPACT = 3


def _attack(f):
    # 0 raise the barrel and step in, 1 lower the match to the vent, 2 the vent fizzes
    # (held; the gunner leans away and covers his ear), 3 BOOM: flash, gun kicks back,
    # squash, 4 bounce with the smoke, 5 smoke billows, 6-7 roll back in
    elev = pick(f, [16, FIRE_ELEV, FIRE_ELEV, FIRE_ELEV + 4, FIRE_ELEV + 8, FIRE_ELEV + 2, FIRE_ELEV - 4, IDLE_ELEV + 2])
    recoil = pick(f, [0, 0, 0, 6.0, 12.0, 10.0, 5.0, 1.5])
    hop = pick(f, [0, 0, 0, 1.5, 3.0, 0.5, 0, 0])
    tilt = pick(f, [0, 0, 0, 4.0, 5.0, 1.0, -1.0, 0])
    spin = pick(f, [0, 0, 0, -20, -40, -34, -18, -4])
    pose = merge(CREW, gun(elev, recoil, hop, tilt, spin), {
        "unit": dict(squash(pick(f, [0, -0.02, -0.04, -0.1, 0.05, -0.02, 0, 0]))),
        "crew": {"x": pick(f, [2, 5, 3, -2, -4, -3, -1, 0])},
        "torso": {"r": pick(f, [-6, -14, 8, 14, 10, 6, 2, -2])},
        "head": {"r": pick(f, [0, -6, 10, 14, 10, 6, 2, 0])},
        "thigh_r": {"r": pick(f, [10, 16, 6, -6, -8, -4, 0, 0])},
        "thigh_l": {"r": pick(f, [-10, -18, -4, 8, 6, 2, 0, 0])},
        "vent": {"show": f in (1, 2), "s": pick(f, [1, 0.7, 1.2, 1, 1, 1, 1, 1])},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5, 6), "s": pick(f, [1, 1, 1, 1, 0.75, 1.1, 1.3, 1]),
                  "z": pick(f, [0, 0, 0, 0, 0, 3, 6, 0])},
    })
    pose.update(merge(linstock(pick(f, [-20, 20, 25, -10, -30, -40, -50, -58]),
                               pick(f, [20, 30, 25, 10, 0, -10, -10, -10]),
                               pick(f, [80, 20, 10, 110, 110, 100, 95, 90])),
                      B.arm("l", pick(f, [-80, -60, 60, 70, 70, 40, -30, -75]),
                            pick(f, [-40, -20, 130, 140, 140, 90, -30, -40]))))
    if f in (3, 4):
        B.yell(pose)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, B.hit_body(f), gun(IDLE_ELEV + 6 * a, recoil=3.0 * a, tilt=3.0 * a),
                 {"arm_r": {"r": 15 * a}})


def _die(f):
    d = fx.die_pose(f)
    pose = merge(STANCE, {"unit": d["body"]}, gun(IDLE_ELEV + pick(f, [20, 10, 5]),
                                                  tilt=pick(f, [8, 4, 2]), spin=pick(f, [-30, -40, -40])),
                 {"wheel_r": {"x": pick(f, [0, -4, -6]), "z": pick(f, [0, -3, -4]), "r": pick(f, [0, 30, 40])},
                  "arm_r": {"r": pick(f, [50, 40, 40])}, "arm_l": {"r": pick(f, [120, 90, 90])}},
                 B.die_limbs(f))
    pose["unit"]["r"] = d["body"]["r"] * 0.4   # a long vehicle: a smaller spin keeps it in frame
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
