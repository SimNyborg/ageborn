"""Mammoth Matriarch: Stone Age Legendary siege heavy (DESIGN A5.2), quadruped rig (A11). ~196 lu.

Look (A11): a towering woolly mammoth with a high domed head and shoulder hump, a shaggy
fringe of long dark hair along the belly and legs, pillar legs with pale toenails, a long
trunk and two huge sweeping ivory tusks. She wears a big team caparison over her back
with a bone-bead hem and carries a wooden howdah with a team rim; two small cave-kid riders
(team tunics) sit in it, the front one hefting a rock (the riders' rocks leave from the
exported per-frame `muzzle` anchor, A14.2), and a tall team banner flies from the back of
the howdah (A11: heavies and ground Legendaries carry a pennant). The tail and banner
follow through. The attack is a tusk gore (owner direction 2026-09-30).

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, heavy timing):
  idle    the ears flap, the trunk sways, the riders fidget, a blink
  walk    walk v3 four-beat walk at ground speed (ANIM_SPEC G4): 12 frames, three feet down,
          the trunk swinging and the riders swaying a beat late
  attack  TUSK GORE: she paws once and stomps (anticipation), drops her head low with the
          tusks near the ground and the trunk tucked (held, angry brow), lunges and hooks the
          tusks up and forward into the target (ivory smear, impact lines, the trunk flung up,
          bellowing), overshoots and settles. The riders hold on and cheer (ANIM_SPEC 2.2:
          the second attacker never acts in A, B or C)
  attack_b  trunk curl and a front-foot stomp with a dust crescent
  attack_c  sideways tusk sweep
  attack_alt  the riders' own sim attack (12 every 1.4 s): the front kid winds up and throws
          his rock while the body stands (extras sheet; the rock leaves `muzzle` on its impact)
  hit     beast: the head shakes, the riders grab on
  die     D4 heavy: the riders leap clear, the howdah tips away, she topples onto her side
          with the legs in the air, X eye and tongue out (no rug flatten)
Details: carved dark bands on the tusks, layered shaggy locks on the dome and shoulders,
bone totems on the howdah posts, toenails.
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import Quad, walk4

SLUG = "mammoth_matriarch"
GAIT_NAME = "quad"
NAME = "Mammoth Matriarch"
HEIGHT_LU = 196
YAW_DEG = -10.0
CANVAS = (476, 444)
FEET = (220, 390)
ANCHORS = {"head": (0, 190), "hitCenter": (0, 90)}
NO_RETIME = True
BAND = "#5A4636"

FUR = "#7E6858"
FUR_DK = "#5F4F43"
SHAG = "#4A3D34"
SKIN_DK = "#6A5A4E"
NAIL = "#D9CDB2"
IVORY = "#EFE7D0"
WOOD = "#8A7560"
WOOD_DK = "#6A5846"
BONE = "#EDE3C8"
KID = "#E3C3A5"
KID_HAIR = "#4A3A30"
ROCK = "#9A948A"
EYE = "#F4EEDC"
PUPIL = "#221C19"
MOUTH = "#5A2E2E"

TUSK_TIP = (88.0, -14.0, 104.0)
KID_S = 1.22


def _leg(rig, name, p0, p1, front):
    x0, y, z0 = p0
    x1, _, z1 = p1
    col = FUR if y < 0 else FUR_DK
    g = Geo().capsule(p0, p1, 14.0 if front else 15.0, 11.5)
    rig.part(f"leg_{name}", g, col)
    g = Geo().capsule(p1, (x1 + 0.5, y, 8.0), 11.5, 11.0)
    g.lathe([(12.6, 0), (12.2, 2.5), (11.2, 7.0), (0, 8.0)], (x1 + 0.8, y, 0.2), (x1 + 0.8, y, 8.2), segs=18)
    rig.part(f"leg_{name}2", g, SKIN_DK if y < 0 else FUR_DK)
    # shaggy cuff over the foot
    g = Geo()
    for a in (-60, -20, 20, 60, 100, 150, 200, 250):
        import math
        dx, dy = 11.5 * math.cos(math.radians(a)), 11.5 * math.sin(math.radians(a))
        g.lathe([(3.2, 0), (0, -9.5)], (x1 + dx, y + dy, 22.0), segs=8)
    rig.part(f"leg_{name}2", g, SHAG, finish="hair", outline=0.8)
    if y < 0:
        g = Geo()
        for dx in (-5.0, 0.0, 5.0):
            g.blob((x1 + 6.5 + dx * 0.5, y - 10.8 + abs(dx) * 0.35, 3.0), (2.6, 1.4, 2.4), p=2.2)
        rig.part(f"leg_{name}2", g, NAIL, outline=0.6)


def _kid(rig, name, parent, x, z, throw=False):
    """A small cave-kid rider sitting in the howdah (waist up): team tunic, big head, arms."""
    rig.joint(name, parent, (x, 0, z))
    g = Geo().blob((x, 0, z + 9.0), (7.6, 7.0, 9.0), p=2.3, taper=(1.05, 0.9))
    rig.part(name, g, team=True)
    rig.joint(f"{name}_head", name, (x + 1, 0, z + 17.0))
    g = Geo().blob((x + 1.5, 0, z + 25.0), (8.0, 7.6, 8.0), p=2.25)
    g.blob((x + 9.2, -0.4, z + 24.0), (2.0, 1.8, 1.8), p=2.0)
    rig.part(f"{name}_head", g, KID)
    g = Geo().blob((x - 0.5, 0, z + 29.5), (8.2, 8.0, 5.2), p=2.2)
    g.blob((x - 5.8, 0, z + 25.0), (3.8, 7.2, 6.4), p=2.2)
    for (x0, z0), (x1, z1) in (((x - 1, z + 32), (x - 3, z + 38)), ((x + 3, z + 32), (x + 5, z + 37)),
                               ((x - 5, z + 31), (x - 10, z + 35))):
        g.capsule((x0, 0, z0), (x1, -1, z1), 2.6, 1.0)
    rig.part(f"{name}_head", g, KID_HAIR, finish="hair")
    for y in (-3.2, 2.8):
        g = Geo().blob((x + 7.6, y, z + 26.0), (2.2, 2.2, 2.8))
        rig.part(f"{name}_head", g, EYE, highlight=False)
        g = Geo().blob((x + 9.3, y - 0.3, z + 25.8), (0.9, 1.3, 1.5))
        rig.part(f"{name}_head", g, PUPIL, outline=0)
    g = Geo().blob((x + 8.8, -0.4, z + 21.2), (1.0, 2.6, 1.2), p=2.2)
    rig.part(f"{name}_head", g, MOUTH, outline=0, highlight=False)
    # near arm (throws for the front kid), far arm grips the rim
    rig.joint(f"{name}_arm", name, (x + 0.5, -7.5, z + 14.5))
    g = Geo().capsule((x + 0.5, -7.5, z + 14.5), (x + 6.0, -8.0, z + 7.5), 2.8, 2.4)
    g.blob((x + 7.0, -8.0, z + 6.3), (3.0, 2.8, 2.8), p=2.2)
    rig.part(f"{name}_arm", g, KID)
    if throw:
        rig.joint("rock", f"{name}_arm", (x + 7.5, -9.5, z + 7.5))
        g = Geo().blob((x + 8.0, -10.5, z + 9.0), (3.6, 3.2, 3.2), p=2.1)
        rig.part("rock", g, ROCK)
        rig.track("muzzle", f"{name}_arm", (x + 8.0, -10.5, z + 9.0))
        rig.track("riderMuzzle", f"{name}_arm", (x + 8.0, -10.5, z + 9.0))


def build(rig):
    global RIG, LEGS
    RIG = rig
    q = Quad(rig, trunk=(0, 76), front_x=28.0, back_x=-28.0, leg_y=13.0, shoulder_z=76.0,
             hip_z=72.0, knee_z=36.0, hock_z=36.0, knee_dx=1.0, hock_dx=-1.0, far_dx=-5.0)
    LEGS = {}
    for name in ("fl", "bl", "fr", "br"):
        p0, p1, _ = q.legs[name]
        _leg(rig, name, p0, p1, name[0] == "f")
        LEGS[name] = G.Leg(f"leg_{name}", f"leg_{name}2", (p1[0] + 0.8, p1[1], 0.6),
                           bend=1.0 if name[0] == "f" else -1.0)
        rig.track(f"_foot_{name}", f"leg_{name}2", (p1[0] + 0.8, p1[1], 0.4))

    # body: barrel, shoulder hump, sloping haunch
    g = Geo().blob((0, 0, 84), (40, 25, 29), p=2.3)
    g.blob((18, 0, 104), (24, 22, 20), p=2.2)
    g.blob((-26, 0, 84), (18, 23, 24), p=2.2)
    rig.part("trunk", g, FUR)
    # shaggy fringe along the belly
    g = Geo()
    import math
    for i in range(11):
        x = -40 + 8 * i
        for y in (-22.0, -8.0, 8.0, 22.0):
            zb = 60 + 3 * math.cos(i)
            g.lathe([(4.2, 0), (0, -12.0 - 3 * ((i + int(y)) % 3))], (x, y * 0.95, zb + 4), segs=8)
    rig.part("trunk", g, SHAG, finish="hair")
    # team caparison over the back, a bone-bead hem
    g = Geo().blob((-3, 0, 96), (38, 26.6, 24), p=3.0, taper=(1.02, 0.95))
    g.clip((0, 0, 72.0), (0, 0, -1))
    g.clip((30.0, 0, 0), (1, 0, 0))
    g.clip((-38.0, 0, 0), (-1, 0, 0))
    for x in range(-34, 30, 8):
        g.lathe([(3.4, 0), (0, -6.0)], (x, -26.0, 72.2), segs=8)
    rig.part("trunk", g, team=True)
    g = Geo()
    for x in range(-34, 30, 8):
        g.sphere((x + 4, -26.6, 71.4), 1.8, cuts=2)
    rig.part("trunk", g, BONE, outline=0.6)
    # layered shaggy locks over the shoulder hump
    g = Geo()
    for i in range(7):
        x = 30 - 7 * i
        g.lathe([(5.0, 0), (0, -14.0 - 2 * (i % 2))], (x, -21.0, 110 - 2.5 * i), (x - 3, -23.0, 96 - 2.5 * i), segs=8)
    rig.part("trunk", g, SHAG, finish="hair", outline=0.8)
    # howdah: wooden platform with a team rim and corner posts (its own joint: it tips off)
    rig.joint("howdah", "trunk", (-8, 0, 122))
    g = Geo().blob((-8, 0, 122), (26, 21, 5), p=3.4)
    rig.part("howdah", g, WOOD)
    g = Geo().lathe([(22.0, 0), (24.0, 0.4), (24.0, 7.0), (22.0, 7.4)], (-8, 0, 125.5), (-8, 0, 133.0),
                    segs=28, squash=(1.2, 0.95))
    rig.part("howdah", g, team=True)
    g = Geo()
    for x, y in ((18.0, -19.0), (-34.0, -19.0), (18.0, 19.0), (-34.0, 19.0)):
        g.capsule((x, y, 121), (x, y, 138), 2.0, 1.8).sphere((x, y, 139), 2.6, cuts=2)
    rig.part("howdah", g, WOOD_DK)
    g = Geo()   # bone totems on the near posts
    for x in (18.0, -34.0):
        g.blob((x, -19.0, 145.0), (3.6, 3.0, 4.2), p=2.2)
        g.capsule((x - 3.0, -19.5, 146.5), (x - 5.5, -19.5, 151.0), 1.2, 0.7)
        g.capsule((x + 3.0, -19.5, 146.5), (x + 5.5, -19.5, 151.0), 1.2, 0.7)
    rig.part("howdah", g, BONE, outline=0.7)
    # riders (sitting in the howdah)
    _kid(rig, "kid_b", "howdah", -22.0, 122.0)
    _kid(rig, "kid_f", "howdah", 4.0, 124.0, throw=True)
    # the riders read at phone size (owner: the rider visibly throws): 1.22x about their seat
    rig.rest_scale["kid_b"] = KID_S
    rig.rest_scale["kid_f"] = KID_S
    # banner at the back of the howdah, streaming back
    g = Geo().capsule((-36, 8, 120), (-40, 8, 196), 2.2, 1.8).sphere((-40.2, 8, 197.5), 3.2, cuts=3)
    rig.part("howdah", g, WOOD)
    rig.secondary("banner", "howdah", (-39.6, 8, 192), (-70, 8, 180), max_deg=12, gain=1.2)
    pts = [(-39.6, 193.0), (-73.0, 188.0), (-61.0, 178.0), (-72.0, 166.0), (-39.4, 165.0)]
    g = Geo().slab(pts, 8.0, 2.0)
    rig.part("banner", g, team=True, outline=1.0)

    # neck, domed head, small ears, eye
    rig.joint("neck", "trunk", (34, 0, 98))
    rig.joint("head", "neck", (44, 0, 104))
    g = Geo().blob((38, 0, 100), (16, 21, 22), p=2.2)
    rig.part("neck", g, FUR)
    g = Geo().blob((50, 0, 112), (17, 17, 21), p=2.25, taper=(1.05, 0.9))
    g.blob((60, 0, 98), (10, 12, 12), p=2.2)
    HEAD = Geo().blob((50, 0, 112), (17, 17, 21), p=2.25, taper=(1.05, 0.9))
    HEAD.blob((60, 0, 98), (10, 12, 12), p=2.2)
    rig.part("head", g, FUR)
    g = Geo()
    for i in range(6):                                    # hair tuft on the dome
        a = math.radians(40 + 18 * i)
        base = (48 + 10 * math.cos(a) - 4, 0, 118 + 12 * math.sin(a))
        g.capsule(base, (base[0] - 6, (i - 2.5) * 1.5, base[2] + 9), 3.0, 1.0)
    rig.part("head", g, SHAG, finish="hair")
    rig.joint("ear", "head", (42, -12, 112))
    g = Geo().blob((40, -14, 106), (7.5, 3.4, 11.5), p=2.2, rot=(10, 10, 0))  # ear
    rig.part("ear", g, FUR_DK, finish="hair")
    rig.joint("brow", "head", (59, -13, 115))
    g = Geo().capsule((56.0, -14.8, 117.0), (64.0, -10.4, 113.5), 2.6, 2.0)
    rig.part("brow", g, SHAG, finish="hair", outline=0.8)
    eye = Geo().blob((58.4, -13.2, 110.4), (4.0, 2.2, 4.0))
    pup = Geo().blob((60.8, -14.2, 110.2), (1.7, 1.1, 2.5))
    face = F.Face(rig, "head", [HEAD, eye, pup])
    rig.part("head", eye, EYE, highlight=False)
    rig.joint("pupils", "head", (60.8, -14.2, 110.2))
    rig.part("pupils", pup, PUPIL, outline=0)
    face.eye_marks([(60.5, 110.4)], 3.8, FUR)
    # mouth (opens when trumpeting)
    rig.joint("mouth", "head", (58, 0, 88), hidden=True)
    g = Geo().blob((58.5, -3.0, 88.0), (5.0, 7.0, 3.6), p=2.2)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    # tusks: huge, sweeping forward, down, then up
    g = Geo()
    for y in (-1, 1):
        a = (58.0, 10.0 * y, 92.0)
        b = (70.0, 13.5 * y, 78.0)
        c = (84.0, 14.5 * y, 84.0)
        d = (TUSK_TIP[0], 13.0 * y, TUSK_TIP[2])
        g.capsule(a, b, 5.0, 4.4).capsule(b, c, 4.4, 3.4).capsule(c, d, 3.4, 0.8)
    rig.part("head", g, IVORY, finish="gloss")
    g = Geo()   # carved dark bands
    for y in (-1, 1):
        a = (58.0, 10.0 * y, 92.0)
        b = (70.0, 13.5 * y, 78.0)
        c = (84.0, 14.5 * y, 84.0)
        for p0, p1, t, r in ((a, b, 0.55, 5.0), (b, c, 0.1, 4.5), (b, c, 0.55, 4.0)):
            q0 = tuple(u + (v - u) * t for u, v in zip(p0, p1))
            q1 = tuple(u + (v - u) * (t + 0.12) for u, v in zip(p0, p1))
            g.capsule(q0, q1, r)
    rig.part("head", g, BAND, outline=0.6)
    rig.track("tuskTip", "head", TUSK_TIP)
    # trunk: three segments, curling forward at the tip
    rig.joint("trunk1", "head", (64, 0, 96))
    rig.joint("trunk2", "trunk1", (68, 0, 72))
    rig.joint("trunk3", "trunk2", (68, 0, 50))
    g = Geo().capsule((64, 0, 96), (68, 0, 72), 8.5, 7.0)
    rig.part("trunk1", g, FUR)
    g = Geo().capsule((68, 0, 72), (68, 0, 50), 7.0, 5.4)
    rig.part("trunk2", g, FUR)
    g = Geo().capsule((68, 0, 50), (71, 0, 38), 5.4, 4.4).capsule((71, 0, 38), (78, 0, 34), 4.4, 3.8)
    rig.part("trunk3", g, FUR)
    g = Geo()
    for z in (90, 82, 74, 66, 58):   # wrinkle rings
        x = 64 + (4 if z < 72 else 4 * (96 - z) / 24)
        g.lathe([(0, 0), (8.2 - (90 - z) * 0.06, 0.2), (8.2 - (90 - z) * 0.06, 1.0), (0, 1.2)],
                (x, 0, z), (x + 0.2, 0, z + 1), segs=16)
    rig.part("trunk1", g, FUR_DK, outline=0)

    # tail with a hair tuft
    rig.secondary("tail", "trunk", (-42, 0, 96), (-50, 0, 72), max_deg=14, gain=1.1)
    g = Geo().capsule((-42, 0, 96), (-48, 0, 78), 3.0, 2.2)
    g.lathe([(3.6, 0), (4.2, -4), (0, -12)], (-48.5, 0, 80), segs=10)
    rig.part("tail", g, SHAG, finish="hair")



# -- poses ---------------------------------------------------------------------------------
def _riders(lag, throw=None):
    """Rider bob one beat behind the body; `throw` = 0..1 winds the front kid's throw."""
    p = {"kid_b": {"z": 1.4 * lag}, "kid_f": {"z": 1.4 * lag},
         "kid_b_head": {"r": -3 * lag}, "kid_f_head": {"r": -3 * lag}}
    if throw is not None:
        p["kid_f_arm"] = {"r": throw}
    return p


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    lag = math.cos(2 * math.pi * (f - 1) / n)
    pose = merge({
        "trunk": {"z": -1.6 * c},
        "body": squash(-0.02 * c),
        "neck": {"r": 2.0 * lag}, "head": {"r": -2.0 * lag},
        "trunk1": {"r": -4 * lag}, "trunk2": {"r": -6 * lag}, "trunk3": {"r": -10 * lag},
        "ear": {"rz": [0, 18, 30, 10, -6, 0][f]},
    }, _riders(-lag, throw=[0, 20, 50, 70, 40, 10][f]))
    if f == 3:
        pose = merge(pose, F.expr("blink", mouth=None))
    return pose


# -- walk v3: G4 four-beat walk (always three feet down), card 40 x 1.25 = 50 lu/s ---------------
# 12 x 120 ms = 1440 ms; each foot is planted 75% of the cycle (hind left, fore left, hind right,
# fore right, a quarter cycle apart); the trunk swings and the riders sway a beat late
RIG = None
LEGS = None
SPEED = 50.0
GAIT = None


def _gait():
    global GAIT
    if GAIT is None:
        GAIT = G.Gait(12, 1440, SPEED, G.quad_feet(LEGS, G.WALK4, x_off={"fr": -1.0, "fl": -1.0,
                                                                          "br": -2.0, "bl": -2.0}),
                      0.75, lift=10.0, kick=3.0, reach=3.0, toe_off=0.0, heel_strike=0.0, lift_peak=0.5)
    return GAIT


def _walk(f, report=None):
    g = _gait()

    def extra(ctx):
        p = ctx["p"]
        lag = math.cos(2 * p - 1.0)
        return merge({
            "neck": {"r": -3.0 * math.cos(2 * p - 0.6)}, "head": {"r": 2.5 * math.cos(2 * p - 1.2)},
            "trunk1": {"r": 7 * math.sin(p)}, "trunk2": {"r": 10 * math.sin(p - 0.6)},
            "trunk3": {"r": 15 * math.sin(p - 1.2)},
            "ear": {"rz": 12 * math.sin(2 * p - 1.0)},
            "kid_b": {"r": 4 * math.sin(p - 0.8)}, "kid_f": {"r": 4 * math.sin(p - 0.8)},
        }, _riders(1.6 * lag))
    return G.quad_walk(RIG, f, g, {}, base_z=-8.6, bob=4.8, beats=2, low_at=0.125, pitch=0.8,
                       roll=1.6, extra=extra, report=report)


# attack: 10 unique poses in the 12 heavy steps. A GORE (owner direction 2026-09-30): a
# small foot stomp as the anticipation, the head drops low with the tusks near the ground
# (held), then a lunge that hooks the tusks up and forward into the target with a heavy
# follow-through; the front rider throws his rock on the impact beat.
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#        shift  paw  stomp HOLD  lunge hook IMPACT over follow settle
MX = [-2.0, -4.0, -7.0, -9.0, 2.0, 7.0, 10.0, 9.0, 5.0, 0.0]
MZ = [-0.5, 1.0, -2.0, -3.0, 0.0, 2.0, 3.0, 2.0, 0.6, 0.0]
MR = [0, 3, -3, -5, 0, 4, 6, 6, 2, 0]
MQ = [-0.02, 0.02, -0.05, -0.07, 0.03, 0.05, 0.07, 0.02, -0.01, 0.0]
MN = [-3, -6, -16, -22, -10, 4, 12, 15, 6, 0]
MH = [-2, -6, -18, -24, -8, 8, 16, 20, 6, 0]
T1 = [-4, -8, -14, -14, 0, 20, 34, 30, 10, 0]
T2 = [-4, -10, -18, -20, 0, 20, 30, 26, 8, 0]
T3 = [-4, -12, -24, -26, 4, 24, 36, 30, 10, 0]
LFR = [(-2, 0), (24, -38), (-6, 0), (-8, 2), (-4, 0), (-8, 0), (-10, 0), (-6, 0), (-2, 0), (0, 0)]
LFL = [(-2, 0), (0, 0), (-4, 0), (-6, 2), (6, -10), (-2, -4), (-8, 0), (-4, 0), (0, 0), (0, 0)]
LBR = [(3, 0), (4, 0), (8, -6), (10, -8), (-8, 0), (-14, 0), (-16, 0), (-12, 0), (-4, 0), (0, 0)]
LBL = [(3, 0), (4, 0), (6, -4), (8, -6), (-6, 0), (-12, 0), (-14, 0), (-10, 0), (-4, 0), (0, 0)]
RIDE = [0, -0.5, 1.5, 2.0, -1.0, 1.0, 3.5, 2.0, 0.5, 0]
# front kid: arm angle (0 = rest, forward-down) and lean (+ back); the rock is up and back on
# the hold, leaves on the impact and is back in his hand for the settle
THROW = [20, 10, 0, -10, -10, 30, 150, 160, 90, 20]
KLEAN = [0, 2, 6, 8, 4, -4, -8, -6, -2, 0]
KRISE = [0, 0, 0.5, 1.0, 0.5, 1.5, 3.0, 2.0, 1.0, 0]
# back kid: grips the rim, ducks on the lunge and cheers (fist up) on the impact
KB_ARM = [0, 10, 0, -10, 0, 60, 150, 160, 80, 0]
KB_LEAN = [0, 2, 6, 8, 0, -8, -10, -6, -2, 0]


def _attack_pose(f):
    pose = merge(M.body_about((0, 0, 90), x=MX[f], z=MZ[f], q=MQ[f]), {
        "trunk": {"r": MR[f]},
        "neck": {"r": MN[f]}, "head": {"r": MH[f]},
        "trunk1": {"r": T1[f]}, "trunk2": {"r": T2[f]}, "trunk3": {"r": T3[f]},
        "mouth": {"show": f in (5, 6, 7)},
        "ear": {"rz": [0, 6, -16, -24, -10, 12, 34, 30, 8, 0][f]},
        "leg_fr": {"r": LFR[f][0]}, "leg_fr2": {"r": LFR[f][1]},
        "leg_fl": {"r": LFL[f][0]}, "leg_fl2": {"r": LFL[f][1]},
        "leg_br": {"r": LBR[f][0]}, "leg_br2": {"r": LBR[f][1]},
        "leg_bl": {"r": LBL[f][0]}, "leg_bl2": {"r": LBL[f][1]},
    }, _riders(RIDE[f], THROW[f]), {
        "kid_f": {"r": KLEAN[f], "z": KRISE[f]}, "kid_b": {"r": KB_LEAN[f]}, "kid_b_arm": {"r": KB_ARM[f]},
    })
    if f in (2, 3, 4):
        pose = merge(pose, {"brow": {"z": -1.8}})
    elif f in (5, 6, 7):
        pose = merge(pose, {"brow": {"z": -1.2}})
    return pose


TUSK_MID = (70.0, -13.5, 78.0)
KID_F = (4.0, 124.0)


def _attack_clip():
    x, z = KID_F
    hand_in = (x + 3.5, -8.0, z + 10.0)
    hand_out = (x + 8.0, -10.5, z + 9.0)
    gore = {"kind": "arc", "joint": "head", "inner": TUSK_MID, "outer": TUSK_TIP, "color": IVORY,
            "taper": 0.15, "white": 0.2, "lines": 3, "line_gap_lu": 3.2, "outline_lu": 1.6}
    ov = {
        2: [{"kind": "dust", "ground": (30.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 31, "spread": 1.0}],
        4: [dict(gore, t0=0.0, t1=0.9)],
        5: [dict(gore, t0=0.0, t1=0.9)],
        6: [{"kind": "burst", "joint": "head", "point": TUSK_TIP, "r0_lu": 12.0, "r1_lu": 24.0,
             "n": 6, "a0": -30.0, "arc": 170.0},
            {"kind": "dust", "ground": (-30.0, 0.0), "size_lu": 12.0, "puffs": 5, "seed": 32, "spread": 1.4,
             "dir": -1.0}],
        7: [{"kind": "dust", "ground": (-34.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 33, "spread": 1.6,
             "dir": -1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov, extra={"noMuzzle": True})


def _variant(f, x, z, q, r, n, h, t, legs, ride=0.0, cheer=0.0, mouth=False, neck_rz=0.0, head_rz=0.0,
             brow=0.0):
    """A pose of the B and C variants; the riders hang on (cheer 0..1 raises the front kid's
    fist with the rock in it; they never throw in A, B or C)."""
    lfr, lfl, lbr, lbl = legs
    pose = merge(M.body_about((0, 0, 90), x=x, z=z, q=q), {
        "trunk": {"r": r},
        "neck": {"r": n, "rz": neck_rz}, "head": {"r": h, "rz": head_rz},
        "trunk1": {"r": t[0]}, "trunk2": {"r": t[1]}, "trunk3": {"r": t[2]},
        "mouth": {"show": mouth},
        "leg_fr": {"r": lfr[0]}, "leg_fr2": {"r": lfr[1]},
        "leg_fl": {"r": lfl[0]}, "leg_fl2": {"r": lfl[1]},
        "leg_br": {"r": lbr[0]}, "leg_br2": {"r": lbr[1]},
        "leg_bl": {"r": lbl[0]}, "leg_bl2": {"r": lbl[1]},
    }, _riders(ride, 20 + 140 * cheer), {
        "kid_f": {"r": -6 * cheer, "z": 2.0 * cheer}, "kid_b_arm": {"r": 150 * cheer},
        "kid_b": {"r": 6 * min(0.0, ride) / 2.0},
    })
    if brow:
        pose = merge(pose, {"brow": {"z": brow}})
    return pose


# -- attack B: trunk curl and a front-foot stomp with a dust crescent -----------------------------
# unique: 0 = A shift, 1 curl (trunk up, near fore foot lifts), 2 HOLD (rears a little, the foot
# high, the trunk curled over the head, trumpeting), 3 smear (the foot slams down), 4 IMPACT
# (stomp: squash, dust crescent, impact lines), 5 = A follow, 6 = A settle
B_SEQ = [0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6, 6]


def _b_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 5:
        return _attack_pose(i + 3)
    brace = (-4, 0)
    if i == 1:
        return _variant(1, -3.0, 1.0, 0.02, 3, 8, 8, (30, 40, 50),
                        ((28, -48), (-2, 0), (6, -4), (5, -3)), ride=1.0, brow=-1.0)
    if i == 2:
        return _variant(2, -5.0, 2.5, 0.05, 7, 14, 14, (62, 72, 84),
                        ((46, -84), (-6, 2), (8, -6), (7, -5)), ride=2.0, mouth=True, brow=-1.8)
    if i == 3:
        return _variant(3, 2.0, 0.0, 0.03, -2, 0, -4, (10, 0, -10),
                        ((12, -22), (-2, 0), (-6, 0), (-5, 0)), ride=-1.0, mouth=True, brow=-1.4)
    return _variant(4, 5.0, -3.0, -0.08, -5, -8, -10, (-10, -14, -20),
                    ((-6, 0), brace, (-12, 0), (-10, 0)), ride=3.0, cheer=1.0, mouth=True, brow=-1.2)


def _attack_b():
    ov = {
        2: [{"kind": "rings", "joint": "head", "point": (66.0, 0.0, 88.0), "radii_lu": (10.0, 17.0),
             "a0": -40.0, "a1": 40.0}],
        3: [{"kind": "streak", "joint": "leg_fr2", "point": (29.0, -13.0, 2.0), "color": FUR,
             "width_lu": 12.0, "white": 0.4, "from": 2}],
        4: [{"kind": "dust", "ground": (34.0, 0.0), "size_lu": 15.0, "puffs": 6, "seed": 41, "spread": 1.8},
            {"kind": "dust", "ground": (6.0, 0.0), "size_lu": 10.0, "puffs": 4, "seed": 42, "spread": 1.4,
             "dir": -1.0},
            {"kind": "burst", "joint": "leg_fr2", "point": (29.0, -13.0, 4.0), "r0_lu": 14.0, "r1_lu": 26.0,
             "n": 6, "a0": 20.0, "arc": 140.0}],
    }
    reuse = {0: ("attack", 0), 5: ("attack", 8), 6: ("attack", 9)}
    return M.clip("attack_b", [_b_pose(i) for i in range(7)], M.HEAVY_MELEE_MS, impact=4,
                  sequence=B_SEQ, overlays=ov, reuse=reuse, extra={"noMuzzle": True})


# -- attack C: sideways tusk sweep (the head cocks away, then sweeps the tusks across) -----------
C_SEQ = [0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6, 6]


def _c_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 5:
        return _attack_pose(i + 3)
    if i == 1:
        return _variant(1, -3.0, -0.5, -0.02, -2, -6, -6, (-6, -8, -10),
                        ((-4, 0), (-2, 0), (5, -3), (4, -2)), ride=0.5, neck_rz=18, head_rz=10, brow=-1.0)
    if i == 2:
        return _variant(2, -6.0, -2.0, -0.05, -4, -14, -12, (-10, -12, -16),
                        ((-6, 2), (-4, 2), (8, -6), (7, -5)), ride=1.5, neck_rz=30, head_rz=16, brow=-1.8)
    if i == 3:
        return _variant(3, 3.0, 1.0, 0.03, 2, 0, 4, (10, 12, 16),
                        ((-8, 0), (-4, 0), (-8, 0), (-6, 0)), ride=-1.0, neck_rz=0, head_rz=0, brow=-1.4,
                        mouth=True)
    return _variant(4, 8.0, 2.0, -0.06, 5, 10, 12, (30, 26, 34),
                    ((-10, 0), (-6, 0), (-14, 0), (-12, 0)), ride=3.0, cheer=1.0, mouth=True,
                    neck_rz=-30, head_rz=-16, brow=-1.2)


def _attack_c():
    sweep = {"kind": "arc", "joint": "head", "inner": TUSK_MID, "outer": TUSK_TIP, "color": IVORY,
             "taper": 0.15, "white": 0.2, "lines": 3, "line_gap_lu": 3.2, "outline_lu": 1.6, "samples": 18}
    ov = {
        3: [dict(sweep, t0=0.0, t1=0.9, **{"from": 2})],
        4: [dict(sweep, t0=0.35, t1=0.95, lines=2, **{"from": 3}),
            {"kind": "burst", "joint": "head", "point": TUSK_TIP, "r0_lu": 12.0, "r1_lu": 24.0,
             "n": 6, "a0": -30.0, "arc": 170.0},
            {"kind": "dust", "ground": (36.0, 0.0), "size_lu": 11.0, "puffs": 5, "seed": 43, "spread": 1.4}],
    }
    reuse = {0: ("attack", 0), 5: ("attack", 8), 6: ("attack", 9)}
    return M.clip("attack_c", [_c_pose(i) for i in range(7)], M.HEAVY_MELEE_MS, impact=4,
                  sequence=C_SEQ, overlays=ov, reuse=reuse, extra={"noMuzzle": True})


# -- attack_alt: the riders' own attack (ANIM_SPEC R3), played while the mammoth stands ---------
# the body holds idle pose 0; the front kid winds up, holds the rock behind his head and throws
# it (the rock leaves `muzzle` on the impact frame and is back in his hand on the last frame)
ALT_MS = [100, 160, 260, 160, 180, 240]       # 1100 ms, impact at 520 ms (warped to the rider wind-up)
ALT_SEQ = [0, 1, 2, 3, 4, 0]
ALT_THROW = [None, 120, 200, 10, -30]
ALT_LEAN = [0, 14, 26, -24, -28]
ALT_RISE = [0, 1.0, 2.0, 4.0, 2.5]


def _alt_pose(i):
    pose = _idle(0)
    if i == 0:
        return pose
    pose["kid_f_arm"] = {"r": ALT_THROW[i]}
    pose["kid_f"] = {"r": ALT_LEAN[i], "z": ALT_RISE[i]}
    pose["kid_b_arm"] = {"r": [0, 10, 20, 90, 140][i]}
    pose["rock"] = {"hide": i in (3, 4)}
    return pose


def _attack_alt():
    x, z = KID_F
    hand_in = (x + 3.5, -8.0, z + 10.0)
    hand_out = (x + 8.0, -10.5, z + 9.0)
    throw = {"kind": "arc", "joint": "kid_f_arm", "inner": hand_in, "outer": hand_out, "color": "#FFF4D6",
             "taper": 0.2, "white": 0.0, "lines": 2, "line_gap_lu": 1.6, "outline_lu": 1.0}
    ov = {3: [dict(throw, **{"from": 2})]}
    return M.clip("attack_alt", [_alt_pose(i) for i in range(5)], ALT_MS, impact=3, sequence=ALT_SEQ,
                  overlays=ov, reuse={0: ("idle", 0)})


def _hit(k):
    def recoil(a, shake):
        return merge({"body": dict(squash(-0.05 * max(a, 0)), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
                      "trunk": {"r": 3 * a},
                      "neck": {"r": 6 * a}, "head": {"r": 5 * a + 5 * shake, "rx": 8 * shake},
                      "trunk1": {"r": 14 * a}, "trunk2": {"r": 10 * a},
                      "ear": {"rz": -20 * max(a, 0)}}, _riders(-2.5 * a))
    return M.hit_beast(k, {}, recoil, face_hurt=F.expr("squeeze", mouth=None))


def _die(k):
    kick = [0.0, 0.2, 0.5, 0.9, 0.6, 1.0, 0.4, 0.2, 0.1, 0.0][k]
    off = min(1.0, k / 2.0)
    pose = merge(M.die_d4(k, center_z=90.0, back_z=44.0, height=HEIGHT_LU, heavy=True, roll=-0.62), {
        "neck": {"r": [10, 14, 10, 6, 2, 0, 0, 0, 0, 0][k]},
        "head": {"r": [6, -4, -8, -10, -10, -8, -8, -8, -8, -8][k]},
        "trunk1": {"r": 40 * kick + 10}, "trunk2": {"r": 30 * kick}, "trunk3": {"r": 30 * kick},
        "mouth": {"show": k <= 1},
        "leg_fr": {"r": 24 * kick - 8}, "leg_fr2": {"r": -20 * kick},
        "leg_fl": {"r": -16 * kick + 8}, "leg_fl2": {"r": -16 * kick},
        "leg_br": {"r": -20 * kick}, "leg_br2": {"r": 16 * kick},
        "leg_bl": {"r": 16 * kick}, "leg_bl2": {"r": 14 * kick},
        # the riders jump off (they become two summoned Pebblers, A5.2); the howdah tips away
        "kid_f": {"z": 34 * off, "x": 30 * off, "r": -40 * off, "hide": k >= 4},
        "kid_b": {"z": 30 * off, "x": -26 * off, "r": 40 * off, "hide": k >= 4},
        "kid_f_arm": {"r": 120 * off}, "kid_b_arm": {"r": 150 * off},
        "howdah": {"r": 30 * off, "x": -20 * off, "hide": k >= 4},
    })
    if k >= 4:
        pose = merge(pose, F.expr("x", mouth=None))
    return pose


# the heavy side topple passes edge-on at D4 step 3 (a flat pill at game size): skip it
DIE_KEEP = [0, 1, 2, 4, 5, 7, 8, 9]


def clips():
    keep = DIE_KEEP
    cl = [
        # 4 unique idle poses played 0-1-2-3-2-1 in the same 900 ms (pays for the 12-frame walk)
        M.clip("idle", [_idle(f) for f in range(4)], [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True,
               sequence=[0, 1, 2, 3, 2, 1]),
        M.walk_clip("walk", RIG, _walk, _gait(), "quad"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        _attack_alt(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(keep[i]) for i in range(len(keep))], M.DIE_MS_HEAVY,
               sequence=M.DIE_SEQ_HEAVY, extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
