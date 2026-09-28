"""Warp Stalker: Cosmic Age skirmisher Epic (docs/design-lane-ages.md A17.11). Twin warp blades, slash
damage, fast (0.8 s); Blink: warps past the blocker to a ranged or support unit (the game draws
fx.blink). ~70 lu.

Look (A17.12, Cosmic palette): a lean, hunched assassin. A pointed violet hood over a dark mask
with two mint eyes, a big team cloak that trails from the shoulders and flares on the walk
(follow-through); its near half is thrown open toward the camera so the starry lining reads
(void with star-white and mint star specks), a void bodysuit with violet shin guards and a team sash. Both hands hold short curved
mint warp blades held low and reversed, the brightest shapes on the unit. The stance is a low
forward crouch. The attack is a lunging cross-slash: crouch and draw both blades back, a held
coil, a mint smear, a held impact with both blades crossed forward and a spark burst. The death
blinks out: struck, folded in, then squeezed thin and shrunk into a violet star flash (no fall,
no dust poof).
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "warp_stalker"
NAME = "Warp Stalker"
HEIGHT_LU = 70
CANVAS = (300, 256)
FEET = (132, 222)
ANCHORS = {"head": (6, 66), "hitCenter": (2, 32)}

HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
HL = (0.0, K.ARM_Y["l"], K.HAND_Z)
BLADE = 20.0
TIP_R = (HR[0] + 3.0, HR[1] - 1.0, HR[2] + 5.0 + BLADE)

SMEAR = {"joint": "blade_r", "inner": (HR[0] + 1.0, HR[1] - 1.0, HR[2] + 5.0 + BLADE * 0.3),
         "outer": TIP_R, "color": K.MINT, "taper": 0.4, "start": 0.3}


def _blade(rig, joint, h, y_off, bright=True):
    hx, hy, hz = h
    g = Geo().capsule((hx, hy, hz - 3.2), (hx, hy, hz + 4.0), 1.4)
    rig.part(joint, g, K.VOID_LT, outline=0.8)
    g = Geo().blob((hx, hy, hz + 4.6), (4.2, 2.4, 1.4), p=2.6)
    rig.part(joint, g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # a curved blade: segments bending forward
    g, c = Geo(), Geo()
    pts = [(hx + 3.0 * (t ** 2), hz + 5.0 + BLADE * t) for t in (0.0, 0.25, 0.5, 0.75, 1.0)]
    for i, ((x0, z0), (x1, z1)) in enumerate(zip(pts, pts[1:])):
        w0, w1 = 2.8 - 0.55 * i, 2.8 - 0.55 * (i + 1)
        g.capsule((x0, hy + y_off, z0), (x1, hy + y_off, z1), max(0.4, w0), max(0.3, w1), segs=10, rings=2)
        c.capsule((x0 + 0.4, hy + y_off - 1.0, z0), (x1 + 0.4, hy + y_off - 1.0, z1), max(0.3, w0 * 0.45),
                  max(0.2, w1 * 0.45), segs=8, rings=2)
    rig.part(joint, g, glow=K.MINT if bright else "#36C99E", outline=1.0, outline_hex="#1C8A6A")
    rig.part(joint, c, glow=K.MINT_CORE, outline=0)


def build(rig):
    K.skeleton(rig, head=(2, 0, 38))
    for s in ("r", "l"):
        y = K.LEG_Y * K.SIDE_Y[s]
        g = Geo().capsule((0, y, K.HIP_Z), (0.5, y, K.KNEE_Z), 4.0, 3.5)
        rig.part(f"thigh_{s}", g, K.VOID)
        g = Geo().capsule((0.5, y, K.KNEE_Z), (1.0, y, 4.6), 3.4, 3.2)
        rig.part(f"shin_{s}", g, K.VOID)
        g = Geo().blob((2.2, y, 8.4), (3.6, 4.0, 5.4), p=2.6)
        rig.part(f"shin_{s}", g, K.VIOLET, finish="gloss")
        g = Geo().blob((3.0, y, 2.6), (6.6, 4.2, 2.8), p=3.0, taper=(1.05, 0.8))
        rig.part(f"shin_{s}", g, K.VOID_LT, finish="gloss")
    rig.joint("blade_r", "hand_r", HR)
    rig.joint("blade_l", "hand_l", HL)
    _blade(rig, "blade_l", HL, -2.0, bright=False)
    K.arm_parts(rig, "l", sleeve=K.VOID, bracer=K.VIOLET, glove=K.VOID_LT, r0=3.6, r1=3.2, fist=3.8)

    # cloak: team outside, trailing from the shoulders; the turned-up hem shows the starry lining
    rig.secondary("cloak", "torso", (-6.0, 0, 38.0), (-16.0, 0, 8.0), max_deg=18, gain=1.2)
    g = Geo().blob((-11.0, 0.5, 23.0), (4.0, 13.0, 16.5), p=2.8, taper=(1.45, 0.75), shift=(-0.3, 0))
    rig.part("cloak", g, team=True)
    g = Geo().blob((-14.0, -1.5, 9.0), (4.2, 14.4, 3.2), p=2.6, rot=(0, -14, 0))
    rig.part("cloak", g, K.VOID, finish="matte")
    # the near half of the cloak is thrown open toward the camera: a big void lining panel from
    # the shoulder to the hem, scattered with star-white specks and one mint star
    lin = [(-3.0, 37.0), (-7.0, 30.0), (-10.0, 20.0), (-12.0, 10.0), (-17.0, 6.5), (-24.0, 7.5), (-22.0, 16.0),
           (-18.0, 27.0), (-11.0, 36.0)]
    g = Geo().slab(lin, -13.6, 1.6)
    rig.part("cloak", g, K.VOID, outline_hex=K.VOID_DK)
    g = Geo().slab([(-3.0, 38.5), (-11.8, 37.4), (-19.8, 28.0), (-24.2, 16.0), (-26.8, 6.8), (-23.4, 4.6),
                    (-21.0, 15.6), (-17.2, 26.2), (-10.6, 34.4), (-3.4, 34.8)], -13.0, 1.8)
    rig.part("cloak", g, team=True, outline=0.6)                       # the team outer edge folds over
    g = Geo()
    for (x, z, r) in ((-9.0, 30.0, 1.5), (-14.5, 24.0, 1.9), (-11.5, 17.0, 1.3), (-17.5, 13.0, 1.6),
                      (-20.5, 9.2, 1.2), (-15.0, 9.0, 1.1), (-7.8, 23.0, 1.0)):
        g.star((x, -15.2, z), r * 1.4, r * 0.55, 0.8, points=4)
    rig.part("cloak", g, glow=K.STAR, outline=0)
    g = Geo().star((-12.0, -15.2, 12.5), 2.2, 0.9, 0.8, points=4)
    rig.part("cloak", g, glow=K.MINT, outline=0)

    # lean torso: void suit, a team sash across the chest, violet belt
    g = Geo().blob((0, 0, 28), (8.4, 8.4, 11.0), p=2.4, taper=(0.9, 1.05))
    g.blob((0, 0, 17.5), (7.6, 8.2, 4.0), p=2.6)
    rig.part("torso", g, K.VOID)
    g = Geo().blob((1.4, 0, 29.0), (8.7, 8.9, 2.8), p=2.6, rot=(0, 34, 0))
    rig.part("torso", g, team=True, outline=0.6)
    g = Geo().blob((0.4, 0, 21.8), (8.9, 8.9, 2.0), p=3.4)
    rig.part("torso", g, K.VIOLET, finish="gloss")
    g = Geo().blob((8.8, -2.0, 21.8), (1.3, 2.0, 1.3), p=2.4)
    rig.part("torso", g, glow=K.MINT, outline=1.0, outline_hex=K.VOID)

    # hood: pointed, violet, over a dark mask with two mint eyes; mask lower half
    g = Geo().blob((1.5, 0, 49.5), (11.8, 11.0, 12.0), p=2.4)
    g.capsule((-3.0, 0, 54.0), (-15.0, 0, 60.0), 8.4, 1.6, segs=18, rings=4)
    g.clip((8.8, 0, 48.0), (1, 0, 0.2))
    rig.part("head", g, K.VIOLET, outline_hex=K.VIOLET_DK)
    g = Geo().blob((3.8, 0, 48.5), (9.8, 8.8, 9.4), p=2.4)
    rig.part("head", g, K.VISOR, finish="gloss", outline_hex=K.VOID)
    g = Geo().blob((7.0, 0, 43.6), (7.2, 8.6, 3.6), p=2.4)
    rig.part("head", g, K.VOID_LT, finish="gloss")
    rig.joint("eyes", "head", (13.4, 0, 49.5))
    g = Geo()
    for y, k in ((-4.0, 1.0), (2.6, 0.85)):
        g.blob((13.3, y, 49.6), (0.9, 2.0 * k, 1.3 * k), p=2.2, rot=(10, 0, 0))
    rig.part("eyes", g, glow=K.MINT, outline=0)
    rig.joint("eyes_x", "head", (13.4, 0, 49.5), hidden=True)
    g = Geo()
    for y in (-4.0, 2.6):
        g.capsule((13.6, y - 1.6, 51.2), (13.6, y + 1.6, 48.0), 0.7)
        g.capsule((13.6, y - 1.6, 48.0), (13.6, y + 1.6, 51.2), 0.7)
    rig.part("eyes_x", g, glow=K.MINT, outline=0)
    # team hood rim
    g = Geo().lathe([(8.6, -1.2), (10.4, -1.0), (10.6, 0.8), (8.6, 1.0)], (9.4, 0, 48.6), (10.4, 0, 48.9),
                    segs=22, squash=(1.2, 0.95))
    rig.part("head", g, team=True, outline=0.6)

    K.arm_parts(rig, "r", sleeve=K.VOID, bracer=K.VIOLET, glove=K.VOID_LT, r0=3.6, r1=3.2, fist=3.8)
    # small team shoulder guard on the near arm
    g = Geo().blob((0.5, K.ARM_Y["r"] - 0.3, 37.4), (5.8, 5.0, 4.6), p=2.6)
    rig.part("arm_r", g, team=True)
    _blade(rig, "blade_r", HR, -2.0)
    rig.track("bladeTip", "blade_r", TIP_R)
    rig.track("_foot", "shin_r", (3.0, -6.0, 0.5))
    K.sparks(rig, "blade_r", (TIP_R[0], TIP_R[1] - 1.0, TIP_R[2] - 4.0), color=K.MINT, size=1.3, name="sparks")
    # the blink-out flash (on the root, so it does not shrink with the body)
    at = (0.0, -6.0, 30.0)
    rig.joint("blink", "root", at, hidden=True)
    g = Geo().star((at[0], at[1] - 4.0, at[2]), 22.0, 5.0, 1.6, points=4)
    rig.part("blink", g, glow=K.VIOLET_GLOW, outline=0)
    g = Geo()
    for i in range(8):
        a = 2 * math.pi * (i + 0.5) / 8
        g.sphere((at[0] + 16.0 * math.cos(a), at[1] - 5.0, at[2] + 16.0 * math.sin(a)), 1.4, cuts=2)
    rig.part("blink", g, glow=K.STAR, outline=0)
    g = Geo().lathe([(9.0, -1.6), (12.0, -1.6), (12.6, 0), (12.0, 1.6), (9.0, 1.6)], (at[0], at[1] - 3.0, at[2]),
                    (at[0], at[1] - 4.0, at[2]), segs=28)
    rig.part("blink", g, team=True, outline=0.6)        # a team ring keeps the team cue to the end
    rig.joint("blink_core", "root", at, hidden=True)
    g = Geo().sphere((at[0], at[1] - 7.0, at[2]), 7.0, cuts=4)
    rig.part("blink_core", g, glow=K.VIOLET_CORE, outline=0)


# -- poses ---------------------------------------------------------------------------------
def blades(ra, rf, rw, la, lf, lw):
    return merge(K.arm("r", ra, rf, rw, 90.0), K.arm("l", la, lf, lw, 90.0))


CROUCH = {"hips": {"z": -2.0}, "torso": {"r": -14}, "head": {"r": 10, "x": 1.0},
          "thigh_r": {"r": 18}, "shin_r": {"r": -26}, "thigh_l": {"r": -2}, "shin_l": {"r": -22}}
STANCE = merge(blades(-55, -10, 20, -40, 5, 40), CROUCH)


def _idle(f):
    c, lag = K.idle_wave(f)
    return merge(STANCE, K.idle_body(f, bob=1.0, sq=0.035, lean=2.0), {
        "arm_r": {"r": 3.0 * lag}, "hand_r": {"r": -4.0 * lag},
        "arm_l": {"r": -2.5 * lag},
    })


def _walk(f):
    # a stalking prowl: long low strides
    pose, p, bl = K.walk_legs(f, stride=34, lift=62, bob=2.8, lean=-4)
    return merge(STANCE, pose, {
        "arm_r": {"r": -9 * math.cos(p)}, "hand_r": {"r": 5 * bl},
        "arm_l": {"r": 9 * math.cos(p)},
    })


def _attack(f):
    # 0-1 crouch and draw both blades back, 2 held coil, 3 smear, 4 held impact (lunge,
    # blades crossed forward, sparks), 5-7 recovery
    pose = merge(blades(pick(f, [-40, 10, 45, 20, -15, -25, -40, -52]), pick(f, [30, 90, 115, 40, 0, -5, -8, -10]),
                        pick(f, [60, 120, 150, 40, -10, -2, 8, 18]),
                        pick(f, [-60, -80, -90, -20, 10, -5, -25, -38]), pick(f, [-20, -50, -70, 10, 20, 15, 10, 6]),
                        pick(f, [20, -20, -40, 30, 60, 55, 48, 42])), {
        "body": dict(squash(pick(f, [-0.06, -0.1, 0.05, 0.06, -0.14, -0.07, -0.02, 0])),
                     x=pick(f, [-1, -3, -4, 4, 10, 8, 4, 1])),
        "hips": {"z": pick(f, [-1, -2, 0.5, 0, -2.5, -1.8, -0.6, 0])},
        "torso": {"r": pick(f, [2, 8, 12, -8, -18, -14, -7, -2])},
        "head": {"r": pick(f, [0, 3, 5, -3, -6, -4, -2, 0])},
        "thigh_r": {"r": pick(f, [0, -6, -8, 14, 28, 22, 10, 2])},
        "shin_r": {"r": pick(f, [0, 0, 0, -8, -16, -12, -4, 0])},
        "thigh_l": {"r": pick(f, [0, 6, 8, -10, -20, -14, -6, 0])},
        "sparks": {"show": f == 4},
    })
    if f == 3:
        pose.setdefault("blade_r", {})["sz"] = 1.25
    if f in (3, 4):
        K.squint(pose, 0.5)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, K.hit_body(f), {"arm_r": {"r": 16 * a}, "arm_l": {"r": 14 * a}})


# death: a blink-out, not a fall. 0 struck (recoil, X eyes), 1 folds in, 2-4 warps away: squeezed
# thin and shrinking into a violet flash, 5 a last spark as the flash closes (7 steps, 0.5 s)
DIE_SEQ = [0, 1, 2, 3, 4, 5, 5]
DIE_MS = [60, 70, 60, 60, 60, 80, 90]


def _die(f):
    pose = merge(STANCE, {
        "body": {"x": pick(f, [-3, -4, -4, -4, -4, -4]), "z": pick(f, [1, 0, 6, 10, 13, 15]),
                 "r": pick(f, [12, 6, 0, 0, 0, 0]),
                 "s": pick(f, [1.0, 0.94, 0.72, 0.45, 0.18, 0.04]),
                 "sx": pick(f, [1.0, 1.06, 0.6, 0.45, 0.4, 1.0]), "sy": pick(f, [1.0, 1.06, 0.6, 0.45, 0.4, 1.0]),
                 "sz": pick(f, [1.0, 0.9, 1.35, 1.6, 1.8, 1.0])},
        "torso": {"r": pick(f, [16, 8, 0, 0, 0, 0])}, "head": {"r": pick(f, [14, 0, 0, 0, 0, 0])},
        "arm_r": {"r": pick(f, [60, 30, 10, 0, 0, 0])}, "arm_l": {"r": pick(f, [80, 40, 10, 0, 0, 0])},
        "blink": {"show": f >= 2, "s": pick(f, [1, 1, 0.7, 1.05, 1.3, 0.7])},
        "blink_core": {"show": f in (2, 3, 4), "s": pick(f, [1, 1, 0.8, 1.0, 1.1, 1])},
    })
    if f in (0, 1):
        K.ko(pose)
    return pose


DIE_EXTRA = {"fx": [], "blinkOut": True, "hideUnitAtMs": sum(DIE_MS)}


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR, durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 6, _die, sequence=DIE_SEQ, durations=DIE_MS, extra=DIE_EXTRA),
    ]
