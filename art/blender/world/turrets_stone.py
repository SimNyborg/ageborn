"""Stone Age turrets (DESIGN A5.2, A14.2): Rock Tosser, Angry Beehive, Log Roller, Grumpy Toad.

Each is a turret_module (world/common.py): a static footing (`mount`) and a head that aims
about its pivot; `fire` has a per-frame muzzle anchor where the projectile leaves.
"""
import math

from ageborn_art import face as F
from ageborn_art import look
from ageborn_art.geometry import Geo

from world import kit_wa as KW
from world import look_world as LW
from world.common import box, cyl, muzzle_flash, plank, rock, rope, smoke_puff, turret_module

STONE = "#8C7B68"
STONE_LT = "#A08E78"
STONE_DK = "#6E6254"
WOOD = "#857058"
WOOD_DK = "#5C4C3E"
BARK = "#6A5A4A"
ROPE = "#C2AE86"
BONE = "#EDE3C8"
MOSS = "#6E8B3D"
HIVE = "#CDB98A"
HIVE_DK = "#A8966C"
BEE = "#D6C284"
BEE_DK = "#3A3230"
TOAD = "#7E9A5A"
TOAD_LT = "#B8C88E"
TOAD_DK = "#5D7443"
MOUTH = "#5A2A34"
EYE = "#F4EEDC"
PUPIL = "#221C19"

CANVAS = (250, 210)
FEET = (95, 175)


def stone_footing(rig, r=17.0, h=8.0, seed=1):
    g = Geo()
    rock(g, (0, 2, h * 0.5), (r, r * 0.8, h * 0.62), seed=seed, jag=0.1, p=2.8)
    rig.part("mount", g, STONE_LT)
    g = Geo()
    rock(g, (-r * 0.7, -r * 0.5, 2.5), (5, 4, 3.4), seed=seed + 5, jag=0.2)
    rock(g, (r * 0.75, -r * 0.4, 2), (4, 3.4, 2.8), seed=seed + 6, jag=0.2)
    rig.part("mount", g, STONE_DK)


# world wave A: the footings of the detail standard (the Rock Tosser's plinth and the Beehive's stump, generalised)
BARK_DK = "#54473B"       # bark ridges and the log's end grain
RING = "#A88A66"
CLAW = "#E2D8BE"
CAP = "#B9876A"           # shelf fungus and toadstool caps
# the pilot review's S3: a turret's footing must not merge with the Stone base's rock behind it: dressed stone a clear
# step lighter than the base's rock (#8C7B68, its lit #A08E78), set on a dark timber sill; the stumps' bark darker and
# their moss a yellower green than the base's
DRESSED = "#BFB098"
DRESSED_LT = "#CFC2A8"
DRESSED_DK = "#A69680"
SILL = "#4E4034"
BARK_ST = "#55473A"
RIDGE_ST = "#3F342B"
MOSS_T = "#93A653"


def timber_sill(rig, x0, x1, y0, y1, h=1.5):
    """A dark timber sill under a footing (S3): two planks along the front and back and their ends, so the footing
    stands clear of the base's lit mount platform."""
    g = Geo()
    for y in (y0 + 1.6, y1 - 1.6):
        plank(g, (x0, y, h * 0.5), (x1, y, h * 0.5), 3.2, h, up=(0, 0, 1))
    for x in (x0 + 1.6, x1 - 1.6):
        plank(g, (x, y0, h * 0.5), (x, y1, h * 0.5), 3.2, h, up=(0, 0, 1))
    rig.part("mount", g, SILL, outline=0.5)


def drystone_footing(rig, r=17.0, h=8.0, seed=1):
    """stone_footing's footprint as a plinth of dressed stone (lighter than the base's rock) in two courses (the upper
    one set back) on a dark timber sill, the two loose stones at its front corners, moss on the top edges."""
    y0, y1 = 2.6 - r * 0.8, 0.4 + r * 0.8
    lo, top = h * 0.575, h * 1.075
    timber_sill(rig, -r, r, y0 - 0.6, y1 + 0.6)       # (no wider than the plinth: the mount frame sets the width)
    KW.drystone(rig, "mount", [(1.3, lo, [-r, -r * 0.38, r * 0.29, r]),
                               (lo - 0.2, top, [-r * 0.76, r * 0.03, r * 0.76])],
                (DRESSED_LT, DRESSED, DRESSED_LT, DRESSED_DK, DRESSED), seed=seed, depth=(y0, y1))
    g = Geo()
    rock(g, (-r * 0.7, -r * 0.5, 2.5), (5, 4, 3.4), seed=seed + 5, jag=0.2)
    rock(g, (r * 0.75, -r * 0.4, 2), (4, 3.4, 2.8), seed=seed + 6, jag=0.2)
    rig.part("mount", g, DRESSED_DK)
    KW.moss(rig, "mount", [(-r * 0.59, y0 + 1.2, top - 0.2, 3.6), (-r * 0.18, y0 + 0.4, lo + 0.2, 2.6),
                           (r * 0.47, y0 + 1.4, top, 3.2), (r * 0.7, y1 - 5.0, top - 0.2, 2.8)], MOSS_T, seed=seed + 9)


def stump_detail(rig, r0, r1, h, seed=0, fungus=()):
    """A stump's detail inside the old stump's outline (a bark cylinder r0 at the foot to r1 at h; the mount frame's
    silhouette and so its team share stay as they were): bark ridges on the camera side (y < 0) and shelf fungus
    (`fungus` [(angle, z, r)]) growing out of the bark."""
    g = Geo()
    for a, z, r in fungus:
        t = math.radians(a)
        rr = r0 + (r1 - r0) * z / h
        c, s_ = math.cos(t), math.sin(t)
        g.lathe([(0.0, 0.0), (r, 0.25), (r * 0.9, 0.9), (0.0, 1.2)], (rr * c, rr * s_, z), (rr * c, rr * s_, z + 1),
                segs=12, squash=(1.0, 0.55))
    if fungus:
        rig.part("mount", g, CAP, outline=0.4)
    g = Geo()
    for k in range(7):
        t = math.radians(-165 + 25 * k + (seed % 3) * 4)
        c, s_ = math.cos(t), math.sin(t)
        g.capsule(((r0 + 0.15) * c, (r0 + 0.15) * s_, 1.8), ((r1 + 0.15) * c, (r1 + 0.15) * s_, h - 1.8), 0.6, 0.5)
    rig.part("mount", g, RIDGE_ST, outline=0)


# -- Rock Tosser: a log catapult on a drystone plinth ---------------------------------------------
# World wave A (the detail standard; opted in below with look_world): a plinth of fitted blocks 4-5 lu tall (two
# courses, chipped, moss on the top edges) in place of the smooth footing rock; the A-frames lashed at the apex and the
# near one braced by a cross-beam; a torsion skein of twisted rope round the axle (the mechanism); the arm with three
# rope wraps and a team rag tied under the cup (in two tones, so the team reads on the head in every frame), the cup
# with a rope rim; the pennant in two tones. All inside the old envelope (the sheet budget); clips, pivot and muzzle
# untouched.
LASH = "#CDBB92"          # pale rope lashings: they read against the dark bark
HIDE = "#8A6A50"
FINIAL = "#C8B488"
RT_KINDS = {STONE: "stone", STONE_LT: "stone", STONE_DK: "stone", BARK: "wood", WOOD: "wood", WOOD_DK: "wood",
            ROPE: "leather", LASH: "leather", HIDE: "leather", MOSS: "fur", FINIAL: "bone", "team": "cloth",
            "#BFB098": "stone", "#CFC2A8": "stone", "#A69680": "stone", "#4E4034": "wood", "#93A653": "fur"}


def rock_tosser_build(rig):
    # the drystone plinth on the old footing's footprint (x -17..17, y -11..14, its top at z 8.6)
    timber_sill(rig, -17.6, 17.6, -11.6, 14.6)        # (S3: dressed stone on a dark sill, clear of the base's rock)
    KW.drystone(rig, "mount", [(1.3, 4.6, [-17.0, -6.5, 5.0, 17.0]), (4.4, 8.6, [-13.0, 0.5, 13.0])],
                (DRESSED_LT, DRESSED, DRESSED_LT, DRESSED_DK, DRESSED), seed=3, depth=(-11.0, 14.0))
    g = Geo()
    rock(g, (-11.9, -8.5, 2.5), (5, 4, 3.4), seed=7, jag=0.2)     # the loose stones at its front corners
    rock(g, (12.75, -6.8, 2), (4, 3.4, 2.8), seed=8, jag=0.2)
    rig.part("mount", g, DRESSED_DK)
    KW.moss(rig, "mount", [(-10.0, -9.8, 8.4, 3.8), (-3.0, -10.6, 4.8, 2.8), (8.0, -9.6, 8.6, 3.4), (12.0, 9.0, 8.4, 3.0)],
            MOSS_T, seed=5)
    g = Geo()
    for y in (-8, 8):
        g.capsule((-12, y, 6), (0, y, 24), 2.8, 2.4)
        g.capsule((12, y, 6), (0, y, 24), 2.8, 2.4)
    rig.part("mount", g, BARK)
    g = Geo().capsule((0, -10, 22), (0, 10, 22), 2.2)
    rig.part("mount", g, WOOD_DK, outline=0.6)
    # the torsion skein: a fat bundle of twisted rope round the axle between the frames
    prof = [(0.0, 0.0), (3.0, 0.0)] + [(3.7 if k % 2 else 3.1, 1.0 * k) for k in range(1, 10)] + [(3.0, 10.0),
                                                                                                   (0.0, 10.0)]
    g = Geo().lathe(prof, (0, -5, 22), (0, 5, 22), segs=14)
    rig.part("mount", g, ROPE, outline=0.5)
    # the apex lashings and the near frame's cross-beam with its lashed ends
    for y in (-8, 8):
        KW.wraps(rig, "mount", (0, y, 18.6), (0, y, 25.0), 2.6, 3, LASH)
    for x in (-12, 12):     # each leg lashed where it stands in the plinth
        KW.wraps(rig, "mount", (x * 0.86, -8, 8.6), (x * 0.7, -8, 11.6), 2.5, 2, LASH, w=0.65)
    g = Geo()
    plank(g, (-7.4, -8.4, 13.0), (7.4, -8.4, 13.0), 2.8, 1.8, up=(0, 1, 0))
    rig.part("mount", g, WOOD_DK, outline=0.6)
    for x0, x1 in ((-7.6, -5.0), (5.0, 7.6)):
        KW.wraps(rig, "mount", (x0, -8.4, 13.0), (x1, -8.4, 13.0), 1.5, 2, LASH, w=0.6)
    KW.pennant(rig, "mount", -14, 6, 6, h=30, pole=BARK, finial=FINIAL)
    # the arm (head pivot at the axle), modelled pointing up-back at rest
    rig.joint("arm", "head", (0, 0, 22))
    g = Geo().capsule((0, 0, 22), (-2, 0, 50), 2.6, 2.0)
    rig.part("arm", g, WOOD)
    g = Geo().lathe([(0, 0), (6.5, 1.2), (7.5, 5), (6.5, 6.2), (0, 3)], (-2.5, 0, 48), (-2.5, 0, 55), segs=14)
    rig.part("arm", g, WOOD_DK)
    g = Geo().lathe([(6.4, -0.6), (7.1, 0.0), (6.4, 0.6)], (-2.5, 0, 53.4), (-2.5, 0, 54.6), segs=14)
    rig.part("arm", g, ROPE, outline=0.4)                                   # the cup's rope rim
    KW.wraps(rig, "arm", (-0.5, 0, 28.0), (-1.2, 0, 38.0), 2.3, 3, ROPE)
    KW.team_band(rig, "arm", (-1.45, 0, 41.2), (-1.65, 0, 43.4), 2.1, tone=look.TEAM_DARK)
    KW.team_band(rig, "arm", (-1.65, 0, 43.4), (-1.85, 0, 46.4), 2.0)
    rig.joint("boulder", "arm", (-2.5, 0, 57))
    g = Geo()
    rock(g, (-2.5, 0, 57), (5.4, 5, 5), seed=7, jag=0.15)
    rig.part("boulder", g, STONE)
    smoke_puff(rig, "head", (14, 0, 48), 0.8, name="dust")


def rock_tosser_idle(f):
    # 6-frame loop: the arm creaks back and forth, the loaded boulder wobbles in its cup
    w = math.sin(f / 6 * 2 * math.pi)
    return {"arm": {"r": 42.0 + 3.0 * w, "sz": 1.0 - 0.02 * math.cos(f / 6 * 2 * math.pi)},
            "boulder": {"r": 14 * math.sin(f / 6 * 4 * math.pi), "z": 0.8 * max(0.0, -w)}}


def rock_tosser_fire(f):
    # 0 cranked far back (anticipation: the arm bends), 1 release (the arm whips, smear),
    # 2 overshoot, 3 bounce back, 4 reloaded and returning
    table = [(66, True, 0.9), (-28, False, 1.08), (-50, False, 1.0), (-14, False, 1.0), (30, True, 1.0)]
    a, loaded, sz = table[f]
    return {"arm": {"r": a, "sz": sz}, "boulder": {"hide": not loaded, "s": 0.6 if f == 4 else 1.0},
            "dust": {"show": f in (1, 2), "s": 1.3 if f == 1 else 1.0}}


# (world wave A, the pilot review's nit 1: the throw's smear in two narrow tones, the troop waves' W2 fix)
ROCK_TOSSER_OVERLAYS = {"fire": {1: KW.smear_two_tone({"kind": "arc", "joint": "arm", "inner": (-1.5, 0, 38),
                                                       "outer": (-2.5, 0, 58), "color": WOOD, "taper": 0.2,
                                                       "t0": 0.0, "t1": 0.85, "lines": 3})}}


# -- Angry Beehive: a hive hanging from a branch on a stump ----------------------------------------
# World wave A (the detail standard): a woven straw skep (coils of 2.6 lu in two tones round the hive, in place of
# three thin rings; round the face only at its sides), the eyes outlined so they read on the lit straw, the team band in
# two tones and a team rag on the branch, the stump with flaring roots, a lashed branch, bigger moss, the pennant in two
# tones.
HIVE_LT = "#DCCB9E"
WING = "#F4F2EA"
# (the straw keeps no breakup pattern: its coils are its texture, and the angry face stays clean on it)
BH_KINDS = {BARK: "wood", WOOD: "wood", WOOD_DK: "wood", MOSS: "fur", BEE: "fur", BEE_DK: "fur", "#C8B488": "bone",
            "team": "cloth", "#55473A": "wood", "#93A653": "fur"}


def beehive_build(rig):
    g = Geo()
    cyl(g, (0, 0, 0), (0, 0, 14), 13, 11, bevel=1.4, segs=16)
    for a in (-150.0, -95.0, -35.0, 40.0):      # flaring roots
        t = math.radians(a)
        g.capsule((9.5 * math.cos(t), 9.5 * math.sin(t), 4.0), (14.0 * math.cos(t), 13.0 * math.sin(t), 0.8), 2.6, 1.6)
    rig.part("mount", g, BARK_ST)      # (S3: a darker bark than the base's rock)
    g = Geo()
    cyl(g, (0, 0, 13), (0, 0, 15), 10.5, bevel=0.5, segs=16)
    rig.part("mount", g, WOOD)
    g = Geo().capsule((-6, 0, 13), (-2, 0, 44), 3.2, 2.2).capsule((-3, 0, 42), (14, 0, 46), 2.2, 1.4)
    rig.part("mount", g, BARK)
    KW.wraps(rig, "mount", (-5.2, 0, 19.0), (-4.6, 0, 23.0), 2.9, 2, "#CDBB92", w=0.65)
    # a team rag tied round the branch in two tones, beside the pennant (team parts kept together: a team frame's
    # box spans every team part in it, and the sheet pays for that box)
    KW.team_band(rig, "mount", (-3.75, 0, 31.6), (-3.5, 0, 33.4), 2.45, tone=look.TEAM_DARK)
    KW.team_band(rig, "mount", (-3.5, 0, 33.4), (-3.1, 0, 36.8), 2.35)
    g = Geo()
    for dx, dz, r in ((9.0, 48.0, 4.2), (15.0, 44.5, 3.6), (-4.4, 33.0, 3.2)):
        rock(g, (dx, -1.6, dz), (r, r * 0.55, r * 0.6), seed=int(dx * 3), jag=0.2, p=2.2, cuts=3)
    rig.part("mount", g, MOSS_T, outline=0.5)
    KW.pennant(rig, "mount", -11, 4, 12, h=26)
    # head: the hive swings from the branch
    prof = [(0, 0), (6, 0.5), (9.5, 3.5), (10.5, 8), (10, 13), (8, 17), (4.5, 20), (0, 21)]
    g = Geo().lathe(prof, (8, 0, 22), (8, 0, 43), segs=18)
    rig.part("head", g, HIVE)

    def r_at(z):    # the hive's radius at height z (its lathe profile)
        h = z - 22.0
        for (r0, h0), (r1, h1) in zip(prof, prof[1:]):
            if h0 <= h <= h1:
                return r0 + (r1 - r0) * (h - h0) / max(1e-6, h1 - h0)
        return 0.0
    # the skep's coils: bulging straw bands of 2.6 lu, dark and light in turn (the team band sits in their row)
    for i, z in enumerate((24.4, 27.2, 30.0, 35.8, 38.6, 41.0)):
        g = Geo()
        r = r_at(z)
        g.lathe([(r - 0.4, -1.3), (r + 0.55, -0.5), (r + 0.55, 0.5), (r - 0.4, 1.3)], (8, 0, z), (8, 0, z + 1.0),
                segs=18)
        if z > 35.0:    # round the face only at the sides and the back: the angry face stays clear
            g.clip((0, -4.0, 0), (0, -1, 0))
        rig.part("head", g, HIVE_DK if i % 2 == 0 else HIVE_LT, outline=0.4)
    g = Geo()
    cyl(g, (8, 0, 32.8), (8, 0, 34.6), 10.9, bevel=0.3, segs=18)
    rig.part("head", g, team=True, outline=0.4)
    g = Geo()
    cyl(g, (8, 0, 31.3), (8, 0, 32.8), 10.9, bevel=0.3, segs=18)
    look.team_part(rig, "head", g, outline=0.4)
    # the entrance is its mouth (it gapes on fire); an angry face above it
    rig.joint("hole", "head", (13, -8.5, 28))
    g = Geo().blob((13, -8.5, 28), (3.4, 1.4, 2.8), p=2.0)
    rig.part("hole", g, BEE_DK, outline=0, highlight=False)
    hive = Geo().lathe(prof, (8, 0, 22), (8, 0, 43), segs=18)
    face = F.Face(rig, "head", [hive])
    hive.bm.free()
    g = Geo()
    for x, z in ((9.0, 38.0), (15.4, 37.6)):
        face.decal(g, face.hit(x, z), F.ellipse(0, 0, 2.3, 2.8, 14), 0.4)
    # (world wave A: a dark line round the eyes, so they read on the lit straw)
    rig.part("head", g, EYE, highlight=False, outline=0.45)
    rig.joint("pupils", "head", (12, -10, 38))
    g = Geo()
    for x, z in ((9.0, 38.0), (15.4, 37.6)):
        face.decal(g, face.hit(x, z) - face.view * 0.3, F.ellipse(0.8, -0.4, 1.3, 1.6, 10), 0.4)
    rig.part("pupils", g, PUPIL, highlight=False, outline=0)
    rig.joint("brows", "head", (12, -10, 41))
    g = Geo()
    for (x, z), d in (((9.0, 41.4), 1), ((15.4, 41.0), -1)):
        face.stroke(g, face.hit(x, z) - face.view * 0.4, [(-2.4 * d, 1.1), (2.0 * d, -0.9)], 1.4, 0.4)
    rig.part("brows", g, BEE_DK, highlight=False, outline=0)
    for i, (x, z) in enumerate(((22, 40), (-4, 34), (20, 22))):
        rig.joint(f"bee{i}", "head", (x, -10, z))
        g = Geo().blob((x, -10, z), (2.6, 2.0, 2.0), p=2.0)
        rig.part(f"bee{i}", g, BEE, outline=0.5)
        g = Geo().blob((x - 0.8, -10.5, z), (0.8, 2.1, 2.1), p=2.0)
        rig.part(f"bee{i}", g, BEE_DK, outline=0)
        g = Geo().blob((x, -9.4, z + 2.4), (1.8, 0.6, 1.4), p=2.0)
        rig.part(f"bee{i}", g, WING, outline=0.3)


def beehive_idle(f):
    # 6-frame loop: the bees orbit the hive, it sways and grumbles (brows twitch)
    t = f / 6 * 2 * math.pi
    out = {"head": {"r": 3.0 * math.sin(t)}, "brows": {"z": 0.5 * math.sin(2 * t)},
           "pupils": {"x": 0.4 * math.sin(t)}}
    for i in range(3):
        a = t + i * 2 * math.pi / 3
        out[f"bee{i}"] = {"x": 7 * math.cos(a), "z": 5 * math.sin(a), "y": 3 * math.sin(a)}
    return out


def beehive_fire(f):
    # 0 inhales (squashed, eyes squeezed, brows down), 1 spits the bee stream (stretched, the
    # entrance gapes), 2-4 recover
    sq = [0.12, -0.14, 0.05, -0.02, 0.0][f]
    spread = [0.0, 8.0, 12.0, 6.0, 1.0][f]
    return {"head": {"sz": 1 - sq, "sx": 1 + sq * 0.9, "sy": 1 + sq * 0.9},
            "hole": {"s": [0.7, 1.7, 1.4, 1.1, 1.0][f]},
            "brows": {"z": [-1.2, -0.6, 0.0, 0.0, 0.0][f]},
            "bee0": {"x": spread, "z": spread * 0.4}, "bee1": {"x": spread * 1.4, "z": -spread * 0.3},
            "bee2": {"x": spread * 0.8, "z": -spread * 0.6}}


BEEHIVE_OVERLAYS = {"fire": {1: [{"kind": "burst", "joint": "head", "point": (16, -9, 28), "r0_lu": 5.0, "r1_lu": 9.0,
                                  "n": 3, "a0": -40.0, "arc": 80.0}]}}


# -- Log Roller: a log held on a ramp, cut loose on fire ------------------------------------------
# World wave A: the drystone plinth; the ramp's posts lashed where the rails cross them; the log in bark ridges with
# growth rings and a crack on its near end, bound by two turns of rope; the lever with a wrapped grip; the pennant in
# two tones. (A team band on the log was tried: a team frame on every head frame costs 11% sheet pixels.)
LR_END = "#C8A884"
LR_KINDS = {STONE: "stone", STONE_LT: "stone", STONE_DK: "stone", BARK: "wood", BARK_DK: "wood", WOOD: "wood",
            WOOD_DK: "wood", LR_END: "wood", RING: "wood", ROPE: "leather", LASH: "leather", HIDE: "leather",
            MOSS: "fur", FINIAL: "bone", "team": "cloth", "#BFB098": "stone", "#CFC2A8": "stone", "#A69680": "stone", "#4E4034": "wood", "#93A653": "fur"}


def log_roller_build(rig):
    drystone_footing(rig, r=19, h=7, seed=4)
    g = Geo()
    for y in (-9, 9):
        g.capsule((-16, y, 30), (16, y, 8), 2.6, 2.4)
        g.capsule((-14, y, 6), (-14, y, 30), 2.4)
    rig.part("mount", g, BARK)
    for y in (-9, 9):
        KW.wraps(rig, "mount", (-14, y, 24.6), (-14, y, 29.4), 2.4, 3, LASH)
        KW.wraps(rig, "mount", (11.2, y, 10.6), (14.4, y, 8.4), 2.4, 2, LASH, w=0.65)
    g = Geo()
    for k in range(4):
        x = -10 + k * 7.5
        g.capsule((x, -10, 26 - k * 5.1), (x, 10, 26 - k * 5.1), 1.4)
    rig.part("mount", g, WOOD_DK, outline=0.5)
    KW.pennant(rig, "mount", -18, 6, 30, h=20, pole=BARK, finial=FINIAL, tie="pole")
    # head (no aim): the log and the stop lever
    rig.joint("log", "head", (-6, 0, 34))
    g = Geo().capsule((-6, -13, 34), (-6, 13, 34), 6.4)
    rig.part("log", g, WOOD)
    g = Geo()
    for k, a in enumerate((-160, -125, -95, -65, -35, 5, 45, 80, 120)):    # bark ridges along the log
        t = math.radians(a)
        cx, cz = -6 + 6.5 * math.cos(t), 34 + 6.5 * math.sin(t)
        g.capsule((cx, -11.0 + (k % 3) * 1.2, cz), (cx, 10.0 - (k % 2) * 2.0, cz), 0.55, 0.5)
    rig.part("log", g, BARK_DK, outline=0)
    g = Geo()
    for y in (-13.6, 13.6):
        cyl(g, (-6, y, 34), (-6, y * 1.03, 34), 5.6, bevel=0.2, segs=16)
    rig.part("log", g, LR_END, outline=0.3)
    g = Geo()            # growth rings, the heart and a drying crack on the near end grain
    for r in (1.7, 3.3, 4.7):
        g.lathe([(r - 0.3, 0.0), (r + 0.3, 0.0), (r + 0.3, 0.35), (r - 0.3, 0.35)], (-6, -14.05, 34), (-6, -15, 34),
                segs=16)
    g.lathe([(0.0, 0.0), (0.7, 0.0), (0.7, 0.35), (0.0, 0.35)], (-6, -14.05, 34), (-6, -15, 34), segs=10)
    g.capsule((-6.4, -14.2, 34.6), (-8.6, -14.2, 38.4), 0.35, 0.25)
    rig.part("log", g, RING, outline=0)
    # the binding: two turns of rope round the log, knotted on top
    KW.wraps(rig, "log", (-6, -10.2, 34), (-6, -6.2, 34), 6.0, 2, ROPE, w=0.7)
    g = Geo().sphere((-6, -8.2, 41.4), 1.5, cuts=2)
    rig.part("log", g, ROPE, outline=0.4)
    rig.joint("lever", "head", (4, 0, 26))
    g = Geo().capsule((4, -11, 26), (8, -11, 42), 1.6)
    rig.part("lever", g, WOOD_DK, outline=0.5)
    KW.wraps(rig, "lever", (6.6, -11, 36.4), (7.6, -11, 40.4), 1.6, 3, LASH, w=0.6)
    smoke_puff(rig, "head", (20, 0, 10), 0.7, name="dust")


def log_roller_idle(f):
    # 6-frame loop: the log strains against its rope, jittering; the lever trembles
    t = f / 6 * 2 * math.pi
    return {"log": {"r": 3.0 * math.sin(t), "x": 0.6 * math.sin(3 * t)}, "lever": {"r": 2.0 * math.sin(2 * t)}}


def log_roller_fire(f):
    x = [0, 14, 24, 0, 0][f]
    return {"lever": {"r": [18, -40, -50, -30, 0][f]}, "log": {"x": x - (1.5 if f == 0 else 0), "z": -x * 0.55,
                                                             "r": -x * 6, "hide": f == 2,
                                                             "s": 0.5 if f == 3 else 1.0},
            "dust": {"show": f in (1, 2)}}


# -- Grumpy Toad: a huge toad on a stump; the tongue is fx.tongue --------------------------------
# World wave A: the stump with bark ridges, shelf fungus and moss, webbed front feet on its rim (all inside the old
# stump's outline, so the mount frame's team share holds); the toad's skin in warts of two tones (dark with a pale glint) and belly folds; the bandana in two tones
# with a knot and tails; the pennant in two tones.
WART_LT = "#A7BC7E"
GT_KINDS = {TOAD: "hide", TOAD_LT: "hide", TOAD_DK: "hide", WART_LT: "hide", BARK: "wood", BARK_DK: "wood",
            WOOD: "wood", MOSS: "fur", CAP: "leather", BONE: "bone", HIDE: "leather", FINIAL: "bone",
            "team": "cloth", "#55473A": "wood", "#3F342B": "wood", "#93A653": "fur"}


def toad_build(rig):
    g = Geo()
    cyl(g, (0, 0, 0), (0, 0, 10), 15, 13, bevel=1.4, segs=16)
    rig.part("mount", g, BARK_ST)
    g = Geo()
    cyl(g, (0, 0, 9.4), (0, 0, 11), 12.5, bevel=0.5, segs=16)
    rig.part("mount", g, WOOD)
    stump_detail(rig, 15, 13, 10, seed=5, fungus=((-128.0, 5.0, 3.4), (-108.0, 3.2, 2.4), (-62.0, 6.4, 2.2)))
    g = Geo()
    for dx in (-10, 8):
        g.blob((dx, -8, 11), (5, 3, 2), p=2.0)
    rig.part("mount", g, MOSS_T, outline=0.5)
    # webbed front feet on the rim, toes forward
    g = Geo()
    for fx, fy in ((8.2, -7.6), (8.8, 5.6)):
        g.blob((fx, fy, 11.4), (2.6, 2.2, 1.1), p=2.2)
        for k in (-1, 0, 1):
            g.capsule((fx + 1.6, fy + k * 1.2, 11.4), (fx + 3.4, fy + k * 1.7, 10.9), 0.7, 0.5)
    rig.part("mount", g, TOAD, outline=0.5)
    KW.pennant(rig, "mount", -13, 5, 9, h=28, pole=BARK, finial=FINIAL, tie="pole")
    # head: the toad (pivot low, so it tilts to aim)
    g = Geo().blob((0, 0, 21), (15, 12, 10.5), p=2.2, taper=(1.0, 0.85))
    rig.part("head", g, TOAD)
    g = Geo().blob((5, -2, 17), (11, 9, 6), p=2.2)
    g.clip((0, 0, 17), (0, 0, 1))
    rig.part("head", g, TOAD_LT)
    g = Geo()
    warts = ((-6, 27), (2, 29), (-10, 21), (6, 25), (-2, 23.6), (-12.4, 25.2), (9.4, 22.4), (-4, 30.4), (3.4, 24.0))
    for dx, dz in warts:
        g.blob((dx, -10.5, dz), (1.8, 1.0, 1.6), p=2.0)
    rig.part("head", g, TOAD_DK, outline=0)
    g = Geo()            # a pale glint on each wart's lit side
    for dx, dz in warts:
        g.blob((dx - 0.4, -11.2, dz + 0.5), (0.8, 0.5, 0.6), p=2.0)
    rig.part("head", g, WART_LT, outline=0, highlight=False)
    g = Geo()            # belly folds
    for k, z in enumerate((14.6, 16.4)):
        g.capsule((2.0 + k, -9.0, z), (12.4 - k, -6.4, z + 0.8), 0.45, 0.35)
    rig.part("head", g, TOAD_DK, outline=0)
    for y in (-9, 7):
        g = Geo().blob((-2, y, 13), (5, 4, 3.6), p=2.2)
        rig.part("head", g, TOAD_DK if y > 0 else TOAD)
    # eyes on top
    for y, near in ((-6.5, True), (6.5, False)):
        g = Geo().sphere((7, y, 31), 4.4, cuts=3)
        rig.part("head", g, TOAD if near else TOAD_DK)
        if near:
            g = Geo().blob((9.6, y - 2.5, 32), (2.6, 1.6, 2.4), p=2.0)
            rig.part("head", g, EYE, outline=0.4)
            g = Geo().blob((10.8, y - 3.6, 32), (1.2, 0.8, 1.6), p=2.0)
            rig.part("head", g, PUPIL, outline=0)
            g = Geo().blob((8.6, y - 2, 35.2), (3.8, 1.6, 1.0), p=2.0, rot=(0, 18, 0))
            rig.part("head", g, TOAD_DK, outline=0.4)
    # jaw: opens on fire
    rig.joint("jaw", "head", (-6, 0, 18))
    g = Geo().blob((4, 0, 16.5), (12, 10.4, 3.8), p=2.2)
    g.clip((0, 0, 17.5), (0, 0, 1))
    rig.part("jaw", g, TOAD_LT)
    rig.joint("maw", "head", (4, 0, 18), hidden=True)
    g = Geo().blob((10, -1, 18.5), (6, 8, 3.2), p=2.0)
    rig.part("maw", g, MOUTH, outline=0, highlight=False)
    g = Geo().blob((11, 0, 18.4), (6, 6.4, 2.6), p=2.0)
    rig.part("maw", g, "#C8707E", outline=0)
    # throat sac (puffs up before the tongue lash) and an eyelid for blinks
    rig.joint("sac", "head", (7, -2, 14))
    g = Geo().blob((8, -2, 13.5), (6.4, 7.2, 4.4), p=2.2)
    rig.part("sac", g, TOAD_LT)
    rig.joint("lid", "head", (9.6, -9, 32), hidden=True)
    g = Geo().blob((9.8, -9.3, 32.3), (2.9, 1.9, 2.7), p=2.0)
    rig.part("lid", g, TOAD, outline=0.4)
    # a team bandana in two tones (a team-dark hem below it, a knot with two tails on the near side)
    g = Geo().blob((-6, 0, 22.5), (8.6, 12.6, 2.2), p=2.4, rot=(0, -20, 0))
    rig.part("head", g, team=True, outline=0.5)
    g = Geo().blob((-6.4, 0, 21.4), (8.9, 12.9, 2.0), p=2.4, rot=(0, -20, 0))
    look.team_part(rig, "head", g, outline=0.5)
    g = Geo().sphere((-9.0, -12.6, 22.4), 1.9, cuts=2)
    g.capsule((-9.4, -12.9, 21.2), (-12.4, -13.2, 17.8), 1.1, 0.6).capsule((-8.6, -12.9, 21.0), (-8.0, -13.2, 17.0),
                                                                         1.0, 0.5)
    look.team_part(rig, "head", g, outline=0.4)


def toad_idle(f):
    # 6-frame loop: breathing, the throat sac pulses twice, one blink
    t = f / 6 * 2 * math.pi
    w = math.sin(t)
    return {"head": {"sz": 1 + 0.025 * w, "sx": 1 - 0.02 * w}, "jaw": {"sz": 1 + 0.08 * max(0, w)},
            "sac": {"s": 1.0 + 0.25 * max(0.0, math.sin(2 * t))}, "lid": {"show": f == 4}}


def toad_fire(f):
    # 0 the throat inflates (anticipation), 1 tongue lash (the maw opens, the sac empties), 2-4 recover
    return {"jaw": {"r": [-2, -26, -22, -10, 0][f]}, "maw": {"show": f in (1, 2, 3)},
            "sac": {"s": [1.6, 0.7, 0.85, 1.0, 1.0][f]}, "lid": {"show": f == 0},
            "head": {"sz": [0.9, 1.08, 1.03, 1.0, 1.0][f], "sx": [1.08, 0.95, 0.98, 1.0, 1.0][f], "x": [-1.5, 2, 1, 0, 0][f]}}


# -- Quill Porcupine (content expansion, CONTENT_PLAN 5.1): a huge grumpy porcupine on a stump ---
QUILL = "#CFC3A6"
QUILL_TIP = "#4A3E36"
PORC = "#6E6052"
PORC_DK = "#54493F"
PORC_FACE = "#B7A58A"


# World wave A: the stump with bark ridges, shelf fungus and moss; paws with pale claws gripping its rim (inside the old
# stump's outline, so the mount frame's team share holds); fur tufts round the body's foot; the quills banded (pale, a dark band, a dark tip) so the crest reads as quills at game size; the bandana
# in two tones with a knot and tails; the pennant in two tones.
QUILL_BAND = "#7E6E5A"
QP_KINDS = {PORC: "fur", PORC_DK: "fur", PORC_FACE: "skin", QUILL: "bone", QUILL_TIP: "bone", QUILL_BAND: "bone",
            CLAW: "bone", BARK: "wood", BARK_DK: "wood", WOOD: "wood", MOSS: "fur", CAP: "leather", HIDE: "leather",
            FINIAL: "bone", "team": "cloth", "#55473A": "wood", "#3F342B": "wood", "#93A653": "fur"}


def porcupine_build(rig):
    g = Geo()
    cyl(g, (0, 0, 0), (0, 0, 11), 15, 13, bevel=1.4, segs=16)
    rig.part("mount", g, BARK_ST)
    g = Geo()
    cyl(g, (0, 0, 10.4), (0, 0, 12), 12.5, bevel=0.5, segs=16)
    rig.part("mount", g, WOOD)
    stump_detail(rig, 15, 13, 11, seed=2, fungus=((-125.0, 4.6, 3.2), (-104.0, 3.0, 2.2)))
    KW.moss(rig, "mount", [(-9.6, -7.0, 11.8, 2.8), (9.0, 4.0, 11.6, 2.2), (-5.0, -12.4, 6.0, 2.0)], MOSS_T, seed=4)
    g = Geo()            # paws on the rim
    for px, py in ((8.0, -8.0), (9.2, 4.6)):
        g.blob((px, py, 12.4), (2.4, 1.9, 1.4), p=2.2)
    rig.part("mount", g, PORC_DK, outline=0.5)
    g = Geo()
    for px, py in ((8.0, -8.0), (9.2, 4.6)):
        for k in (-1, 0, 1):
            g.capsule((px + 1.8, py + k * 0.9, 12.2), (px + 3.0, py + k * 1.1, 11.0), 0.42, 0.25)
    rig.part("mount", g, CLAW, outline=0.3)
    KW.pennant(rig, "mount", -13, 5, 9, h=26, pole=BARK, finial=FINIAL, tie="pole")
    # head: the porcupine's round body, a pale face, small round ears, a team bandana
    g = Geo().blob((0, 0, 22), (14, 11, 10), p=2.2, taper=(1.0, 0.9))
    rig.part("head", g, PORC, finish="hair")
    g = Geo().blob((12, -1, 20), (6, 6.4, 5.4), p=2.2)
    rig.part("head", g, PORC_FACE)
    g = Geo().blob((17.6, -1.4, 20.6), (1.6, 1.8, 1.4), p=2.2)
    rig.part("head", g, PUPIL, outline=0.4)
    g = Geo().blob((13.6, -6.0, 23.0), (1.8, 1.0, 1.9), p=2.0)
    rig.part("head", g, EYE, outline=0.4)
    g = Geo().blob((14.4, -6.6, 23.0), (0.8, 0.6, 1.2), p=2.0)
    rig.part("head", g, PUPIL, outline=0)
    g = Geo().capsule((11.4, -6.4, 25.8), (15.4, -5.6, 24.6), 0.9, 0.7)
    rig.part("head", g, PORC_DK, outline=0.3)
    g = Geo()
    for y in (-5.5, 5.5):
        g.blob((7.6, y, 27.4), (2.0, 1.2, 1.8), p=2.0)
    rig.part("head", g, PORC_DK)
    g = Geo().blob((6.6, 0, 22.4), (3.4, 11.8, 7.4), p=2.4, rot=(0, -18, 0))
    rig.part("head", g, team=True, outline=0.5)   # a wide team bandana round the neck
    g = Geo().blob((6.0, 0, 21.6), (3.5, 12.3, 7.9), p=2.4, rot=(0, -18, 0))
    look.team_part(rig, "head", g, outline=0.5)     # its team-dark hem
    g = Geo().sphere((5.0, -12.2, 17.4), 1.8, cuts=2)
    g.capsule((4.6, -12.4, 16.4), (3.2, -12.6, 12.8), 1.1, 0.6).capsule((5.4, -12.4, 16.4), (6.4, -12.6, 13.2), 1.0, 0.5)
    look.team_part(rig, "head", g, outline=0.4)
    g = Geo()            # fur tufts round the body's foot, over the stump's rim
    for k in range(9):
        a = math.radians(-172 + k * 19)
        c, s_ = math.cos(a), math.sin(a)
        g.lathe([(1.5, 0.0), (0.0, 3.6)], (11.6 * c, 9.2 * s_, 14.4), (14.2 * c, 11.4 * s_, 12.0), segs=6)
    rig.part("head", g, PORC_DK, finish="hair", outline=0.4)
    # the quill crest on its own joint: it bristles up before the volley
    rig.joint("quills", "head", (-2, 0, 26))
    g = Geo()
    k = 0
    for row, (z0, n) in enumerate(((26.0, 7), (22.0, 6), (30.0, 5))):
        for i in range(n):
            a = math.radians(30 + i * (120 / max(1, n - 1)))
            y = (row - 1) * 4.0
            base = (-2 + 9 * math.cos(a), y, z0 + 4 * math.sin(a))
            tip = (base[0] + 14 * math.cos(a) * 0.8 - 6, y * 1.3, base[2] + 12 * math.sin(a))
            g.lathe([(1.1, 0), (0.6, 6.0), (0, 13.0)], base, tip, segs=6)
            k += 1
    rig.part("quills", g, QUILL, outline=0.4)
    g = Geo()
    for row, (z0, n) in enumerate(((26.0, 7), (22.0, 6), (30.0, 5))):
        for i in range(n):
            a = math.radians(30 + i * (120 / max(1, n - 1)))
            y = (row - 1) * 4.0
            base = (-2 + 9 * math.cos(a), y, z0 + 4 * math.sin(a))
            tip = (base[0] + 14 * math.cos(a) * 0.8 - 6, y * 1.3, base[2] + 12 * math.sin(a))
            mid = tuple(b + (t - b) * 0.8 for b, t in zip(base, tip))
            g.lathe([(0.5, 0), (0, 3.0)], mid, tip, segs=6)
    rig.part("quills", g, QUILL_TIP, outline=0)
    g = Geo()            # a dark band round each quill's middle
    for row, (z0, n) in enumerate(((26.0, 7), (22.0, 6), (30.0, 5))):
        for i in range(n):
            a = math.radians(30 + i * (120 / max(1, n - 1)))
            y = (row - 1) * 4.0
            base = (-2 + 9 * math.cos(a), y, z0 + 4 * math.sin(a))
            tip = (base[0] + 14 * math.cos(a) * 0.8 - 6, y * 1.3, base[2] + 12 * math.sin(a))
            g.lathe([(0.0, 5.0), (0.95, 5.1), (0.95, 6.9), (0.0, 7.0)], base, tip, segs=6)
    rig.part("quills", g, QUILL_BAND, outline=0)
    # three loose quills that fly on the volley (the projectiles leave the muzzle)
    rig.joint("volley", "head", (16, 0, 30), hidden=True)
    g = Geo()
    for dz in (-3.0, 0.0, 3.0):
        g.lathe([(0.9, 0), (0.5, 5.0), (0, 10.0)], (12, -2, 30 + dz), (24, -2, 31 + dz * 1.4), segs=6)
    rig.part("volley", g, QUILL, outline=0.4)


def porcupine_idle(f):
    t = f / 6 * 2 * math.pi
    return {"head": {"sz": 1 + 0.02 * math.sin(t), "r": 2.0 * math.sin(t)}, "quills": {"r": 3.0 * math.sin(2 * t)}}


def porcupine_fire(f):
    # 0 puffs up (the quills bristle, squash), 1 the fan of quills flies (stretch), 2-4 settle
    return {"head": {"sz": [0.9, 1.1, 1.03, 1.0, 1.0][f], "sx": [1.08, 0.94, 0.98, 1.0, 1.0][f]},
            "quills": {"s": [1.2, 0.95, 1.0, 1.0, 1.0][f], "r": [-10, 12, 4, 0, 0][f]},
            "volley": {"show": f == 1, "x": 4.0 if f == 1 else 0.0}}


PORCUPINE_OVERLAYS = {"fire": {1: [{"kind": "burst", "joint": "head", "point": (18, -2, 30), "r0_lu": 6.0, "r1_lu": 12.0,
                                    "n": 5, "a0": -40.0, "arc": 100.0, "color": QUILL}]}}


# -- Sapling Sling (content expansion, CONTENT_PLAN 5.1): a young tree bent back on a rope ---------
LEAF = "#7F9A5A"
LEAF_DK = "#647D45"


# World wave A: the drystone plinth; the trigger stake lashed where the rope ties on; the sapling with bark ridges, a
# branch stub and more leaves in two tones; its team band and rag in two tones; the sling pouch with a rope rim and
# its cords; the pennant in two tones.
SS_KINDS = {STONE: "stone", STONE_LT: "stone", STONE_DK: "stone", BARK: "wood", BARK_DK: "wood", WOOD_DK: "wood",
            LEAF: "fur", LEAF_DK: "fur", ROPE: "leather", LASH: "leather", HIDE: "leather", "#8C7058": "leather",
            MOSS: "fur", FINIAL: "bone", "team": "cloth", "#BFB098": "stone", "#CFC2A8": "stone", "#A69680": "stone", "#4E4034": "wood", "#93A653": "fur"}


def sapling_build(rig):
    drystone_footing(rig, r=18, h=7, seed=9)
    g = Geo()
    g.capsule((10, -6, 4), (14, -6, 22), 1.8, 1.4)      # the trigger stake
    rig.part("mount", g, WOOD_DK)
    KW.wraps(rig, "mount", (12.9, -6, 17.0), (13.7, -6, 20.4), 1.5, 2, LASH, w=0.6)
    g = Geo()
    rope(g, [(14, -6, 20), (6, -4, 30), (-6, -2, 44)], 0.9)
    rig.part("mount", g, ROPE, outline=0.4)
    g = Geo()
    for dx, dy in ((-6, 6), (6, 6), (-2, -8)):
        rock(g, (dx, dy, 6), (3.6, 3, 3), seed=int(dx * 3 + dy), jag=0.2)
    rig.part("mount", g, STONE_DK)
    KW.pennant(rig, "mount", -16, 6, 6, h=26, pole=BARK, finial=FINIAL, tie="pole")
    # head: the bent sapling trunk (pivot at its root) with a leather sling pouch at the top
    rig.joint("trunk", "head", (0, 0, 6))
    g = Geo()
    pts = [(0, 0, 6), (-3, 0, 18), (-7, 0, 30), (-12, 0, 40), (-18, 0, 48)]
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 3.2 - 0.4 * pts.index(a), 2.8 - 0.4 * pts.index(a))
    g.capsule((-4.6, 0, 24.0), (2.4, -0.6, 29.6), 1.2, 0.7)          # a branch stub
    rig.part("trunk", g, BARK)
    g = Geo()            # bark ridges up the trunk's camera side
    for k, (a, b) in enumerate(zip(pts, pts[1:])):
        r = 3.0 - 0.4 * k
        for dx in (-0.45, 0.55):
            g.capsule((a[0] + dx * r, -r * 0.82, a[2] + 1.0), (b[0] + dx * r, -r * 0.82, b[2] - 1.0), 0.45, 0.4)
    rig.part("trunk", g, BARK_DK, outline=0)
    g = Geo()
    for (x, z), r in (((-6, 34), (5, 3.4, 3.4)), ((-15, 46), (6, 4, 4.2)), ((-10, 28), (4, 3, 3)),
                      ((3.0, 30.4), (3.0, 2.6, 2.4)), ((-21, 43.6), (3.4, 2.8, 3.0))):
        g.blob((x, -2, z), r, p=2.2)
    rig.part("trunk", g, LEAF, finish="hair")
    g = Geo()
    for (x, z), r in (((-3, 40), (3.6, 3.0, 3.0)), ((-20, 50), (4, 3.2, 3.6)), ((-12.6, 35.0), (3.0, 2.6, 2.6)),
                      ((-8.4, 44.6), (3.0, 2.6, 2.8))):
        g.blob((x, 2, z), r, p=2.2)
    rig.part("trunk", g, LEAF_DK, finish="hair")
    g = Geo()
    cyl(g, (-1.3, 0, 15.6), (-1.6, 0, 19.5), 3.5, bevel=0.3, segs=14)
    g.blob((-9.4, -5.6, 30.8), (4.2, 1.5, 6.0), p=2.2, rot=(0, 25, 0))   # a team rag tied on a branch (in front of the
    #                                                                      leaves, where it reads in every frame)
    rig.part("trunk", g, team=True, outline=0.4)
    g = Geo()            # the band's team-dark lower half and the rag's knot
    cyl(g, (-1.0, 0, 13.0), (-1.3, 0, 15.6), 3.55, bevel=0.3, segs=14)
    g.sphere((-7.4, -6.0, 35.2), 1.5, cuts=2)
    look.team_part(rig, "trunk", g, outline=0.4)
    rig.joint("pouch", "trunk", (-18, 0, 48))
    g = Geo().blob((-19, -1, 51), (4.4, 3.6, 2.6), p=2.2, taper=(0.8, 1.2))
    rig.part("pouch", g, "#8C7058", outline=0.5)
    g = Geo().lathe([(4.0, -0.5), (4.6, 0.0), (4.0, 0.5)], (-19, -1, 52.8), (-19, -1, 53.8), segs=14)
    g.capsule((-15.0, -1.0, 51.6), (-17.2, -0.6, 48.4), 0.4).capsule((-23.0, -1.0, 51.6), (-19.6, -0.6, 48.0), 0.4)
    rig.part("pouch", g, ROPE, outline=0.4)          # the pouch's rope rim and cords
    rig.joint("stone", "pouch", (-19, -1, 53))
    g = Geo()
    rock(g, (-19, -1, 54), (4.0, 3.6, 3.6), seed=21, jag=0.15)
    rig.part("stone", g, STONE)
    g = Geo().blob((-19, -1.0, 49.2), (4.6, 3.8, 1.2), p=2.4)
    rig.part("pouch", g, team=True, outline=0.4)
    smoke_puff(rig, "head", (10, 0, 40), 0.8, name="dust")


def sapling_idle(f):
    t = f / 6 * 2 * math.pi
    return {"trunk": {"r": 2.0 * math.sin(t)}, "stone": {"r": 6 * math.sin(2 * t)}}


def sapling_fire(f):
    # 0 hauled further back (strain), 1 released: the sapling whips forward (smear), 2 overshoot,
    # 3 bounces back, 4 reloaded and bent back again
    a = [8, -70, -95, -40, 0][f]
    return {"trunk": {"r": a, "sz": [0.95, 1.06, 1.0, 1.0, 1.0][f]}, "stone": {"hide": f in (1, 2, 3)},
            "dust": {"show": f in (1, 2)}}


SAPLING_OVERLAYS = {"fire": {1: KW.smear_two_tone({"kind": "arc", "joint": "trunk", "inner": (-10, 0, 38),
                                                   "outer": (-19, 0, 52), "color": LEAF, "taper": 0.2, "t0": 0.0,
                                                   "t1": 0.85, "lines": 3})}}


TURRETS = [
    turret_module("rock_tosser", "Rock Tosser", "stone", 58, CANVAS, FEET, (0, 22), (-2.5, 0, 57), rock_tosser_build,
                  rock_tosser_idle, rock_tosser_fire, aim=(0, 0), fire_kind="swing", muzzle_joint="boulder",
                  idle_frames=6, overlays=ROCK_TOSSER_OVERLAYS),
    turret_module("angry_beehive", "Angry Beehive", "stone", 50, CANVAS, FEET, (8, 44), (14, -9, 28), beehive_build,
                  beehive_idle, beehive_fire, aim=(0, 0), fire_kind="pulse", idle_frames=6, overlays=BEEHIVE_OVERLAYS),
    turret_module("log_roller", "Log Roller", "stone", 44, CANVAS, FEET, (0, 0), (16, 0, 12), log_roller_build,
                  log_roller_idle, log_roller_fire, aim=(0, 0), fire_kind="release", idle_frames=6),
    turret_module("grumpy_toad", "Grumpy Toad", "stone", 40, CANVAS, FEET, (0, 12), (15, -2, 18.5), toad_build,
                  toad_idle, toad_fire, aim=(-18, 18), fire_kind="tongue", idle_frames=6),
    # content expansion, Stone wave (CONTENT_PLAN 5.1)
    turret_module("quill_porcupine", "Quill Porcupine", "stone", 44, CANVAS, FEET, (0, 18), (18, -2, 30), porcupine_build,
                  porcupine_idle, porcupine_fire, aim=(-20, 25), fire_kind="pulse", idle_frames=6,
                  overlays=PORCUPINE_OVERLAYS),
    turret_module("sapling_sling", "Sapling Sling", "stone", 56, CANVAS, FEET, (0, 6), (-19, -1, 54), sapling_build,
                  sapling_idle, sapling_fire, aim=(0, 0), fire_kind="swing", muzzle_joint="stone", idle_frames=6,
                  overlays=SAPLING_OVERLAYS),
]

# world wave A: the items brought to the detail standard (look_world.opt_in; the others render as before)
LW.opt_in(TURRETS[0], RT_KINDS, highlight=1.6, shade=KW.SHADE_WORLD)
LW.opt_in(TURRETS[1], BH_KINDS, highlight=1.6, shade=dict(KW.SHADE_WORLD, shadow=1.0))   # warm straw: no darker band
LW.opt_in(TURRETS[2], LR_KINDS, highlight=1.6, shade=KW.SHADE_WORLD)
LW.opt_in(TURRETS[3], GT_KINDS, highlight=1.6, shade=KW.SHADE_WORLD)
LW.opt_in(TURRETS[4], QP_KINDS, highlight=1.6, shade=KW.SHADE_WORLD)
LW.opt_in(TURRETS[5], SS_KINDS, highlight=1.6, shade=KW.SHADE_WORLD)
