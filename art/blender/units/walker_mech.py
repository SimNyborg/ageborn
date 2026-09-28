"""Walker Mech: Future Age heavy (DESIGN A5.6). Armoured mech melee with Reach (60 lu), blunt
damage, ~112 lu, large. Walker rig (A11): hull on two IK legs.

Look (A11, Future palette): a chunky reverse-jointed walker. A rounded white hull with team
side plates and roof, a charcoal belly, a wide mint canopy visor with two bright "eyes", a
magenta vent strip, and an antenna with a team pennant (the heavy's redundant team cue, with
follow-through). The near arm is an oversized piston ram ending in a big white hammer-fist
with a team knuckle plate: it reads "reach" from across the lane. The far arm is a smaller
claw. Legs are bird-like (knees bend back) with wide clawed feet that plant without sliding.
The walk is a heavy stomp (1 s cycle, hull dips on contact); the attack pulls the ram back,
holds, then fires the piston out to full reach with a smear, steam and an impact burst.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_future as F
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "walker_mech"
NAME = "Walker Mech"
HEIGHT_LU = 120
YAW_DEG = -20.0
CANVAS = (372, 300)
FEET = (132, 280)
ANCHORS = {"head": (6, 116), "hitCenter": (0, 78)}

HIP_Z = 50.0
THIGH, SHIN = 27.0, 34.0
ANK_REST = HIP_Z - THIGH - SHIN      # the leg is modelled straight down
ANKLE_H = 7.0                        # ankle height when the foot is flat on the ground
LEG_Y = {"r": -12.0, "l": 12.0}
STANCE_X = {"r": 8.0, "l": -8.0}     # planted foot x at rest

HULL = (0.0, 0.0, 74.0)
SH_R = (6.0, -25.0, 80.0)            # near shoulder (ram arm)
SH_L = (4.0, 22.0, 80.0)             # far shoulder (claw)
UP_L, FORE_L = 16.0, 18.0
FIST = (SH_R[0], SH_R[1], SH_R[2] - UP_L - FORE_L - 6.0)

SMEAR = {"joint": "ram", "inner": (FIST[0], FIST[1] - 2, FIST[2] + 4),
         "outer": (FIST[0], FIST[1] - 2, FIST[2] - 8), "color": F.ARMOR, "taper": 0.5,
         "start": 0.3, "behind": 6.0}


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, HIP_Z))
    rig.joint("hull", "hips", HULL)
    for s in ("r", "l"):
        F.walker_leg(rig, s, (0.0, LEG_Y[s], HIP_Z), THIGH, SHIN)

    # legs: charcoal thighs with a white armour shell, knee discs, piston shins, clawed feet
    for s in ("r", "l"):
        y = LEG_Y[s]
        kz = HIP_Z - THIGH
        g = Geo().capsule((0, y, HIP_Z), (0, y, kz), 4.6, 3.8)
        rig.part(f"thigh_{s}", g, F.SUIT)
        g = Geo().blob((1.6, y - 1.2 * (1 if s == "r" else -1), HIP_Z - 8.0), (6.0, 5.4, 9.0), p=2.8,
                       taper=(0.75, 1.05))
        rig.part(f"thigh_{s}", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
        g = Geo().lathe([(0, -3.6), (5.6, -3.4), (6.0, 0), (5.6, 3.4), (0, 3.6)], (0, y, kz), (0, y + 1, kz), segs=18)
        rig.part(f"shin_{s}", g, F.GUNMETAL, finish="metal")
        g = Geo().capsule((0, y, kz), (0, y, ANK_REST), 3.6, 3.0)
        rig.part(f"shin_{s}", g, F.SUIT)
        g = Geo().capsule((2.6, y - 2.0 * (1 if s == "r" else -1), kz - 4.0), (2.2, y, ANK_REST + 8.0), 2.2, 1.8)
        rig.part(f"shin_{s}", g, F.STEEL, finish="metal", outline=0.8)
        g = Geo().blob((-1.4, y, kz - 13.0), (4.4, 5.0, 10.0), p=2.8, taper=(0.8, 1.15))
        rig.part(f"shin_{s}", g, team=True)
        a = ANK_REST
        g = Geo().blob((4.0, y, a - 3.8), (11.5, 7.2, 3.6), p=3.0, taper=(1.0, 0.8))
        g.blob((-6.0, y, a - 3.4), (4.4, 4.6, 3.0), p=2.8)
        rig.part(f"foot_{s}", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
        g = Geo()
        for dy in (-4.6, 0.0, 4.6):
            g.lathe([(2.2, 0), (1.6, 2.4), (0, 4.6)], (14.0, y + dy, a - 5.0), (18.6, y + dy, a - 5.8), segs=10)
        rig.part(f"foot_{s}", g, F.GUNMETAL, finish="metal", outline=0.8)
        g = Geo().sphere((0, y, a), 3.6, cuts=4)
        rig.part(f"foot_{s}", g, F.GUNMETAL, finish="metal")
    rig.track("_foot", "foot_r", (4.0, LEG_Y["r"], ANK_REST - 7.0))

    # hull: charcoal belly, white shell, team side plate and roof, canopy visor, vents
    hx, hy, hz = HULL
    g = Geo().blob((0, 0, 60.0), (17.0, 15.0, 9.0), p=2.6)
    rig.part("hull", g, F.SUIT)
    g = Geo().blob((0, 0, 76.0), (25.0, 20.0, 17.0), p=3.0, taper=(0.9, 1.0))
    rig.part("hull", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((0.5, 0, 76.4), (25.6, 20.6, 17.6), p=3.0, taper=(0.9, 1.0))
    g.clip((0, 0, 72.0), (0, 0, -1)).clip((0, 0, 79.0), (0, 0, 1))   # team band round the hull
    g.blob((-4.0, -20.4, 64.0), (12.0, 2.0, 3.6), p=3.2)   # skirt plate
    rig.part("hull", g, team=True)
    g = Geo().blob((-3.0, 0, 92.4), (15.0, 3.4, 2.2), p=3.0)       # roof stripe
    rig.part("hull", g, team=True, outline=0.7)
    g = Geo().blob((20.2, -2.0, 77.0), (6.0, 16.0, 5.2), p=3.4, rot=(0, -10, 0))
    rig.part("hull", g, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    rig.joint("eyes", "hull", (25.0, -2.0, 77.0))
    g = Geo().blob((25.0, -8.0, 77.6), (1.4, 2.8, 2.4), p=3.0).blob((25.4, 1.6, 77.6), (1.4, 2.8, 2.4), p=3.0)
    g.blob((24.6, -3.2, 75.0), (1.0, 11.0, 0.7), p=3.0)
    rig.part("eyes", g, glow=F.MINT, outline=0)
    rig.joint("eyes_x", "hull", (25.0, -2.0, 77.0), hidden=True)
    g = Geo()
    for y in (-8.0, 1.6):
        g.capsule((25.6, y - 2.0, 79.6), (25.6, y + 2.0, 75.6), 0.9)
        g.capsule((25.6, y - 2.0, 75.6), (25.6, y + 2.0, 79.6), 0.9)
    rig.part("eyes_x", g, glow=F.MINT, outline=0)
    g = Geo()
    for z in (66.0, 69.5):
        g.blob((-6.0, -20.8, z), (9.0, 0.8, 0.9), p=3.0)
    rig.part("hull", g, glow=F.MAGENTA, outline=0)
    g = Geo().blob((-22.0, 0, 80.0), (6.0, 12.0, 9.0), p=3.4)   # engine pack
    rig.part("hull", g, F.SUIT, finish="gloss")
    g = Geo()
    for y in (-6.0, 0.0, 6.0):
        g.capsule((-28.2, y, 76.0), (-28.2, y, 85.0), 1.5)
    rig.part("hull", g, glow=F.MINT, outline=0.8, outline_hex=F.SUIT)
    # antenna and team pennant
    g = Geo().capsule((-14.0, 8.0, 90.0), (-16.0, 8.0, 112.0), 1.1)
    rig.part("hull", g, F.GUNMETAL, outline=0.8)
    g = Geo().sphere((-16.0, 8.0, 112.5), 1.9, cuts=3)
    rig.part("hull", g, glow=F.MAGENTA, outline=0.8, outline_hex=F.MAGENTA)
    rig.secondary("pennant", "hull", (-15.6, 8.0, 109.0), (-34.0, 8.0, 104.0), max_deg=18, gain=1.2)
    g = Geo().slab([(-15.6, 110.0), (-36.0, 106.5), (-15.4, 100.0)], 8.0, 1.6)
    rig.part("pennant", g, team=True, outline=0.8)

    # far arm: a smaller claw
    rig.joint("arm_l", "hull", SH_L)
    rig.joint("fore_l", "arm_l", (SH_L[0], SH_L[1], SH_L[2] - UP_L))
    x, y, z = SH_L
    g = Geo().sphere((x, y, z), 6.4, cuts=4)
    rig.part("arm_l", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().capsule((x, y, z), (x, y, z - UP_L), 3.6)
    rig.part("arm_l", g, F.SUIT)
    g = Geo().capsule((x, y, z - UP_L), (x, y, z - UP_L - 13.0), 3.4, 3.0)
    g.lathe([(2.0, 0), (1.4, 4.0), (0, 7.0)], (x + 2.0, y, z - UP_L - 13.0), (x + 5.0, y, z - UP_L - 19.0), segs=10)
    g.lathe([(2.0, 0), (1.4, 4.0), (0, 7.0)], (x - 2.0, y, z - UP_L - 13.0), (x - 4.0, y, z - UP_L - 19.5), segs=10)
    rig.part("fore_l", g, F.GUNMETAL, finish="metal")

    # near arm: the piston ram with a hammer fist (telescoping `ram` joint in the forearm)
    rig.joint("arm_r", "hull", SH_R)
    rig.joint("fore_r", "arm_r", (SH_R[0], SH_R[1], SH_R[2] - UP_L))
    rig.joint("ram", "fore_r", (SH_R[0], SH_R[1], SH_R[2] - UP_L - FORE_L))
    x, y, z = SH_R
    g = Geo().blob((x, y - 1.0, z + 1.0), (9.6, 8.0, 8.4), p=2.6)
    rig.part("arm_r", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((x, y - 1.4, z + 1.0), (10.0, 8.4, 8.8), p=2.6)
    g.clip((x, y, z + 3.5), (0, 0, 1)).clip((x, y, z - 2.5), (0, 0, -1))
    rig.part("arm_r", g, team=True, outline=0.7)
    g = Geo().capsule((x, y, z), (x, y, z - UP_L), 4.6, 4.2)
    rig.part("arm_r", g, F.SUIT)
    g = Geo().lathe([(0, -3.6), (5.6, -3.4), (6.0, 0), (5.6, 3.4), (0, 3.6)], (x, y, z - UP_L), (x, y + 1, z - UP_L),
                    segs=18)
    rig.part("fore_r", g, F.GUNMETAL, finish="metal")
    g = Geo().blob((x, y, z - UP_L - 9.0), (6.4, 6.0, 10.0), p=3.2)    # cylinder housing
    rig.part("fore_r", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((x + 5.8, y - 2.0, z - UP_L - 9.0), (1.0, 2.0, 6.0), p=3.0)
    rig.part("fore_r", g, glow=F.MAGENTA, outline=0)
    fz = z - UP_L - FORE_L
    g = Geo().capsule((x, y, fz + 8.0), (x, y, fz - 2.0), 2.8)          # piston rod
    rig.part("ram", g, F.STEEL, finish="metal", outline=0.8)
    g = Geo().blob((x, y, fz - 7.0), (8.6, 8.0, 6.6), p=3.6)            # hammer fist
    rig.part("ram", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((x, y - 0.2, fz - 12.8), (8.2, 7.6, 1.8), p=3.4)     # team knuckle plate
    g.blob((x, y - 8.0, fz - 7.0), (6.6, 1.2, 4.6), p=3.2)
    rig.part("ram", g, team=True, outline=0.7)
    rig.track("fist", "ram", FIST)
    F.sparks(rig, "ram", (x, y - 3.0, fz - 15.0), size=2.2, name="sparks", rays=8, seed=1)
    F.puff(rig, "fore_r", (x - 5.0, y - 2.0, z - UP_L - 4.0), size=1.4, name="steam", spread=1.3)


# -- poses ---------------------------------------------------------------------------------
def legs(foot_r, foot_l, hips=(0.0, 0.0)):
    """Feet (x, lift) targets in character space for both legs, given the hips offset."""
    pose = {}
    for s, (fx_, lift) in (("r", foot_r), ("l", foot_l)):
        tgt = (fx_ - hips[0], ANKLE_H + lift - hips[1])
        pose.update(F.leg_ik(s, (0.0, HIP_Z), tgt, THIGH, SHIN, knee_fwd=False))
    pose["hips"] = {"x": hips[0], "z": hips[1]}
    return pose


def arms(ra, rf, la=-100.0, lf=-60.0, ram=0.0):
    """Ram arm (upper, fore directions, ram extension) and claw arm."""
    return merge(F.arm("r", ra, rf), F.arm("l", la, lf), {"ram": {"z": -ram}})


REST_ARMS = arms(-100, -25, -85, -25)
CROUCH = 8.0    # the hips are lifted this far above their modelled height


def _stand(bob=0.0, dx=0.0):
    return legs((STANCE_X["r"], 0.0), (STANCE_X["l"], 0.0), (dx, CROUCH + bob))


def _idle(f):
    c, lag = F.idle_wave(f)
    return merge(_stand(1.2 * c), REST_ARMS, {
        "hull": {"r": 1.2 * c, "z": 0.4 * lag},
        "arm_r": {"r": 3.0 * lag}, "arm_l": {"r": 2.5 * lag},
    })


WALK_MS = [125] * 8   # a 1 s heavy stomp
STRIDE = 25.0         # natural speed 2 x 25 / 1 s = 50 lu/s (sim speed 50)


def _walk(f):
    xr, lr, _ = F.walker_cycle(f, 8, STRIDE, 14.0)
    xl, ll, _ = F.walker_cycle(f, 8, STRIDE, 14.0, phase=0.5)
    bob = [-3.0, -1.0, 1.2, 0.0, -3.0, -1.0, 1.2, 0.0][f]
    lag = [0.0, -3.0, -1.0, 1.2, 0.0, -3.0, -1.0, 1.2][f]
    p = 2 * math.pi * f / 8
    return merge(legs((xr, lr), (xl, ll), (0.0, CROUCH + bob)), REST_ARMS, {
        "hull": dict(r=-3.0 + 1.5 * math.cos(2 * p), rz=3.0 * math.sin(p), z=-0.3 * lag),
        "arm_r": {"r": -8 * math.cos(p) + 1.0 * lag}, "fore_r": {"r": 4 * math.cos(p)},
        "arm_l": {"r": 8 * math.cos(p)},
    })


def _attack(f):
    # 0-1 pull the ram back and twist (squash), 2 held extreme, 3 smear (ram firing out),
    # 4 held impact: full reach, hull lunges, sparks and steam; 5-7 retract
    ra = pick(f, [-130, -160, -170, -40, 2, 0, -50, -95])
    rf = pick(f, [-100, -150, -165, -20, 0, -4, -40, -60])
    ram = pick(f, [0, 0, 0, 10, 16, 14, 4, 0])
    pose = merge(_stand(pick(f, [-1, -3, -2, 0, -4, -3, -1, 0]), pick(f, [-1, -3, -4, 2, 6, 5, 2, 0])),
                 arms(ra, rf, pick(f, [-90, -80, -70, -110, -130, -125, -110, -100]),
                      pick(f, [-50, -40, -30, -70, -90, -85, -70, -60]), ram), {
        "hull": dict(squash(pick(f, [-0.03, -0.07, 0.04, 0.03, -0.08, -0.05, -0.02, 0.0])),
                     r=pick(f, [4, 9, 12, -6, -12, -10, -5, -1]),
                     rz=pick(f, [6, 12, 14, -4, -8, -6, -2, 0])),
        "sparks": {"show": f == 4},
        "steam": {"show": f in (4, 5, 6), "s": pick(f, [1, 1, 1, 1, 0.8, 1.1, 1.3, 1]),
                  "z": pick(f, [0, 0, 0, 0, 0, 2, 4, 0])},
    })
    if f == 3:
        pose.setdefault("ram", {})["sz"] = 1.3
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(_stand(-2.0 * a, -3.0 * a), REST_ARMS, {
        "hull": dict(squash(-0.06 * a), r=9 * a), "arm_r": {"r": 12 * a}, "arm_l": {"r": 10 * a},
    })


def _die(f):
    # the hull pitches back and down, legs buckle, then the hand-off squash
    pose = merge(legs((STANCE_X["r"] + pick(f, [6, 10, 10]), 0.0), (STANCE_X["l"] - 4, 0.0),
                      (pick(f, [-4, -6, -6]), CROUCH + pick(f, [2, -12, -16]))),
                 arms(-60, -10, -40, 10), {
        "body": {"r": pick(f, [10, 6, 3]), "sz": pick(f, [1.04, 0.8, 0.6]),
                 "sx": pick(f, [0.97, 1.15, 1.25])},
        "hull": {"r": pick(f, [16, 22, 22])},
        "sparks": {"show": f == 0},
    })
    if f in (0, 1):
        pose.update({"eyes": {"hide": True}, "eyes_x": {"show": True}})
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR,
             durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
