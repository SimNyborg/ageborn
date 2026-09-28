"""Drum Shaman: Stone Age support (DESIGN A5.2). War drum aura, rock projectile, 66 lu.

Look (A11): a hunched old shaman with a long grey beard (follow-through), a horned animal
skull worn as a headdress, a team hide cloak over his back and shoulders with a ragged hem
(follow-through), a bone bead necklace and a big team-painted hand drum slung at his belly
with a pale hide head and bone lacing. His near hand holds a bone drumstick. Idle is a slow
swaying rhythm; the attack raises the stick high, holds, smears down and hits the drum: the
drum squashes and a pale beat ring flares (the rock projectile spawns at `muzzle`, the drum
head, on the impact frame).
"""
from ageborn_art import fx
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import CaveBody, biped_hit, biped_idle, biped_walk

SLUG = "drum_shaman"
NAME = "Drum Shaman"
HEIGHT_LU = 66
CANVAS = (256, 236)
FEET = (120, 210)
ANCHORS = {"head": (0, 64), "hitCenter": (0, 30)}

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


def build(rig):
    global ARM_R, ARM_L, SMEAR
    body = CaveBody(rig, SKIN, FUR, hip_z=14.5, knee_z=8.0, ankle_z=3.6, waist_z=15.5,
                    shoulder_z=34.0, neck_z=35.5, hip_y=5.8, shoulder_y=11.6,
                    elbow=(1.5, 27.0), wrist=(3.8, 20.5), leg_r=(4.3, 3.8, 3.4),
                    arm_r=(3.9, 3.4, 3.3), fist_r=3.8, torso=((0, 26.5), (10.4, 9.6, 10.4)),
                    torso_taper=(1.1, 0.94), foot_len=6.0)
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
    g = Geo().blob((2.0, 0, 46.0), (9.6, 9.4, 9.8), p=2.3)
    g.blob((12.2, -0.4, 44.6), (3.4, 2.8, 3.6), p=2.0, rot=(0, 20, 0))  # big nose
    rig.part("head", g, SKIN)
    g = Geo().capsule((9.6, -7.2, 49.8), (12.0, -1.8, 48.8), 1.9, 1.5)
    g.capsule((12.0, 1.8, 48.8), (10.0, 6.4, 49.8), 1.5, 1.9)
    rig.part("head", g, BROW, finish="hair", outline=0.6)
    for y in (-4.0, 3.6):
        g = Geo().blob((10.4, y, 46.4), (2.4, 2.6, 2.4))
        rig.part("head", g, EYE, highlight=False)
        g = Geo().blob((12.4, y - 0.3, 46.2), (1.0, 1.5, 1.5))
        rig.part("head", g, PUPIL, outline=0)
    rig.joint("mouth", "head", (10.6, 0, 40.0))
    g = Geo().blob((10.8, -0.4, 40.2), (1.2, 3.0, 0.9), p=2.4)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    rig.joint("chant", "head", (10.4, 0, 39.8), hidden=True)
    g = Geo().blob((10.4, -0.4, 39.6), (1.8, 2.6, 2.4), p=2.2)
    rig.part("chant", g, MOUTH, outline=0, highlight=False)
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
    SMEAR = {"joint": "stick", "inner": (fr[0], fr[1] - 0.5, fr[2] + STICK - 6.0),
             "outer": (fr[0], fr[1] - 0.5, fr[2] + STICK + 3.0), "color": HIDE, "taper": 0.4,
             "start": 0.3}
    rig.track("_foot", "shin_r", (2.9, -5.8, 0.5))
    ARM_R = body.arm("r", "stick", tip)
    ARM_L = body.arm("l")


ARM_R = ARM_L = None
SMEAR = None


# -- poses ---------------------------------------------------------------------------------
def stick_arm(a, b, c):
    return ARM_R.pose(a, b, c)


def off_arm(a, b):
    return ARM_L.pose(a, b)


def stance():
    # hunched; stick poised over the drum; far hand steadies the drum's rim
    return merge(stick_arm(-45, 20, 50), off_arm(-40, -10), {"torso": {"r": -8}, "head": {"r": 6}})


def _idle(f):
    # a slow rhythm: the stick taps near the drum, the body sways
    def extra(c, lag):
        return {"arm_r": {"r": pick(f, [0, 6, 14, 18])}, "stick": {"r": pick(f, [0, 6, 16, 22])},
                "torso": {"rz": 3 * c}, "head": {"r": 3 * lag}}
    return biped_idle(f, stance(), extra=extra)


def _walk(f):
    import math

    def extra(p, lag_p, bob, bob_lag):
        return {"arm_r": {"r": 6 * math.cos(p)}, "stick": {"r": 8 * math.cos(lag_p)},
                "drum": {"r": 3 * math.cos(lag_p)}}
    return biped_walk(f, stance(), lean=-4.0, bob_k=0.8, thigh=30.0, extra=extra)


ATTACK_MS = [83, 83, 167, 42, 125, 100, 100, 100]


def _attack(f):
    # 0-1 raise the stick high, rise on the toes; 2 held extreme (stick overhead, stretch,
    # chanting); 3 smear down; 4 held impact: stick on the drum, drum and body squash,
    # beat ring; 5 ring flares wider, rebound; 6-7 settle
    a = pick(f, [0, 40, 60, 10, -45, -38, -42, -45])
    b = pick(f, [60, 100, 120, 20, -5, 20, 20, 20])
    c = pick(f, [100, 130, 150, 40, -30, 20, 40, 50])
    sq = pick(f, [0.02, 0.06, 0.09, 0.0, -0.14, -0.06, -0.02, 0.0])
    pose = merge(stick_arm(a, b, c), off_arm(pick(f, [-40, -44, -46, -40, -36, -38, -40, -40]),
                                             pick(f, [-10, -14, -16, -10, -4, -8, -10, -10])), {
        "body": squash(sq),
        "hips": {"z": pick(f, [0.4, 1.2, 2.0, 0.0, -2.2, -1.2, -0.4, 0])},
        "torso": {"r": pick(f, [-4, 2, 6, -12, -18, -14, -10, -8])},
        "head": {"r": pick(f, [4, -4, -10, 8, 12, 10, 8, 6])},
        "drum": {"s": pick(f, [1, 1, 1, 1, 1, 1.04, 1, 1]),
                 "sz": pick(f, [1, 1, 1, 1, 0.82, 1.08, 1.0, 1.0])},
        "ring": {"show": f in (4, 5), "s": pick(f, [1, 1, 1, 1, 1.0, 1.55, 1, 1]),
                 "sz": pick(f, [1, 1, 1, 1, 1, 0.6, 1, 1])},
        "thigh_r": {"r": pick(f, [0, -4, -6, 4, 12, 8, 3, 0])},
        "thigh_l": {"r": pick(f, [0, 4, 6, -4, -10, -6, -2, 0])},
    })
    if f in (2, 3, 4):
        pose.update({"mouth": {"hide": True}, "chant": {"show": True}})
    return pose


def _hit(f):
    return biped_hit(f, stance(), extra=lambda a: {"arm_r": {"r": 20 * a}, "stick": {"r": 20 * a}})


def _die(f):
    pose = merge(stance(), fx.die_pose(f), {
        "torso": {"r": pick(f, [18, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "arm_r": {"r": pick(f, [70, 50, 50])}, "stick": {"r": pick(f, [60, 30, 30])},
        "arm_l": {"r": pick(f, [90, 60, 60])},
        "drum": {"r": pick(f, [-20, -10, -10])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
    })
    if f == 0:
        pose.update({"mouth": {"hide": True}, "chant": {"show": True}})
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=4, smear=3, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
