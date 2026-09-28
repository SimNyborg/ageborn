"""Grenadier: Gunpowder Age anti-armor (DESIGN A5.4). Lobbed bomb (proj.lob), splash, ~74 lu.

Look (A11, Gunpowder palette): a burly grenadier with a big handlebar moustache, a tall
mitre cap (team front plate, brass badge, cream edge, black back), a team coat with cream
cuffs and a cream crossbelt, a leather grenade pouch on the hip, cream breeches and black
gaiters. He holds an oversized black iron bomb with a brass fuse cap and a sparking fuse,
so 'explosive' reads at 56 px. The attack lights the fuse, winds far back with a held
extreme, and throws overhand; the bomb leaves the hand on the release frame (the game draws
proj.lob from the exported per-frame `muzzle` anchor), and a fresh bomb comes out of the
pouch on the last frame.
"""
from ageborn_art import fx
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "grenadier"
NAME = "Grenadier"
HEIGHT_LU = 76
CANVAS = (264, 252)
FEET = (116, 226)
ANCHORS = {"head": (2, 74), "hitCenter": (0, 34), "muzzle": (18, 46)}

HAIR = "#5C4A3E"
BOMB = "#34363C"
SHOE = "#2F2B2B"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
BOMB_C = (HR[0] + 2.0, HR[1] - 2.0, HR[2] + 6.4)   # bomb centre, held in the near fist
BOMB_R = 7.2


def build(rig):
    B.skeleton(rig)
    B.legs(rig, B.CREAM, SHOE, stocking=B.BLACK, thigh_r=5.0)

    # torso: broad team coat, cream crossbelt, brass buttons, grenade pouch
    g = Geo().blob((0, 0, 28.0), (11.8, 10.8, 12.2), p=2.4, taper=(1.1, 0.96))
    g.blob((0, 0, 18.0), (11.2, 10.4, 5.0), p=2.6)
    rig.part("torso", g, team=True)
    g = Geo().blob((5.2, -1.0, 26.5), (7.0, 5.0, 10.4), p=2.6, taper=(1.08, 0.72))
    g.clip((8.0, 0, 0), (-1, 0, 0))
    rig.part("torso", g, B.CREAM)            # waistcoat front
    g = Geo().blob((0.4, 0, 17.4), (11.8, 10.8, 2.2), p=3.0)
    rig.part("torso", g, B.LEATHER)          # belt
    g = Geo().capsule((0.5, 10.4, 38.0), (11.6, 0.0, 27.0), 2.0).capsule((11.6, 0.0, 27.0), (4.0, -11.2, 17.5), 2.0)
    rig.part("torso", g, B.CREAM, outline=0.8)
    g = Geo()
    for z in (33.0, 28.5, 24.0):
        g.sphere((12.4, -4.2, z), 1.1, cuts=3)
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.5)
    g = Geo().blob((1.2, 0, 37.6), (7.2, 7.6, 2.4), p=2.4)
    rig.part("torso", g, B.BLACK)
    g = Geo().blob((2.0, -11.6, 16.5), (5.2, 3.0, 4.6), p=3.0)     # grenade pouch
    rig.part("hips", g, B.LEATHER)
    g = Geo().blob((2.0, -14.4, 17.0), (2.2, 0.9, 2.2), p=2.4)
    rig.part("hips", g, B.BRASS, finish="metal", outline=0.5)
    rig.secondary("tails", "hips", (-4.0, 0, 18.0), (-7.5, 0, 6.0), max_deg=12, gain=0.9)
    g = Geo().blob((-6.0, 0, 11.5), (5.0, 10.0, 7.6), p=2.6, taper=(0.7, 1.0), rot=(0, 10, 0))
    rig.part("tails", g, team=True)

    # head: big moustache, sideburns, the mitre cap
    B.head_ball(rig, center=(2, 0, 49.0), nose=(14.0, -0.6, 47.6), nose_r=(3.8, 3.2, 3.6))
    B.face(rig, cx=12.6, cz=50.2, brow=HAIR, eye_r=(3.3, 3.1, 4.0))
    g = Geo().blob((13.6, -3.8, 44.2), (2.6, 4.2, 1.8), p=2.2, rot=(22, 0, 0))
    g.blob((13.6, 2.8, 44.2), (2.6, 4.2, 1.8), p=2.2, rot=(-22, 0, 0))
    g.capsule((13.0, -7.6, 44.8), (12.2, -9.6, 47.6), 1.4, 0.8)           # waxed curl
    g.blob((-5.0, 0, 47.5), (5.8, 10.4, 6.4), p=2.2)
    rig.part("head", g, HAIR, finish="hair")
    # mitre cap: a tall rounded front plate (team) over a black cap, brass badge, cream edge
    g = Geo().blob((0.0, 0, 60.5), (9.6, 10.2, 9.0), p=2.4, taper=(1.0, 0.55))
    g.clip((0, 0, 56.2), (0, 0, -1))
    rig.part("head", g, B.BLACK)
    g = Geo().slab([(-2.0, 56.0), (13.0, 56.0), (11.8, 64.0), (8.4, 71.0), (3.4, 76.0), (-0.6, 76.2),
                    (-2.0, 72.0)], 0.0, 17.0, rot=(0, -10, 0), origin=(5, 0, 56))
    rig.part("head", g, team=True)
    g = Geo().blob((11.8, -4.4, 63.0), (1.4, 3.2, 3.6), p=2.2, rot=(0, -10, 0))
    rig.part("head", g, B.BRASS, finish="metal", outline=0.6)
    g = Geo().capsule((-1.0, -8.8, 56.6), (13.2, -8.8, 56.6), 1.2).capsule((13.2, -8.8, 56.6), (13.2, 8.4, 56.6), 1.2)
    rig.part("head", g, B.CREAM, outline=0.6)
    g = Geo().sphere((0.6, 0, 76.4), 2.4, cuts=3)   # tuft
    rig.part("head", g, B.CREAM, finish="hair", outline=0.6)

    # arms: team sleeves, cream cuffs
    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, cuff=B.CREAM, r0=4.6, r1=4.1, fist=4.5)
    for s, y in (("r", -12.6), ("l", 12.0)):
        g = Geo().blob((0, y, 37.0), (6.0, 5.2, 4.6), p=2.4)
        rig.part(f"arm_{s}", g, team=True)

    # the bomb on its own joint in the near hand, with a sparking fuse
    rig.joint("bomb", "hand_r", BOMB_C)
    bx, by, bz = BOMB_C
    g = Geo().sphere(BOMB_C, BOMB_R, cuts=6)
    rig.part("bomb", g, BOMB, finish="gloss", outline_hex="#50535A")
    g = Geo().lathe([(0, 0), (2.4, 0), (2.4, 1.8), (1.6, 2.6), (0, 2.6)], (bx + 3.0, by, bz + 5.9),
                    (bx + 4.4, by, bz + 8.8), segs=12)
    rig.part("bomb", g, B.BRASS, finish="metal", outline=0.6)
    g = Geo().capsule((bx + 4.2, by, bz + 8.6), (bx + 6.2, by, bz + 11.6), 0.8)
    rig.part("bomb", g, B.TAN, outline=0.5)
    rig.joint("spark", "bomb", (bx + 6.4, by, bz + 12.0))
    g = Geo().star((bx + 6.4, by - 1.2, bz + 12.2), 3.6, 1.4, 1.0, points=5)
    rig.part("spark", g, glow=B.FIRE, outline=0)
    g = Geo().sphere((bx + 6.4, by - 1.8, bz + 12.2), 1.4, cuts=3)
    rig.part("spark", g, glow="#FFFFFF", outline=0)
    rig.track("muzzle", "bomb", BOMB_C)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def bomb_arm(a, f, w=80.0):
    """The bomb sits on top of the fist: `w` keeps the fist's rest-up direction pointing
    `w` degrees (90 = straight up), whatever the arm does."""
    return B.arm("r", a, f, w, w_rest=90.0)


STANCE = merge(bomb_arm(-20, 55), B.arm("l", -80, -35), {"torso": {"r": -2}})


def _idle(f):
    c, lag = B.idle_wave(f)
    return merge(STANCE, B.idle_body(f), {
        "arm_r": {"r": 3 * lag}, "fore_r": {"r": -3 * lag},
        "arm_l": {"r": -3 * lag},
        "spark": {"s": [1.0, 0.7, 1.15, 0.85][f], "r": 25 * f},
    })


def _walk(f):
    import math
    pose, p, bl = B.walk_legs(f, lean=-8.0)
    return merge(STANCE, pose, {
        "arm_l": {"r": 22 * math.cos(p)}, "fore_l": {"r": 8 * max(0.0, math.cos(p))},
        "arm_r": {"r": -6 * math.cos(p - 0.8)}, "fore_r": {"r": 4 * bl},
        "spark": {"s": [1.0, 0.7, 1.15, 0.85][f % 4], "r": 25 * f},
    })


ATTACK_MS = [83, 83, 167, 42, 125, 83, 83, 83]
ATTACK_IMPACT = 4


def _attack(f):
    # 0 bring the bomb up, 1 dip back (squash), 2 held extreme: wound far back, off arm
    # pointing at the target, 3 whip (stretch), 4 release (bomb gone, arm thrown forward),
    # 5-6 follow-through, 7 a new bomb from the pouch
    a = pick(f, [20, 100, 118, 105, 20, -20, -40, -45])
    fo = pick(f, [70, 135, 140, 100, 25, -30, -40, 5])
    w = pick(f, [80, 150, 200, 120, 40, 0, -20, 80])
    pose = merge(bomb_arm(a, fo, w), B.arm("l", pick(f, [-60, -10, 15, -20, -80, -90, -85, -80]),
                                         pick(f, [-20, 5, 15, -40, -60, -50, -40, -35])), {
        "body": dict(squash(pick(f, [0.0, -0.08, 0.06, 0.08, -0.12, -0.06, 0.0, 0.0])),
                     x=pick(f, [0, -2.0, -4.0, 1.0, 5.0, 5.0, 3.0, 0.5])),
        "hips": {"z": pick(f, [0, -1.0, 0.6, 0.4, -2.0, -1.5, -0.6, 0])},
        "torso": {"r": pick(f, [0, 10, 18, 2, -20, -22, -12, -3])},
        "head": {"r": pick(f, [0, 2, -6, -6, -8, -6, -2, 0])},
        "thigh_r": {"r": pick(f, [0, -8, -12, 4, 20, 18, 8, 0])},
        "shin_r": {"r": pick(f, [0, -6, -8, -6, -12, -10, -4, 0])},
        "thigh_l": {"r": pick(f, [0, 10, 14, -2, -16, -14, -8, 0])},
        "shin_l": {"r": pick(f, [0, -2, -6, -8, -6, -4, -2, 0])},
        "bomb": {"hide": f in (4, 5, 6), "s": pick(f, [1, 1, 1, 1, 1, 1, 1, 0.8])},
        "spark": {"s": pick(f, [0.6, 1.3, 1.1, 1.4, 1, 1, 1, 0.6]), "r": 30 * f},
    })
    if f == 3:
        pose["bomb"]["sx"] = 1.25
    if f in (3, 4):
        B.yell(pose)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, B.hit_body(f), {"arm_r": {"r": 20 * a}, "arm_l": {"r": 30 * a}})


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), B.die_limbs(f), {
        "arm_r": {"r": pick(f, [60, 50, 50])}, "arm_l": {"r": pick(f, [120, 90, 90])},
        "spark": {"hide": f > 0},
    })
    if f == 0:
        B.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
