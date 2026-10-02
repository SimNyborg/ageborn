"""Balloon Admiral: Gunpowder Age Legendary air bomber (DESIGN A5.4), flyer rig (A11).
Bombs (proj.bomb) dropped below, ~200 lu. Rendered at 1-1.25x (Legendary size budget).

Look (A11, Gunpowder palette): a big hot-air balloon whose envelope has team gores alternating
with cream gores, a cream trim band round its belly and a stitched cream patch, a brass crown
ring with a streaming team pennant, cream rigging down to a wicker gondola (woven bands, a
dark-wood rim, a team rail band with a cream anchor), a rack of black bombs along its side,
sandbags that swing, and a bomb bay with two hinged doors under the floor. In the gondola
stands the Admiral: a white-whiskered old salt in a team coat with brass epaulettes and a huge
black bicorne worn athwart (brass edge, team cockade), with a brass telescope. Origin (the feet
anchor) is the gondola's lowest point; the battle view lifts air units to flight altitude.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, `kit_medieval.py`):
  idle    hovers; the envelope breathes a beat behind the gondola, the pennant flutters, the
          sandbags sway, the admiral scans with the telescope and blinks
  walk    walk v3 flight (ANIM_SPEC G8): nose down 6 degrees into the wind, the burner flame
          flickering on a 2-3 frame beat, the envelope breathing +-2% a beat behind, the gondola,
          sandbags and pennant trailing; the hover bob itself is added in code (R8)
  attack_b  HEAVE OVER THE RAIL: the admiral tucks his telescope, grabs a bomb off the rack and
          holds it out over the front rail at arm's length with its fuse sparking (the held
          extreme: the bomb out in front of the gondola, against A's bomb hanging in the hatch), then heaves it down over the front
          rail; the lightened balloon lurches up and he leans out to watch it fall
  attack  SPOT, SALUTE AND BOMB-BAY DROP: the admiral spots the target through the telescope,
          snaps a salute with it, the bay doors swing open and the bomb hangs in the hatch with
          its fuse sparking (the held extreme), then it drops (the bomb leaves `muzzle` on the
          release frame), the lightened balloon lurches up (the envelope stretches), squashes
          back and bobs while the sandbags swing and the doors flap shut
  hit     flyer: tilts and drops, the admiral grabs the rail and squeezes his eyes, a wobble
  die     D8 spiral down: the envelope tears, sags and deflates while the balloon tips over
          and sinks spinning, the admiral hangs on with X eyes; a crash bounce at the end
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "balloon_admiral"
GAIT_NAME = "fly"
NAME = "Balloon Admiral"
HEIGHT_LU = 200
YAW_DEG = -10.0
CANVAS = (320, 440)
FEET = (168, 390)
ANCHORS = {"head": (0, 200), "hitCenter": (0, 110), "muzzle": (0, -8)}
NO_RETIME = True

WICKER = "#B89E7E"
WICKER_DK = "#8F785C"
ROPE = "#D8CCB0"
SAND = "#C8B89A"
HAIR = "#ECE8E0"
BOMB = "#34363C"

ENV_C = 118.0            # envelope: widest ring height
NECK_Z = 74.0
GON_TOP = 22.0
HATCH = (2.0, 0.0, -1.0)  # the bomb hangs here below the gondola floor


def _envelope_profile():
    # (radius, z) from the neck up: a pear, widest at ENV_C, rounded crown
    return [(0.0, NECK_Z - 1.0), (7.0, NECK_Z), (9.0, NECK_Z + 6), (18.0, NECK_Z + 16),
            (30.0, NECK_Z + 28), (39.0, ENV_C - 10), (43.0, ENV_C), (44.0, ENV_C + 12),
            (42.0, ENV_C + 26), (37.0, ENV_C + 40), (28.0, ENV_C + 53), (16.0, ENV_C + 61),
            (0.0, ENV_C + 64)]


def build(rig):
    rig.joint("unit", "root", (0, 0, 0))
    rig.joint("gondola", "unit", (0, 0, 10))
    rig.joint("envelope", "unit", (0, 0, NECK_Z))

    # -- envelope: team body with cream gores, a cream belly band, a patch, brass crown --------
    prof = _envelope_profile()
    env = Geo().lathe(prof, segs=36)
    ef = F.Face(rig, "envelope", [env])
    rig.part("envelope", env, team=True)
    n = 12
    for i in range(0, n, 2):
        t1, t2 = 2 * math.pi * i / n + 0.26, 2 * math.pi * (i + 1) / n + 0.26
        g = Geo().lathe([(r * 1.012, z) for r, z in prof], segs=36)
        g.clip((0, 0, 0), (math.sin(t1), -math.cos(t1), 0))
        g.clip((0, 0, 0), (-math.sin(t2), math.cos(t2), 0))
        rig.part("envelope", g, B.CREAM, outline=0.8)
    g = Geo().lathe([(43.4, -2.4), (44.6, 0), (43.4, 2.4), (42.0, 2.4), (42.0, -2.4)], (0, 0, ENV_C + 2),
                    (0, 0, ENV_C + 3), segs=36)
    rig.part("envelope", g, B.CREAM, outline=0.6)                    # belly band
    g = Geo()
    for a in range(0, 360, 30):                                      # brass grommets on the band
        r = math.radians(a)
        g.sphere((44.8 * math.cos(r), 44.8 * math.sin(r), ENV_C + 2), 1.1, cuts=2)
    rig.part("envelope", g, B.BRASS, finish="metal", outline=0)
    # a stitched patch on the near side, high up
    g = Geo()
    c = ef.hit(*K.scr(ef, (-14.0, -36.0, ENV_C + 30)))
    ef.decal(g, c, [(-5.0, 4.4), (5.2, 4.8), (4.8, -4.6), (-5.4, -4.2)], 0.5)
    rig.part("envelope", g, "#D9CBA8", highlight=False, outline=0)
    g = Geo()
    for u, v in ((-4.2, 3.6), (4.4, 4.0), (4.0, -3.8), (-4.6, -3.4)):
        ef.stroke(g, c - ef.view * 0.3, [(u * 0.8, v * 1.1), (u * 1.1, v * 0.8)], 0.8, 0.3)
    rig.part("envelope", g, B.WOOD, highlight=False, outline=0)
    g = Geo().lathe([(9.5, -1.4), (10.2, 0), (9.5, 1.4), (8.0, 1.4), (8.0, -1.4)], (0, 0, NECK_Z + 5),
                    (0, 0, NECK_Z + 6), segs=24)                       # neck band
    g.lathe([(0, -1.0), (15.5, -1.0), (16.5, 0.6), (15.0, 2.2), (0, 2.2)], (0, 0, ENV_C + 61.2),
            (0, 0, ENV_C + 62.2), segs=24)                             # crown cap
    rig.part("envelope", g, B.BRASS, finish="metal", outline=0.8)
    g = Geo().capsule((0, 0, ENV_C + 62), (0, 0, ENV_C + 78), 1.0)
    g.sphere((0, 0, ENV_C + 79), 1.8, cuts=3)
    rig.part("envelope", g, B.BRASS, finish="metal", outline=0.7)
    pz = ENV_C + 76.5
    rig.secondary("pennant", "envelope", (0, 0, pz), (-20, 0, pz - 3), max_deg=16, gain=1.4, rot_gain=0.4)
    pts = [(0.0, 0.0), (-24.0, -1.2), (-18.0, -5.0), (-24.0, -9.4), (0.0, -10.4)]
    g = Geo().slab([(x, pz + z) for x, z in pts], 0.0, 1.2)
    rig.part("pennant", g, team=True, outline=0.8)

    # the tear in the envelope on death (a dark hole with ragged edges)
    rig.joint("tear", "envelope", (30.0, -30.0, ENV_C + 20), hidden=True)
    g = Geo().blob((26.0, -34.0, ENV_C + 22), (7.0, 3.0, 9.0), p=2.2, rot=(0, 0, -40))
    g.blob((29.0, -32.0, ENV_C + 30), (3.0, 3.0, 4.0), p=2.0)
    rig.part("tear", g, B.WOOD, outline=0.6)

    # -- rigging: cream ropes from the neck band to the gondola rim ----------------------------
    g = Geo()
    for x, y in ((15.0, -9.0), (-15.0, -9.0), (15.0, 9.0), (-15.0, 9.0), (0.0, -12.0)):
        g.capsule((x, y, GON_TOP + 10), (x * 0.52, y * 0.8, NECK_Z + 5), 0.75)
    rig.part("gondola", g, ROPE, outline=0.5)

    # -- gondola: wicker tub, woven bands, a dark rim, a team rail band with an anchor --------
    tub = Geo().blob((0, 0, 21.0), (19.0, 12.0, 11.0), p=3.4, taper=(0.86, 1.0))
    tf = F.Face(rig, "gondola", [tub])
    rig.part("gondola", tub, WICKER, finish="hair")
    g = Geo()
    for z in (14.0, 19.0, 24.0, 28.5):
        g.blob((0, 0, z), (19.2 * (0.9 + 0.1 * (z - 10) / 22), 12.2, 0.8), p=3.4)
    rig.part("gondola", g, WICKER_DK, outline=0)
    g = Geo()                                                        # weave: vertical stakes
    for x in range(-14, 16, 5):
        c2 = tf.hit(*K.scr(tf, (x, -12.0, 21.0)))
        tf.stroke(g, c2, [(0.0, -8.0), (0.0, 7.0)], 0.9, 0.3)
    rig.part("gondola", g, WICKER_DK, highlight=False, outline=0)
    g = Geo().blob((0, 0, 32.0), (20.4, 13.2, 1.8), p=3.6)
    rig.part("gondola", g, B.WOOD)
    band = Geo().blob((0, 0, 29.4), (19.8, 12.8, 2.6), p=3.6)
    band.clip((-12.0, 0, 0), (-1, 0, 0))
    bf = F.Face(rig, "gondola", [band])
    rig.part("gondola", band, team=True, outline=0.6)
    g = G.anchor(bf, Geo(), K.scr(bf, (4.0, -12.8, 29.4)), s=0.55, w=1.4)
    rig.part("gondola", g, B.CREAM, highlight=False, outline=0)
    g = Geo()
    for x in (-10.5, -3.5, 3.5, 10.5):                               # bomb rack on the near side
        g.sphere((x, -13.8, 19.5), 3.2, cuts=4)
    rig.part("gondola", g, BOMB, finish="gloss")
    g = Geo()
    for x in (-10.5, -3.5, 3.5, 10.5):
        g.capsule((x + 1.4, -15.8, 22.0), (x + 2.4, -16.2, 24.0), 0.5)
    rig.part("gondola", g, B.TAN, outline=0)
    for i, (x, y) in enumerate(((-18.5, -8.0), (18.5, -8.0), (-12.0, -11.0))):
        j = f"bag{i}"
        rig.secondary(j, "gondola", (x, y, 31.0), (x, y, 17.0), max_deg=20, gain=1.3)
        g = Geo().capsule((x, y, 31.0), (x, y, 20.0), 0.5)
        rig.part(j, g, ROPE, outline=0.4)
        g = Geo().blob((x, y, 17.5), (3.4, 3.2, 4.2), p=2.2, taper=(1.0, 0.7))
        rig.part(j, g, SAND)
        g = Geo().blob((x, y - 0.4, 20.4), (1.8, 2.8, 0.8), p=2.2)
        rig.part(j, g, ROPE, outline=0.3)
    # the bomb bay: two hinged doors under the floor
    for name, x0, sgn in (("door_a", -7.0, 1), ("door_b", 11.0, -1)):
        rig.joint(name, "gondola", (x0, 0, 10.4))
        g = Geo().blob((x0 + sgn * 4.4, 0, 10.2), (4.6, 8.6, 1.0), p=3.0)
        rig.part(name, g, B.WOOD, outline=0.6)

    # -- the admiral, 1.15x, standing in the gondola --------------------------------------------
    rig.joint("crew", "gondola", (2.0, 0, 8.0), scale=1.15)
    rig.joint("body", "crew", (2.0, 0, 8.0))
    rig.joint("torso", "body", (2.0, 0, 24.0))
    rig.joint("head", "torso", (3.0, 0, 46.0))
    ox, oz = 2.0, 8.0

    def P(x, y, z):
        return (ox + x, y, oz + z)

    g = Geo().blob(P(0, 0, 28.0), (10.6, 9.8, 11.8), p=2.4, taper=(1.08, 0.94))
    rig.part("torso", g, team=True)
    g = Geo().blob(P(5.2, -1.0, 27.5), (6.4, 4.8, 8.8), p=2.6, taper=(1.05, 0.7))
    g.clip(P(7.6, 0, 0), (-1, 0, 0))
    rig.part("torso", g, B.CREAM)
    g = Geo()
    for z in (32.0, 27.5):
        g.sphere(P(11.6, -2.8, z), 1.0, cuts=3)
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.5)
    g = Geo().blob(P(1.2, 0, 37.2), (6.8, 7.2, 2.4), p=2.4)
    rig.part("torso", g, B.CREAM)
    head = Geo().blob(P(2, 0, 48.5), (11.6, 11.0, 11.4), p=2.3)
    head.blob(P(6, 0, 43.0), (8.6, 9.4, 6.2), p=2.2)
    head.blob(P(13.8, -0.6, 46.6), (3.8, 3.2, 3.6), p=2.0)
    hair = Geo().blob(P(4.5, -10.2, 44.5), (4.6, 2.4, 6.0), p=2.2)       # whiskers
    hair.blob(P(-5.8, 0, 47.0), (5.6, 10.2, 6.4), p=2.2)
    cx, cz = P(12.0, 0, 49.6)[0], P(12.0, 0, 49.6)[2]
    K.face2(rig, [head, hair], B.SKIN, cx=cx, cz=cz, eye_dy=(-4.6, 4.4), eye_r=(3.6, 3.4, 4.2),
            brow=HAIR, mouth_dz=-8.4, mouth_x=cx + 0.8, eye_at=(cx + 1.8, cz + 0.2), mark_r=3.9)
    rig.part("head", head, B.SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    g = Geo().blob(P(13.4, -4.0, 43.8), (3.0, 5.0, 2.2), p=2.2, rot=(24, 0, 0))    # walrus moustache
    g.blob(P(13.4, 3.0, 43.8), (3.0, 5.0, 2.2), p=2.2, rot=(-24, 0, 0))
    rig.part("head", g, HAIR, finish="hair")
    B.bicorne(rig, joint="head", c=P(0.5, 0, 57.5), scale=1.2)
    # epaulettes and the near arm with the telescope
    rig.joint("arm_r", "torso", P(0, -12.5, 36))
    rig.joint("fore_r", "arm_r", P(0, -12.5, 28))
    rig.joint("hand_r", "fore_r", P(0, -12.5, 21))
    g = Geo().capsule(P(0, -12.5, 36), P(0, -12.5, 28), 4.3, 4.0)
    rig.part("arm_r", g, team=True)
    g = Geo().capsule(P(0, -12.5, 28), P(0, -12.5, 23), 4.0, 3.8)
    g.blob(P(0, -12.5, 24.4), (5.0, 5.0, 2.0), p=2.6)
    rig.part("fore_r", g, B.CREAM)
    g = Geo().blob(P(0.4, -12.5, 20.6), (4.2, 4.0, 4.2), p=2.3)
    rig.part("hand_r", g, B.CREAM)
    for y in (-12.8, 12.0):
        g = Geo().blob(P(0, y, 38.0), (6.6, 5.4, 3.6), p=2.4)
        rig.part("torso" if y > 0 else "arm_r", g, B.BRASS, finish="metal", outline=0.8)
        g = Geo()
        for dx in (-4.0, -1.5, 1.0, 3.5):
            g.capsule(P(dx, y * 1.04, 35.4), P(dx, y * 1.04, 32.4), 0.6)
        rig.part("torso" if y > 0 else "arm_r", g, B.BRASS, finish="metal", outline=0)   # fringe
    hx, hy, hz = P(0.4, -13.6, 21.0)
    rig.joint("tele", "hand_r", (hx, hy, hz))     # the telescope (tucked away in attack B)
    g = Geo().lathe([(0, -3.0), (2.4, -3.0), (2.4, 6.0), (2.0, 6.2), (2.0, 12.0), (1.6, 12.2),
                     (1.6, 17.0), (2.1, 17.4), (2.1, 19.0), (0, 19.0)], (hx, hy, hz), segs=14)
    rig.part("tele", g, B.BRASS, finish="metal", outline_hex=B.WOOD)
    g = Geo().lathe([(0, -0.8), (2.6, -0.8), (2.6, 3.0), (0, 3.0)], (hx, hy, hz - 1.0), segs=14)
    rig.part("tele", g, B.BLACK, outline=0.6)
    g = Geo().blob((hx - 0.6, hy - 2.2, hz + 18.4), (0.9, 0.6, 1.4), p=2.2)
    rig.part("tele", g, glow="#FFFFFF", outline=0)                   # lens glint
    # attack B: a bomb carried on the near fist (heaved over the rail)
    b2 = (hx + 1.6, hy - 2.0, hz + 6.4)
    rig.joint("bomb2", "hand_r", b2, hidden=True)
    g = Geo().sphere(b2, 5.6, cuts=5)
    rig.part("bomb2", g, BOMB, finish="gloss", outline_hex="#50535A")
    g = Geo().blob((b2[0] - 2.0, b2[1] - 4.4, b2[2] + 2.0), (1.4, 0.6, 1.2), p=2.2)
    rig.part("bomb2", g, "#F4F4F0", highlight=False, outline=0)
    g = Geo().capsule((b2[0] + 3.0, b2[1], b2[2] + 4.0), (b2[0] + 4.4, b2[1], b2[2] + 6.6), 0.7)
    rig.part("bomb2", g, B.TAN, outline=0)
    rig.joint("fuse2", "bomb2", (b2[0] + 4.6, b2[1] - 1.0, b2[2] + 7.0))
    g = Geo().star((b2[0] + 4.6, b2[1] - 2.0, b2[2] + 7.0), 3.4, 1.3, 1.0, points=6)
    rig.part("fuse2", g, glow=B.FIRE, outline=0)
    # the burner: a brass pot on the far rigging just under the envelope's neck, its flame
    # flickers (scaled 0.8-1.3) in the idle and the walk (ANIM_SPEC G8 thrust pulse)
    bu = (-17.0, -9.0, 50.0)
    g = Geo().lathe([(0, 0), (3.4, 0), (4.0, 2.2), (3.0, 3.4), (0, 3.4)], bu, (bu[0], bu[1], bu[2] + 1.0), segs=14)
    rig.part("unit", g, B.BRASS, finish="metal", outline=0.7)
    rig.joint("flame", "unit", (bu[0], bu[1], bu[2] + 3.4))
    g = Geo().lathe([(0, 0), (3.6, 0.8), (3.4, 4.6), (1.8, 9.0), (0, 12.0)], (bu[0], bu[1] - 1.0, bu[2] + 3.4),
                    (bu[0], bu[1] - 1.0, bu[2] + 4.4), segs=12)
    rig.part("flame", g, glow=B.FIRE, outline=0.5, outline_hex="#F2A23A")
    g = Geo().lathe([(0, 0), (1.4, 0.6), (1.2, 2.6), (0, 4.6)], (bu[0], bu[1] - 2.2, bu[2] + 3.6),
                    (bu[0], bu[1] - 2.2, bu[2] + 4.6), segs=10)
    rig.part("flame", g, glow="#FFFFFF", outline=0)

    # the bomb that drops through the hatch in the attack
    rig.joint("bomb", "gondola", HATCH, hidden=True)
    bx, by, bz = HATCH
    g = Geo().sphere((bx, by - 2, bz - 4.0), 5.6, cuts=5)
    rig.part("bomb", g, BOMB, finish="gloss", outline_hex="#50535A")
    g = Geo().blob((bx - 2.0, by - 6.4, bz - 2.0), (1.4, 0.6, 1.2), p=2.2)
    rig.part("bomb", g, "#F4F4F0", highlight=False, outline=0)
    g = Geo().capsule((bx + 2.0, by - 2, bz), (bx + 3.2, by - 2, bz + 2.6), 0.7)
    rig.part("bomb", g, B.TAN, outline=0)
    rig.joint("fuse", "bomb", (bx + 3.4, by - 4, bz + 3.0))
    g = Geo().star((bx + 3.4, by - 4, bz + 3.0), 3.2, 1.2, 1.0, points=6)
    rig.part("fuse", g, glow=B.FIRE, outline=0)
    rig.track("muzzle", "bomb", (bx, by, bz - 4.0))


# -- poses ---------------------------------------------------------------------------------
def scope(a, f, w):
    """The near arm: upper arm and forearm directions and the telescope's direction."""
    return {"arm_r": {"r": a + 90.0}, "fore_r": {"r": f - a},
            "hand_r": {"r": w - 90.0 - (f + 90.0)}}


STANCE = merge(scope(-20, 40, 5), {"torso": {"r": -2}})
UC = (0.0, 0.0, 110.0)      # the balloon's centre (tilts and spins pivot here)


FLICKER = [1.0, 1.28, 0.82, 1.18, 0.9, 1.3, 0.8, 1.12]


def _flame(f, k=1.0):
    s = FLICKER[f % len(FLICKER)] * k
    return {"flame": {"sz": s, "sx": 0.85 + 0.15 * s, "sy": 0.85 + 0.15 * s}}


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    lag = math.cos(2 * math.pi * (f - 1) / n)
    scan = [0.0, 0.3, 1.0, 1.0, 0.3, 0.0][f]
    pose = merge({"torso": {"r": -2}}, scope(-20 + 10 * scan, 40 + 8 * scan, 5 + 10 * scan), {
        "unit": {"z": 2.0 * c},
        "envelope": dict(squash(0.025 * lag), z=-0.8 * lag, r=0.6 * lag),
        "gondola": {"r": 1.2 * c},
        "torso": {"r": 1.2 * lag},
        "head": {"r": -2.0 * lag + 3 * scan},
        "pennant": {"r": [0, 6, 10, 4, -4, -2][f]},
    }, _flame(f, 0.9))
    if f == 5:
        pose = merge(pose, F.expr("blink"))
    return pose


WALK_MS = 100


def _walk(f):
    # nose down 6 degrees about the balloon's centre, a small sheet bob (the hover sine is code),
    # the envelope breathing a beat behind, the gondola and sandbags trailing, the flame flickering
    p = 2 * math.pi * f / 8
    pl = p - 2 * math.pi / 8
    pl2 = p - 4 * math.pi / 8
    ab = M.about(UC, r=-6.0)
    return merge(STANCE, {
        "unit": {"x": ab["x"], "y": ab["y"], "z": ab["z"] + 0.8 * math.sin(p), "r": -6.0},
        "envelope": dict(squash(0.02 * math.sin(pl)), r=1.6 * math.cos(pl)),
        "gondola": {"r": 2.4 + 2.6 * math.sin(pl)},
        "torso": {"r": -4.0 + 1.5 * math.sin(pl)},
        "head": {"r": 3.0 + 1.5 * math.cos(pl)},
        "arm_r": {"r": 3.0 * math.sin(pl)},
        "bag0": {"r": 10 + 6 * math.sin(pl2)}, "bag1": {"r": 10 + 6 * math.sin(pl2)},
        "bag2": {"r": 10 + 6 * math.sin(pl2)},
        "pennant": {"r": 8 * math.sin(2 * p - 1.0)},
    }, _flame(f, 1.1))


# attack: 832 ms, the drop (impact) at 333 ms (impactAt 0.4002, as shipped); 10 unique frames
#            spot salute doors HOLD sink | DROP lurch squash bob settle
ATTACK_MS = [40, 50, 60, 140, 43, 80, 90, 110, 110, 109]
ATTACK_IMPACT = 5
SC = [(-40, -40, -55), (-30, -30, -60), (40, 120, 95), (-40, -30, -60), (-40, -34, -62),
      (10, 60, 75), (20, 80, 90), (5, 60, 45), (-10, 45, 20), (-20, 40, 5)]
U_Z = [0, -0.5, -1.0, -1.5, -2.2, 3.5, 6.0, 4.0, 1.5, 0.0]
E_Q = [0, 0, -0.01, -0.02, -0.04, 0.07, -0.06, 0.03, -0.01, 0.0]
G_R = [2, 3, 4, 5, 6, -5, -7, -3, 1, 0]
T_R = [-10, -8, 0, -14, -14, 6, 10, 4, 0, -2]
H_R = [-8, -10, 2, -12, -12, 8, 12, 4, 0, 0]
DOORS = [0, 0, 40, 72, 76, 80, 55, 25, 8, 0]
BOMB_Z = [0, 0, 0, -3.0, -5.5, 0, 0, 0, 0, 0]


def _attack_pose(f):
    a, fo, w = SC[f]
    pose = merge({"torso": {"r": -2}}, scope(a, fo, w), {
        "unit": {"z": U_Z[f]},
        "envelope": dict(squash(E_Q[f]), z=[0, 0, 0, 0, 0, 1.5, -1.0, 0.6, 0, 0][f]),
        "gondola": {"r": G_R[f], "z": [0, 0, 0, 0, 0, -1.5, 0.8, 0, 0, 0][f]},
        "torso": {"r": T_R[f]},
        "head": {"r": H_R[f]},
        "door_a": {"r": -DOORS[f]}, "door_b": {"r": DOORS[f]},
        "bomb": {"show": f in (3, 4), "z": BOMB_Z[f]},
        "fuse": {"s": [1, 1, 1, 1.3, 1.0, 1, 1, 1, 1, 1][f], "r": 30 * f},
        "bag0": {"r": [0, 0, 0, 0, 0, 14, -10, 6, -3, 0][f]},
        "bag1": {"r": [0, 0, 0, 0, 0, 14, -10, 6, -3, 0][f]},
    })
    if f in (0, 1):
        pose = merge(pose, F.expr("blink" if f == 0 else "o"))
    elif f == 2:
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.6}})
    elif f in (3, 4):
        pose = merge(pose, F.expr("grit"))
    elif f in (5, 6):
        pose = merge(pose, F.expr("yell"))
    return pose


def _attack_clip():
    ov = {
        5: [{"kind": "rings", "joint": "gondola", "point": (HATCH[0], 0.0, HATCH[2] - 2.0),
             "radii_lu": (8.0, 13.0), "a0": 200.0, "a1": 340.0, "color": "#FFF4D6"}],
        6: [{"kind": "burst", "joint": "envelope", "point": (0.0, 0.0, ENV_C + 66.0), "r0_lu": 8.0,
             "r1_lu": 15.0, "n": 5, "a0": 40.0, "arc": 100.0, "color": "#FFF4D6"}],
    }
    # the bomb bobs in the hatch with its fuse sparking (hold and sink frames) while the 2.4x sim
    # wind-up lasts (ANIM_SPEC R5)
    return M.clip("attack", [_attack_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=ov, extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: the admiral heaves the bomb over the rail (ANIM_SPEC appendix B) -------------------
# unique frames: 0 = A spot, 1 grabs a bomb off the rack (telescope tucked), 2 lifts it, 3 HOLD (the
# bomb held out over the front rail, fuse sparking), 4 fizz, 5 RELEASE (heaved down over the front
# rail: the projectile starts there), 6 leans out to watch, the balloon lurching up, 7-9 = A.
#       grab            lift           HOLD           fizz           RELEASE         watch
SC_B = [(-80, -95, -90), (-40, 20, 90), (14, -4, 90), (16, -2, 94), (10, -30, -20), (-20, -50, -40)]
UZ_B = [-0.5, -0.8, -1.2, -1.6, 2.5, 6.0]
EQ_B = [0, -0.01, -0.02, -0.03, 0.06, -0.06]
GR_B = [3, 2, -2, -3, 6, -6]
TR_B = [18, 2, -16, -17, -22, -26]
HR_B = [10, 0, -6, -7, 14, 20]
RELEASE = (16.0, 0.0, 7.0)    # the bomb joint's offset at the release (in front of the rail)


def _b_pose(i):
    if i == 0 or i >= 7:
        return _attack_pose(i)
    k = i - 1
    a, fo, w = SC_B[k]
    pose = merge({"torso": {"r": -2}}, scope(a, fo, w), {
        "unit": {"z": UZ_B[k]},
        "envelope": dict(squash(EQ_B[k]), z=[0, 0, 0, 0, 1.5, -1.0][k]),
        "gondola": {"r": GR_B[k], "z": [0, 0, 0, 0, -1.5, 0.8][k]},
        "torso": {"r": TR_B[k]}, "head": {"r": HR_B[k]},
        "tele": {"hide": True},
        "bomb2": {"show": k < 4},
        "fuse2": {"s": [1.0, 1.1, 1.3, 1.6, 1, 1][k], "r": 35 * k},
        "bomb": {"x": RELEASE[0], "z": RELEASE[2]},
        "bag0": {"r": [0, 0, 0, 0, 14, -10][k]}, "bag1": {"r": [0, 0, 0, 0, 14, -10][k]},
    })
    if k == 0:
        pose = merge(pose, F.expr("grit"))
    elif k in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif k == 4:
        pose = merge(pose, F.expr("yell"))
    else:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.4}})
    return pose


def _attack_b():
    hand = (2.4, -13.6, 29.0)                     # the near fist (rest, character space)
    top = (4.0, -15.6, 41.0)                      # the top of the carried bomb
    ov = {
        4: [{"kind": "burst", "joint": "hand_r", "point": (8.6, -16.6, 42.4), "r0_lu": 3.0, "r1_lu": 6.5,
             "n": 6, "color": "#FFE7B0"}],
        5: [{"kind": "arc", "joint": "hand_r", "inner": hand, "outer": top, "color": "#6A6E78",
             "taper": 0.3, "white": 0.45, "t0": 0.0, "t1": 1.0, "lines": 3, "samples": 16, "from": 4}],
        6: [{"kind": "burst", "joint": "envelope", "point": (0.0, 0.0, ENV_C + 66.0), "r0_lu": 8.0,
             "r1_lu": 15.0, "n": 5, "a0": 40.0, "arc": 100.0, "color": "#FFF4D6"}],
    }
    reuse = {0: ("attack", 0), 7: ("attack", 7), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=ov, reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    a = M.HIT_AMT[k]
    ab = M.about(UC, r=6 * a)
    pose = merge(STANCE, {
        "unit": {"x": ab["x"] - 3.0 * a, "y": ab["y"], "z": ab["z"] - 4.0 * max(a, 0), "r": 6 * a},
        "gondola": {"r": 9 * a},
        "envelope": dict(squash(-0.05 * a), r=3 * a),
        "torso": {"r": 12 * a}, "head": {"r": 10 * a}, "arm_r": {"r": 18 * a},
        "bag0": {"r": 16 * a}, "bag1": {"r": 16 * a},
    })
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


# D8 spiral down: 8 unique poses in the 12 heavy steps (moves.DIE_SEQ_HEAVY). The envelope
# tears, deflates and flops over to one side while the balloon wobbles and sinks; the gondola
# hits the ground with a crash bounce (no full spin: the crown would face the camera)
D_R = [10, -12, 16, -10, 8, 3, 5, 5]            # wobble (+ = leans back)
D_Z = [2, -3, -7, -12, -18, -14, -18, -18]      # sinks, crash bounce
D_X = [-2, -4, -6, -8, -9, -9, -9, -9]
D_Q = [0.0, 0.0, 0.0, 0.0, -0.12, 0.05, -0.06, -0.08]
D_ESZ = [0.9, 0.78, 0.64, 0.5, 0.36, 0.4, 0.34, 0.32]   # the envelope deflates
D_ESX = [1.05, 1.12, 1.2, 1.28, 1.36, 1.32, 1.38, 1.38]
D_ER = [6, 14, 20, 26, 32, 30, 32, 32]
D_EZ = [-2, -8, -14, -22, -30, -28, -32, -32]
D_S = [1, 1, 1, 1, 1, 1, 0.97, 0.92]


def _die(k):
    body = M.about(UC, r=D_R[k], s=D_S[k])
    pose = merge(STANCE, {
        "unit": dict(squash(D_Q[k]), x=body["x"] + D_X[k], y=body["y"], z=body["z"] + D_Z[k],
                     r=D_R[k], s=D_S[k]),
        "envelope": dict(sz=D_ESZ[k], sx=D_ESX[k], sy=D_ESX[k], r=D_ER[k], z=D_EZ[k]),
        "tear": {"show": True},
        "gondola": {"r": [10, 16, -8, 12, -6, 4, 0, 0][k]},
        "torso": {"r": [20, 12, 8, 10, 6, 8, 8, 8][k]}, "head": {"r": [16, -6, 8, -4, 6, 0, 0, 0][k]},
        "arm_r": {"r": [90, 120, 60, 110, 70, 60, 60, 60][k]},
        "pennant": {"r": [10, 30, -20, 40, -10, 20, 20, 20][k]},
        "door_a": {"r": -60}, "door_b": {"r": 60},
        "bag0": {"r": [20, -20, 16, -12, 30, 10, 20, 20][k]}, "bag1": {"r": [-16, 20, -14, 10, 30, 10, 20, 20][k]},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], [WALK_MS] * 8, loop=True),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True, attack_ms=832, attack_impact_at=0.4002))
