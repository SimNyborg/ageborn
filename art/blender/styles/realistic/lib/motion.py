"""Animation helpers shared by the realistic units: the standard clip timing of the game sheets,
breathing idles, planted-foot walks, knockback hits, heavy falls with dust, and a builder for the
standard biped clip list.

Timing (ms) matches the shipped sheet contract (art/blender/ageborn_art/retime.py), so a
restyled unit keeps its clip lengths and attack contact point:

  infantry  idle 8 x 115, walk 8 x 62.5, attack [65,70,120,35,140,80,80,90] (impact 4, smear 3),
            hit [45,75,60,60,70], die [45,60,70,60,50,60,70,90,90,100]
  heavy     idle 6 x 150, attack 9 frames in 13 steps (impact 4, smear 3), die 8 frames in 12 steps

Sign convention (Rig): positive hips / spine / chest / neck / head angles turn the bone
counter-clockwise on screen, i.e. lean BACK (head: look up); forward leans are negative.

Realistic motion rules (docs/ui-plan.md 5.8): no squash and stretch on bodies; weight through
timing (held anticipation, fast strike, held impact, longer recovery), follow-through in hair,
cloth and straps, knockback as a pose and a few lu of offset.
"""
import math

from . import biped as B
from . import game as G

IDLE_MS = [115] * 8
WALK_MS = [62, 63, 62, 63, 62, 63, 62, 63]
ATTACK_MS = [65, 70, 120, 35, 140, 80, 80, 90]
ATTACK_TIMES = [0, 65, 135, 268, 290, 430, 510, 590]       # frame 3 posed late in its step (mid-swing)
HIT_MS = [45, 75, 60, 60, 70]
HIT_TIMES = [0, 50, 125, 185, 245]
DIE_MS = [45, 60, 70, 60, 50, 60, 70, 90, 90, 100]

HEAVY_IDLE_MS = [150] * 6
HEAVY_ATTACK_SEQ = [0, 0, 1, 1, 2, 3, 4, 4, 5, 6, 6, 7, 8]
HEAVY_ATTACK_MS = [90, 80, 80, 90, 190, 40, 90, 90, 90, 90, 90, 100, 110]
HEAVY_DIE_SEQ = [0, 1, 1, 2, 3, 4, 4, 5, 5, 6, 6, 7]
HEAVY_DIE_MS = [60, 70, 80, 80, 60, 70, 80, 90, 90, 100, 100, 110]


def dust_frames(clip, t0, span=420.0, origin=(-24, 0), spread=22, size=9.5, seed=5, color=None):
    """2D dust kwargs for every frame of `clip` at or after t0 (ms): billows, then settles."""
    out = {}
    for i, t in enumerate(clip.times):
        if t >= t0 - 1:
            d = {"s": max(0.02, (t - t0) / span), "origin": origin, "spread": spread, "size": size, "seed": seed}
            if color:
                d["color"] = color
            out[i] = d
    return out


def biped_clips(attack_blur=None, die_fx=None, hide_ms=695, dust=None, attack_times=None, attack_extra=None,
                walk_ms=None):
    """The standard infantry clip list. `dust` = kwargs for `dust_frames` on the die clip."""
    die = G.Clip("die", DIE_MS, extra={"fx": die_fx or [], "hideUnitAtMs": hide_ms})
    if dust:
        die.fx = dust_frames(die, **dust)
    return [
        G.Clip("idle", IDLE_MS, loop=True),
        G.Clip("walk", walk_ms or WALK_MS, loop=True),
        G.Clip("attack", ATTACK_MS, impact=4, smear=3, times=attack_times or ATTACK_TIMES,
               blur=attack_blur or {}, extra=attack_extra),
        G.Clip("hit", HIT_MS, times=HIT_TIMES),
        die,
    ]


# ---------------------------------------------------------------------------------- biped poses
def breathe(P, t, period=920.0, amp=1.0, arms=True):
    """Adds breathing and a slow weight shift to a standing pose (seamless over `period`)."""
    a = 2 * math.pi * t / period
    b = amp * math.sin(a)
    P = dict(P)
    rx, rz = P.get("root", (0.0, 0.0))
    P["root"] = (rx, rz - 0.35 * b)
    P["root_dy"] = P.get("root_dy", 0.0) + 1.3 * amp * math.sin(a + 0.8)
    P["hips"] = P.get("hips", 0.0) + 1.1 * amp * math.sin(a + 0.8)
    P["spine"] = P.get("spine", 0.0) + 1.2 * b
    P["chest"] = P.get("chest", 0.0) - 0.8 * b
    P["head"] = P.get("head", 0.0) - 0.8 * b + 2.5 * amp * math.sin(a + 0.3)
    if arms and "armB" in P:
        x = P["armB"]
        P["armB"] = (x[0] - 2.2 * b, x[1] + 1.5 * b) + tuple(x[2:])
    return P


def flip_torso(keys):
    """Negate the torso chain of authored key poses (for keys written with forward = positive)."""
    out = []
    for tk, P in keys:
        P = dict(P)
        for k in ("hips", "spine", "chest", "neck", "head"):
            if k in P:
                P[k] = -P[k]
        out.append((tk, P))
    return out


def walk_legs(t, stride, lift, stance, ground, cycle=500.0, bob=1.5, lean=4.0, twist=7.0):
    """Walk torso and legs at time t (ms): planted feet (IK), lowest on contact (0, 0.5 of the
    cycle), highest on passing, hip twist and a counter-rotating chest. Arms are added by the unit
    with `arm_swing`."""
    ph = (t / cycle) % 1.0
    fF = B.walk_feet(ph, stride, lift, stance=stance, ground=ground)
    fB = B.walk_feet(ph + 0.5, stride, lift, stance=stance, ground=ground)
    c2 = math.cos(4 * math.pi * (ph - 0.06))
    s1 = math.sin(2 * math.pi * ph)
    return dict(root=(1.2, -1.3 - bob * c2), root_dy=1.1 * math.cos(2 * math.pi * ph),
                hips=-lean + 1.5 * c2, twist=twist * s1, spine=-lean * 0.8, chest=1.5 - 1.2 * c2,
                neck=3, head=2 + 1.5 * c2, footF=fF, footB=fB), ph, s1, c2


def arm_swing(s1, side, amp=24.0, bias=-4.0):
    """Natural arm swing opposite to the same-side leg (FK: shoulder, elbow, wrist, abduct)."""
    sgn = -1 if side == "F" else 1
    a = sgn * amp * s1 + bias
    return (a, 16 + 12 * max(0.0, sgn * s1), 6, -4 if side == "B" else 4)


def knock_hit(base, t, knock, back=6.0):
    """Hit reaction: snap back (knockback of `back` lu), hold, recover. `knock` = extra channels."""
    rx, rz = base.get("root", (0.0, 0.0))
    k = dict(base, root=(rx - back, rz - 1.2), hips=base.get("hips", 0) + 7, spine=base.get("spine", 0) + 9,
             chest=base.get("chest", 0) + 5, neck=-6, head=-9)
    k.update(knock)
    k2 = dict(k, root=(rx - back * 0.85, rz - 1.8), neck=2, head=8)
    return B.keyed([(0, base), (55, k), (140, k2), (310, base)], t)


def fall_back(base, t, H, ground, arms_up=None, hold_ms=695, smooth=False):
    """Death: knocked off the feet, a heavy fall on the back, one bounce, still. `base` must use
    `pel` (not `root`). Contact with the ground at ~238 ms. `smooth` adds a later, lower key before
    the landing so the die 3 -> 4 frames do not pop from mid-air to flat (the frame at 175 ms is
    already most of the way down)."""
    pz = B.PELV * H
    G0 = ground
    k1 = dict(pel=(-4.0, pz - 2.0), hips=-10, spine=-12, chest=-8, neck=10, head=16,
              footF=(7.0, G0 + 1.0, 10.0), footB=(-12.5, G0, 0.0), armF=(20, 60, -10), armB=(-40, 30, 10, -14))
    k2 = dict(pel=(-8.0, pz - 11.0), root_r=12, hips=-10, spine=-8, chest=-6, neck=6, head=10,
              footF=(6.0, G0, 8.0), footB=(-9.0, G0, 0.0), armF=(60, 50, -10, 14), armB=(50, 40, 10, -20))
    k3 = dict(pel=(-15.0, pz - 21.0), root_r=46, hips=-6, spine=-4, chest=-4, neck=4, head=8,
              footF=(5.0, G0 + 1.0, 20.0), footB=(-2.0, G0 + 2.0, 20.0), armF=(120, 30, 0, 24), armB=(110, 30, 0, -24))
    land = dict(pel=(-20.0 * H / 66, 6.0), root_r=86, hips=-4, spine=0, chest=0, neck=0, head=4,
                footF=(1.0, G0 + 5.0, 60.0), footB=(-4.0, G0 + 3.0, 50.0), armF=(168, 14, -80, 30), armB=(158, 20, 0, -30))
    bounce = dict(land, pel=(-20.5 * H / 66, 7.6), root_r=80, neck=-6, head=-10, armF=(160, 20, -70, 34),
                  footF=(1.0, G0 + 7.0, 60.0))
    rest = dict(land, pel=(-20.8 * H / 66, 5.6), root_r=87, neck=2, head=6, footF=(4.0, G0 + 3.0, 70.0),
                footB=(0.0, G0 + 2.0, 60.0), armF=(172, 10, -85, 30))
    keys = [(0, base), (50, k1), (120, k2), (185, k3), (238, land), (290, bounce), (360, rest), (hold_ms, rest)]
    if smooth:
        k3s = dict(k3, pel=(-18.0 * H / 66, pz - 27.0), root_r=66, footF=(3.0, G0 + 3.0, 40.0), footB=(-3.0, G0 + 3.0, 36.0),
                   armF=(150, 22, -40, 28), armB=(138, 24, 0, -28))
        keys = [(0, base), (50, k1), (112, k2), (175, k3s), (238, land), (290, bounce), (360, rest), (hold_ms, rest)]
    if arms_up:
        keys = [(tk, dict(p, **arms_up(i))) for i, (tk, p) in enumerate(keys)]
    return B.keyed(keys, t)
