"""Destrier Knight: Medieval Age heavy (DESIGN A5.3), rider rig (A11). Lance charge, ~118 lu.

Look (A11): a white destrier with a shaped anatomy (knees on the forelegs, a hock bend on the
hind legs, feathered fetlocks, dark hooves), a bridle and a slate chanfron, a forelock and a
dark mane, in a team caparison with a parchment hem and a parchment bear paw on the flank. The knight (1.2x the horse's scale, so he reads) wears slate plate with a team
tabard, a great helm with a glowing eye slit and a big team plume, a team heater shield with a
parchment bear paw, and a wine lance with a steel vamplate and a team swallowtail pennant.
Gold is an accent only. Tail, plume, pennant and forelock follow through.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, `kit_medieval.py`):
  idle    the horse tosses its head and swishes its tail, the knight sits tall, blink
  walk    walk v3 trot at ground speed (ANIM_SPEC G5): diagonal pairs with planted hooves, knees
          and hocks folding, a 4 lu mount bob, the knight posting a frame late, the lance tip,
          plume, pennant and tail trailing
  attack_b  REAR AND THRUST DOWN: the horse rears with its forelegs folded while the knight raises
          the lance high (the held extreme), then the forehand drops and the lance drives down
  attack_c  LANCE SWEEP: the knight twists and swings the lance right back over the rump (the held
          extreme: the lance points backward), then flicks it round level across the front
  attack  COUCHED LANCE CHARGE: the horse gathers onto its haunches while the lance comes
          down from upright to couched under the arm (the held extreme: coiled, lance level),
          then bursts forward with the forelegs thrown out (a streak smear and speed lines),
          the lance level at the target on the impact (it flexes, impact lines, dust at the
          hooves), the horse skids and the lance comes back up
  hit     the horse shakes its head, eyes squeezed, the knight rocks behind the shield
  die     D5 unhorsed: the horse rears, the knight is thrown off the back spinning and lands
          flat behind it, the horse buckles at the knees and flops down, X eye and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "destrier_knight"
GAIT_NAME = "rider"
NAME = "Destrier Knight"
HEIGHT_LU = 118
YAW_DEG = -10.0
CANVAS = (430, 300)
FEET = (190, 278)
ANCHORS = {"head": (0, 112), "hitCenter": (0, 50)}
NO_RETIME = True

COAT = "#E3DACB"
COAT_DK = "#C9BEAD"
MANE = "#4B4F58"
TAIL = "#6E6660"
HOOF = "#474C55"
SLATE = "#6B7682"
STEEL = "#8D97A3"
DARK = "#23262E"
WINE = "#8E2A4A"
PARCH = "#E8DFC8"
GOLD = "#D4A437"
EYE = "#FAF6EE"
LEATHER = "#5E4E42"
NOSE = "#BFA99A"

# lance: joint in the far hand; shaft along +Z (rest), tip at LANCE_TIP lu
LX, LY, LZ = 10.5, 14.0, 65.0
LANCE_TIP = 70.0


def _leg(rig, name, parent, x, y, z_top, front):
    """A shaped leg: forearm (front) or gaskin (hind) to the knee or hock, a cannon, a
    feathered fetlock, a slanted pastern and a hoof with a toe line."""
    rig.joint(f"{name}", parent, (x, y, z_top))
    x2 = x + (1.5 if front else -4.5)
    rig.joint(f"{name}2", name, (x2, y, 18.0))
    if front:
        g = Geo().capsule((x, y, z_top), (x2, y, 18.0), 6.0, 3.8)
        g.blob((x2 + 0.6, y, 18.5), (3.9, 3.8, 3.4), p=2.2)          # knee
    else:
        g = Geo().capsule((x, y, z_top), (x2, y, 18.0), 7.0, 3.6)
        g.blob((x2 - 1.2, y, 18.8), (3.8, 3.6, 3.6), p=2.2)          # hock point
    rig.part(name, g, COAT)
    fx = x2 + (1.0 if front else 3.0)
    g = Geo().capsule((x2, y, 18.0), (fx, y, 7.0), 3.3, 3.0)
    rig.part(f"{name}2", g, COAT)
    g = Geo().blob((fx - 0.6, y, 7.2), (4.2, 4.3, 3.0), p=2.2)       # fetlock feathering
    for dx in (-3.0, -0.8):
        g.lathe([(1.6, 0), (0, -3.0)], (fx + dx, y, 5.0), (fx + dx - 1.2, y, 2.4), segs=8)
    rig.part(f"{name}2", g, COAT_DK, finish="hair")
    g = Geo().blob((fx + 1.2, y, 2.7), (5.0, 4.5, 2.9), p=3.0, taper=(1.05, 0.82))
    rig.part(f"{name}2", g, HOOF)
    g = Geo().capsule((fx + 5.6, y - 3.5, 3.6), (fx + 5.8, y - 3.5, 0.8), 0.55)
    rig.part(f"{name}2", g, DARK, outline=0, highlight=False)


RIG = None
LEGS = {}


def build(rig):
    global RIG
    RIG = rig
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("horse", "body", (0, 0, 40))
    # legs: far side first so they sit behind
    _leg(rig, "leg_fl", "horse", 17, 6.5, 36, True)
    _leg(rig, "leg_bl", "horse", -17, 6.5, 38, False)
    _leg(rig, "leg_fr", "horse", 17, -6.5, 36, True)
    _leg(rig, "leg_br", "horse", -17, -6.5, 38, False)
    # walk v3: the IK end is the bottom of the hoof; trackers on every sole (planted hooves)
    for name, x, y in (("fl", 17, 6.5), ("bl", -17, 6.5), ("fr", 17, -6.5), ("br", -17, -6.5)):
        front = name[0] == "f"
        x2 = x + (1.5 if front else -4.5)
        fx = x2 + (1.0 if front else 3.0)
        end = (fx + 1.2, y, 0.3)
        LEGS[name] = G.Leg(f"leg_{name}", f"leg_{name}2", end, bend=1.0 if front else -1.0)
        rig.track(f"_foot_{name}", f"leg_{name}2", end)

    # barrel under a team caparison with a parchment hem and gold studs
    g = Geo().blob((0, 0, 41), (25, 11.5, 12), p=2.3)
    rig.part("horse", g, COAT)
    cap = Geo().blob((0.5, 0, 41.5), (28.5, 14.2, 12.4), p=3.0, taper=(1.06, 0.96))
    cface = F.Face(rig, "horse", [cap])
    rig.part("horse", cap, team=True)
    g = Geo().blob((0.5, 0, 30.4), (29.4, 14.9, 2.4), p=3.2)
    rig.part("horse", g, PARCH)
    # a big parchment bear paw on the flank
    g = K.paw(cface, Geo(), K.scr(cface, (-8.0, -14.4, 43.0)), s=1.7)
    rig.part("horse", g, PARCH, highlight=False, outline=0)
    g = Geo()
    for x in (-20, -7, 7, 20):
        g.sphere((x, -15.2, 30.6), 1.5, cuts=3)
    rig.part("horse", g, GOLD, finish="metal", outline=1.0)
    g = Geo().blob((-2, 0, 54), (11.5, 9.5, 3.6), p=2.6)  # saddle
    g.blob((-11.5, 0, 56.5), (2.6, 8.5, 4.0), p=2.4)      # cantle
    rig.part("horse", g, WINE)

    # neck and a 1.25x head with a slate chanfron, an eye and a mane
    rig.joint("neck", "horse", (21, 0, 49))
    rig.joint("hhead", "neck", (32, 0, 66), scale=1.25)
    g = Geo().capsule((20, 0, 46), (31, 0, 64), 9.0, 6.8)
    rig.part("neck", g, COAT)
    g = Geo()
    for i in range(5):
        t = i / 4
        g.blob((17 + 12 * t, 0, 57 + 14 * t), (5.2, 3.2, 5.0 - 0.9 * i * 0.5), p=2.2, rot=(0, -35, 0))
    rig.part("neck", g, MANE, finish="hair")
    head = Geo().blob((38, 0, 63), (12.5, 6.4, 7.2), p=2.4, rot=(0, 40, 0))
    head.blob((46.0, 0, 55.2), (6.8, 6.0, 5.8), p=2.2)
    head.blob((33.0, 0, 62.0), (6.2, 6.6, 6.0), p=2.2)                # round cheek (jaw)
    ears = Geo()
    for y in (-3.4, 3.4):
        ears.lathe([(2.3, 0), (1.7, 3), (0, 7.0)], (30.5, y, 70), (29.0, y * 1.3, 78.0), segs=10)
    eye = Geo().blob((34.6, -5.2, 66.2), (2.4, 1.5, 2.7))
    hf = F.Face(rig, "hhead", [head, eye])
    rig.part("hhead", head, COAT)
    rig.part("hhead", ears, COAT)
    g = Geo().blob((47.6, -1.0, 54.4), (4.4, 5.2, 4.2), p=2.2)        # soft nose pad
    rig.part("hhead", g, NOSE)
    g = Geo().blob((39.5, 0, 64.5), (7.6, 5.9, 3.2), p=3.0, rot=(0, 38, 0))
    g.capsule((34.5, 0, 69.5), (44.0, 0, 60.0), 1.4)                    # chanfron ridge
    rig.part("hhead", g, SLATE, finish="metal")
    rig.part("hhead", eye, EYE, highlight=False, outline=0.8)
    rig.joint("pupils", "hhead", (35.4, -6.3, 65.8))
    g = Geo().sphere((35.5, -6.2, 66.0), 1.35, cuts=3)
    rig.part("pupils", g, DARK, outline=0)
    g = Geo().sphere((50.2, -4.2, 55.8), 1.2, cuts=3)                  # nostril
    rig.part("hhead", g, DARK, outline=0)
    g = Geo()
    c = hf.hit(*K.scr(hf, (49.0, -5.0, 51.0)))
    hf.stroke(g, c, [(-4.5, 0.4), (0.0, -0.6), (2.4, 0.2)], 1.0, 0.4)   # lip line
    rig.part("hhead", g, "#8A7A70", outline=0, highlight=False)
    # bridle: noseband, cheek strap and the gold bit
    g = Geo().capsule((44.0, -6.2, 58.8), (43.0, -6.0, 55.0), 1.0).capsule((43.0, -6.0, 55.0), (47.0, -5.6, 52.0), 1.0)
    g.capsule((33.0, -6.4, 70.0), (43.6, -6.4, 58.0), 1.0)
    rig.part("hhead", g, LEATHER, outline=0.5)
    g = Geo().capsule((47.5, -5.4, 52.5), (47.5, 5.4, 52.5), 1.3)
    rig.part("hhead", g, GOLD, finish="metal", outline=0.8)
    hf.eye_marks([K.scr(hf, (36.0, -6.4, 66.2))], 2.6, COAT)
    hf.mouths(K.scr(hf, (48.0, -5.6, 50.8)), 5.0)
    # forelock tuft between the ears (follow-through)
    rig.secondary("forelock", "hhead", (31.0, 0, 71.0), (37.0, 0, 64.0), max_deg=16, gain=1.2)
    g = Geo().capsule((31.0, -1.0, 71.0), (35.0, -1.5, 67.0), 2.6, 2.0).capsule((35.0, -1.5, 67.0), (37.5, -1.8, 63.5), 2.0, 1.0)
    rig.part("forelock", g, MANE, finish="hair")
    # tail: half the old size, a mid grey-brown so it does not pull the eye to the rear
    rig.secondary("tail", "horse", (-26, 0, 49), (-31, 0, 36), max_deg=15, gain=1.0)
    g = Geo().capsule((-26, 0, 49), (-30.5, 0, 44), 2.6, 3.0).capsule((-30.5, 0, 44), (-31, 0, 36.5), 3.0, 1.4)
    rig.part("tail", g, TAIL, finish="hair")

    # the knight, 1.2x relative to the horse, scaled about the saddle
    rig.joint("rider", "horse", (-2, 0, 57), scale=1.2)
    rig.joint("ktorso", "rider", (-1, 0, 58))
    rig.joint("khead", "ktorso", (0, 0, 79))
    g = Geo().capsule((-1, -8.5, 58), (8, -11.5, 52), 5.2, 4.6).capsule((8, -11.5, 52), (7, -11.5, 40), 4.4, 4.0)
    g.blob((9.5, -11.5, 38.0), (5.8, 4.2, 3.0), p=2.8)
    rig.part("rider", g, SLATE, finish="metal")
    g = Geo().capsule((5.0, -12.2, 51.0), (9.0, -12.2, 36.0), 0.8)   # stirrup leather
    rig.part("rider", g, LEATHER, outline=0.4)
    g = Geo().lathe([(2.6, 0), (3.0, 0.4), (3.0, 1.4), (2.6, 1.8)], (9.5, -12.0, 34.6), segs=12)
    rig.part("rider", g, STEEL, finish="metal", outline=0.4)
    g = Geo().blob((-1, 0, 70.5), (9.2, 10.2, 11.2), p=2.4, taper=(0.95, 1.08))
    rig.part("ktorso", g, SLATE, finish="metal")
    g = Geo().blob((-0.4, 0, 64.8), (10.2, 11.2, 8.4), p=2.8, taper=(1.12, 0.9))
    g.blob((-0.4, 0, 72.5), (9.8, 10.6, 5.0), p=2.6)
    rig.part("ktorso", g, team=True)
    g = Geo().blob((-0.4, 0, 63.2), (10.6, 11.6, 1.8), p=3.0)
    rig.part("ktorso", g, WINE)
    # great helm: slit that wraps to the near side, two glowing eye dots, gold cross trim
    g = Geo().blob((0.5, 0, 88), (9.6, 9.4, 10.8), p=3.2, taper=(1.05, 0.92))
    rig.part("khead", g, STEEL, finish="metal")
    g = Geo().capsule((10.0, 4.0, 89.5), (9.9, -4.5, 89.5), 1.7).capsule((9.9, -4.5, 89.5), (7.0, -9.4, 89.5), 1.7)
    rig.part("khead", g, DARK, outline=0)
    g = Geo().sphere((10.4, -3.4, 89.6), 1.2, cuts=3).sphere((9.2, -7.4, 89.6), 1.2, cuts=3)
    rig.part("khead", g, glow="#FFFFFF", outline=0)
    g = Geo().capsule((10.2, -1.0, 99.0), (10.4, -1.0, 92.0), 1.1).capsule((10.3, -1.0, 87.5), (10.4, -1.0, 81.5), 1.1)
    rig.part("khead", g, GOLD, finish="metal", outline=0.9)
    rig.secondary("plume", "khead", (-2, 0, 99), (-20, 0, 97), max_deg=10, gain=1.0)
    g = Geo()
    for x, z, r in ((0, 99.5, 4.6), (-4, 104, 5.4), (-9.5, 106, 5.4), (-15, 104.5, 4.8),
                    (-19, 100, 4.0), (-21.5, 95, 3.2)):
        g.blob((x, 0, z), (r * 1.15, r * 0.9, r), p=2.1)
    rig.part("plume", g, team=True)

    # far arm: holds the lance, carried across the horse's neck
    rig.joint("karm_l", "ktorso", (0, 10.5, 77))
    rig.joint("kfore_l", "karm_l", (3, 12, 68))
    rig.joint("lance", "kfore_l", (LX, LY, LZ))
    g = Geo().capsule((0, 10.5, 77), (3, 12, 68), 4.2, 3.8)
    rig.part("karm_l", g, SLATE, finish="metal")
    g = Geo().capsule((3, 12, 68), (10, 13, 65.5), 3.8, 3.6).blob((10.5, 13, 65), (4.2, 4.2, 4.2), p=2.6)
    rig.part("kfore_l", g, SLATE, finish="metal")
    g = Geo().lathe([(0, -14), (1.8, -13.5), (2.0, -4), (2.1, 3), (1.8, 26), (1.4, LANCE_TIP - 12),
                     (0, LANCE_TIP - 11)], (LX, LY, LZ), segs=12)
    rig.part("lance", g, WINE)
    g = Geo().lathe([(0, 1.5), (2.6, 2.0), (6.8, 8.5), (5.8, 10), (0, 10.2)], (LX, LY, LZ), segs=16)
    g.lathe([(1.8, LANCE_TIP - 13), (2.8, LANCE_TIP - 12), (1.6, LANCE_TIP - 6), (0, LANCE_TIP)],
            (LX, LY, LZ), segs=10)
    rig.part("lance", g, STEEL, finish="metal")
    rig.track("lanceTip", "lance", (LX, LY, LZ + LANCE_TIP))
    # the lance that clatters to the ground when the knight is unhorsed (lying along +X)
    rig.joint("lance_loose", "root", (20.0, -2.0, 2.6), hidden=True, scale=1.2)
    o, d = (-6.0, -2.0, 2.6), (1.0, 0.0, 0.0)
    p1 = (o[0] + d[0], o[1], o[2])
    g = Geo().lathe([(0, -14), (1.8, -13.5), (2.0, -4), (2.1, 3), (1.8, 26), (1.4, LANCE_TIP - 12),
                     (0, LANCE_TIP - 11)], o, p1, segs=12)
    rig.part("lance_loose", g, WINE)
    g = Geo().lathe([(0, 1.5), (2.6, 2.0), (6.8, 8.5), (5.8, 10), (0, 10.2)], o, p1, segs=16)
    g.lathe([(1.8, LANCE_TIP - 13), (2.8, LANCE_TIP - 12), (1.6, LANCE_TIP - 6), (0, LANCE_TIP)], o, p1, segs=10)
    rig.part("lance_loose", g, STEEL, finish="metal")
    # swallowtail pennant (14 x 8 lu after the 1.2x rider scale) trailing behind the tip; it is
    # counter-rotated to stream back level and follows through from the lance's movement
    pz = LZ + LANCE_TIP - 14.0
    rig.secondary("pennant", "lance", (LX, LY - 0.5, pz), (LX - 11.5, LY - 0.5, pz - 3.3),
                  max_deg=14, gain=1.2, rot_gain=0.0)
    pts = [(0.0, 0.0), (-11.7, -0.6), (-8.4, -3.3), (-11.7, -6.1), (0.0, -6.7)]
    g = Geo().slab([(LX + x, pz + z) for x, z in pts], LY - 0.5, 1.2)
    rig.part("pennant", g, team=True, outline=0.8)

    # near arm: the big heater shield (team face, parchment chevron, steel rim)
    rig.joint("karm_r", "ktorso", (0, -10.5, 77))
    rig.joint("kfore_r", "karm_r", (3, -12, 68))
    rig.joint("shield", "kfore_r", (9, -15, 66))
    g = Geo().capsule((0, -10.5, 77), (3, -12, 68), 4.4, 4.0)
    rig.part("karm_r", g, SLATE, finish="metal")
    g = Geo().capsule((3, -12, 68), (9, -13, 66), 4.0, 3.7)
    rig.part("kfore_r", g, SLATE, finish="metal")
    for y in (-10.5, 10.5):
        g = Geo().blob((-0.5, y * 1.02, 78.5), (7.6, 6.2, 5.6), p=2.4)
        rig.part("ktorso" if y > 0 else "karm_r", g, STEEL, finish="metal")
    sx, sy, sz = 8.0, -20.5, 64.0
    rot = (0, 0, 8)
    g = Geo().blob((sx, sy + 0.8, sz), (11.2, 1.4, 14.6), p=3.2, taper=(0.2, 1.0), rot=rot)
    rig.part("shield", g, STEEL, finish="metal")
    sh = Geo().blob((sx, sy, sz + 0.5), (9.5, 1.5, 12.6), p=3.2, taper=(0.17, 1.0), rot=rot)
    sf = F.Face(rig, "shield", [sh])
    rig.part("shield", sh, team=True, outline=0.8)
    g = K.paw(sf, Geo(), K.scr(sf, (sx, sy - 1.6, sz + 1.0)), s=1.7)
    rig.part("shield", g, PARCH, highlight=False, outline=0)
    g = Geo().blob((sx, sy - 1.8, sz + 9.6), (2.2, 1.5, 2.2), p=2.2)
    rig.part("shield", g, GOLD, finish="metal", outline=0.8)




# -- poses ---------------------------------------------------------------------------------
LANCE_CHAIN = ("body", "rider", "horse", "ktorso", "karm_l", "kfore_l")


def lance_at(pose, deg):
    """Sets the lance so it points `deg` above the horizon, whatever its parents do."""
    chain = sum(pose.get(j, {}).get("r", 0.0) for j in LANCE_CHAIN)
    pose.setdefault("lance", {})["r"] = deg - 90.0 - chain
    return pose


def _pennant(pose, lance_deg):
    """Counter-rotate the pennant so it streams back level (a little droop)."""
    pose.setdefault("pennant", {})["r"] = 90.0 - lance_deg + 4.0
    return pose


def _finish(pose, lance_deg):
    return _pennant(lance_at(pose, lance_deg), lance_deg)


STANCE = {
    "karm_l": {"r": 22}, "kfore_l": {"r": 20},
    "karm_r": {"r": 10}, "kfore_r": {"r": 40},
    "neck": {"r": -9}, "hhead": {"r": 7},     # the head carried forward, clear of the knight
}
IDLE_LANCE = 28.0
HX = (0.0, 0.0, 40.0)    # the horse's belly: squash and pitch pivot
HOOF_B = (-19.0, 0.0, 0.0)


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    lag = math.cos(2 * math.pi * (f - 1) / n)
    toss = [0.0, 0.0, 0.6, 1.0, 0.3, 0.0][f]
    pose = merge(STANCE, {
        "horse": {"z": 1.0 * c},
        "body": squash(0.02 * c),
        "neck": {"r": -3.0 * lag + 10 * toss}, "hhead": {"r": 2.5 * lag - 8 * toss},
        "rider": {"z": 0.8 * lag},
        "ktorso": {"r": 1.2 * lag}, "khead": {"r": -1.0 * lag},
        "tail": {"r": [0, 8, 14, 4, -8, -4][f]},
        "leg_fr": {"r": 1.0 * c + [0, 0, 6, 10, 2, 0][f]}, "leg_fr2": {"r": [0, 0, -18, -30, -6, 0][f]},
        "leg_br": {"r": -1.0 * c},
    })
    if f == 5:
        pose = merge(pose, F.expr("blink", mouth=None))
    return _finish(pose, IDLE_LANCE + 1.5 * lag)


# -- walk v3: G5 trot at ground speed (card 60 x 1.25 = 75 lu/s), 8 x 92.5 ms ------------------
SPEED = 75.0
GAIT = None


def _gait():
    global GAIT
    if GAIT is None:
        GAIT = G.Gait(8, 740, SPEED, G.quad_feet(LEGS, G.TROT, x_off={"fr": -1.0, "fl": -1.0, "br": -1.0,
                                                                        "bl": -1.0}),
                      0.48, lift=10.0, kick=4.0, reach=4.0, toe_off=0.0, heel_strike=0.0)
    return GAIT


def _walk(f, report=None):
    g = _gait()
    lagp = 2 * math.pi * (f - 1) / g.frames

    def extra(ctx):
        p = ctx["p"]
        post = -math.cos(2 * (lagp - ctx["low"] / 2))     # the knight posts a frame late
        return merge(STANCE, {
            "neck": {"r": -9 - 7 * math.cos(2 * p - 0.5)}, "hhead": {"r": 7 + 5 * math.cos(2 * p - 1.1)},
            "rider": {"z": 1.5 * post},
            "ktorso": {"r": -3.0 * post}, "khead": {"r": 2.0 * post},
            "karm_r": {"r": 10 + 4 * post}, "kfore_r": {"r": 40 - 3 * post},
            "tail": {"r": 8 * math.sin(2 * p - 1.3)}, "forelock": {"r": 6 * math.cos(2 * p - 1.2)},
        })
    out = G.quad_walk(RIG, f, g, {}, trunk="horse", base_z=-5.6, bob=2.0, beats=2, pitch=2.0, roll=1.5,
                      extra=extra, report=report)
    post = -math.cos(2 * (lagp - math.pi * g.stance / 2))
    return _finish(out, IDLE_LANCE + 4.0 * post)


# attack: 10 unique poses in the 12 heavy steps (moves.HEAVY_MELEE_MS), impact on pose 6
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#      shift  dip  coil HOLD burst reach IMPACT skid follow settle
A_X = [-1.0, -3.0, -6.0, -8.0, 2.0, 9.0, 13.0, 12.0, 6.0, 1.0]
A_Z = [0.0, -1.5, -3.0, -4.0, 2.5, 3.0, 0.0, -1.0, 0.0, 0.0]
A_R = [2, 4, 9, 12, -2, 2, -4, -6, -2, 0]            # horse pitch (+ = forehand up)
A_Q = [-0.02, -0.05, -0.07, -0.08, 0.05, 0.03, -0.07, 0.02, 0.0, 0.0]
A_SX = [1.0, 1.0, 0.97, 0.96, 1.08, 1.06, 1.0, 1.0, 1.0, 1.0]
LFR = [(4, -8), (8, -20), (12, -40), (16, -52), (34, 4), (42, 8), (24, 0), (30, -4), (10, 0), (0, 0)]
LFL = [(0, 0), (4, -10), (6, -24), (8, -34), (26, -22), (36, 2), (18, 0), (24, 0), (6, 0), (0, 0)]
LBR = [(2, 0), (6, 4), (16, 8), (22, 10), (-26, 0), (-32, 4), (-20, 0), (6, 0), (2, 0), (0, 0)]
LBL = [(2, 0), (4, 2), (12, 6), (18, 8), (-30, 0), (-24, 10), (-16, 0), (10, 0), (4, 0), (0, 0)]
NECK = [2, -2, 6, 10, -10, -12, 6, 12, 4, 0]
HHEAD = [0, 4, -4, -6, 4, 6, -8, -10, -2, 0]
KT = [2, -2, -8, -12, -16, -18, -14, -4, 0, 0]       # knight lean (- = forward)
LANCE = [45, 36, 20, 6, 3, 2, 0, -4, 16, 28]
KARM_L = [0, -4, -14, -22, -24, -24, -24, -12, -4, 0]
KARM_R = [0, 0, 4, 6, 8, 8, 12, 6, 2, 0]
A_TAIL = [0, 4, 8, 10, -12, -16, -8, 6, 4, 0]


def _attack_pose(f):
    pose = merge(STANCE, M.body_about(HX, x=A_X[f], z=A_Z[f], q=A_Q[f]), {
        "body": {"sx": A_SX[f]},
        "horse": {"r": A_R[f]},
        "leg_fr": {"r": LFR[f][0]}, "leg_fr2": {"r": LFR[f][1]},
        "leg_fl": {"r": LFL[f][0]}, "leg_fl2": {"r": LFL[f][1]},
        "leg_br": {"r": LBR[f][0]}, "leg_br2": {"r": LBR[f][1]},
        "leg_bl": {"r": LBL[f][0]}, "leg_bl2": {"r": LBL[f][1]},
        "neck": {"r": NECK[f]}, "hhead": {"r": HHEAD[f]},
        "ktorso": {"r": KT[f]}, "khead": {"r": -0.5 * KT[f]},
        "karm_l": {"r": KARM_L[f]}, "karm_r": {"r": KARM_R[f]},
        "tail": {"r": A_TAIL[f]},
    })
    if f in (2, 3):
        pose = merge(pose, F.expr("grit", mouth=None))
    elif f in (5, 6, 7):
        pose = merge(pose, F.expr("yell", mouth=None))
    pose = _finish(pose, LANCE[f])
    if f in (4, 5):
        pose["lance"]["sz"] = 1.1
    if f == 6:
        pose["lance"]["sz"] = 0.95   # the lance flexes on the hit
    return pose


TIP = (LX, LY, LZ + LANCE_TIP)
CHARGE = {"kind": "streak", "joint": "lance", "point": TIP, "color": "#C9D2DC", "width_lu": 10.0,
          "white": 0.35}


def _attack_clip():
    ov = {
        4: [dict(CHARGE, **{"from": 3, "t0": 0.0, "t1": 1.0}),
            {"kind": "dust", "ground": (-24.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 51, "spread": 1.2,
             "dir": -1.0}],
        5: [dict(CHARGE, **{"from": 3, "t0": 0.3, "t1": 1.0, "width_lu": 8.0})],
        6: [{"kind": "burst", "joint": "lance", "point": TIP, "r0_lu": 8.0, "r1_lu": 16.0, "n": 6,
             "a0": -80.0, "arc": 160.0},
            {"kind": "dust", "ground": (34.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 52, "spread": 1.2},
            {"kind": "dust", "ground": (-20.0, 0.0), "size_lu": 7.0, "puffs": 3, "seed": 53, "spread": 0.9,
             "dir": -1.0}],
        7: [{"kind": "dust", "ground": (36.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 54, "spread": 1.5}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov)



# -- attack B: rear and thrust down (ANIM_SPEC appendix B) --------------------------------------
# unique frames: 0 = A shift, 1 gather, 2 rearing, 3 HOLD (reared, forelegs folded, the lance raised
# high), 4-5 the forehand drops (smear), 6 IMPACT (forelegs stamp, the lance driven down), 7 jolt,
# 8-9 = A follow, settle; played on A's steps
#       gather rear  HOLD  drop  drop  IMP   jolt
OB_R = [4, 14, 22, 10, 2, -3, -2]           # horse pitch about the hind hooves
OB_X = [-1.0, -2.0, -3.0, 2.0, 5.0, 7.0, 6.0]
OB_Z = [-1.0, 0.0, 0.5, 0.0, 0.0, -1.0, -0.5]
OB_Q = [-0.04, 0.02, 0.04, 0.02, 0.0, -0.08, 0.02]
OB_LF = [(8, -20), (40, -70), (58, -100), (40, -60), (30, -20), (10, 0), (4, 0)]
OB_LB = [(8, 4), (12, 8), (16, 10), (8, 6), (0, 0), (-6, 0), (-2, 0)]
OB_NECK = [4, 12, 16, 6, -6, -10, -4]
OB_HH = [-2, -8, -12, -4, 4, 6, 2]
OB_KT = [0, 4, 8, -6, -14, -18, -12]
OB_KARM = [10, 50, 70, 40, 10, -10, -6]
OB_LANCE = [50, 62, 70, 30, -10, -28, -24]
OB_TAIL = [4, 10, 14, 0, -8, -10, -4]


def _b_pose(i):
    if i in (0, 8, 9):
        return _attack_pose(i)
    k = i - 1
    pose = merge(STANCE, M.body_about(HOOF_B, x=OB_X[k], z=OB_Z[k], r=OB_R[k], q=OB_Q[k]), {
        "leg_fr": {"r": OB_LF[k][0]}, "leg_fr2": {"r": OB_LF[k][1]},
        "leg_fl": {"r": OB_LF[k][0] - 8}, "leg_fl2": {"r": OB_LF[k][1] + 10},
        "leg_br": {"r": OB_LB[k][0]}, "leg_br2": {"r": OB_LB[k][1]},
        "leg_bl": {"r": OB_LB[k][0] - 4}, "leg_bl2": {"r": OB_LB[k][1]},
        "neck": {"r": OB_NECK[k]}, "hhead": {"r": OB_HH[k]},
        "ktorso": {"r": OB_KT[k]}, "khead": {"r": -0.5 * OB_KT[k]},
        "karm_l": {"r": OB_KARM[k]}, "karm_r": {"r": 8 + 0.3 * OB_KARM[k]},
        "tail": {"r": OB_TAIL[k]},
    })
    if k in (1, 2):
        pose = merge(pose, F.expr("o", mouth=None))
    elif k in (3, 4, 5):
        pose = merge(pose, F.expr("yell", mouth=None))
    pose = _finish(pose, OB_LANCE[k])
    if k in (3, 4):
        pose["lance"]["sz"] = 1.1
    return pose


def _attack_b():
    ov = {
        4: [dict(CHARGE, **{"from": 3, "t0": 0.0, "t1": 1.0})],
        5: [dict(CHARGE, **{"from": 3, "t0": 0.3, "t1": 1.0, "width_lu": 8.0})],
        6: [{"kind": "burst", "joint": "lance", "point": TIP, "r0_lu": 8.0, "r1_lu": 16.0, "n": 6,
             "a0": -130.0, "arc": 160.0},
            {"kind": "dust", "ground": (26.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 55, "spread": 1.3},
            {"kind": "dust", "ground": (60.0, 0.0), "size_lu": 7.0, "puffs": 3, "seed": 56, "spread": 1.0}],
        3: [{"kind": "dust", "ground": (-20.0, 0.0), "size_lu": 7.0, "puffs": 3, "seed": 57, "spread": 0.9,
             "dir": -1.0}],
    }
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov, reuse=reuse)


# -- attack C: lance sweep ---------------------------------------------------------------------
# unique frames: 0 = A shift, 1 twist, 2 swing back, 3 HOLD (the knight twisted, the lance right back
# over the rump), 4-5 sweep round (arc smear), 6 IMPACT (level across the front), 7 overswing,
# 8-9 = A follow, settle
#        twist back HOLD sweep sweep IMP  over
OC_LANCE = [70, 120, 160, 110, 40, -2, -14]
OC_KRZ = [0, -4, -8, -4, 4, 8, 8]
OC_KT = [0, 4, 8, 0, -10, -14, -12]
OC_KARM = [10, 30, 52, 30, 0, -16, -20]
OC_X = [-1.0, -2.0, -3.5, 0.0, 3.5, 5.0, 4.5]
OC_R = [2, 3, 4, 0, -3, -4, -2]
OC_Q = [-0.02, -0.04, -0.06, 0.02, 0.03, -0.07, 0.02]
OC_NECK = [2, 4, 8, -4, -10, -12, -6]
OC_LF = [(4, -8), (6, -12), (12, -26), (20, -10), (24, 0), (14, 0), (10, 0)]
OC_LB = [(2, 0), (6, 4), (12, 8), (0, 0), (-8, 0), (-10, 0), (-4, 0)]


def _c_pose(i):
    if i in (0, 8, 9):
        return _attack_pose(i)
    k = i - 1
    pose = merge(STANCE, M.body_about(HX, x=OC_X[k], r=OC_R[k], q=OC_Q[k]), {
        "leg_fr": {"r": OC_LF[k][0]}, "leg_fr2": {"r": OC_LF[k][1]},
        "leg_fl": {"r": OC_LF[k][0] - 6}, "leg_fl2": {"r": OC_LF[k][1]},
        "leg_br": {"r": OC_LB[k][0]}, "leg_br2": {"r": OC_LB[k][1]},
        "leg_bl": {"r": OC_LB[k][0] - 4}, "leg_bl2": {"r": OC_LB[k][1]},
        "neck": {"r": OC_NECK[k]}, "hhead": {"r": -0.5 * OC_NECK[k]},
        "ktorso": {"r": OC_KT[k], "rz": OC_KRZ[k]}, "khead": {"r": -0.5 * OC_KT[k], "rz": -0.5 * OC_KRZ[k]},
        "karm_l": {"r": OC_KARM[k]},
        "tail": {"r": [2, 4, 8, -6, -12, -10, -4][k]},
    })
    if k in (1, 2):
        pose = merge(pose, F.expr("grit", mouth=None))
    elif k in (3, 4, 5):
        pose = merge(pose, F.expr("yell", mouth=None))
    pose = _finish(pose, OC_LANCE[k])
    if k in (3, 4):
        pose["lance"]["sz"] = 1.08
    return pose


SWEEP = {"kind": "arc", "joint": "lance", "inner": (LX, LY, LZ + LANCE_TIP * 0.45), "outer": TIP,
         "color": "#C9D2DC", "taper": 0.15, "white": 0.35, "t0": 0.0, "t1": 0.95, "lines": 3,
         "samples": 18}


def _attack_c():
    ov = {
        4: [dict(SWEEP, **{"from": 3})],
        5: [dict(SWEEP, **{"from": 4})],
        6: [dict(SWEEP, t0=0.3, t1=1.0, lines=2, **{"from": 5}),
            {"kind": "burst", "joint": "lance", "point": TIP, "r0_lu": 7.0, "r1_lu": 14.0, "n": 6,
             "a0": -60.0, "arc": 140.0},
            {"kind": "dust", "ground": (30.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 58, "spread": 1.1}],
    }
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_c", [_c_pose(i) for i in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a, shake):
        return {"body": dict(squash(-0.06 * max(a, 0)), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
                "horse": {"r": 4 * a},
                "neck": {"r": 12 * a}, "hhead": {"r": -6 * a + 8 * shake, "rx": 10 * shake},
                "ktorso": {"r": 10 * a}, "khead": {"r": 6 * a},
                "karm_r": {"r": 14 * max(a, 0)}, "tail": {"r": 10 * a},
                "leg_br": {"r": -8 * max(a, 0)}, "leg_bl": {"r": -6 * max(a, 0)}}
    pose = M.hit_beast(k, STANCE, recoil, face_hurt=F.expr("squeeze", mouth=None))
    return _finish(pose, IDLE_LANCE + 10 * M.HIT_AMT[k])


# die D5 unhorsed: 8 unique poses in the 12 heavy steps (moves.DIE_SEQ_HEAVY)
#        struck rear  thrown  air  buckle flop settle shrink
D_HR = [4, 26, 22, 4, -6, -2, 0, 0]                  # horse pitch about the hind hooves
D_Z = [0, 0, 0, 0, -12, -22, -21, -21]
D_X = [-3, -4, -4, -2, 0, 0, 0, 0]
D_Q = [-0.08, 0.06, 0.03, 0.0, -0.1, -0.06, -0.03, -0.05]
D_S = [1, 1, 1, 1, 1, 1, 1, 0.94]
D_LF = [(6, -10), (44, -90), (40, -80), (6, -6), (-40, 110), (-62, 128), (-64, 130), (-64, 130)]
D_LB = [(-4, 0), (-6, 0), (-4, 0), (0, 0), (20, -30), (58, -118), (60, -122), (60, -122)]
D_NECK = [10, 18, 14, 0, -18, -30, -32, -32]
D_HH = [-6, -8, -6, 0, 8, 14, 16, 16]
# the knight: thrown back off the saddle, a spin in the air, flat on his back behind the horse
D_RX = [0, -4, -22, -40, -48, -50, -50, -50]
D_RZ = [0, 3, 22, 10, -26, -20, -20, -20]
D_RR = [4, 25, 110, 250, 450, 450, 450, 450]
D_LANCE = [(None), (None), (10, 30, 30), (26, 12, 10), (34, 0, 0), (34, 0, 0), (34, 0, 0), (34, 0, 0)]


def _die(k):
    pose = merge(STANCE, M.body_about(HOOF_B, x=D_X[k], z=D_Z[k], r=D_HR[k], q=D_Q[k], s=D_S[k]), {
        "leg_fr": {"r": D_LF[k][0]}, "leg_fr2": {"r": D_LF[k][1]},
        "leg_fl": {"r": D_LF[k][0] - 6}, "leg_fl2": {"r": D_LF[k][1] - 8},
        "leg_br": {"r": D_LB[k][0]}, "leg_br2": {"r": D_LB[k][1]},
        "leg_bl": {"r": D_LB[k][0] - 4}, "leg_bl2": {"r": D_LB[k][1] + 6},
        "neck": {"r": D_NECK[k]}, "hhead": {"r": D_HH[k]},
        "tail": {"r": [0, 20, 16, 6, -10, -20, -20, -20][k]},
        "rider": {"x": D_RX[k], "z": D_RZ[k], "r": D_RR[k] - D_HR[k]},
        "karm_l": {"r": [20, 60, 120, 80, 40, 40, 40, 40][k]},
        "karm_r": {"r": [10, 40, 90, 60, 30, 30, 30, 30][k]},
        "ktorso": {"r": [6, 10, 0, 0, 0, 0, 0, 0][k]},
    })
    pose = _finish(pose, [IDLE_LANCE + 8, IDLE_LANCE + 20, 0, 0, 0, 0, 0, 0][k])
    if D_LANCE[k] is not None:
        x, z, r = D_LANCE[k]
        pose["lance"] = dict(pose.get("lance", {}), hide=True)
        pose["lance_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", mouth=None))
    elif k < 4:
        pose = merge(pose, F.expr("o", mouth=None))
    else:
        pose = merge(pose, F.expr("x", "tongue", mouth=None))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.walk_clip("walk", RIG, _walk, _gait(), "rider"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
