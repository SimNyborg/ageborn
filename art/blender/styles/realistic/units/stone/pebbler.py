"""Pebbler: Stone Age ranged (sling, rock projectile), realistic style. heightLu 64.

A lean young slinger: auburn topknot tied with a bone pin, a team headband with trailing tails,
a team one-shoulder pelt tunic with a ragged hem, a leather rock pouch on the hip, leather wraps
on wrists and feet, and a braided leather sling with a stone in its pouch. Attack: an overarm
sling whip (coil back and hold, a whipping overhead swing with a smear, release level toward the
enemy: the projectile leaves from the pouch, the per-frame `muzzle` of the release frame), a
follow-through across the body and a new stone taken from the pouch.
"""
import math

from lib import biped as B
from lib import core as C
from lib import mats as M
from lib import motion as MO

SLUG = "pebbler"
NAME = "Pebbler"
AGE = "stone"
KIND = "unit"
HEIGHT_LU = 64
PX1 = 1.23
SCALE1 = 1.5
H = 62.5
CANVAS = (166, 112)
FEET = (100, 9)
YAW = -24.0
ANCHORS = {"head": (2, 62), "hitCenter": (0, 30)}

BODY = B.Biped(H=H, bulk=0.92)
K = BODY.k
FIST = (0.35 * K, -BODY.sw, 31.0 * K)
CORD = 15.0 * K
POUCH = (FIST[0], FIST[1], FIST[2] - CORD)
TRACKERS = {"muzzle": ("sling", POUCH)}
EXTRA_BONES = {"sling": (FIST, (FIST[0], FIST[1], FIST[2] - CORD), "hand_F"),
               "tails": ((-3.6 * K, 0, 64.8 * K), (-9.0 * K, 0, 62.5 * K), "head")}

STANCE = 0.62
STRIDE = 24.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
G0 = B.ANKLE * H
SMEAR_COLOR = "#a89880"
SMEAR_ALPHA = 0.55
SMEAR_N = 44


def build():
    k = K
    skin = M.skin("#a3806a")
    hair = M.hair("#4f3527", name="hair")
    fur = M.fur("#7a6a5a", "#534639")
    leather = M.leather("#5c4a3c")
    lthin = M.rawhide("#8a7458", name="cord")
    bone = M.bone()
    stone = M.stone("#8a8680", "#6d6a66", name="rock", bump=0.5)
    hide = M.team_hide()
    eye = M.eye()

    rig = C.Rig("pebbler_rig", BODY.bones(extra=EXTRA_BONES), yaw_deg=YAW)
    BODY.body(rig, skin)
    S = lambda x, y, z: (x * k, y * k, z * k)
    bw = BODY.bulk

    # team one-shoulder pelt tunic: covers the far shoulder and the belly, a strap across the chest
    tunic = C.blobs("tunic", [
        (S(0.3, 0, 40.8), (4.5 * bw, 6.2 * bw, 5.8)),
        (S(-0.4, 0.6, 46.6), (5.0 * bw, 6.9 * bw, 5.4)),
        (S(-1.2, 4.4, 51.8), (3.8, 3.6, 3.4)),
        (S(1.2, 1.0, 49.0), (3.4, 3.8, 3.6)),
        (S(-2.2, 1.0, 49.5), (3.0, 6.4 * bw, 4.4)),
    ], hide)
    strap = C.tube("strap", [S(3.4, -3.8, 43.6), S(4.6, -1.6, 48.0), S(3.6, 1.4, 52.4), S(0.2, 4.6, 55.2)],
                   [1.5 * k] * 4, hide, seg=10, flat=0.45)
    skirt = C.blobs("skirt", [
        (S(-0.2, 0, 36.4), (5.5 * bw, 7.4 * bw, 3.0)),
        (S(0.0, 0, 32.6), (6.3 * bw, 8.2 * bw, 3.9)),
        (S(0.3, -1.5, 29.2), (5.6 * bw, 6.4 * bw, 2.4)),
    ], hide)
    for o, d in ((tunic, 0.3), (skirt, 0.35)):
        C.displace(o, d, 1.0)
    for o in (tunic, strap, skirt):
        C.team(o)
    rig.skin(tunic, ["hips", "spine", "chest"], soft=2.0 * k)
    rig.skin(strap, ["spine", "chest"], soft=2.0 * k)
    rig.skin(skirt, ["hips", "thigh_F", "thigh_B"], soft=3.0 * k, bias={"thigh_F": 1.2 * k, "thigh_B": 1.2 * k})
    belt = C.blobs("belt", [(S(-0.1, 0, 37.3), (5.3 * bw, 7.1 * bw, 0.9))], leather)
    rig.skin(belt, ["hips", "spine"], soft=2.0 * k)
    pouch = C.blobs("pouch", [(S(-1.5, -7.2, 34.0), (2.6, 1.8, 3.0)), (S(-1.5, -7.0, 36.6), (1.8, 1.4, 1.0))], leather)
    C.displace(pouch, 0.3, 1.0)
    rig.rigid(pouch, "hips")

    # head: auburn hair pulled into a topknot, bone pin, team headband with two tails
    hair_o = C.blobs("hair", [
        (S(-0.5, 0, 64.4), (4.6, 4.1, 3.4)),
        (S(-2.4, 0, 62.0), (3.0, 3.9, 3.6)),
        (S(-1.8, 0, 68.4), (2.4, 2.2, 2.4)),
        (S(-2.4, 0, 70.4), (1.7, 1.6, 1.6)),
    ], hair, res=0.4)
    C.displace(hair_o, 0.5, 0.45)
    rig.rigid(hair_o, "head")
    rig.rigid(C.cyl("pin", 0.35 * k, 0.25 * k, 7.0 * k, bone, seg=6, loc=S(-5.2, 0, 68.6), rot=(0, math.radians(80), 0)),
              "head")
    band = C.lathe("band", [(4.2 * k, 65.4 * k), (4.45 * k, 66.1 * k), (4.1 * k, 66.8 * k)], hide,
                   scale=(1.0, 0.92, 1.0), loc=(0.25 * k, 0, 0))
    C.team(band)
    rig.rigid(band, "head")
    for i, dy in enumerate((-0.9, 0.9)):
        tl = C.tube(f"tail{i}", [S(-3.8, dy, 64.8), S(-6.5, dy * 1.2, 63.8), S(-9.4, dy * 1.4, 62.0)],
                    [1.0 * k, 0.9 * k, 0.6 * k], hide, seg=8, flat=0.35)
        C.team(tl)
        rig.rigid(tl, "tails")
    for y in (-1.5, 1.5):
        rig.rigid(C.sphere("eye", 0.5 * k, eye, loc=S(4.2, y, 62.9), scale=(0.5, 1, 0.6)), "head")

    # wrist wraps, foot wraps
    for s, y in (("F", -BODY.sw / k), ("B", BODY.sw / k)):
        br = C.blobs("wrap_" + s, [(S(0.1, y, 35.6), (1.9, 1.9, 2.0))], leather)
        rig.skin(br, ["forearm_" + s, "hand_" + s], soft=1.5 * k)
        hy = (-1 if s == "F" else 1) * BODY.hw / k
        fw = C.blobs("footwrap_" + s, [(S(0.3, hy, 3.6), (2.0, 1.9, 2.0)), (S(2.8, hy, 1.7), (3.8, 2.0, 1.3))], leather)
        rig.skin(fw, ["shin_" + s, "foot_" + s], soft=1.0 * k, bias={"shin_" + s: 1.0 * k})
        sh = C.blobs("shinfur_" + s, [(S(-0.3, hy, 11.5), (2.5, 2.4, 3.6))], fur, res=0.5)
        C.displace(sh, 0.35, 0.6)
        rig.skin(sh, ["shin_" + s], soft=2 * k)

    # the sling: two braided cords from the fist to a leather pouch holding a stone
    fx, fy, fz = FIST
    parts = []
    for dy in (-0.9, 0.9):
        c = C.tube("cord", [(fx, fy, fz - 0.5 * k), (fx + 0.2 * k, fy + dy * 0.5 * k, fz - CORD * 0.55),
                            (fx, fy + dy * k, fz - CORD + 1.4 * k)], [0.26 * k] * 3, lthin, seg=6)
        parts.append(c)
    pp = C.blobs("sling_pouch", [((fx, fy, fz - CORD - 0.4 * k), (1.7 * k, 1.5 * k, 1.1 * k))], lthin, res=0.3)
    parts.append(pp)
    for o in parts:
        o["weapon"] = 1
        rig.rigid(o, "sling")
    rock = C.blobs("sling_rock", [((fx, fy - 0.2 * k, fz - CORD + 0.3 * k), (1.8 * k, 1.7 * k, 1.6 * k))], stone, res=0.3)
    C.displace(rock, 0.25 * k, 0.6)
    rock["weapon"] = 1
    rig.rigid(rock, "sling")
    return dict(rig=rig, rock=rock)


# ------------------------------------------------------------------------------------ poses
def stance():
    return dict(root=(0.0, -1.0), hips=0, spine=-1, chest=-1, neck=0, head=-7,
                footF=(8.5, G0, 0.0), footB=(-9.0, G0, 0.0),
                absF=(10, 22, 22), sling=6, armB=(-8, 22, 6, -4), tails=0)


def _apply(ctx, P):
    P = dict(P)
    ha = P["absF"][2]
    bones = dict(P.pop("bones", {}))
    bones["sling"] = P.pop("sling", 0.0) - ha
    bones["tails"] = P.pop("tails", 0.0)
    P["bones"] = bones
    BODY.apply(ctx["rig"], P)


def idle(t):
    a = 2 * math.pi * t / 920.0
    P = MO.breathe(stance(), t, amp=1.0)
    P["absF"] = (10 + 3 * math.sin(a - 0.5), 22 + 4 * math.sin(a - 0.9), 22 + 4 * math.sin(a - 0.9))
    P["sling"] = 6 + 7 * math.sin(a - 1.8)
    P["tails"] = 5 * math.sin(a - 1.2)
    return P


def walk(t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 4.0, STANCE, G0, lean=4.0)
    sw = -22 * s1 + 4
    P["absF"] = (sw, sw + 14 + 6 * max(0, -s1), sw + 14 + 6 * max(0, -s1))
    P["armB"] = MO.arm_swing(s1, "B")
    lag = -22 * math.sin(2 * math.pi * ph - 1.1)
    P["sling"] = sw * 0.4 + lag + 4
    P["tails"] = -8 - 4 * c2
    return P


def _atk_keys():
    ready = stance()
    coil = dict(root=(-2.0, -1.6), hips=-4, spine=-6, chest=-6, neck=2, head=3, footF=(9.5, G0, 4.0),
                footB=(-10.5, G0, 0.0), absF=(-50, -40, -40), sling=-25, armB=(30, 40, 0, -8), tails=6)
    cock = dict(root=(-3.6, -1.0), hips=-8, spine=-12, chest=-10, neck=5, head=6, footF=(10.5, G0 + 1.2, 14.0),
                footB=(-11.0, G0, 0.0), absF=(-128, -150, -150), sling=-80, armB=(55, 40, 0, -10), tails=10)
    cock2 = dict(cock, root=(-3.9, -0.8), spine=-13, absF=(-133, -158, -158), sling=-88)
    whip = dict(root=(1.0, -2.5), hips=6, spine=4, chest=2, neck=-2, head=-2, footF=(12.0, G0, 2.0),
                footB=(-10.5, G0 + 0.4, -10.0), absF=(172, 182, 182), sling=-110, armB=(-10, 30, 4, -6), tails=-6)
    release = dict(root=(4.0, -4.2), hips=13, spine=10, chest=5, neck=-7, head=-6, footF=(14.0, G0, 0.0),
                   footB=(-10.5, G0 + 0.8, -18.0), absF=(104, 96, 96), sling=112, armB=(-32, 26, 6, -6), tails=-14)
    follow = dict(root=(4.6, -5.6), hips=17, spine=13, chest=6, neck=-8, head=-6, footF=(14.5, G0, 0.0),
                  footB=(-10.0, G0 + 1.0, -20.0), absF=(30, 26, 26), sling=70, armB=(-36, 30, 6, -6), tails=-10)
    rec = dict(root=(2.0, -2.8), hips=8, spine=6, chest=3, neck=-5, head=-4, footF=(11.0, G0, 0.0),
               footB=(-9.5, G0, -4.0), absF=(-18, -40, -40), sling=-14, armB=(-24, 60, 20, -4), tails=-4)
    keys = MO.flip_torso([(65, coil), (135, cock), (250, cock2), (268, whip), (290, release), (430, follow),
                          (510, rec), (600, dict(rec, absF=(0, 0, 0), sling=0))])
    return [(0, ready)] + keys + [(680, ready)]


_ATK = _atk_keys()


def relaxed():
    b = stance()
    b.pop("absF")
    b["armF"] = (10, 12, 10)
    return b


def pose(ctx, clip, t):
    ctx["rock"].hide_render = clip == "attack" and 280 <= t < 580
    if clip == "idle":
        P = idle(t)
    elif clip == "walk":
        P = walk(t)
    elif clip == "attack":
        P = B.keyed(_ATK, t)
    elif clip == "hit":
        P = MO.knock_hit(stance(), t, dict(absF=(40, 90, 90), sling=70, armB=(-30, 30, 10, -14), tails=18))
    else:
        base = stance()
        base["pel"] = (0.0, B.PELV * H + base.pop("root")[1])
        P = MO.fall_back(base, t, H, G0)
        # the FK arm keys of the fall override the held-sling abs pose
        P.pop("absF", None)
        P["absF"] = _die_arm(t)
        P["sling"] = _die_arm(t)[2] - 20
        P["tails"] = 20
    _apply(ctx, P)


def _die_arm(t):
    keys = [(0, (10, 22, 22)), (120, (80, 120, 120)), (238, (215, 240, 240)), (290, (205, 228, 228)),
            (360, (238, 262, 262)), (695, (240, 264, 264))]
    return tuple(B.keyed([(tk, {"a": v}) for tk, v in keys], t)["a"])


def clips():
    return MO.biped_clips(attack_blur={3: 22},
                          die_fx=[{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-20, 8], "scale": 0.62}],
                          dust=dict(t0=236, origin=(-22, 0), spread=20, size=8.5))
