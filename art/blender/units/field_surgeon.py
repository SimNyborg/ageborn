"""Field Surgeon: Gunpowder Age support (DESIGN A5.4). Heals; pistol shot (proj.musket), ~70 lu.

Look (A11, Gunpowder palette): a round-faced army doctor in a black bicorne worn fore and
aft (brass edge, team cockade), little brass spectacles and mutton-chop whiskers, a team
coat with cream cuffs under a long cream apron, and a big leather medical bag with a
bottle-green cross in the near hand, so 'healer' reads at 56 px. He fires a stubby
flintlock pistol from the far hand: raise, aim with a held beat, a bright flash with a
little smoke, a kick, and a settle. The shot (proj.musket) spawns at the exported
per-frame `muzzle` anchor on the fire frame.
"""
from ageborn_art import fx
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "field_surgeon"
NAME = "Field Surgeon"
HEIGHT_LU = 72
CANVAS = (256, 236)
FEET = (104, 212)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 32), "muzzle": (30, 38)}

HAIR = "#B8B2A8"      # grey whiskers
SHOE = "#2F2B2B"
BAG = "#6E5646"
BREECH = "#4A3B2E"

HR = (0.0, B.ARM_Y["l"], B.HAND_Z)   # pistol: far hand
HL = (0.0, B.ARM_Y["r"], B.HAND_Z)   # bag: near hand, so it is always in view
PMUZ = (HR[0] + 1.0, HR[1] - 0.5, HR[2] - 16.0)   # pistol muzzle (pistol modelled pointing down)


def build(rig):
    B.skeleton(rig)
    B.legs(rig, BREECH, SHOE, stocking=B.CREAM)

    # torso: team coat, long cream apron (bib and skirt), brass buttons on the coat edge
    g = Geo().blob((0, 0, 28.0), (11.6, 10.6, 12.0), p=2.4, taper=(1.1, 0.95))
    g.blob((0, 0, 18.0), (11.2, 10.2, 5.0), p=2.6)
    rig.part("torso", g, team=True)
    g = Geo().blob((0.0, 0, 15.5), (11.8, 10.9, 7.4), p=2.6, taper=(1.14, 1.0))
    g.clip((0, 0, 9.0), (0, 0, -1))
    rig.part("hips", g, team=True)
    g = Geo().blob((5.4, -0.8, 26.0), (7.2, 7.4, 10.6), p=3.0, taper=(1.1, 0.8))
    g.clip((8.4, 0, 0), (-1, 0, 0))
    rig.part("torso", g, B.CREAM)
    g = Geo().capsule((9.0, -6.4, 35.0), (3.0, -8.6, 38.5), 0.9).capsule((9.0, 5.6, 35.0), (3.0, 7.8, 38.5), 0.9)
    rig.part("torso", g, B.CREAM, outline=0.5)   # apron straps
    g = Geo().blob((1.2, 0, 37.4), (6.8, 7.2, 2.4), p=2.4)
    rig.part("torso", g, B.CREAM)                # neck cloth
    rig.secondary("apron", "hips", (6.0, 0, 17.0), (7.5, 0, 6.0), max_deg=10, gain=0.9)
    g = Geo().blob((7.8, -0.5, 11.5), (4.0, 9.0, 7.6), p=2.8, taper=(1.0, 1.1))
    g.clip((4.8, 0, 0), (-1, 0, 0))
    rig.part("apron", g, B.CREAM)
    rig.secondary("tails", "hips", (-4.0, 0, 18.0), (-7.5, 0, 6.0), max_deg=12, gain=0.9)
    g = Geo().blob((-5.6, 0, 11.5), (5.4, 10.4, 7.8), p=2.6, taper=(0.75, 1.0), rot=(0, 10, 0))
    rig.part("tails", g, team=True)

    # head: round, bald crown with grey whiskers, spectacles, bicorne
    B.head_ball(rig, center=(2, 0, 48.5), nose=(14.0, -0.6, 47.0), nose_r=(3.6, 3.2, 3.4))
    B.face(rig, cx=12.4, cz=49.6, brow=HAIR, brow_angry=False, eye_r=(3.2, 3.0, 3.8))
    g = Geo().blob((6.0, -9.6, 43.5), (4.8, 2.6, 5.6), p=2.2)      # mutton chops
    g.blob((6.0, 9.6, 43.5), (4.8, 2.6, 5.6), p=2.2)
    g.blob((-6.0, 0, 46.0), (5.6, 10.2, 6.0), p=2.2)
    rig.part("head", g, HAIR, finish="hair")
    g = Geo()
    for y in (-4.6, 4.4):   # round brass spectacles
        g.lathe([(3.6, -0.4), (3.6, 0.4), (2.8, 0.4), (2.8, -0.4)], (13.3, y, 49.6), (14.3, y, 49.6), segs=16)
    g.capsule((13.6, -1.2, 50.2), (13.6, 1.0, 50.2), 0.5)
    rig.part("head", g, B.BRASS, finish="metal", outline=0.4)
    B.bicorne(rig, c=(0.5, 0, 58.0), scale=0.95)

    # arms: team sleeves, cream cuffs
    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, cuff=B.CREAM)
    for s, y in (("r", -12.4), ("l", 11.8)):
        g = Geo().blob((0, y, 37.0), (5.8, 5.0, 4.4), p=2.4)
        rig.part(f"arm_{s}", g, team=True)

    # pistol, modelled pointing down out of the near fist
    hx, hy, hz = HR
    g = Geo().blob((hx - 0.6, hy, hz + 1.5), (2.2, 2.0, 3.6), p=2.6, rot=(0, -20, 0))   # grip
    g.capsule((hx + 0.6, hy - 0.4, hz - 2.0), (hx + 1.0, hy - 0.4, hz - 9.0), 1.8, 1.5)  # stock
    rig.part("hand_l", g, B.GUNWOOD)
    g = Geo().capsule((hx + 1.6, hy - 0.6, hz - 3.0), (PMUZ[0] + 0.6, hy - 0.6, PMUZ[2] + 0.5), 1.3, 1.4)
    g.lathe([(0, 0), (1.9, 0), (1.9, 1.4), (0, 1.4)], (PMUZ[0] + 0.6, hy - 0.6, PMUZ[2] + 1.4),
            (PMUZ[0] + 0.6, hy - 0.6, PMUZ[2]), segs=12)
    rig.part("hand_l", g, B.GUNMETAL, finish="metal", outline=0.8)
    g = Geo().blob((hx + 2.2, hy - 1.4, hz - 1.6), (1.4, 1.0, 2.0), p=2.4)   # lock
    g.sphere((hx - 1.8, hy, hz + 4.6), 1.6, cuts=3)                          # pommel cap
    rig.part("hand_l", g, B.BRASS, finish="metal", outline=0.5)
    rig.track("muzzle", "hand_l", PMUZ)
    # flash and smoke along -Z (the pistol's rest direction)
    mx, my, mz = PMUZ
    rig.joint("flash", "hand_l", PMUZ, hidden=True)
    g = Geo().blob((mx, my - 1, mz - 6.5), (3.2, 1.8, 7.0), p=2.0)
    g.blob((mx + 2.2, my - 1, mz - 4.0), (1.8, 1.6, 4.6), p=2.0, rot=(0, -36, 0))
    g.blob((mx - 2.2, my - 1, mz - 4.0), (1.8, 1.6, 4.6), p=2.0, rot=(0, 36, 0))
    rig.part("flash", g, glow=B.FIRE, outline=0)
    g = Geo().blob((mx, my - 2, mz - 4.2), (2.0, 1.6, 4.2), p=2.0)
    rig.part("flash", g, glow=B.FLASH_CORE, outline=0)
    rig.joint("smoke", "hand_l", PMUZ, hidden=True)
    g = Geo()
    for dx, dz, r in ((0, -4, 3.8), (2.6, -8, 3.2), (-2.4, -7, 2.8), (0.5, -11.5, 2.6)):
        g.sphere((mx + dx, my - 2, mz + dz), r, cuts=4)
    rig.part("smoke", g, B.SMOKE, finish="dust", outline=0.8)

    # the medical bag in the far hand: leather doctor's bag, brass clasp, green cross on a
    # cream patch; it swings on the hand
    lx, ly, lz = HL
    g = Geo().blob((lx + 1.0, ly - 1.0, lz - 8.5), (8.6, 5.0, 6.6), p=3.0, taper=(1.05, 0.85))
    rig.part("hand_r", g, BAG, finish="gloss")
    g = Geo().capsule((lx - 3.5, ly - 1.0, lz - 2.8), (lx - 1.0, ly - 1.0, lz + 1.2), 0.9)
    g.capsule((lx - 1.0, ly - 1.0, lz + 1.2), (lx + 3.0, ly - 1.0, lz + 1.2), 0.9)
    g.capsule((lx + 3.0, ly - 1.0, lz + 1.2), (lx + 5.5, ly - 1.0, lz - 2.8), 0.9)
    g.blob((lx + 1.0, ly - 5.8, lz - 3.2), (2.0, 0.8, 1.4), p=2.4)
    rig.part("hand_r", g, B.IRON, finish="metal", outline=0.6)
    g = Geo().blob((lx + 1.0, ly - 6.0, lz - 9.0), (4.6, 0.8, 4.2), p=3.2)
    rig.part("hand_r", g, B.CREAM, outline=0.6)
    g = Geo().blob((lx + 1.0, ly - 6.6, lz - 9.0), (1.1, 0.6, 3.4), p=3.0)
    g.blob((lx + 1.0, ly - 6.6, lz - 9.0), (3.4, 0.6, 1.1), p=3.0)
    rig.part("hand_r", g, B.GREEN, outline=0)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def pistol(a, f, w):
    return B.arm("l", a, f, w, w_rest=-90.0)


def bag(a=-90.0, f=-90.0, swing=0.0):
    return B.arm("r", a, f, -90.0 + swing)


STANCE = merge(pistol(-75, -35, -60), bag(-84, -86), {"torso": {"r": -1}})


def _idle(f):
    c, lag = B.idle_wave(f)
    return merge(STANCE, B.idle_body(f), {
        "arm_l": {"r": 2 * lag}, "hand_l": {"r": 4 * lag},
        "hand_r": {"r": 5 * lag},
    })


def _walk(f):
    import math
    pose, p, bl = B.walk_legs(f, lean=-6.0)
    return merge(STANCE, pose, {
        "arm_r": {"r": 10 * math.cos(p)}, "hand_r": {"r": -12 * math.cos(p - 1.0)},
        "arm_l": {"r": -12 * math.cos(p)}, "fore_l": {"r": 6 * max(0.0, -math.cos(p))},
    })


ATTACK_MS = [83, 83, 167, 83, 83, 83, 125, 125]
ATTACK_IMPACT = 3


def _attack(f):
    # 0 raise, 1 aim, 2 aim held, 3 FIRE (flash, squint), 4 kick (up and back),
    # 5 smoke, 6 blow the smoke away, 7 lower
    a = pick(f, [-30, 0, 2, 2, 20, 12, 5, -40])
    fo = pick(f, [0, 2, 3, 3, 30, 18, 8, -20])
    w = pick(f, [10, 2, 2, 2, 40, 25, 15, -30])
    pose = merge(pistol(a, fo, w), bag(-84, -86, pick(f, [4, 8, 8, 8, -6, -8, -4, 0])), {
        "body": dict(squash(pick(f, [0, -0.03, -0.05, 0.03, -0.08, -0.04, 0, 0])),
                     x=pick(f, [0, 0.5, 1.0, 0.0, -2.5, -1.8, -0.8, 0])),
        "torso": {"r": pick(f, [-1, -3, -4, -4, 3, 1, 0, -1])},
        "head": {"r": pick(f, [0, -3, -5, -5, 4, 2, 6, 0])},
        "thigh_r": {"r": pick(f, [2, 8, 10, 10, 8, 6, 4, 2])},
        "thigh_l": {"r": pick(f, [-2, -8, -10, -12, -12, -10, -6, -2])},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5, 6), "s": pick(f, [1, 1, 1, 1, 0.8, 1.1, 1.3, 1])},
    })
    if f == 3:
        pose["head"]["sz"] = 0.97
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, B.hit_body(f), {"arm_l": {"r": 20 * a}, "arm_r": {"r": 25 * a},
                                         "hand_r": {"r": -15 * a}})


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), B.die_limbs(f), {
        "arm_l": {"r": pick(f, [70, 50, 50])}, "arm_r": {"r": pick(f, [100, 80, 80])},
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
