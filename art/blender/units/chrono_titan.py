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
gear-shaped guard. The visor's mint eyes act (angry on the wind-up, slits on the sweep, > < when
hit, spirals and X when it dies); mint light seams run down the thighs.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    the clock ticks, the halo turns, the hull breathes, a blink
  walk    a slow heavy clank (1.4 s), the torso jolts on each plant, a vent puff per step
  attack  CLOCK-HAND SWEEP: dips, winds the blade back to nine o'clock behind it (the held
          extreme), then sweeps it 180 degrees over the top like a clock hand, with a double magenta
          smear, the clock hands and halo spinning, and cleaves level through the
          front with a lunge (impact lines, dust, a time ring off the dial)
  hit     mech: a hard jolt, sparks on the chest, a vent puff
  die     D6 fall-apart: the clock hands spin wild, the halo drops off behind, the knees buckle
          onto the ground and it topples forward with a smoke puff, spiral then X eyes
"""
import math

from ageborn_art import kit_future as KF
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "chrono_titan"
NAME = "Chrono Titan"
HEIGHT_LU = 192
YAW_DEG = -16.0
CANVAS = (600, 580)
FEET = (238, 552)
ANCHORS = {"head": (8, 186), "hitCenter": (0, 110)}
NO_RETIME = True

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
    g = Geo().blob((3.0, 0, 171.0), (18.0, 4.2, 11.0), p=2.4, rot=(0, -12, 0))
    g.blob((-9.0, 0, 164.0), (6.0, 3.2, 10.0), p=2.4, rot=(0, 30, 0))
    rig.part("head", g, team=True)
    g = Geo().blob((6.0, 0, 154.0), (14.8, 13.8, 14.8), p=2.6)
    g.clip((12.0, 0, 0), (-1, 0, 0)).clip((0, 0, 158.0), (0, 0, 1)).clip((0, 0, 150.0), (0, 0, -1))
    rig.part("head", g, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    band = Geo().blob((6.0, 0, 154.0), (15.1, 14.1, 15.1), p=2.6)
    band.clip((12.0, 0, 0), (-1, 0, 0)).clip((0, 0, 158.4), (0, 0, 1)).clip((0, 0, 149.6), (0, 0, -1))
    KF.visor_face(rig, "head", [band], (15.6, 154.2), eye_dx=(0.0, 5.0), eye_rx=2.2, eye_rz=3.2, yaw_deg=YAW_DEG)
    # mint light seams on the thighs and a rivet row on the chest band
    for s_ in ("r", "l"):
        y = LEG_Y[s_]
        KF.strip(rig, f"thigh_{s_}", [(9.6, y - 3.0 * (1 if s_ == "r" else -1), HIP_Z - 4.0),
                                      (10.4, y - 3.0 * (1 if s_ == "r" else -1), HIP_Z - 20.0)], r=1.1)
    KF.rivets(rig, "torso", [(x_, -26.6 + 0.12 * abs(x_), 95.6) for x_ in (-16.0, -8.0, 0.0, 8.0)], r=1.3)

    _arm(rig, "r")

    # the chrono-blade along +Z from the near fist
    x, y, z = HAND["r"]
    g = Geo().capsule((x, y, z - 8.0), (x, y, z + 7.0), 2.8)                   # grip
    g.sphere((x, y, z - 9.5), 3.6, cuts=3)                                       # pommel
    rig.part("blade", g, F.SUIT, finish="gloss")
    b0 = z + GUARD
    g = Geo().lathe([(0, -2.2), (8.0, -2.0), (9.4, 0), (8.0, 2.0), (0, 2.2)], (x, y - 1.0, b0 - 2.0),
                    (x, y - 2.0, b0 - 2.0), segs=12)                             # gear guard
    rig.part("blade", g, team=True)
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
    F.sparks(rig, "torso", (26.0, -20.0, 118.0), color=F.MINT, size=2.2, name="hit_spark", rays=6, seed=6)
    F.puff(rig, "root", (0.0, -20.0, 40.0), size=3.2, name="smoke", color="#B9BEC6", spread=1.6)


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


# -- poses -----------------------------------------------------------------------------------
def legs(foot_r, foot_l, hips=(0.0, 0.0)):
    pose = {}
    for s, (fx_, lift) in (("r", foot_r), ("l", foot_l)):
        tgt = (fx_ - hips[0], ANKLE_H + lift - hips[1])
        pose.update(F.leg_ik(s, (0.0, HIP_Z), tgt, THIGH, SHIN, knee_fwd=True))
    pose["hips"] = {"x": hips[0], "z": hips[1]}
    return pose


def stand(bob=0.0, dx=0.0, spread=0.0):
    return legs((STANCE_X["r"] + spread, 0.0), (STANCE_X["l"] - spread, 0.0), (dx, LIFT + bob))


def arms(ra, rf, rw, la=-70.0, lf=-40.0):
    """Blade arm (upper, fore, blade directions) and the free far arm (torso space)."""
    return merge(F.arm("r", ra, rf, rw, 90.0), F.arm("l", la, lf))


def clock(step, fast=0.0):
    """Clock hands at a playback-independent step (the minute hand ticks 30 degrees)."""
    return {"hand_min": {"rx": -30.0 * step - fast}, "hand_hour": {"rx": -60.0 - 2.5 * step - fast / 12}}


REST = arms(-80, -35, 55, -75, -30)


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    pose = merge(stand(1.6 * c), REST, clock(f), {
        "torso": {"r": 1.0 * c}, "head": {"r": -1.5 * lag},
        "arm_r": {"r": 2.0 * lag}, "hand_r": {"r": -2.5 * lag}, "arm_l": {"r": 2.0 * lag},
        "halo": {"rx": 0.0, "r": 5.0 * f},
    })
    if f == 4:
        pose = merge(pose, KF.glyph("g_blink"))
    return pose


WALK_MS = [175] * 8      # 1.4 s heavy stride
STRIDE = 24.5            # natural speed 2 x 24.5 / 1.4 s = 35 lu/s (sim speed 35)


def _walk(f):
    xr, lr, _ = F.walker_cycle(f, 8, STRIDE, 18.0)
    xl, ll, _ = F.walker_cycle(f, 8, STRIDE, 18.0, phase=0.5)
    bob = [-5.0, -2.0, 2.2, 0.4, -5.0, -2.0, 2.2, 0.4][f]
    lag = [0.4, -5.0, -2.0, 2.2, 0.4, -5.0, -2.0, 2.2][f]
    jolt = [1.0, 0.3, 0, 0, 1.0, 0.3, 0, 0][f]
    p = 2 * math.pi * f / 8
    return merge(legs((STANCE_X["r"] + xr, lr), (STANCE_X["l"] + xl, ll), (0.0, LIFT + bob)), REST,
                 clock(f), {
        "torso": dict(r=-4.0 + 1.5 * math.cos(2 * p) - 1.2 * jolt, rz=5.0 * math.sin(p), rx=2.0 * math.sin(p)),
        "head": {"r": 1.0 - 0.4 * lag},
        "arm_r": {"r": -5 * math.cos(p) + 0.8 * lag}, "hand_r": {"r": 1.2 * lag},
        "arm_l": {"r": 10 * math.cos(p)}, "fore_l": {"r": 6 * max(0.0, math.cos(p))},
        "halo": {"r": 5.0 * f},
        "vent": {"show": f in (1, 5), "s": 0.55, "z": 2.0},
    })


# -- attack: clock-hand sweep (heavy timing: impact on pose 6 at 570 of 1230 ms) -------------------
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 0]
#      shift  dip   coil  HOLD  12oc  2oc  SWEEP shock follow recover
RA = [-82, 245, 210, 182, 92, 42, 6, 4, -24, -62]
RF = [-38, 235, 200, 184, 94, 40, 4, 0, -26, -45]
RW = [55, 215, 195, 182, 96, 40, 10, 2, -24, 24]
LA = [-75, -55, -30, -10, -40, -70, -95, -95, -88, -78]
LF = [-30, -20, 0, 15, -30, -60, -70, -72, -60, -35]
TR = [2.0, 6.0, 9.0, 11.0, 2.0, -6.0, -14.0, -15.0, -11.0, -4.0]
TZ = [0, 6.0, 12.0, 18.0, 6.0, -2.0, -4.0, -5.0, -4.0, -1.0]
BOB = [0.0, -4.0, -3.0, -2.0, 1.5, -1.0, -9.0, -8.0, -5.0, -1.5]
DX = [-1.0, -3.0, -4.5, -6.0, -2.0, 2.0, 7.0, 7.0, 5.0, 1.0]
SPREAD = [0, 2.0, 3.0, 4.0, 4.0, 4.0, 7.0, 7.0, 5.0, 2.0]
EYES = ["eyes", "g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_angry", "g_angry", "eyes", "eyes"]


def _attack_pose(f):
    pose = merge(stand(BOB[f], DX[f], SPREAD[f]), arms(RA[f], RF[f], RW[f], LA[f], LF[f]),
                 clock(f, fast=[0, 0, 0, 0, 90, 180, 300, 330, 350, 360][f]), {
        "torso": {"r": TR[f], "rz": TZ[f]},
        "head": {"r": -0.4 * TR[f], "rz": -0.6 * TZ[f]},
        "sparks": {"show": f == 6},
        "vent": {"show": f in (7, 8), "s": 1.3 if f == 8 else 1.0, "z": 5.0 if f == 8 else 0.0},
        "halo": {"r": [0, 4, 10, 16, 60, 110, 150, 160, 166, 170][f]},
    })
    if f in (4, 5):
        pose["blade"] = dict(pose.get("blade", {}), sz=1.12)
    return merge(pose, KF.glyph(EYES[f]))


def _attack_clip():
    x, y, z = HAND["r"]
    swing = {"kind": "arc", "joint": "blade", "inner": (x + 4.0, y - 2.0, z + GUARD + BLADE * 0.45), "outer": TIP,
             "color": F.MAGENTA, "white": 0.55, "taper": 0.2, "lines": 3, "t0": 0.0, "t1": 0.95}
    inner = dict(swing, inner=(x + 2.0, y - 2.0, z + GUARD + 6.0), outer=(x + 4.0, y - 2.0, z + GUARD + BLADE * 0.4),
                 white=0.6, lines=0)
    ov = {
        4: [dict(swing, **{"from": 3}), dict(inner, **{"from": 3})],
        5: [dict(swing, **{"from": 4}), dict(inner, **{"from": 4})],
        # impact: no swing smear here (painted over the frame it hid the level blade behind a
        # magenta wedge at game size); the blade, the tip burst and the dust carry the hit
        6: [{"kind": "burst", "joint": "blade", "point": TIP, "r0_lu": 10.0, "r1_lu": 22.0, "n": 7,
             "a0": -80.0, "arc": 160.0, "color": F.MAGENTA_CORE},
            {"kind": "dust", "ground": (26.0, 0.0), "size_lu": 10.0, "puffs": 4, "seed": 41, "spread": 1.2,
             "color": "#DDE3E8"},
            {"kind": "dust", "ground": (-22.0, 0.0), "size_lu": 8.0, "puffs": 3, "seed": 42, "spread": 1.0,
             "color": "#DDE3E8", "dir": -1.0}],
        7: [{"kind": "rings", "joint": "torso", "point": DIAL, "radii_lu": (22.0, 32.0), "a0": -60.0, "a1": 60.0,
             "color": F.MAGENTA_CORE}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=ov)


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(stand(-2.0 * max(a, 0)), REST, clock(0, fast=-20 * a), KF.hit_mech(k, (0, 0, 100), scale=1.4), {
        "torso": {"r": 7 * a}, "head": {"r": 8 * a},
        "arm_r": {"r": 10 * a}, "arm_l": {"r": 14 * a},
        "hit_spark": {"show": k <= 1},
        "vent": {"show": k in (2, 3), "s": 0.8},
    })
    return merge(pose, KF.glyph("g_hurt" if k <= 1 else ("g_angry" if k == 2 else "eyes")))


# D6 fall-apart: 8 unique poses in the 12 heavy steps (moves.DIE_SEQ_HEAVY). It sputters (the clock
# hands spin wild), the halo drops off behind, the knees buckle onto the ground, then it topples
# forward onto its blade arm with a smoke puff.
D_BOB = [-2.0, -8.0, -18.0, -30.0, -38.0, -44.0, -42.0, -45.0]
D_DX = [-3.0, -4.0, -2.0, 1.0, 4.0, 8.0, 8.0, 8.0]
D_TR = [10.0, 4.0, -6.0, -16.0, -30.0, -48.0, -44.0, -50.0]
HALO_PATH = [(0, 0, 0), (0, 0, 20), (-6, -10, 60), (-14, -40, 100), (-22, -80, 140), (-26, -92, 160),
             (-27, -90, 162), (-27, -93, 164)]


def _die(k):
    feet = legs((STANCE_X["r"] + [0, 4, 8, 14, 18, 20, 20, 20][k], 0.0), (STANCE_X["l"] - [0, 2, 4, 6, 8, 8, 8, 8][k], 0.0),
                (D_DX[k], LIFT + D_BOB[k]))
    hx, hz, hr = HALO_PATH[k]
    pose = merge(feet, arms(-60 + [10, 20, 30, 40, 50, 60, 58, 60][k], -30 + [10, 20, 30, 40, 50, 60, 58, 60][k],
                            40 + [0, 0, -5, -5, 10, 30, 28, 30][k],
                            -40 + [20, 30, 40, 60, 70, 80, 78, 80][k], -10 + [0, 10, 20, 30, 40, 50, 50, 50][k]),
                 clock(3, fast=[0, 150, 400, 700, 760, 770, 770, 770][k]), {
        "torso": {"r": D_TR[k]}, "head": {"r": [8, -6, 10, 14, 18, 20, 18, 20][k]},
        "halo": {"x": hx, "z": hz, "r": hr},
        "sparks": {"show": k in (0, 2)},
        "hit_spark": {"show": k in (0, 3)},
        "vent": {"show": k in (1, 2), "s": 1.0},
        "smoke": {"show": k in (5, 6, 7), "s": [1, 1, 1, 1, 1, 0.8, 1.1, 1.25][k], "z": [0, 0, 0, 0, 0, 0, 4, 8][k]},
    })
    g = ["g_wide", "g_hurt", "g_spiral", "g_spiral", "eyes_x", "eyes_x", "eyes_x", "eyes_x"][k]
    return merge(pose, KF.glyph(g))


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [M.IDLE_MS_HEAVY] * 6, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_contract(cl, heavy=True)
