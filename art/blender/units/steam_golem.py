"""Steam Golem: Industrial Age heavy (docs/design-lane-ages.md A17.10). Armoured mech melee, blunt,
~110 lu, large. Piston Punch: the first hit of each engagement deals x2 with 30 lu knockback.
Walker rig (A11): a hull on two legs.

Look (A17.12, Industrial palette): a squat, top-heavy riveted steam automaton. A big iron boiler
belly with copper bands, rows of rivets, a wide team armour band round the middle and a firebox
door whose grate glows warm; a small domed head with two round porthole eyes (warm glass) under a
heavy brow plate; a tall coal chimney on its back that puffs steam in the idle and walk (A17.12
"a chimney that puffs in idle"); stumpy iron legs with knee discs and wide flat feet; the near arm
an oversized piston ram ending in a huge riveted fist with a team knuckle plate, the far arm a
smaller clamp. A team pennant on a pole behind the chimney (the heavy's team cue). The walk is a
heavy 1 s stomp; the attack ("piston punch with a steam burst") cocks the ram back, holds, fires
the piston out with a smear and slams the fist home (held impact, sparks, a burst of steam from the
elbow valve), then retracts. Heavy melee timing (retime.HEAVY_MELEE).
"""
import math

from ageborn_art import fx, retime
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "steam_golem"
NAME = "Steam Golem"
HEIGHT_LU = 110
YAW_DEG = -16.0
CANVAS = (360, 300)
FEET = (132, 280)
ANCHORS = {"head": (4, 106), "hitCenter": (0, 58)}

# the heavy melee timing (5 wind-up, 3 held impact, 4 recovery frames) keys off this set
retime.HEAVY_MELEE.add(SLUG)

HIP_Z = 36.0
THIGH, SHIN = 17.0, 19.0
ANK_REST = HIP_Z - THIGH - SHIN
ANKLE_H = 5.0
LEG_Y = {"r": -13.0, "l": 13.0}
STANCE_X = {"r": 7.0, "l": -7.0}

BOILER = (0.0, 0.0, 58.0)
SH_R = (4.0, -27.0, 72.0)
SH_L = (2.0, 25.0, 72.0)
UP_L, FORE_L = 13.0, 15.0
FIST = (SH_R[0], SH_R[1], SH_R[2] - UP_L - FORE_L - 10.0)
CHIMNEY = (-16.0, 6.0, 80.0)

SMEAR = {"joint": "ram", "inner": (FIST[0], FIST[1] - 2, FIST[2] + 5),
         "outer": (FIST[0], FIST[1] - 2, FIST[2] - 9), "color": I.IRON_LT, "taper": 0.5,
         "start": 0.3, "behind": 6.0}


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, HIP_Z))
    rig.joint("hull", "hips", BOILER)
    for s in ("r", "l"):
        I.walker_leg(rig, s, (0.0, LEG_Y[s], HIP_Z), THIGH, SHIN)

    # legs: stumpy iron columns, copper knee discs, wide riveted feet
    for s in ("r", "l"):
        y = LEG_Y[s]
        sy = 1 if s == "r" else -1
        kz = HIP_Z - THIGH
        g = Geo().capsule((0, y, HIP_Z), (0, y, kz), 6.4, 5.8)
        rig.part(f"thigh_{s}", g, I.IRON_DK, finish="metal")
        g = Geo().blob((1.0, y - 1.0 * sy, HIP_Z - 6.0), (7.4, 6.8, 7.0), p=2.8)
        rig.part(f"thigh_{s}", g, team=True)
        g = Geo().lathe([(0, -3.4), (5.4, -3.2), (5.8, 0), (5.4, 3.2), (0, 3.4)], (1.0, y, kz), (1.0, y - sy, kz),
                        segs=18)
        rig.part(f"shin_{s}", g, I.COPPER, finish="metal", outline=0.8)
        g = Geo().capsule((0, y, kz), (0, y, ANK_REST + 1.0), 5.8, 6.8)
        rig.part(f"shin_{s}", g, I.IRON, finish="metal")
        g = Geo()
        I.rivets(g, [(4.6, y - 3.8 * sy, kz - 6.0), (5.4, y - 3.4 * sy, kz - 12.0)], r=0.9)
        rig.part(f"shin_{s}", g, I.IRON_LT, finish="metal", outline=0)
        a = ANK_REST
        g = Geo().blob((3.6, y, a - 2.6), (11.8, 8.2, 3.4), p=3.4, taper=(1.0, 0.85))
        rig.part(f"foot_{s}", g, I.IRON_DK, finish="metal")
        g = Geo()
        I.rivets(g, [(dx, y - 8.2 * sy, a - 2.4) for dx in (-4.0, 2.0, 8.0)], r=0.9)
        rig.part(f"foot_{s}", g, I.BRASS_LT, finish="metal", outline=0)
    rig.track("_foot", "foot_r", (3.6, LEG_Y["r"], ANK_REST - 5.0))

    # the boiler belly: iron barrel, copper bands, team armour band, firebox with a glowing grate
    hx, hy, hz = BOILER
    g = Geo().blob((0, 0, hz), (25.0, 23.0, 24.0), p=2.6, taper=(0.86, 0.94))
    rig.part("hull", g, I.IRON, finish="metal")
    g = Geo().blob((0.3, 0, hz - 1.0), (25.6, 23.6, 24.4), p=2.6, taper=(0.86, 0.94))
    g.clip((0, 0, hz - 12.0), (0, 0, -1)).clip((0, 0, hz + 4.0), (0, 0, 1))
    rig.part("hull", g, team=True)
    g = Geo()
    for z in (hz + 8.0, hz - 16.0):
        g.blob((0.3, 0, z), (25.4 * (0.93 if z < hz else 0.99), 23.4, 1.6), p=2.6)
    rig.part("hull", g, I.COPPER, finish="metal", outline=0.6)
    # rivet rows along the top and bottom bands (front half, facing the camera)
    g = Geo()
    for z in (hz + 11.0, hz - 19.0):
        rr = 24.6 if z > hz else 21.8
        for a in range(-150, -20, 18):
            t = math.radians(a)
            g.sphere((rr * math.cos(t) * 1.0, rr * 0.93 * math.sin(t), z), 1.1, cuts=2)
    rig.part("hull", g, I.IRON_LT, finish="metal", outline=0)
    # firebox door on the belly front with a warm grate
    g = Geo().lathe([(0, 0), (9.6, 0), (10.4, 1.6), (9.8, 3.0), (0, 3.2)], (20.4, -10.0, hz - 6.0), (23.6, -13.4, hz - 6.0),
                    segs=22)
    rig.part("hull", g, I.COAL_LT, finish="metal", outline=0.8)
    rig.joint("fire", "hull", (23.8, -13.6, hz - 6.0))
    g = Geo()
    g.blob((23.2, -13.2, hz - 6.0), (1.2, 7.4, 7.4), p=2.2, rot=(0, 0, -43))
    rig.part("fire", g, "#4A3A33", outline=0)
    g = Geo()
    for dz in (-4.0, 0.0, 4.0):
        g.blob((24.0, -14.2, hz - 6.0 + dz), (1.0, 6.2 - abs(dz) * 0.6, 1.3), p=3.0, rot=(0, 0, -43))
    rig.part("fire", g, glow=I.EMBER, outline=0)
    # pressure gauge on the chest
    g = Geo().lathe([(0, 0), (3.2, 0), (3.4, 1.2), (0, 1.6)], (14.0, -17.4, hz + 14.0), (15.6, -19.0, hz + 14.6),
                    segs=16)
    rig.part("hull", g, I.BRASS, finish="metal", outline=0.6)
    g = Geo().blob((15.8, -19.4, hz + 14.8), (0.5, 2.4, 2.4), p=2.2, rot=(0, 0, -45))
    rig.part("hull", g, I.CREAM, outline=0.3)
    # the chimney on the back and the pennant pole behind it
    cx, cy, cz = CHIMNEY
    g = Geo()
    I_cyl = [(4.4, 0), (4.6, 2.0), (4.0, 20.0), (5.8, 22.0), (6.2, 26.0), (5.0, 27.0), (3.6, 26.4)]
    g.lathe(I_cyl, (cx, cy, cz), (cx - 3.0, cy, cz + 27.0), segs=20)
    rig.part("hull", g, I.COAL_LT, finish="metal")
    g = Geo().lathe([(5.2, -1.0), (5.5, 0), (5.2, 1.0)], (cx - 1.0, cy, cz + 9.0), (cx - 1.1, cy, cz + 10.0), segs=18)
    rig.part("hull", g, I.COPPER, finish="metal", outline=0.5)
    I.pennant(rig, "hull", (cx - 10.0, cy + 8.0, cz - 4.0), 38.0, length=20.0, w=11.0, max_deg=18)
    I.steam_puff(rig, "hull", (cx - 3.0, cy - 3.0, cz + 31.0), size=1.5, name="puff")
    I.steam_puff(rig, "hull", (cx - 4.0, cy - 3.0, cz + 38.0), size=1.1, name="puff2")

    # head: a small riveted dome sunk between the shoulders, porthole eyes under a brow plate
    rig.joint("head", "hull", (8.0, 0, hz + 22.0))
    g = Geo().blob((8.0, 0, hz + 26.0), (12.0, 11.4, 10.0), p=2.3)
    g.clip((8.0, 0, hz + 20.0), (0, 0, -1))
    rig.part("head", g, I.IRON_LT, finish="metal")
    g = Geo().blob((13.0, -1.0, hz + 30.0), (8.6, 10.8, 2.4), p=3.0, rot=(0, -8, 0))
    rig.part("head", g, I.IRON_DK, finish="metal")
    g = Geo().sphere((6.0, 0, hz + 36.4), 2.4, cuts=3)
    rig.part("head", g, I.COPPER, finish="metal", outline=0.5)
    for yy in (-5.8, 3.8):
        g = Geo().lathe([(0, 0), (4.2, 0), (4.6, 1.3), (0, 1.5)], (17.4, yy, hz + 25.6), (19.2, yy - 0.4, hz + 25.6),
                        segs=16)
        rig.part("head", g, I.BRASS, finish="metal", outline=0.6)
    rig.joint("eyes", "head", (19.6, 0, hz + 25.6))
    g = Geo()
    for yy in (-5.8, 3.8):
        g.blob((19.4, yy - 0.5, hz + 25.6), (0.8, 3.2, 3.2), p=2.2)
    rig.part("eyes", g, glow=I.EMBER, outline=0)
    rig.joint("eyes_x", "head", (19.6, 0, hz + 25.6), hidden=True)
    g = Geo()
    for yy in (-5.8, 3.8):
        g.capsule((19.6, yy - 2.2, hz + 27.8), (19.6, yy + 1.4, hz + 23.4), 0.8)
        g.capsule((19.6, yy - 2.2, hz + 23.4), (19.6, yy + 1.4, hz + 27.8), 0.8)
    rig.part("eyes_x", g, I.COAL, outline=0)
    g = Geo().blob((18.6, -1.0, hz + 19.2), (2.4, 7.0, 1.6), p=3.0)   # grille mouth
    rig.part("head", g, I.COAL, outline=0.5)

    # far arm: a smaller clamp
    rig.joint("arm_l", "hull", SH_L)
    rig.joint("fore_l", "arm_l", (SH_L[0], SH_L[1], SH_L[2] - UP_L))
    x, y, z = SH_L
    g = Geo().sphere((x, y, z), 7.6, cuts=4)
    rig.part("arm_l", g, team=True)
    g = Geo().capsule((x, y, z), (x, y, z - UP_L), 4.2)
    rig.part("arm_l", g, I.IRON_DK, finish="metal")
    g = Geo().capsule((x, y, z - UP_L), (x, y, z - UP_L - FORE_L), 6.0, 5.2)
    g.lathe([(2.4, 0), (1.8, 4.0), (0, 7.0)], (x + 2.6, y, z - UP_L - FORE_L), (x + 5.0, y, z - UP_L - FORE_L - 7.0), segs=10)
    g.lathe([(2.4, 0), (1.8, 4.0), (0, 7.0)], (x - 2.6, y, z - UP_L - FORE_L), (x - 4.0, y, z - UP_L - FORE_L - 7.5), segs=10)
    rig.part("fore_l", g, I.IRON, finish="metal")

    # near arm: shoulder dome (team), piston cylinder, ram, riveted fist with a team knuckle plate
    rig.joint("arm_r", "hull", SH_R)
    rig.joint("fore_r", "arm_r", (SH_R[0], SH_R[1], SH_R[2] - UP_L))
    rig.joint("ram", "fore_r", (SH_R[0], SH_R[1], SH_R[2] - UP_L - FORE_L))
    x, y, z = SH_R
    g = Geo().blob((x, y - 1.0, z + 1.0), (10.4, 9.0, 9.2), p=2.4)
    rig.part("arm_r", g, team=True)
    g = Geo()
    I.rivets(g, [(x + 9.0 * math.cos(math.radians(a)), y - 8.0, z + 1.0 + 8.0 * math.sin(math.radians(a)))
                 for a in (20, 60, 100, 140)], r=1.0)
    rig.part("arm_r", g, I.IRON_LT, finish="metal", outline=0)
    g = Geo().capsule((x, y, z), (x, y, z - UP_L), 6.2, 5.8)
    rig.part("arm_r", g, I.IRON_DK, finish="metal")
    g = Geo().lathe([(0, -3.6), (5.6, -3.4), (6.0, 0), (5.6, 3.4), (0, 3.6)], (x, y, z - UP_L), (x, y - 1, z - UP_L),
                    segs=18)
    rig.part("fore_r", g, I.COPPER, finish="metal", outline=0.7)
    g = Geo().lathe([(7.8, 0), (8.6, 1.2), (8.6, FORE_L - 3.0), (7.8, FORE_L - 1.0), (5.0, FORE_L)],
                    (x, y, z - UP_L - 1.0), (x, y, z - UP_L - FORE_L - 1.0), segs=20)
    rig.part("fore_r", g, I.IRON, finish="metal")
    g = Geo().capsule((x + 5.0, y - 4.0, z - UP_L - 4.0), (x + 7.0, y - 4.0, z - UP_L - 1.0), 1.4)   # valve
    rig.part("fore_r", g, I.BRASS, finish="metal", outline=0.5)
    fz = z - UP_L - FORE_L
    g = Geo().capsule((x, y, fz + 6.0), (x, y, fz - 3.0), 3.0)
    rig.part("ram", g, I.IRON_LT, finish="metal", outline=0.8)
    g = Geo().blob((x, y, fz - 10.0), (13.4, 11.6, 9.6), p=3.4)
    rig.part("ram", g, I.IRON_DK, finish="metal")
    g = Geo()
    for dx in (-7.5, -2.5, 2.5, 7.5):   # knuckles
        g.blob((x + dx, y - 1.0, fz - 19.0), (2.5, 10.4, 2.8), p=2.6)
    rig.part("ram", g, I.IRON, finish="metal", outline=0.6)
    g = Geo().blob((x, y - 11.8, fz - 10.0), (11.0, 1.4, 7.0), p=3.2)
    rig.part("ram", g, team=True, outline=0.7)
    g = Geo()
    I.rivets(g, [(x + dx, y - 13.4, fz - 10.0 + dz) for dx in (-7.6, 7.6) for dz in (-4.6, 4.6)], r=1.1)
    rig.part("ram", g, I.BRASS_LT, finish="metal", outline=0)
    rig.track("fist", "ram", FIST)
    I.fuse_spark(rig, "ram", (x, y - 3.0, fz - 22.0), size=2.6, name="sparks", seed=2, hidden=True)
    I.steam_puff(rig, "fore_r", (x + 8.0, y - 4.0, z - UP_L - 2.0), size=1.6, name="steam")


# -- poses ---------------------------------------------------------------------------------
def legs(foot_r, foot_l, hips=(0.0, 0.0)):
    pose = {}
    for s, (fx_, lift) in (("r", foot_r), ("l", foot_l)):
        tgt = (fx_ - hips[0], ANKLE_H + lift - hips[1])
        pose.update(I.leg_ik(s, (0.0, HIP_Z), tgt, THIGH, SHIN, knee_fwd=True))
    pose["hips"] = {"x": hips[0], "z": hips[1]}
    return pose


def arms(ra, rf, la=-100.0, lf=-60.0, ram=0.0):
    return merge(I.arm("r", ra, rf), I.arm("l", la, lf), {"ram": {"z": -ram}})


REST_ARMS = arms(-100, -35, -90, -40)
CROUCH = 6.0


def _stand(bob=0.0, dx=0.0):
    return legs((STANCE_X["r"], 0.0), (STANCE_X["l"], 0.0), (dx, CROUCH + bob))


def _idle(f):
    c, lag = I.idle_wave(f)
    return merge(_stand(1.0 * c), REST_ARMS, {
        "hull": {"r": 1.0 * c, "z": 0.4 * lag},
        "head": {"r": -1.5 * lag},
        "arm_r": {"r": 3.0 * lag}, "arm_l": {"r": 2.5 * lag},
        "puff": {"show": f in (2, 3), "s": pick(f, [1, 1, 0.8, 1.1]), "z": pick(f, [0, 0, 0, 3])},
        "puff2": {"show": f in (3, 0), "s": pick(f, [1.2, 1, 1, 0.9]), "z": pick(f, [4, 0, 0, 0])},
        "fire": {"s": pick(f, [1.0, 0.9, 1.05, 0.95])},
    })


WALK_MS = [125] * 8
STRIDE = 27.5          # 2 x 27.5 lu per 1 s cycle = 55 lu/s (sim speed 55)


def _walk(f):
    xr, lr, _ = I.walker_cycle(f, 8, STRIDE, 10.0)
    xl, ll, _ = I.walker_cycle(f, 8, STRIDE, 10.0, phase=0.5)
    bob = [-3.0, -1.0, 1.0, 0.0, -3.0, -1.0, 1.0, 0.0][f]
    lag = [0.0, -3.0, -1.0, 1.0, 0.0, -3.0, -1.0, 1.0][f]
    p = 2 * math.pi * f / 8
    return merge(legs((xr, lr), (xl, ll), (0.0, CROUCH + bob)), REST_ARMS, {
        "hull": dict(r=-3.0 + 1.5 * math.cos(2 * p), rz=3.5 * math.sin(p), z=-0.3 * lag),
        "head": {"r": 1.2 * lag},
        "arm_r": {"r": -10 * math.cos(p) + 1.0 * lag}, "fore_r": {"r": 5 * math.cos(p)},
        "arm_l": {"r": 10 * math.cos(p)},
        "puff": {"show": f in (0, 1, 4, 5), "x": pick(f, [0, -3, 0, 0, 0, -3, 0, 0]),
                 "s": pick(f, [0.8, 1.1, 1, 1, 0.8, 1.1, 1, 1])},
        "puff2": {"show": f in (1, 5), "x": -5.0},
    })


def _attack(f):
    # 0-1 cock the ram back and twist, 2 held extreme, 3 smear (piston fires out),
    # 4 held impact: full reach, hull lunges, sparks and a steam burst; 5-7 retract
    ra = pick(f, [-130, -160, -170, -40, 0, -2, -50, -95])
    rf = pick(f, [-110, -150, -160, -20, 0, -4, -45, -60])
    ram = pick(f, [0, 0, 0, 8, 14, 12, 4, 0])
    pose = merge(_stand(pick(f, [-1, -3, -2, 0, -4, -3, -1, 0]), pick(f, [-1, -3, -4, 2, 6, 5, 2, 0])),
                 arms(ra, rf, pick(f, [-90, -80, -70, -110, -130, -125, -110, -100]),
                      pick(f, [-50, -40, -30, -70, -90, -85, -70, -60]), ram), {
        "hull": dict(squash(pick(f, [-0.03, -0.07, 0.04, 0.03, -0.08, -0.05, -0.02, 0.0])),
                     r=pick(f, [4, 9, 12, -6, -12, -10, -5, -1]),
                     rz=pick(f, [6, 12, 14, -4, -8, -6, -2, 0])),
        "sparks": {"show": f == 4},
        "steam": {"show": f in (4, 5, 6), "s": pick(f, [1, 1, 1, 1, 0.9, 1.2, 1.4, 1]),
                  "z": pick(f, [0, 0, 0, 0, 0, 2, 4, 0])},
        "puff": {"show": f in (2, 5, 6), "s": pick(f, [1, 1, 1.2, 1, 1, 1.3, 1.5, 1])},
        "fire": {"s": pick(f, [1.0, 1.1, 1.2, 1.0, 0.9, 1.0, 1.0, 1.0])},
    })
    if f == 3:
        pose.setdefault("ram", {})["sz"] = 1.3
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(_stand(-2.0 * a, -3.0 * a), REST_ARMS, {
        "hull": dict(squash(-0.06 * a), r=9 * a), "arm_r": {"r": 12 * a}, "arm_l": {"r": 10 * a},
        "puff": {"show": f == 0},
    })


def _die(f):
    pose = merge(legs((STANCE_X["r"] + pick(f, [6, 10, 10]), 0.0), (STANCE_X["l"] - 4, 0.0),
                      (pick(f, [-4, -6, -6]), CROUCH + pick(f, [2, -8, -12]))),
                 arms(-60, -10, -40, 10), {
        "body": {"r": pick(f, [10, 6, 3]), "sz": pick(f, [1.04, 0.8, 0.6]),
                 "sx": pick(f, [0.97, 1.15, 1.25])},
        "hull": {"r": pick(f, [16, 22, 22])},
        "sparks": {"show": f == 0},
        "steam": {"show": True, "s": pick(f, [1.2, 1.6, 1.8])},
        "puff": {"show": True, "s": pick(f, [1.2, 1.5, 1.7])},
        "fire": {"s": pick(f, [0.8, 0.5, 0.3])},
    })
    if f in (0, 1):
        pose.update({"eyes": {"hide": True}, "eyes_x": {"show": True}})
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR, durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
