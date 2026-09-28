"""Photon Knight: Future Age infantry (DESIGN A5.6). Energy sword, laser damage, ~70 lu.
Innate shield 90 that regenerates (the game draws fx.shield_bubble; the buckler is the cue).

Look (A11, Future palette): a stocky knight in glossy white armour over a charcoal suit. A
rounded great-helm with a glowing mint visor slit (squints on the strike, X on death) and a
team crest fin, a team chest plate, big team shoulder pads, a team tabard that swings with the
walk (follow-through), and a round team buckler with a magenta emitter on the far arm. The
oversized photon sword is a white-core mint blade on a white hilt: the brightest shape on the
unit, so the role reads at 56 px. The attack is an overhead slash: raise, a held coil with the
blade behind the head, a mint smear, a held lunge-impact with a spark burst, recovery.
"""
from ageborn_art import fx
from ageborn_art import rigs_future as F
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "photon_knight"
NAME = "Photon Knight"
HEIGHT_LU = 70
CANVAS = (288, 256)
FEET = (124, 222)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32)}

BLADE_LEN = 40.0
HILT = 7.0
HR = (0.0, F.ARM_Y["r"], F.HAND_Z)        # near hand joint (sword)
HL = (0.0, F.ARM_Y["l"], F.HAND_Z)        # far hand joint (buckler)
TIP = (HR[0], HR[1] - 1.0, HR[2] + HILT + BLADE_LEN)

SMEAR = {"joint": "sword", "inner": (HR[0], HR[1] - 1.0, HR[2] + HILT + BLADE_LEN * 0.35),
         "outer": TIP, "color": F.MINT, "taper": 0.4, "start": 0.3}


def build(rig):
    F.skeleton(rig)
    F.legs(rig)
    rig.joint("sword", "hand_r", HR)
    rig.joint("buckler", "hand_l", HL)

    # buckler first (far side, behind the body): a round team face, a white rim and a
    # magenta emitter boss, facing forward and turned toward the camera
    bx, by, bz = HL[0] + 4.0, HL[1] - 5.0, HL[2] + 1.0
    import math
    n = (math.cos(math.radians(-42)), math.sin(math.radians(-42)), 0.0)
    p0 = (bx, by, bz)
    p1 = (bx + n[0] * 3.2, by + n[1] * 3.2, bz)
    g = Geo().lathe([(0, -0.4), (9.4, -0.2), (10.4, 1.2), (9.8, 2.6), (0, 2.4)], p0, p1, segs=24)
    rig.part("buckler", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    q0 = (bx + n[0] * 2.4, by + n[1] * 2.4, bz)
    q1 = (bx + n[0] * 3.6, by + n[1] * 3.6, bz)
    g = Geo().lathe([(0, -0.3), (8.2, -0.2), (8.0, 1.0), (0, 1.6)], q0, q1, segs=24)
    rig.part("buckler", g, team=True, outline=0.6)
    r0 = (bx + n[0] * 3.4, by + n[1] * 3.4, bz)
    r1 = (bx + n[0] * 5.4, by + n[1] * 5.4, bz)
    g = Geo().lathe([(0, 0), (3.0, 0.2), (2.6, 1.4), (0, 2.0)], r0, r1, segs=16)
    rig.part("buckler", g, glow=F.MAGENTA, outline=1.0, outline_hex=F.SUIT)

    for s in ("l",):
        F.arm_parts(rig, s)

    # tabard behind the belt (drawn first), torso armour
    rig.secondary("tabard", "hips", (7.0, 0, 20.0), (8.5, 0, 6.0), max_deg=14, gain=0.9)
    g = Geo().blob((8.2, -0.5, 13.5), (2.4, 6.8, 7.8), p=3.2, taper=(1.12, 0.9))
    rig.part("tabard", g, team=True)
    g = Geo().blob((9.6, -0.5, 13.0), (1.2, 2.2, 4.8), p=3.0)
    rig.part("tabard", g, F.ARMOR, outline=0.6)
    F.torso_armor(rig, pack=True)
    # white breastplate rim over the team plate (a gorget and two plate edges)
    g = Geo().blob((1.0, 0, 38.0), (8.6, 8.8, 2.6), p=2.6)
    rig.part("torso", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    # hip faulds
    g = Geo().blob((0.6, 0, 16.8), (10.6, 10.4, 4.4), p=2.8, taper=(1.12, 1.0))
    g.clip((0, 0, 12.8), (0, 0, -1))
    rig.part("hips", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)

    # great-helm: white dome, team crest fin, dark visor with a mint slit
    g = Geo().blob((2.0, 0, 50.5), (12.2, 11.6, 12.4), p=2.5)
    g.blob((4.5, 0, 42.0), (9.0, 9.2, 3.6), p=2.4)          # chin guard
    rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    # crest: a tall team fin from the brow over the top to the nape
    g = Geo().blob((0.0, 0, 63.0), (13.0, 3.0, 6.8), p=2.4, rot=(0, -8, 0))
    g.blob((-10.0, 0, 56.0), (4.4, 2.8, 7.0), p=2.4, rot=(0, 24, 0))
    rig.part("head", g, team=True)
    # visor: a dark band wrapping the front of the helm (a shell just outside the dome)
    g = Geo().blob((2.0, 0, 50.5), (13.0, 12.4, 13.2), p=2.5)
    g.clip((6.5, 0, 0), (-1, 0, 0)).clip((0, 0, 54.2), (0, 0, 1)).clip((0, 0, 46.2), (0, 0, -1))
    g.blob((13.6, -0.6, 44.8), (2.4, 2.0, 4.0), p=3.0)        # nasal bar
    rig.part("head", g, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    rig.joint("eyes", "head", (14.6, 0, 50.2))
    g = Geo().blob((2.0, 0, 50.5), (13.7, 13.0, 13.9), p=2.5)
    g.clip((8.0, 0, 0), (-1, 0, 0)).clip((0, 0, 51.6), (0, 0, 1)).clip((0, 0, 48.9), (0, 0, -1))
    rig.part("eyes", g, glow=F.MINT, outline=0)
    rig.joint("eyes_x", "head", (14.6, 0, 50.2), hidden=True)
    g = Geo()
    for y in (-5.0, 2.2):
        g.capsule((15.2, y - 1.8, 52.0), (15.2, y + 1.8, 48.4), 0.8)
        g.capsule((15.2, y - 1.8, 48.4), (15.2, y + 1.8, 52.0), 0.8)
    rig.part("eyes_x", g, glow=F.MINT, outline=0)
    g = Geo().blob((-2.5, -11.4, 50.0), (3.8, 2.0, 3.8), p=2.4)   # ear disc
    rig.part("head", g, F.SUIT)

    F.arm_parts(rig, "r")
    F.shoulders(rig, r=(7.2, 6.0, 5.8))

    # the photon sword: along +Z from the near fist
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy, hz - 4.2), (hx, hy, hz + 4.6), 1.6)                 # grip
    rig.part("sword", g, F.SUIT, outline=0.8)
    g = Geo().blob((hx, hy, hz - 5.4), (2.2, 2.2, 1.8), p=2.4)                    # pommel
    g.blob((hx, hy, hz + 5.6), (6.4, 2.6, 1.8), p=2.6)                            # guard
    rig.part("sword", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((hx + 5.2, hy - 0.8, hz + 5.6), (1.2, 1.2, 1.2), p=2.2)
    g.blob((hx - 5.2, hy - 0.8, hz + 5.6), (1.2, 1.2, 1.2), p=2.2)
    rig.part("sword", g, glow=F.MAGENTA, outline=0)
    b0 = hz + HILT
    g = Geo().blob((hx, hy - 0.4, b0 + BLADE_LEN / 2), (3.3, 1.5, BLADE_LEN / 2 + 0.5), p=2.3,
                   taper=(1.0, 0.72))
    rig.part("sword", g, glow=F.MINT, outline=1.0, outline_hex=F.MINT)
    g = Geo().blob((hx + 0.2, hy - 1.3, b0 + BLADE_LEN / 2 - 0.5), (1.4, 0.9, BLADE_LEN / 2 - 1.5),
                   p=2.3, taper=(1.0, 0.6))
    rig.part("sword", g, glow=F.MINT_CORE, outline=0)
    rig.track("bladeTip", "sword", TIP)
    rig.track("_foot", "shin_r", (3.2, -6.0, 0.5))
    # impact sparks at the tip
    F.sparks(rig, "sword", (hx, hy - 2.0, b0 + BLADE_LEN * 0.8), size=1.3, name="sparks")


# -- poses ---------------------------------------------------------------------------------
def guard(sa, sf, sw, ba=-40.0, bf=5.0):
    """Sword arm (upper, fore, blade directions) and buckler arm (buckler kept upright)."""
    return merge(F.arm("r", sa, sf, sw, 90.0), F.arm("l", ba, bf, 90.0, 90.0))


STANCE = merge(guard(-75, -20, 35), {"torso": {"r": -2}})


def _idle(f):
    c, lag = F.idle_wave(f)
    return merge(STANCE, F.idle_body(f, bob=1.2, sq=0.04), {
        "arm_r": {"r": 2.5 * lag}, "hand_r": {"r": -3.5 * lag},
        "arm_l": {"r": 2.0 * lag},
    })


def _walk(f):
    pose, p, bl = F.walk_legs(f, stride=30, lean=-7)
    import math
    return merge(STANCE, pose, {
        "arm_r": {"r": -6 * math.cos(p)}, "hand_r": {"r": 4 * bl},
        "arm_l": {"r": 5 * math.cos(p)},
    })


def _attack(f):
    # 0-1 raise and coil (squash), 2 held extreme (blade behind the head), 3 smear,
    # 4 held impact (lunge, squash 0.85/1.15, sparks), 5-7 recovery back to guard
    sa = pick(f, [0, 60, 90, 40, -30, -35, -50, -65])
    sf = pick(f, [50, 105, 125, 30, -12, -15, -18, -20])
    sw = pick(f, [80, 115, 132, 60, 2, 6, 20, 32])
    sq = pick(f, [-0.04, -0.09, 0.07, 0.05, -0.15, -0.08, -0.02, 0.0])
    pose = merge(guard(sa, sf, sw, pick(f, [-40, -30, -20, -45, -60, -55, -48, -42]),
                       pick(f, [5, 15, 25, 0, -20, -15, -5, 3])), {
        "body": dict(squash(sq), x=pick(f, [-1, -2.5, -3.5, 2.5, 7, 6, 3, 0.5])),
        "hips": {"z": pick(f, [0, -0.8, 0.8, 0, -2.6, -1.8, -0.6, 0])},
        "torso": {"r": pick(f, [4, 10, 15, -6, -22, -18, -9, -3])},
        "head": {"r": pick(f, [2, 5, 7, -3, -8, -6, -3, 0])},
        "thigh_r": {"r": pick(f, [0, -6, -8, 12, 26, 22, 10, 2])},
        "shin_r": {"r": pick(f, [0, 0, 0, -8, -16, -12, -4, 0])},
        "thigh_l": {"r": pick(f, [0, 6, 8, -8, -18, -14, -6, 0])},
        "shin_l": {"r": pick(f, [0, -4, -6, -6, -8, -6, -2, 0])},
        "sparks": {"show": f == 4, "s": 1.0},
    })
    if f == 3:
        pose.setdefault("sword", {})["sz"] = 1.25   # smear frame: blade stretched along the swing
    if f in (3, 4):
        F.squint(pose)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, F.hit_body(f), {
        "arm_r": {"r": 16 * a}, "hand_r": {"r": 10 * a},
        "arm_l": {"r": 20 * a},
    })


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), F.die_limbs(f), {
        "arm_r": {"r": pick(f, [50, 60, 60])}, "hand_r": {"r": pick(f, [40, 30, 30])},
        "arm_l": {"r": pick(f, [90, 70, 70])},
    })
    if f in (0, 1):
        F.ko(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR,
             durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
