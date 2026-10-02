"""Drum Shaman: Stone Age support (DESIGN A5.2). War drum aura, rock projectile, 66 lu.

Look (A11): a hunched old shaman with a long grey beard (follow-through), a horned animal
skull worn as a headdress, a team hide cloak over his back and shoulders with a ragged hem
(follow-through), a bone bead necklace and a big team-painted hand drum slung at his belly
with a pale hide head and bone lacing. His near hand holds a bone drumstick. Idle is a slow
swaying rhythm; the attack raises the stick high, holds, smears down and hits the drum: the
drum squashes and a pale beat ring flares (the rock projectile spawns at `muzzle`, the drum
head, on the impact frame).

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    nods to his own rhythm with his eyes closed, the stick tapping
  walk    walk v3 (ANIM_SPEC G2): a hunched trot with a side-to-side roll, the stick tapping the
          drum on every footfall
  attack_b  lifts the drum overhead and slams it down with both hands
  attack  DOUBLE BEAT LAUNCH: a small beat that makes the stone on the drum hop, then both
          hands go high and come down in a big beat that bounces the stone off the skin (the
          projectile leaves the drum `muzzle` on impact; beat rings flare); his off hand puts
          a new stone on the drum at the end
  hit     light;  die  D3 dizzy spin, then sits down hard with spiral eyes
Details: a bone spiral painted on the drum shell, bead strings hanging off the drum, belt
rattles, face kit eyes and mouths.
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import CaveBody

SLUG = "drum_shaman"
GAIT_NAME = "biped"
NAME = "Drum Shaman"
HEIGHT_LU = 66
CANVAS = (256, 236)
FEET = (120, 210)
ANCHORS = {"head": (0, 64), "hitCenter": (0, 30)}
NO_RETIME = True
ROCK = "#9A948A"
RATTLE = "#B8A07A"

SKIN = "#86695A"
BEARD = "#D8D2C6"
BROW = "#BDB5A8"
FUR = "#6E6152"
BONE = "#EDE3C8"
BONE_DK = "#C9BC9C"
HIDE = "#E2D3B0"
WOOD = "#8A7560"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#3E2020"
RING = "#FFF3D2"

# drum: axis from the bottom to the head, tilted forward so the head faces the camera a bit
DRUM_BOT = (9.5, -3.0, 12.5)
DRUM_TOP = (15.5, -6.5, 24.5)
DRUM_R = 9.2
STICK = 14.0


THIGH_Z, KNEE_Z, ANKLE_Z = 18.0, 10.6, 3.6   # walk v3: longer legs (ANIM_SPEC 2.0 rule 5)
LIFT = 2.0


def build(rig):
    global ARM_R, ARM_L, STICK_TIP, RIG
    RIG = rig
    body = CaveBody(rig, SKIN, FUR, hip_z=14.5, knee_z=KNEE_Z, ankle_z=ANKLE_Z, waist_z=15.5,
                    shoulder_z=34.0, neck_z=35.5, hip_y=5.8, shoulder_y=11.6,
                    elbow=(1.5, 27.0), wrist=(3.8, 20.5), leg_r=(3.9, 3.4, 3.1),
                    arm_r=(3.9, 3.4, 3.3), fist_r=3.8, torso=((0, 26.5), (10.4, 9.6, 10.4)),
                    torso_taper=(1.1, 0.94), foot_len=4.2, thigh_z=THIGH_Z, foot_joint=True,
                    far_shade=0.8)
    rig.rest_offset["torso"] = (0, 0, LIFT)
    fr = body.fist["r"]

    # team hide cloak over the back and shoulders; the hem swings
    g = Geo().blob((-3.0, 0, 30.0), (10.2, 12.8, 8.2), p=2.4, taper=(1.1, 0.9))
    g.clip((6.5, 0, 0), (1, 0, 0))
    g.blob((0.0, 0, 33.8), (8.6, 12.6, 3.8), p=2.4)
    rig.part("torso", g, team=True)
    rig.secondary("cloak", "torso", (-7.0, 0, 30.0), (-10.5, 0, 14.0), max_deg=10, gain=1.0)
    g = Geo().blob((-8.6, 0, 22.4), (5.4, 12.0, 9.8), p=2.4, taper=(1.25, 0.9))
    for y in (-9.0, -4.0, 1.0, 6.0, 10.0):
        g.lathe([(2.6, 0), (0, -4.0)], (-9.6, y, 13.8), segs=8)
    rig.part("cloak", g, team=True)
    g = Geo().capsule((1.0, -9.0, 20.0), (1.0, 9.0, 20.0), 1.6)
    rig.part("torso", g, FUR, finish="hair")
    # bone bead necklace
    g = Geo()
    for x, y, z in ((6.6, -6.0, 31.0), (8.4, -3.0, 29.6), (9.0, 0.5, 29.2), (8.2, 4.0, 29.8)):
        g.sphere((x, y, z), 1.3, cuts=2)
    rig.part("torso", g, BONE, outline=0.6)

    # head: bald crown under a horned skull, bushy white brows, big nose, long beard
    head = Geo().blob((2.0, 0, 46.0), (9.6, 9.4, 9.8), p=2.3)
    head.blob((12.2, -0.4, 44.6), (3.4, 2.8, 3.6), p=2.0, rot=(0, 20, 0))  # big nose
    eyes = Geo()
    for y in (-4.2, 3.6):
        eyes.blob((10.2, y, 46.6), (3.1, 3.3, 3.2))
    pup = Geo()
    for y in (-4.2, 3.6):
        pup.blob((12.6, y - 0.3, 46.4), (1.2, 1.9, 2.0))
    face = F.Face(rig, "head", [head, eyes, pup])
    rig.part("head", head, SKIN)
    rig.part("head", eyes, EYE, highlight=False)
    rig.joint("pupils", "head", (12.6, 0, 46.4))
    rig.part("pupils", pup, PUPIL, outline=0)
    rig.joint("brow", "head", (11.0, 0, 49.6))
    g = Geo().capsule((9.6, -7.4, 50.2), (12.2, -1.8, 49.4), 2.2, 1.7)
    g.capsule((12.2, 1.8, 49.4), (10.0, 6.4, 50.2), 1.7, 2.2)
    rig.part("brow", g, BROW, finish="hair", outline=0.6)
    face.eye_marks([(12.2, 46.6)], 3.0, SKIN)
    rig.joint("mouth", "head", (10.6, 0, 40.0))
    g = Geo().blob((10.8, -0.4, 40.2), (1.2, 3.0, 0.9), p=2.4)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    face.mouths((11.2, 40.0), 4.6)
    rig.secondary("beard", "head", (8.0, 0, 41.0), (8.5, 0, 25.0), max_deg=12, gain=1.1)
    g = Geo().blob((8.0, 0, 38.4), (6.2, 8.4, 4.2), p=2.2)
    g.lathe([(6.2, 0), (4.8, -5.0), (2.6, -9.5), (0, -13.0)], (8.2, 0, 38.0), segs=14,
            squash=(0.8, 1.0))
    rig.part("beard", g, BEARD, finish="hair")
    g = Geo().blob((11.0, -0.2, 41.8), (2.4, 5.4, 1.6), p=2.2)  # moustache
    rig.part("head", g, BEARD, finish="hair", outline=0.7)
    # skull headdress: a bone cranium cap worn on the back of the crown, dark eye holes,
    # and branching antlers that sweep up and back (the shaman's silhouette)
    g = Geo().blob((-1.6, 0, 53.8), (8.8, 9.8, 5.8), p=2.4, rot=(0, -14, 0))
    g.blob((6.2, 0, 54.4), (4.6, 5.4, 3.0), p=2.4, rot=(0, 10, 0))  # snout over the brow
    rig.part("head", g, BONE)
    g = Geo()
    for y in (-3.4, 3.4):
        g.blob((9.4, y, 55.0), (1.2, 1.6, 1.4), p=2.2)
    rig.part("head", g, "#3A3029", outline=0)
    g = Geo()
    for y in (-1, 1):
        base, a1, a2 = (-3.0, 6.5 * y, 57.5), (-9.0, 9.0 * y, 66.0), (-16.5, 10.0 * y, 71.0)
        g.capsule(base, a1, 1.9, 1.5).capsule(a1, a2, 1.5, 0.8)
        g.capsule(a1, (-5.0, 9.5 * y, 72.5), 1.3, 0.7)          # front tine
        g.capsule(((a1[0] + a2[0]) / 2, 9.5 * y, (a1[2] + a2[2]) / 2), (-14.0, 10.0 * y, 76.0), 1.2, 0.6)
        g.capsule(base, (-12.0, 8.0 * y, 60.0), 1.4, 0.7)       # brow tine back
    rig.part("head", g, BONE_DK, outline=0.9)

    # the drum: team shell, pale hide head, bone lacing; slung at the belly
    rig.joint("drum", "torso", DRUM_BOT)
    ax = tuple(b - a for a, b in zip(DRUM_BOT, DRUM_TOP))
    L = (ax[0] ** 2 + ax[1] ** 2 + ax[2] ** 2) ** 0.5
    g = Geo().lathe([(0, 0), (DRUM_R * 0.8, 0.2), (DRUM_R * 0.92, 3.0), (DRUM_R, L - 1.6),
                     (DRUM_R * 0.97, L - 0.6), (0, L - 0.5)], DRUM_BOT, DRUM_TOP, segs=22)
    rig.part("drum", g, team=True)
    g = Geo().lathe([(0, L - 1.0), (DRUM_R + 0.6, L - 1.0), (DRUM_R + 0.7, L + 0.2),
                     (DRUM_R * 0.8, L + 0.8), (0, L + 0.9)], DRUM_BOT, DRUM_TOP, segs=22)
    rig.part("drum", g, HIDE)
    g = Geo()
    import math
    for i in range(7):
        a = 2 * math.pi * (i + 0.25) / 7
        u = (math.cos(a) * DRUM_R * 1.02, math.sin(a) * DRUM_R * 1.02)
        # lacing: diagonal bone cords down the shell (built in the drum's local frame)
        g.capsule((u[0], u[1], L - 1.2), (u[0] * 0.9, u[1] * 0.9 + 1.5, 2.2), 0.55)
    from mathutils import Matrix, Vector
    m = Matrix.Translation(Vector(DRUM_BOT)) @ Vector((0, 0, 1)).rotation_difference(
        Vector(ax).normalized()).to_matrix().to_4x4()
    for v in g.bm.verts:
        v.co = m @ v.co
    rig.part("drum", g, BONE_DK, outline=0)
    top_c = tuple(t + a / L * 0.9 for t, a in zip(DRUM_TOP, ax))
    rig.track("muzzle", "drum", top_c)
    # a bone spiral painted on the shell (a decal on the near side)
    shell = Geo().lathe([(0, 0), (DRUM_R, 0.0), (DRUM_R, L), (0, L)], DRUM_BOT, DRUM_TOP, segs=22)
    dface = F.Face(rig, "drum", [shell])
    c = dface.hit(12.5, 16.5)
    g = Geo()
    sp = [(3.6 * (t / 16) * math.cos(t * 0.7), 3.6 * (t / 16) * math.sin(t * 0.7)) for t in range(1, 17)]
    dface.stroke(g, c, sp, 1.2, 0.4)
    rig.part("drum", g, BONE, highlight=False, outline=0)
    shell.bm.free()
    # bead strings hanging off the drum rim (follow-through)
    rig.secondary("beads", "drum", (8.0, -10.5, 18.0), (6.5, -11.5, 7.0), max_deg=22, gain=1.4)
    g = Geo().capsule((8.0, -10.5, 18.0), (6.8, -11.2, 8.5), 0.5)
    for k, z in enumerate((15.5, 12.5, 9.5)):
        g.sphere((7.8 - 0.4 * k, -11.0, z), 1.6, cuts=2)
    rig.part("beads", g, BONE, outline=0.5)
    # the stone that sits on the drum skin and is bounced off it
    rig.joint("stone", "drum", top_c)
    g = Geo().blob((top_c[0] + 0.5, top_c[1] - 1.0, top_c[2] + 2.6), (3.4, 3.0, 2.8), p=2.1)
    rig.part("stone", g, ROCK, outline=0.8)
    # beat arcs: two pale arcs facing the camera that flare over the drum on impact
    import math as _m
    cx, cy, cz = DRUM_TOP[0] + 1.0, DRUM_TOP[1] - 8.0, DRUM_TOP[2] + 2.0
    rig.joint("ring", "drum", (cx, cy, cz), hidden=True)
    g = Geo()
    for r, w in ((12.0, 1.5), (17.0, 1.2)):
        pts = [(cx + r * _m.cos(_m.radians(t)), cy, cz + r * 0.8 * _m.sin(_m.radians(t)))
               for t in range(-10, 111, 15)]
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, w)
    rig.part("ring", g, glow=RING, outline=0)

    # drumstick: a bone with a knob, in the near fist, along +Z at rest
    rig.joint("stick", "fore_r", fr)
    g = Geo().capsule((fr[0], fr[1] - 0.5, fr[2] - 2.0), (fr[0], fr[1] - 0.5, fr[2] + STICK - 2.0), 1.1, 1.0)
    rig.part("stick", g, BONE)
    g = Geo().blob((fr[0], fr[1] - 0.5, fr[2] + STICK), (3.0, 3.0, 3.2), p=2.2)
    rig.part("stick", g, HIDE)
    tip = (fr[0], fr[1] - 0.5, fr[2] + STICK)
    STICK_TIP = tip
    # team-dyed forearm wraps and a team sash across the belly
    for side, y in (("r", -11.6), ("l", 11.6)):
        g = Geo().capsule((2.6, y, 23.6), (3.2, y, 20.8), 4.0, 3.9)
        rig.part(f"fore_{side}", g, team=True, outline=0.7)
    g = Geo().capsule((8.2, -6.2, 21.0), (-2.0, 9.0, 31.0), 3.4, 3.2)
    g.lathe([(10.4, 0), (11.2, 0.5), (11.2, 3.6), (10.4, 4.0)], (0.5, 0, 17.0), segs=22)
    rig.part("torso", g, team=True, outline=0.7)
    # belt rattles (two gourds on cords at the hip)
    g = Geo().blob((-3.0, -9.8, 17.0), (2.4, 2.0, 3.0), p=2.2).blob((1.2, -10.4, 16.0), (2.0, 1.8, 2.6), p=2.2)
    rig.part("hips", g, RATTLE, outline=0.6)
    rig.track("_foot", "foot_r", (2.0, -5.8, 0.0))
    rig.track("_foot_l", "foot_l", (2.0, 5.8, 0.0))
    ARM_R = body.arm("r", "stick", tip)
    ARM_L = body.arm("l")


ARM_R = ARM_L = STICK_TIP = None


# -- poses ---------------------------------------------------------------------------------
def stick_arm(a, b, c):
    return ARM_R.pose(a, b, c)


def off_arm(a, b):
    return ARM_L.pose(a, b)


def stance():
    # hunched; stick poised over the drum; far hand steadies the drum's rim
    return merge(stick_arm(-45, 20, 50), off_arm(-40, -10), {"torso": {"r": -8}, "head": {"r": 6}})


def _idle(f):
    # nods to his own rhythm with his eyes closed; the stick taps on beats 0 and 4
    tap = [1.0, 0.0, -0.4, 0.2, 1.0, 0.0, -0.4, 0.2][f]

    def extra(ctx):
        return {"arm_r": {"r": -6 * tap}, "stick": {"r": -8 * tap},
                "head": {"r": -5 * tap}, "torso": {"rz": 3 * ctx["sh"]}, "beads": {"r": 4 * tap}}
    pose = M.idle_v2(f, stance(), extra=extra)
    if f in (1, 2, 3, 5, 6):
        pose = merge(pose, F.expr("blink"))
    return pose


# -- walk v3: G2 hunched trot at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 65 ms -------------
RIG = None
SPEED = 81.25
LEGS = {s: G.Leg(f"thigh_{s}", f"shin_{s}", (1.0, y, ANKLE_Z), foot=f"foot_{s}",
                 toe=(4.7, y, 0.4), heel=(-1.4, y, 0.4)) for s, y in (("r", -5.8), ("l", 5.8))}
GAIT = G.Gait(8, 520, SPEED, G.biped_feet(LEGS["l"], LEGS["r"], x_mid=1.4), 0.36,
              lift=6.0, kick=2.0, reach=0.0, toe_off=20.0, early_lift=1.4, drag=0.3, lift_peak=0.38)
for _k, (_leg, _ph, _x, _gz) in list(GAIT.feet.items()):
    GAIT.feet[_k] = (_leg, _ph - 0.03, _x, _gz)


def _walk(f, report=None):
    # the stick taps the drum on each footfall (DOWN frames 1 and 5), the drum and beads bob late
    tap = [0.4, 1.0, -0.3, -0.6][f % 4]

    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"body": {"rx": 4 * math.sin(ctx["p"])}, "torso": {"rx": -3 * math.sin(ctx["p"])},
                "arm_r": {"r": -7 * tap}, "stick": {"r": -10 * tap},
                "drum": {"r": 2.5 * lag}, "beads": {"r": 6 * lag}, "beard": {"r": 5 * lag}}
    return M.walk_v3(RIG, f, stance(), GAIT, legs=LEGS, bob=M.BRISK_BOB, sq=M.BRISK_SQ, lean=-6.0,
                     twist=5.0, nod=3.0, extra=extra, report=report)


# 11 unique frames, moves.SMALL_MELEE_MS
#          read small-beat wind HOLD smear lead IMP  rebound recoil place settle
D_A = [-45, -40, 40, 70, 20, -30, -46, -38, -42, -45, -45]
D_B = [20, -10, 110, 130, 60, -5, -8, 25, 15, 20, 20]
D_C = [50, 0, 140, 160, 70, -10, -32, 30, 40, 50, 50]
D_OA = [-40, -40, 45, 75, 25, -30, -42, -36, -20, 10, -40]
D_OB = [-10, -10, 100, 125, 55, -8, -12, -6, 30, 60, -10]
D_T = [-8, -12, 4, 8, -8, -16, -22, -16, -12, -10, -8]
D_Q = [0.0, -0.06, 0.05, 0.1, 0.04, -0.02, -0.16, 0.05, -0.04, 0.0, 0.0]
D_Z = [0.0, -1.0, 1.0, 2.2, 0.5, -0.5, -2.4, 0.4, -0.6, 0.0, 0.0]
D_H = [6, 10, -6, -10, 4, 10, 14, 8, 10, 6, 6]
D_STONE = [0.0, 5.0, 1.0, 0.0, 0.0, 0.0, None, None, None, 0.0, 0.0]
D_DRUM_SZ = [1.0, 0.9, 1.04, 1.0, 1.0, 1.0, 0.8, 1.1, 0.96, 1.0, 1.0]


def _attack_pose(f):
    pose = merge(stick_arm(D_A[f], D_B[f], D_C[f]), off_arm(D_OA[f], D_OB[f]), {
        "torso": {"r": D_T[f]}, "head": {"r": D_H[f]},
        "drum": {"sz": D_DRUM_SZ[f], "sx": 1.0 / max(0.8, D_DRUM_SZ[f]) ** 0.5},
        "thigh_r": {"r": [0, 2, -4, -6, 2, 8, 12, 8, 4, 2, 0][f]},
        "thigh_l": {"r": [0, -2, 4, 6, -2, -6, -10, -6, -3, -1, 0][f]},
        "ring": {"show": f in (6, 7), "s": 1.0 if f == 6 else 1.5, "sz": 1.0 if f == 6 else 0.7},
    }, M.body_about((0, 0, 20), z=D_Z[f], q=D_Q[f]))
    st = D_STONE[f]
    pose["stone"] = {"hide": True} if st is None else {"z": st, "r": 25 * st}
    if f in (2, 3, 4, 5):
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.0}})
    elif f in (6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    elif f == 1:
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_clip():
    ov = {
        1: [{"kind": "rings", "joint": "drum", "point": DRUM_TOP, "radii_lu": (7.0,), "a0": -20.0, "a1": 70.0}],
        4: [{"kind": "arc", "joint": "stick", "inner": (STICK_TIP[0], STICK_TIP[1], STICK_TIP[2] - 5.0),
             "outer": (STICK_TIP[0], STICK_TIP[1], STICK_TIP[2] + 3.0), "color": HIDE, "taper": 0.2,
             "lines": 2}],
        5: [{"kind": "arc", "joint": "stick", "inner": (STICK_TIP[0], STICK_TIP[1], STICK_TIP[2] - 5.0),
             "outer": (STICK_TIP[0], STICK_TIP[1], STICK_TIP[2] + 3.0), "color": HIDE, "taper": 0.2,
             "lines": 2}],
        6: [{"kind": "rings", "joint": "drum", "point": DRUM_TOP, "radii_lu": (9.0, 15.0, 21.0), "a0": -30.0,
             "a1": 100.0},
            {"kind": "burst", "joint": "drum", "point": DRUM_TOP, "r0_lu": 6.0, "r1_lu": 11.0, "n": 3,
             "a0": 40.0, "arc": 100.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: the drum overhead, one big two-handed slam (ANIM_SPEC appendix B) -----------------
# unique: 0 = A read, 1 = A small beat, 2 lift (the drum up at the chest), 3 HOLD (the drum high
# over his head, leaning back), 4 the drum coming down (loops with 3 while the wind-up lasts),
# 5 IMPACT (the drum back at the belly, both hands slam the skin, rings), 6 rebound, 7-9 = A
B_SEQ = [0, 1, 2, 3, 4, 4, 5, 6, 7, 8, 9]
#          lift  HOLD  down   IMP  rebound
# Review N1 (2026-10-02): A's hold is a standing figure with the stick up; B must not read the
# same at 62 px. B's hold arches far back on one leg (the near knee pulled up high, the big drum
# held over and behind the head) and the impact drops him to a deep kneel, the drum slammed down
# in front of his knee: a different body level on both key poses.
B_DX = [3.0, -4.0, 2.0, 6.0, 4.0]
B_DZ = [16.0, 46.0, 18.0, 5.0, 6.0]
B_DR = [20, 20, 30, -6, -8]
B_SA = [30, 100, 60, -50, -40]
B_SB = [80, 100, 100, -30, 0]
B_SC = [90, 110, 110, -40, 10]
B_OA = [30, 98, 50, -46, -40]
B_OB = [80, 98, 90, -26, -10]
B_T = [-2, 20, 0, -26, -20]
B_H = [2, -14, 4, 18, 12]
B_Z = [0.8, 3.6, 0.5, -8.0, -6.0]
B_Q = [0.03, 0.10, 0.04, -0.14, 0.05]
B_THR = [2, 72, 10, 80, 70]
B_SHR = [0, -84, -10, -95, -85]
B_THL = [-2, -4, -4, -30, -26]
B_SHL = [0, -6, 0, -70, -60]


def _b_pose(i):
    if i in (0, 1):
        return _attack_pose(i)
    if i >= 7:
        return _attack_pose(i + 1)
    k = i - 2
    pose = merge(stick_arm(B_SA[k], B_SB[k], B_SC[k]), off_arm(B_OA[k], B_OB[k]), {
        "torso": {"r": B_T[k]}, "head": {"r": B_H[k]},
        "drum": {"x": B_DX[k], "z": B_DZ[k], "r": B_DR[k],
                 "sz": 0.82 if k == 3 else 1.0, "sx": 1.1 if k == 3 else 1.0},
        "thigh_r": {"r": B_THR[k]}, "shin_r": {"r": B_SHR[k]},
        "thigh_l": {"r": B_THL[k]}, "shin_l": {"r": B_SHL[k]},
        "ring": {"show": k == 3},
        "stone": {"hide": k >= 3},
    }, M.body_about((0, 0, 20), z=B_Z[k], q=B_Q[k]))
    if k in (0, 1, 2):
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.0}})
    else:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    return pose


def _attack_b():
    ov = {
        3: [{"kind": "rings", "joint": "drum", "point": DRUM_TOP, "radii_lu": (6.0, 10.0), "a0": 40.0, "a1": 140.0}],
        4: [{"kind": "streak", "joint": "drum", "point": DRUM_TOP, "color": HIDE, "width_lu": 9.0, "from": 3}],
        5: [{"kind": "rings", "joint": "drum", "point": DRUM_TOP, "radii_lu": (10.0, 17.0, 24.0), "a0": -40.0,
             "a1": 120.0},
            {"kind": "burst", "joint": "drum", "point": DRUM_TOP, "r0_lu": 7.0, "r1_lu": 13.0, "n": 4,
             "a0": 30.0, "arc": 120.0},
            {"kind": "dust", "ground": (4.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 24, "spread": 1.2}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 7: ("attack", 8), 8: ("attack", 9), 9: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], M.SMALL_MELEE_MS, impact=5,
                  sequence=B_SEQ, overlays=ov, reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 14 * a}, "torso": {"r": 10 * a},
                "thigh_r": {"r": 18 * max(a, 0)}, "shin_r": {"r": -22 * max(a, 0)},
                "arm_r": {"r": 20 * a}, "stick": {"r": 20 * a}, "arm_l": {"r": 26 * a},
                "brow": {"z": 1.4 * max(a, 0)}, "beard": {"r": 10 * a}}
    return M.hit_light(k, stance(), recoil, face_hurt=F.expr("squeeze", "o"))


def _die(k):
    sit = [0.0, 0.0, 0.0, 0.2, 1.0, 0.9, 1.0, 1.0, 1.0, 1.0][k]
    flail = [0.3, 0.8, 1.0, 0.8, 0.3, 0.2, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(stance(), M.die_d3(k, center_z=26.0, height=HEIGHT_LU), {
        # a hard sit that changes the silhouette at game size: lower, leaning back, legs
        # out in front, arms flopped wide, the head lolling
        "hips": {"z": -13.0 * sit},
        "thigh_r": {"r": 85 * sit}, "shin_r": {"r": -35 * sit},
        "thigh_l": {"r": 80 * sit}, "shin_l": {"r": -30 * sit},
        "torso": {"r": 28 * sit + 8 * flail}, "head": {"r": 10 * flail - 16 * sit, "rx": 14 * sit},
        "arm_r": {"r": 70 * flail + 30 * sit}, "stick": {"r": 40 * flail + 30 * sit},
        "arm_l": {"r": 90 * flail + 45 * sit}, "drum": {"r": -20 * sit},
        "stone": {"hide": True},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    else:
        pose = merge(pose, F.expr("spiral", "tongue" if k >= 4 else "o"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES)], [M.IDLE_MS] * M.IDLE_FRAMES, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
