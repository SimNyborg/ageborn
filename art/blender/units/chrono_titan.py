"""Chrono Titan: Future Age Legendary siege heavy (DESIGN A5.6). Armoured mech melee, cleave
(3 targets within 60 lu), blunt damage, Time Stop; huge (~190 lu). Walker rig (A11).
Rendered at 1.25x (Legendary budget, SPIKE_REPORT section 5).

Look (A11, Future palette): a towering clockwork knight-machine, twice the Walker Mech. A
broad white armoured chest with a big clock face (white dial, team rim, magenta hands that
tick through every clip, a mint hub), huge team pauldrons, a small heroic helm with a mint
visor and a tall team crest, charcoal joints, and a slowly turning gear halo on the back with
magenta ticks (it reads "time" at a glance and makes the silhouette unique). Legs are
humanoid (knees forward) with heavy boots that plant without sliding. In the near hand a
colossal chrono-blade: a charcoal spine with a white edge, a magenta energy edge line and a
gear-shaped guard. The walk is a slow, heavy stride (1.2 s); the attack is a huge overhead
cleave: a long held wind-up, a white-magenta smear, a held impact with a crouch and burst,
and a heavy recovery. The death buckles the knees and pitches forward before the hand-off.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_future as F
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "chrono_titan"
NAME = "Chrono Titan"
HEIGHT_LU = 192
YAW_DEG = -16.0
CANVAS = (600, 580)
FEET = (238, 552)
ANCHORS = {"head": (8, 186), "hitCenter": (0, 110)}

HIP_Z = 60.0
THIGH, SHIN = 32.0, 36.0
ANK_REST = HIP_Z - THIGH - SHIN
ANKLE_H = 11.0
LEG_Y = {"r": -15.0, "l": 15.0}
STANCE_X = {"r": 10.0, "l": -10.0}
LIFT = 8.0                          # the hips are raised this far above their modelled height

SHOULDER_Z = 130.0
ARM_Y = {"r": -36.0, "l": 34.0}
UPPER, LOWER = 24.0, 24.0
HAND = {s: (0.0, ARM_Y[s], SHOULDER_Z - UPPER - LOWER) for s in ("r", "l")}
BLADE = 84.0
GUARD = 10.0
TIP = (HAND["r"][0], HAND["r"][1] - 2.0, HAND["r"][2] + GUARD + BLADE)
SMEAR = {"joint": "blade", "inner": (TIP[0], TIP[1], TIP[2] - BLADE * 0.55), "outer": TIP,
         "color": F.MAGENTA, "taper": 0.35, "start": 0.3, "behind": 8.0}
HALO = (-30.0, 12.0, 140.0)
DIAL = (29.0, -9.0, 112.0)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, HIP_Z))
    rig.joint("torso", "hips", (0, 0, HIP_Z + 12.0))
    rig.joint("head", "torso", (4.0, 0, 144.0))
    for s in ("r", "l"):
        F.walker_leg(rig, s, (0.0, LEG_Y[s], HIP_Z), THIGH, SHIN)
        y = ARM_Y[s]
        rig.joint(f"arm_{s}", "torso", (0, y, SHOULDER_Z))
        rig.joint(f"fore_{s}", f"arm_{s}", (0, y, SHOULDER_Z - UPPER))
        rig.joint(f"hand_{s}", f"fore_{s}", HAND[s])
    rig.joint("blade", "hand_r", HAND["r"])

    # gear halo on the back (behind everything), turning
    hx, hy, hz = HALO
    rig.joint("halo", "torso", HALO)
    g = Geo().lathe([(26.0, -2.0), (31.0, -1.8), (31.0, 1.8), (26.0, 2.0)], (hx, hy, hz), (hx, hy + 1, hz), segs=40)
    rig.part("halo", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo()
    for i in range(12):
        a = math.radians(i * 30)
        g.blob((hx + 34.0 * math.cos(a), hy, hz + 34.0 * math.sin(a)), (4.6, 2.6, 4.2), p=3.0,
               rot=(0, -i * 30 + 90, 0))
    rig.part("halo", g, team=True, outline=0.8)
    g = Geo()
    for i in range(12):
        a = math.radians(i * 30 + 15)
        r0, r1 = 18.0, (25.0 if i % 3 == 0 else 22.0)
        g.capsule((hx + r0 * math.cos(a), hy - 1.0, hz + r0 * math.sin(a)),
                  (hx + r1 * math.cos(a), hy - 1.0, hz + r1 * math.sin(a)), 1.3, segs=8, rings=2)
    rig.part("halo", g, glow=F.MAGENTA, outline=0.8, outline_hex=F.SUIT)
    g = Geo().capsule((-10.0, 8.0, 135.0), (hx + 2.0, hy, hz - 2.0), 3.6)
    rig.part("torso", g, F.GUNMETAL, finish="metal")

    # far arm (behind the body)
    _arm(rig, "l")

    # legs: charcoal thighs with white plates, knee discs, white shin armour, heavy boots
    for s in ("r", "l"):
        y = LEG_Y[s]
        kz = HIP_Z - THIGH
        g = Geo().capsule((0, y, HIP_Z), (0, y, kz), 8.0, 6.6)
        rig.part(f"thigh_{s}", g, F.SUIT)
        g = Geo().blob((2.0, y - (1.5 if s == "r" else -1.5), HIP_Z - 12.0), (9.6, 8.8, 13.0), p=2.8,
                       taper=(0.8, 1.05))
        rig.part(f"thigh_{s}", g, team=True)
        g = Geo().lathe([(0, -5.0), (8.0, -4.8), (8.6, 0), (8.0, 4.8), (0, 5.0)], (0, y, kz), (0, y + 1, kz), segs=20)
        rig.part(f"shin_{s}", g, F.GUNMETAL, finish="metal")
        g = Geo().blob((4.6, y, kz + 1.0), (4.0, 7.0, 6.4), p=2.8)
        rig.part(f"shin_{s}", g, team=True, outline=0.8)
        g = Geo().capsule((0, y, kz), (0, y, ANK_REST + 4), 6.4, 5.6)
        rig.part(f"shin_{s}", g, F.SUIT)
        g = Geo().blob((2.4, y, kz - 17.0), (8.4, 9.0, 15.0), p=2.8, taper=(0.85, 1.1))
        rig.part(f"shin_{s}", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
        a = ANK_REST
        g = Geo().blob((5.0, y, a - 6.0), (17.0, 10.4, 6.4), p=3.2, taper=(1.0, 0.8))
        g.blob((-6.0, y, a - 3.0), (9.0, 9.6, 7.4), p=3.0)
        rig.part(f"foot_{s}", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
        g = Geo().blob((5.0, y, a - 10.6), (17.6, 11.0, 2.0), p=3.4)
        rig.part(f"foot_{s}", g, F.SUIT)
    rig.track("_foot", "foot_r", (5.0, LEG_Y["r"], ANK_REST - 12.0))

    # pelvis and waist
    g = Geo().blob((0, 0, HIP_Z + 4.0), (20.0, 21.0, 11.0), p=2.8)
    rig.part("hips", g, F.SUIT)
    g = Geo().blob((2.0, 0, HIP_Z + 2.0), (21.0, 22.0, 8.0), p=3.0, taper=(1.1, 1.0))
    g.clip((0, 0, HIP_Z - 3.0), (0, 0, -1))
    rig.part("hips", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((20.0, -2.0, HIP_Z - 2.0), (3.0, 10.0, 11.0), p=3.0, taper=(1.0, 0.8))   # tasset
    rig.part("hips", g, team=True)

    # torso: charcoal core, white chest plates, big clock face on the chest
    g = Geo().blob((0, 0, 86.0), (18.0, 18.0, 12.0), p=2.6)
    rig.part("torso", g, F.SUIT)
    g = Geo().blob((0, 0, 114.0), (29.0, 27.0, 24.0), p=2.8, taper=(0.82, 1.05))
    rig.part("torso", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((0.5, 0, 114.4), (29.6, 27.6, 24.6), p=2.8, taper=(0.82, 1.05))
    g.clip((0, 0, 100.0), (0, 0, 1)).clip((0, 0, 91.0), (0, 0, -1))
    rig.part("torso", g, team=True, outline=0.7)
    g = Geo().blob((-24.0, 0, 118.0), (8.0, 20.0, 16.0), p=3.2)             # power pack
    rig.part("torso", g, F.SUIT, finish="gloss")
    g = Geo()
    for y in (-10.0, 0.0, 10.0):
        g.capsule((-32.2, y, 110.0), (-32.2, y, 126.0), 2.0)
    rig.part("torso", g, glow=F.MINT, outline=0.8, outline_hex=F.SUIT)
    # the clock face, turned toward the camera
    n = (math.cos(math.radians(-38)), math.sin(math.radians(-38)), 0.0)
    dx, dy, dz = DIAL

    def at(d):
        return (dx + n[0] * d, dy + n[1] * d, dz)
    g = Geo().lathe([(0, -1.0), (15.0, -0.8), (16.6, 1.0), (15.6, 3.0), (0, 3.0)], at(-3.0), at(0.0), segs=36)
    rig.part("torso", g, team=True)
    g = Geo().lathe([(0, 0), (13.2, 0.1), (13.0, 1.4), (0, 1.8)], at(0.2), at(1.6), segs=36)
    rig.part("torso", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo()
    tx, ty = n[1], -n[0]      # a unit vector across the dial (horizontal on screen)
    for i in range(12):
        a = math.radians(i * 30)
        r0, r1 = 10.0, (12.2 if i % 3 == 0 else 11.4)
        c0 = at(2.2)
        p0 = (c0[0] + tx * r0 * math.cos(a), c0[1] + ty * r0 * math.cos(a), c0[2] + r0 * math.sin(a))
        p1 = (c0[0] + tx * r1 * math.cos(a), c0[1] + ty * r1 * math.cos(a), c0[2] + r1 * math.sin(a))
        g.capsule(p0, p1, 0.8 if i % 3 else 1.1, segs=6, rings=2)
    rig.part("torso", g, F.SUIT, outline=0)
    for name, length, w in (("hand_hour", 7.0, 1.5), ("hand_min", 10.5, 1.1)):
        c0 = at(2.8)
        rig.joint(name, "torso", c0)
        # modelled pointing up (12 o'clock); pose `rx` spins it about the dial's axis
        g = Geo().capsule(c0, (c0[0], c0[1], c0[2] + length), w, w * 0.6, segs=8, rings=2)
        rig.part(name, g, glow=F.MAGENTA, outline=0.8, outline_hex=F.SUIT)
    g = Geo().sphere(at(3.2), 2.4, cuts=3)
    rig.part("torso", g, glow=F.MINT, outline=0.8, outline_hex=F.SUIT)
    g = Geo().blob((4.0, 0, 139.0), (13.0, 14.0, 5.0), p=2.6)            # gorget
    rig.part("torso", g, F.SUIT)

    # head: small heroic helm, mint visor, tall team crest
    g = Geo().blob((6.0, 0, 154.0), (14.0, 13.0, 14.0), p=2.6)
    g.blob((10.0, 0, 145.0), (9.0, 10.0, 5.0), p=2.4)
    rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((3.0, 0, 170.0), (16.0, 3.4, 9.0), p=2.4, rot=(0, -12, 0))
    g.blob((-9.0, 0, 164.0), (6.0, 3.2, 10.0), p=2.4, rot=(0, 30, 0))
    rig.part("head", g, team=True)
    g = Geo().blob((6.0, 0, 154.0), (14.8, 13.8, 14.8), p=2.6)
    g.clip((12.0, 0, 0), (-1, 0, 0)).clip((0, 0, 158.0), (0, 0, 1)).clip((0, 0, 150.0), (0, 0, -1))
    rig.part("head", g, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    rig.joint("eyes", "head", (20.6, 0, 154.0))
    g = Geo().blob((6.0, 0, 154.0), (15.4, 14.4, 15.4), p=2.6)
    g.clip((14.0, 0, 0), (-1, 0, 0)).clip((0, 0, 155.6), (0, 0, 1)).clip((0, 0, 152.6), (0, 0, -1))
    rig.part("eyes", g, glow=F.MINT, outline=0)
    rig.joint("eyes_x", "head", (20.6, 0, 154.0), hidden=True)
    g = Geo()
    for y in (-6.0, 3.0):
        g.capsule((21.4, y - 2.4, 156.4), (21.4, y + 2.4, 151.6), 1.1)
        g.capsule((21.4, y - 2.4, 151.6), (21.4, y + 2.4, 156.4), 1.1)
    rig.part("eyes_x", g, glow=F.MINT, outline=0)

    _arm(rig, "r")

    # the chrono-blade along +Z from the near fist
    x, y, z = HAND["r"]
    g = Geo().capsule((x, y, z - 8.0), (x, y, z + 7.0), 2.8)                   # grip
    g.sphere((x, y, z - 9.5), 3.6, cuts=3)                                       # pommel
    rig.part("blade", g, F.SUIT, finish="gloss")
    b0 = z + GUARD
    g = Geo().lathe([(0, -2.2), (8.0, -2.0), (9.4, 0), (8.0, 2.0), (0, 2.2)], (x, y - 1.0, b0 - 2.0),
                    (x, y - 2.0, b0 - 2.0), segs=12)                             # gear guard
    rig.part("blade", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().sphere((x, y - 3.0, b0 - 2.0), 3.0, cuts=3)
    rig.part("blade", g, glow=F.MINT, outline=0)
    g = Geo().blob((x - 1.0, y - 1.0, b0 + BLADE / 2), (4.4, 2.6, BLADE / 2), p=2.6, taper=(1.0, 0.5))
    rig.part("blade", g, F.SUIT, finish="gloss")                                 # spine
    g = Geo().blob((x + 5.0, y - 1.6, b0 + BLADE / 2 + 2), (6.6, 1.9, BLADE / 2 - 1), p=2.4,
                   taper=(1.0, 0.35), shift=(0.2, 0))
    rig.part("blade", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)          # edge
    g = Geo().blob((x + 9.6, y - 2.4, b0 + BLADE / 2 + 1), (1.5, 0.9, BLADE / 2 - 5), p=2.4,
                   taper=(1.0, 0.4), shift=(0.4, 0))
    rig.part("blade", g, glow=F.MAGENTA, outline=0)
    rig.track("bladeTip", "blade", TIP)
    F.sparks(rig, "blade", (x + 4.0, y - 4.0, b0 + BLADE * 0.85), color=F.MAGENTA, core=F.WHITE,
             size=3.0, name="sparks", rays=8, seed=4)
    F.puff(rig, "torso", (-30.0, -6.0, 132.0), size=2.4, name="vent", spread=1.2)


def _arm(rig, s):
    y = ARM_Y[s]
    z = SHOULDER_Z
    g = Geo().capsule((0, y, z), (0, y, z - UPPER), 8.0, 7.0)
    rig.part(f"arm_{s}", g, F.SUIT)
    g = Geo().blob((1.0, y - 1.5 * (1 if s == "r" else -1), z + 3.0), (15.0, 12.0, 12.0), p=2.6)
    rig.part(f"arm_{s}", g, team=True)
    g = Geo().blob((1.0, y - 2.0 * (1 if s == "r" else -1), z - 6.0), (13.0, 11.0, 4.0), p=2.8)
    rig.part(f"arm_{s}", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(0, -4.0), (7.4, -3.8), (8.0, 0), (7.4, 3.8), (0, 4.0)], (0, y, z - UPPER), (0, y + 1, z - UPPER),
                    segs=18)
    rig.part(f"fore_{s}", g, F.GUNMETAL, finish="metal")
    g = Geo().blob((0.5, y, z - UPPER - 13.0), (8.8, 8.8, 12.0), p=2.8, taper=(0.85, 1.1))
    rig.part(f"fore_{s}", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((8.6, y - 2.0 * (1 if s == "r" else -1), z - UPPER - 13.0), (1.2, 3.0, 8.0), p=3.0)
    rig.part(f"fore_{s}", g, glow=F.MAGENTA, outline=0)
    x, hy, hz = HAND[s]
    g = Geo().blob((x + 1.0, hy, hz), (8.4, 7.8, 8.0), p=2.6)
    rig.part(f"hand_{s}", g, F.SUIT, finish="gloss")


# -- poses ---------------------------------------------------------------------------------
def legs(foot_r, foot_l, hips=(0.0, 0.0)):
    pose = {}
    for s, (fx_, lift) in (("r", foot_r), ("l", foot_l)):
        tgt = (fx_ - hips[0], ANKLE_H + lift - hips[1])
        pose.update(F.leg_ik(s, (0.0, HIP_Z), tgt, THIGH, SHIN, knee_fwd=True))
    pose["hips"] = {"x": hips[0], "z": hips[1]}
    return pose


def stand(bob=0.0, dx=0.0):
    return legs((STANCE_X["r"], 0.0), (STANCE_X["l"], 0.0), (dx, LIFT + bob))


def arms(ra, rf, rw, la=-70.0, lf=-40.0):
    """Blade arm (upper, fore, blade directions) and the free far arm."""
    return merge(F.arm("r", ra, rf, rw, 90.0), F.arm("l", la, lf))


def clock(step):
    """Clock hands at a playback-independent step (the minute hand ticks 30 degrees)."""
    return {"hand_min": {"rx": -30.0 * step}, "hand_hour": {"rx": -60.0 - 2.5 * step}}


REST = arms(-80, -35, 55, -75, -30)


def _idle(f):
    c, lag = F.idle_wave(f)
    return merge(stand(1.6 * c), REST, clock(f), {
        "torso": {"r": 1.0 * c}, "head": {"r": -1.5 * lag},
        "arm_r": {"r": 2.0 * lag}, "hand_r": {"r": -2.5 * lag}, "arm_l": {"r": 2.0 * lag},
        "halo": {"rx": 0.0, "r": 7.5 * f},
    })


WALK_MS = [150] * 8      # 1.2 s heavy stride
STRIDE = 21.0            # natural speed 2 x 21 / 1.2 s = 35 lu/s (sim speed 35)


def _walk(f):
    xr, lr, _ = F.walker_cycle(f, 8, STRIDE, 12.0)
    xl, ll, _ = F.walker_cycle(f, 8, STRIDE, 12.0, phase=0.5)
    bob = [-3.0, -1.0, 1.4, 0.0, -3.0, -1.0, 1.4, 0.0][f]
    lag = [0.0, -3.0, -1.0, 1.4, 0.0, -3.0, -1.0, 1.4][f]
    p = 2 * math.pi * f / 8
    return merge(legs((STANCE_X["r"] + xr, lr), (STANCE_X["l"] + xl, ll), (0.0, LIFT + bob)), REST,
                 clock(f), {
        "torso": dict(r=-3.0 + 1.0 * math.cos(2 * p), rz=3.0 * math.sin(p)),
        "head": {"r": 1.0 - 0.4 * lag},
        "arm_r": {"r": -5 * math.cos(p) + 0.8 * lag}, "hand_r": {"r": 1.2 * lag},
        "arm_l": {"r": 8 * math.cos(p)},
        "halo": {"r": 7.5 * f},
    })


ATTACK_MS = [100, 100, 200, 50, 167, 100, 100, 100]


def _attack(f):
    # 0-1 raise and coil (squash), 2 held extreme (blade high behind), 3 smear,
    # 4 held impact: blade down in front, crouch, burst; 5-7 heavy recovery
    ra = pick(f, [-20, 50, 85, 40, -25, -30, -45, -65])
    rf = pick(f, [30, 100, 125, 30, -20, -22, -26, -30])
    rw = pick(f, [85, 120, 135, 55, -22, -18, 10, 40])
    pose = merge(stand(pick(f, [0, -3, -1, 0, -8, -6, -3, -1]), pick(f, [-1, -3, -4, 2, 6, 5, 3, 1])),
                 arms(ra, rf, rw, pick(f, [-70, -50, -30, -80, -100, -95, -85, -78]),
                      pick(f, [-30, -10, 10, -40, -60, -55, -45, -35])),
                 clock(f), {
        "torso": dict(squash(pick(f, [-0.02, -0.06, 0.05, 0.03, -0.08, -0.05, -0.02, 0])),
                      r=pick(f, [3, 8, 12, -6, -16, -13, -7, -2])),
        "head": {"r": pick(f, [1, 3, 4, -2, -5, -4, -2, 0])},
        "sparks": {"show": f == 4},
        "vent": {"show": f in (5, 6), "s": pick(f, [1, 1, 1, 1, 1, 0.8, 1.2, 1]),
                 "z": pick(f, [0, 0, 0, 0, 0, 0, 4, 0])},
        "halo": {"r": pick(f, [0, 8, 16, 40, 60, 66, 70, 72])},
    })
    if f == 3:
        pose.setdefault("blade", {})["sz"] = 1.2
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(stand(-2.0 * a, -3.0 * a), REST, clock(0), {
        "torso": dict(squash(-0.05 * a), r=8 * a), "head": {"r": 8 * a},
        "arm_r": {"r": 10 * a}, "arm_l": {"r": 14 * a},
    })


def _die(f):
    # knees buckle, the body pitches, then the hand-off squash
    pose = merge(legs((STANCE_X["r"] + pick(f, [4, 8, 8]), 0.0), (STANCE_X["l"], 0.0),
                      (pick(f, [-3, -5, -5]), LIFT + pick(f, [-6, -22, -28]))),
                 arms(-40, -10, 20, -20, 10), clock(3), {
        "body": {"r": pick(f, [8, 5, 3]), "sz": pick(f, [1.02, 0.84, 0.66]),
                 "sx": pick(f, [0.98, 1.1, 1.2])},
        "torso": {"r": pick(f, [14, 20, 20])},
        "head": {"r": pick(f, [12, -6, -6])},
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
             durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
