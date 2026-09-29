"""Javelineer: Bronze Age ranged (a javelin that pierces 2 targets), realistic style. heightLu 68.

A light skirmisher: a short team exomis (a tunic pinned on the far shoulder, the near shoulder bare)
belted with leather, a rolled wool cloak over the far shoulder, a team headband with trailing ties
over thick black curls, bare arms and legs, laced sandals. A leather case of javelins rides on his
back (the shafts stand up over the far shoulder). Idle: the throwing arm cocked by the ear with a
javelin ready, the far hand pointing at the enemy. Attack: coil back (held), a smeared whip over the
top, release (the javelin leaves at the per-frame `muzzle`), follow-through across the body, and a
reach back to the case for the next javelin.
"""
import math

from lib import biped as B
from lib import bronze as BZ
from lib import core as C
from lib import mats as M
from lib import motion as MO

SLUG = "javelineer"
NAME = "Javelineer"
AGE = "bronze"
KIND = "unit"
HEIGHT_LU = 68
PX1 = 1.23
SCALE1 = 1.5
H = 65.5
CANVAS = (178, 112)
FEET = (92, 9)
YAW = -24.0
ANCHORS = {"head": (2, 64), "hitCenter": (0, 32)}

BODY = B.Biped(H=H, bulk=0.93)
K = BODY.k
FIST = (0.35 * K, -BODY.sw, 31.0 * K)
JAV_F, JAV_B = 30.0 * K, 22.0 * K
TRACKERS = {"muzzle": ("hand_F", (FIST[0] + JAV_F + 4.0 * K, FIST[1], FIST[2]))}
EXTRA_BONES = {"tails": ((-4.0 * K, 0, 65.0 * K), (-10.0 * K, 0, 62.5 * K), "head")}

STANCE = 0.62
STRIDE = 25.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
G0 = B.ANKLE * H
SMEAR_COLOR = "#b8aa94"
SMEAR_ALPHA = 0.55
SMEAR_N = 40


def build():
    k = K
    m = BZ.kit()
    skin = M.skin("#916c55")
    rig = C.Rig("javelineer_rig", BODY.bones(extra=EXTRA_BONES), yaw_deg=YAW)
    BODY.body(rig, skin)
    S = lambda x, y, z: (x * k, y * k, z * k)
    bw = BODY.bulk
    tc = m["team_cloth"]

    # the exomis: pinned on the far shoulder, a strap across the chest, a short pleated skirt
    tunic = C.blobs("tunic", [
        (S(0.3, 0, 40.8), (4.55 * bw, 6.3 * bw, 5.8)),
        (S(-0.4, 0.8, 46.8), (5.05 * bw, 6.95 * bw, 5.5)),
        (S(-1.2, 4.5, 52.0), (3.9, 3.7, 3.4)),
        (S(1.2, 1.4, 49.2), (3.4, 3.8, 3.6)),
        (S(-2.2, 1.2, 49.6), (3.0, 6.4 * bw, 4.4)),
    ], tc, res=0.4)
    strap = C.tube("strap", [S(3.4, -3.8, 43.8), S(4.6, -1.6, 48.2), S(3.6, 1.4, 52.6), S(0.2, 4.6, 55.4)],
                   [1.6 * k] * 4, tc, seg=10, flat=0.45)
    skirt = C.blobs("skirt", [(S(-0.2, 0, 36.4), (5.5 * bw, 7.4 * bw, 3.0)), (S(0.0, 0, 32.8), (6.2 * bw, 8.1 * bw, 3.8)),
                              (S(0.3, 0, 29.6), (6.4 * bw, 8.2 * bw, 1.8))], tc, res=0.4)
    for o in (tunic, skirt):
        C.displace(o, 0.35 * k, 1.1)
    for o in (tunic, strap, skirt):
        C.team(o)
    rig.skin(tunic, ["hips", "spine", "chest"], soft=2.0 * k)
    rig.skin(strap, ["spine", "chest"], soft=2.0 * k)
    rig.skin(skirt, ["hips", "thigh_F", "thigh_B"], soft=3.0 * k, bias={"thigh_F": 1.2 * k, "thigh_B": 1.2 * k})
    belt = C.blobs("belt", [(S(-0.1, 0, 38.4), (5.1 * bw, 7.0 * bw, 1.0))], m["leather"], res=0.3)
    rig.skin(belt, ["hips", "spine"], soft=2.0 * k)
    rig.rigid(C.sphere("fibula", 0.9 * k, m["polished"], loc=S(0.6, 5.2, 55.4)), "chest")
    # rolled wool cloak over the far shoulder, knotted at the near hip
    roll = C.tube("roll", [S(-3.2, 6.6, 55.6), S(0.6, 4.8, 56.4), S(4.2, 1.0, 53.2), S(4.8, -3.4, 46.0), S(3.4, -6.2, 40.4)],
                  [2.0 * k, 2.1 * k, 2.0 * k, 1.9 * k, 1.6 * k], m["wool"], seg=12)
    C.displace(roll, 0.3 * k, 1.2)
    rig.skin(roll, ["spine", "chest"], soft=2.4 * k)

    BZ.full_hair(rig, k, m, color="#241c17", band=tc)
    for i, dy in enumerate((-0.9, 0.9)):
        tl = BZ.ribbon(f"tail{i}", [S(-4.0, dy, 65.0), S(-6.8, dy * 1.2, 64.0), S(-9.8, dy * 1.4, 62.2)], [1.5 * k, 1.3 * k, 0.8 * k],
                       tc, thick=0.35 * k, up=(0, 0, 1))
        C.team(tl)
        rig.rigid(tl, "tails")
    BZ.hair_beard(rig, k, m, hair=M.hair("#241c17", name="curls2"), beard=True, nape=False)
    BZ.eyes(rig, k, m)
    BZ.sandals(rig, BODY, m)
    BZ.bracers(rig, BODY, m, sides=("F",))

    # the javelin case on the back, three shafts standing over the far shoulder
    case = C.tube("case", [S(-6.4, 3.2, 36.0), S(-8.2, 3.6, 50.0), S(-9.2, 3.8, 56.0)], [2.4 * k, 2.6 * k, 2.7 * k], m["leather"], seg=12)
    rig.skin(case, ["spine", "chest"], soft=3 * k, bias={"spine": 0.5 * k})
    for i, (dy, dx) in enumerate(((2.6, 0.0), (4.2, 0.8), (3.2, -0.9))):
        sh = C.tube("shaft", [S(-8.6 + dx, dy, 52.0), S(-11.0 + dx * 1.4, dy + 0.4, 74.0)], [0.55 * k, 0.5 * k], m["ash"], seg=6)
        rig.rigid(sh, "chest")
        rig.rigid(C.tube("jhead", [S(-11.0 + dx * 1.4, dy + 0.4, 74.0), S(-11.3 + dx * 1.4, dy + 0.4, 77.6)], [0.75 * k, 0.05 * k],
                         m["bronze"], seg=6, flat=0.4), "chest")
    rig.rigid(C.tube("casestrap", [S(-6.0, 3.0, 50.0), S(-1.0, 5.8, 55.6), S(3.6, 2.0, 50.0), S(3.4, -4.0, 42.0)], [0.45 * k] * 4,
                     m["leather"], seg=6), "chest")

    jav = BZ.spear(m, FIST, JAV_F, JAV_B, r=0.55 * k, head=4.0 * k, name="jav")
    for o in jav:
        o["weapon"] = 1
        rig.rigid(o, "hand_F")
    return dict(rig=rig, jav=jav)


# ------------------------------------------------------------------------------------ poses
def stance(breath=0.0):
    return dict(root=(0.0, -1.4), hips=0, spine=-2, chest=-2 - 0.8 * breath, neck=1, head=-6 - 0.5 * breath,
                footF=(10.5, G0, 0.0), footB=(-10.0, G0, 0.0),
                handF=((-3.0, 56.5 + 0.4 * breath), 10), absB=(62, 78, 80, -4), bones={"tails": 0})


def idle(t):
    a = 2 * math.pi * t / 920.0
    b = math.sin(a)
    P = stance(breath=1.3 * b)
    P["root"] = (0.0, -1.4 - 0.35 * b)
    P["root_dy"] = 1.2 * math.sin(a + 0.8)
    P["hips"] += 1.0 * math.sin(a + 0.8)
    P["head"] += 2.0 * math.sin(a + 0.3)
    P["handF"] = ((-3.0 + 0.8 * math.sin(a - 0.6), 56.5 + 0.6 * b), 10 + 3 * math.sin(a - 1.0))
    P["absB"] = (62 + 3 * math.sin(a - 0.4), 78 + 3 * math.sin(a - 0.8), 80, -4)
    P["bones"] = {"tails": 6 * math.sin(a - 1.4)}
    return P


def walk(t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 4.4, STANCE, G0, lean=5.0)
    P["handF"] = ((-2.0 - 1.5 * s1, 55.5 - 1.0 * c2), 8 + 3 * s1)
    P["armB"] = MO.arm_swing(s1, "B", amp=20)
    P["bones"] = {"tails": -10 - 5 * c2}
    return P


def _atk_keys():
    ready = stance()
    coil = dict(root=(-2.5, -1.6), hips=-5, spine=-8, chest=-6, neck=3, head=-2, footF=(11.5, G0, 6.0), footB=(-11.0, G0, 0.0),
                handF=((-10.0, 55.0), 14), absB=(78, 86, 88, -4), bones={"tails": 8})
    cock = dict(root=(-4.2, -1.2), hips=-9, spine=-13, chest=-9, neck=5, head=0, footF=(12.5, G0 + 1.2, 14.0),
                footB=(-11.5, G0, 0.0), handF=((-15.0, 52.5), 18), absB=(86, 90, 92, -4), bones={"tails": 12})
    cock2 = dict(cock, root=(-4.5, -1.1), spine=-14, handF=((-15.6, 52.2), 19))
    whip = dict(root=(1.5, -3.0), hips=7, spine=5, chest=2, neck=-3, head=-6, footF=(14.0, G0, 2.0),
                footB=(-11.0, G0 + 0.4, -10.0), handF=((8.0, 60.0), 12), absB=(20, 40, 40, -4), bones={"tails": -8})
    release = dict(root=(4.5, -4.6), hips=14, spine=10, chest=5, neck=-7, head=-8, footF=(15.5, G0, 0.0),
                   footB=(-10.5, G0 + 0.8, -18.0), handF=((20.0, 52.0), 4), absB=(-20, 10, 10, -4), bones={"tails": -16})
    follow = dict(root=(5.0, -6.0), hips=18, spine=13, chest=6, neck=-8, head=-8, footF=(15.5, G0, 0.0),
                  footB=(-10.0, G0 + 1.0, -20.0), handF=((14.0, 34.0), -40), absB=(-34, -10, -10, -4), bones={"tails": -12})
    reach = dict(root=(2.0, -3.0), hips=8, spine=6, chest=2, neck=-3, head=-4, footF=(12.0, G0, 0.0),
                 footB=(-10.0, G0, -4.0), handF=((-8.0, 50.0), 70), absB=(30, 50, 50, -4), bones={"tails": -4})
    keys = MO.flip_torso([(65, coil), (135, cock), (250, cock2), (268, whip), (290, release), (430, follow),
                          (520, reach), (610, dict(ready, bones={"tails": 2}))])
    return [(0, ready)] + keys + [(680, ready)]


_ATK = _atk_keys()


def hit(t):
    return MO.knock_hit(stance(), t, dict(handF=((-6.0, 50.0), 40), absB=(30, 70, 70, -4), bones={"tails": 16}))


def die(t):
    base = stance()
    base["pel"] = (0.0, B.PELV * H + base.pop("root")[1])
    base.pop("handF")
    base.pop("absB")
    base["armF"] = (-40, 120, 20)
    base["armB"] = (60, 20, 10, -4)
    P = MO.fall_back(base, t, H, G0)
    P["bones"] = {"tails": B.keyed([(0, {"c": 0.0}), (120, {"c": 20.0}), (238, {"c": 30.0}), (695, {"c": 26.0})], t)["c"]}
    return P


def pose(ctx, clip, t):
    gone = (clip == "attack" and 280 <= t < 600) or (clip == "die" and t >= 100)
    for o in ctx["jav"]:
        o.hide_render = gone
    P = {"idle": idle, "walk": walk, "hit": hit, "die": die}.get(clip)
    BODY.apply(ctx["rig"], P(t) if P else B.keyed(_ATK, t))


def clips():
    return MO.biped_clips(attack_blur={3: 24},
                          die_fx=[{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-22, 8], "scale": 0.7}],
                          dust=dict(t0=236, origin=(-24, 0), spread=22, size=9.5))
